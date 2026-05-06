const GOOGLE_SCRIPT_URL = "";

const form = document.querySelector("#kennelForm");
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
