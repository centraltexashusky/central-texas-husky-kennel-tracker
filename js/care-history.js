/* Entry timestamps and admin-only corrections. Never infer an entry time from an event date. */
var ownedCareHistoryFields = ['exerciseLogs', 'trainingLogs', 'bathHistory', 'heatHistory', 'careNotesHistory'];
var ownedCareHistorySession = null;
function careLogTimestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value)) ? value : '';
}
function careLogEnteredAt(log = {}) { return careLogTimestamp(log.loggedAt) || careLogTimestamp(log.createdAt); }
function careLogTimeLabel(value) {
  return careLogTimestamp(value) ? new Intl.DateTimeFormat('en-US', {timeZone:'America/Chicago', year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZoneName:'short'}).format(new Date(value)) : '';
}
function careLogEntryMetadataText(log = {}) {
  const entered = careLogTimeLabel(careLogEnteredAt(log));
  const edited = careLogTimeLabel(log.updatedAt);
  return 'Entered: ' + (entered || 'Time not recorded') + (edited ? ' · Edited: ' + edited : '');
}
function careLogEntryMetadataHtml(log = {}) {
  const entered = careLogTimeLabel(careLogEnteredAt(log));
  const edited = careLogTimeLabel(log.updatedAt);
  return '<span class="care-log-times">Entered: ' + escapeHtml(entered || 'Time not recorded') + (edited ? '<br>Edited: ' + escapeHtml(edited + (log.updatedByEmail ? ' · ' + log.updatedByEmail : '')) : '') + '</span>';
}
function ownedCareHistoryEditButtonHtml(log) {
  if (currentRole() !== 'admin' || !log.historyDogId || !ownedCareHistoryFields.includes(log.historyField) || !Number.isInteger(log.historyIndex) || !log.historyExpected) return '';
  return '<button type="button" class="secondary-button" data-edit-owned-history data-dog-id="' + escapeHtml(log.historyDogId) + '" data-field="' + escapeHtml(log.historyField) + '" data-index="' + log.historyIndex + '" data-history-expected="' + escapeHtml(JSON.stringify(log.historyExpected)) + '">Edit</button>';
}
function careHistoryEqual(left, right) {
  const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}
function ownedCareHistoryEntry(dog, field, index, expected) {
  if (!dog || dog.removed || !ownedCareHistoryFields.includes(field) || !Number.isInteger(index) || index < 0) throw Error('This care entry is no longer available.');
  const entry = arrayValue(dog[field])[index];
  if (!entry || (expected && !careHistoryEqual(entry, expected))) throw Error('This history changed while you were editing. Cancel and reopen the entry to review the latest version.');
  return entry;
}
function correctedCareHistoryEntry(entry, note, minutes, timestamp, email) {
  const next = {...entry, note, updatedAt:timestamp, updatedByEmail:email,
    editHistory:[...arrayValue(entry.editHistory), {note:entry.note || '', minutes:entry.minutes ?? '', editedAt:timestamp, editedByEmail:email}]};
  if (minutes !== null) next.minutes = minutes;
  return next;
}
async function freshOwnedCareHistoryDog(id) {
  if (currentRole() !== 'admin') throw Error('Only admins can edit care history.');
  if (localTestMode) return readRecords('ownedDog').find(d=>d.id===id && !d.removed);
  if (!supabaseClient) throw Error('Connect and sign in before editing care history.');
  const result = await withRemoteRequestTimeout(cuddleStayRequest(db=>db.from('kennel_records').select('payload').eq('type','ownedDog').eq('id',id).maybeSingle()), 'Load care history');
  if (result.error) throw result.error;
  return result.data?.payload;
}
function ownedCareHistoryDialog() {
  let dialog = document.getElementById('ownedCareHistoryEditDialog');
  if (!dialog) {
    dialog = document.createElement('dialog'); dialog.id = 'ownedCareHistoryEditDialog'; dialog.className = 'detail-dialog owned-history-editor'; dialog.setAttribute('aria-label','Edit care history'); document.body.append(dialog);
    dialog.addEventListener('cancel', event=>{if(ownedCareHistorySession?.busy)event.preventDefault();});
    dialog.addEventListener('close', ()=>{ownedCareHistorySession=null;});
  }
  return dialog;
}
async function openOwnedCareHistoryEditor(dogId, field, index, expected) {
  if (ownedCareHistorySession?.busy) return;
  if (currentRole() !== 'admin') return showToast('Only admins can edit care history.');
  const dialog = ownedCareHistoryDialog();
  const session = {dogId,field,index,busy:false}; ownedCareHistorySession=session;
  dialog.innerHTML='<h2>Edit care history</h2><p role="status">Loading current entry…</p><button type="button" data-cancel-owned-history>Cancel</button>';
  if (!dialog.open) dialog.showModal();
  try {
    const dog=await freshOwnedCareHistoryDog(dogId);
    if (ownedCareHistorySession!==session || !dialog.open) return;
    if (dog) {
      mergeRecords('ownedDog',[dog]);
      if (activeOwnedDog()?.id===dogId) { renderOwnedActivity(dog); refreshOwnedWorkspace(); }
    }
    const entry=ownedCareHistoryEntry(dog,field,index,expected);
    session.expected=JSON.parse(JSON.stringify(entry));
    session.editMinutes=field==='exerciseLogs';
    dialog.innerHTML='<h2>Edit care history</h2><p>'+escapeHtml(ownedDogDisplayName(dog))+' · '+escapeHtml(entry.type || 'Care')+'</p><p>Event date: '+escapeHtml(entry.date || 'Not recorded')+'</p>'+careLogEntryMetadataHtml(entry)+'<form id="ownedCareHistoryEditForm" class="tracker-form"><label>Care note<textarea name="note" rows="7" wrap="off"></textarea></label>'+(session.editMinutes?'<label>Minutes<input name="minutes" type="number" min="0" step="any"></label>':'')+'<p role="status" id="ownedCareHistoryEditStatus"></p><div class="button-row"><button type="submit">Save</button><button type="button" class="secondary-button" data-cancel-owned-history>Cancel</button></div></form>';
    const form=dialog.querySelector('form'); form.elements.note.value=entry.note || ''; if(session.editMinutes)form.elements.minutes.value=entry.minutes ?? '';
    form.elements.note.focus();
  } catch(error) {
    if (ownedCareHistorySession===session && dialog.open) dialog.innerHTML='<h2>Care history unavailable</h2><p role="alert">'+escapeHtml(error.message)+'</p><button type="button" data-cancel-owned-history>Close</button>';
  }
}
async function persistOwnedCareHistoryEdit(session, note, minutes) {
  if (currentRole() !== 'admin') throw Error('Only admins can edit care history.');
  if (!localTestMode) {
    if (!supabaseClient) throw Error('Connect and sign in before saving.');
    const result=await withRemoteRequestTimeout(cuddleStayRequest(db=>db.rpc('edit_owned_care_history', {p_dog_id:session.dogId,p_history_field:session.field,p_entry_index:session.index,p_expected_entry:session.expected,p_note:note,p_minutes:minutes})), 'Save care history');
    if(result.error)throw result.error;
    if(!result.data?.dog)throw Error('The save could not be confirmed. Reopen the entry before retrying.');
    return result.data;
  }
  const dog=readRecords('ownedDog').find(d=>d.id===session.dogId);
  const entry=ownedCareHistoryEntry(dog,session.field,session.index,session.expected);
  const now=new Date().toISOString(), email=currentUser?.email || '';
  const next=correctedCareHistoryEntry(entry,note,minutes,now,email);
  let source=null;
  if(entry.sourceDailyTaskId && entry.sourceCareLogId){
    const record=readRecords('dailyTask').find(r=>r.id===entry.sourceDailyTaskId);
    const field=record?.structuredCareLogs ? 'structuredCareLogs' : 'careLogs';
    const matches=arrayValue(record?.[field]).filter(log=>log.id===entry.sourceCareLogId);
    if(matches.length!==1 || matches[0].dogId!==dog.id || matches[0].date!==entry.date || (matches[0].note || '')!==(entry.note || '') || String(matches[0].minutes || '')!==String(entry.minutes || ''))throw Error('The source care log changed or is unavailable. Refresh and reopen this entry.');
    source={...record,updatedAt:now,[field]:record[field].map(log=>log.id===entry.sourceCareLogId?correctedCareHistoryEntry(log,note,minutes,now,email):log)};
  }
  return {dog:{...dog,updatedAt:now,[session.field]:dog[session.field].map((log,i)=>i===session.index?next:log)},source};
}
async function saveOwnedCareHistoryEditor(form) {
  const session=ownedCareHistorySession;
  if(!session?.expected || session.busy)return;
  const note=form.elements.note.value;
  const minutes=session.editMinutes ? form.elements.minutes.value : null;
  const status=form.querySelector('[role="status"]');
  if(minutes!==null && minutes!=='' && (!Number.isFinite(Number(minutes)) || Number(minutes)<0)){status.textContent='Enter valid minutes.';return;}
  if(note===(session.expected.note || '') && (minutes===null || String(minutes)===String(session.expected.minutes ?? ''))){ownedCareHistoryDialog().close();return;}
  session.busy=true;form.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);status.textContent='Saving…';
  try{
    const saved=await persistOwnedCareHistoryEdit(session,note,minutes);
    mergeRecords('ownedDog',[saved.dog]);if(saved.source)mergeRecords('dailyTask',[saved.source]);
    renderOwnedDogs();if(activeOwnedDog()?.id===session.dogId){renderOwnedActivity(saved.dog);refreshOwnedWorkspace();}
    if(ownedCareHistorySession===session && form.isConnected){ownedCareHistoryDialog().close();showToast('Care history saved.');}
  }catch(error){if(ownedCareHistorySession===session && form.isConnected)status.textContent='Not saved: '+error.message;}
  finally{session.busy=false;if(ownedCareHistorySession===session && form.isConnected)form.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false);}
}
document.addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit-owned-history]');
  if(edit){event.preventDefault();openOwnedCareHistoryEditor(edit.dataset.dogId,edit.dataset.field,Number(edit.dataset.index),JSON.parse(edit.dataset.historyExpected));}
  if(event.target.closest('[data-cancel-owned-history]') && !ownedCareHistorySession?.busy)ownedCareHistoryDialog().close();
});
document.addEventListener('submit',event=>{if(event.target.id==='ownedCareHistoryEditForm'){event.preventDefault();saveOwnedCareHistoryEditor(event.target);}});
