// === MODULE: TIMESHEET ===
const __snuggleStayModuleSource = `function scheduleTaskTemplateSync(config = readTaskConfig()) {
  if (localTestMode || !supabaseClient || currentRole() !== "admin" || applyingRemoteTaskConfig) return;
  window.clearTimeout(taskTemplateSyncTimer);
  taskTemplateSyncTimer = window.setTimeout(() => saveTaskTemplateConfig(config), 350);
}

async function addTaskToShift(shift = "", text = "") {
  const trimmed = text.trim();
  if (!trimmed) {
    showToast("Enter a task before adding it.");
    return null;
  }
  const config = readTaskConfig();
  if (!config[shift]) config[shift] = [];
  config[shift].push({ id: uid("task"), text: trimmed });
  await persistTaskConfig(config);
  renderDailyTaskLists();
  showToast("Task added.");
  return trimmed;
}

function boardingScheduleText(record = {}, stayOverride = null) {
  const stay = stayOverride || boardingPrimaryStay(record) || {};
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  if (isServiceRequestStay(record, stay)) {
    const requested = stay.dropoffTime ? \`Requested time \${formatDateTime(stay.dropoffTime)}\` : "";
    const pieces = [requested].filter(Boolean);
    return pieces.length ? pieces.join(" | ") : \`\${status} - no service time saved\`;
  }
  const dropoff = stay.dropoffTime ? \`Drop-off \${formatDateTime(stay.dropoffTime)}\` : "";
  const pickup = stay.pickupTime ? \`Pick-up \${formatDateTime(stay.pickupTime)}\` : "";
  const kennel = status === "In Kennel" && (stay.kennelLocationName || record.kennelLocationName)
    ? \`Kennel \${[stay.kennelBuilding || record.kennelBuilding, stay.kennelLocationName || record.kennelLocationName].filter(Boolean).join(" - ")}\`
    : "";
  const pieces = [dropoff, pickup, kennel].filter(Boolean);
  return pieces.length ? pieces.join(" | ") : \`\${status} - no stay time saved\`;
}

function boardingSchedulePopupHtml(record = {}) {
  const displayRecord = boardingDogWithStayStatus(record);
  const staysHtml = (displayRecord.stays || []).length
    ? (displayRecord.stays || []).map((stay) => {
      const requestCode = boardingStayRequestCode(displayRecord, stay);
      const ownerUpdateButton = ownerUpdateStayIsAvailable(displayRecord, stay)
        ? \`<button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="\${escapeHtml(displayRecord.id)}" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">Update Owner</button>\`
        : "";
      return \`<article class="record-card"><strong>\${escapeHtml(stayScheduleRangeLabel(displayRecord, stay))}</strong><div class="chip-row">\${boardingStayRequestCodeChipHtml(displayRecord, stay)}\${boardingStayStatusButtonHtml(displayRecord, stay, "open-stay-status-menu")}\${boardingStayServiceFlagHtml(displayRecord, stay)}</div><p>\${escapeHtml(boardingStayServicesText(stay))}</p>\${boardingStayInvoiceSummaryHtml(displayRecord, stay)}\${boardingStayServiceTaskListHtml(displayRecord, stay, { actions: true })}<p>\${escapeHtml(stay.bathPlan || "")}</p><p>\${escapeHtml(stay.stayNotes || "")}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay-popup" data-dog-id="\${escapeHtml(displayRecord.id)}" data-id="\${escapeHtml(stay.id)}" data-request-code="\${escapeHtml(requestCode)}">Edit Stay</button>\${ownerUpdateButton}</div></article>\`;
    }).join("")
    : "<p>No boarding stays logged yet.</p>";
  return \`\${boardingStayFormHtml(displayRecord)}<section class="popup-record-section"><h3>Boarding stays</h3>\${staysHtml}</section>\`;
}

function openBoardingSchedulePopup(record = activeBoardingDog()) {
  if (!record?.id) {
    showToast("Save the boarding dog first.");
    return;
  }
  showDetailDialog(\`\${record.dogName || "Boarding Dog"} Boarding Request\`, boardingSchedulePopupHtml(record));
}

function timesheetBelongsToCurrentUser(record) {
  if (!record || !currentUser) return false;
  const currentEmail = (currentUser.email || helperEmail.value || "").toLowerCase();
  const recordEmail = (record.helperEmail || "").toLowerCase();
  if (currentEmail && recordEmail && currentEmail === recordEmail) return true;
  const currentNames = [currentUser.name, helperName.value].filter(Boolean).map(normalizeHelperName);
  const recordName = normalizeHelperName(record.helperName || "");
  return Boolean(recordName && currentNames.includes(recordName));
}

function findOpenClockInForCurrentUser() {
  if (!currentUser) return null;
  return readRecords("timesheet")
    .filter((record) => record.clockInTime && !record.clockOutTime && timesheetBelongsToCurrentUser(record))
    .sort((a, b) => new Date(b.clockInTime) - new Date(a.clockInTime))[0] || null;
}

function syncActiveClockInFromOpenRecord() {
  const open = findOpenClockInForCurrentUser();
  if (!open) return null;
  activeClockIn = { id: open.id, clockInTime: open.clockInTime, helperEmail: open.helperEmail || currentUser.email || helperEmail.value || "" };
  localStorage.setItem("cth-active-clock-in", JSON.stringify(activeClockIn));
  return open;
}

function timesheetDefaultRange() {
  const start = localDateKey(weekStart(new Date()));
  return { start, end: addDays(start, 6), isFiltered: false };
}

function timesheetActiveRange() {
  const fallback = timesheetDefaultRange();
  let start = dateOnly(timesheetFilterStart) || "";
  let end = dateOnly(timesheetFilterEnd) || "";
  if (!start && !end) return fallback;
  if (!start) start = end;
  if (!end) end = start;
  if (start > end) [start, end] = [end, start];
  return { start, end, isFiltered: true };
}

function timesheetSelectedRange() {
  let start = dateOnly($("#timesheetStartDate")?.value) || "";
  let end = dateOnly($("#timesheetEndDate")?.value) || "";
  if (!start && !end) return timesheetActiveRange();
  if (!start) start = end;
  if (!end) end = start;
  if (start > end) [start, end] = [end, start];
  return { start, end, isFiltered: true };
}

function timesheetRecordDate(record = {}) {
  return dateOnly(record.date) || localDateFromStoredDateTime(record.clockInTime) || dateOnly(record.clockInTime);
}

function timesheetRecordTime(record = {}) {
  const value = record.clockInTime || \`\${timesheetRecordDate(record)}T12:00:00\`;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function timesheetRecordInDateRange(record, start, end) {
  const recordDate = timesheetRecordDate(record);
  return Boolean(recordDate && recordDate >= start && recordDate <= end);
}

function timesheetDateLabel(date = "") {
  const dateKey = dateOnly(date);
  if (!dateKey) return "";
  return new Date(\`\${dateKey}T12:00:00\`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timesheetRangeLabel(range = {}) {
  const startLabel = timesheetDateLabel(range.start);
  const endLabel = timesheetDateLabel(range.end);
  if (range.start === range.end) return startLabel || endLabel || "";
  return [startLabel, endLabel].filter(Boolean).join(" to ");
}

function timesheetRecordsForRange(range = timesheetActiveRange()) {
  const isAdmin = currentRole() === "admin";
  return readRecords("timesheet")
    .filter((record) => !record.removed && (isAdmin || timesheetBelongsToCurrentUser(record)))
    .filter((record) => timesheetRecordInDateRange(record, range.start, range.end))
    .sort((a, b) => timesheetRecordTime(b) - timesheetRecordTime(a));
}

function staffHourlyRate(user = {}) {
  const rate = Number(user.hourlyRate ?? user.payRate ?? user.staffHourlyRate ?? 0);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

function staffHourlyRateText(user = {}) {
  const rate = staffHourlyRate(user);
  return rate
    ? "$" + rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "/hr"
    : "Not set";
}

function payrollMoney(value = 0) {
  const number = Number(value || 0);
  const prefix = number < 0 ? "-$" : "$";
  return prefix + Math.abs(number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function staffPayrollUserForRecord(record = {}, users = settingsUsers()) {
  const recordEmail = normalizeEmail(record.helperEmail || record.staffEmail || "");
  const recordName = normalizeHelperName(record.helperName || record.staffName || "");
  return users.find((user) => recordEmail && normalizeEmail(user.email) === recordEmail)
    || users.find((user) => recordName && normalizeHelperName(user.name || "") === recordName)
    || {};
}

function staffPayrollRecordsForRange(range = timesheetActiveRange(), options = {}) {
  const users = settingsUsers().filter((user) => isStaffRole(user.role || ""));
  return readRecords("timesheet")
    .filter((record) => !record.removed)
    .filter((record) => options.includeAll || timesheetBelongsToCurrentUser(record))
    .filter((record) => timesheetRecordInDateRange(record, range.start, range.end))
    .filter((record) => Number(record.hours || 0) > 0 && record.clockOutTime)
    .map((record) => {
      const user = staffPayrollUserForRecord(record, users);
      const rate = staffHourlyRate(user);
      const hours = Number(record.hours || 0) || 0;
      return {
        id: record.id || "",
        date: timesheetRecordDate(record),
        staffName: record.helperName || user.name || "Staff",
        staffEmail: record.helperEmail || user.email || "",
        hours,
        rate,
        total: hours * rate,
        missingRate: !rate,
      };
    })
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.staffName || "").localeCompare(String(b.staffName || "")));
}

function staffPayrollSummaryForRange(range = timesheetActiveRange(), options = {}) {
  const entries = staffPayrollRecordsForRange(range, options);
  const byStaff = new Map();
  entries.forEach((entry) => {
    const key = normalizeEmail(entry.staffEmail) || normalizeHelperName(entry.staffName) || entry.id;
    const existing = byStaff.get(key) || {
      staffName: entry.staffName,
      staffEmail: entry.staffEmail,
      hours: 0,
      rate: entry.rate,
      total: 0,
      missingRate: false,
      shifts: 0,
    };
    existing.hours += entry.hours;
    existing.total += entry.total;
    existing.rate = entry.rate || existing.rate;
    existing.missingRate = existing.missingRate || entry.missingRate;
    existing.shifts += 1;
    byStaff.set(key, existing);
  });
  const staff = [...byStaff.values()].sort((a, b) => String(a.staffName || "").localeCompare(String(b.staffName || "")));
  return {
    entries,
    staff,
    totalHours: staff.reduce((sum, item) => sum + Number(item.hours || 0), 0),
    totalPayroll: staff.reduce((sum, item) => sum + Number(item.total || 0), 0),
    missingRateCount: staff.filter((item) => item.missingRate).length,
  };
}

function syncTimesheetRangeUi(range = timesheetActiveRange()) {
  const startInput = $("#timesheetStartDate");
  const endInput = $("#timesheetEndDate");
  if (startInput) startInput.value = range.start || "";
  if (endInput) endInput.value = range.end || "";
  const title = $("#timesheetTableTitle");
  const help = $("#timesheetTableHelp");
  const summary = $("#timesheetRangeSummary");
  const label = timesheetRangeLabel(range);
  if (title) title.textContent = range.isFiltered ? "Selected Date Range" : "Current Week";
  if (help) help.textContent = range.isFiltered ? "Clock in and clock out records for the selected date range." : "Clock in and clock out records for this week.";
  if (summary) summary.textContent = label ? \`Showing timesheet records for \${label}.\` : "";
}

function renderTimesheet() {
  const isAdmin = currentRole() === "admin";
  const records = readRecords("timesheet").filter((record) => !record.removed && (isAdmin || timesheetBelongsToCurrentUser(record)));
  const now = new Date();
  const thisWeekStart = weekStart(now);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);
  const currentWeekRecords = records.filter((record) => inRange(record, thisWeekStart, nextWeekStart));
  const activeRange = timesheetActiveRange();
  const visibleRecords = timesheetRecordsForRange(activeRange);
  syncTimesheetRangeUi(activeRange);

  $("#timesheetRows").innerHTML = visibleRecords.length
    ? visibleRecords.map((record) => {
        const canEdit = isAdmin || canEditOwnToday(record);
        const syncWarning = record.syncStatus === "failed"
          ? \`<div class="service-warning-text">Sync failed: \${escapeHtml(record.syncError || "Retry before leaving this page.")}</div>\`
          : "";
        const exceptionSummary = timesheetExceptionSummary(record);
        const exceptionHtml = exceptionSummary ? \`<div class="service-warning-text">\${escapeHtml(exceptionSummary)}</div>\` : "";
        return \`<tr><td>\${escapeHtml(record.date)}</td><td>\${escapeHtml(record.helperName)}</td><td>\${formatDateTime(record.clockInTime)}</td><td>\${formatDateTime(record.clockOutTime)}</td><td>\${Number(record.hours || 0).toFixed(2)}</td><td>\${escapeHtml(record.note || "")}\${syncWarning}\${exceptionHtml}</td><td>\${canEdit ? \`<button type="button" class="secondary-button" data-action="edit-time" data-id="\${escapeHtml(record.id)}">Edit</button>\` : ""}</td></tr>\`;
      }).join("")
    : \`<tr><td colspan="7">No time entries for this date range.</td></tr>\`;

  $("#thisWeekHours").textContent = sumHours(currentWeekRecords).toFixed(2);
  $("#lastWeekHours").textContent = sumHours(records.filter((record) => inRange(record, lastWeekStart, thisWeekStart))).toFixed(2);
  $("#lastMonthHours").textContent = sumHours(records.filter((record) => inRange(record, lastMonthStart, thisMonthStart))).toFixed(2);
  $("#lastYearHours").textContent = sumHours(records.filter((record) => inRange(record, lastYearStart, thisYearStart))).toFixed(2);

  const helperTotals = visibleRecords.reduce((totals, record) => {
    totals[record.helperName] = (totals[record.helperName] || 0) + Number(record.hours || 0);
    return totals;
  }, {});
	  $("#weeklyHelperTotals").innerHTML = Object.keys(helperTotals).length
	    ? Object.entries(helperTotals).map(([helper, hours]) => \`<div class="helper-total-item"><strong>\${escapeHtml(isAdmin ? helper : "Your total")}</strong><span>\${hours.toFixed(2)} hours \${activeRange.isFiltered ? "in selected range" : "this week"}</span></div>\`).join("")
	    : "";
	  if ($("#timesheetAdminActions")) $("#timesheetAdminActions").hidden = !isAdmin;
	  renderTimesheetTabs();
	  renderScheduleTab();
	  renderTimeOffTab();
	  renderHolidayTab();
	  renderScheduleReviewTab();
	}

async function saveTimeEntry(payload, options = {}) {
  const existing = payload.id ? readRecords("timesheet").find((record) => record.id === payload.id) : null;
  if (existing && currentRole() !== "admin" && !timesheetBelongsToCurrentUser(existing)) {
    showToast("You can only edit your own timesheet records.");
    throw new Error("Not authorized to edit another staff member's timesheet.");
  }
  if (currentRole() !== "admin") {
    const targetEmail = normalizeEmail(payload.helperEmail || existing?.helperEmail || helperEmail.value || currentUser?.email || "");
    const ownEmail = normalizeEmail(currentUser?.email || helperEmail.value || "");
    if (targetEmail && ownEmail && targetEmail !== ownEmail) {
      showToast("You can only save your own clock records.");
      throw new Error("Not authorized to save another staff member's timesheet.");
    }
  }
  const clockInTime = localDateTimeToIso(payload.clockInTime);
  const clockOutTime = localDateTimeToIso(payload.clockOutTime);
  const record = {
    ...existing,
    type: "timesheet",
    id: payload.id || uid("timesheet"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    date: payload.date || localDateFromStoredDateTime(clockInTime) || localDateFromDateTimeInput(payload.clockInTime),
    helperName: payload.helperName,
    helperEmail: payload.helperEmail || existing?.helperEmail || helperEmail.value,
    clockInTime,
    clockOutTime,
    hours: hoursBetween(clockInTime, clockOutTime),
    note: payload.note || "",
    scheduleShiftId: payload.scheduleShiftId || existing?.scheduleShiftId || "",
    scheduleException: payload.scheduleException || existing?.scheduleException || "",
    clockInException: payload.clockInException || existing?.clockInException || "",
    clockInVarianceMinutes: Number(payload.clockInVarianceMinutes ?? existing?.clockInVarianceMinutes ?? 0),
    clockInExceptionReason: payload.clockInExceptionReason || existing?.clockInExceptionReason || "",
    clockOutException: payload.clockOutException || existing?.clockOutException || "",
    clockOutVarianceMinutes: Number(payload.clockOutVarianceMinutes ?? existing?.clockOutVarianceMinutes ?? 0),
    clockOutExceptionReason: payload.clockOutExceptionReason || existing?.clockOutExceptionReason || "",
    syncStatus: "",
    syncError: "",
  };
  await sendPayload(record);
  upsertRecord("timesheet", record);
  renderTimesheet();
  if (!options.silent) showToast("Time entry saved.");
  return record;
}

function timesheetStaffChoices(record = {}) {
  const choices = settingsUsers()
    .filter((user) => isStaffRole(user.role))
    .map((user) => ({ name: user.name || user.email || "Staff", email: user.email || "", id: user.id || "" }));
  if (currentUser && isStaffRole()) {
    choices.push({ name: currentUser.name || currentUser.email || "Current staff", email: currentUser.email || "", id: currentUser.key || currentUser.email || "" });
  }
  if (record.helperName || record.helperEmail) {
    choices.push({ name: record.helperName || record.helperEmail || "Saved staff", email: record.helperEmail || "", id: record.helperEmail || record.helperName || "" });
  }
  const keyed = new Map();
  choices.forEach((choice) => {
    const key = String(choice.email || choice.name || "").trim().toLowerCase();
    if (key && !keyed.has(key)) keyed.set(key, choice);
  });
  return [...keyed.values()].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function timesheetStaffOptionValue(staff = {}) {
  return staff.email || staff.id || staff.name || "";
}

function selectedTimesheetStaff(record = {}) {
  const choices = timesheetStaffChoices(record);
  const recordEmail = String(record.helperEmail || "").toLowerCase();
  const recordName = normalizeHelperName(record.helperName || "");
  return choices.find((staff) => recordEmail && String(staff.email || "").toLowerCase() === recordEmail)
    || choices.find((staff) => recordName && normalizeHelperName(staff.name || "") === recordName)
    || choices[0]
    || { name: record.helperName || helperName.value || currentUser?.name || "", email: record.helperEmail || helperEmail.value || currentUser?.email || "" };
}

function syncTimesheetStaffFields(formEl) {
  if (!formEl) return;
  const option = formEl.elements.manualStaffKey?.selectedOptions?.[0];
  const name = option?.dataset.name || formEl.elements.manualHelper?.value || "";
  const email = option?.dataset.email || formEl.elements.manualHelperEmail?.value || "";
  if (formEl.elements.manualHelper) formEl.elements.manualHelper.value = name;
  if (formEl.elements.manualHelperEmail) formEl.elements.manualHelperEmail.value = email;
  if (formEl.elements.manualHelperEmailDisplay) formEl.elements.manualHelperEmailDisplay.value = email;
}

function timesheetEditFormHtml(record = {}) {
  const isAdmin = currentRole() === "admin";
  const canDelete = isAdmin && Boolean(record.id);
  const selectedStaff = selectedTimesheetStaff(record);
  const helperValue = selectedStaff.name || record.helperName || helperName.value || currentUser?.name || "";
  const helperEmailValue = selectedStaff.email || record.helperEmail || (isAdmin && !record.id ? "" : helperEmail.value || currentUser?.email || "");
  const staffOptions = timesheetStaffChoices(record).map((staff) => {
    const value = timesheetStaffOptionValue(staff);
    const selected = value === timesheetStaffOptionValue(selectedStaff);
    return \`<option value="\${escapeHtml(value)}" data-name="\${escapeHtml(staff.name || "")}" data-email="\${escapeHtml(staff.email || "")}" \${selected ? "selected" : ""}>\${escapeHtml(staff.name || staff.email || "Staff")}</option>\`;
  }).join("");
  const clockInValue = dateTimeLocalValue(record.clockInTime) || "";
  const clockOutValue = dateTimeLocalValue(record.clockOutTime) || "";
  return \`<form id="timesheetEditForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}">
    <input type="hidden" name="manualTimeId" value="\${escapeHtml(record.id || "")}" />
    <input type="hidden" name="manualHelper" value="\${escapeHtml(helperValue)}" />
    <input type="hidden" name="manualHelperEmail" value="\${escapeHtml(helperEmailValue)}" />
    <div class="field-grid">
      <label>Staff name<select name="manualStaffKey" id="timesheetStaffSelect" \${isAdmin ? "" : "disabled"} required>\${staffOptions || \`<option value="\${escapeHtml(helperValue)}" data-name="\${escapeHtml(helperValue)}" data-email="\${escapeHtml(helperEmailValue)}">\${escapeHtml(helperValue || "Current staff")}</option>\`}</select><small>\${isAdmin ? "Select from saved Staff/Admin users." : "Staff is set from your login."}</small></label>
      <label>Staff email<input type="email" name="manualHelperEmailDisplay" value="\${escapeHtml(helperEmailValue)}" readonly /></label>
      <label>Entry date<input type="date" name="manualDate" value="\${escapeHtml(localDateFromStoredDateTime(record.clockInTime) || record.date || todayDate())}" required /></label>
      <label>Clock in<input type="datetime-local" name="manualClockIn" value="\${escapeHtml(clockInValue)}" required /></label>
      <label>Clock out <small>Optional. Leave blank if this staff member is still on shift.</small><input type="datetime-local" name="manualClockOut" value="\${escapeHtml(clockOutValue)}" /></label>
    </div>
    <label>Timesheet note<textarea name="manualNote" rows="3" placeholder="Reason for manual entry or edit">\${escapeHtml(record.note || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Timesheet</button>\${canDelete ? \`<button type="button" class="secondary-button danger-button" data-action="delete-timesheet" data-id="\${escapeHtml(record.id)}">Delete Timesheet</button>\` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openTimesheetEditPopup(record = {}) {
  showDetailDialog("Edit Timesheet", timesheetEditFormHtml(record));
}

function openTimesheetDeleteConfirm(record = {}) {
  showDetailDialog(
    "Delete Timesheet?",
    \`<article class="record-card compact-record-card">
      <strong>\${escapeHtml(record.helperName || "Timesheet entry")}</strong>
      <p>\${escapeHtml([record.date, formatDateTime(record.clockInTime), formatDateTime(record.clockOutTime)].filter(Boolean).join(" | "))}</p>
      <p>This removes the timesheet entry from active records. Admin audit history will keep the removal action.</p>
      <div class="record-actions">
        <button type="button" class="secondary-button danger-button" data-action="confirm-delete-timesheet" data-id="\${escapeHtml(record.id || "")}">Confirm Delete</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </article>\`,
  );
}

async function removeTimesheetEntryById(id = "") {
  if (currentRole() !== "admin") {
    showToast("Admin access required to delete a timesheet entry.");
    return null;
  }
  const removed = await markRecordRemoved("timesheet", id);
  if (!removed) return null;
  await addAuditLog("Deleted timesheet", "timesheet", removed, \`\${removed.helperName || "Staff"} | \${removed.date || ""}\`);
  renderTimesheet();
  return removed;
}

function scheduleWeekStartString(value = scheduleWeekDate) {
  const source = dateOnly(value) || todayDate();
  return weekStart(new Date(\`\${source}T12:00:00\`)).toISOString().slice(0, 10);
}

function scheduleWeekDates(value = scheduleWeekDate) {
  const start = scheduleWeekStartString(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

var staffScheduleView = "week";
try {
  staffScheduleView = localStorage.getItem("cth-staff-schedule-view") || "week";
} catch (error) {
  staffScheduleView = "week";
}
if (!["day", "week", "month"].includes(staffScheduleView)) staffScheduleView = "week";
var staffScheduleSelectedShiftId = "";
var staffScheduleDragShiftId = "";
var STAFF_SCHEDULE_SLOT_MINUTES = 15;
var STAFF_SCHEDULE_DEFAULT_START_HOUR = 6;
var STAFF_SCHEDULE_DEFAULT_END_HOUR = 19;

function timesheetTabAllowed(tab = "clock") {
  return tab !== "review" || currentRole() === "admin";
}

function setTimesheetTab(tab = "clock") {
  const requestedTab = ["clock", "schedule", "timeOff", "holidays", "review"].includes(tab) ? tab : "clock";
  timesheetTab = timesheetTabAllowed(requestedTab) ? requestedTab : "clock";
  renderTimesheet();
}

function renderTimesheetTabs() {
  if (!timesheetTabAllowed(timesheetTab)) timesheetTab = "clock";
  $$("#timesheetTabs [data-timesheet-tab]").forEach((button) => {
    const allowed = timesheetTabAllowed(button.dataset.timesheetTab);
    button.hidden = !allowed;
    button.disabled = !allowed;
    const active = allowed && button.dataset.timesheetTab === timesheetTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  $$("[data-timesheet-panel]").forEach((panel) => {
    panel.hidden = !timesheetTabAllowed(panel.dataset.timesheetPanel) || panel.dataset.timesheetPanel !== timesheetTab;
  });
}

function staffScheduleRecords(options = {}) {
  const isAdmin = currentRole() === "admin";
  return readRecords("staffSchedule")
    .filter((record) => !record.removed && (!options.excludeCancelled || record.status !== "Cancelled"))
    .filter((record) => isAdmin || staffRecordBelongsToCurrentUser(record));
}

function staffScheduleRecordsForWeek(start = scheduleWeekStartString()) {
  const end = addDays(start, 7);
  return staffScheduleRecords({ excludeCancelled: true }).filter((record) => record.date >= start && record.date < end);
}

function timeOffRequests(options = {}) {
  const isAdmin = currentRole() === "admin";
  return readRecords("timeOffRequest")
    .filter((record) => !record.removed)
    .filter((record) => !options.status || record.status === options.status)
    .filter((record) => isAdmin || staffRecordBelongsToCurrentUser(record));
}

function holidaysForRange(start = scheduleWeekStartString(), end = addDays(scheduleWeekStartString(), 7)) {
  return readRecords("kennelHoliday").filter((record) => !record.removed && record.date >= start && record.date < end);
}

function holidayForDate(date = "") {
  return readRecords("kennelHoliday").find((record) => !record.removed && record.date === date);
}

function shiftHours(shift = {}) {
  const start = timeToMinutes(shift.startTime);
  const end = timeToMinutes(shift.endTime);
  return Math.max(0, (end - start) / 60);
}

function formatShiftTime(shift = {}) {
  return [displayTime(shift.startTime), displayTime(shift.endTime)].filter(Boolean).join(" - ");
}

function shiftOverlaps(a = {}, b = {}) {
  if (a.date !== b.date) return false;
  return timeToMinutes(a.startTime) < timeToMinutes(b.endTime) && timeToMinutes(b.startTime) < timeToMinutes(a.endTime);
}

function staffTimeOffForDate(staffEmail = "", date = "") {
  const normalized = normalizeEmail(staffEmail);
  return readRecords("timeOffRequest").filter((request) => {
    if (request.removed || !request.startDate || !request.endDate) return false;
    return normalizeEmail(request.staffEmail) === normalized && date >= request.startDate && date <= request.endDate;
  });
}

function scheduleWarningsForShift(shift = {}) {
  const warnings = [];
  const holiday = holidayForDate(shift.date);
  if (holiday) warnings.push(\`\${holiday.name || "Holiday"}: \${holiday.closed ? "closed" : holiday.limitedStaffing ? "limited staffing" : "holiday note"}.\`);
  staffTimeOffForDate(shift.staffEmail, shift.date).forEach((request) => {
    warnings.push(\`\${shift.staffName || "Staff"} has \${String(request.status || "Pending").toLowerCase()} time off for this date.\`);
  });
  readRecords("staffSchedule")
    .filter((record) => !record.removed && record.status !== "Cancelled" && record.id !== shift.id && normalizeEmail(record.staffEmail) === normalizeEmail(shift.staffEmail))
    .filter((record) => shiftOverlaps(record, shift))
    .forEach((record) => warnings.push(\`Overlaps \${formatShiftTime(record)} on \${record.date}.\`));
  return warnings;
}

function staffScheduleAdminRequired() {
  if (currentRole() === "admin") return true;
  showToast("Admin access required to edit the schedule.");
  return false;
}

function scheduleWeekEndString(start = scheduleWeekStartString()) {
  return addDays(start, 7);
}

function allScheduleStaffChoices() {
  return timesheetStaffChoices()
    .filter((staff) => staff.email || staff.name)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function selectedStaffKeysFromForm(formEl, name = "staffKeys") {
  return [...(formEl?.querySelectorAll?.('input[name="' + name + '"]:checked') || [])]
    .map((input) => input.value)
    .filter(Boolean);
}

function selectedDatesFromForm(formEl, name = "dates") {
  return [...(formEl?.querySelectorAll?.('input[name="' + name + '"]:checked') || [])]
    .map((input) => input.value)
    .filter(Boolean);
}

function staffFromOptionValue(value = "") {
  return allScheduleStaffChoices().find((staff) => timesheetStaffOptionValue(staff) === value)
    || { name: value, email: value };
}

function scheduleShiftRecordFromParts(parts = {}) {
  const now = new Date().toISOString();
  const weekStartValue = scheduleWeekStartString(parts.date || scheduleWeekStartString());
  const publishedWeek = weekIsPublished(weekStartValue);
  const staffColor = scheduleShiftStaffColorValue({
    ...parts,
    staffName: parts.staffName || "Staff",
    staffEmail: parts.staffEmail || "",
  });
  return {
    type: "staffSchedule",
    id: parts.id || uid("staffSchedule"),
    submittedAt: parts.submittedAt || now,
    staffName: parts.staffName || "Staff",
    staffEmail: parts.staffEmail || "",
    date: parts.date,
    startTime: parts.startTime || "09:00",
    endTime: parts.endTime || "12:00",
    role: parts.role || "Kennel Care",
    location: parts.location || "",
    notes: parts.notes || "",
    staffColor,
    staffColorUpdatedAt: parts.staffColorUpdatedAt || (staffColor ? now : ""),
    status: publishedWeek ? "Published" : "Draft",
    weekStart: weekStartValue,
    publishedAt: publishedWeek ? now : "",
    changedAfterPublish: publishedWeek,
  };
}

function scheduleConflictReportForShift(shift = {}) {
  const shiftEmail = normalizeEmail(shift.staffEmail);
  const warnings = scheduleWarningsForShift(shift).filter((warning) => shiftEmail || !String(warning).startsWith("Overlaps "));
  const blocking = shiftEmail ? readRecords("staffSchedule")
    .filter((record) => !record.removed && record.status !== "Cancelled")
    .filter((record) => record.id !== shift.id)
    .filter((record) => normalizeEmail(record.staffEmail) === shiftEmail)
    .filter((record) => shiftOverlaps(record, shift))
    .map((record) => "Overlaps existing " + formatShiftTime(record) + " on " + record.date + ".") : [];

  return {
    blocking: [...new Set(blocking)],
    warnings: warnings.filter((warning) => !String(warning).startsWith("Overlaps ")),
  };
}

function schedulePreviewHtml(records = [], options = {}) {
  const reports = records.map((record) => ({ record, report: scheduleConflictReportForShift(record) }));
  const blockingCount = reports.reduce((sum, item) => sum + item.report.blocking.length, 0);
  const warningCount = reports.reduce((sum, item) => sum + item.report.warnings.length, 0);
  const rows = reports.length
    ? reports.map(({ record, report }) => {
      const issueHtml = [
        ...report.blocking.map((item) => '<li><strong>Blocking:</strong> ' + escapeHtml(item) + '</li>'),
        ...report.warnings.map((item) => '<li>' + escapeHtml(item) + '</li>'),
      ].join("");
      return '<tr>' +
        '<td>' + escapeHtml(record.date) + '</td>' +
        '<td>' + escapeHtml(record.staffName || "Staff") + '</td>' +
        '<td>' + escapeHtml(formatShiftTime(record)) + '</td>' +
        '<td>' + escapeHtml([record.role, record.location].filter(Boolean).join(" | ")) + '</td>' +
        '<td>' + (issueHtml ? '<ul class="schedule-warning-list">' + issueHtml + '</ul>' : "OK") + '</td>' +
      '</tr>';
    }).join("")
    : '<tr><td colspan="5">No shifts to preview.</td></tr>';

  return '<section class="timesheet-popup-summary">' +
    '<div class="timesheet-popup-meta"><span>Shifts</span><strong>' + records.length + '</strong></div>' +
    '<div class="timesheet-popup-meta"><span>Blocking conflicts</span><strong>' + blockingCount + '</strong></div>' +
    '<div class="timesheet-popup-meta"><span>Warnings</span><strong>' + warningCount + '</strong></div>' +
  '</section>' +
  '<div class="table-wrap timesheet-popup-table">' +
    '<table class="data-table">' +
      '<thead><tr><th>Date</th><th>Staff</th><th>Time</th><th>Role / Location</th><th>Warnings</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
  '</div>' +
  (blockingCount && !options.allowBlocking ? '<p class="service-warning-text">Resolve blocking conflicts before saving.</p>' : "");
}

function encodedScheduleRecordsInput(records = []) {
  return '<input type="hidden" name="recordsJson" value="' + escapeHtml(JSON.stringify(records)) + '" />';
}

async function saveScheduleRecordsBatch(records = [], options = {}) {
  if (!staffScheduleAdminRequired()) return null;
  const validRecords = arrayValue(records).filter((record) => record?.id && record?.type === "staffSchedule");
  if (!validRecords.length) {
    showToast("No shifts to save.");
    return null;
  }

  const blocking = validRecords.flatMap((record) => scheduleConflictReportForShift(record).blocking);
  if (blocking.length && !options.allowBlocking) {
    showToast("Resolve overlapping shifts before saving.");
    return null;
  }

  // Timesheet efficiency: batch schedule writes keep bulk tools from issuing one remote save per generated shift.
  await sendPayloadBatch(validRecords);
  renderTimesheet();
  return validRecords;
}

const scheduleStaffColorPalette = [
  { name: "Sky", color: "#38BDF8", border: "rgba(56, 189, 248, 0.78)", soft: "rgba(56, 189, 248, 0.18)", glow: "rgba(56, 189, 248, 0.22)", labelText: "#061321" },
  { name: "Mint", color: "#34D399", border: "rgba(52, 211, 153, 0.78)", soft: "rgba(52, 211, 153, 0.18)", glow: "rgba(52, 211, 153, 0.20)", labelText: "#061321" },
  { name: "Gold", color: "#FBBF24", border: "rgba(251, 191, 36, 0.82)", soft: "rgba(251, 191, 36, 0.18)", glow: "rgba(251, 191, 36, 0.20)", labelText: "#1f1603" },
  { name: "Lavender", color: "#A78BFA", border: "rgba(167, 139, 250, 0.82)", soft: "rgba(167, 139, 250, 0.18)", glow: "rgba(167, 139, 250, 0.20)", labelText: "#100722" },
  { name: "Rose", color: "#FB7185", border: "rgba(251, 113, 133, 0.82)", soft: "rgba(251, 113, 133, 0.18)", glow: "rgba(251, 113, 133, 0.20)", labelText: "#23050b" },
  { name: "Teal", color: "#2DD4BF", border: "rgba(45, 212, 191, 0.78)", soft: "rgba(45, 212, 191, 0.18)", glow: "rgba(45, 212, 191, 0.20)", labelText: "#061321" },
  { name: "Orange", color: "#F97316", border: "rgba(249, 115, 22, 0.82)", soft: "rgba(249, 115, 22, 0.18)", glow: "rgba(249, 115, 22, 0.18)", labelText: "#220b02" },
  { name: "Blue", color: "#60A5FA", border: "rgba(96, 165, 250, 0.78)", soft: "rgba(96, 165, 250, 0.18)", glow: "rgba(96, 165, 250, 0.20)", labelText: "#061321" },
  { name: "Violet", color: "#C084FC", border: "rgba(192, 132, 252, 0.80)", soft: "rgba(192, 132, 252, 0.17)", glow: "rgba(192, 132, 252, 0.18)", labelText: "#160520" },
  { name: "Pink", color: "#F472B6", border: "rgba(244, 114, 182, 0.80)", soft: "rgba(244, 114, 182, 0.17)", glow: "rgba(244, 114, 182, 0.18)", labelText: "#240514" },
];

function normalizeScheduleStaffColor(value = "") {
  const color = String(value || "").trim().toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(color)) return "";
  return color;
}

function scheduleShiftStaffColorKey(shift = {}) {
  return normalizeEmail(shift.staffEmail || shift.helperEmail || shift.email || "") || String(shift.staffName || shift.helperName || shift.name || "unassigned").trim().toLowerCase();
}

function scheduleStaffCustomColorMap() {
  const map = new Map();
  readRecords("staffSchedule").forEach((record) => {
    if (!record || record.removed || record.status === "Cancelled") return;
    const key = scheduleShiftStaffColorKey(record);
    const color = normalizeScheduleStaffColor(record.staffColor);
    if (!key || !color) return;
    const timestamp = new Date(record.staffColorUpdatedAt || record.updatedAt || record.submittedAt || 0).getTime() || 0;
    const existing = map.get(key);
    if (!existing || timestamp >= existing.timestamp) map.set(key, { color, timestamp });
  });
  return map;
}

function scheduleShiftStaffColorIndex(shift = {}, colorMap = null) {
  const staffColor = scheduleShiftStaffColorValue(shift, colorMap);
  const paletteIndex = scheduleStaffColorPalette.findIndex((color) => color.color === staffColor);
  if (paletteIndex >= 0) return paletteIndex;
  const key = scheduleShiftStaffColorKey(shift) || "unassigned";
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash * 31) + key.charCodeAt(index)) >>> 0;
  }
  return hash % scheduleStaffColorPalette.length;
}

function scheduleShiftStaffColorValue(shift = {}, colorMap = null) {
  const key = scheduleShiftStaffColorKey(shift);
  const staffColorMap = colorMap || scheduleStaffCustomColorMap();
  const mappedColor = key ? staffColorMap?.get?.(key)?.color : "";
  const ownColor = normalizeScheduleStaffColor(shift.staffColor);
  const color = mappedColor || ownColor;
  if (color) return color;
  return scheduleStaffColorPalette[scheduleShiftStaffColorIndexFromKey(key)]?.color || scheduleStaffColorPalette[0].color;
}

function scheduleShiftStaffColorIndexFromKey(key = "unassigned") {
  let hash = 0;
  const normalizedKey = key || "unassigned";
  for (let index = 0; index < normalizedKey.length; index += 1) {
    hash = ((hash * 31) + normalizedKey.charCodeAt(index)) >>> 0;
  }
  return hash % scheduleStaffColorPalette.length;
}

function scheduleShiftStaffColorEntry(shift = {}, colorMap = null) {
  const value = scheduleShiftStaffColorValue(shift, colorMap);
  return scheduleStaffColorPalette.find((color) => color.color === value)
    || scheduleStaffColorPalette[scheduleShiftStaffColorIndexFromKey(scheduleShiftStaffColorKey(shift))]
    || scheduleStaffColorPalette[0];
}

function scheduleShiftStaffColorStyle(shift = {}, colorMap = null) {
  const color = scheduleShiftStaffColorEntry(shift, colorMap);
  return [
    "--schedule-staff-color: " + color.color,
    "--schedule-staff-border: " + color.border,
    "--schedule-staff-soft: " + color.soft,
    "--schedule-staff-glow: " + color.glow,
    "--schedule-staff-label-text: " + color.labelText,
  ].join("; ");
}

function scheduleStaffColorSelectOptionsHtml(selectedColor = "") {
  const selected = normalizeScheduleStaffColor(selectedColor) || scheduleStaffColorPalette[0].color;
  return scheduleStaffColorPalette.map((color) => {
    const isSelected = color.color === selected;
    return '<option value="' + escapeHtml(color.color) + '"' + (isSelected ? " selected" : "") + '>' + escapeHtml(color.name) + '</option>';
  }).join("");
}

function scheduleStaffColorPreviewStyle(colorValue = "") {
  const color = scheduleStaffColorPalette.find((item) => item.color === normalizeScheduleStaffColor(colorValue)) || scheduleStaffColorPalette[0];
  return "--schedule-selected-staff-color: " + color.color + "; --schedule-selected-staff-label-text: " + color.labelText;
}

function syncScheduleStaffColorFields(formEl, options = {}) {
  if (!formEl?.elements?.staffColor) return;
  const staff = selectedStaffFromSelect(formEl.elements.staffKey);
  const staffColor = scheduleShiftStaffColorValue({ staffName: staff.name, staffEmail: staff.email });
  if (options.useStaffDefault || !normalizeScheduleStaffColor(formEl.elements.staffColor.value)) {
    formEl.elements.staffColor.value = staffColor;
  }
  const selectedColor = normalizeScheduleStaffColor(formEl.elements.staffColor.value) || staffColor;
  const preview = formEl.querySelector(".schedule-color-preview");
  if (preview) {
    preview.setAttribute("style", scheduleStaffColorPreviewStyle(selectedColor));
    const color = scheduleStaffColorPalette.find((item) => item.color === selectedColor);
    preview.setAttribute("title", (color?.name || "Selected") + " schedule color");
  }
}

function bindScheduleShiftFormColorControls(formEl) {
  if (!formEl) return;
  syncScheduleStaffColorFields(formEl);
  formEl.addEventListener("change", (event) => {
    if (event.target.closest('[name="staffKey"]')) {
      syncScheduleStaffColorFields(formEl, { useStaffDefault: true });
      return;
    }
    if (event.target.closest('[name="staffColor"]')) syncScheduleStaffColorFields(formEl);
  });
}

function staffScheduleMonthDates(value = scheduleWeekDate) {
  const source = dateOnly(value) || todayDate();
  const firstOfMonth = new Date(source + "T12:00:00");
  firstOfMonth.setDate(1);
  const gridStart = weekStart(firstOfMonth).toISOString().slice(0, 10);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function staffScheduleVisibleDates() {
  if (staffScheduleView === "month") return staffScheduleMonthDates(scheduleWeekDate);
  if (staffScheduleView === "day") return [dateOnly(scheduleWeekDate) || todayDate()];
  return scheduleWeekDates(scheduleWeekDate);
}

function staffScheduleRangeLabel() {
  const anchor = dateOnly(scheduleWeekDate) || todayDate();
  if (staffScheduleView === "month") {
    return new Date(anchor + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  if (staffScheduleView === "day") {
    return new Date(anchor + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }
  const start = scheduleWeekStartString(anchor);
  return dateRangeText(start, addDays(start, 6));
}

function staffScheduleShiftAnchor(delta = 0) {
  const anchor = dateOnly(scheduleWeekDate) || todayDate();
  if (staffScheduleView === "month") return addMonths(anchor, delta);
  if (staffScheduleView === "day") return addDays(anchor, delta);
  return addDays(scheduleWeekStartString(anchor), delta * 7);
}

function setStaffScheduleView(view = "week") {
  staffScheduleView = ["day", "week", "month"].includes(view) ? view : "week";
  try {
    localStorage.setItem("cth-staff-schedule-view", staffScheduleView);
  } catch (error) {
    // Ignore storage failures; the current render still updates.
  }
  renderTimesheet();
}

function staffScheduleRecordsForDates(dates = staffScheduleVisibleDates()) {
  const dateSet = new Set(dates.filter(Boolean));
  return staffScheduleRecords({ excludeCancelled: true })
    .filter((record) => dateSet.has(record.date))
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

function staffScheduleLongDateLabel(date = "") {
  return date ? new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
}

function staffScheduleTimeFromMinutes(minutes = 0) {
  const normalized = Math.max(0, Math.min(1439, Number(minutes) || 0));
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
}

function staffScheduleShiftEndMinutes(shift = {}) {
  const start = timeToMinutes(shift.startTime || "09:00");
  const end = timeToMinutes(shift.endTime || "");
  return end > start ? end : start + 60;
}

function staffScheduleShiftMinutes(shift = {}) {
  return Math.max(STAFF_SCHEDULE_SLOT_MINUTES, staffScheduleShiftEndMinutes(shift) - timeToMinutes(shift.startTime || "09:00"));
}

function staffScheduleTimeGridRange(dates = []) {
  const shifts = staffScheduleRecordsForDates(dates);
  const minStart = shifts.reduce((value, shift) => Math.min(value, timeToMinutes(shift.startTime || "09:00")), STAFF_SCHEDULE_DEFAULT_START_HOUR * 60);
  const maxEnd = shifts.reduce((value, shift) => Math.max(value, staffScheduleShiftEndMinutes(shift)), STAFF_SCHEDULE_DEFAULT_END_HOUR * 60);
  const startHour = Math.max(0, Math.floor(minStart / 60));
  const endHour = Math.min(24, Math.max(startHour + 1, Math.ceil(maxEnd / 60)));
  return {
    startMinutes: startHour * 60,
    endMinutes: endHour * 60,
    slotCount: Math.max(4, Math.ceil((endHour * 60 - startHour * 60) / STAFF_SCHEDULE_SLOT_MINUTES)),
    hours: Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
  };
}

function staffScheduleShiftRow(shift = {}, range = staffScheduleTimeGridRange([shift.date || scheduleWeekDate])) {
  return Math.max(2, 2 + Math.floor((timeToMinutes(shift.startTime || "09:00") - range.startMinutes) / STAFF_SCHEDULE_SLOT_MINUTES));
}

function staffScheduleShiftSpan(shift = {}) {
  return Math.max(1, Math.ceil(staffScheduleShiftMinutes(shift) / STAFF_SCHEDULE_SLOT_MINUTES));
}

function staffScheduleOverlaps(left = {}, right = {}) {
  const leftStart = timeToMinutes(left.startTime || "09:00");
  const leftEnd = staffScheduleShiftEndMinutes(left);
  const rightStart = timeToMinutes(right.startTime || "09:00");
  const rightEnd = staffScheduleShiftEndMinutes(right);
  return leftStart < rightEnd && rightStart < leftEnd;
}

function staffScheduleLayoutDateShifts(date = "", range = staffScheduleTimeGridRange([date])) {
  const groups = [];
  let activeGroup = null;
  staffScheduleRecordsForDates([date])
    .sort((a, b) => timeToMinutes(a.startTime || "09:00") - timeToMinutes(b.startTime || "09:00") || staffScheduleShiftEndMinutes(b) - staffScheduleShiftEndMinutes(a))
    .forEach((shift) => {
      const start = timeToMinutes(shift.startTime || "09:00");
      const end = staffScheduleShiftEndMinutes(shift);
      if (!activeGroup || start >= activeGroup.end) {
        activeGroup = { end, shifts: [] };
        groups.push(activeGroup);
      }
      activeGroup.shifts.push(shift);
      activeGroup.end = Math.max(activeGroup.end, end);
    });

  return groups.flatMap((group) => {
    const laneEnds = [];
    const laidOut = group.shifts.map((shift) => {
      const start = timeToMinutes(shift.startTime || "09:00");
      const end = staffScheduleShiftEndMinutes(shift);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = end;
      return {
        shift,
        laneIndex: lane,
        row: staffScheduleShiftRow(shift, range),
        span: staffScheduleShiftSpan(shift),
      };
    });
    const laneCount = Math.max(1, laneEnds.length, ...laidOut.map((layout) => layout.laneIndex + 1));
    return laidOut.map((layout) => ({ ...layout, laneCount }));
  });
}

function staffScheduleMaxOverlap(dates = []) {
  return Math.max(1, ...dates.map((date) => {
    const shifts = staffScheduleRecordsForDates([date]);
    return shifts.reduce((max, shift) => Math.max(max, shifts.filter((other) => staffScheduleOverlaps(shift, other)).length), 1);
  }));
}

function staffScheduleDayMinWidth(dates = []) {
  return Math.max(staffScheduleView === "day" ? 420 : 130, staffScheduleMaxOverlap(dates) * (staffScheduleView === "day" ? 190 : 118));
}

function staffScheduleStyleAttr(colorStyle = "", styles = {}) {
  const css = [
    colorStyle,
    ...Object.entries(styles)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => key + ": " + String(value)),
  ].filter(Boolean).join("; ");
  return css ? ' style="' + escapeHtml(css) + '"' : "";
}

function staffScheduleInitials(name = "Staff") {
  return String(name || "Staff")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "S";
}

function staffScheduleShiftCardHtml(shift = {}, layout = null, colorMap = null) {
  const warnings = scheduleWarningsForShift(shift);
  const colorValue = scheduleShiftStaffColorValue(shift, colorMap);
  const positionedClass = layout ? " is-positioned" : "";
  const warningClass = warnings.length ? " is-warning" : "";
  const selectedClass = staffScheduleSelectedShiftId === shift.id ? " is-selected" : "";
  const isAdmin = currentRole() === "admin";
  const style = staffScheduleStyleAttr(scheduleShiftStaffColorStyle(shift, colorMap), {
    "--task-color": colorValue,
    ...(layout ? {
      "grid-column": layout.column,
      "grid-row": layout.row + " / span " + layout.span,
      "--task-lane-count": layout.laneCount,
      "--task-lane-index": layout.laneIndex,
    } : {}),
  });
  const meta = [formatShiftTime(shift), shift.role || "", shift.location || "", shift.status || ""].filter(Boolean).join(" | ");
  return '<button type="button" draggable="' + (isAdmin ? "true" : "false") + '" class="task-scheduler-card staff-schedule-card schedule-shift-card' + positionedClass + warningClass + selectedClass + '" data-action="select-schedule-shift" data-id="' + escapeHtml(shift.id) + '" data-staff-color="' + escapeHtml(String(scheduleShiftStaffColorIndex(shift, colorMap))) + '"' + style + '>' +
    '<span class="task-scheduler-avatar staff-schedule-avatar" aria-hidden="true">' + escapeHtml(staffScheduleInitials(shift.staffName)) + '</span>' +
    '<span class="task-scheduler-card-copy staff-schedule-card-copy">' +
      '<strong class="schedule-shift-staff">' + escapeHtml(shift.staffName || "Staff") + '</strong>' +
      '<span>' + escapeHtml(meta) + '</span>' +
      (warnings.length ? '<span class="staff-schedule-warning-label">Needs review</span>' : "") +
    '</span>' +
  '</button>';
}

function staffScheduleHourLabel(hour) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return hour + " AM";
  if (hour === 12) return "12 PM";
  return (hour - 12) + " PM";
}

function staffScheduleMonthShiftHtml(shift = {}, colorMap = null) {
  const colorValue = scheduleShiftStaffColorValue(shift, colorMap);
  const label = [shift.staffName || "Staff", formatShiftTime(shift), shift.role || ""].filter(Boolean).join(" ");
  return '<button type="button" draggable="' + (currentRole() === "admin" ? "true" : "false") + '" class="task-scheduler-month-task staff-schedule-month-shift" data-action="select-schedule-shift" data-id="' + escapeHtml(shift.id) + '" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '"' + staffScheduleStyleAttr(scheduleShiftStaffColorStyle(shift, colorMap), { "--task-color": colorValue }) + '>' +
    escapeHtml((shift.staffName || "Staff") + " " + formatShiftTime(shift)) +
  '</button>';
}

function staffScheduleTimelineGridHtml(dates = [], className = "task-scheduler-week-grid staff-schedule-week-grid") {
  const range = staffScheduleTimeGridRange(dates);
  const dayMinWidth = staffScheduleDayMinWidth(dates);
  const dayCount = Math.max(1, dates.length);
  const staffColorMap = scheduleStaffCustomColorMap();
  const slots = [];
  for (let index = 0; index < range.slotCount; index += 1) {
    const time = staffScheduleTimeFromMinutes(range.startMinutes + index * STAFF_SCHEDULE_SLOT_MINUTES);
    dates.forEach((date, dateIndex) => {
      slots.push('<div class="task-scheduler-slot staff-schedule-slot ' + (date === todayDate() ? "is-today" : "") + '" data-schedule-drop-date="' + escapeHtml(date) + '" data-schedule-drop-time="' + escapeHtml(time) + '" style="grid-column: ' + (dateIndex + 2) + '; grid-row: ' + (index + 2) + ';"></div>');
    });
  }
  const shiftCards = dates.flatMap((date, dateIndex) =>
    staffScheduleLayoutDateShifts(date, range).map((layout) => staffScheduleShiftCardHtml(layout.shift, { ...layout, column: dateIndex + 2 }, staffColorMap))
  ).join("");
  return '<div class="' + escapeHtml(className) + ' task-scheduler-time-grid staff-schedule-time-grid" style="--task-day-count: ' + dayCount + '; --task-slot-count: ' + range.slotCount + '; --task-day-min-width: ' + dayMinWidth + 'px; --task-grid-min-width: ' + (70 + dayCount * dayMinWidth) + 'px; --task-mobile-grid-min-width: ' + (52 + dayCount * dayMinWidth) + 'px;">' +
    '<div class="task-scheduler-week-header task-scheduler-time-label">Time</div>' +
    dates.map((date) => '<div class="task-scheduler-week-header ' + (date === todayDate() ? "is-today" : "") + '">' + '<strong>' + escapeHtml(new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })) + '</strong><span>' + escapeHtml(new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })) + '</span></div>').join("") +
    range.hours.map((hour, index) => '<div class="task-scheduler-time-label" style="grid-column: 1; grid-row: ' + (index * 4 + 2) + ' / span 4;">' + escapeHtml(staffScheduleHourLabel(hour)) + '</div>').join("") +
    slots.join("") +
    shiftCards +
  '</div>';
}

function staffScheduleMobileWeekStripHtml(dates = scheduleWeekDates(scheduleWeekDate), dayMinWidth = staffScheduleDayMinWidth(dates)) {
  return '<div class="task-scheduler-mobile-week-strip staff-schedule-mobile-week-strip" style="--task-day-min-width: ' + dayMinWidth + 'px; --task-mobile-grid-min-width: ' + (52 + dates.length * dayMinWidth) + 'px;">' + dates.map((date) => {
    const source = new Date(date + "T12:00:00");
    const active = date === (dateOnly(scheduleWeekDate) || todayDate()) || date === todayDate();
    return '<button type="button" data-action="staff-schedule-jump-date" data-date="' + escapeHtml(date) + '" class="' + (active ? "is-active" : "") + '">' +
      '<span>' + escapeHtml(source.toLocaleDateString("en-US", { weekday: "short" })) + '</span>' +
      '<strong>' + escapeHtml(String(source.getDate())) + '</strong>' +
    '</button>';
  }).join("") + '</div>';
}

function staffScheduleWeekHtml() {
  const dates = scheduleWeekDates(scheduleWeekDate);
  const dayMinWidth = staffScheduleDayMinWidth(dates);
  return staffScheduleMobileWeekStripHtml(dates, dayMinWidth) + staffScheduleTimelineGridHtml(dates, "task-scheduler-week-grid staff-schedule-week-grid");
}

function staffScheduleDayBoardHeaderHtml(date = dateOnly(scheduleWeekDate) || todayDate()) {
  return '<div class="task-scheduler-day-board-header staff-schedule-day-board-header">' +
    '<span>Day schedule</span>' +
    '<strong>' + escapeHtml(staffScheduleLongDateLabel(date)) + '</strong>' +
  '</div>';
}

function staffScheduleDayHtml() {
  const date = dateOnly(scheduleWeekDate) || todayDate();
  return staffScheduleDayBoardHeaderHtml(date) + staffScheduleTimelineGridHtml([date], "task-scheduler-week-grid task-scheduler-day-grid staff-schedule-week-grid staff-schedule-day-grid");
}

function staffScheduleMonthWeekdayHeadersHtml() {
  const weekdays = [["Sunday", "Sun"], ["Monday", "Mon"], ["Tuesday", "Tue"], ["Wednesday", "Wed"], ["Thursday", "Thu"], ["Friday", "Fri"], ["Saturday", "Sat"]];
  return weekdays.map(([full, short]) =>
    '<div class="task-scheduler-month-weekday"><span class="weekday-full">' + escapeHtml(full) + '</span><span class="weekday-short">' + escapeHtml(short) + '</span></div>'
  ).join("");
}

function staffScheduleMonthHtml() {
  const dates = staffScheduleMonthDates(scheduleWeekDate);
  const anchorMonth = new Date((dateOnly(scheduleWeekDate) || todayDate()) + "T12:00:00").getMonth();
  const staffColorMap = scheduleStaffCustomColorMap();
  return '<div class="task-scheduler-month-grid staff-schedule-month-grid">' +
    staffScheduleMonthWeekdayHeadersHtml() +
    dates.map((date) => {
      const dateObj = new Date(date + "T12:00:00");
      const shifts = staffScheduleRecordsForDates([date]);
      const outsideClass = dateObj.getMonth() === anchorMonth ? "" : " is-outside-month";
      const todayClass = date === todayDate() ? " is-today" : "";
      const holiday = holidayForDate(date);
      return '<div class="task-scheduler-month-day staff-schedule-month-day' + outsideClass + todayClass + (holiday ? " has-holiday" : "") + '" data-schedule-drop-date="' + escapeHtml(date) + '" data-schedule-drop-time="09:00">' +
        '<strong>' + escapeHtml(String(dateObj.getDate())) + '</strong>' +
        (holiday ? '<span class="staff-schedule-holiday-chip">' + escapeHtml(holiday.name || "Holiday") + '</span>' : "") +
        shifts.slice(0, 4).map((shift) => staffScheduleMonthShiftHtml(shift, staffColorMap)).join("") +
        (shifts.length > 2 ? '<span class="task-scheduler-month-more is-mobile" aria-label="' + escapeHtml(String(shifts.length - 2)) + ' more shifts">...</span>' : "") +
        (shifts.length > 4 ? '<span class="task-scheduler-month-more is-desktop" aria-label="' + escapeHtml(String(shifts.length - 4)) + ' more shifts">...</span>' : "") +
      '</div>';
    }).join("") +
  '</div>';
}

function renderStaffScheduleMiniCalendar() {
  const el = $("#staffScheduleMiniCalendar");
  if (!el) return;
  const anchor = dateOnly(scheduleWeekDate) || todayDate();
  const dates = staffScheduleMonthDates(anchor);
  el.innerHTML = '<div class="task-scheduler-mini-header"><button type="button" class="secondary-button" data-action="staff-schedule-mini-prev" aria-label="Previous month">‹</button><strong>' + escapeHtml(new Date(anchor + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })) + '</strong><button type="button" class="secondary-button" data-action="staff-schedule-mini-next" aria-label="Next month">›</button></div>' +
    '<div class="task-scheduler-mini-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div>' +
    '<div class="task-scheduler-mini-grid">' +
    dates.map((date) => {
      const count = staffScheduleRecordsForDates([date]).length;
      return '<button type="button" data-action="staff-schedule-jump-date" data-date="' + escapeHtml(date) + '" class="' + (date === todayDate() ? "is-today" : "") + (date === anchor ? " is-selected" : "") + '">' +
        escapeHtml(String(new Date(date + "T12:00:00").getDate())) +
        (count ? '<small>' + count + '</small>' : "") +
      '</button>';
    }).join("") +
    '</div>';
}

function renderStaffScheduleLegend(shifts = staffScheduleRecordsForDates(), colorMap = scheduleStaffCustomColorMap()) {
  const el = $("#staffScheduleLegend");
  if (!el) return;
  const staff = [];
  const seen = new Set();
  shifts.forEach((shift) => {
    const key = scheduleShiftStaffColorKey(shift) || shift.staffName || shift.id;
    if (seen.has(key)) return;
    seen.add(key);
    staff.push(shift);
  });
  el.innerHTML = '<h3>Staff</h3>' + (staff.length ? staff.map((shift) =>
    '<div class="task-scheduler-legend-item staff-schedule-legend-item"' + staffScheduleStyleAttr(scheduleShiftStaffColorStyle(shift, colorMap), { "--task-color": scheduleShiftStaffColorValue(shift, colorMap) }) + '>' +
      '<i></i><span>' + escapeHtml(shift.staffName || "Staff") + '</span>' +
    '</div>'
  ).join("") : '<p>No staff scheduled in this view.</p>');
}

function staffScheduleDetailPanelHtml(shift = {}, colorMap = scheduleStaffCustomColorMap()) {
  const warnings = scheduleWarningsForShift(shift);
  const isAdmin = currentRole() === "admin";
  return '<div class="task-scheduler-panel-header">' +
    '<div><h3>' + escapeHtml(shift.staffName || "Shift Details") + '</h3><p>' + escapeHtml([staffScheduleLongDateLabel(shift.date), formatShiftTime(shift)].filter(Boolean).join(" | ")) + '</p></div>' +
    '<button type="button" class="secondary-button task-scheduler-panel-close" data-action="close-staff-schedule-detail" aria-label="Close shift details">×</button>' +
  '</div>' +
  '<article class="task-scheduler-detail-card staff-schedule-detail-card">' +
    '<div class="task-scheduler-detail-hero">' +
      '<span class="task-scheduler-avatar staff-schedule-avatar is-large"' + staffScheduleStyleAttr(scheduleShiftStaffColorStyle(shift, colorMap), { "--task-color": scheduleShiftStaffColorValue(shift, colorMap) }) + '>' + escapeHtml(staffScheduleInitials(shift.staffName)) + '</span>' +
      '<div><h4>' + escapeHtml(shift.staffName || "Staff") + '</h4><p>' + escapeHtml(shift.status || "Draft") + '</p></div>' +
    '</div>' +
    '<div class="task-scheduler-detail-row"><span>Date</span><strong>' + escapeHtml(staffScheduleLongDateLabel(shift.date)) + '</strong></div>' +
    '<div class="task-scheduler-detail-row"><span>Time</span><strong>' + escapeHtml(formatShiftTime(shift)) + '</strong></div>' +
    '<div class="task-scheduler-detail-row"><span>Role</span><strong>' + escapeHtml(shift.role || "Kennel Care") + '</strong></div>' +
    '<div class="task-scheduler-detail-row"><span>Location</span><strong>' + escapeHtml(shift.location || "No location set") + '</strong></div>' +
    (shift.notes ? '<div class="task-scheduler-detail-row is-notes"><span>Notes</span><p>' + escapeHtml(shift.notes) + '</p></div>' : "") +
    '<section class="task-scheduler-status-card ' + (warnings.length ? "is-pending-confirmation" : "") + '"><strong>Status</strong><p>' + escapeHtml(warnings.length ? "Needs review" : shift.status || "Draft") + '</p>' + (warnings.length ? '<ul class="schedule-warning-list">' + warnings.map((warning) => '<li>' + escapeHtml(warning) + '</li>').join("") + '</ul>' : '<span>No schedule warnings.</span>') + '</section>' +
    (isAdmin ? '<div class="task-scheduler-form-actions">' +
      '<button type="button" class="secondary-button" data-action="edit-shift" data-id="' + escapeHtml(shift.id) + '">Edit Shift</button>' +
      '<button type="button" class="secondary-button" data-action="duplicate-shift" data-id="' + escapeHtml(shift.id) + '">Duplicate</button>' +
      '<button type="button" class="secondary-button" data-action="copy-shift-days" data-id="' + escapeHtml(shift.id) + '">Copy to Days</button>' +
      '<button type="button" class="secondary-button danger-button" data-action="cancel-shift" data-id="' + escapeHtml(shift.id) + '">Cancel Shift</button>' +
    '</div>' : "") +
  '</article>';
}

function renderStaffScheduleDetail(shift = null, colorMap = scheduleStaffCustomColorMap()) {
  const panel = $("#staffScheduleDetailPanel");
  if (!panel) return;
  const open = Boolean(shift?.id);
  panel.classList.toggle("is-open", open);
  panel.innerHTML = open
    ? staffScheduleDetailPanelHtml(shift, colorMap)
    : '<div class="task-scheduler-panel-header"><div><h3>Schedule Details</h3><p>Select a shift to see the staff member, time, notes, and edit tools.</p></div></div>';
}

function staffScheduleDropSlotFromPoint(event) {
  const elements = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(event.clientX, event.clientY) : [];
  const directSlot = elements.find((element) => element?.matches?.("[data-schedule-drop-date]"));
  if (directSlot) return directSlot;
  if (staffScheduleView === "month") return event.target.closest(".staff-schedule-month-day[data-schedule-drop-date]");
  const grid = event.target.closest(".staff-schedule-time-grid") || $("#scheduleWeekGrid .staff-schedule-time-grid");
  if (!grid) return null;
  const dates = staffScheduleVisibleDates();
  const range = staffScheduleTimeGridRange(dates);
  const rect = grid.getBoundingClientRect();
  const firstSlot = grid.querySelector(".staff-schedule-slot[data-schedule-drop-date]");
  if (!firstSlot || event.clientY < firstSlot.getBoundingClientRect().top || event.clientY > rect.bottom) return null;
  const timeColumn = grid.querySelector(".task-scheduler-time-label:not(.task-scheduler-week-header)");
  const timeColumnWidth = timeColumn?.getBoundingClientRect().width || (window.innerWidth <= 900 ? 52 : 70);
  if (event.clientX < rect.left + timeColumnWidth || event.clientX > rect.right) return null;
  const dayWidth = Math.max(1, (rect.width - timeColumnWidth) / Math.max(1, dates.length));
  const dateIndex = Math.max(0, Math.min(dates.length - 1, Math.floor((event.clientX - rect.left - timeColumnWidth) / dayWidth)));
  const slotRect = firstSlot.getBoundingClientRect();
  const slotHeight = slotRect.height || 20;
  const slotIndex = Math.max(0, Math.min(range.slotCount - 1, Math.floor((event.clientY - slotRect.top) / slotHeight)));
  const date = dates[dateIndex];
  const time = staffScheduleTimeFromMinutes(range.startMinutes + slotIndex * STAFF_SCHEDULE_SLOT_MINUTES);
  return Array.from(grid.querySelectorAll(".staff-schedule-slot[data-schedule-drop-date]"))
    .find((slot) => slot.dataset.scheduleDropDate === date && slot.dataset.scheduleDropTime === time) || null;
}

function openStaffScheduleSlotDraft(slot) {
  if (!slot || !staffScheduleAdminRequired()) return;
  const startTime = slot.dataset.scheduleDropTime || "09:00";
  openScheduleShiftPopup({
    date: dateOnly(slot.dataset.scheduleDropDate) || dateOnly(scheduleWeekDate) || todayDate(),
    startTime,
    endTime: staffScheduleTimeFromMinutes(timeToMinutes(startTime) + 240),
  });
}

async function moveStaffScheduleShift(id = "", date = "", startTime = "") {
  if (!staffScheduleAdminRequired()) return null;
  const shift = readRecords("staffSchedule").find((item) => item.id === id && !item.removed && item.status !== "Cancelled");
  if (!shift) return null;
  const targetDate = dateOnly(date) || shift.date;
  const targetStartTime = startTime || shift.startTime || "09:00";
  const duration = staffScheduleShiftMinutes(shift);
  const weekStartValue = scheduleWeekStartString(targetDate);
  const targetWeekPublished = weekIsPublished(weekStartValue);
  const changedAfterPublish = Boolean(shift.publishedAt || targetWeekPublished || shift.status === "Published");
  const updated = await saveAndNotify({
    ...shift,
    date: targetDate,
    startTime: targetStartTime,
    endTime: staffScheduleTimeFromMinutes(timeToMinutes(targetStartTime) + duration),
    weekStart: weekStartValue,
    status: targetWeekPublished ? "Published" : shift.status || "Draft",
    changedAfterPublish,
    updatedAt: new Date().toISOString(),
  }, changedAfterPublish ? "scheduleChangedAfterPublish" : "");
  staffScheduleSelectedShiftId = updated?.id || shift.id;
  renderTimesheet();
  showToast("Shift moved.");
  return updated;
}

function ensureStaffSchedulePlannerBindings() {
  const panel = $("#timesheetSchedulePanel");
  if (!panel || panel.dataset.staffScheduleBound === "true") return;
  panel.dataset.staffScheduleBound = "true";

  panel.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("[data-staff-schedule-view]");
    if (viewButton) {
      event.preventDefault();
      event.stopPropagation();
      setStaffScheduleView(viewButton.dataset.staffScheduleView || "week");
      return;
    }

    const monthDay = event.target.closest(".staff-schedule-month-day[data-schedule-drop-date]");
    if (staffScheduleView === "month" && monthDay && !event.target.closest("[data-action]")) {
      event.preventDefault();
      event.stopPropagation();
      scheduleWeekDate = monthDay.dataset.scheduleDropDate || scheduleWeekDate;
      setStaffScheduleView("day");
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;

    if (["schedule-prev-week", "schedule-this-week", "schedule-next-week", "staff-schedule-jump-date", "staff-schedule-mini-prev", "staff-schedule-mini-next", "select-schedule-shift", "close-staff-schedule-detail", "edit-shift", "duplicate-shift", "copy-shift-days", "cancel-shift"].includes(action.dataset.action)) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (action.dataset.action === "schedule-prev-week") {
      scheduleWeekDate = staffScheduleShiftAnchor(-1);
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "schedule-this-week") {
      scheduleWeekDate = todayDate();
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "schedule-next-week") {
      scheduleWeekDate = staffScheduleShiftAnchor(1);
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "staff-schedule-jump-date") {
      scheduleWeekDate = action.dataset.date || scheduleWeekDate;
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "staff-schedule-mini-prev") {
      scheduleWeekDate = addMonths(dateOnly(scheduleWeekDate) || todayDate(), -1);
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "staff-schedule-mini-next") {
      scheduleWeekDate = addMonths(dateOnly(scheduleWeekDate) || todayDate(), 1);
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "select-schedule-shift") {
      staffScheduleSelectedShiftId = action.dataset.id || "";
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "close-staff-schedule-detail") {
      staffScheduleSelectedShiftId = "";
      renderTimesheet();
      return;
    }
    if (action.dataset.action === "edit-shift") {
      const record = readRecords("staffSchedule").find((item) => item.id === action.dataset.id && !item.removed);
      if (record) openScheduleShiftPopup(record);
      return;
    }
    if (action.dataset.action === "duplicate-shift") {
      duplicateScheduleShift(action.dataset.id);
      return;
    }
    if (action.dataset.action === "copy-shift-days") {
      openCopyShiftToDaysPopup(action.dataset.id);
      return;
    }
    if (action.dataset.action === "cancel-shift") {
      const cancelled = await cancelScheduleShift(action.dataset.id);
      if (cancelled) {
        staffScheduleSelectedShiftId = "";
        showToast("Shift cancelled.");
      }
      return;
    }
  });

  panel.addEventListener("dblclick", (event) => {
    const slot = event.target.closest("[data-schedule-drop-date]");
    if (!slot || staffScheduleView === "month" || event.target.closest("[data-action]")) return;
    event.preventDefault();
    openStaffScheduleSlotDraft(slot);
  });

  panel.addEventListener("dragstart", (event) => {
    const card = event.target.closest('[data-action="select-schedule-shift"]');
    if (!card || currentRole() !== "admin") return;
    staffScheduleDragShiftId = card.dataset.id || "";
    event.dataTransfer?.setData("text/plain", staffScheduleDragShiftId);
    card.classList.add("is-dragging");
  });

  panel.addEventListener("dragover", (event) => {
    if (staffScheduleDragShiftId && staffScheduleDropSlotFromPoint(event)) event.preventDefault();
  });

  panel.addEventListener("drop", async (event) => {
    const slot = staffScheduleDropSlotFromPoint(event);
    if (!slot) return;
    event.preventDefault();
    const id = event.dataTransfer?.getData("text/plain") || staffScheduleDragShiftId;
    staffScheduleDragShiftId = "";
    await moveStaffScheduleShift(id, slot.dataset.scheduleDropDate, slot.dataset.scheduleDropTime || "09:00");
  });

  panel.addEventListener("dragend", (event) => {
    staffScheduleDragShiftId = "";
    event.target.closest(".staff-schedule-card")?.classList.remove("is-dragging");
  });
}

function renderScheduleTab() {
  const grid = $("#scheduleWeekGrid");
  const summary = $("#scheduleSummaryGrid");
  if (!grid || !summary) return;
  const dates = staffScheduleVisibleDates();
  const shifts = staffScheduleRecordsForDates(dates);
  const staffColorMap = scheduleStaffCustomColorMap();
  const firstDate = dates[0] || dateOnly(scheduleWeekDate) || todayDate();
  const lastDate = dates[dates.length - 1] || firstDate;
  const holidays = holidaysForRange(firstDate, addDays(lastDate, 1));
  const totalHours = shifts.reduce((sum, shift) => sum + staffScheduleShiftMinutes(shift) / 60, 0);
  const visibleStaffCount = new Set(shifts.map((shift) => scheduleShiftStaffColorKey(shift) || shift.staffName || shift.id)).size;
  const isAdmin = currentRole() === "admin";
  const label = $("#staffScheduleRangeLabel");
  if (label) label.textContent = staffScheduleRangeLabel();
  $("#staffScheduleDayViewButton")?.classList.toggle("is-active", staffScheduleView === "day");
  $("#staffScheduleWeekViewButton")?.classList.toggle("is-active", staffScheduleView === "week");
  $("#staffScheduleMonthViewButton")?.classList.toggle("is-active", staffScheduleView === "month");
  summary.innerHTML = [
    ["View", staffScheduleRangeLabel(), staffScheduleView.charAt(0).toUpperCase() + staffScheduleView.slice(1) + " planner"],
    ["Scheduled hours", totalHours.toFixed(2), "Across visible staff"],
    ["Open days", dates.filter((date) => !shifts.some((shift) => shift.date === date)).length, "No shift saved"],
    ["Staff", visibleStaffCount, "Scheduled in view"],
    ["Holiday flags", holidays.length, staffScheduleView === "month" ? "Visible range" : "This range"],
  ].map(([cardLabel, value, note]) => '<div class="summary-card"><span>' + escapeHtml(cardLabel) + '</span><strong>' + escapeHtml(String(value)) + '</strong><p>' + escapeHtml(String(note)) + '</p></div>').join("");
  grid.innerHTML = staffScheduleView === "month" ? staffScheduleMonthHtml() : staffScheduleView === "day" ? staffScheduleDayHtml() : staffScheduleWeekHtml();
  renderStaffScheduleMiniCalendar();
  renderStaffScheduleLegend(shifts, staffColorMap);
  const selected = shifts.find((shift) => shift.id === staffScheduleSelectedShiftId) || null;
  if (!selected) staffScheduleSelectedShiftId = "";
  $("#staffScheduleLayout")?.classList.toggle("has-panel-open", Boolean(selected));
  renderStaffScheduleDetail(selected, staffColorMap);
  [
    "#openScheduleShiftButton",
    "#openBulkScheduleButton",
    "#copyScheduleDayButton",
    "#openScheduleTemplatesButton",
    "#publishScheduleButton",
    "#copyLastWeekScheduleButton",
    "#openHolidayButton"
  ].forEach((selector) => {
    const el = $(selector);
    if (el) el.hidden = !isAdmin;
  });
  ensureStaffSchedulePlannerBindings();
}

function renderTimeOffTab() {
  const list = $("#timeOffRequestList");
  if (!list) return;
  const records = timeOffRequests().sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
  const isAdmin = currentRole() === "admin";
  list.innerHTML = records.length
    ? records.map((record) => {
      const conflicts = readRecords("staffSchedule").filter((shift) => !shift.removed && shift.status !== "Cancelled" && normalizeEmail(shift.staffEmail) === normalizeEmail(record.staffEmail) && shift.date >= record.startDate && shift.date <= record.endDate);
      const actions = isAdmin ? \`<div class="record-actions"><button type="button" class="secondary-button" data-action="review-time-off" data-id="\${escapeHtml(record.id)}">Review</button></div>\` : "";
      return \`<article class="record-card compact-record-card \${record.status === "Pending" ? "is-urgent" : ""}"><strong>\${escapeHtml(record.staffName || "Staff")} - \${escapeHtml(record.status || "Pending")}</strong><span>\${escapeHtml(dateRangeText(record.startDate, record.endDate))}</span><p>\${escapeHtml(record.reason || "No reason recorded.")}</p>\${conflicts.length ? \`<p>\${conflicts.length} scheduled shift conflict\${conflicts.length === 1 ? "" : "s"}.</p>\` : ""}\${actions}</article>\`;
    }).join("")
    : "<p>No time off requests yet.</p>";
}

function renderHolidayTab() {
  const list = $("#holidayList");
  if (!list) return;
  const records = readRecords("kennelHoliday").filter((record) => !record.removed).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const isAdmin = currentRole() === "admin";
  list.innerHTML = records.length
    ? records.map((record) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(record.name || "Holiday")}</strong><span>\${escapeHtml(record.date || "")} | \${record.closed ? "Closed" : record.limitedStaffing ? "Limited staffing" : "Holiday note"}</span><p>\${escapeHtml(record.staffingNote || "")}</p>\${isAdmin ? \`<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-holiday" data-id="\${escapeHtml(record.id)}">Edit</button></div>\` : ""}</article>\`).join("")
    : "<p>No holidays saved yet.</p>";
}

function renderScheduleReviewTab() {
  const summary = $("#scheduleReviewSummary");
  const list = $("#scheduleReviewIssues");
  if (!summary || !list) return;
  if (currentRole() !== "admin") {
    summary.innerHTML = "";
    list.innerHTML = "";
    return;
  }
  const start = scheduleWeekStartString();
  const shifts = staffScheduleRecordsForWeek(start);
  const timesheets = readRecords("timesheet").filter((record) => !record.removed && record.date >= start && record.date < addDays(start, 7));
  const issues = reviewIssuesForWeek(start);
  const scheduledHours = shifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  const actualHours = timesheets.reduce((sum, record) => sum + Number(record.hours || 0), 0);
  const payroll = staffPayrollSummaryForRange({ start, end: addDays(start, 6) }, { includeAll: true });
  const payrollRows = payroll.staff.length
    ? payroll.staff.map((item) => '<tr>'
      + '<td><strong>' + escapeHtml(item.staffName || "Staff") + '</strong><span>' + escapeHtml(item.staffEmail || "") + '</span></td>'
      + '<td><strong>' + escapeHtml(item.hours.toFixed(2)) + '</strong></td>'
      + '<td><strong>' + escapeHtml(item.rate ? staffHourlyRateText({ hourlyRate: item.rate }) : "Missing") + '</strong></td>'
      + '<td><strong>' + escapeHtml(payrollMoney(item.total || 0)) + '</strong></td>'
      + '<td>' + escapeHtml(String(item.shifts || 0)) + '</td>'
      + '</tr>').join("")
    : '<tr><td colspan="5">No completed clock records for payroll this week.</td></tr>';
  summary.innerHTML = [
    ["Scheduled", scheduledHours.toFixed(2), "hours"],
    ["Actual", actualHours.toFixed(2), "hours"],
    ["Difference", (actualHours - scheduledHours).toFixed(2), "actual minus scheduled"],
    ["Payroll", payrollMoney(payroll.totalPayroll), payroll.missingRateCount ? payroll.missingRateCount + " staff rate" + (payroll.missingRateCount === 1 ? "" : "s") + " missing" : "estimated from clock records"],
    ["Issues", issues.length, "need review"],
  ].map(([label, value, note]) => \`<div class="summary-card"><span>\${escapeHtml(label)}</span><strong>\${escapeHtml(String(value))}</strong><p>\${escapeHtml(note)}</p></div>\`).join("");
  const payrollTable = '<section class="schedule-review-payroll"><h3>Weekly payroll estimate</h3><div class="table-wrap"><table class="data-table"><thead><tr><th>Staff</th><th>Hours</th><th>Rate</th><th>Payroll</th><th>Clock records</th></tr></thead><tbody>' + payrollRows + '</tbody></table></div></section>';
  const issuesHtml = issues.length
    ? issues.map((issue) => \`<article class="record-card compact-record-card \${issue.priority === "urgent" ? "is-urgent" : ""}"><strong>\${escapeHtml(issue.title)}</strong><p>\${escapeHtml(issue.detail)}</p></article>\`).join("")
    : "<p>No schedule issues found for this week.</p>";
  list.innerHTML = payrollTable + issuesHtml;
}

function scheduleShiftFormHtml(record = {}) {
  const isEdit = Boolean(record.id);
  const start = scheduleWeekStartString();
  const date = record.date || start;
  const selected = selectedTimesheetStaff({ helperName: record.staffName, helperEmail: record.staffEmail });
  const staffColor = scheduleShiftStaffColorValue({ ...record, staffName: selected.name, staffEmail: selected.email });
  const warnings = scheduleWarningsForShift({ ...record, staffName: selected.name, staffEmail: selected.email, date, startTime: record.startTime || "09:00", endTime: record.endTime || "12:00" });
  return \`<form id="scheduleShiftForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Staff<select name="staffKey" id="scheduleStaffSelect" required>\${staffOptionHtml(record)}</select></label>
      <label class="schedule-color-field">Staff color<span class="schedule-color-control"><span class="schedule-color-preview" style="\${escapeHtml(scheduleStaffColorPreviewStyle(staffColor))}" aria-hidden="true"></span><select name="staffColor" id="scheduleStaffColorSelect">\${scheduleStaffColorSelectOptionsHtml(staffColor)}</select></span><small>Used for this staff member's schedule cards.</small></label>
      <label>Date<input type="date" name="date" value="\${escapeHtml(date)}" required /></label>
      <label>Start time<input type="time" name="startTime" value="\${escapeHtml(record.startTime || "09:00")}" required /></label>
      <label>End time<input type="time" name="endTime" value="\${escapeHtml(record.endTime || "12:00")}" required /></label>
      <label>Role<input type="text" name="role" value="\${escapeHtml(record.role || "Kennel Care")}" /></label>
      <label>Location<input type="text" name="location" value="\${escapeHtml(record.location || "")}" placeholder="Shed, Mansion, both" /></label>
    </div>
    <label>Shift note<textarea name="notes" rows="3">\${escapeHtml(record.notes || "")}</textarea></label>
    \${warnings.length ? \`<ul class="schedule-warning-list">\${warnings.map((warning) => \`<li>\${escapeHtml(warning)}</li>\`).join("")}</ul>\` : ""}
    <div class="button-row"><button type="submit">\${isEdit ? "Save Shift" : "Add Shift"}</button>\${isEdit ? \`<button type="button" class="secondary-button danger-button" data-action="cancel-shift" data-id="\${escapeHtml(record.id)}">Cancel Shift</button>\` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>
  </form>\`;
}

function bulkScheduleFormHtml() {
  const start = scheduleWeekStartString();
  const staffOptions = allScheduleStaffChoices().map((staff) => {
    const value = timesheetStaffOptionValue(staff);
    return '<label class="inline-check"><input type="checkbox" name="staffKeys" value="' + escapeHtml(value) + '" /> ' + escapeHtml(staff.name || staff.email || "Staff") + '</label>';
  }).join("");

  const dayOptions = scheduleWeekDates(start).map((date) => {
    const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return '<label class="inline-check"><input type="checkbox" name="dates" value="' + escapeHtml(date) + '" /> ' + escapeHtml(label) + '</label>';
  }).join("");

  return '<form id="bulkScheduleForm" class="tracker-form">' +
    '<p>Create the same shift for multiple staff and multiple days, then preview conflicts before saving.</p>' +
    '<div class="field-grid">' +
      '<fieldset><legend>Staff</legend>' + (staffOptions || "<p>No staff users found.</p>") + '</fieldset>' +
      '<fieldset><legend>Days</legend>' + dayOptions + '</fieldset>' +
      '<label>Start time<input type="time" name="startTime" value="09:00" required /></label>' +
      '<label>End time<input type="time" name="endTime" value="12:00" required /></label>' +
      '<label>Role<input type="text" name="role" value="Kennel Care" /></label>' +
      '<label>Location<input type="text" name="location" placeholder="Shed, Mansion, both" /></label>' +
    '</div>' +
    '<label>Shift note<textarea name="notes" rows="3"></textarea></label>' +
    '<label class="inline-check"><input type="checkbox" name="skipTimeOff" checked /> Skip staff with approved time off</label>' +
    '<div class="button-row">' +
      '<button type="submit">Preview Shifts</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

function openBulkSchedulePopup() {
  if (!staffScheduleAdminRequired()) return;
  showDetailDialog("Bulk Add Shifts", bulkScheduleFormHtml());
}

function bulkScheduleRecordsFromForm(formEl) {
  const data = formPayload(formEl);
  const staffKeys = selectedStaffKeysFromForm(formEl);
  const dates = selectedDatesFromForm(formEl);
  const skipTimeOff = Boolean(formEl.elements.skipTimeOff?.checked);
  const records = [];

  staffKeys.forEach((staffKey) => {
    const staff = staffFromOptionValue(staffKey);
    dates.forEach((date) => {
      if (skipTimeOff && staffTimeOffForDate(staff.email, date).some((request) => request.status === "Approved")) return;
      records.push(scheduleShiftRecordFromParts({
        staffName: staff.name,
        staffEmail: staff.email,
        date,
        startTime: data.startTime,
        endTime: data.endTime,
        role: data.role,
        location: data.location,
        notes: data.notes,
      }));
    });
  });

  return records;
}

function bulkSchedulePreviewFormHtml(records = []) {
  const hasBlocking = records.some((record) => scheduleConflictReportForShift(record).blocking.length);
  return '<form id="bulkScheduleConfirmForm" class="tracker-form">' +
    encodedScheduleRecordsInput(records) +
    schedulePreviewHtml(records) +
    '<div class="button-row">' +
      '<button type="submit"' + (hasBlocking ? " disabled" : "") + '>Save ' + records.length + ' Shift' + (records.length === 1 ? "" : "s") + '</button>' +
      '<button type="button" class="secondary-button" data-action="open-bulk-schedule">Back</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

async function saveBulkScheduleConfirmForm(formEl) {
  const records = JSON.parse(formEl.elements.recordsJson.value || "[]");
  const saved = await saveScheduleRecordsBatch(records);
  if (saved) {
    $("#detailDialog").close();
    showToast(saved.length + ' shift' + (saved.length === 1 ? "" : "s") + " saved.");
  }
  return saved;
}

function openScheduleShiftPopup(record = {}) {
  if (!staffScheduleAdminRequired()) return;
  showDetailDialog(record.id ? "Edit Shift" : "Add Shift", scheduleShiftFormHtml(record));
  bindScheduleShiftFormColorControls($("#scheduleShiftForm"));
}

async function saveScheduleShiftFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const data = formPayload(formEl);
  const existing = data.id ? readRecords("staffSchedule").find((record) => record.id === data.id) : readRecords("staffSchedule").find((record) => record.id === formEl.dataset.id);
  const staff = selectedStaffFromSelect(formEl.elements.staffKey);
  const weekStartValue = scheduleWeekStartString(data.date);
  const publishedWeek = weekIsPublished(weekStartValue);
  const changedAfterPublish = Boolean(existing?.publishedAt || publishedWeek);
  const selectedColor = normalizeScheduleStaffColor(data.staffColor) || scheduleShiftStaffColorValue({ staffName: staff.name, staffEmail: staff.email });
  const existingColor = normalizeScheduleStaffColor(existing?.staffColor);
  const staffColorUpdatedAt = selectedColor && selectedColor !== existingColor
    ? new Date().toISOString()
    : existing?.staffColorUpdatedAt || (selectedColor ? new Date().toISOString() : "");
  const record = {
    ...(existing || {}),
    type: "staffSchedule",
    id: formEl.dataset.id || uid("staffSchedule"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    staffName: staff.name,
    staffEmail: staff.email,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    role: data.role || "Kennel Care",
    location: data.location || "",
    notes: data.notes || "",
    staffColor: selectedColor,
    staffColorUpdatedAt,
    status: publishedWeek ? "Published" : existing?.status || "Draft",
    weekStart: weekStartValue,
    publishedAt: existing?.publishedAt || (publishedWeek ? new Date().toISOString() : ""),
    changedAfterPublish,
  };
  const saved = await saveAndNotify(record, changedAfterPublish ? "scheduleChangedAfterPublish" : "");
  renderTimesheet();
  return saved;
}

function timeOffRequestFormHtml(record = {}) {
  return \`<form id="timeOffRequestForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Start date<input type="date" name="startDate" value="\${escapeHtml(record.startDate || todayDate())}" required /></label>
      <label>End date<input type="date" name="endDate" value="\${escapeHtml(record.endDate || record.startDate || todayDate())}" required /></label>
    </div>
    <label>Reason<textarea name="reason" rows="3" required>\${escapeHtml(record.reason || "")}</textarea></label>
    <div class="button-row"><button type="submit">Submit Request</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openTimeOffRequestPopup(record = {}) {
  showDetailDialog(record.id ? "Edit Time Off Request" : "Request Time Off", timeOffRequestFormHtml(record));
}

async function saveTimeOffRequestFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const data = formPayload(formEl);
  const existing = formEl.dataset.id ? readRecords("timeOffRequest").find((record) => record.id === formEl.dataset.id) : null;
  const record = {
    ...(existing || {}),
    type: "timeOffRequest",
    id: existing?.id || uid("timeOff"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    staffName: existing?.staffName || currentUser?.name || helperName.value || "Unknown staff",
    staffEmail: existing?.staffEmail || currentUser?.email || helperEmail.value || "",
    startDate: data.startDate,
    endDate: data.endDate,
    reason: data.reason || "",
    status: existing?.status || "Pending",
  };
  const saved = await saveAndNotify(record, existing ? "" : "timeOffRequested");
  renderTimesheet();
  return saved;
}

function openTimeOffReviewPopup(record = {}) {
  showDetailDialog("Review Time Off", \`<article class="record-card compact-record-card">
    <strong>\${escapeHtml(record.staffName || "Staff")} - \${escapeHtml(record.status || "Pending")}</strong>
    <span>\${escapeHtml(dateRangeText(record.startDate, record.endDate))}</span>
    <p>\${escapeHtml(record.reason || "")}</p>
    \${record.reviewNote ? \`<p>\${escapeHtml(record.reviewNote)}</p>\` : ""}
    <label>Review note<textarea id="timeOffReviewNote" rows="3">\${escapeHtml(record.reviewNote || "")}</textarea></label>
    <div class="record-actions"><button type="button" data-action="approve-time-off" data-id="\${escapeHtml(record.id)}">Approve</button><button type="button" class="secondary-button danger-button" data-action="deny-time-off" data-id="\${escapeHtml(record.id)}">Deny</button><button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>
  </article>\`);
}

async function reviewTimeOffRequest(id = "", status = "Approved") {
  const record = readRecords("timeOffRequest").find((item) => item.id === id && !item.removed);
  if (!record || currentRole() !== "admin") return null;
  const reviewNote = $("#timeOffReviewNote")?.value || "";
  const updated = await saveAndNotify({
    ...record,
    status,
    reviewedBy: currentUser?.name || helperName.value || "Admin",
    reviewedAt: new Date().toISOString(),
    reviewNote,
  }, "timeOffReviewed");
  renderTimesheet();
  return updated;
}

function holidayFormHtml(record = {}) {
  return \`<form id="holidayForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Name<input type="text" name="name" value="\${escapeHtml(record.name || "")}" required /></label>
      <label>Date<input type="date" name="date" value="\${escapeHtml(record.date || todayDate())}" required /></label>
      <label>Holiday type<select name="holidayType"><option \${record.holidayType === "Holiday Pay" ? "selected" : ""}>Holiday Pay</option><option \${record.holidayType === "Closed" ? "selected" : ""}>Closed</option><option \${record.holidayType === "Limited Staffing" ? "selected" : ""}>Limited Staffing</option></select></label>
    </div>
    <label class="inline-check"><input type="checkbox" name="closed" \${record.closed ? "checked" : ""} /> Closed to normal customer appointments</label>
    <label class="inline-check"><input type="checkbox" name="limitedStaffing" \${record.limitedStaffing ? "checked" : ""} /> Limited staffing</label>
    <label class="inline-check"><input type="checkbox" name="paidHoliday" \${record.paidHoliday ? "checked" : ""} /> Paid holiday / holiday rate</label>
    <label>Staffing note<textarea name="staffingNote" rows="3">\${escapeHtml(record.staffingNote || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Holiday</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openHolidayPopup(record = {}) {
  if (currentRole() !== "admin") {
    showToast("Admin access required to edit holidays.");
    return;
  }
  showDetailDialog(record.id ? "Edit Holiday" : "Add Holiday", holidayFormHtml(record));
}

async function saveHolidayFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const data = formPayload(formEl);
  const existing = formEl.dataset.id ? readRecords("kennelHoliday").find((record) => record.id === formEl.dataset.id) : null;
  const record = {
    ...(existing || {}),
    type: "kennelHoliday",
    id: existing?.id || uid("holiday"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    name: data.name,
    date: data.date,
    holidayType: data.holidayType || "",
    closed: formEl.elements.closed.checked,
    limitedStaffing: formEl.elements.limitedStaffing.checked,
    paidHoliday: formEl.elements.paidHoliday.checked,
    staffingNote: data.staffingNote || "",
  };
  const saved = await saveAndNotify(record);
  renderTimesheet();
  return saved;
}

async function cancelScheduleShift(id = "") {
  const record = readRecords("staffSchedule").find((item) => item.id === id && !item.removed);
  if (!record || currentRole() !== "admin") return null;
  const updated = await saveAndNotify({ ...record, status: "Cancelled", cancelledAt: new Date().toISOString(), cancelledBy: currentUser?.name || "Admin" }, record.publishedAt ? "scheduleChangedAfterPublish" : "");
  renderTimesheet();
  return updated;
}

async function publishScheduleWeek() {
  if (currentRole() !== "admin") return null;
  const start = scheduleWeekStartString();
  const shifts = readRecords("staffSchedule").filter((record) => !record.removed && record.status !== "Cancelled" && record.date >= start && record.date < addDays(start, 7));
  const now = new Date().toISOString();
  const publishedShifts = shifts.map((shift) => ({ ...shift, status: "Published", publishedAt: now, changedAfterPublish: false, weekStart: start }));
  // Timesheet efficiency: publish the week's shift-status updates in one save, then keep the publish notification event separate.
  await sendPayloadBatch(publishedShifts);
  const publishRecord = await saveAndNotify({
    type: "schedulePublish",
    id: \`schedulePublish-\${start}\`,
    submittedAt: now,
    weekStart: start,
    weekEnd: addDays(start, 6),
    status: "Published",
    publishedAt: now,
    publishedBy: currentUser?.name || "Admin",
    shiftCount: shifts.length,
  }, "schedulePublished");
  renderTimesheet();
  return publishRecord;
}

function copiedLastWeekScheduleRecords(start = scheduleWeekStartString()) {
  const previousStart = addDays(start, -7);
  const previous = readRecords("staffSchedule").filter((record) => !record.removed && record.status !== "Cancelled" && record.date >= previousStart && record.date < start);

  return previous.map((shift) => scheduleShiftRecordFromParts({
    ...shift,
    id: uid("staffSchedule"),
    submittedAt: new Date().toISOString(),
    date: addDays(shift.date, 7),
    weekStart: start,
    status: "Draft",
    publishedAt: "",
    changedAfterPublish: false,
  }));
}

function copyLastWeekPreviewFormHtml(records = copiedLastWeekScheduleRecords()) {
  const hasBlocking = records.some((record) => scheduleConflictReportForShift(record).blocking.length);
  return '<form id="copyLastWeekConfirmForm" class="tracker-form">' +
    encodedScheduleRecordsInput(records) +
    schedulePreviewHtml(records) +
    '<div class="button-row">' +
      '<button type="submit"' + (hasBlocking ? " disabled" : "") + '>Copy ' + records.length + ' Shift' + (records.length === 1 ? "" : "s") + '</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

function copyLastWeekSchedule() {
  if (!staffScheduleAdminRequired()) return;
  const records = copiedLastWeekScheduleRecords();
  showDetailDialog("Preview Copy Last Week", copyLastWeekPreviewFormHtml(records));
}

async function saveCopyLastWeekConfirmForm(formEl) {
  const records = JSON.parse(formEl.elements.recordsJson.value || "[]");
  const saved = await saveScheduleRecordsBatch(records);
  if (saved) {
    $("#detailDialog").close();
    showToast(saved.length + ' shift' + (saved.length === 1 ? "" : "s") + " copied from last week.");
  }
  return saved;
}

function duplicateScheduleShift(id = "") {
  if (!staffScheduleAdminRequired()) return;
  const shift = readRecords("staffSchedule").find((record) => record.id === id && !record.removed);
  if (!shift) return;
  openScheduleShiftPopup({
    ...shift,
    id: "",
    submittedAt: "",
    status: "Draft",
    publishedAt: "",
    changedAfterPublish: false,
    notes: shift.notes ? shift.notes + "\\nDuplicated from " + shift.date + "." : "Duplicated from " + shift.date + ".",
  });
}

function copyShiftToDaysFormHtml(shift = {}) {
  const start = scheduleWeekStartString(shift.date || scheduleWeekStartString());
  const dayOptions = scheduleWeekDates(start)
    .filter((date) => date !== shift.date)
    .map((date) => {
      const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      return '<label class="inline-check"><input type="checkbox" name="dates" value="' + escapeHtml(date) + '" /> ' + escapeHtml(label) + '</label>';
    }).join("");

  return '<form id="copyShiftDaysForm" class="tracker-form" data-id="' + escapeHtml(shift.id || "") + '">' +
    '<p>Copy ' + escapeHtml(shift.staffName || "this staff member") + ' ' + escapeHtml(formatShiftTime(shift)) + ' to selected days.</p>' +
    '<fieldset><legend>Copy to days</legend>' + dayOptions + '</fieldset>' +
    '<div class="button-row">' +
      '<button type="submit">Preview Copies</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

function openCopyShiftToDaysPopup(id = "") {
  if (!staffScheduleAdminRequired()) return;
  const shift = readRecords("staffSchedule").find((record) => record.id === id && !record.removed);
  if (!shift) return;
  showDetailDialog("Copy Shift to Days", copyShiftToDaysFormHtml(shift));
}

function copyShiftDaysRecordsFromForm(formEl) {
  const shift = readRecords("staffSchedule").find((record) => record.id === formEl.dataset.id && !record.removed);
  if (!shift) return [];
  return selectedDatesFromForm(formEl).map((date) => scheduleShiftRecordFromParts({
    ...shift,
    id: uid("staffSchedule"),
    submittedAt: new Date().toISOString(),
    date,
    status: "Draft",
    publishedAt: "",
    changedAfterPublish: false,
  }));
}

function copyDayScheduleFormHtml(sourceDate = scheduleWeekStartString()) {
  const start = scheduleWeekStartString(sourceDate);
  const sourceOptions = scheduleWeekDates(start).map((date) => {
    const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return '<option value="' + escapeHtml(date) + '"' + (date === sourceDate ? " selected" : "") + '>' + escapeHtml(label) + '</option>';
  }).join("");

  const destinationOptions = scheduleWeekDates(start)
    .filter((date) => date !== sourceDate)
    .map((date) => {
      const label = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      return '<label class="inline-check"><input type="checkbox" name="dates" value="' + escapeHtml(date) + '" /> ' + escapeHtml(label) + '</label>';
    }).join("");

  return '<form id="copyDayScheduleForm" class="tracker-form">' +
    '<label>Copy from day<select name="sourceDate">' + sourceOptions + '</select></label>' +
    '<fieldset><legend>Copy to days</legend>' + destinationOptions + '</fieldset>' +
    '<div class="button-row">' +
      '<button type="submit">Preview Copy Day</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

function openCopyDaySchedulePopup() {
  if (!staffScheduleAdminRequired()) return;
  showDetailDialog("Copy Day Schedule", copyDayScheduleFormHtml());
}

function copyDayScheduleRecordsFromForm(formEl) {
  const sourceDate = formEl.elements.sourceDate.value;
  const sourceShifts = staffScheduleRecords({ excludeCancelled: true }).filter((shift) => shift.date === sourceDate);
  return selectedDatesFromForm(formEl).flatMap((date) => sourceShifts.map((shift) => scheduleShiftRecordFromParts({
    ...shift,
    id: uid("staffSchedule"),
    submittedAt: new Date().toISOString(),
    date,
    status: "Draft",
    publishedAt: "",
    changedAfterPublish: false,
  })));
}

function scheduleCopyPreviewFormHtml(records = [], formId = "scheduleCopyConfirmForm") {
  const hasBlocking = records.some((record) => scheduleConflictReportForShift(record).blocking.length);
  return '<form id="' + escapeHtml(formId) + '" class="tracker-form">' +
    encodedScheduleRecordsInput(records) +
    schedulePreviewHtml(records) +
    '<div class="button-row">' +
      '<button type="submit"' + (hasBlocking ? " disabled" : "") + '>Save ' + records.length + ' Shift' + (records.length === 1 ? "" : "s") + '</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

async function saveScheduleCopyConfirmForm(formEl) {
  const records = JSON.parse(formEl.elements.recordsJson.value || "[]");
  const saved = await saveScheduleRecordsBatch(records);
  if (saved) {
    $("#detailDialog").close();
    showToast(saved.length + ' shift' + (saved.length === 1 ? "" : "s") + " copied.");
  }
  return saved;
}

function scheduleTemplates() {
  return readRecords("scheduleTemplate")
    .filter((record) => !record.removed)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function currentWeekTemplateShifts(includeStaffAssignments = true) {
  const start = scheduleWeekStartString();
  return staffScheduleRecordsForWeek(start).map((shift) => ({
    dayOffset: Math.max(0, scheduleWeekDates(start).indexOf(shift.date)),
    staffName: includeStaffAssignments ? shift.staffName || "" : "",
    staffEmail: includeStaffAssignments ? shift.staffEmail || "" : "",
    staffColor: includeStaffAssignments ? scheduleShiftStaffColorValue(shift) : "",
    staffColorUpdatedAt: includeStaffAssignments ? shift.staffColorUpdatedAt || "" : "",
    startTime: shift.startTime || "09:00",
    endTime: shift.endTime || "12:00",
    role: shift.role || "Kennel Care",
    location: shift.location || "",
    notes: shift.notes || "",
  }));
}

function scheduleTemplatesPopupHtml() {
  const templates = scheduleTemplates();
  const rows = templates.length
    ? templates.map((template) => '<article class="record-card compact-record-card">' +
      '<strong>' + escapeHtml(template.name || "Schedule Template") + '</strong>' +
      '<span>' + Number(template.shifts?.length || 0) + ' shift block' + (Number(template.shifts?.length || 0) === 1 ? "" : "s") + '</span>' +
      '<div class="record-actions">' +
        '<button type="button" class="secondary-button" data-action="apply-schedule-template" data-id="' + escapeHtml(template.id) + '">Apply to This Week</button>' +
        '<button type="button" class="secondary-button danger-button" data-action="delete-schedule-template" data-id="' + escapeHtml(template.id) + '">Delete</button>' +
      '</div>' +
    '</article>').join("")
    : "<p>No schedule templates saved yet.</p>";

  return '<section class="popup-record-section">' +
    '<h3>Saved Templates</h3>' +
    rows +
  '</section>' +
  '<form id="scheduleTemplateForm" class="tracker-form">' +
    '<h3>Save Current Week as Template</h3>' +
    '<label>Template name<input type="text" name="name" required placeholder="Normal Week" /></label>' +
    '<label class="inline-check"><input type="checkbox" name="includeStaffAssignments" checked /> Include staff assignments</label>' +
    '<div class="button-row">' +
      '<button type="submit">Save Template</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Close</button>' +
    '</div>' +
  '</form>';
}

function openScheduleTemplatesPopup() {
  if (!staffScheduleAdminRequired()) return;
  showDetailDialog("Schedule Templates", scheduleTemplatesPopupHtml());
}

async function saveScheduleTemplateFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const data = formPayload(formEl);
  const includeStaffAssignments = Boolean(formEl.elements.includeStaffAssignments?.checked);
  const record = {
    type: "scheduleTemplate",
    id: uid("scheduleTemplate"),
    submittedAt: new Date().toISOString(),
    name: data.name,
    createdAt: new Date().toISOString(),
    createdBy: currentUser?.name || helperName.value || "Admin",
    includeStaffAssignments,
    shifts: currentWeekTemplateShifts(includeStaffAssignments),
  };

  // Timesheet efficiency: templates store reusable shift blocks without rewriting existing staffSchedule records.
  await sendPayload(record);
  upsertRecord("scheduleTemplate", record);
  openScheduleTemplatesPopup();
  showToast("Schedule template saved.");
  return record;
}

function scheduleTemplateApplyRecords(template = {}, start = scheduleWeekStartString()) {
  return arrayValue(template.shifts).map((shift) => scheduleShiftRecordFromParts({
    staffName: shift.staffName || "Unassigned",
    staffEmail: shift.staffEmail || "",
    staffColor: shift.staffColor || "",
    staffColorUpdatedAt: shift.staffColorUpdatedAt || "",
    date: addDays(start, Number(shift.dayOffset || 0)),
    startTime: shift.startTime,
    endTime: shift.endTime,
    role: shift.role,
    location: shift.location,
    notes: shift.notes,
  }));
}

function openApplyScheduleTemplatePreview(id = "") {
  if (!staffScheduleAdminRequired()) return;
  const template = scheduleTemplates().find((item) => item.id === id);
  if (!template) return;
  const records = scheduleTemplateApplyRecords(template);
  showDetailDialog("Apply Template: " + (template.name || "Schedule Template"), scheduleCopyPreviewFormHtml(records, "applyScheduleTemplateConfirmForm"));
}

async function deleteScheduleTemplate(id = "") {
  if (!staffScheduleAdminRequired()) return null;
  const removed = await markRecordRemoved("scheduleTemplate", id);
  if (removed) {
    openScheduleTemplatesPopup();
    showToast("Schedule template deleted.");
  }
  return removed;
}

function currentShiftForStaff(staffEmailValue = "", atDate = new Date()) {
  const date = dateTimeLocalValue(atDate).slice(0, 10);
  const minutes = atDate.getHours() * 60 + atDate.getMinutes();
  return readRecords("staffSchedule")
    .filter((shift) => !shift.removed && shift.status !== "Cancelled" && normalizeEmail(shift.staffEmail) === normalizeEmail(staffEmailValue) && shift.date === date)
    .find((shift) => minutes >= timeToMinutes(shift.startTime) - 30 && minutes <= timeToMinutes(shift.endTime) + 30) || null;
}

var CLOCK_EXCEPTION_GRACE_MINUTES = 7;

function scheduleDateTime(date = "", time = "") {
  if (!date || !time) return null;
  const value = new Date(date + "T" + time);
  return Number.isFinite(value.getTime()) ? value : null;
}

function minutesBetweenDates(a, b) {
  const aTime = a instanceof Date ? a.getTime() : new Date(a).getTime();
  const bTime = b instanceof Date ? b.getTime() : new Date(b).getTime();
  if (!Number.isFinite(aTime) || !Number.isFinite(bTime)) return 0;
  return Math.round((aTime - bTime) / 60000);
}

function nearestShiftForStaff(staffEmailValue = "", atDate = new Date()) {
  const date = dateTimeLocalValue(atDate).slice(0, 10);
  const normalized = normalizeEmail(staffEmailValue);
  const shifts = readRecords("staffSchedule")
    .filter((shift) => !shift.removed && shift.status !== "Cancelled")
    .filter((shift) => normalizeEmail(shift.staffEmail) === normalized && shift.date === date);

  return shifts
    .map((shift) => {
      const distances = [scheduleDateTime(shift.date, shift.startTime), scheduleDateTime(shift.date, shift.endTime)]
        .filter(Boolean)
        .map((value) => Math.abs(minutesBetweenDates(atDate, value)));
      return { shift, distance: distances.length ? Math.min(...distances) : Number.MAX_SAFE_INTEGER };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.shift || null;
}

function clockInExceptionForShift(shift = null, atDate = new Date()) {
  if (!shift) return { type: "Unscheduled clock-in", varianceMinutes: 0, requiresReason: true };
  const start = scheduleDateTime(shift.date, shift.startTime);
  const varianceMinutes = minutesBetweenDates(atDate, start);
  if (varianceMinutes <= -CLOCK_EXCEPTION_GRACE_MINUTES) {
    return { type: "Early clock-in", varianceMinutes, requiresReason: false };
  }
  if (varianceMinutes >= CLOCK_EXCEPTION_GRACE_MINUTES) {
    return { type: "Late clock-in", varianceMinutes, requiresReason: false };
  }
  return { type: "", varianceMinutes, requiresReason: false };
}

function clockOutExceptionForShift(shift = null, atDate = new Date()) {
  if (!shift) return { type: "Unscheduled clock-out", varianceMinutes: 0, requiresReason: false };
  const end = scheduleDateTime(shift.date, shift.endTime);
  const varianceMinutes = minutesBetweenDates(atDate, end);
  if (varianceMinutes <= -CLOCK_EXCEPTION_GRACE_MINUTES) {
    return { type: "Early clock-out", varianceMinutes, requiresReason: false };
  }
  if (varianceMinutes >= CLOCK_EXCEPTION_GRACE_MINUTES) {
    return { type: "Late clock-out", varianceMinutes, requiresReason: false };
  }
  return { type: "", varianceMinutes, requiresReason: false };
}

function clockExceptionFormHtml(context = {}) {
  const shift = context.shift || {};
  const isClockOut = context.mode === "out";
  const exception = context.exception || {};
  const title = exception.type || (isClockOut ? "Clock-out" : "Clock-in");
  const reasonRequired = exception.requiresReason ? "required" : "";
  const shiftText = shift.id
    ? (shift.staffName || "Staff") + " | " + shift.date + " | " + formatShiftTime(shift) + " | " + [shift.role, shift.location].filter(Boolean).join(" | ")
    : "No scheduled shift found.";

  return '<form id="clockExceptionForm" class="tracker-form" ' +
    'data-mode="' + escapeHtml(context.mode || "in") + '" ' +
    'data-record-id="' + escapeHtml(context.recordId || "") + '" ' +
    'data-shift-id="' + escapeHtml(shift.id || "") + '" ' +
    'data-exception-type="' + escapeHtml(exception.type || "") + '" ' +
    'data-variance-minutes="' + escapeHtml(String(exception.varianceMinutes || 0)) + '">' +
    '<p><strong>' + escapeHtml(title) + '</strong></p>' +
    '<p>' + escapeHtml(shiftText) + '</p>' +
    (exception.type ? '<p class="service-warning-text">' + escapeHtml(exception.type + (exception.varianceMinutes ? " (" + exception.varianceMinutes + " minutes)" : "")) + '</p>' : "") +
    '<label>Reason ' + (reasonRequired ? "<small>Required</small>" : "<small>Optional</small>") +
      '<textarea name="reason" rows="3" ' + reasonRequired + ' placeholder="Reason for unscheduled, early, or late clock action"></textarea>' +
    '</label>' +
    '<div class="button-row">' +
      '<button type="submit">' + (isClockOut ? "Confirm Clock Out" : "Confirm Clock In") + '</button>' +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    '</div>' +
  '</form>';
}

function openClockExceptionPopup(context = {}) {
  showDetailDialog(context.mode === "out" ? "Confirm Clock Out" : "Confirm Clock In", clockExceptionFormHtml(context));
}

function timesheetExceptionSummary(record = {}) {
  return [
    record.clockInException,
    record.clockOutException,
    record.scheduleException,
  ].filter(Boolean).join(" | ");
}

function timesheetStaffTotalsHtml(records = []) {
  const isAdmin = currentRole() === "admin";
  const totals = records.reduce((memo, record) => {
    const staff = record.helperName || "Unassigned staff";
    memo[staff] = (memo[staff] || 0) + Number(record.hours || 0);
    return memo;
  }, {});
  const entries = Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return "";
  return '<div class="timesheet-popup-totals">' + entries.map(([staff, hours]) => (
    '<div><strong>' + escapeHtml(isAdmin ? staff : "Your total") + '</strong><span>' + hours.toFixed(2) + ' hours</span></div>'
  )).join("") + '</div>';
}

function timesheetViewPopupHtml(range = timesheetSelectedRange()) {
  const records = timesheetRecordsForRange(range);
  const label = timesheetRangeLabel(range) || "selected date range";
  const totalHours = sumHours(records).toFixed(2);
  const rows = records.length
    ? records.map((record) => (
      '<tr><td>' + escapeHtml(timesheetRecordDate(record) || record.date || "") + '</td><td>' + escapeHtml(record.helperName || "") + '</td><td>' + formatDateTime(record.clockInTime) + '</td><td>' + formatDateTime(record.clockOutTime) + '</td><td>' + Number(record.hours || 0).toFixed(2) + '</td><td>' + escapeHtml(record.note || "") + '</td></tr>'
    )).join("")
    : '<tr><td colspan="6">No time entries for this date range.</td></tr>';
  return '<section class="timesheet-popup-summary"><div class="timesheet-popup-meta"><span>Date range</span><strong>' + escapeHtml(label) + '</strong></div><div class="timesheet-popup-meta"><span>Total hours</span><strong>' + escapeHtml(totalHours) + '</strong></div></section>' +
    timesheetStaffTotalsHtml(records) +
    '<div class="table-wrap timesheet-popup-table"><table class="data-table"><thead><tr><th>Date</th><th>Staff</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function openTimesheetViewPopup() {
  const range = timesheetSelectedRange();
  showDetailDialog("View Timesheet", timesheetViewPopupHtml(range));
}

function exportTimesheet() {
  const range = timesheetSelectedRange();
  const rows = timesheetRecordsForRange(range).map((record) => ({
    date: record.date || "",
    staff: record.helperName || "",
    clockIn: formatDateTime(record.clockInTime),
    clockOut: formatDateTime(record.clockOutTime),
    hours: Number(record.hours || 0).toFixed(2),
    note: record.note || "",
  }));
  downloadCsv(\`timesheet-\${range.start}-to-\${range.end}.csv\`, rows);
}

function scheduleAppResumeRecovery(reason = "resume") {
  if (appResumeTimer) window.clearTimeout(appResumeTimer);
  appResumeTimer = window.setTimeout(() => {
    appResumeTimer = null;
    resumeAppFromLifecycle(reason);
  }, 150);
}
//# sourceURL=snuggle-stay/timesheet.js
`;
(0, eval)(__snuggleStayModuleSource);
