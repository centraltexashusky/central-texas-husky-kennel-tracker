/* Stay receipts are credits against charges, not additional ledger income. */
function boardingPaymentRecords(record = {}) {
  const ids = new Set([record.id, ...(record.sourceRecordIds || [])]);
  return readRecords('boardingDog').filter(item => ids.has(item.id) && !item.removed);
}

function boardingPaymentSummary(record = {}, stay = {}) {
  const code = boardingStayRequestCode(record, stay);
  const ids = new Set([stay.id, ...(stay.sourceStayIds || [])].filter(Boolean));
  const receipts = new Map();
  const cancellations = new Map();
  [...boardingPaymentRecords(record), record].forEach(source => {
    (source.boardingPaymentCancellations || []).forEach(item => cancellations.set(item.paymentId, item));
    (source.boardingPayments || []).forEach(payment => {
      if (payment.id && (ids.has(payment.stayId) || (code && payment.requestCode === code))) receipts.set(payment.id, payment);
    });
  });
  const payments = [...receipts.values()].map(p => ({ ...p, cancellation: cancellations.get(p.id) }))
    .sort((a, b) => String(a.receivedDate).localeCompare(String(b.receivedDate)));
  const total = Math.round(Number(boardingStayInvoiceTotal(record, stay) || 0) * 100);
  const paid = payments.reduce((sum, item) => sum + (item.cancellation ? 0 : Math.round(Number(item.amount) * 100)), 0);
  // A legacy paid flag is only trustworthy for the checked-out stay, never a new stay.
  const legacyPaid = !payments.length && (stay.paymentStatus === 'Paid' ||
    (boardingStayDisplayStatus(record, stay) === 'Checked Out' && record.paymentStatus === 'Paid' &&
      String(record.paidAt || '').slice(0, 10) >= String(stay.dropoffTime || '9999').slice(0, 10)));
  return { payments, total: total / 100, paid: paid / 100, balance: legacyPaid ? 0 : Math.max(0, total - paid) / 100,
    credit: Math.max(0, paid - total) / 100, legacyPaid,
    status: legacyPaid ? 'Paid (legacy record)' : paid >= total && paid > 0 ? 'Paid in full' : paid > 0 ? 'Partially paid' : 'Unpaid' };
}

function boardingPaymentSummaryHtml(record, stay, options = {}) {
  const summary = boardingPaymentSummary(record, stay);
  const rows = summary.payments.map(p => '<li><strong>' + escapeHtml(money(p.amount)) + '</strong> · ' +
    escapeHtml(p.kind) + ' · ' + escapeHtml(p.receivedDate) + ' · ' + escapeHtml(p.method) +
    '<br><small>' + escapeHtml([p.recordedBy, p.reference].filter(Boolean).join(' · ')) + '</small>' +
    (p.cancellation ? '<p><strong>Cancelled</strong> · ' + escapeHtml(p.cancellation.reason) + '<br><small>' +
      escapeHtml([p.cancellation.cancelledBy, formatDateTime(p.cancellation.cancelledAt)].filter(Boolean).join(' · ')) + '</small></p>' :
      currentRole() === 'admin' && !options.hideAction ? '<button type="button" class="danger-button" data-action="cancel-boarding-payment" data-dog-id="' +
        escapeHtml(record.id) + '" data-stay-id="' + escapeHtml(stay.id) + '" data-request-code="' + escapeHtml(boardingStayRequestCode(record, stay)) +
        '" data-payment-id="' + escapeHtml(p.id) + '">Cancel payment</button>' : '') + '</li>').join('');
  const available = currentRole() === 'admin' && !['Cancelled', 'Declined'].includes(boardingStayDisplayStatus(record, stay));
  return '<section class="boarding-payments" aria-label="Stay payments"><h3>Payments</h3><p><strong>' + escapeHtml(summary.status) +
    '</strong></p><div class="estimate-line"><span>Payments received</span><strong>' + (summary.legacyPaid ? 'Legacy paid record' : money(summary.paid)) +
    '</strong></div><div class="estimate-total"><span>Balance due</span><strong>' + money(summary.balance) + '</strong></div>' +
    (summary.credit ? '<p>Credit on this stay: ' + money(summary.credit) + '</p>' : '') +
    (rows ? '<details><summary>Payment history (' + summary.payments.length + ')</summary><ul>' + rows + '</ul></details>' : '') +
    (available && !options.hideAction && summary.balance > 0 ? '<button type="button" data-action="record-boarding-payment" data-dog-id="' +
      escapeHtml(record.id) + '" data-stay-id="' + escapeHtml(stay.id) + '" data-request-code="' + escapeHtml(boardingStayRequestCode(record, stay)) + '">Record payment</button>' : '') +
    '<p class="workspace-info">Payments apply only to this dog’s stay. Additional charges may change the balance.</p></section>';
}

async function requireBoardingCheckoutPayment(record, reference = {}) {
  let refreshed = record;
  if (!localTestMode) {
    if (!supabaseClient) throw new Error('Connect to the server to verify payment before checkout.');
    const sources = boardingPaymentRecords(record);
    const result = await cuddleStayRequest(db => db.from('kennel_records').select('id,payload,updated_at')
      .eq('type','boardingDog').in('id',[...new Set([record.id,...sources.map(s=>s.id)])]));
    if (result.error) throw result.error;
    if (!result.data?.length) throw new Error('The current stay could not be verified. Refresh before checkout.');
    result.data.forEach(row => upsertRecord('boardingDog',row.payload));
    refreshed = boardingDogRecordForDisplay(record.id);
  }
  const stay = (reference.stayId || reference.requestCode) ? boardingStayByReference(refreshed,reference) : activeBoardingStay(refreshed) || currentOrNextStay(refreshed);
  if (!stay?.id) throw new Error('Select a saved stay before checkout.');
  if (boardingPaymentSummary(refreshed,stay).balance > 0) {
    openCheckoutInvoicePopup(refreshed,{...reference,stayId:stay.id});
    const note = document.getElementById('checkoutNote');
    if (note) note.value = record.checkoutNote || '';
    showToast('Payment confirmation required. Record the remaining payment received before checkout.');
    return null;
  }
  return {...refreshed, checkoutNote:record.checkoutNote || refreshed.checkoutNote || ''};
}
function boardingCheckoutPaymentPromptHtml(record,stay) {
  const summary = boardingPaymentSummary(record,stay);
  if (!(summary.balance > 0)) return '<p class="workspace-info">No outstanding balance. Recorded payments are shown above.</p>';
  const action = currentRole() === 'admin' ? '<button type="button" data-action="record-checkout-payment" data-dog-id="' + escapeHtml(record.id) + '" data-stay-id="' + escapeHtml(stay.id) + '" data-request-code="' + escapeHtml(boardingStayRequestCode(record,stay)) + '">Confirm payment received</button>' : '<p>An administrator must record the payment received before you can check out this stay.</p>';
  return '<section class="checkout-payment-required" role="status"><h3>Confirm the remaining payment</h3><p><strong>' + escapeHtml(money(summary.balance)) + '</strong> is still due after recorded payments. Confirm the amount and payment method actually received before checkout.</p>' + action + '</section>';
}

function openBoardingPaymentPopup(record, reference = {}, options = {}) {
  if (currentRole() !== 'admin') return showToast('An administrator must record boarding payments.');
  const stay = boardingStayByReference(record, reference) || (!reference.stayId && !reference.requestCode ? activeBoardingStay(record) || currentOrNextStay(record) : null);
  if (!stay?.id) return showToast('Select a saved stay first.');
  const summary = boardingPaymentSummary(record, stay);
  if (!(summary.balance > 0)) return showToast('This stay has no outstanding balance.');
  showDetailDialog('Record boarding payment', '<form id="boardingPaymentForm" class="tracker-form" data-dog-id="' + escapeHtml(record.id) +
    '" data-stay-id="' + escapeHtml(stay.id) + '" data-request-code="' + escapeHtml(boardingStayRequestCode(record, stay)) +
    '" data-payment-id="' + escapeHtml(uid('boardingPayment')) + '" data-balance="' + summary.balance.toFixed(2) + '">' +
    '<p><strong>' + escapeHtml(record.dogName) + '</strong> · ' + escapeHtml(boardingStayRequestCode(record, stay)) + '</p>' +
    boardingPaymentSummaryHtml(record, stay, { hideAction: true }) +
    '<label>Payment type<select name="kind"><option>Deposit</option><option>Prepayment</option><option>Paid in full</option></select></label>' +
    '<label>Amount received ($)<input name="amount" type="number" min="0.01" max="' + summary.balance.toFixed(2) + '" step="0.01" required></label>' +
    '<label>Payment date<input name="receivedDate" type="date" value="' + todayDate() + '" max="' + todayDate() + '" required></label>' +
    '<label>Payment method<select name="method" required><option value="">Select method</option>' +
    ['Cash', 'Venmo', 'PayPal', 'Zelle', 'Credit Card', 'Check', 'Other'].map(method => '<option>' + method + '</option>').join('') + '</select></label>' +
    '<label>Reference / note (optional)<input type="text" name="reference" maxlength="300" placeholder="Receipt number or payment note"></label>' +
    '<label class="boarding-payment-confirm"><input type="checkbox" name="received" required> I confirm this payment was actually received.</label>' +
    '<p>This records a payment already received. It does not charge the customer or check the dog out.</p>' +
    '<div class="button-row"><button type="submit">Save payment</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div></form>');
  if (options.checkout) {
    const form = document.getElementById('boardingPaymentForm');
    form.dataset.checkout = 'true';
    form.dataset.checkoutNote = options.checkoutNote || '';
    form.elements.kind.value = 'Paid in full';
    form.elements.amount.readOnly = true;
    form.elements.amount.value = summary.balance.toFixed(2);
  }
}

async function saveBoardingPayment(form) {
  if (currentRole() !== 'admin') throw new Error('Only an administrator can record boarding payments.');
  const reference = { stayId: form.dataset.stayId, requestCode: form.dataset.requestCode };
  let record = boardingDogRecordForDisplay(form.dataset.dogId);
  if (!record) throw new Error('This dog is no longer available.');
  // Refresh all source records, then use a stable source row and compare-and-swap.
  let sources = boardingPaymentRecords(record);
  let rows = [];
  if (!localTestMode) {
    if (!supabaseClient) throw new Error('Connect to the server before recording a payment.');
    const result = await cuddleStayRequest(db => db.from('kennel_records').select('id,payload,updated_at')
      .eq('type', 'boardingDog').in('id', [...new Set([record.id, ...sources.map(s => s.id)])]));
    if (result.error) throw result.error;
    rows = result.data || [];
    rows.forEach(row => upsertRecord('boardingDog', row.payload));
    record = boardingDogRecordForDisplay(record.id);
    sources = boardingPaymentRecords(record);
  }
  const stay = boardingStayByReference(record, reference);
  if (!stay?.id || ['Cancelled', 'Declined'].includes(boardingStayDisplayStatus(record, stay))) throw new Error('This stay is no longer available for payment.');
  const summary = boardingPaymentSummary(record, stay);
  if (summary.payments.some(p => p.id === form.dataset.paymentId)) return record;
  const amount = Number(form.elements.amount.value);
  const receivedDate = form.elements.receivedDate.value;
  const method = form.elements.method.value;
  const kind = form.elements.kind.value;
  if (!form.elements.received.checked || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.00001 || amount > summary.balance) throw new Error('Enter the amount received, up to the remaining balance, and confirm receipt.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(receivedDate) || receivedDate > todayDate() || !method) throw new Error('Enter a valid payment date and method.');
  if (summary.balance !== Number(form.dataset.balance)) throw new Error('The balance changed. Close this window and review the latest bill before recording payment.');
  if (kind === 'Paid in full' && amount !== summary.balance) throw new Error('Paid in full must equal the remaining balance.');
  const source = sources.filter(s => boardingStayByReference(s, reference)).sort((a,b) => a.id.localeCompare(b.id))[0];
  if (!source) throw new Error('The original stay could not be found. Refresh and try again.');
  const timestamp = new Date().toISOString();
  const payment = { id: form.dataset.paymentId, stayId: boardingStayByReference(source, reference).id, requestCode: reference.requestCode,
    amount, receivedDate, method, kind, reference: form.elements.reference.value.trim(),
    recordedAt: timestamp, recordedBy: currentUser?.name || currentUser?.email || 'Admin' };
  const updated = { ...source, boardingPayments: [...(source.boardingPayments || []), payment], updatedAt: timestamp };
  if (!localTestMode) {
    const row = rows.find(item => item.id === source.id);
    if (!row) throw new Error('Could not verify the current stay.');
    const result = await cuddleStayRequest(db => db.from('kennel_records').update({ payload: updated, updated_at: timestamp })
      .eq('id', source.id).eq('type', 'boardingDog').eq('updated_at', row.updated_at).select('payload').maybeSingle());
    if (result.error) throw result.error;
    if (!result.data?.payload?.boardingPayments?.some(p => p.id === payment.id)) throw new Error('The stay changed while saving. Refresh and review payment history before retrying.');
    upsertRecord('boardingDog', result.data.payload);
  } else upsertRecord('boardingDog', updated);
  const refreshed = boardingDogRecordForDisplay(record.id);
  renderBoardingStays(refreshed);
  renderBoardingDogs();
  return refreshed;
}

function openBoardingPaymentCancellation(record, reference, paymentId) {
  if (currentRole() !== 'admin') return showToast('Only an administrator can cancel payments.');
  const stay = boardingStayByReference(record, reference);
  const payment = stay && boardingPaymentSummary(record, stay).payments.find(p => p.id === paymentId && !p.cancellation);
  if (!payment) return showToast('This payment is no longer available to cancel.');
  showDetailDialog('Cancel recorded payment', '<form id="boardingPaymentCancellationForm" class="tracker-form" data-dog-id="' + escapeHtml(record.id) +
    '" data-stay-id="' + escapeHtml(stay.id) + '" data-request-code="' + escapeHtml(boardingStayRequestCode(record, stay)) +
    '" data-payment-id="' + escapeHtml(payment.id) + '" data-amount="' + payment.amount + '">' +
    '<p><strong>' + escapeHtml(record.dogName) + '</strong> · ' + escapeHtml(boardingStayRequestCode(record, stay)) + '</p><p>' +
    escapeHtml([money(payment.amount), payment.kind, payment.receivedDate, payment.method].join(' · ')) + '</p>' +
    '<p>This removes the payment from the stay balance and keeps a cancellation in payment history. It does not refund or move money.</p>' +
    '<label>Reason<input name="reason" maxlength="300" required></label>' +
    '<label class="boarding-payment-confirm"><input type="checkbox" name="confirmed" required> I confirm this is the payment to cancel.</label>' +
    '<div class="button-row"><button type="submit" class="danger-button">Confirm cancellation</button>' +
    '<button type="button" class="secondary-button" data-action="close-dialog">Keep payment</button></div></form>');
}

async function cancelBoardingPayment(form) {
  if (currentRole() !== 'admin') throw new Error('Only an administrator can cancel payments.');
  const reason = form.elements.reason.value.trim();
  if (!reason || reason.length > 300 || !form.elements.confirmed.checked) throw new Error('Enter a reason and confirm the payment to cancel.');
  let record = boardingDogRecordForDisplay(form.dataset.dogId);
  if (!record) throw new Error('This dog is no longer available.');
  let sources = boardingPaymentRecords(record), rows = [];
  if (!localTestMode) {
    if (!supabaseClient) throw new Error('Connect to the server before cancelling a payment.');
    const result = await cuddleStayRequest(db => db.from('kennel_records').select('id,payload,updated_at')
      .eq('type', 'boardingDog').in('id', [...new Set([record.id, ...sources.map(s => s.id)])]));
    if (result.error) throw result.error;
    rows = result.data || [];
    rows.forEach(row => upsertRecord('boardingDog', row.payload));
    record = boardingDogRecordForDisplay(record.id);
    sources = boardingPaymentRecords(record);
  }
  const stay = boardingStayByReference(record, { stayId: form.dataset.stayId, requestCode: form.dataset.requestCode });
  const payment = stay && boardingPaymentSummary(record, stay).payments.find(p => p.id === form.dataset.paymentId);
  if (!payment || payment.amount !== Number(form.dataset.amount)) throw new Error('The payment changed. Reopen payment history and try again.');
  if (payment.cancellation) return record;
  const owners = sources.filter(s => (s.boardingPayments || []).some(p => p.id === payment.id));
  if (owners.length !== 1) throw new Error('The original receipt could not be uniquely identified. No payment was cancelled.');
  const source = owners[0], timestamp = new Date().toISOString();
  const cancellation = { paymentId: payment.id, reason, cancelledAt: timestamp, cancelledBy: currentUser?.name || currentUser?.email || 'Admin' };
  const updated = { ...source, boardingPaymentCancellations: [...(source.boardingPaymentCancellations || []), cancellation], updatedAt: timestamp };
  if (!localTestMode) {
    const row = rows.find(r => r.id === source.id);
    if (!row) throw new Error('Could not verify the current payment.');
    const result = await cuddleStayRequest(db => db.from('kennel_records').update({ payload: updated, updated_at: timestamp })
      .eq('id', source.id).eq('type', 'boardingDog').eq('updated_at', row.updated_at).select('payload').maybeSingle());
    if (result.error) throw result.error;
    if (!result.data?.payload?.boardingPaymentCancellations?.some(c => c.paymentId === payment.id)) throw new Error('The stay changed while saving. Refresh payment history before retrying.');
    upsertRecord('boardingDog', result.data.payload);
  } else upsertRecord('boardingDog', updated);
  const refreshed = boardingDogRecordForDisplay(record.id);
  renderBoardingStays(refreshed); renderBoardingDogs();
  return refreshed;
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="cancel-boarding-payment"]');
  if (!button) return;
  event.preventDefault();
  const record = boardingDogRecordForDisplay(button.dataset.dogId);
  if (record) openBoardingPaymentCancellation(record, boardingStayReferenceFromAction(button), button.dataset.paymentId);
});
document.addEventListener('submit', async event => {
  const form = event.target.closest('#boardingPaymentCancellationForm');
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  await runPopupOperation(event.submitter, 'Cancelling payment...', async () => {
    const record = await cancelBoardingPayment(form);
    const stay = boardingStayByReference(record, { stayId: form.dataset.stayId, requestCode: form.dataset.requestCode });
    showDetailDialog('Payment cancelled', '<p>The payment no longer counts toward this stay. The original receipt and cancellation remain in history. No money was refunded.</p>' + boardingPaymentSummaryHtml(record, stay));
    return record;
  }, 'Payment could not be cancelled');
});

document.addEventListener('change', event => {
  if (!event.target.matches('#boardingPaymentForm select[name="kind"]')) return;
  const form = event.target.form;
  form.elements.amount.readOnly = event.target.value === 'Paid in full';
  if (form.elements.amount.readOnly) form.elements.amount.value = form.dataset.balance;
});
document.addEventListener('click', event => {
  const button = event.target.closest('[data-action="record-boarding-payment"], [data-action="record-checkout-payment"]');
  if (!button) return;
  event.preventDefault();
  const record = boardingDogRecordForDisplay(button.dataset.dogId);
  if (record) openBoardingPaymentPopup(record, boardingStayReferenceFromAction(button), {checkout:button.dataset.action==='record-checkout-payment',checkoutNote:document.getElementById('checkoutNote')?.value || ''});
});
document.addEventListener('submit', async event => {
  const form = event.target.closest('#boardingPaymentForm');
  if (!form) return;
  event.preventDefault();
  if (!form.reportValidity()) return;
  await runPopupOperation(event.submitter, 'Saving payment...', async () => {
    const record = await saveBoardingPayment(form);
    const stay = boardingStayByReference(record, { stayId: form.dataset.stayId, requestCode: form.dataset.requestCode });
    if (form.dataset.checkout === 'true') {
      openCheckoutInvoicePopup(record,{stayId:stay.id,requestCode:form.dataset.requestCode});
      const note = document.getElementById('checkoutNote');
      if (note) note.value = form.dataset.checkoutNote || '';
      showToast('Payment recorded. Review the balance, then complete checkout.');
      return;
    }
    showDetailDialog('Payment recorded', '<p>The payment was recorded. The dog’s stay status has not changed.</p>' + boardingPaymentSummaryHtml(record, stay));
    return record;
  }, 'Payment could not be saved');
});
