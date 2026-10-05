/* Public recipient details; payment receipts remain staff verified. */
const ACCEPTED_PAYMENT_METHODS = ['Cash', 'Check', 'Zelle', 'Venmo', 'PayPal'];
function acceptedPaymentLink(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function sanitizeAcceptedPayments(config = {}) {
  return Object.fromEntries(ACCEPTED_PAYMENT_METHODS.map(name => {
    const item = config?.[name] || {};
    return [name, { enabled: item.enabled === true, account: String(item.account || '').trim().slice(0, 200),
      link: acceptedPaymentLink(item.link), instructions: String(item.instructions || '').trim().slice(0, 1000) }];
  }));
}
function acceptedPaymentsConfig() {
  const record = readRecords('appConfig').find(r => r.id === 'workspace-branding' && !r.removed);
  return sanitizeAcceptedPayments(record?.paymentMethods);
}
function renderPaymentMethodSettings() {
  const container = document.getElementById('paymentMethodSettingsFields');
  if (!container) return;
  const config = acceptedPaymentsConfig();
  container.innerHTML = ACCEPTED_PAYMENT_METHODS.map((name, index) => {
    const method = config[name], electronic = index > 1;
    return '<fieldset class="payment-method-card" data-payment-method="' + name + '"><legend>' + name + '</legend>' +
      '<label class="payment-method-toggle"><input type="checkbox" role="switch" name="enabled"' + (method.enabled ? ' checked' : '') + '> Accept ' + name + '</label>' +
      (electronic ? '<label>Recipient / account<input name="account" maxlength="200" value="' + escapeHtml(method.account) + '" placeholder="' + (name === 'Zelle' ? 'Registered email or phone number' : 'Account name or handle') + '"></label>' +
      '<label>Payment link (optional)<input name="link" type="url" maxlength="2000" value="' + escapeHtml(method.link) + '" placeholder="https://..."></label>' : '') +
      '<label>' + (name === 'Check' ? 'Payable to / instructions' : 'Payment instructions (optional)') + '<textarea name="instructions" maxlength="1000" rows="2">' + escapeHtml(method.instructions) + '</textarea></label></fieldset>';
  }).join('');
}
async function savePaymentMethodSettings(form) {
  if (currentRole() !== 'admin') throw new Error('Only administrators can change payment methods.');
  const config = {};
  for (const field of form.querySelectorAll('[data-payment-method]')) {
    const name = field.dataset.paymentMethod;
    const item = {enabled: field.querySelector('[name="enabled"]').checked,
      account: field.querySelector('[name="account"]')?.value.trim() || '',
      link: field.querySelector('[name="link"]')?.value.trim() || '',
      instructions: field.querySelector('[name="instructions"]').value.trim()};
    if (item.link && !acceptedPaymentLink(item.link)) throw new Error(name + ': enter a valid HTTPS payment link.');
    if (item.enabled && ['Zelle','Venmo','PayPal'].includes(name) && !item.account && !item.link)
      throw new Error(name + ': add recipient information or a payment link before enabling it.');
    config[name] = item;
  }
  const existing = appBrandingConfig();
  const record = {...existing, type:'appConfig', id:'workspace-branding', paymentMethods:sanitizeAcceptedPayments(config),
    updatedAt:new Date().toISOString(), updatedBy:currentUser?.email || '', removed:false};
  if (!localTestMode && !supabaseClient) throw new Error('Connect to the server before saving payment methods.');
  // Publish locally only after the server accepts the settings.
  await persistAppBrandingConfig(record);
  upsertRecord('appConfig', record);
  return record;
}
function customerAcceptedPaymentMethodsHtml(reference = '') {
  const config = acceptedPaymentsConfig();
  const names = ACCEPTED_PAYMENT_METHODS.filter(name => config[name].enabled &&
    (!['Zelle','Venmo','PayPal'].includes(name) || config[name].account || config[name].link));
  if (!names.length) return '<p>Contact the kennel for payment instructions.</p>';
  return '<section class="customer-payment-methods"><h3>How to pay</h3>' +
    (reference ? '<p>Include reference <strong>' + escapeHtml(reference) + '</strong> with your payment.</p>' : '') +
    '<div class="payment-method-grid">' + names.map(name => {
      const method = config[name];
      return '<article class="payment-method-card"><h4>' + name + '</h4>' +
        (method.account ? '<p class="payment-recipient">' + escapeHtml(method.account) + '</p>' : '') +
        (method.instructions ? '<p class="payment-instructions">' + escapeHtml(method.instructions) + '</p>' : '') +
        (method.link ? '<a class="payment-link" href="' + escapeHtml(method.link) + '" target="_blank" rel="noopener noreferrer">Open ' + name + '</a>' : '') + '</article>';
    }).join('') + '</div><p>Payments are confirmed by staff after receipt. Opening a link does not mark your bill paid.</p></section>';
}
function customerStayPaymentHtml(record, stay) {
  if (!stay.id || ['Pending','Cancelled','Declined'].includes(boardingStayDisplayStatus(record, stay))) return '';
  const summary = boardingPaymentSummary(record, stay);
  return boardingPaymentSummaryHtml(record, stay, {hideAction:true}) +
    (summary.balance > 0 ? customerAcceptedPaymentMethodsHtml(boardingStayRequestCode(record, stay)) : '');
}
document.addEventListener('submit', async event => {
  if (event.target.id !== 'paymentMethodSettingsForm') return;
  event.preventDefault();
  const button = event.submitter || event.target.querySelector('[type="submit"]');
  if (button.disabled) return;
  button.disabled = true;
  const status = document.getElementById('paymentMethodSaveStatus');
  status.textContent = 'Saving…';
  try { await savePaymentMethodSettings(event.target); status.textContent = 'Payment methods saved.'; }
  catch (error) { status.textContent = error.message || 'Payment methods could not be saved.'; }
  finally { button.disabled = false; }
});
