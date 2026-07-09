// === MODULE: SETTINGS ===
const __snuggleStayModuleSource = `function normalizedServiceFlags(flags = []) {
  return [...new Set((flags || []).map((flag) => (flag === "Alumni only" ? "Member Pricing" : flag)).filter(Boolean))];
}

function serviceHasFlag(service = {}, flag = "") {
  return normalizedServiceFlags(service.flags).includes(flag);
}

function serviceFlagChipsHtml(flags = []) {
  const normalized = normalizedServiceFlags(flags);
  return normalized.length
    ? \`<span class="service-flag-list">\${normalized.map((flag) => \`<span class="service-flag-chip">\${escapeHtml(flag)}</span>\`).join("")}</span>\`
    : "";
}

function serviceChipsHtml(service = {}) {
  return [serviceFlagChipsHtml(service.flags), serviceBoardingRateChipHtml(service), serviceDependencyChipHtml(service)].filter(Boolean).join(" ");
}

var financialPeriodView = "monthly";
var financialViewMode = "overview";
var financialLineItemSearch = "";
var financialStatusFilter = "all";
var financialIncomeFilter = "all";
var financialLineItemSort = "date-desc";

function readTableConfig() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.tableConfig) || "null") || {};
  const withDefaults = {};
  Object.entries(tableColumns).forEach(([type, columns]) => {
    const currentKeys = columns.map((column) => column.key);
    const savedKeys = (saved[type] || []).filter((key) => currentKeys.includes(key));
    const newKeys = currentKeys.filter((key) => !savedKeys.includes(key));
    withDefaults[type] = saved[type] ? [...savedKeys, ...newKeys] : currentKeys;
  });
  return withDefaults;
}

function writeTableConfig(config) {
  localStorage.setItem(stateKeys.tableConfig, JSON.stringify(config));
  saveCurrentUserTablePreferences(config);
}

function saveCurrentUserTablePreferences(config) {
  if (!currentUser?.email) return;
  const existing = savedUserFor(currentUser) || {};
  const record = upsertRecord("settingsUser", {
    ...profileRecordForUser(currentUser),
    ...existing,
    tableConfig: config,
    tablePreferences: { ...(existing.tablePreferences || {}), tableConfig: config },
    removed: false,
  });
  sendPayload(record).catch((error) => console.warn("Could not save table preferences to user profile.", error));
}

function readTableSort() {
  return JSON.parse(localStorage.getItem(stateKeys.tableSort) || "{}") || {};
}

function writeTableSort(config) {
  localStorage.setItem(stateKeys.tableSort, JSON.stringify(config));
}

function activeColumns(type) {
  const order = readTableConfig()[type] || [];
  return order.map((key) => tableColumns[type].find((column) => column.key === key)).filter(Boolean);
}

function renderColumnManager(type, selector) {
  const container = $(selector);
  if (!container) return;
  const order = readTableConfig()[type] || [];
  const columns = tableColumns[type];
  container.innerHTML = \`<div class="column-manager-header"><strong>Table columns</strong><small>Choose visible headers. Drag or use arrows to reorder.</small></div>\` + columns
    .map((column) => {
      const visible = order.includes(column.key);
      const index = order.indexOf(column.key);
      return \`<div class="column-chip \${visible ? "" : "is-off"}" data-column="\${column.key}" data-table="\${type}" draggable="\${visible}">
        <label><input type="checkbox" \${visible ? "checked" : ""} data-action="toggle-column" data-table="\${type}" data-column="\${column.key}" /> \${escapeHtml(column.label)}</label>
        <button type="button" class="icon-button" data-action="move-column-up" data-table="\${type}" data-column="\${column.key}" \${index <= 0 ? "disabled" : ""} title="Move left">↑</button>
        <button type="button" class="icon-button" data-action="move-column-down" data-table="\${type}" data-column="\${column.key}" \${index < 0 || index >= order.length - 1 ? "disabled" : ""} title="Move right">↓</button>
      </div>\`;
    })
    .join("");
}

function setTableSettingsPopoverOpen(buttonSelector, panelSelector, open) {
  const button = $(buttonSelector);
  const panel = $(panelSelector);
  if (!button || !panel) return;
  panel.hidden = !open;
  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.classList.toggle("is-active", open);
}

function updateTableColumnConfig(type, columnKey, action) {
  if (!type || !columnKey || !action) return;
  const config = readTableConfig();
  const order = config[type] || [];
  const currentIndex = order.indexOf(columnKey);
  if (action === "toggle-column") {
    config[type] = currentIndex >= 0 ? order.filter((key) => key !== columnKey) : [...order, columnKey];
  } else if (currentIndex >= 0) {
    const nextIndex = action === "move-column-up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex >= 0 && nextIndex < order.length) {
      [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
      config[type] = order;
    }
  }
  writeTableConfig(config);
  if (type === "ownedDog") renderOwnedDogs();
  if (type === "boardingDog") renderBoardingDogs();
}

function reorderTableColumn(type, sourceColumn, targetColumn) {
  if (!type || !sourceColumn || !targetColumn || sourceColumn === targetColumn) return;
  const config = readTableConfig();
  const order = [...(config[type] || [])];
  const sourceIndex = order.indexOf(sourceColumn);
  const targetIndex = order.indexOf(targetColumn);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = order.splice(sourceIndex, 1);
  order.splice(targetIndex, 0, moved);
  config[type] = order;
  writeTableConfig(config);
  if (type === "ownedDog") renderOwnedDogs();
  if (type === "boardingDog") renderBoardingDogs();
}

function handleTableHeaderDragStart(event) {
  const header = event.target.closest('th[data-table][data-column]');
  if (!header) return;
  header.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", \`\${header.dataset.table}:\${header.dataset.column}\`);
}

function handleTableHeaderDragOver(event) {
  const header = event.target.closest('th[data-table][data-column]');
  if (!header) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function handleTableHeaderDrop(event) {
  const header = event.target.closest('th[data-table][data-column]');
  if (!header) return;
  event.preventDefault();
  const [sourceTable, sourceColumn] = event.dataTransfer.getData("text/plain").split(":");
  if (sourceTable !== header.dataset.table) return;
  reorderTableColumn(sourceTable, sourceColumn, header.dataset.column);
}

function handleTableHeaderDragEnd() {
  $$("th.is-dragging").forEach((header) => header.classList.remove("is-dragging"));
}

function setTableSort(type, columnKey) {
  if (!type || !columnKey) return;
  const sortConfig = readTableSort();
  const current = sortConfig[type] || {};
  sortConfig[type] = {
    key: columnKey,
    direction: current.key === columnKey && current.direction === "asc" ? "desc" : "asc",
  };
  writeTableSort(sortConfig);
  if (type === "ownedDog") renderOwnedDogs();
  if (type === "boardingDog") renderBoardingDogs();
  if (type === "service") renderServices();
}

function sortRecordsForTable(type, records) {
  const sort = readTableSort()[type];
  if (!sort?.key) return records;
  const column = tableColumns[type]?.find((item) => item.key === sort.key);
  if (!column) return records;
  return [...records].sort((a, b) => {
    const left = String(column.value(a) || "").toLowerCase();
    const right = String(column.value(b) || "").toLowerCase();
    return sort.direction === "desc" ? right.localeCompare(left, undefined, { numeric: true }) : left.localeCompare(right, undefined, { numeric: true });
  });
}

function tableHeaderHtml(type, columns) {
  const sort = readTableSort()[type] || {};
  return \`<tr>\${columns
    .map((column) => {
      const marker = sort.key === column.key ? (sort.direction === "desc" ? " ↓" : " ↑") : "";
      return \`<th data-sort-column="\${column.key}" title="Click to sort">\${escapeHtml(column.label)}\${marker}</th>\`;
    })
    .join("")}</tr>\`;
}

function settingsUsers() {
  const activeUsers = readRecords("settingsUser").filter((user) => !user.removed);
  const usersWithoutEmail = [];
  const usersByEmail = new Map();
  activeUsers.forEach((user) => {
    const email = normalizeEmail(user.email);
    if (!email) {
      usersWithoutEmail.push(user);
      return;
    }
    usersByEmail.set(email, [...(usersByEmail.get(email) || []), user]);
  });
  return [
    ...usersWithoutEmail,
    ...[...usersByEmail.values()].map((users) => (users.length > 1 ? mergeSettingsUserRecords(users) : { ...users[0], email: normalizeEmail(users[0].email) })),
  ];
}

function settingsUserRoleRank(role = "") {
  return { customer: 1, helper: 2, staff: 2, admin: 3 }[role] || 0;
}

function canonicalSettingsUser(users = []) {
  return users
    .filter(Boolean)
    .sort((a, b) => {
      if (a.authId && !b.authId) return -1;
      if (!a.authId && b.authId) return 1;
      const roleDiff = settingsUserRoleRank(b.role) - settingsUserRoleRank(a.role);
      if (roleDiff) return roleDiff;
      return new Date(a.submittedAt || a.updatedAt || 0) - new Date(b.submittedAt || b.updatedAt || 0);
    })[0] || {};
}

function mergeSettingsUserRecords(...users) {
  const activeUsers = users.flat().filter(Boolean);
  const canonical = canonicalSettingsUser(activeUsers);
  const normalizedEmail = normalizeEmail(canonical.email || activeUsers.find((user) => user.email)?.email || "");
  const strongestRole = activeUsers.reduce((role, user) => (settingsUserRoleRank(user.role) > settingsUserRoleRank(role) ? user.role : role), canonical.role || "customer");
  const merged = activeUsers.reduce((acc, user) => ({ ...acc, ...user }), { ...canonical });
  return {
    ...merged,
    type: "settingsUser",
    id: canonical.id || merged.id || uid("settingsUser"),
    submittedAt: activeUsers.map((user) => user.submittedAt).filter(Boolean).sort()[0] || merged.submittedAt || new Date().toISOString(),
    name: canonical.name || merged.name || normalizedEmail,
    email: normalizedEmail || merged.email || "",
    role: strongestRole || "customer",
    authId: canonical.authId || activeUsers.find((user) => user.authId)?.authId || "",
    alternateAuthIds: mergeUniqueIds(...activeUsers.map((user) => [user.authId, ...(user.alternateAuthIds || [])])),
    linkedCustomerDogIds: mergeUniqueIds(...activeUsers.map((user) => user.linkedCustomerDogIds || [])),
    linkedBoardingDogIds: mergeUniqueIds(...activeUsers.map((user) => user.linkedBoardingDogIds || [])),
    isMember: activeUsers.some((user) => user.isMember === true || user.isMember === "true" || user.isMember === "on" || user.member === true),
    mergedFromIds: mergeUniqueIds(...activeUsers.map((user) => [user.id, ...(user.mergedFromIds || [])])).filter((id) => id !== (canonical.id || merged.id)),
    removed: false,
  };
}

async function addAuditLog(action, targetType, target = {}, details = "") {
  if (currentRole() !== "admin") return null;
  const record = upsertRecord("auditLog", {
    type: "auditLog",
    id: uid("audit"),
    submittedAt: new Date().toISOString(),
    action,
    targetType,
    targetId: target.id || "",
    targetLabel: target.name || target.email || target.serviceName || target.dogName || target.title || targetType,
    details,
    actorName: currentUser?.name || "Admin",
    actorEmail: currentUser?.email || "",
    removed: false,
  });
  await sendPayload(record);
  renderAuditLog();
  return record;
}

function impersonationUserFromSettings(user = {}) {
  const email = normalizeEmail(user.email);
  return {
    key: user.authId || user.id || email || uid("impersonatedUser"),
    name: user.name || user.email || "Impersonated user",
    email: user.email || "",
    role: user.role || "customer",
    isMember: userMemberFlag(user),
    authId: user.authId || "",
    authProvider: "admin-impersonation",
    impersonatedUserId: user.id || "",
  };
}

function seedDefaultServices() {
  if (readRecords("service").length) return;
  writeRecords(
    "service",
    defaultServices.map((service) => ({
      ...service,
      type: "service",
      id: uid("service"),
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  );
}

function seedDefaultCfoNotes() {
  if (readRecords("cfoNote").length) return;
  writeRecords(
    "cfoNote",
    defaultCfoNotes.map((note) => ({
      ...note,
      type: "cfoNote",
      id: uid("cfoNote"),
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  );
}

function seedDefaultKennelLocations() {
  if (readRecords("kennelLocation").length) return;
  writeRecords(
    "kennelLocation",
    defaultKennelLocations.map((location) => ({
      ...location,
      type: "kennelLocation",
      id: uid("kennelLocation"),
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      removed: false,
    })),
  );
}

function seedDefaultKennelBuildings() {
  if (readRecords("kennelBuilding").length) return;
  const names = [...new Set(defaultKennelLocations.map((location) => location.building).filter(Boolean))];
  writeRecords(
    "kennelBuilding",
    names.map((name) => ({
      type: "kennelBuilding",
      id: uid("kennelBuilding"),
      name,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      removed: false,
    })),
  );
}

function defaultOperationHourRecords() {
  const now = new Date().toISOString();
  return operationWeekdays.map((day) => ({
    type: "operationHours",
    id: \`operationHours-\${day.key}\`,
    weekday: day.key,
    weekdayLabel: day.label,
    dayIndex: day.dayIndex,
    isOpen: true,
    openTime: defaultOperationOpenTime,
    closeTime: defaultOperationCloseTime,
    submittedAt: now,
    updatedAt: now,
    removed: false,
  }));
}

function seedDefaultOperationHours() {
  if (readRecords("operationHours").length) return;
  writeRecords("operationHours", defaultOperationHourRecords());
}

function setupServiceFormInfoIcons() {
  const form = $("#serviceForm");
  if (!form) return;
  Object.entries(serviceFormFieldInfo).forEach(([fieldName, infoText]) => {
    const field = formFieldByName(form, fieldName);
    const label = field ? fieldLabel(field) : null;
    const title = label?.querySelector(".field-label-text");
    const titleText = title?.querySelector("span:not(.required-mark)");
    if (!title || !titleText || title.querySelector(".service-info-icon")) return;
    label.classList.add("has-field-info");
    titleText.insertAdjacentHTML("afterend", customerServiceInfoIconHtml(infoText));
  });
}

function serviceCatalogForStayRequests(options = {}) {
  const user = options.user || null;
  const includeAdminOnly = Boolean(options.includeAdminOnly);
  return readRecords("service")
    .filter((service) => !service.removed && serviceHasFlag(service, "Active"))
    .filter((service) => includeAdminOnly || !serviceHasFlag(service, "Admin only"))
    .filter((service) => service.category !== "Boarding" || serviceDependencyId(service))
    .filter((service) => !user || serviceMatchesCustomerPricingScope(service, user));
}

function normalizedServiceLookupText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\\s+-\\s+\\$[\\d,]+(?:\\.\\d{2})?.*$/i, "")
    .replace(/\\s+requested$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function serviceDependencyId(service = {}) {
  return String(service.requiresServiceId || service.parentServiceId || "").trim();
}

function serviceDependencyType(service = {}) {
  if (!serviceDependencyId(service)) return "";
  return String(service.dependentServiceType || "optional-addon").trim() || "optional-addon";
}

function serviceDependencyParent(service = {}, catalog = readRecords("service")) {
  const parentId = serviceDependencyId(service);
  if (!parentId) return null;
  return catalog.find((item) => item.id === parentId && !item.removed) || null;
}

function serviceDependencySatisfied(service = {}, selectedIds = new Set()) {
  const parentId = serviceDependencyId(service);
  return !parentId || selectedIds.has(parentId);
}

function serviceHasDependentServices(service = {}, catalog = readRecords("service")) {
  return Boolean(service?.id && catalog.some((item) => !item.removed && serviceDependencyId(item) === service.id));
}

function serviceDependencyChipHtml(service = {}) {
  const parent = serviceDependencyParent(service);
  if (!parent) return "";
  const label = serviceDependencyType(service) === "optional-addon" ? "Add-on after" : "Requires";
  return \`<span class="service-flag-list"><span class="service-flag-chip">\${escapeHtml(label)} \${escapeHtml(serviceDependencyOptionLabel(parent))}</span></span>\`;
}

function servicePricingScopeLabel(service = {}) {
  const scope = servicePricingScope(service);
  if (scope === "member") return "Member Pricing";
  if (scope === "non-member") return "Regular Price (Non-Member)";
  return "All Customers";
}

function serviceMatchesCustomerPricingScope(service = {}, user = currentUser) {
  const scope = servicePricingScope(service);
  if (scope === "all") return true;
  return isMemberUser(user) ? scope === "member" : scope === "non-member";
}

function serviceBoardingRateType(service = {}) {
  return normalizedBoardingRateType(service.boardingRateType || service.stayRateBehavior || service.boardingProgramType || "");
}

function normalizedPricingScope(value = "") {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (["member", "members", "member-only", "member-pricing"].includes(normalized)) return "member";
  if (["non-member", "nonmember", "regular", "public", "standard", "non-member-pricing"].includes(normalized)) return "non-member";
  if (["all", "any", "everyone", "all-customers"].includes(normalized)) return "all";
  return "";
}

function servicePricingScope(service = {}) {
  const explicit = normalizedPricingScope(service.pricingScope || service.customerPricingScope || "");
  if (explicit) return explicit;
  if (serviceHasFlag(service, "Member Pricing")) return "member";
  return "non-member";
}

function normalizedBoardingRateRole(value = "") {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (["shared-crate-additional", "additional", "additional-dog", "shared", "shared-crate"].includes(normalized)) return "shared-crate-additional";
  if (["primary", "standard", "main", ""].includes(normalized)) return "primary";
  return normalized;
}

function serviceIsBoardingProgram(service = {}) {
  return serviceBoardingRateType(service) === "boarding-program";
}

function serviceIsStandardBoardingRate(service = {}) {
  return serviceBoardingRateType(service) === "standard-boarding";
}

function serviceBoardingRateChipHtml(service = {}) {
  const rateType = serviceBoardingRateType(service) || (serviceIsStandardBoardingRate(service) ? "standard-boarding" : "");
  if (rateType === "boarding-program") return \`<span class="service-flag-list"><span class="service-flag-chip">Boarding program</span></span>\`;
  if (rateType === "standard-boarding") return \`<span class="service-flag-list"><span class="service-flag-chip">Standard boarding rate</span></span>\`;
  return "";
}

function serviceDependencyOptionLabel(service = {}) {
  return [
    service.serviceName || "Service",
    service.category || "",
    servicePricingScopeLabel(service),
  ].filter(Boolean).join(" - ");
}

function serviceDependencyOptionsHtml(currentService = {}) {
  const currentId = currentService.id || "";
  const selectedId = serviceDependencyId(currentService);
  const options = readRecords("service")
    .filter((service) => !service.removed && service.id !== currentId)
    .sort((a, b) => serviceDependencyOptionLabel(a).localeCompare(serviceDependencyOptionLabel(b)));
  const selectedParent = selectedId && !options.some((service) => service.id === selectedId)
    ? readRecords("service").find((service) => service.id === selectedId)
    : null;
  const serviceOptions = [
    ...(selectedParent ? [selectedParent] : []),
    ...options,
  ];
  return \`<option value="">No dependency</option>\${serviceOptions.map((service) => \`<option value="\${escapeHtml(service.id || "")}">\${escapeHtml(serviceDependencyOptionLabel(service))}</option>\`).join("")}\`;
}

function renderServiceDependencyFields(record = {}) {
  const requiresSelect = $("#serviceRequiresServiceId");
  const typeSelect = $("#serviceDependentServiceType");
  if (requiresSelect) requiresSelect.innerHTML = serviceDependencyOptionsHtml(record);
  if (typeSelect && serviceDependencyId(record) && !record.dependentServiceType) typeSelect.value = "optional-addon";
  syncServiceDependencyFields();
}

function syncServiceDependencyFields() {
  const requiresSelect = $("#serviceRequiresServiceId");
  const typeSelect = $("#serviceDependentServiceType");
  if (!typeSelect) return;
  const hasDependency = Boolean(requiresSelect?.value);
  typeSelect.disabled = !hasDependency;
  if (!hasDependency) typeSelect.value = "";
  else if (!typeSelect.value) typeSelect.value = "optional-addon";
}

function applyLegacyServiceDependencyMigration(options = {}) {
  const services = readRecords("service");
  const fullBath = services.find((service) => !service.removed && ["full premium bath", "full bath"].includes(normalizedServiceLookupText(service.serviceName)));
  const deshedAddon = services.find((service) => {
    if (service.removed || service.id === fullBath?.id) return false;
    const name = normalizedServiceLookupText(service.serviceName);
    return name === "de shed w full bath" || name === "de shedding" || (name.includes("de shed") && name.includes("full bath"));
  });
  if (!fullBath?.id || !deshedAddon?.id) return null;
  if (Object.prototype.hasOwnProperty.call(deshedAddon, "requiresServiceId") || serviceDependencyId(deshedAddon)) return null;
  const updated = {
    ...deshedAddon,
    requiresServiceId: fullBath.id,
    dependentServiceType: deshedAddon.dependentServiceType || "optional-addon",
    itemDescription: deshedAddon.itemDescription || "May be added by staff when a dog requires more than 30 minutes of de-shedding for their regular bath.",
    updatedAt: new Date().toISOString(),
  };
  writeRecords("service", services.map((service) => (service.id === updated.id ? updated : service)));
  if (options.syncRemote && currentRole() === "admin") {
    sendPayload(updated).catch((error) => console.warn("Could not sync service dependency migration.", error));
  }
  return updated;
}

function serviceCatalogMatchForRequest(value = {}, options = {}) {
  const item = value && typeof value === "object" ? value : {};
  const serviceId = item.serviceId || item.id || "";
  const catalog = serviceCatalogForStayRequests(options);
  if (serviceId) {
    const exactId = catalog.find((service) => service.id === serviceId);
    if (exactId) return exactId;
  }
  const requestName = normalizedServiceLookupText(item.serviceName || boardingServiceTaskDisplayName(value));
  if (!requestName) return null;
  return catalog.find((service) => normalizedServiceLookupText(service.serviceName) === requestName)
    || catalog.find((service) => normalizedServiceLookupText(service.serviceName).includes(requestName) || requestName.includes(normalizedServiceLookupText(service.serviceName)));
}

function stayServiceTaskByReference(record = {}, reference = {}, taskId = "", taskKey = "") {
  const stay = boardingStayByReference(record, reference);
  if (!stay) return null;
  return boardingStayServiceTasks(record, stay)
    .find((task) => task.id === taskId || (taskKey && boardingServiceTaskKey(task) === taskKey) || (taskKey && boardingServiceTaskNameKey(task) === boardingServiceTaskNameFromKey(taskKey)))
    || null;
}

function stayServiceCompletionConfirmationHtml(record = {}, reference = {}, task = {}, alertFilter = "") {
  const stay = boardingStayByReference(record, reference) || {};
  const requestCode = stay.id ? boardingStayRequestCode(record, stay) : reference.requestCode || "";
  const completedText = task.completedAt ? formatDateTime(task.completedAt) : formatDateTime(new Date().toISOString());
  return \`<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(task.label || task.serviceName || "Stay service")} completed</strong>
      <p>\${escapeHtml(record.dogName || "Boarding dog")} | Stay ID: \${escapeHtml(requestCode || "Not recorded")}</p>
      <p>Completed \${escapeHtml(completedText)}\${task.completedBy ? \` by \${escapeHtml(task.completedBy)}\` : ""}.</p>
    </article>
    <div class="button-row">
      <button type="button" class="secondary-button" data-action="open-boarding-editor" data-id="\${escapeHtml(record.id || "")}" data-tab="Boarding & Request">Open Boarding & Request</button>
      \${alertFilter ? \`<button type="button" class="secondary-button" data-action="open-dashboard-alert-popup" data-alert-filter="\${escapeHtml(alertFilter)}">Back to \${escapeHtml(alertFilter)}</button>\` : ""}
      <button type="button" class="secondary-button" data-action="close-dialog">Close</button>
    </div>
  </section>\`;
}

function showStayServiceCompletionConfirmation(record = {}, reference = {}, taskId = "", taskKey = "", alertFilter = "") {
  const task = stayServiceTaskByReference(record, reference, taskId, taskKey) || {};
  showDetailDialog("Stay Service Completed", stayServiceCompletionConfirmationHtml(record, reference, task, alertFilter));
}

function openEditableCustomerDogById(id = "", boardingId = "") {
  const normalizedBoardingId = boardingDogIdFromCustomerDogValue(boardingId);
  const record = editableCustomerDogForCurrentUser(id, normalizedBoardingId);
  if (!record) {
    showToast("This dog profile could not be opened for editing.");
    return;
  }
  if (record.isSharedBoardingDog || normalizedBoardingId) {
    openCustomerDogEditorForRequest(normalizedBoardingId || record.sourceBoardingDogId || record.linkedBoardingDogId || record.id);
    return;
  }
  openCustomerDog(record);
}

function stableLegacyPart(value = "") {
  return String(value || "none")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "none";
}

function stableLegacyId(prefix = "legacy", ...parts) {
  return [prefix, ...parts.map(stableLegacyPart)].join("-");
}

function structuredReservationServicePayloads(record = {}, reservation = {}, includeRootServices = false) {
  const services = [];
  (reservation.legacyStayRequests || []).forEach((requestText, index) => {
    const original = String(requestText || "").trim();
    if (!original) return;
    services.push({
      type: "reservationService",
      id: stableLegacyId("reservationService", reservation.id, "stay-request", index, original),
      submittedAt: reservation.submittedAt,
      reservationId: reservation.id,
      serviceName: original.replace(/\\s+requested$/i, "") || original,
      quantity: 1,
      unitPrice: 0,
      status: "requested",
      notes: original,
      legacyBoardingDogId: record.id || "",
      legacyStayId: reservation.legacyStayId || "",
      legacySource: "stay.requests",
      removed: false,
    });
  });
  if (includeRootServices) {
    (record.requestedServices || []).forEach((service, index) => {
      const serviceName = typeof service === "object" ? service.serviceName || service.name || service.id || "Service" : String(service || "Service");
      services.push({
        type: "reservationService",
        id: stableLegacyId("reservationService", reservation.id, "requested-service", index, serviceName),
        submittedAt: reservation.submittedAt,
        reservationId: reservation.id,
        serviceId: typeof service === "object" ? service.id || "" : "",
        serviceName,
        quantity: Number(typeof service === "object" ? service.quantity || 1 : 1),
        unitPrice: Number(typeof service === "object" ? service.unitPrice || service.basePrice || 0 : 0),
        status: "requested",
        notes: typeof service === "object" ? service.notes || service.pricingNotes || "" : String(service || ""),
        legacyBoardingDogId: record.id || "",
        legacySource: "boardingDog.requestedServices",
        removed: false,
      });
    });
  }
  return services;
}

function activeCheckInServices() {
  return readRecords("service")
    .filter((service) => !service.removed && serviceHasFlag(service, "Active") && service.category !== "Boarding")
    .sort((a, b) => String(a.category || "").localeCompare(String(b.category || "")) || String(a.serviceName || "").localeCompare(String(b.serviceName || "")));
}

function checkInServiceSnapshot(service = {}, quantity = 1) {
  const numericQuantity = Math.max(1, Number(quantity || 1));
  return {
    id: service.id || "",
    serviceName: service.serviceName || "Service",
    category: service.category || "",
    unit: service.unit || "",
    quantity: numericQuantity,
    unitPrice: Number(service.basePrice || 0),
    addedAt: new Date().toISOString(),
    addedBy: currentUser?.name || helperName?.value || "",
    addedByEmail: currentUser?.email || helperEmail?.value || "",
  };
}

async function submitBoardingCheckInServiceForm(formEl) {
  if (!pendingBoardingCheckIn) return;
  const record = boardingDogRecordForDisplay(pendingBoardingCheckIn.dogId);
  if (!record) return;
  const selected = checkedFrom(formEl, "checkInServices")
    .map((id) => {
      const service = readRecords("service").find((item) => item.id === id);
      if (!service) return null;
      return checkInServiceSnapshot(service, formEl.elements[\`serviceQuantity-\${id}\`]?.value || 1);
    })
    .filter(Boolean);
  pendingBoardingCheckIn.addedServices = selected;
  openBoardingCheckInPopup(record, pendingBoardingCheckIn.nextStatus, pendingBoardingCheckIn.options, pendingBoardingCheckIn);
}

function mergeBoardingStayServiceTasksForRequests(items = [], best = {}, mergedRequests = []) {
  const allowedKeys = new Set([
    ...mergeBoardingStayRequestList(mergedRequests).map(boardingServiceTaskNameKey),
    ...boardingServiceTaskSources(best.record || {}, best.stay || {}).map(boardingServiceTaskNameKey),
  ].filter(Boolean));
  if (!allowedKeys.size) return [];
  const byKey = new Map();
  items.forEach(({ record, stay }) => {
    boardingStayServiceTasks(record, stay).forEach((task) => {
      const key = boardingServiceTaskNameKey(task);
      if (!allowedKeys.has(key)) return;
      const existing = byKey.get(key);
      const statusDiff = Number(task.status === "completed") - Number(existing?.status === "completed");
      const timeDiff = itemSortTime(task) - itemSortTime(existing || {});
      if (!existing || statusDiff > 0 || (statusDiff === 0 && timeDiff >= 0)) byKey.set(key, task);
    });
  });
  return [...byKey.values()];
}

function shortStableHash(value = "", length = 5) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(length, "0").slice(-length);
}

function selectedBoardingKennelLocation(record = {}) {
  const stay = activeBoardingStay(record) || currentOrNextStay(record) || {};
  const id = record.kennelLocationId || stay.kennelLocationId || "";
  if (!id) return null;
  return kennelLocations({ activeOnly: true }).find((location) => location.id === id) || null;
}

function dashboardBoardingServiceCardHtml(item = {}) {
  const record = item.record || {};
  const stay = item.stay || dashboardStayForBoardingRecord(record);
  const task = item.task || {};
  const dueInfo = item.dueInfo || boardingStayServiceDueInfo(record, stay) || {};
  const stayAttrs = stay?.id ? boardingStayDataAttrs(record, stay) : "";
  const taskKey = item.taskKey || boardingServiceTaskKey(task);
  return \`<article class="record-card compact-record-card dashboard-detail-card boarding-service-due-card">
    \${dashboardImagePreviewHtml(firstRecordImage(record), record.dogName || "Boarding dog")}
    <div>
      <strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <span>\${escapeHtml(dueInfo.label || "Stay service due")}</span>
      <p>\${escapeHtml(task.label || task.serviceName || "Requested service")} | Stay ID: \${escapeHtml(stay?.id ? boardingStayRequestCode(record, stay) : "not assigned")}</p>
      <p>\${escapeHtml(stay?.pickupTime ? \`Pickup \${formatDateTime(stay.pickupTime)}\` : "Pickup time not saved")}</p>
      <div class="record-actions"><button type="button" class="secondary-button" data-action="complete-stay-service" data-dog-id="\${escapeHtml(record.id || "")}"\${stayAttrs} data-task-id="\${escapeHtml(task.id || "")}" data-task-key="\${escapeHtml(taskKey)}">Mark Done</button><button type="button" class="secondary-button" data-action="dashboard-open-boarding" data-id="\${escapeHtml(record.id || "")}"\${stayAttrs}>Open Stay</button></div>
    </div>
  </article>\`;
}

function financialCurrentYearRange() {
  const year = new Date().getFullYear();
  return { start: year + "-01-01", end: year + "-12-31" };
}

function ensureFinancialRangeInputs() {
  const fallback = financialCurrentYearRange();
  if ($("#financialStartDate") && !$("#financialStartDate").value) $("#financialStartDate").value = fallback.start;
  if ($("#financialEndDate") && !$("#financialEndDate").value) $("#financialEndDate").value = fallback.end;
}

function financialRangeValues() {
  const fallback = financialCurrentYearRange();
  const start = $("#financialStartDate")?.value || fallback.start;
  const end = $("#financialEndDate")?.value || fallback.end;
  return start <= end ? { start, end } : { start: end, end: start };
}

function financialDateFromKey(value = "") {
  const raw = String(value || "");
  if (!raw) return null;
  const date = new Date(raw.includes("T") ? raw : raw + "T12:00:00");
  return Number.isNaN(date.getTime()) ? null : date;
}

function financialEntryDate(record = {}, stay = {}) {
  return dateOnly(stay.paidAt || record.paidAt || stay.checkedOutAt || record.checkedOutAt || stay.pickupTime || stay.dropoffTime || stay.createdAt || record.submittedAt || record.updatedAt);
}

function financialLineItemSum(snapshot = {}, predicate = () => false) {
  return arrayValue(snapshot.lineItems).reduce((total, line) => total + (predicate(line) ? Number(line.amount || 0) : 0), 0);
}

function financialSingleEntryTotals(entry = {}) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const snapshot = stay.pricingSnapshot || {};
  const hasSavedSnapshot = snapshot.total !== undefined || snapshot.groupTotal !== undefined || stay.groupTotal !== undefined;
  const savedEntryTotal = snapshot.total !== undefined ? snapshot.total : undefined;
  const total = Number(savedEntryTotal ?? boardingStayInvoiceTotal(record, stay) ?? 0) || 0;
  const lineServiceTotal = financialLineItemSum(snapshot, (line) => line.type === "service");
  const serviceSource = snapshot.serviceSubtotal !== undefined
    ? snapshot.serviceSubtotal
    : (lineServiceTotal > 0 ? lineServiceTotal : boardingStayRequestTotal(stay.requests || [], { user: boardingPricingUserForRecord(record), preferCatalogPricing: true }));
  const services = Number(serviceSource || 0) || 0;
  const lineBoardingTotal = financialLineItemSum(snapshot, (line) => ["boarding", "boarding-program"].includes(line.type));
  const boardingSource = snapshot.boardingSubtotal !== undefined
    ? snapshot.boardingSubtotal
    : (lineBoardingTotal > 0 ? lineBoardingTotal : Math.max(0, total - services));
  const boarding = isServiceRequestStay(record, stay) ? 0 : (Number(boardingSource || 0) || 0);
  const finalTotal = total || boarding + services;
  return {
    total: finalTotal,
    boarding,
    services,
    other: Math.max(0, finalTotal - boarding - services),
    source: hasSavedSnapshot ? "Saved pricing snapshot" : "Current catalog fallback",
  };
}

function financialFamilyEntryTotals(entries = []) {
  const snapshots = entries.map((entry) => entry.stay?.pricingSnapshot || {}).filter((snapshot) => snapshot && Object.keys(snapshot).length);
  const groupSnapshot = snapshots.find((snapshot) => snapshot.groupBoardingSubtotal !== undefined || snapshot.groupServiceSubtotal !== undefined) || snapshots[0] || {};
  const singles = entries.map((entry) => financialSingleEntryTotals(entry));
  const fallback = singles.reduce((totals, single) => {
    totals.total += single.total;
    totals.boarding += single.boarding;
    totals.services += single.services;
    return totals;
  }, { total: 0, boarding: 0, services: 0 });
  const largestSingleTotal = singles.reduce((largest, single) => Math.max(largest, single.total), 0);
  const savedBoarding = Number(groupSnapshot.groupBoardingSubtotal ?? 0) || 0;
  const savedServices = Number(groupSnapshot.groupServiceSubtotal ?? 0) || 0;
  const savedGroupTotal = Number(groupSnapshot.groupTotal ?? 0) || 0;
  const groupLooksUnderCounted = entries.length > 1
    && fallback.total > 0
    && savedGroupTotal > 0
    && savedGroupTotal < fallback.total
    && savedGroupTotal <= largestSingleTotal
    && (savedBoarding <= fallback.boarding || savedServices <= fallback.services);
  const boarding = groupLooksUnderCounted
    ? Math.max(savedBoarding, fallback.boarding)
    : Number(groupSnapshot.groupBoardingSubtotal ?? fallback.boarding) || 0;
  const services = groupLooksUnderCounted
    ? Math.max(savedServices, fallback.services)
    : Number(groupSnapshot.groupServiceSubtotal ?? fallback.services) || 0;
  const hasSavedFamilyTotal = groupSnapshot.groupTotal !== undefined || entries.some((entry) => entry.stay?.groupTotal !== undefined || entry.stay?.pricingSnapshot?.groupTotal !== undefined);
  const savedTotal = boardingFamilyGroupSavedTotal(entries);
  const rawTotal = Number(groupSnapshot.groupTotal ?? (savedTotal || boarding + services || fallback.total)) || 0;
  const total = groupLooksUnderCounted ? Math.max(rawTotal, fallback.total, boarding + services) : rawTotal;
  return {
    total,
    boarding,
    services,
    other: Math.max(0, total - boarding - services),
    source: groupLooksUnderCounted ? "Summed dog pricing snapshots" : hasSavedFamilyTotal ? "Saved family pricing" : "Current catalog fallback",
  };
}

function financialUniqueText(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))].join(", ");
}

function financialStayDays(record = {}, stay = {}, entries = []) {
  const snapshot = stay.pricingSnapshot || {};
  const savedDays = Number(snapshot.billingDays ?? stay.billingDays ?? snapshot.dayCount ?? snapshot.unitCount ?? 0);
  if (savedDays) return savedDays;
  const entryDays = entries
    .map((entry) => Number(entry.stay?.pricingSnapshot?.billingDays ?? entry.stay?.billingDays ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (entryDays.length) return Math.max(...entryDays);
  return isServiceRequestStay(record, stay) ? 0 : boardingDays(stay.dropoffTime || record.dropoffTime, stay.pickupTime || record.pickupTime);
}

function financialStayRange(record = {}, stay = {}) {
  const dropoff = stay.dropoffTime || record.dropoffTime;
  const pickup = stay.pickupTime || record.pickupTime;
  if (isServiceRequestStay(record, stay)) return dropoff ? "Service request " + formatDateTime(dropoff) : "Service request date not saved";
  if (dropoff && pickup) return formatDateTime(dropoff) + " to " + formatDateTime(pickup);
  return formatDateTime(dropoff || pickup) || "Stay date not saved";
}

function financialServiceList(entries = []) {
  return financialUniqueText(entries.flatMap((entry) => arrayValue(entry.stay?.requests).map((request) => boardingServiceTaskDisplayName(request))));
}

function financialIncomeEntries() {
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog").filter((record) => !record.removed));
  const entries = uniqueBoardingStayEntries(boardingStayEntries(records))
    .filter((entry) => entry.stay?.id)
    .filter((entry) => !["Cancelled"].includes(entry.status));
  return boardingFamilyGroups(entries).map((group) => {
    const groupEntries = group.type === "family" ? group.entries || [] : [group.entry].filter(Boolean);
    const first = groupEntries[0] || {};
    const record = first.record || {};
    const stay = first.stay || {};
    const totals = group.type === "family" ? financialFamilyEntryTotals(groupEntries) : financialSingleEntryTotals(first);
    const ownerName = financialUniqueText(groupEntries.map((entry) => entry.record?.ownerName || entry.record?.customerName));
    const dogName = financialUniqueText(groupEntries.map((entry) => entry.record?.dogName));
    const status = financialUniqueText(groupEntries.map((entry) => entry.status)) || first.status || "";
    const requestCode = group.type === "family"
      ? financialUniqueText(groupEntries.map((entry) => entry.requestCode || (entry.stay?.id ? boardingStayRequestCode(entry.record || {}, entry.stay || {}) : "")))
      : first.requestCode || (stay.id ? boardingStayRequestCode(record, stay) : "");
    const key = group.type === "family"
      ? group.groupKey || groupEntries.map((entry) => boardingStayEntryKey(entry)).join("|")
      : boardingStayEntryKey(first);
    return {
      key,
      date: financialEntryDate(record, stay),
      label: group.type === "family" ? boardingFamilyName(record) + " family stay" : record.dogName || "Boarding stay",
      ownerName,
      dogName,
      status,
      stayRange: financialStayRange(record, stay),
      requestCode,
      days: financialStayDays(record, stay, groupEntries),
      servicesList: financialServiceList(groupEntries),
      calculationSource: totals.source,
      count: groupEntries.length,
      total: totals.total,
      boarding: totals.boarding,
      services: totals.services,
      other: totals.other,
    };
  }).filter((entry) => entry.date);
}

function financialWeekStartKey(dateKey = "") {
  const date = financialDateFromKey(dateKey);
  if (!date) return "";
  const dayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOffset);
  return localDateKey(date);
}

function financialPeriodKey(dateKey = "", period = financialPeriodView) {
  if (!dateKey) return "";
  if (period === "weekly") return financialWeekStartKey(dateKey);
  if (period === "yearly") return dateKey.slice(0, 4);
  return dateKey.slice(0, 7);
}

function financialNextPeriodKey(key = "", period = financialPeriodView) {
  if (!key) return "";
  if (period === "weekly") return addDays(key, 7);
  if (period === "yearly") return String(Number(key || new Date().getFullYear()) + 1);
  const parts = key.split("-").map(Number);
  const date = new Date(parts[0], parts[1], 1, 12, 0, 0, 0);
  return localDateKey(date).slice(0, 7);
}

function financialShortDateLabel(dateKey = "") {
  const date = financialDateFromKey(dateKey);
  return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : dateKey;
}

function financialPeriodLabel(key = "", period = financialPeriodView) {
  if (period === "weekly") return financialShortDateLabel(key) + " - " + financialShortDateLabel(addDays(key, 6));
  if (period === "yearly") return key;
  const date = financialDateFromKey(key + "-01");
  return date ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : key;
}

function financialRangeLabel(range = financialRangeValues()) {
  return financialShortDateLabel(range.start) + ", " + range.start.slice(0, 4) + " to " + financialShortDateLabel(range.end) + ", " + range.end.slice(0, 4);
}

function financialBuildBuckets(entries = [], range = financialRangeValues(), period = financialPeriodView) {
  const buckets = new Map();
  let key = financialPeriodKey(range.start, period);
  const endKey = financialPeriodKey(range.end, period);
  let guard = 0;
  while (key && guard < 260) {
    buckets.set(key, { key, label: financialPeriodLabel(key, period), total: 0, boarding: 0, services: 0, count: 0 });
    if (key === endKey) break;
    key = financialNextPeriodKey(key, period);
    guard += 1;
  }
  entries.forEach((entry) => {
    if (entry.date < range.start || entry.date > range.end) return;
    const entryKey = financialPeriodKey(entry.date, period);
    if (!buckets.has(entryKey)) buckets.set(entryKey, { key: entryKey, label: financialPeriodLabel(entryKey, period), total: 0, boarding: 0, services: 0, count: 0 });
    const bucket = buckets.get(entryKey);
    bucket.total += Number(entry.total || 0);
    bucket.boarding += Number(entry.boarding || 0);
    bucket.services += Number(entry.services || 0);
    bucket.count += Number(entry.count || 1);
  });
  return [...buckets.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function financialCompactMoney(value = 0) {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount);
  if (absolute >= 1000000) return "$" + (amount / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (absolute >= 10000) return "$" + Math.round(amount / 1000) + "K";
  return money(amount);
}

function financialChartPolyline(points = "", className = "") {
  return points ? '<polyline class="' + className + '" points="' + points + '" />' : "";
}

function financialIncomeChartSvg(buckets = []) {
  if (!buckets.length) return '<div class="financial-empty-state">No income found for this date range.</div>';
  const width = 820;
  const height = 300;
  const left = 64;
  const right = 24;
  const top = 28;
  const bottom = 54;
  const maxValue = Math.max(1, ...buckets.flatMap((bucket) => [bucket.total, bucket.boarding, bucket.services]));
  const xFor = (index) => buckets.length === 1
    ? left + ((width - left - right) / 2)
    : left + ((width - left - right) * index / Math.max(1, buckets.length - 1));
  const yFor = (value) => top + (height - top - bottom) * (1 - (Number(value || 0) / maxValue));
  const pointsFor = (field) => buckets.map((bucket, index) => xFor(index).toFixed(1) + "," + yFor(bucket[field]).toFixed(1)).join(" ");
  const tickValues = [0, maxValue / 2, maxValue];
  const tickLines = tickValues.map((value) => {
    const y = yFor(value).toFixed(1);
    return '<g><line class="chart-grid-line" x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '" /><text class="chart-axis-label" x="' + (left - 12) + '" y="' + (Number(y) + 4) + '" text-anchor="end">' + escapeHtml(financialCompactMoney(value)) + '</text></g>';
  }).join("");
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));
  const xLabels = buckets.map((bucket, index) => {
    if (index !== 0 && index !== buckets.length - 1 && index % labelEvery !== 0) return "";
    const x = xFor(index).toFixed(1);
    return '<text class="chart-axis-label" x="' + x + '" y="' + (height - 18) + '" text-anchor="middle">' + escapeHtml(bucket.label) + '</text>';
  }).join("");
  const pointDots = buckets.length <= 20
    ? buckets.map((bucket, index) => '<circle class="chart-point" cx="' + xFor(index).toFixed(1) + '" cy="' + yFor(bucket.total).toFixed(1) + '" r="4"><title>' + escapeHtml(bucket.label + ": " + money(bucket.total)) + '</title></circle>').join("")
    : "";
  return '<svg viewBox="0 0 ' + width + ' ' + height + '" aria-hidden="true" focusable="false">'
    + tickLines
    + '<line class="chart-axis-line" x1="' + left + '" y1="' + (height - bottom) + '" x2="' + (width - right) + '" y2="' + (height - bottom) + '" />'
    + financialChartPolyline(pointsFor("services"), "chart-line is-service")
    + financialChartPolyline(pointsFor("boarding"), "chart-line is-boarding")
    + financialChartPolyline(pointsFor("total"), "chart-line is-total")
    + pointDots
    + xLabels
    + '</svg>';
}

function financialSummaryCardHtml(label = "", value = "", note = "") {
  return '<article class="dashboard-card financial-summary-card"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong><p>' + escapeHtml(note) + '</p></article>';
}

function financialBreakdownHtml(buckets = []) {
  const activeBuckets = buckets.filter((bucket) => bucket.total || bucket.boarding || bucket.services);
  if (!activeBuckets.length) return '<article class="financial-period-card"><strong>No income in range</strong><p>Adjust the dates or choose a different view.</p></article>';
  return activeBuckets.map((bucket) => '<article class="financial-period-card">'
    + '<span>' + escapeHtml(bucket.label) + '</span>'
    + '<strong>' + escapeHtml(money(bucket.total)) + '</strong>'
    + '<p><b>Boarding</b> ' + escapeHtml(money(bucket.boarding)) + '</p>'
    + '<p><b>Services</b> ' + escapeHtml(money(bucket.services)) + '</p>'
    + '<small>' + escapeHtml(String(bucket.count)) + ' stay' + (bucket.count === 1 ? "" : "s") + '</small>'
    + '</article>').join("");
}

function financialCalculationNoteHtml() {
  return '<strong>How totals are calculated</strong>'
    + '<p>Financials use every non-cancelled boarding stay in the selected date range. Saved pricing snapshots and saved family totals are used first; if a stay has no saved snapshot, the app falls back to the current Services & Pricing catalog. The reporting date uses paid date, check-out, pick-up, drop-off, created, then submitted date in that order.</p>';
}

function financialSyncViewState() {
  const mode = financialViewMode === "lineItems" ? "lineItems" : "overview";
  $$("#financialViewTabs [data-financial-view]").forEach((button) => {
    const active = button.dataset.financialView === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  $$("[data-financial-panel]").forEach((panel) => {
    const active = panel.dataset.financialPanel === mode;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  $("#financialPeriodControl")?.closest(".financial-toolbar")?.classList.toggle("is-line-items", mode === "lineItems");
}

function financialLineItemSearchText(item = {}) {
  return [
    item.ownerName,
    item.dogName,
    item.status,
    item.stayRange,
    item.requestCode,
    item.servicesList,
    item.calculationSource,
    item.total,
    item.boarding,
    item.services,
  ].join(" ").toLowerCase();
}

function financialFilteredLineItems(entries = []) {
  const search = String(financialLineItemSearch || "").trim().toLowerCase();
  const status = financialStatusFilter || "all";
  const income = financialIncomeFilter || "all";
  return entries.filter((item) => {
    if (search && !financialLineItemSearchText(item).includes(search)) return false;
    if (status !== "all" && !String(item.status || "").includes(status)) return false;
    if (income === "boarding" && !(Number(item.boarding || 0) > 0)) return false;
    if (income === "services" && !(Number(item.services || 0) > 0)) return false;
    if (income === "unpriced" && Number(item.total || 0) > 0) return false;
    return true;
  });
}

function financialSortedLineItems(items = []) {
  const sort = financialLineItemSort || "date-desc";
  return [...items].sort((a, b) => {
    if (sort === "date-asc") return String(a.date || "").localeCompare(String(b.date || ""));
    if (sort === "total-desc") return Number(b.total || 0) - Number(a.total || 0);
    if (sort === "customer-asc") return String(a.ownerName || "").localeCompare(String(b.ownerName || ""));
    if (sort === "dog-asc") return String(a.dogName || "").localeCompare(String(b.dogName || ""));
    return String(b.date || "").localeCompare(String(a.date || ""));
  });
}

function financialLineItemRowHtml(item = {}) {
  const days = Number(item.days || 0);
  const serviceText = item.servicesList || "No stay services";
  const requestText = item.requestCode ? 'Request ' + item.requestCode : 'No request code';
  return '<tr>'
    + '<td class="financial-line-primary"><strong>' + escapeHtml(financialShortDateLabel(item.date) + ", " + String(item.date || "").slice(0, 4)) + '</strong><span>' + escapeHtml(item.stayRange || "Stay date not saved") + '</span><small>' + escapeHtml(requestText) + '</small></td>'
    + '<td><strong>' + escapeHtml(item.ownerName || "Owner not saved") + '</strong></td>'
    + '<td><strong>' + escapeHtml(item.dogName || "Dog not saved") + '</strong>' + (item.count > 1 ? '<span>' + escapeHtml(String(item.count) + " dogs") + '</span>' : "") + '</td>'
    + '<td><span class="status-chip">' + escapeHtml(item.status || "No status") + '</span></td>'
    + '<td><strong>' + escapeHtml(String(days || 0)) + '</strong></td>'
    + '<td><strong>' + escapeHtml(money(item.boarding || 0)) + '</strong></td>'
    + '<td><strong>' + escapeHtml(money(item.services || 0)) + '</strong><span>' + escapeHtml(serviceText) + '</span></td>'
    + '<td><strong>' + escapeHtml(money(item.other || 0)) + '</strong></td>'
    + '<td><strong>' + escapeHtml(money(item.total || 0)) + '</strong></td>'
    + '<td><strong>' + escapeHtml(item.calculationSource || "Current catalog fallback") + '</strong><span>' + escapeHtml(item.date ? "Report date " + item.date : "Report date not saved") + '</span></td>'
    + '</tr>';
}

function financialLineItemsHtml(items = []) {
  return items.length
    ? items.map(financialLineItemRowHtml).join("")
    : '<tr><td colspan="10"><div class="financial-empty-state">No line items match the selected filters.</div></td></tr>';
}

function syncFinancialLineItemFilterControls() {
  if ($("#financialLineItemSearch")) $("#financialLineItemSearch").value = financialLineItemSearch;
  if ($("#financialStatusFilter")) $("#financialStatusFilter").value = financialStatusFilter;
  if ($("#financialIncomeFilter")) $("#financialIncomeFilter").value = financialIncomeFilter;
  if ($("#financialLineItemSort")) $("#financialLineItemSort").value = financialLineItemSort;
}

function renderFinancialLineItems(entries = [], range = financialRangeValues()) {
  syncFinancialLineItemFilterControls();
  const filtered = financialSortedLineItems(financialFilteredLineItems(entries));
  const total = filtered.reduce((sum, item) => sum + Number(item.total || 0), 0);
  if ($("#financialLineItemsBody")) $("#financialLineItemsBody").innerHTML = financialLineItemsHtml(filtered);
  if ($("#financialLineItemMeta")) $("#financialLineItemMeta").textContent = filtered.length + " of " + entries.length + " line item" + (entries.length === 1 ? "" : "s") + " | " + financialRangeLabel(range);
  if ($("#financialLineItemTotal")) $("#financialLineItemTotal").textContent = money(total);
}

function renderFinancials() {
  const cardsEl = $("#financialCards");
  if (!cardsEl) return;
  const chartEl = $("#financialIncomeChart");
  const breakdownEl = $("#financialBreakdown");
  const lineItemsEl = $("#financialLineItemsBody");
  if (currentRole() !== "admin") {
    cardsEl.innerHTML = "";
    if (chartEl) chartEl.innerHTML = "";
    if (breakdownEl) breakdownEl.innerHTML = "";
    if (lineItemsEl) lineItemsEl.innerHTML = "";
    return;
  }
  ensureFinancialRangeInputs();
  financialSyncViewState();
  if ($("#financialCalculationNote")) $("#financialCalculationNote").innerHTML = financialCalculationNoteHtml();
  const period = ["weekly", "monthly", "yearly"].includes(financialPeriodView) ? financialPeriodView : "monthly";
  $$("#financialPeriodControl [data-financial-period]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.financialPeriod === period);
  });
  const range = financialRangeValues();
  const entries = financialIncomeEntries().filter((entry) => entry.date >= range.start && entry.date <= range.end);
  const buckets = financialBuildBuckets(entries, range, period);
  const total = entries.reduce((sum, entry) => sum + Number(entry.total || 0), 0);
  const boarding = entries.reduce((sum, entry) => sum + Number(entry.boarding || 0), 0);
  const services = entries.reduce((sum, entry) => sum + Number(entry.services || 0), 0);
  const peakBucket = buckets.reduce((best, bucket) => bucket.total > (best?.total || 0) ? bucket : best, null);
  cardsEl.innerHTML = [
    financialSummaryCardHtml("Total income", money(total), financialRangeLabel(range)),
    financialSummaryCardHtml("Boarding income", money(boarding), "Overnight stays and boarding programs."),
    financialSummaryCardHtml("Services income", money(services), "Stay add-ons and service-only requests."),
    financialSummaryCardHtml("Stays counted", String(entries.reduce((sum, entry) => sum + Number(entry.count || 1), 0)), "Cancelled stays are excluded."),
    financialSummaryCardHtml("Peak " + period.replace("ly", ""), peakBucket ? money(peakBucket.total) : money(0), peakBucket ? peakBucket.label : "No income yet."),
  ].join("");
  if ($("#financialChartTitle")) $("#financialChartTitle").textContent = period.charAt(0).toUpperCase() + period.slice(1) + " income trend";
  if ($("#financialChartMeta")) $("#financialChartMeta").textContent = financialRangeLabel(range) + " | " + entries.length + " booking group" + (entries.length === 1 ? "" : "s");
  if (chartEl) {
    chartEl.innerHTML = financialIncomeChartSvg(buckets);
    chartEl.setAttribute("aria-label", period + " income trend from " + range.start + " to " + range.end);
  }
  if (breakdownEl) breakdownEl.innerHTML = financialBreakdownHtml(buckets);
  renderFinancialLineItems(entries, range);
}

function renderCfoNotes() {}

function settingsUserTabFor(user = {}) {
  if (user.role === "admin") return "admin";
  if (user.role === "helper" || user.role === "staff") return "staff";
  if (userMemberFlag(user)) return "member";
  return "customer";
}

function settingsUserDisplayRole(user = {}) {
  return \`\${roleLabel(user.role)}\${userMemberFlag(user) ? " | Member" : ""}\`;
}

function settingsUserPasswordText(user = {}) {
  return user.passwordChangeRequired ? "Change required" : "Current";
}

function defaultSettingsUserForActiveTab() {
  if (settingsUserTab === "admin") return { role: "admin" };
  if (settingsUserTab === "staff") return { role: "helper" };
  if (settingsUserTab === "member") return { role: "customer", isMember: true };
  return { role: "customer" };
}

function settingsUserSortValue(user = {}, key = "name") {
  if (key === "email") return user.email || "";
  if (key === "role") return settingsUserDisplayRole(user);
  if (key === "password") return settingsUserPasswordText(user);
  return user.name || user.email || "";
}

function sortedSettingsUsers(users = []) {
  const direction = settingsUserSort.direction === "desc" ? -1 : 1;
  const key = settingsUserSort.key || "name";
  return [...users].sort((a, b) => {
    const left = String(settingsUserSortValue(a, key)).toLowerCase();
    const right = String(settingsUserSortValue(b, key)).toLowerCase();
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }) * direction;
  });
}

function setSettingsUserSort(key = "name") {
  settingsUserSort = {
    key,
    direction: settingsUserSort.key === key && settingsUserSort.direction === "asc" ? "desc" : "asc",
  };
  renderSettingsUsers();
}

function renderSettingsUserTabs(users = settingsUsers()) {
  const counts = { admin: 0, staff: 0, customer: 0, member: 0 };
  users.forEach((user) => {
    const tab = settingsUserTabFor(user);
    counts[tab] = (counts[tab] || 0) + 1;
  });
  $$("#settingsUserTabs [data-settings-user-tab]").forEach((button) => {
    const active = button.dataset.settingsUserTab === settingsUserTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  Object.entries(counts).forEach(([tab, count]) => {
    const counter = $(\`[data-settings-user-count="\${tab}"]\`);
    if (counter) counter.textContent = count;
  });
}

function renderSettingsUserSortHeaders() {
  $$("#settingsUserTableHead [data-settings-sort]").forEach((header) => {
    const active = header.dataset.settingsSort === settingsUserSort.key;
    header.setAttribute("aria-sort", active ? (settingsUserSort.direction === "asc" ? "ascending" : "descending") : "none");
    header.title = "Double-click to sort ascending or descending.";
    const indicator = header.querySelector(".sort-indicator");
    if (indicator) indicator.textContent = active ? settingsUserSort.direction.toUpperCase() : "";
  });
}

function renderSettingsUsers() {
  if (!$("#settingsUserTableBody")) return;
  const users = settingsUsers();
  const visibleUsers = sortedSettingsUsers(users.filter((user) => settingsUserTabFor(user) === settingsUserTab));
  const emptyLabel = settingsUserTabLabels[settingsUserTab] || "selected";
  renderSettingsUserTabs(users);
  renderSettingsUserSortHeaders();
  $("#settingsUserTableBody").innerHTML = visibleUsers.length
    ? visibleUsers
        .map((user) => \`<tr data-id="\${user.id}"><td>\${escapeHtml(user.name || "")}</td><td>\${escapeHtml(user.email || "")}</td><td>\${escapeHtml(settingsUserDisplayRole(user))}</td><td>\${user.passwordChangeRequired ? '<span class="status-chip warning-chip">Change required</span>' : '<span class="status-chip">Current</span>'}</td><td><button type="button" class="secondary-button" data-action="remove-settings-user" data-id="\${user.id}">Remove</button></td></tr>\`)
        .join("")
    : \`<tr><td colspan="5">No \${escapeHtml(emptyLabel.toLowerCase())} users saved yet.</td></tr>\`;
  if ($("#settingsUserCards")) {
    $("#settingsUserCards").innerHTML = visibleUsers.length
      ? visibleUsers.map((user) => \`<button type="button" class="settings-user-card" data-action="view-settings-user" data-id="\${escapeHtml(user.id)}"><strong>\${escapeHtml(user.name || user.email || "User")}</strong><span>\${escapeHtml(user.email || "")}</span><small>\${escapeHtml(settingsUserDisplayRole(user))}\${user.passwordChangeRequired ? " | Password change required" : ""}</small></button>\`).join("")
      : \`<article class="record-card"><strong>No \${escapeHtml(emptyLabel.toLowerCase())} users saved yet.</strong></article>\`;
  }
}

function kennelLocations({ activeOnly = false } = {}) {
  return readRecords("kennelLocation")
    .filter((location) => !location.removed)
    .filter((location) => !activeOnly || location.active === "on" || location.active === true || location.active === "true")
    .sort((a, b) => \`\${a.building || ""} \${a.name || ""}\`.localeCompare(\`\${b.building || ""} \${b.name || ""}\`));
}

function kennelBuildingRecords() {
  const records = readRecords("kennelBuilding").filter((building) => !building.removed && building.name);
  const byName = new Map(records.map((building) => [building.name, building]));
  kennelLocations().forEach((location) => {
    if (location.building && !byName.has(location.building)) {
      byName.set(location.building, { type: "kennelBuilding", id: \`derived-\${location.building}\`, name: location.building, derived: true });
    }
  });
  return [...byName.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true, sensitivity: "base" }));
}

function kennelBuildingNames(locations = kennelLocations()) {
  const names = [...new Set([...kennelBuildingRecords().map((building) => building.name), ...locations.map((location) => location.building)].filter(Boolean))];
  return names.length ? names : ["Shed", "Mansion"];
}

function kennelBuildings(locations = kennelLocations({ activeOnly: true })) {
  const names = [...new Set(locations.map((location) => location.building || "").filter(Boolean))].sort();
  return names.length ? names : kennelBuildingNames(locations);
}

function activeKennelBuildingName() {
  const names = kennelBuildingNames();
  if (!names.includes(kennelBuildingTab)) kennelBuildingTab = names[0] || "Shed";
  return kennelBuildingTab;
}

function renderKennelBuildingTabs() {
  const tabs = $("#kennelBuildingTabs");
  if (!tabs) return;
  const names = kennelBuildingNames();
  const active = activeKennelBuildingName();
  const canManage = currentRole() === "admin";
  tabs.innerHTML = \`\${names.map((name) => \`<span class="task-tab-pill"><button type="button" data-kennel-building-tab="\${escapeHtml(name)}" role="tab" aria-selected="\${name === active ? "true" : "false"}" class="\${name === active ? "is-active" : ""}">\${escapeHtml(name)}</button></span>\`).join("")}\${canManage ? \`<button type="button" class="secondary-button task-add-tab-button" data-action="add-kennel-building-tab">Add Tab</button>\` : ""}\`;
}

function kennelLocationOptionsForBuilding(building = "", selectedId = "") {
  const matching = kennelLocations({ activeOnly: true }).filter((location) => (location.building || "") === building);
  return matching.length
    ? matching.map((location) => \`<option value="\${escapeHtml(location.id)}" \${location.id === selectedId ? "selected" : ""}>\${escapeHtml(location.name || "Kennel")}</option>\`).join("")
    : \`<option value="">No active kennels saved for \${escapeHtml(building || "this building")}</option>\`;
}

function renderKennelLocations() {
  const list = $("#kennelLocationList");
  if (!list) return;
  renderKennelBuildingTabs();
  const active = activeKennelBuildingName();
  const actionRow = $("#kennelBuildingActionRow");
  if (actionRow) {
    actionRow.innerHTML = currentRole() === "admin"
      ? \`<button type="button" class="secondary-button danger-button" data-action="remove-kennel-building-tab" data-building="\${escapeHtml(active)}">Delete \${escapeHtml(active)}</button>\`
      : "";
  }
  const records = kennelLocations().filter((location) => (location.building || "") === active);
  list.innerHTML = records.length
    ? records
        .map((location) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(location.name || "Kennel")}</strong><span>\${escapeHtml(active)} | \${(location.active === "on" || location.active === true || location.active === "true") ? "Active" : "Inactive"}</span><div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-kennel-location" data-id="\${escapeHtml(location.id)}">Remove</button></div></article>\`)
        .join("")
    : \`<article class="record-card compact-record-card"><strong>No locations saved for \${escapeHtml(active)}</strong><p>Add kennel, crate, room, or other useful location text above.</p></article>\`;
}

function kennelBuildingFormHtml() {
  return \`<form id="kennelBuildingTabForm" class="tracker-form">
    <label>Building name<input type="text" name="name" required placeholder="Example: Puppy room, Back kennels, Crates" /></label>
    <div class="button-row"><button type="submit">Add Tab</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openKennelBuildingPopup() {
  showDetailDialog("Add Building Tab", kennelBuildingFormHtml());
}

async function saveKennelBuildingFromForm(formEl) {
  if (currentRole() !== "admin") return null;
  if (!validateForm(formEl)) return null;
  const name = formPayload(formEl).name.trim();
  if (kennelBuildingNames().some((building) => building.toLowerCase() === name.toLowerCase())) {
    showToast("A building tab with that name already exists.");
    return null;
  }
  const record = upsertRecord("kennelBuilding", {
    type: "kennelBuilding",
    id: uid("kennelBuilding"),
    name,
    submittedAt: new Date().toISOString(),
    removed: false,
  });
  await sendPayload(record);
  await addAuditLog("Created kennel building", "kennelBuilding", record, name);
  kennelBuildingTab = name;
  renderKennelLocations();
  return record;
}

function kennelBuildingRemoveConfirmHtml(building = "") {
  const count = kennelLocations().filter((location) => (location.building || "") === building).length;
  return \`<div class="tracker-form">
    <article class="record-card compact-record-card danger-confirm-card">
      <strong>Delete \${escapeHtml(building)}?</strong>
      <p>This deletes the building tab and \${count} saved location\${count === 1 ? "" : "s"} under it.</p>
    </article>
    <div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-kennel-building-tab" data-building="\${escapeHtml(building)}">Delete \${escapeHtml(building)}</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </div>\`;
}

function openKennelBuildingRemoveConfirm(building = "") {
  if (building) showDetailDialog("Confirm Delete Building Tab", kennelBuildingRemoveConfirmHtml(building));
}

async function removeKennelBuilding(building = "") {
  if (!building || currentRole() !== "admin") return null;
  const now = new Date().toISOString();
  const buildingRecord = readRecords("kennelBuilding").find((record) => !record.removed && record.name === building);
  if (buildingRecord) await sendPayload(upsertRecord("kennelBuilding", { ...buildingRecord, removed: true, removedAt: now }));
  const locations = kennelLocations().filter((location) => (location.building || "") === building);
  for (const location of locations) {
    await sendPayload(upsertRecord("kennelLocation", { ...location, removed: true, removedAt: now }));
  }
  await addAuditLog("Removed kennel building", "kennelBuilding", buildingRecord || { name: building }, \`\${building} | \${locations.length} locations\`);
  kennelBuildingTab = kennelBuildingNames()[0] || "Shed";
  renderKennelLocations();
  return { building, count: locations.length };
}

async function addKennelLocationToActiveBuilding() {
  if (currentRole() !== "admin") return null;
  const input = $("#newKennelLocationText");
  const name = input?.value.trim() || "";
  if (!name) {
    showToast("Enter a kennel, crate, room, or location note before adding it.");
    return null;
  }
  const building = activeKennelBuildingName();
  if (kennelLocations().some((location) => (location.building || "") === building && (location.name || "").toLowerCase() === name.toLowerCase())) {
    showToast("That location already exists in this building tab.");
    return null;
  }
  const record = upsertRecord("kennelLocation", {
    type: "kennelLocation",
    id: uid("kennelLocation"),
    submittedAt: new Date().toISOString(),
    building,
    name,
    active: "on",
    removed: false,
  });
  await sendPayload(record);
  await addAuditLog("Created kennel location", "kennelLocation", record, \`\${building} active\`);
  input.value = "";
  renderKennelLocations();
  showToast("Location added.");
  return record;
}

async function removeKennelLocationById(id = "") {
  if (currentRole() !== "admin") return null;
  const location = readRecords("kennelLocation").find((record) => record.id === id && !record.removed);
  if (!location) return null;
  const updated = upsertRecord("kennelLocation", { ...location, removed: true, removedAt: new Date().toISOString() });
  await sendPayload(updated);
  await addAuditLog("Removed kennel location", "kennelLocation", updated, updated.building || "");
  renderKennelLocations();
  return updated;
}

function operationBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return !["false", "off", "no", "closed", "0"].includes(String(value).toLowerCase());
}

function normalizeOperationTime(value = "", fallback = defaultOperationOpenTime) {
  const match = String(value || "").match(/^(\\d{1,2}):(\\d{2})/);
  if (!match) return fallback;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return \`\${String(hour).padStart(2, "0")}:\${String(minute).padStart(2, "0")}\`;
}

function operationHoursRecords() {
  const defaults = defaultOperationHourRecords();
  const recordsByWeekday = new Map(defaults.map((record) => [record.weekday, record]));
  readRecords("operationHours")
    .filter((record) => !record.removed)
    .forEach((record) => {
      const weekday = record.weekday || operationWeekdays.find((day) => day.dayIndex === Number(record.dayIndex))?.key;
      if (!weekday) return;
      const fallback = recordsByWeekday.get(weekday) || {};
      recordsByWeekday.set(weekday, { ...fallback, ...record, weekday });
    });
  return operationWeekdays.map((day) => {
    const record = recordsByWeekday.get(day.key) || {};
    return {
      ...record,
      type: "operationHours",
      id: record.id || \`operationHours-\${day.key}\`,
      weekday: day.key,
      weekdayLabel: day.label,
      dayIndex: day.dayIndex,
      isOpen: operationBoolean(record.isOpen, true),
      openTime: normalizeOperationTime(record.openTime, defaultOperationOpenTime),
      closeTime: normalizeOperationTime(record.closeTime, defaultOperationCloseTime),
      removed: false,
    };
  });
}

function operationHoursForDate(date = todayDate()) {
  const parsed = new Date(\`\${dateOnly(date) || todayDate()}T12:00:00\`);
  const dayIndex = Number.isNaN(parsed.getTime()) ? 1 : parsed.getDay();
  return operationHoursRecords().find((record) => Number(record.dayIndex) === dayIndex) || operationHoursRecords()[0];
}

function operationOverrideForDate(date = "") {
  const dateKey = dateOnly(date);
  if (!dateKey) return null;
  return readRecords("operationDateOverride")
    .filter((record) => !record.removed && record.date === dateKey)
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0))[0] || null;
}

function operationWindowForDate(date = "") {
  const dateKey = dateOnly(date);
  const weekly = operationHoursForDate(dateKey);
  const override = operationOverrideForDate(dateKey);
  const openSource = override || weekly;
  const isOpen = operationBoolean(openSource.isOpen, true);
  const openTime = normalizeOperationTime(openSource.openTime || weekly.openTime, weekly.openTime || defaultOperationOpenTime);
  const closeTime = normalizeOperationTime(openSource.closeTime || weekly.closeTime, weekly.closeTime || defaultOperationCloseTime);
  const invalidWindow = isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime);
  return {
    date: dateKey,
    isOpen: isOpen && !invalidWindow,
    openTime,
    closeTime,
    message: override?.customerMessage || "",
    override,
    weekly,
    invalidWindow,
  };
}

function operationWindowText(window = {}) {
  if (!window.date) return "Choose a date to see available customer request hours.";
  if (!window.isOpen) return window.invalidWindow ? "Hours need review by the kennel before customers can request this day." : "Closed to customer drop-off and pick-up requests.";
  return \`Available \${displayTime(window.openTime)} - \${displayTime(window.closeTime)}\`;
}

function operationDateLabel(date = "") {
  const dateKey = dateOnly(date);
  if (!dateKey) return "Selected date";
  return new Date(\`\${dateKey}T12:00:00\`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function operationCalendarDates(monthKey = operationCalendarMonth) {
  const first = new Date(\`\${monthKey}-01T12:00:00\`);
  if (Number.isNaN(first.getTime())) return [];
  const firstOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - firstOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
}

function operationOverrideSummaryHtml() {
  const overrides = readRecords("operationDateOverride")
    .filter((record) => !record.removed)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return overrides.length
    ? overrides.map((record) => {
      const open = operationBoolean(record.isOpen, true);
      const timeText = open ? \`\${displayTime(record.openTime)} - \${displayTime(record.closeTime)}\` : "Closed";
      return \`<article class="record-card compact-record-card"><strong>\${escapeHtml(operationDateLabel(record.date))}</strong><span>\${escapeHtml(timeText)}</span>\${record.customerMessage ? \`<p>\${escapeHtml(record.customerMessage)}</p>\` : ""}<div class="record-actions"><button type="button" class="secondary-button" data-action="open-operation-date-override" data-date="\${escapeHtml(record.date)}">Edit</button></div></article>\`;
    }).join("")
    : \`<article class="record-card compact-record-card"><strong>No date overrides saved</strong><p>Weekly hours apply until a specific calendar date is changed.</p></article>\`;
}

function renderOperationHoursSettings() {
  const list = $("#operationHoursList");
  if (!list) return;
  const hours = operationHoursRecords();
  const openDays = hours.filter((record) => operationBoolean(record.isOpen, true)).length;
  const overrideCount = readRecords("operationDateOverride").filter((record) => !record.removed).length;
  const closedOverrides = readRecords("operationDateOverride").filter((record) => !record.removed && !operationBoolean(record.isOpen, true)).length;
  $("#operationHoursSummary").innerHTML = [
    ["Open days", openDays, "weekly customer request days"],
    ["Date overrides", overrideCount, "calendar-specific changes"],
    ["Closed dates", closedOverrides, "blocked request dates"],
  ].map(([label, value, note]) => \`<div class="summary-card"><span>\${escapeHtml(label)}</span><strong>\${escapeHtml(String(value))}</strong><p>\${escapeHtml(note)}</p></div>\`).join("");
  list.innerHTML = hours.map((record) => {
    const open = operationBoolean(record.isOpen, true);
    return \`<article class="record-card operation-day-card" data-weekday="\${escapeHtml(record.weekday)}">
      <div class="operation-day-header">
        <strong>\${escapeHtml(record.weekdayLabel || record.weekday)}</strong>
        <label class="toggle-row"><input type="checkbox" data-operation-open \${open ? "checked" : ""} /> Open</label>
      </div>
      <div class="field-grid">
        <label>Open time<input type="time" data-operation-open-time value="\${escapeHtml(record.openTime || defaultOperationOpenTime)}" \${open ? "" : "disabled"} /></label>
        <label>Close time<input type="time" data-operation-close-time value="\${escapeHtml(record.closeTime || defaultOperationCloseTime)}" \${open ? "" : "disabled"} /></label>
      </div>
      <p>\${open ? \`Customers can request drop-off and pick-up from \${escapeHtml(displayTime(record.openTime))} to \${escapeHtml(displayTime(record.closeTime))}.\` : "Customers cannot request drop-off or pick-up on this weekday."}</p>
    </article>\`;
  }).join("");
  const monthLabelEl = $("#operationCalendarMonthLabel");
  if (monthLabelEl) monthLabelEl.textContent = monthLabel(operationCalendarMonth);
  const calendar = $("#operationOverrideCalendar");
  if (calendar) {
    calendar.innerHTML = [
      ...operationWeekdays.map((day) => \`<div class="operation-calendar-header">\${escapeHtml(day.shortLabel)}</div>\`),
      ...operationCalendarDates(operationCalendarMonth).map((date) => {
        const inMonth = date.slice(0, 7) === operationCalendarMonth;
        const window = operationWindowForDate(date);
        const override = window.override;
        const status = !window.isOpen ? "Closed" : override ? "Custom" : "Open";
        const message = override?.customerMessage ? "Message" : "";
        return \`<button type="button" class="operation-calendar-day \${inMonth ? "" : "is-outside-month"} \${!window.isOpen ? "is-closed" : ""} \${override ? "has-override" : ""}" data-action="open-operation-date-override" data-date="\${escapeHtml(date)}">
          <strong>\${Number(date.slice(8, 10))}</strong>
          <span>\${escapeHtml(status)}</span>
          \${message ? \`<small>\${escapeHtml(message)}</small>\` : ""}
        </button>\`;
      }),
    ].join("");
  }
  const overrideList = $("#operationOverrideList");
  if (overrideList) overrideList.innerHTML = operationOverrideSummaryHtml();
}

async function saveOperationHoursSettings() {
  if (currentRole() !== "admin") return null;
  const cards = $$("#operationHoursList .operation-day-card");
  const now = new Date().toISOString();
  const records = [];
  for (const card of cards) {
    const weekday = card.dataset.weekday || "";
    const day = operationWeekdays.find((item) => item.key === weekday);
    if (!day) continue;
    const isOpen = Boolean(card.querySelector("[data-operation-open]")?.checked);
    const openTime = normalizeOperationTime(card.querySelector("[data-operation-open-time]")?.value, defaultOperationOpenTime);
    const closeTime = normalizeOperationTime(card.querySelector("[data-operation-close-time]")?.value, defaultOperationCloseTime);
    if (isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime)) {
      showToast(\`\${day.label} close time must be after open time.\`);
      card.querySelector("[data-operation-close-time]")?.focus();
      return null;
    }
    records.push({
      type: "operationHours",
      id: \`operationHours-\${day.key}\`,
      weekday: day.key,
      weekdayLabel: day.label,
      dayIndex: day.dayIndex,
      isOpen,
      openTime,
      closeTime,
      submittedAt: readRecords("operationHours").find((record) => record.id === \`operationHours-\${day.key}\`)?.submittedAt || now,
      updatedAt: now,
      updatedBy: currentUser?.email || helperEmail?.value || "",
      removed: false,
    });
  }
  for (const record of records) await sendPayload(upsertRecord("operationHours", record));
  await addAuditLog("Updated operation hours", "operationHours", { id: "weekly-operation-hours" }, "Weekly customer request hours updated.");
  renderOperationHoursSettings();
  renderCustomerBookingAvailabilityMessages();
  showToast("Hours of operation saved.");
  return records;
}

async function resetOperationHoursSettings() {
  if (currentRole() !== "admin") return null;
  const now = new Date().toISOString();
  for (const record of defaultOperationHourRecords()) {
    await sendPayload(upsertRecord("operationHours", { ...record, updatedAt: now, updatedBy: currentUser?.email || helperEmail?.value || "" }));
  }
  await addAuditLog("Reset operation hours", "operationHours", { id: "weekly-operation-hours" }, "Weekly customer request hours reset to 9 AM - 9 PM.");
  renderOperationHoursSettings();
  showToast("Weekly hours reset.");
  return true;
}

function operationDateOverrideFormHtml(date = todayDate()) {
  const dateKey = dateOnly(date) || todayDate();
  const existing = operationOverrideForDate(dateKey) || {};
  const weekly = operationHoursForDate(dateKey);
  const open = operationBoolean(existing.isOpen, operationBoolean(weekly.isOpen, true));
  const openTime = normalizeOperationTime(existing.openTime || weekly.openTime, defaultOperationOpenTime);
  const closeTime = normalizeOperationTime(existing.closeTime || weekly.closeTime, defaultOperationCloseTime);
  return \`<form id="operationDateOverrideForm" class="tracker-form" data-date="\${escapeHtml(dateKey)}" data-id="\${escapeHtml(existing.id || "")}">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(operationDateLabel(dateKey))}</strong>
      <span>Weekly default: \${operationBoolean(weekly.isOpen, true) ? \`\${escapeHtml(displayTime(weekly.openTime))} - \${escapeHtml(displayTime(weekly.closeTime))}\` : "Closed"}</span>
    </article>
    <label class="toggle-row"><input type="checkbox" name="isOpen" \${open ? "checked" : ""} /> Open to customer drop-off and pick-up requests</label>
    <div class="field-grid">
      <label>Open time<input type="time" name="openTime" value="\${escapeHtml(openTime)}" \${open ? "" : "disabled"} /></label>
      <label>Close time<input type="time" name="closeTime" value="\${escapeHtml(closeTime)}" \${open ? "" : "disabled"} /></label>
    </div>
    <label>Customer message<textarea name="customerMessage" rows="3" placeholder="Message customers will see when they select this date.">\${escapeHtml(existing.customerMessage || "")}</textarea></label>
    <div class="button-row">
      <button type="submit">Save Date</button>
      \${existing.id ? \`<button type="button" class="secondary-button danger-button" data-action="clear-operation-date-override" data-id="\${escapeHtml(existing.id)}">Clear Override</button>\` : ""}
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </form>\`;
}

function openOperationDateOverridePopup(date = todayDate()) {
  if (currentRole() !== "admin") {
    showToast("Admin access required to edit hours of operation.");
    return;
  }
  showDetailDialog("Date Hours Override", operationDateOverrideFormHtml(date));
}

async function saveOperationDateOverrideFromForm(formEl) {
  if (currentRole() !== "admin") return null;
  const date = formEl.dataset.date || todayDate();
  const existing = formEl.dataset.id ? readRecords("operationDateOverride").find((record) => record.id === formEl.dataset.id) : operationOverrideForDate(date);
  const isOpenField = formFieldByName(formEl, "isOpen");
  const openTimeField = formFieldByName(formEl, "openTime");
  const closeTimeField = formFieldByName(formEl, "closeTime");
  const customerMessageField = formFieldByName(formEl, "customerMessage");
  const isOpen = Boolean(isOpenField?.checked);
  const openTime = normalizeOperationTime(openTimeField?.value, defaultOperationOpenTime);
  const closeTime = normalizeOperationTime(closeTimeField?.value, defaultOperationCloseTime);
  if (isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime)) {
    showToast("Close time must be after open time.");
    closeTimeField?.focus();
    return null;
  }
  const now = new Date().toISOString();
  const record = upsertRecord("operationDateOverride", {
    ...(existing || {}),
    type: "operationDateOverride",
    id: existing?.id || \`operationDateOverride-\${date}\`,
    submittedAt: existing?.submittedAt || now,
    date,
    isOpen,
    openTime,
    closeTime,
    customerMessage: customerMessageField?.value.trim() || "",
    updatedAt: now,
    updatedBy: currentUser?.email || helperEmail?.value || "",
    removed: false,
  });
  await sendPayload(record);
  await addAuditLog("Updated operation date override", "operationDateOverride", record, \`\${operationDateLabel(date)} | \${isOpen ? \`\${displayTime(openTime)} - \${displayTime(closeTime)}\` : "Closed"}\`);
  renderOperationHoursSettings();
  renderCustomerBookingAvailabilityMessages();
  return record;
}

async function clearOperationDateOverride(id = "") {
  const record = readRecords("operationDateOverride").find((item) => item.id === id && !item.removed);
  if (!record || currentRole() !== "admin") return null;
  const updated = upsertRecord("operationDateOverride", { ...record, removed: true, removedAt: new Date().toISOString() });
  await sendPayload(updated);
  await addAuditLog("Cleared operation date override", "operationDateOverride", updated, operationDateLabel(updated.date));
  renderOperationHoursSettings();
  renderCustomerBookingAvailabilityMessages();
  return updated;
}

function renderAuditLog() {
  const list = $("#auditLogList");
  if (!list) return;
  const records = readRecords("auditLog").filter((record) => !record.removed).slice(0, 25);
  list.innerHTML = records.length
    ? records.map((record) => {
      const canRestoreBoardingDog = record.action === "Deleted boarding dog" && record.targetType === "boardingDog" && readRecords("boardingDog").some((dog) => dog.id === record.targetId && dog.removed);
      return \`<article class="record-card compact-record-card"><strong>\${escapeHtml(record.action || "Change")} - \${escapeHtml(record.targetLabel || record.targetType || "")}</strong><span>\${escapeHtml(record.actorName || "Admin")} | \${escapeHtml(formatDateTime(record.submittedAt || record.updatedAt))}</span><p>\${escapeHtml(record.details || record.targetType || "")}</p>\${canRestoreBoardingDog ? \`<div class="record-actions"><button type="button" class="secondary-button" data-action="restore-boarding-dog" data-id="\${escapeHtml(record.targetId)}">Restore Dog</button></div>\` : ""}</article>\`;
    }).join("")
    : \`<article class="record-card compact-record-card"><strong>No audit activity yet</strong><p>Admin setting, service, user, and kennel changes will appear here.</p></article>\`;
}

function kennelAssignmentPopupHtml(record = {}, nextStatus = "In Kennel", options = {}) {
  const locations = kennelLocations({ activeOnly: true });
  const buildings = kennelBuildings(locations);
  const targetStay = boardingStatusTargetStay(record, nextStatus, options) || {};
  const selectedBuilding = targetStay.kennelBuilding || record.kennelBuilding || buildings[0] || "Shed";
  const buildingOptions = buildings.map((building) => \`<option value="\${escapeHtml(building)}" \${building === selectedBuilding ? "selected" : ""}>\${escapeHtml(building)}</option>\`).join("");
  const locationOptions = kennelLocationOptionsForBuilding(selectedBuilding, targetStay.kennelLocationId || record.kennelLocationId || "");
  const hasLocationsForBuilding = locations.some((location) => (location.building || "") === selectedBuilding);
  const help = locations.length ? "Choose the building first, then the exact kennel assignment." : "Add active kennel locations in Settings first.";
  return \`<form id="kennelAssignmentForm" class="tracker-form" data-dog-id="\${escapeHtml(record.id || "")}" data-stay-id="\${escapeHtml(options.stayId || "")}" data-request-code="\${escapeHtml(options.requestCode || "")}" data-next-status="\${escapeHtml(nextStatus)}" data-allow-early="\${options.allowEarly ? "true" : "false"}" data-early="\${options.early ? "true" : "false"}">
    <article class="record-card compact-record-card"><strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong><p>\${escapeHtml(boardingScheduleText(record))}</p></article>
    <div class="field-grid">
      <label>Building<select name="kennelBuilding" id="kennelAssignmentBuilding" required \${locations.length ? "" : "disabled"}>\${buildingOptions}</select><small>\${escapeHtml(help)}</small></label>
      <label>Kennel<select name="kennelLocationId" id="kennelAssignmentLocation" required \${hasLocationsForBuilding ? "" : "disabled"}><option value="">Select kennel</option>\${locationOptions}</select><small id="kennelAssignmentHelp">\${hasLocationsForBuilding ? "Available active kennels for this building." : "No active kennels are saved for this building."}</small></label>
    </div>
    <div class="button-row"><button type="submit" \${hasLocationsForBuilding ? "" : "disabled"}>Assign Kennel</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openKennelAssignmentPopup(record = {}, nextStatus = "In Kennel", options = {}) {
  showDetailDialog("Assign Kennel", kennelAssignmentPopupHtml(record, nextStatus, options));
}

function updateKennelAssignmentLocations(formEl) {
  if (!formEl) return;
  const building = formEl.elements.kennelBuilding?.value || "";
  const locations = kennelLocations({ activeOnly: true }).filter((location) => (location.building || "") === building);
  const locationSelect = formEl.elements.kennelLocationId;
  const submitButton = formEl.querySelector('button[type="submit"]');
  const help = $("#kennelAssignmentHelp");
  if (!locationSelect) return;
  locationSelect.innerHTML = \`<option value="">Select kennel</option>\${kennelLocationOptionsForBuilding(building)}\`;
  locationSelect.disabled = !locations.length;
  if (submitButton) submitButton.disabled = !locations.length;
  if (help) help.textContent = locations.length ? "Available active kennels for this building." : "No active kennels are saved for this building.";
}

function openSettingsUser(record = {}) {
  openSettingsUserPopup(record);
}

function settingsUserLastLoginText(user = {}) {
  if (!user.lastLoginAt) return "No login has been recorded yet.";
  const provider = user.lastLoginProvider ? \` via \${user.lastLoginProvider}\` : "";
  return \`\${formatDateTime(user.lastLoginAt)}\${provider}\`;
}

function settingsUserPopupHtml(user = {}) {
  const isEdit = Boolean(user.id);
  const canImpersonate = isEdit && currentRole() === "admin" && normalizeEmail(user.email) !== normalizeEmail(currentUser?.email);
  return \`
    <form id="settingsUserPopupForm" class="tracker-form" data-user-id="\${escapeHtml(user.id || "")}">
      <input type="hidden" name="id" value="\${escapeHtml(user.id || "")}" />
      <article class="record-card compact-record-card settings-user-login-card">
        <span>\${isEdit ? "Last Login" : "New User"}</span>
        <strong>\${escapeHtml(isEdit ? settingsUserLastLoginText(user) : "Create access for a staff member, admin, customer, or member customer.")}</strong>
        <p>\${isEdit ? (user.loginCount ? \`\${Number(user.loginCount)} recorded login\${Number(user.loginCount) === 1 ? "" : "s"}.\` : "This updates after the user signs in through the app.") : "Save the user first, then set a temporary password or send a reset email when needed."}</p>
      </article>
      <div class="field-grid">
        <label>Name<input type="text" name="name" required value="\${escapeHtml(user.name || "")}" /></label>
        <label>Email<input type="email" name="email" required value="\${escapeHtml(user.email || "")}" /></label>
        <label>Role<select name="role" required><option value="customer" \${user.role === "customer" ? "selected" : ""}>Customer</option><option value="helper" \${user.role === "helper" || user.role === "staff" ? "selected" : ""}>Staff</option><option value="admin" \${user.role === "admin" ? "selected" : ""}>Admin</option></select></label>
      </div>
      <label class="inline-check"><input type="checkbox" name="isMember" \${userMemberFlag(user) ? "checked" : ""} /> Member customer pricing</label>
      <div class="admin-password-panel">
        <h3>Password Management</h3>
        <p>Set a temporary Supabase password or send a reset email for this user.</p>
        <div class="field-grid">
          <label>Temporary password<input type="password" name="temporaryPassword" minlength="8" autocomplete="new-password" /></label>
          <label>Confirm temporary password<input type="password" name="temporaryPasswordConfirm" minlength="8" autocomplete="new-password" /></label>
          <label class="inline-check"><input type="checkbox" name="requirePasswordChange" checked /> Require password change at next login</label>
        </div>
        <div class="button-row">
          <button type="button" class="secondary-button" data-action="popup-set-password">Set Temporary Password</button>
          <button type="button" class="secondary-button" data-action="popup-send-reset">Send Reset Email</button>
        </div>
      </div>
      <div class="button-row"><button type="submit">Save User</button>\${canImpersonate ? \`<button type="button" class="secondary-button" data-action="popup-impersonate-user" data-id="\${escapeHtml(user.id || "")}">Impersonate User</button>\` : ""}\${isEdit ? \`<button type="button" class="secondary-button danger-button" data-action="popup-remove-user" data-id="\${escapeHtml(user.id || "")}">Remove</button>\` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>\`;
}

function openSettingsUserPopup(user = {}) {
  showDetailDialog(user.id ? \`\${user.name || user.email || "User"} Access\` : "Add User", settingsUserPopupHtml(user));
}

function settingsUserRemoveConfirmHtml(user = {}, options = {}) {
  return \`
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Remove \${escapeHtml(user.name || user.email || "this user")}?</strong>
        <p>This removes app access for \${escapeHtml(user.email || "this account")}. It does not delete dog, boarding, request, or timesheet history.</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-remove-settings-user" data-id="\${escapeHtml(user.id || "")}">Confirm Remove</button>
        <button type="button" class="secondary-button" data-action="\${options.returnToUser ? "cancel-remove-settings-user" : "close-dialog"}" data-id="\${escapeHtml(user.id || "")}">Cancel</button>
      </div>
    </div>\`;
}

function openSettingsUserRemoveConfirm(user = {}, options = {}) {
  showDetailDialog("Confirm Remove User", settingsUserRemoveConfirmHtml(user, options));
}

async function removeSettingsUserById(id) {
  const removed = await markRecordRemoved("settingsUser", id);
  if (!removed) return null;
  await addAuditLog("Removed user", "settingsUser", removed, removed.email || "");
  renderSettingsUsers();
  return removed;
}

function activeSettingsUserForm() {
  return $("#settingsUserPopupForm") || $("#settingsUserForm");
}

function serviceInfoTooltipText(icon) {
  return String(icon?.dataset?.tooltip || icon?.getAttribute("aria-label") || icon?.getAttribute("title") || "").trim();
}

function serviceInfoTooltipNode(icon) {
  if (!serviceInfoTooltipEl) {
    serviceInfoTooltipEl = document.createElement("div");
    serviceInfoTooltipEl.id = "serviceInfoTooltip";
    serviceInfoTooltipEl.className = "floating-service-tooltip";
    serviceInfoTooltipEl.setAttribute("role", "tooltip");
    serviceInfoTooltipEl.hidden = true;
  }
  const host = icon?.closest?.("dialog[open]") || document.body;
  if (serviceInfoTooltipEl.parentElement !== host) host.appendChild(serviceInfoTooltipEl);
  return serviceInfoTooltipEl;
}

function positionServiceInfoTooltip(icon = activeServiceInfoIcon) {
  if (!icon || !document.body.contains(icon) || !serviceInfoTooltipEl || serviceInfoTooltipEl.hidden) return;
  const margin = 12;
  const gap = 10;
  const iconRect = icon.getBoundingClientRect();
  serviceInfoTooltipEl.style.maxWidth = \`\${Math.max(180, Math.min(360, window.innerWidth - margin * 2))}px\`;
  serviceInfoTooltipEl.style.left = "0";
  serviceInfoTooltipEl.style.top = "0";
  serviceInfoTooltipEl.style.visibility = "hidden";
  const tooltipRect = serviceInfoTooltipEl.getBoundingClientRect();
  let top = iconRect.top - tooltipRect.height - gap;
  let below = false;
  if (top < margin) {
    top = iconRect.bottom + gap;
    below = true;
  }
  if (top + tooltipRect.height > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - margin - tooltipRect.height);
  }
  const maxLeft = Math.max(margin, window.innerWidth - margin - tooltipRect.width);
  const preferredLeft = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
  const left = Math.min(Math.max(margin, preferredLeft), maxLeft);
  serviceInfoTooltipEl.classList.toggle("is-below", below);
  serviceInfoTooltipEl.style.left = \`\${left}px\`;
  serviceInfoTooltipEl.style.top = \`\${top}px\`;
  serviceInfoTooltipEl.style.visibility = "visible";
}

function showServiceInfoTooltip(icon) {
  const text = serviceInfoTooltipText(icon);
  if (!icon || !text) return;
  if (icon.hasAttribute("title")) {
    icon.dataset.nativeTitle = icon.getAttribute("title") || "";
    icon.removeAttribute("title");
  }
  const tooltip = serviceInfoTooltipNode(icon);
  activeServiceInfoIcon = icon;
  tooltip.textContent = text;
  tooltip.hidden = false;
  icon.setAttribute("aria-describedby", tooltip.id);
  positionServiceInfoTooltip(icon);
}

function hideServiceInfoTooltip(icon = null) {
  if (icon && activeServiceInfoIcon && icon !== activeServiceInfoIcon) return;
  if (activeServiceInfoIcon) activeServiceInfoIcon.removeAttribute("aria-describedby");
  activeServiceInfoIcon = null;
  if (serviceInfoTooltipEl) serviceInfoTooltipEl.hidden = true;
}

function servicePricingFilterLabel(key = servicePricingFilter) {
  return servicePricingFilters.find((filter) => filter.key === key)?.label || "All Prices";
}

function serviceMatchesPricingFilter(record = {}, key = servicePricingFilter) {
  const scope = servicePricingScope(record);
  if (key === "member") return scope === "member" || scope === "all";
  if (key === "regular") return scope === "non-member" || scope === "all";
  return true;
}

function setServicePricingFilter(key = "all") {
  const next = servicePricingFilters.some((filter) => filter.key === key) ? key : "all";
  servicePricingFilter = next;
  renderServices();
  $("#serviceTableBody")?.closest(".service-table-wrap")?.scrollTo({ top: 0, left: 0 });
}

function serviceEmptyStateText() {
  const label = servicePricingFilterLabel(servicePricingFilter);
  if (servicePricingFilter === "all") return "No services match this search.";
  return \`No \${label.toLowerCase()} services match this view.\`;
}

function renderServicePricingTabs(records = []) {
  const container = $("#servicePricingTabs");
  if (!container) return;
  container.innerHTML = servicePricingFilters.map((filter) => {
    const active = servicePricingFilter === filter.key;
    const count = records.filter((record) => serviceMatchesPricingFilter(record, filter.key)).length;
    return \`<button type="button" class="secondary-button \${active ? "is-active" : ""}" data-service-pricing-filter="\${escapeHtml(filter.key)}" role="tab" aria-selected="\${active ? "true" : "false"}">\${escapeHtml(filter.label)} <span>\${count}</span></button>\`;
  }).join("");
  container.querySelectorAll("[data-service-pricing-filter]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setServicePricingFilter(button.dataset.servicePricingFilter || "all");
    });
  });
}

function renderServices() {
  applyLegacyServiceDependencyMigration({ syncRemote: true });
  applyLegacyBoardingProgramMigration({ syncRemote: true });
  const query = $("#serviceSearch")?.value || "";
  const columns = tableColumns.service;
  const allRecords = sortRecordsForTable("service", readRecords("service").filter((record) => !record.removed && matches(record, query)));
  const records = allRecords.filter((record) => serviceMatchesPricingFilter(record));
  renderServicePricingTabs(allRecords);
  $("#serviceTableHead").innerHTML = \`<tr>\${columns.map((column) => \`<th data-sort-column="\${column.key}" data-table="service">\${escapeHtml(column.label)}</th>\`).join("")}<th>Actions</th></tr>\`;
  $("#serviceTableBody").innerHTML = records.length
    ? records
        .map((record) => \`<tr data-id="\${record.id}"><td>\${escapeHtml(record.serviceName || "")}</td><td>\${escapeHtml(record.category || "")}</td><td>\${money(record.basePrice)}</td><td>\${escapeHtml(record.unit || "")}</td><td>\${record.depositAmount ? money(record.depositAmount) : ""}</td><td>\${record.taxRate ? \`\${escapeHtml(record.taxRate)}%\` : ""}</td><td>\${serviceChipsHtml(record)}</td><td><button type="button" class="secondary-button" data-action="edit-service" data-id="\${escapeHtml(record.id)}">Edit</button></td></tr>\`)
        .join("")
    : \`<tr><td colspan="8">\${escapeHtml(serviceEmptyStateText())}</td></tr>\`;
}

function openService(record = {}) {
  const formRecord = {
    ...record,
    boardingRateType: record.boardingRateType || "",
    pricingScope: normalizedPricingScope(record.pricingScope) || servicePricingScope(record),
    boardingRateRole: normalizedBoardingRateRole(record.boardingRateRole) || "primary",
  };
  const panel = $("#serviceEditorPanel");
  if (panel && panel.parentElement !== document.body) document.body.appendChild(panel);
  if (panel) panel.hidden = false;
  if (typeof pushAppSurfaceHistory === "function") pushAppSurfaceHistory("service-editor-panel");
  const form = $("#serviceForm");
  form.reset();
  form.dataset.mode = formRecord.id ? "edit" : "create";
  renderServiceDependencyFields(formRecord);
  if (form.elements.id) {
    form.elements.id.value = formRecord.id || "";
    form.elements.id.defaultValue = formRecord.id || "";
  }
  setFormValues(form, formRecord);
  syncServiceDependencyFields();
  if (!formRecord.id && form.elements.id) form.elements.id.value = "";
  const flags = normalizedServiceFlags(formRecord.flags || ["Active"]);
  $$('input[name="serviceFlags"]').forEach((input) => {
    input.checked = flags.includes(input.value);
  });
  $("#serviceEditorTitle").textContent = formRecord.id ? "Edit Service" : "Add Service";
  $("#serviceSaveButton").textContent = formRecord.id ? "Update Service" : "Add Service";
  $("#removeServiceButton").hidden = !formRecord.id;
}

function closeServiceModal(options = {}) {
  if (!options.skipHistory && typeof closeAppSurfaceFromUi === "function") {
    closeAppSurfaceFromUi("service-editor-panel", () => closeServiceModal({ skipHistory: true }));
    return;
  }
  const form = $("#serviceForm");
  if (form) form.dataset.mode = "create";
  $("#serviceEditorPanel").hidden = true;
}

function serviceRemoveConfirmHtml(record = {}) {
  return \`<div class="tracker-form">
    <article class="record-card compact-record-card danger-confirm-card">
      <strong>Remove this service?</strong>
      <p>\${escapeHtml(record.serviceName || "Service")} | \${escapeHtml(record.category || "")} \${record.basePrice ? \`| \${money(record.basePrice)}\` : ""}</p>
      <p>This hides it from staff/admin catalogs and customer request options.</p>
    </article>
    <div class="button-row">
      <button type="button" class="danger-button" data-action="confirm-remove-service" data-id="\${escapeHtml(record.id || "")}">Remove Service</button>
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </div>\`;
}

function openServiceRemoveConfirm(record = {}) {
  if (!record?.id) return;
  showDetailDialog("Confirm Remove Service", serviceRemoveConfirmHtml(record));
}
//# sourceURL=snuggle-stay/settings.js
`;
(0, eval)(__snuggleStayModuleSource);
