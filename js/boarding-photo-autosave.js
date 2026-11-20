/* Persist an existing dog's photo independently of its unfinished profile form. */
var boardingPhotoJobs = new Map();

function boardingPhotoActor() {
  return currentDbUserId() || (localTestMode ? currentUser?.email || '' : '');
}
function boardingPhotoEditorId() {
  return boardingDogFormRecordId(document.getElementById('boardingDogForm')) || '';
}
function boardingPhotoCurrentJob() {
  const job = boardingPhotoJobs.get(boardingPhotoEditorId());
  return job?.actor === boardingPhotoActor() ? job : null;
}
function boardingPhotoSavePending() {
  return Boolean(boardingPhotoCurrentJob()?.pending);
}
function renderBoardingPhotoAutosaveState() {
  const status = document.getElementById('boardingDogPhotoStatus');
  if (!status) return;
  if (!boardingPhotoEditorId() && !selectedDogPhotos.boarding) boardingPhotoJobs.delete('');
  const job = boardingPhotoCurrentJob();
  const busy = Boolean(job?.pending);
  status.hidden = !job?.message;
  status.dataset.state = job?.state || '';
  status.setAttribute('role', job?.state === 'error' ? 'alert' : 'status');
  status.querySelector('[data-photo-message]').textContent = job?.message || '';
  status.querySelector('[data-photo-retry]').hidden = !job?.retryable || busy;
  document.getElementById('boardingDogPhotoPicker').setAttribute('aria-busy', String(busy));
  for (const id of ['boardingDogPhotoPicker', 'boardingDogPhotoInput', 'boardingDogSaveButton']) {
    const control = document.getElementById(id);
    if (control) {
      if (busy) { control.dataset.photoBusy = 'true'; control.disabled = true; }
      else if (control.dataset.photoBusy) { delete control.dataset.photoBusy; control.disabled = false; }
    }
  }
}
async function boardingPhotoRequest(name, args) {
  if (!supabaseClient) throw new Error('Connect to the kennel database before uploading a photo.');
  const {data, error} = await withRemoteRequestTimeout(cuddleStayRequest(db => {
    const request = db.rpc(name, args);
    const signal = remoteRequestAbortSignal();
    return signal ? request.abortSignal(signal) : request;
  }), 'Photo save');
  if (error) throw error;
  return data;
}
function boardingPhotoAssertActor(job) {
  if (!job.actor || job.actor !== boardingPhotoActor()) throw new Error('Your account changed. Reopen the dog profile and choose the photo again.');
}
function boardingPhotoApplyRows(rows, job) {
  const targets = job.context?.targets || [];
  if (!Array.isArray(rows) || rows.length !== targets.length || !rows.length || targets.some(target =>
    !rows.some(row => row.id === target.id && row.type === target.type && row.payload?.profilePhotoPath === job.upload.storagePath)
  )) throw new Error('The saved photo could not be confirmed. Retry to check the upload.');
  // Only replace the confirmed records. Do not read values from the open form.
  for (const type of new Set(rows.map(row => row.type))) {
    const incoming = rows.filter(row => row.type === type).map(row => ({...row.payload, id:row.id, type:row.type}));
    const byId = new Map(readRecords(type).map(row => [row.id,row]));
    for (const row of incoming) {
      const cached = byId.get(row.id);
      const photoFields = Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith('profilePhoto')));
      byId.set(row.id, cached ? {...cached,...photoFields} : row);
    }
    writeRecords(type,[...byId.values()]);
  }
}
function boardingPhotoRefreshEditor(job) {
  if (boardingPhotoEditorId() !== job.id || boardingPhotoActor() !== job.actor) return;
  const record = activeBoardingDog();
  const display = boardingDogWithCanonicalProfile(record);
  // Keep every other unsaved field and the selected workspace tab intact.
  const owner = document.getElementById('boardingDogHeaderOwner');
  const ownerLabel = owner?.textContent;
  setDogPhoto('boarding',display);
  if (owner) owner.textContent = ownerLabel;
  if (boardingDogEditorRecord?.id === job.id) {
    for (const [key,value] of Object.entries(display)) if (key.startsWith('profilePhoto')) boardingDogEditorRecord[key] = value;
  }
  const url = document.getElementById('boardingDogForm').elements.namedItem('profilePhotoUrl');
  if (url) url.value = display.profilePhotoUrl || '';
}
async function runBoardingPhotoSave(job) {
  if (job.pending) return;
  job.pending = true; job.state = 'saving'; job.retryable = false;
  job.message = job.upload ? 'Saving photo…' : 'Uploading and saving photo…';
  renderBoardingPhotoAutosaveState();
  try {
    boardingPhotoAssertActor(job);
    if (!job.context) job.context = await boardingPhotoRequest('boarding_photo_context',{p_boarding_id:job.id});
    boardingPhotoAssertActor(job);
    if (!job.upload) {
      const upload = await uploadDogPhotoToSupabase(job.file,job.id);
      if (upload.error || !upload.storagePath) throw new Error(upload.error || 'The photo upload did not finish.');
      job.upload = upload;
    }
    boardingPhotoAssertActor(job);
    job.message = 'Saving photo…'; renderBoardingPhotoAutosaveState();
    const rows = await boardingPhotoRequest('save_boarding_profile_photo',{
      p_context:job.context, p_storage_path:job.upload.storagePath, p_meta:job.upload.mediaMeta || {}
    });
    boardingPhotoAssertActor(job);
    boardingPhotoApplyRows(rows,job);
    boardingPhotoRefreshEditor(job);
    job.state = 'success'; job.message = 'Photo saved';
    job.file = null; job.upload = null; job.context = null;
  } catch (error) {
    job.state = 'error';
    job.retryable = Boolean(job.file) && error?.code !== '40001' && job.actor === boardingPhotoActor();
    job.message = 'Photo was not saved. ' + (error?.message || 'Please try again.');
    // Errors remain in the profile header; the top-layer toast also surfaces
    // failures when another dialog is open over this profile.
    if (job.actor === boardingPhotoActor()) showToast(job.name + ': ' + job.message, {error:true});
  } finally {
    job.pending = false;
    renderBoardingPhotoAutosaveState();
  }
}
async function autoSaveBoardingDogPhoto() {
  const input = document.getElementById('boardingDogPhotoInput');
  const file = input.files?.[0];
  if (!file) return;
  if (boardingPhotoSavePending()) { input.value = ''; return; }
  const id = boardingPhotoEditorId();
  const record = activeBoardingDog() || {};
  if (!id && isSupportedDogPhoto(file)) {
    await previewSelectedDogPhoto('boarding');
    boardingPhotoJobs.set('',{actor:boardingPhotoActor(),state:'staged',message:'Photo will save when you create the dog profile.'});
    renderBoardingPhotoAutosaveState();
    return;
  }
  // Existing profiles never hand this file to the full-form save path.
  input.value = ''; selectedDogPhotos.boarding = null;
  const job = {id,actor:boardingPhotoActor(),name:record.dogName || 'Dog',file};
  boardingPhotoJobs.set(id,job);
  if (!isSupportedDogPhoto(file)) {
    resetSelectedDogPhoto('boarding',record);
    job.state = 'error'; job.message = 'Photo was not saved. Please choose a JPG, PNG, or WebP image.';
    job.file = null;
    renderBoardingPhotoAutosaveState();
    showToast(job.message,{error:true});
    return;
  }
  if (document.getElementById('boardingDogForm').dataset.boardingDogSubmitting === 'true') {
    job.state = 'error'; job.message = 'Wait for the profile save to finish, then choose the photo again.';
    job.file = null; renderBoardingPhotoAutosaveState(); return;
  }
  await runBoardingPhotoSave(job);
}
document.addEventListener('click',event => {
  if (event.target.closest('[data-photo-retry]')) {
    const job = boardingPhotoCurrentJob();
    if (job?.retryable) void runBoardingPhotoSave(job);
  }
});
