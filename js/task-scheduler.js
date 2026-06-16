// === MODULE: TASK SCHEDULER ===
const __snuggleStayModuleSource = `
var taskSchedulerView = localStorage.getItem("cth-task-scheduler-view") || "week";
var taskSchedulerAnchorDate = todayDate();
var taskSchedulerSelectedTaskId = "";
var taskSchedulerDragTaskId = "";

var TASK_SCHEDULER_TYPES = [
  { key: "Bath", label: "Bath", className: "is-bath" },
  { key: "Treadmill", label: "Treadmill", className: "is-exercise" },
  { key: "Scooter Run", label: "Scooter Run", className: "is-exercise" },
  { key: "Yard Run", label: "Yard Run", className: "is-exercise" },
  { key: "Training", label: "Training", className: "is-training" },
  { key: "Nail Trim", label: "Nail Trim", className: "is-grooming" },
  { key: "Medication", label: "Medication", className: "is-medication" },
  { key: "Feeding Note", label: "Feeding Note", className: "is-feeding" },
  { key: "General Care", label: "General Care", className: "is-general" },
  { key: "Other", label: "Other", className: "is-other" },
];

function scheduledCareTasks() {
  return readRecords("scheduledCareTask")
    .filter((record) => !record.removed)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")) || String(a.startTime || "").localeCompare(String(b.startTime || "")));
}

function scheduledCareTaskTypeMeta(type = "") {
  return TASK_SCHEDULER_TYPES.find((item) => item.key === type) || TASK_SCHEDULER_TYPES[TASK_SCHEDULER_TYPES.length - 1];
}

function taskSchedulerWeekStart(date = taskSchedulerAnchorDate) {
  const d = new Date((date || todayDate()) + "T12:00:00");
  d.setDate(d.getDate() - d.getDay());
  return localDateKey(d);
}

function taskSchedulerWeekDates(date = taskSchedulerAnchorDate) {
  const start = taskSchedulerWeekStart(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function taskSchedulerMonthDates(date = taskSchedulerAnchorDate) {
  const source = new Date((date || todayDate()) + "T12:00:00");
  const first = new Date(source.getFullYear(), source.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return localDateKey(d);
  });
}

function taskSchedulerVisibleDates() {
  return taskSchedulerView === "month" ? taskSchedulerMonthDates(taskSchedulerAnchorDate) : taskSchedulerWeekDates(taskSchedulerAnchorDate);
}

function taskSchedulerRangeLabel() {
  const dates = taskSchedulerVisibleDates();
  const first = new Date(dates[0] + "T12:00:00");
  const last = new Date(dates[dates.length - 1] + "T12:00:00");
  if (taskSchedulerView === "month") {
    return new Date(taskSchedulerAnchorDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return first.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " - " + last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function taskSchedulerOwnedDogOptions(selectedId = "") {
  return readRecords("ownedDog")
    .filter((dog) => !dog.removed)
    .sort((a, b) => ownedDogDisplayName(a).localeCompare(ownedDogDisplayName(b)))
    .map((dog) => '<option value="' + escapeHtml(dog.id) + '"' + (dog.id === selectedId ? " selected" : "") + ">" + escapeHtml(ownedDogDisplayName(dog)) + "</option>")
    .join("");
}

function taskSchedulerBoardingDogOptions(selectedId = "") {
  return consolidatedBoardingDogRecords()
    .filter((dog) => !dog.removed)
    .sort((a, b) => String(a.dogName || "").localeCompare(String(b.dogName || "")))
    .map((dog) => '<option value="' + escapeHtml(dog.id) + '"' + (dog.id === selectedId ? " selected" : "") + ">" + escapeHtml(dog.dogName || "Boarding Dog") + "</option>")
    .join("");
}

function taskSchedulerDogForTask(task = {}) {
  if (task.dogType === "boardingDog") {
    return boardingDogRecordForDisplay(task.dogId) || consolidatedBoardingDogRecords().find((dog) => dog.id === task.dogId || arrayValue(dog.sourceRecordIds).includes(task.dogId)) || null;
  }
  return readRecords("ownedDog").find((dog) => dog.id === task.dogId && !dog.removed) || null;
}

function boardingServiceOptionsForScheduler(dogId = "", selectedTaskRef = "") {
  const dog = boardingDogRecordForDisplay(dogId) || consolidatedBoardingDogRecords().find((item) => item.id === dogId || arrayValue(item.sourceRecordIds).includes(dogId));
  if (!dog?.id) return '<option value="">Select boarding dog first</option>';
  const options = [];
  arrayValue(dog.stays).forEach((stay) => {
    const stats = typeof boardingStayServiceStats === "function" ? boardingStayServiceStats(dog, stay) : { tasks: [] };
    arrayValue(stats.tasks).forEach((task) => {
      if (task.status === "completed") return;
      const taskKey = typeof boardingServiceTaskKey === "function" ? boardingServiceTaskKey(task) : "";
      const requestCode = typeof boardingStayRequestCode === "function" ? boardingStayRequestCode(dog, stay) : "";
      const value = [stay.id || "", requestCode || "", task.id || "", taskKey || ""].join("::");
      const label = (task.label || task.serviceName || "Service") + " - " + (requestCode || stay.id || "Stay");
      options.push('<option value="' + escapeHtml(value) + '"' + (value === selectedTaskRef ? " selected" : "") + ">" + escapeHtml(label) + "</option>");
    });
  });
  return '<option value="">No linked boarding service</option>' + options.join("");
}

function scheduledCareTaskFormHtml(task = {}) {
  const dogType = task.dogType || "ownedDog";
  const typeOptions = TASK_SCHEDULER_TYPES.map((item) =>
    '<option value="' + escapeHtml(item.key) + '"' + (item.key === task.activityType ? " selected" : "") + ">" + escapeHtml(item.label) + "</option>"
  ).join("");

  return '<form id="scheduledCareTaskForm" class="tracker-form" data-id="' + escapeHtml(task.id || "") + '">' +
    '<div class="segmented-control task-dog-type-toggle" role="group" aria-label="Scheduled task dog type">' +
      '<label><input type="radio" name="dogType" value="ownedDog" ' + (dogType === "ownedDog" ? "checked" : "") + " /> Our Dog</label>" +
      '<label><input type="radio" name="dogType" value="boardingDog" ' + (dogType === "boardingDog" ? "checked" : "") + " /> Boarding Dog</label>" +
    "</div>" +
    '<div class="field-grid">' +
      '<label>Our Dog<select name="ownedDogId" data-task-owned-dog-select>' + taskSchedulerOwnedDogOptions(dogType === "ownedDog" ? task.dogId : "") + "</select></label>" +
      '<label>Boarding Dog<select name="boardingDogId" data-task-boarding-dog-select>' + taskSchedulerBoardingDogOptions(dogType === "boardingDog" ? task.dogId : "") + "</select></label>" +
      '<label>Activity<select name="activityType" required>' + typeOptions + "</select></label>" +
      '<label>Date<input type="date" name="date" value="' + escapeHtml(task.date || taskSchedulerAnchorDate || todayDate()) + '" required /></label>' +
      '<label>Start time<input type="time" name="startTime" value="' + escapeHtml(task.startTime || "09:00") + '" required /></label>' +
      '<label>Duration minutes<input type="number" name="durationMinutes" min="5" step="5" value="' + escapeHtml(task.durationMinutes || 45) + '" /></label>' +
      '<label>Assigned to<input type="text" name="assignedToName" value="' + escapeHtml(task.assignedToName || "") + '" placeholder="Staff name or shift" /></label>' +
    "</div>" +
    '<label data-task-boarding-service-row>Boarding service<select name="boardingServiceRef" data-task-boarding-service-select>' + boardingServiceOptionsForScheduler(dogType === "boardingDog" ? task.dogId : "", task.boardingServiceRef || "") + "</select></label>" +
    '<label>Notes<textarea name="notes" rows="4" placeholder="Shampoo, treadmill notes, special handling, etc.">' + escapeHtml(task.notes || "") + "</textarea></label>" +
    '<div class="button-row">' +
      '<button type="submit">Save Task</button>' +
      (task.id ? '<button type="button" class="secondary-button danger-button" data-action="remove-scheduled-care-task" data-id="' + escapeHtml(task.id) + '">Delete</button>' : "") +
      '<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>' +
    "</div>" +
  "</form>";
}

function openScheduledCareTaskPopup(id = "") {
  const task = scheduledCareTasks().find((item) => item.id === id) || {};
  showDetailDialog(id ? "Edit Scheduled Task" : "New Scheduled Task", scheduledCareTaskFormHtml(task));
  syncScheduledCareTaskFormVisibility();
}

function syncScheduledCareTaskFormVisibility() {
  const formEl = $("#scheduledCareTaskForm");
  if (!formEl) return;
  const dogType = formEl.elements.dogType?.value || "ownedDog";
  const ownedSelect = formEl.querySelector("[data-task-owned-dog-select]");
  const boardingSelect = formEl.querySelector("[data-task-boarding-dog-select]");
  const ownedLabel = ownedSelect?.closest("label");
  const boardingLabel = boardingSelect?.closest("label");
  const serviceRow = formEl.querySelector("[data-task-boarding-service-row]");
  const serviceSelect = formEl.querySelector("[data-task-boarding-service-select]");
  if (ownedLabel) ownedLabel.hidden = dogType !== "ownedDog";
  if (boardingLabel) boardingLabel.hidden = dogType !== "boardingDog";
  if (serviceRow) serviceRow.hidden = dogType !== "boardingDog";
  if (dogType === "boardingDog" && serviceSelect && boardingSelect && serviceSelect.dataset.loadedDogId !== boardingSelect.value) {
    serviceSelect.innerHTML = boardingServiceOptionsForScheduler(boardingSelect.value, serviceSelect.value || "");
    serviceSelect.dataset.loadedDogId = boardingSelect.value;
  }
}

function scheduledCareTaskPayloadFromForm(formEl, existing = {}) {
  const data = formPayload(formEl);
  const dogType = data.dogType || "ownedDog";
  const dogId = dogType === "boardingDog" ? data.boardingDogId : data.ownedDogId;
  const dog = dogType === "boardingDog"
    ? boardingDogRecordForDisplay(dogId) || consolidatedBoardingDogRecords().find((item) => item.id === dogId || arrayValue(item.sourceRecordIds).includes(dogId))
    : readRecords("ownedDog").find((item) => item.id === dogId && !item.removed);

  if (!dog?.id) throw new Error("Choose a dog for this task.");

  const now = new Date().toISOString();
  const [boardingStayId = "", boardingRequestCode = "", boardingServiceTaskId = "", boardingServiceTaskKey = ""] = String(data.boardingServiceRef || "").split("::");

  return {
    type: "scheduledCareTask",
    id: formEl.dataset.id || uid("scheduledCareTask"),
    submittedAt: existing.submittedAt || now,
    createdAt: existing.createdAt || now,
    updatedAt: now,
    title: data.activityType || "Care Task",
    dogType,
    dogId,
    dogName: dogType === "boardingDog" ? dog.dogName : ownedDogDisplayName(dog),
    activityType: data.activityType,
    date: dateOnly(data.date),
    startTime: data.startTime,
    durationMinutes: Number(data.durationMinutes || 45),
    assignedToName: data.assignedToName || "",
    assignedToEmail: existing.assignedToEmail || "",
    notes: data.notes || "",
    status: existing.status || "Scheduled",
    boardingStayId: dogType === "boardingDog" ? boardingStayId : "",
    boardingRequestCode: dogType === "boardingDog" ? boardingRequestCode : "",
    boardingServiceTaskId: dogType === "boardingDog" ? boardingServiceTaskId : "",
    boardingServiceTaskKey: dogType === "boardingDog" ? boardingServiceTaskKey : "",
    boardingServiceRef: dogType === "boardingDog" ? data.boardingServiceRef || "" : "",
    completedAt: existing.completedAt || "",
    completedBy: existing.completedBy || "",
    completedByEmail: existing.completedByEmail || "",
    careLogId: existing.careLogId || "",
    removed: false,
  };
}

async function saveScheduledCareTaskFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  try {
    const existing = formEl.dataset.id ? readRecords("scheduledCareTask").find((item) => item.id === formEl.dataset.id) || {} : {};
    const draft = scheduledCareTaskPayloadFromForm(formEl, existing);
    const record = upsertRecord("scheduledCareTask", { ...existing, ...draft });
    await sendPayload(record);
    taskSchedulerSelectedTaskId = record.id;
    renderTaskScheduler();
    showDetailDialog("Task Saved", "<p>The task was saved to Task Scheduling.</p>");
    return record;
  } catch (error) {
    showToast(error.message || "Task could not be saved.");
    return null;
  }
}

function scheduledCareTaskCardHtml(task = {}) {
  const meta = scheduledCareTaskTypeMeta(task.activityType);
  const statusClass = task.status === "Completed" ? " is-completed" : "";
  return '<button type="button" draggable="true" class="task-scheduler-card ' + escapeHtml(meta.className) + statusClass + '" data-action="open-scheduled-care-task" data-id="' + escapeHtml(task.id) + '">' +
    '<strong>' + escapeHtml(task.title || task.activityType || "Task") + "</strong>" +
    '<span>' + escapeHtml([task.dogName || "Dog", task.startTime || ""].filter(Boolean).join(" | ")) + "</span>" +
  "</button>";
}

function tasksForSchedulerDate(date = "") {
  return scheduledCareTasks().filter((task) => task.date === date && task.status !== "Cancelled");
}

function taskSchedulerHourFromTime(time = "") {
  const hour = Number(String(time || "00:00").slice(0, 2));
  return Number.isFinite(hour) ? hour : 9;
}

function taskSchedulerWeekHours(dates = taskSchedulerWeekDates(taskSchedulerAnchorDate)) {
  const hours = new Set(Array.from({ length: 13 }, (_, index) => index + 6));
  dates.forEach((date) => tasksForSchedulerDate(date).forEach((task) => hours.add(taskSchedulerHourFromTime(task.startTime))));
  return [...hours].filter((hour) => hour >= 0 && hour <= 23).sort((a, b) => a - b);
}

function taskSchedulerWeekHtml() {
  const dates = taskSchedulerWeekDates(taskSchedulerAnchorDate);
  const hours = taskSchedulerWeekHours(dates);
  return '<div class="task-scheduler-week-grid">' +
    '<div class="task-scheduler-week-header task-scheduler-time-label">Time</div>' +
    dates.map((date) => '<div class="task-scheduler-week-header">' + escapeHtml(new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) + "</div>").join("") +
    hours.map((hour) => {
      const time = String(hour).padStart(2, "0") + ":00";
      return '<div class="task-scheduler-time-label">' + escapeHtml(hourLabel(hour)) + "</div>" +
        dates.map((date) => {
          const tasks = tasksForSchedulerDate(date).filter((task) => taskSchedulerHourFromTime(task.startTime) === hour);
          return '<div class="task-scheduler-slot" data-task-drop-date="' + escapeHtml(date) + '" data-task-drop-time="' + escapeHtml(time) + '">' +
            tasks.map(scheduledCareTaskCardHtml).join("") +
          "</div>";
        }).join("");
    }).join("") +
  "</div>";
}

function hourLabel(hour) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return hour + " AM";
  if (hour === 12) return "12 PM";
  return (hour - 12) + " PM";
}

function taskSchedulerMonthHtml() {
  const dates = taskSchedulerMonthDates(taskSchedulerAnchorDate);
  const anchorMonth = new Date(taskSchedulerAnchorDate + "T12:00:00").getMonth();
  return '<div class="task-scheduler-month-grid">' +
    dates.map((date) => {
      const dateObj = new Date(date + "T12:00:00");
      const tasks = tasksForSchedulerDate(date);
      const outsideClass = dateObj.getMonth() === anchorMonth ? "" : " is-outside-month";
      return '<div class="task-scheduler-month-day' + outsideClass + '" data-task-drop-date="' + escapeHtml(date) + '" data-task-drop-time="09:00">' +
        '<strong>' + escapeHtml(String(dateObj.getDate())) + "</strong>" +
        tasks.slice(0, 4).map(scheduledCareTaskCardHtml).join("") +
        (tasks.length > 4 ? '<span class="muted-text">+' + (tasks.length - 4) + " more</span>" : "") +
      "</div>";
    }).join("") +
  "</div>";
}

function renderTaskSchedulerMiniCalendar() {
  const el = $("#taskSchedulerMiniCalendar");
  if (!el) return;
  const dates = taskSchedulerMonthDates(taskSchedulerAnchorDate);
  el.innerHTML = '<strong>' + escapeHtml(new Date(taskSchedulerAnchorDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })) + '</strong>' +
    '<div class="task-scheduler-mini-grid">' +
    dates.map((date) => {
      const count = tasksForSchedulerDate(date).length;
      return '<button type="button" data-action="task-scheduler-jump-date" data-date="' + escapeHtml(date) + '" class="' + (date === todayDate() ? "is-today" : "") + '">' +
        escapeHtml(String(new Date(date + "T12:00:00").getDate())) +
        (count ? '<small>' + count + "</small>" : "") +
      "</button>";
    }).join("") +
    "</div>";
}

function renderTaskSchedulerLegend() {
  const el = $("#taskSchedulerLegend");
  if (!el) return;
  el.innerHTML = '<h3>Task Types</h3>' + TASK_SCHEDULER_TYPES.map((type) =>
    '<span class="task-scheduler-legend-item ' + escapeHtml(type.className) + '">' + escapeHtml(type.label) + "</span>"
  ).join("");
}

function renderTaskSchedulerDetail(task = null) {
  const panel = $("#taskSchedulerDetailPanel");
  if (!panel) return;
  if (!task) {
    panel.innerHTML = "<p>Select a task to see details.</p>";
    return;
  }
  panel.innerHTML = '<article class="task-scheduler-detail-card">' +
    '<h3>' + escapeHtml(task.title || "Scheduled Task") + "</h3>" +
    '<p><strong>Dog:</strong> ' + escapeHtml(task.dogName || "Dog") + "</p>" +
    '<p><strong>Type:</strong> ' + escapeHtml(task.dogType === "boardingDog" ? "Boarding Dog" : "Our Dog") + "</p>" +
    '<p><strong>Date:</strong> ' + escapeHtml(task.date || "") + "</p>" +
    '<p><strong>Time:</strong> ' + escapeHtml(task.startTime || "") + " for " + escapeHtml(String(task.durationMinutes || 0)) + " min</p>" +
    '<p><strong>Status:</strong> ' + escapeHtml(task.status || "Scheduled") + "</p>" +
    (task.assignedToName ? '<p><strong>Assigned:</strong> ' + escapeHtml(task.assignedToName) + "</p>" : "") +
    (task.notes ? '<p><strong>Notes:</strong> ' + escapeHtml(task.notes) + "</p>" : "") +
    '<div class="button-row">' +
      (task.status === "Completed" ? '<button type="button" class="secondary-button" data-action="open-scheduled-care-log" data-id="' + escapeHtml(task.id) + '">View Log</button>' : '<button type="button" data-action="complete-scheduled-care-task" data-id="' + escapeHtml(task.id) + '">Complete & Log to Dog</button>') +
      '<button type="button" class="secondary-button" data-action="edit-scheduled-care-task" data-id="' + escapeHtml(task.id) + '">Edit</button>' +
    "</div>" +
  "</article>";
}

function renderTaskScheduler() {
  const board = $("#taskSchedulerBoard");
  if (!board) return;
  const label = $("#taskSchedulerRangeLabel");
  if (label) label.textContent = taskSchedulerRangeLabel();
  $("#taskSchedulerWeekViewButton")?.classList.toggle("is-active", taskSchedulerView === "week");
  $("#taskSchedulerMonthViewButton")?.classList.toggle("is-active", taskSchedulerView === "month");
  board.innerHTML = taskSchedulerView === "month" ? taskSchedulerMonthHtml() : taskSchedulerWeekHtml();
  renderTaskSchedulerMiniCalendar();
  renderTaskSchedulerLegend();
  const selected = scheduledCareTasks().find((task) => task.id === taskSchedulerSelectedTaskId);
  renderTaskSchedulerDetail(selected || null);
}

// Task scheduling: drag/drop only changes the scheduler record date and start time.
async function moveScheduledCareTask(id = "", date = "", startTime = "") {
  const task = scheduledCareTasks().find((item) => item.id === id);
  if (!task) return null;
  if (task.status === "Completed") {
    showToast("Completed tasks cannot be moved.");
    return null;
  }
  const updated = upsertRecord("scheduledCareTask", {
    ...task,
    date: dateOnly(date) || task.date,
    startTime: startTime || task.startTime,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  taskSchedulerSelectedTaskId = updated.id;
  renderTaskScheduler();
  showToast("Task moved.");
  return updated;
}

async function completeScheduledCareTask(id = "") {
  const task = scheduledCareTasks().find((item) => item.id === id);
  if (!task || task.status === "Completed") return null;

  try {
    const timestamp = new Date().toISOString();
    const staff = staffIdentity();
    let careLogId = "";

    // Task scheduling: completion writes through the existing care-log paths before marking the task complete.
    if (task.dogType === "boardingDog") {
      careLogId = await logScheduledCareTaskToBoardingDog(task, timestamp, staff);
    } else {
      careLogId = await logScheduledCareTaskToOwnedDog(task, timestamp);
    }

    const updated = upsertRecord("scheduledCareTask", {
      ...task,
      status: "Completed",
      completedAt: timestamp,
      completedBy: staff.name,
      completedByEmail: staff.email,
      careLogId,
      updatedAt: timestamp,
    });
    await sendPayload(updated);
    taskSchedulerSelectedTaskId = updated.id;
    renderTaskScheduler();
    renderDashboard();
    showToast("Task completed and logged to " + (task.dogName || "dog") + ".");
    return updated;
  } catch (error) {
    console.warn("Scheduled care task completion failed.", error);
    showToast(error.message || "Task could not be completed.");
    return null;
  }
}

async function logScheduledCareTaskToOwnedDog(task = {}, timestamp = new Date().toISOString()) {
  const dog = readRecords("ownedDog").find((item) => item.id === task.dogId && !item.removed);
  if (!dog) throw new Error("Our Dog record was not found.");
  const log = buildStructuredCareLog(dog, {
    careType: task.activityType,
    minutes: task.durationMinutes || "",
    note: ["Scheduled task completed.", task.notes || ""].filter(Boolean).join(" "),
    date: task.date || todayDate(),
  });
  log.id = uid("scheduledCareLog");
  log.loggedAt = timestamp;
  log.scheduledCareTaskId = task.id;
  log.source = "taskScheduler";
  await saveStructuredCareLog(log);
  return log.id;
}

function taskSchedulerRawBoardingRecordForTask(task = {}) {
  const displayRecord = boardingDogRecordForDisplay(task.dogId);
  const sourceIds = new Set([displayRecord?.id, task.dogId, ...arrayValue(displayRecord?.sourceRecordIds)].filter(Boolean));
  const rawRecords = readRecords("boardingDog").filter((item) => !item.removed && sourceIds.has(item.id));
  return rawRecords.find((item) => item.id === displayRecord?.id) || rawRecords.find((item) => item.id === task.dogId) || rawRecords[0] || displayRecord || null;
}

async function logScheduledCareTaskToBoardingDog(task = {}, timestamp = new Date().toISOString(), staff = staffIdentity()) {
  const displayDog = boardingDogRecordForDisplay(task.dogId) || consolidatedBoardingDogRecords().find((item) => item.id === task.dogId || arrayValue(item.sourceRecordIds).includes(task.dogId));
  const rawDog = taskSchedulerRawBoardingRecordForTask(task);
  if (!rawDog?.id && !displayDog?.id) throw new Error("Boarding dog record was not found.");
  const dog = rawDog || displayDog;

  const log = {
    id: uid("boardingCareLog"),
    source: "taskScheduler",
    scheduledCareTaskId: task.id,
    dogType: "boardingDog",
    dogId: dog.id,
    dogName: displayDog?.dogName || dog.dogName || task.dogName || "Boarding Dog",
    careType: task.activityType,
    minutes: task.durationMinutes || "",
    note: ["Scheduled task completed.", task.notes || ""].filter(Boolean).join(" "),
    date: task.date || todayDate(),
    loggedAt: timestamp,
    completedBy: staff.name,
    completedEmail: staff.email,
    stayId: task.boardingStayId || "",
    requestCode: task.boardingRequestCode || "",
    serviceTaskId: task.boardingServiceTaskId || "",
    serviceTaskKey: task.boardingServiceTaskKey || "",
  };

  // Task scheduling: boarding care logs live on the raw boardingDog JSON record to preserve kennel_records compatibility.
  const updatedDog = upsertRecord("boardingDog", {
    ...dog,
    careLogs: [log, ...arrayValue(dog.careLogs).filter((item) => item.id !== log.id && item.scheduledCareTaskId !== task.id)],
    updatedAt: timestamp,
  });
  await sendPayload(updatedDog);

  if (task.boardingStayId && (task.boardingServiceTaskId || task.boardingServiceTaskKey) && typeof updateBoardingStayServiceTaskStatus === "function") {
    await updateBoardingStayServiceTaskStatus(
      updatedDog,
      { dogId: updatedDog.id, stayId: task.boardingStayId, requestCode: task.boardingRequestCode || "" },
      task.boardingServiceTaskId || "",
      "completed",
      task.boardingServiceTaskKey || "",
    );
  }

  renderBoardingDogs();
  renderBoardingRequests();
  return log.id;
}

function scheduledCareTaskLogForTask(task = {}) {
  if (!task?.id) return null;
  if (task.dogType === "boardingDog") {
    const dog = taskSchedulerDogForTask(task);
    return arrayValue(dog?.careLogs).find((log) => log.id === task.careLogId || log.scheduledCareTaskId === task.id) || null;
  }
  return readRecords("dailyTask")
    .flatMap((record) => arrayValue(record.structuredCareLogs || record.careLogs))
    .find((log) => log.id === task.careLogId || log.scheduledCareTaskId === task.id) || null;
}

function openScheduledCareLog(id = "") {
  const task = scheduledCareTasks().find((item) => item.id === id);
  const log = scheduledCareTaskLogForTask(task);
  if (!task || !log) {
    showDetailDialog("Care Log", "<p>The care log for this completed task was not found.</p>");
    return;
  }
  showDetailDialog("Care Log", '<div class="detail-row"><strong>Dog</strong><span>' + escapeHtml(log.dogName || task.dogName || "Dog") + '</span></div>' +
    '<div class="detail-row"><strong>Care</strong><span>' + escapeHtml(log.careType || task.activityType || "Care") + '</span></div>' +
    '<div class="detail-row"><strong>Date</strong><span>' + escapeHtml(log.date || task.date || "") + '</span></div>' +
    (log.minutes ? '<div class="detail-row"><strong>Minutes</strong><span>' + escapeHtml(String(log.minutes)) + '</span></div>' : "") +
    (log.note ? '<div class="detail-row"><strong>Note</strong><span>' + escapeHtml(log.note) + '</span></div>' : "") +
    '<div class="detail-row"><strong>Saved by</strong><span>' + escapeHtml(log.completedBy || task.completedBy || "Staff") + '</span></div>');
}

async function removeScheduledCareTask(id = "") {
  const task = scheduledCareTasks().find((item) => item.id === id);
  if (!task) return null;
  const updated = upsertRecord("scheduledCareTask", {
    ...task,
    removed: true,
    removedAt: new Date().toISOString(),
    removedBy: currentUser?.name || helperName?.value || "Staff",
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  $("#detailDialog")?.close();
  if (taskSchedulerSelectedTaskId === id) taskSchedulerSelectedTaskId = "";
  renderTaskScheduler();
  showToast("Scheduled task removed.");
  return updated;
}

function setupTaskSchedulerEventListeners() {
  const page = $("#taskSchedulerPage");
  if (!page || page.dataset.taskSchedulerBound === "true") return;
  page.dataset.taskSchedulerBound = "true";

  $("#openScheduledCareTaskButton")?.addEventListener("click", () => openScheduledCareTaskPopup());
  $("#taskSchedulerTodayButton")?.addEventListener("click", () => {
    taskSchedulerAnchorDate = todayDate();
    renderTaskScheduler();
  });
  $("#taskSchedulerPrevButton")?.addEventListener("click", () => {
    taskSchedulerAnchorDate = taskSchedulerView === "month" ? addMonths(taskSchedulerAnchorDate, -1) : addDays(taskSchedulerAnchorDate, -7);
    renderTaskScheduler();
  });
  $("#taskSchedulerNextButton")?.addEventListener("click", () => {
    taskSchedulerAnchorDate = taskSchedulerView === "month" ? addMonths(taskSchedulerAnchorDate, 1) : addDays(taskSchedulerAnchorDate, 7);
    renderTaskScheduler();
  });

  page.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("[data-task-scheduler-view]");
    if (viewButton) {
      taskSchedulerView = viewButton.dataset.taskSchedulerView || "week";
      localStorage.setItem("cth-task-scheduler-view", taskSchedulerView);
      renderTaskScheduler();
      return;
    }

    const action = event.target.closest("[data-action]");
    if (!action) return;

    if (action.dataset.action === "open-scheduled-care-task") {
      taskSchedulerSelectedTaskId = action.dataset.id;
      renderTaskSchedulerDetail(scheduledCareTasks().find((task) => task.id === action.dataset.id));
      return;
    }

    if (action.dataset.action === "edit-scheduled-care-task") {
      openScheduledCareTaskPopup(action.dataset.id);
      return;
    }

    if (action.dataset.action === "complete-scheduled-care-task") {
      await completeScheduledCareTask(action.dataset.id);
      return;
    }

    if (action.dataset.action === "open-scheduled-care-log") {
      openScheduledCareLog(action.dataset.id);
      return;
    }

    if (action.dataset.action === "task-scheduler-jump-date") {
      taskSchedulerAnchorDate = action.dataset.date;
      renderTaskScheduler();
      return;
    }
  });

  page.addEventListener("dragstart", (event) => {
    const card = event.target.closest('[data-action="open-scheduled-care-task"]');
    if (!card) return;
    taskSchedulerDragTaskId = card.dataset.id;
    event.dataTransfer?.setData("text/plain", taskSchedulerDragTaskId);
  });

  page.addEventListener("dragover", (event) => {
    if (event.target.closest("[data-task-drop-date]")) event.preventDefault();
  });

  page.addEventListener("drop", async (event) => {
    const slot = event.target.closest("[data-task-drop-date]");
    if (!slot) return;
    event.preventDefault();
    const id = event.dataTransfer?.getData("text/plain") || taskSchedulerDragTaskId;
    taskSchedulerDragTaskId = "";
    await moveScheduledCareTask(id, slot.dataset.taskDropDate, slot.dataset.taskDropTime || "09:00");
  });

  $("#detailDialogBody")?.addEventListener("change", (event) => {
    const formEl = event.target.closest("#scheduledCareTaskForm");
    if (!formEl) return;
    syncScheduledCareTaskFormVisibility();
    const boardingDogSelect = formEl.querySelector("[data-task-boarding-dog-select]");
    const serviceSelect = formEl.querySelector("[data-task-boarding-service-select]");
    if (serviceSelect && boardingDogSelect && event.target === boardingDogSelect) {
      serviceSelect.innerHTML = boardingServiceOptionsForScheduler(boardingDogSelect.value);
      serviceSelect.dataset.loadedDogId = boardingDogSelect.value;
    }
  });

  $("#detailDialogBody")?.addEventListener("submit", async (event) => {
    const formEl = event.target.closest("#scheduledCareTaskForm");
    if (!formEl) return;
    event.preventDefault();
    await saveScheduledCareTaskFromForm(formEl);
  });

  $("#detailDialogBody")?.addEventListener("click", async (event) => {
    const close = event.target.closest('[data-action="close-dialog"]');
    if (close) {
      event.preventDefault();
      $("#detailDialog")?.close();
      return;
    }
    const remove = event.target.closest('[data-action="remove-scheduled-care-task"]');
    if (remove) {
      event.preventDefault();
      await removeScheduledCareTask(remove.dataset.id);
    }
  });
}
`;
(0, eval)(__snuggleStayModuleSource);
