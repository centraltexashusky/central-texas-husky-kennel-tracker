const SUPABASE_URL = "https://vwvkzniygessvwifrwvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IeKmeCMalVYUnYQUe3gEew_NdjAzmAQ";
const ADMIN_EMAILS = ["centraltexashusky@gmail.com"];
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
const headerUserName = $("#headerUserName");
const headerLogoutButton = $("#headerLogoutButton");
let syncIntervalId = null;
let currentUser = null;
let supabaseClient = null;
let activeClockIn = JSON.parse(localStorage.getItem("cth-active-clock-in") || "null") || "";

const defaultDailyTasks = {
  morning: [
    "Dogs let out safely",
    "Kennel cleaning completed after dogs were let out",
    "Food preparation started",
    "Training completed during 9 AM to 10 AM food prep window",
    "Treadmill exercise completed for selected dogs",
    "Morning feeding completed around 10 AM",
    "All dogs ate normally",
    "Dogs returned to kennel safely",
    "Electric scooter exercise completed for selected dogs",
    "Baths completed as needed",
    "Yard poop cleaned",
    "Holes filled",
    "Kennel areas reset before leaving",
    "Social media photo or video taken",
  ],
  pm: [
    "5 PM to 6 PM dogs let out safely",
    "PM social/play time completed",
    "PM training completed as needed",
    "PM treadmill exercise completed as needed",
    "PM scooter exercise completed as needed",
    "PM baths completed as needed",
    "PM yard poop cleaned",
    "PM kennels cleaned as needed",
    "Kennel organized/reset as needed",
    "PM holes filled as needed",
    "Second feeding completed for selected dogs",
    "Dog medication given as needed",
  ],
};

const HELPER_PINS = {
  "1001": { name: "Ms. Yuko", email: "yuko@centraltexashusky.com", key: "helper-yuko", role: "helper" },
  "1002": { name: "Lexi", email: "lexi@centraltexashusky.com", key: "helper-lexi", role: "helper" },
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
  dailyTask: "cth-dailyTask-records",
  customerDog: "cth-customerDog-records",
  settingsUser: "cth-settingsUser-records",
  cfoNote: "cth-cfoNote-records",
  taskConfig: "cth-daily-task-config",
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

const defaultCfoNotes = [
  { title: "Older puppy pricing", note: "Current $2,500 pricing should show clear proof of value: training, health records, temperament, AKC status, and included support." },
  { title: "Deposit guardrail", note: "Review deposits above $500 or 20% of purchase price before using them publicly." },
  { title: "Private yard rental", note: "Start around $10-$12 per dog/hour; test premium $15-$20 blocks when shade, water, privacy, and photo-friendly features are ready." },
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
  updateDayFromDate();
}

function updateDayFromDate() {
  const sourceDate = form.elements.date.value || todayDate();
  const dayName = new Date(`${sourceDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
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

function readTaskConfig() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.taskConfig) || "null");
  return saved || {
    morning: defaultDailyTasks.morning.map((text) => ({ id: uid("task"), text })),
    pm: defaultDailyTasks.pm.map((text) => ({ id: uid("task"), text })),
  };
}

function writeTaskConfig(config) {
  localStorage.setItem(stateKeys.taskConfig, JSON.stringify(config));
}

function ensureTaskConfig() {
  if (!localStorage.getItem(stateKeys.taskConfig)) writeTaskConfig(readTaskConfig());
}

function supabaseReady() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase);
}

function initSupabaseClient() {
  if (!supabaseReady()) {
    modeLabel.textContent = "Setup needed";
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

function recordTypes() {
  return ["ownedDog", "boardingDog", "request", "maintenance", "timesheet", "service", "dailyTask", "customerDog", "settingsUser", "cfoNote"];
}

function settingsUsers() {
  return readRecords("settingsUser").filter((user) => !user.removed);
}

function savedUserFor(account = {}) {
  const email = account.email?.toLowerCase();
  return settingsUsers().find((user) => (user.authId && user.authId === account.key) || (email && user.email?.toLowerCase() === email));
}

function roleForAccount(account = {}) {
  const email = account.email?.toLowerCase();
  const saved = savedUserFor(account);
  if (saved?.role) return saved.role;
  if (account.authProvider === "pin" && account.role) return account.role;
  if (ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(email)) return "admin";
  return "customer";
}

function userFromSupabase(supabaseUser) {
  if (!supabaseUser?.email) return null;
  const email = supabaseUser.email.toLowerCase();
  const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split("@")[0];
  return {
    name,
    email,
    key: supabaseUser.id,
    role: roleForAccount({ email, key: supabaseUser.id }),
    authProvider: "supabase",
  };
}

function isSupabaseUser() {
  return currentUser?.authProvider === "supabase";
}

function currentDbUserId() {
  return isSupabaseUser() ? currentUser.key : null;
}

async function loginWithProvider(provider) {
  if (!supabaseClient) {
    showToast("Database login setup is not complete yet. Helper PIN still works for local testing.");
    return;
  }
  if (window.location.protocol === "file:") {
    showToast("Google/Facebook sign-in must be tested from the hosted website or a local test server, not a file preview.");
    return;
  }
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.href.split("#")[0] },
  });
  if (error) showToast(error.message);
}

async function restoreSupabaseSession() {
  if (!supabaseClient) return false;
  const { data } = await supabaseClient.auth.getSession();
  const user = userFromSupabase(data.session?.user);
  if (!user) return false;
  setHelper(user, { switchAfterLogin: false });
  return true;
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

function fileToMediaItem(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || "application/octet-stream", dataUrl: reader.result });
    reader.readAsDataURL(file);
  });
}

async function filesToMediaItems(input) {
  const files = [...(input.files || [])];
  return Promise.all(files.map(fileToMediaItem));
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

function setHelper(user, options = {}) {
  currentUser = { ...user, role: user.role || "helper" };
  localStorage.setItem(stateKeys.session, JSON.stringify(currentUser));
  setDefaultDateAndDay();
  helperName.value = user.name || "";
  helperEmail.value = user.email || "";
  helperKey.value = user.key || "";
  $("#manualHelper").value = user.name || "";
  $$('input[name="requestedBy"], input[name="reportedBy"]').forEach((field) => {
    field.value = user.name || "";
    field.readOnly = true;
  });
  $("#timesheetHelperDisplay").textContent = currentUser.name || "No user loaded";
  updateHeaderUser();
  loginStatus.textContent = currentUser.name ? `${roleLabel(currentUser.role)} logged in: ${currentUser.name}` : "Logged in";
  loginHelp.textContent = `${currentUser.email || "PIN account"} | Access: ${currentUser.role}`;
  $("#helperPinInput").value = "";
  $("#clearHelperButton").hidden = false;
  updateNavigationAccess();
  renderDailyTaskLists();
  fillCustomerDefaults();
  if (options.switchAfterLogin !== false) switchPage(currentUser.role === "customer" ? "customerPage" : "dashboardPage");
}

async function clearHelper() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  localStorage.removeItem(stateKeys.session);
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  $("#manualHelper").value = "";
  $$('input[name="requestedBy"], input[name="reportedBy"]').forEach((field) => {
    field.value = "";
    field.readOnly = false;
  });
  $("#timesheetHelperDisplay").textContent = "No user loaded";
  updateHeaderUser();
  loginStatus.textContent = "Not logged in";
  loginHelp.textContent = "Sign in with Google or another enabled account provider.";
  $("#helperPinInput").value = "";
  $("#clearHelperButton").hidden = true;
  updateNavigationAccess();
  renderDailyTaskLists();
  fillCustomerDefaults();
  switchPage("loginPage");
}

function updateHeaderUser() {
  headerUserName.textContent = currentUser?.name || "Not signed in";
  modeLabel.textContent = currentUser ? `${roleLabel(currentUser.role)} account` : "Sign in to continue";
  headerLogoutButton.hidden = !currentUser;
}

function loginWithPin() {
  const pin = $("#helperPinInput").value.trim();
  const savedPinUser = settingsUsers().find((user) => user.pin && user.pin === pin);
  const account = savedPinUser
    ? { name: savedPinUser.name, email: savedPinUser.email, key: savedPinUser.authId || savedPinUser.id, role: savedPinUser.role, authProvider: "pin" }
    : ADMIN_PINS[pin] || HELPER_PINS[pin];
  if (!account) {
    showToast("PIN not recognized.");
    return;
  }
  setHelper({ ...account, authProvider: account.authProvider || "pin" });
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
    const hidden = (currentRole() === "customer" && button.dataset.page !== "customerPage") || (!helperIsLoggedIn() && button.dataset.page !== "loginPage");
    button.classList.toggle("is-hidden-nav", hidden);
  });
  [...$("#mobilePageSelect").options].forEach((option) => {
    option.disabled = !pageAllowed(option.value);
    option.hidden = (currentRole() === "customer" && option.value !== "customerPage") || (!helperIsLoggedIn() && option.value !== "loginPage");
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
  $$('input[name="requestedBy"], input[name="reportedBy"]').forEach((field) => {
    field.value = saved.name || "";
    field.readOnly = true;
  });
  $("#timesheetHelperDisplay").textContent = saved.name || "No user loaded";
  updateHeaderUser();
  loginStatus.textContent = `${roleLabel(saved.role)} logged in: ${saved.name}`;
  loginHelp.textContent = `${saved.email || "PIN account"} | Access: ${saved.role}`;
  $("#clearHelperButton").hidden = false;
}

function roleLabel(role = "") {
  if (role === "admin") return "Admin";
  if (role === "helper") return "Helper";
  return "Customer";
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

function taskLabel(task, shift) {
  const adminTools =
    currentRole() === "admin"
      ? `<span class="task-admin-tools"><button type="button" class="icon-button" data-action="move-task-up" data-shift="${shift}" data-id="${task.id}" title="Move up">↑</button><button type="button" class="icon-button" data-action="move-task-down" data-shift="${shift}" data-id="${task.id}" title="Move down">↓</button><button type="button" class="remove-task-button" data-action="remove-task" data-shift="${shift}" data-id="${task.id}" title="Remove task">×</button></span>`
      : "";
  return `<label class="task-item" draggable="${currentRole() === "admin"}" data-shift="${shift}" data-id="${task.id}"><input type="checkbox" name="${shift === "pm" ? "pmTasks" : "dailyTasks"}" value="${task.text}" /> <span class="task-text">${task.text}</span>${adminTools}</label>`;
}

function renderDailyTaskLists(selected = {}) {
  const config = readTaskConfig();
  $("#morningTaskList").innerHTML = config.morning.map((task) => taskLabel(task, "morning")).join("");
  $("#pmTaskList").innerHTML = config.pm.map((task) => taskLabel(task, "pm")).join("");
  $("#dailyTaskAdminControls").hidden = currentRole() !== "admin";
  $("#pmTaskAdminControls").hidden = currentRole() !== "admin";
  ["dailyTasks", "pmTasks"].forEach((name) => {
    form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
      input.checked = (selected[name] || []).includes(input.value);
    });
  });
}

function updateTaskOrder(shift, id, direction) {
  const config = readTaskConfig();
  const list = config[shift];
  const index = list.findIndex((task) => task.id === id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
  writeTaskConfig(config);
  renderDailyTaskLists();
}

function removeTask(shift, id) {
  const config = readTaskConfig();
  config[shift] = config[shift].filter((task) => task.id !== id);
  writeTaskConfig(config);
  renderDailyTaskLists();
}

function addCustomTask() {
  const text = $("#newTaskText").value.trim();
  const shift = $("#newTaskShift").value;
  if (!text) {
    showToast("Enter a task before adding it.");
    return;
  }
  const config = readTaskConfig();
  config[shift].push({ id: uid("task"), text });
  writeTaskConfig(config);
  $("#newTaskText").value = "";
  renderDailyTaskLists();
  showToast("Task added.");
}

function addPmCustomTask() {
  const text = $("#newPmTaskText").value.trim();
  if (!text) {
    showToast("Enter a PM task before adding it.");
    return;
  }
  const config = readTaskConfig();
  config.pm.push({ id: uid("task"), text });
  writeTaskConfig(config);
  $("#newPmTaskText").value = "";
  renderDailyTaskLists();
  showToast("PM task added.");
}

function setOwnedFormLocked(locked) {
  const formEl = $("#ourDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (["editOwnedDogButton", "cancelOwnedDogEdit"].includes(field.id)) return;
    field.disabled = locked;
  });
  $("#ownedDogPhotoPicker").disabled = locked;
  $("#ownedDogSaveButton").hidden = locked;
  $("#editOwnedDogButton").hidden = !locked;
  formEl.classList.toggle("is-readonly", locked);
}

async function sendPayload(payload) {
  if (!supabaseClient) {
    modeLabel.textContent = "Local saved";
    return;
  }
  try {
    const { error } = await supabaseClient.from("kennel_records").upsert({
      id: payload.id,
      type: payload.type,
      payload: payloadForSheet(payload),
      helper_email: payload.helperEmail || currentUser?.email || "",
      user_id: currentDbUserId(),
      submitted_at: payload.submittedAt || new Date().toISOString(),
      updated_at: payload.updatedAt || new Date().toISOString(),
    });
    if (error) throw error;
    modeLabel.textContent = "Saved";
    window.setTimeout(loadRemoteRecords, 500);
  } catch (error) {
    modeLabel.textContent = "Save failed";
    showToast(`Save failed: ${error.message}`);
  }
}

async function loadRemoteRecords() {
  if (!supabaseClient) {
    modeLabel.textContent = "Local only";
    return;
  }
  syncNowButton.disabled = true;
  try {
    const { data, error } = await supabaseClient.from("kennel_records").select("*").order("updated_at", { ascending: false }).limit(1500);
    if (error) throw error;
    const grouped = Object.fromEntries(recordTypes().map((type) => [type, []]));
    (data || []).forEach((row) => {
      if (grouped[row.type]) grouped[row.type].push(row.payload);
    });
    recordTypes().forEach((type) => mergeRecords(type, grouped[type] || []));
    if (currentUser) {
      currentUser.role = roleForAccount(currentUser);
      localStorage.setItem(stateKeys.session, JSON.stringify(currentUser));
    }
    renderAllRecords();
    updateNavigationAccess();
    updateHeaderUser();
  } catch (error) {
    modeLabel.textContent = "Load failed";
    showToast(`Records could not load: ${error.message}`);
  } finally {
    syncNowButton.disabled = false;
  }
}

function startAutoSync() {
  if (!supabaseClient || syncIntervalId) return;
  syncIntervalId = window.setInterval(loadRemoteRecords, 10000);
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

const fieldHelp = {
  date: "Required for the daily record.",
  dayOfWeek: "Filled in automatically from the selected date.",
  helperName: "Filled in after sign in.",
  helperEmail: "Filled in after sign in.",
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
        title.insertAdjacentHTML("beforeend", '<span class="required-mark" aria-label="required">*</span>');
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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mediaLinkHtml(record) {
  const links = [];
  if (record.mediaLink) links.push(`<a href="${escapeHtml(record.mediaLink)}" target="_blank" rel="noopener">Open shared media</a>`);
  if (record.profilePhotoUrl) links.push(`<a href="${escapeHtml(record.profilePhotoUrl)}" target="_blank" rel="noopener">Open profile photo</a>`);
  if (record.mediaItems?.length) {
    links.push(
      ...record.mediaItems.map(
        (item) =>
          `<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(item.dataUrl)}" data-media-type="${escapeHtml(item.type)}" data-media-name="${escapeHtml(item.name)}">Open ${escapeHtml(item.name)}</button>`,
      ),
    );
  } else if (record.mediaFiles) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="${escapeHtml(record.mediaFiles)}">Open uploaded file</button>`);
  }
  return links.length ? `<div class="detail-media">${links.join(" ")}</div>` : "";
}

function detailRows(record, keys) {
  return keys
    .map(([label, key]) => {
      const value = record[key];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return "";
      return `<div class="detail-row"><strong>${label}</strong><span>${Array.isArray(value) ? escapeHtml(value.join(", ")) : escapeHtml(value)}</span></div>`;
    })
    .join("");
}

function showDetailDialog(title, html) {
  $("#detailDialogTitle").textContent = title;
  $("#detailDialogBody").innerHTML = html;
  $("#detailDialog").showModal();
}

function showMediaDialog(src, type, name) {
  $("#mediaDialogTitle").textContent = name || "Media";
  if (!src) {
    $("#mediaDialogBody").innerHTML = "<p>This older record only saved the file name. Upload media again or paste a shared media link to preview it here.</p>";
    $("#mediaDialog").showModal();
    return;
  }
  const safeSrc = escapeHtml(src || "");
  const safeName = escapeHtml(name || "Uploaded media");
  $("#mediaDialogBody").innerHTML = type?.startsWith("video/")
    ? `<video src="${safeSrc}" controls playsinline></video>`
    : type?.startsWith("image/")
      ? `<img src="${safeSrc}" alt="${safeName}" />`
      : `<p>This file type cannot be previewed here.</p><a href="${safeSrc}" target="_blank" rel="noopener">Open file</a>`;
  $("#mediaDialog").showModal();
}

function dailyDetailHtml(record) {
  return `
    ${detailRows(record, [
      ["Date", "date"],
      ["Helper", "helperName"],
      ["Helper email", "helperEmail"],
      ["Day", "dayOfWeek"],
      ["Morning tasks", "dailyTasks"],
      ["PM tasks", "pmTasks"],
      ["Dogs trained or exercised", "dogsExercised"],
      ["Dogs bathed", "dogsBathed"],
      ["Health notes", "healthNotes"],
      ["Social content", "socialContent"],
      ["Weekly tasks", "weeklyTasks"],
      ["Tuesday tasks", "tuesdayTasks"],
      ["Monthly tasks", "monthlyTasks"],
      ["Supplies low", "suppliesLow"],
      ["Owner notes", "ownerNotes"],
      ["Boarding tasks", "boardingTasks"],
    ])}
  `;
}

function requestDetailHtml(record) {
  return `${detailRows(record, [["Category", "category"], ["Requested by", "requestedBy"], ["Submitted", "submittedAt"], ["Status", "status"], ["Request", "requestText"], ["Reason", "reason"], ["Completed by", "completedBy"], ["Completed at", "completedAt"]])}${mediaLinkHtml(record)}`;
}

function maintenanceDetailHtml(record) {
  return `${detailRows(record, [["Location", "location"], ["Reported by", "reportedBy"], ["Submitted", "submittedAt"], ["Status", "status"], ["Issue", "issue"], ["Suggested action", "suggestedAction"], ["Completed by", "completedBy"], ["Completed at", "completedAt"]])}${mediaLinkHtml(record)}`;
}

function genericDetailHtml(record) {
  const rows = Object.entries(record)
    .filter(([key, value]) => !["profilePhotoData"].includes(key) && value !== "" && value !== null && value !== undefined)
    .map(([key, value]) => `<div class="detail-row"><strong>${escapeHtml(key)}</strong><span>${Array.isArray(value) ? escapeHtml(value.join(", ")) : escapeHtml(typeof value === "object" ? JSON.stringify(value, null, 2) : value)}</span></div>`)
    .join("");
  return `${rows}${mediaLinkHtml(record)}`;
}

function detailForRecord(type, record) {
  if (!record) return "";
  if (type === "dailyTask") return dailyDetailHtml(record);
  if (type === "request") return requestDetailHtml(record);
  if (type === "maintenance") return maintenanceDetailHtml(record);
  return genericDetailHtml(record);
}

function titleForRecord(type, record = {}) {
  const labels = {
    ownedDog: `Dog: ${record.callName || record.showName || "Record"}`,
    boardingDog: `Boarding Dog: ${record.dogName || "Record"}`,
    request: `Request: ${record.category || "Record"}`,
    maintenance: `Maintenance: ${record.location || "Record"}`,
    timesheet: `Timesheet: ${record.helperName || "Record"}`,
    service: `Service: ${record.serviceName || "Record"}`,
    dailyTask: `Daily Report: ${record.date || "Record"}`,
    customerDog: `Customer Dog: ${record.dogName || "Record"}`,
    settingsUser: `User: ${record.name || record.email || "Record"}`,
    cfoNote: `CFO Note: ${record.title || "Record"}`,
  };
  return labels[type] || "Record Details";
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
    id: data.get("id") || uid("dailyTask"),
    submittedAt: new Date().toISOString(),
    date: data.get("date"),
    helperName: data.get("helperName"),
    helperEmail: data.get("helperEmail"),
    helperKey: data.get("helperKey"),
    dayOfWeek: data.get("dayOfWeek"),
    dailyTasks: checkedFrom(form, "dailyTasks"),
    pmTasks: checkedFrom(form, "pmTasks"),
    dogsExercised: data.get("dogsExercised"),
    dogsBathed: data.get("dogsBathed"),
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
  const saved = readRecords("dailyTask");
  $("#recentSubmissions").innerHTML = saved.length
    ? saved
        .map((submission) => `<article class="submission-item clickable-card" data-action="view-daily" data-id="${submission.id}"><strong>${submission.date} - ${submission.helperName}</strong><p>${submission.dayOfWeek} | ${(submission.dailyTasks || []).length} AM tasks | ${(submission.pmTasks || []).length} PM tasks</p><p>Notes: ${submission.ownerNotes || submission.healthNotes || "No notes"}</p>${canEditOwnToday(submission) ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-daily" data-id="${submission.id}">Edit Today's Report</button></div>` : ""}</article>`)
        .join("")
    : "<p>No recent submissions yet.</p>";
}

function canEditOwnToday(record) {
  if (currentRole() === "admin") return true;
  return record?.date === todayDate() && record?.helperEmail === currentUser?.email;
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
          const rowClass = record.boardingStatus === "Pending" ? " class=\"is-pending-boarding\"" : isCurrentlyBoarding(record) ? " class=\"is-current-boarding\"" : "";
          const actions = record.boardingStatus === "Pending" ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="approve-boarding" data-id="${record.id}">Approve</button><button type="button" class="secondary-button" data-action="change-boarding" data-id="${record.id}">Change</button></div>` : "";
          return `<tr data-id="${record.id}"${rowClass}><td>${record.dogName || ""}${actions}</td><td>${record.ownerName || ""}</td><td>${record.ownerPhone || ""}</td><td>${formatDateTime(stay?.dropoffTime) || ""}</td><td>${formatDateTime(stay?.pickupTime) || ""}</td><td>${record.flags?.includes("Required update from owner") ? "Yes" : "No"}</td><td>${[...(record.flags || []).filter((flag) => flag.includes("requested")), ...((stay?.requests || []).filter((flag) => flag.includes("requested")))].join(", ")}</td></tr>`;
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
  setOwnedFormLocked(Boolean(record.id));
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
  setBoardingFormLocked(Boolean(record.id));
  window.scrollTo({ top: $("#boardingDogDetail").offsetTop - 12, behavior: "smooth" });
}

function setBoardingFormLocked(locked) {
  const formEl = $("#boardingDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (["editBoardingDogButton", "cancelBoardingDogEdit"].includes(field.id)) return;
    field.disabled = locked;
  });
  $("#boardingDogPhotoPicker").disabled = locked;
  $("#boardingDogSaveButton").hidden = locked;
  $("#editBoardingDogButton").hidden = !locked;
  formEl.classList.toggle("is-readonly", locked);
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
    ? stays.map((stay) => `<article class="record-card"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><p>${(stay.requests || []).join(", ") || "No service requests"}</p><p>${stay.bathPlan || ""}</p><p>${stay.stayNotes || ""}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay" data-id="${stay.id}">Edit Stay</button></div></article>`).join("")
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
            `<article class="record-card clickable-card ${record.urgentNeeds ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}" data-action="view-request" data-id="${record.id}"><strong>${record.completed ? "Completed: " : ""}${record.urgentNeeds ? "Urgent: " : ""}${record.category}</strong><span>${record.requestedBy || "Unknown"} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${record.requestText}</p>${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-request" data-id="${record.id}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button></div></article>`,
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
            `<article class="record-card clickable-card ${record.urgentAttention ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}" data-action="view-maintenance" data-id="${record.id}"><strong>${record.completed ? "Completed: " : ""}${record.urgentAttention ? "Urgent: " : ""}${record.location}</strong><span>${record.reportedBy || "Unknown"} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${record.issue}</p>${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-maintenance" data-id="${record.id}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button></div></article>`,
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
    boardingDogs,
    currentBoarding,
    arrivals,
    departures,
    bathDue,
    ownerUpdates,
    vaccineIssues,
    ownerUpdateDogs: boardingDogs.filter((dog) => (dog.flags || []).includes("Required update from owner")),
    vaccineIssueDogs: ownedDogs.filter((dog) => {
      const dhpp = dog.dhppDate ? (new Date() - new Date(`${dog.dhppDate}T12:00:00`)) / 86400000 : 0;
      return dhpp >= 335;
    }),
    openRequestRecords: requests.filter((record) => !record.completed),
    urgentRequestRecords: requests.filter((record) => !record.completed && record.urgentNeeds),
    urgentMaintenanceRecords: maintenance.filter((record) => !record.completed && record.urgentAttention),
    openMaintenanceRecords: maintenance.filter((record) => !record.completed),
    openRequests: requests.filter((record) => !record.completed).length,
    urgentMaintenance: maintenance.filter((record) => !record.completed && record.urgentAttention).length,
    openMaintenance: maintenance.filter((record) => !record.completed).length,
    activeServices,
    depositServices,
  };
}

function renderDashboard() {
  if (!$("#dashboardCards")) return;
  $("#dashboardDate").value ||= todayDate();
  const metrics = dashboardMetrics();
  const cards = [
    ["dogs", "Dogs on property", metrics.ownedDogs.length + metrics.currentBoarding.length, "Owned dogs plus active boarding dogs."],
    ["arrivals", "Arrivals today", metrics.arrivals.length, metrics.arrivals.join(", ") || "None scheduled."],
    ["departures", "Departures today", metrics.departures.length, metrics.departures.join(", ") || "None scheduled."],
    ["baths", "Baths due today", metrics.bathDue.length, metrics.bathDue.join(", ") || "None due."],
    ["vaccines", "Vaccine warnings", metrics.vaccineIssues, "DHPP at 11+ months or overdue."],
    ["ownerUpdates", "Owner updates needed", metrics.ownerUpdates, "Boarding records flagged for owner update."],
    ["requests", "Open requests", metrics.openRequests, "Active supply/process requests."],
    ["maintenance", "Open maintenance", metrics.openMaintenance, `${metrics.urgentMaintenance} urgent.`],
    ["services", "Active services", metrics.activeServices.length, "Admin pricing catalog."],
    ["deposits", "Deposit products", metrics.depositServices.length, "Services with deposit amounts."],
  ];
  $("#dashboardCards").innerHTML = cards.map(([key, label, value, note]) => `<article class="dashboard-card clickable-card" data-action="dashboard-detail" data-key="${key}"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`).join("");
  const alerts = [];
  metrics.urgentRequestRecords.forEach((item) => alerts.push({ type: "request", id: item.id, html: `<strong>Urgent request: ${escapeHtml(item.category)}</strong><p>${escapeHtml(item.requestText || "")}</p>${mediaLinkHtml(item)}` }));
  metrics.urgentMaintenanceRecords.forEach((item) => alerts.push({ type: "maintenance", id: item.id, html: `<strong>Urgent maintenance: ${escapeHtml(item.location)}</strong><p>${escapeHtml(item.issue || "")}</p>${mediaLinkHtml(item)}` }));
  metrics.vaccineIssueDogs.forEach((dog) => alerts.push(`<strong>Vaccine warning: ${escapeHtml(dog.callName || dog.showName || "Dog")}</strong><p>DHPP date: ${escapeHtml(dog.dhppDate || "Not recorded")}</p>`));
  metrics.ownerUpdateDogs.forEach((dog) => alerts.push(`<strong>Owner update needed: ${escapeHtml(dog.dogName || "Boarding dog")}</strong><p>${escapeHtml(dog.ownerName || "")} ${escapeHtml(dog.ownerPhone || "")}</p>`));
  metrics.bathDue.forEach((dogName) => alerts.push(`<strong>Bath due before pickup today</strong><p>${escapeHtml(dogName)}</p>`));
  $("#dashboardAlerts").innerHTML = alerts.length
    ? alerts.map((alert) => typeof alert === "string" ? `<article class="record-card is-urgent">${alert}</article>` : `<article class="record-card clickable-card is-urgent" data-action="view-alert" data-type="${alert.type}" data-id="${alert.id}">${alert.html}</article>`).join("")
    : "<p>No urgent dashboard alerts right now.</p>";
  renderDashboardTimeline();
}

function renderDashboardTimeline() {
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const items = [];
  ["dailyTask"].forEach((type) => {
    readRecords(type).forEach((record) => {
      const timestamp = record.updatedAt || record.submittedAt || record.clockInTime;
      const date = record.date || timestamp?.slice(0, 10);
      if (date !== selectedDate) return;
      items.push({ type, record, timestamp });
    });
  });
  items.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  $("#dashboardTimeline").innerHTML = items.length
    ? items
        .map(({ type, record, timestamp }) => {
          const helper = record.helperName || record.requestedBy || record.reportedBy || currentUser?.name || "Unknown";
          const title = type === "dailyTask" ? "Daily task report" : type === "timesheet" ? "Timesheet" : type === "request" ? "Request" : type === "maintenance" ? "Maintenance" : type === "boardingDog" ? "Boarding dog update" : type === "service" ? "Service/pricing update" : "Dog update";
          const summary = record.requestText || record.issue || record.dogName || record.callName || record.serviceName || `${record.dailyTasks?.length || 0} AM tasks, ${record.pmTasks?.length || 0} PM tasks checked`;
          const notes = record.ownerNotes || record.healthNotes || record.reason || record.suggestedAction || record.pricingNotes || "";
          return `<article class="record-card clickable-card" data-action="view-record" data-type="${type}" data-id="${record.id}"><strong>${formatDateTime(timestamp)} - ${title}</strong><span>${helper}</span><p>${summary || ""}</p>${notes ? `<p>${escapeHtml(notes)}</p>` : ""}${mediaLinkHtml(record)}</article>`;
        })
        .join("")
    : "<p>No activity recorded for this date yet.</p>";
}

function dashboardDetailRecords(key) {
  const metrics = dashboardMetrics();
  const today = todayDate();
  const byDogName = (names) => metrics.boardingDogs.filter((dog) => names.includes(dog.dogName));
  const map = {
    dogs: [...metrics.ownedDogs, ...metrics.currentBoarding],
    arrivals: byDogName(metrics.arrivals),
    departures: byDogName(metrics.departures),
    baths: byDogName(metrics.bathDue),
    vaccines: metrics.vaccineIssueDogs,
    ownerUpdates: metrics.ownerUpdateDogs,
    requests: metrics.openRequestRecords,
    maintenance: metrics.openMaintenanceRecords,
    services: metrics.activeServices,
    deposits: metrics.depositServices,
  };
  return map[key] || [];
}

function showDashboardDetail(key) {
  const labels = {
    dogs: "Dogs On Property",
    arrivals: "Arrivals Today",
    departures: "Departures Today",
    baths: "Baths Due Today",
    vaccines: "Vaccine Warnings",
    ownerUpdates: "Owner Updates Needed",
    requests: "Open Requests",
    maintenance: "Open Maintenance",
    services: "Active Services",
    deposits: "Deposit Products",
  };
  const records = dashboardDetailRecords(key);
  const html = records.length
    ? records.map((record) => `<article class="record-card">${genericDetailHtml(record)}</article>`).join("")
    : "<p>No open items in this category.</p>";
  showDetailDialog(labels[key] || "Dashboard Details", html);
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

function renderCfoNotes() {
  if (!$("#cfoNotesList")) return;
  const notes = readRecords("cfoNote").filter((note) => !note.removed);
  $("#cfoNotesList").innerHTML = notes.length
    ? notes.map((note) => `<article class="record-card"><strong>${escapeHtml(note.title)}</strong><p>${escapeHtml(note.note)}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="remove-cfo-note" data-id="${note.id}">Remove</button></div></article>`).join("")
    : "<p>No CFO notes saved yet.</p>";
}

function renderSettingsUsers() {
  if (!$("#settingsUserTableBody")) return;
  const users = settingsUsers();
  $("#settingsUserTableBody").innerHTML = users.length
    ? users
        .map((user) => `<tr data-id="${user.id}"><td>${escapeHtml(user.name || "")}</td><td>${escapeHtml(user.email || "")}</td><td>${roleLabel(user.role)}</td><td>${user.pin ? "Set" : ""}</td><td><button type="button" class="secondary-button" data-action="remove-settings-user" data-id="${user.id}">Remove</button></td></tr>`)
        .join("")
    : `<tr><td colspan="5">No custom users saved yet.</td></tr>`;
}

function openSettingsUser(record = {}) {
  $("#settingsUserForm").reset();
  setFormValues($("#settingsUserForm"), record);
}

function fillCustomerDefaults() {
  if (!$("#customerOwnerEmail")) return;
  $("#customerOwnerName").value = currentUser?.name || "";
  $("#customerOwnerEmail").value = currentUser?.email || "";
}

function renderCustomerDogs() {
  if (!$("#customerDogList")) return;
  const dogs = readRecords("customerDog").filter((dog) => dog.ownerEmail === currentUser?.email || currentRole() === "admin");
  $("#customerDogList").innerHTML = dogs.length
    ? dogs.map((dog) => `<label class="customer-dog-item"><input type="checkbox" name="customerDogSelect" value="${dog.id}" /> ${escapeHtml(dog.dogName)} <span>${escapeHtml(dog.breedDescription || "")}</span></label>`).join("")
    : "<p>No dogs added yet.</p>";
  renderCustomerServiceOptions();
  updateCustomerEstimate();
}

function renderCustomerServiceOptions() {
  if (!$("#customerServiceOptions")) return;
  const services = readRecords("service").filter((service) => (service.flags || []).includes("Active") && !(service.flags || []).includes("Admin only"));
  $("#customerServiceOptions").innerHTML = services.length
    ? services.map((service) => `<label><input type="checkbox" name="customerServices" value="${service.id}" /> ${escapeHtml(service.serviceName)} - ${money(service.basePrice)} ${escapeHtml(service.unit || "")}</label>`).join("")
    : "<p>No customer services are active yet.</p>";
}

function selectedCustomerDogs() {
  return [...document.querySelectorAll('input[name="customerDogSelect"]:checked')]
    .map((input) => readRecords("customerDog").find((dog) => dog.id === input.value))
    .filter(Boolean);
}

function boardingDays(dropoffTime, pickupTime) {
  if (!dropoffTime || !pickupTime) return 0;
  const drop = new Date(dropoffTime);
  const pick = new Date(pickupTime);
  if (pick <= drop) return 0;
  const dropDay = new Date(drop.getFullYear(), drop.getMonth(), drop.getDate());
  const pickDay = new Date(pick.getFullYear(), pick.getMonth(), pick.getDate());
  let days = Math.max(1, Math.round((pickDay - dropDay) / 86400000));
  if (pick.getHours() >= 12) days += 1;
  return days;
}

function customerEstimateDetails() {
  const formEl = $("#customerBookingForm");
  const data = formPayload(formEl);
  const dogs = selectedCustomerDogs();
  const services = checkedFrom(formEl, "customerServices").map((id) => readRecords("service").find((service) => service.id === id)).filter(Boolean);
  const days = boardingDays(data.dropoffTime, data.pickupTime);
  const boardingService = readRecords("service").find((service) => service.category === "Boarding" && (service.flags || []).includes("Active"));
  const boardingCost = dogs.length * days * Number(boardingService?.basePrice || 0);
  const serviceCost = dogs.length * services.reduce((total, service) => total + Number(service.basePrice || 0), 0);
  return { dogs, services, days, total: boardingCost + serviceCost, dropoffTime: data.dropoffTime, pickupTime: data.pickupTime, requestNotes: data.requestNotes };
}

function updateCustomerEstimate() {
  if (!$("#customerEstimate")) return;
  const estimate = customerEstimateDetails();
  $("#customerEstimate").textContent = estimate.dogs.length
    ? `${estimate.dogs.length} dog(s), ${estimate.days} boarding day(s), ${estimate.services.length} service(s): estimated total ${money(estimate.total)}.`
    : "Select dog(s), dates, and services to see an estimate.";
}

function renderServices() {
  const query = $("#serviceSearch")?.value || "";
  const records = readRecords("service").filter((record) => matches(record, query));
  $("#serviceTableBody").innerHTML = records.length
    ? records
        .map((record) => `<tr data-id="${record.id}"><td>${record.serviceName || ""}</td><td>${record.category || ""}</td><td>${money(record.basePrice)}</td><td>${record.unit || ""}</td><td>${record.depositAmount ? money(record.depositAmount) : ""}</td><td>${record.taxRate ? `${record.taxRate}%` : ""}</td><td>${(record.flags || []).join(", ")}</td></tr>`)
        .join("")
    : `<tr><td colspan="7">No services saved yet.</td></tr>`;
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
  renderCfoNotes();
  renderSettingsUsers();
  renderCustomerDogs();
  renderDemoSubmissions();
}

function emailNow(subjectText, bodyText) {
  window.location.href = `mailto:${OWNER_ALERT_EMAIL}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
}

function updateTimeDisplays() {
  $("#clockInDisplay").textContent = activeClockIn?.clockInTime ? formatDateTime(activeClockIn.clockInTime) : "Not clocked in";
  $("#clockOutDisplay").textContent = activeClockIn?.clockInTime ? "Ready to clock out" : "Not clocked out";
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
    ? currentWeekRecords.map((record) => {
        const canEdit = canEditOwnToday(record);
        return `<tr><td>${record.date}</td><td>${record.helperName}</td><td>${formatDateTime(record.clockInTime)}</td><td>${formatDateTime(record.clockOutTime)}</td><td>${Number(record.hours || 0).toFixed(2)}</td><td>${record.note || ""}</td><td>${canEdit ? `<button type="button" class="secondary-button" data-action="edit-time" data-id="${record.id}">Edit</button>` : ""}</td></tr>`;
      }).join("")
    : `<tr><td colspan="7">No time entries for this week.</td></tr>`;

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
  const existing = payload.id ? readRecords("timesheet").find((record) => record.id === payload.id) : null;
  const record = {
    ...existing,
    type: "timesheet",
    id: payload.id || uid("timesheet"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
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
  headerLogoutButton.addEventListener("click", clearHelper);
  $("#dashboardDate").addEventListener("change", renderDashboardTimeline);
  $("#dashboardCards").addEventListener("click", (event) => {
    const card = event.target.closest('[data-action="dashboard-detail"]');
    if (card) showDashboardDetail(card.dataset.key);
  });
  $("#dashboardTimeline").addEventListener("click", (event) => {
    const card = event.target.closest('[data-action="view-record"]');
    if (!card) return;
    const record = readRecords(card.dataset.type).find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord(card.dataset.type, record), detailForRecord(card.dataset.type, record));
  });
  $("#dashboardAlerts").addEventListener("click", (event) => {
    const mediaButton = event.target.closest('[data-action="view-media"]');
    if (mediaButton) return;
    const card = event.target.closest('[data-action="view-alert"]');
    if (!card) return;
    const record = readRecords(card.dataset.type).find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord(card.dataset.type, record), detailForRecord(card.dataset.type, record));
  });

  $("#googleLoginButton").addEventListener("click", () => loginWithProvider("google"));
  $("#facebookLoginButton").addEventListener("click", () => loginWithProvider("facebook"));
  $("#helperPinLoginButton").addEventListener("click", loginWithPin);
  $("#helperPinInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loginWithPin();
    }
  });
  $("#clearHelperButton").addEventListener("click", clearHelper);
  $("#addDailyTaskButton").addEventListener("click", addCustomTask);
  $("#addPmTaskButton").addEventListener("click", addPmCustomTask);
  ["morningTaskList", "pmTaskList"].forEach((listId) => {
    $(`#${listId}`).addEventListener("click", (event) => {
      const control = event.target.closest("[data-action]");
      if (!control) return;
      event.preventDefault();
      if (control.dataset.action === "remove-task") removeTask(control.dataset.shift, control.dataset.id);
      if (control.dataset.action === "move-task-up") updateTaskOrder(control.dataset.shift, control.dataset.id, "up");
      if (control.dataset.action === "move-task-down") updateTaskOrder(control.dataset.shift, control.dataset.id, "down");
    });
  });
  $("#closeDetailDialog").addEventListener("click", () => $("#detailDialog").close());
  $("#closeMediaDialog").addEventListener("click", () => $("#mediaDialog").close());
  document.addEventListener("click", (event) => {
    const mediaButton = event.target.closest('[data-action="view-media"]');
    if (!mediaButton) return;
    event.preventDefault();
    event.stopPropagation();
    showMediaDialog(mediaButton.dataset.src, mediaButton.dataset.mediaType, mediaButton.dataset.mediaName);
  });
  form.addEventListener("change", () => {
    updateCompletionCount();
    updateConditionalSections();
    updateRotationBanner();
  });
  form.elements.date.addEventListener("change", () => {
    updateDayFromDate();
    updateConditionalSections();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const payload = buildDailyPayload();
    const record = upsertRecord("dailyTask", payload);
    await sendPayload(record);
    renderDemoSubmissions();
    $("#dailyTaskId").value = record.id;
    showToast("Daily task report submitted.");
  });
  $("#recentSubmissions").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-daily"]');
    const card = event.target.closest('[data-action="view-daily"]');
    if (!button && card) {
      const record = readRecords("dailyTask").find((item) => item.id === card.dataset.id);
      if (record) showDetailDialog(titleForRecord("dailyTask", record), dailyDetailHtml(record));
      return;
    }
    if (!button) return;
    const record = readRecords("dailyTask").find((item) => item.id === button.dataset.id);
    if (!record || !canEditOwnToday(record)) {
      showToast("Only today's submitted report can be edited by the submitting helper. Admin can edit older reports.");
      return;
    }
    form.reset();
    renderDailyTaskLists(record);
    setFormValues(form, record);
    $("#dailyTaskId").value = record.id;
    ["dailyTasks", "pmTasks", "weeklyTasks", "tuesdayTasks", "monthlyTasks", "suppliesLow"].forEach((name) => {
      form.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
        input.checked = (record[name] || []).includes(input.value);
      });
    });
    updateCompletionCount();
    updateConditionalSections();
    updateRotationBanner();
    showToast("Today's report loaded for editing.");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#clockInButton").addEventListener("click", () => {
    if (!helperIsLoggedIn()) {
      showToast("Sign in first.");
      return;
    }
    if (activeClockIn?.clockInTime) {
      showToast(`Already clocked in at ${formatDateTime(activeClockIn.clockInTime)}.`);
      return;
    }
    const clockInTime = new Date().toISOString();
    const record = upsertRecord("timesheet", {
      type: "timesheet",
      id: uid("timesheet"),
      submittedAt: clockInTime,
      date: clockInTime.slice(0, 10),
      helperName: helperName.value || currentUser.name,
      helperEmail: helperEmail.value || currentUser.email,
      clockInTime,
      clockOutTime: "",
      hours: 0,
      note: "Open clock-in",
    });
    activeClockIn = { id: record.id, clockInTime };
    localStorage.setItem("cth-active-clock-in", JSON.stringify(activeClockIn));
    sendPayload(record);
    updateTimeDisplays();
    showToast(`Clock-in confirmed: ${formatDateTime(clockInTime)}.`);
  });
  $("#clockOutButton").addEventListener("click", () => {
    if (!activeClockIn?.clockInTime) {
      showToast("Clock in first, or use Manual Entry.");
      return;
    }
    const clockOutTime = new Date().toISOString();
    saveTimeEntry({ id: activeClockIn.id, helperName: helperName.value || "Unknown helper", helperEmail: helperEmail.value, clockInTime: activeClockIn.clockInTime, clockOutTime });
    activeClockIn = "";
    localStorage.removeItem("cth-active-clock-in");
    updateTimeDisplays();
    showToast(`Clock-out confirmed: ${formatDateTime(clockOutTime)}.`);
  });
  $("#saveTimeEntryButton").addEventListener("click", () => {
    if (!activeClockIn) showToast("No active clock-in to save.");
  });
  $("#manualTimeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!helperIsLoggedIn()) {
      showToast("Sign in first.");
      return;
    }
    if (!validateForm(event.currentTarget)) return;
    const payload = formPayload(event.currentTarget);
    saveTimeEntry({ id: payload.manualTimeId, helperName: payload.manualHelper || helperName.value || "Unknown helper", date: payload.manualDate, clockInTime: payload.manualClockIn, clockOutTime: payload.manualClockOut, note: payload.manualNote });
    event.currentTarget.reset();
    $("#manualDate").value = todayDate();
    $("#manualHelper").value = helperName.value;
    $("#manualTimeId").value = "";
  });
  $("#timesheetRows").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-time"]');
    if (!button) return;
    const record = readRecords("timesheet").find((item) => item.id === button.dataset.id);
    if (!record || !canEditOwnToday(record)) {
      showToast("Only today's time entry can be edited by the helper. Admin can edit older entries.");
      return;
    }
    $("#manualTimeId").value = record.id;
    $("#manualHelper").value = record.helperName;
    $("#manualDate").value = record.date;
    $("#manualTimeForm").elements.manualClockIn.value = record.clockInTime?.slice(0, 16);
    $("#manualTimeForm").elements.manualClockOut.value = record.clockOutTime?.slice(0, 16);
    $("#manualTimeForm").elements.manualNote.value = record.note || "";
    showToast("Time entry loaded for editing.");
  });

  $("#ownedLastBath").addEventListener("change", () => ($("#ownedNextBath").value = addMonths($("#ownedLastBath").value, 1)));
  $("#ownedLastHeat").addEventListener("change", () => ($("#ownedNextHeat").value = addDays($("#ownedLastHeat").value, 183)));
  $("#ownedDogSex").addEventListener("change", updateOwnedDogConditionalFields);
  $("#ownedDhppDate").addEventListener("change", updateDhppWarning);
  $("#ownedDogSearch").addEventListener("input", renderOwnedDogs);
  $("#addOwnedDogButton").addEventListener("click", () => openOwnedDog());
  $("#cancelOwnedDogEdit").addEventListener("click", () => ($("#ownedDogDetail").hidden = true));
  $("#editOwnedDogButton").addEventListener("click", () => {
    setOwnedFormLocked(false);
    showToast("Dog record unlocked for editing.");
  });
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
    setOwnedFormLocked(true);
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
  $("#editBoardingDogButton").addEventListener("click", () => {
    setBoardingFormLocked(false);
    showToast("Boarding dog record unlocked for editing.");
  });
  $("#boardingDogPhotoPicker").addEventListener("click", () => $("#boardingDogPhotoInput").click());
  $("#boardingDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("boarding"));
  $("#boardingDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openBoardingDog(readRecords("boardingDog").find((record) => record.id === row.dataset.id));
  });
  $("#boardingDogTableBody").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.stopPropagation();
    const record = readRecords("boardingDog").find((item) => item.id === button.dataset.id);
    if (!record) return;
    if (button.dataset.action === "approve-boarding") {
      const updated = upsertRecord("boardingDog", {
        ...record,
        boardingStatus: "Approved",
        stays: (record.stays || []).map((stay) => ({ ...stay, status: "Approved", updatedAt: new Date().toISOString() })),
      });
      await sendPayload(updated);
      renderBoardingDogs();
      showToast("Boarding request approved.");
    }
    if (button.dataset.action === "change-boarding") {
      openBoardingDog(record);
      setBoardingFormLocked(false);
    }
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
    setBoardingFormLocked(true);
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
    const existingStay = (dog.stays || []).find((stay) => stay.id === payload.stayId);
    const stay = {
      ...existingStay,
      id: payload.stayId || uid("stay"),
      createdAt: existingStay?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dropoffTime: payload.dropoffTime,
      pickupTime: payload.pickupTime,
      requests: checkedFrom(event.currentTarget, "stayRequests"),
      stayNotes: payload.stayNotes,
    };
    stay.bathPlan = bathPlanForStay(stay);
    dog.stays = dog.stays || [];
    const stayIndex = dog.stays.findIndex((item) => item.id === stay.id);
    if (stayIndex >= 0) dog.stays[stayIndex] = stay;
    else dog.stays.unshift(stay);
    const record = upsertRecord("boardingDog", dog);
    await sendPayload(record);
    renderBoardingStays(record);
    renderBoardingDogs();
    event.currentTarget.reset();
    $("#boardingStayId").value = "";
    $("#boardingStaySaveButton").textContent = "Add Boarding Stay";
    showToast(existingStay ? "Boarding stay updated." : "Boarding stay added.");
  });
  $("#boardingStayHistory").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-stay"]');
    if (!button) return;
    const dog = activeBoardingDog();
    const stay = dog?.stays?.find((item) => item.id === button.dataset.id);
    if (!stay) return;
    $("#boardingStayId").value = stay.id;
    $("#boardingStayForm").elements.dropoffTime.value = stay.dropoffTime?.slice(0, 16);
    $("#boardingStayForm").elements.pickupTime.value = stay.pickupTime?.slice(0, 16);
    $("#boardingStayForm").elements.stayNotes.value = stay.stayNotes || "";
    $("#boardingStayForm").querySelectorAll('input[name="stayRequests"]').forEach((input) => {
      input.checked = (stay.requests || []).includes(input.value);
    });
    $("#boardingStaySaveButton").textContent = "Save Boarding Stay";
    showToast("Boarding stay loaded for editing.");
  });
  $("#resetBoardingStayButton").addEventListener("click", () => {
    $("#boardingStayForm").reset();
    $("#boardingStayId").value = "";
    $("#boardingStaySaveButton").textContent = "Add Boarding Stay";
  });

  $("#requestForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const mediaItems = await filesToMediaItems($("#requestMedia"));
    const files = mediaItems.map((file) => file.name).join(", ");
    const payload = { type: "request", id: uid("request"), submittedAt: new Date().toISOString(), status: "Active", completed: false, completedAt: "", completedBy: "", ...formPayload(event.currentTarget), mediaFiles: files, mediaItems, urgentNeeds: event.currentTarget.querySelector('input[name="urgentNeeds"]').checked };
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
    const mediaItems = await filesToMediaItems($("#maintenanceMedia"));
    const files = mediaItems.map((file) => file.name).join(", ");
    const payload = { type: "maintenance", id: uid("maintenance"), submittedAt: new Date().toISOString(), status: "Active", completed: false, completedAt: "", completedBy: "", ...formPayload(event.currentTarget), mediaFiles: files, mediaItems, urgentAttention: event.currentTarget.querySelector('input[name="urgentAttention"]').checked };
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
    if (event.target.closest('[data-action="view-media"]')) return;
    const button = event.target.closest('[data-action="toggle-request"]');
    if (button) {
      event.stopPropagation();
      toggleRecordCompletion("request", button.dataset.id);
      return;
    }
    const card = event.target.closest('[data-action="view-request"]');
    if (!card) return;
    const record = readRecords("request").find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord("request", record), requestDetailHtml(record));
  });
  $("#maintenanceRecords").addEventListener("click", (event) => {
    if (event.target.closest('[data-action="view-media"]')) return;
    const button = event.target.closest('[data-action="toggle-maintenance"]');
    if (button) {
      event.stopPropagation();
      toggleRecordCompletion("maintenance", button.dataset.id);
      return;
    }
    const card = event.target.closest('[data-action="view-maintenance"]');
    if (!card) return;
    const record = readRecords("maintenance").find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord("maintenance", record), maintenanceDetailHtml(record));
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
  $("#serviceSearch").addEventListener("input", renderServices);
  $("#serviceTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openService(readRecords("service").find((record) => record.id === row.dataset.id));
    window.scrollTo({ top: $("#servicesPage").offsetTop, behavior: "smooth" });
  });

  $("#customerDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const payload = {
      type: "customerDog",
      id: uid("customerDog"),
      submittedAt: new Date().toISOString(),
      customerEmail: currentUser?.email || "",
      ...formPayload(event.currentTarget),
    };
    const record = upsertRecord("customerDog", payload);
    await sendPayload(record);
    event.currentTarget.reset();
    fillCustomerDefaults();
    renderCustomerDogs();
    showToast("Dog added to your request list.");
  });
  $("#customerBookingForm").addEventListener("change", updateCustomerEstimate);
  $("#customerDogList").addEventListener("change", updateCustomerEstimate);
  $("#customerBookingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const estimate = customerEstimateDetails();
    if (!estimate.dogs.length) {
      showToast("Select at least one dog for the boarding request.");
      return;
    }
    for (const dog of estimate.dogs) {
      const stay = {
        id: uid("stay"),
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dropoffTime: estimate.dropoffTime,
        pickupTime: estimate.pickupTime,
        requests: estimate.services.map((service) => `${service.serviceName} requested`),
        stayNotes: estimate.requestNotes,
      };
      stay.bathPlan = bathPlanForStay(stay);
      const payload = {
        type: "boardingDog",
        id: uid("boardingDog"),
        submittedAt: new Date().toISOString(),
        boardingStatus: "Pending",
        customerRequest: true,
        dogName: dog.dogName,
        breedDescription: dog.breedDescription,
        ownerName: dog.ownerName,
        ownerPhone: dog.ownerPhone,
        ownerEmail: dog.ownerEmail,
        specialCare: dog.specialCare,
        flags: ["Required update from owner"],
        stays: [stay],
      };
      const record = upsertRecord("boardingDog", payload);
      await sendPayload(record);
    }
    event.currentTarget.reset();
    renderBoardingDogs();
    renderCustomerDogs();
    showToast("Boarding request submitted.");
  });

  $("#cfoNoteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const payload = { type: "cfoNote", id: uid("cfoNote"), submittedAt: new Date().toISOString(), ...formPayload(event.currentTarget) };
    const record = upsertRecord("cfoNote", payload);
    await sendPayload(record);
    event.currentTarget.reset();
    renderCfoNotes();
    showToast("CFO note added.");
  });
  $("#cfoNotesList").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="remove-cfo-note"]');
    if (!button) return;
    const note = readRecords("cfoNote").find((item) => item.id === button.dataset.id);
    if (!note) return;
    const updated = upsertRecord("cfoNote", { ...note, removed: true });
    await sendPayload(updated);
    renderCfoNotes();
    showToast("CFO note removed.");
  });

  $("#settingsUserForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const data = formPayload(event.currentTarget);
    const existing = data.id ? readRecords("settingsUser").find((user) => user.id === data.id) : {};
    const payload = { ...existing, ...data, type: "settingsUser", id: data.id || uid("settingsUser"), submittedAt: existing?.submittedAt || new Date().toISOString() };
    const record = upsertRecord("settingsUser", payload);
    await sendPayload(record);
    openSettingsUser();
    renderSettingsUsers();
    showToast("User access saved.");
  });
  $("#newSettingsUserButton").addEventListener("click", () => openSettingsUser());
  $("#settingsUserTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openSettingsUser(readRecords("settingsUser").find((user) => user.id === row.dataset.id));
  });
  $("#settingsUserTableBody").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="remove-settings-user"]');
    if (!button) return;
    const user = readRecords("settingsUser").find((item) => item.id === button.dataset.id);
    if (user) {
      const updated = upsertRecord("settingsUser", { ...user, removed: true });
      await sendPayload(updated);
    }
    renderSettingsUsers();
    showToast("User removed.");
  });
}

function switchPage(pageId) {
  if (!pageAllowed(pageId)) {
    showToast(helperIsLoggedIn() ? "Your login does not have access to that page." : "Sign in first.");
    pageId = "loginPage";
  }
  $$(".nav-button").forEach((item) => item.classList.toggle("is-active", item.dataset.page === pageId));
  $$(".page-view").forEach((page) => page.classList.toggle("is-active", page.id === pageId));
  $("#mobilePageSelect").value = pageId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function initializeApp() {
  initSupabaseClient();
  ensureTaskConfig();
  setDefaultDateAndDay();
  $("#dashboardDate").value = todayDate();
  seedDefaultServices();
  seedDefaultCfoNotes();
  const restoredFromSupabase = await restoreSupabaseSession();
  if (!restoredFromSupabase) restoreSession();
  updateConditionalSections();
  updateRotationBanner();
  updateCompletionCount();
  updateTimeDisplays();
  renderDailyTaskLists();
  setupRequiredFields();
  initEvents();
  updateNavigationAccess();
  renderAllRecords();
  if (helperIsLoggedIn()) switchPage(currentRole() === "customer" ? "customerPage" : "dashboardPage");
  await loadRemoteRecords();
  startAutoSync();
}

initializeApp();
