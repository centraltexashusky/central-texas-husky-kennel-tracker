/* Atomic source/projection save. No whole-record fallback for remote care appends. */
var careSubmitInFlight = new Map();
async function careSubmitFingerprint(log) {
  const input=JSON.stringify([log.dogId,log.date,log.careType,String(log.minutes || ''),log.note || '',log.mediaItems || [],log.alertAdmin || '']);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function persistStructuredCareLogAtomic(log) {
  const identity=await remoteWriteIdentity(log);
  if (!identity.userId) throw Error('Sign in before saving care.');
  const fingerprint=await careSubmitFingerprint(log);
  const key='cth-care-submit-v1:'+identity.userId+':'+fingerprint;
  if (careSubmitInFlight.has(key)) return careSubmitInFlight.get(key);
  const pending=(async()=>{
    // Persist only the opaque submission ID, not the note or payload. Keep it on
    // failure/timeout so the same submission remains idempotent after a reload.
    let id=localStorage.getItem(key);
    if (!id) {
      id=log.id;
      localStorage.setItem(key,id);
      if (localStorage.getItem(key)!==id) throw Error('Could not retain the care retry ID. Free browser storage before saving.');
    }
    const requestLog={...log,id};
    const result=await withRemoteRequestTimeout(cuddleStayRequest(db=>db.rpc('append_owned_care_log',{p_log:requestLog})),'Care save');
    if (result.error) throw result.error;
    const saved=result.data;
    if (!saved?.daily?.id || !saved?.dog?.id || !saved?.log?.id) throw Error('Care confirmation was incomplete. Retry to verify the same submission.');
    Object.assign(log,saved.log);
    try { localStorage.removeItem(key); } catch (_) { /* A retained ID makes a retry harmless. */ }
    // Persistence is already confirmed; cache/render failures must not invite a
    // duplicate submission or misreport a successful bath as "not saved".
    try {
      mergeRecords('dailyTask',[saved.daily]);mergeRecords('ownedDog',[saved.dog]);
      if (typeof renderDailyTaskLists==='function') renderDailyTaskLists(saved.daily);
      if (typeof renderCareDogOptions==='function') renderCareDogOptions();
      if (typeof refreshOwnedWorkspace==='function') refreshOwnedWorkspace();
      if (typeof activePageId==='function' && activePageId()==='ourDogsPage') renderOwnedDogs();
      if (typeof activePageId==='function' && activePageId()==='dashboardPage') renderDashboard();
    } catch (_) { showToast('Care saved. Refresh the page to update the display.'); }
    // Follow-up task sync is not part of the durable care transaction. Existing
    // sendPayload diagnostics capture any separate task write failure.
    try {
      if (typeof syncScheduledCareTasksFromDailyRecord==='function') await syncScheduledCareTasksFromDailyRecord(saved.daily,{render:false,renderDashboard:false});
      if (typeof syncOwnedDogBathTask==='function' && log.careType==='Bath') await syncOwnedDogBathTask(saved.dog);
    } catch (_) { showToast('Care saved. The related task status could not refresh; check it before repeating the task.'); }
    return saved.daily;
  })();
  careSubmitInFlight.set(key,pending);
  try {return await pending;} finally {careSubmitInFlight.delete(key);}
}
