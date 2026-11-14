/* Effective rates and immutable, administrator-confirmed weekly payroll receipts. */
var payrollReceiptState = { owner: '', loaded: false, loading: null, rows: [], error: '' };
var payrollHistoryStart = '';
var payrollHistoryEnd = '';
var payrollHistoryStaff = '';
var payrollReviewSnapshot = null;
var payrollRateReview = null;

function payrollToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
}
function payrollWeekStart(date) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0,10);
}
function payrollRateOnDate(user = {}, date = payrollToday()) {
  const history = Array.isArray(user.hourlyRateHistory) ? user.hourlyRateHistory : [];
  const applicable = history.map((row,index) => ({...row,index})).filter(row => row.effectiveDate <= date)
    .sort((a,b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.index-a.index)[0];
  const rate = Number(applicable ? applicable.rate : history.length ? 0 : user.hourlyRate ?? user.payRate ?? user.staffHourlyRate ?? 0);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}
function payrollRateLabel(item) {
  if (item.missingRate) return 'Rate not set';
  const rates = item.rates || [item.rate];
  return rates.length > 1 ? 'Multiple rates' : payrollMoney(rates[0]) + '/hr';
}
function payrollAmountCents(hours,rate) {
  // Integer hundredths avoid binary floating-point errors at half-cent boundaries.
  return Math.round(Math.round(Number(hours)*100)*Math.round(Number(rate)*100)/100);
}
function payrollReceiptOwner() {
  return currentRole() === 'admin' ? String(currentUser?.email || '') + ':' + String(localTestMode) : '';
}
function payrollReceiptCache() {
  const owner = payrollReceiptOwner();
  if (payrollReceiptState.owner !== owner) payrollReceiptState = { owner, loaded:false, loading:null, rows:[], error:'' };
  return payrollReceiptState;
}
async function ensurePayrollPaymentsLoaded(force = false) {
  if (currentRole() !== 'admin') throw new Error('Admin access required.');
  const state = payrollReceiptCache();
  if (state.loading) return state.loading;
  if (state.loaded && !force) return state.rows;
  state.error = '';
  state.loading = (async () => {
    let rows = [];
    if (localTestMode) rows = JSON.parse(localStorage.getItem('kennel-qa-payroll-receipts') || '[]');
    else {
      if (!supabaseClient) throw new Error('Sign in before reviewing payroll.');
      for (let start = 0; ; start += 500) {
        const result = await cuddleStayRequest(db => db.from('payroll_payments').select('*').order('recorded_at').order('id').range(start,start+499));
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if ((result.data || []).length < 500) break;
      }
    }
    if (payrollReceiptOwner() !== state.owner) throw new Error('Account changed. Reopen payroll.');
    state.rows = rows; state.loaded = true;
    return rows;
  })().catch(error => { state.loaded = false; state.error = error.message || 'Payroll payments could not be loaded.'; throw error; })
    .finally(() => { state.loading = null; });
  return state.loading;
}
function payrollPaidItem(id) {
  const state = payrollReceiptCache();
  if (!state.loaded) return null;
  for (const receipt of state.rows) {
    const line = (receipt.snapshot?.lines || []).find(item => item.id === id);
    if (line) return { ...line, paymentId: receipt.id, paidDate: receipt.paid_date };
  }
  return null;
}
function payrollApplyPaidSnapshot(entry) {
  const paid = payrollPaidItem(entry.id);
  return paid ? { ...entry, ...paid, total:paid.amountCents/100, missingRate:false, paid:true } : entry;
}
function payrollReplaceStaff(user) {
  writeRecords('settingsUser', readRecords('settingsUser').map(row => row.id === user.id ? {...row,...user} : row));
}
async function payrollRefreshStaff(id) {
  if (localTestMode) return readRecords('settingsUser').find(row => row.id === id);
  const {data,error} = await cuddleStayRequest(db => db.from('kennel_records').select('id,payload').eq('id',id).eq('type','settingsUser').single());
  if (error) throw error;
  const user = {...data.payload,id:data.id};
  payrollReplaceStaff(user);
  return user;
}
function payrollHistoryRows() {
  const start = payrollWeekStart(payrollHistoryStart);
  const end = payrollHistoryEnd;
  const summary = staffPayrollSummaryForRange({start,end:addDays(payrollWeekStart(end),6)}, {includeAll:true});
  const groups = new Map();
  for (const entry of summary.entries) {
    const week = payrollWeekStart(entry.date);
    const identity = entry.staffId || normalizeEmail(entry.staffEmail) || entry.staffName;
    const key = week + '|' + identity;
    if (!groups.has(key)) groups.set(key, {key,week,staffId:entry.staffId,staffName:entry.staffName,entries:[],paidCents:0,totalCents:0,hours:0,missingRate:false});
    const group = groups.get(key);
    group.entries.push(entry); group.hours += entry.hours; group.totalCents += Math.round(entry.total*100);
    group.paidCents += entry.paid ? Math.round(entry.total*100) : 0;
    group.missingRate ||= entry.missingRate;
  }
  return [...groups.values()].filter(row => !payrollHistoryStaff || row.staffId === payrollHistoryStaff)
    .sort((a,b) => b.week.localeCompare(a.week) || a.staffName.localeCompare(b.staffName));
}
function renderPayrollHistory() {
  const target = document.getElementById('payrollHistory');
  if (!target) return;
  if (currentRole() !== 'admin') { target.innerHTML=''; payrollReceiptCache(); if (typeof payrollBulkSync==='function') payrollBulkSync([]); return; }
  const state = payrollReceiptCache();
  if (!state.loaded) {
    target.innerHTML = `<p role="status">${escapeHtml(state.error || 'Loading confirmed payroll payments…')}</p>${state.error ? '<button type="button" class="secondary-button" data-payroll-action="retry">Retry payroll history</button>' : ''}`;
    if (!state.loading && !state.error) ensurePayrollPaymentsLoaded().then(() => renderTimesheet()).catch(() => renderPayrollHistory());
    return;
  }
  if (!payrollHistoryEnd) payrollHistoryEnd = payrollToday();
  if (!payrollHistoryStart) payrollHistoryStart = addDays(payrollWeekStart(payrollToday()),-77);
  const users = payrollSettingsUsers();
  const groups = payrollHistoryRows();
  const maximum = Math.max(1,...groups.map(row => row.totalCents));
  const paid = groups.reduce((sum,row) => sum+row.paidCents,0);
  const unpaid = groups.reduce((sum,row) => sum+row.totalCents-row.paidCents,0);
  target.innerHTML = `<div class="payroll-history-heading"><div><h3>Weekly payroll history</h3><p>Monday–Sunday weeks. Payment confirmations lock the saved hours, work-date rates and gross amounts. Earlier weeks need review until you confirm payment.</p></div><button type="button" data-payroll-action="rate">Give a raise / change rate</button></div>
    <form id="payrollHistoryFilter" class="timesheet-date-filter"><label>From week<input type="date" name="start" value="${escapeHtml(payrollHistoryStart)}" required></label><label>Through week<input type="date" name="end" value="${escapeHtml(payrollHistoryEnd)}" required></label><label>Employee<select name="staff"><option value="">All employees</option>${users.map(user => `<option value="${escapeHtml(user.id)}" ${payrollHistoryStaff===user.id?'selected':''}>${escapeHtml(user.name || user.email)}${user.removed?' (removed)':''}</option>`).join('')}</select></label><button type="submit" class="secondary-button">Show weeks</button><button type="button" class="secondary-button" data-payroll-action="refresh">Refresh</button></form>
    <p class="filter-summary">Full weeks intersecting ${escapeHtml(timesheetDateLabel(payrollHistoryStart))} to ${escapeHtml(timesheetDateLabel(payrollHistoryEnd))}. Paid gross: <strong>${payrollMoney(paid/100)}</strong> · Unconfirmed gross: <strong>${payrollMoney(unpaid/100)}</strong>${groups.some(row=>row.missingRate)?' · Some rates need review.':''}</p>
    ${typeof payrollBulkToolbar==='function'?payrollBulkToolbar(groups):''}
    <div class="table-wrap"><table class="data-table payroll-history-table"><thead><tr><th>Week / employee</th><th>Hours</th><th>Gross pay</th><th>Paid gross</th><th>Unconfirmed gross</th><th>Status / action</th></tr></thead><tbody>${groups.map(row => {
      const remaining = row.entries.filter(entry => !entry.paid);
      const paidInFull = !remaining.length;
      const status = paidInFull ? 'Paid & locked' : row.paidCents ? 'Partly paid' : 'Needs review';
      const receipts = state.rows.filter(receipt => receipt.week_start === row.week && receipt.staff_id === row.staffId);
      return `<tr><td data-label="Week / employee"><strong>${escapeHtml(row.staffName)}</strong><span>${escapeHtml(timesheetDateLabel(row.week))} – ${escapeHtml(timesheetDateLabel(addDays(row.week,6)))}</span></td><td data-label="Hours">${row.hours.toFixed(2)}</td><td data-label="Gross pay"><strong>${row.missingRate?'Rate needed':payrollMoney(row.totalCents/100)}</strong><div class="payroll-week-bar" aria-hidden="true"><i style="width:${100*row.totalCents/maximum}%"><b style="width:${row.totalCents?100*row.paidCents/row.totalCents:0}%"></b></i></div></td><td data-label="Paid gross">${payrollMoney(row.paidCents/100)}</td><td data-label="Unconfirmed gross">${row.missingRate?'Rate needed':payrollMoney((row.totalCents-row.paidCents)/100)}</td><td data-label="Status / action">${typeof payrollBulkCheckbox==='function'?payrollBulkCheckbox(row):''}<span class="payroll-status ${paidInFull?'is-paid':''}">${status}</span><div class="button-row">${remaining.length && row.staffId ? `<button type="button" class="secondary-button" data-payroll-action="review" data-staff="${escapeHtml(row.staffId)}" data-week="${row.week}">Review & mark paid</button>`:''}${receipts.map(receipt=>`<button type="button" class="secondary-button" data-payroll-action="receipt" data-id="${receipt.id}">View payment</button>`).join('')}</div>${!row.staffId?'<small>Match this clock entry to a staff account before payment.</small>':''}</td></tr>`;
    }).join('') || '<tr><td colspan="6">No completed payroll entries in these weeks.</td></tr>'}</tbody></table></div>
    <p class="payroll-history-note">Blue bars show gross pay; green shows confirmed paid gross. These are gross payroll confirmations, before taxes or deductions. No money is transferred. Work dates determine effective rates; each clock entry is rounded to two decimal hours and cents.</p>
    <details class="payroll-rate-history"><summary>Staff pay rates & effective dates</summary>${users.filter(user=>!user.removed || (user.hourlyRateHistory||[]).length).map(user=>`<article><strong>${escapeHtml(user.name || user.email)}</strong> · Today: ${payrollMoney(payrollRateOnDate(user))}/hr${payrollRateHistoryHtml(user)}</article>`).join('')}</details>`;
}
function payrollRateHistoryHtml(user) {
  const history = user.hourlyRateHistory || [];
  if (!history.length) return '<p>No dated changes recorded. The existing saved rate is the baseline; confirm historical rates before marking older payroll paid.</p>';
  return '<ul>' + [...history].reverse().map(row => `<li>${payrollMoney(row.rate)}/hr · ${row.baseline?'Previous saved rate (baseline)': 'Effective '+escapeHtml(timesheetDateLabel(row.effectiveDate))}${row.effectiveDate>payrollToday()?' · Scheduled':''}</li>`).join('') + '</ul>';
}
async function openPayrollRate(staffId) {
  if (currentRole() !== 'admin') return;
  const users = payrollSettingsUsers().filter(user => !user.removed);
  const chosen = users.find(user=>user.id===staffId) || users[0];
  if (!chosen) { showToast('Create a staff account in Settings first.'); return; }
  const user = await payrollRefreshStaff(chosen.id);
  payrollRateReview = structuredClone(user);
  showDetailDialog('Effective pay rate', `<form id="payrollRateForm" class="tracker-form"><label>Employee<select name="staff">${users.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===user.id?'selected':''}>${escapeHtml(item.name || item.email)}</option>`).join('')}</select></label><p>Current rate: <strong>${payrollMoney(payrollRateOnDate(user))}/hr</strong>. Earlier work dates keep their previous rate. Paid payroll stays locked even if you correct a past rate.</p><div class="field-grid"><label>New hourly rate<input type="number" name="rate" min="0.01" max="10000" step="0.01" required value="${escapeHtml(user.hourlyRate || '')}"></label><label>Effective date<input type="date" name="effective" min="1900-01-02" required value="${payrollToday()}"></label></div>${payrollRateHistoryHtml(user)}<p role="alert" class="payroll-form-error"></p><div class="button-row"><button type="submit">Save effective rate</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div></form>`);
}
function payrollLocalPreview(staffId, week) {
  const user = readRecords('settingsUser').find(row=>row.id===staffId);
  const records = readRecords('timesheet').filter(row=>!row.removed && staffPayrollUserForRecord(row).id===staffId && timesheetRecordInDateRange(row,week,addDays(week,6)) && !payrollPaidItem(row.id));
  if (records.some(row=>!row.clockOutTime)) throw new Error('An open clock entry needs review before this week can be paid.');
  const lines = records.filter(row=>Number(row.hours)>0).sort((a,b)=>a.id.localeCompare(b.id)).map(row=>{
    const date = timesheetRecordDate(row), rate = payrollRateOnDate(user,date), hours = payrollRoundToHundredth(row.hours);
    if (!rate) throw new Error('Set a historical rate for every work date before confirming payment.');
    return {id:row.id,date,hours,rate,amountCents:payrollAmountCents(hours,rate),staffId:user.id,staffName:row.helperName || user.name,staffEmail:user.email,clockInTime:row.clockInTime,clockOutTime:row.clockOutTime,note:row.note||'',source:structuredClone(row)};
  });
  if (!lines.length) throw new Error('There are no unpaid completed hours for this employee and week.');
  return {staffId,staffName:user.name,staffEmail:user.email,weekStart:week,weekEnd:addDays(week,6),amountCents:lines.reduce((sum,row)=>sum+row.amountCents,0),lines};
}
async function payrollFetchPreview(staffId,week) {
  await ensurePayrollPaymentsLoaded(true);
  await payrollRefreshStaff(staffId);
  if (localTestMode) return payrollLocalPreview(staffId,week);
  const {data,error} = await cuddleStayRequest(db=>db.rpc('payroll_week_preview',{p_staff_id:staffId,p_week_start:week}));
  if (error) throw error;
  return data;
}
function payrollSnapshotTable(snapshot) {
  return `<div class="table-wrap"><table class="data-table payroll-snapshot-table"><thead><tr><th>Work date</th><th>Hours</th><th>Rate</th><th>Gross</th></tr></thead><tbody>${snapshot.lines.map(line=>`<tr><td data-label="Work date">${escapeHtml(payrollWorkDateLabel(line.date))}</td><td data-label="Hours">${Number(line.hours).toFixed(2)}</td><td data-label="Rate">${payrollMoney(line.rate)}/hr</td><td data-label="Gross">${payrollMoney(line.amountCents/100)}</td></tr>`).join('')}</tbody></table></div>`;
}
async function openPayrollPaymentReview(staffId,week) {
  if (currentRole() !== 'admin') return;
  const snapshot = await payrollFetchPreview(staffId,week);
  payrollReviewSnapshot = {snapshot,id:crypto.randomUUID()};
  showDetailDialog('Confirm payroll payment', `<form id="payrollPaymentForm" class="tracker-form"><h3>${escapeHtml(snapshot.staffName)}</h3><p>${escapeHtml(timesheetDateLabel(week))} – ${escapeHtml(timesheetDateLabel(addDays(week,6)))}</p>${payrollSnapshotTable(snapshot)}<p class="payroll-confirm-total">Gross payroll to lock: <strong>${payrollMoney(snapshot.amountCents/100)}</strong></p><p>Verify these historical hours and rates against your payment record. Saving confirms payment already made and locks these clock entries. Any hours added later will remain unpaid.</p><div class="field-grid"><label>Date paid<input type="date" name="paidDate" min="${snapshot.lines.map(row=>row.date).sort().at(-1)}" max="${payrollToday()}" required value="${payrollToday()}"></label><label>Payment method<select name="method" required><option value="">Choose method</option><option>Direct deposit</option><option>Check</option><option>Cash</option><option>Zelle</option><option>Other</option></select></label></div><label>Payment reference<input name="reference" maxlength="200" placeholder="Check number or transfer reference"></label><label>Payment note<textarea name="note" maxlength="4000" rows="2"></textarea></label><label class="inline-check"><input type="checkbox" name="confirmed" required> I confirm this payroll has already been paid and the hours, rates and gross amount are correct.</label><p role="alert" class="payroll-form-error"></p><div class="button-row"><button type="submit">Mark paid & lock</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div></form>`);
}
function openPayrollReceipt(id) {
  if (currentRole() !== 'admin') return;
  const receipt = payrollReceiptCache().rows.find(row=>row.id===id);
  if (!receipt) return;
  const snapshot = receipt.snapshot;
  showDetailDialog('Paid payroll · Locked', `<section class="payroll-receipt"><h3>${escapeHtml(snapshot.staffName)}</h3><p>${escapeHtml(timesheetDateLabel(snapshot.weekStart))} – ${escapeHtml(timesheetDateLabel(snapshot.weekEnd))}</p><p><strong>${payrollMoney(receipt.amount_cents/100)} gross paid</strong> · ${escapeHtml(timesheetDateLabel(receipt.paid_date))} · ${escapeHtml(receipt.payment_method)}</p>${receipt.reference?`<p>Reference: ${escapeHtml(receipt.reference)}</p>`:''}${receipt.note?`<p>${escapeHtml(receipt.note)}</p>`:''}${payrollSnapshotTable(snapshot)}<p>Confirmed ${escapeHtml(formatDateTime(receipt.recorded_at))}. Payment ID: ${escapeHtml(receipt.id)}</p><p>The saved hours, rates and amounts are fixed. This records payment; it does not send money.</p></section>`);
}
async function payrollSaveRate(form) {
  const user = payrollRateReview;
  const rate = Number(form.elements.rate.value), effective = form.elements.effective.value;
  if (!user || form.elements.staff.value !== user.id) throw new Error('Reopen this employee before saving.');
  let saved;
  if (localTestMode) {
    const latest = readRecords('settingsUser').find(row=>row.id===user.id);
    if (JSON.stringify(latest.hourlyRateHistory||[])!==JSON.stringify(user.hourlyRateHistory||[]) || latest.hourlyRate!==user.hourlyRate) throw new Error('Pay rate changed since review. Refresh and try again.');
    const history = [...(latest.hourlyRateHistory||[])];
    if (!history.length) history.push({effectiveDate:'1900-01-01',rate:Number(latest.hourlyRate||0),baseline:true});
    history.push({effectiveDate:effective,rate,recordedAt:new Date().toISOString()});
    saved = {...latest,hourlyRate:rate,hourlyRateEffectiveDate:effective,hourlyRateHistory:history};
  } else {
    const {data,error} = await cuddleStayRequest(db=>db.rpc('set_payroll_rate',{p_staff_id:user.id,p_rate:rate,p_effective_date:effective,p_expected_history:user.hourlyRateHistory||[],p_expected_rate:String(user.hourlyRate??'')}));
    if (error) throw error;
    saved = {...data,id:user.id};
  }
  payrollReplaceStaff(saved);
  await payrollRefreshStaff(user.id);
  document.getElementById('detailDialog').close();
  renderTimesheet(); showToast('Effective pay rate saved. Paid payroll remains locked.');
}
async function payrollSavePayment(form) {
  if (!form.elements.confirmed.checked || !payrollReviewSnapshot) throw new Error('Confirm the payment details first.');
  const review = payrollReviewSnapshot;
  const row = {id:review.id,staff_id:review.snapshot.staffId,week_start:review.snapshot.weekStart,paid_date:form.elements.paidDate.value,payment_method:form.elements.method.value,reference:form.elements.reference.value.trim(),note:form.elements.note.value.trim(),snapshot:review.snapshot};
  if (localTestMode) {
    const fresh = payrollLocalPreview(row.staff_id,row.week_start);
    if (JSON.stringify(fresh)!==JSON.stringify(row.snapshot)) throw new Error('Payroll changed since review. Refresh and review again.');
    if (row.paid_date>payrollToday() || row.paid_date<fresh.lines.map(line=>line.date).sort().at(-1)) throw new Error('Choose a valid payment date.');
    row.amount_cents=fresh.amountCents; row.recorded_at=new Date().toISOString();
    const receipts = [...payrollReceiptCache().rows,row];
    localStorage.setItem('kennel-qa-payroll-receipts',JSON.stringify(receipts));
  } else {
    // The UUID makes network retries recoverable without recording payment twice.
    const {error} = await cuddleStayRequest(db=>db.from('payroll_payments').insert(row));
    if (error) {
      const existing = await cuddleStayRequest(db=>db.from('payroll_payments').select('id').eq('id',row.id).maybeSingle());
      if (!existing.data) throw error;
    }
  }
  await ensurePayrollPaymentsLoaded(true);
  if (!payrollReceiptCache().rows.some(receipt=>receipt.id===row.id)) throw new Error('Payment verification failed. Refresh before retrying.');
  payrollReviewSnapshot=null;
  document.getElementById('detailDialog').close();
  renderTimesheet(); showToast('Payroll marked paid. Hours, rates and gross amounts are locked.');
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-payroll-action]');
  if (!button || currentRole() !== 'admin') return;
  button.disabled=true;
  try {
    const action = button.dataset.payrollAction;
    if (action==='rate') await openPayrollRate();
    if (action==='review') await openPayrollPaymentReview(button.dataset.staff,button.dataset.week);
    if (action==='receipt') openPayrollReceipt(button.dataset.id);
    if (action==='refresh' || action==='retry') { await ensurePayrollPaymentsLoaded(true); renderTimesheet(); }
  } catch (error) { showToast(error.message || 'Payroll could not be loaded.'); renderPayrollHistory(); }
  finally { button.disabled=false; }
});
document.addEventListener('change', async event => {
  if (event.target.matches('#payrollRateForm select[name="staff"]')) {
    try { await openPayrollRate(event.target.value); } catch(error) { showToast(error.message); }
  }
});
document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['payrollHistoryFilter','payrollRateForm','payrollPaymentForm'].includes(form.id)) return;
  event.preventDefault();
  if (currentRole() !== 'admin' || !form.reportValidity()) return;
  const button=form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  button.disabled=true;
  try {
    if (form.id==='payrollHistoryFilter') {
      if (form.elements.start.value>form.elements.end.value) throw new Error('From week must be before through week.');
      payrollHistoryStart=form.elements.start.value; payrollHistoryEnd=form.elements.end.value; payrollHistoryStaff=form.elements.staff.value; renderPayrollHistory();
    } else if (form.id==='payrollRateForm') await payrollSaveRate(form);
    else await payrollSavePayment(form);
  } catch(error) {
    const alert = form.querySelector('.payroll-form-error');
    if (alert) alert.textContent=error.message || 'Save failed. Refresh and try again.'; else showToast(error.message);
  } finally { button.disabled=false; }
});
