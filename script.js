const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxDHHMANZoq4vz4PwwTuz4yn8MBUfFcKfTwZ0PDdOnaYQcFBqA8BF9xUF_X0-xnrXFD5w/exec";
const OWNER_ALERT_EMAIL = "centraltexashusky@gmail.com";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const form = $("#kennelForm");
const modeLabel = $("#modeLabel");
const daySelect = $("#dayOfWeek");
const mondaySection = $("#mondaySection");
const tuesdaySection = $("#tuesdaySection");
const helperName = $("#helperName");
const helperEmail = $("#helperEmail");
const helperKey = $("#helperKey");
const loginStatus = $("#loginStatus");
const loginHelp = $("#loginHelp");

const HELPER_PINS = {
  "1001": { name: "Ms. Yuko", email: "yuko@centraltexashusky.com", key: "helper-yuko" },
  "1002": { name: "Lexi", email: "lexi@centraltexashusky.com", key: "helper-lexi" },
};

const stateKeys = {
  ownedDog: "cth-ownedDog-records",
  boardingDog: "cth-boardingDog-records",
  request: "cth-request-records",
  maintenance: "cth-maintenance-records",
  timesheet: "cth-timesheet-records",
};

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function setDefaultDateAndDay() {
  form.elements.date.value = todayDate();
  $("#manualDate").value = todayDate();
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  if ([...daySelect.options].some((option) => option.value === dayName)) {
    daySelect.value = dayName;
  }
}

function addMonths(dateString, monthsToAdd) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, daysToAdd) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end) - new Date(start)) / 36e5);
}

function readRecords(type) {
  return JSON.parse(localStorage.getItem(stateKeys[type]) || "[]");
}

function writeRecords(type, records) {
  localStorage.setItem(stateKeys[type], JSON.stringify(records));
}

function mergeRecords(type, incomingRecords) {
  const byId = {};
  [...readRecords(type), ...incomingRecords].forEach((record) => {
    if (!record?.id) return;
    const existing = byId[record.id];
    if (!existing || new Date(record.updatedAt || record.submittedAt || 0) >= new Date(existing.updatedAt || existing.submittedAt || 0)) {
      byId[record.id] = record;
    }
  });
  writeRecords(
    type,
    Object.values(byId).sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0)),
  );
}

function upsertRecord(type, payload) {
  const records = readRecords(type);
  const record = { ...payload, id: payload.id || uid(type), updatedAt: new Date().toISOString() };
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) records[index] = record;
  else records.unshift(record);
  writeRecords(type, records);
  return record;
}

function formPayload(targetForm) {
  return Object.fromEntries(new FormData(targetForm).entries());
}

function checkedFrom(targetForm, name) {
  return [...targetForm.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function setFormValues(targetForm, record) {
  Object.entries(record).forEach(([key, value]) => {
    const field = targetForm.elements[key];
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = value === "Yes" || value === true;
      return;
    }
    field.value = value ?? "";
  });
}

function fileToDataUrl(input) {
  const file = input.files?.[0];
  if (!file) return Promise.resolve("");
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function setDogPhoto(kind, record) {
  const isOwned = kind === "owned";
  const card = isOwned ? $("#ownedDogPhotoCard") : $("#boardingDogPhotoCard");
  const img = isOwned ? $("#ownedDogPhotoPreview") : $("#boardingDogPhotoPreview");
  const caption = isOwned ? $("#ownedDogPhotoName") : $("#boardingDogPhotoName");
  const name = isOwned ? record.callName : record.dogName;
  const photo = record.profilePhotoData || record.profilePhotoUrl;
  card.hidden = !photo;
  if (photo) img.src = photo;
  caption.textContent = name || "";
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
}

function setHelper(user) {
  setDefaultDateAndDay();
  helperName.value = user.name || "";
  helperEmail.value = user.email || "";
  helperKey.value = user.key || "";
  $("#manualHelper").value = user.name || "";
  $("#timesheetHelperDisplay").textContent = user.name || "No helper loaded";
  loginStatus.textContent = user.name ? `Helper loaded: ${user.name}` : "Helper loaded";
  loginHelp.textContent = user.email || "PIN helper account";
  $("#helperPinInput").value = "";
  $("#clearHelperButton").hidden = false;
}

function clearHelper() {
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  $("#manualHelper").value = "";
  $("#timesheetHelperDisplay").textContent = "No helper loaded";
  loginStatus.textContent = "Helper not loaded";
  loginHelp.textContent = "Helper name and email will fill in after PIN login.";
  $("#helperPinInput").value = "";
  $("#clearHelperButton").hidden = true;
}

function loginWithPin() {
  const pin = $("#helperPinInput").value.trim();
  const helper = HELPER_PINS[pin];
  if (!helper) {
    showToast("PIN not recognized.");
    return;
  }
  setHelper(helper);
  showToast(`${helper.name} is logged in.`);
}

function getDeepCleanBuilding(date = new Date()) {
  const monthDelta = (date.getFullYear() - 2026) * 12 + date.getMonth() - 4;
  return Math.abs(monthDelta) % 2 === 0 ? "Dog Mansion" : "Dog Shed";
}

function updateRotationBanner() {
  const selectedDate = form.elements.date.value ? new Date(`${form.elements.date.value}T12:00:00`) : new Date();
  const monthLabel = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  $("#rotationBanner").textContent = `${monthLabel} rotation: deep clean ${getDeepCleanBuilding(selectedDate)} during the first week.`;
}

function updateConditionalSections() {
  mondaySection.classList.toggle("is-muted", daySelect.value !== "Monday");
  tuesdaySection.classList.toggle("is-muted", daySelect.value !== "Tuesday");
}

function updateCompletionCount() {
  const checked = form.querySelectorAll('input[type="checkbox"]:checked').length;
  $("#completionText").textContent = `${checked} task${checked === 1 ? "" : "s"} checked`;
}

async function sendPayload(payload) {
  if (!GOOGLE_SCRIPT_URL) return;
  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    modeLabel.textContent = "Live app";
  } catch (error) {
    modeLabel.textContent = "Sync pending";
  }
}

function loadRemoteRecords() {
  if (!GOOGLE_SCRIPT_URL) return;
  const callbackName = `cthRemote_${Date.now()}`;
  window[callbackName] = (data) => {
    ["ownedDog", "boardingDog", "request", "maintenance", "timesheet"].forEach((type) => mergeRecords(type, data[type] || []));
    renderAllRecords();
    modeLabel.textContent = "Live app";
    delete window[callbackName];
    script.remove();
  };
  const script = document.createElement("script");
  script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}`;
  script.onerror = () => {
    modeLabel.textContent = "Sync pending";
    delete window[callbackName];
    script.remove();
  };
  document.body.appendChild(script);
}

function buildDailyPayload() {
  const data = new FormData(form);
  return {
    type: "dailyTask",
    submittedAt: new Date().toISOString(),
    date: data.get("date"),
    helperName: data.get("helperName"),
    helperEmail: data.get("helperEmail"),
    helperKey: data.get("helperKey"),
    dayOfWeek: data.get("dayOfWeek"),
    dailyTasks: checkedFrom(form, "dailyTasks"),
    dogsExercised: data.get("dogsExercised"),
    dogsBathed: data.get("dogsBathed"),
    healthConcern: data.get("healthConcern"),
    healthNotes: data.get("healthNotes"),
    socialContent: data.get("socialContent"),
    weeklyTasks: checkedFrom(form, "weeklyTasks"),
    tuesdayTasks: checkedFrom(form, "tuesdayTasks"),
    monthlyWeek: data.get("monthlyWeek"),
    deepCleanBuilding: data.get("deepCleanBuilding"),
    monthlyTasks: checkedFrom(form, "monthlyTasks"),
    suppliesLow: checkedFrom(form, "suppliesLow"),
    ownerNotes: data.get("ownerNotes"),
    boardingTasks: upcomingBoardingTaskText(),
  };
}

function upcomingBoardingTaskText() {
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  const tasks = [];
  readRecords("boardingDog").forEach((dog) => {
    (dog.stays || []).forEach((stay) => {
      if (stay.dropoffTime?.slice(0, 10) === today) tasks.push(`${dog.dogName} drop-off scheduled at ${formatDateTime(stay.dropoffTime)}.`);
      if (stay.pickupTime?.slice(0, 10) === today) tasks.push(`${dog.dogName} pick-up scheduled at ${formatDateTime(stay.pickupTime)}.`);
      if ((stay.requests || []).includes("Bath requested")) {
        const pickupDate = stay.pickupTime?.slice(0, 10);
        if (pickupDate === today) tasks.push(`${dog.dogName} bath requested. ${stay.bathPlan}`);
        if (pickupDate === tomorrow) tasks.push(`${dog.dogName} bath requested for tomorrow pickup. Complete bath today if pickup is during busy kennel hours.`);
      }
    });
  });
  return tasks.join("\n");
}

function renderDemoSubmissions() {
  const saved = JSON.parse(localStorage.getItem("cthKennelSubmissions") || "[]");
  $("#recentSubmissions").innerHTML = saved.length
    ? saved
        .map((submission) => `<article class="submission-item"><strong>${submission.date} - ${submission.helperName}</strong><p>${submission.dayOfWeek} | ${submission.dailyTasks.length} daily tasks | ${submission.healthConcern}</p><p>Social: ${submission.socialContent || "No content note"}</p></article>`)
        .join("")
    : "<p>No recent submissions yet.</p>";
}

function matches(record, query) {
  return JSON.stringify(record).toLowerCase().includes(query.trim().toLowerCase());
}

function renderOwnedDogs() {
  const query = $("#ownedDogSearch").value || "";
  const records = readRecords("ownedDog").filter((record) => matches(record, query));
  $("#ownedDogTableBody").innerHTML = records.length
    ? records
        .map((record) => `<tr data-id="${record.id}"><td>${record.callName || ""}</td><td>${record.showName || ""}</td><td>${record.sex || ""}</td><td>${record.dateOfBirth || ""}</td><td>${record.rabiesDate || ""}</td><td>${record.nextBath || ""}</td><td>${record.foodAmount || ""}</td></tr>`)
        .join("")
    : `<tr><td colspan="7">No matching dogs. Use Add New Dog.</td></tr>`;
}

function renderBoardingDogs() {
  const query = $("#boardingDogSearch").value || "";
  const records = readRecords("boardingDog")
    .filter((record) => matches(record, query))
    .sort((a, b) => Number(isCurrentlyBoarding(b)) - Number(isCurrentlyBoarding(a)));
  $("#boardingDogTableBody").innerHTML = records.length
    ? records
        .map((record) => {
          const stay = currentOrNextStay(record);
          const rowClass = isCurrentlyBoarding(record) ? " class=\"is-current-boarding\"" : "";
          return `<tr data-id="${record.id}"${rowClass}><td>${record.dogName || ""}</td><td>${record.ownerName || ""}</td><td>${record.ownerPhone || ""}</td><td>${formatDateTime(stay?.dropoffTime) || ""}</td><td>${formatDateTime(stay?.pickupTime) || ""}</td><td>${record.flags?.includes("Required update from owner") ? "Yes" : "No"}</td><td>${[...(record.flags || []).filter((flag) => flag.includes("requested")), ...((stay?.requests || []).filter((flag) => flag.includes("requested")))].join(", ")}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="7">No matching boarding dogs. Use Add New Dog.</td></tr>`;
}

function currentOrNextStay(record) {
  const now = new Date();
  return [...(record.stays || [])]
    .sort((a, b) => new Date(a.dropoffTime) - new Date(b.dropoffTime))
    .find((stay) => new Date(stay.pickupTime) >= now) || null;
}

function isCurrentlyBoarding(record) {
  const now = new Date();
  return (record.stays || []).some((stay) => new Date(stay.dropoffTime) <= now && new Date(stay.pickupTime) >= now);
}

function openOwnedDog(record = {}) {
  $("#ownedDogDetail").hidden = false;
  $("#ownedDogDetailTitle").textContent = record.id ? `Edit ${record.callName || "Dog"}` : "Add New Dog";
  $("#ourDogForm").reset();
  setFormValues($("#ourDogForm"), record);
  setDogPhoto("owned", record);
  $("#ownedDogActivityPanel").hidden = !record.id;
  renderOwnedActivity(record);
  updateOwnedDogConditionalFields();
  window.scrollTo({ top: $("#ownedDogDetail").offsetTop - 12, behavior: "smooth" });
}

function openBoardingDog(record = {}) {
  $("#boardingDogDetail").hidden = false;
  $("#boardingDogDetailTitle").textContent = record.id ? `Edit ${record.dogName || "Boarding Dog"}` : "Add Boarding Dog";
  $("#boardingDogForm").reset();
  setFormValues($("#boardingDogForm"), record);
  setDogPhoto("boarding", record);
  $("#boardingSchedulePanel").hidden = !record.id;
  $$('input[name="boardingFlags"]').forEach((input) => {
    input.checked = (record.flags || []).includes(input.value);
  });
  renderBoardingStays(record);
  window.scrollTo({ top: $("#boardingDogDetail").offsetTop - 12, behavior: "smooth" });
}

function updateOwnedDogConditionalFields() {
  const sex = $("#ownedDogSex").value;
  const female = sex === "Female";
  [$("#ownedLastHeat"), $("#ownedNextHeat")].forEach((field) => {
    field.disabled = !female;
    if (!female) field.value = "";
  });
  [$("#ownedLastHeatLabel"), $("#ownedNextHeatLabel")].forEach((label) => label.classList.toggle("is-disabled-field", !female));
  updateDhppWarning();
}

function updateDhppWarning() {
  const value = $("#ownedDhppDate").value;
  const warning = $("#ownedDhppWarning");
  const label = $("#ownedDhppLabel");
  warning.textContent = "";
  label.classList.remove("is-orange-warning", "is-red-warning");
  if (!value) return;
  const monthsOld = (new Date() - new Date(`${value}T12:00:00`)) / (1000 * 60 * 60 * 24 * 30.4375);
  if (monthsOld >= 12) {
    warning.textContent = "! Over 1 year";
    label.classList.add("is-red-warning");
  } else if (monthsOld >= 11) {
    warning.textContent = "! 11 months old";
    label.classList.add("is-orange-warning");
  }
}

function hasRequiredPhoto(existing, photoInput, photoLink) {
  return Boolean(existing.profilePhotoData || existing.profilePhotoUrl || photoInput.files?.[0] || photoLink);
}

function activeOwnedDog() {
  const id = $("#ourDogForm").elements.id.value;
  return readRecords("ownedDog").find((record) => record.id === id);
}

function activeBoardingDog() {
  const id = $("#boardingDogForm").elements.id.value;
  return readRecords("boardingDog").find((record) => record.id === id);
}

function renderOwnedActivity(record = activeOwnedDog()) {
  const logs = [...(record?.exerciseLogs || []), ...(record?.trainingLogs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  $("#ownedActivityHistory").innerHTML = logs.length
    ? logs.map((log) => `<article class="record-card"><strong>${log.type} - ${log.date}</strong><p>${log.minutes ? `${log.minutes} minutes` : ""}${log.note ? log.note : ""}</p></article>`).join("")
    : "<p>No activity or training entries yet.</p>";
}

function addOwnedLog(type, minutes, note = "") {
  const dog = activeOwnedDog();
  if (!dog) {
    showToast("Save the dog first.");
    return;
  }
  const log = { id: uid("log"), type, date: todayDate(), minutes, note };
  if (type === "Training") {
    dog.trainingLogs = dog.trainingLogs || [];
    dog.trainingLogs.unshift(log);
  } else {
    dog.exerciseLogs = dog.exerciseLogs || [];
    dog.exerciseLogs.unshift(log);
  }
  const record = upsertRecord("ownedDog", dog);
  sendPayload(record);
  renderOwnedActivity(record);
  renderOwnedDogs();
  showToast(`${type} entry added.`);
}

function renderBoardingStays(record = activeBoardingDog()) {
  const stays = record?.stays || [];
  $("#boardingStayHistory").innerHTML = stays.length
    ? stays.map((stay) => `<article class="record-card"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><p>${(stay.requests || []).join(", ") || "No service requests"}</p><p>${stay.bathPlan || ""}</p><p>${stay.stayNotes || ""}</p></article>`).join("")
    : "<p>No boarding stays logged yet.</p>";
}

function bathPlanForStay(stay) {
  if (!(stay.requests || []).includes("Bath requested")) return "";
  const pickup = new Date(stay.pickupTime);
  const peak = pickup.getHours() >= 9 && pickup.getHours() < 11;
  return peak ? "Bath should be completed the day prior because pickup is during busy kennel hours." : "Bath can be done day-of if at least two hours are available before pickup.";
}

function renderRequests() {
  const records = readRecords("request");
  $("#requestRecords").innerHTML = records.length
    ? records.map((record) => `<article class="record-card ${record.urgentNeeds ? "is-urgent" : ""}"><strong>${record.urgentNeeds ? "Urgent: " : ""}${record.category}</strong><span>${record.requestedBy || "Unknown"} | ${formatDateTime(record.submittedAt)}</span><p>${record.requestText}</p></article>`).join("")
    : "<p>No requests saved yet.</p>";
}

function renderMaintenance() {
  const records = readRecords("maintenance");
  $("#maintenanceRecords").innerHTML = records.length
    ? records.map((record) => `<article class="record-card ${record.urgentAttention ? "is-urgent" : ""}"><strong>${record.urgentAttention ? "Urgent: " : ""}${record.location}</strong><span>${record.reportedBy || "Unknown"} | ${formatDateTime(record.submittedAt)}</span><p>${record.issue}</p><p>${record.mediaLink || record.mediaFiles || ""}</p></article>`).join("")
    : "<p>No maintenance items saved yet.</p>";
}

function renderAllRecords() {
  renderOwnedDogs();
  renderBoardingDogs();
  renderRequests();
  renderMaintenance();
  renderTimesheet();
}

function emailNow(subjectText, bodyText) {
  window.location.href = `mailto:${OWNER_ALERT_EMAIL}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
}

let activeClockIn = "";
function updateTimeDisplays() {
  $("#clockInDisplay").textContent = activeClockIn ? formatDateTime(activeClockIn) : "Not clocked in";
}

function weekStart(date) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  current.setDate(diff);
  current.setHours(0, 0, 0, 0);
  return current;
}

function inRange(record, start, end) {
  const date = new Date(record.clockInTime);
  return date >= start && date < end;
}

function sumHours(records) {
  return records.reduce((total, record) => total + Number(record.hours || 0), 0);
}

function renderTimesheet() {
  const records = readRecords("timesheet");
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

  $("#timesheetRows").innerHTML = currentWeekRecords.length
    ? currentWeekRecords.map((record) => `<tr><td>${record.date}</td><td>${record.helperName}</td><td>${formatDateTime(record.clockInTime)}</td><td>${formatDateTime(record.clockOutTime)}</td><td>${Number(record.hours).toFixed(2)}</td><td>${record.note || ""}</td></tr>`).join("")
    : `<tr><td colspan="6">No time entries for this week.</td></tr>`;

  $("#thisWeekHours").textContent = sumHours(currentWeekRecords).toFixed(2);
  $("#lastWeekHours").textContent = sumHours(records.filter((record) => inRange(record, lastWeekStart, thisWeekStart))).toFixed(2);
  $("#lastMonthHours").textContent = sumHours(records.filter((record) => inRange(record, lastMonthStart, thisMonthStart))).toFixed(2);
  $("#lastYearHours").textContent = sumHours(records.filter((record) => inRange(record, lastYearStart, thisYearStart))).toFixed(2);

  const helperTotals = currentWeekRecords.reduce((totals, record) => {
    totals[record.helperName] = (totals[record.helperName] || 0) + Number(record.hours || 0);
    return totals;
  }, {});
  $("#weeklyHelperTotals").innerHTML = Object.keys(helperTotals).length
    ? Object.entries(helperTotals).map(([helper, hours]) => `<div class="helper-total-item"><strong>${helper}</strong><span>${hours.toFixed(2)} hours this week</span></div>`).join("")
    : "";
}

function saveTimeEntry(payload) {
  const record = {
    type: "timesheet",
    id: uid("timesheet"),
    submittedAt: new Date().toISOString(),
    date: payload.date || payload.clockInTime.slice(0, 10),
    helperName: payload.helperName,
    helperEmail: payload.helperEmail || helperEmail.value,
    clockInTime: payload.clockInTime,
    clockOutTime: payload.clockOutTime,
    hours: hoursBetween(payload.clockInTime, payload.clockOutTime),
    note: payload.note || "",
  };
  upsertRecord("timesheet", record);
  sendPayload(record);
  renderTimesheet();
  showToast("Time entry saved.");
}

function initEvents() {
  $("#mobilePageSelect").addEventListener("change", (event) => switchPage(event.target.value));
  $$(".nav-button").forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });

  $("#helperPinLoginButton").addEventListener("click", loginWithPin);
  $("#helperPinInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loginWithPin();
    }
  });
  $("#clearHelperButton").addEventListener("click", clearHelper);
  form.addEventListener("change", () => {
    updateCompletionCount();
    updateConditionalSections();
    updateRotationBanner();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = buildDailyPayload();
    const saved = JSON.parse(localStorage.getItem("cthKennelSubmissions") || "[]");
    saved.unshift(payload);
    localStorage.setItem("cthKennelSubmissions", JSON.stringify(saved.slice(0, 10)));
    await sendPayload(payload);
    renderDemoSubmissions();
    showToast(GOOGLE_SCRIPT_URL ? "Kennel report sent." : "Demo saved. Google Sheet connection is not active yet.");
  });

  $("#clockInButton").addEventListener("click", () => {
    activeClockIn = new Date().toISOString();
    updateTimeDisplays();
    showToast("Clock in recorded.");
  });
  $("#clockOutButton").addEventListener("click", () => {
    if (!activeClockIn) {
      showToast("Clock in first, or use Manual Entry.");
      return;
    }
    saveTimeEntry({ helperName: helperName.value || "Unknown helper", helperEmail: helperEmail.value, clockInTime: activeClockIn, clockOutTime: new Date().toISOString() });
    activeClockIn = "";
    updateTimeDisplays();
  });
  $("#saveTimeEntryButton").addEventListener("click", () => {
    if (!activeClockIn) showToast("No active clock-in to save.");
  });
  $("#manualTimeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = formPayload(event.currentTarget);
    saveTimeEntry({ helperName: payload.manualHelper || helperName.value || "Unknown helper", date: payload.manualDate, clockInTime: payload.manualClockIn, clockOutTime: payload.manualClockOut, note: payload.manualNote });
    event.currentTarget.reset();
    $("#manualDate").value = todayDate();
    $("#manualHelper").value = helperName.value;
  });

  $("#ownedLastBath").addEventListener("change", () => ($("#ownedNextBath").value = addMonths($("#ownedLastBath").value, 1)));
  $("#ownedLastHeat").addEventListener("change", () => ($("#ownedNextHeat").value = addDays($("#ownedLastHeat").value, 183)));
  $("#ownedDogSex").addEventListener("change", updateOwnedDogConditionalFields);
  $("#ownedDhppDate").addEventListener("change", updateDhppWarning);
  $("#ownedDogSearch").addEventListener("input", renderOwnedDogs);
  $("#addOwnedDogButton").addEventListener("click", () => openOwnedDog());
  $("#cancelOwnedDogEdit").addEventListener("click", () => ($("#ownedDogDetail").hidden = true));
  $("#ownedDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openOwnedDog(readRecords("ownedDog").find((record) => record.id === row.dataset.id));
  });
  $("#ourDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const existing = activeOwnedDog() || {};
    const formData = formPayload(event.currentTarget);
    if (!hasRequiredPhoto(existing, $("#ownedDogPhotoInput"), formData.profilePhotoUrl)) {
      showToast("Add a profile photo or shared photo link before saving this dog.");
      return;
    }
    const photoData = await fileToDataUrl($("#ownedDogPhotoInput"));
    const isFemale = formData.sex === "Female";
    const payload = {
      ...existing,
      type: "ownedDog",
      submittedAt: existing.submittedAt || new Date().toISOString(),
      ...formData,
      rabiesGoodThreeYears: event.currentTarget.elements.rabiesGoodThreeYears.checked ? "Yes" : "",
      lastHeat: isFemale ? formData.lastHeat : "",
      nextHeat: isFemale ? formData.nextHeat : "",
      profilePhotoData: photoData || existing.profilePhotoData || "",
      exerciseLogs: existing.exerciseLogs || [],
      trainingLogs: existing.trainingLogs || [],
    };
    const record = upsertRecord("ownedDog", payload);
    await sendPayload(record);
    $("#ownedDogActivityPanel").hidden = false;
    setDogPhoto("owned", record);
    renderOwnedActivity(record);
    renderOwnedDogs();
    showToast("Dog record saved.");
  });
  $("#addTreadmillLog").addEventListener("click", () => {
    addOwnedLog("Treadmill", Number($("#ownedTreadmillMinutes").value || 0));
    $("#ownedTreadmillMinutes").value = "";
  });
  $("#addScooterLog").addEventListener("click", () => {
    addOwnedLog("Scooter", Number($("#ownedScooterMinutes").value || 0));
    $("#ownedScooterMinutes").value = "";
  });
  $("#addTrainingLog").addEventListener("click", () => {
    addOwnedLog("Training", "", $("#ownedTrainingEntry").value);
    $("#ownedTrainingEntry").value = "";
  });

  $("#boardingDogSearch").addEventListener("input", renderBoardingDogs);
  $("#addBoardingDogButton").addEventListener("click", () => openBoardingDog());
  $("#cancelBoardingDogEdit").addEventListener("click", () => ($("#boardingDogDetail").hidden = true));
  $("#boardingDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openBoardingDog(readRecords("boardingDog").find((record) => record.id === row.dataset.id));
  });
  $("#boardingDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const existing = activeBoardingDog() || {};
    const formData = formPayload(event.currentTarget);
    if (!hasRequiredPhoto(existing, $("#boardingDogPhotoInput"), formData.profilePhotoUrl)) {
      showToast("Add a profile photo or shared photo link before saving this boarding dog.");
      return;
    }
    const photoData = await fileToDataUrl($("#boardingDogPhotoInput"));
    const payload = {
      ...existing,
      type: "boardingDog",
      submittedAt: existing.submittedAt || new Date().toISOString(),
      ...formData,
      rabiesGoodThreeYears: event.currentTarget.elements.rabiesGoodThreeYears.checked ? "Yes" : "",
      flags: checkedFrom(event.currentTarget, "boardingFlags"),
      profilePhotoData: photoData || existing.profilePhotoData || "",
      stays: existing.stays || [],
    };
    const record = upsertRecord("boardingDog", payload);
    await sendPayload(record);
    $("#boardingSchedulePanel").hidden = false;
    setDogPhoto("boarding", record);
    renderBoardingStays(record);
    renderBoardingDogs();
    showToast("Boarding dog record saved.");
  });
  $("#boardingStayForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const dog = activeBoardingDog();
    if (!dog) {
      showToast("Save the boarding dog first.");
      return;
    }
    const payload = formPayload(event.currentTarget);
    const stay = {
      id: uid("stay"),
      createdAt: new Date().toISOString(),
      dropoffTime: payload.dropoffTime,
      pickupTime: payload.pickupTime,
      requests: checkedFrom(event.currentTarget, "stayRequests"),
      stayNotes: payload.stayNotes,
    };
    stay.bathPlan = bathPlanForStay(stay);
    dog.stays = dog.stays || [];
    dog.stays.unshift(stay);
    const record = upsertRecord("boardingDog", dog);
    await sendPayload(record);
    renderBoardingStays(record);
    renderBoardingDogs();
    event.currentTarget.reset();
    showToast("Boarding stay added.");
  });

  $("#requestForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = [...$("#requestMedia").files].map((file) => file.name).join(", ");
    const payload = { type: "request", id: uid("request"), submittedAt: new Date().toISOString(), ...formPayload(event.currentTarget), mediaFiles: files, urgentNeeds: event.currentTarget.querySelector('input[name="urgentNeeds"]').checked };
    upsertRecord("request", payload);
    await sendPayload(payload);
    if (payload.urgentNeeds) emailNow("Urgent Kennel Request", `Urgent kennel request submitted.\n\nRequested by: ${payload.requestedBy}\nCategory: ${payload.category}\nRequest: ${payload.requestText}\nReason: ${payload.reason}`);
    event.currentTarget.reset();
    renderRequests();
    showToast("Request saved.");
  });

  $("#maintenanceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = [...$("#maintenanceMedia").files].map((file) => file.name).join(", ");
    const payload = { type: "maintenance", id: uid("maintenance"), submittedAt: new Date().toISOString(), ...formPayload(event.currentTarget), mediaFiles: files, urgentAttention: event.currentTarget.querySelector('input[name="urgentAttention"]').checked };
    upsertRecord("maintenance", payload);
    await sendPayload(payload);
    if (payload.urgentAttention) emailNow("Urgent Kennel Maintenance Attention Needed", `Urgent maintenance item submitted.\n\nLocation: ${payload.location}\nReported by: ${payload.reportedBy}\nIssue: ${payload.issue}\nSuggested action: ${payload.suggestedAction}\nMedia link: ${payload.mediaLink || "No link pasted"}\nFiles selected: ${payload.mediaFiles || "None"}`);
    event.currentTarget.reset();
    renderMaintenance();
    showToast("Maintenance item saved.");
  });
}

function switchPage(pageId) {
  $$(".nav-button").forEach((item) => item.classList.toggle("is-active", item.dataset.page === pageId));
  $$(".page-view").forEach((page) => page.classList.toggle("is-active", page.id === pageId));
  $("#mobilePageSelect").value = pageId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

setDefaultDateAndDay();
updateConditionalSections();
updateRotationBanner();
updateCompletionCount();
updateTimeDisplays();
renderDemoSubmissions();
initEvents();
renderAllRecords();
loadRemoteRecords();
