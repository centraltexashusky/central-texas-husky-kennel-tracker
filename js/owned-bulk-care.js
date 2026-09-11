/* Bulk preventive care for resident dogs only. Uses existing record permissions,
   persistence, and medical-history format; never touches boarding or billing. */
var ownedHeartwormSession = null;

function canRecordOwnedHeartworm() {
  return ['admin', 'staff', 'helper'].includes(currentRole()) && canWriteRemoteRecordType('ownedDog');
}

async function freshOwnedHeartwormDogs() {
  if (!canRecordOwnedHeartworm()) throw new Error('Your account cannot update Our Dogs care records.');
  if (localTestMode) return readRecords('ownedDog').filter(dog => !dog.removed);
  if (!supabaseClient) throw new Error('Connect and sign in before recording prevention. Nothing was saved.');
  const rows = await withRemoteRequestTimeout(fetchRemoteRecordRowsForType('ownedDog'), 'Load current dog records');
  const dogs = rows.filter(row => row.type === 'ownedDog' && row.payload && !row.payload.removed)
    .map(row => ({ ...row.payload, id: row.id, type: 'ownedDog', updatedAt: row.updated_at || row.payload.updatedAt }));
  mergeRecords('ownedDog', dogs);
  return dogs;
}

function ownedHeartwormPayload(dog, date, note) {
  if (!dog?.id || dog.type !== 'ownedDog' || dog.removed) throw new Error('This dog is no longer available.');
  // Historical entry must not move the most recent treatment date backwards.
  const last = dateOnly(dog.heartwormDate);
  const history = arrayValue(dog.careNotesHistory);
  if (last === date || ownedDogMedicalHistoryEntryExists(history, 'heartwormDate', 'Heartworm Medication', date)) return null;
  return {
    ...dog,
    heartwormDate: last && last > date ? last : date,
    updatedAt: new Date().toISOString(),
    careNotesHistory: [{
      id: uid('care-log'), type: 'Heartworm Medication', date, minutes: '',
      note: 'Heartworm prevention recorded in bulk.' + (note ? ' ' + note : ''),
      mediaItems: [], completedBy: currentUser?.name || helperName?.value || '',
      createdAt: new Date().toISOString(), source: 'owned-bulk-heartworm', sourceField: 'heartwormDate',
    }, ...history],
  };
}

function renderOwnedHeartwormList() {
  const session = ownedHeartwormSession;
  const list = document.getElementById('ownedHeartwormList');
  if (!session || !list) return;
  const query = (document.getElementById('ownedHeartwormSearch').value || '').trim().toLowerCase();
  const matches = session.dogs.filter(dog => ownedDogDisplayName(dog).toLowerCase().includes(query));
  const visible = matches.slice(0, session.limit);
  list.innerHTML = visible.map(dog => `<label class="owned-heartworm-row">
    <input type="checkbox" data-heartworm-dog="${escapeHtml(dog.id)}" ${session.selected.has(dog.id) ? 'checked' : ''} ${session.busy || session.done.has(dog.id) ? 'disabled' : ''} />
    <span><strong>${escapeHtml(ownedDogDisplayName(dog))}</strong><small>Last recorded · ${escapeHtml(dog.heartwormDate || 'Not recorded')}</small></span>
    <span class="owned-heartworm-result">${escapeHtml(session.done.get(dog.id) || session.errors.get(dog.id) || '')}</span>
  </label>`).join('') || '<p>No matching dogs.</p>';
  const more = document.getElementById('ownedHeartwormMore');
  more.hidden = visible.length >= matches.length;
  more.disabled = session.busy;
  document.getElementById('ownedHeartwormCount').textContent = `${session.selected.size} of ${session.dogs.length} dogs selected`;
  document.getElementById('ownedHeartwormListCount').textContent = `Showing ${visible.length} of ${matches.length}. Selection includes dogs outside this search.`;
  const save = document.getElementById('ownedHeartwormSave');
  save.disabled = session.busy || !session.selected.size;
  save.textContent = session.busy ? 'Saving…' : `Record prevention for ${session.selected.size} dog${session.selected.size === 1 ? '' : 's'}`;
}

async function openOwnedHeartwormBulk() {
  if (ownedHeartwormSession?.busy) return showToast('The current prevention update is still saving.');
  if (!canRecordOwnedHeartworm()) return showToast('Your account cannot update Our Dogs care records.');
  const session = {dogs: [], selected: new Set(), done: new Map(), errors: new Map(), limit: 50, busy: false};
  ownedHeartwormSession = session;
  showDetailDialog('Record Heartworm Prevention', '<p role="status">Loading current dog records…</p>');
  try {
    session.dogs = (await freshOwnedHeartwormDogs()).sort((a,b) => ownedDogDisplayName(a).localeCompare(ownedDogDisplayName(b)));
    if (ownedHeartwormSession !== session || !document.getElementById('detailDialog').open) return;
    showDetailDialog('Record Heartworm Prevention', `<form id="ownedHeartwormForm" class="owned-heartworm-form">
      <p class="owned-heartworm-intro">One date for the dogs you treated. Select all or choose individuals. Only Our Dogs are included—not customer boarding dogs.</p>
      <div class="owned-heartworm-fields"><label>Date given<input type="date" name="date" required max="${todayDate()}" value="${todayDate()}" /></label>
      <label>Note (optional)<input type="text" name="note" maxlength="500" placeholder="Product or treatment note" /></label></div>
      <p class="section-help-text">Only record prevention already given. An earlier date adds history without replacing a newer last-treatment date. The same date will not be logged twice.</p>
      <div class="owned-heartworm-selection"><strong id="ownedHeartwormCount" aria-live="polite"></strong><div><button type="button" class="secondary-button" data-heartworm-select="all">Select all dogs</button><button type="button" class="secondary-button" data-heartworm-select="none">Clear selection</button></div></div>
      <label>Find a dog<input type="search" id="ownedHeartwormSearch" placeholder="Search dog name" /></label>
      <div id="ownedHeartwormList" class="owned-heartworm-list" aria-label="Dogs to update"></div>
      <p id="ownedHeartwormListCount" class="section-help-text"></p>
      <button type="button" class="secondary-button" id="ownedHeartwormMore" hidden>Show 50 more</button>
      <p id="ownedHeartwormStatus" role="status" aria-live="polite"></p>
      <div class="owned-heartworm-footer"><button type="submit" id="ownedHeartwormSave" disabled>Record prevention</button><button type="button" class="secondary-button" data-heartworm-close>Cancel</button></div>
    </form>`);
    renderOwnedHeartwormList();
  } catch (error) {
    if (ownedHeartwormSession === session && document.getElementById('detailDialog').open) showDetailDialog('Prevention records unavailable', `<p>${escapeHtml(error.message)}</p><p>Please reopen the bulk editor to try again. No dates were changed.</p>`);
  }
}

async function saveOwnedHeartwormBulk(form) {
  const session = ownedHeartwormSession;
  if (!session || session.busy || !session.selected.size) return;
  const date = form.elements.date.value;
  const parsed = new Date(date + 'T12:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date || date > todayDate()) {
    document.getElementById('ownedHeartwormStatus').textContent = 'Choose a valid date on or before today.';
    return;
  }
  const note = form.elements.note.value.trim().slice(0,500);
  session.busy = true;
  session.errors.clear();
  const close = document.getElementById('closeDetailDialog');
  close.disabled = true;
  form.querySelectorAll('input,button').forEach(control => { control.disabled = true; });
  renderOwnedHeartwormList();
  const status = document.getElementById('ownedHeartwormStatus');
  status.textContent = 'Checking the latest records before saving…';
  try {
    const fresh = new Map((await freshOwnedHeartwormDogs()).map(dog => [dog.id, dog]));
    const pending = [];
    for (const id of session.selected) {
      const dog = fresh.get(id);
      const original = session.dogs.find(item => item.id === id);
      if (!dog) { session.errors.set(id, 'Unavailable. Reopen to refresh.'); continue; }
      const payload = ownedHeartwormPayload(dog, date, note);
      if (!payload) {
        session.done.set(id, 'Already recorded'); session.selected.delete(id);
        session.dogs[session.dogs.findIndex(item => item.id === id)] = dog;
        continue;
      }
      if (dateOnly(dog.heartwormDate) !== dateOnly(original.heartwormDate)) {
        session.errors.set(id, 'Date changed elsewhere. Reopen to review.'); continue;
      }
      pending.push(payload);
    }
    // Bounded requests; each batch is all-or-nothing. Never mark local-only or
    // permission-skipped responses as saved, or retry an uncertain write blindly.
    for (let offset = 0; offset < pending.length; offset += 40) {
      const batch = pending.slice(offset, offset + 40);
      status.textContent = `Saving ${Math.min(offset + 40, pending.length)} of ${pending.length} updates…`;
      try {
        if (!canRecordOwnedHeartworm() || (!localTestMode && !supabaseClient)) throw new Error('Session unavailable. Sign in and retry.');
        const result = await sendPayloadBatch(batch, {retryIndividually: false, quiet: true});
        if (!result?.ok || result.skippedRemote || (!localTestMode && result.local) || result.count !== batch.length) throw new Error('Save not confirmed. Retry to verify.');
        batch.forEach(dog => {
          session.done.set(dog.id, 'Saved'); session.selected.delete(dog.id);
          const index = session.dogs.findIndex(item => item.id === dog.id);
          session.dogs[index] = dog;
        });
      } catch (error) {
        // Stop on connection/permission failure rather than flooding the server.
        pending.slice(offset).forEach(dog => session.errors.set(dog.id, 'Not confirmed. Retry to verify.'));
        break;
      }
    }
    status.textContent = `${session.done.size} dog${session.done.size === 1 ? '' : 's'} recorded or already up to date.${session.errors.size ? ` ${session.errors.size} not confirmed; review the messages and retry. Dates and notes are kept for retry.` : ' Each new entry includes the date and your name in care history.'}`;
  } catch (error) {
    status.textContent = `Could not finish: ${error.message} Your selection is kept for retry.`;
  } finally {
    session.busy = false;
    close.disabled = false;
    form.querySelectorAll('input,button').forEach(control => { control.disabled = false; });
    // Keep one treatment date/note throughout a partially completed batch.
    form.elements.date.disabled = session.done.size > 0;
    form.elements.note.disabled = session.done.size > 0;
    form.querySelector('[data-heartworm-close]').textContent = session.selected.size ? 'Close' : 'Done';
    renderOwnedHeartwormList();
    if (activePageId() === 'ourDogsPage') renderOwnedDogs();
  }
}

document.addEventListener('click', event => {
  if (event.target.closest('#bulkOwnedHeartwormButton')) { openOwnedHeartwormBulk(); return; }
  const form = event.target.closest('#ownedHeartwormForm');
  if (!form || !ownedHeartwormSession || ownedHeartwormSession.busy) return;
  const select = event.target.closest('[data-heartworm-select]');
  if (select) {
    ownedHeartwormSession.selected = select.dataset.heartwormSelect === 'all'
      ? new Set(ownedHeartwormSession.dogs.filter(dog => !ownedHeartwormSession.done.has(dog.id)).map(dog => dog.id)) : new Set();
    renderOwnedHeartwormList();
  }
  if (event.target.closest('#ownedHeartwormMore')) { ownedHeartwormSession.limit += 50; renderOwnedHeartwormList(); }
  if (event.target.closest('[data-heartworm-close]')) document.getElementById('closeDetailDialog').click();
});
document.addEventListener('input', event => {
  if (event.target.id === 'ownedHeartwormSearch') { ownedHeartwormSession.limit = 50; renderOwnedHeartwormList(); }
});
document.addEventListener('change', event => {
  const id = event.target.dataset.heartwormDog;
  if (!id || !ownedHeartwormSession || ownedHeartwormSession.busy) return;
  if (event.target.checked) ownedHeartwormSession.selected.add(id); else ownedHeartwormSession.selected.delete(id);
  renderOwnedHeartwormList();
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'ownedHeartwormForm') return;
  event.preventDefault();
  saveOwnedHeartwormBulk(event.target);
});
document.addEventListener('cancel', event => {
  if (event.target.id === 'detailDialog' && ownedHeartwormSession?.busy) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);
