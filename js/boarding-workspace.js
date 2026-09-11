/* Boarding detail presentation. Persistence and lifecycle rules remain in boarding.js. */
function boardingWorkspaceIcon(name) {
  const paths = {
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    message: '<path d="M21 11a8 8 0 0 1-8 8H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4zM7 8h10M7 12h7"/>',
    medical: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 7v10M7 12h10"/>',
    dog: '<path d="m4 14-1 7h4l2-7h7l1 7h3l-1-10 2-4-4 1-4-5-4 1-2 5-4 1 1 4zM10 6h.01"/>',
    shield: '<path d="m12 3 8 4v6c0 4-8 8-8 8s-8-4-8-8V7zM8 12l3 3 5-6"/>',
    user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3z"/>',
    file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/>',
    history: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  };
  return '<svg class="boarding-workspace-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || paths.file) + '</svg>';
}

function setupBoardingWorkspace(record = {}) {
  const modal = document.getElementById('boardingDogDetail');
  modal.classList.add('boarding-workspace');
  modal.setAttribute('aria-labelledby', 'boardingDogPhotoName');
  const owner = document.getElementById('boardingDogHeaderOwner');
  if (owner && record.id) owner.textContent = [record.ownerName, record.ownerPhone].filter(Boolean).join(' · ');
  if (!modal.dataset.workspaceActions) {
    modal.dataset.workspaceActions = 'true';
    modal.addEventListener('click', async event => {
      const button = event.target.closest('[data-action="transition-boarding"], [data-action="open-boarding-medical-behavior-note"]');
      if (!button || button.disabled) return;
      const dog = activeBoardingDog();
      if (!dog?.id) return;
      const reference = boardingStayReferenceFromAction(button);
      if (button.dataset.action === 'open-boarding-medical-behavior-note') {
        openBoardingMedicalBehaviorNotePopup(dog, reference);
        return;
      }
      button.disabled = true;
      try {
        const next = button.dataset.nextStatus;
        const options = reference.stayId ? { ...reference } : {};
        if (next === 'Checked In') {
          options.allowEarly = true;
          options.early = boardingTransitionIsEarly(dog, next, options);
        }
        await handleBoardingTransition(dog, next, options);
      } catch (error) {
        showToast('Could not update this stay: ' + error.message);
      } finally {
        button.disabled = false;
      }
    });
  }
  document.querySelectorAll('#boardingDogProfileTabs [data-workspace-icon]').forEach(button => {
    if (!button.querySelector('svg')) button.insertAdjacentHTML('afterbegin', boardingWorkspaceIcon(button.dataset.workspaceIcon));
    button.setAttribute('role', 'tab');
  });
  // Keep the original form and all controls together; only the presentation uses a grid.
  const sections = [...modal.querySelectorAll('[data-boarding-profile-section]')];
  sections.forEach((section, index) => {
    if (!section.id) section.id = 'boarding-workspace-panel-' + index;
    section.setAttribute('role', 'tabpanel');
    const button = [...modal.querySelectorAll('[data-boarding-profile-tab]')].find(b => b.dataset.boardingProfileTab === section.dataset.boardingProfileSection);
    if (button) {
      button.id = 'boarding-workspace-tab-' + index;
      button.setAttribute('aria-controls', section.id);
      section.setAttribute('aria-labelledby', button.id);
    }
  });
  let summary = document.getElementById('boardingWorkspaceHeaderSummary');
  if (!summary) {
    summary = document.createElement('div');
    summary.id = 'boardingWorkspaceHeaderSummary';
    modal.querySelector('.boarding-profile-editor').append(summary);
  }
  const stay = activeBoardingStay(record) || currentOrNextStay(record) || arrayValue(record.stays).find(s => !inactiveBoardingStayStatus(s)) || {};
  summary.innerHTML = record.id
    ? '<div class="chip-row">' + (stay.id ? boardingStayStatusChipHtml(record, stay) : statusChipHtml(boardingDisplayStatus(record))) + '<span class="status-chip">' + escapeHtml(dogPricingScopeOverride(record) === 'non-member' ? 'Regular pricing' : customerPricingScopeForDog(record, boardingPricingUserForRecord(record)) === 'member' ? 'Member pricing' : 'Regular pricing') + '</span></div><p>' + escapeHtml(stay.id ? stayScheduleRangeLabel(record, stay) : 'No current stay') + '</p>' + (stay.id ? '<small>Ref: ' + escapeHtml(boardingStayRequestCode(record, stay)) + '</small>' : '')
    : '<p>Add a profile to begin a boarding request.</p>';
  const nav = document.getElementById('boardingDogProfileTabs');
  if (!nav.dataset.workspaceKeyboard) {
    nav.dataset.workspaceKeyboard = 'true';
    nav.addEventListener('keydown', event => {
      const tabs = [...nav.querySelectorAll('[role="tab"]')].filter(b => !b.disabled);
      const index = tabs.indexOf(document.activeElement);
      if (index < 0 || !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  }
}

function syncBoardingWorkspaceTab(tabName) {
  const modal = document.getElementById('boardingDogDetail');
  if (!modal?.classList.contains('boarding-workspace')) return;
  modal.dataset.workspaceTab = tabName;
  modal.querySelectorAll('[data-boarding-profile-tab]').forEach(button => {
    const selected = button.dataset.boardingProfileTab === tabName;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const editable = ['Dog Info', 'Vaccination', 'Customer Info'].includes(tabName);
  const footer = modal.querySelector('.boarding-workspace-footer');
  footer.hidden = !editable;
  if (tabName === 'Medical/Behavior') renderBoardingWorkspaceCareLog(activeBoardingDog() || {});
}

function renderBoardingWorkspaceCareLog(record = {}) {
  const list = document.getElementById('boardingWorkspaceCareLog');
  if (!list) return;
  const logs = arrayValue(record.careLogs).filter(log => log.staffOnly || log.source === 'boarding-medical-behavior-note' || /medical|behavior/i.test(log.category || log.careType || ''));
  list.innerHTML = '<div class="record-actions">' + boardingMedicalBehaviorButtonHtml(record, activeBoardingStay(record) || {}) + '</div>' + (logs.length
    ? '<div class="workspace-table-scroll"><table class="workspace-log-table"><thead><tr><th>Date & time</th><th>Staff</th><th>Type</th><th>Note</th></tr></thead><tbody>' + logs.map(log => '<tr><td>' + escapeHtml(formatDateTime(log.loggedAt || log.date)) + '</td><td>' + escapeHtml(log.completedBy || 'Staff') + '</td><td>' + escapeHtml(log.category || log.careType || 'Care') + '</td><td>' + escapeHtml(log.note || '') + '</td></tr>').join('') + '</tbody></table></div>'
    : '<p class="profile-empty-note">No staff-only medical or behavior notes recorded.</p>');
}

function boardingWorkspaceStayHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const steps = ['Pending', 'Approved', 'Checked In', 'In Kennel', 'Ready For Pickup', 'Checked Out'];
  const position = steps.indexOf(status);
  const code = boardingStayRequestCode(record, stay);
  const attrs = ' data-id="' + escapeHtml(stay.id) + '" data-request-code="' + escapeHtml(code) + '"';
  const edit = '<button type="button" class="secondary-button" data-action="edit-stay"' + attrs + '>Edit Stay</button>';
  const days = Number(stay.pricingSnapshot?.billingDays || stay.billingDays || 0);
  const location = [stay.kennelBuilding, stay.kennelLocationName].filter(Boolean).join(' · ') || 'Not assigned';
  const facts = (icon, label, value) => '<div class="workspace-stay-fact">' + boardingWorkspaceIcon(icon) + '<div><span>' + label + '</span><strong>' + escapeHtml(value) + '</strong></div></div>';
  const forward = steps[position + 1] || '';
  const transitions = boardingStayTransitionActions(record, stay, { includeOwnerUpdate: false }).replace('data-next-status="' + forward + '"', 'data-primary-transition="true" data-next-status="' + forward + '"');
  const progress = position < 0 ? boardingStayStatusChipHtml(record, stay) : '<ol class="workspace-lifecycle" aria-label="Stay progress">' + steps.map((step, i) => '<li class="' + (i < position ? 'is-complete' : i === position ? 'is-current' : '') + '"' + (i === position ? ' aria-current="step"' : '') + '><span aria-hidden="true">' + (i < position ? '✓' : '') + '</span>' + escapeHtml(i === 0 ? 'Requested' : step) + '</li>').join('') + '</ol>';
  return '<article class="record-card boarding-stay-card workspace-stay">' + progress + '<div class="workspace-stay-columns"><div class="workspace-stay-main"><div class="workspace-stay-title"><h3>' + escapeHtml(code) + '</h3>' + edit + '</div><div class="workspace-stay-facts">' + facts('calendar', 'Drop-off', formatDateTime(stay.dropoffTime)) + facts('pin', 'Location', location) + facts('calendar', 'Pickup', formatDateTime(stay.pickupTime)) + facts('history', 'Billable days', days ? String(days) + ' days' : 'See estimate') + '</div>' + (record.specialCare ? '<p class="workspace-warning"><strong>Special care:</strong> ' + escapeHtml(record.specialCare) + '</p>' : '') + '<div class="workspace-services-heading"><h3>Requested services</h3><button type="button" class="secondary-button" data-action="edit-stay"' + attrs + '>Add / edit services</button></div>' + (boardingStayServiceTaskListHtml(record, stay, { actions: true }) || '<p class="profile-empty-note">No additional services requested.</p>') + '<div class="workspace-care-grid"><section><h3>Belongings</h3><p>' + escapeHtml(boardingStayBelongings(stay) || 'None recorded') + '</p></section><section><h3>Food & care</h3><p>' + escapeHtml(boardingFoodInstructions(record) || 'No feeding instructions recorded') + '</p></section><section><h3>Stay notes</h3><p>' + escapeHtml([stay.stayNotes, stay.bathPlan].filter(Boolean).join(' · ') || 'No additional notes') + '</p></section></div>' + boardingCancellationAuditHtml(record, stay) + boardingCancellationReasonHtml(record, stay) + '</div><aside class="workspace-bill"><h3>Estimated bill</h3>' + boardingStayInvoiceSummaryHtml(record, stay) + '<button type="button" class="secondary-button workspace-price-edit" data-action="edit-stay"' + attrs + '>Review pricing & adjustments</button><p class="workspace-info">Pricing and adjustments apply to this dog’s stay.</p></aside></div><div class="workspace-stay-actions">' + transitions + boardingOwnerUpdateButtonHtml(record, stay) + boardingMedicalBehaviorButtonHtml(record, stay) + '<details class="workspace-more"><summary>More actions</summary><button type="button" class="secondary-button danger-button" data-action="remove-stay"' + attrs + '>Remove Stay</button></details></div></article>';
}

function boardingWorkspaceCheckoutInvoiceHtml(record = {}, options = {}) {
  const stay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) || {} : activeBoardingStay(record) || currentOrNextStay(record) || {};
  const attrs = ' data-id="' + escapeHtml(record.id || '') + '"' + (stay.id ? boardingStayDataAttrs(record, stay) : '');
  const services = boardingStayServiceSummary(record, stay);
  const paymentStatus = record.paymentStatus || 'Unpaid';
  const invoiceSummary = (stay.id ? boardingStayInvoiceSummaryHtml(record, stay, { final: true }) : '') || '<div class="checkout-fallback-total"><span>Final total</span><strong>' + money(boardingInvoiceTotal(record, stay)) + '</strong></div>';
  const fact = (label, value) => '<div><dt>' + label + '</dt><dd>' + escapeHtml(value || 'Not recorded') + '</dd></div>';
  return `<section class="checkout-invoice">
    <header class="checkout-invoice-identity"><div><h2>${escapeHtml(record.dogName || 'Boarding dog')}</h2><p>${escapeHtml(record.ownerName || 'No owner saved')} · ${phoneLinkHtml(record.ownerPhone)}</p></div><span class="checkout-payment-status">${escapeHtml(paymentStatus)}${record.paymentMethod ? ' · ' + escapeHtml(record.paymentMethod) : ''}</span></header>
    <div class="checkout-invoice-columns"><div class="checkout-invoice-details">
      <section class="checkout-invoice-section"><h3>Stay details</h3><div class="chip-row">${boardingStayRequestCodeChipHtml(record, stay)}${boardingStayStatusChipHtml(record, stay)}</div><dl class="checkout-stay-facts">${fact('Drop-off', stay.dropoffTime ? formatDateTime(stay.dropoffTime) : '')}${fact('Pickup', stay.pickupTime ? formatDateTime(stay.pickupTime) : '')}</dl></section>
      <section class="checkout-invoice-section"><h3>Services</h3>${services.length ? '<ul class="checkout-service-list">' + services.map(name => '<li>' + escapeHtml(name) + '</li>').join('') + '</ul>' : '<p>No additional services requested.</p>'}</section>
      ${boardingStayBelongingsHtml(stay, { showEmpty: true, label: 'Belongings to return at checkout', className: 'boarding-checkout-belongings-card' })}
      <label class="checkout-note-label">Checkout note<textarea id="checkoutNote" rows="3" placeholder="Payment note, pickup person, invoice issue, or checkout detail"></textarea></label>
    </div><aside class="checkout-invoice-bill"><h3>Invoice summary</h3>${invoiceSummary}<p>Review the charges and return belongings before completing checkout.</p></aside></div>
    <footer class="checkout-invoice-actions"><button type="button" data-action="checkout-paid-method"${attrs}>Pay &amp; Check-out</button><button type="button" class="secondary-button" data-action="confirm-check-out"${attrs}>Check Out</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></footer>
  </section>`;
}

function enhanceBoardingWorkspacePopup() {
  const dialog = document.getElementById('detailDialog');
  const body = document.getElementById('detailDialogBody');
  if (!dialog || !body) return;
  const isBoarding = Boolean(body.querySelector('#boardingStayPopupForm, #boardingCheckInForm, #boardingCheckInServiceForm, #boardingRequirementOverrideForm, #boardingDeclineRequestForm, #ownerUpdatePopupForm, #boardingMedicalBehaviorNoteForm, #pickupReadyNote, #checkoutNote, [data-action="undo-stay-service"], #kennelAssignmentForm, #paymentMethodForm'));
  dialog.classList.toggle('boarding-workspace-popup', isBoarding);
  dialog.classList.toggle('boarding-invoice-popup', Boolean(body.querySelector('.checkout-invoice')));
  dialog.classList.toggle('boarding-payment-popup', Boolean(body.querySelector('#paymentMethodForm')));
  const form = body.querySelector('#boardingStayPopupForm');
  if (!form || form.dataset.workspaceEnhanced) return;
  form.dataset.workspaceEnhanced = 'true';
  const record = boardingDogRecordForDisplay(form.dataset.dogId) || activeBoardingDog() || {};
  const stay = boardingStayByReference(record, form.elements.stayId.value) || {};
  const fields = document.createElement('div');
  fields.className = 'workspace-edit-fields';
  const bill = document.createElement('aside');
  bill.className = 'workspace-edit-bill';
  const adjustment = form.querySelector('.billing-adjustment-section');
  [...form.children].forEach(child => { if (child.tagName !== 'INPUT') fields.append(child); });
  form.append(fields, bill);
  bill.innerHTML = '<h3>Estimate</h3><div data-workspace-live-estimate></div><p class="workspace-info">Adjustments and reasons appear on the customer’s stay summary.</p>';
  if (adjustment) bill.append(adjustment);
  const refresh = () => {
    try {
      const draft = { ...stay, dropoffTime: form.elements.dropoffTime.value, pickupTime: form.elements.pickupTime.value, scheduledPickupTime: form.elements.pickupTime.value, requests: selectedStayRequestsFromForm(form), invoiceAdjustments: invoiceAdjustmentsFromStayForm(form, stay, new Date().toISOString()) };
      const rateId = form.elements.boardingRateServiceId?.value || '';
      const ratePlan = boardingRatePlanForRecord(record);
      const role = boardingCurrentDogRoleForStay(stay, ratePlan, { currentDogRole: form.elements.boardingRateRole?.value || (ratePlan.isMemberPricing ? 'primary' : 'non-member') });
      const service = boardingRateServiceForSelection(record, stay, rateId, { currentDogRole: role });
      const program = boardingStayProgramSnapshotFromService(service);
      Object.assign(draft, { stayProgram: program, stayProgramId: program?.id || program?.serviceId || '', stayProgramName: program?.serviceName || program?.name || '', stayProgramRate: program?.rate || program?.basePrice || 0 });
      const snapshot = boardingPricingSnapshotForStay(record, draft, { currentDogRole: program ? 'boarding-program' : role, sharedCrateRequested: role === 'shared-crate-additional', stayProgram: program, boardingRateService: program ? null : service, boardingRateServiceId: program ? '' : rateId });
      bill.querySelector('[data-workspace-live-estimate]').innerHTML = boardingStayInvoiceSummaryHtml(record, { ...draft, pricingSnapshot: snapshot }, { forceCurrentPricing: true, pricingSnapshot: snapshot });
    } catch (_) {
      bill.querySelector('[data-workspace-live-estimate]').textContent = 'Complete the stay details to calculate an estimate.';
    }
  };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  refresh();
}

document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('detailDialogBody');
  if (body) new MutationObserver(() => enhanceBoardingWorkspacePopup()).observe(body, { childList: true });
});
