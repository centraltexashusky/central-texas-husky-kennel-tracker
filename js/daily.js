// === MODULE: DAILY ===
const __snuggleStayModuleSource = `function careDueFromDate(lastDate, intervalDays, date = todayDate()) {
  if (Number(intervalDays || 0) <= 0) return false;
  if (!lastDate) return true;
  const days = daysBetweenDates(lastDate, date);
  return days === null ? false : days >= intervalDays;
}

function ownedDogExerciseDue(record, date = todayDate()) {
  const dog = normalizeOwnedDogCare(record);
  return careDueFromDate(dog.lastExerciseDate, dog.exerciseFrequencyDays, date);
}

function ownedDogTrainingDue(record, date = todayDate()) {
  const dog = normalizeOwnedDogCare(record);
  return careDueFromDate(dog.lastTrainingDate, dog.trainingFrequencyDays, date);
}

function ownedDogBathDue(record, date = todayDate()) {
  const dog = normalizeOwnedDogCare(record);
  if (Number(dog.bathIntervalDays || 0) <= 0) return false;
  if (dog.nextBath) return dateOnlyTime(dog.nextBath) <= dateOnlyTime(date);
  return careDueFromDate(dog.lastBath, dog.bathIntervalDays, date);
}

function ownedDogHeatStatus(record, date = todayDate()) {
  const dog = normalizeOwnedDogCare(record);
  if (dog.sex !== "Female") return { state: "not-applicable", label: "Not applicable", inHeat: false, expectedSoon: false, overdue: false };
  const daysToNext = dog.nextHeat ? daysBetweenDates(date, dog.nextHeat) : null;
  const daysSinceLast = dog.lastHeat ? daysBetweenDates(dog.lastHeat, date) : null;
  const explicit = String(dog.heatCycleStatus || "").toLowerCase();
  const inHeat = explicit === "in heat" || (daysSinceLast !== null && daysSinceLast >= 0 && daysSinceLast <= careDefaults.heatInHeatDays);
  const expectedSoon = !inHeat && daysToNext !== null && daysToNext >= 0 && daysToNext <= careDefaults.heatExpectedSoonDays;
  const overdue = !inHeat && daysToNext !== null && daysToNext < 0;
  if (inHeat) return { state: "in-heat", label: "In heat", inHeat, expectedSoon, overdue };
  if (expectedSoon) return { state: "expected-soon", label: \`Expected in \${daysToNext} day\${daysToNext === 1 ? "" : "s"}\`, inHeat, expectedSoon, overdue };
  if (overdue) return { state: "overdue", label: "Heat overdue", inHeat, expectedSoon, overdue };
  if (!dog.lastHeat && !dog.nextHeat) return { state: "unknown", label: "Heat dates missing", inHeat, expectedSoon, overdue };
  return { state: "clear", label: "No heat alert", inHeat, expectedSoon, overdue };
}

function ownedDogDisplayName(record = {}) {
  return record.callName || record.showName || record.dogName || "Dog";
}

function ownedDogCareSummary(record = {}, date = todayDate()) {
  const parts = [];
  if (ownedDogExerciseDue(record, date)) parts.push("Exercise due");
  if (ownedDogTrainingDue(record, date)) parts.push("Training due");
  if (ownedDogBathDue(record, date)) parts.push("Bath due");
  const heat = ownedDogHeatStatus(record, date);
  if (heat.inHeat) parts.push("In heat");
  else if (heat.expectedSoon || heat.overdue) parts.push("Heat expected");
  if (record.careStatus) parts.push(record.careStatus);
  return parts.join(", ") || "Current";
}

function ownedDogCareAlertNotes(record = {}) {
  const seen = new Set();
  return [record.medicalCareNotes, record.specialCare, record.generalCareNotes]
    .map((note) => String(note || "").trim())
    .filter((note) => {
      const key = note.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\\n\\n");
}

function ownedDogHasCareNote(record = {}) {
  return Boolean(ownedDogCareAlertNotes(record) || record.careStatus);
}

function ownedDogVaccineReviewItems(record = {}, referenceDate = todayDate()) {
  return ownedLoggedVaccinationConfig.map((loggedConfig, index) => {
    const dueConfig = ownedHealthDueConfig[index] || {};
    const loggedDate = dateOnly(record[loggedConfig.field]);
    const dueDate = dateOnly(record[dueConfig.field]);
    if (!loggedDate) {
      return { field: loggedConfig.field, label: \`No \${loggedConfig.label} Logged\`, className: "is-red-warning" };
    }
    if (!dueDate) {
      return { field: dueConfig.field, label: \`\${loggedConfig.label} renewal date missing\`, className: "is-red-warning" };
    }
    const days = daysBetweenDates(referenceDate, dueDate);
    if (days === null || days > 30) return null;
    return {
      field: dueConfig.field,
      dueDate,
      days,
      label: ownedHealthDueText(loggedConfig.label, days, true),
      className: days < 0 ? "is-red-warning" : "is-orange-warning",
    };
  }).filter(Boolean);
}

function ownedDogNeedsVaccineReview(record = {}, referenceDate = todayDate()) {
  return ownedDogVaccineReviewItems(record, referenceDate).length > 0;
}

function ownedDogMatchesCareFilter(record = {}, filter = ownedDogCareFilter, date = todayDate()) {
  const heat = ownedDogHeatStatus(record, date);
  if (filter === "Exercise Due") return ownedDogExerciseDue(record, date);
  if (filter === "Training Due") return ownedDogTrainingDue(record, date);
  if (filter === "Bath Due") return ownedDogBathDue(record, date);
  if (filter === "Females") return record.sex === "Female";
  if (filter === "Males") return record.sex === "Male";
  if (filter === "Vaccine") return ownedDogNeedsVaccineReview(record, date);
  if (filter === "Heat Watch") return record.sex === "Female" && (heat.inHeat || heat.expectedSoon || heat.overdue || heat.state === "unknown");
  if (filter === "Special Care") return ownedDogHasCareNote(record);
  return true;
}

function ownedDogSpecialCareInfoHtml() {
  const rows = [
    ["Medical / care alert notes", "Any saved medication, medical, behavior, handling, feeding, coat-care, or other instruction that staff should review."],
    ["Care status", "Care status set to Special Care, Medical Watch, Recovery, Behavior Watch, or Heat Watch."],
  ];
  return '<p>Dogs appear under Special Care when any of these are saved on the dog record:</p>' +
    '<div class="detail-list">' + rows.map(([label, value]) => '<div class="detail-row"><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value) + '</span></div>').join("") + '</div>';
}

function openOwnedDogSpecialCareInfo() {
  showDetailDialog("Special Care Alerts", ownedDogSpecialCareInfoHtml());
}

function taskTemplateId(shift, text, index) {
  return \`\${shift}-\${index}-\${String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "task"}\`;
}

function taskTemplatePayload(config = readTaskConfig()) {
  const timestamp = new Date().toISOString();
  return {
    type: TASK_TEMPLATE_RECORD_TYPE,
    id: TASK_TEMPLATE_RECORD_ID,
    submittedAt: timestamp,
    updatedAt: timestamp,
    templateName: "Daily Tasks",
    config: normalizeTaskConfig(config),
  };
}

function taskTemplateRecordFromRows(rows = []) {
  return (rows || [])
    .filter((row) => row?.type === TASK_TEMPLATE_RECORD_TYPE && row.payload)
    .map((row) => ({
      ...row.payload,
      updatedAt: row.payload.updatedAt || row.updated_at || row.submitted_at || "",
    }))
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0))[0] || null;
}

function taskInputName(shift) {
  const names = {
    morning: "dailyTasks",
    pm: "pmTasks",
    weekly: "weeklyTasks",
    tuesday: "tuesdayTasks",
    monthly: "monthlyTasks",
  };
  return names[shift] || "";
}

function taskTabMeta(config = readTaskConfig()) {
  const removedTabs = new Set(config._removedTabs || []);
  const tabs = [...defaultTaskTabMeta.filter((tab) => !removedTabs.has(tab.id)), ...(config._tabs || [])];
  const tabMap = new Map(tabs.map((tab) => [tab.id, tab]));
  const ordered = normalizeTaskTabOrder(config._tabOrder, tabs).map((tabId) => tabMap.get(tabId)).filter(Boolean);
  const orderedIds = new Set(ordered.map((tab) => tab.id));
  return [...ordered, ...tabs.filter((tab) => !orderedIds.has(tab.id))];
}

function taskTabLabel(shift = "") {
  return taskTabMeta().find((tab) => tab.id === shift)?.label || taskShiftLabels[shift] || shift;
}

function taskKey(shift, taskId) {
  return \`\${shift}:\${taskId}\`;
}

function dailyTaskRecordId(date = currentDailyDate()) {
  return \`dailyTask-\${date}\`;
}

function dailyTaskRecordsForDate(date = currentDailyDate()) {
  return readRecords("dailyTask")
    .filter((record) => !record.removed && dailySubmissionDate(record) === date)
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
}

function dailyTaskRecordForDate(date = currentDailyDate()) {
  const records = dailyTaskRecordsForDate(date);
  return records.find((record) => record.id === dailyTaskRecordId(date)) || records[0] || null;
}

function dailyTaskCompletionIndex(date = currentDailyDate()) {
  const index = new Map();
  const config = readTaskConfig();
  completedTasksForDate(date).forEach((completion) => {
    if (completion.taskId) index.set(taskKey(completion.shift, completion.taskId), completion);
    const matchingTask = (config[completion.shift] || []).find((task) => task.text === completion.taskText);
    if (matchingTask) index.set(taskKey(completion.shift, matchingTask.id), completion);
  });
  return index;
}

function taskArraysFromCompletions(completedTasks = []) {
  const byShift = { dailyTasks: [], pmTasks: [], weeklyTasks: [], tuesdayTasks: [], monthlyTasks: [] };
  completedTasks.forEach((completion) => {
    const name = taskInputName(completion.shift);
    if (name && byShift[name] && completion.taskText && !byShift[name].includes(completion.taskText)) byShift[name].push(completion.taskText);
  });
  return byShift;
}

function dailyWorkPayload(date = currentDailyDate(), updates = {}) {
  const existing = dailyTaskRecordForDate(date) || {};
  const now = new Date().toISOString();
  const completedTasks = updates.completedTasks || completedTasksForDate(date);
  const structuredCareLogs = updates.structuredCareLogs || structuredCareLogsForDate(date);
  const boardingTaskGroups = upcomingBoardingTaskGroups();
  const taskArrays = taskArraysFromCompletions(completedTasks);
  const dayName = new Date(\`\${date}T12:00:00\`).toLocaleDateString("en-US", { weekday: "long" });
  return {
    ...existing,
    type: "dailyTask",
    id: existing.id || dailyTaskRecordId(date),
    submittedAt: existing.submittedAt || now,
    updatedAt: now,
    date,
    helperName: "Team completed work",
    helperEmail: "",
    helperKey: "",
    dayOfWeek: dayName,
    completedTasks,
    ...taskArrays,
    structuredCareLogs,
    careLogs: structuredCareLogs,
    careSummary: {
      total: structuredCareLogs.length,
      dogsLogged: new Set(structuredCareLogs.map((log) => log.dogId).filter(Boolean)).size,
      alerts: structuredCareLogs.filter((log) => /heat|medical|behavior/i.test(log.careType || "")).length,
    },
    monthlyDeepCleanBuilding: taskArrays.monthlyTasks.length ? getDeepCleanBuilding(date) : existing.monthlyDeepCleanBuilding || "",
    boardingTaskGroups,
    boardingTasks: boardingTaskTextFromGroups(boardingTaskGroups),
  };
}

function taskLabel(task, shift) {
  const canManageTasks = currentRole() === "admin";
  const taskText = escapeHtml(task.text);
  const completed = dailyTaskCompletionIndex(currentDailyDate()).get(taskKey(shift, task.id));
  if (completed && showRemainingTasksOnly) return "";
  const adminTools =
    canManageTasks
      ? \`<span class="task-admin-tools"><span class="task-drag-handle" aria-hidden="true">Drag</span><button type="button" class="secondary-button task-edit-button" data-action="open-edit-task" data-shift="\${shift}" data-id="\${task.id}">Edit</button><button type="button" class="remove-task-button" data-action="remove-task" data-shift="\${shift}" data-id="\${task.id}" title="Remove task" aria-label="Remove task"><span aria-hidden="true">&times;</span></button></span>\`
      : "";
  const completedMeta = completed ? \`<span class="task-completed-meta">Completed by \${escapeHtml(completed.completedBy || "staff")} at \${escapeHtml(formatDateTime(completed.completedAt))}</span>\` : "";
  return \`<div class="task-item \${completed ? "is-complete" : ""}" draggable="\${canManageTasks && !completed}" data-shift="\${shift}" data-id="\${task.id}"><span class="task-text">\${taskText}</span>\${completedMeta}<button type="button" class="task-done-button" data-action="complete-task" data-shift="\${shift}" data-id="\${task.id}" data-task-text="\${taskText}" \${completed ? "disabled" : ""}>\${completed ? "Done" : "Done"}</button>\${adminTools}</div>\`;
}

function dailyTaskEditFormHtml(shift = "", task = {}) {
  return \`<form id="dailyTaskEditForm" class="tracker-form compact-task-edit-form" data-shift="\${escapeHtml(shift)}" data-id="\${escapeHtml(task.id || "")}">
    <label>Task text<input type="text" name="taskText" value="\${escapeHtml(task.text || "")}" maxlength="240" required autocomplete="off" /></label>
    <div class="button-row"><button type="submit">Update</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openDailyTaskEditPopup(shift = "", id = "") {
  if (currentRole() !== "admin") return;
  const task = readTaskConfig()[shift]?.find((item) => item.id === id);
  if (!task) {
    showToast("This task could not be found.");
    return;
  }
  showDetailDialog("Edit task", dailyTaskEditFormHtml(shift, task));
  window.requestAnimationFrame(() => {
    const input = $("#dailyTaskEditForm")?.elements?.taskText;
    input?.focus();
    input?.select();
  });
}

function ownedDogOptionsHtml(selectedId = "") {
  const dogs = readRecords("ownedDog")
    .filter((dog) => !dog.removed && (dog.callName || dog.showName))
    .sort((a, b) => String(ownedDogDisplayName(a)).localeCompare(String(ownedDogDisplayName(b))));
  return [
    \`<option value="">Select Our Dog</option>\`,
    ...dogs.map((dog) => \`<option value="\${escapeHtml(dog.id)}" \${String(selectedId) === String(dog.id) ? "selected" : ""}>\${escapeHtml(ownedDogDisplayName(dog))}</option>\`),
  ].join("");
}

function careLogEditFormHtml(log = {}) {
  return \`<form id="careLogEditForm" class="tracker-form" data-id="\${escapeHtml(log.id || "")}">
    <div class="field-grid">
      <label>Date<input type="date" name="date" value="\${escapeHtml(log.date || todayDate())}" required /></label>
      <label>Minutes<input type="number" name="minutes" min="0" value="\${escapeHtml(log.minutes || "")}" /></label>
    </div>
    <label>Care note<textarea name="note" rows="4">\${escapeHtml(log.note || "")}</textarea></label>
    \${mediaLinkHtml(log)}
    <div class="button-row"><button type="submit">Update</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function careTypeIsExercise(careType = "") {
  return ["Treadmill", "Scooter", "Yard Run"].includes(careType);
}

async function removeDailyCareLog(logId) {
  const date = currentDailyDate();
  const target = structuredCareLogsForDate(date).find((log) => log.id === logId);
  if (!target || !canModifyCareLog(target)) {
    showToast("Only admins or the staff member who logged this can remove it.");
    return;
  }
  const structuredCareLogs = structuredCareLogsForDate(date).filter((log) => log.id !== logId);
  await saveDailyWorkPayload(dailyWorkPayload(date, { structuredCareLogs }));
  showToast("Care log removed from today's completed work.");
}

async function updateDailyCareLog(logId, updates = {}) {
  const date = currentDailyDate();
  const logs = structuredCareLogsForDate(date);
  const target = logs.find((log) => log.id === logId);
  if (!target || !canModifyCareLog(target)) {
    showToast("Only admins or the staff member who logged this can edit it.");
    return null;
  }
  const updatedLog = { ...target, ...updates, updatedAt: new Date().toISOString() };
  if (updatedLog.date && updatedLog.date !== date) {
    await saveDailyWorkPayload(dailyWorkPayload(date, { structuredCareLogs: logs.filter((log) => log.id !== logId) }));
    await saveDailyWorkPayload(dailyWorkPayload(updatedLog.date, { structuredCareLogs: [updatedLog, ...structuredCareLogsForDate(updatedLog.date)] }));
    return updatedLog;
  }
  const structuredCareLogs = logs.map((log) => (log.id === logId ? updatedLog : log));
  await saveDailyWorkPayload(dailyWorkPayload(date, { structuredCareLogs }));
  return updatedLog;
}

function renderDailyTaskTabs(config = readTaskConfig()) {
  const tabs = $("#dailyTaskTabs");
  if (!tabs) return;
  const canDragTabs = adminTaskTabDragEnabled();
  const tabButtons = taskTabMeta(config)
    .map((tab) => \`<button type="button" data-task-tab="\${escapeHtml(tab.id)}" role="tab" aria-selected="false" \${canDragTabs ? 'draggable="true" title="Drag to reorder tab"' : ""}>\${escapeHtml(tab.label)}</button>\`)
    .join("");
  const addButton = currentRole() === "admin" ? \`<button type="button" class="secondary-button task-add-tab-button" data-action="add-task-tab">Add Tab</button>\` : "";
  tabs.innerHTML = \`\${tabButtons}\${addButton}\`;
}

function adminTaskTabDragEnabled() {
  return currentRole() === "admin"
    && window.matchMedia("(min-width: 900px)").matches;
}

function taskTabDropPositionFromEvent(event, targetButton) {
  if (!targetButton || typeof event.clientX !== "number") return "before";
  const rect = targetButton.getBoundingClientRect();
  return event.clientX > rect.left + rect.width / 2 ? "after" : "before";
}

function taskTabButtonFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.("#dailyTaskTabs [data-task-tab]") || null;
}

function resetDailyTaskTabPointerDrag() {
  dailyTaskTabPointerDrag?.sourceButton?.classList.remove("is-dragging");
  dailyTaskTabPointerDrag = null;
  document.body.classList.remove("is-task-tab-dragging");
  clearTaskTabDragTargets();
}

function taskTabDeleteRowHtml(tab = {}) {
  if (currentRole() !== "admin" || !tab.id) return "";
  return \`<div class="button-row task-tab-delete-row" data-task-tab-delete-row><button type="button" class="secondary-button danger-button task-delete-tab-button" data-action="remove-task-tab" data-task-tab-id="\${escapeHtml(tab.id)}">Delete Tab</button></div>\`;
}

function customTaskPanelHtml(tab = {}, tasks = []) {
  const description = String(tab.description || "").trim();
  return \`<section class="form-section collapsible-section" data-task-panel="\${escapeHtml(tab.id)}" data-custom-task-panel data-collapsible-section hidden>
    <div class="section-heading">
      <span>\${escapeHtml((tab.label || "C").slice(0, 1).toUpperCase())}</span>
      <div>
        <h2>\${escapeHtml(tab.label)} Tasks</h2>
        \${description ? \`<p>\${escapeHtml(description)}</p>\` : ""}
      </div>
      <button type="button" class="secondary-button section-toggle-button" data-action="toggle-section">Minimize</button>
    </div>
    <div class="section-body">
      <div class="checklist managed-task-list" data-custom-task-list data-shift="\${escapeHtml(tab.id)}">\${tasks.map((task) => taskLabel(task, tab.id)).join("")}</div>
      <div class="admin-task-controls" \${currentRole() === "admin" ? "" : "hidden"}>
        <input type="text" data-custom-task-input="\${escapeHtml(tab.id)}" placeholder="Add a task to \${escapeHtml(tab.label)}" />
        <button type="button" data-action="add-custom-tab-task" data-shift="\${escapeHtml(tab.id)}">Add Task</button>
        <span class="task-add-status" aria-live="polite"></span>
      </div>
      \${taskTabDeleteRowHtml(tab)}
    </div>
  </section>\`;
}

function dailyTaskDraftInputs() {
  return [
    $("#newTaskText"),
    $("#newPmTaskText"),
    $("#newWeeklyTaskText"),
    $("#newTuesdayTaskText"),
    $("#newMonthlyTaskText"),
    ...$$("[data-custom-task-input]"),
  ].filter(Boolean);
}

function dailyTaskDraftInputKey(input) {
  if (!input) return "";
  if (input.dataset?.customTaskInput) return \`custom:\${input.dataset.customTaskInput}\`;
  if (input.id) return \`id:\${input.id}\`;
  return "";
}

function renderDailyTaskLists(selected = {}) {
  const draftState = captureDailyTaskDraftState();
  const config = readTaskConfig();
  renderDailyTaskTabs(config);
  const staticLists = {
    morningTaskList: "morning",
    pmTaskList: "pm",
    weeklyTaskList: "weekly",
    tuesdayTaskList: "tuesday",
    monthlyTaskList: "monthly",
  };
  Object.entries(staticLists).forEach(([listId, shift]) => {
    const list = $(\`#\${listId}\`);
    if (!list) return;
    list.innerHTML = (config[shift] || []).map((task) => taskLabel(task, shift)).join("");
    bindTaskListInteractions(list);
  });
  parkTaskFilterToggle();
  renderCustomTaskPanels(config);
  syncStaticTaskTabDeleteRows(config);
  const canManageTasks = currentRole() === "admin";
  $("#dailyTaskAdminControls").hidden = !canManageTasks;
  $("#pmTaskAdminControls").hidden = !canManageTasks;
  $("#weeklyTaskAdminControls").hidden = !canManageTasks;
  $("#tuesdayTaskAdminControls").hidden = !canManageTasks;
  $("#monthlyTaskAdminControls").hidden = !canManageTasks;
  renderCareDogOptions();
  pendingStructuredCareLogs = structuredCareLogsForDate(currentDailyDate());
  renderStructuredCareLogs();
  setDailyTaskTab(dailyTaskTab);
  restoreDailyTaskDraftState(draftState);
  updateCompletionCount();
}

function setDailyTaskTab(tab = "morning") {
  const panels = $$('[data-task-panel]');
  if (!panels.length) return;
  const validTabs = taskTabMeta(readTaskConfig()).map((item) => item.id);
  dailyTaskTab = validTabs.includes(tab) ? tab : validTabs[0] || "";
  $$("#dailyTaskTabs [data-task-tab]").forEach((button) => {
    const active = button.dataset.taskTab === dailyTaskTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.taskPanel !== dailyTaskTab;
  });
  syncTaskFilterTogglePlacement();
}

function taskTabFormHtml() {
  return \`<form id="taskTabForm" class="tracker-form">
    <label>Tab name<input type="text" name="label" required placeholder="Example: Puppy room, Deep clean, Sunday" /></label>
    <label>Tab description<textarea name="description" required rows="3" placeholder="Example: Tasks for puppy room cleaning, play yard reset, or Sunday deep clean"></textarea></label>
    <div class="button-row"><button type="submit">Add Tab</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function taskTabRemoveConfirmHtml(tab = {}) {
  const tasks = readTaskConfig()[tab.id] || [];
  const tabType = tab.system ? "built-in tab" : "custom tab";
  return \`<div class="tracker-form">
    <article class="record-card compact-record-card danger-confirm-card">
      <strong>Remove \${escapeHtml(tab.label)}?</strong>
      <p>This removes the \${tabType} and \${tasks.length} saved task\${tasks.length === 1 ? "" : "s"} from the daily task template. Completed work history stays in the daily records.</p>
    </article>
    <div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-task-tab" data-task-tab-id="\${escapeHtml(tab.id)}">Confirm Remove</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </div>\`;
}

function setOwnedFormLocked(locked) {
  locked = false;
  const formEl = $("#ourDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (field.dataset?.ownedProfileTab) return;
    if (field.closest("#ownedDogFileList")) return;
    if (["editOwnedDogButton", "cancelOwnedDogEdit", "deleteOwnedDogButton", "ownedDogDocumentFiles", "uploadOwnedDogFilesButton"].includes(field.id)) return;
    field.disabled = locked;
  });
  $("#ownedDogPhotoPicker").disabled = false;
  $("#ownedDogSaveButton").hidden = false;
  $("#ownedDogSaveButton").textContent = formEl.elements.id.value ? "Update" : "Save Dog";
  $("#editOwnedDogButton").hidden = true;
  $("#deleteOwnedDogButton").hidden = !formEl.elements.id.value || currentRole() !== "admin";
  formEl.classList.toggle("is-readonly", locked);
}

function completedTaskGroupsForDisplay(completedTasks = []) {
  const groups = new Map();
  completedTasks.forEach((task) => {
    const completedBy = String(task.completedBy || "Staff").trim() || "Staff";
    const key = completedBy.toLowerCase();
    if (!groups.has(key)) groups.set(key, { completedBy, tasks: [] });
    groups.get(key).tasks.push(task);
  });
  return [...groups.values()].sort((a, b) => a.completedBy.localeCompare(b.completedBy));
}

function completedTasksGroupedHtml(completedTasks = []) {
  if (!completedTasks.length) return "";
  return \`<section class="popup-record-section daily-report-group-section"><h3>Completed tasks by staff</h3><div class="daily-report-groups">\${completedTaskGroupsForDisplay(completedTasks).map((group) => \`
    <article class="record-card compact-record-card daily-report-group-card">
      <strong>\${escapeHtml(group.completedBy)}</strong>
      <ul class="daily-report-group-list">\${group.tasks.map((task) => \`<li><span><b>\${escapeHtml(task.shiftLabel || taskTabLabel(task.shift))}</b> \${escapeHtml(task.taskText || "Task")}</span>\${task.completedAt ? \`<small>\${escapeHtml(formatDateTime(task.completedAt))}</small>\` : ""}</li>\`).join("")}</ul>
    </article>\`).join("")}</div></section>\`;
}

function boardingTaskGroupsForDisplay(record = {}) {
  if (Array.isArray(record.boardingTaskGroups) && record.boardingTaskGroups.length) {
    return record.boardingTaskGroups
      .map((group) => ({
        dogName: String(group.dogName || "Dog").trim() || "Dog",
        tasks: (Array.isArray(group.tasks) ? group.tasks : []).map((task) => String(task || "").trim()).filter(Boolean),
      }))
      .filter((group) => group.tasks.length);
  }
  const groups = new Map();
  const rows = Array.isArray(record.boardingTasks)
    ? record.boardingTasks
    : String(record.boardingTasks || "").split(/\\n+/);
  rows.map((row) => String(row || "").trim()).filter(Boolean).forEach((row) => {
    const match = row.match(/^(.+?)\\s+((?:drop-off|pick-up)\\s+scheduled\\b.*|bath\\s+requested\\b.*)$/i);
    const dogName = String(match?.[1] || "Other").trim() || "Other";
    const taskText = String(match?.[2] || row).trim();
    const key = dogName.toLowerCase();
    if (!groups.has(key)) groups.set(key, { dogName, tasks: [] });
    groups.get(key).tasks.push(taskText);
  });
  return [...groups.values()];
}

function boardingTasksGroupedHtml(record = {}) {
  const groups = boardingTaskGroupsForDisplay(record);
  if (!groups.length) return "";
  return \`<section class="popup-record-section daily-report-group-section"><h3>Boarding tasks by dog</h3><div class="daily-report-groups">\${groups.map((group) => \`
    <article class="record-card compact-record-card daily-report-group-card">
      <strong>\${escapeHtml(group.dogName)}</strong>
      <ul class="daily-report-group-list">\${group.tasks.map((task) => \`<li><span>\${escapeHtml(task)}</span></li>\`).join("")}</ul>
    </article>\`).join("")}</div></section>\`;
}

function dailyDetailHtml(record) {
  const careLogs = record.structuredCareLogs || record.careLogs || [];
  const completedTasks = completedTasksForRecord(record);
  const monthlyTasks = record.monthlyTasks || [];
  const completedHtml = completedTasksGroupedHtml(completedTasks);
  const careLogHtml = careLogs.length
    ? \`<section class="popup-record-section"><h3>Structured care logs</h3>\${careLogs.map((log) => \`<article class="record-card compact-record-card"><strong>\${escapeHtml(log.dogName || "Dog")} - \${escapeHtml(log.careType || log.category || "Care")}</strong><p>\${escapeHtml([log.minutes ? \`\${log.minutes} min\` : "", log.note || log.notes || ""].filter(Boolean).join(" | ") || "No extra details")}</p>\${mediaLinkHtml(log)}</article>\`).join("")}</section>\`
    : "";
  const monthlyTasksHtml = monthlyTasks.length
    ? \`<div class="detail-row"><strong>Monthly tasks</strong><span>\${escapeHtml(\`Building cleaned: \${monthlyDeepCleanBuildingForRecord(record)}\`)}<br>\${monthlyTasks.map(escapeHtml).join("<br>")}</span></div>\`
    : "";
  return \`
    \${completedHtml}
    \${monthlyTasksHtml}
    \${boardingTasksGroupedHtml(record)}
    \${careLogHtml}
  \`;
}

async function syncOwnedDogCareFromDailyReport(record) {
  const reportDate = record?.date;
  if (!record?.id || !reportDate) return;
  const dogUpdates = new Map();
  const ensureDog = (dogId) => {
    if (!dogId) return null;
    if (dogUpdates.has(dogId)) return dogUpdates.get(dogId);
    const dog = readRecords("ownedDog").find((item) => item.id === dogId && !item.removed);
    if (!dog) return null;
    const clean = removeGeneratedDogCare(dog, record.id);
    dogUpdates.set(dogId, clean);
    return clean;
  };

  const structuredBathDogIds = new Set((record.structuredCareLogs || record.careLogs || []).filter((log) => (log.careType || log.category) === "Bath").map((log) => String(log.dogId)));
  (record.dogsBathedIds || []).forEach((dogId) => {
    if (structuredBathDogIds.has(String(dogId))) return;
    const dog = ensureDog(String(dogId));
    if (!dog) return;
    const entry = generatedCareEntry(record, { id: \`legacy-bath-\${dogId}\`, date: reportDate, note: "Legacy daily bath entry.", completedBy: record.helperName }, "Bath");
    dog.bathHistory.unshift(entry);
    setIfNewer(dog, "lastBath", entry.date, "bathUpdatedFromDailyTaskId", record.id);
    dog.nextBath = nextBathFromFrequency(dog.lastBath, dog.bathIntervalDays || careDefaults.bathIntervalDays);
    dog.bathUpdatedFromDailyTaskDate = entry.date;
  });

  (record.structuredCareLogs || record.careLogs || []).forEach((log) => {
    const dog = ensureDog(log.dogId);
    if (!dog) return;
    const careType = log.careType || log.category || "";
    const date = dateOnly(log.date || reportDate) || reportDate;
    if (["Treadmill", "Scooter", "Yard Run"].includes(careType)) {
      const entry = generatedCareEntry(record, { ...log, date }, careType);
      dog.exerciseLogs.unshift(entry);
      setIfNewer(dog, "lastExerciseDate", date, "lastExerciseUpdatedFromDailyTaskId", record.id);
      return;
    }
    if (careType === "Training") {
      const entry = generatedCareEntry(record, { ...log, date }, "Training");
      dog.trainingLogs.unshift(entry);
      setIfNewer(dog, "lastTrainingDate", date, "lastTrainingUpdatedFromDailyTaskId", record.id);
      return;
    }
    if (careType === "Bath") {
      const entry = generatedCareEntry(record, { ...log, date }, "Bath");
      dog.bathHistory.unshift(entry);
      setIfNewer(dog, "lastBath", date, "bathUpdatedFromDailyTaskId", record.id);
      dog.nextBath = nextBathFromFrequency(dog.lastBath, dog.bathIntervalDays || careDefaults.bathIntervalDays);
      dog.bathUpdatedFromDailyTaskDate = date;
      return;
    }
    if (careType === "Heat Note") {
      if (dog.sex !== "Female") return;
      dog.heatHistory.unshift(generatedCareEntry(record, { ...log, date }, "Heat Note"));
      setIfNewer(dog, "lastHeat", date, "heatUpdatedFromDailyTaskId", record.id);
      dog.nextHeat = dog.lastHeat ? addDays(dog.lastHeat, dog.heatCycleLengthDays || careDefaults.heatCycleLengthDays) : "";
      return;
    }
    if (careType === "Medical/Behavior Note") {
      dog.careNotesHistory.unshift(generatedCareEntry(record, { ...log, date }, "Medical/Care"));
    }
  });

  for (const dog of dogUpdates.values()) {
    const saved = upsertRecord("ownedDog", dog);
    await sendPayload(saved);
    if (typeof syncOwnedDogBathTask === "function") {
      try {
        await syncOwnedDogBathTask(saved);
      } catch (error) {
        console.warn("Owned dog bath task sync failed after daily care update.", error);
      }
    }
  }
  if (dogUpdates.size) {
    renderOwnedDogs();
    renderCareDogOptions();
    const activeId = $("#ourDogForm")?.elements.id.value || "";
    const activeUpdate = activeId ? dogUpdates.get(activeId) : null;
    if (activeUpdate) {
      renderOwnedActivity(activeUpdate);
      renderOwnedDogFiles(activeUpdate);
    }
    showToast(\`\${dogUpdates.size} Our Dog care profile\${dogUpdates.size === 1 ? "" : "s"} updated.\`);
  }
}

function dailySubmissionDate(record = {}) {
  return dateOnly(record.date || record.submittedAt || record.updatedAt);
}

function dailySubmissionDisplayPriority(record = {}) {
  if (record.isCalendarNoteSubmission) return 0;
  return 1;
}

function calendarNoteKind(note = {}) {
  return note.noteKind === "staff" || note.source === "daily-staff-note" ? "staff" : "special";
}

function calendarNoteKindLabel(note = {}) {
  return calendarNoteKind(note) === "staff" ? "Staff Note" : "Special Note";
}

function calendarNoteGroupKey(note = {}) {
  return [calendarNoteDate(note), calendarNoteKind(note), staffNoteIdentityKey(note)].join("|");
}

function calendarNoteDisplayText(note = {}) {
  if (calendarNoteKind(note) === "special") {
    return specialNoteEntryText(note.note || "", note.updatedAt || note.submittedAt || new Date());
  }
  return note.note || "";
}

function groupedCalendarNotesForDisplay(notes = []) {
  const groups = new Map();
  [...notes]
    .sort((a, b) => new Date(a.updatedAt || a.submittedAt || 0) - new Date(b.updatedAt || b.submittedAt || 0))
    .forEach((note) => {
      const key = calendarNoteGroupKey(note);
      const displayText = calendarNoteDisplayText(note);
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          ...note,
          id: note.id,
          ids: [note.id].filter(Boolean),
          note: displayText,
          noteKind: calendarNoteKind(note),
        });
        return;
      }
      existing.ids.push(note.id);
      existing.note = [existing.note, displayText].filter(Boolean).join("\\n");
      existing.updatedAt = new Date(existing.updatedAt || existing.submittedAt || 0) > new Date(note.updatedAt || note.submittedAt || 0) ? existing.updatedAt : note.updatedAt;
    });
  return [...groups.values()]
    .map((note) => ({
      ...note,
      isGroupedCalendarNote: (note.ids || []).length > 1,
      isGroupedStaffNote: calendarNoteKind(note) === "staff" && (note.ids || []).length > 1,
      isGroupedSpecialNote: calendarNoteKind(note) === "special" && (note.ids || []).length > 1,
    }))
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
}

function ownedDogCareTagsHtml(record = {}) {
  const tags = [];
  if (ownedDogExerciseDue(record)) tags.push("Exercise due");
  if (ownedDogTrainingDue(record)) tags.push("Training due");
  if (ownedDogBathDue(record)) tags.push("Bath due");
  if (ownedDogHasCareNote(record)) tags.push("Special care");
  const alertItems = ownedDogRosterAlertItems(record);
  const tagHtml = [
    ...tags.map((tag) => statusChipHtml(tag)),
    ...alertItems.map((item) => statusChipHtml(item.label, "health-due-chip " + item.className)),
  ].join("");
  return tagHtml ? \`<div class="chip-row">\${tagHtml}</div>\` : "";
}

function ownedDogHeatAlertItem(record = {}, referenceDate = todayDate()) {
  const heat = ownedDogHeatStatus(record, referenceDate);
  if (heat.inHeat) return { label: "Female in heat", className: "heat-alert-chip is-red-warning" };
  if (heat.expectedSoon || heat.overdue) return { label: "Heat expected", className: "heat-alert-chip is-orange-warning" };
  return null;
}

function ownedDogRosterAlertItems(record = {}, referenceDate = todayDate()) {
  const heatItem = ownedDogHeatAlertItem(record, referenceDate);
  const heartwormItem = ownedDogHeartwormDueItem(record, referenceDate);
  return [
    ...(heatItem ? [heatItem] : []),
    ...ownedDogVaccineReviewItems(record, referenceDate),
    ...(heartwormItem ? [heartwormItem] : []),
  ];
}

function ownedDogRosterAlertChipsHtml(record = {}, referenceDate = todayDate()) {
  const items = ownedDogRosterAlertItems(record, referenceDate);
  return items.length
    ? '<div class="chip-row health-due-chip-row">' + items.map((item) => statusChipHtml(item.label, "health-due-chip " + item.className)).join("") + "</div>"
    : "";
}

function ownedDogHasRosterAlert(record = {}, referenceDate = todayDate()) {
  return ownedDogRosterAlertItems(record, referenceDate).length > 0;
}

function ownedDogMobileCardHtml(record = {}) {
  const dog = normalizeOwnedDogCare(record);
  const name = ownedDogDisplayName(dog) || "Dog";
  const photo = profilePhotoDirectSource(dog);
  const hasPhoto = profilePhotoHasSource(dog);
  const sexClass = dogPhotoSexClass(dog);
  const photoHtml = hasPhoto
    ? \`<button type="button" class="mobile-dog-photo-button \${escapeHtml(sexClass)}" data-action="view-owned-photo" data-id="\${escapeHtml(dog.id)}" aria-label="View \${escapeHtml(name)} photo"\${profilePhotoAccessAttrs(dog, "ownedDog")}><img\${photo ? \` src="\${escapeHtml(photo)}"\` : ""} alt="\${escapeHtml(name)}"\${photo ? "" : " hidden"} /><span data-profile-photo-initials\${photo ? " hidden" : ""}>\${escapeHtml(avatarText(name))}</span></button>\`
    : \`<button type="button" class="mobile-dog-photo-button mobile-dog-photo-initials \${escapeHtml(sexClass)}" data-action="view-owned-photo" data-id="\${escapeHtml(dog.id)}" aria-label="View \${escapeHtml(name)} profile">\${escapeHtml(avatarText(name))}</button>\`;
  const heatAction = dog.sex === "Female" ? \`<button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Heat Note" data-id="\${escapeHtml(dog.id)}">Heat Note</button>\` : "";
  const hasRosterAlert = ownedDogHasRosterAlert(dog);
  return \`
    <article class="record-card mobile-roster-card \${ownedDogExerciseDue(dog) || ownedDogTrainingDue(dog) || ownedDogBathDue(dog) || hasRosterAlert ? "has-care-due" : ""}" data-id="\${escapeHtml(dog.id)}">
      <div class="mobile-roster-card-main">
        \${photoHtml}
        <strong>\${escapeHtml(name)}</strong>
        <span>\${escapeHtml([dog.sex, ownedDogCareSummary(dog)].filter(Boolean).join(" | "))}</span>
        \${ownedDogCareTagsHtml(dog)}
      </div>
      <div class="quick-action-grid">
        <button type="button" class="secondary-button" data-action="view-owned" data-id="\${escapeHtml(dog.id)}">View Profile</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Treadmill" data-id="\${escapeHtml(dog.id)}">Treadmill</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Scooter" data-id="\${escapeHtml(dog.id)}">Scooter</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Yard Run" data-id="\${escapeHtml(dog.id)}">Yard Run</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Bath" data-id="\${escapeHtml(dog.id)}">Bath</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Training" data-id="\${escapeHtml(dog.id)}">Training</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Medical/Behavior Note" data-id="\${escapeHtml(dog.id)}">Medical/Behavior</button>
        \${heatAction}
        <button type="button" class="secondary-button" data-action="log-owned-care" data-id="\${escapeHtml(dog.id)}">Open Timeline</button>
      </div>
    </article>\`;
}

function ownedDogPhotoUploadDialogHtml(record = {}) {
  const name = ownedDogDisplayName(record) || "Dog";
  return \`
    <form id="ownedDogPhotoUploadForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}">
      <section class="quick-care-dog-summary mobile-photo-upload-summary">
        <div class="quick-care-dog-photo quick-care-dog-initials" id="ownedDogPhotoUploadInitials">\${escapeHtml(avatarText(name))}</div>
        <img class="quick-care-dog-photo" id="ownedDogPhotoUploadPreview" alt="\${escapeHtml(name)} photo preview" hidden />
        <div>
          <h3>\${escapeHtml(name)}</h3>
          <p>\${escapeHtml([record.sex, ownedDogCareSummary(record)].filter(Boolean).join(" | "))}</p>
        </div>
      </section>
      <label>Profile photo<input type="file" id="ownedDogMobilePhotoInput" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" required /></label>
      <div class="button-row"><button type="submit">Upload Photo</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>\`;
}

function openOwnedDogPhotoUploadPopup(record = {}) {
  showDetailDialog(\`\${ownedDogDisplayName(record) || "Dog"} Profile Photo\`, ownedDogPhotoUploadDialogHtml(record));
}

function renderOwnedDogMobileCards(records = []) {
  const container = $("#ownedDogMobileCards");
  if (!container) return;
  const mobileRecords = [...records].sort((a, b) => {
    const priority = (dog) => Number(ownedDogExerciseDue(dog)) + Number(ownedDogTrainingDue(dog)) + Number(ownedDogBathDue(dog)) + Number(ownedDogHeatStatus(dog).expectedSoon || ownedDogHeatStatus(dog).inHeat || ownedDogHeatStatus(dog).overdue);
    return priority(b) - priority(a) || ownedDogDisplayName(a).localeCompare(ownedDogDisplayName(b));
  });
  if (ownedDogCareFilter === "Special Care") {
    container.innerHTML = mobileRecords.length
      ? mobileRecords.map(ownedDogSpecialCareMobileCardHtml).join("")
      : \`<article class="record-card mobile-roster-card"><strong>No matching Special Care dogs</strong><p>Try a shorter search or another care filter.</p></article>\`;
    return;
  }
  container.innerHTML = mobileRecords.length
    ? mobileRecords.map(ownedDogMobileCardHtml).join("")
    : \`<article class="record-card mobile-roster-card"><strong>No matching dogs</strong><p>Try a shorter search or another care filter.</p></article>\`;
  hydrateProfilePhotoElements(container);
}

function ownedDogSpecialCareLogDate(log = {}) {
  return dateOnly(log.date || log.loggedAt || log.createdAt || log.updatedAt);
}

function ownedDogSpecialCareDateLabel(date = "") {
  const cleanDate = dateOnly(date);
  if (!cleanDate) return "No date";
  const parsed = new Date(cleanDate + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) return cleanDate;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ownedDogSpecialCareWeeklyLogs(record = {}, referenceDate = todayDate()) {
  const endDate = dateOnly(referenceDate) || todayDate();
  return ownedDogActivityLogs(record)
    .map((log) => ({ ...log, displayDate: ownedDogSpecialCareLogDate(log) }))
    .filter((log) => {
      const days = daysBetweenDates(log.displayDate, endDate);
      return days !== null && days >= 0 && days < 7;
    });
}

function ownedDogSpecialCareLogClass(log = {}) {
  const label = \`\${log.group || ""} \${log.type || ""}\`.toLowerCase();
  if (/medical|behavior|care/.test(label)) return "is-medical";
  if (/heat/.test(label)) return "is-heat";
  if (/bath/.test(label)) return "is-bath";
  if (/training/.test(label)) return "is-training";
  return "is-exercise";
}

function ownedDogSpecialCareDogBoxHtml(record = {}) {
  const dog = normalizeOwnedDogCare(record);
  const name = ownedDogDisplayName(dog) || "Dog";
  const meta = [dog.sex, dog.careStatus].filter(Boolean).join(" | ");
  const careAlert = ownedDogCareAlertNotes(dog) || (dog.careStatus ? \`Care status: \${dog.careStatus}\` : "Special care instructions need review.");
  return \`<div class="special-care-dog-box">
    <strong>\${escapeHtml(name)}</strong>
    \${meta ? \`<span>\${escapeHtml(meta)}</span>\` : ""}
    <div class="special-care-alert-note">
      <span>Special Care</span>
      <p>\${multilineHtml(careAlert)}</p>
    </div>
    <div class="record-actions special-care-dog-actions">
      <button type="button" class="secondary-button" data-action="view-owned" data-id="\${escapeHtml(dog.id)}">View</button>
      <button type="button" class="secondary-button" data-action="edit-owned" data-id="\${escapeHtml(dog.id)}">Edit</button>
      <button type="button" class="secondary-button" data-action="log-owned-care" data-id="\${escapeHtml(dog.id)}">Log Care</button>
    </div>
  </div>\`;
}

function ownedDogSpecialCareLogHtml(log = {}) {
  const type = log.type || log.group || "Care";
  const note = [log.minutes ? \`\${log.minutes} minutes\` : "", log.note || ""].filter(Boolean).join(" ");
  const byline = log.completedBy ? \`<span>Logged by \${escapeHtml(log.completedBy)}</span>\` : "";
  return \`<article class="special-care-log-entry">
    <time class="special-care-log-date" datetime="\${escapeHtml(log.displayDate || "")}">\${escapeHtml(ownedDogSpecialCareDateLabel(log.displayDate))}</time>
    <span class="special-care-log-type \${ownedDogSpecialCareLogClass(log)}">\${escapeHtml(type)}</span>
    <div class="special-care-log-note">
      <p>\${escapeHtml(note || "No note recorded.")}</p>
      \${byline}
      \${mediaLinkHtml(log)}
    </div>
  </article>\`;
}

function ownedDogSpecialCareLogsHtml(record = {}) {
  const logs = ownedDogSpecialCareWeeklyLogs(record);
  return logs.length
    ? \`<div class="special-care-log-list">\${logs.map(ownedDogSpecialCareLogHtml).join("")}</div>\`
    : \`<div class="special-care-empty-log">No dated health logs in the last 7 days. Use Log Care to add a health note.</div>\`;
}

function ownedDogSpecialCareMobileCardHtml(record = {}) {
  return \`
    <article class="record-card mobile-roster-card special-care-mobile-card" data-id="\${escapeHtml(record.id || "")}">
      \${ownedDogSpecialCareDogBoxHtml(record)}
      \${ownedDogSpecialCareLogsHtml(record)}
    </article>\`;
}

function renderOwnedDogSpecialCareTable(records = []) {
  $("#ownedDogTableHead").innerHTML = '<tr><th>Dog</th><th>Health logs - last 7 days</th></tr>';
  $("#ownedDogTableBody").innerHTML = records.length
    ? records.map((record) => \`<tr class="special-care-health-row" data-id="\${escapeHtml(record.id || "")}"><td class="special-care-dog-cell">\${ownedDogSpecialCareDogBoxHtml(record)}</td><td class="special-care-log-cell">\${ownedDogSpecialCareLogsHtml(record)}</td></tr>\`).join("")
    : '<tr><td colspan="2">No matching Special Care dogs. Try a shorter search or another care filter.</td></tr>';
}

function renderOwnedDogs() {
  const query = ($("#ownedDogSearch").value || "").trim();
  const isAdmin = currentRole() === "admin";
  const addButton = $("#addOwnedDogButton");
  if (addButton) addButton.hidden = !isAdmin;
  const allDogs = readRecords("ownedDog").filter((record) => !record.removed);
  const records = sortRecordsForTable("ownedDog", allDogs.filter((record) => query ? matches(record, query) : ownedDogMatchesCareFilter(record)));
  const columns = activeColumns("ownedDog");
  const isSpecialCareView = ownedDogCareFilter === "Special Care";
  $("#ownedDogTable")?.classList.toggle("is-special-care-table", isSpecialCareView);
  $("#ownedDogColumnManager").hidden = isSpecialCareView;
  const summary = {
    total: allDogs.length,
    exerciseDue: allDogs.filter((dog) => ownedDogExerciseDue(dog)).length,
    trainingDue: allDogs.filter((dog) => ownedDogTrainingDue(dog)).length,
    bathsDue: allDogs.filter((dog) => ownedDogBathDue(dog)).length,
    females: allDogs.filter((dog) => dog.sex === "Female").length,
    males: allDogs.filter((dog) => dog.sex === "Male").length,
    femalesInHeat: allDogs.filter((dog) => ownedDogHeatStatus(dog).inHeat).length,
    heatExpectedSoon: allDogs.filter((dog) => {
      const heat = ownedDogHeatStatus(dog);
      return heat.expectedSoon || heat.overdue;
    }).length,
    vaccineReview: allDogs.filter((dog) => ownedDogNeedsVaccineReview(dog)).length,
    specialCare: allDogs.filter((dog) => ownedDogHasCareNote(dog)).length,
  };
  if ($("#ownedDogSummary")) {
    $("#ownedDogSummary").innerHTML = "";
    $("#ownedDogSummary").hidden = true;
  }
  renderOwnedDogFilterCounts(summary);
  if (isSpecialCareView) {
    renderOwnedDogSpecialCareTable(records);
  } else {
    $("#ownedDogTableHead").innerHTML = \`<tr>\${columns.map((column) => \`<th data-sort-column="\${column.key}" data-table="ownedDog" data-column="\${column.key}" draggable="true" title="Drag to reorder. Double-click to sort.">\${escapeHtml(column.label)}</th>\`).join("")}<th>Actions</th></tr>\`;
    $("#ownedDogTableBody").innerHTML = records.length
      ? records
          .map((record) => {
            const heat = ownedDogHeatStatus(record);
            const hasRosterAlert = ownedDogHasRosterAlert(record);
            const rowClass = [
              ownedDogExerciseDue(record) || ownedDogTrainingDue(record) || ownedDogBathDue(record) || hasRosterAlert ? "has-care-due" : "",
              heat.inHeat ? "is-in-heat" : "",
            ].filter(Boolean).join(" ");
            return \`<tr data-id="\${record.id}" class="\${rowClass}">\${columns.map((column) => {
              const cellValue = escapeHtml(column.value(record));
              return \`<td>\${cellValue}\${column.key === "callName" ? ownedDogRosterAlertChipsHtml(record) : ""}</td>\`;
            }).join("")}<td><div class="record-actions table-actions">\${dogTypeBadgeHtml("ownedDog")}<button type="button" class="secondary-button" data-action="view-owned" data-id="\${escapeHtml(record.id)}">View</button><button type="button" class="secondary-button" data-action="edit-owned" data-id="\${escapeHtml(record.id)}">Edit</button><button type="button" class="secondary-button" data-action="log-owned-care" data-id="\${escapeHtml(record.id)}">Log Care</button></div></td></tr>\`;
          })
          .join("")
      : \`<tr><td colspan="\${(columns.length || 1) + 1}">No matching dogs. Use Add New Dog.</td></tr>\`;
  }
  renderOwnedDogMobileCards(records);
  if (!isSpecialCareView) renderColumnManager("ownedDog", "#ownedDogColumnManager");
  renderCareDogOptions();
}

function renderOwnedDogFilterCounts(summary = {}) {
  const counts = {
    All: summary.total || 0,
    "Exercise Due": summary.exerciseDue || 0,
    "Training Due": summary.trainingDue || 0,
    "Bath Due": summary.bathsDue || 0,
    Females: summary.females || 0,
    Males: summary.males || 0,
    Vaccine: summary.vaccineReview || 0,
    "Heat Watch": (summary.femalesInHeat || 0) + (summary.heatExpectedSoon || 0),
    "Special Care": summary.specialCare || 0,
  };
  $$("#ownedDogCareFilters [data-filter]").forEach((button) => {
    const base = button.dataset.baseLabel || button.dataset.filter || button.textContent.trim();
    button.dataset.baseLabel = base;
    const count = counts[base] || 0;
    button.textContent = count > 0 ? \`\${base} (\${count})\` : base;
  });
}

function setOwnedDogActiveTab(tabName = "Overview") {
  const tabs = $$("#ownedDogProfileTabs [data-owned-profile-tab]");
  const sections = $$(".owned-profile-section[data-owned-profile-section]");
  const availableTab = tabs.find((button) => button.dataset.ownedProfileTab === tabName && !button.disabled)?.dataset.ownedProfileTab || "Overview";
  tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.ownedProfileTab === availableTab));
  sections.forEach((section) => {
    section.hidden = section.dataset.ownedProfileSection !== availableTab;
  });
}

function syncOwnedDogTabAvailability(record = activeOwnedDog() || {}) {
  const sex = $("#ownedDogSex")?.value || record.sex || "";
  const female = sex === "Female";
  syncDogPhotoSexClass($("#ownedDogPhotoPicker"), { ...record, sex });
  const heatButton = $('#ownedDogProfileTabs [data-owned-profile-tab="Heat Cycle"]');
  if (heatButton) heatButton.disabled = !female;
  if ($("#ownedMaleHeatNote")) $("#ownedMaleHeatNote").hidden = female;
  if (!female && heatButton?.classList.contains("is-active")) setOwnedDogActiveTab("Overview");
  updateOwnedDogConditionalFields();
}

function openOwnedDog(record = {}) {
  if (!record?.id && currentRole() !== "admin") {
    showToast("Admin access required to add a new dog.");
    return;
  }
  const ownedDogDetail = $("#ownedDogDetail");
  if (ownedDogDetail.parentElement !== document.body) {
    document.body.appendChild(ownedDogDetail);
  }
  ownedDogDetail.hidden = false;
  if (typeof pushAppSurfaceHistory === "function") pushAppSurfaceHistory("owned-dog-modal");
  document.body.classList.add("owned-dog-modal-open");
  ownedDogDetail.scrollTop = 0;
  selectedDogPhotos.owned = null;
  $("#ownedDogDetailTitle").textContent = record.id ? \`Edit \${record.callName || "Dog"}\` : "Add New Dog";
  $("#ourDogForm").reset();
  const normalized = normalizeOwnedDogCare(record);
  setFormValues($("#ourDogForm"), normalized);
  if ($("#ourDogForm").elements.medicalCareNotes) $("#ourDogForm").elements.medicalCareNotes.value = ownedDogCareAlertNotes(normalized);
  $("#ourDogForm").elements.id.value = record.id || "";
  setDogPhoto("owned", normalized);
  setOwnedCareEntryVisibility(Boolean(record.id));
  renderOwnedActivity(normalized);
  renderOwnedDogFiles(normalized);
  updateOwnedDogConditionalFields();
  syncOwnedDogTabAvailability(normalized);
  setOwnedDogActiveTab("Overview");
  setOwnedFormLocked(false);
  $("#deleteOwnedDogButton").hidden = !record.id || currentRole() !== "admin";
}

function setOwnedCareEntryVisibility(visible = false) {
  $$("[data-owned-care-entry-panel]").forEach((panel) => {
    panel.hidden = !visible;
  });
}

function updateOwnedDogConditionalFields() {
  const sex = $("#ownedDogSex").value;
  const female = sex === "Female";
  [$("#ownedLastHeat"), $("#ownedNextHeat"), $("#ourDogForm").elements.heatCycle, $("#ourDogForm").elements.heatCycleLengthDays, $("#ourDogForm").elements.heatCycleStatus, $("#ourDogForm").elements.heatCycleNotes].forEach((field) => {
    if (!field) return;
    field.disabled = !female;
    if (!female) field.value = "";
  });
  [$("#ownedLastHeatLabel"), $("#ownedNextHeatLabel")].forEach((label) => label.classList.toggle("is-disabled-field", !female));
  updateDhppWarning();
}

function ownedDogActivityLogs(record = {}) {
  const dog = normalizeOwnedDogCare(record || {});
  return [
    ...dog.exerciseLogs.map((log) => ({ ...log, group: "Exercise" })),
    ...dog.trainingLogs.map((log) => ({ ...log, group: "Training" })),
    ...dog.bathHistory.map((log) => ({ ...log, group: "Bath" })),
    ...dog.heatHistory.map((log) => ({ ...log, group: "Heat" })),
    ...dog.careNotesHistory.map((log) => ({ ...log, group: "Medical/Care" })),
  ].sort((a, b) => new Date(b.date || b.loggedAt || 0) - new Date(a.date || a.loggedAt || 0));
}

function ownedDogActivityLogCardHtml(log = {}, { removable = false } = {}) {
  return \`<article class="record-card"><strong>\${escapeHtml(log.type)} - \${escapeHtml(log.date || "")}</strong><p>\${escapeHtml([log.minutes ? \`\${log.minutes} minutes\` : "", log.note || ""].filter(Boolean).join(" ") || "No notes")}</p><span>\${escapeHtml(log.completedBy || "")}</span>\${mediaLinkHtml(log)}\${removable ? \`<div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-owned-log" data-id="\${escapeHtml(log.id)}">Remove Entry</button></div>\` : ""}</article>\`;
}

function ownedDogActivityEntriesHtml(record = {}, filter = "All", { removable = false } = {}) {
  const logs = ownedDogActivityLogs(record).filter((log) => filter === "All" || filter === log.group || filter === log.type);
  const grouped = logs.reduce((groups, log) => {
    const key = log.group || "Activity";
    groups[key] = groups[key] || [];
    groups[key].push(log);
    return groups;
  }, {});
  return logs.length
    ? Object.entries(grouped)
        .map(([group, items]) => \`<section class="activity-group"><h3>\${escapeHtml(group)}</h3>\${items.map((log) => ownedDogActivityLogCardHtml(log, { removable })).join("")}</section>\`)
        .join("")
    : "<p>No activity or training entries yet.</p>";
}

function ownedDogActivityGroupEntriesHtml(record = {}, group = "") {
  const logs = ownedDogActivityLogs(record).filter((log) => (log.group || "Activity") === group);
  return logs.length ? logs.map((log) => ownedDogActivityLogCardHtml(log)).join("") : "<p>No entries in this group.</p>";
}

function ownedDogCollapsedActivityGroupsHtml(record = {}) {
  const groups = ownedDogActivityLogs(record).reduce((items, log) => {
    const group = log.group || "Activity";
    items[group] = (items[group] || 0) + 1;
    return items;
  }, {});
  const entries = Object.entries(groups);
  return entries.length
    ? \`<div class="collapsed-activity-groups">\${entries.map(([group, count]) => \`
      <section class="activity-group collapsed-activity-group">
        <button type="button" class="activity-group-toggle" data-action="toggle-owned-activity-group" data-id="\${escapeHtml(record.id || "")}" data-group="\${escapeHtml(group)}" aria-expanded="false">
          <span>\${escapeHtml(group)}</span><strong>\${count}</strong>
        </button>
        <div class="activity-group-content" data-activity-group-content hidden></div>
      </section>\`).join("")}</div>\`
    : "<p>No activity or training entries yet.</p>";
}

function ownedDogDocumentItems(record = {}) {
  return arrayValue(record.documents).map((item) => ({
    id: item.id || uid("file"),
    name: item.name || item.fileName || "Dog document",
    type: item.type || item.contentType || "application/octet-stream",
    size: item.size || 0,
    savedAt: item.savedAt || item.uploadedAt || item.createdAt || "",
    url: item.url || "",
    storagePath: item.storagePath || item.path || "",
    dataUrl: item.dataUrl || "",
    originalName: item.originalName || item.name || item.fileName || "",
    originalType: item.originalType || item.type || item.contentType || "",
    originalSize: item.originalSize || item.size || 0,
    optimized: Boolean(item.optimized),
    compression: item.compression || {},
    note: item.note || "",
  }));
}

function renderOwnedDogFiles(record = activeOwnedDog()) {
  const list = $("#ownedDogFileList");
  if (!list) return;
  if (!record?.id) {
    list.innerHTML = "<p>Save this dog before uploading documents.</p>";
    return;
  }
  const documents = ownedDogDocumentItems(record);
  list.innerHTML = documents.length
    ? documents.map((file) => {
        const source = file.url || file.dataUrl || "";
        const savedText = file.savedAt ? \`Uploaded \${formatDateTime(file.savedAt)}\` : "Uploaded date not recorded";
        const statusText = file.note ? \`<p>\${escapeHtml(file.note)}</p>\` : "";
        const openButton = mediaItemHasOpenableSource(file) ? \`<button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="\${escapeHtml(source)}" data-media-type="\${escapeHtml(file.type)}" data-media-name="\${escapeHtml(file.name)}"\${mediaAccessAttrs(file, { sourceRecordId: record.id || "", sourceRecordType: "ownedDog" })}>Open</button>\` : "";
        return \`<article class="record-card compact-record-card dog-file-card" data-file-id="\${escapeHtml(file.id)}"><strong>\${escapeHtml(file.name)}</strong><span>\${escapeHtml(savedText)}</span>\${statusText}<label>Rename file<input type="text" value="\${escapeHtml(file.name)}" data-action="rename-owned-file-input" data-id="\${escapeHtml(file.id)}" /></label><div class="record-actions">\${openButton}<button type="button" class="secondary-button" data-action="save-owned-file-name" data-id="\${escapeHtml(file.id)}">Rename</button><button type="button" class="secondary-button danger-button" data-action="remove-owned-file" data-id="\${escapeHtml(file.id)}">Remove</button></div></article>\`;
      }).join("")
    : "<p>No documents uploaded for this dog yet.</p>";
}

async function updateOwnedDogDocuments(documents = []) {
  const active = activeOwnedDog();
  if (!active) {
    showToast("Save the dog before managing files.");
    return null;
  }
  const updated = upsertRecord("ownedDog", {
    ...normalizeOwnedDogCare(active),
    documents,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  renderOwnedDogFiles(updated);
  renderOwnedDogs();
  return updated;
}

function ownedDogTrainingHistoryHtml(record = {}) {
  const logs = ownedDogActivityLogs(record).filter((log) => log.group === "Training").slice(0, 4);
  return logs.length
    ? \`<section class="quick-care-history"><h3>Recent training notes</h3>\${logs.map((log) => \`<article><strong>\${escapeHtml(log.date || "")}</strong><p>\${escapeHtml(log.note || "No note")}</p></article>\`).join("")}</section>\`
    : \`<section class="quick-care-history"><h3>Recent training notes</h3><p>No training notes logged yet.</p></section>\`;
}

function ownedDogTimelineHtml(record = {}, filter = "All") {
  const dog = normalizeOwnedDogCare(record);
  const options = ["All", "Exercise", "Treadmill", "Scooter", "Yard Run", "Training", "Bath", ...(dog.sex === "Female" ? ["Heat"] : []), "Medical/Care"];
  const selectedFilter = options.includes(filter) ? filter : "All";
  return \`
    \${dashboardQuickCareSummaryHtml(dog, "Timeline")}
    <label class="timeline-filter-label">Timeline filter
      <select id="ownedTimelinePopupFilter" data-dog-id="\${escapeHtml(record.id || "")}">
        \${options.map((option) => \`<option value="\${escapeHtml(option)}" \${option === selectedFilter ? "selected" : ""}>\${escapeHtml(option)}</option>\`).join("")}
      </select>
    </label>
    <div id="ownedTimelinePopupHistory" class="timeline-popup-history">\${ownedDogActivityEntriesHtml(record, selectedFilter)}</div>\`;
}

function openOwnedDogTimeline(dogId, filter = "All") {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) {
    showToast("This dog record is no longer available.");
    return;
  }
  showDetailDialog(\`\${ownedDogDisplayName(dog)} Timeline\`, ownedDogTimelineHtml(dog, filter));
}

function ownedDogOverviewPopupHtml(record = {}) {
  const dog = normalizeOwnedDogCare(record);
  const detailRows = [
    ["Call name", ownedDogDisplayName(dog)],
    ["Sex", dog.sex || ""],
    ["Feeding", dog.feedingPlan || dog.foodType || ""],
    ["Last DHPP", dog.dhppDate || "Not recorded"],
    ["Next DHPP", dog.nextDhppDate || "Not scheduled"],
    ["Last Rabies", dog.rabiesDate || "Not recorded"],
    ["Next Rabies", dog.nextRabiesDate || "Not scheduled"],
    ["Last Bordetella", dog.bordetellaDate || "Not recorded"],
    ["Next Bordetella", dog.nextBordetellaDate || "Not scheduled"],
    ["Last heartworm", dog.heartwormDate || "Not recorded"],
    ["Last Leptospirosis", dog.leptospirosisDate || "Not recorded"],
    ["Care status", ownedDogCareSummary(dog)],
  ].filter(([, value]) => value);
  const quickButtons = ["Treadmill", "Scooter", "Yard Run", "Bath", "Training", "Medical/Behavior Note"]
    .map((type) => \`<button type="button" class="secondary-button" data-action="popup-quick-care" data-care-type="\${escapeHtml(type)}" data-id="\${escapeHtml(dog.id)}">\${escapeHtml(type === "Medical/Behavior Note" ? "Medical/Behavior" : type)}</button>\`)
    .join("");
  const heatButton = dog.sex === "Female" ? \`<button type="button" class="secondary-button" data-action="popup-quick-care" data-care-type="Heat Note" data-id="\${escapeHtml(dog.id)}">Heat Note</button>\` : "";
  return \`\${dashboardQuickCareSummaryHtml(dog, "Profile")}
    <section class="popup-record-section popup-quick-care-actions"><h3>Quick Care Actions</h3><div class="quick-action-grid">\${quickButtons}\${heatButton}<button type="button" class="secondary-button" data-action="open-owned-timeline" data-id="\${escapeHtml(dog.id)}">Open Timeline</button></div></section>
    <section class="popup-record-section"><h3>Overview</h3>\${detailRows.map(([label, value]) => \`<div class="detail-row"><strong>\${escapeHtml(label)}</strong><span>\${escapeHtml(value)}</span></div>\`).join("")}</section>
    <section class="popup-record-section"><h3>Care Logs</h3><p class="section-help-text">Open a category to load its entries.</p>\${ownedDogCollapsedActivityGroupsHtml(dog)}</section>\`;
}

function openOwnedDogOverviewPopup(record = {}) {
  if (!record?.id) return;
  showDetailDialog(\`\${ownedDogDisplayName(record)} Profile\`, ownedDogOverviewPopupHtml(record), null, {
    headerAction: {
      label: "Edit Full Dog Record",
      action: "open-owned-editor",
      id: record.id,
    },
  });
}

function renderOwnedActivity(record = activeOwnedDog()) {
  const filter = $("#ownedActivityFilter")?.value || "All";
  const history = $("#ownedActivityHistory");
  if (history) history.innerHTML = ownedDogActivityEntriesHtml(record || {}, filter, { removable: true });
}

function addOwnedLog(type, minutes, note = "", dogId = "") {
  const active = dogId ? readRecords("ownedDog").find((record) => record.id === dogId && !record.removed) : activeOwnedDog();
  if (!active) {
    showToast("Save the dog first.");
    return;
  }
  const record = applyOwnedCareLog(active, type, minutes, note);
  sendPayload(record).catch((error) => console.warn("Owned care log save failed", error));
  if ($("#ourDogForm")?.elements.id.value === record.id) renderOwnedActivity(record);
  renderOwnedDogs();
  renderDashboard();
  showToast(\`\${type} entry added.\`);
}

function handleOwnedDogRosterAction(button) {
  const record = readRecords("ownedDog").find((item) => item.id === button.dataset.id);
  if (!record) return;
  if (button.dataset.action === "view-owned-photo") {
    if (profilePhotoHasSource(record)) {
      openDogProfilePhoto(record, "ownedDog");
    } else {
      openOwnedDogPhotoUploadPopup(normalizeOwnedDogCare(record));
    }
    return;
  }
  if (button.dataset.action === "quick-owned-log") {
    openDashboardQuickCare(record.id, button.dataset.careType);
    return;
  }
  if (button.dataset.action === "view-owned") {
    openOwnedDogOverviewPopup(record);
  }
  if (button.dataset.action === "edit-owned") {
    openOwnedDog(record);
    setOwnedFormLocked(false);
    $("#deleteOwnedDogButton").hidden = currentRole() !== "admin";
  }
  if (button.dataset.action === "log-owned-care") {
    openOwnedDogTimeline(record.id);
  }
}

async function removeOwnedLog(logId) {
  const active = activeOwnedDog();
  if (!active || !logId) return;
  const dog = normalizeOwnedDogCare(active);
  const exerciseLogs = dog.exerciseLogs || [];
  const trainingLogs = dog.trainingLogs || [];
  const bathHistory = dog.bathHistory || [];
  const heatHistory = dog.heatHistory || [];
  const careNotesHistory = dog.careNotesHistory || [];
  const nextExercise = exerciseLogs.filter((log) => log.id !== logId);
  const nextTraining = trainingLogs.filter((log) => log.id !== logId);
  const nextBath = bathHistory.filter((log) => log.id !== logId);
  const nextHeat = heatHistory.filter((log) => log.id !== logId);
  const nextCare = careNotesHistory.filter((log) => log.id !== logId);
  if (nextExercise.length === exerciseLogs.length && nextTraining.length === trainingLogs.length && nextBath.length === bathHistory.length && nextHeat.length === heatHistory.length && nextCare.length === careNotesHistory.length) return;
  const latestBath = latestLogDate(nextBath);
  const record = upsertRecord("ownedDog", {
    ...dog,
    exerciseLogs: nextExercise,
    trainingLogs: nextTraining,
    bathHistory: nextBath,
    heatHistory: nextHeat,
    careNotesHistory: nextCare,
    lastExerciseDate: latestLogDate(nextExercise) || dog.lastExerciseDate,
    lastTrainingDate: latestLogDate(nextTraining) || dog.lastTrainingDate,
    lastBath: latestBath || dog.lastBath,
    nextBath: latestBath ? nextBathFromFrequency(latestBath, dog.bathIntervalDays || careDefaults.bathIntervalDays) : dog.nextBath,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(record);
  if (nextBath.length !== bathHistory.length && typeof syncOwnedDogBathTask === "function") {
    try {
      await syncOwnedDogBathTask(record);
    } catch (error) {
      console.warn("Owned dog bath task sync failed after activity removal.", error);
    }
  }
  renderOwnedActivity(record);
  renderOwnedDogs();
  showToast("Activity entry removed.");
}

function calendarNoteAuthorText(note) {
  return note.createdBy || note.updatedBy || note.helperName || note.authorName || note.createdByEmail || note.updatedByEmail || currentUser?.name || "Author not recorded";
}

function calendarNoteDate(note = {}) {
  return dateOnly(note.noteDate || note.date || note.submittedAt || note.updatedAt);
}

function calendarNoteCreatedByCurrentUser(note = {}) {
  const staff = staffIdentity();
  const currentEmail = String(staff.email || "").trim().toLowerCase();
  const currentName = String(staff.name || "").trim().toLowerCase();
  const createdEmail = String(note.createdByEmail || note.helperEmail || note.authorEmail || "").trim().toLowerCase();
  const createdName = String(note.createdBy || note.helperName || note.authorName || "").trim().toLowerCase();
  if (currentEmail && createdEmail) return currentEmail === createdEmail;
  if (currentName && createdName) return currentName === createdName;
  return false;
}
//# sourceURL=snuggle-stay/daily.js
`;
(0, eval)(__snuggleStayModuleSource);
