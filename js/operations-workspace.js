/* A shared presentation for existing request/maintenance records. No data migration. */
var operationsState = {status: 'Open', limit: 50};
var operationsFormHomes = new Map();
var operationsSubmitting = new Set();
var operationsPendingForms = new WeakMap();
var operationsBusyRecords = new Set();

function operationsCanWrite() {
  return ['admin','staff','helper'].includes(currentRole());
}
function operationsRecords() {
  return ['request','maintenance'].flatMap(type => readRecords(type).filter(record => !record.removed).map(record => ({...record,type})));
}
function operationsUrgent(record) { return !record.completed && Boolean(record.urgentNeeds || record.urgentAttention); }
function operationsTypeLabel(type) { return type === 'maintenance' ? 'Maintenance' : 'Request'; }
function operationsIcon(type) {
  const path = type === 'maintenance'
    ? '<path d="M14 6a6 6 0 0 0-7 8l-4 4a2 2 0 0 0 3 3l4-4a6 6 0 0 0 8-7l-4 4-4-4 4-4Z"/>'
    : '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>';
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
function operationsRow(record) {
  const title = record.requestText || record.issue || record.category || record.location || 'Untitled item';
  const status = record.completed ? 'Completed' : operationsUrgent(record) ? 'Urgent' : 'Open';
  const key = record.type + ':' + record.id;
  return `<article class="operations-row" role="row">
    <div class="operations-item" role="cell"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(record.category || record.location || '')} · ${escapeHtml(formatDateTime(record.submittedAt))}</small>${arrayValue(record.mediaItems).length || record.mediaFiles ? '<small>Attachments available in View</small>' : ''}</div>
    <div class="operations-kind" role="cell">${operationsIcon(record.type)}${operationsTypeLabel(record.type)}</div>
    <div class="operations-reporter" role="cell">${escapeHtml(record.requestedBy || record.reportedBy || 'Unknown')} ${record.completedAt ? `<small>Completed ${escapeHtml(formatDateTime(record.completedAt))}</small>` : ''}</div>
    <div role="cell"><span class="operations-badge ${status.toLowerCase()}">${status}</span></div>
    <div class="operations-actions" role="cell"><button type="button" class="secondary-button" data-operation="view" data-type="${record.type}" data-id="${escapeHtml(record.id)}">View</button><button type="button" data-operation="toggle" data-type="${record.type}" data-id="${escapeHtml(record.id)}" ${operationsBusyRecords.has(key) ? 'disabled' : ''}>${operationsBusyRecords.has(key) ? 'Saving…' : record.completed ? 'Reopen' : 'Complete'}</button></div>
  </article>`;
}
function renderOperationsWorkspace() {
  if (activePageId() !== 'requestsPage' || !document.getElementById('operationsList')) return;
  const all = operationsRecords();
  const counts = {Open:all.filter(r=>!r.completed).length,Urgent:all.filter(operationsUrgent).length,Completed:all.filter(r=>r.completed).length,All:all.length};
  document.getElementById('operationsStatusTabs').innerHTML = Object.entries(counts).map(([name,count]) => `<button type="button" role="tab" id="operations-tab-${name}" aria-controls="operationsList" aria-selected="${operationsState.status === name}" tabindex="${operationsState.status === name ? 0 : -1}" data-operations-status="${name}" class="${operationsState.status === name ? 'is-active' : ''}">${name} <span>${count}</span></button>`).join('');
  const query = document.getElementById('operationsSearch').value.trim().toLowerCase();
  const type = document.getElementById('operationsType').value;
  const records = all.filter(record => (type === 'all' || record.type === type)
    && (operationsState.status === 'All' || (operationsState.status === 'Open' && !record.completed) || (operationsState.status === 'Completed' && record.completed) || (operationsState.status === 'Urgent' && operationsUrgent(record)))
    && (!query || [record.issue,record.requestText,record.category,record.location,record.reason,record.suggestedAction,record.requestedBy,record.reportedBy,record.completedBy].join(' ').toLowerCase().includes(query)))
    .sort((a,b) => Number(operationsUrgent(b)) - Number(operationsUrgent(a)) || String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')) || a.id.localeCompare(b.id));
  const visible = records.slice(0,operationsState.limit);
  const list = document.getElementById('operationsList');
  list.setAttribute('aria-labelledby','operations-tab-' + operationsState.status);
  list.innerHTML = visible.length ? `<div role="table" aria-label="Work items"><div class="operations-table-head" role="row"><span role="columnheader">Item</span><span role="columnheader">Type</span><span role="columnheader">Reported by</span><span role="columnheader">Status</span><span role="columnheader">Actions</span></div>${visible.map(operationsRow).join('')}</div>` : '<div class="operations-empty"><h3>No matching items</h3><p>Try another status or type, clear your search, or add a new item.</p></div>';
  document.getElementById('operationsListFooter').innerHTML = `<span>Showing ${visible.length} of ${records.length} items</span>${visible.length < records.length ? '<button type="button" class="secondary-button" id="operationsLoadMore">Load 50 more</button>' : ''}`;
}

function restoreOperationsForms() {
  for (const [form,home] of operationsFormHomes) { home.append(form); form.hidden = false; }
  operationsFormHomes.clear();
}
function setOperationsComposerType(type) {
  if (operationsSubmitting.size) return;
  for (const candidate of ['request','maintenance']) {
    document.getElementById(candidate + 'Form').hidden = candidate !== type;
    const button = document.querySelector(`[data-operation-form-type="${candidate}"]`);
    button?.setAttribute('aria-pressed',String(candidate === type));
  }
}
function openOperationsComposer() {
  if (!operationsCanWrite()) return showToast('Staff access is required.');
  restoreOperationsForms();
  showDetailDialog('New item', '<div class="operations-composer"><div class="operations-composer-types" aria-label="Item type"><button type="button" class="secondary-button" data-operation-form-type="request">Request</button><button type="button" class="secondary-button" data-operation-form-type="maintenance">Maintenance</button></div><p id="operationsFormFeedback" role="status" aria-live="polite"></p><div id="operationsFormMount"></div></div>');
  for (const type of ['request','maintenance']) {
    const form = document.getElementById(type + 'Form');
    operationsFormHomes.set(form, form.parentElement);
    if (!form.querySelector('[data-operation-cancel]')) {
      const cancel = document.createElement('button');
      cancel.type = 'button'; cancel.className = 'secondary-button'; cancel.dataset.operationCancel = 'true'; cancel.textContent = 'Cancel';
      const footer = document.createElement('div'); footer.className = 'operations-form-footer';
      footer.append(cancel,form.querySelector('button[type="submit"]')); form.append(footer);
    }
    document.getElementById('operationsFormMount').append(form);
  }
  setOperationsComposerType(document.getElementById('operationsType').value === 'maintenance' ? 'maintenance' : 'request');
}
async function persistOperation(record) {
  if (!operationsCanWrite() || !canWriteRemoteRecordType(record.type)) throw new Error('Your account cannot save this item.');
  if (!localTestMode && !supabaseClient) throw new Error('Sign in and reconnect before saving.');
  const result = await sendPayload(record, {quiet:true});
  if (!result?.ok || result.skippedRemote || (!localTestMode && result.local)) throw new Error('The database save was not confirmed. Please retry.');
  return upsertRecord(record.type,record);
}
async function submitOperationsForm(form,type) {
  if (!['request','maintenance'].includes(type) || operationsSubmitting.has(form) || !validateForm(form)) return;
  const feedback = document.getElementById('operationsFormFeedback');
  operationsSubmitting.add(form);
  const controls = [...document.querySelectorAll('.operations-composer button'),document.getElementById('closeDetailDialog')];
  controls.forEach(button => {button.disabled = true;});
  feedback.textContent = 'Saving item…';
  let saved = null;
  try {
    if (!operationsCanWrite()) throw new Error('Staff access is required.');
    let pending = operationsPendingForms.get(form);
    if (!pending) { pending = {id:uid(type)}; operationsPendingForms.set(form,pending); }
    const mediaInput = document.getElementById(type + 'Media');
    // Retain uploaded paths on a failed save; retrying must not upload duplicates.
    const filesKey = Array.from(mediaInput.files || []).map(file=>[file.name,file.size,file.lastModified].join(':')).join('|');
    if (!pending.mediaItems || pending.filesKey !== filesKey) {
      pending.mediaItems = await uploadMediaFiles(mediaInput,type === 'request' ? 'requests' : 'maintenance',{allowedTypes:IMAGE_UPLOAD_TYPES,allowedExtensions:['.jpg','.jpeg','.png','.webp'],label:type + ' image'});
      pending.filesKey = filesKey;
    }
    const staff = staffIdentity();
    const fields = formPayload(form);
    const urgent = form.querySelector(type === 'request' ? '[name="urgentNeeds"]' : '[name="urgentAttention"]').checked;
    const record = {...fields,type,id:pending.id,submittedAt:new Date().toISOString(),status:'Active',completed:false,completedAt:'',completedBy:'',removed:false,removedAt:'',removedBy:'',mediaItems:pending.mediaItems,mediaFiles:pending.mediaItems.map(file=>file.name).join(', '),...(type === 'request' ? {requestedBy:staff.name,requestedByEmail:staff.email,urgentNeeds:urgent} : {reportedBy:staff.name,reportedByEmail:staff.email,urgentAttention:urgent})};
    saved = await persistOperation(record);
    operationsPendingForms.delete(form);
    let notificationWarning = '';
    try { await notifyIfNeeded(saved,type === 'request' ? (urgent ? 'urgentKennelRequestCreated' : 'kennelRequestCreated') : (urgent ? 'urgentMaintenanceCreated' : 'maintenanceCreated')); }
    catch(error) { notificationWarning = ' The item was saved, but its alert could not finish. Please check Alerts before retrying a notification.'; }
    form.reset(); restoreOperationsForms();
    operationsState.status = 'Open'; operationsState.limit = 50;
    document.getElementById('operationsType').value = 'all'; document.getElementById('operationsSearch').value = '';
    renderOperationsWorkspace();
    showDetailDialog(operationsTypeLabel(type) + ' logged', `<div class="operations-detail"><p role="status">Saved successfully.${escapeHtml(notificationWarning)}</p>${type === 'request' ? requestDetailHtml(saved) : maintenanceDetailHtml(saved)}</div>`);
  } catch(error) {
    feedback.textContent = saved ? 'Saved, but the view could not refresh. Close and reopen this workspace.' : `Not saved: ${error.message} Your draft is kept for retry.`;
  } finally {
    operationsSubmitting.delete(form); controls.forEach(button => {button.disabled = false;});
  }
}
function openOperationDetail(type,id) {
  const record = readRecords(type).find(item=>item.id === id && !item.removed);
  if (!record) return showToast('This item is no longer available.');
  restoreOperationsForms();
  showDetailDialog(operationsTypeLabel(type), `<div class="operations-detail"><span class="operations-badge ${record.completed ? 'completed' : operationsUrgent(record) ? 'urgent' : 'open'}">${record.completed ? 'Completed' : operationsUrgent(record) ? 'Urgent' : 'Open'}</span>${type === 'request' ? requestDetailHtml(record) : maintenanceDetailHtml(record)}<div class="operations-detail-actions"><button type="button" data-operation="toggle" data-type="${type}" data-id="${escapeHtml(id)}">${record.completed ? 'Reopen item' : 'Mark completed'}</button>${currentRole() === 'admin' ? `<button type="button" class="secondary-button danger-button" data-operation="remove" data-type="${type}" data-id="${escapeHtml(id)}">Remove item</button>` : ''}</div></div>`);
}
async function changeOperation(action,type,id) {
  if (!['request','maintenance'].includes(type) || !operationsCanWrite()) return;
  const key = type + ':' + id;
  if (operationsBusyRecords.has(key)) return;
  const record = readRecords(type).find(item=>item.id === id && !item.removed);
  if (!record || (action === 'remove' && currentRole() !== 'admin')) return;
  if (action === 'remove' && !window.confirm('Remove this item from the workspace? Its record will be retained as removed.')) return;
  operationsBusyRecords.add(key); renderOperationsWorkspace();
  document.querySelectorAll('.operations-detail-actions button').forEach(button=>{button.disabled=true;});
  try {
    const now = new Date().toISOString();
    const payload = action === 'remove' ? {...record,type,removed:true,removedAt:now,removedBy:staffIdentity().name} : {...record,type,completed:!record.completed,status:record.completed ? 'Active' : 'Completed',completedAt:record.completed ? '' : now,completedBy:record.completed ? '' : staffIdentity().name};
    await persistOperation(payload);
    document.getElementById('operationsFeedback').textContent = action === 'remove' ? 'Item removed.' : record.completed ? 'Item reopened.' : 'Item completed.';
    if (document.querySelector('.operations-detail-actions')) {
      if (action === 'remove') document.getElementById('closeDetailDialog').click(); else openOperationDetail(type,id);
    }
  } catch(error) {
    const message = 'Change not saved: ' + error.message;
    document.getElementById('operationsFeedback').textContent = message;
    if (document.querySelector('.operations-detail')) showToast(message);
  } finally {
    operationsBusyRecords.delete(key); renderOperationsWorkspace();
    document.querySelectorAll('.operations-detail-actions button').forEach(button=>{button.disabled=false;});
  }
}

document.addEventListener('click', event => {
  if (event.target.closest('#newOperationsItem')) {openOperationsComposer();return;}
  const status = event.target.closest('[data-operations-status]');
  if (status) {operationsState.status=status.dataset.operationsStatus;operationsState.limit=50;renderOperationsWorkspace();document.getElementById('operations-tab-'+operationsState.status).focus();}
  if (event.target.closest('#operationsLoadMore')) {operationsState.limit+=50;renderOperationsWorkspace();}
  const type = event.target.closest('[data-operation-form-type]');
  if (type) setOperationsComposerType(type.dataset.operationFormType);
  if (event.target.closest('[data-operation-cancel]')) document.getElementById('closeDetailDialog').click();
  const action = event.target.closest('[data-operation]');
  if (!action || !['request','maintenance'].includes(action.dataset.type)) return;
  if (action.dataset.operation === 'view') openOperationDetail(action.dataset.type,action.dataset.id);
  else changeOperation(action.dataset.operation,action.dataset.type,action.dataset.id);
});
document.addEventListener('input',event=>{if(event.target.id === 'operationsSearch'){operationsState.limit=50;renderOperationsWorkspace();}});
document.addEventListener('change',event=>{if(event.target.id === 'operationsType'){operationsState.limit=50;renderOperationsWorkspace();}});
document.addEventListener('keydown',event=>{
  const tab=event.target.closest('[data-operations-status]');
  if(!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const names=['Open','Urgent','Completed','All'];let index=names.indexOf(tab.dataset.operationsStatus);
  index=event.key==='Home'?0:event.key==='End'?3:(index+(event.key==='ArrowRight'?1:3))%4;
  operationsState.status=names[index];operationsState.limit=50;renderOperationsWorkspace();document.getElementById('operations-tab-'+names[index]).focus();
});
document.addEventListener('close',event=>{if(event.target.id === 'detailDialog')restoreOperationsForms();},true);
document.addEventListener('cancel',event=>{if(event.target.id==='detailDialog'&&operationsSubmitting.size){event.preventDefault();event.stopImmediatePropagation();}},true);
