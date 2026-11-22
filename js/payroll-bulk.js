/* One review and one atomic insert; every employee-week retains its own receipt. */
var payrollBulkSelection = new Set();
var payrollBulkOwner = '';
var payrollBulkReview = null;
var PAYROLL_BULK_LIMIT = 50;

function payrollBulkEligible(row) {
  return Boolean(row.staffId && !row.missingRate && row.week < payrollWeekStart(payrollToday()) && row.entries.some(entry=>!entry.paid));
}
function payrollBulkSync(groups) {
  const owner=payrollReceiptOwner();
  if (owner!==payrollBulkOwner) { payrollBulkSelection.clear(); payrollBulkReview=null; payrollBulkOwner=owner; }
  const eligible=new Set(groups.filter(payrollBulkEligible).map(row=>row.key));
  for (const key of payrollBulkSelection) if (!eligible.has(key)) payrollBulkSelection.delete(key);
}
function payrollBulkToolbar(groups) {
  payrollBulkSync(groups);
  const selected=groups.filter(row=>payrollBulkSelection.has(row.key));
  const total=selected.reduce((sum,row)=>sum+row.totalCents-row.paidCents,0);
  return `<section class="payroll-bulk-toolbar" aria-label="Bulk payroll selection"><div><strong>${selected.length} employee-week${selected.length===1?'':'s'} selected · ${payrollMoney(total/100)} gross</strong><small>Select past weeks below, then confirm them together. Up to ${PAYROLL_BULK_LIMIT} employee-weeks per batch; current, paid and missing-rate weeks are excluded.</small></div><div class="button-row"><button type="button" class="secondary-button" data-payroll-action="bulk-select">Select past weeks shown</button><button type="button" class="secondary-button" data-payroll-action="bulk-clear" ${selected.length?'':'disabled'}>Clear selection</button><button type="button" data-payroll-action="bulk-review" ${selected.length?'':'disabled'}>Review selected & mark paid</button></div></section>`;
}
function payrollBulkCheckbox(row) {
  return payrollBulkEligible(row) ? `<label class="inline-check payroll-bulk-choice"><input type="checkbox" data-payroll-bulk-key="${escapeHtml(row.key)}" ${payrollBulkSelection.has(row.key)?'checked':''} aria-label="Select ${escapeHtml(row.staffName)} week of ${row.week}"> Select week</label>` : '';
}
function payrollBulkValidateSelection(items) {
  if (!Array.isArray(items) || !items.length || items.length>PAYROLL_BULK_LIMIT) throw new Error('Select between 1 and 50 employee-weeks.');
  const keys=new Set();
  for (const item of items) {
    const key=item.staffId+'|'+item.weekStart;
    if (!item.staffId || !/^\d{4}-\d{2}-\d{2}$/.test(item.weekStart) || payrollWeekStart(item.weekStart)!==item.weekStart || item.weekStart>=payrollWeekStart(payrollToday())) throw new Error('Bulk confirmation is for past payroll weeks only.');
    if (keys.has(key)) throw new Error('A payroll week was selected more than once.');
    keys.add(key);
  }
}
async function payrollBulkFetchPreview(items) {
  payrollBulkValidateSelection(items);
  await ensurePayrollPaymentsLoaded(true);
  if (localTestMode) return [...items].sort((a,b)=>a.staffId.localeCompare(b.staffId)||a.weekStart.localeCompare(b.weekStart)).map(item=>payrollLocalPreview(item.staffId,item.weekStart));
  const {data,error}=await cuddleStayRequest(db=>db.rpc('payroll_bulk_preview',{p_items:items}));
  if (error) throw error;
  return data;
}
function payrollBulkVerifyPreviews(items,snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length!==items.length) throw new Error('Some selected payroll could not be reviewed. Refresh and try again.');
  const requested=new Set(items.map(item=>item.staffId+'|'+item.weekStart));
  const clocks=new Set();
  for (const snapshot of snapshots) {
    if (!requested.delete(snapshot.staffId+'|'+snapshot.weekStart) || !snapshot.lines?.length || snapshot.amountCents<=0) throw new Error('Payroll review does not match the selected weeks.');
    for (const line of snapshot.lines) {
      if (clocks.has(line.id)) throw new Error('The same clock entry appears in more than one selected payroll.');
      clocks.add(line.id);
    }
  }
}
async function openPayrollBulkReview() {
  if (currentRole()!=='admin') return;
  const owner=payrollReceiptOwner();
  const items=payrollHistoryRows().filter(row=>payrollBulkSelection.has(row.key)&&payrollBulkEligible(row)).map(row=>({staffId:row.staffId,weekStart:row.week}));
  const snapshots=await payrollBulkFetchPreview(items);
  payrollBulkVerifyPreviews(items,snapshots);
  if (owner!==payrollReceiptOwner()) throw new Error('Account changed. Reopen payroll.');
  payrollBulkReview={owner,rows:snapshots.map(snapshot=>({id:crypto.randomUUID(),snapshot}))};
  const total=snapshots.reduce((sum,row)=>sum+row.amountCents,0);
  showDetailDialog('Confirm multiple payroll weeks',`<form id="payrollBulkForm" class="tracker-form"><p class="payroll-confirm-total"><strong>${payrollMoney(total/100)}</strong> gross across ${snapshots.length} employee-weeks</p><p>Review the actual payment date and method for each week. This records payments already made and locks each week's hours, rates and gross amount. No money is transferred.</p><fieldset class="payroll-bulk-common"><legend>Apply common payment details</legend><div class="field-grid"><label>Common date paid<input type="date" name="commonDate" max="${payrollToday()}" value="${payrollToday()}"></label><label>Common payment method<select name="commonMethod">${payrollPaymentMethodOptions()}</select></label></div><button type="button" class="secondary-button" data-payroll-action="bulk-apply">Apply to all selected weeks</button><small>You can adjust each week below.</small></fieldset><div class="payroll-bulk-review-list">${payrollBulkReview.rows.map(({id,snapshot})=>`<article class="payroll-bulk-review-week"><h3>${escapeHtml(snapshot.staffName)} · ${payrollMoney(snapshot.amountCents/100)}</h3><p>${escapeHtml(timesheetDateLabel(snapshot.weekStart))} – ${escapeHtml(timesheetDateLabel(snapshot.weekEnd))}</p><div class="field-grid"><label>Date paid<input type="date" name="date-${id}" required min="${snapshot.lines.map(line=>line.date).sort().at(-1)}" max="${payrollToday()}" value="${payrollToday()}"></label><label>Payment method<select name="method-${id}" required>${payrollPaymentMethodOptions()}</select></label></div><label>Payment reference<input name="reference-${id}" maxlength="200" placeholder="Check number or transfer reference"></label><details><summary>Review ${snapshot.lines.length} clock entries and rates</summary>${payrollSnapshotTable(snapshot)}</details></article>`).join('')}</div><label>Note for these confirmations<textarea name="note" maxlength="4000" rows="2"></textarea></label><label class="inline-check"><input type="checkbox" name="confirmed" required> I confirm all selected payroll weeks were already paid and their dates, methods, hours, rates and gross amounts are correct.</label><p>All selected weeks save together. If any payroll changed since this review, the entire batch is rejected for review.</p><p role="alert" class="payroll-form-error"></p><div class="button-row"><button type="submit">Mark all selected paid & lock</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div></form>`);
}
function payrollBulkRowsFromForm(form,review) {
  if (!review || !form.elements.confirmed.checked) throw new Error('Confirm the selected payments first.');
  return review.rows.map(({id,snapshot})=>{
    const paid_date=form.elements.namedItem('date-'+id).value;
    const payment_method=form.elements.namedItem('method-'+id).value;
    if (!paid_date || paid_date>payrollToday() || paid_date<snapshot.lines.map(line=>line.date).sort().at(-1) || !payment_method) throw new Error('Check the payment dates and methods for every selected week.');
    return {id,staff_id:snapshot.staffId,week_start:snapshot.weekStart,paid_date,payment_method,reference:form.elements.namedItem('reference-'+id).value.trim(),note:form.elements.note.value.trim(),snapshot};
  });
}
async function payrollBulkPersist(rows) {
  if (currentRole()!=='admin') throw new Error('Admin access required.');
  payrollBulkValidateSelection(rows.map(row=>({staffId:row.staff_id,weekStart:row.week_start})));
  for (const row of rows) {
    if (!row.paid_date || row.paid_date>payrollToday() || row.paid_date<row.snapshot.lines.map(line=>line.date).sort().at(-1) || !row.payment_method) throw new Error('Check the payment dates and methods for every selected week.');
  }
  if (localTestMode) {
    // Validate the whole batch before one storage write, mirroring Postgres rollback.
    const saved=rows.map(row=>{
      const fresh=payrollLocalPreview(row.staff_id,row.week_start);
      if (JSON.stringify(fresh)!==JSON.stringify(row.snapshot)) throw new Error('Payroll changed since review. No selected weeks were saved. Reopen the review.');
      return {...row,amount_cents:fresh.amountCents,recorded_at:new Date().toISOString()};
    });
    localStorage.setItem('kennel-qa-payroll-receipts',JSON.stringify([...payrollReceiptCache().rows,...saved]));
  } else {
    // PostgREST executes this array as ONE SQL statement. One failed trigger rolls
    // back every row. Stable UUIDs allow verification after a lost response.
    const {error}=await cuddleStayRequest(db=>db.from('payroll_payments').insert(rows));
    if (error) {
      await ensurePayrollPaymentsLoaded(true);
      if (!rows.every(row=>payrollReceiptCache().rows.some(receipt=>receipt.id===row.id))) throw error;
    }
  }
  await ensurePayrollPaymentsLoaded(true);
  if (!rows.every(row=>payrollReceiptCache().rows.some(receipt=>receipt.id===row.id))) throw new Error('Payment verification incomplete. Refresh payroll before retrying.');
}
document.addEventListener('change',event=>{
  const input=event.target.closest('[data-payroll-bulk-key]');
  if (!input || currentRole()!=='admin') return;
  if (input.checked && payrollBulkSelection.size>=PAYROLL_BULK_LIMIT) { input.checked=false;showToast('Select up to 50 employee-weeks per batch.');return; }
  if (input.checked) payrollBulkSelection.add(input.dataset.payrollBulkKey); else payrollBulkSelection.delete(input.dataset.payrollBulkKey);
  // Keep the focused checkbox in place while updating the selection summary.
  const container=document.querySelector('.payroll-bulk-toolbar');
  if (container) container.outerHTML=payrollBulkToolbar(payrollHistoryRows());
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-payroll-action^="bulk-"]');
  if (!button || currentRole()!=='admin') return;
  button.disabled=true;
  try {
    const action=button.dataset.payrollAction;
    if (action==='bulk-select') { payrollBulkSelection=new Set(payrollHistoryRows().filter(payrollBulkEligible).slice(0,PAYROLL_BULK_LIMIT).map(row=>row.key));renderPayrollHistory(); }
    if (action==='bulk-clear') { payrollBulkSelection.clear();renderPayrollHistory(); }
    if (action==='bulk-review') await openPayrollBulkReview();
    if (action==='bulk-apply') {
      const form=document.getElementById('payrollBulkForm');
      for (const {id} of payrollBulkReview.rows) {
        if (form.elements.commonDate.value) form.elements.namedItem('date-'+id).value=form.elements.commonDate.value;
        if (form.elements.commonMethod.value) form.elements.namedItem('method-'+id).value=form.elements.commonMethod.value;
      }
    }
  } catch(error) { showToast(error.message || 'Payroll review failed.'); }
  finally { button.disabled=false; }
});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if (form.id!=='payrollBulkForm') return;
  event.preventDefault();
  if (currentRole()!=='admin' || !form.reportValidity()) return;
  const button=form.querySelector('[type="submit"]');
  if (button.disabled) return;
  button.disabled=true;
  try {
    const review=payrollBulkReview;
    if (review?.owner!==payrollReceiptOwner()) throw new Error('Account changed. Reopen the review.');
    const rows=payrollBulkRowsFromForm(form,review);
    await payrollBulkPersist(rows);
    payrollBulkSelection.clear();payrollBulkReview=null;
    document.getElementById('detailDialog').close();renderTimesheet();
    showToast(`${rows.length} payroll weeks marked paid and locked.`);
  } catch(error) { form.querySelector('.payroll-form-error').textContent=error.message || 'Save failed. Refresh and try again.'; }
  finally { button.disabled=false; }
});
