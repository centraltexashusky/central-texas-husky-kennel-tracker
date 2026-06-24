// === MODULE: SEARCH ===
const __snuggleStayModuleSource = `function globalSearchEntries() {
  const entries = [];
  readRecords("ownedDog").filter((record) => !record.removed).forEach((record) => {
    const detail = [ownedDogCareSummary(record), record.ownerName, record.ownerEmail, (record.ownerPhone || "").replace(/\\D/g, "")].filter(Boolean).join(" | ");
    entries.push({ label: ownedDogDisplayName(record), detail, type: "ownedDog", id: record.id, pageId: "ourDogsPage" });
  });
  readRecords("boardingDog").filter((record) => !record.removed).forEach((record) => {
    const phoneDigits = (record.ownerPhone || "").replace(/\\D/g, "");
    const phoneLast4 = phoneDigits.slice(-4);
    const emergencyDigits = (record.emergencyPhone || "").replace(/\\D/g, "");
    const detail = [
      record.ownerName,
      record.ownerEmail,
      phoneDigits,
      phoneLast4,
      emergencyDigits,
      record.emergencyName,
      boardingKennelLocationLabel(record),
      boardingDisplayStatus(record),
      boardingScheduleText(record),
    ].filter(Boolean).join(" | ");
    entries.push({ label: record.dogName || "Boarding dog", detail, type: "boardingDog", id: record.id, pageId: "boardingDogsPage" });
  });
  readRecords("request").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.category || "Request", detail: record.requestText || record.reason || "", type: "request", id: record.id, pageId: "requestsPage" }));
  readRecords("maintenance").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.location || "Maintenance", detail: record.issue || record.suggestedAction || "", type: "maintenance", id: record.id, pageId: "maintenancePage" }));
  readRecords("service").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.serviceName || "Service", detail: [record.category, money(record.basePrice)].filter(Boolean).join(" | "), type: "service", id: record.id, pageId: "servicesPage" }));
  readRecords("calendarNote").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.noteKind === "staff" ? "Staff Note" : "Special Note", detail: \`\${calendarNoteDate(record)} | \${record.note || ""}\`, type: "calendarNote", id: record.id, pageId: "dashboardPage" }));
  readRecords("settingsUser").filter((record) => !record.removed && currentRole() === "admin").forEach((record) => entries.push({ label: record.name || record.email || "User", detail: [record.email, roleLabel(record.role)].filter(Boolean).join(" | "), type: "settingsUser", id: record.id, pageId: "settingsUsersPage" }));
  return entries;
}

function renderGlobalSearchResults() {
  const panel = $("#globalSearchPanel");
  const input = $("#globalQuickSearch");
  const list = $("#globalSearchResults");
  if (!panel || !input || !list) return;
  panel.hidden = !helperIsLoggedIn() || currentRole() === "customer";
  if (panel.hidden) return;
  const query = input.value.trim().toLowerCase();
  if (!query) {
    list.innerHTML = \`<p>Search by dog name, owner name, phone number, kennel location, status, or record type.</p>\`;
    return;
  }
  const results = globalSearchEntries()
    .filter((entry) => pageAllowed(entry.pageId) && \`\${entry.label} \${entry.detail} \${entry.type}\`.toLowerCase().includes(query))
    .slice(0, 8);
  list.innerHTML = results.length
    ? results.map((entry) => \`<button type="button" class="global-search-result" data-type="\${escapeHtml(entry.type)}" data-id="\${escapeHtml(entry.id)}" data-page="\${escapeHtml(entry.pageId)}"><strong>\${escapeHtml(entry.label)}</strong><span>\${escapeHtml(entry.detail || entry.type)}</span></button>\`).join("")
    : \`<p>No matching records.</p>\`;
}

function openGlobalSearchResult(button) {
  const type = button.dataset.type;
  const id = button.dataset.id;
  const pageId = button.dataset.page;
  switchPage(pageId, { history: "push" });
  if (type === "ownedDog") {
    const record = readRecords("ownedDog").find((item) => item.id === id);
    if (record) openOwnedDogOverviewPopup(record);
  } else if (type === "boardingDog") {
    const record = readRecords("boardingDog").find((item) => item.id === id);
    if (record) openBoardingDog(record);
  } else if (type === "settingsUser") {
    const record = readRecords("settingsUser").find((item) => item.id === id);
    if (record) openSettingsUserPopup(record);
  } else {
    const record = readRecords(type).find((item) => item.id === id);
    if (record) showDetailDialog(titleForRecord(type, record), detailForRecord(type, record));
  }
  $("#globalQuickSearch").value = "";
  renderGlobalSearchResults();
}
//# sourceURL=snuggle-stay/search.js
`;
(0, eval)(__snuggleStayModuleSource);
