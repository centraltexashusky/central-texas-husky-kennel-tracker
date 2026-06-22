// === MODULE: NOTIFICATIONS ===
const __snuggleStayModuleSource = `function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function uniqueEmails(...values) {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function getAdminEmails() {
  return readRecords("settingsUser")
    .filter((user) => !user.removed && user.role === "admin" && user.email)
    .map((user) => user.email.trim().toLowerCase());
}

function getOwnerAlertEmail() {
  const admins = getAdminEmails();
  return admins[0] || "";
}

function adminEmailList() {
  return getAdminEmails();
}

function removedSettingsUserForEmail(email = "") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return readRecords("settingsUser").find((user) => user.removed && normalizeEmail(user.email) === normalizedEmail) || null;
}

async function consolidateDuplicateSettingsUsersByEmail() {
  const activeGroups = readRecords("settingsUser")
    .filter((user) => !user.removed && normalizeEmail(user.email))
    .reduce((acc, user) => {
      const email = normalizeEmail(user.email);
      acc[email] = [...(acc[email] || []), user];
      return acc;
    }, {});
  for (const group of Object.values(activeGroups).filter((users) => users.length > 1)) {
    const saved = upsertRecord("settingsUser", mergeSettingsUserRecords(group));
    await sendPayload(saved);
    const removedDuplicates = readRecords("settingsUser").filter((user) => user.removed && user.mergedIntoId === saved.id && group.some((item) => item.id === user.id));
    for (const duplicate of removedDuplicates) await sendPayload(duplicate);
  }
}

function isEmailConfirmationError(message = "") {
  return /confirm|verified|verification/i.test(message);
}

function baseBoardingOwnerEmails(record = {}) {
  return uniqueEmails(
    record.ownerEmail,
    record.customerEmail,
    record.linkedOwnerEmail,
    record.secondaryOwnerEmail,
    record.requestedByEmail,
  );
}

function boardingOwnerEmails(record = {}) {
  const linked = readRecords("customerDog").find((dog) => !dog.removed && (
    (record.linkedCustomerDogId && dog.id === record.linkedCustomerDogId)
    || dog.linkedBoardingDogId === record.id
  )) || {};
  return uniqueEmails(...baseBoardingOwnerEmails(record), linked.ownerEmail, linked.customerEmail);
}

function legacyOwnerEmailsForRecord(record = {}) {
  return uniqueEmails(record.ownerEmail, record.customerEmail, record.linkedOwnerEmail, record.secondaryOwnerEmail, record.requestedByEmail);
}

function uniqueEmailNameCustomerMatch(record = {}, customerDogs = []) {
  const dogName = String(record.dogName || "").trim().toLowerCase();
  const ownerEmails = legacyOwnerEmailsForRecord(record);
  if (!dogName || !ownerEmails.length) return null;
  const matches = customerDogs.filter((dog) => {
    if (dog.removed) return false;
    const dogEmails = uniqueEmails(dog.ownerEmail, dog.customerEmail);
    return dogEmails.some((email) => ownerEmails.includes(email))
      && String(dog.dogName || "").trim().toLowerCase() === dogName;
  });
  return matches.length === 1 ? matches[0] : null;
}

function openOwnerUpdateAlert(recordId, reference = {}) {
  const record = boardingDogRecordForDisplay(recordId) || readRecords("boardingDog").find((item) => item.id === recordId && !item.removed);
  if (!record) return;
  const stay = ownerUpdateStayForRecord(record, reference);
  if (!ownerUpdateStayIsAvailable(record, stay)) {
    showDetailDialog("Owner Update Not Available", \`<p>Owner updates can be sent after \${escapeHtml(record.dogName || "this dog")} is checked in, in kennel, or ready for pickup.</p>\`);
    return;
  }
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const requestCode = stay.id ? boardingStayRequestCode(record, stay) : "";
  showDetailDialog(
    \`\${record.dogName || "Boarding Dog"} Owner Update\`,
    \`<article class="record-card compact-record-card"><strong>\${escapeHtml(record.dogName || "Boarding dog")}</strong><div class="chip-row">\${stay.id ? customerStayIdChipHtml(record, stay) : ""}\${stay.id ? boardingStayStatusChipHtml(record, stay) : ""}</div><p>\${escapeHtml([record.ownerName, record.ownerPhone, record.ownerEmail].filter(Boolean).join(" | "))}</p><p>\${escapeHtml(stay.id ? \`\${formatDateTime(stay.dropoffTime)} to \${formatDateTime(stay.pickupTime)}\` : record.dailyActivity || "Owner update is marked as needed.")}</p>\${ownerUpdateReasonHtml(record, stay)}</article>
    <form id="ownerUpdatePopupForm" class="tracker-form" data-id="\${escapeHtml(record.id)}"\${stayAttrs || \` data-request-code="\${escapeHtml(requestCode)}"\`}>
      <label>Daily activity update for owner<textarea name="dailyActivity" rows="4" placeholder="Eating, potty, play, exercise, mood, photos/videos taken"></textarea></label>
      <label>Update photo or video<input type="file" name="ownerUpdatePhoto" id="ownerUpdatePopupPhotoInput" accept="image/jpeg,image/png,video/mp4,video/quicktime,video/webm,video/x-m4v,.jpg,.jpeg,.png,.mp4,.mov,.webm,.m4v" multiple /></label>
      <label class="inline-check"><input type="checkbox" name="clearOwnerUpdate" checked /> Clear owner update alert after saving</label>
      <div class="button-row"><button type="submit" data-owner-update-submit-button>Save Owner Update</button><button type="button" class="secondary-button" data-action="open-boarding-editor" data-id="\${escapeHtml(record.id)}">Open Boarding Dog</button><p class="form-submit-status owner-update-submit-status" data-owner-update-submit-status role="status" aria-live="polite"></p></div>
    </form>\`,
  );
}

function openMedicalCareAlert(dogId) {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) return;
  showDetailDialog(\`\${ownedDogDisplayName(dog)} Medical/Care\`, \`\${dashboardQuickCareSummaryHtml(normalizeOwnedDogCare(dog), "Medical/Care")}<div class="button-row"><button type="button" class="secondary-button" data-action="open-owned-editor" data-id="\${escapeHtml(dog.id)}">Update Dog Record</button></div>\`);
}

function openVaccineAlert(dogId) {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) return;
  showDetailDialog(
    \`\${ownedDogDisplayName(dog)} Vaccine Update\`,
    \`\${dashboardQuickCareSummaryHtml(normalizeOwnedDogCare(dog), "Profile")}
    <form id="vaccineUpdateForm" class="tracker-form" data-dog-id="\${escapeHtml(dog.id)}">
      <div class="field-grid">
        <label>Last DHPP vaccination<input type="date" name="dhppDate" value="\${escapeHtml(dog.dhppDate || "")}" /></label>
        <label>Last rabies vaccination<input type="date" name="rabiesDate" value="\${escapeHtml(dog.rabiesDate || "")}" /></label>
      </div>
      <div class="button-row"><button type="submit">Save Vaccine Update</button><button type="button" class="secondary-button" data-action="open-owned-editor" data-id="\${escapeHtml(dog.id)}">Open Full Dog Record</button></div>
    </form>\`,
  );
}

function renderDashboardAlertTabs(alerts) {
  const container = $("#dashboardAlertTabs");
  if (!container) return;
  const ordered = ["All", "Customer Cancellations", "Treadmill", "Scooter", "Yard Run", "Training", "Baths", "Stay Services", "Heat", "Medical/Care", "Owner Updates", "Requests", "Maintenance", "Vaccines"];
  const counts = alerts.reduce((acc, alert) => {
    acc[alert.category] = (acc[alert.category] || 0) + 1;
    acc.All = (acc.All || 0) + 1;
    return acc;
  }, { All: alerts.length });
  const available = ordered.filter((label) => label === "All" || counts[label]);
  if (!available.includes(dashboardAlertFilter)) dashboardAlertFilter = "All";
  container.innerHTML = available
    .map((label) => \`<button type="button" class="\${label === dashboardAlertFilter ? "is-active" : ""}" data-alert-filter="\${escapeHtml(label)}">\${escapeHtml(label)} <span>\${counts[label] || 0}</span></button>\`)
    .join("");
}

function dashboardAlertButtonLabel(alert = {}) {
  if (alert.action === "dashboard-quick-care") {
    if (careTypeIsExercise(alert.careType)) return "Log Exercise";
    if (alert.careType === "Training") return "Log Training";
    if (alert.careType === "Bath") return "Log Bath";
    if (alert.careType === "Heat Note") return "Log Heat";
  }
  if (alert.action === "view-medical-care") return "View Care";
  if (alert.action === "view-vaccine-alert") return "Update Vaccine";
  if (alert.action === "view-owner-update") return "Update Owner";
  if (alert.action === "view-customer-cancellation") return "View Stay";
  if (alert.action === "complete-stay-service") return "Mark Done";
  return alert.type ? "Open" : "";
}

function dashboardAlertActionAttrs(alert = {}) {
  if (alert.action === "dashboard-quick-care") {
    return \`data-action="dashboard-quick-care" data-dog-id="\${escapeHtml(alert.dogId)}" data-care-type="\${escapeHtml(alert.careType)}"\`;
  }
  if (["view-medical-care", "view-vaccine-alert"].includes(alert.action)) {
    return \`data-action="\${escapeHtml(alert.action)}" data-dog-id="\${escapeHtml(alert.dogId)}"\`;
  }
  if (alert.action === "view-owner-update") {
    return \`data-action="view-owner-update" data-id="\${escapeHtml(alert.id)}" data-stay-id="\${escapeHtml(alert.stayId || "")}" data-request-code="\${escapeHtml(alert.requestCode || "")}"\`;
  }
  if (alert.action === "view-customer-cancellation") {
    return \`data-action="view-customer-cancellation" data-notification-id="\${escapeHtml(alert.notificationId || "")}" data-id="\${escapeHtml(alert.id || "")}" data-stay-id="\${escapeHtml(alert.stayId || "")}" data-request-code="\${escapeHtml(alert.requestCode || "")}"\`;
  }
  if (alert.action === "complete-stay-service") {
    return \`data-action="complete-stay-service" data-dog-id="\${escapeHtml(alert.dogId)}" data-stay-id="\${escapeHtml(alert.stayId)}" data-request-code="\${escapeHtml(alert.requestCode)}" data-task-id="\${escapeHtml(alert.taskId)}" data-task-key="\${escapeHtml(alert.taskKey || "")}"\`;
  }
  if (alert.type) {
    return \`data-action="view-alert" data-type="\${escapeHtml(alert.type)}" data-id="\${escapeHtml(alert.id)}"\`;
  }
  return "";
}

function dashboardAlertCardHtml(alert = {}) {
  const attrs = dashboardAlertActionAttrs(alert);
  const clickableClass = attrs ? "clickable-card " : "";
  const buttonLabel = dashboardAlertButtonLabel(alert);
  return \`<article class="record-card \${clickableClass}is-urgent" \${attrs}><span class="status-chip">\${escapeHtml(alert.category || "Alert")}</span>\${alert.html || ""}\${buttonLabel ? \`<div class="record-actions"><button type="button" class="secondary-button">\${escapeHtml(buttonLabel)}</button></div>\` : ""}</article>\`;
}

function customerCancellationAlertNotifications() {
  return readRecords("notificationLog")
    .filter((item) => !item.removed && item.eventName === "customerApprovedStayCancelled" && notificationVisibleToCurrentUser(item) && !notificationIsRead(item))
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
}

function dashboardAlertsForMetrics(metrics = dashboardMetrics()) {
  const alerts = [];
  customerCancellationAlertNotifications().forEach((notification) => {
    const source = notificationSourceSnapshot(notification);
    const reference = customerCancellationNotificationReference(notification);
    const reason = customerCancellationNotificationReason(notification);
    alerts.push({
      category: "Customer Cancellations",
      action: "view-customer-cancellation",
      notificationId: notification.id,
      id: notification.sourceId || source.id || "",
      stayId: reference.stayId,
      requestCode: reference.requestCode,
      html: \`<strong>Approved stay cancelled: \${escapeHtml(source.dogName || "Boarding dog")}</strong><p>\${escapeHtml([source.ownerName || source.ownerEmail || "Customer", reference.requestCode ? \`Stay ID: \${reference.requestCode}\` : ""].filter(Boolean).join(" | "))}</p>\${reason ? \`<p><strong>Reason:</strong> \${escapeHtml(reason)}</p>\` : ""}\`,
    });
  });
  metrics.exerciseDueDogs.forEach((dog) => {
    const careType = dashboardExerciseCategory(dog);
    alerts.push({ category: careType, action: "dashboard-quick-care", dogId: dog.id, careType, html: \`<strong>\${escapeHtml(careType)} due: \${escapeHtml(ownedDogDisplayName(dog))}</strong><p>\${escapeHtml(dog.exerciseRoutine || dog.exerciseNotes || \`Log \${careType.toLowerCase()} today.\`)}</p>\` });
  });
  metrics.trainingDueDogs.forEach((dog) => alerts.push({ category: "Training", action: "dashboard-quick-care", dogId: dog.id, careType: "Training", html: \`<strong>Training due: \${escapeHtml(ownedDogDisplayName(dog))}</strong><p>\${escapeHtml(dog.trainingRoutine || dog.trainingGoals || "Log a training session today.")}</p>\` }));
  metrics.ownedBathDueDogs.forEach((dog) => alerts.push({ category: "Baths", action: "dashboard-quick-care", dogId: dog.id, careType: "Bath", html: \`<strong>Bath due: \${escapeHtml(ownedDogDisplayName(dog))}</strong><p>Last bath: \${escapeHtml(dog.lastBath || "Not recorded")}</p>\` }));
  metrics.inHeatDogs.forEach((dog) => alerts.push({ category: "Heat", action: "dashboard-quick-care", dogId: dog.id, careType: "Heat Note", html: \`<strong>Female in heat: \${escapeHtml(ownedDogDisplayName(dog))}</strong><p>\${escapeHtml(ownedDogHeatStatus(dog).label)}</p>\` }));
  metrics.heatSoonDogs.forEach((dog) => alerts.push({ category: "Heat", action: "dashboard-quick-care", dogId: dog.id, careType: "Heat Note", html: \`<strong>Heat watch: \${escapeHtml(ownedDogDisplayName(dog))}</strong><p>\${escapeHtml(ownedDogHeatStatus(dog).label)}</p>\` }));
  metrics.medicalCareDogs.forEach((dog) => alerts.push({ category: "Medical/Care", action: "view-medical-care", dogId: dog.id, html: \`<strong>Care note: \${escapeHtml(ownedDogDisplayName(dog))}</strong><p>\${escapeHtml(dog.careStatus || dog.medicalNotes || dog.behaviorNotes || "Review care notes today.")}</p>\` }));
  metrics.urgentRequestRecords.forEach((item) => alerts.push({ category: "Requests", type: "request", id: item.id, html: \`<strong>Urgent request: \${escapeHtml(item.category)}</strong><p>\${escapeHtml(item.requestText || "")}</p>\${mediaLinkHtml(item)}\` }));
  metrics.urgentMaintenanceRecords.forEach((item) => alerts.push({ category: "Maintenance", type: "maintenance", id: item.id, html: \`<strong>Urgent maintenance: \${escapeHtml(item.location)}</strong><p>\${escapeHtml(item.issue || "")}</p>\${mediaLinkHtml(item)}\` }));
  metrics.vaccineIssueDogs.forEach((dog) => alerts.push({ category: "Vaccines", action: "view-vaccine-alert", dogId: dog.id, html: \`<strong>Vaccine warning: \${escapeHtml(dog.callName || dog.showName || "Dog")}</strong><p>DHPP date: \${escapeHtml(dog.dhppDate || "Not recorded")}</p>\` }));
  metrics.ownerUpdateDogs.forEach((dog) => {
    const stay = ownerUpdateStayForRecord(dog);
    const requestCode = stay?.id ? boardingStayRequestCode(dog, stay) : "";
    alerts.push({
      category: "Owner Updates",
      action: "view-owner-update",
      id: dog.id,
      stayId: stay?.id || "",
      requestCode,
      html: \`<strong>Owner update needed: \${escapeHtml(dog.dogName || "Boarding dog")}</strong><p>\${escapeHtml([dog.ownerName, dog.ownerPhone].filter(Boolean).join(" | "))}</p>\${ownerUpdateReasonHtml(dog, stay)}\`,
    });
  });
  metrics.boardingServiceDue.forEach((item) => alerts.push({ category: "Stay Services", action: "complete-stay-service", dogId: item.record.id, stayId: item.stay.id, requestCode: boardingStayRequestCode(item.record, item.stay), taskId: item.task.id, taskKey: item.taskKey || boardingServiceTaskKey(item.task), html: \`<strong>\${escapeHtml(item.dueInfo.label)}: \${escapeHtml(item.record.dogName || "Boarding dog")}</strong><p>\${escapeHtml(item.task.label || item.task.serviceName || "Requested service")} | Stay ID: \${escapeHtml(boardingStayRequestCode(item.record, item.stay))}</p>\` }));
  metrics.boardingBathDue.forEach((dogName) => alerts.push({ category: "Baths", html: \`<strong>Bath due before pickup today</strong><p>\${escapeHtml(dogName)}</p>\` }));
  return alerts;
}

function dashboardFilteredAlerts(alerts = [], filter = dashboardAlertFilter) {
  return filter === "All" ? alerts : alerts.filter((alert) => alert.category === filter);
}

function dashboardAlertsSummaryHtml(alerts = []) {
  if (!alerts.length) return "<p>No action items today.</p>";
  const plural = alerts.length === 1 ? "item" : "items";
  return \`<article class="record-card compact-record-card clickable-card" data-action="open-dashboard-alert-popup" data-alert-filter="All"><strong>\${alerts.length} action \${plural} today</strong><p>Tap a category above to review and complete that list in a popup.</p><div class="record-actions"><button type="button" class="secondary-button">Open All</button></div></article>\`;
}

function dashboardAlertPopupHtml(filter = "All", alerts = dashboardAlertsForMetrics()) {
  const filteredAlerts = dashboardFilteredAlerts(alerts, filter);
  const plural = filteredAlerts.length === 1 ? "item" : "items";
  return \`<section class="popup-record-section dashboard-alert-popup" data-dashboard-alert-popup="\${escapeHtml(filter)}">
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(filter)} Action Items</strong>
      <p>\${filteredAlerts.length} \${plural} for \${escapeHtml($("#dashboardDate")?.value || todayDate())}. Use the buttons on each card to complete or open the related workflow.</p>
    </article>
    <div class="record-grid compact-record-grid">\${filteredAlerts.length ? filteredAlerts.map(dashboardAlertCardHtml).join("") : "<p>No items in this category right now.</p>"}</div>
  </section>\`;
}

function openDashboardAlertPopup(filter = "All") {
  dashboardAlertFilter = filter || "All";
  dashboardShowAllAlerts = false;
  const alerts = dashboardAlertsForMetrics(dashboardMetrics());
  renderDashboardAlertTabs(alerts);
  const dashboardAlerts = $("#dashboardAlerts");
  if (dashboardAlerts) dashboardAlerts.innerHTML = dashboardAlertsSummaryHtml(alerts);
  showDetailDialog(\`\${dashboardAlertFilter} Action Items\`, dashboardAlertPopupHtml(dashboardAlertFilter, alerts));
}

function alertManagedUsers() {
  return settingsUsers().filter((user) => ["admin", "helper"].includes(user.role));
}

function customerAlertUsers() {
  return settingsUsers().filter((user) => user.role === "customer");
}

function schedulePublishedAudienceEmails() {
  return settingsUsers()
    .filter((user) => !user.removed && ["admin", "helper"].includes(user.role) && user.email)
    .map((user) => user.email);
}

function notificationPreferences() {
  return readRecords("notificationPreference").filter((record) => !record.removed);
}

function alertPreferenceForEmail(email = "") {
  const normalized = normalizeEmail(email);
  return notificationPreferences().find((record) => normalizeEmail(record.userEmail || record.email) === normalized);
}

function defaultAlertTypesForUser(user = {}) {
  if (user.role === "admin") return [...adminDefaultAlertTypes];
  if (user.role === "helper") return [...staffDefaultAlertTypes];
  return [];
}

function alertTypesForUser(user = {}) {
  const preference = alertPreferenceForEmail(user.email);
  if (Array.isArray(preference?.alertTypes)) return preference.alertTypes.filter(Boolean);
  return defaultAlertTypesForUser(user);
}

function userReceivesAlertType(user = {}, eventName = "") {
  return alertTypesForUser(user).includes(eventName);
}

function alertTypeLabel(key = "") {
  return alertTypeDefinitions.find((item) => item.key === key)?.label || key;
}

function renderSettingsAlertPreferences() {
  const list = $("#settingsAlertPreferenceList");
  if (!list) return;
  const users = alertManagedUsers().sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), undefined, { sensitivity: "base" }));
  list.innerHTML = users.length
    ? users.map((user) => {
      const alertTypes = alertTypesForUser(user);
      const labels = alertTypes.map(alertTypeLabel);
      return \`<article class="record-card compact-record-card alert-preference-card">
        <strong>\${escapeHtml(user.name || user.email || "Staff member")}</strong>
        <span>\${escapeHtml(user.email || "")} | \${escapeHtml(roleLabel(user.role))}</span>
        <p>\${labels.length ? escapeHtml(labels.join(", ")) : "No alerts selected."}</p>
      </article>\`;
    }).join("")
    : \`<article class="record-card compact-record-card"><strong>No staff users saved yet</strong><p>Add staff in Settings > Users before customizing alerts.</p></article>\`;
}

function renderSettingsAlerts() {
  renderSettingsAlertPreferences();
}

function urgentAlertEventName(target = "staff") {
  return target === "customer" ? "urgentCustomerAlertSent" : "urgentStaffAlertSent";
}

function urgentAlertAudienceUsers(target = "staff") {
  return target === "customer"
    ? customerAlertUsers()
    : alertManagedUsers().filter((user) => userReceivesAlertType(user, "urgentStaffAlertSent"));
}

function urgentAlertTargetLabel(target = "staff") {
  return target === "customer" ? "Customer" : "Staff";
}

function notificationRecordsForEvent(eventName = "") {
  return readRecords("notificationLog")
    .filter((record) => !record.removed && record.eventName === eventName)
    .sort((a, b) => new Date(b.submittedAt || b.updatedAt || 0) - new Date(a.submittedAt || a.updatedAt || 0));
}

function alertHistoryHtml(target = "staff") {
  const records = notificationRecordsForEvent(urgentAlertEventName(target)).slice(0, 25);
  return records.length
    ? \`<div class="record-grid alert-history-list">\${records.map((record) => \`<article class="record-card compact-record-card">
      <strong>\${escapeHtml(notificationDisplayTitle(record))}</strong>
      <span>\${escapeHtml(formatDateTime(record.submittedAt || record.updatedAt))} | \${escapeHtml((record.audienceEmails || []).length)} recipient\${(record.audienceEmails || []).length === 1 ? "" : "s"} | \${escapeHtml(record.deliveryStatus || "queued")}</span>
      <p>\${multilineHtml(notificationDisplayMessage(record))}</p>
    </article>\`).join("")}</div>\`
    : \`<article class="record-card compact-record-card"><strong>No \${escapeHtml(urgentAlertTargetLabel(target).toLowerCase())} urgent alerts sent yet</strong><p>Sent alerts will show here for review.</p></article>\`;
}

function urgentAlertPopupHtml(target = "staff") {
  const label = urgentAlertTargetLabel(target);
  const recipients = urgentAlertAudienceUsers(target);
  const recipientText = recipients.length
    ? recipients.map((user) => user.name || user.email).filter(Boolean).join(", ")
    : target === "customer"
      ? "No customer users found."
      : "No staff/admin users are enabled for urgent staff alerts.";
  return \`<div class="profile-tabs alert-popup-tabs" role="tablist" aria-label="\${escapeHtml(label)} alert tabs">
      <button type="button" class="secondary-button is-active" data-alert-popup-tab="compose" aria-selected="true">Alert Tab</button>
      <button type="button" class="secondary-button" data-alert-popup-tab="history" aria-selected="false">Alert History</button>
    </div>
    <form id="urgentAlertForm" class="tracker-form" data-alert-target="\${escapeHtml(target)}" data-alert-panel="compose">
      <section class="alert-popup-panel" data-alert-panel="compose">
        <article class="record-card compact-record-card"><strong>Recipients</strong><p>\${escapeHtml(recipientText)}</p></article>
        \${recipients.length ? \`<section class="alert-checkbox-group"><h3>Send To</h3>\${recipients.map((user) => {
          const email = user.email || "";
          const label = user.name || email || "Recipient";
          const detail = user.name && email ? \` <small>\${escapeHtml(email)}</small>\` : "";
          return \`<label class="inline-check"><input type="checkbox" name="alertRecipientEmails" value="\${escapeHtml(email)}" checked /> \${escapeHtml(label)}\${detail}</label>\`;
        }).join("")}</section>\` : ""}
        <label>\${escapeHtml(label)} alert message<textarea name="message" rows="5" required placeholder="Type the urgent alert message here"></textarea></label>
        <div class="button-row"><button type="submit" \${recipients.length ? "" : "disabled"}>Send Alert</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
      </section>
      <section class="alert-popup-panel" data-alert-panel="history" hidden>
        \${alertHistoryHtml(target)}
      </section>
    </form>\`;
}

function openUrgentAlertPopup(target = "staff") {
  showDetailDialog(\`Urgent \${urgentAlertTargetLabel(target)} Alert\`, urgentAlertPopupHtml(target));
}

async function sendUrgentAlertFromForm(formEl) {
  if (currentRole() !== "admin") return null;
  if (!validateForm(formEl)) return null;
  const target = formEl.dataset.alertTarget || "staff";
  const eventName = urgentAlertEventName(target);
  const selectedEmails = [...formEl.querySelectorAll('input[name="alertRecipientEmails"]:checked')]
    .map((input) => normalizeEmail(input.value))
    .filter(Boolean);
  const recipients = urgentAlertAudienceUsers(target)
    .filter((user) => selectedEmails.includes(normalizeEmail(user.email)));
  if (!recipients.length) {
    showToast("Choose at least one recipient for this alert.");
    return null;
  }
  const message = formEl.elements.message.value.trim();
  const sourceRecord = {
    type: "alertBroadcast",
    id: uid("alertBroadcast"),
    submittedAt: new Date().toISOString(),
    submittedBy: currentUser?.name || helperName?.value || "Admin",
    submittedByEmail: currentUser?.email || helperEmail?.value || "",
    alertTarget: target,
    message,
    audienceEmails: recipients.map((user) => user.email).filter(Boolean),
  };
  if (supabaseClient && !localTestMode) {
    try {
      await sendPayload(sourceRecord);
    } catch (error) {
      showToast(\`Alert source could not be saved: \${error.message}\`);
      return null;
    }
  }
  const notification = await notifyIfNeeded(sourceRecord, eventName);
  await addAuditLog(\`Sent urgent \${target} alert\`, "notificationLog", notification || sourceRecord, \`\${recipients.length} recipient\${recipients.length === 1 ? "" : "s"}\`);
  renderSettingsAlerts();
  renderNotifications();
  return notification;
}

function urgentAlertResultDialog(notification = {}) {
  const count = (notification.audienceEmails || []).length;
  const recipientText = \`\${count} recipient\${count === 1 ? "" : "s"}\`;
  const status = notification.deliveryStatus || "queued";
  const emailReason = notification.emailResult?.reason || notification.deliveryError || "";
  if (status === "sent") {
    showDetailDialog("Alert Sent", \`<p>The urgent alert email was sent to \${escapeHtml(recipientText)}.</p>\`);
    return;
  }
  if (status === "sms sent; email skipped") {
    showDetailDialog("Email Skipped", \`<p>The alert was saved and SMS was sent, but email was skipped for \${escapeHtml(recipientText)}.</p>\${emailReason ? \`<p>\${escapeHtml(emailReason)}</p>\` : ""}\`);
    return;
  }
  if (status === "skipped") {
    showDetailDialog("Email Not Sent", \`<p>The alert was saved in-app, but no email was sent to \${escapeHtml(recipientText)}.</p>\${emailReason ? \`<p>\${escapeHtml(emailReason)}</p>\` : ""}\`);
    return;
  }
  showDetailDialog("Alert Saved In App", \`<p>The alert was saved for \${escapeHtml(recipientText)}, but external delivery did not complete.</p>\${emailReason ? \`<p>\${escapeHtml(emailReason)}</p>\` : ""}\`);
}

function alertPreferencePopupHtml(selectedEmail = "") {
  const users = alertManagedUsers().sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), undefined, { sensitivity: "base" }));
  const selectedUser = users.find((user) => normalizeEmail(user.email) === normalizeEmail(selectedEmail)) || users[0] || {};
  const selectedTypes = new Set(alertTypesForUser(selectedUser));
  const options = users.map((user) => \`<option value="\${escapeHtml(user.email || "")}" \${normalizeEmail(user.email) === normalizeEmail(selectedUser.email) ? "selected" : ""}>\${escapeHtml(user.name || user.email || "Staff member")} (\${escapeHtml(roleLabel(user.role))})</option>\`).join("");
  const groups = [...new Set(alertTypeDefinitions.map((item) => item.group))];
  return \`<form id="alertPreferenceForm" class="tracker-form" data-user-email="\${escapeHtml(selectedUser.email || "")}">
    \${users.length ? \`<label>Staff member<select name="userEmail" id="alertPreferenceUserSelect" required>\${options}</select></label>
    <div class="alert-checkbox-grid">
      \${groups.map((group) => \`<section class="alert-checkbox-group"><h3>\${escapeHtml(group)}</h3>\${alertTypeDefinitions.filter((item) => item.group === group).map((item) => \`<label class="inline-check"><input type="checkbox" name="alertTypes" value="\${escapeHtml(item.key)}" \${selectedTypes.has(item.key) ? "checked" : ""} /> \${escapeHtml(item.label)}</label>\`).join("")}</section>\`).join("")}
    </div>
    <div class="button-row"><button type="submit">Update Alert</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>\` : \`<article class="record-card compact-record-card"><strong>No staff users saved yet</strong><p>Add staff or admin users before customizing alerts.</p></article><div class="button-row"><button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>\`}
  </form>\`;
}

function openAlertPreferencePopup(selectedEmail = "") {
  showDetailDialog("Customize Alerts", alertPreferencePopupHtml(selectedEmail));
}

async function saveAlertPreferenceFromForm(formEl) {
  if (currentRole() !== "admin") return null;
  if (!validateForm(formEl)) return null;
  const user = alertManagedUsers().find((item) => normalizeEmail(item.email) === normalizeEmail(formEl.elements.userEmail.value));
  if (!user) {
    showToast("Choose a staff member before saving alert preferences.");
    return null;
  }
  const alertTypes = [...formEl.querySelectorAll('input[name="alertTypes"]:checked')].map((input) => input.value).filter(Boolean);
  const existing = alertPreferenceForEmail(user.email);
  const now = new Date().toISOString();
  const record = upsertRecord("notificationPreference", {
    ...(existing || {}),
    type: "notificationPreference",
    id: existing?.id || uid("notificationPreference"),
    submittedAt: existing?.submittedAt || now,
    updatedAt: now,
    userEmail: user.email,
    userName: user.name || "",
    userRole: user.role,
    alertTypes,
    updatedBy: currentUser?.name || helperName?.value || "Admin",
    removed: false,
  });
  await sendPayload(record);
  await addAuditLog("Updated alert preferences", "notificationPreference", record, \`\${user.name || user.email} | \${alertTypes.length} alert types\`);
  renderSettingsAlerts();
  return record;
}

async function adminSendPasswordResetEmail(formEl = activeSettingsUserForm(), button = $("#adminSendPasswordResetButton")) {
  if (!formEl) {
    showToast("Open a user before sending a reset email.");
    return;
  }
  if (currentRole() !== "admin") {
    showToast("Admin access required.");
    return;
  }
  if (!supabaseClient) {
    showDetailDialog("Supabase Required", "<p>Password reset emails require Supabase Auth.</p>");
    return;
  }
  const data = settingsFormProfileData(formEl);
  const email = data.email?.trim().toLowerCase();
  if (!email) {
    setFieldError(formEl.elements.email, "Enter the user's email first.");
    showToast("Enter the user email first.");
    return;
  }
  setSubmitState(button, true, "Sending...");
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
  setSubmitState(button, false);
  if (error) {
    showDetailDialog("Reset Email Not Sent", \`<p>\${escapeHtml(error.message)}</p>\`);
    return;
  }
  await saveSettingsUserProfile({ passwordResetSentAt: new Date().toISOString(), passwordResetSentBy: currentUser.email }, formEl);
  showDetailDialog("Reset Email Sent", \`<p>A Supabase password reset email was sent to \${escapeHtml(email)}.</p>\`);
}

function currentUserNotificationKey() {
  return normalizeEmail(currentUser?.email || helperEmail?.value || currentUser?.name || helperName?.value || "unknown");
}

function notificationVisibleToCurrentUser(notification = {}) {
  if (!currentUser) return false;
  const audienceEmails = (notification.audienceEmails || []).map(normalizeEmail);
  const userEmail = normalizeEmail(currentUser.email || helperEmail.value);
  if (audienceEmails.length) return audienceEmails.includes(userEmail);
  return currentRole() === "admin";
}

function notificationIsRead(notification = {}) {
  const key = currentUserNotificationKey();
  if (!key) return false;
  if ((notification.readBy || []).includes(key)) return true;
  return readRecords("notificationRead").some((item) => item.notificationId === notification.id && item.readerKey === key);
}

function notificationSourceSnapshot(notification = {}) {
  const snapshot = notification.sourceSnapshot;
  if (snapshot && typeof snapshot === "object") return snapshot;
  if (typeof snapshot === "string") {
    try {
      const parsed = JSON.parse(snapshot);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  return {};
}

function notificationEventDisplayLabel(eventName = "") {
  const configured = alertTypeLabel(eventName);
  if (configured && configured !== eventName) return configured;
  const words = String(eventName || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Snuggle Stay alert";
}

function notificationSavedTitleIsSpecific(title = "") {
  const normalized = String(title || "").trim().toLowerCase();
  if (!normalized) return false;
  return !["notification", "snuggle stay alert", "alert"].includes(normalized);
}

function notificationSavedMessageIsSpecific(message = "") {
  const normalized = String(message || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes("needs review") && normalized.includes("open the related kennel record")) return false;
  return ![
    "notification",
    "snuggle stay alert",
    "open this alert to review the related kennel record.",
    "open this alert to review the related kennel record",
  ].includes(normalized);
}

function notificationStayIdText(source = {}) {
  const stay = boardingPrimaryStay(source) || {};
  return source.latestCustomerCancellation?.requestCode
    || source.latestCustomerRequestStatus?.requestCode
    || source.latestCustomerRequestStatus?.stayId
    || source.latestCustomerUpdate?.requestCode
    || source.latestServiceReadyForPickup?.requestCode
    || source.requestCode
    || stay.requestCode
    || (stay.id ? boardingStayRequestCode(source, stay) : "");
}

function customerCancellationNotificationReference(notification = {}) {
  const source = notificationSourceSnapshot(notification);
  const latest = source.latestCustomerCancellation || {};
  return {
    stayId: latest.stayId || source.stayId || "",
    requestCode: latest.requestCode || source.requestCode || notificationStayIdText(source) || "",
  };
}

function customerCancellationNotificationReason(notification = {}) {
  const source = notificationSourceSnapshot(notification);
  const latest = source.latestCustomerCancellation || {};
  return latest.reason || source.customerCancellationReason || source.cancellationReason || "";
}

function boardingRequestAlertCandidates() {
  return readRecords("boardingDog")
    .filter((record) => !record.removed && (record.customerRequest || arrayValue(record.stays).some((stay) => stay?.source === "customer-request")))
    .flatMap((record) => {
      const displayRecord = boardingDogRecordForDisplay(record.id) || boardingDogWithStayStatus(record);
      const stays = arrayValue(displayRecord.stays).length ? arrayValue(displayRecord.stays) : [boardingPrimaryStay(displayRecord) || {}];
      return stays
        .filter((stay) => stay && typeof stay === "object")
        .map((stay) => ({ record: displayRecord, stay }));
    })
    .filter(({ record, stay }) => {
      const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
      return ["Pending", "Approved"].includes(status);
    });
}

function boardingRequestAlertTimeDelta(notification = {}, record = {}, stay = {}) {
  const target = Date.parse(notification.submittedAt || notification.sentAt || notification.updatedAt || notification.createdAt || "");
  if (!Number.isFinite(target)) return Number.POSITIVE_INFINITY;
  const timestamps = [
    record.submittedAt,
    record.updatedAt,
    stay.createdAt,
    stay.updatedAt,
  ]
    .map((value) => Date.parse(value || ""))
    .filter(Number.isFinite);
  if (!timestamps.length) return Number.POSITIVE_INFINITY;
  return Math.min(...timestamps.map((value) => Math.abs(value - target)));
}

function recoveredBoardingRequestNotification(notification = {}) {
  if (notification.eventName || notification.sourceType || notification.sourceId) return null;
  if (Object.keys(notificationSourceSnapshot(notification)).length) return null;
  const candidates = boardingRequestAlertCandidates()
    .map((entry) => ({ ...entry, delta: boardingRequestAlertTimeDelta(notification, entry.record, entry.stay) }))
    .filter((entry) => entry.delta <= 5 * 60 * 1000)
    .sort((a, b) => a.delta - b.delta);
  return candidates[0] || null;
}

function boardingRequestAlertTitle(record = {}) {
  return \`Boarding request needs approval: \${record.dogName || "Customer dog"}\`;
}

function boardingRequestAlertMessage(record = {}, stay = {}, eventName = "customerBoardingRequestCreated") {
  const owner = record.ownerName || record.ownerEmail || record.customerEmail || "A customer";
  const action = eventName === "customerBoardingRequestUpdated" ? "updated" : "submitted";
  const schedule = stay?.id ? boardingScheduleText(record, stay) : boardingScheduleText(record);
  return \`\${owner} \${action} a boarding request\${record.dogName ? \` for \${record.dogName}\` : ""}\${schedule ? \` for \${schedule}\` : ""}. Open this alert to approve or decline the request.\`;
}

function notificationSourceTypeLabel(sourceType = "") {
  const normalized = String(sourceType || "").trim();
  const lower = normalized.toLowerCase();
  if (!lower) return "";
  if (lower === "boardingdog") return "Boarding dog";
  if (lower === "owneddog") return "Our dog";
  if (lower === "customerdog") return "Customer dog";
  if (lower === "dailywork" || lower === "dailyreport") return "Daily report";
  if (lower === "dailytask") return "Daily task";
  if (lower === "carelog" || lower === "structuredcarelog") return "Care log";
  if (lower === "request") return "Kennel request";
  if (lower === "maintenance") return "Maintenance";
  if (lower === "timesheet") return "Timesheet";
  if (lower === "schedule") return "Schedule";
  if (lower === "customerupdate") return "Customer update";
  return notificationEventDisplayLabel(normalized);
}

function notificationRecordDescriptor(notification = {}, source = {}) {
  const dogName = source.dogName || source.latestCustomerUpdate?.dogName || source.dog?.dogName || "";
  const owner = source.ownerName || source.ownerEmail || source.customerEmail || source.linkedOwnerEmail || "";
  const location = source.location || source.kennelLocation || source.kennel || source.building || "";
  const category = source.category || source.careType || source.taskText || source.issueType || "";
  const staff = source.staffName || source.helperName || source.completedBy || "";
  const status = source.status || source.boardingStatus || "";
  const stayId = notificationStayIdText(source);
  const sourceId = notification.sourceId || source.id || "";
  const pieces = [dogName, owner, location, category, staff, status, stayId ? \`Stay ID: \${stayId}\` : ""]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);
  if (!pieces.length && sourceId) pieces.push(\`Record \${sourceId}\`);
  return pieces.slice(0, 4).join(" | ");
}

function notificationFallbackMessage(notification = {}, source = {}) {
  const sourceLabel = notificationSourceTypeLabel(notification.sourceType);
  const descriptor = notificationRecordDescriptor(notification, source);
  const eventLabel = notification.eventName ? notificationEventDisplayLabel(notification.eventName) : "";
  const timestamp = notification.submittedAt || notification.updatedAt || notification.createdAt || source.submittedAt || source.updatedAt || source.createdAt || "";
  const when = timestamp ? formatDateTime(timestamp) : "";
  const sourceId = notification.sourceId || source.id || "";
  const subject = [sourceLabel || eventLabel || "Kennel alert", descriptor].filter(Boolean).join(": ");
  const details = [when ? \`Created \${when}\` : "", sourceId ? \`Source ID: \${sourceId}\` : ""].filter(Boolean).join(" | ");
  return \`\${subject} needs review.\${details ? \` \${details}.\` : ""} Open the related kennel record and complete the required follow-up.\`;
}

function notificationDisplayTitle(notification = {}) {
  const savedTitle = String(notification.title || "").trim();
  const recoveredRequest = recoveredBoardingRequestNotification(notification);
  if (recoveredRequest) return boardingRequestAlertTitle(recoveredRequest.record);
  const source = notificationSourceSnapshot(notification);
  const dogName = source.dogName || source.latestCustomerUpdate?.dogName || "";
  const eventName = notification.eventName || "";
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    if (!/needs approval/i.test(savedTitle)) return boardingRequestAlertTitle(source);
  }
  if (notificationSavedTitleIsSpecific(savedTitle)) return savedTitle;
  if (eventName === "customerDogFileUploaded") return \`Customer file uploaded: \${dogName || "Customer dog"}\`;
  if (eventName === "careLogAdminAlertCreated") return \`Medical/behavior alert: \${source.dogName || "Our dog"}\`;
  if (eventName === "kennelRequestCreated") return \`New request: \${source.category || "Kennel request"}\`;
  if (eventName === "maintenanceCreated") return \`New maintenance: \${source.location || "Kennel"}\`;
  if (eventName === "urgentKennelRequestCreated") return \`Urgent request: \${source.category || "Kennel request"}\`;
  if (eventName === "urgentMaintenanceCreated") return \`Urgent maintenance: \${source.location || "Kennel"}\`;
  if (eventName === "timeOffRequested") return \`Time off request: \${source.staffName || "Staff"}\`;
  if (eventName === "timeOffReviewed") return \`Time off \${String(source.status || "reviewed").toLowerCase()}: \${dateRangeText(source.startDate, source.endDate)}\`;
  if (eventName === "schedulePublished") return "Kennel schedule published";
  if (eventName === "scheduleChangedAfterPublish") return \`Schedule changed: \${source.staffName || "Staff"}\`;
  if (eventName === "urgentStaffAlertSent") return "Urgent staff alert";
  if (eventName === "urgentCustomerAlertSent") return "Urgent customer alert";
  if (eventName === "customerStayUpdateSent") return \`Stay update: \${dogName || "Customer dog"}\`;
  if (eventName === "boardingCustomerRequestApproved") return \`Boarding/service request approved: \${dogName || "Customer dog"}\`;
  if (eventName === "boardingCustomerRequestDeclined") return \`Boarding/service request declined: \${dogName || "Customer dog"}\`;
  if (eventName === "boardingCustomerRequestCancelled") return \`Boarding/service request cancelled: \${dogName || "Customer dog"}\`;
  if (eventName === "boardingCustomerRequestUpdatedByStaff") return \`Boarding/service request updated: \${dogName || "Customer dog"}\`;
  if (notification.sourceType === "boardingDog") return \`Boarding dog alert: \${notificationRecordDescriptor(notification, source) || dogName || "Dog"}\`;
  if (notification.sourceType === "request") return \`Request alert: \${source.category || "Kennel request"}\`;
  if (notification.sourceType === "maintenance") return \`Maintenance alert: \${source.location || "Kennel"}\`;
  const sourceLabel = notificationSourceTypeLabel(notification.sourceType);
  const descriptor = notificationRecordDescriptor(notification, source);
  if (sourceLabel && descriptor) return \`\${sourceLabel}: \${descriptor}\`;
  if (descriptor) return \`Snuggle Stay alert: \${descriptor}\`;
  if (sourceLabel) return \`\${sourceLabel} alert\`;
  return notificationEventDisplayLabel(eventName || notification.sourceType || "Snuggle Stay alert");
}

function notificationDisplayMessage(notification = {}) {
  const savedMessage = String(notification.message || "").trim();
  const recoveredRequest = recoveredBoardingRequestNotification(notification);
  if (recoveredRequest) return boardingRequestAlertMessage(recoveredRequest.record, recoveredRequest.stay, "customerBoardingRequestCreated");
  const source = notificationSourceSnapshot(notification);
  const eventName = notification.eventName || "";
  const dogName = source.dogName || source.latestCustomerUpdate?.dogName || "";
  const owner = source.ownerName || source.ownerEmail || source.customerEmail || "A customer";
  const stayId = notificationStayIdText(source);
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    if (!/approve|decline/i.test(savedMessage)) return boardingRequestAlertMessage(source, boardingPrimaryStay(source) || {}, eventName);
  }
  if (notificationSavedMessageIsSpecific(savedMessage)) return savedMessage;
  if (eventName === "customerApprovedStayCancelled") {
    const reason = source.latestCustomerCancellation?.reason || source.customerCancellationReason || "";
    return \`\${owner} cancelled an approved stay\${dogName ? \` for \${dogName}\` : ""}\${stayId ? \` (Stay ID: \${stayId})\` : ""}.\${reason ? \` Reason: \${reason}\` : ""}\`;
  }
  if (eventName === "customerDogFileUploaded") return \`\${owner} uploaded a file\${dogName ? \` for \${dogName}\` : ""}.\`;
  if (eventName === "careLogAdminAlertCreated") return source.note || "A medical/behavior note needs admin attention.";
  if (eventName === "kennelRequestCreated") return source.requestText || "A staff kennel request was submitted.";
  if (eventName === "maintenanceCreated") return source.issue || "A maintenance item was submitted.";
  if (eventName === "urgentKennelRequestCreated") return source.requestText || "An urgent kennel request was submitted.";
  if (eventName === "urgentMaintenanceCreated") return source.issue || "An urgent maintenance item was submitted.";
  if (eventName === "timeOffRequested") return \`\${source.staffName || "Staff"} requested \${dateRangeText(source.startDate, source.endDate)} off.\`;
  if (eventName === "timeOffReviewed") return \`\${source.reviewedBy || "Admin"} marked your time off request \${source.status || "reviewed"}.\`;
  if (eventName === "schedulePublished") return \`The schedule for \${dateRangeText(source.weekStart, addDays(source.weekStart, 6))} has been published.\`;
  if (eventName === "scheduleChangedAfterPublish") return \`\${source.staffName || "A staff member"} has a schedule change on \${source.date || "the published schedule"}.\`;
  if (eventName === "urgentStaffAlertSent" || eventName === "urgentCustomerAlertSent") return source.message || "An urgent alert was sent.";
  if (eventName === "customerStayUpdateSent") {
    const update = source.latestCustomerUpdate || {};
    const text = update.note || source.dailyActivity || "";
    return \`\${update.byName || "Kennel staff"} sent an update for \${dogName || "your dog"}\${stayId ? \` (Stay ID: \${stayId})\` : ""}.\${text ? \` \${text}\` : ""}\`;
  }
  if (eventName === "boardingCustomerRequestApproved") return customerRequestStatusNotificationMessage(source, "approved");
  if (eventName === "boardingCustomerRequestDeclined") return customerRequestStatusNotificationMessage(source, "declined", boardingDeclineNoteFor(source, boardingPrimaryStay(source) || {})?.note || "");
  if (eventName === "boardingCustomerRequestCancelled") return customerRequestStatusNotificationMessage(source, "cancelled", boardingDeclineNoteFor(source, boardingPrimaryStay(source) || {})?.note || "");
  if (eventName === "boardingCustomerRequestUpdatedByStaff") return customerRequestStatusNotificationMessage(source, "updated");
  if (eventName === "serviceRequestReadyForPickup") {
    const ready = source.latestServiceReadyForPickup || {};
    return \`\${dogName || ready.dogName || "Your dog"} is ready for pickup\${stayId ? \` (Stay ID: \${stayId})\` : ""}.\`;
  }
  if (notificationSavedMessageIsSpecific(source.message)) return source.message;
  if (notification.sourceType === "boardingDog") {
    const stayId = notificationStayIdText(source);
    const status = source.boardingStatus || boardingDisplayStatus(source) || source.status || "Review needed";
    const ownerText = owner && owner !== "A customer" ? \` for \${owner}\` : "";
    return \`\${dogName || "Boarding dog"}\${ownerText} needs review\${stayId ? \` for Stay ID: \${stayId}\` : ""}. Current status: \${status}.\`;
  }
  if (source.requestText) return source.requestText;
  if (source.issue) return source.issue;
  if (source.note) return source.note;
  return notificationFallbackMessage(notification, source);
}

function notificationChannelsText(notification = {}) {
  const labels = arrayValue(notification.channels)
    .map((channel) => {
      const normalized = String(channel || "").trim();
      if (/^inapp$/i.test(normalized)) return "in-app";
      if (/^sms$/i.test(normalized)) return "SMS";
      if (/^email$/i.test(normalized)) return "email";
      return normalized;
    })
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "in-app";
}

function notificationCategoryForEvent(eventName = "", recordOrNotification = {}) {
  const source = recordOrNotification.sourceSnapshot ? notificationSourceSnapshot(recordOrNotification) : recordOrNotification;
  const name = String(eventName || recordOrNotification.eventName || "").toLowerCase();
  const sourceType = String(recordOrNotification.sourceType || source.type || "").toLowerCase();
  if (!name && recoveredBoardingRequestNotification(recordOrNotification)) return "Boarding";
  if (name.includes("boarding") || name.includes("stay") || sourceType === "boardingdog") return "Boarding";
  if (name.includes("carelog") || name.includes("medical") || sourceType === "carelog") return "Medical/Care";
  if (name.includes("maintenance") || sourceType === "maintenance") return "Maintenance";
  if (name.includes("request") || sourceType === "request") return "Requests";
  if (name.includes("schedule") || name.includes("timeoff") || sourceType === "timesheet") return "Staff";
  if (name.includes("customer")) return "Customer";
  return notificationSourceTypeLabel(sourceType || eventName) || "Alert";
}

function notificationReasonForEvent(eventName = "", recordOrNotification = {}) {
  const source = recordOrNotification.sourceSnapshot ? notificationSourceSnapshot(recordOrNotification) : recordOrNotification;
  const name = eventName || recordOrNotification.eventName || "";
  if (!name && recoveredBoardingRequestNotification(recordOrNotification)) return "Boarding request needs approval";
  if (name === "customerBoardingRequestCreated") return "Boarding request needs approval";
  if (name === "customerBoardingRequestUpdated") return "Boarding request updated";
  if (name === "customerApprovedStayCancelled") return "Approved stay cancelled";
  if (name === "customerDogFileUploaded") return "Customer file uploaded";
  if (name === "boardingCustomerRequestApproved") return "Request approved";
  if (name === "boardingCustomerRequestDeclined") return "Request declined";
  if (name === "boardingCustomerRequestCancelled") return "Request cancelled";
  if (name === "boardingCustomerRequestUpdatedByStaff") return "Request updated";
  if (name === "serviceRequestReadyForPickup") return "Service request ready for pickup";
  if (name === "careLogAdminAlertCreated") return "Medical/behavior note needs attention";
  if (name === "kennelRequestCreated" || name === "urgentKennelRequestCreated") return source.requestText || "Kennel request needs review";
  if (name === "maintenanceCreated" || name === "urgentMaintenanceCreated") return source.issue || "Maintenance item needs review";
  if (name === "customerStayUpdateSent") return "Owner update sent";
  if (name === "timeOffRequested") return "Time off review needed";
  return notificationEventDisplayLabel(name || source.type || "Alert");
}

function notificationActionLabel(eventName = "", recordOrNotification = {}) {
  const source = recordOrNotification.sourceSnapshot ? notificationSourceSnapshot(recordOrNotification) : recordOrNotification;
  const name = eventName || recordOrNotification.eventName || "";
  const sourceType = recordOrNotification.sourceType || source.type || "";
  if (name === "customerBoardingRequestCreated" || name === "customerBoardingRequestUpdated" || recoveredBoardingRequestNotification(recordOrNotification)) return "Review Request";
  if (name === "boardingCustomerRequestApproved" || name === "boardingCustomerRequestDeclined" || name === "boardingCustomerRequestCancelled" || name === "boardingCustomerRequestUpdatedByStaff") return "Open Request";
  if (name === "serviceRequestReadyForPickup") return "Open Request";
  if (name === "customerApprovedStayCancelled" || sourceType === "boardingDog") return "Open Stay";
  if (sourceType === "maintenance" || name.includes("Maintenance")) return "Open Maintenance";
  if (sourceType === "request" || name.includes("Request")) return "Open Request";
  if (sourceType === "careLog" || name === "careLogAdminAlertCreated") return "Open Care Note";
  if (sourceType === "timesheet" || name.includes("timeOff") || name.includes("schedule")) return "Open Staff Item";
  return "Open Alert";
}

function notificationActionTarget(eventName = "", record = {}) {
  const sourceType = record.type || record.sourceType || "";
  const stayId = notificationStayIdText(record);
  return {
    eventName,
    sourceType,
    sourceId: record.id || "",
    stayId,
    requestCode: stayId,
  };
}

function unreadNotificationCategorySummary(unread = []) {
  if (!unread.length) return "No unread alerts.";
  const counts = unread.reduce((summary, notification) => {
    const category = notification.alertCategory || notificationCategoryForEvent(notification.eventName, notification);
    summary[category] = (summary[category] || 0) + 1;
    return summary;
  }, {});
  return Object.entries(counts)
    .map(([category, count]) => String(count) + " " + category)
    .join(", ") + ".";
}

function customerStayUpdateAudienceEmails(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record) || {};
  return uniqueEmails(
    record.ownerEmail,
    record.customerEmail,
    record.linkedOwnerEmail,
    record.secondaryOwnerEmail,
    linkedDog.ownerEmail,
    linkedDog.customerEmail,
    linkedDog.linkedOwnerEmail,
    linkedDog.secondaryOwnerEmail,
  );
}

function customerRequestStatusStay(record = {}) {
  const latest = record.latestCustomerRequestStatus || {};
  return boardingStayByReference(record, {
    stayId: latest.stayId || "",
    requestCode: latest.requestCode || "",
  }) || boardingPrimaryStay(record) || {};
}

function customerRequestStatusTypeLabel(record = {}, stay = customerRequestStatusStay(record)) {
  return record.latestCustomerRequestStatus?.requestType
    || (isServiceRequestStay(record, stay) ? "service request" : "boarding request");
}

function customerRequestStatusNotificationTitle(record = {}, statusLabel = "updated") {
  const requestType = customerRequestStatusTypeLabel(record);
  return requestType.charAt(0).toUpperCase() + requestType.slice(1) + " " + statusLabel + ": " + (record.dogName || "Customer dog");
}

function customerRequestStatusNotificationMessage(record = {}, statusLabel = "updated", detail = "") {
  const stay = customerRequestStatusStay(record);
  const schedule = stay?.id ? stayScheduleRangeLabel(record, stay) : boardingScheduleText(record);
  const stayId = notificationStayIdText(record);
  const requestType = customerRequestStatusTypeLabel(record, stay);
  let message = "Your " + requestType + (record.dogName ? " for " + record.dogName : "") + " has been " + statusLabel + ".";
  if (schedule) message += " " + schedule + ".";
  if (stayId) message += " Stay ID: " + stayId + ".";
  if (detail) message += " " + detail;
  return message;
}

function serviceRequestReadyForPickupNotificationMessage(record = {}) {
  const stayId = notificationStayIdText(record);
  const ready = record.latestServiceReadyForPickup || {};
  const requestedTime = ready.requestedTime ? formatDateTime(ready.requestedTime) : "";
  return [
    \`\${record.dogName || ready.dogName || "Your dog"} is ready for pickup.\`,
    stayId ? \`Stay ID: \${stayId}.\` : "",
    requestedTime ? \`Requested time: \${requestedTime}.\` : "",
  ].filter(Boolean).join(" ");
}

function notificationEventConfig(eventName = "", record = {}) {
  const configs = {
    customerBoardingRequestCreated: {
      title: boardingRequestAlertTitle(record),
      message: boardingRequestAlertMessage(record, boardingPrimaryStay(record) || {}, "customerBoardingRequestCreated"),
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    customerBoardingRequestUpdated: {
      title: boardingRequestAlertTitle(record),
      message: boardingRequestAlertMessage(record, boardingPrimaryStay(record) || {}, "customerBoardingRequestUpdated"),
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    boardingCustomerRequestApproved: {
      title: customerRequestStatusNotificationTitle(record, "approved"),
      message: customerRequestStatusNotificationMessage(record, "approved", "You will receive updates from the kennel team as the stay gets closer."),
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: customerStayUpdateAudienceEmails(record),
    },
    boardingCustomerRequestDeclined: {
      title: customerRequestStatusNotificationTitle(record, "declined"),
      message: customerRequestStatusNotificationMessage(record, "declined", boardingDeclineNoteFor(record, boardingPrimaryStay(record) || {})?.note || "Please contact us if you have questions."),
      priority: "review",
      channels: ["email", "inApp"],
      audienceEmails: customerStayUpdateAudienceEmails(record),
    },
    boardingCustomerRequestCancelled: {
      title: customerRequestStatusNotificationTitle(record, "cancelled"),
      message: customerRequestStatusNotificationMessage(record, "cancelled", boardingDeclineNoteFor(record, boardingPrimaryStay(record) || {})?.note || "Please contact us if you have questions."),
      priority: "review",
      channels: ["email", "inApp"],
      audienceEmails: customerStayUpdateAudienceEmails(record),
    },
    boardingCustomerRequestUpdatedByStaff: {
      title: customerRequestStatusNotificationTitle(record, "updated"),
      message: customerRequestStatusNotificationMessage(record, "updated", "Open your request to review the latest details."),
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: customerStayUpdateAudienceEmails(record),
    },
    serviceRequestReadyForPickup: {
      title: \`Ready for pickup: \${record.dogName || record.latestServiceReadyForPickup?.dogName || "Customer dog"}\`,
      message: serviceRequestReadyForPickupNotificationMessage(record),
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: customerStayUpdateAudienceEmails(record),
    },
    customerApprovedStayCancelled: {
      title: \`Approved stay cancelled: \${record.dogName || "Customer dog"}\`,
      message: \`\${record.ownerName || record.ownerEmail || "A customer"} cancelled an approved stay\${notificationStayIdText(record) ? \` (Stay ID: \${notificationStayIdText(record)})\` : ""}.\${record.latestCustomerCancellation?.reason ? \` Reason: \${record.latestCustomerCancellation.reason}\` : ""}\`,
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin", "helper"],
    },
    customerDogFileUploaded: {
      title: \`Customer file uploaded: \${record.dogName || "Customer dog"}\`,
      message: \`\${record.ownerName || record.ownerEmail || record.customerEmail || "A customer"} uploaded a file\${record.dogName ? \` for \${record.dogName}\` : ""}.\`,
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    careLogAdminAlertCreated: {
      title: \`Medical/behavior alert: \${record.dogName || "Our dog"}\`,
      message: record.note || "A medical/behavior note needs admin attention.",
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    kennelRequestCreated: {
      title: \`New request: \${record.category || "Kennel request"}\`,
      message: record.requestText || "A staff kennel request was submitted.",
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    maintenanceCreated: {
      title: \`New maintenance: \${record.location || "Kennel"}\`,
      message: record.issue || "A maintenance item was submitted.",
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    urgentKennelRequestCreated: {
      title: \`Urgent request: \${record.category || "Kennel request"}\`,
      message: record.requestText || "An urgent kennel request was submitted.",
      priority: "urgent",
      channels: ["email", "sms", "inApp"],
      audienceRoles: ["admin"],
    },
    urgentMaintenanceCreated: {
      title: \`Urgent maintenance: \${record.location || "Kennel"}\`,
      message: record.issue || "An urgent maintenance item was submitted.",
      priority: "urgent",
      channels: ["email", "sms", "inApp"],
      audienceRoles: ["admin"],
    },
    timeOffRequested: {
      title: \`Time off request: \${record.staffName || "Staff"}\`,
      message: \`\${record.staffName || "Staff"} requested \${dateRangeText(record.startDate, record.endDate)} off.\`,
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    timeOffReviewed: {
      title: \`Time off \${String(record.status || "").toLowerCase()}: \${dateRangeText(record.startDate, record.endDate)}\`,
      message: \`\${record.reviewedBy || "Admin"} marked your time off request \${record.status || "reviewed"}.\`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: [record.staffEmail].filter(Boolean),
    },
    schedulePublished: {
      title: "Kennel schedule published",
      message: \`The schedule for \${dateRangeText(record.weekStart, addDays(record.weekStart, 6))} has been published.\`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["helper", "admin"],
      audienceEmails: schedulePublishedAudienceEmails(),
    },
    scheduleChangedAfterPublish: {
      title: \`Schedule changed: \${record.staffName || "Staff"}\`,
      message: \`\${record.staffName || "A staff member"} has a schedule change on \${record.date || "the published schedule"}.\`,
      priority: "review",
      channels: ["email", "inApp"],
      audienceEmails: [record.staffEmail].filter(Boolean),
      audienceRoles: ["admin"],
    },
    urgentStaffAlertSent: {
      title: "Urgent staff alert",
      message: record.message || "An urgent staff alert was sent.",
      priority: "urgent",
      channels: ["email", "sms", "inApp"],
      audienceEmails: record.audienceEmails || [],
    },
    urgentCustomerAlertSent: {
      title: "Urgent customer alert",
      message: record.message || "An urgent customer alert was sent.",
      priority: "urgent",
      channels: ["email", "inApp"],
      audienceEmails: record.audienceEmails || [],
    },
    customerStayUpdateSent: {
      title: \`Stay update: \${record.dogName || "Customer dog"}\`,
      message: \`\${record.latestCustomerUpdate?.byName || "Kennel staff"} sent an update for \${record.dogName || "your dog"}\${record.latestCustomerUpdate?.requestCode ? \` (Stay ID: \${record.latestCustomerUpdate.requestCode})\` : ""}.\`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: customerStayUpdateAudienceEmails(record),
    },
  };
  return configs[eventName] || null;
}

function notificationAudienceEmails(config = {}, eventName = "") {
  const emails = [...(config.audienceEmails || [])];
  const audienceRoles = config.audienceRoles || [];
  const roleUsers = settingsUsers().filter((user) => !user.removed && audienceRoles.includes(user.role));
  const hasSavedAdminUser = settingsUsers().some((user) => !user.removed && user.role === "admin" && user.email);
  if (eventName && (audienceRoles.includes("helper") || audienceRoles.includes("admin"))) {
    roleUsers
      .filter((user) => userReceivesAlertType(user, eventName))
      .forEach((user) => emails.push(user.email));
  } else if (audienceRoles.includes("helper") || audienceRoles.includes("admin")) {
    roleUsers.forEach((user) => emails.push(user.email));
  }
  if (audienceRoles.includes("admin") && !hasSavedAdminUser) emails.push(...getAdminEmails());
  if (audienceRoles.includes("customer")) {
    customerAlertUsers().forEach((user) => emails.push(user.email));
  }
  return [...new Set(emails.map(normalizeEmail).filter(Boolean))];
}

function createNotificationRecord(record = {}, eventName = "", config = {}) {
  const now = new Date().toISOString();
  const sourceType = record.type || "";
  const sourceId = record.id || uid("source");
  const sourceSnapshot = payloadForSheet(record);
  const dedupeKey = \`\${eventName}:\${sourceType}:\${sourceId}:\${record.updatedAt || record.submittedAt || now}\`;
  const existing = readRecords("notificationLog").find((item) => item.dedupeKey === dedupeKey && !item.removed);
  if (existing) return existing;
  const displaySeed = { eventName, sourceType, sourceId, sourceSnapshot, title: config.title, message: config.message };
  const stayId = notificationStayIdText(record);
  return upsertRecord("notificationLog", {
    type: "notificationLog",
    id: uid("notification"),
    submittedAt: now,
    eventName,
    dedupeKey,
    title: notificationDisplayTitle(displaySeed),
    message: notificationDisplayMessage(displaySeed),
    priority: config.priority || "normal",
    channels: config.channels || ["inApp"],
    audienceRoles: config.audienceRoles || [],
    audienceEmails: notificationAudienceEmails(config, eventName),
    alertCategory: notificationCategoryForEvent(eventName, record),
    alertReason: notificationReasonForEvent(eventName, record),
    dogName: record.dogName || record.latestCustomerUpdate?.dogName || record.latestCustomerCancellation?.dogName || "",
    ownerName: record.ownerName || record.ownerEmail || record.customerEmail || "",
    stayId,
    actionLabel: notificationActionLabel(eventName, { ...record, sourceType }),
    actionTarget: notificationActionTarget(eventName, { ...record, sourceType }),
    sourceType,
    sourceId,
    sourceSnapshot,
    readBy: [],
    deliveryStatus: "queued",
  });
}

function renderNotifications() {
  const button = $("#notificationBellButton");
  const badge = $("#notificationUnreadBadge");
  const panel = $("#notificationPanel");
  const list = $("#notificationList");
  const summary = $("#notificationPanelSummary");
  const readButton = $("#showReadNotificationsButton");
  if (!button || !badge || !panel || !list || !summary) return;
  const available = readRecords("notificationLog")
    .filter((item) => !item.removed && notificationVisibleToCurrentUser(item))
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
  const unread = available.filter((item) => !notificationIsRead(item));
  const read = available.filter((item) => notificationIsRead(item)).slice(0, MAX_READ_NOTIFICATIONS);
  visibleReadNotificationCount = Math.min(Math.max(visibleReadNotificationCount, 4), MAX_READ_NOTIFICATIONS);
  const notificationItemHtml = (item) => {
    const category = item.alertCategory || notificationCategoryForEvent(item.eventName, item);
    const reason = item.alertReason || notificationReasonForEvent(item.eventName, item);
    const stayId = item.stayId || notificationStayIdText(notificationSourceSnapshot(item));
    const actionLabel = item.actionLabel || notificationActionLabel(item.eventName, item);
    const meta = [category, reason, stayId ? "Stay ID: " + stayId : "", actionLabel].filter(Boolean).join(" | ");
    return \`<article class="notification-item \${notificationIsRead(item) ? "is-read" : ""} \${item.priority === "urgent" ? "is-urgent" : ""}" data-action="open-notification" data-id="\${escapeHtml(item.id)}"><strong>\${escapeHtml(notificationDisplayTitle(item))}</strong><p>\${escapeHtml(notificationDisplayMessage(item))}</p><span>\${escapeHtml(meta)}</span><span>\${escapeHtml(formatDateTime(item.submittedAt || item.updatedAt))} | \${escapeHtml(notificationChannelsText(item))}</span></article>\`;
  };
  button.hidden = !helperIsLoggedIn();
  const panelOpen = !panel.hidden;
  button.classList.toggle("is-alert-panel-open", panelOpen);
  if (button.firstChild) button.firstChild.nodeValue = panelOpen ? "Close Alert " : "Alerts ";
  badge.textContent = unread.length;
  badge.hidden = !unread.length;
  summary.textContent = unreadNotificationCategorySummary(unread);
  if (readButton) {
    readButton.hidden = !read.length;
    readButton.textContent = showReadNotifications ? "Hide Read" : \`Read\${read.length ? \` (\${read.length})\` : ""}\`;
  }
  const unreadHtml = unread.length
    ? unread.map(notificationItemHtml).join("")
    : "<p>No unread alerts.</p>";
  const visibleRead = read.slice(0, visibleReadNotificationCount);
  const readHtml = showReadNotifications
    ? \`<section class="notification-read-section"><h3>Read</h3>\${visibleRead.length ? visibleRead.map(notificationItemHtml).join("") : "<p>No read alerts yet.</p>"}\${read.length > visibleRead.length ? \`<button type="button" class="secondary-button notification-show-more" data-action="show-more-read-notifications">Show More</button>\` : ""}</section>\`
    : "";
  list.innerHTML = available.length ? \`\${unreadHtml}\${readHtml}\` : "<p>No notifications yet.</p>";
}

async function markNotificationRead(id = "") {
  const record = readRecords("notificationLog").find((item) => item.id === id);
  if (!record) return null;
  await saveNotificationReadReceipt(id);
  renderNotifications();
  return record;
}

async function markAllNotificationsRead() {
  const visible = readRecords("notificationLog").filter((item) => !item.removed && notificationVisibleToCurrentUser(item) && !notificationIsRead(item));
  await Promise.allSettled(visible.map((item) => saveNotificationReadReceipt(item.id)));
  renderNotifications();
}

async function saveNotificationReadReceipt(id = "") {
  const key = currentUserNotificationKey();
  if (!id || !key) return null;

  const fallbackReadByUpdate = async () => {
    const record = readRecords("notificationLog").find((item) => item.id === id);
    if (!record) return null;
    const readBy = [...new Set([...(record.readBy || []), key].filter(Boolean))];
    const updated = upsertRecord("notificationLog", { ...record, readBy });
    await sendPayload(updated);
    return updated;
  };

  if (localTestMode || !supabaseClient || !notificationReadSyncAvailable) return fallbackReadByUpdate();

  const row = {
    notification_id: id,
    reader_key: key,
    reader_email: normalizeEmail(currentUser?.email || helperEmail?.value || ""),
  };

  const { data, error } = await supabaseClient
    .from("notification_reads")
    .upsert(row, { onConflict: "notification_id,reader_key" })
    .select()
    .maybeSingle();

  if (error) {
    const message = String(error.message || "");
    if (/notification_reads|schema cache|relation .* does not exist/i.test(message)) {
      notificationReadSyncAvailable = false;
      return fallbackReadByUpdate();
    }
    throw error;
  }

  mergeNotificationReadRows([data || row], { replaceLocal: false });
  return readRecords("notificationLog").find((item) => item.id === id) || null;
}

function openOperationalNotificationRecord(sourceType = "", sourceId = "") {
  if (!["request", "maintenance"].includes(sourceType)) return false;
  const record = readRecords(sourceType).find((item) => item.id === sourceId);
  if (!record) return false;
  if (sourceType === "maintenance") {
    switchPage("maintenancePage");
    renderMaintenance();
  } else {
    switchPage("requestsPage");
    renderRequests();
  }
  showDetailDialog(titleForRecord(sourceType, record), detailForRecord(sourceType, record), { type: sourceType, id: record.id });
  return true;
}

function openCareLogNotificationRecord(sourceId = "") {
  const record = readRecords("careLog").find((item) => item.id === sourceId);
  if (!record) return false;
  if (record.date && form?.elements?.date) {
    form.elements.date.value = record.date;
    updateDayFromDate();
  }
  switchPage("dailyPage");
  renderDailyTaskLists();
  showDetailDialog(titleForRecord("careLog", record), detailForRecord("careLog", record), { type: "careLog", id: record.id });
  return true;
}

function openBoardingCustomerCancellationAlert(notification = {}) {
  const source = notificationSourceSnapshot(notification);
  const sourceId = notification.sourceId || source.id || "";
  const record = boardingDogRecordForDisplay(sourceId) || readRecords("boardingDog").find((item) => item.id === sourceId && !item.removed);
  const reference = customerCancellationNotificationReference(notification);
  if (!record) {
    showDetailDialog(notificationDisplayTitle(notification), \`<p>\${escapeHtml(notificationDisplayMessage(notification))}</p>\`);
    return false;
  }
  const stay = boardingStayByReference(record, reference) || boardingPrimaryStay(record) || {};
  switchPage("boardingDogsPage");
  showDetailDialog(
    \`Cancelled Stay: \${record.dogName || "Boarding dog"}\`,
    boardingDogDetailHtml(record, reference),
    { type: "boardingDog", id: record.id },
    {
      headerAction: {
        label: "Edit Dog",
        action: "open-boarding-dog-editor",
        id: record.id,
        stayId: stay.id || reference.stayId || "",
        requestCode: stay.id ? boardingStayRequestCode(record, stay) : reference.requestCode || "",
        tab: "Boarding & Request",
      },
    },
  );
  return true;
}

function boardingRequestNotificationReference(notification = {}, recoveredRequest = null) {
  const source = notificationSourceSnapshot(notification);
  const actionTarget = notification.actionTarget || {};
  const stay = recoveredRequest?.stay || boardingPrimaryStay(source) || {};
  const recoveredRecord = recoveredRequest?.record || source;
  return {
    stayId: actionTarget.stayId || notification.stayId || source.stayId || stay.id || "",
    requestCode: actionTarget.requestCode
      || notification.requestCode
      || source.requestCode
      || stay.requestCode
      || (stay.id ? boardingStayRequestCode(recoveredRecord, stay) : notificationStayIdText(source))
      || "",
  };
}

function boardingRequestAlertReviewHtml(record = {}, reference = {}) {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, reference) || boardingPrimaryStay(displayRecord) || {};
  const status = stay?.id ? boardingStayDisplayStatus(displayRecord, stay) : normalizeBoardingStatus(displayRecord);
  const stayAttrs = stay?.id ? boardingStayDataAttrs(displayRecord, stay) : "";
  const requestCode = stay?.id ? boardingStayRequestCode(displayRecord, stay) : notificationStayIdText(displayRecord);
  const serviceRows = stay?.id ? boardingRequestServiceRowsHtml(displayRecord, stay) : "";
  const pricingSnapshot = stay?.id ? boardingCurrentPricingSnapshotForStay(displayRecord, stay) : null;
  const total = stay?.id ? boardingStayInvoiceTotal(displayRecord, stay, pricingSnapshot ? { pricingSnapshot } : {}) : displayRecord.estimatedTotal || "";
  const statusMessage = status === "Pending"
    ? "Review this customer request and either approve it or decline it with a customer-visible reason."
    : \`This request is currently \${status}. No approval action is needed from this alert.\`;
  const actions = status === "Pending"
    ? \`<button type="button" class="secondary-button" data-action="transition-boarding-stay" data-dog-id="\${escapeHtml(displayRecord.id || "")}"\${stayAttrs} data-next-status="Approved">Approve Request</button><button type="button" class="secondary-button danger-button" data-action="transition-boarding-stay" data-dog-id="\${escapeHtml(displayRecord.id || "")}"\${stayAttrs} data-next-status="Cancelled">Decline Request</button>\`
    : "";
  return \`<section class="popup-record-section boarding-request-alert-review">
    <article class="record-card compact-record-card boarding-request-card">
      <div class="boarding-request-card-main">
        \${boardingDogThumbnailHtml(displayRecord, { className: "boarding-request-photo", interactive: false })}
        <div class="boarding-request-card-content">
          <strong class="boarding-request-dog-name">\${escapeHtml(displayRecord.dogName || "Boarding dog")}</strong>
          <div class="chip-row boarding-request-chip-row">\${dogTypeBadgeHtml("boardingDog")}\${requestCode ? boardingStayRequestCodeChipHtml(displayRecord, stay) : ""}</div>
          <div class="chip-row boarding-request-chip-row boarding-request-status-row">\${stay?.id ? boardingStayStatusChipHtml(displayRecord, stay) : boardingStatusChipHtml(displayRecord)}\${stay?.id ? boardingStayServiceFlagHtml(displayRecord, stay) : ""}</div>
        </div>
      </div>
      <p>\${escapeHtml([displayRecord.ownerName, displayRecord.ownerPhone, displayRecord.ownerEmail].filter(Boolean).join(" | "))}</p>
      <div class="boarding-request-date-row"><span>\${escapeHtml(formatDateTime(stay.dropoffTime))}</span><span aria-hidden="true">-</span><span>\${escapeHtml(formatDateTime(stay.pickupTime))}</span></div>
      \${serviceRows}
      \${total ? boardingRequestEstimatedTotalHtml(total) : ""}
      <p>\${escapeHtml(statusMessage)}</p>
      <div class="record-actions boarding-request-primary-actions">\${actions}<button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>
    </article>
  </section>\`;
}

function openBoardingRequestNotification(notification = {}, recoveredRequest = null) {
  const source = notificationSourceSnapshot(notification);
  const sourceId = notification.sourceId || source.id || recoveredRequest?.record?.id || "";
  const record = recoveredRequest?.record
    || boardingDogRecordForDisplay(sourceId)
    || readRecords("boardingDog").find((item) => item.id === sourceId && !item.removed);
  if (!record) {
    showDetailDialog(notificationDisplayTitle(notification), \`<p>\${escapeHtml(notificationDisplayMessage(notification))}</p>\`);
    return false;
  }
  const reference = boardingRequestNotificationReference(notification, recoveredRequest);
  switchPage("boardingDogsPage");
  renderBoardingDogs();
  renderBoardingRequests();
  showDetailDialog("Review Boarding Request", boardingRequestAlertReviewHtml(record, reference), null);
  return true;
}

async function openCustomerCancellationAlertById(id = "") {
  const notification = await markNotificationRead(id);
  if (!notification) return false;
  $("#notificationPanel").hidden = true;
  renderDashboard();
  return openBoardingCustomerCancellationAlert(notification);
}

async function openNotification(id = "") {
  const notification = await markNotificationRead(id);
  if (!notification) return;
  $("#notificationPanel").hidden = true;
  const sourceType = notification.sourceType;
  const sourceId = notification.sourceId;
  const recoveredRequest = recoveredBoardingRequestNotification(notification);
  if (
    recoveredRequest
    || (sourceType === "boardingDog" && ["customerBoardingRequestCreated", "customerBoardingRequestUpdated"].includes(notification.eventName))
  ) {
    if (openBoardingRequestNotification(notification, recoveredRequest)) {
      renderDashboard();
      return;
    }
  }
  if (sourceType === "boardingDog") {
    if (notification.eventName === "customerApprovedStayCancelled") {
      openBoardingCustomerCancellationAlert(notification);
      renderDashboard();
      return;
    }
    if (currentRole() === "customer") {
      switchPage("customerUpdatesPage");
      renderCustomerUpdates();
      return;
    }
    const record = boardingDogRecordForDisplay(sourceId) || readRecords("boardingDog").find((item) => item.id === sourceId);
    if (record) {
      const tabName = notification.eventName === "customerStayUpdateSent" ? "Customer Update" : "Dog Info";
      switchPage("boardingDogsPage");
      openBoardingDogToTab(record, tabName);
      return;
    }
  }
  if (sourceType === "request" || sourceType === "maintenance") {
    if (openOperationalNotificationRecord(sourceType, sourceId)) return;
  }
  if (sourceType === "careLog") {
    if (openCareLogNotificationRecord(sourceId)) return;
  }
  if (sourceType === "timeOffRequest") {
    const record = readRecords("timeOffRequest").find((item) => item.id === sourceId);
    if (record) {
      openTimeOffReviewPopup(record);
      return;
    }
  }
  showDetailDialog(notificationDisplayTitle(notification), \`<p>\${escapeHtml(notificationDisplayMessage(notification))}</p>\`);
}

function emailNow(subjectText, bodyText) {
  const ownerAlertEmail = getOwnerAlertEmail();
  if (!ownerAlertEmail) {
    showToast("No admin email is configured for alerts.");
    return;
  }
  window.location.href = \`mailto:\${ownerAlertEmail}?subject=\${encodeURIComponent(subjectText)}&body=\${encodeURIComponent(bodyText)}\`;
}
//# sourceURL=snuggle-stay/notifications.js
`;
(0, eval)(__snuggleStayModuleSource);
