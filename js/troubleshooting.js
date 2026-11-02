/* Bounded, best-effort diagnostics. Never pass care payloads or raw errors to storage. */
var troubleshootingRows = [];
var troubleshootingPending = 0;
var troubleshootingRecent = new Map();
var troubleshootingLoads = 0;
function troubleshootingToken(value, max = 100) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.:/ -]*$/.test(value) ? value.slice(0, max) : '';
}
function troubleshootingError(error = {}) {
  const code = /^[A-Z0-9_-]{1,32}$/.test(String(error.code || '')) ? String(error.code) : 'UNKNOWN';
  const message = String(error.message || '');
  // Use fixed messages; database error details can contain entire private rows.
  const category = /Only admins can change existing care history/.test(message) ? 'history_protected'
    : /Care history IDs must identify a single entry/.test(message) ? 'duplicate_history_id'
    : /row.level security|permission denied/i.test(message) ? 'permission_denied'
    : /timeout|timed out|abort/i.test(message) ? 'timeout'
    : /fetch|network|offline/i.test(message) ? 'network' : 'save_failed';
  const messages = {history_protected:'Existing care history would be changed or omitted.',duplicate_history_id:'A care history ID was duplicated.',permission_denied:'The database denied this write.',timeout:'Request timed out; persistence is uncertain.',network:'Network request failed; persistence is uncertain.',save_failed:'Save failed. Use the error code and record ID to investigate.'};
  return {error_code:code, category, message:messages[category]};
}
function troubleshootingEvent(context = {}) {
  return {
    operation:context.operation === 'care.submit' ? 'care.submit' : 'record.save',
    record_type:troubleshootingToken(context.recordType, 48),
    record_id:troubleshootingToken(context.recordId, 120),
    dog_id:troubleshootingToken(context.dogId, 120),
    care_type:['Bath','Training','Treadmill','Scooter','Yard Run','Heat Note','Medical/Behavior Note'].includes(context.careType) ? context.careType : '',
    work_date:/^\d{4}-\d{2}-\d{2}$/.test(context.workDate || '') ? context.workDate : null,
    ...troubleshootingError(context.error),
    request_id:/^[a-f0-9-]{16,64}$/i.test(context.error?.requestId || '') ? context.error.requestId : '',
    app_version:'troubleshooting-v1',
  };
}
function recordTroubleshootingEvent(context) {
  // A diagnostic must never throw synchronously or delay the care workflow.
  try {
    if (typeof localTestMode === 'undefined' || localTestMode || !supabaseClient || !['admin','manager','staff','helper'].includes(currentRole())) return;
    const event = troubleshootingEvent(context);
    const key = JSON.stringify(event);
    const now = Date.now();
    for (const [k, at] of troubleshootingRecent) if (now-at > 60000) troubleshootingRecent.delete(k);
    if (troubleshootingPending >= 5 || troubleshootingRecent.size >= 20 || troubleshootingRecent.has(key)) return;
    troubleshootingRecent.set(key, now);
    troubleshootingPending++;
    void (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        // Actor and time are database defaults; no user-supplied identity or SELECT on insert.
        await cuddleStayRequest(db => db.from('troubleshooting_events').insert(event).abortSignal(controller.signal));
      } catch (_) { /* Logging is intentionally best effort. */ }
      finally { clearTimeout(timer); troubleshootingPending--; }
    })();
  } catch (_) { /* Diagnostics cannot turn a handled save error into another failure. */ }
}
function troubleshootingText(rows, filter = '') {
  const lines = rows.map(row => [row.created_at, row.operation, 'actor='+row.actor_id, 'dog='+row.dog_id, 'care='+row.care_type, 'date='+(row.work_date || ''), 'record='+row.record_type+':'+row.record_id, 'code='+row.error_code, row.category, row.message, 'request='+row.request_id, row.app_version].map(v => String(v || '').replace(/[\r\n\t]/g,' ')).join(' | '));
  return lines.filter(line => line.toLowerCase().includes(filter.toLowerCase())).join('\n');
}
function renderTroubleshootingText() {
  const field = document.getElementById('troubleshootingText');
  if (!field) return;
  if (currentRole() !== 'admin') { field.value=''; troubleshootingRows=[]; return; }
  field.value=troubleshootingText(troubleshootingRows,document.getElementById('troubleshootingFilter')?.value || '');
}
function renderTroubleshootingPanel() {
  const panel=document.getElementById('troubleshootingLogPanel');
  if (!panel) return;
  panel.hidden=currentRole() !== 'admin';
  if (panel.hidden) { troubleshootingRows=[]; renderTroubleshootingText(); return; }
  const since=document.getElementById('troubleshootingSince');
  if (!since.value) since.value=new Date(Date.now()-13*86400000).toISOString().slice(0,10);
  // Explicit refresh avoids a database read for every unrelated settings render.
}
async function loadTroubleshootingLog() {
  renderTroubleshootingPanel();
  if (currentRole() !== 'admin') return;
  const generation=++troubleshootingLoads;
  const status=document.getElementById('troubleshootingStatus');
  status.textContent='Loading log…';
  troubleshootingRows=[]; renderTroubleshootingText();
  try {
    if (localTestMode || !supabaseClient) throw Error('offline');
    const selected=document.getElementById('troubleshootingSince').value;
    const earliest=new Date(Date.now()-14*86400000).toISOString();
    const since=/^\d{4}-\d{2}-\d{2}$/.test(selected) ? new Date(selected+'T00:00:00Z').toISOString() : earliest;
    const result=await withRemoteRequestTimeout(cuddleStayRequest(db => db.from('troubleshooting_events').select('*').gte('created_at',since > earliest ? since : earliest).order('created_at',{ascending:false}).limit(200)), 'Troubleshooting log');
    if (result.error) throw result.error;
    if (currentRole() !== 'admin' || generation !== troubleshootingLoads) return;
    troubleshootingRows=result.data || [];
    renderTroubleshootingText();
    status.textContent=troubleshootingRows.length ? troubleshootingRows.length+' events loaded (newest first). Client-reported diagnostics; historical failures before logging was enabled are unavailable.' : 'No captured events in this range. This does not prove every save succeeded.';
  } catch (_) {
    if (generation===troubleshootingLoads && currentRole()==='admin') status.textContent='Log unavailable. Verify the diagnostics database setup and connection. No historical events were reconstructed.';
  }
}
document.addEventListener('input', event => { if (event.target.id==='troubleshootingFilter') renderTroubleshootingText(); });
document.addEventListener('click', event => {
  if (event.target.closest('#refreshTroubleshootingLog')) void loadTroubleshootingLog();
  if (event.target.closest('#copyTroubleshootingLog') && currentRole()==='admin') {
    const field=document.getElementById('troubleshootingText');
    Promise.resolve().then(()=>navigator.clipboard.writeText(field.value)).then(()=>{document.getElementById('troubleshootingStatus').textContent='Copied text.';}).catch(()=>{field.focus();field.select();document.getElementById('troubleshootingStatus').textContent='Select and copy the text manually.';});
  }
});
