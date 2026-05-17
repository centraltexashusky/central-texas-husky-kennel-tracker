const SUPABASE_URL = "https://vwvkzniygessvwifrwvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IeKmeCMalVYUnYQUe3gEew_NdjAzmAQ";
const MEDIA_BUCKET = "kennel-media";
const MAX_MEDIA_UPLOAD_MB = 50;
const MAX_MEDIA_UPLOAD_BYTES = MAX_MEDIA_UPLOAD_MB * 1024 * 1024;
const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png"];
const VACCINATION_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOG_DOCUMENT_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const ADMIN_EMAILS = ["centraltexashusky@gmail.com"];
const OWNER_ALERT_EMAIL = "centraltexashusky@gmail.com";
const APP_PRODUCTION_URL = "https://kennel.centraltexashusky.com/";
const APP_WIX_EMBED_URL = "https://www.centraltexashusky.com/kennel-tracker";
const APP_AUTH_REDIRECT_URL = APP_PRODUCTION_URL;

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
let detailDialogContext = null;
let pendingCustomerBooking = null;
let pendingBoardingCheckIn = null;
let activeClockIn = JSON.parse(localStorage.getItem("cth-active-clock-in") || "null") || "";
let localTestMode = false;
let dailyTaskTab = "morning";
let dashboardAlertFilter = "All";
let dashboardShowAllAlerts = false;
let timesheetTab = "clock";
let scheduleWeekDate = todayDate();
let settingsUserTab = "admin";
let settingsUserSort = { key: "name", direction: "asc" };
let kennelBuildingTab = "Shed";
let boardingDogRosterFilter = "Active dogs";
let showRemainingTasksOnly = true;
const selectedDogPhotos = { owned: null, boarding: null, customer: null };
let ownedDogCareFilter = "All";
let pendingStructuredCareLogs = [];
let mediaZoomLevel = 1;
let customerProfileSyncInProgress = false;
let authSessionSyncPromise = null;
let suppressAuthSyncUntil = 0;

const careDefaults = {
  exerciseFrequencyDays: 1,
  trainingFrequencyDays: 3,
  bathIntervalDays: 30,
  heatCycleLengthDays: 183,
  heatExpectedSoonDays: 21,
  heatInHeatDays: 21,
};

const bathCareDefaultNote = "Ultimate shampoo, nailed trimed, paws trimmed, and ears cleaned";
const heatCareDefaultNote = "something important about the heat.";
const medicalCareDefaultNote = "injury to leg, fighting with others...";
const medicalCarePlaceholder = "injury to leg, fighting with others...";
const autoCareNotes = new Set([bathCareDefaultNote, heatCareDefaultNote, medicalCareDefaultNote, ""]);
const taskShiftLabels = {
  morning: "Morning",
  pm: "Evening",
  weekly: "Monday",
  tuesday: "Tuesday",
  monthly: "Monthly",
};
const defaultTaskTabMeta = [
  { id: "morning", label: "Morning", system: true },
  { id: "pm", label: "Evening", system: true },
  { id: "weekly", label: "Mondays", system: true },
  { id: "tuesday", label: "Tuesdays", system: true },
  { id: "monthly", label: "Monthly", system: true },
];
const mobilePrimaryPageIds = ["dashboardPage", "dailyPage", "ourDogsPage", "boardingDogsPage", "customerPage", "customerRequestsPage"];
const mobilePrimaryPageSet = new Set(mobilePrimaryPageIds);
const settingsPageIds = new Set(["settingsUsersPage", "settingsKennelLocationsPage", "settingsAuditLogPage"]);

const boardingLifecycleStatuses = ["Pending", "Approved", "Checked In", "In Kennel", "Ready For Pickup", "Checked Out", "Cancelled"];
const boardingStatusTransitions = {
  Pending: ["Approved", "Cancelled"],
  Approved: ["Checked In"],
  "Checked In": ["In Kennel"],
  "In Kennel": ["Ready For Pickup"],
  "Ready For Pickup": ["Checked Out"],
  "Checked Out": [],
  Cancelled: [],
};

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

const defaultManagedTasks = {
  weekly: [
    "Monday thorough kennel clean completed",
    "Dog Mansion main AC filter cleaned",
    "Dog Shed mini-split AC filter cleaned",
    "Dog Shed window AC filter cleaned",
    "Self-filling water bowls cleaned",
    "Grooming table towels changed out",
    "Gates, latches, fencing, and yard safety checked",
    "Weekly bath plan reviewed",
    "Weekly exercise/training priorities reviewed",
  ],
  tuesday: ["Trash removed for Wednesday pickup"],
  monthly: [
    "Floors thoroughly cleaned",
    "Walls and panels cleaned",
    "Kennel surfaces cleaned",
    "AC/filter area checked after cleaning",
    "Dog Mansion attic AC filter replaced as needed",
    "AC drain line treated with bleach or vinegar, never mixed",
    "Drains and low areas checked",
    "Drying and ventilation completed",
    "Repair or safety issues noted",
  ],
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
  calendarNote: "cth-calendarNote-records",
  kennelLocation: "cth-kennelLocation-records",
  kennelBuilding: "cth-kennelBuilding-records",
  auditLog: "cth-auditLog-records",
  staffSchedule: "cth-staffSchedule-records",
  timeOffRequest: "cth-timeOffRequest-records",
  kennelHoliday: "cth-kennelHoliday-records",
  scheduleTemplate: "cth-scheduleTemplate-records",
  schedulePublish: "cth-schedulePublish-records",
  notificationLog: "cth-notificationLog-records",
  notificationPreference: "cth-notificationPreference-records",
  taskConfig: "cth-daily-task-config",
  tableConfig: "cth-table-column-config",
  tableSort: "cth-table-sort-config",
  session: "cth-current-session",
  authThrottle: "cth-auth-throttle",
  lastPage: "cth-last-page-id",
};

const defaultServices = [
  { serviceName: "Companion Puppy Placement", category: "Puppy placement", basePrice: "1800", unit: "per puppy", depositAmount: "500", defaultDuration: "", flags: ["Active", "Admin only"], pricingNotes: "Recommended range $1,500-$2,200 for standard companion puppies." },
  { serviceName: "Older Puppy Hold Deposit", category: "Deposit", basePrice: "500", unit: "flat deposit", depositAmount: "500", defaultDuration: "3-7 day hold", flags: ["Active", "Admin only"], pricingNotes: "Lower friction than a 50% reservation while still confirming intent." },
  { serviceName: "Private Yard Rental", category: "Private yard rental", basePrice: "12", unit: "per dog/hour", depositAmount: "", defaultDuration: "60 minutes", flags: ["Active", "Owner bookable later", "Vaccine proof required"], pricingNotes: "Test $10-$12 per dog/hour first; premium slots can be $15-$20." },
  { serviceName: "Husky De-shed", category: "Grooming", basePrice: "75", unit: "per service", depositAmount: "", defaultDuration: "60-90 minutes", flags: ["Active"], pricingNotes: "Price as labor-intensive coat work, not a small bath add-on." },
  { serviceName: "Treadmill Exercise", category: "Exercise", basePrice: "25", unit: "per session", depositAmount: "", defaultDuration: "30 minutes", flags: ["Active"], pricingNotes: "Good add-on for boarding/alumni care." },
  { serviceName: "Member Overnight Care", category: "Boarding", basePrice: "65", unit: "per night", depositAmount: "100", defaultDuration: "overnight", flags: ["Active", "Member Pricing", "Vaccine proof required"], pricingNotes: "Member pricing for approved customer accounts while capacity, insurance, and procedures are proven." },
];

const defaultCfoNotes = [
  { title: "Older puppy pricing", note: "Current $2,500 pricing should show clear proof of value: training, health records, temperament, AKC status, and included support." },
  { title: "Deposit guardrail", note: "Review deposits above $500 or 20% of purchase price before using them publicly." },
  { title: "Private yard rental", note: "Start around $10-$12 per dog/hour; test premium $15-$20 blocks when shade, water, privacy, and photo-friendly features are ready." },
];

const defaultKennelLocations = [
  { building: "Mansion", name: "Mansion 1", active: "on" },
  { building: "Mansion", name: "Mansion 2", active: "on" },
  { building: "Mansion", name: "Mansion 3", active: "on" },
  { building: "Shed", name: "Shed 1", active: "on" },
  { building: "Shed", name: "Shed 2", active: "on" },
  { building: "Shed", name: "Shed 3", active: "on" },
];

const tableColumns = {
  ownedDog: [
    { key: "callName", label: "Call Name", value: (record) => record.callName || "" },
    { key: "sex", label: "Sex", value: (record) => record.sex || "" },
    { key: "careStatus", label: "Care Status", value: (record) => ownedDogCareSummary(record) },
    { key: "specialCare", label: "Special Care Note", value: (record) => record.specialCare || "" },
    { key: "dateOfBirth", label: "DOB", value: (record) => record.dateOfBirth || "" },
    { key: "rabiesDate", label: "Rabies", value: (record) => record.rabiesDate || "" },
    { key: "lastBath", label: "Last Bath", value: (record) => record.lastBath || "" },
    { key: "nextBath", label: "Next Bath", value: (record) => record.nextBath || "" },
    { key: "foodAmount", label: "Food", value: (record) => record.foodAmount || "" },
  ],
  boardingDog: [
    { key: "dogName", label: "Dog", value: (record) => record.dogName || "" },
    { key: "ownerName", label: "Owner", value: (record) => record.ownerName || "" },
    { key: "boardingStatus", label: "Status", value: (record) => normalizeBoardingStatus(record) },
    { key: "ownerPhone", label: "Phone", value: (record) => record.ownerPhone || "" },
    { key: "emergencyPhone", label: "Emergency", value: (record) => [record.emergencyName, record.emergencyPhone].filter(Boolean).join(" ") },
    { key: "dropoffTime", label: "Drop-off", value: (record) => formatDateTime(currentOrNextStay(record)?.dropoffTime) || "" },
    { key: "pickupTime", label: "Pick-up", value: (record) => formatDateTime(currentOrNextStay(record)?.pickupTime) || "" },
    { key: "requiredUpdate", label: "Required Update", value: (record) => (record.flags || []).includes("Required update from owner") ? "Yes" : "No" },
    { key: "requests", label: "Requests", value: (record) => {
      const stay = currentOrNextStay(record);
      return [...(record.flags || []).filter((flag) => flag.includes("requested")), ...((stay?.requests || []).filter((flag) => flag.includes("requested")))].join(", ");
    } },
  ],
  service: [
    { key: "serviceName", label: "Service", value: (record) => record.serviceName || "" },
    { key: "category", label: "Category", value: (record) => record.category || "" },
    { key: "basePrice", label: "Price", value: (record) => Number(record.basePrice || 0) },
    { key: "unit", label: "Unit", value: (record) => record.unit || "" },
    { key: "depositAmount", label: "Deposit", value: (record) => Number(record.depositAmount || 0) },
    { key: "taxRate", label: "Tax", value: (record) => Number(record.taxRate || 0) },
    { key: "flags", label: "Flags", value: (record) => normalizedServiceFlags(record.flags).join(", ") },
  ],
};

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function setDefaultDateAndDay() {
  form.elements.date.value = todayDate();
  if ($("#dailyStaffNoteForm")) $("#dailyStaffNoteForm").elements.noteDate.value = todayDate();
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

function dateOnly(value) {
  if (!value) return "";
  const date = new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function dateOnlyTime(value) {
  const date = dateOnly(value);
  return date ? new Date(`${date}T12:00:00`).getTime() : 0;
}

function daysBetweenDates(start, end) {
  const startTime = dateOnlyTime(start);
  const endTime = dateOnlyTime(end);
  if (!startTime || !endTime) return null;
  return Math.floor((endTime - startTime) / 86400000);
}

function latestLogDate(logs = []) {
  return logs
    .map((log) => dateOnly(log.date || log.completedAt || log.createdAt))
    .filter(Boolean)
    .sort()
    .pop() || "";
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function numberFrom(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeOwnedDogCare(record = {}) {
  const copy = {
    ...record,
    exerciseLogs: arrayValue(record.exerciseLogs),
    trainingLogs: arrayValue(record.trainingLogs),
    bathHistory: arrayValue(record.bathHistory),
    heatHistory: arrayValue(record.heatHistory),
    careNotesHistory: arrayValue(record.careNotesHistory),
    documents: arrayValue(record.documents),
  };
  copy.exerciseFrequencyDays = numberFrom(copy.exerciseFrequencyDays, careDefaults.exerciseFrequencyDays);
  copy.trainingFrequencyDays = numberFrom(copy.trainingFrequencyDays, careDefaults.trainingFrequencyDays);
  copy.bathIntervalDays = numberFrom(copy.bathIntervalDays, careDefaults.bathIntervalDays);
  copy.heatCycleLengthDays = numberFrom(copy.heatCycleLengthDays, careDefaults.heatCycleLengthDays);
  copy.lastExerciseDate = dateOnly(copy.lastExerciseDate) || latestLogDate(copy.exerciseLogs);
  copy.lastTrainingDate = dateOnly(copy.lastTrainingDate) || latestLogDate(copy.trainingLogs);
  copy.lastBath = dateOnly(copy.lastBath) || latestLogDate(copy.bathHistory);
  copy.nextBath = dateOnly(copy.nextBath) || (copy.lastBath ? addDays(copy.lastBath, copy.bathIntervalDays) : "");
  copy.lastHeat = copy.sex === "Female" ? dateOnly(copy.lastHeat) || latestLogDate(copy.heatHistory) : "";
  copy.nextHeat = copy.sex === "Female" ? dateOnly(copy.nextHeat) || (copy.lastHeat ? addDays(copy.lastHeat, copy.heatCycleLengthDays) : "") : "";
  return copy;
}

function careDueFromDate(lastDate, intervalDays, date = todayDate()) {
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
  if (expectedSoon) return { state: "expected-soon", label: `Expected in ${daysToNext} day${daysToNext === 1 ? "" : "s"}`, inHeat, expectedSoon, overdue };
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
  else if (heat.expectedSoon || heat.overdue) parts.push("Heat watch");
  if (record.careStatus) parts.push(record.careStatus);
  return parts.join(", ") || "Current";
}

function ownedDogHasCareNote(record = {}) {
  return Boolean(
    record.specialCare ||
      record.medicalCareNotes ||
      record.careStatus ||
      arrayValue(record.careNotesHistory).length ||
      String(record.notes || "").match(/medical|medication|limp|injur|behavior|watch|special care/i),
  );
}

function ownedDogMatchesCareFilter(record = {}, filter = ownedDogCareFilter, date = todayDate()) {
  const heat = ownedDogHeatStatus(record, date);
  if (filter === "Exercise Due") return ownedDogExerciseDue(record, date);
  if (filter === "Training Due") return ownedDogTrainingDue(record, date);
  if (filter === "Bath Due") return ownedDogBathDue(record, date);
  if (filter === "Females") return record.sex === "Female";
  if (filter === "Males") return record.sex === "Male";
  if (filter === "Heat Watch") return record.sex === "Female" && (heat.inHeat || heat.expectedSoon || heat.overdue || heat.state === "unknown");
  if (filter === "Special Care") return ownedDogHasCareNote(record);
  return true;
}

function statusChipHtml(label, className = "") {
  return `<span class="status-chip ${escapeHtml(className)}">${escapeHtml(label)}</span>`;
}

function normalizedServiceFlags(flags = []) {
  return [...new Set((flags || []).map((flag) => (flag === "Alumni only" ? "Member Pricing" : flag)).filter(Boolean))];
}

function serviceHasFlag(service = {}, flag = "") {
  return normalizedServiceFlags(service.flags).includes(flag);
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function uniqueEmails(...values) {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function serviceFlagChipsHtml(flags = []) {
  const normalized = normalizedServiceFlags(flags);
  return normalized.length
    ? `<span class="service-flag-list">${normalized.map((flag) => `<span class="service-flag-chip">${escapeHtml(flag)}</span>`).join("")}</span>`
    : "";
}

function isMemberUser(user = currentUser) {
  if (!user) return false;
  const profile = savedUserFor(user) || {};
  return profile.isMember === true || profile.isMember === "on" || profile.isMember === "true" || profile.member === true;
}

function dogTypeBadgeHtml(type) {
  const labels = {
    ownedDog: "Our Dog",
    boardingDog: "Boarding Dog",
    customerDog: "Customer Dog",
  };
  return statusChipHtml(labels[type] || "Dog", `dog-type-chip ${type}`);
}

function normalizeBoardingStatus(record = {}) {
  const status = String(record.boardingStatus || record.status || "").trim();
  if (boardingLifecycleStatuses.includes(status)) return status;
  if (/cancel/i.test(status)) return "Cancelled";
  if (/check(ed)? out/i.test(status)) return "Checked Out";
  if (/ready/i.test(status)) return "Ready For Pickup";
  if (/kennel|active|current/i.test(status)) return "In Kennel";
  if (/check(ed)? in/i.test(status)) return "Checked In";
  if (/approve/i.test(status)) return "Approved";
  if (/pending|request/i.test(status) || record.customerRequest) return "Pending";
  if (isCurrentlyBoarding(record)) return "In Kennel";
  return "Approved";
}

function statusClassForBoardingStatus(status = "") {
  const normalized = String(status).toLowerCase().replace(/\s+/g, "-");
  return `is-status-${normalized}`;
}

function boardingStatusChipHtml(record = {}) {
  const status = normalizeBoardingStatus(record);
  const kennelLabel = status === "In Kennel" ? boardingKennelLocationLabel(record) : "";
  const label = kennelLabel ? `${status} - ${kennelLabel}` : status;
  return statusChipHtml(label, `boarding-status-chip ${statusClassForBoardingStatus(status)}`);
}

function boardingStayStatusChipHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const kennelLabel = status === "In Kennel" ? boardingKennelLocationLabel(record, stay) : "";
  const label = kennelLabel ? `${status} - ${kennelLabel}` : status;
  return statusChipHtml(label, `boarding-status-chip ${statusClassForBoardingStatus(status)}`);
}

function boardingKennelLocationLabel(record = {}, stayOverride = null) {
  const stay = stayOverride || currentOrNextStay(record) || (record.stays || [])[0] || {};
  const building = String(stay.kennelBuilding || record.kennelBuilding || "").trim();
  const name = String(stay.kennelLocationName || record.kennelLocationName || "").trim();
  if (!building) return name;
  if (!name) return building;
  return name.toLowerCase().includes(building.toLowerCase()) ? name : `${building} ${name}`;
}

function transitionLabel(status) {
  return {
    Approved: "Approve",
    Cancelled: "Cancel",
    "Checked In": "Check In",
    "In Kennel": "Mark In Kennel",
    "Ready For Pickup": "Ready For Pickup",
    "Checked Out": "Check Out",
  }[status] || status;
}

function canTransitionBoardingStatus(record = {}, nextStatus, options = {}) {
  const currentStatus = normalizeBoardingStatus(record);
  if (options.allowEarly && nextStatus === "Checked In" && ["Pending", "Approved"].includes(currentStatus)) return true;
  if (options.allowEarly && nextStatus === "Checked Out" && ["Checked In", "In Kennel", "Ready For Pickup"].includes(currentStatus)) return true;
  return (boardingStatusTransitions[currentStatus] || []).includes(nextStatus);
}

function boardingTransitionActions(record = {}) {
  const currentStatus = normalizeBoardingStatus(record);
  const nextStatuses = boardingStatusTransitions[currentStatus] || [];
  return nextStatuses.length
    ? `<div class="record-actions lifecycle-actions">${nextStatuses.map((nextStatus) => `<button type="button" class="secondary-button" data-action="transition-boarding" data-next-status="${escapeHtml(nextStatus)}" data-id="${escapeHtml(record.id)}">${escapeHtml(transitionLabel(nextStatus))}</button>`).join("")}</div>`
    : "";
}

function isFutureDateTime(value, date = new Date()) {
  const target = new Date(value);
  return !Number.isNaN(target.getTime()) && target > date;
}

function boardingStatusTargetStay(record = {}, nextStatus = "") {
  if (nextStatus === "Checked Out") return activeBoardingStay(record) || currentOrNextStay(record);
  return currentOrNextStay(record);
}

function mergeStayRequestLabels(existing = [], additions = []) {
  return [...new Set([...(existing || []), ...(additions || [])].filter(Boolean))];
}

function boardingStatusScopedStays(record = {}, nextStatus = "", timestamp = new Date().toISOString(), options = {}) {
  const targetStay = boardingStatusTargetStay(record, nextStatus);
  const targetStayId = targetStay?.id || "";
  return (record.stays || []).map((stay) => {
    if (!targetStayId || stay.id !== targetStayId) return stay;
    const checkInDetails = nextStatus === "Checked In" ? options.checkInDetails || null : null;
    return {
      ...stay,
      status: nextStatus,
      updatedAt: timestamp,
      actualDropoffAt: nextStatus === "Checked In" ? stay.actualDropoffAt || timestamp : stay.actualDropoffAt || "",
      actualPickupAt: nextStatus === "Checked Out" ? stay.actualPickupAt || timestamp : stay.actualPickupAt || "",
      requests: checkInDetails?.addedServiceLabels?.length ? mergeStayRequestLabels(stay.requests, checkInDetails.addedServiceLabels) : stay.requests || [],
      checkIn: checkInDetails
        ? {
            ...(stay.checkIn || {}),
            ...checkInDetails,
            verifiedAt: checkInDetails.verifiedAt || timestamp,
            verifiedBy: checkInDetails.verifiedBy || currentUser?.name || helperName?.value || "",
            verifiedByEmail: checkInDetails.verifiedByEmail || currentUser?.email || helperEmail?.value || "",
          }
        : stay.checkIn || null,
    };
  });
}

function boardingTransitionIsEarly(record = {}, nextStatus = "") {
  const stay = boardingStatusTargetStay(record, nextStatus);
  if (nextStatus === "Checked In") return isFutureDateTime(stay?.dropoffTime);
  if (nextStatus === "Checked Out") return isFutureDateTime(stay?.pickupTime);
  return false;
}

function withBoardingStatusTransition(record = {}, nextStatus, options = {}) {
  const currentStatus = normalizeBoardingStatus(record);
  if (!canTransitionBoardingStatus(record, nextStatus, options)) return null;
  const timestamp = new Date().toISOString();
  const early = Boolean(options.early || boardingTransitionIsEarly(record, nextStatus));
  const kennelLocation = options.kennelLocation || null;
  const scopedStays = boardingStatusScopedStays(record, nextStatus, timestamp, options).map((stay) => {
    if (nextStatus !== "In Kennel" || !kennelLocation) return stay;
    const targetStay = boardingStatusTargetStay(record, nextStatus);
    if (targetStay?.id && stay.id !== targetStay.id) return stay;
    return {
      ...stay,
      kennelLocationId: kennelLocation.id,
      kennelLocationName: kennelLocation.name,
      kennelBuilding: kennelLocation.building,
      kennelAssignedAt: timestamp,
    };
  });
  return {
    ...record,
    boardingStatus: nextStatus,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: nextStatus,
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
        early,
      },
    ],
    checkedInAt: nextStatus === "Checked In" ? timestamp : record.checkedInAt || "",
    inKennelAt: nextStatus === "In Kennel" ? timestamp : record.inKennelAt || "",
    readyForPickupAt: nextStatus === "Ready For Pickup" ? timestamp : record.readyForPickupAt || "",
    checkedOutAt: nextStatus === "Checked Out" ? timestamp : record.checkedOutAt || "",
    cancelledAt: nextStatus === "Cancelled" ? timestamp : record.cancelledAt || "",
    earlyCheckInAt: nextStatus === "Checked In" && early ? timestamp : record.earlyCheckInAt || "",
    earlyCheckOutAt: nextStatus === "Checked Out" && early ? timestamp : record.earlyCheckOutAt || "",
    kennelLocationId: nextStatus === "In Kennel" && kennelLocation ? kennelLocation.id : record.kennelLocationId || "",
    kennelLocationName: nextStatus === "In Kennel" && kennelLocation ? kennelLocation.name : record.kennelLocationName || "",
    kennelBuilding: nextStatus === "In Kennel" && kennelLocation ? kennelLocation.building : record.kennelBuilding || "",
    kennelAssignedAt: nextStatus === "In Kennel" && kennelLocation ? timestamp : record.kennelAssignedAt || "",
    stays: scopedStays,
    flags: nextStatus === "Cancelled" || nextStatus === "Checked Out" ? (record.flags || []).filter((flag) => flag !== "Required update from owner") : record.flags || [],
  };
}

function approveBoardingRecord(record = {}) {
  const currentStatus = normalizeBoardingStatus(record);
  const transitioned = withBoardingStatusTransition(record, "Approved");
  if (transitioned) return transitioned;
  if (currentStatus === "Approved") return record;
  const timestamp = new Date().toISOString();
  const updatedStays = (record.stays || []).map((stay) => ({
    ...stay,
    status: !stay.status || stay.status === "Cancelled" || stay.status === "Pending" ? "Approved" : stay.status,
    updatedAt: timestamp,
  }));
  return {
    ...record,
    boardingStatus: "Approved",
    approvedAt: record.approvedAt || timestamp,
    approvedBy: record.approvedBy || currentUser?.name || helperName?.value || "",
    cancelledAt: currentStatus === "Cancelled" ? "" : record.cancelledAt || "",
    stays: updatedStays,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: "Approved",
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
      },
    ],
    flags: (record.flags || []).filter((flag) => flag !== "Required update from owner"),
  };
}

function boardingStayDisplayStatus(record = {}, stay = {}) {
  const stayStatus = String(stay.status || "").trim();
  if (!stayStatus) return normalizeBoardingStatus(record);
  if (stayStatus === "Pending" && !record.customerRequest && (record.entrySource === "staff-admin" || !record.entrySource)) return "Approved";
  return boardingLifecycleStatuses.includes(stayStatus) ? stayStatus : normalizeBoardingStatus({ boardingStatus: stayStatus });
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

function dateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDateFromStoredDateTime(value) {
  return dateTimeLocalValue(value).slice(0, 10);
}

function localDateTimeToIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function localDateFromDateTimeInput(value) {
  return value ? value.slice(0, 10) : todayDate();
}

function hoursBetween(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end) - new Date(start)) / 36e5);
}

function readRecords(type) {
  return JSON.parse(localStorage.getItem(stateKeys[type]) || "[]");
}

function compactRecordsForStorage(records) {
  const maxInlineMediaLength = 1800000;
  return records.map((record) => {
    const copy = { ...record };
    delete copy.profilePhotoData;
    delete copy.profilePhoto;
    if (Array.isArray(copy.mediaItems)) {
      copy.mediaItems = copy.mediaItems.map((item) => {
        const clean = { ...item };
        if (clean.url) delete clean.dataUrl;
        if (clean.dataUrl && clean.dataUrl.length > maxInlineMediaLength) {
          clean.dataUrl = "";
          clean.note = "Large media file was logged by filename only.";
        }
        return clean;
      });
    }
    return copy;
  });
}

function writeRecords(type, records) {
  const compactedRecords = compactRecordsForStorage(records);
  try {
    localStorage.setItem(stateKeys[type], JSON.stringify(compactedRecords));
    return compactedRecords;
  } catch (error) {
    showToast("This record could not be saved. Try a smaller file or remove large uploads.");
    throw error;
  }
}

function taskTemplateId(shift, text, index) {
  return `${shift}-${index}-${String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "task"}`;
}

function defaultTaskList(shift, tasks = []) {
  return tasks.map((text, index) => ({ id: taskTemplateId(shift, text, index), text }));
}

function normalizeTaskList(tasks = [], fallback = []) {
  const source = Array.isArray(tasks) ? tasks : fallback;
  return source
    .map((task, index) => {
      if (typeof task === "string") return { id: taskTemplateId("task", task, index), text: task };
      return { id: task.id || taskTemplateId("task", task.text, index), text: task.text || "" };
    })
    .filter((task) => task.text);
}

function normalizeTaskTabId(label = "") {
  return `custom-${String(label || "task-tab").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "task-tab"}-${Date.now().toString(36)}`;
}

function normalizeCustomTaskTabs(tabs = []) {
  if (!Array.isArray(tabs)) return [];
  return tabs
    .map((tab) => ({
      id: String(tab.id || normalizeTaskTabId(tab.label || "Custom")).replace(/[^a-zA-Z0-9_-]/g, "-"),
      label: String(tab.label || "Custom").trim(),
      system: false,
    }))
    .filter((tab) => tab.id && tab.label && !defaultTaskTabMeta.some((item) => item.id === tab.id));
}

function normalizeRemovedTaskTabs(tabs = []) {
  if (!Array.isArray(tabs)) return [];
  const removableIds = new Set(defaultTaskTabMeta.map((tab) => tab.id));
  return [...new Set(tabs.map((tab) => String(tab || "").trim()).filter((tab) => removableIds.has(tab)))];
}

function readTaskConfig() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.taskConfig) || "null");
  const hasGroup = (group) => saved && Object.prototype.hasOwnProperty.call(saved, group);
  const customTabs = normalizeCustomTaskTabs(saved?._tabs);
  const removedTabs = normalizeRemovedTaskTabs(saved?._removedTabs);
  const config = {
    _tabs: customTabs,
    _removedTabs: removedTabs,
    morning: normalizeTaskList(saved?.morning, hasGroup("morning") ? [] : defaultTaskList("morning", defaultDailyTasks.morning)),
    pm: normalizeTaskList(saved?.pm, hasGroup("pm") ? [] : defaultTaskList("pm", defaultDailyTasks.pm)),
    weekly: normalizeTaskList(saved?.weekly, hasGroup("weekly") ? [] : defaultTaskList("weekly", defaultManagedTasks.weekly)),
    tuesday: normalizeTaskList(saved?.tuesday, hasGroup("tuesday") ? [] : defaultTaskList("tuesday", defaultManagedTasks.tuesday)),
    monthly: normalizeTaskList(saved?.monthly, hasGroup("monthly") ? [] : defaultTaskList("monthly", defaultManagedTasks.monthly)),
  };
  customTabs.forEach((tab) => {
    config[tab.id] = normalizeTaskList(saved?.[tab.id], hasGroup(tab.id) ? [] : []);
  });
  return config;
}

function writeTaskConfig(config) {
  localStorage.setItem(stateKeys.taskConfig, JSON.stringify(config));
}

function ensureTaskConfig() {
  writeTaskConfig(readTaskConfig());
}

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
  container.innerHTML = columns
    .map((column) => {
      const visible = order.includes(column.key);
      const index = order.indexOf(column.key);
      return `<div class="column-chip ${visible ? "" : "is-off"}" data-column="${column.key}" data-table="${type}" draggable="${visible}">
        <label><input type="checkbox" ${visible ? "checked" : ""} data-action="toggle-column" data-table="${type}" data-column="${column.key}" /> ${escapeHtml(column.label)}</label>
        <button type="button" class="icon-button" data-action="move-column-up" data-table="${type}" data-column="${column.key}" ${index <= 0 ? "disabled" : ""} title="Move left">↑</button>
        <button type="button" class="icon-button" data-action="move-column-down" data-table="${type}" data-column="${column.key}" ${index < 0 || index >= order.length - 1 ? "disabled" : ""} title="Move right">↓</button>
      </div>`;
    })
    .join("");
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
  event.dataTransfer.setData("text/plain", `${header.dataset.table}:${header.dataset.column}`);
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
  return `<tr>${columns
    .map((column) => {
      const marker = sort.key === column.key ? (sort.direction === "desc" ? " ↓" : " ↑") : "";
      return `<th data-sort-column="${column.key}" title="Click to sort">${escapeHtml(column.label)}${marker}</th>`;
    })
    .join("")}</tr>`;
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
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      openPasswordRecoveryForm(session?.user?.email || "", { focusPassword: true });
      showDetailDialog("Set New Password", "<p>Enter and confirm a new password to finish password recovery.</p>");
      return;
    }
    if (event === "SIGNED_IN" && session?.user) {
      if (Date.now() < suppressAuthSyncUntil) return;
      syncAuthenticatedSupabaseUser(session.user, { switchAfterLogin: false }).catch((error) => {
        console.warn("Could not sync authenticated user profile.", error);
      });
    }
  });
}

function recordTypes() {
  return ["ownedDog", "boardingDog", "request", "maintenance", "timesheet", "service", "dailyTask", "customerDog", "settingsUser", "cfoNote", "calendarNote", "kennelLocation", "kennelBuilding", "auditLog", "staffSchedule", "timeOffRequest", "kennelHoliday", "scheduleTemplate", "schedulePublish", "notificationLog", "notificationPreference"];
}

function settingsUsers() {
  return readRecords("settingsUser").filter((user) => !user.removed);
}

function savedUserFor(account = {}) {
  if (!account) return undefined;
  const email = account.email?.toLowerCase();
  return settingsUsers().find((user) => (user.authId && user.authId === account.key) || (email && user.email?.toLowerCase() === email));
}

function roleForAccount(account = {}) {
  account = account || {};
  const email = account.email?.toLowerCase();
  const saved = savedUserFor(account);
  if (saved?.role) return saved.role;
  if (account.role) return account.role;
  if (ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(email)) return "admin";
  return "customer";
}

function userFromSupabase(supabaseUser) {
  if (!supabaseUser?.email) return null;
  const email = supabaseUser.email.toLowerCase();
  const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split("@")[0];
  const role = supabaseUser.app_metadata?.role || roleForAccount({ email, key: supabaseUser.id });
  return {
    name,
    email,
    key: supabaseUser.id,
    role,
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
    showToast("Database login setup is not complete yet. Email/password login needs Supabase Auth.");
    return;
  }
  if (window.location.protocol === "file:") {
    showDetailDialog(
      "Hosted Website Required",
      `<p>Google and Facebook sign-in cannot finish from this file preview. Open the hosted site, or run the app from a local test server URL that is added to Google OAuth and Supabase redirect settings.</p>`,
    );
    return;
  }
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authRedirectUrl() },
  });
  if (error) showToast(error.message);
}

function authRedirectUrl() {
  try {
    const currentUrl = new URL(window.location.href);
    const currentPath = currentUrl.pathname.replace(/\/+$/, "");
    if (currentUrl.origin === "https://www.centraltexashusky.com" && currentPath === "/kennel-tracker") {
      return APP_PRODUCTION_URL;
    }
    if (currentUrl.origin === "https://centraltexashusky.github.io" && currentPath === "/central-texas-husky-kennel-tracker") {
      return APP_PRODUCTION_URL;
    }
    if (currentUrl.origin === "https://kennel.centraltexashusky.com") {
      return APP_PRODUCTION_URL;
    }
    if (["localhost", "127.0.0.1", "::1"].includes(currentUrl.hostname)) {
      return currentUrl.href.split("#")[0];
    }
  } catch (error) {
    console.warn("Could not inspect current auth redirect URL.", error);
  }
  return APP_AUTH_REDIRECT_URL;
}

function showAuthRedirectError() {
  const hash = window.location.hash?.replace(/^#/, "") || "";
  const params = new URLSearchParams(hash);
  const error = params.get("error") || params.get("error_code");
  const description = params.get("error_description");
  if (!error && !description) return;
  showDetailDialog("Google Login Failed", `<p>${escapeHtml(description || error || "The OAuth login did not complete.")}</p><p>Confirm this exact redirect URL is allowed in Supabase: ${escapeHtml(authRedirectUrl())}</p>`);
  window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
}

function isLocalTestingOrigin() {
  return ["localhost", "127.0.0.1", "::1", ""].includes(window.location.hostname) || window.location.protocol === "file:";
}

function userFromLocalTestLogin(email, role = "admin") {
  const localPart = String(email || "local@test").split("@")[0] || "Local Tester";
  const name = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Local Tester";
  return {
    name,
    email,
    key: `local-test-${email || Date.now()}`,
    role: ["customer", "helper", "admin"].includes(role) ? role : "admin",
    authProvider: "local-test",
  };
}

function completeLocalTestLogin(email, reason = "", role = "admin") {
  localTestMode = true;
  supabaseClient = null;
  setHelper(userFromLocalTestLogin(email, role), { switchAfterLogin: false });
  modeLabel.textContent = "Local test mode";
  switchPage(rememberedPageForRole(currentRole()));
  showDetailDialog(
    "Local Test Login",
    `<p>You are signed in locally as an admin for UI testing. Remote Supabase login was not used${reason ? `: ${escapeHtml(reason)}` : "."}</p><p>Changes will stay in this browser's local storage during this test session.</p>`,
  );
}

function hydrateLoginFromUrl() {
  if (!isLocalTestingOrigin()) return;
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const password = params.get("password") || "";
  const role = params.get("role") || "admin";
  const loginForm = $("#passwordLoginForm");
  if (email && loginForm?.elements.email) loginForm.elements.email.value = email;
  if (password && loginForm?.elements.password) loginForm.elements.password.value = password;
  if (params.get("localTest") === "1" && email) {
    params.delete("localTest");
    completeLocalTestLogin(email, "localTest=1 was used on a local testing URL", role);
  }
  if (password || params.get("localTest") === "1") {
    params.delete("password");
    params.delete("localTest");
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

function adminEmailList() {
  return ADMIN_EMAILS.map((email) => email.toLowerCase());
}

async function activeSupabaseAdminSession() {
  if (!supabaseClient) return { session: null, error: "Supabase Auth is not available." };
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session?.access_token) {
    return { session: null, error: "Sign in with the admin email and password again before changing passwords." };
  }
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();
  if (userError || !userData.user?.email) {
    return { session: null, error: userError?.message || "The admin session could not be verified." };
  }
  const sessionEmail = userData.user.email.toLowerCase();
  if (!adminEmailList().includes(sessionEmail)) {
    return { session: null, error: `The active Supabase session is ${sessionEmail}, which is not an admin account.` };
  }
  return { session: sessionData.session, error: "" };
}

async function edgeFunctionErrorMessage(error, fallback = "The admin password function could not complete.") {
  const response = error?.context;
  if (response?.clone) {
    try {
      const body = await response.clone().json();
      return body.error || body.message || body.msg || JSON.stringify(body);
    } catch {
      try {
        const text = await response.clone().text();
        if (text) return text;
      } catch {
        // Fall through to the Supabase client error message.
      }
    }
  }
  return error?.message || fallback;
}

function readAuthThrottle() {
  return JSON.parse(localStorage.getItem(stateKeys.authThrottle) || "{}") || {};
}

function writeAuthThrottle(data) {
  localStorage.setItem(stateKeys.authThrottle, JSON.stringify(data));
}

function throttleKey(action, email) {
  return `${action}:${String(email || "").toLowerCase()}`;
}

function authThrottleWait(action, email, minimumMs = 60000) {
  const throttle = readAuthThrottle();
  const lastAttempt = Number(throttle[throttleKey(action, email)] || 0);
  const remaining = minimumMs - (Date.now() - lastAttempt);
  return remaining > 0 ? remaining : 0;
}

function markAuthAttempt(action, email) {
  const throttle = readAuthThrottle();
  throttle[throttleKey(action, email)] = Date.now();
  writeAuthThrottle(throttle);
}

function setSubmitState(button, isBusy, busyText = "Working...") {
  if (!button) return;
  if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
  button.disabled = isBusy;
  button.textContent = isBusy ? busyText : button.dataset.defaultText;
}

function passwordMatchCheck(targetForm, passwordName, confirmName) {
  const passwordField = targetForm.elements[passwordName];
  const confirmField = targetForm.elements[confirmName];
  return {
    field: confirmField,
    message: "Passwords must match.",
    valid: !passwordField || !confirmField || passwordField.value === confirmField.value,
  };
}

function openPasswordRecoveryForm(email = "", options = {}) {
  const recoveryForm = $("#passwordRecoveryForm");
  recoveryForm.hidden = false;
  if (email) recoveryForm.elements.email.value = email;
  const focusField = options.focusPassword ? recoveryForm.elements.newPassword : recoveryForm.elements.email;
  focusField?.focus();
}

function profileRecordForUser(user) {
  const existing = savedUserFor(user) || {};
  return {
    ...existing,
    type: "settingsUser",
    id: existing.id || uid("settingsUser"),
    submittedAt: existing.submittedAt || new Date().toISOString(),
    name: user.name || user.email,
    email: user.email,
    authId: user.key || "",
    role: user.role || "customer",
    authProvider: user.authProvider || "supabase",
    removed: false,
  };
}

function profileRecordForLogin(user) {
  const existing = savedUserFor(user) || {};
  const loginAt = new Date().toISOString();
  return {
    ...profileRecordForUser(user),
    lastLoginAt: loginAt,
    lastLoginEmail: user.email || existing.lastLoginEmail || "",
    lastLoginProvider: user.authProvider || existing.authProvider || "",
    loginCount: Number(existing.loginCount || 0) + 1,
  };
}

function mergeUniqueIds(...groups) {
  return [...new Set(groups.flat().filter(Boolean).map(String))];
}

function customerProfilePayload({ email = "", name = "", customerDogId = "", boardingDogId = "", authId = "" } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const existing = savedUserFor({ email: normalizedEmail, key: authId }) || {};
  return {
    ...existing,
    type: "settingsUser",
    id: existing.id || uid("settingsUser"),
    submittedAt: existing.submittedAt || new Date().toISOString(),
    name: existing.name || name || normalizedEmail,
    email: normalizedEmail,
    authId: existing.authId || authId || "",
    role: existing.role || "customer",
    authProvider: existing.authProvider || "customer-signup",
    linkedCustomerDogIds: mergeUniqueIds(existing.linkedCustomerDogIds || [], [customerDogId]),
    linkedBoardingDogIds: mergeUniqueIds(existing.linkedBoardingDogIds || [], [boardingDogId]),
    removed: false,
  };
}

function removedSettingsUserForEmail(email = "") {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  return readRecords("settingsUser").find((user) => user.removed && normalizeEmail(user.email) === normalizedEmail) || null;
}

async function ensureCustomerAccessProfile(source = {}, options = {}) {
  const payload = customerProfilePayload(source);
  if (!payload) return null;
  if (!options.allowRemovedRecreate && removedSettingsUserForEmail(payload.email)) return null;
  const record = upsertRecord("settingsUser", payload);
  await sendPayload(record);
  return record;
}

async function syncMissingCustomerAccessProfiles() {
  if (localTestMode || !supabaseClient || customerProfileSyncInProgress) return;
  if (!["admin", "helper"].includes(currentRole())) return;
  customerProfileSyncInProgress = true;
  try {
    const sources = [];
    readRecords("customerDog")
      .filter((dog) => !dog.removed)
      .forEach((dog) => sources.push({
        email: dog.customerEmail || dog.ownerEmail,
        name: dog.ownerName,
        customerDogId: dog.id,
      }));
    readRecords("boardingDog")
      .filter((record) => !record.removed && (record.customerRequest || record.linkedCustomerDogId || record.ownerEmail))
      .forEach((record) => sources.push({
        email: record.ownerEmail || record.customerEmail,
        name: record.ownerName,
        customerDogId: record.linkedCustomerDogId,
        boardingDogId: record.id,
      }));
    readRecords("boardingDog")
      .filter((record) => !record.removed && record.secondaryOwnerEmail)
      .forEach((record) => sources.push({
        email: record.secondaryOwnerEmail,
        name: record.secondaryOwnerName || record.ownerName,
        boardingDogId: record.id,
      }));
    for (const source of sources) {
      const email = normalizeEmail(source.email);
      if (!email || savedUserFor({ email }) || removedSettingsUserForEmail(email)) continue;
      await ensureCustomerAccessProfile(source);
    }
  } finally {
    customerProfileSyncInProgress = false;
  }
}

async function ensureAppUserProfile(user) {
  if (!user?.email) return null;
  const record = upsertRecord("settingsUser", profileRecordForLogin(user));
  await sendPayload(record);
  return record;
}

function isEmailConfirmationError(message = "") {
  return /confirm|verified|verification/i.test(message);
}

async function syncAuthenticatedSupabaseUser(supabaseUser, options = {}) {
  const user = userFromSupabase(supabaseUser);
  if (!user) return null;
  if (authSessionSyncPromise) return authSessionSyncPromise;
  authSessionSyncPromise = (async () => {
    await loadRemoteRecords();
    const profile = await ensureAppUserProfile(user);
    const syncedUser = {
      ...user,
      role: profile?.role || roleForAccount(user),
      name: profile?.name || user.name,
    };
    setHelper(syncedUser, { switchAfterLogin: options.switchAfterLogin });
    await loadRemoteRecords();
    requirePasswordChangeIfNeeded();
    return syncedUser;
  })();
  try {
    return await authSessionSyncPromise;
  } finally {
    authSessionSyncPromise = null;
  }
}

async function loginWithPassword(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  if (!validateForm(formEl)) return;
  const data = formPayload(formEl);
  const email = data.email.trim().toLowerCase();
  if (!supabaseClient) {
    if (isLocalTestingOrigin()) {
      completeLocalTestLogin(email, "Supabase is not available from this local test page");
      return;
    }
    showDetailDialog("Login Setup Needed", "<p>Email and password login needs the Supabase connection first.</p>");
    return;
  }
  const button = formEl.querySelector('button[type="submit"]');
  setSubmitState(button, true, "Signing in...");
  const { data: authData, error } = await supabaseClient.auth.signInWithPassword({ email, password: data.password });
  setSubmitState(button, false);
  if (error) {
    if (isLocalTestingOrigin()) {
      completeLocalTestLogin(email, error.message || "local Supabase Auth failed");
      return;
    }
    showDetailDialog(
      isEmailConfirmationError(error.message) ? "Email Confirmation Needed" : "Login Failed",
      isEmailConfirmationError(error.message)
        ? `<p>Open the confirmation email sent to ${escapeHtml(email)}, confirm the account, then return here and sign in.</p>`
        : `<p>${escapeHtml(error.message)}</p>`,
    );
    return;
  }
  const user = await syncAuthenticatedSupabaseUser(authData.user);
  if (!user) return;
  switchPage(user.role === "customer" ? "customerPage" : "dashboardPage");
  formEl.reset();
  showToast(`${user.name} is logged in.`);
}

async function createCustomerLogin(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  if (!validateForm(formEl, [passwordMatchCheck(formEl, "password", "confirmPassword")])) return;
  if (!supabaseClient) {
    showDetailDialog("Login Setup Needed", "<p>Customer login creation needs the Supabase connection first.</p>");
    return;
  }
  const data = formPayload(formEl);
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const wait = authThrottleWait("signup", email);
  if (wait) {
    showDetailDialog("Please Wait", `<p>Try again in ${Math.ceil(wait / 1000)} seconds.</p>`);
    return;
  }
  const button = formEl.querySelector('button[type="submit"]');
  setSubmitState(button, true, "Creating...");
  markAuthAttempt("signup", email);
  suppressAuthSyncUntil = Date.now() + 10000;
  const { data: authData, error } = await supabaseClient.auth.signUp({
    email,
    password: data.password,
    options: {
      emailRedirectTo: authRedirectUrl(),
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        role: "customer",
      },
    },
  });
  setSubmitState(button, false);
  if (error) {
    suppressAuthSyncUntil = 0;
    showDetailDialog(
      "Account Not Created",
      `<p>${escapeHtml(error.message)}</p><p>If this email already has an account, use the main sign-in form instead.</p>`,
    );
    return;
  }
  if (authData.session) {
    await supabaseClient.auth.signOut();
  }
  formEl.reset();
  formEl.hidden = true;
  showDetailDialog(
    "Check Your Email",
    `<p>A confirmation email was sent to ${escapeHtml(email)}. Confirm the email first, then return here and sign in with your email and password.</p><p>Google sign-in is already authenticated by Google, so it does not use this email confirmation step.</p>`,
  );
}

async function sendRecoveryCode() {
  const formEl = $("#passwordRecoveryForm");
  if (!supabaseClient) {
    showDetailDialog("Login Setup Needed", "<p>Password recovery needs the Supabase connection first.</p>");
    return;
  }
  const emailField = formEl.elements.email;
  if (!emailField.checkValidity()) {
    formEl.reportValidity();
    return;
  }
  const email = emailField.value.trim().toLowerCase();
  const wait = authThrottleWait("recovery", email);
  if (wait) {
    showDetailDialog("Please Wait", `<p>Try again in ${Math.ceil(wait / 1000)} seconds.</p>`);
    return;
  }
  const button = $("#sendRecoveryCodeButton");
  setSubmitState(button, true, "Sending...");
  markAuthAttempt("recovery", email);
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
  setSubmitState(button, false);
  if (error) {
    showDetailDialog("Reset Email Not Sent", `<p>The password reset email could not be sent: ${escapeHtml(error.message)}</p>`);
    return;
  }
  showDetailDialog(
    "Reset Email Sent",
    `<p>A password reset email was sent to ${escapeHtml(email)}. Open the link in that email. It should return to ${escapeHtml(authRedirectUrl())} so the new password can be saved.</p>`,
  );
}

async function completePasswordRecovery(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  if (!validateForm(formEl, [passwordMatchCheck(formEl, "newPassword", "confirmNewPassword")])) return;
  if (!supabaseClient) {
    showDetailDialog("Login Setup Needed", "<p>Password recovery needs the Supabase connection first.</p>");
    return;
  }
  const data = formPayload(formEl);
  const email = data.email.trim().toLowerCase();
  const password = data.newPassword;
  if (!password) {
    showDetailDialog("New Password Required", "<p>Enter and confirm a new password.</p>");
    return;
  }
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const sessionEmail = sessionData.session?.user?.email?.toLowerCase();
  if (!sessionData.session || (sessionEmail && sessionEmail !== email)) {
    showDetailDialog(
      "Open Reset Link First",
      `<p>Use <strong>Send Reset Email</strong>, open the reset link from the email, then return here to save the new password. The reset link must open ${escapeHtml(authRedirectUrl())}.</p>`,
    );
    return;
  }
  const button = formEl.querySelector('button[type="submit"]');
  setSubmitState(button, true, "Changing...");
  const { data: updateData, error: updateError } = await supabaseClient.auth.updateUser({ password });
  setSubmitState(button, false);
  if (updateError) {
    showDetailDialog("Password Not Changed", `<p>${escapeHtml(updateError.message)}</p>`);
    return;
  }
  const user = userFromSupabase(updateData.user || sessionData.session.user);
  if (user) {
    await ensureAppUserProfile(user);
    setHelper(user);
  }
  formEl.reset();
  formEl.hidden = true;
  showDetailDialog("Password Changed", "<p>Your password was updated. Use the new password for future sign-ins.</p>");
}

function passwordProfileForUser(user = currentUser) {
  if (!user?.email && !user?.key) return null;
  return savedUserFor(user);
}

function passwordChangeRequiredForUser(user = currentUser) {
  const profile = passwordProfileForUser(user);
  return profile?.passwordChangeRequired === true || profile?.passwordChangeRequired === "true";
}

function requirePasswordChangeIfNeeded() {
  if (!supabaseClient || !currentUser?.email || !passwordChangeRequiredForUser(currentUser)) return;
  const dialog = $("#passwordChangeDialog");
  $("#forcePasswordChangeForm").reset();
  if (!dialog.open) dialog.showModal();
}

async function clearPasswordChangeRequirement() {
  const existing = passwordProfileForUser(currentUser);
  if (!existing) return;
  const updated = upsertRecord("settingsUser", {
    ...existing,
    passwordChangeRequired: false,
    passwordChangedAt: new Date().toISOString(),
    passwordChangedBy: currentUser.email,
  });
  await sendPayload(updated);
  renderSettingsUsers();
}

async function completeForcedPasswordChange(event) {
  event.preventDefault();
  const formEl = event.currentTarget;
  if (!validateForm(formEl, [passwordMatchCheck(formEl, "newPassword", "confirmNewPassword")])) return;
  if (!currentUser?.email || !supabaseClient) return;
  const data = formPayload(formEl);
  const button = formEl.querySelector('button[type="submit"]');
  setSubmitState(button, true, "Changing...");
  const { error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: currentUser.email,
    password: data.currentPassword,
  });
  if (signInError) {
    setSubmitState(button, false);
    setFieldError(formEl.elements.currentPassword, signInError.message || "Current password is incorrect.");
    showToast("Current password is incorrect.");
    return;
  }
  const { error: updateError } = await supabaseClient.auth.updateUser({ password: data.newPassword });
  if (updateError) {
    setSubmitState(button, false);
    setFieldError(formEl.elements.newPassword, updateError.message || "Password could not be changed.");
    showToast("Password could not be changed.");
    return;
  }
  await clearPasswordChangeRequirement();
  setSubmitState(button, false);
  formEl.reset();
  $("#passwordChangeDialog").close();
  showToast("Password changed.");
}

async function restoreSupabaseSession() {
  if (!supabaseClient) return false;
  const { data } = await supabaseClient.auth.getSession();
  const user = await syncAuthenticatedSupabaseUser(data.session?.user, { switchAfterLogin: false });
  if (!user) return false;
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
  const storedRecords = writeRecords(type, records);
  return storedRecords.find((item) => item.id === record.id) || record;
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

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename, rows = []) {
  if (!rows.length) {
    showToast("No records available to export.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function selectedPhotoFor(kind, input) {
  return input?.files?.[0] || selectedDogPhotos[kind]?.file || null;
}

function isSupportedDogPhoto(file) {
  if (!file) return true;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return ["image/jpeg", "image/png"].includes(type) || /\.(jpe?g|png)$/.test(name);
}

function fileMatchesTypes(file, allowedTypes = [], allowedExtensions = []) {
  if (!file || (!allowedTypes.length && !allowedExtensions.length)) return true;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return allowedTypes.some((allowed) => {
    const clean = allowed.toLowerCase();
    return clean.endsWith("/*") ? type.startsWith(clean.slice(0, -1)) : type === clean;
  }) || allowedExtensions.some((extension) => name.endsWith(extension.toLowerCase()));
}

function dogPhotoElements(kind) {
  const map = {
    owned: {
      input: "#ownedDogPhotoInput",
      img: "#ownedDogPhotoPreview",
      caption: "#ownedDogPhotoName",
      initials: "#ownedDogPhotoInitials",
      form: "#ourDogForm",
      nameKey: "callName",
      fallback: "New dog",
    },
    boarding: {
      input: "#boardingDogPhotoInput",
      img: "#boardingDogPhotoPreview",
      caption: "#boardingDogPhotoName",
      initials: "#boardingDogPhotoInitials",
      form: "#boardingDogForm",
      nameKey: "dogName",
      fallback: "New boarding dog",
    },
    customer: {
      input: "#customerDogPhotoInput",
      img: "#customerDogPhotoPreview",
      caption: "#customerDogPhotoName",
      initials: "#customerDogPhotoInitials",
      form: "#customerDogForm",
      nameKey: "dogName",
      fallback: "New dog",
    },
  };
  return map[kind];
}

function resetSelectedDogPhoto(kind, record = {}) {
  const elements = dogPhotoElements(kind);
  if (!elements) return;
  const input = $(elements.input);
  if (input) input.value = "";
  selectedDogPhotos[kind] = null;
  setDogPhoto(kind, record);
}

async function uploadFileToSupabase(file, folder) {
  if (!supabaseClient || !file) return { url: "", error: "No Supabase connection or file selected." };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}-${safeName}`;
  const { data, error } = await supabaseClient.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });
  if (error) return { url: "", error: error.message };
  const { data: urlData } = supabaseClient.storage.from(MEDIA_BUCKET).getPublicUrl(data.path);
  return { url: urlData?.publicUrl || "", error: "" };
}

async function uploadDogPhotoToSupabase(file, dogId) {
  if (!file) return { url: "", error: "" };
  if (!isSupportedDogPhoto(file)) return { url: "", error: "Only JPG and PNG profile photos can be uploaded." };
  if ((file.size || 0) > MAX_MEDIA_UPLOAD_BYTES) return { url: "", error: `Profile photos must be ${MAX_MEDIA_UPLOAD_MB} MB or smaller.` };
  if (!supabaseClient) return { url: "", error: "The database connection is not available for photo upload." };
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  const { url, error } = await uploadFileToSupabase(file, `dog-photos/${safeDogId}`);
  return { url, error };
}

async function durableDogPhoto(kind, existing, formData, photoInput, dogId) {
  const file = selectedPhotoFor(kind, photoInput);
  if (file) {
    const { url, error } = await uploadDogPhotoToSupabase(file, dogId);
    if (url) return { profilePhotoUrl: url, profilePhotoData: "", photoError: "" };
    resetSelectedDogPhoto(kind, {});
    return { profilePhotoUrl: "", profilePhotoData: "", photoError: error || "The profile photo could not be uploaded." };
  }
  if (formData.profilePhotoUrl) {
    return { profilePhotoUrl: formData.profilePhotoUrl, profilePhotoData: "", photoError: "" };
  }
  if (existing.profilePhotoUrl) {
    return { profilePhotoUrl: existing.profilePhotoUrl, profilePhotoData: "", photoError: "" };
  }
  return { profilePhotoUrl: "", profilePhotoData: "", photoError: "" };
}

async function uploadMediaFiles(input, folder, options = {}) {
  const allowedTypes = options.allowedTypes || [];
  const allowedExtensions = options.allowedExtensions || [];
  const label = options.label || "file";
  const files = [...(input?.files || [])];
  if (!files.length) return [];
  const acceptedFiles = files.filter((file) => fileMatchesTypes(file, allowedTypes, allowedExtensions));
  const rejectedCount = files.length - acceptedFiles.length;
  if (rejectedCount) {
    showToast(`${rejectedCount} ${label}${rejectedCount > 1 ? "s were" : " was"} skipped because the file type is not supported.`);
  }
  if (!acceptedFiles.length) return [];
  const now = new Date().toISOString();
  const oversized = acceptedFiles.filter((file) => (file.size || 0) > MAX_MEDIA_UPLOAD_BYTES);
  if (oversized.length) {
    showToast(`Files over ${MAX_MEDIA_UPLOAD_MB} MB cannot be uploaded.`);
  }
  if (!supabaseClient) {
    showToast("Sign in to upload files to the database.");
    return acceptedFiles.map((file) => ({
      id: uid("media"),
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size || 0,
      savedAt: now,
      url: "",
      dataUrl: "",
      note: "Not uploaded. Supabase is not connected.",
    }));
  }
  showToast(`Uploading ${acceptedFiles.length} file${acceptedFiles.length > 1 ? "s" : ""}...`);
  const results = await Promise.all(
    acceptedFiles.map(async (file) => {
      if ((file.size || 0) > MAX_MEDIA_UPLOAD_BYTES) {
        return {
          id: uid("media"),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size || 0,
          savedAt: now,
          url: "",
          dataUrl: "",
          note: `Not uploaded. Maximum file size is ${MAX_MEDIA_UPLOAD_MB} MB.`,
        };
      }
      const { url, error } = await uploadFileToSupabase(file, folder);
      return {
        id: uid("media"),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        savedAt: now,
        url,
        dataUrl: "",
        note: error ? `Upload failed: ${error}` : "",
      };
    }),
  );
  if (results.some((item) => item.note)) showToast("One or more files could not be uploaded.");
  return results;
}

async function uploadVaccinationFiles(input, dogId) {
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  return uploadMediaFiles(input, `vaccination-records/${safeDogId}`, {
    allowedTypes: VACCINATION_UPLOAD_TYPES,
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
    label: "vaccination record",
  });
}

async function uploadOwnedDogDocumentFiles(input, dogId) {
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  return uploadMediaFiles(input, `owned-dog-documents/${safeDogId}`, {
    allowedTypes: DOG_DOCUMENT_UPLOAD_TYPES,
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"],
    label: "dog document",
  });
}

function setDogPhoto(kind, record) {
  const elements = dogPhotoElements(kind);
  if (!elements) return;
  const img = $(elements.img);
  const caption = $(elements.caption);
  const initials = $(elements.initials);
  const name = record[elements.nameKey] || record.showName || "";
  const photo = record.profilePhotoUrl || record.profilePhotoData;
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
  caption.textContent = name || elements.fallback;
  if (kind === "boarding") {
    const owner = record.ownerName || record.ownerEmail || record.customerEmail || "Owner not assigned";
    const status = record.id ? ` | ${normalizeBoardingStatus(record)}` : "";
    const location = record.id && normalizeBoardingStatus(record) === "In Kennel" ? ` | ${boardingKennelLocationLabel(record)}` : "";
    const ownerText = $("#boardingDogHeaderOwner");
    if (ownerText) ownerText.textContent = `${owner}${status}${location}`;
  }
}

async function previewSelectedDogPhoto(kind) {
  const elements = dogPhotoElements(kind);
  if (!elements) return;
  const input = $(elements.input);
  const img = $(elements.img);
  const initials = $(elements.initials);
  const file = input.files?.[0];
  if (!file) return;
  if (!isSupportedDogPhoto(file)) {
    resetSelectedDogPhoto(kind, {});
    showDetailDialog("Photo Not Uploaded", "<p>Please choose a JPG or PNG file for the dog profile photo.</p>");
    return;
  }
  selectedDogPhotos[kind] = { file, previewDataUrl: "" };
  const objectUrl = URL.createObjectURL(file);
  img.onload = () => URL.revokeObjectURL(objectUrl);
  img.src = objectUrl;
  img.hidden = false;
  initials.hidden = true;
  const formEl = $(elements.form);
  if (formEl?.elements?.profilePhotoUrl) clearFieldError(formEl.elements.profilePhotoUrl);
}

function dogPhotoRecord(kind) {
  if (kind === "owned") return activeOwnedDog();
  if (kind === "boarding") return activeBoardingDog();
  if (kind === "customer") {
    const id = $("#customerDogId")?.value || "";
    return readRecords("customerDog").find((record) => record.id === id) || {};
  }
  return {};
}

function handleDogPhotoClick(kind) {
  const elements = dogPhotoElements(kind);
  if (!elements) return;
  const formEl = $(elements.form);
  const input = $(elements.input);
  const record = dogPhotoRecord(kind) || {};
  const photo = record.profilePhotoUrl || record.profilePhotoData || selectedDogPhotos[kind]?.previewDataUrl || $(elements.img)?.src || "";
  const locked = formEl?.classList.contains("is-readonly");
  if (locked && photo) {
    showMediaDialog(photo, "image/jpeg", `${record[elements.nameKey] || record.showName || "Dog"} profile photo`);
    return;
  }
  input?.click();
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
  localTestMode = currentUser.authProvider === "local-test" || String(currentUser.key || "").startsWith("local-test-");
  if (localTestMode) supabaseClient = null;
  localStorage.setItem(stateKeys.session, JSON.stringify(currentUser));
  setDefaultDateAndDay();
  helperName.value = user.name || "";
  helperEmail.value = user.email || "";
  helperKey.value = user.key || "";
  updateHeaderUser();
  loginStatus.textContent = currentUser.name ? `${roleLabel(currentUser.role)} logged in: ${currentUser.name}` : "Logged in";
  loginHelp.textContent = `${currentUser.email || "Account"} | Access: ${roleLabel(currentUser.role)}`;
  $("#clearHelperButton").hidden = false;
  updateNavigationAccess();
  renderDailyTaskLists();
  fillCustomerDefaults();
  renderAllRecords();
  if (options.switchAfterLogin !== false) switchPage(rememberedPageForRole(currentUser.role));
}

async function clearHelper() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  localTestMode = false;
  currentUser = null;
  localStorage.removeItem(stateKeys.session);
  localStorage.removeItem(stateKeys.lastPage);
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  updateHeaderUser();
  loginStatus.textContent = "Not logged in";
  loginHelp.textContent = "Sign in with email and password, Google, or another enabled account provider.";
  $("#clearHelperButton").hidden = true;
  updateNavigationAccess();
  renderDailyTaskLists();
  fillCustomerDefaults();
  switchPage("loginPage");
}

function updateHeaderUser() {
  headerUserName.textContent = currentUser?.name || "Not signed in";
  modeLabel.textContent = currentUser ? (localTestMode ? "Local test mode" : `${roleLabel(currentUser.role)} account`) : "Sign in to continue";
  headerLogoutButton.hidden = !currentUser;
  document.body.classList.toggle("role-helper", currentRole() === "helper");
  document.body.classList.toggle("role-admin", currentRole() === "admin");
  document.body.classList.toggle("role-customer", currentRole() === "customer");
  renderNotifications();
}

function helperIsLoggedIn() {
  return Boolean(currentUser?.key);
}

function currentRole() {
  return currentUser?.role || "";
}

function staffIdentity() {
  return {
    name: currentUser?.name || helperName?.value || "Unknown staff",
    email: currentUser?.email || helperEmail?.value || "",
  };
}

function normalizePageId(pageId = "") {
  return pageId === "settingsPage" ? "settingsUsersPage" : pageId;
}

function navigationButtonForPage(pageId) {
  return $(`.side-nav .nav-button[data-page="${normalizePageId(pageId)}"]`);
}

function pageAllowed(pageId) {
  pageId = normalizePageId(pageId);
  if (pageId === "loginPage") return true;
  const page = document.getElementById(pageId);
  if (!page?.classList.contains("page-view")) return false;
  const button = navigationButtonForPage(pageId);
  const roles = (button?.dataset.roles || "helper,admin").split(",");
  return helperIsLoggedIn() && roles.includes(currentRole());
}

function pageIdFromHash() {
  const raw = normalizePageId(decodeURIComponent(window.location.hash || "").replace(/^#/, "").trim());
  if (!raw) return "";
  const page = document.getElementById(raw);
  return page?.classList.contains("page-view") ? raw : "";
}

function defaultPageForRole(role = currentRole()) {
  if (role === "customer") return "customerPage";
  if (role === "helper" || role === "admin") return "dashboardPage";
  return "loginPage";
}

function rememberedPageForRole(role = currentRole()) {
  const fallback = defaultPageForRole(role);
  return [pageIdFromHash(), localStorage.getItem(stateKeys.lastPage), fallback].find((pageId) => pageId && pageAllowed(pageId)) || fallback;
}

function activePageId() {
  return $(".page-view.is-active")?.id || "loginPage";
}

function navigationPageEntries() {
  return $$(".side-nav .nav-button[data-page]:not([data-settings-root])").map((button) => ({
    label: button.textContent.trim(),
    pageId: button.dataset.page,
  }));
}

function mobileMoreEntries() {
  if (!helperIsLoggedIn()) return [];
  return navigationPageEntries().filter((entry) => entry.pageId && entry.pageId !== "loginPage" && !mobilePrimaryPageSet.has(entry.pageId) && pageAllowed(entry.pageId));
}

function renderMobileMoreMenu() {
  const list = $("#mobileMoreMenuList");
  if (!list) return;
  const currentPage = activePageId();
  const entries = mobileMoreEntries();
  list.innerHTML = entries.length
    ? entries
        .map(
          (entry) => {
            const active = entry.pageId === currentPage;
            return `<button type="button" class="mobile-more-menu-item ${active ? "is-active" : ""}" data-page="${escapeHtml(entry.pageId)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(entry.label)}</button>`;
          },
        )
        .join("")
    : `<p class="mobile-more-empty">No additional pages are available for this login.</p>`;
}

function setMobileMoreOpen(open) {
  const sheet = $("#mobileMoreSheet");
  const backdrop = $("#mobileMoreBackdrop");
  const button = $("#mobileMoreButton");
  if (!sheet || !backdrop || !button) return;
  const shouldOpen = Boolean(open && mobileMoreEntries().length);
  if (shouldOpen) renderMobileMoreMenu();
  sheet.hidden = !shouldOpen;
  backdrop.hidden = !shouldOpen;
  button.setAttribute("aria-expanded", String(shouldOpen));
  document.body.classList.toggle("mobile-more-open", shouldOpen);
}

function syncMobileNavigationActive(pageId = activePageId()) {
  $$(".mobile-bottom-nav-button[data-page]").forEach((button) => {
    const active = button.dataset.page === pageId;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("#mobileMoreButton")?.classList.toggle("is-active", helperIsLoggedIn() && !mobilePrimaryPageSet.has(pageId) && pageId !== "loginPage");
  renderMobileMoreMenu();
}

function updateMobileNavigationAccess() {
  const nav = $("#mobileBottomNav");
  if (!nav) return;
  const signedIn = helperIsLoggedIn();
  nav.hidden = !signedIn;
  $$(".mobile-bottom-nav-button[data-page]").forEach((button) => {
    const allowed = pageAllowed(button.dataset.page);
    button.disabled = !allowed;
    button.hidden = !signedIn || !allowed;
  });
  const moreButton = $("#mobileMoreButton");
  if (moreButton) {
    const hasMorePages = mobileMoreEntries().length > 0;
    moreButton.disabled = !signedIn || !hasMorePages;
    moreButton.hidden = !signedIn || !hasMorePages;
  }
  if (!signedIn) setMobileMoreOpen(false);
  syncMobileNavigationActive();
}

function updateNavigationAccess() {
  $$(".nav-button").forEach((button) => {
    const isLogin = button.dataset.page === "loginPage";
    const locked = !pageAllowed(button.dataset.page);
    button.disabled = locked;
    button.classList.toggle("is-locked", locked);
    const hidden = (isLogin && helperIsLoggedIn()) || (locked && !(isLogin && !helperIsLoggedIn()));
    button.classList.toggle("is-hidden-nav", hidden);
  });
  [...$("#mobilePageSelect").options].forEach((option) => {
    const isLogin = option.value === "loginPage";
    option.disabled = !pageAllowed(option.value);
    option.hidden = (isLogin && helperIsLoggedIn()) || (option.disabled && !(isLogin && !helperIsLoggedIn()));
  });
  updateMobileNavigationAccess();
}

function restoreSession() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.session) || "null");
  if (!saved?.key) return;
  currentUser = saved;
  helperName.value = saved.name || "";
  helperEmail.value = saved.email || "";
  helperKey.value = saved.key || "";
  updateHeaderUser();
  loginStatus.textContent = `${roleLabel(saved.role)} logged in: ${saved.name}`;
  loginHelp.textContent = `${saved.email || "Account"} | Access: ${roleLabel(saved.role)}`;
  $("#clearHelperButton").hidden = false;
}

function roleLabel(role = "") {
  if (role === "admin") return "Admin";
  if (role === "helper") return "Staff";
  return "Customer";
}

function getDeepCleanBuilding(date = new Date()) {
  const cleanDate = date instanceof Date ? date : new Date(`${dateOnly(date) || todayDate()}T12:00:00`);
  const monthDelta = (cleanDate.getFullYear() - 2026) * 12 + cleanDate.getMonth() - 4;
  return Math.abs(monthDelta) % 2 === 0 ? "Dog Mansion" : "Dog Shed";
}

function monthlyDeepCleanBuildingForRecord(record = {}) {
  if (record.monthlyDeepCleanBuilding) return record.monthlyDeepCleanBuilding;
  if (record.deepCleanBuilding && record.deepCleanBuilding !== "Not applicable") return record.deepCleanBuilding;
  return getDeepCleanBuilding(record.date || record.submittedAt || todayDate());
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
  const date = currentDailyDate();
  const completed = dailyTaskCompletionIndex(date).size;
  const total = totalConfiguredTaskCount();
  const remaining = Math.max(total - completed, 0);
  const summary = $("#dailyTaskProgress");
  if (summary) summary.textContent = `${completed} completed | ${remaining} still open`;
}

function syncMobileReviewSections() {
  const details = $("#boardingRequestsDetails");
  if (!details) return;
  if (window.matchMedia("(max-width: 760px)").matches) details.removeAttribute("open");
  else details.setAttribute("open", "");
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
  return [...defaultTaskTabMeta.filter((tab) => !removedTabs.has(tab.id)), ...(config._tabs || [])];
}

function taskTabLabel(shift = "") {
  return taskTabMeta().find((tab) => tab.id === shift)?.label || taskShiftLabels[shift] || shift;
}

function taskKey(shift, taskId) {
  return `${shift}:${taskId}`;
}

function currentDailyDate() {
  return form?.elements.date?.value || todayDate();
}

function dailyTaskRecordId(date = currentDailyDate()) {
  return `dailyTask-${date}`;
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

function allConfiguredTasks() {
  const config = readTaskConfig();
  return taskTabMeta(config).flatMap((tab) => (config[tab.id] || []).map((task) => ({ ...task, shift: tab.id })));
}

function totalConfiguredTaskCount() {
  return allConfiguredTasks().length;
}

function completionFromLegacyTask(record, shift, taskText) {
  const task = (readTaskConfig()[shift] || []).find((item) => item.text === taskText);
  return {
    id: uid("legacy-complete"),
    taskId: task?.id || "",
    shift,
    taskText,
    completedBy: record.helperName || "Staff",
    completedEmail: record.helperEmail || "",
    completedAt: record.updatedAt || record.submittedAt || "",
    date: dailySubmissionDate(record),
    legacy: true,
  };
}

function completedTasksForRecord(record = {}) {
  if (Array.isArray(record.completedTasks) && record.completedTasks.length) return record.completedTasks;
  return [
    ...(record.dailyTasks || []).map((taskText) => completionFromLegacyTask(record, "morning", taskText)),
    ...(record.pmTasks || []).map((taskText) => completionFromLegacyTask(record, "pm", taskText)),
    ...(record.weeklyTasks || []).map((taskText) => completionFromLegacyTask(record, "weekly", taskText)),
    ...(record.tuesdayTasks || []).map((taskText) => completionFromLegacyTask(record, "tuesday", taskText)),
    ...(record.monthlyTasks || []).map((taskText) => completionFromLegacyTask(record, "monthly", taskText)),
  ];
}

function completedTasksForDate(date = currentDailyDate()) {
  const byKey = new Map();
  dailyTaskRecordsForDate(date).forEach((record) => {
    completedTasksForRecord(record).forEach((completion) => {
      const key = completion.taskId ? taskKey(completion.shift, completion.taskId) : `${completion.shift}:text:${completion.taskText}`;
      if (!byKey.has(key)) byKey.set(key, completion);
    });
  });
  return [...byKey.values()].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
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

function structuredCareLogsForDate(date = currentDailyDate()) {
  const byId = new Map();
  dailyTaskRecordsForDate(date).forEach((record) => {
    (record.structuredCareLogs || record.careLogs || []).forEach((log) => {
      byId.set(log.id || `${log.dogId}-${log.careType}-${log.date}-${log.note}`, log);
    });
  });
  return [...byId.values()].sort((a, b) => new Date(b.loggedAt || b.createdAt || 0) - new Date(a.loggedAt || a.createdAt || 0));
}

function dailyWorkPayload(date = currentDailyDate(), updates = {}) {
  const existing = dailyTaskRecordForDate(date) || {};
  const now = new Date().toISOString();
  const completedTasks = updates.completedTasks || completedTasksForDate(date);
  const structuredCareLogs = updates.structuredCareLogs || structuredCareLogsForDate(date);
  const taskArrays = taskArraysFromCompletions(completedTasks);
  const dayName = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
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
    boardingTasks: upcomingBoardingTaskText(),
  };
}

async function saveDailyWorkPayload(payload) {
  const record = upsertRecord("dailyTask", payload);
  await sendPayload(record);
  await syncOwnedDogCareFromDailyReport(record);
  renderDailyTaskLists(record);
  renderDemoSubmissions();
  renderDashboard();
  return record;
}

function taskLabel(task, shift) {
  const canManageTasks = currentRole() === "admin";
  const taskText = escapeHtml(task.text);
  const completed = dailyTaskCompletionIndex(currentDailyDate()).get(taskKey(shift, task.id));
  if (completed && showRemainingTasksOnly) return "";
  const adminTools =
    canManageTasks
      ? `<span class="task-admin-tools"><span class="task-drag-handle" aria-hidden="true">Drag</span><button type="button" class="remove-task-button" data-action="remove-task" data-shift="${shift}" data-id="${task.id}" title="Remove task">&times;</button></span>`
      : "";
  const completedMeta = completed ? `<span class="task-completed-meta">Completed by ${escapeHtml(completed.completedBy || "staff")} at ${escapeHtml(formatDateTime(completed.completedAt))}</span>` : "";
  return `<div class="task-item ${completed ? "is-complete" : ""}" draggable="${canManageTasks && !completed}" data-shift="${shift}" data-id="${task.id}"><span class="task-text">${taskText}</span>${completedMeta}<button type="button" class="task-done-button" data-action="complete-task" data-shift="${shift}" data-id="${task.id}" data-task-text="${taskText}" ${completed ? "disabled" : ""}>${completed ? "Done" : "Done"}</button>${adminTools}</div>`;
}

function ownedDogOptionsHtml(selectedId = "") {
  const dogs = readRecords("ownedDog")
    .filter((dog) => !dog.removed && (dog.callName || dog.showName))
    .sort((a, b) => String(ownedDogDisplayName(a)).localeCompare(String(ownedDogDisplayName(b))));
  return [
    `<option value="">Select Our Dog</option>`,
    ...dogs.map((dog) => `<option value="${escapeHtml(dog.id)}" ${String(selectedId) === String(dog.id) ? "selected" : ""}>${escapeHtml(ownedDogDisplayName(dog))}</option>`),
  ].join("");
}

function renderCareDogOptions(selectedId = $("#careQuickDogId")?.value || "") {
  const select = $("#careQuickDogId");
  if (!select) return;
  select.innerHTML = ownedDogOptionsHtml(selectedId);
  updateCareQuickFields();
}

function resetCareQuickLogForm() {
  if (!$("#careQuickDogId")) return;
  $("#careQuickDogId").value = "";
  $("#careQuickType").value = "";
  $("#careQuickMinutes").value = "";
  $("#careQuickNote").value = "";
  $("#careQuickDate").value = form?.elements.date?.value || todayDate();
  updateCareQuickFields();
}

function renderStructuredCareLogs() {
  const list = $("#structuredCareLogList");
  if (!list) return;
  list.innerHTML = pendingStructuredCareLogs.length
    ? pendingStructuredCareLogs
        .map((log) => {
          const details = [log.date, log.minutes ? `${log.minutes} minutes` : "", log.note].filter(Boolean).join(" | ");
          const canModify = canModifyCareLog(log);
          const actions = canModify ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-care-log" data-id="${escapeHtml(log.id)}">Edit</button><button type="button" class="secondary-button danger-button" data-action="remove-care-log" data-id="${escapeHtml(log.id)}">Remove</button></div>` : "";
          return `<article class="record-card compact-record-card"><strong>${escapeHtml(log.dogName || "Dog")} - ${escapeHtml(log.careType || "Care")}</strong><p>${escapeHtml(details || "No extra details")}</p><span>${escapeHtml(log.completedBy || "")}</span>${actions}</article>`;
        })
        .join("")
    : "<p>No structured care logs added to this daily report yet.</p>";
}

function canModifyCareLog(log = {}) {
  if (currentRole() === "admin") return true;
  const currentEmail = String(currentUser?.email || helperEmail.value || "").toLowerCase();
  return currentEmail && String(log.completedEmail || "").toLowerCase() === currentEmail;
}

function careLogEditFormHtml(log = {}) {
  return `<form id="careLogEditForm" class="tracker-form" data-id="${escapeHtml(log.id || "")}">
    <div class="field-grid">
      <label>Date<input type="date" name="date" value="${escapeHtml(log.date || todayDate())}" required /></label>
      <label>Minutes<input type="number" name="minutes" min="0" value="${escapeHtml(log.minutes || "")}" /></label>
    </div>
    <label>Care note<textarea name="note" rows="4">${escapeHtml(log.note || "")}</textarea></label>
    <div class="button-row"><button type="submit">Update</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
}

function selectedCareDog() {
  const dogId = $("#careQuickDogId")?.value || "";
  return readRecords("ownedDog").find((record) => record.id === dogId && !record.removed) || null;
}

function careTypeIsExercise(careType = "") {
  return ["Treadmill", "Scooter", "Yard Run"].includes(careType);
}

function lastExerciseMinutesForDog(dog, careType) {
  const logs = normalizeOwnedDogCare(dog).exerciseLogs || [];
  const match = logs.find((log) => log.type === careType && Number(log.minutes || 0) > 0);
  return match ? String(match.minutes) : "10";
}

function latestExerciseLogForDog(dog, careType) {
  const logs = normalizeOwnedDogCare(dog).exerciseLogs || [];
  return logs.find((log) => log.type === careType) || null;
}

function setCareFieldVisibility(labelSelector, visible) {
  const label = $(labelSelector);
  if (label) label.hidden = !visible;
}

function setAutoCareNote(defaultNote) {
  const noteField = $("#careQuickNote");
  if (!noteField) return;
  if (autoCareNotes.has(noteField.value)) noteField.value = defaultNote;
}

function updateCareQuickFields() {
  const dog = selectedCareDog();
  const careType = $("#careQuickType")?.value || "";
  const female = dog?.sex === "Female";
  const heatOption = [...($("#careQuickType")?.options || [])].find((option) => option.value === "Heat Note");
  if (heatOption) {
    heatOption.hidden = Boolean(dog && !female);
    heatOption.disabled = Boolean(dog && !female);
  }
  if ($("#careQuickDate") && !$("#careQuickDate").value) $("#careQuickDate").value = form?.elements.date?.value || todayDate();
  const isExercise = careTypeIsExercise(careType);
  const isBath = careType === "Bath";
  const isHeat = careType === "Heat Note";
  const isMedical = careType === "Medical/Behavior Note";
  const isTraining = careType === "Training";
  setCareFieldVisibility("#careQuickMinutesLabel", isExercise);
  setCareFieldVisibility("#careQuickDateLabel", isBath || isHeat || isMedical || isTraining || !careType);
  setCareFieldVisibility("#careQuickNoteLabel", isBath || isHeat || isMedical || isTraining || !careType);
  if (isExercise && dog) $("#careQuickMinutes").value = lastExerciseMinutesForDog(dog, careType);
  if (!isExercise) $("#careQuickMinutes").value = "";
  if (isBath) setAutoCareNote(bathCareDefaultNote);
  if (isHeat) setAutoCareNote(heatCareDefaultNote);
  if (isMedical) setAutoCareNote(medicalCareDefaultNote);
  if (isMedical) $("#careQuickNote").placeholder = medicalCarePlaceholder;
  else if (isHeat) $("#careQuickNote").placeholder = heatCareDefaultNote;
  else if (isTraining) $("#careQuickNote").placeholder = "Training focus, behavior, or progress";
  else if (isBath) $("#careQuickNote").placeholder = bathCareDefaultNote;
  else $("#careQuickNote").placeholder = "Session details, bath products, heat observation, medical/care note";
  const submitLabels = {
    Bath: "Log Bath",
    "Heat Note": "Submit Heat Cycle",
    "Medical/Behavior Note": "Log Medical Note",
    Training: "Log Training",
  };
  $("#addCareQuickLog").textContent = isExercise ? "Log Exercise" : submitLabels[careType] || "Add Care Log";
}

async function addPendingCareLog() {
  const dogId = $("#careQuickDogId")?.value || "";
  const careType = $("#careQuickType")?.value || "";
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog || !careType) {
    showToast("Choose an Our Dog and care type before adding the care log.");
    return;
  }
  if (careType === "Heat Note" && dog.sex !== "Female") {
    showDetailDialog("Invalid Heat Entry", `<p>Heat notes can only be logged for female dogs. ${escapeHtml(ownedDogDisplayName(dog))} is saved as ${escapeHtml(dog.sex || "not female")}.</p>`);
    return;
  }
  if (careTypeIsExercise(careType) && Number($("#careQuickMinutes")?.value || 0) <= 0) {
    showToast("Enter exercise minutes before logging.");
    return;
  }
  if (["Bath", "Heat Note", "Medical/Behavior Note", "Training"].includes(careType) && !($("#careQuickDate")?.value || "")) {
    $("#careQuickDate").value = form?.elements.date?.value || todayDate();
  }
  const log = buildStructuredCareLog(dog, {
    careType,
    minutes: $("#careQuickMinutes")?.value || "",
    note: $("#careQuickNote")?.value || "",
    date: $("#careQuickDate")?.value || form?.elements.date?.value || todayDate(),
  });
  const record = await saveStructuredCareLog(log);
  resetCareQuickLogForm();
  showDetailDialog(
    `${careType} Logged`,
    `<div class="detail-row"><strong>Dog</strong><span>${escapeHtml(log.dogName)}</span></div><div class="detail-row"><strong>Date</strong><span>${escapeHtml(log.date)}</span></div>${log.minutes ? `<div class="detail-row"><strong>Minutes</strong><span>${escapeHtml(log.minutes)}</span></div>` : ""}${log.note ? `<div class="detail-row"><strong>Note</strong><span>${escapeHtml(log.note)}</span></div>` : ""}<div class="detail-row"><strong>Saved by</strong><span>${escapeHtml(log.completedBy || "Staff")}</span></div>`,
  );
  return record;
}

function buildStructuredCareLog(dog, { careType, minutes = "", note = "", date = todayDate() } = {}) {
  return {
    id: uid("care"),
    dogId: dog.id,
    dogName: ownedDogDisplayName(dog),
    careType,
    minutes,
    note,
    completedBy: helperName.value || currentUser?.name || "",
    completedEmail: helperEmail.value || currentUser?.email || "",
    date: date || todayDate(),
    loggedAt: new Date().toISOString(),
  };
}

async function saveStructuredCareLog(log) {
  const date = log.date || todayDate();
  const structuredCareLogs = [log, ...structuredCareLogsForDate(date)];
  return saveDailyWorkPayload(dailyWorkPayload(date, { structuredCareLogs }));
}

async function completeDailyTask(button) {
  if (!helperIsLoggedIn()) {
    showToast("Sign in first.");
    return;
  }
  const date = currentDailyDate();
  const shift = button.dataset.shift || "morning";
  const taskId = button.dataset.id || "";
  const taskText = button.dataset.taskText || "";
  const completionIndex = dailyTaskCompletionIndex(date);
  if (completionIndex.has(taskKey(shift, taskId))) {
    const completed = completionIndex.get(taskKey(shift, taskId));
    showToast(`Already completed by ${completed.completedBy || "another staff member"}.`);
    renderDailyTaskLists();
    return;
  }
  const completion = {
    id: uid("task-done"),
    taskId,
    shift,
    taskText,
    shiftLabel: taskTabLabel(shift),
    completedBy: helperName.value || currentUser?.name || "Staff",
    completedEmail: helperEmail.value || currentUser?.email || "",
    completedAt: new Date().toISOString(),
    date,
  };
  const completedTasks = [completion, ...completedTasksForDate(date)];
  await saveDailyWorkPayload(dailyWorkPayload(date, { completedTasks }));
  showToast(`${taskText} marked done.`);
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
  const tabButtons = taskTabMeta(config)
    .map((tab) => `<button type="button" data-task-tab="${escapeHtml(tab.id)}" role="tab" aria-selected="false">${escapeHtml(tab.label)}</button>`)
    .join("");
  const addButton = currentRole() === "admin" ? `<button type="button" class="secondary-button task-add-tab-button" data-action="add-task-tab">Add Tab</button>` : "";
  tabs.innerHTML = `${tabButtons}${addButton}`;
}

function taskTabDeleteRowHtml(tab = {}) {
  if (currentRole() !== "admin" || !tab.id) return "";
  return `<div class="button-row task-tab-delete-row" data-task-tab-delete-row><button type="button" class="secondary-button danger-button task-delete-tab-button" data-action="remove-task-tab" data-task-tab-id="${escapeHtml(tab.id)}">Delete Tab</button></div>`;
}

function syncStaticTaskTabDeleteRows(config = readTaskConfig()) {
  const activeTabs = new Map(taskTabMeta(config).map((tab) => [tab.id, tab]));
  defaultTaskTabMeta.forEach((tab) => {
    const panelBody = document.querySelector(`[data-task-panel="${tab.id}"] .section-body`);
    if (!panelBody) return;
    panelBody.querySelectorAll("[data-task-tab-delete-row]").forEach((row) => row.remove());
    if (activeTabs.has(tab.id)) panelBody.insertAdjacentHTML("beforeend", taskTabDeleteRowHtml(activeTabs.get(tab.id)));
  });
}

function customTaskPanelHtml(tab = {}, tasks = []) {
  return `<section class="form-section collapsible-section" data-task-panel="${escapeHtml(tab.id)}" data-custom-task-panel data-collapsible-section hidden>
    <div class="section-heading">
      <span>${escapeHtml((tab.label || "C").slice(0, 1).toUpperCase())}</span>
      <div>
        <h2>${escapeHtml(tab.label)} Tasks</h2>
        <p>Custom task list for this workflow.</p>
      </div>
      <button type="button" class="secondary-button section-toggle-button" data-action="toggle-section">Minimize</button>
    </div>
    <div class="section-body">
      <div class="checklist managed-task-list" data-custom-task-list data-shift="${escapeHtml(tab.id)}">${tasks.map((task) => taskLabel(task, tab.id)).join("")}</div>
      <div class="admin-task-controls" ${currentRole() === "admin" ? "" : "hidden"}>
        <input type="text" data-custom-task-input="${escapeHtml(tab.id)}" placeholder="Add a task to ${escapeHtml(tab.label)}" />
        <button type="button" data-action="add-custom-tab-task" data-shift="${escapeHtml(tab.id)}">Add Task</button>
      </div>
      ${taskTabDeleteRowHtml(tab)}
    </div>
  </section>`;
}

function bindTaskListInteractions(listEl) {
  if (!listEl || listEl.dataset.taskEventsBound === "true") return;
  listEl.dataset.taskEventsBound = "true";
  listEl.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    if (control.dataset.action === "edit-task") return;
    event.preventDefault();
    if (control.dataset.action === "complete-task") completeDailyTask(control);
    if (control.dataset.action === "remove-task") removeTask(control.dataset.shift, control.dataset.id);
  });
  listEl.addEventListener("change", (event) => {
    const input = event.target.closest('[data-action="edit-task"]');
    if (!input) return;
    editTask(input.dataset.shift, input.dataset.id, input.value, input);
  });
  listEl.addEventListener("dragstart", (event) => {
    const row = event.target.closest(".task-item[draggable='true']");
    if (!row) return;
    row.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${row.dataset.shift}:${row.dataset.id}`);
  });
  listEl.addEventListener("dragover", (event) => {
    const row = event.target.closest(".task-item[draggable='true']");
    if (!row) return;
    event.preventDefault();
    row.classList.add("is-drag-over");
  });
  listEl.addEventListener("dragleave", (event) => {
    const row = event.target.closest(".task-item");
    if (row) row.classList.remove("is-drag-over");
  });
  listEl.addEventListener("drop", (event) => {
    const target = event.target.closest(".task-item[draggable='true']");
    if (!target) return;
    event.preventDefault();
    const [sourceShift, sourceId] = event.dataTransfer.getData("text/plain").split(":");
    target.classList.remove("is-drag-over");
    if (sourceShift === target.dataset.shift) reorderTaskByDrag(sourceShift, sourceId, target.dataset.id);
  });
  listEl.addEventListener("dragend", () => {
    listEl.querySelectorAll(".task-item").forEach((row) => row.classList.remove("is-dragging", "is-drag-over"));
  });
}

function renderCustomTaskPanels(config = readTaskConfig()) {
  const container = $("#customTaskPanels");
  if (!container) return;
  container.innerHTML = (config._tabs || []).map((tab) => customTaskPanelHtml(tab, config[tab.id] || [])).join("");
  container.querySelectorAll("[data-custom-task-list]").forEach(bindTaskListInteractions);
}

function renderDailyTaskLists(selected = {}) {
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
    const list = $(`#${listId}`);
    if (!list) return;
    list.innerHTML = (config[shift] || []).map((task) => taskLabel(task, shift)).join("");
    bindTaskListInteractions(list);
  });
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
}

function taskTabFormHtml() {
  return `<form id="taskTabForm" class="tracker-form">
    <label>Tab name<input type="text" name="label" required placeholder="Example: Puppy room, Deep clean, Sunday" /></label>
    <div class="button-row"><button type="submit">Add Tab</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
}

function openTaskTabPopup() {
  showDetailDialog("Add Task Tab", taskTabFormHtml());
}

function saveTaskTabFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const label = formPayload(formEl).label.trim();
  const config = readTaskConfig();
  const removedDefault = defaultTaskTabMeta.find((tab) => tab.label.toLowerCase() === label.toLowerCase() && (config._removedTabs || []).includes(tab.id));
  if (removedDefault) {
    config._removedTabs = (config._removedTabs || []).filter((tabId) => tabId !== removedDefault.id);
    if (!config[removedDefault.id]) config[removedDefault.id] = [];
    writeTaskConfig(config);
    dailyTaskTab = removedDefault.id;
    renderDailyTaskLists();
    return removedDefault;
  }
  if (taskTabMeta(config).some((tab) => tab.label.toLowerCase() === label.toLowerCase())) {
    showToast("A task tab with that name already exists.");
    return null;
  }
  const tab = { id: normalizeTaskTabId(label), label, system: false };
  config._tabs.push(tab);
  config[tab.id] = [];
  writeTaskConfig(config);
  dailyTaskTab = tab.id;
  renderDailyTaskLists();
  return tab;
}

function taskTabRemoveConfirmHtml(tab = {}) {
  const tasks = readTaskConfig()[tab.id] || [];
  const tabType = tab.system ? "built-in tab" : "custom tab";
  return `<div class="tracker-form">
    <article class="record-card compact-record-card danger-confirm-card">
      <strong>Remove ${escapeHtml(tab.label)}?</strong>
      <p>This removes the ${tabType} and ${tasks.length} saved task${tasks.length === 1 ? "" : "s"} from the daily task template. Completed work history stays in the daily records.</p>
    </article>
    <div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-task-tab" data-task-tab-id="${escapeHtml(tab.id)}">Confirm Remove</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </div>`;
}

function openTaskTabRemoveConfirm(tabId = "") {
  const tab = taskTabMeta(readTaskConfig()).find((item) => item.id === tabId);
  if (tab) showDetailDialog("Confirm Remove Task Tab", taskTabRemoveConfirmHtml(tab));
}

function removeTaskTab(tabId = "") {
  const config = readTaskConfig();
  const tab = taskTabMeta(config).find((item) => item.id === tabId);
  if (!tab) return null;
  if (tab.system) {
    config._removedTabs = [...new Set([...(config._removedTabs || []), tabId])];
    config[tabId] = [];
  } else {
    config._tabs = config._tabs.filter((item) => item.id !== tabId);
    delete config[tabId];
  }
  writeTaskConfig(config);
  if (dailyTaskTab === tabId) dailyTaskTab = taskTabMeta(readTaskConfig())[0]?.id || "";
  renderDailyTaskLists();
  return tab;
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

function reorderTaskByDrag(shift, sourceId, targetId) {
  if (currentRole() !== "admin" || !shift || !sourceId || !targetId || sourceId === targetId) return;
  const config = readTaskConfig();
  const list = config[shift] || [];
  const sourceIndex = list.findIndex((task) => task.id === sourceId);
  const targetIndex = list.findIndex((task) => task.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [sourceTask] = list.splice(sourceIndex, 1);
  const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  list.splice(insertIndex, 0, sourceTask);
  writeTaskConfig(config);
  renderDailyTaskLists();
  showToast("Task order updated.");
}

function editTask(shift, id, text, sourceInput) {
  const trimmed = text.trim();
  if (!trimmed) {
    showToast("Task text cannot be blank.");
    sourceInput.value = readTaskConfig()[shift]?.find((task) => task.id === id)?.text || "";
    return;
  }
  const config = readTaskConfig();
  const task = config[shift]?.find((item) => item.id === id);
  if (!task || task.text === trimmed) return;
  task.text = trimmed;
  writeTaskConfig(config);
  showToast("Task text updated.");
}

function removeTask(shift, id) {
  const config = readTaskConfig();
  config[shift] = (config[shift] || []).filter((task) => task.id !== id);
  writeTaskConfig(config);
  renderDailyTaskLists();
}

function addTaskToShift(shift = "", text = "") {
  const trimmed = text.trim();
  if (!trimmed) {
    showToast("Enter a task before adding it.");
    return null;
  }
  const config = readTaskConfig();
  if (!config[shift]) config[shift] = [];
  config[shift].push({ id: uid("task"), text: trimmed });
  writeTaskConfig(config);
  renderDailyTaskLists();
  showToast("Task added.");
  return trimmed;
}

function addCustomTask() {
  const input = $("#newTaskText");
  if (input && addTaskToShift("morning", input.value)) input.value = "";
}

function addPmCustomTask() {
  const input = $("#newPmTaskText");
  if (input && addTaskToShift("pm", input.value)) input.value = "";
}

function addManagedTask(shift, inputSelector) {
  const input = $(inputSelector);
  if (input && addTaskToShift(shift, input.value)) input.value = "";
}

function addCustomTabTask(button) {
  const shift = button.dataset.shift || "";
  const input = $(`[data-custom-task-input="${shift}"]`);
  if (input && addTaskToShift(shift, input.value)) input.value = "";
}

function setOwnedFormLocked(locked) {
  const formEl = $("#ourDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (field.dataset?.ownedProfileTab) return;
    if (field.closest("#ownedDogFileList")) return;
    if (["editOwnedDogButton", "cancelOwnedDogEdit", "deleteOwnedDogButton", "ownedDogDocumentFiles", "uploadOwnedDogFilesButton"].includes(field.id)) return;
    field.disabled = locked;
  });
  $("#ownedDogPhotoPicker").disabled = false;
  $("#ownedDogSaveButton").hidden = locked;
  $("#editOwnedDogButton").hidden = !locked;
  $("#deleteOwnedDogButton").hidden = !formEl.elements.id.value;
  formEl.classList.toggle("is-readonly", locked);
}

async function sendPayload(payload) {
  if (localTestMode || !supabaseClient) {
    modeLabel.textContent = localTestMode ? "Local test saved" : "Local saved";
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
  if (localTestMode || !supabaseClient) {
    modeLabel.textContent = localTestMode ? "Local test mode" : "Local only";
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
    await syncMissingCustomerAccessProfiles();
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
  emergencyName: "Highly recommended for boarding safety.",
  emergencyPhone: "Highly recommended for boarding safety.",
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

function multilineHtml(value = "") {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function mediaLinkHtml(record) {
  const links = [];
  if (record.mediaLink) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(record.mediaLink)}" data-media-type="external/link" data-media-name="Shared media">Open shared media</button>`);
  }
  if (record.profilePhotoUrl) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(record.profilePhotoUrl)}" data-media-type="image/jpeg" data-media-name="Profile photo">Open profile photo</button>`);
  }
  if (record.mediaItems?.length) {
    links.push(
      ...record.mediaItems.map(
        (item) =>
          `<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="${escapeHtml(item.type)}" data-media-name="${escapeHtml(item.name)}">Open ${escapeHtml(item.name)}</button>`,
      ),
    );
  }
  if (record.vaccinationRecords?.length) {
    links.push(
      ...record.vaccinationRecords.map(
        (item) =>
          `<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(item.url || "")}" data-media-type="${escapeHtml(item.type)}" data-media-name="${escapeHtml(item.name)}">Open vaccine record: ${escapeHtml(item.name)}</button>`,
      ),
    );
  } else if (record.vaccinationFiles) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="${escapeHtml(record.vaccinationFiles)}">Open vaccine record</button>`);
  } else if (record.mediaFiles) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="${escapeHtml(record.mediaFiles)}">Open uploaded file</button>`);
  }
  return links.length ? `<div class="detail-media">${links.join(" ")}</div>` : "";
}

function customerUploadSectionHtml(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record);
  const sections = [];
  const directMedia = mediaLinkHtml({
    profilePhotoUrl: record.profilePhotoUrl,
    vaccinationRecords: record.vaccinationRecords || [],
    vaccinationFiles: record.vaccinationFiles || "",
  });
  if (directMedia) sections.push(`<article class="record-card compact-record-card"><strong>Files attached to boarding record</strong>${directMedia}</article>`);
  if (linkedDog) {
    const linkedMedia = mediaLinkHtml({
      profilePhotoUrl: linkedDog.profilePhotoUrl,
      vaccinationRecords: linkedDog.vaccinationRecords || [],
      vaccinationFiles: linkedDog.vaccinationFiles || "",
    });
    sections.push(`<article class="record-card compact-record-card"><strong>${escapeHtml(linkedDog.dogName || record.dogName || "Customer dog")}</strong><p>${escapeHtml(linkedDog.ownerEmail || linkedDog.customerEmail || record.ownerEmail || "")}</p>${linkedMedia || "<p>No uploaded customer files saved for this dog yet.</p>"}</article>`);
  }
  return sections.length ? `<h3>Customer Uploaded Files</h3><div class="record-grid compact-record-grid">${sections.join("")}</div>` : "";
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

function showDetailDialog(title, html, context = null) {
  detailDialogContext = context;
  $("#detailDialogTitle").textContent = title;
  $("#detailDialogBody").innerHTML = html;
  const completeButton = $("#completeDetailTaskButton");
  if (context && ["request", "maintenance"].includes(context.type)) {
    const record = readRecords(context.type).find((item) => item.id === context.id);
    completeButton.hidden = Boolean(record?.completed);
  } else {
    completeButton.hidden = true;
  }
  const dialog = $("#detailDialog");
  if (!dialog.open) dialog.showModal();
}

function showMediaDialog(src, type, name) {
  mediaZoomLevel = 1;
  $("#mediaDialogTitle").textContent = name || "Media";
  if (!src) {
    $("#mediaDialogBody").innerHTML = `<p>This file was not uploaded to the database. The maximum file size is ${MAX_MEDIA_UPLOAD_MB} MB.</p>${name ? `<p><strong>Saved file name:</strong> ${escapeHtml(name)}</p>` : ""}`;
    $("#mediaDialog").showModal();
    return;
  }
  const safeSrc = escapeHtml(src || "");
  const safeName = escapeHtml(name || "Uploaded media");
  const openLink = `<p><a href="${safeSrc}" target="_blank" rel="noopener">Open uploaded file in database</a></p>`;
  $("#mediaDialogBody").innerHTML = (type?.startsWith("video/")
    ? `<video src="${safeSrc}" controls playsinline></video>`
    : type?.startsWith("image/") || /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|#|$)/i.test(src)
      ? `<div class="media-zoom-controls"><button type="button" class="secondary-button" data-action="media-zoom-out">Zoom Out</button><span id="mediaZoomLabel">100%</span><button type="button" class="secondary-button" data-action="media-zoom-in">Zoom In</button></div><div class="media-zoom-frame"><img id="zoomableMediaImage" src="${safeSrc}" alt="${safeName}" /></div>`
      : /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(src)
        ? `<video src="${safeSrc}" controls playsinline></video>`
        : type === "external/link"
          ? `<iframe class="media-iframe" src="${safeSrc}" title="${safeName}"></iframe><a href="${safeSrc}" target="_blank" rel="noopener">Open in a new tab</a>`
          : `<p>This file type cannot be previewed here.</p>`) + openLink;
  $("#mediaDialog").showModal();
}

function updateMediaZoom() {
  const image = $("#zoomableMediaImage");
  const label = $("#mediaZoomLabel");
  if (!image) return;
  image.style.transform = `scale(${mediaZoomLevel})`;
  if (label) label.textContent = `${Math.round(mediaZoomLevel * 100)}%`;
}

function dailyDetailHtml(record) {
  const careLogs = record.structuredCareLogs || record.careLogs || [];
  const completedTasks = completedTasksForRecord(record);
  const monthlyTasks = record.monthlyTasks || [];
  const completedHtml = completedTasks.length
    ? `<div class="detail-row"><strong>Completed tasks</strong><span>${completedTasks.map((task) => `${task.shiftLabel || taskTabLabel(task.shift)}: ${task.taskText} - ${task.completedBy || "Staff"}${task.completedAt ? ` at ${formatDateTime(task.completedAt)}` : ""}`).map(escapeHtml).join("<br>")}</span></div>`
    : "";
  const careLogHtml = careLogs.length
    ? `<div class="detail-row"><strong>Structured care logs</strong><span>${careLogs.map((log) => `${log.dogName || "Dog"} - ${log.careType || log.category || "Care"}${log.minutes ? ` (${log.minutes} min)` : ""}${log.note || log.notes ? `: ${log.note || log.notes}` : ""}`).map(escapeHtml).join("<br>")}</span></div>`
    : "";
  const monthlyTasksHtml = monthlyTasks.length
    ? `<div class="detail-row"><strong>Monthly tasks</strong><span>${escapeHtml(`Building cleaned: ${monthlyDeepCleanBuildingForRecord(record)}`)}<br>${monthlyTasks.map(escapeHtml).join("<br>")}</span></div>`
    : "";
  return `
    ${completedHtml}
    ${detailRows(record, [
      ["Date", "date"],
      ["Staff", "helperName"],
      ["Day", "dayOfWeek"],
      ["Morning tasks", "dailyTasks"],
      ["PM tasks", "pmTasks"],
      ["Weekly tasks", "weeklyTasks"],
      ["Tuesday tasks", "tuesdayTasks"],
    ])}
    ${monthlyTasksHtml}
    ${detailRows(record, [["Boarding tasks", "boardingTasks"]])}
    ${careLogHtml}
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
    .filter(([key, value]) => !["profilePhotoData", "type", "removed", "completed", "mediaItems", "vaccinationRecords"].includes(key) && value !== "" && value !== null && value !== undefined)
    .map(([key, value]) => `<div class="detail-row"><strong>${escapeHtml(key)}</strong><span>${Array.isArray(value) ? escapeHtml(value.join(", ")) : escapeHtml(typeof value === "object" ? JSON.stringify(value, null, 2) : value)}</span></div>`)
    .join("");
  return `${rows}${mediaLinkHtml(record)}`;
}

function boardingDogDetailHtml(record) {
  const stays = (record.stays || [])
    .map((stay) => `<article class="record-card"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><div class="chip-row">${boardingStayStatusChipHtml(record, stay)}</div><p>${escapeHtml((stay.requests || []).join(", ") || "No service requests")}</p><p>${escapeHtml(stay.stayNotes || "")}</p></article>`)
    .join("");
  const customerUpdates = (record.customerUpdates || [])
    .map((update) => `<article class="record-card compact-record-card"><strong>${escapeHtml(formatDateTime(update.createdAt || update.submittedAt) || "Customer update")}</strong><span>${escapeHtml(update.byName || "Staff")}</span><p>${escapeHtml(update.note || "")}</p><div class="record-actions">${customerUpdateMediaHtml(update)}</div></article>`)
    .join("");
  const history = (record.statusHistory || [])
    .map((entry) => `<article class="record-card compact-record-card"><strong>${escapeHtml(entry.from || entry.fromStatus || "Unknown")} -> ${escapeHtml(entry.to || entry.toStatus || "Unknown")}</strong><span>${formatDateTime(entry.date || entry.changedAt)}${entry.by || entry.changedBy ? ` | ${escapeHtml(entry.by || entry.changedBy)}` : ""}</span></article>`)
    .join("");
  return `
    <div class="chip-row">${dogTypeBadgeHtml("boardingDog")}${boardingStatusChipHtml(record)}${linkedCustomerDogForBoarding(record) ? statusChipHtml("Owner Linked") : ""}</div>
    ${detailRows(record, [
      ["Dog", "dogName"],
      ["Owner", "ownerName"],
      ["Owner phone", "ownerPhone"],
      ["Owner email", "ownerEmail"],
      ["Emergency contact", "emergencyName"],
      ["Emergency phone", "emergencyPhone"],
      ["Special care", "specialCare"],
      ["Daily activity", "dailyActivity"],
      ["Boarding history", "boardingHistory"],
      ["Rabies", "rabiesDate"],
      ["DHPP", "dhppDate"],
      ["Bordetella", "bordetellaDate"],
    ])}
    ${customerUploadSectionHtml(record)}
    ${customerUpdates ? `<h3>Customer Updates</h3>${customerUpdates}` : ""}
    ${stays ? `<h3>Stays</h3>${stays}` : ""}
    ${history ? `<h3>Status History</h3>${history}` : ""}
  `;
}

function detailForRecord(type, record) {
  if (!record) return "";
  if (type === "dailyTask") return dailyDetailHtml(record);
  if (type === "boardingDog") return boardingDogDetailHtml(record);
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
    calendarNote: `Calendar Note: ${record.noteDate || "Record"}`,
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

function generatedCareEntry(record, log, type) {
  const date = dateOnly(log.date || record.date) || todayDate();
  return {
    id: log.id ? `${record.id}-${log.id}-${type}` : uid("care-log"),
    sourceDailyTaskId: record.id,
    sourceCareLogId: log.id || "",
    type,
    date,
    minutes: log.minutes || "",
    note: log.note || "",
    completedBy: log.completedBy || record.helperName || "",
    createdAt: new Date().toISOString(),
  };
}

function removeGeneratedDogCare(dog, dailyTaskId) {
  const clean = normalizeOwnedDogCare(dog);
  clean.exerciseLogs = clean.exerciseLogs.filter((log) => log.sourceDailyTaskId !== dailyTaskId);
  clean.trainingLogs = clean.trainingLogs.filter((log) => log.sourceDailyTaskId !== dailyTaskId);
  clean.bathHistory = clean.bathHistory.filter((log) => log.sourceDailyTaskId !== dailyTaskId);
  clean.heatHistory = clean.heatHistory.filter((log) => log.sourceDailyTaskId !== dailyTaskId);
  clean.careNotesHistory = clean.careNotesHistory.filter((log) => log.sourceDailyTaskId !== dailyTaskId);
  if (clean.lastExerciseUpdatedFromDailyTaskId === dailyTaskId) clean.lastExerciseDate = latestLogDate(clean.exerciseLogs);
  if (clean.lastTrainingUpdatedFromDailyTaskId === dailyTaskId) clean.lastTrainingDate = latestLogDate(clean.trainingLogs);
  if (clean.bathUpdatedFromDailyTaskId === dailyTaskId) {
    clean.lastBath = latestLogDate(clean.bathHistory);
    clean.nextBath = clean.lastBath ? addDays(clean.lastBath, clean.bathIntervalDays) : "";
  }
  if (clean.heatUpdatedFromDailyTaskId === dailyTaskId) {
    clean.lastHeat = latestLogDate(clean.heatHistory);
    clean.nextHeat = clean.lastHeat ? addDays(clean.lastHeat, clean.heatCycleLengthDays || careDefaults.heatCycleLengthDays) : "";
  }
  return clean;
}

function setIfNewer(record, field, date, sourceField, sourceId) {
  if (!date) return;
  if (!record[field] || dateOnlyTime(record[field]) <= dateOnlyTime(date) || record[sourceField] === sourceId) {
    record[field] = date;
    record[sourceField] = sourceId;
  }
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
    const entry = generatedCareEntry(record, { id: `legacy-bath-${dogId}`, date: reportDate, note: "Legacy daily bath entry.", completedBy: record.helperName }, "Bath");
    dog.bathHistory.unshift(entry);
    setIfNewer(dog, "lastBath", entry.date, "bathUpdatedFromDailyTaskId", record.id);
    dog.nextBath = dog.lastBath ? addDays(dog.lastBath, dog.bathIntervalDays || careDefaults.bathIntervalDays) : "";
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
      dog.nextBath = dog.lastBath ? addDays(dog.lastBath, dog.bathIntervalDays || careDefaults.bathIntervalDays) : "";
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
  }
  if (dogUpdates.size) {
    renderOwnedDogs();
    renderCareDogOptions();
    const activeId = $("#ourDogForm")?.elements.id.value || "";
    const activeUpdate = activeId ? dogUpdates.get(activeId) : null;
    if (activeUpdate) {
      renderOwnedActivity(activeUpdate);
      renderOwnedDogFiles(activeUpdate);
      renderOwnedDogTimeline(activeUpdate);
    }
    showToast(`${dogUpdates.size} Our Dog care profile${dogUpdates.size === 1 ? "" : "s"} updated.`);
  }
}

async function syncBathDatesFromDailyReport(record) {
  await syncOwnedDogCareFromDailyReport(record);
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

function dailySubmissionDate(record = {}) {
  return dateOnly(record.date || record.submittedAt || record.updatedAt);
}

function isRecentDailySubmission(record = {}, daysBack = 3) {
  const recordDate = dailySubmissionDate(record);
  if (!recordDate) return false;
  return recordDate >= addDays(todayDate(), -daysBack) && recordDate <= todayDate();
}

function dailySubmissionDisplayPriority(record = {}) {
  if (record.isCalendarNoteSubmission) return 0;
  return 1;
}

function staffNoteTimePrefix(value = new Date()) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function calendarNoteKind(note = {}) {
  return note.noteKind === "staff" || note.source === "daily-staff-note" ? "staff" : "special";
}

function calendarNoteKindLabel(note = {}) {
  return calendarNoteKind(note) === "staff" ? "Staff Note" : "Special Note";
}

function staffNoteIdentityKey(note = {}) {
  const author = String(note.createdBy || note.helperName || note.authorName || note.updatedBy || "").trim().toLowerCase();
  const email = String(note.createdByEmail || note.updatedByEmail || note.helperEmail || note.authorEmail || "").trim().toLowerCase();
  const hasUsefulAuthor = author && !["author not recorded", "unknown staff", "staff"].includes(author);
  if (hasUsefulAuthor) return `name:${author}`;
  return email ? `email:${email}` : "unknown";
}

function staffNoteGroupKey(note = {}) {
  return [calendarNoteDate(note), staffNoteIdentityKey(note)].join("|");
}

function calendarNoteGroupKey(note = {}) {
  return [calendarNoteDate(note), calendarNoteKind(note), staffNoteIdentityKey(note)].join("|");
}

function specialNoteEntryText(value = "", timestamp = new Date()) {
  const timeText = staffNoteTimePrefix(timestamp);
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => /\[[^\]]*\d{1,2}:\d{2}[^\]]*\]\s*$/i.test(line) ? line : `${line} - [${timeText}]`)
    .join("\n");
}

function calendarNoteDisplayText(note = {}) {
  if (calendarNoteKind(note) === "special") {
    return specialNoteEntryText(note.note || "", note.updatedAt || note.submittedAt || new Date());
  }
  return note.note || "";
}

function groupedRecentStaffNotes(notes = []) {
  const groups = new Map();
  notes.forEach((note) => {
    const key = staffNoteGroupKey(note);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { ...note, id: note.id, ids: [note.id].filter(Boolean), note: note.note || "" });
      return;
    }
    existing.ids.push(note.id);
    existing.note = [existing.note, note.note].filter(Boolean).join("\n");
    existing.updatedAt = new Date(existing.updatedAt || existing.submittedAt || 0) > new Date(note.updatedAt || note.submittedAt || 0) ? existing.updatedAt : note.updatedAt;
  });
  return [...groups.values()];
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
      existing.note = [existing.note, displayText].filter(Boolean).join("\n");
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

function renderDemoSubmissions() {
  const dailyRecords = readRecords("dailyTask");
  const calendarNotes = readRecords("calendarNote").filter((note) => !note.removed);
  const saved = [
    ...dailyRecords,
    ...groupedCalendarNotesForDisplay(calendarNotes).map((note) => ({ ...note, date: calendarNoteDate(note), isCalendarNoteSubmission: true })),
  ]
    .filter((submission) => !submission.removed && isRecentDailySubmission(submission))
    .sort((a, b) => (
      String(dailySubmissionDate(b)).localeCompare(String(dailySubmissionDate(a)))
      || dailySubmissionDisplayPriority(a) - dailySubmissionDisplayPriority(b)
      || new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0)
    ));
  $("#recentSubmissions").innerHTML = saved.length
    ? saved
        .map((submission) => {
          if (submission.isCalendarNoteSubmission) {
            const noteKind = calendarNoteKindLabel(submission);
            const noteAction = submission.isGroupedCalendarNote ? "view-calendar-note-group" : "view-calendar-note";
            const ids = submission.ids?.length ? submission.ids.join(",") : submission.id;
            const noteClass = noteKind === "Staff Note" ? " is-staff-note" : " is-special-note";
            return `<article class="submission-item clickable-card${noteClass}" data-action="${noteAction}" data-id="${escapeHtml(submission.id)}" data-ids="${escapeHtml(ids || "")}"><strong>${escapeHtml(submission.noteDate || submission.date || "")} - ${escapeHtml(noteKind)}</strong><p class="staff-note-message">${multilineHtml(submission.note || "")}</p><span>Written by ${escapeHtml(calendarNoteAuthorText(submission))}</span></article>`;
          }
          const completedTasks = completedTasksForRecord(submission);
          const careLogs = submission.structuredCareLogs || submission.careLogs || [];
          const staffSummary = Object.entries(
            completedTasks.reduce((totals, task) => {
              const name = task.completedBy || "Staff";
              totals[name] = (totals[name] || 0) + 1;
              return totals;
            }, {}),
          )
            .map(([name, count]) => `${name}: ${count}`)
            .join(" | ");
          const remaining = Math.max(totalConfiguredTaskCount() - completedTasks.length, 0);
          return `<article class="submission-item clickable-card" data-action="view-daily" data-id="${submission.id}"><strong>${escapeHtml(submission.date || dailySubmissionDate(submission))} - Completed Work</strong><p>${escapeHtml(submission.dayOfWeek || "")} | ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"} done | ${remaining} open | ${careLogs.length} care log${careLogs.length === 1 ? "" : "s"}</p><p>${escapeHtml(staffSummary || "No task completions yet.")}</p></article>`;
        })
        .join("")
    : "<p>No submissions from the last 3 days yet.</p>";
}

function canEditRecentDailyReport(record) {
  if (!isRecentDailySubmission(record)) return false;
  if (currentRole() === "admin") return true;
  return record?.helperEmail === currentUser?.email;
}

function canEditOwnToday(record) {
  if (currentRole() === "admin") return true;
  return record?.date === todayDate() && timesheetBelongsToCurrentUser(record);
}

function matches(record, query) {
  return JSON.stringify(record).toLowerCase().includes(query.trim().toLowerCase());
}

function ownedDogCareTagsHtml(record = {}) {
  const tags = [];
  if (ownedDogExerciseDue(record)) tags.push("Exercise due");
  if (ownedDogTrainingDue(record)) tags.push("Training due");
  if (ownedDogBathDue(record)) tags.push("Bath due");
  const heat = ownedDogHeatStatus(record);
  if (heat.inHeat) tags.push("In heat");
  else if (heat.expectedSoon || heat.overdue) tags.push("Heat watch");
  if (ownedDogHasCareNote(record)) tags.push("Special care");
  return tags.length ? `<div class="chip-row">${tags.map((tag) => statusChipHtml(tag)).join("")}</div>` : "";
}

function ownedDogMobileCardHtml(record = {}) {
  const dog = normalizeOwnedDogCare(record);
  const name = ownedDogDisplayName(dog) || "Dog";
  const photo = dog.profilePhotoUrl || dog.profilePhotoData || "";
  const photoHtml = photo
    ? `<button type="button" class="mobile-dog-photo-button" data-action="view-owned-photo" data-id="${escapeHtml(dog.id)}" aria-label="View ${escapeHtml(name)} photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" /></button>`
    : `<button type="button" class="mobile-dog-photo-button mobile-dog-photo-initials" data-action="view-owned-photo" data-id="${escapeHtml(dog.id)}" aria-label="View ${escapeHtml(name)} profile">${escapeHtml(avatarText(name))}</button>`;
  const heatAction = dog.sex === "Female" ? `<button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Heat Note" data-id="${escapeHtml(dog.id)}">Heat Note</button>` : "";
  return `
    <article class="record-card mobile-roster-card ${ownedDogExerciseDue(dog) || ownedDogTrainingDue(dog) || ownedDogBathDue(dog) ? "has-care-due" : ""}">
      <div class="mobile-roster-card-main">
        ${photoHtml}
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml([dog.sex, ownedDogCareSummary(dog)].filter(Boolean).join(" | "))}</span>
        ${ownedDogCareTagsHtml(dog)}
      </div>
      <div class="quick-action-grid">
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Treadmill" data-id="${escapeHtml(dog.id)}">Treadmill</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Scooter" data-id="${escapeHtml(dog.id)}">Scooter</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Yard Run" data-id="${escapeHtml(dog.id)}">Yard Run</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Bath" data-id="${escapeHtml(dog.id)}">Bath</button>
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Training" data-id="${escapeHtml(dog.id)}">Training</button>
        ${heatAction}
        <button type="button" class="secondary-button" data-action="log-owned-care" data-id="${escapeHtml(dog.id)}">Open Timeline</button>
      </div>
    </article>`;
}

function ownedDogPhotoUploadDialogHtml(record = {}) {
  const name = ownedDogDisplayName(record) || "Dog";
  return `
    <form id="ownedDogPhotoUploadForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
      <section class="quick-care-dog-summary mobile-photo-upload-summary">
        <div class="quick-care-dog-photo quick-care-dog-initials" id="ownedDogPhotoUploadInitials">${escapeHtml(avatarText(name))}</div>
        <img class="quick-care-dog-photo" id="ownedDogPhotoUploadPreview" alt="${escapeHtml(name)} photo preview" hidden />
        <div>
          <h3>${escapeHtml(name)}</h3>
          <p>${escapeHtml([record.sex, ownedDogCareSummary(record)].filter(Boolean).join(" | "))}</p>
        </div>
      </section>
      <label>Profile photo<input type="file" id="ownedDogMobilePhotoInput" accept="image/jpeg,image/png,.jpg,.jpeg,.png" required /></label>
      <div class="button-row"><button type="submit">Upload Photo</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>`;
}

function openOwnedDogPhotoUploadPopup(record = {}) {
  showDetailDialog(`${ownedDogDisplayName(record) || "Dog"} Profile Photo`, ownedDogPhotoUploadDialogHtml(record));
}

function previewOwnedDogMobilePhoto(input) {
  const file = input?.files?.[0];
  const preview = $("#ownedDogPhotoUploadPreview");
  const initials = $("#ownedDogPhotoUploadInitials");
  if (!file || !preview || !initials) return;
  if (!isSupportedDogPhoto(file)) {
    input.value = "";
    showToast("Choose a JPG or PNG profile photo.");
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  preview.onload = () => URL.revokeObjectURL(objectUrl);
  preview.src = objectUrl;
  preview.hidden = false;
  initials.hidden = true;
}

async function submitOwnedDogPhotoUpload(formEl) {
  const record = readRecords("ownedDog").find((item) => item.id === formEl.dataset.id && !item.removed);
  const input = formEl.querySelector("#ownedDogMobilePhotoInput");
  const file = input?.files?.[0];
  if (!record || !file) {
    showToast("Choose a dog photo before uploading.");
    return;
  }
  if (!isSupportedDogPhoto(file)) {
    showToast("Choose a JPG or PNG profile photo.");
    return;
  }
  const submitButton = formEl.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Uploading...";
  }
  const { url, error } = await uploadDogPhotoToSupabase(file, record.id);
  if (!url) {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Upload Photo";
    }
    showToast(error || "The profile photo could not be uploaded.");
    return;
  }
  const updated = upsertRecord("ownedDog", { ...record, profilePhotoUrl: url, profilePhotoData: "", updatedAt: new Date().toISOString() });
  await sendPayload(updated);
  await addAuditLog("Uploaded dog profile photo", "ownedDog", updated, ownedDogDisplayName(updated));
  renderOwnedDogs();
  renderDashboard();
  $("#detailDialog").close();
  showToast(`${ownedDogDisplayName(updated) || "Dog"} photo uploaded.`);
}

function renderOwnedDogMobileCards(records = []) {
  const container = $("#ownedDogMobileCards");
  if (!container) return;
  const mobileRecords = [...records].sort((a, b) => {
    const priority = (dog) => Number(ownedDogExerciseDue(dog)) + Number(ownedDogTrainingDue(dog)) + Number(ownedDogBathDue(dog)) + Number(ownedDogHeatStatus(dog).expectedSoon || ownedDogHeatStatus(dog).inHeat || ownedDogHeatStatus(dog).overdue);
    return priority(b) - priority(a) || ownedDogDisplayName(a).localeCompare(ownedDogDisplayName(b));
  });
  container.innerHTML = mobileRecords.length
    ? mobileRecords.map(ownedDogMobileCardHtml).join("")
    : `<article class="record-card mobile-roster-card"><strong>No matching dogs</strong><p>Try a shorter name or switch the care filter back to All.</p></article>`;
}

function renderOwnedDogs() {
  const query = $("#ownedDogSearch").value || "";
  const allDogs = readRecords("ownedDog").filter((record) => !record.removed);
  const records = sortRecordsForTable("ownedDog", allDogs.filter((record) => matches(record, query) && ownedDogMatchesCareFilter(record)));
  const columns = activeColumns("ownedDog");
  const summary = {
    total: allDogs.length,
    exerciseDue: allDogs.filter((dog) => ownedDogExerciseDue(dog)).length,
    trainingDue: allDogs.filter((dog) => ownedDogTrainingDue(dog)).length,
    bathsDue: allDogs.filter((dog) => ownedDogBathDue(dog)).length,
    femalesInHeat: allDogs.filter((dog) => ownedDogHeatStatus(dog).inHeat).length,
    heatExpectedSoon: allDogs.filter((dog) => {
      const heat = ownedDogHeatStatus(dog);
      return heat.expectedSoon || heat.overdue;
    }).length,
  };
  if ($("#ownedDogSummary")) {
    $("#ownedDogSummary").innerHTML = [
      ["Total Our Dogs", summary.total],
      ["Exercise Due", summary.exerciseDue],
      ["Training Due", summary.trainingDue],
      ["Baths Due", summary.bathsDue],
      ["Females In Heat", summary.femalesInHeat],
      ["Heat Expected Soon", summary.heatExpectedSoon],
    ].map(([label, value]) => `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
  }
  $("#ownedDogTableHead").innerHTML = `<tr>${columns.map((column) => `<th data-sort-column="${column.key}" data-table="ownedDog" data-column="${column.key}" draggable="true" title="Drag to reorder. Double-click to sort.">${escapeHtml(column.label)}</th>`).join("")}<th>Actions</th></tr>`;
  $("#ownedDogTableBody").innerHTML = records.length
    ? records
        .map((record) => {
          const heat = ownedDogHeatStatus(record);
          const rowClass = [
            ownedDogExerciseDue(record) || ownedDogTrainingDue(record) || ownedDogBathDue(record) ? "has-care-due" : "",
            heat.inHeat ? "is-in-heat" : "",
          ].filter(Boolean).join(" ");
          return `<tr data-id="${record.id}" class="${rowClass}">${columns.map((column) => `<td>${escapeHtml(column.value(record))}</td>`).join("")}<td><div class="record-actions table-actions">${dogTypeBadgeHtml("ownedDog")}<button type="button" class="secondary-button" data-action="view-owned" data-id="${escapeHtml(record.id)}">View</button><button type="button" class="secondary-button" data-action="edit-owned" data-id="${escapeHtml(record.id)}">Edit</button><button type="button" class="secondary-button" data-action="log-owned-care" data-id="${escapeHtml(record.id)}">Log Care</button></div></td></tr>`;
        })
        .join("")
    : `<tr><td colspan="${(columns.length || 1) + 1}">No matching dogs. Use Add New Dog.</td></tr>`;
  renderOwnedDogMobileCards(records);
  renderColumnManager("ownedDog", "#ownedDogColumnManager");
  renderCareDogOptions();
}

function boardingRosterFilters() {
  return ["Active dogs", "Pending", "In Kennel", "Ready For Pickup", "All Boarding Dogs"];
}

function boardingRosterFilterLabel(filter) {
  return filter === "Ready For Pickup" ? "Ready for Pickup" : filter;
}

function boardingDogMatchesRosterFilter(record = {}, filter = boardingDogRosterFilter) {
  const status = normalizeBoardingStatus(record);
  const hasActiveStay = isCurrentlyBoarding(record);
  if (filter === "All Boarding Dogs") return true;
  if (filter === "Pending") return status === "Pending" && !hasActiveStay;
  if (filter === "In Kennel") return status === "In Kennel";
  if (filter === "Ready For Pickup") return status === "Ready For Pickup";
  return hasActiveStay || ["Checked In", "In Kennel", "Ready For Pickup"].includes(status);
}

function renderBoardingRosterTabs(records = []) {
  const container = $("#boardingDogRosterTabs");
  if (!container) return;
  const filters = boardingRosterFilters();
  if (!filters.includes(boardingDogRosterFilter)) boardingDogRosterFilter = "Active dogs";
  const counts = filters.reduce((acc, filter) => {
    acc[filter] = records.filter((record) => boardingDogMatchesRosterFilter(record, filter)).length;
    return acc;
  }, {});
  container.innerHTML = filters
    .map((filter) => {
      const active = filter === boardingDogRosterFilter;
      return `<button type="button" class="${active ? "is-active" : ""}" data-boarding-filter="${escapeHtml(filter)}" role="tab" aria-selected="${active ? "true" : "false"}">${escapeHtml(boardingRosterFilterLabel(filter))} <span>${counts[filter] || 0}</span></button>`;
    })
    .join("");
}

function sameDateValue(value, date = todayDate()) {
  return dateOnly(value) === date;
}

function boardingQueueGroupHtml(title, records = []) {
  const preview = records.slice(0, 6);
  return `<article class="boarding-queue-card"><strong>${escapeHtml(title)}</strong><span>${records.length}</span>${
    preview.length
      ? preview.map((record) => `<button type="button" class="boarding-queue-item" data-action="change-boarding" data-id="${escapeHtml(record.id)}"><span>${escapeHtml(record.dogName || "Dog")}</span><small>${escapeHtml(boardingScheduleText(record))}</small></button>`).join("")
      : `<p>No dogs in this group.</p>`
  }</article>`;
}

function renderBoardingQueueGroups(records = []) {
  const container = $("#boardingQueueGroups");
  if (!container) return;
  const today = todayDate();
  const groups = [
    ["Pending", records.filter((record) => normalizeBoardingStatus(record) === "Pending")],
    ["Today Drop-offs", records.filter((record) => sameDateValue(currentOrNextStay(record)?.dropoffTime, today) && ["Pending", "Approved", "Checked In"].includes(normalizeBoardingStatus(record)))],
    ["In Kennel", records.filter((record) => normalizeBoardingStatus(record) === "In Kennel")],
    ["Today Pickups", records.filter((record) => sameDateValue((activeBoardingStay(record) || currentOrNextStay(record))?.pickupTime, today) && ["Checked In", "In Kennel", "Ready For Pickup"].includes(normalizeBoardingStatus(record)))],
  ];
  container.innerHTML = groups.map(([title, groupRecords]) => boardingQueueGroupHtml(title, groupRecords)).join("");
}

function linkedCustomerDogForBoarding(record = {}) {
  const ownerEmails = boardingOwnerEmails(record);
  if (!ownerEmails.length) return null;
  return readRecords("customerDog").find((dog) => {
    if (dog.removed) return false;
    if (record.linkedCustomerDogId && dog.id === record.linkedCustomerDogId) return true;
    return dog.linkedBoardingDogId === record.id || (ownerEmails.includes(normalizeEmail(dog.ownerEmail || dog.customerEmail)) && String(dog.dogName || "").trim().toLowerCase() === String(record.dogName || "").trim().toLowerCase());
  }) || null;
}

function boardingDogForCustomerDog(dog = {}) {
  const ownerEmail = normalizeEmail(dog.ownerEmail || dog.customerEmail);
  const dogName = String(dog.dogName || "").trim().toLowerCase();
  return consolidatedBoardingDogRecords().find((record) => {
    if (record.removed) return false;
    if (record.linkedCustomerDogId && record.linkedCustomerDogId === dog.id) return true;
    return ownerEmail
      && dogName
      && boardingOwnerEmails(record).includes(ownerEmail)
      && String(record.dogName || "").trim().toLowerCase() === dogName;
  }) || null;
}

function boardingOwnerEmails(record = {}) {
  return uniqueEmails(record.ownerEmail, record.customerEmail, record.linkedOwnerEmail, record.secondaryOwnerEmail);
}

function boardingDogVisibleToCustomer(record = {}, email = currentUser?.email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && boardingOwnerEmails(record).includes(normalizedEmail));
}

function customerDogVisibleToCustomer(dog = {}, email = currentUser?.email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && uniqueEmails(dog.ownerEmail, dog.customerEmail).includes(normalizedEmail));
}

function customerDogFromBoardingDog(record = {}, email = currentUser?.email) {
  const linked = linkedCustomerDogForBoarding(record) || {};
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail);
  const currentEmail = normalizeEmail(email);
  return {
    ...linked,
    type: "customerDog",
    id: `boarding:${record.id}`,
    sourceType: "boardingDog",
    isSharedBoardingDog: true,
    sourceBoardingDogId: record.id,
    linkedBoardingDogId: record.id,
    dogName: record.dogName || linked.dogName || "Boarding dog",
    breedDescription: record.breedDescription || linked.breedDescription || "",
    dateOfBirth: record.dateOfBirth || linked.dateOfBirth || "",
    sex: record.sex || linked.sex || "Unknown",
    spayNeuterStatus: record.spayNeuterStatus || linked.spayNeuterStatus || "Unknown",
    ownerName: record.ownerName || linked.ownerName || "",
    ownerPhone: record.ownerPhone || linked.ownerPhone || "",
    ownerEmail: ownerEmail || currentEmail,
    customerEmail: currentEmail || ownerEmail,
    secondaryOwnerEmail: normalizeEmail(record.secondaryOwnerEmail),
    emergencyName: record.emergencyName || linked.emergencyName || "",
    emergencyPhone: record.emergencyPhone || linked.emergencyPhone || "",
    specialCare: record.specialCare || linked.specialCare || "",
    foodInstructions: record.foodInstructions || linked.foodInstructions || "",
    dhppDate: record.dhppDate || linked.dhppDate || "",
    rabiesDate: record.rabiesDate || linked.rabiesDate || "",
    bordetellaDate: record.bordetellaDate || linked.bordetellaDate || "",
    heartwormDate: record.heartwormDate || linked.heartwormDate || "",
    rabiesDuration: record.rabiesDuration || linked.rabiesDuration || "",
    profilePhotoUrl: boardingDogPhotoSource(record),
    profilePhotoData: record.profilePhotoData || linked.profilePhotoData || "",
    vaccinationRecords: record.vaccinationRecords || linked.vaccinationRecords || [],
    vaccinationFiles: record.vaccinationFiles || linked.vaccinationFiles || "",
  };
}

function customerDogsForCurrentUser() {
  const role = currentRole();
  const email = normalizeEmail(currentUser?.email);
  const dogs = readRecords("customerDog").filter((dog) => !dog.removed && (role === "admin" || customerDogVisibleToCustomer(dog, email)));
  if (role === "admin") return dogs;
  const seenIds = new Set(dogs.map((dog) => dog.linkedBoardingDogId).filter(Boolean));
  const seenKeys = new Set(dogs.map((dog) => `${normalizeEmail(dog.ownerEmail || dog.customerEmail)}|${String(dog.dogName || "").trim().toLowerCase()}`));
  readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record, email))
    .forEach((record) => {
      const key = `${normalizeEmail(record.ownerEmail || record.customerEmail)}|${String(record.dogName || "").trim().toLowerCase()}`;
      if (seenIds.has(record.id) || seenKeys.has(key)) return;
      dogs.push(customerDogFromBoardingDog(record, email));
      seenIds.add(record.id);
    });
  return dogs;
}

function boardingDraftFromCustomerDog(dog = {}) {
  return {
    dogName: dog.dogName || "",
    breedDescription: dog.breedDescription || "",
    sex: dog.sex || "Unknown",
    spayNeuterStatus: dog.spayNeuterStatus || "Unknown",
    ownerName: dog.ownerName || "",
    ownerPhone: dog.ownerPhone || "",
    ownerEmail: dog.ownerEmail || dog.customerEmail || "",
    customerEmail: dog.customerEmail || dog.ownerEmail || "",
    emergencyName: dog.emergencyName || "",
    emergencyPhone: dog.emergencyPhone || "",
    vetInfo: dog.vetInfo || "",
    rabiesDate: dog.rabiesDate || "",
    dhppDate: dog.dhppDate || "",
    bordetellaDate: dog.bordetellaDate || "",
    heartwormDate: dog.heartwormDate || "",
    specialCare: dog.specialCare || "",
    profilePhotoUrl: dog.profilePhotoUrl || "",
    profilePhotoData: dog.profilePhotoData || "",
    vaccinationRecords: dog.vaccinationRecords || [],
    vaccinationFiles: dog.vaccinationFiles || "",
    linkedCustomerDogId: dog.id || "",
    linkedOwnerEmail: dog.ownerEmail || dog.customerEmail || "",
    entrySource: "customer-profile",
  };
}

function ownerAccountForBoarding(record = {}) {
  const ownerEmail = String(record.ownerEmail || "").trim().toLowerCase();
  return ownerEmail ? savedUserFor({ email: ownerEmail }) || null : null;
}

function boardingOwnerLinkButtonHtml(record = {}) {
  if (!record.id || !record.ownerEmail) return "";
  const linkedDog = linkedCustomerDogForBoarding(record);
  const label = linkedDog ? "Refresh Owner Link" : "Create/Link Customer Login";
  return `<button type="button" class="secondary-button" data-action="link-boarding-owner" data-id="${escapeHtml(record.id)}">${label}</button>`;
}

function renderBoardingOwnerAccountPanel(record = activeBoardingDog()) {
  const panel = $("#boardingOwnerAccountPanel");
  const content = $("#boardingOwnerAccountContent");
  if (!panel || !content) return;
  if (!record?.id) {
    panel.hidden = true;
    content.innerHTML = "";
    return;
  }
  panel.hidden = false;
  const ownerEmail = String(record.ownerEmail || "").trim().toLowerCase();
  if (!ownerEmail) {
    content.innerHTML = `<article class="record-card compact-record-card"><strong>No owner email saved</strong><p>Add an owner email before preparing a customer login for this dog.</p></article>`;
    return;
  }
  const linkedDog = linkedCustomerDogForBoarding(record);
  const ownerAccount = ownerAccountForBoarding(record);
  content.innerHTML = `<article class="record-card compact-record-card"><strong>${escapeHtml(ownerEmail)}</strong><p>${linkedDog ? `Linked customer dog: ${escapeHtml(linkedDog.dogName || record.dogName || "Dog")}` : "No customer dog profile linked yet."}</p><p>${ownerAccount ? `Customer access profile exists: ${escapeHtml(roleLabel(ownerAccount.role))}` : "No customer access profile exists yet."}</p><div class="record-actions">${boardingOwnerLinkButtonHtml(record)}</div></article>`;
}

function boardingScheduleText(record = {}) {
  const status = normalizeBoardingStatus(record);
  const stay = currentOrNextStay(record) || (record.stays || [])[0] || {};
  const dropoff = stay.dropoffTime ? `Drop-off ${formatDateTime(stay.dropoffTime)}` : "";
  const pickup = stay.pickupTime ? `Pick-up ${formatDateTime(stay.pickupTime)}` : "";
  const kennel = status === "In Kennel" && (record.kennelLocationName || stay.kennelLocationName)
    ? `Kennel ${[record.kennelBuilding || stay.kennelBuilding, record.kennelLocationName || stay.kennelLocationName].filter(Boolean).join(" - ")}`
    : "";
  const pieces = [dropoff, pickup, kennel].filter(Boolean);
  return pieces.length ? pieces.join(" | ") : `${status} - no stay time saved`;
}

function boardingQuickSortTime(record = {}) {
  const status = normalizeBoardingStatus(record);
  const stay = currentOrNextStay(record) || (record.stays || [])[0] || {};
  const value = ["Checked In", "In Kennel", "Ready For Pickup"].includes(status) ? stay.pickupTime : stay.dropoffTime;
  const date = new Date(value || record.updatedAt || record.submittedAt || 0);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function boardingQuickActionButtons(record = {}) {
  const status = normalizeBoardingStatus(record);
  const buttons = [];
  if (["Pending", "Approved"].includes(status)) {
    const label = boardingTransitionIsEarly(record, "Checked In") ? "Check In Early" : "Check In";
    buttons.push(`<button type="button" class="secondary-button" data-action="quick-boarding-transition" data-next-status="Checked In" data-allow-early="true" data-id="${escapeHtml(record.id)}">${label}</button>`);
  }
  if (status === "Checked In") {
    buttons.push(`<button type="button" class="secondary-button" data-action="quick-boarding-transition" data-next-status="In Kennel" data-id="${escapeHtml(record.id)}">Mark In Kennel</button>`);
  }
  if (status === "In Kennel") {
    buttons.push(`<button type="button" class="secondary-button" data-action="quick-boarding-transition" data-next-status="Ready For Pickup" data-id="${escapeHtml(record.id)}">Ready For Pickup</button>`);
  }
  if (["Checked In", "In Kennel", "Ready For Pickup"].includes(status)) {
    const label = boardingTransitionIsEarly(record, "Checked Out") ? "Check Out Early" : "Check Out";
    buttons.push(`<button type="button" class="secondary-button" data-action="quick-boarding-transition" data-next-status="Checked Out" data-allow-early="true" data-id="${escapeHtml(record.id)}">${label}</button>`);
  }
  buttons.push(`<button type="button" class="secondary-button" data-action="change-boarding" data-id="${escapeHtml(record.id)}">Details</button>`);
  return `<div class="quick-action-grid boarding-action-grid">${buttons.join("")}</div>`;
}

function boardingDogPhotoSource(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record) || {};
  return record.profilePhotoUrl || record.profilePhotoData || linkedDog.profilePhotoUrl || linkedDog.profilePhotoData || "";
}

function boardingDogMobilePhotoHtml(record = {}) {
  const name = record.dogName || "Boarding dog";
  const photo = boardingDogPhotoSource(record);
  if (photo) {
    return `<button type="button" class="mobile-dog-photo-button" data-action="view-media" data-src="${escapeHtml(photo)}" data-media-type="image/jpeg" data-media-name="${escapeHtml(`${name} profile photo`)}" aria-label="View ${escapeHtml(name)} photo"><img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" /></button>`;
  }
  return `<div class="mobile-dog-photo-button mobile-dog-photo-initials" aria-hidden="true">${escapeHtml(avatarText(name))}</div>`;
}

function boardingQuickCardHtml(record = {}) {
  return `
    <article class="record-card mobile-roster-card">
      <div class="mobile-roster-card-main boarding-mobile-card-main">
        ${boardingDogMobilePhotoHtml(record)}
        <div class="boarding-mobile-card-content">
          <strong>${escapeHtml(record.dogName || "Boarding dog")}</strong>
          <div class="chip-row">${boardingStatusChipHtml(record)}</div>
          <span>${escapeHtml(boardingScheduleText(record))}</span>
          <p>${escapeHtml([record.ownerName, record.ownerPhone].filter(Boolean).join(" | "))}</p>
        </div>
      </div>
      ${boardingQuickActionButtons(record)}
    </article>`;
}

function stayRequestCheckboxesHtml(stay = {}) {
  const requests = stay.requests || [];
  return ["Bath requested", "Nail trim requested", "Paw trim requested", "Training requested", "Exercise requested"]
    .map((value) => `<label><input type="checkbox" name="stayRequests" value="${escapeHtml(value)}" ${requests.includes(value) ? "checked" : ""} /> ${escapeHtml(value)}</label>`)
    .join("");
}

function boardingStayFormHtml(record = {}, stay = {}) {
  const isEdit = Boolean(stay.id);
  return `
    <form id="boardingStayPopupForm" class="tracker-form" data-dog-id="${escapeHtml(record.id || "")}">
      <input type="hidden" name="stayId" value="${escapeHtml(stay.id || "")}" />
      <div class="field-grid">
        <label>Drop-off time<input type="datetime-local" name="dropoffTime" required value="${escapeHtml(stay.dropoffTime?.slice(0, 16) || "")}" /></label>
        <label>Pick-up time<input type="datetime-local" name="pickupTime" required value="${escapeHtml(stay.pickupTime?.slice(0, 16) || "")}" /></label>
      </div>
      <div class="checklist compact">${stayRequestCheckboxesHtml(stay)}</div>
      <label>Stay notes<textarea name="stayNotes" rows="3" placeholder="Owner instructions or pickup grooming notes">${escapeHtml(stay.stayNotes || "")}</textarea></label>
      <div class="button-row"><button type="submit">${isEdit ? "Save Boarding Stay" : "Add Boarding Stay"}</button></div>
    </form>`;
}

function boardingSchedulePopupHtml(record = {}) {
  const staysHtml = (record.stays || []).length
    ? (record.stays || []).map((stay) => `<article class="record-card"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><div class="chip-row">${boardingStayStatusChipHtml(record, stay)}</div><p>${escapeHtml((stay.requests || []).join(", ") || "No service requests")}</p><p>${escapeHtml(stay.bathPlan || "")}</p><p>${escapeHtml(stay.stayNotes || "")}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay-popup" data-dog-id="${escapeHtml(record.id)}" data-id="${escapeHtml(stay.id)}">Edit Stay</button></div></article>`).join("")
    : "<p>No boarding stays logged yet.</p>";
  return `${boardingStayFormHtml(record)}<section class="popup-record-section"><h3>Boarding stays</h3>${staysHtml}</section>`;
}

function openBoardingSchedulePopup(record = activeBoardingDog()) {
  if (!record?.id) {
    showToast("Save the boarding dog first.");
    return;
  }
  showDetailDialog(`${record.dogName || "Boarding Dog"} Boarding Request`, boardingSchedulePopupHtml(record));
}

function openOwnerUpdateAlert(recordId) {
  const record = readRecords("boardingDog").find((item) => item.id === recordId && !item.removed);
  if (!record) return;
  showDetailDialog(
    `${record.dogName || "Boarding Dog"} Owner Update`,
    `<article class="record-card compact-record-card"><strong>${escapeHtml(record.dogName || "Boarding dog")}</strong><p>${escapeHtml([record.ownerName, record.ownerPhone, record.ownerEmail].filter(Boolean).join(" | "))}</p><p>${escapeHtml(record.dailyActivity || "Owner update is marked as needed.")}</p></article>
    <form id="ownerUpdatePopupForm" class="tracker-form" data-id="${escapeHtml(record.id)}">
      <label>Daily activity update for owner<textarea name="dailyActivity" rows="4" placeholder="Eating, potty, play, exercise, mood, photos/videos taken">${escapeHtml(record.dailyActivity || "")}</textarea></label>
      <label class="inline-check"><input type="checkbox" name="clearOwnerUpdate" checked /> Clear owner update alert after saving</label>
      <div class="button-row"><button type="submit">Save Owner Update</button><button type="button" class="secondary-button" data-action="open-boarding-editor" data-id="${escapeHtml(record.id)}">Open Boarding Dog</button></div>
    </form>`,
  );
}

function openBoardingStayPopup(record = activeBoardingDog(), stayId = "") {
  if (!record?.id) return;
  const stay = (record.stays || []).find((item) => item.id === stayId) || {};
  showDetailDialog(`${record.dogName || "Boarding Dog"} Boarding Request`, boardingStayFormHtml(record, stay));
}

function boardingFoodInstructions(record = {}) {
  return record.foodInstructions || record.foodAmount || record.feedingInstructions || record.feedingPlan || "";
}

function boardingCheckInServices(record = {}, addedServices = []) {
  const stay = boardingStatusTargetStay(record, "Checked In") || {};
  const requested = (stay.requests || []).map((label) => ({ label, source: "requested" }));
  const added = (addedServices || []).map((service) => ({
    label: `${service.serviceName}${Number(service.quantity || 1) > 1 ? ` x${service.quantity}` : ""} - ${money(Number(service.unitPrice || 0) * Number(service.quantity || 1))}`,
    source: "added",
  }));
  return [...requested, ...added];
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

function captureBoardingCheckInState(formEl = $("#boardingCheckInForm")) {
  if (!formEl || !pendingBoardingCheckIn) return pendingBoardingCheckIn || {};
  pendingBoardingCheckIn.formValues = {
    belongings: formEl.elements.belongings?.value || "",
    foodInstructions: formEl.elements.foodInstructions?.value || "",
  };
  return pendingBoardingCheckIn;
}

function boardingCheckInPhotoHtml(record = {}) {
  const photo = boardingDogPhotoSource(record);
  const name = record.dogName || "Boarding dog";
  return `
    <label class="dog-profile-editor checkin-photo-editor" for="boardingCheckInPhotoInput">
      <span class="dog-photo-picker" role="button" tabindex="0">
        <img id="boardingCheckInPhotoPreview" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" ${photo ? "" : "hidden"} />
        <span id="boardingCheckInPhotoInitials" ${photo ? "hidden" : ""}>${escapeHtml(avatarText(name))}</span>
      </span>
      <span>
        <strong>${escapeHtml(name)}</strong>
        <small>${photo ? "Tap to update the profile photo." : "Tap to upload or take a profile photo."}</small>
      </span>
      <input class="visually-hidden-file" id="boardingCheckInPhotoInput" type="file" name="profilePhoto" accept="image/jpeg,image/png,.jpg,.jpeg,.png" />
    </label>`;
}

function boardingCheckInHtml(record = {}, nextStatus = "Checked In", options = {}, state = {}) {
  const stay = boardingStatusTargetStay(record, nextStatus) || {};
  const formValues = state.formValues || {};
  const addedServices = state.addedServices || [];
  const serviceRows = boardingCheckInServices(record, addedServices);
  const foodInstructions = formValues.foodInstructions ?? boardingFoodInstructions(record);
  const belongings = formValues.belongings || stay.checkIn?.belongings || "";
  const serviceHtml = serviceRows.length
    ? `<div class="checkin-service-list">${serviceRows.map((item) => `<article class="record-card compact-record-card"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.source === "added" ? "Added during check-in" : "Requested by owner")}</span></article>`).join("")}</div>`
    : "";
  return `
    <form id="boardingCheckInForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}" data-next-status="${escapeHtml(nextStatus)}" data-allow-early="${options.allowEarly ? "true" : "false"}" data-early="${options.early ? "true" : "false"}">
      ${boardingCheckInPhotoHtml(record)}
      <div class="field-grid">
        <label>Owner name<input type="text" value="${escapeHtml(record.ownerName || "")}" readonly /></label>
        <label>Owner phone<input type="tel" value="${escapeHtml(record.ownerPhone || "")}" readonly /></label>
        <label>Drop-off<input type="text" value="${escapeHtml(formatDateTime(stay.dropoffTime) || "Not scheduled")}" readonly /></label>
        <label>Pick-up<input type="text" value="${escapeHtml(formatDateTime(stay.pickupTime) || "Not scheduled")}" readonly /></label>
      </div>
      <label>Food instructions<textarea name="foodInstructions" rows="3" placeholder="Food amount, feeding schedule, medication with meals">${escapeHtml(foodInstructions)}</textarea></label>
      <label>Dog's belongings<textarea name="belongings" rows="3" required placeholder="Leash, collar, food, treats, bowls, medication, toys">${escapeHtml(belongings)}</textarea></label>
      <section class="popup-record-section">
        <h3>Requested services</h3>
        ${serviceHtml}
        <div class="button-row"><button type="button" class="secondary-button" data-action="open-checkin-service-picker">Add service</button></div>
      </section>
      <div class="button-row"><button type="submit">Submit Check-In</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>`;
}

function openBoardingCheckInPopup(record = {}, nextStatus = "Checked In", options = {}, state = {}) {
  if (!record?.id) return;
  const existingState = pendingBoardingCheckIn?.dogId === record.id ? pendingBoardingCheckIn : {};
  pendingBoardingCheckIn = {
    dogId: record.id,
    nextStatus,
    options: { ...options },
    addedServices: state.addedServices || existingState.addedServices || [],
    formValues: state.formValues || existingState.formValues || {},
  };
  showDetailDialog(`${record.dogName || "Boarding Dog"} Check-In`, boardingCheckInHtml(record, nextStatus, options, pendingBoardingCheckIn));
}

function boardingCheckInServicePickerHtml(record = {}) {
  const services = activeCheckInServices();
  const selectedIds = new Set((pendingBoardingCheckIn?.addedServices || []).map((service) => service.id));
  return `
    <form id="boardingCheckInServiceForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
      <section class="popup-record-section">
        <h3>Add service to this stay</h3>
        ${services.length ? services.map((service) => {
          const checked = selectedIds.has(service.id);
          const current = (pendingBoardingCheckIn?.addedServices || []).find((item) => item.id === service.id);
          return `<label class="service-option"><span><input type="checkbox" name="checkInServices" value="${escapeHtml(service.id)}" ${checked ? "checked" : ""} /> ${escapeHtml(service.serviceName || "Service")} - ${money(service.basePrice)} ${escapeHtml(service.unit || "")}</span><input class="service-quantity" type="number" name="serviceQuantity-${escapeHtml(service.id)}" min="1" step="1" value="${escapeHtml(current?.quantity || 1)}" ${checked ? "" : "disabled"} /></label>`;
        }).join("") : "<p>No active service items are available.</p>"}
      </section>
      <div class="button-row"><button type="submit">Add Selected Services</button><button type="button" class="secondary-button" data-action="return-to-checkin">Back</button></div>
    </form>`;
}

function openBoardingCheckInServicePicker() {
  const state = captureBoardingCheckInState();
  const record = boardingDogRecordForDisplay(state?.dogId);
  if (!record) return;
  showDetailDialog("Add Service", boardingCheckInServicePickerHtml(record));
}

async function submitBoardingCheckInServiceForm(formEl) {
  if (!pendingBoardingCheckIn) return;
  const record = boardingDogRecordForDisplay(pendingBoardingCheckIn.dogId);
  if (!record) return;
  const selected = checkedFrom(formEl, "checkInServices")
    .map((id) => {
      const service = readRecords("service").find((item) => item.id === id);
      if (!service) return null;
      return checkInServiceSnapshot(service, formEl.elements[`serviceQuantity-${id}`]?.value || 1);
    })
    .filter(Boolean);
  pendingBoardingCheckIn.addedServices = selected;
  openBoardingCheckInPopup(record, pendingBoardingCheckIn.nextStatus, pendingBoardingCheckIn.options, pendingBoardingCheckIn);
}

function previewBoardingCheckInPhoto(input) {
  const file = input.files?.[0];
  if (!file || !isSupportedDogPhoto(file)) {
    if (file) showToast("Use a JPG or PNG dog photo.");
    input.value = "";
    return;
  }
  const preview = $("#boardingCheckInPhotoPreview");
  const initials = $("#boardingCheckInPhotoInitials");
  if (!preview) return;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  if (initials) initials.hidden = true;
}

async function submitBoardingCheckIn(formEl) {
  if (!validateForm(formEl)) return;
  const record = boardingDogRecordForDisplay(formEl.dataset.id);
  if (!record) return;
  const targetStay = boardingStatusTargetStay(record, "Checked In");
  if (!targetStay) {
    showToast("Add a boarding stay before checking this dog in.");
    return;
  }
  const data = formPayload(formEl);
  const timestamp = new Date().toISOString();
  const addedServices = pendingBoardingCheckIn?.addedServices || [];
  const checkInPhoto = $("#boardingCheckInPhotoInput")?.files?.[0] || null;
  let profilePhotoUrl = record.profilePhotoUrl || "";
  let profilePhotoData = record.profilePhotoData || "";
  if (checkInPhoto) {
    try {
      const { url, error } = await uploadDogPhotoToSupabase(checkInPhoto, record.id);
      if (error || !url) throw new Error(error || "The profile photo could not be uploaded.");
      profilePhotoUrl = url;
      profilePhotoData = "";
      await addAuditLog("Uploaded boarding dog profile photo", "boardingDog", record, record.dogName || "");
    } catch (error) {
      showToast(`Photo upload failed: ${error.message}`);
      return;
    }
  }
  const foodInstructions = data.foodInstructions || boardingFoodInstructions(record);
  const checkInDetails = {
    belongings: data.belongings,
    foodInstructions,
    requestedServices: targetStay.requests || [],
    addedServices,
    addedServiceLabels: addedServices.map((service) => `${service.serviceName}${Number(service.quantity || 1) > 1 ? ` x${service.quantity}` : ""} requested`),
    verifiedAt: timestamp,
    verifiedBy: currentUser?.name || helperName?.value || "",
    verifiedByEmail: currentUser?.email || helperEmail?.value || "",
  };
  const prepared = {
    ...record,
    foodInstructions,
    profilePhotoUrl,
    profilePhotoData,
    updatedAt: timestamp,
  };
  const updated = await saveBoardingStatusTransition(prepared, formEl.dataset.nextStatus || "Checked In", {
    allowEarly: formEl.dataset.allowEarly === "true",
    early: formEl.dataset.early === "true",
    checkInSubmitted: true,
    checkInDetails,
  });
  if (!updated) return;
  await addAuditLog("Checked in boarding dog", "boardingDog", updated, `${updated.dogName || "Dog"} belongings: ${data.belongings || "none"}`);
  if (addedServices.length) {
    await addAuditLog("Added check-in service", "boardingDog", updated, addedServices.map((service) => `${service.serviceName} x${service.quantity}`).join(", "));
  }
  pendingBoardingCheckIn = null;
  showDetailDialog("Check-In Complete", `<p>${escapeHtml(updated.dogName || "Boarding dog")} has been checked in.</p><p>Belongings: ${escapeHtml(data.belongings || "None listed")}</p>`);
}

async function saveBoardingStayFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const dog = boardingDogRecordForDisplay(formEl.dataset.dogId) || activeBoardingDog();
  if (!dog) {
    showToast("Save the boarding dog first.");
    return null;
  }
  const payload = formPayload(formEl);
  const existingStay = (dog.stays || []).find((stay) => stay.id === payload.stayId);
  const timestamp = new Date().toISOString();
  const existingStayStatus = normalizeBoardingStatus({ boardingStatus: existingStay?.status || "" });
  const shouldAutoApproveStay = !existingStay || (!dog.customerRequest && existingStayStatus === "Pending");
  const stay = {
    ...existingStay,
    id: payload.stayId || uid("stay"),
    createdAt: existingStay?.createdAt || timestamp,
    updatedAt: timestamp,
    source: existingStay?.source || "staff-admin",
    status: shouldAutoApproveStay ? "Approved" : existingStay?.status || "Approved",
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    requests: checkedFrom(formEl, "stayRequests"),
    stayNotes: payload.stayNotes,
  };
  stay.bathPlan = bathPlanForStay(stay);
  const stays = [...(dog.stays || [])];
  const stayIndex = stays.findIndex((item) => item.id === stay.id);
  if (stayIndex >= 0) stays[stayIndex] = stay;
  else stays.unshift(stay);
  const currentDogStatus = normalizeBoardingStatus(dog);
  const statusUpdates = !existingStay && ["Pending", "Cancelled", "Checked Out"].includes(currentDogStatus)
    ? {
        boardingStatus: "Approved",
        statusHistory: [...(dog.statusHistory || []), { from: currentDogStatus, to: "Approved", date: timestamp, by: currentUser?.name || helperName?.value || "" }],
      }
    : {};
  const record = upsertRecord("boardingDog", { ...dog, ...statusUpdates, stays });
  await sendPayload(record);
  if ($("#boardingDogForm")?.elements.id.value === record.id) {
    renderBoardingStays(record);
    renderBoardingOwnerAccountPanel(record);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  return record;
}

function renderBoardingQuickCards(records = []) {
  const container = $("#boardingDogQuickCards");
  if (!container) return;
  const actionable = records
    .filter((record) => !["Cancelled", "Checked Out"].includes(normalizeBoardingStatus(record)))
    .sort((a, b) => boardingQuickSortTime(a) - boardingQuickSortTime(b));
  container.innerHTML = actionable.length
    ? actionable.map(boardingQuickCardHtml).join("")
    : `<article class="record-card mobile-roster-card"><strong>No boarding actions</strong><p>No active check-ins or check-outs match this view.</p></article>`;
}

async function linkBoardingDogOwnerAccount(record = {}) {
  if (!record?.id) return;
  const ownerEmail = String(record.ownerEmail || "").trim().toLowerCase();
  if (!ownerEmail) {
    showToast("Add an owner email before creating a customer login link.");
    return;
  }
  const timestamp = new Date().toISOString();
  const existingCustomerDog = linkedCustomerDogForBoarding(record) || {};
  const customerDog = upsertRecord("customerDog", {
    ...existingCustomerDog,
    type: "customerDog",
    id: existingCustomerDog.id || uid("customerDog"),
    submittedAt: existingCustomerDog.submittedAt || timestamp,
    dogName: record.dogName || existingCustomerDog.dogName || "Boarding dog",
    breedDescription: record.breedDescription || existingCustomerDog.breedDescription || "",
    sex: record.sex || existingCustomerDog.sex || "Unknown",
    spayNeuterStatus: record.spayNeuterStatus || existingCustomerDog.spayNeuterStatus || "Unknown",
    ownerName: record.ownerName || existingCustomerDog.ownerName || "",
    ownerPhone: record.ownerPhone || existingCustomerDog.ownerPhone || "",
    ownerEmail,
    customerEmail: ownerEmail,
    emergencyName: record.emergencyName || existingCustomerDog.emergencyName || "",
    emergencyPhone: record.emergencyPhone || existingCustomerDog.emergencyPhone || "",
    vetInfo: record.vetInfo || existingCustomerDog.vetInfo || "",
    rabiesDate: record.rabiesDate || existingCustomerDog.rabiesDate || "",
    dhppDate: record.dhppDate || existingCustomerDog.dhppDate || "",
    bordetellaDate: record.bordetellaDate || existingCustomerDog.bordetellaDate || "",
    heartwormDate: record.heartwormDate || existingCustomerDog.heartwormDate || "",
    specialCare: record.specialCare || existingCustomerDog.specialCare || "",
    profilePhotoUrl: record.profilePhotoUrl || existingCustomerDog.profilePhotoUrl || "",
    profilePhotoData: existingCustomerDog.profilePhotoData || record.profilePhotoData || "",
    linkedBoardingDogId: record.id,
    sourceBoardingDogId: record.id,
    sourceType: "boardingDog",
    removed: false,
  });
  await sendPayload(customerDog);

  const existingUser = ownerAccountForBoarding(record) || {};
  const linkedCustomerDogIds = [...new Set([...(existingUser.linkedCustomerDogIds || []), customerDog.id].filter(Boolean))];
  const linkedBoardingDogIds = [...new Set([...(existingUser.linkedBoardingDogIds || []), record.id].filter(Boolean))];
  const userRecord = upsertRecord("settingsUser", {
    ...existingUser,
    type: "settingsUser",
    id: existingUser.id || uid("settingsUser"),
    submittedAt: existingUser.submittedAt || timestamp,
    name: existingUser.name || record.ownerName || ownerEmail,
    email: ownerEmail,
    role: "customer",
    authProvider: existingUser.authProvider || "customer-signup",
    linkedCustomerDogIds,
    linkedBoardingDogIds,
    removed: false,
  });
  await sendPayload(userRecord);

  const updated = upsertRecord("boardingDog", {
    ...record,
    linkedCustomerDogId: customerDog.id,
    linkedOwnerEmail: ownerEmail,
    ownerAccountStatus: "linked",
    ownerAccountLinkedAt: timestamp,
  });
  await sendPayload(updated);
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerDogs();
  renderCustomerRequests();
  renderSettingsUsers();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    openBoardingDog(updated);
  }
  showDetailDialog("Customer Login Prepared", `<p>${escapeHtml(record.ownerName || ownerEmail)} can sign up or sign in with ${escapeHtml(ownerEmail)}. Snuggle Stay will link that customer account to ${escapeHtml(customerDog.dogName || record.dogName || "this dog")}.</p><p>This boarding dog can still have stays added by staff or admin even if the owner has not logged in yet.</p>`);
}

function boardingDogIdentityKey(record = {}) {
  const dogName = String(record.dogName || record.callName || record.showName || "").trim().toLowerCase();
  if (!dogName) return "";
  const ownerEmails = boardingOwnerEmails(record).join("|");
  const ownerPhone = String(record.ownerPhone || record.phone || "").replace(/\D/g, "");
  const ownerName = String(record.ownerName || "").trim().toLowerCase();
  const ownerKey = ownerEmails || ownerPhone || ownerName;
  return ownerKey ? `${dogName}|${ownerKey}` : "";
}

function boardingStatusPriority(record = {}) {
  const priorities = {
    "In Kennel": 70,
    "Checked In": 60,
    "Ready For Pickup": 50,
    Approved: 40,
    Pending: 30,
    "Checked Out": 20,
    Cancelled: 10,
  };
  return priorities[normalizeBoardingStatus(record)] || 0;
}

function boardingRecordSortTime(record = {}) {
  const stay = currentOrNextStay(record) || activeBoardingStay(record) || (record.stays || [])[0] || {};
  const value = record.updatedAt || stay.updatedAt || stay.dropoffTime || record.submittedAt || 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function chooseBoardingProfilePrimary(records = []) {
  return [...records].sort((a, b) => {
    const priorityDiff = boardingStatusPriority(b) - boardingStatusPriority(a);
    if (priorityDiff) return priorityDiff;
    const activeDiff = Number(Boolean(activeBoardingStay(b) || currentOrNextStay(b))) - Number(Boolean(activeBoardingStay(a) || currentOrNextStay(a)));
    if (activeDiff) return activeDiff;
    return boardingRecordSortTime(b) - boardingRecordSortTime(a);
  })[0] || {};
}

function itemSortTime(item = {}) {
  const value = item.updatedAt || item.createdAt || item.savedAt || item.submittedAt || item.dropoffTime || item.created || 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function mergeObjectList(records = [], property = "", keyForItem = (item) => item.id || JSON.stringify(item)) {
  const byKey = new Map();
  records.forEach((record) => {
    arrayValue(record[property]).forEach((item) => {
      const key = keyForItem(item);
      if (!key) return;
      const existing = byKey.get(key);
      if (!existing || itemSortTime(item) >= itemSortTime(existing)) byKey.set(key, item);
    });
  });
  return [...byKey.values()];
}

function mergePrimitiveList(records = [], property = "") {
  return [...new Set(records.flatMap((record) => arrayValue(record[property])).filter(Boolean))];
}

function mergeBoardingProfileGroup(records = []) {
  if (records.length <= 1) return records[0] || {};
  const primary = chooseBoardingProfilePrimary(records);
  const merged = {
    ...primary,
    sourceRecordIds: [...new Set(records.map((record) => record.id).filter(Boolean))],
    duplicateProfileIds: [...new Set(records.map((record) => record.id).filter((id) => id && id !== primary.id))],
    stays: mergeObjectList(records, "stays", (stay) => stay.id || `${stay.dropoffTime || ""}|${stay.pickupTime || ""}|${stay.status || ""}`)
      .sort((a, b) => new Date(b.dropoffTime || b.updatedAt || 0) - new Date(a.dropoffTime || a.updatedAt || 0)),
    statusHistory: mergeObjectList(records, "statusHistory", (item) => item.id || `${item.date || ""}|${item.from || ""}|${item.to || ""}|${item.by || ""}`)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    vaccinationRecords: mergeObjectList(records, "vaccinationRecords", (item) => item.id || item.url || item.dataUrl || item.name || JSON.stringify(item)),
    customerUpdates: mergeObjectList(records, "customerUpdates", (item) => item.id || `${item.createdAt || item.submittedAt || ""}|${item.note || ""}`),
    requestedServices: mergeObjectList(records, "requestedServices", (item) => item.id || `${item.serviceName || ""}|${item.quantity || ""}|${item.unitPrice || ""}`),
    flags: mergePrimitiveList(records, "flags"),
  };
  [
    "dogName", "breedDescription", "dateOfBirth", "profilePhotoUrl", "profilePhotoData", "sex", "spayNeuterStatus",
    "ownerName", "ownerPhone", "ownerEmail", "customerEmail", "linkedOwnerEmail", "secondaryOwnerEmail",
    "emergencyName", "emergencyPhone", "vetInfo", "foodInstructions", "specialCare", "boardingHistory",
    "rabiesDate", "dhppDate", "bordetellaDate", "heartwormDate", "vaccinationFiles",
  ].forEach((field) => {
    if (merged[field]) return;
    const fallback = records.find((record) => record[field]);
    if (fallback) merged[field] = fallback[field];
  });
  return merged;
}

function consolidatedBoardingDogRecords(records = readRecords("boardingDog").filter((record) => !record.removed)) {
  const groups = new Map();
  const ungrouped = [];
  records.forEach((record) => {
    const item = { ...record, sourceType: "boardingDog" };
    const key = boardingDogIdentityKey(item);
    if (!key) {
      ungrouped.push(item);
      return;
    }
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return [...groups.values()].map(mergeBoardingProfileGroup).concat(ungrouped);
}

function boardingDogRecordForDisplay(id = "") {
  if (!id) return null;
  return consolidatedBoardingDogRecords().find((record) => record.id === id || (record.sourceRecordIds || []).includes(id))
    || readRecords("boardingDog").find((record) => record.id === id && !record.removed)
    || null;
}

function findMatchingBoardingDogProfile(record = {}, options = {}) {
  const key = boardingDogIdentityKey(record);
  if (!key) return null;
  return consolidatedBoardingDogRecords()
    .filter((item) => item.id !== options.excludeId && !(item.sourceRecordIds || []).includes(options.excludeId))
    .find((item) => boardingDogIdentityKey(item) === key) || null;
}

function renderBoardingDogs() {
  const query = $("#boardingDogSearch").value || "";
  const allRecords = consolidatedBoardingDogRecords();
  renderBoardingRosterTabs(allRecords);
  renderBoardingQueueGroups(allRecords);
  const matchingRecords = allRecords.filter((record) => matches(record, query));
  const records = sortRecordsForTable(
    "boardingDog",
    matchingRecords.filter((record) => boardingDogMatchesRosterFilter(record)),
  );
  const columns = activeColumns("boardingDog");
  $("#boardingDogTableHead").innerHTML = `<tr>${columns.map((column) => `<th data-sort-column="${column.key}" data-table="boardingDog" data-column="${column.key}" draggable="true" title="Drag to reorder. Double-click to sort.">${escapeHtml(column.label)}</th>`).join("")}<th>Actions</th></tr>`;
  $("#boardingDogTableBody").innerHTML = records.length
    ? records
        .map((record) => {
          return `<tr data-id="${record.id}" data-source="${escapeHtml(record.sourceType || record.type || "boardingDog")}">${columns.map((column) => `<td>${escapeHtml(column.value(record))}</td>`).join("")}<td><div class="record-actions table-actions">${dogTypeBadgeHtml("boardingDog")}${boardingStatusChipHtml(record)}<button type="button" class="secondary-button" data-action="change-boarding" data-id="${escapeHtml(record.id)}">View/Edit</button>${boardingOwnerLinkButtonHtml(record)}</div></td></tr>`;
        })
        .join("")
    : `<tr><td colspan="${(columns.length || 1) + 1}">No ${escapeHtml(boardingRosterFilterLabel(boardingDogRosterFilter)).toLowerCase()} match this search.</td></tr>`;
  renderBoardingQuickCards(matchingRecords);
  renderColumnManager("boardingDog", "#boardingDogColumnManager");
  renderCustomerDogUploadCards();
}

async function saveBoardingStatusTransition(record = {}, nextStatus = "", options = {}) {
  if (nextStatus === "Checked In" && !options.checkInSubmitted) {
    openBoardingCheckInPopup(record, nextStatus, options);
    return null;
  }
  if (nextStatus === "In Kennel" && !options.kennelLocation) {
    openKennelAssignmentPopup(record, nextStatus, options);
    return null;
  }
  const transitioned = withBoardingStatusTransition(record, nextStatus, options);
  if (!transitioned) {
    showToast("That boarding status transition is not allowed.");
    return null;
  }
  const updated = upsertRecord("boardingDog", transitioned);
  await sendPayload(updated);
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    setDogPhoto("boarding", updated);
  }
  showToast(`Boarding status updated to ${nextStatus}.`);
  return updated;
}

function dogRosterKey(record) {
  return `${record.dogName || record.callName || record.showName || ""}|${record.ownerEmail || record.ownerPhone || record.ownerName || record.sourceType || ""}`.toLowerCase();
}

function combinedBoardingDogRecords() {
  const records = readRecords("boardingDog")
    .filter((record) => !record.removed && !["Cancelled", "Checked Out"].includes(normalizeBoardingStatus(record)))
    .map((record) => ({ ...record, sourceType: "boardingDog" }));
  const seen = new Set(records.map(dogRosterKey));
  readRecords("customerDog")
    .filter((dog) => !dog.removed && dog.dogName)
    .forEach((dog) => {
      const mapped = {
        ...dog,
        type: "customerDog",
        sourceType: "customerDog",
        dogTypeLabel: "Customer Dog",
        dogName: dog.dogName,
        flags: [],
        stays: [],
        boardingStatus: "",
      };
      const key = dogRosterKey(mapped);
      if (!seen.has(key)) {
        seen.add(key);
        records.push(mapped);
      }
    });
  readRecords("ownedDog")
    .filter((dog) => !dog.removed && (dog.callName || dog.showName))
    .forEach((dog) => {
      const mapped = {
        ...dog,
        type: "ownedDog",
        sourceType: "ownedDog",
        dogTypeLabel: "Our Dog",
        dogName: dog.callName || dog.showName,
        breedDescription: dog.showName || dog.breedDescription || "",
        ownerName: "Central Texas Husky",
        ownerPhone: "",
        ownerEmail: "",
        emergencyName: "",
        emergencyPhone: "",
        flags: [],
        stays: [],
        boardingStatus: "",
      };
      const key = dogRosterKey(mapped);
      if (!seen.has(key)) {
        seen.add(key);
        records.push(mapped);
      }
    });
  return records;
}

function renderBoardingRequests() {
  const list = $("#boardingRequestRecords");
  if (!list) return;
  const statusFilter = $("#boardingRequestStatusFilter")?.value || "All";
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => record.customerRequest)
    .filter((record) => !record.removed)
    .filter((record) => statusFilter === "All" || normalizeBoardingStatus(record) === statusFilter))
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  list.innerHTML = records.length
    ? records
        .map((record) => {
          const stay = record.stays?.[0] || {};
          const services = stay.requests?.length ? stay.requests.join(", ") : "No added services";
          const status = normalizeBoardingStatus(record);
          const approveAction = status === "Cancelled" ? `<button type="button" class="secondary-button" data-action="approve-boarding" data-id="${escapeHtml(record.id)}">Approve</button>` : "";
          const actions = `<div class="record-actions"><button type="button" class="secondary-button" data-action="change-boarding" data-id="${record.id}">Change</button>${approveAction}</div>${boardingTransitionActions(record)}`;
          return `<article class="record-card clickable-card" data-id="${record.id}" data-action="view-boarding-request"><strong>${escapeHtml(record.dogName || "Dog")}</strong><div class="chip-row">${dogTypeBadgeHtml("boardingDog")}${boardingStatusChipHtml(record)}</div><span>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</span><p>${escapeHtml(services)}</p>${record.estimatedTotal ? `<p><strong>Estimated total:</strong> ${money(record.estimatedTotal)}</p>` : ""}${actions}</article>`;
        })
        .join("")
    : `<p>No ${statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}boarding requests yet.</p>`;
}

function renderCustomerDogUploadCards() {
  const list = $("#customerDogUploadCards");
  if (!list) return;
  const records = readRecords("customerDog")
    .filter((record) => !record.removed)
    .filter((record) => record.profilePhotoUrl || record.vaccinationRecords?.length || record.vaccinationFiles)
    .sort((a, b) => String(a.dogName || "").localeCompare(String(b.dogName || "")));
  list.innerHTML = records.length
    ? records
        .map((record) => {
          const boardingRecord = boardingDogForCustomerDog(record);
          const boardingAction = boardingRecord
            ? `<button type="button" class="secondary-button" data-action="open-linked-boarding-dog" data-id="${escapeHtml(boardingRecord.id)}">Open boarding record</button>`
            : `<button type="button" class="secondary-button" data-action="create-boarding-from-customer-dog" data-id="${escapeHtml(record.id)}">Create boarding profile</button>`;
          return `<article class="record-card compact-record-card"><strong>${escapeHtml(record.dogName || "Customer dog")}</strong><span>${escapeHtml(record.ownerName || record.ownerEmail || record.customerEmail || "Customer")}</span><p>${escapeHtml(record.breedDescription || "")}</p>${mediaLinkHtml(record)}<div class="record-actions">${boardingAction}</div></article>`;
        })
        .join("")
    : "<p>No customer-uploaded dog files are saved yet.</p>";
}

function statusClassForRequest(status = "") {
  const normalized = boardingLifecycleStatuses.includes(status) ? status : normalizeBoardingStatus({ boardingStatus: status });
  if (["Approved", "Checked In", "In Kennel", "Ready For Pickup"].includes(normalized)) return "is-approved";
  if (normalized === "Pending") return "is-pending";
  if (["Cancelled", "Checked Out"].includes(normalized)) return "is-cancelled";
  return "";
}

function inactiveBoardingStayStatus(stay = {}) {
  const status = String(stay.status || "").trim();
  if (!status) return false;
  const normalized = boardingLifecycleStatuses.includes(status) ? status : normalizeBoardingStatus({ boardingStatus: status });
  return ["Cancelled", "Checked Out"].includes(normalized);
}

function activeBoardingStay(record = {}, date = new Date()) {
  const now = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(now.getTime())) return null;
  return (record.stays || []).find((stay) => {
    if (inactiveBoardingStayStatus(stay)) return false;
    const dropoff = new Date(stay.dropoffTime);
    const pickup = new Date(stay.pickupTime);
    if (Number.isNaN(dropoff.getTime()) || Number.isNaN(pickup.getTime())) return false;
    return dropoff <= now && pickup >= now;
  }) || null;
}

function currentOrNextStay(record) {
  const now = new Date();
  return activeBoardingStay(record, now) || [...(record.stays || [])]
    .filter((stay) => !inactiveBoardingStayStatus(stay))
    .sort((a, b) => new Date(a.dropoffTime) - new Date(b.dropoffTime))
    .find((stay) => new Date(stay.pickupTime) >= now) || null;
}

function isCurrentlyBoarding(record) {
  return Boolean(activeBoardingStay(record));
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
  const heatButton = $('#ownedDogProfileTabs [data-owned-profile-tab="Heat Cycle"]');
  if (heatButton) heatButton.disabled = !female;
  if ($("#ownedMaleHeatNote")) $("#ownedMaleHeatNote").hidden = female;
  if (!female && heatButton?.classList.contains("is-active")) setOwnedDogActiveTab("Overview");
  updateOwnedDogConditionalFields();
}

function setBoardingDogActiveTab(tabName = "Dog Info") {
  const tabs = $$("#boardingDogProfileTabs [data-boarding-profile-tab]");
  const sections = $$(".boarding-profile-section[data-boarding-profile-section]");
  const availableTab = tabs.find((button) => button.dataset.boardingProfileTab === tabName && !button.disabled)?.dataset.boardingProfileTab || "Dog Info";
  tabs.forEach((button) => button.classList.toggle("is-active", button.dataset.boardingProfileTab === availableTab));
  sections.forEach((section) => {
    const isActive = section.dataset.boardingProfileSection === availableTab;
    if (section.id === "boardingSchedulePanel" && !activeBoardingDog()?.id) {
      section.hidden = true;
      return;
    }
    section.hidden = !isActive;
  });
}

function renderBoardingVaccinationFiles(record = activeBoardingDog() || {}) {
  const list = $("#boardingDogVaccinationList");
  if (!list) return;
  const files = record.vaccinationRecords || [];
  list.innerHTML = files.length
    ? files.map((file) => `<article class="record-card compact-record-card"><strong>${escapeHtml(file.name || "Health record")}</strong><span>${escapeHtml(formatDateTime(file.savedAt || file.createdAt))}</span>${file.note ? `<p>${escapeHtml(file.note)}</p>` : ""}<div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="${escapeHtml(file.url || file.dataUrl || "")}" data-media-type="${escapeHtml(file.type || "")}" data-media-name="${escapeHtml(file.name || "Health record")}">Open</button></div></article>`).join("")
    : `<article class="record-card compact-record-card"><strong>No health records uploaded yet.</strong><p>Choose files in this tab, then save the dog profile.</p></article>`;
}

function customerUpdateMediaHtml(update = {}) {
  const items = update.mediaItems || [];
  return items.map((item) => `<button type="button" class="media-preview-button secondary-button" data-action="view-media" data-src="${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="${escapeHtml(item.type || "image/jpeg")}" data-media-name="${escapeHtml(item.name || "Customer update photo")}">Open photo</button>`).join("");
}

function renderBoardingCustomerUpdates(record = activeBoardingDog() || {}) {
  const list = $("#boardingCustomerUpdateList");
  if (!list) return;
  const updates = [...(record.customerUpdates || [])].sort((a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0));
  list.innerHTML = updates.length
    ? updates.map((update) => `<article class="record-card compact-record-card"><strong>${escapeHtml(formatDateTime(update.createdAt || update.submittedAt) || "Customer update")}</strong><span>${escapeHtml(update.byName || update.by || "Staff update")}</span><p>${escapeHtml(update.note || "")}</p><div class="record-actions">${customerUpdateMediaHtml(update)}</div></article>`).join("")
    : `<article class="record-card compact-record-card"><strong>No customer updates sent yet.</strong><p>Use this tab to add notes or photos customers can review.</p></article>`;
}

async function addBoardingCustomerUpdate() {
  const record = activeBoardingDog();
  if (!record?.id) {
    showToast("Save the boarding dog before adding customer updates.");
    return null;
  }
  const formEl = $("#boardingDogForm");
  const note = formEl?.elements.dailyActivity?.value.trim() || "";
  const input = $("#boardingCustomerUpdatePhotoInput");
  if (!note && !input?.files?.length) {
    showToast("Add a note or photo before saving a customer update.");
    return null;
  }
  const timestamp = new Date().toISOString();
  const mediaItems = await uploadMediaFiles(input, `boarding-customer-updates/${record.id}`, {
    allowedTypes: IMAGE_UPLOAD_TYPES,
    allowedExtensions: [".jpg", ".jpeg", ".png"],
    label: "customer update photo",
  });
  const stay = activeBoardingStay(record) || currentOrNextStay(record) || {};
  const update = {
    id: uid("customerUpdate"),
    createdAt: timestamp,
    stayId: stay.id || "",
    note,
    mediaItems,
    byName: currentUser?.name || helperName?.value || "",
    byEmail: currentUser?.email || helperEmail?.value || "",
  };
  const updated = upsertRecord("boardingDog", {
    ...record,
    dailyActivity: note || record.dailyActivity || "",
    customerUpdates: [update, ...(record.customerUpdates || [])],
  });
  await sendPayload(updated);
  await addAuditLog("Added customer boarding update", "boardingDog", updated, `${updated.dogName || "Dog"} | ${note || mediaItems.map((item) => item.name).join(", ")}`);
  if (input) input.value = "";
  renderBoardingCustomerUpdates(updated);
  renderBoardingDogs();
  renderCustomerRequests();
  showToast("Customer update saved.");
  return updated;
}

function openOwnedDog(record = {}) {
  $("#ownedDogDetail").hidden = false;
  selectedDogPhotos.owned = null;
  $("#ownedDogDetailTitle").textContent = record.id ? `Edit ${record.callName || "Dog"}` : "Add New Dog";
  $("#ourDogForm").reset();
  const normalized = normalizeOwnedDogCare(record);
  setFormValues($("#ourDogForm"), normalized);
  $("#ourDogForm").elements.id.value = record.id || "";
  setDogPhoto("owned", normalized);
  $("#ownedDogActivityPanel").hidden = !record.id;
  renderOwnedActivity(normalized);
  renderOwnedDogFiles(normalized);
  renderOwnedDogTimeline(normalized);
  updateOwnedDogConditionalFields();
  syncOwnedDogTabAvailability(normalized);
  setOwnedDogActiveTab("Overview");
  setOwnedFormLocked(Boolean(record.id));
  $("#deleteOwnedDogButton").hidden = !record.id;
  window.scrollTo({ top: $("#ownedDogDetail").offsetTop - 12, behavior: "smooth" });
}

function resetBoardingDogFormForRecord(record = {}) {
  const formEl = $("#boardingDogForm");
  formEl.reset();
  [...formEl.elements].forEach((field) => {
    if (!field.name && field.type !== "file") return;
    if (field.type === "checkbox" || field.type === "radio") {
      field.checked = false;
      return;
    }
    if (field.type === "file") {
      field.value = "";
      return;
    }
    field.value = "";
  });
  selectedDogPhotos.boarding = null;
  setFormValues(formEl, record);
  formEl.elements.id.value = record.id || "";
  if (formEl.elements.profilePhotoUrl && !record.id) formEl.elements.profilePhotoUrl.value = "";
  if ($("#boardingDogPhotoInput")) $("#boardingDogPhotoInput").value = "";
  if ($("#boardingDogVaccinationFiles")) $("#boardingDogVaccinationFiles").value = "";
  if ($("#boardingCustomerUpdatePhotoInput")) $("#boardingCustomerUpdatePhotoInput").value = "";
}

function openBoardingDog(record = {}) {
  const boardingDogDetail = $("#boardingDogDetail");
  if (boardingDogDetail.parentElement !== document.body) {
    document.body.appendChild(boardingDogDetail);
  }
  boardingDogDetail.hidden = false;
  boardingDogDetail.scrollTop = 0;
  $("#boardingDogDetailTitle").textContent = record.id ? `Edit ${record.dogName || "Boarding Dog"}` : "Add Boarding Dog";
  resetBoardingDogFormForRecord(record);
  if ($("#boardingDogStatus")) $("#boardingDogStatus").value = record.id ? normalizeBoardingStatus(record) : "Approved";
  setDogPhoto("boarding", record);
  $("#boardingSchedulePanel").hidden = !record.id;
  renderBoardingOwnerAccountPanel(record);
  renderBoardingVaccinationFiles(record);
  renderBoardingCustomerUpdates(record);
  $$('input[name="boardingFlags"]').forEach((input) => {
    input.checked = (record.flags || []).includes(input.value);
  });
  renderBoardingStays(record);
  setBoardingFormLocked(Boolean(record.id));
  setBoardingDogActiveTab("Dog Info");
}

function setBoardingFormLocked(locked) {
  const formEl = $("#boardingDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (["editBoardingDogButton", "cancelBoardingDogEdit"].includes(field.id)) return;
    field.disabled = locked;
  });
  $("#boardingDogPhotoPicker").disabled = false;
  $("#boardingDogSaveButton").hidden = locked;
  $("#editBoardingDogButton").hidden = !locked;
  $("#openBoardingScheduleButton").hidden = !formEl.elements.id.value;
  $("#deleteBoardingDogButton").hidden = locked || !formEl.elements.id.value || currentRole() !== "admin";
  formEl.classList.toggle("is-readonly", locked);
  renderBoardingOwnerAccountPanel(activeBoardingDog());
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

function activeOwnedDog() {
  const id = $("#ourDogForm").elements.id.value;
  return readRecords("ownedDog").find((record) => record.id === id && !record.removed);
}

function activeBoardingDog(options = {}) {
  const id = $("#boardingDogForm").elements.id.value;
  const raw = readRecords("boardingDog").find((record) => record.id === id && !record.removed);
  return options.raw ? raw : boardingDogRecordForDisplay(id) || raw;
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
        .map(([group, items]) => `<section class="activity-group"><h3>${escapeHtml(group)}</h3>${items.map((log) => `<article class="record-card"><strong>${escapeHtml(log.type)} - ${escapeHtml(log.date || "")}</strong><p>${escapeHtml([log.minutes ? `${log.minutes} minutes` : "", log.note || ""].filter(Boolean).join(" ") || "No notes")}</p><span>${escapeHtml(log.completedBy || "")}</span>${removable ? `<div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-owned-log" data-id="${escapeHtml(log.id)}">Remove Entry</button></div>` : ""}</article>`).join("")}</section>`)
        .join("")
    : "<p>No activity or training entries yet.</p>";
}

function renderOwnedDogTimeline(record = activeOwnedDog()) {
  const container = $("#ownedDogTimelineList");
  if (!container) return;
  container.innerHTML = ownedDogActivityEntriesHtml(record || {}, "All");
}

function ownedDogDocumentItems(record = {}) {
  return arrayValue(record.documents).map((item) => ({
    id: item.id || uid("file"),
    name: item.name || item.fileName || "Dog document",
    type: item.type || item.contentType || "application/octet-stream",
    size: item.size || 0,
    savedAt: item.savedAt || item.uploadedAt || item.createdAt || "",
    url: item.url || "",
    dataUrl: item.dataUrl || "",
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
        const savedText = file.savedAt ? `Uploaded ${formatDateTime(file.savedAt)}` : "Uploaded date not recorded";
        const statusText = file.note ? `<p>${escapeHtml(file.note)}</p>` : "";
        return `<article class="record-card compact-record-card dog-file-card" data-file-id="${escapeHtml(file.id)}"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(savedText)}</span>${statusText}<label>Rename file<input type="text" value="${escapeHtml(file.name)}" data-action="rename-owned-file-input" data-id="${escapeHtml(file.id)}" /></label><div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="${escapeHtml(source)}" data-media-type="${escapeHtml(file.type)}" data-media-name="${escapeHtml(file.name)}">Open</button><button type="button" class="secondary-button" data-action="save-owned-file-name" data-id="${escapeHtml(file.id)}">Rename</button><button type="button" class="secondary-button danger-button" data-action="remove-owned-file" data-id="${escapeHtml(file.id)}">Remove</button></div></article>`;
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
    ? `<section class="quick-care-history"><h3>Recent training notes</h3>${logs.map((log) => `<article><strong>${escapeHtml(log.date || "")}</strong><p>${escapeHtml(log.note || "No note")}</p></article>`).join("")}</section>`
    : `<section class="quick-care-history"><h3>Recent training notes</h3><p>No training notes logged yet.</p></section>`;
}

function ownedDogTimelineHtml(record = {}, filter = "All") {
  const dog = normalizeOwnedDogCare(record);
  const options = ["All", "Exercise", "Treadmill", "Scooter", "Yard Run", "Training", "Bath", ...(dog.sex === "Female" ? ["Heat"] : []), "Medical/Care"];
  const selectedFilter = options.includes(filter) ? filter : "All";
  return `
    ${dashboardQuickCareSummaryHtml(dog, "Timeline")}
    <label class="timeline-filter-label">Timeline filter
      <select id="ownedTimelinePopupFilter" data-dog-id="${escapeHtml(record.id || "")}">
        ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === selectedFilter ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
    <div id="ownedTimelinePopupHistory" class="timeline-popup-history">${ownedDogActivityEntriesHtml(record, selectedFilter)}</div>`;
}

function openOwnedDogTimeline(dogId, filter = "All") {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) {
    showToast("This dog record is no longer available.");
    return;
  }
  showDetailDialog(`${ownedDogDisplayName(dog)} Timeline`, ownedDogTimelineHtml(dog, filter));
}

function openMedicalCareAlert(dogId) {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) return;
  showDetailDialog(`${ownedDogDisplayName(dog)} Medical/Care`, `${dashboardQuickCareSummaryHtml(normalizeOwnedDogCare(dog), "Medical/Care")}<div class="button-row"><button type="button" class="secondary-button" data-action="open-owned-editor" data-id="${escapeHtml(dog.id)}">Update Dog Record</button></div>`);
}

function ownedDogOverviewPopupHtml(record = {}) {
  const dog = normalizeOwnedDogCare(record);
  const detailRows = [
    ["Call name", ownedDogDisplayName(dog)],
    ["Sex", dog.sex || ""],
    ["Feeding", dog.feedingPlan || dog.foodType || ""],
    ["DHPP", dog.dhppDate || "Not recorded"],
    ["Rabies", dog.rabiesDate || "Not recorded"],
    ["Care status", ownedDogCareSummary(dog)],
    ["Special care", dog.specialCare || dog.medicalCareNotes || dog.behaviorNotes || dog.notes || ""],
  ].filter(([, value]) => value);
  const quickButtons = ["Treadmill", "Scooter", "Yard Run", "Bath", "Training"]
    .map((type) => `<button type="button" class="secondary-button" data-action="popup-quick-care" data-care-type="${escapeHtml(type)}" data-id="${escapeHtml(dog.id)}">${escapeHtml(type)}</button>`)
    .join("");
  const heatButton = dog.sex === "Female" ? `<button type="button" class="secondary-button" data-action="popup-quick-care" data-care-type="Heat Note" data-id="${escapeHtml(dog.id)}">Heat Note</button>` : "";
  return `${dashboardQuickCareSummaryHtml(dog, "Profile")}
    <section class="popup-record-section"><h3>Overview</h3>${detailRows.map(([label, value]) => `<div class="detail-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}</section>
    <section class="popup-record-section"><h3>Care Timeline</h3><div class="quick-action-grid">${quickButtons}${heatButton}<button type="button" class="secondary-button" data-action="open-owned-timeline" data-id="${escapeHtml(dog.id)}">Open Timeline</button></div>${ownedDogActivityEntriesHtml(dog, "All")}</section>
    <div class="button-row"><button type="button" class="secondary-button" data-action="open-owned-editor" data-id="${escapeHtml(dog.id)}">Edit Full Dog Record</button></div>`;
}

function openOwnedDogOverviewPopup(record = {}) {
  if (!record?.id) return;
  showDetailDialog(`${ownedDogDisplayName(record)} Profile`, ownedDogOverviewPopupHtml(record));
}

function openVaccineAlert(dogId) {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) return;
  showDetailDialog(
    `${ownedDogDisplayName(dog)} Vaccine Update`,
    `${dashboardQuickCareSummaryHtml(normalizeOwnedDogCare(dog), "Profile")}
    <form id="vaccineUpdateForm" class="tracker-form" data-dog-id="${escapeHtml(dog.id)}">
      <div class="field-grid">
        <label>Last DHPP vaccination<input type="date" name="dhppDate" value="${escapeHtml(dog.dhppDate || "")}" /></label>
        <label>Last rabies vaccination<input type="date" name="rabiesDate" value="${escapeHtml(dog.rabiesDate || "")}" /></label>
      </div>
      <div class="button-row"><button type="submit">Save Vaccine Update</button><button type="button" class="secondary-button" data-action="open-owned-editor" data-id="${escapeHtml(dog.id)}">Open Full Dog Record</button></div>
    </form>`,
  );
}

function renderOwnedActivity(record = activeOwnedDog()) {
  const filter = $("#ownedActivityFilter")?.value || "All";
  $("#ownedActivityHistory").innerHTML = ownedDogActivityEntriesHtml(record || {}, filter, { removable: true });
  renderOwnedDogTimeline(record);
}

function applyOwnedCareLog(record = {}, type, minutes, note = "") {
  const dog = normalizeOwnedDogCare(record);
  const log = {
    id: uid("log"),
    type,
    date: todayDate(),
    minutes,
    note,
    completedBy: currentUser?.name || helperName?.value || "",
  };
  if (type === "Training") {
    dog.trainingLogs = dog.trainingLogs || [];
    dog.trainingLogs.unshift(log);
    dog.lastTrainingDate = log.date;
  } else if (type === "Bath") {
    dog.bathHistory = dog.bathHistory || [];
    dog.bathHistory.unshift(log);
    dog.lastBath = log.date;
    dog.nextBath = addDays(log.date, dog.bathIntervalDays || careDefaults.bathIntervalDays);
  } else if (type === "Heat Note") {
    dog.heatHistory = dog.heatHistory || [];
    dog.heatHistory.unshift(log);
    dog.lastHeat = log.date;
    dog.nextHeat = addDays(log.date, dog.heatCycleLengthDays || careDefaults.heatCycleLengthDays);
  } else if (type === "Medical/Care") {
    dog.careNotesHistory = dog.careNotesHistory || [];
    dog.careNotesHistory.unshift(log);
  } else {
    dog.exerciseLogs = dog.exerciseLogs || [];
    dog.exerciseLogs.unshift(log);
    dog.lastExerciseDate = log.date;
  }
  dog.updatedAt = new Date().toISOString();
  return upsertRecord("ownedDog", dog);
}

function addOwnedLog(type, minutes, note = "", dogId = "") {
  const active = dogId ? readRecords("ownedDog").find((record) => record.id === dogId && !record.removed) : activeOwnedDog();
  if (!active) {
    showToast("Save the dog first.");
    return;
  }
  const record = applyOwnedCareLog(active, type, minutes, note);
  sendPayload(record);
  if ($("#ourDogForm")?.elements.id.value === record.id) renderOwnedActivity(record);
  renderOwnedDogs();
  renderDashboard();
  showToast(`${type} entry added.`);
}

function quickOwnedCareInput(type) {
  const exerciseTypes = ["Treadmill", "Scooter", "Yard Run"];
  if (exerciseTypes.includes(type)) {
    const value = window.prompt(`${type} minutes`, "15");
    if (value === null) return null;
    const minutes = Number(value || 0);
    if (Number.isNaN(minutes) || minutes < 0) {
      showToast("Enter valid minutes.");
      return null;
    }
    return { minutes, note: "" };
  }
  const noteLabel = type === "Bath" ? "Bath note (optional)" : type === "Training" ? "Training note (optional)" : type === "Heat Note" ? "Heat note (optional)" : "Care note";
  const note = window.prompt(noteLabel, "");
  if (note === null) return null;
  return { minutes: "", note };
}

function handleOwnedDogRosterAction(button) {
  const record = readRecords("ownedDog").find((item) => item.id === button.dataset.id);
  if (!record) return;
  if (button.dataset.action === "view-owned-photo") {
    const photo = record.profilePhotoUrl || record.profilePhotoData || "";
    if (photo) {
      showMediaDialog(photo, "image/jpeg", `${ownedDogDisplayName(record)} profile photo`);
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
    $("#deleteOwnedDogButton").hidden = false;
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
    nextBath: latestBath ? addDays(latestBath, dog.bathIntervalDays || careDefaults.bathIntervalDays) : dog.nextBath,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(record);
  renderOwnedActivity(record);
  renderOwnedDogs();
  showToast("Activity entry removed.");
}

async function markRecordRemoved(type, id) {
  const record = readRecords(type).find((item) => item.id === id);
  if (!record) return null;
  const updated = upsertRecord(type, {
    ...record,
    removed: true,
    removedAt: new Date().toISOString(),
    removedBy: currentUser?.name || "",
  });
  await sendPayload(updated);
  return updated;
}

function renderBoardingStays(record = activeBoardingDog()) {
  const stays = record?.stays || [];
  $("#boardingStayHistory").innerHTML = stays.length
    ? stays.map((stay) => `<article class="record-card"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><div class="chip-row">${boardingStayStatusChipHtml(record, stay)}</div><p>${escapeHtml((stay.requests || []).join(", ") || "No service requests")}</p><p>${escapeHtml(stay.bathPlan || "")}</p><p>${escapeHtml(stay.stayNotes || "")}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay" data-id="${escapeHtml(stay.id)}">Edit Stay</button><button type="button" class="secondary-button danger-button" data-action="remove-stay" data-id="${escapeHtml(stay.id)}">Remove Stay</button></div></article>`).join("")
    : "<p>No boarding stays logged yet.</p>";
}

function boardingStayRemoveConfirmHtml(record = {}, stay = {}) {
  return `
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Remove this boarding stay?</strong>
        <p>${escapeHtml(record.dogName || "Boarding dog")} | ${escapeHtml(formatDateTime(stay.dropoffTime))} to ${escapeHtml(formatDateTime(stay.pickupTime))}</p>
        <p>This removes only this scheduled stay. The dog profile stays available.</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-remove-boarding-stay" data-dog-id="${escapeHtml(record.id || "")}" data-id="${escapeHtml(stay.id || "")}">Confirm Remove Stay</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </div>`;
}

function openBoardingStayRemoveConfirm(record = activeBoardingDog(), stayId = "") {
  const stay = (record?.stays || []).find((item) => item.id === stayId);
  if (!record?.id || !stay) return;
  showDetailDialog("Confirm Remove Boarding Stay", boardingStayRemoveConfirmHtml(record, stay));
}

async function removeBoardingStayFromDog(dogId = "", stayId = "") {
  const displayRecord = boardingDogRecordForDisplay(dogId);
  if (!displayRecord || !stayId) return null;
  const sourceIds = displayRecord.sourceRecordIds?.length ? displayRecord.sourceRecordIds : [displayRecord.id];
  const sourceRecords = readRecords("boardingDog").filter((record) => sourceIds.includes(record.id) && !record.removed);
  let updatedPrimary = null;
  for (const sourceRecord of sourceRecords) {
    const nextStays = (sourceRecord.stays || []).filter((stay) => stay.id !== stayId);
    if (nextStays.length === (sourceRecord.stays || []).length) continue;
    const updated = upsertRecord("boardingDog", {
      ...sourceRecord,
      stays: nextStays,
      updatedAt: new Date().toISOString(),
    });
    await sendPayload(updated);
    if (updated.id === displayRecord.id) updatedPrimary = updated;
  }
  const refreshed = boardingDogRecordForDisplay(displayRecord.id) || updatedPrimary;
  if (refreshed && $("#boardingDogForm")?.elements.id.value === refreshed.id) {
    renderBoardingStays(refreshed);
    renderBoardingDogs();
    renderBoardingRequests();
    renderCustomerRequests();
  }
  if (refreshed) await addAuditLog("Removed boarding stay", "boardingDog", refreshed, `${refreshed.dogName || "Dog"} | ${stayId}`);
  return refreshed;
}

function bathPlanForStay(stay) {
  if (!(stay.requests || []).includes("Bath requested")) return "";
  const pickup = new Date(stay.pickupTime);
  const peak = pickup.getHours() >= 9 && pickup.getHours() < 11;
  return peak ? "Bath should be completed the day prior because pickup is during busy kennel hours." : "Bath can be done day-of if at least two hours are available before pickup.";
}

function renderRequests() {
  const showCompleted = $("#showCompletedRequests")?.checked;
  const isAdmin = currentRole() === "admin";
  const records = readRecords("request").filter((record) => !record.removed).filter((record) => showCompleted || !record.completed);
  $("#requestRecords").innerHTML = records.length
    ? records
        .map(
          (record) =>
            `<article class="record-card clickable-card ${record.urgentNeeds ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}" data-action="view-request" data-id="${record.id}"><strong>${record.completed ? "Completed: " : ""}${record.urgentNeeds ? "Urgent: " : ""}${escapeHtml(record.category)}</strong><span>${escapeHtml(record.requestedBy || "Unknown")} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${escapeHtml(record.requestText || "")}</p>${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-request" data-id="${record.id}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button>${isAdmin ? `<button type="button" class="secondary-button danger-button" data-action="remove-request" data-id="${record.id}">Remove Request</button>` : ""}</div></article>`,
        )
        .join("")
    : `<p>${showCompleted ? "No requests saved yet." : "No active requests. Turn on completed history to review finished items."}</p>`;
}

function renderMaintenance() {
  const showCompleted = $("#showCompletedMaintenance")?.checked;
  const isAdmin = currentRole() === "admin";
  const records = readRecords("maintenance").filter((record) => !record.removed).filter((record) => showCompleted || !record.completed);
  $("#maintenanceRecords").innerHTML = records.length
    ? records
        .map(
          (record) =>
            `<article class="record-card clickable-card ${record.urgentAttention ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}" data-action="view-maintenance" data-id="${record.id}"><strong>${record.completed ? "Completed: " : ""}${record.urgentAttention ? "Urgent: " : ""}${escapeHtml(record.location)}</strong><span>${escapeHtml(record.reportedBy || "Unknown")} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${escapeHtml(record.issue || "")}</p>${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-maintenance" data-id="${record.id}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button>${isAdmin ? `<button type="button" class="secondary-button danger-button" data-action="remove-maintenance" data-id="${record.id}">Remove Maintenance</button>` : ""}</div></article>`,
        )
        .join("")
    : `<p>${showCompleted ? "No maintenance items saved yet." : "No active maintenance items. Turn on completed history to review finished items."}</p>`;
}

function money(value) {
  const number = Number(value || 0);
  return `$${number.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function dashboardMetrics() {
  const ownedDogs = readRecords("ownedDog").filter((record) => !record.removed);
  const boardingDogs = readRecords("boardingDog").filter((record) => !record.removed && !["Cancelled", "Checked Out"].includes(normalizeBoardingStatus(record)));
  const requests = readRecords("request").filter((record) => !record.removed);
  const maintenance = readRecords("maintenance").filter((record) => !record.removed);
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const currentBoarding = boardingDogs.filter((dog) => isCurrentlyBoarding(dog) || ["Checked In", "In Kennel", "Ready For Pickup"].includes(normalizeBoardingStatus(dog)));
  const arrivals = [];
  const departures = [];
  const arrivalRecords = [];
  const departureRecords = [];
  const boardingBathDue = [];
  const boardingBathDueRecords = [];
  let ownerUpdates = 0;
  boardingDogs.forEach((dog) => {
    if ((dog.flags || []).includes("Required update from owner")) ownerUpdates += 1;
    (dog.stays || []).forEach((stay) => {
      if (stay.dropoffTime?.slice(0, 10) === selectedDate) {
        arrivals.push(dog.dogName);
        arrivalRecords.push(dog);
      }
      if (stay.pickupTime?.slice(0, 10) === selectedDate) {
        departures.push(dog.dogName);
        departureRecords.push(dog);
      }
      if ((stay.requests || []).includes("Bath requested") && stay.pickupTime?.slice(0, 10) === selectedDate) {
        boardingBathDue.push(dog.dogName);
        boardingBathDueRecords.push(dog);
      }
    });
  });
  const exerciseDueDogs = ownedDogs.filter((dog) => ownedDogExerciseDue(dog, selectedDate));
  const trainingDueDogs = ownedDogs.filter((dog) => ownedDogTrainingDue(dog, selectedDate));
  const ownedBathDueDogs = ownedDogs.filter((dog) => ownedDogBathDue(dog, selectedDate));
  const inHeatDogs = ownedDogs.filter((dog) => ownedDogHeatStatus(dog, selectedDate).inHeat);
  const heatSoonDogs = ownedDogs.filter((dog) => {
    const heat = ownedDogHeatStatus(dog, selectedDate);
    return heat.expectedSoon || heat.overdue || heat.state === "unknown";
  });
  const medicalCareDogs = ownedDogs.filter(ownedDogHasCareNote);
  const vaccineIssues = ownedDogs.filter((dog) => {
    const dhpp = dog.dhppDate ? (new Date() - new Date(`${dog.dhppDate}T12:00:00`)) / 86400000 : 0;
    return dhpp >= 335;
  }).length;
  return {
    selectedDate,
    ownedDogs,
    boardingDogs,
    currentBoarding,
    arrivals,
    departures,
    arrivalRecords,
    departureRecords,
    boardingBathDue,
    boardingBathDueRecords,
    exerciseDueDogs,
    trainingDueDogs,
    ownedBathDueDogs,
    inHeatDogs,
    heatSoonDogs,
    medicalCareDogs,
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
  };
}

function dashboardExerciseCategory(dog) {
  const routineText = `${dog.exerciseRoutine || ""} ${dog.exerciseNotes || ""}`.toLowerCase();
  if (routineText.includes("scooter")) return "Scooter";
  if (routineText.includes("yard") || routineText.includes("run")) return "Yard Run";
  if (routineText.includes("treadmill")) return "Treadmill";
  return "Treadmill";
}

function dashboardQuickCareSummaryHtml(dog, careType) {
  const heat = ownedDogHeatStatus(dog, $("#dashboardDate")?.value || todayDate());
  const latestExercise = careTypeIsExercise(careType) ? latestExerciseLogForDog(dog, careType) : null;
  const photo = dog.profilePhotoUrl || dog.profilePhotoData || "";
  const photoHtml = photo
    ? `<img class="quick-care-dog-photo is-clickable-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(ownedDogDisplayName(dog))}" data-action="view-dog-photo" data-src="${escapeHtml(photo)}" data-media-name="${escapeHtml(`${ownedDogDisplayName(dog)} profile photo`)}" />`
    : `<div class="quick-care-dog-photo quick-care-dog-initials">${escapeHtml(avatarText(ownedDogDisplayName(dog)))}</div>`;
  const rowsByCareType = {
    Training: [
      ["Training status", ownedDogTrainingDue(dog) ? "Training due" : "Current"],
      ["Last training", dog.lastTrainingDate || "Not recorded"],
      ["Training routine", dog.trainingRoutine || dog.trainingGoals || "No routine saved"],
    ],
    Bath: [
      ["Last bath", dog.lastBath || "Not recorded"],
      ["Next bath", dog.nextBath || "Not scheduled"],
      ["Bath interval", `${dog.bathIntervalDays || careDefaults.bathIntervalDays} days`],
    ],
    "Heat Note": [
      ["Sex", dog.sex || ""],
      ["Last heat", dog.lastHeat || "Not recorded"],
      ["Next heat", dog.nextHeat || "Not scheduled"],
      ["Heat status", heat.label],
      ["Heat notes", dog.heatCycleNotes || "No notes saved"],
    ],
    Timeline: [
      ["Care status", ownedDogCareSummary(dog, $("#dashboardDate")?.value || todayDate())],
      ["Last exercise", dog.lastExerciseDate || "Not recorded"],
      ["Last training", dog.lastTrainingDate || "Not recorded"],
      ["Last bath", dog.lastBath || "Not recorded"],
    ],
    Profile: [
      ["Sex", dog.sex || ""],
      ["Care status", ownedDogCareSummary(dog, $("#dashboardDate")?.value || todayDate())],
    ],
    "Medical/Care": [
      ["Care status", dog.careStatus || "Review notes"],
      ["Medical notes", dog.medicalNotes || dog.medicalCareNotes || "No medical note saved"],
      ["Behavior notes", dog.behaviorNotes || "No behavior note saved"],
      ["Special care", dog.specialCare || dog.notes || "No special care note saved"],
    ],
  };
  const exerciseRows = [
    ["Exercise type", careType],
    ["Last " + careType, latestExercise ? `${latestExercise.minutes || 0} minutes on ${latestExercise.date || "unknown date"}` : "Not recorded"],
    ["Routine", dog.exerciseRoutine || dog.exerciseNotes || "No routine saved"],
  ];
  const rows = (careTypeIsExercise(careType) ? exerciseRows : rowsByCareType[careType] || rowsByCareType.Profile)
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
  return `<section class="quick-care-dog-summary">${photoHtml}<div><h3>${escapeHtml(ownedDogDisplayName(dog))}</h3><div class="quick-care-dog-facts">${rows}</div></div></section>`;
}

function dashboardQuickCareFormHtml(dog, careType) {
  const summary = dashboardQuickCareSummaryHtml(dog, careType);
  if (careTypeIsExercise(careType)) {
    return `${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="${escapeHtml(careType)}" data-dog-id="${escapeHtml(dog.id)}"><label>Minutes<input type="number" name="minutes" min="1" required value="${escapeHtml(lastExerciseMinutesForDog(dog, careType))}" /></label><div class="button-row"><button type="submit">Log Exercise</button></div></form>`;
  }
  if (careType === "Training") {
    return `${summary}${ownedDogTrainingHistoryHtml(dog)}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Training" data-dog-id="${escapeHtml(dog.id)}"><label>Training note<textarea name="note" rows="4" placeholder="basic training, stacking, gaiting, ring routine"></textarea></label><div class="button-row"><button type="submit">Log Training</button></div></form>`;
  }
  if (careType === "Bath") {
    return `${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Bath" data-dog-id="${escapeHtml(dog.id)}"><label>Bath date<input type="date" name="date" required value="${todayDate()}" /></label><div class="button-row"><button type="submit">Log Bath</button></div></form>`;
  }
  if (careType === "Heat Note") {
    return `${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Heat Note" data-dog-id="${escapeHtml(dog.id)}"><label>Heat date<input type="date" name="date" required value="${todayDate()}" /></label><label>Heat note<textarea name="note" rows="3" placeholder="Heat observation, behavior, separation, or breeding watch note"></textarea></label><div class="button-row"><button type="submit">Log Heat</button></div></form>`;
  }
  return summary;
}

function openDashboardQuickCare(dogId, careType) {
  const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
  if (!dog) {
    showToast("This dog record is no longer available.");
    return;
  }
  if (careType === "Heat Note" && dog.sex !== "Female") {
    showDetailDialog("Invalid Heat Entry", `<p>Heat logs can only be saved for female dogs. ${escapeHtml(ownedDogDisplayName(dog))} is saved as ${escapeHtml(dog.sex || "not female")}.</p>`);
    return;
  }
  const titles = {
    Training: "Log Training",
    Bath: "Log Bath",
    "Heat Note": "Log Heat Cycle",
  };
  showDetailDialog(titles[careType] || `Log ${careType}`, dashboardQuickCareFormHtml(dog, careType));
}

async function submitDashboardQuickCare(formEl) {
  if (!helperIsLoggedIn()) {
    showToast("Sign in first.");
    return;
  }
  const dog = readRecords("ownedDog").find((record) => record.id === formEl.dataset.dogId && !record.removed);
  const careType = formEl.dataset.careType || "";
  if (!dog || !careType) {
    showToast("This quick log cannot be saved because the dog or care type is missing.");
    return;
  }
  if (careType === "Heat Note" && dog.sex !== "Female") {
    showDetailDialog("Invalid Heat Entry", `<p>Heat logs can only be saved for female dogs. ${escapeHtml(ownedDogDisplayName(dog))} is saved as ${escapeHtml(dog.sex || "not female")}.</p>`);
    return;
  }
  const submitButton = formEl.querySelector('button[type="submit"]');
  setSubmitState(submitButton, true, "Saving...");
  try {
    const formData = new FormData(formEl);
    const minutes = careTypeIsExercise(careType) ? String(formData.get("minutes") || "") : "";
    if (careTypeIsExercise(careType) && Number(minutes || 0) <= 0) {
      showToast("Enter exercise minutes before saving.");
      return;
    }
    const note = ["Training", "Heat Note"].includes(careType) ? String(formData.get("note") || "").trim() : "";
    const date = careTypeIsExercise(careType) || careType === "Training" ? todayDate() : String(formData.get("date") || todayDate());
    const defaultNotes = {
      Bath: "Bath logged from dashboard.",
      "Heat Note": "Heat cycle logged from dashboard.",
    };
    const log = buildStructuredCareLog(dog, {
      careType,
      minutes,
      note: note || defaultNotes[careType] || "",
      date,
    });
    await saveStructuredCareLog(log);
    showDetailDialog(
      `${careTypeIsExercise(careType) ? "Exercise" : careType === "Heat Note" ? "Heat" : careType} Logged`,
      `<div class="detail-row"><strong>Dog</strong><span>${escapeHtml(log.dogName)}</span></div><div class="detail-row"><strong>Date</strong><span>${escapeHtml(log.date)}</span></div><div class="detail-row"><strong>Care type</strong><span>${escapeHtml(log.careType)}</span></div>${log.minutes ? `<div class="detail-row"><strong>Minutes</strong><span>${escapeHtml(log.minutes)}</span></div>` : ""}${log.note ? `<div class="detail-row"><strong>Note</strong><span>${escapeHtml(log.note)}</span></div>` : ""}<div class="detail-row"><strong>Saved by</strong><span>${escapeHtml(log.completedBy || "Staff")}</span></div>`,
    );
  } catch (error) {
    showDetailDialog("Care Log Not Saved", `<p>The care log could not be saved: ${escapeHtml(error.message)}</p>`);
  } finally {
    setSubmitState(submitButton, false);
  }
}

function renderDashboardAlertTabs(alerts) {
  const container = $("#dashboardAlertTabs");
  if (!container) return;
  const ordered = ["All", "Treadmill", "Scooter", "Yard Run", "Training", "Baths", "Heat", "Medical/Care", "Owner Updates", "Requests", "Maintenance", "Vaccines"];
  const counts = alerts.reduce((acc, alert) => {
    acc[alert.category] = (acc[alert.category] || 0) + 1;
    acc.All = (acc.All || 0) + 1;
    return acc;
  }, { All: alerts.length });
  const available = ordered.filter((label) => label === "All" || counts[label]);
  if (!available.includes(dashboardAlertFilter)) dashboardAlertFilter = "All";
  container.innerHTML = available
    .map((label) => `<button type="button" class="${label === dashboardAlertFilter ? "is-active" : ""}" data-alert-filter="${escapeHtml(label)}">${escapeHtml(label)} <span>${counts[label] || 0}</span></button>`)
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
  return alert.type ? "Open" : "";
}

function renderDashboard() {
  if (!$("#dashboardCards")) return;
  $("#dashboardDate").value ||= todayDate();
  const metrics = dashboardMetrics();
  const needsActionCount =
    metrics.exerciseDueDogs.length +
    metrics.trainingDueDogs.length +
    metrics.ownedBathDueDogs.length +
    metrics.inHeatDogs.length +
    metrics.heatSoonDogs.length +
    metrics.medicalCareDogs.length +
    metrics.ownerUpdates +
    metrics.openRequests +
    metrics.openMaintenance;
  const cards = [
    ["needsAction", "Needs Action Today", needsActionCount, "Care due, heat watch, owner updates, requests, and maintenance."],
    ["exerciseDue", "Exercise Due", metrics.exerciseDueDogs.length, metrics.exerciseDueDogs.map(ownedDogDisplayName).join(", ") || "None due."],
    ["trainingDue", "Training Due", metrics.trainingDueDogs.length, metrics.trainingDueDogs.map(ownedDogDisplayName).join(", ") || "None due."],
    ["baths", "Baths Due", metrics.ownedBathDueDogs.length + metrics.boardingBathDue.length, [...metrics.ownedBathDueDogs.map(ownedDogDisplayName), ...metrics.boardingBathDue].join(", ") || "None due."],
    ["inHeat", "Females In Heat", metrics.inHeatDogs.length, metrics.inHeatDogs.map(ownedDogDisplayName).join(", ") || "None."],
    ["heatSoon", "Heat Expected Soon", metrics.heatSoonDogs.length, metrics.heatSoonDogs.map(ownedDogDisplayName).join(", ") || "None."],
    ["careNotes", "Medical/Care Notes", metrics.medicalCareDogs.length, "Our Dogs with special care, medical, or behavior notes."],
    ["arrivals", "Arrivals today", metrics.arrivals.length, metrics.arrivals.join(", ") || "None scheduled."],
    ["departures", "Departures today", metrics.departures.length, metrics.departures.join(", ") || "None scheduled."],
    ["activeBoarders", "Active Boarders", metrics.currentBoarding.length, "Checked-in, in-kennel, ready for pickup, or current by stay dates."],
    ["ownerUpdates", "Owner updates needed", metrics.ownerUpdates, "Boarding records flagged for owner update."],
    ["requests", "Open requests", metrics.openRequests, "Active supply/process requests."],
    ["maintenance", "Open maintenance", metrics.openMaintenance, `${metrics.urgentMaintenance} urgent.`],
  ];
  $("#dashboardCards").innerHTML = cards.map(([key, label, value, note]) => `<article class="dashboard-card clickable-card" data-action="dashboard-detail" data-key="${key}"><span>${label}</span><strong>${value}</strong><p>${note}</p></article>`).join("");
  renderDashboardReminders(metrics);
  const alerts = [];
  metrics.exerciseDueDogs.forEach((dog) => {
    const careType = dashboardExerciseCategory(dog);
    alerts.push({ category: careType, action: "dashboard-quick-care", dogId: dog.id, careType, html: `<strong>${escapeHtml(careType)} due: ${escapeHtml(ownedDogDisplayName(dog))}</strong><p>${escapeHtml(dog.exerciseRoutine || dog.exerciseNotes || `Log ${careType.toLowerCase()} today.`)}</p>` });
  });
  metrics.trainingDueDogs.forEach((dog) => alerts.push({ category: "Training", action: "dashboard-quick-care", dogId: dog.id, careType: "Training", html: `<strong>Training due: ${escapeHtml(ownedDogDisplayName(dog))}</strong><p>${escapeHtml(dog.trainingRoutine || dog.trainingGoals || "Log a training session today.")}</p>` }));
  metrics.ownedBathDueDogs.forEach((dog) => alerts.push({ category: "Baths", action: "dashboard-quick-care", dogId: dog.id, careType: "Bath", html: `<strong>Bath due: ${escapeHtml(ownedDogDisplayName(dog))}</strong><p>Last bath: ${escapeHtml(dog.lastBath || "Not recorded")}</p>` }));
  metrics.inHeatDogs.forEach((dog) => alerts.push({ category: "Heat", action: "dashboard-quick-care", dogId: dog.id, careType: "Heat Note", html: `<strong>Female in heat: ${escapeHtml(ownedDogDisplayName(dog))}</strong><p>${escapeHtml(ownedDogHeatStatus(dog).label)}</p>` }));
  metrics.heatSoonDogs.forEach((dog) => alerts.push({ category: "Heat", action: "dashboard-quick-care", dogId: dog.id, careType: "Heat Note", html: `<strong>Heat watch: ${escapeHtml(ownedDogDisplayName(dog))}</strong><p>${escapeHtml(ownedDogHeatStatus(dog).label)}</p>` }));
  metrics.medicalCareDogs.forEach((dog) => alerts.push({ category: "Medical/Care", action: "view-medical-care", dogId: dog.id, html: `<strong>Care note: ${escapeHtml(ownedDogDisplayName(dog))}</strong><p>${escapeHtml(dog.careStatus || dog.medicalNotes || dog.behaviorNotes || "Review care notes today.")}</p>` }));
  metrics.urgentRequestRecords.forEach((item) => alerts.push({ category: "Requests", type: "request", id: item.id, html: `<strong>Urgent request: ${escapeHtml(item.category)}</strong><p>${escapeHtml(item.requestText || "")}</p>${mediaLinkHtml(item)}` }));
  metrics.urgentMaintenanceRecords.forEach((item) => alerts.push({ category: "Maintenance", type: "maintenance", id: item.id, html: `<strong>Urgent maintenance: ${escapeHtml(item.location)}</strong><p>${escapeHtml(item.issue || "")}</p>${mediaLinkHtml(item)}` }));
  metrics.vaccineIssueDogs.forEach((dog) => alerts.push({ category: "Vaccines", action: "view-vaccine-alert", dogId: dog.id, html: `<strong>Vaccine warning: ${escapeHtml(dog.callName || dog.showName || "Dog")}</strong><p>DHPP date: ${escapeHtml(dog.dhppDate || "Not recorded")}</p>` }));
  metrics.ownerUpdateDogs.forEach((dog) => alerts.push({ category: "Owner Updates", action: "view-owner-update", id: dog.id, html: `<strong>Owner update needed: ${escapeHtml(dog.dogName || "Boarding dog")}</strong><p>${escapeHtml(dog.ownerName || "")} ${escapeHtml(dog.ownerPhone || "")}</p>` }));
  metrics.boardingBathDue.forEach((dogName) => alerts.push({ category: "Baths", html: `<strong>Bath due before pickup today</strong><p>${escapeHtml(dogName)}</p>` }));
  renderDashboardAlertTabs(alerts);
  const filteredAlerts = dashboardAlertFilter === "All" ? alerts : alerts.filter((alert) => alert.category === dashboardAlertFilter);
  const visibleAlerts = !dashboardShowAllAlerts ? filteredAlerts.slice(0, 10) : filteredAlerts;
  const showMore = filteredAlerts.length > visibleAlerts.length ? `<article class="record-card dashboard-more-card"><strong>${filteredAlerts.length - visibleAlerts.length} more items hidden</strong><p>Use the filters above or expand the full list when you are reviewing instead of working the queue.</p><button type="button" class="secondary-button" data-action="show-all-alerts">Show All</button></article>` : "";
  $("#dashboardAlerts").innerHTML = filteredAlerts.length
    ? visibleAlerts
        .map((alert) => {
          const quickCareAttrs = alert.action === "dashboard-quick-care" ? `data-action="dashboard-quick-care" data-dog-id="${escapeHtml(alert.dogId)}" data-care-type="${escapeHtml(alert.careType)}"` : "";
          const customActionAttrs = ["view-medical-care", "view-vaccine-alert"].includes(alert.action) ? `data-action="${escapeHtml(alert.action)}" data-dog-id="${escapeHtml(alert.dogId)}"` : alert.action === "view-owner-update" ? `data-action="view-owner-update" data-id="${escapeHtml(alert.id)}"` : "";
          const recordAttrs = alert.type ? `data-action="view-alert" data-type="${alert.type}" data-id="${alert.id}"` : "";
          const clickableClass = alert.action || alert.type ? "clickable-card " : "";
          const buttonLabel = dashboardAlertButtonLabel(alert);
          return `<article class="record-card ${clickableClass}is-urgent" ${quickCareAttrs || customActionAttrs || recordAttrs}><span class="status-chip">${escapeHtml(alert.category)}</span>${alert.html}${buttonLabel ? `<div class="record-actions"><button type="button" class="secondary-button">${escapeHtml(buttonLabel)}</button></div>` : ""}</article>`;
        })
        .join("") + showMore
    : "<p>No alerts in this category right now.</p>";
  renderDashboardTaskCalendar();
  renderDashboardTimeline();
}

function renderDashboardReminders(metrics = dashboardMetrics()) {
  const panel = $("#dashboardReminderPanel");
  if (!panel) return;
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const reminders = [];
  metrics.vaccineIssueDogs.slice(0, 5).forEach((dog) => reminders.push({ label: "Vaccine", text: `${ownedDogDisplayName(dog)} needs vaccine date review.` }));
  metrics.arrivalRecords.slice(0, 5).forEach((record) => reminders.push({ label: "Boarding", text: `${record.dogName || "Boarding dog"} arrives ${formatDateTime(currentOrNextStay(record)?.dropoffTime)}.` }));
  metrics.departureRecords.slice(0, 5).forEach((record) => reminders.push({ label: "Pickup", text: `${record.dogName || "Boarding dog"} leaves ${formatDateTime((activeBoardingStay(record) || currentOrNextStay(record))?.pickupTime)}.` }));
  panel.innerHTML = reminders.length
    ? `<strong>Reminders for ${escapeHtml(selectedDate)}</strong>${reminders.map((item) => `<article><span>${escapeHtml(item.label)}</span><p>${escapeHtml(item.text)}</p></article>`).join("")}`
    : `<strong>Reminders for ${escapeHtml(selectedDate)}</strong><p>No vaccine or boarding reminders for this date.</p>`;
}

function renderDashboardTaskCalendar() {
  const calendar = $("#dashboardTaskCalendar");
  if (!calendar) return;
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const selected = new Date(`${selectedDate}T12:00:00`);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const monthName = selected.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const reportCounts = readRecords("dailyTask").filter((record) => !record.removed).reduce((counts, record) => {
    const date = record.date || record.submittedAt?.slice(0, 10);
    if (date) counts[date] = (counts[date] || 0) + 1;
    return counts;
  }, {});
  const noteCounts = groupedCalendarNotesForDisplay(readRecords("calendarNote")
    .filter((record) => !record.removed && calendarNoteDate(record))
    .map((record) => ({ ...record, noteDate: calendarNoteDate(record) }))).reduce((counts, record) => {
    const noteDate = calendarNoteDate(record);
    counts[noteDate] = (counts[noteDate] || 0) + 1;
    return counts;
  }, {});
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDay }, () => `<span class="calendar-blank"></span>`);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const reportCount = reportCounts[date] || 0;
    const noteCount = noteCounts[date] || 0;
    const hasRecords = reportCount || noteCount;
    const badges = [
      noteCount ? `<small class="calendar-note-count" aria-label="${noteCount} note${noteCount === 1 ? "" : "s"}">${noteCount}</small>` : "",
      reportCount ? `<small class="calendar-report-count" aria-label="${reportCount} report${reportCount === 1 ? "" : "s"}">${reportCount}</small>` : "",
    ].join("");
    return `<button type="button" class="calendar-day ${date === selectedDate ? "is-selected" : ""} ${hasRecords ? "has-records" : ""} ${noteCount ? "has-notes" : ""}" data-date="${date}"><span>${day}</span>${badges}</button>`;
  });
  calendar.innerHTML = `<div class="calendar-title"><strong>Task Calendar</strong><span>${monthName}</span></div><div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-grid">${blanks.join("")}${days.join("")}</div>`;
  renderCalendarNotes();
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

function canRemoveCalendarNote(note) {
  return currentRole() === "admin" || calendarNoteCreatedByCurrentUser(note);
}

function canCreateCalendarNote() {
  return ["helper", "admin"].includes(currentRole());
}

function renderCalendarNotes() {
  const list = $("#calendarNotesList");
  const formEl = $("#calendarNoteForm");
  if (!list || !formEl) return;
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  formEl.hidden = !canCreateCalendarNote();
  if (!formEl.elements.noteDate.value) formEl.elements.noteDate.value = selectedDate;
  const notes = groupedCalendarNotesForDisplay(readRecords("calendarNote")
    .filter((note) => !note.removed)
    .map((note) => ({ ...note, noteDate: calendarNoteDate(note) }))
    .filter((note) => note.noteDate === selectedDate));
  const emptyMessage = "No staff notes or special notes for the selected date.";
  list.innerHTML = notes.length
    ? notes
        .map((note) => {
          const isSelected = note.noteDate === selectedDate;
          const groupedIds = note.ids?.length ? note.ids : [note.id].filter(Boolean);
          const isGroupedCalendarNote = note.isGroupedCalendarNote && groupedIds.length > 1;
          const editAction = currentRole() === "admin" && !isGroupedCalendarNote ? `<button type="button" class="secondary-button" data-action="edit-calendar-note" data-id="${note.id}">Edit</button>` : "";
          const removeAction = canRemoveCalendarNote(note) ? `<button type="button" class="secondary-button danger-button" data-action="${isGroupedCalendarNote ? "remove-calendar-note-group" : "remove-calendar-note"}" data-id="${note.id}" data-ids="${escapeHtml(groupedIds.join(","))}">Remove</button>` : "";
          const actions = editAction || removeAction ? `<div class="record-actions">${editAction}${removeAction}</div>` : "";
          const noteKind = calendarNoteKindLabel(note);
          return `<article class="record-card ${isSelected ? "is-approved" : ""} ${noteKind === "Staff Note" ? "is-staff-note" : "is-special-note"}"><strong>${escapeHtml(noteKind)} - ${escapeHtml(note.noteDate || "")}</strong><span>Written by ${escapeHtml(calendarNoteAuthorText(note))}</span><p>${multilineHtml(note.note || "")}</p>${actions}</article>`;
        })
        .join("")
    : `<p>${emptyMessage}</p>`;
}

function renderDashboardTimeline() {
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const items = [];
  ["dailyTask"].forEach((type) => {
    readRecords(type).forEach((record) => {
      if (record.removed) return;
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
          const title = type === "dailyTask" ? "Daily completed work" : type === "timesheet" ? "Timesheet" : type === "request" ? "Request" : type === "maintenance" ? "Maintenance" : type === "boardingDog" ? "Boarding dog update" : type === "service" ? "Service/pricing update" : "Dog update";
          const completedCount = type === "dailyTask" ? completedTasksForRecord(record).length : 0;
          const careCount = type === "dailyTask" ? (record.structuredCareLogs || record.careLogs || []).length : 0;
          const summary = record.requestText || record.issue || record.dogName || record.callName || record.serviceName || (type === "dailyTask" ? `${completedCount} tasks completed, ${careCount} care logs` : `${record.dailyTasks?.length || 0} AM tasks, ${record.pmTasks?.length || 0} PM tasks checked`);
          const notes = record.ownerNotes || record.reason || record.suggestedAction || record.pricingNotes || "";
          const removeAction = currentRole() === "admin" ? `<div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-timeline-record" data-type="${type}" data-id="${record.id}">Remove</button></div>` : "";
          return `<article class="record-card clickable-card" data-action="view-record" data-type="${type}" data-id="${record.id}"><strong>${formatDateTime(timestamp)} - ${title}</strong><span>${helper}</span><p>${summary || ""}</p>${notes ? `<p>${escapeHtml(notes)}</p>` : ""}${mediaLinkHtml(record)}${removeAction}</article>`;
        })
        .join("")
    : "<p>No activity recorded for this date yet.</p>";
}

function dashboardDetailRecords(key) {
  const metrics = dashboardMetrics();
  const map = {
    needsAction: [...metrics.exerciseDueDogs, ...metrics.trainingDueDogs, ...metrics.ownedBathDueDogs, ...metrics.inHeatDogs, ...metrics.heatSoonDogs, ...metrics.medicalCareDogs, ...metrics.ownerUpdateDogs, ...metrics.openRequestRecords, ...metrics.openMaintenanceRecords],
    exerciseDue: metrics.exerciseDueDogs,
    trainingDue: metrics.trainingDueDogs,
    arrivals: metrics.arrivalRecords,
    departures: metrics.departureRecords,
    activeBoarders: metrics.currentBoarding,
    baths: [...metrics.ownedBathDueDogs, ...metrics.boardingBathDueRecords],
    inHeat: metrics.inHeatDogs,
    heatSoon: metrics.heatSoonDogs,
    careNotes: metrics.medicalCareDogs,
    vaccines: metrics.vaccineIssueDogs,
    ownerUpdates: metrics.ownerUpdateDogs,
    requests: metrics.openRequestRecords,
    maintenance: metrics.openMaintenanceRecords,
  };
  return map[key] || [];
}

function showDashboardDetail(key) {
  const labels = {
    needsAction: "Needs Action Today",
    exerciseDue: "Exercise Due",
    trainingDue: "Training Due",
    arrivals: "Arrivals Today",
    departures: "Departures Today",
    activeBoarders: "Active Boarders",
    baths: "Baths Due",
    inHeat: "Females In Heat",
    heatSoon: "Heat Expected Soon",
    careNotes: "Medical/Care Notes",
    vaccines: "Vaccine Warnings",
    ownerUpdates: "Owner Updates Needed",
    requests: "Open Requests",
    maintenance: "Open Maintenance",
  };
  const records = dashboardDetailRecords(key);
  const html = records.length
    ? records.map((record) => `<article class="record-card">${genericDetailHtml(record)}</article>`).join("")
    : "<p>No open items in this category.</p>";
  const type = key === "requests" ? "request" : key === "maintenance" ? "maintenance" : "";
  const context = type && records.length === 1 ? { type, id: records[0].id } : null;
  showDetailDialog(labels[key] || "Dashboard Details", html, context);
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

const settingsUserTabLabels = {
  admin: "Admin",
  staff: "Staff",
  customer: "Customer",
  member: "Customer Member",
};

function userMemberFlag(user = {}) {
  return user.isMember === true || user.isMember === "on" || user.isMember === "true" || user.member === true;
}

function settingsUserTabFor(user = {}) {
  if (user.role === "admin") return "admin";
  if (user.role === "helper") return "staff";
  if (userMemberFlag(user)) return "member";
  return "customer";
}

function settingsUserDisplayRole(user = {}) {
  return `${roleLabel(user.role)}${userMemberFlag(user) ? " | Member" : ""}`;
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
    const counter = $(`[data-settings-user-count="${tab}"]`);
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
        .map((user) => `<tr data-id="${user.id}"><td>${escapeHtml(user.name || "")}</td><td>${escapeHtml(user.email || "")}</td><td>${escapeHtml(settingsUserDisplayRole(user))}</td><td>${user.passwordChangeRequired ? '<span class="status-chip warning-chip">Change required</span>' : '<span class="status-chip">Current</span>'}</td><td><button type="button" class="secondary-button" data-action="remove-settings-user" data-id="${user.id}">Remove</button></td></tr>`)
        .join("")
    : `<tr><td colspan="5">No ${escapeHtml(emptyLabel.toLowerCase())} users saved yet.</td></tr>`;
  if ($("#settingsUserCards")) {
    $("#settingsUserCards").innerHTML = visibleUsers.length
      ? visibleUsers.map((user) => `<button type="button" class="settings-user-card" data-action="view-settings-user" data-id="${escapeHtml(user.id)}"><strong>${escapeHtml(user.name || user.email || "User")}</strong><span>${escapeHtml(user.email || "")}</span><small>${escapeHtml(settingsUserDisplayRole(user))}${user.passwordChangeRequired ? " | Password change required" : ""}</small></button>`).join("")
      : `<article class="record-card"><strong>No ${escapeHtml(emptyLabel.toLowerCase())} users saved yet.</strong></article>`;
  }
}

function kennelLocations({ activeOnly = false } = {}) {
  return readRecords("kennelLocation")
    .filter((location) => !location.removed)
    .filter((location) => !activeOnly || location.active === "on" || location.active === true || location.active === "true")
    .sort((a, b) => `${a.building || ""} ${a.name || ""}`.localeCompare(`${b.building || ""} ${b.name || ""}`));
}

function kennelBuildingRecords() {
  const records = readRecords("kennelBuilding").filter((building) => !building.removed && building.name);
  const byName = new Map(records.map((building) => [building.name, building]));
  kennelLocations().forEach((location) => {
    if (location.building && !byName.has(location.building)) {
      byName.set(location.building, { type: "kennelBuilding", id: `derived-${location.building}`, name: location.building, derived: true });
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
  tabs.innerHTML = `${names.map((name) => `<span class="task-tab-pill"><button type="button" data-kennel-building-tab="${escapeHtml(name)}" role="tab" aria-selected="${name === active ? "true" : "false"}" class="${name === active ? "is-active" : ""}">${escapeHtml(name)}</button>${canManage ? `<button type="button" class="remove-task-tab-button" data-action="remove-kennel-building-tab" data-building="${escapeHtml(name)}" title="Remove building tab">&times;</button>` : ""}</span>`).join("")}${canManage ? `<button type="button" class="secondary-button task-add-tab-button" data-action="add-kennel-building-tab">Add Tab</button>` : ""}`;
}

function kennelLocationOptionsForBuilding(building = "", selectedId = "") {
  const matching = kennelLocations({ activeOnly: true }).filter((location) => (location.building || "") === building);
  return matching.length
    ? matching.map((location) => `<option value="${escapeHtml(location.id)}" ${location.id === selectedId ? "selected" : ""}>${escapeHtml(location.name || "Kennel")}</option>`).join("")
    : `<option value="">No active kennels saved for ${escapeHtml(building || "this building")}</option>`;
}

function renderKennelLocations() {
  const list = $("#kennelLocationList");
  if (!list) return;
  renderKennelBuildingTabs();
  const active = activeKennelBuildingName();
  const records = kennelLocations().filter((location) => (location.building || "") === active);
  list.innerHTML = records.length
    ? records
        .map((location) => `<article class="record-card compact-record-card"><strong>${escapeHtml(location.name || "Kennel")}</strong><span>${escapeHtml(active)} | ${(location.active === "on" || location.active === true || location.active === "true") ? "Active" : "Inactive"}</span><div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-kennel-location" data-id="${escapeHtml(location.id)}">Remove</button></div></article>`)
        .join("")
    : `<article class="record-card compact-record-card"><strong>No locations saved for ${escapeHtml(active)}</strong><p>Add kennel, crate, room, or other useful location text above.</p></article>`;
}

function kennelBuildingFormHtml() {
  return `<form id="kennelBuildingTabForm" class="tracker-form">
    <label>Building name<input type="text" name="name" required placeholder="Example: Puppy room, Back kennels, Crates" /></label>
    <div class="button-row"><button type="submit">Add Tab</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
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
  return `<div class="tracker-form">
    <article class="record-card compact-record-card danger-confirm-card">
      <strong>Remove ${escapeHtml(building)}?</strong>
      <p>This removes the building tab and ${count} saved location${count === 1 ? "" : "s"} under it.</p>
    </article>
    <div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-kennel-building-tab" data-building="${escapeHtml(building)}">Confirm Remove</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </div>`;
}

function openKennelBuildingRemoveConfirm(building = "") {
  if (building) showDetailDialog("Confirm Remove Building Tab", kennelBuildingRemoveConfirmHtml(building));
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
  await addAuditLog("Removed kennel building", "kennelBuilding", buildingRecord || { name: building }, `${building} | ${locations.length} locations`);
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
  await addAuditLog("Created kennel location", "kennelLocation", record, `${building} active`);
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

function renderAuditLog() {
  const list = $("#auditLogList");
  if (!list) return;
  const records = readRecords("auditLog").filter((record) => !record.removed).slice(0, 25);
  list.innerHTML = records.length
    ? records.map((record) => {
      const canRestoreBoardingDog = record.action === "Deleted boarding dog" && record.targetType === "boardingDog" && readRecords("boardingDog").some((dog) => dog.id === record.targetId && dog.removed);
      return `<article class="record-card compact-record-card"><strong>${escapeHtml(record.action || "Change")} - ${escapeHtml(record.targetLabel || record.targetType || "")}</strong><span>${escapeHtml(record.actorName || "Admin")} | ${escapeHtml(formatDateTime(record.submittedAt || record.updatedAt))}</span><p>${escapeHtml(record.details || record.targetType || "")}</p>${canRestoreBoardingDog ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="restore-boarding-dog" data-id="${escapeHtml(record.targetId)}">Restore Dog</button></div>` : ""}</article>`;
    }).join("")
    : `<article class="record-card compact-record-card"><strong>No audit activity yet</strong><p>Admin setting, service, user, and kennel changes will appear here.</p></article>`;
}

function kennelAssignmentPopupHtml(record = {}, nextStatus = "In Kennel", options = {}) {
  const locations = kennelLocations({ activeOnly: true });
  const buildings = kennelBuildings(locations);
  const selectedBuilding = record.kennelBuilding || buildings[0] || "Shed";
  const buildingOptions = buildings.map((building) => `<option value="${escapeHtml(building)}" ${building === selectedBuilding ? "selected" : ""}>${escapeHtml(building)}</option>`).join("");
  const locationOptions = kennelLocationOptionsForBuilding(selectedBuilding, record.kennelLocationId || "");
  const hasLocationsForBuilding = locations.some((location) => (location.building || "") === selectedBuilding);
  const help = locations.length ? "Choose the building first, then the exact kennel assignment." : "Add active kennel locations in Settings first.";
  return `<form id="kennelAssignmentForm" class="tracker-form" data-dog-id="${escapeHtml(record.id || "")}" data-next-status="${escapeHtml(nextStatus)}" data-allow-early="${options.allowEarly ? "true" : "false"}" data-early="${options.early ? "true" : "false"}">
    <article class="record-card compact-record-card"><strong>${escapeHtml(record.dogName || "Boarding dog")}</strong><p>${escapeHtml(boardingScheduleText(record))}</p></article>
    <div class="field-grid">
      <label>Building<select name="kennelBuilding" id="kennelAssignmentBuilding" required ${locations.length ? "" : "disabled"}>${buildingOptions}</select><small>${escapeHtml(help)}</small></label>
      <label>Kennel<select name="kennelLocationId" id="kennelAssignmentLocation" required ${hasLocationsForBuilding ? "" : "disabled"}><option value="">Select kennel</option>${locationOptions}</select><small id="kennelAssignmentHelp">${hasLocationsForBuilding ? "Available active kennels for this building." : "No active kennels are saved for this building."}</small></label>
    </div>
    <div class="button-row"><button type="submit" ${hasLocationsForBuilding ? "" : "disabled"}>Assign Kennel</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
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
  locationSelect.innerHTML = `<option value="">Select kennel</option>${kennelLocationOptionsForBuilding(building)}`;
  locationSelect.disabled = !locations.length;
  if (submitButton) submitButton.disabled = !locations.length;
  if (help) help.textContent = locations.length ? "Available active kennels for this building." : "No active kennels are saved for this building.";
}

function openSettingsUser(record = {}) {
  openSettingsUserPopup(record);
}

function settingsUserLastLoginText(user = {}) {
  if (!user.lastLoginAt) return "No login has been recorded yet.";
  const provider = user.lastLoginProvider ? ` via ${user.lastLoginProvider}` : "";
  return `${formatDateTime(user.lastLoginAt)}${provider}`;
}

function settingsUserPopupHtml(user = {}) {
  const isEdit = Boolean(user.id);
  return `
    <form id="settingsUserPopupForm" class="tracker-form" data-user-id="${escapeHtml(user.id || "")}">
      <input type="hidden" name="id" value="${escapeHtml(user.id || "")}" />
      <article class="record-card compact-record-card settings-user-login-card">
        <span>${isEdit ? "Last Login" : "New User"}</span>
        <strong>${escapeHtml(isEdit ? settingsUserLastLoginText(user) : "Create access for a staff member, admin, customer, or member customer.")}</strong>
        <p>${isEdit ? (user.loginCount ? `${Number(user.loginCount)} recorded login${Number(user.loginCount) === 1 ? "" : "s"}.` : "This updates after the user signs in through the app.") : "Save the user first, then set a temporary password or send a reset email when needed."}</p>
      </article>
      <div class="field-grid">
        <label>Name<input type="text" name="name" required value="${escapeHtml(user.name || "")}" /></label>
        <label>Email<input type="email" name="email" required value="${escapeHtml(user.email || "")}" /></label>
        <label>Role<select name="role" required><option value="customer" ${user.role === "customer" ? "selected" : ""}>Customer</option><option value="helper" ${user.role === "helper" ? "selected" : ""}>Staff</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option></select></label>
      </div>
      <label class="inline-check"><input type="checkbox" name="isMember" ${userMemberFlag(user) ? "checked" : ""} /> Member customer pricing</label>
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
      <div class="button-row"><button type="submit">Save User</button>${isEdit ? `<button type="button" class="secondary-button danger-button" data-action="popup-remove-user" data-id="${escapeHtml(user.id || "")}">Remove</button>` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>`;
}

function openSettingsUserPopup(user = {}) {
  showDetailDialog(user.id ? `${user.name || user.email || "User"} Access` : "Add User", settingsUserPopupHtml(user));
}

function settingsUserRemoveConfirmHtml(user = {}, options = {}) {
  return `
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Remove ${escapeHtml(user.name || user.email || "this user")}?</strong>
        <p>This removes app access for ${escapeHtml(user.email || "this account")}. It does not delete dog, boarding, request, or timesheet history.</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-remove-settings-user" data-id="${escapeHtml(user.id || "")}">Confirm Remove</button>
        <button type="button" class="secondary-button" data-action="${options.returnToUser ? "cancel-remove-settings-user" : "close-dialog"}" data-id="${escapeHtml(user.id || "")}">Cancel</button>
      </div>
    </div>`;
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

function boardingDogDeleteConfirmHtml(record = {}) {
  return `
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Delete ${escapeHtml(record.dogName || "this boarding dog")}?</strong>
        <p>This removes the dog from Boarding Dogs and from customer access. The record is soft-deleted and kept in history for audit and recovery.</p>
        <p>Owner link: ${escapeHtml(record.ownerEmail || record.customerEmail || "No owner email saved")}</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-delete-boarding-dog" data-id="${escapeHtml(record.id || "")}">Confirm Delete Dog</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </div>`;
}

function openBoardingDogDeleteConfirm(record = {}) {
  showDetailDialog("Confirm Delete Boarding Dog", boardingDogDeleteConfirmHtml(record));
}

async function deleteBoardingDogById(id = "") {
  if (currentRole() !== "admin") {
    showToast("Admin access required to delete a boarding dog profile.");
    return null;
  }
  const record = boardingDogRecordForDisplay(id);
  if (!record) return null;
  const removedAt = new Date().toISOString();
  const sourceIds = record.sourceRecordIds?.length ? record.sourceRecordIds : [record.id];
  let removed = null;
  for (const sourceId of sourceIds) {
    const sourceRecord = readRecords("boardingDog").find((item) => item.id === sourceId && !item.removed);
    if (!sourceRecord) continue;
    removed = upsertRecord("boardingDog", {
      ...sourceRecord,
      removed: true,
      removedAt,
      removedBy: currentUser?.name || "Admin",
      softDeleteExpiresOn: addDays(todayDate(), 30),
    });
    await sendPayload(removed);
  }
  await addAuditLog("Deleted boarding dog", "boardingDog", removed, `${removed.dogName || "Dog"} | owner: ${removed.ownerEmail || removed.customerEmail || "none"} | recover before ${removed.softDeleteExpiresOn}`);
  $("#boardingDogDetail").hidden = true;
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerDogs();
  renderDashboard();
  renderGlobalSearchResults();
  return removed;
}

async function restoreBoardingDogById(id = "") {
  if (currentRole() !== "admin") {
    showToast("Admin access required to restore a boarding dog profile.");
    return null;
  }
  const record = readRecords("boardingDog").find((item) => item.id === id && item.removed);
  if (!record) return null;
  const restored = upsertRecord("boardingDog", {
    ...record,
    removed: false,
    restoredAt: new Date().toISOString(),
    restoredBy: currentUser?.name || "Admin",
  });
  await sendPayload(restored);
  await addAuditLog("Restored boarding dog", "boardingDog", restored, restored.ownerEmail || restored.customerEmail || "");
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderCustomerDogs();
  renderDashboard();
  renderAuditLog();
  return restored;
}

function activeSettingsUserForm() {
  return $("#settingsUserPopupForm") || $("#settingsUserForm");
}

function settingsFormProfileData(formEl = activeSettingsUserForm()) {
  if (!formEl) return {};
  const data = formPayload(formEl);
  delete data.temporaryPassword;
  delete data.temporaryPasswordConfirm;
  delete data.requirePasswordChange;
  data.isMember = Boolean(formEl.elements.isMember?.checked);
  return data;
}

async function saveSettingsUserProfile(extra = {}, formEl = activeSettingsUserForm()) {
  if (!formEl) {
    showToast("Open Add User first.");
    return null;
  }
  if (!validateForm(formEl)) return null;
  const data = settingsFormProfileData(formEl);
  const existing = data.id ? readRecords("settingsUser").find((user) => user.id === data.id) : savedUserFor({ email: data.email });
  const payload = {
    ...existing,
    ...data,
    ...extra,
    type: "settingsUser",
    id: data.id || existing?.id || uid("settingsUser"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    removed: false,
  };
  const record = upsertRecord("settingsUser", payload);
  await sendPayload(record);
  renderSettingsUsers();
  return record;
}

async function adminSetTemporaryPassword(formEl = activeSettingsUserForm(), button = $("#adminSetPasswordButton")) {
  if (!formEl) {
    showToast("Open a user before changing a password.");
    return;
  }
  if (currentRole() !== "admin") {
    showToast("Admin access required.");
    return;
  }
  if (!supabaseClient) {
    showDetailDialog("Supabase Required", "<p>Admin password changes require Supabase Auth.</p>");
    return;
  }
  const { session, error: sessionError } = await activeSupabaseAdminSession();
  if (!session) {
    showDetailDialog("Admin Sign-In Required", `<p>${escapeHtml(sessionError)}</p><p>Use the Login page with centraltexashusky@gmail.com, then return to Settings and set the temporary password.</p>`);
    switchPage("loginPage");
    return;
  }
  const data = settingsFormProfileData(formEl);
  const password = formEl.elements.temporaryPassword.value;
  const confirmPassword = formEl.elements.temporaryPasswordConfirm.value;
  const requirePasswordChange = formEl.elements.requirePasswordChange.checked;
  const passwordRequiredCheck = { field: formEl.elements.temporaryPassword, message: "Enter a temporary password.", valid: Boolean(password) };
  if (!validateForm(formEl, [passwordRequiredCheck, passwordMatchCheck(formEl, "temporaryPassword", "temporaryPasswordConfirm")])) return;
  setSubmitState(button, true, "Setting...");
  const { data: functionData, error } = await supabaseClient.functions.invoke("admin-set-password", {
    body: {
      email: data.email.trim().toLowerCase(),
      authId: (data.authId || "").trim(),
      name: data.name.trim(),
      role: data.role,
      password,
      requirePasswordChange,
    },
  });
  setSubmitState(button, false);
  if (error || functionData?.error) {
    const message = functionData?.error || (await edgeFunctionErrorMessage(error));
    showDetailDialog("Password Not Changed", `<p>${escapeHtml(message)}</p>`);
    return;
  }
  await loadRemoteRecords();
  const existing = data.id ? readRecords("settingsUser").find((user) => user.id === data.id) : savedUserFor({ email: data.email, key: functionData.userId || data.authId });
  const record = upsertRecord("settingsUser", {
    ...existing,
    ...data,
    type: "settingsUser",
    id: functionData.recordId || data.id || existing?.id || uid("settingsUser"),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    authId: functionData.userId || data.authId || existing?.authId || "",
    authProvider: "supabase",
    passwordChangeRequired: requirePasswordChange,
    passwordChangeRequiredAt: requirePasswordChange ? new Date().toISOString() : "",
    passwordChangeSetBy: currentUser.email,
    removed: false,
  });
  await sendPayload(record);
  renderSettingsUsers();
  formEl.elements.temporaryPassword.value = "";
  formEl.elements.temporaryPasswordConfirm.value = "";
  openSettingsUser(record);
  showDetailDialog(
    "Temporary Password Set",
    `<p>The temporary password was set for ${escapeHtml(record.email)}. The user will be asked to enter that password and choose a new one after their next password login.</p>`,
  );
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
    showDetailDialog("Reset Email Not Sent", `<p>${escapeHtml(error.message)}</p>`);
    return;
  }
  await saveSettingsUserProfile({ passwordResetSentAt: new Date().toISOString(), passwordResetSentBy: currentUser.email }, formEl);
  showDetailDialog("Reset Email Sent", `<p>A Supabase password reset email was sent to ${escapeHtml(email)}.</p>`);
}

function fillCustomerDefaults() {
  if (!$("#customerOwnerEmail")) return;
  $("#customerOwnerName").value = currentUser?.name || "";
  $("#customerOwnerEmail").value = currentUser?.email || "";
}

function renderCustomerDogs() {
  if (!$("#customerDogList")) return;
  const dogs = customerDogsForCurrentUser();
  const checkedIds = new Set([...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]:checked')].map((input) => input.value));
  $("#customerDogList").innerHTML = dogs.length
    ? dogs.map((dog) => {
      const sharedActions = dog.isSharedBoardingDog
        ? `<button type="button" class="secondary-button" data-action="view-customer-request" data-id="${escapeHtml(dog.sourceBoardingDogId || "")}">View Boarding Profile</button>`
        : `<button type="button" class="secondary-button" data-action="edit-customer-dog" data-id="${dog.id}">Edit</button><button type="button" class="secondary-button danger-button" data-action="remove-customer-dog" data-id="${dog.id}">Remove</button>`;
      return `<article class="customer-dog-item"><div><strong>${escapeHtml(dog.dogName)}</strong><span>${escapeHtml(dog.breedDescription || "")}</span>${dog.isSharedBoardingDog ? "<small>Shared boarding profile</small>" : ""}</div><div class="record-actions">${sharedActions}</div></article>`;
    }).join("")
    : "<p>No dogs added yet.</p>";
  if ($("#customerBookingDogList")) {
    $("#customerBookingDogList").innerHTML = dogs.length
      ? dogs.map((dog) => `<label class="customer-dog-item"><input type="checkbox" name="customerDogSelect" value="${dog.id}" ${checkedIds.has(dog.id) ? "checked" : ""} /> <strong>${escapeHtml(dog.dogName)}</strong><span>${escapeHtml(dog.breedDescription || "")}</span></label>`).join("")
      : `<article class="record-card compact-record-card"><strong>Add a dog before requesting boarding.</strong><p>Boarding requests need at least one dog profile first.</p><button type="button" class="secondary-button" data-action="customer-add-dog-cta">Add Dog</button></article>`;
  }
  $("#customerBookingForm")?.classList.toggle("has-no-customer-dogs", !dogs.length);
  $("#requestBoardingButton").disabled = !dogs.length;
  renderCustomerServiceOptions();
  updateCustomerEstimate();
  renderCustomerProgress();
}

function renderCustomerProgress() {
  const panels = ["#customerOnboardingProgress", "#customerRequestProgress"].map((selector) => $(selector)).filter(Boolean);
  if (!panels.length || currentRole() !== "customer") {
    panels.forEach((panel) => (panel.innerHTML = ""));
    return;
  }
  const dogs = customerDogsForCurrentUser();
  const requests = readRecords("boardingDog").filter((record) => record.customerRequest && !record.removed && boardingDogVisibleToCustomer(record));
  const hasDog = dogs.length > 0;
  const hasVaccine = dogs.some((dog) => (dog.vaccinationRecords || []).length || dog.vaccinationFiles || dog.rabiesDate || dog.dhppDate);
  const hasRequest = requests.length > 0;
  const steps = [
    ["Add dog", hasDog],
    ["Add vaccines/care", hasVaccine],
    ["Request boarding", hasRequest],
  ];
  const html = `<div class="progress-steps">${steps.map(([label, done]) => `<span class="${done ? "is-done" : ""}">${escapeHtml(label)}</span>`).join("")}</div>`;
  panels.forEach((panel) => (panel.innerHTML = html));
}

function renderCustomerRequests() {
  const list = $("#customerRequestList");
  if (!list) return;
  renderCustomerProgress();
  const statusFilter = $("#customerRequestStatusFilter")?.value || "All";
  const records = readRecords("boardingDog")
    .filter((record) => record.customerRequest && (currentRole() === "admin" || boardingDogVisibleToCustomer(record)))
    .filter((record) => !record.removed)
    .filter((record) => statusFilter === "All" || normalizeBoardingStatus(record) === statusFilter)
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  list.innerHTML = records.length
    ? records
        .map((record) => {
          const stay = record.stays?.[0] || {};
          const services = stay.requests?.length ? stay.requests.join(", ") : "No added services";
          const estimate = record.estimatedTotal ? `<p><strong>Estimated total:</strong> ${money(record.estimatedTotal)}</p>` : "";
          const status = normalizeBoardingStatus(record);
          const timeline = customerRequestTimelineHtml(status);
          const actions = !["Cancelled", "Checked Out"].includes(status)
            ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-customer-request" data-id="${record.id}">Update</button>${canTransitionBoardingStatus(record, "Cancelled") ? `<button type="button" class="secondary-button" data-action="cancel-customer-request" data-id="${record.id}">Cancel Request</button>` : ""}</div>`
            : "";
          return `<article class="record-card clickable-card ${statusClassForRequest(status)} ${statusClassForBoardingStatus(status)}" data-action="view-customer-request" data-id="${record.id}"><strong>${escapeHtml(record.dogName || "Dog")}</strong><div class="chip-row">${dogTypeBadgeHtml("customerDog")}${boardingStatusChipHtml(record)}</div>${timeline}<span>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</span><p>${escapeHtml(services)}</p>${estimate}${actions}</article>`;
        })
        .join("")
    : `<p>No ${statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}boarding requests submitted yet.</p>`;
}

function customerRequestTimelineHtml(status = "Pending") {
  const steps = ["Pending", "Approved", "Checked In", "Ready For Pickup", "Checked Out"];
  const activeIndex = status === "In Kennel" ? steps.indexOf("Checked In") : steps.indexOf(status);
  if (status === "Cancelled") return `<div class="request-timeline"><span class="is-cancelled">Cancelled</span></div>`;
  return `<div class="request-timeline">${steps.map((step, index) => `<span class="${index <= activeIndex ? "is-done" : ""}">${escapeHtml(step)}</span>`).join("")}</div>`;
}

function renderCustomerServiceOptions() {
  if (!$("#customerServiceOptions")) return;
  const checkedIds = new Set(checkedFrom($("#customerBookingForm"), "customerServices"));
  const customerIsMember = isMemberUser(currentUser);
  const services = readRecords("service").filter((service) => serviceHasFlag(service, "Active") && !serviceHasFlag(service, "Admin only") && service.category !== "Boarding" && (customerIsMember || !serviceHasFlag(service, "Member Pricing")));
  $("#customerServiceOptions").innerHTML = services.length
    ? services.map((service) => {
        const checked = checkedIds.has(service.id);
        const quantityValue = $("#customerBookingForm").elements[`serviceQuantity-${service.id}`]?.value || "1";
        return `<label class="service-option"><span><input type="checkbox" name="customerServices" value="${service.id}" ${checked ? "checked" : ""} /> ${escapeHtml(service.serviceName)} - ${money(service.basePrice)} ${escapeHtml(service.unit || "")}</span><input class="service-quantity" type="number" name="serviceQuantity-${service.id}" min="1" step="1" value="${escapeHtml(quantityValue)}" ${checked ? "" : "disabled"} aria-label="${escapeHtml(service.serviceName)} quantity" /></label>`;
      }).join("")
    : "<p>No customer services are active yet.</p>";
}

function selectedCustomerDogs() {
  return [...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]:checked')]
    .map((input) => customerDogsForCurrentUser().find((dog) => dog.id === input.value))
    .filter((dog) => dog && !dog.removed);
}

function resetCustomerDogForm() {
  $("#customerDogForm").reset();
  $("#customerDogId").value = "";
  $("#saveCustomerDogButton").textContent = "Save Dog";
  fillCustomerDefaults();
  resetSelectedDogPhoto("customer", {});
}

function openCustomerDog(record = {}) {
  resetCustomerDogForm();
  setFormValues($("#customerDogForm"), record);
  $("#customerDogId").value = record.id || "";
  $("#saveCustomerDogButton").textContent = record.id ? "Save Dog Changes" : "Save Dog";
  setDogPhoto("customer", record);
  $("#customerDogForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetCustomerBookingForm() {
  $("#customerBookingForm").reset();
  $("#editingCustomerRequestId").value = "";
  $("#requestBoardingButton").textContent = "Request Boarding";
  pendingCustomerBooking = null;
  renderCustomerDogs();
  updateCustomerEstimate();
}

function editCustomerRequest(record) {
  if (!record) return;
  switchPage("customerRequestsPage");
  resetCustomerBookingForm();
  const stay = record.stays?.[0] || {};
  $("#editingCustomerRequestId").value = record.id;
  $("#customerBookingForm").elements.dropoffTime.value = stay.dropoffTime?.slice(0, 16) || "";
  $("#customerBookingForm").elements.pickupTime.value = stay.pickupTime?.slice(0, 16) || "";
  $("#customerBookingForm").elements.requestNotes.value = stay.stayNotes || "";
  const dog = customerDogsForCurrentUser().find((item) => {
    if (item.sourceBoardingDogId && item.sourceBoardingDogId === record.id) return true;
    return item.dogName === record.dogName && normalizeEmail(item.ownerEmail || item.customerEmail) === normalizeEmail(record.ownerEmail || record.customerEmail);
  });
  if (dog) {
    const checkbox = [...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]')].find((input) => input.value === dog.id);
    if (checkbox) checkbox.checked = true;
  }
  const serviceQuantities = new Map((record.requestedServices || []).map((item) => {
    if (typeof item === "object") return [item.id || item.serviceName, Number(item.quantity || 1)];
    const match = String(item).match(/^(.*?)\s+x(\d+)$/);
    return [match ? match[1] : String(item), match ? Number(match[2]) : 1];
  }));
  $("#customerBookingForm").querySelectorAll('input[name="customerServices"]').forEach((input) => {
    const service = readRecords("service").find((item) => item.id === input.value);
    const quantity = serviceQuantities.get(service?.id) || serviceQuantities.get(service?.serviceName);
    input.checked = Boolean(quantity);
    const quantityInput = $("#customerBookingForm").querySelector(`input[name="serviceQuantity-${input.value}"]`);
    if (quantityInput) {
      quantityInput.value = String(quantity || 1);
      quantityInput.disabled = !input.checked;
    }
  });
  $("#requestBoardingButton").textContent = "Update Request";
  updateCustomerEstimate();
  $("#customerBookingForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function boardingDays(dropoffTime, pickupTime) {
  if (!dropoffTime || !pickupTime) return 0;
  const drop = new Date(dropoffTime);
  const pick = new Date(pickupTime);
  if (pick <= drop) return 0;
  const dropDay = new Date(drop.getFullYear(), drop.getMonth(), drop.getDate());
  const pickDay = new Date(pick.getFullYear(), pick.getMonth(), pick.getDate());
  if (dropDay.getTime() === pickDay.getTime()) return 1;
  let days = Math.max(1, Math.round((pickDay - dropDay) / 86400000));
  if (pick.getHours() >= 12) days += 1;
  return days;
}

function isDayCareStay(dropoffTime, pickupTime) {
  if (!dropoffTime || !pickupTime) return false;
  const drop = new Date(dropoffTime);
  const pick = new Date(pickupTime);
  if (pick <= drop) return false;
  return drop.getFullYear() === pick.getFullYear() && drop.getMonth() === pick.getMonth() && drop.getDate() === pick.getDate();
}

function boardingBillingLabel(estimate = {}) {
  if (estimate.isDayCare) return "Day Care (1 boarding day)";
  return `${Number(estimate.days || 0)} boarding day(s)`;
}

function customerEstimateDetails() {
  const formEl = $("#customerBookingForm");
  const data = formPayload(formEl);
  const dogs = selectedCustomerDogs();
  const services = checkedFrom(formEl, "customerServices")
    .map((id) => {
      const service = readRecords("service").find((item) => item.id === id);
      if (!service) return null;
      const quantity = Math.max(1, Number(formEl.elements[`serviceQuantity-${id}`]?.value || 1));
      return { ...service, quantity };
    })
    .filter(Boolean);
  const days = boardingDays(data.dropoffTime, data.pickupTime);
  const isDayCare = isDayCareStay(data.dropoffTime, data.pickupTime);
  const boardingService = boardingPricingServiceForCustomer();
  const boardingRate = Number(boardingService?.basePrice || 0);
  const boardingCost = dogs.length * days * boardingRate;
  const serviceLines = services.map((service) => ({
    ...service,
    lineTotal: dogs.length * Number(service.basePrice || 0) * Number(service.quantity || 1),
  }));
  const serviceCost = serviceLines.reduce((total, service) => total + service.lineTotal, 0);
  return { dogs, services: serviceLines, days, isDayCare, boardingRate, boardingCost, serviceCost, total: boardingCost + serviceCost, dropoffTime: data.dropoffTime, pickupTime: data.pickupTime, requestNotes: data.requestNotes };
}

function boardingPricingServiceForCustomer(user = currentUser) {
  const activeBoarding = readRecords("service").filter((service) => service.category === "Boarding" && serviceHasFlag(service, "Active"));
  if (isMemberUser(user)) return activeBoarding.find((service) => serviceHasFlag(service, "Member Pricing")) || activeBoarding[0];
  return activeBoarding.find((service) => !serviceHasFlag(service, "Member Pricing")) || activeBoarding[0];
}

function updateCustomerEstimate() {
  if (!$("#customerEstimate")) return;
  const estimate = customerEstimateDetails();
  $("#customerEstimate").innerHTML = estimate.dogs.length
    ? `<strong>${escapeHtml(boardingBillingLabel(estimate))}</strong><div class="estimate-line"><span>Boarding</span><span>${estimate.dogs.length} dog(s) x ${estimate.days || 0} day(s) x ${money(estimate.boardingRate)} = ${money(estimate.boardingCost)}</span></div>${estimate.services.map((service) => `<div class="estimate-line"><span>${escapeHtml(service.serviceName)}</span><span>${estimate.dogs.length} dog(s) x ${Number(service.quantity || 1)} x ${money(service.basePrice)} = ${money(service.lineTotal)}</span></div>`).join("")}<div class="estimate-total"><strong>Estimated total</strong><span>${money(estimate.total)}</span></div>`
    : "Select dog(s), dates, and services to see an estimate.";
}

function showBookingConfirmDialog(estimate) {
  pendingCustomerBooking = estimate;
  const dogList = estimate.dogs.map((dog) => `<li>${escapeHtml(dog.dogName)}${dog.breedDescription ? ` (${escapeHtml(dog.breedDescription)})` : ""}</li>`).join("");
  const serviceList = estimate.services.length
    ? estimate.services.map((service) => `<li>${escapeHtml(service.serviceName)} x${Number(service.quantity || 1)} for ${estimate.dogs.length} dog(s) - ${money(service.lineTotal)} ${escapeHtml(service.unit || "")}</li>`).join("")
    : "<li>No added services selected</li>";
  $("#bookingConfirmBody").innerHTML = `
    <div class="booking-summary">
      <div><strong>Dog(s)</strong><ul>${dogList}</ul></div>
      <div><strong>Stay</strong><p>${formatDateTime(estimate.dropoffTime)} to ${formatDateTime(estimate.pickupTime)}</p><p>${boardingBillingLabel(estimate)} at ${money(estimate.boardingRate)} per day/night</p><p>Boarding subtotal: ${money(estimate.boardingCost)}</p></div>
      <div><strong>Services</strong><ul>${serviceList}</ul></div>
      <div class="estimate-total"><strong>Estimated total</strong><span>${money(estimate.total)}</span></div>
      ${estimate.requestNotes ? `<div><strong>Notes</strong><p>${escapeHtml(estimate.requestNotes)}</p></div>` : ""}
    </div>
  `;
  $("#bookingConfirmDialog").showModal();
}

async function submitPendingCustomerBooking() {
  const estimate = pendingCustomerBooking;
  if (!estimate?.dogs?.length) return;
  const editingId = $("#editingCustomerRequestId")?.value;
  const editingRecord = editingId ? readRecords("boardingDog").find((record) => record.id === editingId) : null;
  for (const dog of estimate.dogs) {
    const sharedBoardingRecord = dog.sourceBoardingDogId ? readRecords("boardingDog").find((record) => record.id === dog.sourceBoardingDogId && !record.removed) : null;
    const matchedBoardingRecord = findMatchingBoardingDogProfile(dog, { excludeId: editingRecord?.id || "" });
    const existingTarget = (editingRecord && (editingRecord.dogName === dog.dogName || estimate.dogs.length === 1)) ? editingRecord : sharedBoardingRecord || matchedBoardingRecord;
    const useExisting = Boolean(existingTarget);
    const existingStay = existingTarget?.stays?.[0] || {};
    const stay = {
      id: editingRecord ? existingStay.id || uid("stay") : uid("stay"),
      status: editingRecord ? existingStay.status || normalizeBoardingStatus(editingRecord) : "Pending",
      createdAt: editingRecord ? existingStay.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dropoffTime: estimate.dropoffTime,
      pickupTime: estimate.pickupTime,
      stayType: estimate.isDayCare ? "Day Care" : "Boarding",
      billingDays: estimate.days,
      requests: estimate.services.map((service) => `${service.serviceName}${Number(service.quantity || 1) > 1 ? ` x${service.quantity}` : ""} requested`),
      stayNotes: estimate.requestNotes,
      estimatedTotal: estimate.total,
    };
    stay.bathPlan = bathPlanForStay(stay);
    const existingStays = useExisting ? [...(existingTarget.stays || [])] : [];
    const stayIndex = editingRecord ? existingStays.findIndex((item) => item.id === stay.id) : -1;
    if (stayIndex >= 0) existingStays[stayIndex] = stay;
    else existingStays.unshift(stay);
    const ownerEmail = normalizeEmail(existingTarget?.ownerEmail || dog.ownerEmail || currentUser?.email);
    const secondaryOwnerEmail = normalizeEmail(existingTarget?.secondaryOwnerEmail || dog.secondaryOwnerEmail);
    const existingStatus = useExisting ? normalizeBoardingStatus(existingTarget) : "Pending";
    const activeExistingStatus = ["Checked In", "In Kennel", "Ready For Pickup"].includes(existingStatus);
    const requestStatus = editingRecord ? existingStatus : activeExistingStatus ? existingStatus : "Pending";
    const statusHistory = useExisting
      ? [
          ...(existingTarget.statusHistory || []),
          ...(requestStatus !== existingStatus ? [{ from: existingStatus, to: requestStatus, date: new Date().toISOString(), by: currentUser?.name || dog.ownerName || "", source: "customer-request" }] : []),
        ]
      : [{ from: "", to: "Pending", date: new Date().toISOString(), by: currentUser?.name || dog.ownerName || "", source: "customer-request" }];
    const payload = {
      ...(useExisting ? existingTarget : {}),
      type: "boardingDog",
      id: useExisting ? existingTarget.id : uid("boardingDog"),
      submittedAt: useExisting ? existingTarget.submittedAt || new Date().toISOString() : new Date().toISOString(),
      boardingStatus: requestStatus,
      statusHistory,
      customerRequest: true,
      dogName: dog.dogName,
      breedDescription: dog.breedDescription,
      ownerName: dog.ownerName,
      ownerPhone: dog.ownerPhone,
      ownerEmail,
      customerEmail: ownerEmail,
      secondaryOwnerEmail,
      requestedByEmail: currentUser?.email || ownerEmail,
      requestedByName: currentUser?.name || dog.ownerName || "",
      linkedCustomerDogId: dog.isSharedBoardingDog ? existingTarget?.linkedCustomerDogId || "" : dog.id,
      linkedOwnerEmail: ownerEmail,
      emergencyName: dog.emergencyName,
      emergencyPhone: dog.emergencyPhone,
      specialCare: dog.specialCare,
      foodInstructions: dog.foodInstructions || existingTarget?.foodInstructions || "",
      spayNeuterStatus: dog.spayNeuterStatus,
      dhppDate: dog.dhppDate,
      rabiesDate: dog.rabiesDate,
      rabiesDuration: dog.rabiesDuration,
      profilePhotoUrl: dog.profilePhotoUrl || "",
      vaccinationRecords: dog.vaccinationRecords || [],
      vaccinationFiles: dog.vaccinationFiles || "",
      estimatedTotal: estimate.total,
      stayType: estimate.isDayCare ? "Day Care" : "Boarding",
      billingDays: estimate.days,
      requestedServices: estimate.services.map((service) => ({ id: service.id, serviceName: service.serviceName, quantity: Number(service.quantity || 1), unitPrice: Number(service.basePrice || 0) })),
      flags: ["Required update from owner"],
      stays: existingStays,
      cancelledAt: requestStatus === "Pending" ? "" : existingTarget?.cancelledAt || "",
      checkedOutAt: requestStatus === "Pending" ? "" : existingTarget?.checkedOutAt || "",
    };
    const record = await saveAndNotify(payload, editingId ? "customerBoardingRequestUpdated" : "customerBoardingRequestCreated");
    await ensureCustomerAccessProfile({
      email: record.ownerEmail,
      name: record.ownerName,
      customerDogId: dog.isSharedBoardingDog ? record.linkedCustomerDogId : dog.id,
      boardingDogId: record.id,
    });
    if (record.secondaryOwnerEmail) {
      await ensureCustomerAccessProfile({
        email: record.secondaryOwnerEmail,
        name: record.secondaryOwnerName || record.ownerName,
        boardingDogId: record.id,
      });
    }
  }
  pendingCustomerBooking = null;
  $("#bookingConfirmDialog").close();
  resetCustomerBookingForm();
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerDogs();
  renderCustomerRequests();
  renderDashboard();
  switchPage("customerRequestsPage");
  showDetailDialog(editingId ? "Request Updated" : "Request Sent", `<p>Your boarding request has been sent for approval.</p><p>${estimate.dogs.length} dog(s), ${boardingBillingLabel(estimate)}, estimated total ${money(estimate.total)}.</p>`);
}

function renderServices() {
  const query = $("#serviceSearch")?.value || "";
  const columns = tableColumns.service;
  const records = sortRecordsForTable("service", readRecords("service").filter((record) => matches(record, query)));
  const groupContainer = $("#serviceCatalogGroups");
  if (groupContainer) {
    const active = readRecords("service").filter((record) => serviceHasFlag(record, "Active"));
    const customerBookable = active.filter((record) => !serviceHasFlag(record, "Admin only"));
    const internal = active.filter((record) => serviceHasFlag(record, "Admin only"));
    groupContainer.innerHTML = [
      ["Customer-bookable", customerBookable],
      ["Internal / Admin-only", internal],
    ]
      .map(([label, group]) => `<article class="service-group-card"><strong>${escapeHtml(label)}</strong><span>${group.length}</span><p>${escapeHtml(group.map((record) => record.serviceName).join(", ") || "None active")}</p></article>`)
      .join("");
  }
  $("#serviceTableHead").innerHTML = tableHeaderHtml("service", columns);
  $("#serviceTableBody").innerHTML = records.length
    ? records
        .map((record) => `<tr data-id="${record.id}"><td>${escapeHtml(record.serviceName || "")}</td><td>${escapeHtml(record.category || "")}</td><td>${money(record.basePrice)}</td><td>${escapeHtml(record.unit || "")}</td><td>${record.depositAmount ? money(record.depositAmount) : ""}</td><td>${record.taxRate ? `${escapeHtml(record.taxRate)}%` : ""}</td><td>${serviceFlagChipsHtml(record.flags)}</td></tr>`)
        .join("")
    : `<tr><td colspan="7">No services saved yet.</td></tr>`;
}

function openService(record = {}) {
  $("#serviceForm").reset();
  setFormValues($("#serviceForm"), record);
  const flags = normalizedServiceFlags(record.flags || ["Active"]);
  $$('input[name="serviceFlags"]').forEach((input) => {
    input.checked = flags.includes(input.value);
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
  renderBoardingRequests();
  renderRequests();
  renderMaintenance();
  renderTimesheet();
  renderServices();
  renderFinancials();
  renderCfoNotes();
  renderSettingsUsers();
  renderKennelLocations();
  renderAuditLog();
  renderNotifications();
  renderCustomerDogs();
  renderCustomerRequests();
  renderDemoSubmissions();
  updateTimeDisplays();
  renderGlobalSearchResults();
}

function globalSearchEntries() {
  const entries = [];
  readRecords("ownedDog").filter((record) => !record.removed).forEach((record) => entries.push({ label: ownedDogDisplayName(record), detail: ownedDogCareSummary(record), type: "ownedDog", id: record.id, pageId: "ourDogsPage" }));
  readRecords("boardingDog").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.dogName || "Boarding dog", detail: [record.ownerName, normalizeBoardingStatus(record), boardingScheduleText(record)].filter(Boolean).join(" | "), type: "boardingDog", id: record.id, pageId: "boardingDogsPage" }));
  readRecords("request").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.category || "Request", detail: record.requestText || record.reason || "", type: "request", id: record.id, pageId: "requestsPage" }));
  readRecords("maintenance").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.location || "Maintenance", detail: record.issue || record.suggestedAction || "", type: "maintenance", id: record.id, pageId: "maintenancePage" }));
  readRecords("service").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.serviceName || "Service", detail: [record.category, money(record.basePrice)].filter(Boolean).join(" | "), type: "service", id: record.id, pageId: "servicesPage" }));
  readRecords("calendarNote").filter((record) => !record.removed).forEach((record) => entries.push({ label: record.noteKind === "staff" ? "Staff Note" : "Special Note", detail: `${calendarNoteDate(record)} | ${record.note || ""}`, type: "calendarNote", id: record.id, pageId: "dashboardPage" }));
  readRecords("settingsUser").filter((record) => !record.removed && currentRole() === "admin").forEach((record) => entries.push({ label: record.name || record.email || "User", detail: [record.email, roleLabel(record.role)].filter(Boolean).join(" | "), type: "settingsUser", id: record.id, pageId: "settingsUsersPage" }));
  return entries;
}

function renderGlobalSearchResults() {
  const panel = $("#globalSearchPanel");
  const input = $("#globalQuickSearch");
  const list = $("#globalSearchResults");
  if (!panel || !input || !list) return;
  panel.hidden = !helperIsLoggedIn();
  const query = input.value.trim().toLowerCase();
  if (!query) {
    list.innerHTML = `<p>Type a dog, owner, request, service, note, or user name.</p>`;
    return;
  }
  const results = globalSearchEntries()
    .filter((entry) => pageAllowed(entry.pageId) && `${entry.label} ${entry.detail}`.toLowerCase().includes(query))
    .slice(0, 8);
  list.innerHTML = results.length
    ? results.map((entry) => `<button type="button" class="global-search-result" data-type="${escapeHtml(entry.type)}" data-id="${escapeHtml(entry.id)}" data-page="${escapeHtml(entry.pageId)}"><strong>${escapeHtml(entry.label)}</strong><span>${escapeHtml(entry.detail || entry.type)}</span></button>`).join("")
    : `<p>No matching records.</p>`;
}

function openGlobalSearchResult(button) {
  const type = button.dataset.type;
  const id = button.dataset.id;
  const pageId = button.dataset.page;
  switchPage(pageId);
  if (type === "ownedDog") {
    const record = readRecords("ownedDog").find((item) => item.id === id);
    if (record) openOwnedDogOverviewPopup(record);
  } else if (type === "boardingDog") {
    const record = readRecords("boardingDog").find((item) => item.id === id);
    if (record) openBoardingDog(record);
  } else if (type === "settingsUser") {
    const record = readRecords("settingsUser").find((item) => item.id === id);
    if (record) openSettingsUserPopup(record);
  } else {
    const record = readRecords(type).find((item) => item.id === id);
    if (record) showDetailDialog(titleForRecord(type, record), detailForRecord(type, record));
  }
  $("#globalQuickSearch").value = "";
  renderGlobalSearchResults();
}

function currentUserNotificationKey() {
  return normalizeEmail(currentUser?.email || helperEmail?.value || currentUser?.name || helperName?.value || "unknown");
}

function notificationVisibleToCurrentUser(notification = {}) {
  if (!currentUser) return false;
  if (currentRole() === "admin") return true;
  const audienceEmails = (notification.audienceEmails || []).map(normalizeEmail);
  return audienceEmails.includes(normalizeEmail(currentUser.email || helperEmail.value));
}

function notificationIsRead(notification = {}) {
  return (notification.readBy || []).includes(currentUserNotificationKey());
}

function notificationEventConfig(eventName = "", record = {}) {
  const configs = {
    customerBoardingRequestCreated: {
      title: `New boarding request: ${record.dogName || "Customer dog"}`,
      message: `${record.ownerName || record.ownerEmail || "A customer"} requested ${record.stayType || "boarding"}${boardingScheduleText(record) ? ` for ${boardingScheduleText(record)}` : ""}.`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    customerBoardingRequestUpdated: {
      title: `Boarding request updated: ${record.dogName || "Customer dog"}`,
      message: `${record.ownerName || record.ownerEmail || "A customer"} updated a boarding request.`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    urgentKennelRequestCreated: {
      title: `Urgent request: ${record.category || "Kennel request"}`,
      message: record.requestText || "An urgent kennel request was submitted.",
      priority: "urgent",
      channels: ["email", "sms", "inApp"],
      audienceRoles: ["admin"],
    },
    urgentMaintenanceCreated: {
      title: `Urgent maintenance: ${record.location || "Kennel"}`,
      message: record.issue || "An urgent maintenance item was submitted.",
      priority: "urgent",
      channels: ["email", "sms", "inApp"],
      audienceRoles: ["admin"],
    },
    timeOffRequested: {
      title: `Time off request: ${record.staffName || "Staff"}`,
      message: `${record.staffName || "Staff"} requested ${dateRangeText(record.startDate, record.endDate)} off.`,
      priority: "review",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
    },
    timeOffReviewed: {
      title: `Time off ${String(record.status || "").toLowerCase()}: ${dateRangeText(record.startDate, record.endDate)}`,
      message: `${record.reviewedBy || "Admin"} marked your time off request ${record.status || "reviewed"}.`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: [record.staffEmail].filter(Boolean),
    },
    schedulePublished: {
      title: "Kennel schedule published",
      message: `The schedule for ${dateRangeText(record.weekStart, addDays(record.weekStart, 6))} has been published.`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["helper", "admin"],
    },
    scheduleChangedAfterPublish: {
      title: `Schedule changed: ${record.staffName || "Staff"}`,
      message: `${record.staffName || "A staff member"} has a schedule change on ${record.date || "the published schedule"}.`,
      priority: "review",
      channels: ["email", "inApp"],
      audienceEmails: [record.staffEmail].filter(Boolean),
      audienceRoles: ["admin"],
    },
  };
  return configs[eventName] || null;
}

function notificationAudienceEmails(config = {}) {
  const emails = [...(config.audienceEmails || [])];
  if ((config.audienceRoles || []).includes("admin")) emails.push(...ADMIN_EMAILS);
  if ((config.audienceRoles || []).includes("helper") || (config.audienceRoles || []).includes("admin")) {
    settingsUsers()
      .filter((user) => !user.removed && (config.audienceRoles || []).includes(user.role))
      .forEach((user) => emails.push(user.email));
  }
  return [...new Set(emails.map(normalizeEmail).filter(Boolean))];
}

function createNotificationRecord(record = {}, eventName = "", config = {}) {
  const now = new Date().toISOString();
  const sourceType = record.type || "";
  const sourceId = record.id || uid("source");
  const dedupeKey = `${eventName}:${sourceType}:${sourceId}:${record.updatedAt || record.submittedAt || now}`;
  const existing = readRecords("notificationLog").find((item) => item.dedupeKey === dedupeKey && !item.removed);
  if (existing) return existing;
  return upsertRecord("notificationLog", {
    type: "notificationLog",
    id: uid("notification"),
    submittedAt: now,
    eventName,
    dedupeKey,
    title: config.title,
    message: config.message,
    priority: config.priority || "normal",
    channels: config.channels || ["inApp"],
    audienceRoles: config.audienceRoles || [],
    audienceEmails: notificationAudienceEmails(config),
    sourceType,
    sourceId,
    sourceSnapshot: payloadForSheet(record),
    readBy: [],
    deliveryStatus: "queued",
  });
}

async function notifyIfNeeded(record = {}, eventName = "") {
  const config = notificationEventConfig(eventName, record);
  if (!config) return null;
  const notification = createNotificationRecord(record, eventName, config);
  renderNotifications();
  if (!supabaseClient || localTestMode) {
    return notification;
  }
  try {
    const { error } = await supabaseClient.functions.invoke("send-notification", {
      body: { eventName, recordId: record.id, record: payloadForSheet(record), notificationId: notification.id },
    });
    if (error) throw error;
    const updated = upsertRecord("notificationLog", { ...notification, deliveryStatus: "sent" });
    await sendPayload(updated);
    renderNotifications();
    return updated;
  } catch (error) {
    const failed = upsertRecord("notificationLog", { ...notification, deliveryStatus: "in-app only", deliveryError: error.message || String(error) });
    await sendPayload(failed);
    renderNotifications();
    return failed;
  }
}

async function saveAndNotify(record = {}, eventName = "") {
  const saved = upsertRecord(record.type, record);
  await sendPayload(saved);
  if (eventName) await notifyIfNeeded(saved, eventName);
  return saved;
}

function renderNotifications() {
  const button = $("#notificationBellButton");
  const badge = $("#notificationUnreadBadge");
  const panel = $("#notificationPanel");
  const list = $("#notificationList");
  const summary = $("#notificationPanelSummary");
  if (!button || !badge || !panel || !list || !summary) return;
  const available = readRecords("notificationLog")
    .filter((item) => !item.removed && notificationVisibleToCurrentUser(item))
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
  const unread = available.filter((item) => !notificationIsRead(item));
  button.hidden = !helperIsLoggedIn();
  badge.textContent = unread.length;
  badge.hidden = !unread.length;
  summary.textContent = unread.length ? `${unread.length} unread alert${unread.length === 1 ? "" : "s"}.` : "No unread alerts.";
  list.innerHTML = available.length
    ? available.slice(0, 12).map((item) => `<article class="notification-item ${notificationIsRead(item) ? "is-read" : ""} ${item.priority === "urgent" ? "is-urgent" : ""}" data-action="open-notification" data-id="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title || "Notification")}</strong><p>${escapeHtml(item.message || "")}</p><span>${escapeHtml(formatDateTime(item.submittedAt || item.updatedAt))} | ${escapeHtml((item.channels || []).join(", ") || "in-app")}</span></article>`).join("")
    : "<p>No notifications yet.</p>";
}

async function markNotificationRead(id = "") {
  const record = readRecords("notificationLog").find((item) => item.id === id);
  if (!record) return null;
  const readBy = [...new Set([...(record.readBy || []), currentUserNotificationKey()].filter(Boolean))];
  const updated = upsertRecord("notificationLog", { ...record, readBy });
  await sendPayload(updated);
  renderNotifications();
  return updated;
}

async function markAllNotificationsRead() {
  const visible = readRecords("notificationLog").filter((item) => !item.removed && notificationVisibleToCurrentUser(item) && !notificationIsRead(item));
  for (const item of visible) {
    const readBy = [...new Set([...(item.readBy || []), currentUserNotificationKey()].filter(Boolean))];
    await sendPayload(upsertRecord("notificationLog", { ...item, readBy }));
  }
  renderNotifications();
}

async function openNotification(id = "") {
  const notification = await markNotificationRead(id);
  if (!notification) return;
  $("#notificationPanel").hidden = true;
  const sourceType = notification.sourceType;
  const sourceId = notification.sourceId;
  if (sourceType === "boardingDog") {
    const record = readRecords("boardingDog").find((item) => item.id === sourceId);
    if (record) {
      switchPage("boardingDogsPage");
      openBoardingDog(record);
      return;
    }
  }
  if (sourceType === "request" || sourceType === "maintenance") {
    const record = readRecords(sourceType).find((item) => item.id === sourceId);
    if (record) {
      showDetailDialog(titleForRecord(sourceType, record), detailForRecord(sourceType, record), { type: sourceType, id: record.id });
      return;
    }
  }
  if (sourceType === "timeOffRequest") {
    const record = readRecords("timeOffRequest").find((item) => item.id === sourceId);
    if (record) {
      openTimeOffReviewPopup(record);
      return;
    }
  }
  showDetailDialog(notification.title || "Notification", `<p>${escapeHtml(notification.message || "")}</p>`);
}

function emailNow(subjectText, bodyText) {
  window.location.href = `mailto:${OWNER_ALERT_EMAIL}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
}

function normalizeHelperName(value = "") {
  return value.toLowerCase().replace(/^ms\.?\s+/, "").replace(/\s+/g, " ").trim();
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

function updateTimeDisplays() {
  if (activeClockIn?.clockInTime && currentUser?.email) {
    const openRecord = readRecords("timesheet").find((record) => record.id === activeClockIn.id);
    if (openRecord && !timesheetBelongsToCurrentUser(openRecord)) {
      activeClockIn = "";
      localStorage.removeItem("cth-active-clock-in");
    }
  }
  if (!activeClockIn?.clockInTime) syncActiveClockInFromOpenRecord();
  $("#clockInDisplay").textContent = activeClockIn?.clockInTime ? formatDateTime(activeClockIn.clockInTime) : "Not clocked in";
  $("#clockInButton").textContent = activeClockIn?.clockInTime ? "Clock Out" : "Clock In";
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

  $("#timesheetRows").innerHTML = currentWeekRecords.length
    ? currentWeekRecords.map((record) => {
        const canEdit = isAdmin || canEditOwnToday(record);
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
	    ? Object.entries(helperTotals).map(([helper, hours]) => `<div class="helper-total-item"><strong>${escapeHtml(isAdmin ? helper : "Your total")}</strong><span>${hours.toFixed(2)} hours this week</span></div>`).join("")
	    : "";
	  if ($("#timesheetAdminActions")) $("#timesheetAdminActions").hidden = !isAdmin;
	  renderTimesheetTabs();
	  renderScheduleTab();
	  renderTimeOffTab();
	  renderHolidayTab();
	  renderScheduleReviewTab();
	}

function saveTimeEntry(payload, options = {}) {
  const existing = payload.id ? readRecords("timesheet").find((record) => record.id === payload.id) : null;
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
  };
  upsertRecord("timesheet", record);
  sendPayload(record);
  renderTimesheet();
  if (!options.silent) showToast("Time entry saved.");
  return record;
}

function timesheetStaffChoices(record = {}) {
  const choices = settingsUsers()
    .filter((user) => ["helper", "admin"].includes(user.role))
    .map((user) => ({ name: user.name || user.email || "Staff", email: user.email || "", id: user.id || "" }));
  if (currentUser && ["helper", "admin"].includes(currentRole())) {
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
    return `<option value="${escapeHtml(value)}" data-name="${escapeHtml(staff.name || "")}" data-email="${escapeHtml(staff.email || "")}" ${selected ? "selected" : ""}>${escapeHtml(staff.name || staff.email || "Staff")}</option>`;
  }).join("");
  const clockInValue = dateTimeLocalValue(record.clockInTime) || "";
  const clockOutValue = dateTimeLocalValue(record.clockOutTime) || "";
  return `<form id="timesheetEditForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
    <input type="hidden" name="manualTimeId" value="${escapeHtml(record.id || "")}" />
    <input type="hidden" name="manualHelper" value="${escapeHtml(helperValue)}" />
    <input type="hidden" name="manualHelperEmail" value="${escapeHtml(helperEmailValue)}" />
    <div class="field-grid">
      <label>Staff name<select name="manualStaffKey" id="timesheetStaffSelect" ${isAdmin ? "" : "disabled"} required>${staffOptions || `<option value="${escapeHtml(helperValue)}" data-name="${escapeHtml(helperValue)}" data-email="${escapeHtml(helperEmailValue)}">${escapeHtml(helperValue || "Current staff")}</option>`}</select><small>${isAdmin ? "Select from saved Staff/Admin users." : "Staff is set from your login."}</small></label>
      <label>Staff email<input type="email" name="manualHelperEmailDisplay" value="${escapeHtml(helperEmailValue)}" readonly /></label>
      <label>Entry date<input type="date" name="manualDate" value="${escapeHtml(localDateFromStoredDateTime(record.clockInTime) || record.date || todayDate())}" required /></label>
      <label>Clock in<input type="datetime-local" name="manualClockIn" value="${escapeHtml(clockInValue)}" required /></label>
      <label>Clock out<input type="datetime-local" name="manualClockOut" value="${escapeHtml(clockOutValue)}" required /></label>
    </div>
    <label>Timesheet note<textarea name="manualNote" rows="3" placeholder="Reason for manual entry or edit">${escapeHtml(record.note || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Timesheet</button>${canDelete ? `<button type="button" class="secondary-button danger-button" data-action="delete-timesheet" data-id="${escapeHtml(record.id)}">Delete Timesheet</button>` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
}

function openTimesheetEditPopup(record = {}) {
  showDetailDialog("Edit Timesheet", timesheetEditFormHtml(record));
}

function openTimesheetDeleteConfirm(record = {}) {
  showDetailDialog(
    "Delete Timesheet?",
    `<article class="record-card compact-record-card">
      <strong>${escapeHtml(record.helperName || "Timesheet entry")}</strong>
      <p>${escapeHtml([record.date, formatDateTime(record.clockInTime), formatDateTime(record.clockOutTime)].filter(Boolean).join(" | "))}</p>
      <p>This removes the timesheet entry from active records. Admin audit history will keep the removal action.</p>
      <div class="record-actions">
        <button type="button" class="secondary-button danger-button" data-action="confirm-delete-timesheet" data-id="${escapeHtml(record.id || "")}">Confirm Delete</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </article>`,
  );
}

async function removeTimesheetEntryById(id = "") {
  if (currentRole() !== "admin") {
    showToast("Admin access required to delete a timesheet entry.");
    return null;
  }
  const removed = await markRecordRemoved("timesheet", id);
  if (!removed) return null;
  await addAuditLog("Deleted timesheet", "timesheet", removed, `${removed.helperName || "Staff"} | ${removed.date || ""}`);
  renderTimesheet();
  return removed;
}

function dateRangeText(start = "", end = "") {
  if (!start && !end) return "";
  if (!end || start === end) return start || end;
  return `${start} to ${end}`;
}

function scheduleWeekStartString(value = scheduleWeekDate) {
  const source = dateOnly(value) || todayDate();
  return weekStart(new Date(`${source}T12:00:00`)).toISOString().slice(0, 10);
}

function scheduleWeekDates(value = scheduleWeekDate) {
  const start = scheduleWeekStartString(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function setTimesheetTab(tab = "clock") {
  timesheetTab = ["clock", "schedule", "timeOff", "holidays", "review"].includes(tab) ? tab : "clock";
  renderTimesheet();
}

function renderTimesheetTabs() {
  $$("#timesheetTabs [data-timesheet-tab]").forEach((button) => {
    const active = button.dataset.timesheetTab === timesheetTab;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  $$("[data-timesheet-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.timesheetPanel !== timesheetTab;
  });
}

function staffRecordBelongsToCurrentUser(record = {}) {
  if (!currentUser) return false;
  const email = normalizeEmail(currentUser.email || helperEmail.value);
  const recordEmail = normalizeEmail(record.staffEmail || record.helperEmail || "");
  if (email && recordEmail && email === recordEmail) return true;
  const currentNames = [currentUser.name, helperName.value].filter(Boolean).map(normalizeHelperName);
  return currentNames.includes(normalizeHelperName(record.staffName || record.helperName || ""));
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

function timeToMinutes(value = "") {
  const [hours = "0", minutes = "0"] = String(value).split(":");
  return Number(hours) * 60 + Number(minutes);
}

function shiftHours(shift = {}) {
  const start = timeToMinutes(shift.startTime);
  const end = timeToMinutes(shift.endTime);
  return Math.max(0, (end - start) / 60);
}

function displayTime(value = "") {
  if (!value) return "";
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

function formatShiftTime(shift = {}) {
  return [displayTime(shift.startTime), displayTime(shift.endTime)].filter(Boolean).join(" - ");
}

function staffOptionHtml(record = {}) {
  const selectedStaff = selectedTimesheetStaff({ helperName: record.staffName, helperEmail: record.staffEmail });
  return timesheetStaffChoices({ helperName: record.staffName, helperEmail: record.staffEmail }).map((staff) => {
    const value = timesheetStaffOptionValue(staff);
    const selected = value === timesheetStaffOptionValue(selectedStaff);
    return `<option value="${escapeHtml(value)}" data-name="${escapeHtml(staff.name || "")}" data-email="${escapeHtml(staff.email || "")}" ${selected ? "selected" : ""}>${escapeHtml(staff.name || staff.email || "Staff")}</option>`;
  }).join("");
}

function selectedStaffFromSelect(selectEl) {
  const option = selectEl?.selectedOptions?.[0];
  return {
    name: option?.dataset.name || option?.textContent || currentUser?.name || helperName.value || "Unknown staff",
    email: option?.dataset.email || option?.value || currentUser?.email || helperEmail.value || "",
  };
}

function weekIsPublished(start = scheduleWeekStartString()) {
  return readRecords("schedulePublish").some((record) => !record.removed && record.weekStart === start && record.status === "Published");
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
  if (holiday) warnings.push(`${holiday.name || "Holiday"}: ${holiday.closed ? "closed" : holiday.limitedStaffing ? "limited staffing" : "holiday note"}.`);
  staffTimeOffForDate(shift.staffEmail, shift.date).forEach((request) => {
    warnings.push(`${shift.staffName || "Staff"} has ${String(request.status || "Pending").toLowerCase()} time off for this date.`);
  });
  readRecords("staffSchedule")
    .filter((record) => !record.removed && record.status !== "Cancelled" && record.id !== shift.id && normalizeEmail(record.staffEmail) === normalizeEmail(shift.staffEmail))
    .filter((record) => shiftOverlaps(record, shift))
    .forEach((record) => warnings.push(`Overlaps ${formatShiftTime(record)} on ${record.date}.`));
  return warnings;
}

function renderScheduleTab() {
  const grid = $("#scheduleWeekGrid");
  const summary = $("#scheduleSummaryGrid");
  if (!grid || !summary) return;
  const start = scheduleWeekStartString();
  const shifts = staffScheduleRecordsForWeek(start);
  const holidays = holidaysForRange(start, addDays(start, 7));
  const totalHours = shifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  const published = weekIsPublished(start);
  summary.innerHTML = [
    ["Week", dateRangeText(start, addDays(start, 6)), published ? "Published" : "Draft"],
    ["Scheduled hours", totalHours.toFixed(2), "Across visible staff"],
    ["Open days", scheduleWeekDates(start).filter((date) => !shifts.some((shift) => shift.date === date)).length, "No shift saved"],
    ["Holiday flags", holidays.length, "This week"],
  ].map(([label, value, note]) => `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p>${escapeHtml(String(note))}</p></div>`).join("");
  grid.innerHTML = scheduleWeekDates(start).map((date) => {
    const dayShifts = shifts.filter((shift) => shift.date === date).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const holiday = holidayForDate(date);
    return `<article class="schedule-day-card">
      <header><strong>${escapeHtml(new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }))}</strong><span>${escapeHtml(date.slice(5))}</span></header>
      ${holiday ? `<div class="status-chip">${escapeHtml(holiday.name || "Holiday")}</div>` : ""}
      ${dayShifts.length ? dayShifts.map((shift) => {
        const warnings = scheduleWarningsForShift(shift);
        return `<button type="button" class="schedule-shift-card ${warnings.length ? "is-warning" : ""}" data-action="edit-shift" data-id="${escapeHtml(shift.id)}"><strong>${escapeHtml(shift.staffName || "Staff")}</strong><span>${escapeHtml(formatShiftTime(shift))}</span><span>${escapeHtml([shift.role, shift.location, shift.status].filter(Boolean).join(" | "))}</span></button>`;
      }).join("") : `<p>No shifts scheduled.</p>`}
    </article>`;
  }).join("");
  const isAdmin = currentRole() === "admin";
  ["#openScheduleShiftButton", "#publishScheduleButton", "#copyLastWeekScheduleButton", "#openHolidayButton"].forEach((selector) => {
    const el = $(selector);
    if (el) el.hidden = !isAdmin;
  });
}

function renderTimeOffTab() {
  const list = $("#timeOffRequestList");
  if (!list) return;
  const records = timeOffRequests().sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
  const isAdmin = currentRole() === "admin";
  list.innerHTML = records.length
    ? records.map((record) => {
      const conflicts = readRecords("staffSchedule").filter((shift) => !shift.removed && shift.status !== "Cancelled" && normalizeEmail(shift.staffEmail) === normalizeEmail(record.staffEmail) && shift.date >= record.startDate && shift.date <= record.endDate);
      const actions = isAdmin ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="review-time-off" data-id="${escapeHtml(record.id)}">Review</button></div>` : "";
      return `<article class="record-card compact-record-card ${record.status === "Pending" ? "is-urgent" : ""}"><strong>${escapeHtml(record.staffName || "Staff")} - ${escapeHtml(record.status || "Pending")}</strong><span>${escapeHtml(dateRangeText(record.startDate, record.endDate))}</span><p>${escapeHtml(record.reason || "No reason recorded.")}</p>${conflicts.length ? `<p>${conflicts.length} scheduled shift conflict${conflicts.length === 1 ? "" : "s"}.</p>` : ""}${actions}</article>`;
    }).join("")
    : "<p>No time off requests yet.</p>";
}

function renderHolidayTab() {
  const list = $("#holidayList");
  if (!list) return;
  const records = readRecords("kennelHoliday").filter((record) => !record.removed).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const isAdmin = currentRole() === "admin";
  list.innerHTML = records.length
    ? records.map((record) => `<article class="record-card compact-record-card"><strong>${escapeHtml(record.name || "Holiday")}</strong><span>${escapeHtml(record.date || "")} | ${record.closed ? "Closed" : record.limitedStaffing ? "Limited staffing" : "Holiday note"}</span><p>${escapeHtml(record.staffingNote || "")}</p>${isAdmin ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-holiday" data-id="${escapeHtml(record.id)}">Edit</button></div>` : ""}</article>`).join("")
    : "<p>No holidays saved yet.</p>";
}

function reviewIssuesForWeek(start = scheduleWeekStartString()) {
  const dates = scheduleWeekDates(start);
  const shifts = staffScheduleRecordsForWeek(start);
  const timesheets = readRecords("timesheet").filter((record) => !record.removed && record.date >= start && record.date < addDays(start, 7));
  const issues = [];
  dates.forEach((date) => {
    if (!shifts.some((shift) => shift.date === date)) issues.push({ title: "Missing coverage", detail: `No staff shift saved for ${date}.`, priority: "review" });
  });
  shifts.forEach((shift) => {
    scheduleWarningsForShift(shift).forEach((warning) => issues.push({ title: `${shift.staffName || "Staff"} schedule warning`, detail: warning, priority: "review" }));
    const clocked = timesheets.some((entry) => normalizeEmail(entry.helperEmail) === normalizeEmail(shift.staffEmail) && entry.date === shift.date);
    if (!clocked && shift.date <= todayDate()) issues.push({ title: "Scheduled staff has no clock record", detail: `${shift.staffName || "Staff"} was scheduled ${shift.date} ${formatShiftTime(shift)}.`, priority: "review" });
  });
  timesheets.forEach((entry) => {
    if (entry.clockInTime && !entry.clockOutTime) issues.push({ title: "Open clock-in", detail: `${entry.helperName || "Staff"} still has an open clock-in from ${formatDateTime(entry.clockInTime)}.`, priority: "urgent" });
    const scheduled = shifts.some((shift) => normalizeEmail(shift.staffEmail) === normalizeEmail(entry.helperEmail) && shift.date === entry.date);
    if (!scheduled) issues.push({ title: "Unscheduled clock-in", detail: `${entry.helperName || "Staff"} clocked in on ${entry.date} without a saved shift.`, priority: "review" });
  });
  return issues;
}

function renderScheduleReviewTab() {
  const summary = $("#scheduleReviewSummary");
  const list = $("#scheduleReviewIssues");
  if (!summary || !list) return;
  const start = scheduleWeekStartString();
  const shifts = staffScheduleRecordsForWeek(start);
  const timesheets = readRecords("timesheet").filter((record) => !record.removed && record.date >= start && record.date < addDays(start, 7));
  const issues = reviewIssuesForWeek(start);
  const scheduledHours = shifts.reduce((sum, shift) => sum + shiftHours(shift), 0);
  const actualHours = timesheets.reduce((sum, record) => sum + Number(record.hours || 0), 0);
  summary.innerHTML = [
    ["Scheduled", scheduledHours.toFixed(2), "hours"],
    ["Actual", actualHours.toFixed(2), "hours"],
    ["Difference", (actualHours - scheduledHours).toFixed(2), "actual minus scheduled"],
    ["Issues", issues.length, "need review"],
  ].map(([label, value, note]) => `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p>${escapeHtml(note)}</p></div>`).join("");
  list.innerHTML = issues.length
    ? issues.map((issue) => `<article class="record-card compact-record-card ${issue.priority === "urgent" ? "is-urgent" : ""}"><strong>${escapeHtml(issue.title)}</strong><p>${escapeHtml(issue.detail)}</p></article>`).join("")
    : "<p>No schedule issues found for this week.</p>";
}

function scheduleShiftFormHtml(record = {}) {
  const isEdit = Boolean(record.id);
  const start = scheduleWeekStartString();
  const date = record.date || start;
  const selected = selectedTimesheetStaff({ helperName: record.staffName, helperEmail: record.staffEmail });
  const warnings = scheduleWarningsForShift({ ...record, staffName: selected.name, staffEmail: selected.email, date, startTime: record.startTime || "08:00", endTime: record.endTime || "12:00" });
  return `<form id="scheduleShiftForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Staff<select name="staffKey" required>${staffOptionHtml(record)}</select></label>
      <label>Date<input type="date" name="date" value="${escapeHtml(date)}" required /></label>
      <label>Start time<input type="time" name="startTime" value="${escapeHtml(record.startTime || "08:00")}" required /></label>
      <label>End time<input type="time" name="endTime" value="${escapeHtml(record.endTime || "12:00")}" required /></label>
      <label>Role<input type="text" name="role" value="${escapeHtml(record.role || "Kennel Care")}" /></label>
      <label>Location<input type="text" name="location" value="${escapeHtml(record.location || "")}" placeholder="Shed, Mansion, both" /></label>
    </div>
    <label>Shift note<textarea name="notes" rows="3">${escapeHtml(record.notes || "")}</textarea></label>
    ${warnings.length ? `<ul class="schedule-warning-list">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
    <div class="button-row"><button type="submit">${isEdit ? "Save Shift" : "Add Shift"}</button>${isEdit ? `<button type="button" class="secondary-button danger-button" data-action="cancel-shift" data-id="${escapeHtml(record.id)}">Cancel Shift</button>` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>
  </form>`;
}

function openScheduleShiftPopup(record = {}) {
  if (currentRole() !== "admin") {
    showToast("Admin access required to edit the schedule.");
    return;
  }
  showDetailDialog(record.id ? "Edit Shift" : "Add Shift", scheduleShiftFormHtml(record));
}

async function saveScheduleShiftFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const data = formPayload(formEl);
  const existing = data.id ? readRecords("staffSchedule").find((record) => record.id === data.id) : readRecords("staffSchedule").find((record) => record.id === formEl.dataset.id);
  const staff = selectedStaffFromSelect(formEl.elements.staffKey);
  const weekStartValue = scheduleWeekStartString(data.date);
  const publishedWeek = weekIsPublished(weekStartValue);
  const changedAfterPublish = Boolean(existing?.publishedAt || publishedWeek);
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
  return `<form id="timeOffRequestForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Start date<input type="date" name="startDate" value="${escapeHtml(record.startDate || todayDate())}" required /></label>
      <label>End date<input type="date" name="endDate" value="${escapeHtml(record.endDate || record.startDate || todayDate())}" required /></label>
    </div>
    <label>Reason<textarea name="reason" rows="3" required>${escapeHtml(record.reason || "")}</textarea></label>
    <div class="button-row"><button type="submit">Submit Request</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
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
  showDetailDialog("Review Time Off", `<article class="record-card compact-record-card">
    <strong>${escapeHtml(record.staffName || "Staff")} - ${escapeHtml(record.status || "Pending")}</strong>
    <span>${escapeHtml(dateRangeText(record.startDate, record.endDate))}</span>
    <p>${escapeHtml(record.reason || "")}</p>
    ${record.reviewNote ? `<p>${escapeHtml(record.reviewNote)}</p>` : ""}
    <label>Review note<textarea id="timeOffReviewNote" rows="3">${escapeHtml(record.reviewNote || "")}</textarea></label>
    <div class="record-actions"><button type="button" data-action="approve-time-off" data-id="${escapeHtml(record.id)}">Approve</button><button type="button" class="secondary-button danger-button" data-action="deny-time-off" data-id="${escapeHtml(record.id)}">Deny</button><button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>
  </article>`);
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
  return `<form id="holidayForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Name<input type="text" name="name" value="${escapeHtml(record.name || "")}" required /></label>
      <label>Date<input type="date" name="date" value="${escapeHtml(record.date || todayDate())}" required /></label>
      <label>Holiday type<select name="holidayType"><option ${record.holidayType === "Holiday Pay" ? "selected" : ""}>Holiday Pay</option><option ${record.holidayType === "Closed" ? "selected" : ""}>Closed</option><option ${record.holidayType === "Limited Staffing" ? "selected" : ""}>Limited Staffing</option></select></label>
    </div>
    <label class="inline-check"><input type="checkbox" name="closed" ${record.closed ? "checked" : ""} /> Closed to normal customer appointments</label>
    <label class="inline-check"><input type="checkbox" name="limitedStaffing" ${record.limitedStaffing ? "checked" : ""} /> Limited staffing</label>
    <label class="inline-check"><input type="checkbox" name="paidHoliday" ${record.paidHoliday ? "checked" : ""} /> Paid holiday / holiday rate</label>
    <label>Staffing note<textarea name="staffingNote" rows="3">${escapeHtml(record.staffingNote || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Holiday</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
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
  for (const shift of shifts) {
    await sendPayload(upsertRecord("staffSchedule", { ...shift, status: "Published", publishedAt: now, changedAfterPublish: false, weekStart: start }));
  }
  const publishRecord = await saveAndNotify({
    type: "schedulePublish",
    id: `schedulePublish-${start}`,
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

async function copyLastWeekSchedule() {
  if (currentRole() !== "admin") return;
  const start = scheduleWeekStartString();
  const previousStart = addDays(start, -7);
  const previous = readRecords("staffSchedule").filter((record) => !record.removed && record.status !== "Cancelled" && record.date >= previousStart && record.date < start);
  for (const shift of previous) {
    const copiedDate = addDays(shift.date, 7);
    const copy = { ...shift, id: uid("staffSchedule"), submittedAt: new Date().toISOString(), date: copiedDate, weekStart: start, status: "Draft", publishedAt: "", changedAfterPublish: false };
    await sendPayload(upsertRecord("staffSchedule", copy));
  }
  renderTimesheet();
  showToast(`${previous.length} shift${previous.length === 1 ? "" : "s"} copied from last week.`);
}

function currentShiftForStaff(staffEmailValue = "", atDate = new Date()) {
  const date = dateTimeLocalValue(atDate).slice(0, 10);
  const minutes = atDate.getHours() * 60 + atDate.getMinutes();
  return readRecords("staffSchedule")
    .filter((shift) => !shift.removed && shift.status !== "Cancelled" && normalizeEmail(shift.staffEmail) === normalizeEmail(staffEmailValue) && shift.date === date)
    .find((shift) => minutes >= timeToMinutes(shift.startTime) - 30 && minutes <= timeToMinutes(shift.endTime) + 30) || null;
}

function exportBoardingQueue() {
  const rows = readRecords("boardingDog")
    .filter((record) => !record.removed && !["Cancelled", "Checked Out"].includes(normalizeBoardingStatus(record)))
    .map((record) => {
      const stay = currentOrNextStay(record) || activeBoardingStay(record) || {};
      return {
        dog: record.dogName || "",
        owner: record.ownerName || "",
        phone: record.ownerPhone || "",
        status: normalizeBoardingStatus(record),
        kennel: [record.kennelBuilding, record.kennelLocationName].filter(Boolean).join(" - "),
        dropoff: formatDateTime(stay.dropoffTime),
        pickup: formatDateTime(stay.pickupTime),
        requests: (stay.requests || []).join("; "),
      };
    });
  downloadCsv(`boarding-queue-${todayDate()}.csv`, rows);
}

function exportTimesheet() {
  const isAdmin = currentRole() === "admin";
  const rows = readRecords("timesheet")
    .filter((record) => isAdmin || timesheetBelongsToCurrentUser(record))
    .map((record) => ({
      date: record.date || "",
      staff: record.helperName || "",
      clockIn: formatDateTime(record.clockInTime),
      clockOut: formatDateTime(record.clockOutTime),
      hours: Number(record.hours || 0).toFixed(2),
      note: record.note || "",
    }));
  downloadCsv(`timesheet-${todayDate()}.csv`, rows);
}

function exportCareLogs() {
  const rows = readRecords("dailyTask")
    .filter((record) => !record.removed)
    .flatMap((record) => (record.structuredCareLogs || record.careLogs || []).map((log) => ({
      reportDate: record.date || "",
      dog: log.dogName || "",
      careType: log.careType || "",
      minutes: log.minutes || "",
      note: log.note || "",
      completedBy: log.completedBy || record.helperName || "",
      completedAt: formatDateTime(log.loggedAt || record.updatedAt || record.submittedAt),
    })));
  downloadCsv(`care-logs-${todayDate()}.csv`, rows);
}

function initEvents() {
  syncMobileReviewSections();
  window.addEventListener("resize", syncMobileReviewSections);
  window.addEventListener("hashchange", () => {
    const pageId = pageIdFromHash();
    if (pageId && pageAllowed(pageId) && pageId !== activePageId()) switchPage(pageId);
  });
  $("#mobilePageSelect").addEventListener("change", (event) => switchPage(event.target.value));
  $("#mobileBottomNav").addEventListener("click", (event) => {
    const button = event.target.closest(".mobile-bottom-nav-button");
    if (!button || button.disabled) return;
    if (button.id === "mobileMoreButton") {
      setMobileMoreOpen($("#mobileMoreSheet")?.hidden);
      return;
    }
    if (button.dataset.page) switchPage(button.dataset.page);
  });
  $("#mobileMoreMenuList").addEventListener("click", (event) => {
    const button = event.target.closest(".mobile-more-menu-item[data-page]");
    if (!button) return;
    switchPage(button.dataset.page);
  });
  $("#mobileMoreBackdrop").addEventListener("click", () => setMobileMoreOpen(false));
  $("#mobileMoreCloseButton").addEventListener("click", () => setMobileMoreOpen(false));
  $("#globalQuickSearch")?.addEventListener("input", renderGlobalSearchResults);
  $("#globalSearchResults")?.addEventListener("click", (event) => {
    const button = event.target.closest(".global-search-result");
    if (button) openGlobalSearchResult(button);
  });
  $("#exportBoardingQueueButton")?.addEventListener("click", exportBoardingQueue);
  $("#exportTimesheetButton")?.addEventListener("click", exportTimesheet);
  $("#exportCareLogsButton")?.addEventListener("click", exportCareLogs);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileMoreOpen(false);
  });
  $$(".nav-button").forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });
  syncNowButton.addEventListener("click", loadRemoteRecords);
  headerLogoutButton.addEventListener("click", clearHelper);
  $("#dashboardDate").addEventListener("change", () => {
    $("#calendarNoteForm").elements.noteDate.value = $("#dashboardDate").value || todayDate();
    renderDashboardTaskCalendar();
    renderDashboardTimeline();
  });
  $("#dashboardTaskCalendar").addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    $("#dashboardDate").value = button.dataset.date;
    $("#calendarNoteForm").elements.noteDate.value = button.dataset.date;
    renderDashboardTaskCalendar();
    renderDashboardTimeline();
  });
  $("#dashboardCards").addEventListener("click", (event) => {
    const card = event.target.closest('[data-action="dashboard-detail"]');
    if (card) showDashboardDetail(card.dataset.key);
  });
  $("#dashboardTimeline").addEventListener("click", (event) => {
    const removeButton = event.target.closest('[data-action="remove-timeline-record"]');
    if (removeButton) {
      event.stopPropagation();
      if (currentRole() !== "admin") return;
      markRecordRemoved(removeButton.dataset.type, removeButton.dataset.id).then(() => {
        renderDashboard();
        renderDemoSubmissions();
        showToast("Timeline item removed.");
      });
      return;
    }
    const card = event.target.closest('[data-action="view-record"]');
    if (!card) return;
    const record = readRecords(card.dataset.type).find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord(card.dataset.type, record), detailForRecord(card.dataset.type, record));
  });
  $("#dashboardAlerts").addEventListener("click", (event) => {
    const showAllButton = event.target.closest('[data-action="show-all-alerts"]');
    if (showAllButton) {
      dashboardShowAllAlerts = true;
      renderDashboard();
      return;
    }
    const mediaButton = event.target.closest('[data-action="view-media"]');
    if (mediaButton) return;
    const quickCareCard = event.target.closest('[data-action="dashboard-quick-care"]');
    if (quickCareCard) {
      openDashboardQuickCare(quickCareCard.dataset.dogId, quickCareCard.dataset.careType);
      return;
    }
    const medicalCard = event.target.closest('[data-action="view-medical-care"]');
    if (medicalCard) {
      openMedicalCareAlert(medicalCard.dataset.dogId);
      return;
    }
    const vaccineCard = event.target.closest('[data-action="view-vaccine-alert"]');
    if (vaccineCard) {
      openVaccineAlert(vaccineCard.dataset.dogId);
      return;
    }
    const ownerUpdateCard = event.target.closest('[data-action="view-owner-update"]');
    if (ownerUpdateCard) {
      openOwnerUpdateAlert(ownerUpdateCard.dataset.id);
      return;
    }
    const card = event.target.closest('[data-action="view-alert"]');
    if (!card) return;
    const record = readRecords(card.dataset.type).find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord(card.dataset.type, record), detailForRecord(card.dataset.type, record), { type: card.dataset.type, id: record.id });
  });
  $("#dashboardAlertTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-alert-filter]");
    if (!button) return;
    dashboardAlertFilter = button.dataset.alertFilter;
    dashboardShowAllAlerts = false;
    renderDashboard();
  });
  $("#calendarNoteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canCreateCalendarNote()) return;
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    const data = formPayload(formEl);
    const authorEmail = currentUser?.email || "";
    const author = currentUser?.name || helperName.value || "Unknown staff";
    const noteDate = data.noteDate || todayDate();
    const noteKey = calendarNoteGroupKey({
      noteDate,
      noteKind: "special",
      createdByEmail: authorEmail,
      createdBy: author,
    });
    const existing = data.id
      ? readRecords("calendarNote").find((note) => note.id === data.id)
      : readRecords("calendarNote").find((note) => !note.removed
        && calendarNoteKind(note) === "special"
        && calendarNoteGroupKey({ ...note, noteDate: calendarNoteDate(note) }) === noteKey);
    const now = new Date().toISOString();
    const noteText = data.id ? data.note : specialNoteEntryText(data.note, now);
    const existingNoteText = existing ? calendarNoteDisplayText(existing) : "";
    const payload = {
      ...existing,
      ...data,
      type: "calendarNote",
      id: existing?.id || data.id || uid("calendarNote"),
      submittedAt: existing?.submittedAt || now,
      createdBy: existing?.createdBy || author,
      createdByEmail: existing?.createdByEmail || authorEmail,
      updatedBy: author,
      updatedByEmail: authorEmail,
      noteKind: existing?.noteKind || "special",
      noteDate,
      note: data.id ? noteText : [existingNoteText, noteText].filter(Boolean).join("\n"),
      updatedAt: now,
      removed: false,
    };
    const record = upsertRecord("calendarNote", payload);
    await sendPayload(record);
    const savedDate = noteDate;
    formEl.reset();
    formEl.elements.id.value = "";
    formEl.elements.noteDate.value = savedDate;
    formEl.elements.note.value = "";
    renderDashboardTaskCalendar();
    renderDemoSubmissions();
    showDetailDialog("Special Note Saved", `<p>The special note has been saved for ${escapeHtml(savedDate)}.</p>`);
  });
  $("#newCalendarNoteButton").addEventListener("click", () => {
    $("#calendarNoteForm").reset();
    $("#calendarNoteForm").elements.noteDate.value = $("#dashboardDate").value || todayDate();
  });
  $("#dailyStaffNoteForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!canCreateCalendarNote()) return;
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    const data = formPayload(formEl);
    const now = new Date().toISOString();
    const noteDate = data.noteDate || currentDailyDate();
    const authorEmail = currentUser?.email || helperEmail.value || "";
    const authorName = currentUser?.name || helperName.value || "Unknown staff";
    const noteEntry = `${staffNoteTimePrefix(now)}- ${data.note.trim()}`;
    const staffKey = staffNoteGroupKey({ noteDate, createdByEmail: authorEmail, createdBy: authorName });
    const existing = readRecords("calendarNote").find((note) => !note.removed
      && (note.noteKind === "staff" || note.source === "daily-staff-note")
      && staffNoteGroupKey(note) === staffKey);
    const payload = {
      ...existing,
      type: "calendarNote",
      id: existing?.id || uid("calendarNote"),
      submittedAt: existing?.submittedAt || now,
      updatedAt: now,
      noteDate,
      note: [existing?.note, noteEntry].filter(Boolean).join("\n"),
      noteKind: "staff",
      source: "daily-staff-note",
      createdBy: existing?.createdBy || authorName,
      createdByEmail: existing?.createdByEmail || authorEmail,
      removed: false,
    };
    const record = upsertRecord("calendarNote", payload);
    await sendPayload(record);
    formEl.reset();
    formEl.elements.noteDate.value = currentDailyDate();
    renderDashboardTaskCalendar();
    renderDemoSubmissions();
    showDetailDialog("Staff Note Saved", `<p>The note was saved for ${escapeHtml(record.noteDate)} and added to recent submissions.</p>`);
  });
  $("#calendarNotesList").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const note = readRecords("calendarNote").find((item) => item.id === button.dataset.id);
    if (!note) return;
    if (button.dataset.action === "edit-calendar-note") {
      if (currentRole() !== "admin") return;
      setFormValues($("#calendarNoteForm"), note);
      $("#calendarNoteForm").hidden = false;
      $("#calendarNoteForm").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (button.dataset.action === "remove-calendar-note") {
      if (!canRemoveCalendarNote(note)) {
        showToast("Only admins or the staff member who created this note can remove it.");
        return;
      }
      await markRecordRemoved("calendarNote", note.id);
      renderDashboardTaskCalendar();
      renderDemoSubmissions();
      showToast("Calendar note removed.");
    }
    if (button.dataset.action === "remove-calendar-note-group") {
      const ids = (button.dataset.ids || "").split(",").filter(Boolean);
      if (!ids.length) return;
      const notes = readRecords("calendarNote").filter((item) => ids.includes(item.id));
      if (notes.some((item) => !canRemoveCalendarNote(item))) {
        showToast("Only admins or the staff member who created this note can remove it.");
        return;
      }
      await Promise.all(notes.map((item) => markRecordRemoved("calendarNote", item.id)));
      renderDashboardTaskCalendar();
      renderDemoSubmissions();
      showToast("Calendar notes removed.");
    }
  });

  $("#googleLoginButton").addEventListener("click", () => loginWithProvider("google"));
  $("#facebookLoginButton").addEventListener("click", () => loginWithProvider("facebook"));
  $("#passwordLoginForm").addEventListener("submit", loginWithPassword);
  $("#toggleLoginPasswordButton").addEventListener("click", () => {
    const passwordInput = $("#loginPasswordInput");
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    $("#toggleLoginPasswordButton").textContent = isHidden ? "Hide" : "Show";
    $("#toggleLoginPasswordButton").setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
  $("#showPasswordRecoveryButton").addEventListener("click", () => {
    openPasswordRecoveryForm($("#passwordLoginForm").elements.email.value || "");
  });
  $("#showCustomerSignupButton").addEventListener("click", () => {
    $("#customerSignupForm").hidden = false;
    $("#customerSignupForm").elements.firstName.focus();
  });
  $("#cancelCustomerSignupButton").addEventListener("click", () => {
    $("#customerSignupForm").reset();
    $("#customerSignupForm").hidden = true;
  });
  $("#customerSignupForm").addEventListener("submit", createCustomerLogin);
  $("#sendRecoveryCodeButton").addEventListener("click", sendRecoveryCode);
  $("#passwordRecoveryForm").addEventListener("submit", completePasswordRecovery);
  $("#cancelPasswordRecoveryButton").addEventListener("click", () => {
    $("#passwordRecoveryForm").reset();
    $("#passwordRecoveryForm").hidden = true;
  });
  $("#forcePasswordChangeForm").addEventListener("submit", completeForcedPasswordChange);
  $("#passwordChangeDialog").addEventListener("cancel", (event) => {
    if (passwordChangeRequiredForUser()) event.preventDefault();
  });
  $("#signOutPasswordChangeButton").addEventListener("click", async () => {
    $("#passwordChangeDialog").close();
    await clearHelper();
  });
  $("#clearHelperButton").addEventListener("click", clearHelper);
  $("#addDailyTaskButton").addEventListener("click", addCustomTask);
  $("#addPmTaskButton").addEventListener("click", addPmCustomTask);
  $("#addCareQuickLog").addEventListener("click", addPendingCareLog);
  $("#careQuickDogId").addEventListener("change", updateCareQuickFields);
  $("#careQuickType").addEventListener("change", updateCareQuickFields);
  $("#showRemainingTasksOnly")?.addEventListener("change", (event) => {
    showRemainingTasksOnly = event.target.checked;
    renderDailyTaskLists();
  });
  $("#structuredCareLogList").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="remove-care-log"], [data-action="edit-care-log"]');
    if (!button) return;
    if (button.dataset.action === "remove-care-log") await removeDailyCareLog(button.dataset.id);
    if (button.dataset.action === "edit-care-log") {
      const log = structuredCareLogsForDate(currentDailyDate()).find((item) => item.id === button.dataset.id);
      if (!log || !canModifyCareLog(log)) {
        showToast("Only admins or the staff member who logged this can edit it.");
        return;
      }
      showDetailDialog(`Edit ${log.careType || "Care Log"}`, careLogEditFormHtml(log));
    }
  });
  $("#addWeeklyTaskButton").addEventListener("click", () => addManagedTask("weekly", "#newWeeklyTaskText"));
  $("#addTuesdayTaskButton").addEventListener("click", () => addManagedTask("tuesday", "#newTuesdayTaskText"));
  $("#addMonthlyTaskButton").addEventListener("click", () => addManagedTask("monthly", "#newMonthlyTaskText"));
  form.addEventListener("click", (event) => {
    const removeTab = event.target.closest('[data-action="remove-task-tab"]');
    if (removeTab) {
      event.preventDefault();
      openTaskTabRemoveConfirm(removeTab.dataset.taskTabId);
      return;
    }
    const toggle = event.target.closest('[data-action="toggle-section"]');
    if (!toggle) return;
    const section = toggle.closest("[data-collapsible-section]");
    if (!section) return;
    section.classList.toggle("is-collapsed");
    toggle.textContent = section.classList.contains("is-collapsed") ? "Expand" : "Minimize";
  });
  $("#closeDetailDialog").addEventListener("click", () => $("#detailDialog").close());
  $("#detailDialogBody").addEventListener("submit", async (event) => {
    const quickCareForm = event.target.closest("#dashboardQuickCareForm");
    const stayPopupForm = event.target.closest("#boardingStayPopupForm");
    const settingsPopupForm = event.target.closest("#settingsUserPopupForm");
    const ownerUpdateForm = event.target.closest("#ownerUpdatePopupForm");
    const vaccineUpdateForm = event.target.closest("#vaccineUpdateForm");
    const careLogEditForm = event.target.closest("#careLogEditForm");
    const kennelAssignmentForm = event.target.closest("#kennelAssignmentForm");
    const timesheetEditForm = event.target.closest("#timesheetEditForm");
    const scheduleShiftForm = event.target.closest("#scheduleShiftForm");
    const timeOffRequestForm = event.target.closest("#timeOffRequestForm");
    const holidayForm = event.target.closest("#holidayForm");
    const taskTabForm = event.target.closest("#taskTabForm");
    const kennelBuildingTabForm = event.target.closest("#kennelBuildingTabForm");
    const ownedDogPhotoUploadForm = event.target.closest("#ownedDogPhotoUploadForm");
    const boardingCheckInForm = event.target.closest("#boardingCheckInForm");
    const boardingCheckInServiceForm = event.target.closest("#boardingCheckInServiceForm");
    if (!quickCareForm && !stayPopupForm && !settingsPopupForm && !ownerUpdateForm && !vaccineUpdateForm && !careLogEditForm && !kennelAssignmentForm && !timesheetEditForm && !scheduleShiftForm && !timeOffRequestForm && !holidayForm && !taskTabForm && !kennelBuildingTabForm && !ownedDogPhotoUploadForm && !boardingCheckInForm && !boardingCheckInServiceForm) return;
    event.preventDefault();
    if (boardingCheckInForm) {
      await submitBoardingCheckIn(boardingCheckInForm);
      return;
    }
    if (boardingCheckInServiceForm) {
      await submitBoardingCheckInServiceForm(boardingCheckInServiceForm);
      return;
    }
    if (ownedDogPhotoUploadForm) {
      await submitOwnedDogPhotoUpload(ownedDogPhotoUploadForm);
      return;
    }
    if (quickCareForm) {
      await submitDashboardQuickCare(quickCareForm);
      return;
    }
    if (scheduleShiftForm) {
      const saved = await saveScheduleShiftFromForm(scheduleShiftForm);
      if (saved) {
        $("#detailDialog").close();
        showToast("Shift saved.");
      }
      return;
    }
    if (timeOffRequestForm) {
      const saved = await saveTimeOffRequestFromForm(timeOffRequestForm);
      if (saved) {
        $("#detailDialog").close();
        showToast("Time off request saved.");
      }
      return;
    }
    if (holidayForm) {
      const saved = await saveHolidayFromForm(holidayForm);
      if (saved) {
        $("#detailDialog").close();
        showToast("Holiday saved.");
      }
      return;
    }
    if (taskTabForm) {
      const tab = saveTaskTabFromForm(taskTabForm);
      if (tab) {
        $("#detailDialog").close();
        showToast("Task tab added.");
      }
      return;
    }
    if (kennelBuildingTabForm) {
      const saved = await saveKennelBuildingFromForm(kennelBuildingTabForm);
      if (saved) {
        $("#detailDialog").close();
        showToast("Building tab added.");
      }
      return;
    }
    if (stayPopupForm) {
      const record = await saveBoardingStayFromForm(stayPopupForm);
      if (record) {
        showDetailDialog("Boarding Request Saved", `<p>The boarding request was saved for ${escapeHtml(record.dogName || "this dog")}.</p>`);
      }
      return;
    }
    if (settingsPopupForm) {
      const formData = settingsFormProfileData(settingsPopupForm);
      const wasExisting = Boolean(formData.id || savedUserFor({ email: formData.email })?.id);
      const record = await saveSettingsUserProfile({}, settingsPopupForm);
      if (record) {
        await addAuditLog(wasExisting ? "Updated user" : "Created user", "settingsUser", record, roleLabel(record.role));
        showDetailDialog("User Saved", `<p>${escapeHtml(record.name || record.email)} has been saved.</p>`);
      }
      return;
    }
    if (ownerUpdateForm) {
      const record = readRecords("boardingDog").find((item) => item.id === ownerUpdateForm.dataset.id);
      if (!record) return;
      const data = formPayload(ownerUpdateForm);
      const flags = ownerUpdateForm.elements.clearOwnerUpdate.checked ? (record.flags || []).filter((flag) => flag !== "Required update from owner") : record.flags || [];
      const updated = upsertRecord("boardingDog", { ...record, dailyActivity: data.dailyActivity, flags, updatedAt: new Date().toISOString() });
      await sendPayload(updated);
      renderBoardingDogs();
      renderDashboard();
      showDetailDialog("Owner Update Saved", `<p>The owner update for ${escapeHtml(updated.dogName || "this dog")} was saved.</p>`);
      return;
    }
    if (vaccineUpdateForm) {
      const dog = readRecords("ownedDog").find((item) => item.id === vaccineUpdateForm.dataset.dogId && !item.removed);
      if (!dog) return;
      const data = formPayload(vaccineUpdateForm);
      const updated = upsertRecord("ownedDog", { ...dog, dhppDate: data.dhppDate, rabiesDate: data.rabiesDate, updatedAt: new Date().toISOString() });
      await sendPayload(updated);
      renderOwnedDogs();
      renderDashboard();
      showDetailDialog("Vaccine Update Saved", `<p>The vaccine dates for ${escapeHtml(ownedDogDisplayName(updated))} were saved.</p>`);
      return;
    }
    if (careLogEditForm) {
      const data = formPayload(careLogEditForm);
      const updated = await updateDailyCareLog(careLogEditForm.dataset.id, {
        date: data.date,
        minutes: data.minutes,
        note: data.note,
      });
      if (updated) showDetailDialog("Care Log Updated", `<p>${escapeHtml(updated.dogName || "Care log")} was updated.</p>`);
    }
    if (kennelAssignmentForm) {
      const record = boardingDogRecordForDisplay(kennelAssignmentForm.dataset.dogId);
      const location = kennelLocations({ activeOnly: true }).find((item) => item.id === kennelAssignmentForm.elements.kennelLocationId.value);
      if (!record || !location) {
        showToast("Choose a kennel location before assigning this dog.");
        return;
      }
      const updated = await saveBoardingStatusTransition(record, kennelAssignmentForm.dataset.nextStatus || "In Kennel", {
        allowEarly: kennelAssignmentForm.dataset.allowEarly === "true",
        early: kennelAssignmentForm.dataset.early === "true",
        kennelLocation: location,
      });
      if (updated) showDetailDialog("Kennel Assigned", `<p>${escapeHtml(updated.dogName || "Dog")} is now In Kennel at ${escapeHtml(location.building)} - ${escapeHtml(location.name)}.</p>`);
    }
    if (timesheetEditForm) {
      if (!validateForm(timesheetEditForm)) return;
      syncTimesheetStaffFields(timesheetEditForm);
      const payload = formPayload(timesheetEditForm);
      const existing = payload.manualTimeId ? readRecords("timesheet").find((record) => record.id === payload.manualTimeId) : null;
      if (existing && currentRole() !== "admin" && !canEditOwnToday(existing)) {
        showToast("Only today's time entry can be edited by the staff member. Admin can edit older entries.");
        return;
      }
      const record = saveTimeEntry({
        id: payload.manualTimeId,
        helperName: payload.manualHelper || helperName.value || "Unknown staff",
        helperEmail: payload.manualHelperEmail || existing?.helperEmail || helperEmail.value || currentUser?.email || "",
        date: payload.manualDate,
        clockInTime: payload.manualClockIn,
        clockOutTime: payload.manualClockOut,
        note: payload.manualNote,
      }, { silent: true });
      $("#detailDialog").close();
      showToast(`Timesheet saved with ${Number(record.hours || 0).toFixed(2)} hours recorded.`);
    }
  });
  $("#detailDialogBody").addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    if (action.dataset.action === "view-dog-photo") {
      showMediaDialog(action.dataset.src, "image/jpeg", action.dataset.mediaName || "Dog profile photo");
      return;
    }
    if (action.dataset.action === "edit-stay-popup") {
      const dog = boardingDogRecordForDisplay(action.dataset.dogId);
      openBoardingStayPopup(dog, action.dataset.id);
    }
    if (action.dataset.action === "open-checkin-service-picker") {
      openBoardingCheckInServicePicker();
      return;
    }
    if (action.dataset.action === "return-to-checkin") {
      const state = pendingBoardingCheckIn;
      const record = boardingDogRecordForDisplay(state?.dogId);
      if (record) openBoardingCheckInPopup(record, state.nextStatus, state.options, state);
      return;
    }
    if (action.dataset.action === "close-dialog") {
      $("#detailDialog").close();
    }
    if (action.dataset.action === "delete-timesheet") {
      const record = readRecords("timesheet").find((item) => item.id === action.dataset.id && !item.removed);
      if (record) openTimesheetDeleteConfirm(record);
    }
	    if (action.dataset.action === "confirm-delete-timesheet") {
	      const removed = await removeTimesheetEntryById(action.dataset.id);
	      $("#detailDialog").close();
	      if (removed) showToast("Timesheet entry deleted.");
	    }
	    if (action.dataset.action === "cancel-shift") {
	      const cancelled = await cancelScheduleShift(action.dataset.id);
	      $("#detailDialog").close();
	      if (cancelled) showToast("Shift cancelled.");
	    }
	    if (action.dataset.action === "approve-time-off" || action.dataset.action === "deny-time-off") {
	      const updated = await reviewTimeOffRequest(action.dataset.id, action.dataset.action === "approve-time-off" ? "Approved" : "Denied");
	      $("#detailDialog").close();
	      if (updated) showToast(`Time off ${updated.status.toLowerCase()}.`);
	    }
	    if (action.dataset.action === "popup-quick-care") {
	      openDashboardQuickCare(action.dataset.id, action.dataset.careType);
	    }
    if (action.dataset.action === "confirm-remove-task-tab") {
      const removed = removeTaskTab(action.dataset.taskTabId);
      $("#detailDialog").close();
      if (removed) showToast("Task tab removed.");
    }
    if (action.dataset.action === "confirm-remove-kennel-building-tab") {
      const removed = await removeKennelBuilding(action.dataset.building);
      $("#detailDialog").close();
      if (removed) showToast("Building tab removed.");
    }
    if (action.dataset.action === "open-owned-timeline") {
      openOwnedDogTimeline(action.dataset.id);
    }
    if (action.dataset.action === "open-owned-editor") {
      const dog = readRecords("ownedDog").find((record) => record.id === action.dataset.id && !record.removed);
      if (dog) {
        $("#detailDialog").close();
        switchPage("ourDogsPage");
        openOwnedDog(dog);
        setOwnedFormLocked(false);
      }
    }
    if (action.dataset.action === "open-boarding-editor") {
      const dog = boardingDogRecordForDisplay(action.dataset.id);
      if (dog) {
        $("#detailDialog").close();
        switchPage("boardingDogsPage");
        openBoardingDog(dog);
        setBoardingFormLocked(false);
      }
    }
    if (action.dataset.action === "popup-set-password") await adminSetTemporaryPassword(action.closest("form"), action);
    if (action.dataset.action === "popup-send-reset") await adminSendPasswordResetEmail(action.closest("form"), action);
    if (action.dataset.action === "popup-remove-user") {
      const user = readRecords("settingsUser").find((item) => item.id === action.dataset.id && !item.removed);
      if (user) openSettingsUserRemoveConfirm(user, { returnToUser: true });
    }
    if (action.dataset.action === "cancel-remove-settings-user") {
      const user = readRecords("settingsUser").find((item) => item.id === action.dataset.id && !item.removed);
      if (user) openSettingsUserPopup(user);
    }
    if (action.dataset.action === "confirm-remove-settings-user") {
      const removed = await removeSettingsUserById(action.dataset.id);
      $("#detailDialog").close();
      if (removed) showToast("User access removed.");
    }
    if (action.dataset.action === "confirm-delete-boarding-dog") {
      const removed = await deleteBoardingDogById(action.dataset.id);
      $("#detailDialog").close();
      if (removed) showToast("Boarding dog profile deleted.");
    }
    if (action.dataset.action === "confirm-remove-boarding-stay") {
      const updated = await removeBoardingStayFromDog(action.dataset.dogId, action.dataset.id);
      $("#detailDialog").close();
      if (updated) showToast("Boarding stay removed.");
    }
  });
  $("#detailDialogBody").addEventListener("change", (event) => {
    const ownedDogMobilePhotoInput = event.target.closest("#ownedDogMobilePhotoInput");
    if (ownedDogMobilePhotoInput) {
      previewOwnedDogMobilePhoto(ownedDogMobilePhotoInput);
      return;
    }
    const boardingCheckInPhotoInput = event.target.closest("#boardingCheckInPhotoInput");
    if (boardingCheckInPhotoInput) {
      previewBoardingCheckInPhoto(boardingCheckInPhotoInput);
      return;
    }
    const checkInServiceToggle = event.target.closest('#boardingCheckInServiceForm input[name="checkInServices"]');
    if (checkInServiceToggle) {
      const quantityInput = checkInServiceToggle.closest(".service-option")?.querySelector(".service-quantity");
      if (quantityInput) quantityInput.disabled = !checkInServiceToggle.checked;
      return;
    }
    const kennelBuilding = event.target.closest("#kennelAssignmentBuilding");
    if (kennelBuilding) {
      updateKennelAssignmentLocations(kennelBuilding.closest("#kennelAssignmentForm"));
      return;
    }
    const timesheetStaff = event.target.closest("#timesheetStaffSelect");
    if (timesheetStaff) {
      syncTimesheetStaffFields(timesheetStaff.closest("#timesheetEditForm"));
      return;
    }
    const filter = event.target.closest("#ownedTimelinePopupFilter");
    if (!filter) return;
    const dog = readRecords("ownedDog").find((record) => record.id === filter.dataset.dogId && !record.removed);
    if (!dog) return;
    $("#ownedTimelinePopupHistory").innerHTML = ownedDogActivityEntriesHtml(dog, filter.value);
  });
  $("#completeDetailTaskButton").addEventListener("click", async () => {
    if (!detailDialogContext) return;
    await toggleRecordCompletion(detailDialogContext.type, detailDialogContext.id);
    $("#detailDialog").close();
    renderDashboard();
  });
  $("#closeMediaDialog").addEventListener("click", () => $("#mediaDialog").close());
  $("#mediaDialog").addEventListener("click", (event) => {
    const zoomButton = event.target.closest("[data-action]");
    if (!zoomButton) return;
    if (zoomButton.dataset.action === "media-zoom-in") mediaZoomLevel = Math.min(mediaZoomLevel + 0.25, 3);
    if (zoomButton.dataset.action === "media-zoom-out") mediaZoomLevel = Math.max(mediaZoomLevel - 0.25, 0.5);
    updateMediaZoom();
  });
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
  $("#dailyTaskTabs")?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "add-task-tab") {
      openTaskTabPopup();
      return;
    }
    if (action?.dataset.action === "remove-task-tab") {
      openTaskTabRemoveConfirm(action.dataset.taskTabId);
      return;
    }
    const button = event.target.closest("[data-task-tab]");
    if (!button) return;
    setDailyTaskTab(button.dataset.taskTab);
  });
  $("#customTaskPanels")?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="add-custom-tab-task"]');
    if (button) addCustomTabTask(button);
  });
  form.elements.date.addEventListener("change", () => {
    updateDayFromDate();
    updateConditionalSections();
    if ($("#dailyStaffNoteForm")) $("#dailyStaffNoteForm").elements.noteDate.value = form.elements.date.value || todayDate();
    if ($("#careQuickDate") && !$("#careQuickDate").value) $("#careQuickDate").value = form.elements.date.value || todayDate();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showToast("Daily work saves automatically when staff tap Done or log care.");
  });
  $("#recentSubmissions").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-daily"]');
    const noteGroupCard = event.target.closest('[data-action="view-calendar-note-group"]');
    if (noteGroupCard) {
      const ids = String(noteGroupCard.dataset.ids || "").split(",").filter(Boolean);
      const notes = ids.map((id) => readRecords("calendarNote").find((item) => item.id === id)).filter(Boolean);
      if (notes.length) {
        const groupedNote = groupedCalendarNotesForDisplay(notes)[0] || notes[0];
        showDetailDialog(calendarNoteKindLabel(groupedNote), `<div class="detail-row"><strong>Date</strong><span>${escapeHtml(calendarNoteDate(groupedNote) || "")}</span></div><div class="detail-row"><strong>Written by</strong><span>${escapeHtml(calendarNoteAuthorText(groupedNote))}</span></div><div class="detail-row"><strong>Note</strong><span>${multilineHtml(groupedNote.note || "")}</span></div>`);
      }
      return;
    }
    const noteCard = event.target.closest('[data-action="view-calendar-note"]');
    if (noteCard) {
      const note = readRecords("calendarNote").find((item) => item.id === noteCard.dataset.id);
      if (note) showDetailDialog(titleForRecord("calendarNote", note), `<div class="detail-row"><strong>Date</strong><span>${escapeHtml(note.noteDate || "")}</span></div><div class="detail-row"><strong>Written by</strong><span>${escapeHtml(calendarNoteAuthorText(note))}</span></div><div class="detail-row"><strong>Note</strong><span>${multilineHtml(calendarNoteDisplayText(note))}</span></div>`);
      return;
    }
    const card = event.target.closest('[data-action="view-daily"]');
    if (!button && card) {
      const record = readRecords("dailyTask").find((item) => item.id === card.dataset.id);
      if (record) showDetailDialog(titleForRecord("dailyTask", record), dailyDetailHtml(record));
      return;
    }
    if (!button) return;
    const record = readRecords("dailyTask").find((item) => item.id === button.dataset.id);
    if (!record || !canEditRecentDailyReport(record)) {
      showToast("Only reports from the last 3 days can be edited by the submitting staff member.");
      return;
    }
    form.reset();
    renderDailyTaskLists(record);
    setFormValues(form, record);
    $("#dailyTaskId").value = record.id;
    ["dailyTasks", "pmTasks", "weeklyTasks", "tuesdayTasks", "monthlyTasks"].forEach((name) => {
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
    if (!activeClockIn?.clockInTime) syncActiveClockInFromOpenRecord();
    if (activeClockIn?.clockInTime) {
      let openRecord = readRecords("timesheet").find((record) => record.id === activeClockIn.id);
      if (!openRecord) openRecord = syncActiveClockInFromOpenRecord();
      if (!openRecord) {
        showToast("Clock-in record was not found. Clock in again.");
        activeClockIn = "";
        localStorage.removeItem("cth-active-clock-in");
        updateTimeDisplays();
        return;
      }
      const clockOutTime = new Date().toISOString();
      const record = saveTimeEntry({
        id: openRecord.id,
        helperName: openRecord.helperName || helperName.value || currentUser?.name || "Unknown staff",
	        helperEmail: openRecord.helperEmail || helperEmail.value || currentUser?.email || "",
	        clockInTime: openRecord.clockInTime || activeClockIn.clockInTime,
	        clockOutTime,
	        note: String(openRecord.note || "").startsWith("Open clock-in") ? String(openRecord.note || "").replace(/^Open clock-in\s*\|\s*/, "") : openRecord.note,
	      }, { silent: true });
      activeClockIn = "";
      localStorage.removeItem("cth-active-clock-in");
      updateTimeDisplays();
      showToast(`Timesheet submitted with ${Number(record.hours || 0).toFixed(2)} hours recorded.`);
      return;
    }
	    const clockInTime = new Date().toISOString();
	    const matchingShift = currentShiftForStaff(helperEmail.value || currentUser.email, new Date());
	    const scheduleNote = matchingShift ? `Scheduled shift: ${formatShiftTime(matchingShift)}` : "Unscheduled clock-in";
	    const record = upsertRecord("timesheet", {
	      type: "timesheet",
	      id: uid("timesheet"),
	      submittedAt: clockInTime,
	      date: localDateFromStoredDateTime(clockInTime),
	      helperName: helperName.value || currentUser.name,
	      helperEmail: helperEmail.value || currentUser.email,
	      clockInTime,
	      clockOutTime: "",
	      hours: 0,
	      note: `Open clock-in | ${scheduleNote}`,
	      scheduleShiftId: matchingShift?.id || "",
	      scheduleException: matchingShift ? "" : "Unscheduled clock-in",
	    });
    activeClockIn = { id: record.id, clockInTime, helperEmail: record.helperEmail };
    localStorage.setItem("cth-active-clock-in", JSON.stringify(activeClockIn));
    sendPayload(record);
    updateTimeDisplays();
    showToast(`Clock-in confirmed: ${formatDateTime(clockInTime)}.`);
	  });
	  $("#openTimesheetEditButton")?.addEventListener("click", () => openTimesheetEditPopup());
	  $("#timesheetTabs")?.addEventListener("click", (event) => {
	    const button = event.target.closest("[data-timesheet-tab]");
	    if (!button) return;
	    setTimesheetTab(button.dataset.timesheetTab);
	  });
	  $("#timesheetPage").addEventListener("click", async (event) => {
	    const action = event.target.closest("[data-action]");
	    if (action) {
	      if (action.dataset.action === "schedule-prev-week") {
	        scheduleWeekDate = addDays(scheduleWeekStartString(), -7);
	        renderTimesheet();
	        return;
	      }
	      if (action.dataset.action === "schedule-this-week") {
	        scheduleWeekDate = todayDate();
	        renderTimesheet();
	        return;
	      }
	      if (action.dataset.action === "schedule-next-week") {
	        scheduleWeekDate = addDays(scheduleWeekStartString(), 7);
	        renderTimesheet();
	        return;
	      }
	      if (action.dataset.action === "edit-shift") {
	        const record = readRecords("staffSchedule").find((item) => item.id === action.dataset.id && !item.removed);
	        if (record) openScheduleShiftPopup(record);
	        return;
	      }
	      if (action.dataset.action === "review-time-off") {
	        const record = readRecords("timeOffRequest").find((item) => item.id === action.dataset.id && !item.removed);
	        if (record) openTimeOffReviewPopup(record);
	        return;
	      }
	      if (action.dataset.action === "edit-holiday") {
	        const record = readRecords("kennelHoliday").find((item) => item.id === action.dataset.id && !item.removed);
	        if (record) openHolidayPopup(record);
	        return;
	      }
	    }
	  });
	  $("#openScheduleShiftButton")?.addEventListener("click", () => openScheduleShiftPopup());
	  $("#copyLastWeekScheduleButton")?.addEventListener("click", copyLastWeekSchedule);
	  $("#publishScheduleButton")?.addEventListener("click", async () => {
	    const published = await publishScheduleWeek();
	    if (published) showToast("Schedule published.");
	  });
	  $("#openTimeOffRequestButton")?.addEventListener("click", () => openTimeOffRequestPopup());
	  $("#openHolidayButton")?.addEventListener("click", () => openHolidayPopup());
	  $("#notificationBellButton")?.addEventListener("click", () => {
	    const panel = $("#notificationPanel");
	    panel.hidden = !panel.hidden;
	    renderNotifications();
	  });
	  $("#markAllNotificationsReadButton")?.addEventListener("click", markAllNotificationsRead);
	  $("#notificationList")?.addEventListener("click", (event) => {
	    const item = event.target.closest('[data-action="open-notification"]');
	    if (item) openNotification(item.dataset.id);
	  });
	  $("#timesheetRows").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-time"]');
    if (!button) return;
    const record = readRecords("timesheet").find((item) => item.id === button.dataset.id);
    if (!record || !canEditOwnToday(record)) {
      showToast("Only today's time entry can be edited by the staff member. Admin can edit older entries.");
      return;
    }
    openTimesheetEditPopup(record);
  });

  $("#ownedLastBath").addEventListener("change", () => ($("#ownedNextBath").value = addDays($("#ownedLastBath").value, numberFrom($("#ourDogForm").elements.bathIntervalDays?.value, careDefaults.bathIntervalDays))));
  $("#ourDogForm").elements.bathIntervalDays.addEventListener("change", () => ($("#ownedNextBath").value = addDays($("#ownedLastBath").value, numberFrom($("#ourDogForm").elements.bathIntervalDays?.value, careDefaults.bathIntervalDays))));
  $("#ownedLastHeat").addEventListener("change", () => ($("#ownedNextHeat").value = addDays($("#ownedLastHeat").value, numberFrom($("#ourDogForm").elements.heatCycleLengthDays?.value, careDefaults.heatCycleLengthDays))));
  $("#ourDogForm").elements.heatCycleLengthDays.addEventListener("change", () => ($("#ownedNextHeat").value = addDays($("#ownedLastHeat").value, numberFrom($("#ourDogForm").elements.heatCycleLengthDays?.value, careDefaults.heatCycleLengthDays))));
  $("#ownedDogSex").addEventListener("change", syncOwnedDogTabAvailability);
  $("#ownedDhppDate").addEventListener("change", updateDhppWarning);
  $("#ownedDogSearch").addEventListener("input", renderOwnedDogs);
  $("#ownedDogCareFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    ownedDogCareFilter = button.dataset.filter || "All";
    $$("#ownedDogCareFilters [data-filter]").forEach((item) => item.classList.toggle("is-active", item === button));
    renderOwnedDogs();
  });
  $("#ownedDogProfileTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-owned-profile-tab]");
    if (!button || button.disabled) return;
    setOwnedDogActiveTab(button.dataset.ownedProfileTab);
  });
  $("#boardingDogProfileTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-boarding-profile-tab]");
    if (!button || button.disabled) return;
    setBoardingDogActiveTab(button.dataset.boardingProfileTab);
  });
  $("#ownedDogColumnManager").addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    updateTableColumnConfig(control.dataset.table, control.dataset.column, control.dataset.action);
  });
  $("#ownedDogColumnManager").addEventListener("dragstart", (event) => {
    const chip = event.target.closest(".column-chip");
    if (chip) event.dataTransfer.setData("text/plain", `${chip.dataset.table}:${chip.dataset.column}`);
  });
  $("#ownedDogColumnManager").addEventListener("dragover", (event) => {
    if (event.target.closest(".column-chip")) event.preventDefault();
  });
  $("#ownedDogColumnManager").addEventListener("drop", (event) => {
    const target = event.target.closest(".column-chip");
    if (!target) return;
    event.preventDefault();
    const [table, sourceColumn] = event.dataTransfer.getData("text/plain").split(":");
    reorderTableColumn(table, sourceColumn, target.dataset.column);
  });
  $("#ownedDogTableHead").addEventListener("dblclick", (event) => {
    const header = event.target.closest("[data-sort-column]");
    if (header) setTableSort("ownedDog", header.dataset.sortColumn);
  });
  $("#ownedDogTableHead").addEventListener("dragstart", handleTableHeaderDragStart);
  $("#ownedDogTableHead").addEventListener("dragover", handleTableHeaderDragOver);
  $("#ownedDogTableHead").addEventListener("drop", handleTableHeaderDrop);
  $("#ownedDogTableHead").addEventListener("dragend", handleTableHeaderDragEnd);
  $("#addOwnedDogButton").addEventListener("click", () => openOwnedDog());
  $("#cancelOwnedDogEdit").addEventListener("click", () => ($("#ownedDogDetail").hidden = true));
  $("#deleteOwnedDogButton").addEventListener("click", async () => {
    const dog = activeOwnedDog();
    if (!dog) return;
    if (!window.confirm(`Remove ${dog.callName || dog.showName || "this dog"} from Our Dogs?`)) return;
    const updated = await markRecordRemoved("ownedDog", dog.id);
    $("#ownedDogDetail").hidden = true;
    renderOwnedDogs();
    renderBoardingDogs();
    showDetailDialog("Dog Removed", `<p>${escapeHtml(updated?.callName || updated?.showName || "Dog")} has been removed from the active dog list.</p>`);
  });
  $("#editOwnedDogButton").addEventListener("click", () => {
    setOwnedFormLocked(false);
    $("#deleteOwnedDogButton").hidden = false;
    showToast("Dog record unlocked for editing.");
  });
  $("#ownedDogPhotoPicker").addEventListener("click", () => handleDogPhotoClick("owned"));
  $("#ownedDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("owned"));
  $("#uploadOwnedDogFilesButton")?.addEventListener("click", async () => {
    const dog = activeOwnedDog();
    if (!dog?.id) {
      showToast("Save the dog before uploading files.");
      return;
    }
    const input = $("#ownedDogDocumentFiles");
    const uploads = await uploadOwnedDogDocumentFiles(input, dog.id);
    if (!uploads.length) return;
    const documents = [...ownedDogDocumentItems(dog), ...uploads];
    const updated = await updateOwnedDogDocuments(documents);
    if (input) input.value = "";
    if (updated) showToast(`${uploads.length} file${uploads.length > 1 ? "s" : ""} added.`);
  });
  $("#ownedDogFileList")?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action || action.dataset.action === "view-media") return;
    const dog = activeOwnedDog();
    if (!dog) return;
    const documents = ownedDogDocumentItems(dog);
    if (action.dataset.action === "save-owned-file-name") {
      const card = action.closest("[data-file-id]");
      const input = card?.querySelector('[data-action="rename-owned-file-input"]');
      const nextName = input?.value.trim();
      if (!nextName) {
        showToast("File name cannot be blank.");
        return;
      }
      await updateOwnedDogDocuments(documents.map((file) => (file.id === action.dataset.id ? { ...file, name: nextName } : file)));
      showToast("File renamed.");
    }
    if (action.dataset.action === "remove-owned-file") {
      await updateOwnedDogDocuments(documents.filter((file) => file.id !== action.dataset.id));
      showToast("File removed from this dog.");
    }
  });
  $("#ownedDogTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) {
      handleOwnedDogRosterAction(button);
      return;
    }
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    const record = readRecords("ownedDog").find((dog) => dog.id === row.dataset.id);
    if (record) openOwnedDogOverviewPopup(record);
  });
  $("#ownedDogMobileCards")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    handleOwnedDogRosterAction(button);
  });
  $("#ownedDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    const record = readRecords("ownedDog").find((dog) => dog.id === row.dataset.id);
    if (record) openOwnedDogOverviewPopup(record);
  });
  $("#ourDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    try {
      const existing = activeOwnedDog() || {};
      const formData = formPayload(formEl);
      if (!validateForm(formEl)) return;
      const dogId = existing.id || formData.id || uid("ownedDog");
      const photo = await durableDogPhoto("owned", existing, formData, $("#ownedDogPhotoInput"), dogId);
      const isFemale = formData.sex === "Female";
      const normalizedExisting = normalizeOwnedDogCare(existing);
      const bathIntervalDays = numberFrom(formData.bathIntervalDays, normalizedExisting.bathIntervalDays || careDefaults.bathIntervalDays);
      const heatCycleLengthDays = numberFrom(formData.heatCycleLengthDays, normalizedExisting.heatCycleLengthDays || careDefaults.heatCycleLengthDays);
      const payload = {
        ...existing,
        type: "ownedDog",
        id: dogId,
        removed: false,
        removedAt: "",
        removedBy: "",
        submittedAt: existing.submittedAt || new Date().toISOString(),
        ...formData,
        rabiesGoodThreeYears: formEl.elements.rabiesGoodThreeYears.checked ? "Yes" : "",
        exerciseFrequencyDays: numberFrom(formData.exerciseFrequencyDays, normalizedExisting.exerciseFrequencyDays || careDefaults.exerciseFrequencyDays),
        trainingFrequencyDays: numberFrom(formData.trainingFrequencyDays, normalizedExisting.trainingFrequencyDays || careDefaults.trainingFrequencyDays),
        bathIntervalDays,
        heatCycleLengthDays,
        nextBath: formData.nextBath || (formData.lastBath ? addDays(formData.lastBath, bathIntervalDays) : ""),
        lastHeat: isFemale ? formData.lastHeat : "",
        nextHeat: isFemale ? formData.nextHeat || (formData.lastHeat ? addDays(formData.lastHeat, heatCycleLengthDays) : "") : "",
        heatCycle: isFemale ? formData.heatCycle || "" : "",
        heatCycleStatus: isFemale ? formData.heatCycleStatus || "" : "",
        heatCycleNotes: isFemale ? formData.heatCycleNotes || "" : "",
        profilePhotoUrl: photo.profilePhotoUrl,
        profilePhotoData: photo.profilePhotoData,
        exerciseLogs: normalizedExisting.exerciseLogs || [],
        trainingLogs: normalizedExisting.trainingLogs || [],
        bathHistory: normalizedExisting.bathHistory || [],
        heatHistory: isFemale ? normalizedExisting.heatHistory || [] : [],
        careNotesHistory: normalizedExisting.careNotesHistory || [],
        documents: normalizedExisting.documents || [],
      };
      const record = upsertRecord("ownedDog", payload);
      await sendPayload(record);
      formEl.elements.id.value = record.id;
      $("#ownedDogActivityPanel").hidden = false;
      setDogPhoto("owned", record);
      renderOwnedActivity(record);
      renderOwnedDogFiles(record);
      renderOwnedDogTimeline(record);
      renderOwnedDogs();
      renderBoardingDogs();
      renderDashboard();
      selectedDogPhotos.owned = null;
      syncOwnedDogTabAvailability(record);
      setOwnedFormLocked(true);
      if (photo.photoError) {
        showDetailDialog("Dog Saved Without Photo", `<p>${escapeHtml(record.callName || record.showName || "Dog")} has been saved, but the profile photo could not be uploaded: ${escapeHtml(photo.photoError)}</p>`);
      } else {
        showDetailDialog("Dog Saved", `<p>${escapeHtml(record.callName || record.showName || "Dog")} has been saved.</p>`);
      }
    } catch (error) {
      showDetailDialog("Dog Not Saved", `<p>The dog record could not be saved: ${escapeHtml(error.message)}</p>`);
    }
  });
  $("#addTreadmillLog").addEventListener("click", () => {
    addOwnedLog("Treadmill", Number($("#ownedTreadmillMinutes").value || 0));
    $("#ownedTreadmillMinutes").value = "";
  });
  $("#addScooterLog").addEventListener("click", () => {
    addOwnedLog("Scooter", Number($("#ownedScooterMinutes").value || 0));
    $("#ownedScooterMinutes").value = "";
  });
  $("#addYardRunLog").addEventListener("click", () => {
    addOwnedLog("Yard Run", Number($("#ownedYardRunMinutes").value || 0));
    $("#ownedYardRunMinutes").value = "";
  });
  $("#addBathLog").addEventListener("click", () => {
    addOwnedLog("Bath", "", $("#ownedBathNote").value);
    $("#ownedBathNote").value = "";
  });
  $("#addTrainingLog").addEventListener("click", () => {
    addOwnedLog("Training", "", $("#ownedTrainingEntry").value);
    $("#ownedTrainingEntry").value = "";
  });
  $("#addCareNoteLog").addEventListener("click", () => {
    addOwnedLog("Medical/Care", "", $("#ownedCareEntry").value);
    $("#ownedCareEntry").value = "";
  });
  $("#ownedActivityFilter").addEventListener("change", () => renderOwnedActivity());
  $("#ownedActivityHistory").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="remove-owned-log"]');
    if (!button) return;
    event.preventDefault();
    await removeOwnedLog(button.dataset.id);
  });

  $("#boardingDogSearch").addEventListener("input", renderBoardingDogs);
  $("#boardingDogRosterTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-boarding-filter]");
    if (!button) return;
    boardingDogRosterFilter = button.dataset.boardingFilter;
    renderBoardingDogs();
  });
  $("#boardingQueueGroups")?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="change-boarding"]');
    if (!button) return;
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (record) {
      openBoardingDog(record);
      setBoardingFormLocked(false);
    }
  });
  $("#boardingOwnerAccountPanel")?.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="link-boarding-owner"]');
    if (!button) return;
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (record) await linkBoardingDogOwnerAccount(record);
  });
  $("#boardingDogColumnManager").addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    updateTableColumnConfig(control.dataset.table, control.dataset.column, control.dataset.action);
  });
  $("#boardingDogColumnManager").addEventListener("dragstart", (event) => {
    const chip = event.target.closest(".column-chip");
    if (chip) event.dataTransfer.setData("text/plain", `${chip.dataset.table}:${chip.dataset.column}`);
  });
  $("#boardingDogColumnManager").addEventListener("dragover", (event) => {
    if (event.target.closest(".column-chip")) event.preventDefault();
  });
  $("#boardingDogColumnManager").addEventListener("drop", (event) => {
    const target = event.target.closest(".column-chip");
    if (!target) return;
    event.preventDefault();
    const [table, sourceColumn] = event.dataTransfer.getData("text/plain").split(":");
    reorderTableColumn(table, sourceColumn, target.dataset.column);
  });
  $("#boardingDogTableHead").addEventListener("dblclick", (event) => {
    const header = event.target.closest("[data-sort-column]");
    if (header) setTableSort("boardingDog", header.dataset.sortColumn);
  });
  $("#boardingDogTableHead").addEventListener("dragstart", handleTableHeaderDragStart);
  $("#boardingDogTableHead").addEventListener("dragover", handleTableHeaderDragOver);
  $("#boardingDogTableHead").addEventListener("drop", handleTableHeaderDrop);
  $("#boardingDogTableHead").addEventListener("dragend", handleTableHeaderDragEnd);
  $("#addBoardingDogButton").addEventListener("click", () => openBoardingDog());
  $("#closeBoardingDogDialogButton")?.addEventListener("click", () => ($("#boardingDogDetail").hidden = true));
  $("#cancelBoardingDogEdit").addEventListener("click", () => ($("#boardingDogDetail").hidden = true));
  $("#deleteBoardingDogButton")?.addEventListener("click", () => {
    const dog = activeBoardingDog();
    if (dog) openBoardingDogDeleteConfirm(dog);
  });
  $("#editBoardingDogButton").addEventListener("click", () => {
    setBoardingFormLocked(false);
    showToast("Boarding dog record unlocked for editing.");
  });
  $("#boardingDogPhotoPicker").addEventListener("click", () => handleDogPhotoClick("boarding"));
  $("#boardingDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("boarding"));
  $("#addBoardingCustomerUpdateButton")?.addEventListener("click", addBoardingCustomerUpdate);
  $("#boardingDogStatus")?.addEventListener("change", (event) => {
    const record = activeBoardingDog();
    if (!record) return;
    const currentStatus = normalizeBoardingStatus(record);
    if (event.target.value === "Checked In" && currentStatus !== "Checked In") {
      event.target.value = currentStatus;
      openBoardingCheckInPopup(record, "Checked In", { allowEarly: true, early: boardingTransitionIsEarly(record, "Checked In") });
      return;
    }
    if (event.target.value === "In Kennel" && currentStatus !== "In Kennel") {
      event.target.value = currentStatus;
      openKennelAssignmentPopup(record, "In Kennel");
    }
  });
  $("#boardingDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row || row.dataset.source !== "boardingDog") return;
    openBoardingDog(boardingDogRecordForDisplay(row.dataset.id));
  });
  $("#boardingRequestStatusFilter").addEventListener("change", renderBoardingRequests);
  $("#boardingRequestRecords").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    const action = button?.dataset.action;
    if (["approve-boarding", "change-boarding", "cancel-boarding", "transition-boarding"].includes(action)) {
      event.stopPropagation();
      const record = boardingDogRecordForDisplay(button.dataset.id);
      if (!record) return;
      if (action === "approve-boarding") {
        const updated = upsertRecord("boardingDog", approveBoardingRecord(record));
        await sendPayload(updated);
        renderBoardingDogs();
        renderBoardingRequests();
        renderCustomerRequests();
        showToast("Boarding request approved.");
      }
      if (action === "change-boarding") {
        openBoardingDog(record);
        setBoardingFormLocked(false);
      }
      if (action === "cancel-boarding") {
        const updated = upsertRecord("boardingDog", withBoardingStatusTransition(record, "Cancelled") || record);
        await sendPayload(updated);
        renderBoardingDogs();
        renderBoardingRequests();
        renderCustomerRequests();
        showToast("Boarding request cancelled.");
      }
      if (action === "transition-boarding") {
        const next = button.dataset.nextStatus;
        await saveBoardingStatusTransition(record, next);
      }
      return;
    }
    const card = event.target.closest('[data-action="view-boarding-request"]');
    if (!card) return;
    const record = boardingDogRecordForDisplay(card.dataset.id);
    if (record) showDetailDialog(titleForRecord("boardingDog", record), detailForRecord("boardingDog", record));
  });
  $("#boardingDogTableBody").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.stopPropagation();
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (!record) return;
    if (button.dataset.action === "link-boarding-owner") {
      await linkBoardingDogOwnerAccount(record);
      return;
    }
    if (button.dataset.action === "approve-boarding") {
      const updated = upsertRecord("boardingDog", approveBoardingRecord(record));
      await sendPayload(updated);
      renderBoardingDogs();
      renderBoardingRequests();
      showToast("Boarding request approved.");
    }
    if (button.dataset.action === "change-boarding") {
      openBoardingDog(record);
      setBoardingFormLocked(false);
    }
    if (button.dataset.action === "cancel-boarding") {
      const updated = upsertRecord("boardingDog", withBoardingStatusTransition(record, "Cancelled") || record);
      await sendPayload(updated);
      renderBoardingDogs();
      renderBoardingRequests();
      renderCustomerRequests();
      showToast("Boarding request cancelled.");
    }
    if (button.dataset.action === "transition-boarding") {
      await saveBoardingStatusTransition(record, button.dataset.nextStatus);
    }
  });
  $("#boardingDogQuickCards")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (!record) return;
    if (button.dataset.action === "change-boarding") {
      openBoardingDog(record);
      setBoardingFormLocked(false);
      return;
    }
    if (button.dataset.action === "quick-boarding-transition") {
      const allowEarly = button.dataset.allowEarly === "true";
      await saveBoardingStatusTransition(record, button.dataset.nextStatus, { allowEarly, early: allowEarly && boardingTransitionIsEarly(record, button.dataset.nextStatus) });
    }
  });
  $("#customerDogUploadCards")?.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="view-media"]')) return;
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "open-linked-boarding-dog") {
      const record = boardingDogRecordForDisplay(button.dataset.id);
      if (record) {
        openBoardingDog(record);
        setBoardingFormLocked(false);
      }
      return;
    }
    if (button.dataset.action === "create-boarding-from-customer-dog") {
      const dog = readRecords("customerDog").find((item) => item.id === button.dataset.id && !item.removed);
      if (dog) {
        openBoardingDog(boardingDraftFromCustomerDog(dog));
        setBoardingFormLocked(false);
        showToast(`${dog.dogName || "Customer dog"} was loaded into a new boarding profile. Review and save it.`);
      }
    }
  });
  $("#boardingDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    try {
      const formData = formPayload(formEl);
      if (!validateForm(formEl)) return;
      let existing = activeBoardingDog() || {};
      if (!existing.id) {
        existing = findMatchingBoardingDogProfile(formData) || {};
      }
      const isNewBoardingDog = !existing.id;
      const dogId = existing.id || formData.id || uid("boardingDog");
      const timestamp = new Date().toISOString();
      const currentStatus = existing.id ? normalizeBoardingStatus(existing) : "";
      const selectedStatus = boardingLifecycleStatuses.includes(formData.boardingStatus) ? formData.boardingStatus : normalizeBoardingStatus({ boardingStatus: formData.boardingStatus || existing.boardingStatus || "Approved" });
      const statusChanged = Boolean(existing.id) && selectedStatus !== currentStatus;
      if (statusChanged && selectedStatus === "Checked In") {
        formEl.elements.boardingStatus.value = currentStatus;
        openBoardingCheckInPopup(existing, "Checked In", { allowEarly: true, early: boardingTransitionIsEarly(existing, "Checked In") });
        return;
      }
      if (statusChanged && selectedStatus === "In Kennel" && !existing.kennelLocationId) {
        formEl.elements.boardingStatus.value = currentStatus;
        openKennelAssignmentPopup(existing, "In Kennel");
        return;
      }
      const photo = await durableDogPhoto("boarding", existing, formData, $("#boardingDogPhotoInput"), dogId);
      const vaccinationUploads = await uploadVaccinationFiles($("#boardingDogVaccinationFiles"), dogId);
      const statusHistory = statusChanged
        ? [
            ...(existing.statusHistory || []),
            {
              from: currentStatus,
              to: selectedStatus,
              date: timestamp,
              by: currentUser?.name || helperName?.value || "",
            },
          ]
        : existing.statusHistory || [];
      const statusScopedStays = statusChanged ? boardingStatusScopedStays(existing, selectedStatus, timestamp) : existing.stays || [];
      const payload = {
        ...existing,
        type: "boardingDog",
        id: dogId,
        submittedAt: existing.submittedAt || timestamp,
        ...formData,
        ownerEmail: normalizeEmail(formData.ownerEmail),
        customerEmail: normalizeEmail(formData.customerEmail || formData.ownerEmail || existing.customerEmail),
        linkedOwnerEmail: normalizeEmail(formData.ownerEmail || existing.linkedOwnerEmail),
        secondaryOwnerEmail: normalizeEmail(formData.secondaryOwnerEmail),
        boardingStatus: selectedStatus,
        statusHistory,
        entrySource: existing.entrySource || (existing.customerRequest ? "customer" : "staff-admin"),
        rabiesGoodThreeYears: formEl.elements.rabiesGoodThreeYears.checked ? "Yes" : "",
        flags: checkedFrom(formEl, "boardingFlags"),
        profilePhotoUrl: photo.profilePhotoUrl,
        profilePhotoData: photo.profilePhotoData,
        vaccinationRecords: [...(existing.vaccinationRecords || []), ...vaccinationUploads],
        vaccinationFiles: [...(existing.vaccinationRecords || []), ...vaccinationUploads].map((file) => file.name).join(", "),
        stays: statusScopedStays,
        checkedInAt: selectedStatus === "Checked In" ? existing.checkedInAt || timestamp : existing.checkedInAt || "",
        inKennelAt: selectedStatus === "In Kennel" ? existing.inKennelAt || timestamp : existing.inKennelAt || "",
        readyForPickupAt: selectedStatus === "Ready For Pickup" ? existing.readyForPickupAt || timestamp : existing.readyForPickupAt || "",
        checkedOutAt: selectedStatus === "Checked Out" ? existing.checkedOutAt || timestamp : currentStatus === "Checked Out" && statusChanged ? "" : existing.checkedOutAt || "",
        cancelledAt: selectedStatus === "Cancelled" ? existing.cancelledAt || timestamp : currentStatus === "Cancelled" && statusChanged ? "" : existing.cancelledAt || "",
      };
      const record = upsertRecord("boardingDog", payload);
      await sendPayload(record);
      if (!isNewBoardingDog) {
        const oldOwnerEmail = normalizeEmail(existing.ownerEmail);
        const newOwnerEmail = normalizeEmail(record.ownerEmail);
        const oldSecondaryOwnerEmail = normalizeEmail(existing.secondaryOwnerEmail);
        const newSecondaryOwnerEmail = normalizeEmail(record.secondaryOwnerEmail);
        if (oldOwnerEmail !== newOwnerEmail) {
          await addAuditLog("Changed boarding owner email", "boardingDog", record, `${oldOwnerEmail || "none"} -> ${newOwnerEmail || "none"}`);
        }
        if (oldSecondaryOwnerEmail !== newSecondaryOwnerEmail) {
          await addAuditLog("Changed secondary owner email", "boardingDog", record, `${oldSecondaryOwnerEmail || "none"} -> ${newSecondaryOwnerEmail || "none"}`);
        }
        if ((record.profilePhotoUrl || "") !== (existing.profilePhotoUrl || "")) {
          await addAuditLog("Uploaded boarding dog profile photo", "boardingDog", record, record.dogName || "");
        }
      }
      formEl.elements.id.value = record.id;
      $("#boardingSchedulePanel").hidden = false;
      setDogPhoto("boarding", record);
      if ($("#boardingDogVaccinationFiles")) $("#boardingDogVaccinationFiles").value = "";
      renderBoardingVaccinationFiles(record);
      renderBoardingCustomerUpdates(record);
      renderBoardingStays(record);
      if (isNewBoardingDog) boardingDogRosterFilter = "All Boarding Dogs";
      renderBoardingOwnerAccountPanel(record);
      renderBoardingDogs();
      renderBoardingRequests();
      selectedDogPhotos.boarding = null;
      setBoardingFormLocked(true);
      if (photo.photoError) {
        showDetailDialog("Boarding Dog Saved Without Photo", `<p>${escapeHtml(record.dogName || "Boarding dog")} has been saved, but the profile photo could not be uploaded: ${escapeHtml(photo.photoError)}</p>`);
      } else {
        showDetailDialog("Boarding Dog Saved", `<p>${escapeHtml(record.dogName || "Boarding dog")} has been saved.</p>`);
      }
    } catch (error) {
      showDetailDialog("Boarding Dog Not Saved", `<p>The boarding dog record could not be saved: ${escapeHtml(error.message)}</p>`);
    }
  });
  $("#boardingStayForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    formEl.dataset.dogId = activeBoardingDog()?.id || "";
    const existingStay = activeBoardingDog()?.stays?.find((stay) => stay.id === formEl.elements.stayId.value);
    const record = await saveBoardingStayFromForm(formEl);
    if (!record) return;
    formEl.reset();
    $("#boardingStayId").value = "";
    $("#boardingStaySaveButton").textContent = "Add Boarding Stay";
    showToast(existingStay ? "Boarding stay updated." : "Boarding stay added.");
  });
  $("#boardingStayHistory").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-stay"], [data-action="remove-stay"]');
    if (!button) return;
    const dog = activeBoardingDog();
    if (button.dataset.action === "edit-stay") openBoardingStayPopup(dog, button.dataset.id);
    if (button.dataset.action === "remove-stay") openBoardingStayRemoveConfirm(dog, button.dataset.id);
  });
  $("#openBoardingScheduleButton").addEventListener("click", () => openBoardingSchedulePopup(activeBoardingDog()));
  $("#resetBoardingStayButton").addEventListener("click", () => {
    $("#boardingStayForm").reset();
    $("#boardingStayId").value = "";
    $("#boardingStaySaveButton").textContent = "Add Boarding Stay";
  });

  $("#requestForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    try {
      const mediaItems = await uploadMediaFiles($("#requestMedia"), "requests", {
        allowedTypes: IMAGE_UPLOAD_TYPES,
        allowedExtensions: [".jpg", ".jpeg", ".png"],
        label: "request image",
      });
      const files = mediaItems.map((file) => file.name).join(", ");
	      const staff = staffIdentity();
	      const payload = { type: "request", id: uid("request"), submittedAt: new Date().toISOString(), status: "Active", completed: false, completedAt: "", completedBy: "", removed: false, removedAt: "", removedBy: "", ...formPayload(formEl), requestedBy: staff.name, requestedByEmail: staff.email, mediaFiles: files, mediaItems, urgentNeeds: formEl.querySelector('input[name="urgentNeeds"]').checked };
	      const record = await saveAndNotify(payload, payload.urgentNeeds ? "urgentKennelRequestCreated" : "");
	      formEl.reset();
	      renderRequests();
      showDetailDialog("Request Logged", requestDetailHtml(record));
    } catch (error) {
      showDetailDialog("Request Not Logged", `<p>The request could not be saved: ${escapeHtml(error.message)}</p>`);
    }
  });

  $("#maintenanceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    try {
      const mediaItems = await uploadMediaFiles($("#maintenanceMedia"), "maintenance", {
        allowedTypes: IMAGE_UPLOAD_TYPES,
        allowedExtensions: [".jpg", ".jpeg", ".png"],
        label: "maintenance image",
      });
      const files = mediaItems.map((file) => file.name).join(", ");
	      const staff = staffIdentity();
	      const payload = { type: "maintenance", id: uid("maintenance"), submittedAt: new Date().toISOString(), status: "Active", completed: false, completedAt: "", completedBy: "", removed: false, removedAt: "", removedBy: "", ...formPayload(formEl), reportedBy: staff.name, reportedByEmail: staff.email, mediaFiles: files, mediaItems, urgentAttention: formEl.querySelector('input[name="urgentAttention"]').checked };
	      const record = await saveAndNotify(payload, payload.urgentAttention ? "urgentMaintenanceCreated" : "");
	      formEl.reset();
      renderMaintenance();
      showDetailDialog("Maintenance Item Logged", maintenanceDetailHtml(record));
    } catch (error) {
      showDetailDialog("Maintenance Item Not Logged", `<p>The maintenance item could not be saved: ${escapeHtml(error.message)}</p>`);
    }
  });

  $("#showCompletedRequests").addEventListener("change", renderRequests);
  $("#showCompletedMaintenance").addEventListener("change", renderMaintenance);
  $("#requestRecords").addEventListener("click", async (event) => {
    if (event.target.closest('[data-action="view-media"]')) return;
    const button = event.target.closest('[data-action="toggle-request"], [data-action="remove-request"]');
    if (button) {
      event.stopPropagation();
      if (button.dataset.action === "toggle-request") {
        toggleRecordCompletion("request", button.dataset.id);
      }
      if (button.dataset.action === "remove-request" && currentRole() === "admin") {
        if (!window.confirm("Remove this request from the active records?")) return;
        await markRecordRemoved("request", button.dataset.id);
        renderRequests();
        renderDashboard();
        showToast("Request removed.");
      }
      return;
    }
    const card = event.target.closest('[data-action="view-request"]');
    if (!card) return;
    const record = readRecords("request").find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord("request", record), requestDetailHtml(record), { type: "request", id: record.id });
  });
  $("#maintenanceRecords").addEventListener("click", async (event) => {
    if (event.target.closest('[data-action="view-media"]')) return;
    const button = event.target.closest('[data-action="toggle-maintenance"], [data-action="remove-maintenance"]');
    if (button) {
      event.stopPropagation();
      if (button.dataset.action === "toggle-maintenance") {
        toggleRecordCompletion("maintenance", button.dataset.id);
      }
      if (button.dataset.action === "remove-maintenance" && currentRole() === "admin") {
        if (!window.confirm("Remove this maintenance item from the active records?")) return;
        await markRecordRemoved("maintenance", button.dataset.id);
        renderMaintenance();
        renderDashboard();
        showToast("Maintenance item removed.");
      }
      return;
    }
    const card = event.target.closest('[data-action="view-maintenance"]');
    if (!card) return;
    const record = readRecords("maintenance").find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord("maintenance", record), maintenanceDetailHtml(record), { type: "maintenance", id: record.id });
  });

  $("#serviceForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const data = formPayload(event.currentTarget);
    const existing = data.id ? readRecords("service").find((record) => record.id === data.id) : {};
    const flags = normalizedServiceFlags(checkedFrom(event.currentTarget, "serviceFlags"));
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
    await addAuditLog(existing?.id ? "Updated service" : "Created service", "service", record, `${record.category || "Service"} ${money(record.basePrice)}`);
    renderServices();
    renderDashboard();
    renderFinancials();
    openService();
    showToast("Service pricing saved.");
  });
  $("#resetServiceForm").addEventListener("click", () => openService());
  $("#serviceSearch").addEventListener("input", renderServices);
  $("#serviceTableHead").addEventListener("click", (event) => {
    const header = event.target.closest("[data-sort-column]");
    if (header) setTableSort("service", header.dataset.sortColumn);
  });
  $("#serviceTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openService(readRecords("service").find((record) => record.id === row.dataset.id));
    window.scrollTo({ top: $("#servicesPage").offsetTop, behavior: "smooth" });
  });

  $("#customerDogPhotoButton").addEventListener("click", () => handleDogPhotoClick("customer"));
  $("#customerDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("customer"));
  $("#customerDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    const uploadStatus = $("#customerUploadStatus");
    try {
      const data = formPayload(formEl);
      const existing = data.id ? readRecords("customerDog").find((record) => record.id === data.id) || {} : {};
      const dogId = existing.id || data.id || uid("customerDog");
      if (uploadStatus) uploadStatus.textContent = "Saving dog profile and uploading files...";
      setSubmitState($("#saveCustomerDogButton"), true, "Saving...");
      const photo = await durableDogPhoto("customer", existing, data, $("#customerDogPhotoInput"), dogId);
      const vaccinationUploads = await uploadVaccinationFiles($("#customerVaccinationFiles"), dogId);
      const payload = {
        ...existing,
        type: "customerDog",
        id: dogId,
        submittedAt: existing?.submittedAt || new Date().toISOString(),
        customerEmail: currentUser?.email || data.ownerEmail || "",
        ...data,
        ownerName: currentUser?.name || data.ownerName || "",
        ownerEmail: currentUser?.email || data.ownerEmail || "",
        profilePhotoUrl: photo.profilePhotoUrl,
        profilePhotoData: photo.profilePhotoData,
        vaccinationRecords: [...(existing.vaccinationRecords || []), ...vaccinationUploads],
        vaccinationFiles: [...(existing.vaccinationRecords || []), ...vaccinationUploads].map((file) => file.name).join(", "),
        removed: false,
      };
      const record = upsertRecord("customerDog", payload);
      await sendPayload(record);
      await ensureCustomerAccessProfile({
        email: record.customerEmail || record.ownerEmail,
        name: record.ownerName,
        customerDogId: record.id,
      });
      resetCustomerDogForm();
      renderCustomerDogs();
      renderBoardingDogs();
      const uploadText = vaccinationUploads.length ? `${vaccinationUploads.length} vaccination file(s) uploaded.` : "No new vaccination files uploaded.";
      if (uploadStatus) uploadStatus.textContent = uploadText;
      const message = photo.photoError
        ? `<p>${escapeHtml(record.dogName || "Dog")} has been saved, but the profile photo could not be uploaded: ${escapeHtml(photo.photoError)}</p>`
        : `<p>${escapeHtml(record.dogName || "Dog")} has been saved to your list.</p><p>${escapeHtml(uploadText)}</p>`;
      showDetailDialog(existing?.id ? "Dog Updated" : "Dog Saved", message);
    } catch (error) {
      if (uploadStatus) uploadStatus.textContent = "The dog profile or files could not be saved.";
      showDetailDialog("Dog Not Saved", `<p>The dog record could not be saved: ${escapeHtml(error.message)}</p>`);
    } finally {
      setSubmitState($("#saveCustomerDogButton"), false);
    }
  });
  $("#newCustomerDogButton").addEventListener("click", resetCustomerDogForm);
  $("#customerBookingForm").addEventListener("change", (event) => {
    if (event.target.name === "customerServices") {
      const quantityInput = $("#customerBookingForm").elements[`serviceQuantity-${event.target.value}`];
      if (quantityInput) {
        quantityInput.disabled = !event.target.checked;
        if (event.target.checked && !quantityInput.value) quantityInput.value = "1";
      }
    }
    updateCustomerEstimate();
  });
  $("#customerBookingForm").addEventListener("input", (event) => {
    if (event.target.classList.contains("service-quantity")) updateCustomerEstimate();
  });
  $("#customerBookingDogList").addEventListener("change", updateCustomerEstimate);
  $("#customerBookingDogList").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="customer-add-dog-cta"]');
    if (button) switchPage("customerPage");
  });
  $("#customerDogList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "view-customer-request") {
      const boarding = readRecords("boardingDog").find((item) => item.id === button.dataset.id && !item.removed);
      if (boarding) showDetailDialog(titleForRecord("boardingDog", boarding), detailForRecord("boardingDog", boarding));
      return;
    }
    const record = readRecords("customerDog").find((item) => item.id === button.dataset.id);
    if (!record) return;
    if (button.dataset.action === "edit-customer-dog") {
      openCustomerDog(record);
      return;
    }
    if (button.dataset.action === "remove-customer-dog") {
      const updated = upsertRecord("customerDog", { ...record, removed: true, removedAt: new Date().toISOString() });
      sendPayload(updated);
      if ($("#customerDogId").value === record.id) resetCustomerDogForm();
      renderCustomerDogs();
      renderBoardingDogs();
      showDetailDialog("Dog Removed", `<p>${escapeHtml(record.dogName || "This dog")} has been removed from your dog list.</p>`);
    }
  });
  $("#customerRequestStatusFilter").addEventListener("change", renderCustomerRequests);
  $("#customerRequestList").addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton?.dataset.action === "edit-customer-request") {
      event.stopPropagation();
      editCustomerRequest(readRecords("boardingDog").find((item) => item.id === actionButton.dataset.id));
      return;
    }
    if (actionButton?.dataset.action === "cancel-customer-request") {
      event.stopPropagation();
      const record = readRecords("boardingDog").find((item) => item.id === actionButton.dataset.id);
      if (!record) return;
      const transitioned = withBoardingStatusTransition(record, "Cancelled");
      if (!transitioned) {
        showToast("That boarding status transition is not allowed.");
        return;
      }
      const updated = upsertRecord("boardingDog", transitioned);
      sendPayload(updated);
      renderCustomerRequests();
      renderBoardingDogs();
      renderBoardingRequests();
      showDetailDialog("Request Cancelled", `<p>${escapeHtml(record.dogName || "This request")} has been cancelled.</p>`);
      return;
    }
    const card = event.target.closest('[data-action="view-customer-request"]');
    if (!card) return;
    const record = readRecords("boardingDog").find((item) => item.id === card.dataset.id);
    if (record) showDetailDialog(titleForRecord("boardingDog", record), detailForRecord("boardingDog", record));
  });
  $("#customerBookingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    const estimate = customerEstimateDetails();
    if (!estimate.dogs.length) {
      showToast("Select at least one dog for the boarding request.");
      return;
    }
    showBookingConfirmDialog(estimate);
  });
  $("#cancelBookingRequestButton").addEventListener("click", () => {
    pendingCustomerBooking = null;
    $("#bookingConfirmDialog").close();
  });
  $("#confirmBookingRequestButton").addEventListener("click", submitPendingCustomerBooking);
  $("#resetCustomerBookingButton").addEventListener("click", resetCustomerBookingForm);

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

  $("#settingsUserForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const record = await saveSettingsUserProfile();
    if (!record) return;
    await addAuditLog(record.submittedAt === record.updatedAt ? "Created user" : "Updated user", "settingsUser", record, roleLabel(record.role));
    openSettingsUser();
    showToast("User access saved.");
  });
  $("#adminSetPasswordButton")?.addEventListener("click", () => adminSetTemporaryPassword());
  $("#adminSendPasswordResetButton")?.addEventListener("click", () => adminSendPasswordResetEmail());
  $("#newSettingsUserButton")?.addEventListener("click", () => openSettingsUser());
  $("#openSettingsUserButton")?.addEventListener("click", () => openSettingsUserPopup(defaultSettingsUserForActiveTab()));
  $("#settingsUserTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-settings-user-tab]");
    if (!button) return;
    settingsUserTab = button.dataset.settingsUserTab;
    renderSettingsUsers();
  });
  $("#settingsUserTableHead")?.addEventListener("dblclick", (event) => {
    const header = event.target.closest("[data-settings-sort]");
    if (!header) return;
    setSettingsUserSort(header.dataset.settingsSort);
  });
  $("#settingsUserTableHead")?.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const header = event.target.closest("[data-settings-sort]");
    if (!header) return;
    event.preventDefault();
    setSettingsUserSort(header.dataset.settingsSort);
  });
  $("#settingsUserTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    const user = readRecords("settingsUser").find((item) => item.id === row.dataset.id);
    if (user) openSettingsUserPopup(user);
  });
  $("#settingsUserTableBody").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="remove-settings-user"]');
    if (!button) return;
    const user = readRecords("settingsUser").find((item) => item.id === button.dataset.id);
    if (user) openSettingsUserRemoveConfirm(user);
  });
  $("#settingsUserCards")?.addEventListener("click", (event) => {
    const card = event.target.closest('[data-action="view-settings-user"]');
    if (!card) return;
    const user = readRecords("settingsUser").find((item) => item.id === card.dataset.id);
    if (user) openSettingsUserPopup(user);
  });
  $("#auditLogList")?.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="restore-boarding-dog"]');
    if (!button) return;
    const restored = await restoreBoardingDogById(button.dataset.id);
    if (restored) showToast("Boarding dog restored.");
  });
  $("#kennelBuildingTabs")?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action?.dataset.action === "add-kennel-building-tab") {
      openKennelBuildingPopup();
      return;
    }
    if (action?.dataset.action === "remove-kennel-building-tab") {
      openKennelBuildingRemoveConfirm(action.dataset.building);
      return;
    }
    const tab = event.target.closest("[data-kennel-building-tab]");
    if (!tab) return;
    kennelBuildingTab = tab.dataset.kennelBuildingTab || "Shed";
    renderKennelLocations();
  });
  $("#addKennelLocationButton")?.addEventListener("click", addKennelLocationToActiveBuilding);
  $("#newKennelLocationText")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addKennelLocationToActiveBuilding();
  });
  $("#kennelLocationList")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "remove-kennel-location") {
      const removed = await removeKennelLocationById(button.dataset.id);
      if (removed) showToast("Kennel location removed.");
    }
  });
}

function switchPage(pageId) {
  pageId = normalizePageId(pageId);
  if (!pageAllowed(pageId)) {
    showToast(helperIsLoggedIn() ? "Your login does not have access to that page." : "Sign in first.");
    pageId = "loginPage";
  }
  if (helperIsLoggedIn() && pageId !== "loginPage") {
    localStorage.setItem(stateKeys.lastPage, pageId);
    const nextHash = `#${encodeURIComponent(pageId)}`;
    if (window.location.hash !== nextHash) window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}${nextHash}`);
  } else if (pageId === "loginPage" && window.location.hash && pageIdFromHash()) {
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  }
  $$(".nav-button").forEach((item) => {
    const exact = normalizePageId(item.dataset.page || "") === pageId;
    const settingsRoot = item.dataset.settingsRoot === "true" && settingsPageIds.has(pageId);
    item.classList.toggle("is-active", exact || settingsRoot);
  });
  $$(".page-view").forEach((page) => page.classList.toggle("is-active", page.id === pageId));
  $("#mobilePageSelect").value = pageId;
  syncMobileNavigationActive(pageId);
  setMobileMoreOpen(false);
  document.body.classList.toggle("is-login-view", pageId === "loginPage" && !helperIsLoggedIn());
  if (pageId === "ourDogsPage") window.setTimeout(() => $("#ownedDogSearch")?.focus(), 100);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function initializeApp() {
  initSupabaseClient();
  ensureTaskConfig();
  setDefaultDateAndDay();
  $("#dashboardDate").value = todayDate();
  seedDefaultServices();
  seedDefaultCfoNotes();
  seedDefaultKennelLocations();
  seedDefaultKennelBuildings();
  const restoredFromSupabase = await restoreSupabaseSession();
  if (!restoredFromSupabase) restoreSession();
  updateConditionalSections();
  updateRotationBanner();
  updateCompletionCount();
  updateTimeDisplays();
  renderDailyTaskLists();
  setupRequiredFields();
  initEvents();
  showAuthRedirectError();
  hydrateLoginFromUrl();
  updateNavigationAccess();
  renderAllRecords();
  if (helperIsLoggedIn()) switchPage(rememberedPageForRole(currentRole()));
  else document.body.classList.add("is-login-view");
  await loadRemoteRecords();
  requirePasswordChangeIfNeeded();
  startAutoSync();
}

initializeApp();
