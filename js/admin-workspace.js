/* Presentation and shortcuts only. Existing save paths and ledger math remain authoritative. */
function adminServiceCatalog(records, allRecords) {
  document.querySelectorAll('#servicePricingTabs [data-service-pricing-filter]').forEach(button => {
    const text = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const labels = {all:'All prices ', member:'Member pricing ', regular:'Regular pricing '};
    if (text && labels[button.dataset.servicePricingFilter]) text.textContent = labels[button.dataset.servicePricingFilter];
  });
  const select = document.querySelector('#serviceCategoryFilter');
  const category = select.value;
  const categories = [...new Set(readRecords('service').filter(r => !r.removed).map(r => r.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option ${c === category ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
  const visible = records.filter(r => !category || r.category === category);
  document.querySelector('#serviceCatalogCount').textContent = `${visible.length} services shown · ${allRecords.length} matching search`;
  document.querySelector('#serviceTableHead').innerHTML = '<tr><th data-sort-column="serviceName" data-table="service">Service</th><th data-sort-column="category" data-table="service">Category</th><th>Pricing</th><th data-sort-column="basePrice" data-table="service">Price / unit</th><th>Availability</th><th>Actions</th></tr>';
  document.querySelector('#serviceTableBody').innerHTML = visible.map(r => {
    const flags = normalizedServiceFlags(r.flags || []);
    return `<tr><td><strong>${escapeHtml(r.serviceName || 'Service')}</strong><details class="catalog-details"><summary>Service details</summary><p>${escapeHtml(r.description || r.notes || 'No additional notes.')}</p><p>Deposit: ${money(r.depositAmount || 0)} · Tax: ${escapeHtml(String(r.taxRate || 0))}%</p>${serviceChipsHtml(r)}</details></td><td>${escapeHtml(r.category || 'Other')}</td><td><span class="admin-chip">${escapeHtml(({member: "Member", "non-member": "Regular", all: "All dogs"}[servicePricingScope(r)] || servicePricingScopeLabel(r)))}</span></td><td><strong>${money(r.basePrice)}</strong><small>${escapeHtml(r.unit || '')}</small></td><td><span class="admin-chip ${flags.includes('Active') ? 'is-good' : ''}">${flags.includes('Active') ? 'Active' : 'Inactive'}</span>${flags.includes('Admin only') ? '<small>Staff only</small>' : ''}</td><td><button type="button" class="secondary-button" data-action="edit-service" data-id="${escapeHtml(r.id)}">Edit</button></td></tr>`;
  }).join('') || '<tr><td colspan="6">No services match these filters.</td></tr>';
}

// Move the original controls, preserving their values, validation and save handlers.
function adminServiceEditor() {
  const form = document.querySelector('#serviceForm');
  let details = form.querySelector('.service-advanced');
  if (!details) {
    details = document.createElement('details');
    details.className = 'service-advanced';
    details.innerHTML = '<summary>Additional details<small>Deposit, tax, dependencies, descriptions and notes</small></summary><div class="field-grid"></div><div class="checklist compact"></div>';
    const primary = form.querySelector('.field-grid');
    const flags = form.querySelector('.checklist');
    form.insertBefore(details, form.querySelector('.button-row'));
    [...primary.children].forEach(label => {
      const name = label.querySelector('[name]')?.name;
      if (!['serviceName','category','basePrice','unit','pricingScope'].includes(name)) details.querySelector('.field-grid').append(label);
    });
    [...flags.children].forEach(label => {
      if (!['Active','Member Pricing'].includes(label.querySelector('input')?.value)) details.querySelector('.checklist').append(label);
    });
    ['itemDescription','pricingNotes'].forEach(name => details.append(form.querySelector(`[name="${name}"]`).closest('label')));
    form.addEventListener('invalid', event => {
      if (details.contains(event.target)) details.open = true;
    }, true);
  }
  details.open = false;
}

function adminRenderOperationCalendar() {
  const list = document.querySelector('#operationHoursList');
  const draft = [...list.childNodes];
  renderOperationHoursSettings();
  list.replaceChildren(...draft);
}

function adminHoursPolish(hours) {
  const icon = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' + path + '</svg>';
  const overrides = readRecords('operationDateOverride').filter(r => !r.removed);
  const metrics = [
    ['Open days', hours.filter(r => operationBoolean(r.isOpen, true)).length, 'weekly customer request days', '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-12 4h2m4 0h2m-8 3h2"/>'],
    ['Weekly windows', hours.filter(r => operationBoolean(r.isOpen, true)).reduce((n,r) => n + operationTimeWindows(r).length, 0), 'drop-off and pickup windows', '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'],
    ['Calendar overrides', overrides.length, 'custom hours and closed dates', '<path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5m-5 4h5"/>']
  ];
  document.querySelector('#operationHoursSummary').innerHTML = metrics.map(([label,value,note,path]) => '<div class="hours-metric">' + icon(path) + '<div><span>' + label + '</span><strong>' + value + '</strong><small>' + note + '</small></div></div>').join('');
  document.querySelectorAll('#operationHoursList [data-weekday]').forEach(card => {
    const name = card.querySelector('.operation-day-header > strong');
    const day = name.textContent;
    name.innerHTML = '<span class="hours-day-full">' + escapeHtml(day) + '</span><span class="hours-day-short" aria-hidden="true">' + escapeHtml(day.slice(0,3)) + '</span>';
    card.querySelector('[data-operation-open]').setAttribute('aria-label', day + ' open');
    card.querySelector('[data-copy-weekday]').hidden = true;
    const add = card.querySelector('[data-action="add-operation-window"]');
    add.innerHTML = '<span class="hours-add-label">Add window</span><span class="hours-add-icon" aria-hidden="true">+</span>';
    add.setAttribute('aria-label', 'Add window for ' + day);
  });
  document.querySelectorAll('#operationOverrideCalendar [data-date]').forEach(button => {
    const info = operationWindowForDate(button.dataset.date);
    button.classList.toggle('is-today', button.dataset.date === todayDate());
    button.setAttribute('aria-label', operationDateLabel(button.dataset.date) + ': ' + (info.isOpen ? operationTimeWindowsText(operationTimeWindows(info)) : 'Closed') + (info.override?.customerMessage ? '. ' + info.override.customerMessage : ''));
    button.title = button.getAttribute('aria-label');
  });
  document.querySelector('#hoursOverridesHeading').textContent = 'Overrides for ' + monthLabel(operationCalendarMonth);
  document.querySelector('.hours-overrides-heading [data-action]').dataset.date = todayDate().slice(0,7) === operationCalendarMonth ? todayDate() : operationCalendarMonth + '-01';
  const visible = overrides.filter(r => String(r.date).slice(0,7) === operationCalendarMonth).sort((a,b) => String(a.date).localeCompare(String(b.date)));
  document.querySelector('#operationOverrideList').innerHTML = visible.map(r => {
    const open = operationBoolean(r.isOpen,true);
    return '<article class="hours-override ' + (open ? '' : 'is-closed') + '"><span class="hours-override-dot" aria-hidden="true"></span><div><strong>' + escapeHtml(operationDateLabel(r.date)) + '</strong><small>' + escapeHtml(r.customerMessage || (open ? 'Custom hours' : 'Closed to customer requests')) + '</small><span>' + (open ? escapeHtml(operationTimeWindowsText(operationTimeWindows(r))) : 'Closed') + '</span></div><button type="button" class="secondary-button" data-action="open-operation-date-override" data-date="' + escapeHtml(r.date) + '" aria-label="Edit override for ' + escapeHtml(r.date) + '">Edit</button></article>';
  }).join('') || '<p class="hours-empty">No overrides this month.<br>Weekly hours apply to these dates.</p>';
}

function adminFinancialExportRows(entries) {
  const safe = value => /^[\s]*[=+@-]/.test(String(value || '')) ? "'" + value : value;
  return entries.map(e => ({ Date: e.date, Type: e.entryType, Area: safe(e.businessArea), Category: safe(e.category), Description: safe(e.description), Customer: safe(e.counterparty), Reference: safe(e.reference), Amount: Number(e.amount || 0) }));
}

function adminFinancialReady(ledger) {
  const page = document.querySelector('#financialsPage');
  if (!page.dataset.compactLayout) {
    page.dataset.compactLayout = 'true';
    const toolbar = page.querySelector('.financial-toolbar');
    const ranges = page.querySelector('.financial-quick-ranges');
    toolbar.prepend(ranges);
    toolbar.append(page.querySelector('#financialPeriodControl'));
    page.querySelector('.financial-line-items-header').append(page.querySelector('#financialExportButton'));
    const chart = page.querySelector('.financial-chart-panel');
    const info = document.createElement('div'); info.className = 'financial-chart-info';
    info.append(page.querySelector('#financialLedgerStatus'), page.querySelector('.financial-methodology'));
    chart.prepend(info);
    const breakdown = document.createElement('details'); breakdown.className = 'financial-breakdown-details';
    breakdown.innerHTML = '<summary>Period breakdown</summary>';
    page.querySelector('#financialBreakdown').before(breakdown);
    breakdown.append(page.querySelector('#financialBreakdown'));
  }
  window.adminFinancialLedger = ledger;
  const exportButton = document.querySelector('#financialExportButton');
  if (exportButton) exportButton.disabled = false;
  const filters = [ ['income', 'all'], ['expense', 'all'], ['all', 'all'], ['income', 'Boarding'], ['income', 'Services'], ['expense', 'Payroll'], ['all', 'Dog Shows'] ];
  document.querySelectorAll('#financialCards > article').forEach((card, index) => {
    card.title = card.querySelector('p')?.textContent || '';
    card.setAttribute('aria-label', card.textContent.trim());
    if (!filters[index]) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'financial-card-link'; button.textContent = 'View transactions →';
    button.addEventListener('click', () => {
      [financialTransactionTypeFilter, financialTransactionAreaFilter] = filters[index];
      financialTransactionSearch = ''; financialTransactionPage = 1;
      document.querySelector('[data-financial-view="transactions"]').click();
      renderFinancials();
    });
    card.append(button);
  });
}

document.addEventListener('change', event => {
  if (event.target.id === 'serviceCategoryFilter') renderServices();
});
document.addEventListener('click', event => {
  const addOverride = event.target.closest('.hours-overrides-heading [data-action="open-operation-date-override"]');
  if (addOverride) openOperationDateOverridePopup(addOverride.dataset.date);
  const tab = event.target.closest('[data-hours-tab]');
  if (tab) {
    document.querySelectorAll('[data-hours-tab]').forEach(b => { b.setAttribute('aria-selected', String(b === tab)); b.classList.toggle('is-active', b === tab); });
    document.querySelectorAll('[data-hours-panel]').forEach(panel => {
      if (panel.dataset.hoursPanel === tab.dataset.hoursTab) panel.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    });
  }
  const copy = event.target.closest('[data-copy-weekday], #copyHoursToWeekdays');
  if (copy) {
    const source = copy.closest('[data-weekday]') || document.querySelector('#operationHoursList [data-weekday="monday"]');
    const targets = [...document.querySelectorAll('#operationHoursList [data-weekday]')].filter(card => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(card.dataset.weekday));
    targets.forEach(card => {
      if (card === source) return;
      const isOpen = source.querySelector('[data-operation-open]').checked;
      card.querySelector('[data-operation-open]').checked = isOpen;
      const windows = [...source.querySelectorAll('[data-operation-window-row]')].map(row => ({ openTime: row.querySelector('[data-operation-open-time]').value, closeTime: row.querySelector('[data-operation-close-time]').value }));
      card.querySelector('[data-operation-window-list]').innerHTML = windows.map((w, i) => operationTimeWindowRowHtml(w, i, isOpen)).join('');
      card.querySelector('[data-action="add-operation-window"]').disabled = !isOpen;
    });
    showToast('Copied to Monday–Friday. Review and Save Weekly Hours to apply.');
  }
  const range = event.target.closest('[data-financial-range]');
  if (range) {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1), end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (range.dataset.financialRange === 'last') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
    if (range.dataset.financialRange === 'ytd') { start = new Date(now.getFullYear(), 0, 1); end = now; }
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.querySelector('#financialStartDate').value = iso(start);
    document.querySelector('#financialEndDate').value = iso(end);
    financialTransactionPage = 1; renderFinancials();
  }
  if (event.target.closest('#financialExportButton')) {
    const entries = financialSortedTransactions(financialFilteredTransactions(window.adminFinancialLedger || []));
    downloadCsv(`financial-transactions-${financialRangeValues().start}-${financialRangeValues().end}.csv`, adminFinancialExportRows(entries));
  }
});
