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
const syncNowButton = $("#syncNowButton");
let syncIntervalId = null;
let currentUser = null;

const HELPER_PINS = {
  "1001": { name: "Ms. Yuko", email: "yuko@centraltexashusky.com", key: "helper-yuko" },
  "1002": { name: "Lexi", email: "lexi@centraltexashusky.com", key: "helper-lexi" },
};

const ADMIN_PINS = {
  "9001": { name: "Owner Admin", email: "centraltexashusky@gmail.com", key: "admin-owner", role: "admin" },
};

const stateKeys = {
  ownedDog: "cth-ownedDog-records",
  boardingDog: "cth-boardingDog-records",
  request: "cth-request-records",
  maintenance: "cth-maintenance-records",
  timesheet: "cth-timesheet-records",
  service: "cth-service-records",
  session: "cth-current-session",
};

const defaultServices = [
  { serviceName: "Companion Puppy Placement", category: "Puppy placement", basePrice: "1800", unit: "per puppy", depositAmount: "500", defaultDuration: "", flags: ["Active", "Admin only"], pricingNotes: "Recommended range $1,500-$2,200 for standard companion puppies." },
  { serviceName: "Older Puppy Hold Deposit", category: "Deposit", basePrice: "500", unit: "flat deposit", depositAmount: "500", defaultDuration: "3-7 day hold", flags: ["Active", "Admin only"], pricingNotes: "Lower friction than a 50% reservation while still confirming intent." },
  { serviceName: "Private Yard Rental", category: "Private yard rental", basePrice: "12", unit: "per dog/hour", depositAmount: "", defaultDuration: "60 minutes", flags: ["Active", "Owner bookable later", "Vaccine proof required"], pricingNotes: "Test $10-$12 per dog/hour first; premium slots can be $15-$20." },
  { serviceName: "Husky De-shed", category: "Grooming", basePrice: "75", unit: "per service", depositAmount: "", defaultDuration: "60-90 minutes", flags: ["Active"], pricingNotes: "Price as labor-intensive coat work, not a small bath add-on." },
  { serviceName: "Treadmill Exercise", category: "Exercise", basePrice: "25", unit: "per session", depositAmount: "", defaultDuration: "30 minutes", flags: ["Active"], pricingNotes: "Good add-on for boarding/alumni care." },
  { serviceName: "Alumni Overnight Care", category: "Boarding", basePrice: "65", unit: "per night", depositAmount: "100", defaultDuration: "overnight", flags: ["Active", "Alumni only", "Vaccine proof required"], pricingNotes: "Keep alumni-only while capacity, insurance, and procedures are proven." },
];

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
  return Object.fromEntries([...new FormData(targetForm).entries()].filter(([, value]) => !(value instanceof File)));
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
  const img = isOwned ? $("#ownedDogPhotoPreview") : $("#boardingDogPhotoPreview");
  const caption = isOwned ? $("#ownedDogPhotoName") : $("#boardingDogPhotoName");
  const initials = isOwned ? $("#ownedDogPhotoInitials") : $("#boardingDogPhotoInitials");
  const name = isOwned ? record.callName : record.dogName;
  const photo = record.profilePhotoData || record.profilePhotoUrl;
  if (photo) {
    img.src = photo;
    img.hidden = false;
    initials.hidden = true;
  } else {
    img.removeAttribute("src");
    img.hidden = true;
    initials.hidden = false;
  }
  initials.textContent = avatarText(name);
  caption.textContent = name || (isOwned ? "New dog" : "New boarding dog");
}

async function previewSelectedDogPhoto(kind) {
  const isOwned = kind === "owned";
  const input = isOwned ? $("#ownedDogPhotoInput") : $("#boardingDogPhotoInput");
  const img = isOwned ? $("#ownedDogPhotoPreview") : $("#boardingDogPhotoPreview");
  const initials = isOwned ? $("#ownedDogPhotoInitials") : $("#boardingDogPhotoInitials");
  const dataUrl = await fileToDataUrl(input);
  if (!dataUrl) return;
  img.src = dataUrl;
  img.hidden = false;
  initials.hidden = true;
  clearFieldError(isOwned ? $("#ourDogForm").elements.profilePhotoUrl : $("#boardingDogForm").elements.profilePhotoUrl);
}

function avatarText(name = "") {
  const clean = name.trim();
  if (!clean) return "Dog";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 3400);
}

function setHelper(user) {
  currentUser = { ...user, role: user.role || "helper" };
  localStorage.setItem(stateKeys.session, JSON.stringify(currentUser));
  setDefaultDateAndDay();
  helperName.value = user.name || "";
  helperEmail.value = user.email || "";
  helperKey.value = user.key || "";
  $("#manualHelper").value = user.name || "";
  $("#timesheetHelperDisplay").textContent = currentUser.name || "No user loaded";
  loginStatus.textContent = currentUser.name ? `${currentUser.role === "admin" ? "Admin" : "Helper"} logged in: ${currentUser.name}` : "Logged in";
  loginHelp.textContent = `${currentUser.email || "PIN account"} | Access: ${currentUser.role}`;
  $("#helperPinInput").value = "";
  $("#clearHelperButton").hidden = false;
  updateNavigationAccess();
  switchPage(currentUser.role === "admin" ? "dashboardPage" : "timesheetPage");
}

function clearHelper() {
  currentUser = null;
  localStorage.removeItem(stateKeys.session);
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  $("#manualHelper").value = "";
  $("#timesheetHelperDisplay").textContent = "No user loaded";
  loginStatus.textContent = "Not logged in";
  loginHelp.textContent = "Helpers use their 4 digit PIN. Admin uses the owner/admin PIN.";
  $("#helperPinInput").value = "";
  $("#clearHelperButton").hidden = true;
  updateNavigationAccess();
  switchPage("loginPage");
}

function loginWithPin() {
  const pin = $("#helperPinInput").value.trim();
  const account = ADMIN_PINS[pin] || HELPER_PINS[pin];
  if (!account) {
    showToast("PIN not recognized.");
    return;
  }
  setHelper(account);
  showToast(`${account.name} is logged in.`);
}

function helperIsLoggedIn() {
  return Boolean(currentUser?.key);
}

function currentRole() {
  return currentUser?.role || "";
}

function pageAllowed(pageId) {
  if (pageId === "loginPage") return true;
  const button = $(`.nav-button[data-page="${pageId}"]`);
  const roles = (button?.dataset.roles || "helper,admin").split(",");
  return helperIsLoggedIn() && roles.includes(currentRole());
}

function updateNavigationAccess() {
  $$(".nav-button").forEach((button) => {
    const locked = !pageAllowed(button.dataset.page);
    button.disabled = locked;
    button.classList.toggle("is-locked", locked);
  });
  [...$("#mobilePageSelect").options].forEach((option) => {
    option.disabled = !pageAllowed(option.value);
  });
}

function restoreSession() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.session) || "null");
  if (!saved?.key) return;
  currentUser = saved;
  helperName.value = saved.name || "";
  helperEmail.value = saved.email || "";
  helperKey.value = saved.key || "";
  $("#manualHelper").value = saved.name || "";
  $("#timesheetHelperDisplay").textContent = saved.name || "No user loaded";
  loginStatus.textContent = `${saved.role === "admin" ? "Admin" : "Helper"} logged in: ${saved.name}`;
  loginHelp.textContent = `${saved.email || "PIN account"} | Access: ${saved.role}`;
  $("#clearHelperButton").hidden = false;
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
    modeLabel.textContent = "Sending...";
    await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payloadForSheet(payload)),
    });
    modeLabel.textContent = "Sent";
    window.setTimeout(loadRemoteRecords, 1600);
  } catch (error) {
    modeLabel.textContent = "Sync failed";
  }
}

function loadRemoteRecords() {
  if (!GOOGLE_SCRIPT_URL) return;
  const callbackName = `cthRemote_${Date.now()}`;
  modeLabel.textContent = "Syncing...";
  syncNowButton.disabled = true;
  const timeoutId = window.setTimeout(() => {
    modeLabel.textContent = "Sync failed";
    syncNowButton.disabled = false;
    delete window[callbackName];
    script.remove();
  }, 12000);
  window[callbackName] = (data) => {
    window.clearTimeout(timeoutId);
    ["ownedDog", "boardingDog", "request", "maintenance", "timesheet", "service"].forEach((type) => mergeRecords(type, data[type] || []));
    renderAllRecords();
    modeLabel.textContent = "Synced";
    syncNowButton.disabled = false;
    delete window[callbackName];
    script.remove();
  };
  const script = document.createElement("script");
  script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}&v=${Date.now()}`;
  script.onerror = () => {
    window.clearTimeout(timeoutId);
    modeLabel.textContent = "Sync failed";
    syncNowButton.disabled = false;
    delete window[callbackName];
    script.remove();
  };
  document.body.appendChild(script);
}

function startAutoSync() {
  if (!GOOGLE_SCRIPT_URL || syncIntervalId) return;
  syncIntervalId = window.setInterval(loadRemoteRecords, 15000);
}

function payloadForSheet(payload) {
  const copy = { ...payload };
  delete copy.profilePhotoData;
  delete copy.profilePhoto;
  delete copy.requestMedia;
  delete copy.maintenanceMedia;
  return copy;
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

const fieldHelp = {
  date: "Required for the daily record.",
  dayOfWeek: "Required so Monday and Tuesday tasks show correctly.",
  helperName: "Filled in after PIN login.",
  helperEmail: "Filled in after PIN login.",
  socialContent: "Required. A short note is enough.",
  callName: "Required for Our Dogs.",
  dogName: "Required for Boarding Dogs.",
  sex: "Required for health and care tracking.",
  spayNeuterStatus: "Required. Choose Unknown if unsure.",
  ownerName: "Required for boarding contact records.",
  ownerPhone: "Required for boarding contact records.",
  emergencyName: "Required for boarding safety.",
  emergencyPhone: "Required for boarding safety.",
  dropoffTime: "Required for boarding schedule reminders.",
  pickupTime: "Required for boarding schedule reminders.",
  requestText: "Required. Describe what is needed or suggested.",
  issue: "Required. Describe what needs attention.",
  manualClockIn: "Required for manual time entries.",
  manualClockOut: "Required for manual time entries.",
  serviceName: "Required for the pricing catalog.",
  category: "Required so revenue can be grouped.",
  basePrice: "Required. Use 0 only for no-charge services.",
  unit: "Required so staff knows how the price is applied.",
};

function setupRequiredFields() {
  $$("label").forEach((label) => {
    const field = label.querySelector("input, select, textarea");
    if (!field || field.type === "checkbox" || field.type === "file") return;
    if (!label.querySelector(".field-label-text")) {
      const firstText = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (firstText) {
        const text = firstText.textContent.trim();
        firstText.textContent = "";
        const title = document.createElement("span");
        title.className = "field-label-text";
        title.innerHTML = `<span>${text}</span>`;
        label.insertBefore(title, label.firstChild);
      }
    }
    if (field.required) {
      const title = label.querySelector(".field-label-text");
      if (title && !title.querySelector(".required-mark")) {
        title.insertAdjacentHTML("beforeend", '<span class="required-mark">Required</span>');
      }
      if (!label.querySelector(".field-help") && fieldHelp[field.name]) {
        field.insertAdjacentHTML("afterend", `<span class="field-help">${fieldHelp[field.name]}</span>`);
      }
    }
    if (!label.querySelector(".field-error")) {
      label.insertAdjacentHTML("beforeend", '<span class="field-error"></span>');
    }
    field.addEventListener("input", () => clearFieldError(field));
    field.addEventListener("change", () => clearFieldError(field));
  });
}

function fieldLabel(field) {
  return field.closest("label");
}

function clearFieldError(field) {
  const label = fieldLabel(field);
  if (!label) return;
  label.classList.remove("has-error");
  const error = label.querySelector(".field-error");
  if (error) error.textContent = "";
}

function setFieldError(field, message) {
  const label = fieldLabel(field);
  if (!label) return;
  label.classList.add("has-error");
  const error = label.querySelector(".field-error");
  if (error) error.textContent = message;
}

function friendlyName(field) {
  return fieldLabel(field)?.querySelector(".field-label-text span")?.textContent || field.name || "This field";
}

function validateForm(targetForm, extraChecks = []) {
  let firstInvalid = null;
  [...targetForm.elements].forEach((field) => field.name && clearFieldError(field));
  [...targetForm.elements].forEach((field) => {
    if (!field.name || field.disabled || field.type === "hidden" || field.type === "file") return;
    const empty = field.required && !String(field.value || "").trim();
    const badFormat = field.value && !field.checkValidity();
    if (empty || badFormat) {
      const message = empty ? `${friendlyName(field)} is required before saving.` : `Check ${friendlyName(field).toLowerCase()} before saving.`;
      setFieldError(field, message);
      firstInvalid = firstInvalid || field;
    }
  });
  extraChecks.forEach(({ field, message, valid }) => {
    if (valid) return;
    setFieldError(field, message);
    firstInvalid = firstInvalid || field;
  });
  if (firstInvalid) {
    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast("Please fix the highlighted fields before saving.");
    return false;
  }
  return true;
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
  const showCompleted = $("#showCompletedRequests")?.checked;
  const records = readRecords("request").filter((record) => showCompleted || !record.completed);
  $("#requestRecords").innerHTML = records.length
    ? records
        .map(
          (record) =>
            `<article class="record-card ${record.urgentNeeds ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}"><strong>${record.completed ? "Completed: " : ""}${record.urgentNeeds ? "Urgent: " : ""}${record.category}</strong><span>${record.requestedBy || "Unknown"} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${record.requestText}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-request" data-id="${record.id}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button></div></article>`,
        )
        .join("")
    : `<p>${showCompleted ? "No requests saved yet." : "No active requests. Turn on completed history to review finished items."}</p>`;
}

function renderMaintenance() {
  const showCompleted = $("#showCompletedMaintenance")?.checked;
  const records = readRecords("maintenance").filter((record) => showCompleted || !record.completed);
  $("#maintenanceRecords").innerHTML = records.length
    ? records
        .map(
          (record) =>
            `<article class="record-card ${record.urgentAttention ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}"><strong>${record.completed ? "Completed: " : ""}${record.urgentAttention ? "Urgent: " : ""}${record.location}</strong><span>${record.reportedBy || "Unknown"} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${record.issue}</p><p>${record.mediaLink || record.mediaFiles || ""}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-maintenance" data-id="${record.id}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button></div></article>`,
        )
        .join("")
    : `<p>${showCompleted ? "No maintenance items saved yet." : "No active maintenance items. Turn on completed history to review finished items."}</p>`;
}

function money(value) {
  const number = Number(value || 0);
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function dashboardMetrics() {
  const ownedDogs = readRecords("ownedDog");
  const boardingDogs = readRecords("boardingDog");
  const requests = readRecords("request");
  const maintenance = readRecords("maintenance");
  const services = readRecords("service");
  const today = todayDate();
  const currentBoarding = boardingDogs.filter(isCurrentlyBoarding);
  const arrivals = [];
  const departures = [];
  const bathDue = [];
  let ownerUpdates = 0;
  boardingDogs.forEach((dog) => {
    if ((dog.flags || []).includes("Required update from owner")) ownerUpdates += 1;
    (dog.stays || []).forEach((stay) => {
      if (stay.dropoffTime?.slice(0, 10) === today) arrivals.push(dog.dogName);
      if (stay.pickupTime?.slice(0, 10) === today) departures.push(dog.dogName);
      if ((stay.requests || []).includes("Bath requested") && stay.pickupTime?.slice(0, 10) === today) bathDue.push(dog.dogName);
    });
  });
  const vaccineIssues = ownedDogs.filter((dog) => {
    const dhpp = dog.dhppDate ? (new Date() - new Date(`${dog.dhppDate}T12:00:00`)) / 86400000 : 0;
    return dhpp >= 335;
  }).length;
  const activeServices = services.filter((service) => (service.flags || []).includes("Active"));
  const depositServices = services.filter((service) => Number(service.depositAmount || 0) > 0);
  return {
    ownedDogs,
    currentBoarding,
    arrivals,
    departures,
    bathDue,
    ownerUpdates,
    vaccineIssues,
    openRequests: requests.filter((record) => !record.completed).length,
    urgentMaintenance: maintenance.filter((record) => !record.completed && record.urgentAttention).length,
    openMaintenance: maintenance.filter((record) => !record.completed).length,
    activeServices,
    depositServices,
  };
}

function renderDashboard() {
  if (!$("#dashboardCards")) return;
  const metrics = dashboardMetrics();
  const cards = [
    ["Dogs on property", metrics.ownedDogs.length + metrics.currentBoarding.length, "Owned dogs plus active boarding dogs."],
    ["Arrivals today", metrics.arrivals.length, metrics.arrivals.join(", ") || "None scheduled."],
    ["Departures today", metrics.departures.length, metrics.departures.join(", ") || "None scheduled."],
    ["Baths due today", metrics.bathDue.length, metrics.bathDue.join(", ") || "None due."],
    ["Vaccine warnings", metrics.vaccineIssues, "DHPP at 11+ months or overdue."],
    ["Owner updates needed", metrics.ownerUpdates, "Boarding records flagged for owner update."],
    ["Open requests", metrics.openRequests, "Active supply/process requests."],
    ["Open maintenance", metrics.openMaintenance, `${metrics.urgentMaintenance} urgent.`],
    ["Active services", metrics.activeServices.length, "Admin pricing catalog."],
    ["Deposit products", metrics.depositServices.length, "Services with deposit amounts."],
  ];
  $("#dashboardCards").innerHTML = cards.map(([label, value, note]) => `<article class="dashboard-card"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`).join("");
  const alerts = [];
  if (metrics.urgentMaintenance) alerts.push(`${metrics.urgentMaintenance} urgent maintenance item${metrics.urgentMaintenance === 1 ? "" : "s"} open.`);
  if (metrics.vaccineIssues) alerts.push(`${metrics.vaccineIssues} dog vaccine warning${metrics.vaccineIssues === 1 ? "" : "s"} need review.`);
  if (metrics.ownerUpdates) alerts.push(`${metrics.ownerUpdates} boarding dog owner update${metrics.ownerUpdates === 1 ? "" : "s"} needed.`);
  if (metrics.bathDue.length) alerts.push(`Bath due before pickup today: ${metrics.bathDue.join(", ")}.`);
  $("#dashboardAlerts").innerHTML = alerts.length
    ? alerts.map((alert) => `<article class="record-card is-urgent"><strong>Attention</strong><p>${alert}</p></article>`).join("")
    : "<p>No urgent dashboard alerts right now.</p>";
}

function renderFinancials() {
  if (!$("#financialCards")) return;
  const services = readRecords("service");
  const activeServices = services.filter((service) => (service.flags || []).includes("Active"));
  const catalogValue = activeServices.reduce((total, service) => total + Number(service.basePrice || 0), 0);
  const depositExposure = services.reduce((total, service) => total + Number(service.depositAmount || 0), 0);
  const puppyServices = services.filter((service) => service.category === "Puppy placement");
  const yardRental = services.find((service) => service.category === "Private yard rental");
  const cards = [
    ["Active service count", activeServices.length, "Editable services currently active."],
    ["Catalog price total", money(catalogValue), "Sum of active base prices for quick review."],
    ["Deposit settings total", money(depositExposure), "Deposits configured across services."],
    ["Puppy price bands", puppyServices.length, "Placement options in the catalog."],
    ["Yard rental rate", yardRental ? `${money(yardRental.basePrice)} ${yardRental.unit}` : "Not set", "Suggested start: $10-$12 per dog/hour."],
    ["Open revenue tasks", readRecords("request").filter((record) => !record.completed && /price|revenue|yard|service|deposit/i.test(JSON.stringify(record))).length, "Requests mentioning pricing/revenue/service."],
  ];
  $("#financialCards").innerHTML = cards.map(([label, value, note]) => `<article class="dashboard-card"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`).join("");
}

function renderServices() {
  const records = readRecords("service");
  $("#serviceTableBody").innerHTML = records.length
    ? records
        .map((record) => `<tr data-id="${record.id}"><td>${record.serviceName || ""}</td><td>${record.category || ""}</td><td>${money(record.basePrice)}</td><td>${record.unit || ""}</td><td>${record.depositAmount ? money(record.depositAmount) : ""}</td><td>${(record.flags || []).join(", ")}</td></tr>`)
        .join("")
    : `<tr><td colspan="6">No services saved yet.</td></tr>`;
}

function openService(record = {}) {
  $("#serviceForm").reset();
  setFormValues($("#serviceForm"), record);
  $$('input[name="serviceFlags"]').forEach((input) => {
    input.checked = (record.flags || ["Active"]).includes(input.value);
  });
}

async function toggleRecordCompletion(type, id) {
  const record = readRecords(type).find((item) => item.id === id);
  if (!record) return;
  const nextCompleted = !record.completed;
  const updated = upsertRecord(type, {
    ...record,
    status: nextCompleted ? "Completed" : "Active",
    completed: nextCompleted,
    completedAt: nextCompleted ? new Date().toISOString() : "",
    completedBy: nextCompleted ? helperName.value || "Owner" : "",
  });
  await sendPayload(updated);
  if (type === "request") renderRequests();
  if (type === "maintenance") renderMaintenance();
  showToast(nextCompleted ? "Moved to completed history." : "Moved back to active list.");
}

function renderAllRecords() {
  renderDashboard();
  renderOwnedDogs();
  renderBoardingDogs();
  renderRequests();
  renderMaintenance();
  renderTimesheet();
  renderServices();
  renderFinancials();
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
  syncNowButton.addEventListener("click", loadRemoteRecords);

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
    if (!validateForm(event.currentTarget)) return;
    const payload = buildDailyPayload();
    const saved = JSON.parse(localStorage.getItem("cthKennelSubmissions") || "[]");
    saved.unshift(payload);
    localStorage.setItem("cthKennelSubmissions", JSON.stringify(saved.slice(0, 10)));
    await sendPayload(payload);
    renderDemoSubmissions();
    showToast(GOOGLE_SCRIPT_URL ? "Kennel report sent." : "Demo saved. Google Sheet connection is not active yet.");
  });

  $("#clockInButton").addEventListener("click", () => {
    if (!helperIsLoggedIn()) {
      showToast("Enter your helper PIN first.");
      return;
    }
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
    if (!helperIsLoggedIn()) {
      showToast("Enter your helper PIN first.");
      return;
    }
    if (!validateForm(event.currentTarget)) return;
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
  $("#ownedDogPhotoPicker").addEventListener("click", () => $("#ownedDogPhotoInput").click());
  $("#ownedDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("owned"));
  $("#ownedDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openOwnedDog(readRecords("ownedDog").find((record) => record.id === row.dataset.id));
  });
  $("#ourDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const existing = activeOwnedDog() || {};
    const formData = formPayload(event.currentTarget);
    const photoField = event.currentTarget.elements.profilePhotoUrl;
    const hasPhoto = hasRequiredPhoto(existing, $("#ownedDogPhotoInput"), formData.profilePhotoUrl);
    if (!validateForm(event.currentTarget, [{ field: photoField, valid: hasPhoto, message: "Add a profile photo by tapping the square, or paste a shared photo link." }])) return;
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
  $("#boardingDogPhotoPicker").addEventListener("click", () => $("#boardingDogPhotoInput").click());
  $("#boardingDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("boarding"));
  $("#boardingDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openBoardingDog(readRecords("boardingDog").find((record) => record.id === row.dataset.id));
  });
  $("#boardingDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const existing = activeBoardingDog() || {};
    const formData = formPayload(event.currentTarget);
    const photoField = event.currentTarget.elements.profilePhotoUrl;
    const hasPhoto = hasRequiredPhoto(existing, $("#boardingDogPhotoInput"), formData.profilePhotoUrl);
    if (!validateForm(event.currentTarget, [{ field: photoField, valid: hasPhoto, message: "Add a profile photo by tapping the square, or paste a shared photo link." }])) return;
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
    if (!validateForm(event.currentTarget)) return;
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
    if (!validateForm(event.currentTarget)) return;
    const files = [...$("#requestMedia").files].map((file) => file.name).join(", ");
    const payload = { type: "request", id: uid("request"), submittedAt: new Date().toISOString(), status: "Active", completed: false, completedAt: "", completedBy: "", ...formPayload(event.currentTarget), mediaFiles: files, urgentNeeds: event.currentTarget.querySelector('input[name="urgentNeeds"]').checked };
    upsertRecord("request", payload);
    await sendPayload(payload);
    if (payload.urgentNeeds) emailNow("Urgent Kennel Request", `Urgent kennel request submitted.\n\nRequested by: ${payload.requestedBy}\nCategory: ${payload.category}\nRequest: ${payload.requestText}\nReason: ${payload.reason}`);
    event.currentTarget.reset();
    renderRequests();
    showToast("Request saved.");
  });

  $("#maintenanceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const files = [...$("#maintenanceMedia").files].map((file) => file.name).join(", ");
    const payload = { type: "maintenance", id: uid("maintenance"), submittedAt: new Date().toISOString(), status: "Active", completed: false, completedAt: "", completedBy: "", ...formPayload(event.currentTarget), mediaFiles: files, urgentAttention: event.currentTarget.querySelector('input[name="urgentAttention"]').checked };
    upsertRecord("maintenance", payload);
    await sendPayload(payload);
    if (payload.urgentAttention) emailNow("Urgent Kennel Maintenance Attention Needed", `Urgent maintenance item submitted.\n\nLocation: ${payload.location}\nReported by: ${payload.reportedBy}\nIssue: ${payload.issue}\nSuggested action: ${payload.suggestedAction}\nMedia link: ${payload.mediaLink || "No link pasted"}\nFiles selected: ${payload.mediaFiles || "None"}`);
    event.currentTarget.reset();
    renderMaintenance();
    showToast("Maintenance item saved.");
  });

  $("#showCompletedRequests").addEventListener("change", renderRequests);
  $("#showCompletedMaintenance").addEventListener("change", renderMaintenance);
  $("#requestRecords").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="toggle-request"]');
    if (button) toggleRecordCompletion("request", button.dataset.id);
  });
  $("#maintenanceRecords").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="toggle-maintenance"]');
    if (button) toggleRecordCompletion("maintenance", button.dataset.id);
  });

  $("#serviceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const data = formPayload(event.currentTarget);
    const existing = data.id ? readRecords("service").find((record) => record.id === data.id) : {};
    const flags = checkedFrom(event.currentTarget, "serviceFlags");
    const deposit = Number(data.depositAmount || 0);
    const basePrice = Number(data.basePrice || 0);
    if (deposit > 500 || (basePrice && deposit / basePrice > 0.2)) {
      showToast("Deposit guardrail: review contract language for deposits above $500 or 20%.");
    }
    const payload = {
      ...existing,
      ...data,
      type: "service",
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      flags,
    };
    const record = upsertRecord("service", payload);
    await sendPayload(record);
    renderServices();
    renderDashboard();
    renderFinancials();
    openService();
    showToast("Service pricing saved.");
  });
  $("#resetServiceForm").addEventListener("click", () => openService());
  $("#serviceTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openService(readRecords("service").find((record) => record.id === row.dataset.id));
    window.scrollTo({ top: $("#servicesPage").offsetTop, behavior: "smooth" });
  });
}

function switchPage(pageId) {
  if (!pageAllowed(pageId)) {
    showToast(helperIsLoggedIn() ? "Your login does not have access to that page." : "Enter your PIN first.");
    pageId = "loginPage";
  }
  $$(".nav-button").forEach((item) => item.classList.toggle("is-active", item.dataset.page === pageId));
  $$(".page-view").forEach((page) => page.classList.toggle("is-active", page.id === pageId));
  $("#mobilePageSelect").value = pageId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

setDefaultDateAndDay();
seedDefaultServices();
restoreSession();
updateConditionalSections();
updateRotationBanner();
updateCompletionCount();
updateTimeDisplays();
renderDemoSubmissions();
setupRequiredFields();
initEvents();
updateNavigationAccess();
renderAllRecords();
if (helperIsLoggedIn()) switchPage(currentRole() === "admin" ? "dashboardPage" : "timesheetPage");
loadRemoteRecords();
startAutoSync();
