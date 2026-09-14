/* Presentation and shortcuts only. Existing save paths and ledger math remain authoritative. */
function adminServiceCatalog(records, allRecords) {
  const select = document.querySelector('#serviceCategoryFilter');
  const category = select.value;
  const categories = [...new Set(readRecords('service').filter(r => !r.removed).map(r => r.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All categories</option>' + categories.map(c => `<option ${c === category ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
  const visible = records.filter(r => !category || r.category === category);
  document.querySelector('#serviceCatalogCount').textContent = `${visible.length} services shown · ${allRecords.length} matching search`;
  document.querySelector('#serviceTableHead').innerHTML = '<tr><th data-sort-column="serviceName" data-table="service">Service</th><th data-sort-column="category" data-table="service">Category</th><th>Eligibility</th><th data-sort-column="basePrice" data-table="service">Price</th><th>Availability</th><th>Actions</th></tr>';
  document.querySelector('#serviceTableBody').innerHTML = visible.map(r => {
    const flags = normalizedServiceFlags(r.flags || []);
    return `<tr><td><strong>${escapeHtml(r.serviceName || 'Service')}</strong><details class="catalog-details"><summary>Service details</summary><p>${escapeHtml(r.description || r.notes || 'No additional notes.')}</p><p>Deposit: ${money(r.depositAmount || 0)} · Tax: ${escapeHtml(String(r.taxRate || 0))}%</p>${serviceChipsHtml(r)}</details></td><td>${escapeHtml(r.category || 'Other')}</td><td><span class="admin-chip">${escapeHtml(servicePricingScopeLabel(r))}</span></td><td><strong>${money(r.basePrice)}</strong><small>${escapeHtml(r.unit || '')}</small></td><td><span class="admin-chip ${flags.includes('Active') ? 'is-good' : ''}">${flags.includes('Active') ? 'Active' : 'Inactive'}</span>${flags.includes('Admin only') ? '<small>Staff only</small>' : ''}</td><td><button type="button" class="secondary-button" data-action="edit-service" data-id="${escapeHtml(r.id)}">Edit</button></td></tr>`;
  }).join('') || '<tr><td colspan="6">No services match these filters.</td></tr>';
}

function adminRenderOperationCalendar() {
  const list = document.querySelector('#operationHoursList');
  const draft = [...list.childNodes];
  renderOperationHoursSettings();
  list.replaceChildren(...draft);
}

function adminFinancialExportRows(entries) {
  const safe = value => /^[\s]*[=+@-]/.test(String(value || '')) ? "'" + value : value;
  return entries.map(e => ({ Date: e.date, Type: e.entryType, Area: safe(e.businessArea), Category: safe(e.category), Description: safe(e.description), Customer: safe(e.counterparty), Reference: safe(e.reference), Amount: Number(e.amount || 0) }));
}

function adminFinancialReady(ledger) {
  window.adminFinancialLedger = ledger;
  const exportButton = document.querySelector('#financialExportButton');
  if (exportButton) exportButton.disabled = false;
  const filters = [ ['income', 'all'], ['expense', 'all'], ['all', 'all'], ['income', 'Boarding'], ['income', 'Services'], ['expense', 'Payroll'], ['all', 'Dog Shows'] ];
  document.querySelectorAll('#financialCards > article').forEach((card, index) => {
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
  const tab = event.target.closest('[data-hours-tab]');
  if (tab) {
    document.querySelectorAll('[data-hours-tab]').forEach(b => { b.setAttribute('aria-selected', String(b === tab)); b.classList.toggle('is-active', b === tab); });
    document.querySelectorAll('[data-hours-panel]').forEach(panel => { panel.hidden = panel.dataset.hoursPanel !== tab.dataset.hoursTab; });
  }
  const copy = event.target.closest('[data-copy-weekday]');
  if (copy) {
    const source = copy.closest('[data-weekday]');
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
