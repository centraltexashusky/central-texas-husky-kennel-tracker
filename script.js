const GOOGLE_SCRIPT_URL = "";
const OWNER_ALERT_EMAIL = "centraltexashusky@gmail.com";

const form = document.querySelector("#kennelForm");
const menuToggle = document.querySelector("#menuToggle");
const sidebar = document.querySelector("#sidebar");
const navButtons = document.querySelectorAll(".nav-button");
const pageViews = document.querySelectorAll(".page-view");
const daySelect = document.querySelector("#dayOfWeek");
const mondaySection = document.querySelector("#mondaySection");
const tuesdaySection = document.querySelector("#tuesdaySection");
const completionText = document.querySelector("#completionText");
const recentSubmissions = document.querySelector("#recentSubmissions");
const rotationBanner = document.querySelector("#rotationBanner");
const toast = document.querySelector("#toast");
const helperName = document.querySelector("#helperName");
const helperEmail = document.querySelector("#helperEmail");
const loginStatus = document.querySelector("#loginStatus");
const loginHelp = document.querySelector("#loginHelp");
const reviewLoginButton = document.querySelector("#reviewLoginButton");
const clearHelperButton = document.querySelector("#clearHelperButton");
const helperKey = document.querySelector("#helperKey");
const clockInButton = document.querySelector("#clockInButton");
const clockOutButton = document.querySelector("#clockOutButton");
const clearTimesButton = document.querySelector("#clearTimesButton");
const clockInDisplay = document.querySelector("#clockInDisplay");
const clockOutDisplay = document.querySelector("#clockOutDisplay");
const totalTimeDisplay = document.querySelector("#totalTimeDisplay");
const clockInTime = document.querySelector("#clockInTime");
const clockOutTime = document.querySelector("#clockOutTime");
const totalMinutes = document.querySelector("#totalMinutes");
const ourDogForm = document.querySelector("#ourDogForm");
const boardingDogForm = document.querySelector("#boardingDogForm");
const requestForm = document.querySelector("#requestForm");
const maintenanceForm = document.querySelector("#maintenanceForm");
const ownedLastBath = document.querySelector("#ownedLastBath");
const ownedNextBath = document.querySelector("#ownedNextBath");
const ownedLastHeat = document.querySelector("#ownedLastHeat");
const ownedNextHeat = document.querySelector("#ownedNextHeat");
const ownedDogRecords = document.querySelector("#ownedDogRecords");
const boardingDogRecords = document.querySelector("#boardingDogRecords");
const requestRecords = document.querySelector("#requestRecords");
const maintenanceRecords = document.querySelector("#maintenanceRecords");

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function setDefaultDateAndDay() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  form.elements.date.value = `${yyyy}-${mm}-${dd}`;

  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
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

function getDeepCleanBuilding(date = new Date()) {
  const may2026Index = 4;
  const monthDelta = (date.getFullYear() - 2026) * 12 + date.getMonth() - may2026Index;
  return Math.abs(monthDelta) % 2 === 0 ? "Dog Mansion" : "Dog Shed";
}

function updateRotationBanner() {
  const selectedDate = form.elements.date.value ? new Date(`${form.elements.date.value}T12:00:00`) : new Date();
  const building = getDeepCleanBuilding(selectedDate);
  const monthLabel = `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  rotationBanner.textContent = `${monthLabel} rotation: deep clean ${building} during the first week.`;
}

function updateConditionalSections() {
  mondaySection.classList.toggle("is-muted", daySelect.value !== "Monday");
  tuesdaySection.classList.toggle("is-muted", daySelect.value !== "Tuesday");
}

function updateCompletionCount() {
  const checked = form.querySelectorAll('input[type="checkbox"]:checked').length;
  completionText.textContent = `${checked} task${checked === 1 ? "" : "s"} checked`;
}

function setHelper(user) {
  setDefaultDateAndDay();
  updateRotationBanner();
  updateConditionalSections();
  helperName.value = user.name || "";
  helperEmail.value = user.email || "";
  helperKey.value = user.key || "";
  loginStatus.textContent = user.name ? `Helper loaded: ${user.name}` : "Helper loaded";
  loginHelp.textContent = user.email || "Review mode helper account";
  reviewLoginButton.hidden = true;
  clearHelperButton.hidden = false;
}

function clearHelper() {
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  loginStatus.textContent = "Helper not loaded";
  loginHelp.textContent = "Open this page with a private helper link, or use review access for testing.";
  reviewLoginButton.hidden = false;
  clearHelperButton.hidden = true;
}

function loadHelperFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("helper") || params.get("name");
  const email = params.get("email");
  const key = params.get("key");

  if (name && email && key) {
    setHelper({ name, email, key });
  }
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

function updateTimeDisplays() {
  clockInDisplay.textContent = clockInTime.value ? formatDateTime(clockInTime.value) : "Not clocked in";
  clockOutDisplay.textContent = clockOutTime.value ? formatDateTime(clockOutTime.value) : "Not clocked out";

  if (clockInTime.value && clockOutTime.value) {
    const minutes = Math.max(0, Math.round((new Date(clockOutTime.value) - new Date(clockInTime.value)) / 60000));
    totalMinutes.value = String(minutes);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    totalTimeDisplay.textContent = `${hours}h ${remainingMinutes}m`;
  } else {
    totalMinutes.value = "";
    totalTimeDisplay.textContent = "Not calculated";
  }
}

function setClock(field) {
  field.value = new Date().toISOString();
  updateTimeDisplays();
}

function checkedValues(name) {
  return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function buildPayload() {
  const data = new FormData(form);
  return {
    submittedAt: new Date().toISOString(),
    date: data.get("date"),
    helperName: data.get("helperName"),
    helperEmail: data.get("helperEmail"),
    helperKey: data.get("helperKey"),
    dayOfWeek: data.get("dayOfWeek"),
    clockInTime: data.get("clockInTime"),
    clockOutTime: data.get("clockOutTime"),
    totalMinutes: data.get("totalMinutes"),
    dailyTasks: checkedValues("dailyTasks"),
    dogsExercised: data.get("dogsExercised"),
    dogsBathed: data.get("dogsBathed"),
    healthConcern: data.get("healthConcern"),
    healthNotes: data.get("healthNotes"),
    socialContent: data.get("socialContent"),
    weeklyTasks: checkedValues("weeklyTasks"),
    tuesdayTasks: checkedValues("tuesdayTasks"),
    monthlyWeek: data.get("monthlyWeek"),
    deepCleanBuilding: data.get("deepCleanBuilding"),
    monthlyTasks: checkedValues("monthlyTasks"),
    suppliesLow: checkedValues("suppliesLow"),
    ownerNotes: data.get("ownerNotes"),
  };
}

function saveDemoSubmission(payload) {
  const key = "cthKennelSubmissions";
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  saved.unshift(payload);
  localStorage.setItem(key, JSON.stringify(saved.slice(0, 10)));
}

function renderSubmissions() {
  const saved = JSON.parse(localStorage.getItem("cthKennelSubmissions") || "[]");
  if (!saved.length) {
    recentSubmissions.innerHTML = `<p>No demo submissions yet.</p>`;
    return;
  }

  recentSubmissions.innerHTML = saved
    .map(
      (submission) => `
        <article class="submission-item">
          <strong>${submission.date || "No date"} - ${submission.helperName || "Helper"}</strong>
          <p>${submission.dayOfWeek || "No day"} | ${submission.dailyTasks.length} daily tasks | ${submission.healthConcern}</p>
          <p>Social: ${submission.socialContent || "No content note"}</p>
        </article>
      `,
    )
    .join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
}

async function submitToGoogleSheet(payload) {
  if (!GOOGLE_SCRIPT_URL) {
    saveDemoSubmission(payload);
    renderSubmissions();
    showToast("Demo saved. Google Sheet connection is not active yet.");
    return;
  }

  const response = await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  showToast("Kennel report sent.");
  return response;
}

async function submitOperationalRecord(payload) {
  if (!GOOGLE_SCRIPT_URL) {
    saveRecord(payload.type, payload);
    showToast(`${payload.label || "Record"} saved in review mode.`);
    renderAllRecords();
    return;
  }

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  showToast(`${payload.label || "Record"} sent.`);
}

function saveRecord(type, payload) {
  const key = `cth-${type}-records`;
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  saved.unshift(payload);
  localStorage.setItem(key, JSON.stringify(saved.slice(0, 30)));
}

function readRecords(type) {
  return JSON.parse(localStorage.getItem(`cth-${type}-records`) || "[]");
}

function renderRecordList(container, records, emptyText, cardBuilder) {
  if (!records.length) {
    container.innerHTML = `<p>${emptyText}</p>`;
    return;
  }
  container.innerHTML = records.map(cardBuilder).join("");
}

function renderAllRecords() {
  renderRecordList(ownedDogRecords, readRecords("ownedDog"), "No dog records saved yet.", (record) => `
    <article class="record-card">
      <strong>${record.callName || "Unnamed dog"}</strong>
      <span>${record.showName || "No show name"} | ${record.sex || "No sex"} | DOB: ${record.dateOfBirth || "Not set"}</span>
      <p>Next bath: ${record.nextBath || "Not set"}${record.nextHeat ? ` | Next heat: ${record.nextHeat}` : ""}</p>
      <p>${record.specialCare || record.notes || ""}</p>
    </article>
  `);

  renderRecordList(boardingDogRecords, readRecords("boardingDog"), "No boarding records saved yet.", (record) => `
    <article class="record-card">
      <strong>${record.dogName || "Unnamed boarding dog"}</strong>
      <span>Owner: ${record.ownerName || "Not set"} | ${record.ownerPhone || "No phone"}</span>
      <p>Drop-off: ${record.dropoffTime || "Not set"} | Pick-up: ${record.pickupTime || "Not set"}</p>
      <p>${record.flags?.includes("Required update from owner") ? "Required update from owner. " : ""}${record.specialCare || ""}</p>
    </article>
  `);

  renderRecordList(requestRecords, readRecords("request"), "No requests saved yet.", (record) => `
    <article class="record-card">
      <strong>${record.category || "Request"}</strong>
      <span>By: ${record.requestedBy || "Not set"} | ${record.submittedAt}</span>
      <p>${record.requestText || ""}</p>
    </article>
  `);

  renderRecordList(maintenanceRecords, readRecords("maintenance"), "No maintenance items saved yet.", (record) => `
    <article class="record-card ${record.urgentAttention ? "is-urgent" : ""}">
      <strong>${record.urgentAttention ? "Urgent: " : ""}${record.location || "Maintenance"}</strong>
      <span>By: ${record.reportedBy || "Not set"} | ${record.submittedAt}</span>
      <p>${record.issue || ""}</p>
    </article>
  `);
}

function formPayload(targetForm) {
  const data = new FormData(targetForm);
  return Object.fromEntries(data.entries());
}

function checkedFrom(targetForm, name) {
  return [...targetForm.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);
}

function maybeOpenUrgentEmail(payload) {
  if (!payload.urgentAttention) return;
  const subject = encodeURIComponent("Urgent Kennel Maintenance Attention Needed");
  const body = encodeURIComponent(
    `Urgent maintenance item submitted.\n\nLocation: ${payload.location}\nReported by: ${payload.reportedBy}\nIssue: ${payload.issue}\nSuggested action: ${payload.suggestedAction}\n\nPlease address or schedule right away.`,
  );
  window.location.href = `mailto:${OWNER_ALERT_EMAIL}?subject=${subject}&body=${body}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!helperName.value || !helperEmail.value) {
    showToast("Please open the private helper link before submitting.");
    return;
  }

  if (!clockInTime.value || !clockOutTime.value) {
    showToast("Please clock in and clock out before submitting.");
    return;
  }

  const payload = buildPayload();
  await submitToGoogleSheet(payload);
});

form.addEventListener("change", () => {
  updateCompletionCount();
  updateConditionalSections();
  updateRotationBanner();
});

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    navButtons.forEach((item) => item.classList.remove("is-active"));
    pageViews.forEach((page) => page.classList.remove("is-active"));
    button.classList.add("is-active");
    document.querySelector(`#${button.dataset.page}`)?.classList.add("is-active");
    sidebar.classList.remove("is-open");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

ownedLastBath.addEventListener("change", () => {
  ownedNextBath.value = addMonths(ownedLastBath.value, 1);
});

ownedLastHeat.addEventListener("change", () => {
  ownedNextHeat.value = addDays(ownedLastHeat.value, 183);
});

ourDogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    type: "ownedDog",
    label: "Dog record",
    submittedAt: new Date().toISOString(),
    ...formPayload(ourDogForm),
  };
  await submitOperationalRecord(payload);
  ourDogForm.reset();
});

boardingDogForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    type: "boardingDog",
    label: "Boarding record",
    submittedAt: new Date().toISOString(),
    ...formPayload(boardingDogForm),
    flags: checkedFrom(boardingDogForm, "boardingFlags"),
  };
  await submitOperationalRecord(payload);
  boardingDogForm.reset();
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    type: "request",
    label: "Request",
    submittedAt: new Date().toISOString(),
    ...formPayload(requestForm),
  };
  await submitOperationalRecord(payload);
  requestForm.reset();
});

maintenanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    type: "maintenance",
    label: "Maintenance item",
    submittedAt: new Date().toISOString(),
    ...formPayload(maintenanceForm),
    urgentAttention: maintenanceForm.querySelector('input[name="urgentAttention"]').checked,
  };
  await submitOperationalRecord(payload);
  maybeOpenUrgentEmail(payload);
  maintenanceForm.reset();
});

reviewLoginButton.addEventListener("click", () => {
  setHelper({
    name: "Ms. Yuko",
    email: "review-helper@centraltexashusky.com",
    key: "review",
  });
});

clearHelperButton.addEventListener("click", clearHelper);
clockInButton.addEventListener("click", () => setClock(clockInTime));
clockOutButton.addEventListener("click", () => setClock(clockOutTime));
clearTimesButton.addEventListener("click", () => {
  clockInTime.value = "";
  clockOutTime.value = "";
  totalMinutes.value = "";
  updateTimeDisplays();
});

setDefaultDateAndDay();
updateConditionalSections();
updateRotationBanner();
updateCompletionCount();
updateTimeDisplays();
renderSubmissions();
loadHelperFromUrl();
renderAllRecords();
