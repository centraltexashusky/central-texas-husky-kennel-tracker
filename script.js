// === MODULE: SHARED ===
const SUPABASE_URL = "https://vwvkzniygessvwifrwvn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_IeKmeCMalVYUnYQUe3gEew_NdjAzmAQ";
const MEDIA_BUCKET = "kennel-media";
const MAX_MEDIA_UPLOAD_MB = 50;
const MAX_MEDIA_UPLOAD_BYTES = MAX_MEDIA_UPLOAD_MB * 1024 * 1024;
const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png"];
const VIDEO_UPLOAD_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
const CUSTOMER_UPDATE_MEDIA_TYPES = [...IMAGE_UPLOAD_TYPES, ...VIDEO_UPLOAD_TYPES];
const CUSTOMER_UPDATE_MEDIA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".webm", ".m4v"];
const VACCINATION_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DOG_DOCUMENT_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const APP_PRODUCTION_URL = "https://kennel.centraltexashusky.com/";
const APP_WIX_EMBED_URL = "https://www.centraltexashusky.com/kennel-tracker";
const APP_AUTH_REDIRECT_URL = APP_PRODUCTION_URL;
const TASK_TEMPLATE_RECORD_TYPE = "dailyTaskTemplate";
const TASK_TEMPLATE_RECORD_ID = "daily-task-template";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
function cssEscapeValue(value = "") {
  const text = String(value || "");
  if (globalThis.CSS?.escape) return CSS.escape(text);
  return text.replace(/["\\]/g, "\\$&");
}

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
let remoteLoadInProgress = false;
let lastRemoteRecordsSignature = null;
let deferredRemoteRenderTimer = null;
let lastUserScrollAt = 0;
let currentUser = null;
let impersonationSession = null;
let supabaseClient = null;
let detailDialogContext = null;
let pendingCustomerBooking = null;
let customerBookingSubmitInProgress = false;
let pendingBoardingCheckIn = null;
let activeClockIn = JSON.parse(localStorage.getItem("cth-active-clock-in") || "null") || "";
let localTestMode = false;
let dailyTaskTab = "morning";
let dailyTaskTabPointerDrag = null;
let suppressDailyTaskTabClick = false;
let dashboardAlertFilter = "All";
let dashboardShowAllAlerts = false;
let timesheetTab = "clock";
let timesheetFilterStart = "";
let timesheetFilterEnd = "";
let scheduleWeekDate = todayDate();
let operationCalendarMonth = todayDate().slice(0, 7);
let settingsUserTab = "admin";
let settingsUserSort = { key: "name", direction: "asc" };
let servicePricingFilter = "all";
let kennelBuildingTab = "Shed";
let boardingDogRosterFilter = "Active dogs";
let boardingDogPriorityFilter = "";
let boardingViewMode = "board";
let showRemainingTasksOnly = true;
const selectedDogPhotos = { owned: null, boarding: null, customer: null };
let ownedDogCareFilter = "All";
let pendingStructuredCareLogs = [];
let mediaZoomLevel = 1;
let activeServiceInfoIcon = null;
let serviceInfoTooltipEl = null;
const signedMediaUrlCache = new Map();
let customerProfileSyncInProgress = false;
const CUSTOMER_BOARDING_AGREEMENT_SOURCE = globalThis.CUDDLE_STAY_BOARDING_AGREEMENT || {};
const CUSTOMER_BOARDING_AGREEMENT_VERSION = CUSTOMER_BOARDING_AGREEMENT_SOURCE.version || "2026-07-12-cuddle-stay-v2";
const CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE = CUSTOMER_BOARDING_AGREEMENT_SOURCE.effectiveDate || "2026-07-12";
const CUSTOMER_BOARDING_AGREEMENT_TITLE = CUSTOMER_BOARDING_AGREEMENT_SOURCE.title || "Cuddle Stay Boarding Services Agreement";
const CUSTOMER_BOARDING_AGREEMENT_CONSENT_TEXT = CUSTOMER_BOARDING_AGREEMENT_SOURCE.electronicConsentText || "I consent to conducting this transaction electronically, receiving and retaining this agreement electronically, and using my electronic signature for this boarding agreement.";
const CUSTOMER_BOARDING_AGREEMENT_INTENT_TEXT = CUSTOMER_BOARDING_AGREEMENT_SOURCE.signatureIntentText || "I have reviewed the Cuddle Stay Boarding Services Agreement and intend my electronic signature to have the same legal effect as a handwritten signature.";
const CUSTOMER_BOARDING_AGREEMENT_MARKDOWN = String(CUSTOMER_BOARDING_AGREEMENT_SOURCE.markdown || "").trim();
let customerAgreementSignaturePadInitialized = false;
let customerAgreementControlsInitialized = false;
let customerAgreementSignatureDrawing = false;
let customerAgreementSignatureHasInk = false;
let authSessionSyncPromise = null;
let authSessionSyncStartedAt = 0;
let suppressAuthSyncUntil = 0;
let taskTemplateSyncTimer = null;
let applyingRemoteTaskConfig = false;
const REMOTE_RENDER_SCROLL_IDLE_MS = 1200;
const REMOTE_LOAD_STALE_MS = 15000;
const AUTH_BOOT_TIMEOUT_MS = 8000;
const AUTH_SYNC_STALE_MS = 15000;
const APP_RESUME_DEBOUNCE_MS = 900;
const APP_RESUME_REMOTE_REFRESH_MS = 30000;
let remoteLoadStartedAt = 0;
let lastRemoteLoadFinishedAt = 0;
let appInitialized = false;
let appResumeTimer = null;
let lastAppResumeAt = 0;
let showReadNotifications = false;
let visibleReadNotificationCount = 4;
const MAX_READ_NOTIFICATIONS = 10;

const careDefaults = {
  exerciseFrequencyDays: 0,
  trainingFrequencyDays: 0,
  bathIntervalDays: 0,
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
const mobilePrimaryPageIds = ["dashboardPage", "dailyPage", "timesheetPage", "customerPage", "customerRequestsPage", "customerUpdatesPage", "customerFilesPage"];
const mobilePrimaryPageSet = new Set(mobilePrimaryPageIds);
const mobileMoreMenuItems = [
  { pageId: "boardingDogsPage", label: "Boarding Dogs", roles: ["helper", "admin"] },
  { pageId: "ourDogsPage", label: "Our Dogs", roles: ["helper", "admin"] },
  { pageId: "maintenancePage", label: "Maintenance", roles: ["helper", "admin"] },
  { pageId: "requestsPage", label: "Requests", roles: ["helper", "admin"] },
  { pageId: "financialsPage", label: "Financials", roles: ["admin"] },
  { pageId: "settingsUsersPage", label: "Users", roles: ["admin"] },
  { pageId: "settingsKennelLocationsPage", label: "Kennel Locations", roles: ["admin"] },
  { pageId: "settingsHoursPage", label: "Hours of Operation", roles: ["admin"] },
  { pageId: "servicesPage", label: "Services & Pricing", roles: ["admin"] },
  { pageId: "settingsAlertsPage", label: "Alerts", roles: ["admin"] },
  { pageId: "settingsAuditLogPage", label: "Audit Log", roles: ["admin"] },
];
const settingsPageIds = new Set(["settingsUsersPage", "settingsKennelLocationsPage", "settingsHoursPage", "servicesPage", "settingsAlertsPage", "settingsAuditLogPage"]);
const operationWeekdays = [
  { key: "monday", label: "Monday", shortLabel: "Mon", dayIndex: 1 },
  { key: "tuesday", label: "Tuesday", shortLabel: "Tue", dayIndex: 2 },
  { key: "wednesday", label: "Wednesday", shortLabel: "Wed", dayIndex: 3 },
  { key: "thursday", label: "Thursday", shortLabel: "Thu", dayIndex: 4 },
  { key: "friday", label: "Friday", shortLabel: "Fri", dayIndex: 5 },
  { key: "saturday", label: "Saturday", shortLabel: "Sat", dayIndex: 6 },
  { key: "sunday", label: "Sunday", shortLabel: "Sun", dayIndex: 0 },
];
const defaultOperationOpenTime = "09:00";
const defaultOperationCloseTime = "21:00";

const alertTypeDefinitions = [
  { key: "customerBoardingRequestCreated", label: "New customer boarding request", group: "Customer" },
  { key: "customerBoardingRequestUpdated", label: "Customer boarding request update", group: "Customer" },
  { key: "customerDogFileUploaded", label: "Customer uploaded dog file", group: "Customer" },
  { key: "customerStayUpdateSent", label: "Customer stay update sent", group: "Customer" },
  { key: "urgentKennelRequestCreated", label: "Urgent kennel request", group: "Operations" },
  { key: "urgentMaintenanceCreated", label: "Urgent maintenance request", group: "Operations" },
  { key: "timeOffRequested", label: "Staff time off request", group: "Staff" },
  { key: "timeOffReviewed", label: "Time off approval/denial", group: "Staff" },
  { key: "schedulePublished", label: "Schedule published", group: "Schedule" },
  { key: "scheduleChangedAfterPublish", label: "Schedule changed after publish", group: "Schedule" },
  { key: "urgentStaffAlertSent", label: "Urgent staff broadcast", group: "Manual" },
  { key: "urgentCustomerAlertSent", label: "Urgent customer broadcast", group: "Manual" },
];
const adminDefaultAlertTypes = new Set([
  "customerBoardingRequestCreated",
  "customerBoardingRequestUpdated",
  "customerDogFileUploaded",
  "urgentKennelRequestCreated",
  "urgentMaintenanceCreated",
  "timeOffRequested",
  "urgentStaffAlertSent",
  "urgentCustomerAlertSent",
]);
const staffDefaultAlertTypes = new Set(["timeOffReviewed", "schedulePublished", "scheduleChangedAfterPublish", "urgentStaffAlertSent"]);

const boardingLifecycleStatuses = ["Pending", "Approved", "Checked In", "In Kennel", "Ready For Pickup", "Checked Out", "Cancelled"];
const activeBoardingStayStatuses = ["Checked In", "In Kennel", "Ready For Pickup"];
const boardingStatusTransitions = {
  Pending: ["Approved", "Cancelled"],
  Approved: ["Checked In", "Cancelled"],
  "Checked In": ["Approved", "In Kennel"],
  "In Kennel": ["Approved", "Checked In", "Ready For Pickup"],
  "Ready For Pickup": ["In Kennel", "Checked Out"],
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
  dog: "cth-dog-records",
  userDogAccess: "cth-userDogAccess-records",
  boardingReservation: "cth-boardingReservation-records",
  reservationService: "cth-reservationService-records",
  dogVaccination: "cth-dogVaccination-records",
  dogInternalNote: "cth-dogInternalNote-records",
  dogActivityLog: "cth-dogActivityLog-records",
  reservationCustomerUpdate: "cth-reservationCustomerUpdate-records",
  dogClaimRequest: "cth-dogClaimRequest-records",
  legacyDogLink: "cth-legacyDogLink-records",
  boardingAgreement: "cth-boardingAgreement-records",
  settingsUser: "cth-settingsUser-records",
  cfoNote: "cth-cfoNote-records",
  calendarNote: "cth-calendarNote-records",
  kennelLocation: "cth-kennelLocation-records",
  kennelBuilding: "cth-kennelBuilding-records",
  operationHours: "cth-operationHours-records",
  operationDateOverride: "cth-operationDateOverride-records",
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
  boardingRequestStatusFilter: "cth-boarding-request-status-filter",
  session: "cth-current-session",
  impersonation: "cth-impersonation-session",
  authThrottle: "cth-auth-throttle",
  lastPage: "cth-last-page-id",
};

const BOARDING_MEMBER_PRIMARY_RATE = 45;
const BOARDING_MEMBER_SHARED_CRATE_RATE = 35;
const BOARDING_NON_MEMBER_RATE = 65;
const BOARDING_MAX_DOGS_PER_CRATE = 2;

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
    { key: "boardingStatus", label: "Status", value: (record) => boardingDisplayStatus(record) },
    { key: "breedDescription", label: "Breed", value: (record) => record.breedDescription || "" },
    { key: "ownerPhone", label: "Phone", value: (record) => record.ownerPhone || "" },
    { key: "emergencyPhone", label: "Emergency", value: (record) => [record.emergencyName, record.emergencyPhone].filter(Boolean).join(" ") },
    { key: "requiredUpdate", label: "Required Update", value: (record) => (record.flags || []).includes("Required update from owner") ? "Yes" : "No" },
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

function localDateKey(value = new Date()) {
  const source = value instanceof Date ? value : new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(source.getTime())) return "";
  const year = source.getFullYear();
  const month = String(source.getMonth() + 1).padStart(2, "0");
  const day = String(source.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDate() {
  return localDateKey(new Date());
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
  return localDateKey(value);
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

function nonNegativeNumberFrom(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
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
  copy.exerciseFrequencyDays = nonNegativeNumberFrom(copy.exerciseFrequencyDays, careDefaults.exerciseFrequencyDays);
  copy.trainingFrequencyDays = nonNegativeNumberFrom(copy.trainingFrequencyDays, careDefaults.trainingFrequencyDays);
  copy.bathIntervalDays = nonNegativeNumberFrom(copy.bathIntervalDays, careDefaults.bathIntervalDays);
  copy.heatCycleLengthDays = numberFrom(copy.heatCycleLengthDays, careDefaults.heatCycleLengthDays);
  copy.nextRabiesDate = dateOnly(copy.nextRabiesDate);
  copy.nextDhppDate = dateOnly(copy.nextDhppDate);
  copy.lastExerciseDate = dateOnly(copy.lastExerciseDate) || latestLogDate(copy.exerciseLogs);
  copy.lastTrainingDate = dateOnly(copy.lastTrainingDate) || latestLogDate(copy.trainingLogs);
  copy.lastBath = dateOnly(copy.lastBath) || latestLogDate(copy.bathHistory);
  copy.nextBath = dateOnly(copy.nextBath) || nextBathFromFrequency(copy.lastBath, copy.bathIntervalDays);
  copy.lastHeat = copy.sex === "Female" ? dateOnly(copy.lastHeat) || latestLogDate(copy.heatHistory) : "";
  copy.nextHeat = copy.sex === "Female" ? dateOnly(copy.nextHeat) || (copy.lastHeat ? addDays(copy.lastHeat, copy.heatCycleLengthDays) : "") : "";
  return copy;
}

function careDueFromDate(lastDate, intervalDays, date = todayDate()) {
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

function nextBathFromFrequency(lastBath = "", intervalDays = 0) {
  return lastBath && Number(intervalDays || 0) > 0 ? addDays(lastBath, intervalDays) : "";
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
      arrayValue(record.careNotesHistory).length,
  );
}

function ownedDogVaccineReviewItems(record = {}, referenceDate = todayDate()) {
  return ownedLoggedVaccinationConfig.map((loggedConfig, index) => {
    const dueConfig = ownedHealthDueConfig[index] || {};
    const loggedDate = dateOnly(record[loggedConfig.field]);
    const dueDate = dateOnly(record[dueConfig.field]);
    if (!loggedDate) {
      return { field: loggedConfig.field, label: `No ${loggedConfig.label} Logged`, className: "is-red-warning" };
    }
    if (!dueDate) {
      return { field: dueConfig.field, label: `${loggedConfig.label} renewal date missing`, className: "is-red-warning" };
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

function serviceChipsHtml(service = {}) {
  return [serviceFlagChipsHtml(service.flags), serviceBoardingRateChipHtml(service), serviceDependencyChipHtml(service)].filter(Boolean).join(" ");
}

function isMemberUser(user = currentUser) {
  if (!user) return false;
  const profile = savedUserFor(user) || {};
  return profile.isMember === true || profile.isMember === "on" || profile.isMember === "true" || profile.member === true
    || user.isMember === true || user.isMember === "on" || user.isMember === "true" || user.member === true;
}

var dogSexSpayNeuterOptions = ["Male Intact", "Male Neutered", "Male Unknown", "Female Intact", "Female Spayed", "Female Unknown"];

function canonicalDogSpayNeuterStatus(value = "") {
  const clean = String(value || "").trim();
  if (!clean) return "";
  const exact = dogSexSpayNeuterOptions.find((option) => option.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;
  const normalized = clean.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (normalized.includes("female") && normalized.includes("spay")) return "Female Spayed";
  if (normalized.includes("female") && normalized.includes("intact")) return "Female Intact";
  if (normalized.includes("female") && normalized.includes("unknown")) return "Female Unknown";
  if (normalized.includes("male") && normalized.includes("neuter")) return "Male Neutered";
  if (normalized.includes("male") && normalized.includes("intact")) return "Male Intact";
  if (normalized.includes("male") && normalized.includes("unknown")) return "Male Unknown";
  if (normalized === "spayed") return "Female Spayed";
  if (normalized === "neutered") return "Male Neutered";
  return clean;
}

function combinedDogSpayNeuterStatus(recordOrSex = {}, statusValue = "") {
  const record = recordOrSex && typeof recordOrSex === "object" ? recordOrSex : {};
  const sex = String(record.sex || (typeof recordOrSex === "string" ? recordOrSex : "") || "").trim();
  const rawStatus = statusValue || record.spayNeuterStatus || "";
  const canonical = canonicalDogSpayNeuterStatus(rawStatus);
  if (dogSexSpayNeuterOptions.includes(canonical)) return canonical;
  const sexKey = sex.toLowerCase();
  const statusKey = String(rawStatus || canonical || "").toLowerCase();
  if (sexKey.includes("female")) {
    if (statusKey.includes("spay")) return "Female Spayed";
    if (statusKey.includes("intact")) return "Female Intact";
    return "Female Unknown";
  }
  if (sexKey.includes("male")) {
    if (statusKey.includes("neuter")) return "Male Neutered";
    if (statusKey.includes("intact")) return "Male Intact";
    return "Male Unknown";
  }
  return "";
}

function sexFromCombinedDogSpayNeuterStatus(status = "") {
  const combined = combinedDogSpayNeuterStatus({ spayNeuterStatus: status });
  if (combined.startsWith("Female")) return "Female";
  if (combined.startsWith("Male")) return "Male";
  return "";
}

function dogTypeBadgeHtml(type) {
  const labels = {
    ownedDog: "Our Dog",
    boardingDog: "Boarding Dog",
    customerDog: "Customer Dog",
  };
  return statusChipHtml(labels[type] || "Dog", `dog-type-chip ${type}`);
}

// === MODULE: BOARDING ===
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
  const stay = boardingPrimaryStay(record);
  if (stay?.id) return boardingStayStatusChipHtml(record, stay);
  const status = boardingDisplayStatus(record);
  const kennelLabel = status === "In Kennel" ? boardingKennelLocationLabel(record) : "";
  const label = kennelLabel ? `${status} - ${kennelLabel}` : status;
  return statusChipHtml(label, `boarding-status-chip ${statusClassForBoardingStatus(status)}`);
}

function customerRequestStatusLabel(status = "") {
  const normalized = boardingLifecycleStatuses.includes(status) ? status : normalizeBoardingStatus({ boardingStatus: status, customerRequest: true });
  const labels = {
    Pending: "Request Pending",
    Approved: "Request Approved",
    "Checked In": "Checked In",
    "In Kennel": "In Kennel",
    "Ready For Pickup": "Ready For Pickup",
    "Checked Out": "Completed",
    Cancelled: "Request Cancelled",
  };
  return labels[normalized] || "Request Pending";
}

function customerRequestStatusChipHtml(record = {}) {
  const status = boardingDisplayStatus(record);
  return statusChipHtml(customerRequestStatusLabel(status), `boarding-status-chip ${statusClassForBoardingStatus(status)}`);
}

function customerRequestStayStatusChipHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  return statusChipHtml(customerRequestStatusLabel(status), `boarding-status-chip ${statusClassForBoardingStatus(status)}`);
}

function boardingStayStatusChipHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const kennelLabel = status === "In Kennel" ? boardingKennelLocationLabel(record, stay) : "";
  const label = kennelLabel ? `${status} - ${kennelLabel}` : status;
  return statusChipHtml(label, `boarding-status-chip ${statusClassForBoardingStatus(status)}`);
}

function boardingStayRequestCodeChipHtml(record = {}, stay = {}, options = {}) {
  const requestCode = boardingStayRequestCode(record, stay);
  if (!requestCode) return "";
  const label = options.labelPrefix ? `${options.labelPrefix}: ${requestCode}` : requestCode;
  return statusChipHtml(label, "boarding-request-code-chip");
}

function customerStayIdChipHtml(record = {}, stay = {}) {
  return boardingStayRequestCodeChipHtml(record, stay, { labelPrefix: "Stay ID" });
}

function boardingStayDataAttrs(record = {}, stay = {}) {
  if (!stay?.id) return "";
  const requestCode = boardingStayRequestCode(record, stay);
  return ` data-stay-id="${escapeHtml(stay.id)}" data-request-code="${escapeHtml(requestCode)}"`;
}

function boardingStayStatusButtonHtml(record = {}, stay = {}, action = "change-stay-status") {
  const requestCode = stay?.id ? boardingStayRequestCode(record, stay) : "";
  return `<button type="button" class="status-chip-button" data-action="${escapeHtml(action)}" data-dog-id="${escapeHtml(record.id || "")}" data-id="${escapeHtml(stay.id || "")}" data-request-code="${escapeHtml(requestCode)}">${boardingStayStatusChipHtml(record, stay)}</button>`;
}

function boardingRecordStatusButtonHtml(record = {}, action = "open-mobile-stay-status-menu") {
  const stay = boardingPrimaryStay(record) || {};
  const chip = stay.id ? boardingStayStatusChipHtml(record, stay) : boardingStatusChipHtml(record);
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  return `<button type="button" class="status-chip-button" data-action="${escapeHtml(action)}" data-id="${escapeHtml(record.id || "")}"${stayAttrs}>${chip}</button>`;
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
    Approved: "Approve Request",
    Cancelled: "Cancel Request",
    "Checked In": "Check In",
    "In Kennel": "Mark In Kennel",
    "Ready For Pickup": "Ready For Pickup",
    "Checked Out": "Check Out",
  }[status] || status;
}

function stayTransitionLabel(currentStatus = "", nextStatus = "") {
  if (currentStatus === "Checked In" && nextStatus === "Approved") return "Move Back to Approved";
  if (currentStatus === "In Kennel" && nextStatus === "Approved") return "Move Back to Approved";
  if (currentStatus === "In Kennel" && nextStatus === "Checked In") return "Move Back to Checked In";
  if (currentStatus === "Ready For Pickup" && nextStatus === "In Kennel") return "Move Back to In Kennel";
  return transitionLabel(nextStatus);
}

function canTransitionBoardingStatus(record = {}, nextStatus, options = {}) {
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : null;
  const currentStatus = targetStay ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  if (options.allowEarly && nextStatus === "Checked In" && ["Pending", "Approved"].includes(currentStatus)) return true;
  if (options.allowEarly && nextStatus === "Checked Out" && ["Checked In", "In Kennel", "Ready For Pickup"].includes(currentStatus)) return true;
  return (boardingStatusTransitions[currentStatus] || []).includes(nextStatus);
}

function boardingTransitionActions(record = {}) {
  const currentStatus = boardingDisplayStatus(record);
  const nextStatuses = boardingStatusTransitions[currentStatus] || [];
  return nextStatuses.length
    ? `<div class="record-actions lifecycle-actions">${nextStatuses.map((nextStatus) => `<button type="button" class="secondary-button" data-action="transition-boarding" data-next-status="${escapeHtml(nextStatus)}" data-id="${escapeHtml(record.id)}">${escapeHtml(transitionLabel(nextStatus))}</button>`).join("")}</div>`
    : "";
}

function boardingStayTransitionActions(record = {}, stay = {}) {
  const currentStatus = boardingStayDisplayStatus(record, stay);
  const nextStatuses = boardingStatusTransitions[currentStatus] || [];
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  return nextStatuses.length
    ? `<div class="record-actions lifecycle-actions">${nextStatuses.map((nextStatus) => `<button type="button" class="secondary-button" data-action="transition-boarding" data-next-status="${escapeHtml(nextStatus)}" data-id="${escapeHtml(record.id)}"${stayAttrs}>${escapeHtml(stayTransitionLabel(currentStatus, nextStatus))}</button>`).join("")}</div>`
    : "";
}

function isFutureDateTime(value, date = new Date()) {
  const target = new Date(value);
  return !Number.isNaN(target.getTime()) && target > date;
}

function boardingStatusTargetStay(record = {}, nextStatus = "", options = {}) {
  if (options.stayId || options.requestCode) return boardingStayByReference(record, options);
  if (nextStatus === "Checked Out") return activeBoardingStay(record) || currentOrNextStay(record);
  return currentOrNextStay(record);
}

function mergeStayRequestLabels(existing = [], additions = []) {
  return [...new Set([...(existing || []), ...(additions || [])].filter(Boolean))];
}

function boardingStatusScopedStays(record = {}, nextStatus = "", timestamp = new Date().toISOString(), options = {}) {
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : boardingStatusTargetStay(record, nextStatus);
  const targetStayId = targetStay?.id || "";
  return (record.stays || []).map((stay) => {
    if (!targetStayId || !boardingStayMatchesIdentity(stay, targetStay)) return stay;
    const checkInDetails = nextStatus === "Checked In" ? options.checkInDetails || null : null;
    const checkInDropoffTime = checkInDetails?.dropoffTime || "";
    const clearsActiveStayState = nextStatus === "Approved" || nextStatus === "Checked In";
    return {
      ...stay,
      requestCode: stay.requestCode || boardingStayRequestCode(record, stay),
      status: nextStatus,
      dropoffTime: checkInDropoffTime || stay.dropoffTime || "",
      updatedAt: timestamp,
      actualDropoffAt: nextStatus === "Approved" ? "" : nextStatus === "Checked In" ? checkInDropoffTime || stay.actualDropoffAt || timestamp : stay.actualDropoffAt || "",
      actualPickupAt: nextStatus === "Checked Out" ? stay.actualPickupAt || timestamp : stay.actualPickupAt || "",
      readyForPickupAt: ["Approved", "Checked In", "In Kennel"].includes(nextStatus) ? "" : stay.readyForPickupAt || "",
      kennelLocationId: clearsActiveStayState ? "" : stay.kennelLocationId || "",
      kennelLocationName: clearsActiveStayState ? "" : stay.kennelLocationName || "",
      kennelBuilding: clearsActiveStayState ? "" : stay.kennelBuilding || "",
      kennelAssignedAt: clearsActiveStayState ? "" : stay.kennelAssignedAt || "",
      requests: checkInDetails?.addedServiceLabels?.length ? mergeStayRequestLabels(stay.requests, checkInDetails.addedServiceLabels) : stay.requests || [],
      checkIn: nextStatus === "Approved"
        ? null
        : checkInDetails
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

function boardingSummaryStatusFromStays(record = {}, stays = record.stays || [], fallbackStatus = "") {
  const scopedRecord = { ...record, stays };
  const targetStay = activeBoardingStay(scopedRecord) || currentOrNextStay(scopedRecord) || stays[0] || null;
  return targetStay ? boardingStayDisplayStatus(scopedRecord, targetStay) : fallbackStatus || normalizeBoardingStatus(record);
}

function boardingTransitionIsEarly(record = {}, nextStatus = "", options = {}) {
  const stay = boardingStatusTargetStay(record, nextStatus, options);
  if (nextStatus === "Checked In") return isFutureDateTime(stay?.dropoffTime);
  if (nextStatus === "Checked Out") return isFutureDateTime(stay?.pickupTime);
  return false;
}

function withBoardingStatusTransition(record = {}, nextStatus, options = {}) {
  const targetStay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) : null;
  const currentStatus = targetStay ? boardingStayDisplayStatus(record, targetStay) : normalizeBoardingStatus(record);
  if (!canTransitionBoardingStatus(record, nextStatus, options) && !options.forceStatusSync) return null;
  const timestamp = new Date().toISOString();
  const early = Boolean(options.early || boardingTransitionIsEarly(record, nextStatus, options));
  const kennelLocation = options.kennelLocation || null;
  const scopedStays = boardingStatusScopedStays(record, nextStatus, timestamp, options).map((stay) => {
    if (nextStatus !== "In Kennel" || !kennelLocation) return stay;
    const targetStay = boardingStatusTargetStay(record, nextStatus, options);
    if (targetStay?.id && !boardingStayMatchesIdentity(stay, targetStay)) return stay;
    return {
      ...stay,
      kennelLocationId: kennelLocation.id,
      kennelLocationName: kennelLocation.name,
      kennelBuilding: kennelLocation.building,
      kennelAssignedAt: timestamp,
    };
  });
  const summaryStatus = options.stayId ? boardingSummaryStatusFromStays(record, scopedStays, nextStatus) : nextStatus;
  const clearsDogLocation = summaryStatus === "Approved" || summaryStatus === "Checked In";
  return {
    ...record,
    boardingStatus: summaryStatus,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: nextStatus,
        stayId: options.stayId || "",
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
        early,
      },
    ],
    checkedInAt: summaryStatus === "Approved" ? "" : summaryStatus === "Checked In" ? record.checkedInAt || timestamp : record.checkedInAt || "",
    inKennelAt: summaryStatus === "In Kennel" ? timestamp : clearsDogLocation ? "" : record.inKennelAt || "",
    readyForPickupAt: summaryStatus === "Ready For Pickup" ? timestamp : ["Approved", "Checked In", "In Kennel"].includes(summaryStatus) ? "" : record.readyForPickupAt || "",
    checkedOutAt: summaryStatus === "Checked Out" ? timestamp : record.checkedOutAt || "",
    cancelledAt: summaryStatus === "Cancelled" ? timestamp : record.cancelledAt || "",
    earlyCheckInAt: nextStatus === "Checked In" && early ? timestamp : record.earlyCheckInAt || "",
    earlyCheckOutAt: nextStatus === "Checked Out" && early ? timestamp : record.earlyCheckOutAt || "",
    kennelLocationId: summaryStatus === "In Kennel" && kennelLocation ? kennelLocation.id : clearsDogLocation ? "" : record.kennelLocationId || "",
    kennelLocationName: summaryStatus === "In Kennel" && kennelLocation ? kennelLocation.name : clearsDogLocation ? "" : record.kennelLocationName || "",
    kennelBuilding: summaryStatus === "In Kennel" && kennelLocation ? kennelLocation.building : clearsDogLocation ? "" : record.kennelBuilding || "",
    kennelAssignedAt: summaryStatus === "In Kennel" && kennelLocation ? timestamp : clearsDogLocation ? "" : record.kennelAssignedAt || "",
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

function stayHasActualDropoffEvidence(stay = {}) {
  return Boolean(stay.actualDropoffAt || stay.checkedInAt || stay.checkIn?.dropoffTime || stay.checkIn?.verifiedAt);
}

function stayHasActualPickupEvidence(stay = {}) {
  return Boolean(stay.actualPickupAt || stay.checkedOutAt || stay.checkout?.verifiedAt);
}

function chronologicalBoardingStayStatus(record = {}, stay = {}, status = "") {
  if (["Checked In", "In Kennel", "Ready For Pickup"].includes(status) && isFutureDateTime(stay.dropoffTime) && !stayHasActualDropoffEvidence(stay)) {
    return "Approved";
  }
  if (status === "Checked Out" && isFutureDateTime(stay.pickupTime) && !stayHasActualPickupEvidence(stay)) {
    return stayHasActualDropoffEvidence(stay) ? "Ready For Pickup" : "Approved";
  }
  return status;
}

function inferredBoardingStayStatus(record = {}, stay = {}) {
  if (stay.cancelledAt) return "Cancelled";
  if (stayHasActualPickupEvidence(stay)) return "Checked Out";
  if (stay.readyForPickupAt) return "Ready For Pickup";
  if (stay.kennelLocationId || stay.kennelLocationName || stay.kennelBuilding || stay.kennelAssignedAt) return "In Kennel";
  if (stayHasActualDropoffEvidence(stay)) return "Checked In";
  if (stay.approvedAt) return "Approved";
  const stays = record.stays || [];
  const recordStatus = explicitBoardingStatus(record.boardingStatus || record.status);
  if (stays.length <= 1 && recordStatus) return recordStatus;
  if (record.customerRequest || stay.source === "customer-request" || stay.source === "customer") return "Pending";
  if (record.entrySource === "staff-admin" || !record.entrySource) return "Approved";
  return recordStatus || "Approved";
}

function boardingStayDisplayStatus(record = {}, stay = {}) {
  const stayStatus = String(stay.status || "").trim();
  if (!stayStatus) return chronologicalBoardingStayStatus(record, stay, inferredBoardingStayStatus(record, stay));
  if (stayStatus === "Pending" && !record.customerRequest && (record.entrySource === "staff-admin" || !record.entrySource)) return "Approved";
  const normalized = boardingLifecycleStatuses.includes(stayStatus) ? stayStatus : normalizeBoardingStatus({ boardingStatus: stayStatus });
  return chronologicalBoardingStayStatus(record, stay, normalized);
}

function boardingPrimaryStay(record = {}) {
  const stays = record.stays || [];
  return activeBoardingStay(record)
    || currentOrNextStay(record)
    || stays.find((stay) => !inactiveBoardingStayStatus(stay))
    || stays[0]
    || null;
}

function boardingDisplayStatus(record = {}, stayOverride = null) {
  const stay = stayOverride || boardingPrimaryStay(record);
  return stay ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
}

function boardingDogWithStayStatus(record = {}) {
  const normalizedRecord = boardingDogWithMergedStays(record);
  const stay = boardingPrimaryStay(normalizedRecord);
  if (!stay?.id) return normalizedRecord || {};
  const status = boardingStayDisplayStatus(normalizedRecord, stay);
  const next = {
    ...normalizedRecord,
    boardingStatus: status,
  };
  if (status === "In Kennel") {
    next.kennelLocationId = stay.kennelLocationId || normalizedRecord.kennelLocationId || "";
    next.kennelLocationName = stay.kennelLocationName || normalizedRecord.kennelLocationName || "";
    next.kennelBuilding = stay.kennelBuilding || normalizedRecord.kennelBuilding || "";
    next.kennelAssignedAt = stay.kennelAssignedAt || normalizedRecord.kennelAssignedAt || "";
  } else {
    next.kennelLocationId = "";
    next.kennelLocationName = "";
    next.kennelBuilding = "";
    next.kennelAssignedAt = "";
  }
  return next;
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
      description: String(tab.description || "").trim(),
      system: false,
    }))
    .filter((tab) => tab.id && tab.label && !defaultTaskTabMeta.some((item) => item.id === tab.id));
}

function normalizeRemovedTaskTabs(tabs = []) {
  if (!Array.isArray(tabs)) return [];
  const removableIds = new Set(defaultTaskTabMeta.map((tab) => tab.id));
  return [...new Set(tabs.map((tab) => String(tab || "").trim()).filter((tab) => removableIds.has(tab)))];
}

function normalizeTaskTabOrder(order = [], tabs = []) {
  if (!Array.isArray(order)) return [];
  const validIds = new Set(tabs.map((tab) => tab.id));
  return [...new Set(order.map((tabId) => String(tabId || "").trim()).filter((tabId) => validIds.has(tabId)))];
}

function normalizeTaskConfig(saved = null) {
  const hasGroup = (group) => saved && Object.prototype.hasOwnProperty.call(saved, group);
  const customTabs = normalizeCustomTaskTabs(saved?._tabs);
  const removedTabs = normalizeRemovedTaskTabs(saved?._removedTabs);
  const availableTabs = [...defaultTaskTabMeta.filter((tab) => !removedTabs.includes(tab.id)), ...customTabs];
  const config = {
    _tabs: customTabs,
    _removedTabs: removedTabs,
    _tabOrder: normalizeTaskTabOrder(saved?._tabOrder, availableTabs),
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

function readTaskConfig() {
  return normalizeTaskConfig(JSON.parse(localStorage.getItem(stateKeys.taskConfig) || "null"));
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

async function saveTaskTemplateConfig(config = readTaskConfig()) {
  if (localTestMode || !supabaseClient || currentRole() !== "admin") return null;
  return sendPayload(taskTemplatePayload(config));
}

function scheduleTaskTemplateSync(config = readTaskConfig()) {
  if (localTestMode || !supabaseClient || currentRole() !== "admin" || applyingRemoteTaskConfig) return;
  window.clearTimeout(taskTemplateSyncTimer);
  taskTemplateSyncTimer = window.setTimeout(() => saveTaskTemplateConfig(config), 350);
}

function writeTaskConfig(config, options = {}) {
  const normalized = normalizeTaskConfig(config);
  localStorage.setItem(stateKeys.taskConfig, JSON.stringify(normalized));
  if (options.syncRemote !== false) scheduleTaskTemplateSync(normalized);
}

async function persistTaskConfig(config, options = {}) {
  const normalized = normalizeTaskConfig(config);
  writeTaskConfig(normalized, { syncRemote: false });
  if (options.syncRemote !== false) await saveTaskTemplateConfig(normalized);
  return normalized;
}

function ensureTaskConfig() {
  writeTaskConfig(readTaskConfig(), { syncRemote: false });
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

function applyRemoteTaskTemplate(rows = []) {
  const template = taskTemplateRecordFromRows(rows);
  if (!template) return false;
  applyingRemoteTaskConfig = true;
  writeTaskConfig(normalizeTaskConfig(template.config || template), { syncRemote: false });
  applyingRemoteTaskConfig = false;
  return true;
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
  container.innerHTML = `<div class="column-manager-header"><strong>Table columns</strong><small>Choose visible headers. Drag or use arrows to reorder.</small></div>` + columns
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

function setTableSettingsPopoverOpen(buttonSelector, panelSelector, open) {
  const button = $(buttonSelector);
  const panel = $(panelSelector);
  if (!button || !panel) return;
  panel.hidden = !open;
  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.classList.toggle("is-active", open);
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

// === MODULE: AUTH ===
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
    if (event === "SIGNED_OUT" && currentUser) {
      clearLocalAppSession({ switchToLogin: true });
    }
  });
}

function recordTypes() {
  return [
    "ownedDog", "boardingDog", "request", "maintenance", "timesheet", "service", "dailyTask", "customerDog",
    "dog", "userDogAccess", "boardingReservation", "reservationService", "dogVaccination", "dogInternalNote", "dogActivityLog", "reservationCustomerUpdate", "dogClaimRequest", "legacyDogLink", "boardingAgreement",
    "settingsUser", "cfoNote", "calendarNote", "kennelLocation", "kennelBuilding", "operationHours", "operationDateOverride", "auditLog", "staffSchedule", "timeOffRequest", "kennelHoliday", "scheduleTemplate", "schedulePublish", "notificationLog", "notificationPreference",
  ];
}

// === MODULE: SETTINGS ===
function settingsUsers() {
  const activeUsers = readRecords("settingsUser").filter((user) => !user.removed);
  const usersWithoutEmail = [];
  const usersByEmail = new Map();
  activeUsers.forEach((user) => {
    const email = normalizeEmail(user.email);
    if (!email) {
      usersWithoutEmail.push(user);
      return;
    }
    usersByEmail.set(email, [...(usersByEmail.get(email) || []), user]);
  });
  return [
    ...usersWithoutEmail,
    ...[...usersByEmail.values()].map((users) => (users.length > 1 ? mergeSettingsUserRecords(users) : { ...users[0], email: normalizeEmail(users[0].email) })),
  ];
}

// Bootstrap: if no admin settingsUser records exist yet, grant access via
// Supabase Studio by inserting a settingsUser record with role: "admin"
// and the admin email. The app will pick it up on next load.
function getAdminEmails() {
  return readRecords("settingsUser")
    .filter((user) => !user.removed && settingsUserDisplayRole(user) === "admin" && user.email)
    .map((user) => user.email.trim().toLowerCase());
}

function getOwnerAlertEmail() {
  const admins = getAdminEmails();
  return admins[0] || "";
}

function savedUserFor(account = {}) {
  if (!account) return undefined;
  const email = normalizeEmail(account.email);
  return settingsUsers().find((user) => (user.authId && user.authId === account.key) || (user.alternateAuthIds || []).includes(account.key) || (email && normalizeEmail(user.email) === email));
}

function roleForAccount(account = {}) {
  account = account || {};
  const email = account.email?.toLowerCase();
  const saved = savedUserFor(account);
  if (saved?.role) return saved.role;
  if (account.role) return account.role;
  if (getAdminEmails().includes(email)) return "admin";
  return "customer";
}

function userFromSupabase(supabaseUser) {
  if (!supabaseUser?.email) return null;
  const email = supabaseUser.email.toLowerCase();
  const name = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || email.split("@")[0];
  const saved = savedUserFor({ email, key: supabaseUser.id });
  const role = saved?.role || supabaseUser.app_metadata?.role || roleForAccount({ email, key: supabaseUser.id });
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
  clearLocalAppSession({ switchToLogin: true });
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
    `<p>You are signed in locally as a ${escapeHtml(roleLabel(currentRole()).toLowerCase())} for UI testing. Remote Supabase login was not used${reason ? `: ${escapeHtml(reason)}` : "."}</p><p>Changes will stay in this browser's local storage during this test session.</p>`,
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
  return getAdminEmails();
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

function settingsUserRoleRank(role = "") {
  return { customer: 1, helper: 2, admin: 3 }[role] || 0;
}

function canonicalSettingsUser(users = []) {
  return users
    .filter(Boolean)
    .sort((a, b) => {
      if (a.authId && !b.authId) return -1;
      if (!a.authId && b.authId) return 1;
      const roleDiff = settingsUserRoleRank(b.role) - settingsUserRoleRank(a.role);
      if (roleDiff) return roleDiff;
      return new Date(a.submittedAt || a.updatedAt || 0) - new Date(b.submittedAt || b.updatedAt || 0);
    })[0] || {};
}

function mergeSettingsUserRecords(...users) {
  const activeUsers = users.flat().filter(Boolean);
  const canonical = canonicalSettingsUser(activeUsers);
  const normalizedEmail = normalizeEmail(canonical.email || activeUsers.find((user) => user.email)?.email || "");
  const strongestRole = activeUsers.reduce((role, user) => (settingsUserRoleRank(user.role) > settingsUserRoleRank(role) ? user.role : role), canonical.role || "customer");
  const merged = activeUsers.reduce((acc, user) => ({ ...acc, ...user }), { ...canonical });
  return {
    ...merged,
    type: "settingsUser",
    id: canonical.id || merged.id || uid("settingsUser"),
    submittedAt: activeUsers.map((user) => user.submittedAt).filter(Boolean).sort()[0] || merged.submittedAt || new Date().toISOString(),
    name: canonical.name || merged.name || normalizedEmail,
    email: normalizedEmail || merged.email || "",
    role: strongestRole || "customer",
    authId: canonical.authId || activeUsers.find((user) => user.authId)?.authId || "",
    alternateAuthIds: mergeUniqueIds(...activeUsers.map((user) => [user.authId, ...(user.alternateAuthIds || [])])),
    linkedCustomerDogIds: mergeUniqueIds(...activeUsers.map((user) => user.linkedCustomerDogIds || [])),
    linkedBoardingDogIds: mergeUniqueIds(...activeUsers.map((user) => user.linkedBoardingDogIds || [])),
    isMember: activeUsers.some((user) => user.isMember === true || user.isMember === "true" || user.isMember === "on" || user.member === true),
    mergedFromIds: mergeUniqueIds(...activeUsers.map((user) => [user.id, ...(user.mergedFromIds || [])])).filter((id) => id !== (canonical.id || merged.id)),
    removed: false,
  };
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
      if (!email || removedSettingsUserForEmail(email)) continue;
      await ensureCustomerAccessProfile(source);
    }
    await consolidateDuplicateSettingsUsersByEmail();
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

function appTimeoutError(label = "Operation") {
  const error = new Error(`${label} timed out.`);
  error.name = "TimeoutError";
  return error;
}

function isTimeoutError(error) {
  return error?.name === "TimeoutError";
}

function withTimeout(promise, timeoutMs, label = "Operation") {
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(appTimeoutError(label)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer);
  });
}

function cachedSupabaseSessionUser(supabaseUser = null) {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(stateKeys.session) || "null");
  } catch (error) {
    return null;
  }
  if (!saved?.key || saved.authProvider === "local-test" || saved.authProvider === "admin-impersonation") return null;
  const savedEmail = normalizeEmail(saved.email);
  const sessionEmail = normalizeEmail(supabaseUser?.email);
  if (sessionEmail && savedEmail && sessionEmail !== savedEmail) return null;
  return saved;
}

function shellUserFromSupabaseSession(supabaseUser) {
  const baseUser = userFromSupabase(supabaseUser);
  if (!baseUser) return null;
  const cachedUser = cachedSupabaseSessionUser(supabaseUser);
  const merged = cachedUser ? { ...baseUser, ...cachedUser, key: baseUser.key, authId: baseUser.key, authProvider: "supabase" } : baseUser;
  return {
    ...merged,
    role: roleForAccount(merged) || merged.role || baseUser.role || "customer",
    name: merged.name || baseUser.name,
    email: merged.email || baseUser.email,
  };
}

function recoverStaleAuthSync(reason = "") {
  if (!authSessionSyncPromise || !authSessionSyncStartedAt) return false;
  if (Date.now() - authSessionSyncStartedAt < AUTH_SYNC_STALE_MS) return false;
  console.warn(`Recovering stale auth sync${reason ? ` after ${reason}` : ""}.`);
  authSessionSyncPromise = null;
  authSessionSyncStartedAt = 0;
  return true;
}

async function syncAuthenticatedSupabaseUser(supabaseUser, options = {}) {
  const user = userFromSupabase(supabaseUser);
  if (!user) return null;
  recoverStaleAuthSync("new auth sync request");
  if (authSessionSyncPromise) return authSessionSyncPromise;
  authSessionSyncStartedAt = Date.now();
  authSessionSyncPromise = (async () => {
    await loadRemoteRecords({ render: false });
    const profile = await ensureAppUserProfile(user);
    const syncedUser = {
      ...user,
      role: profile?.role || roleForAccount(user),
      name: profile?.name || user.name,
    };
    setHelper(syncedUser, { switchAfterLogin: false, render: false });
    updateNavigationAccess();
    renderAllRecords();
    if (options.switchAfterLogin !== false) switchPage(rememberedPageForRole(syncedUser.role));
    requirePasswordChangeIfNeeded();
    return syncedUser;
  })();
  try {
    return await authSessionSyncPromise;
  } finally {
    authSessionSyncPromise = null;
    authSessionSyncStartedAt = 0;
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
  let sessionResult = null;
  try {
    sessionResult = await withTimeout(supabaseClient.auth.getSession(), AUTH_BOOT_TIMEOUT_MS, "Supabase session restore");
  } catch (error) {
    if (isTimeoutError(error)) {
      const cachedUser = cachedSupabaseSessionUser();
      if (cachedUser) {
        setHelper(cachedUser, { switchAfterLogin: false, render: false });
        modeLabel.textContent = "Restored; sync pending";
        return true;
      }
    }
    console.warn("Could not restore Supabase session.", error);
    return false;
  }
  const { data, error } = sessionResult || {};
  if (error || !data?.session?.user) return false;
  const shellUser = shellUserFromSupabaseSession(data.session.user);
  if (!shellUser) return false;
  setHelper(shellUser, { switchAfterLogin: false, render: false });
  syncAuthenticatedSupabaseUser(data.session.user, { switchAfterLogin: false }).catch((syncError) => {
    console.warn("Could not finish Supabase profile sync after shell restore.", syncError);
  });
  return true;
}

function mergeRecords(type, incomingRecords, options = {}) {
  const byId = {};
  const records = options.replaceLocal ? incomingRecords : [...readRecords(type), ...incomingRecords];
  records.forEach((record) => {
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
  let records = readRecords(type);
  let record = { ...payload, id: payload.id || uid(type), updatedAt: new Date().toISOString() };
  if (type === "settingsUser" && normalizeEmail(record.email)) {
    const email = normalizeEmail(record.email);
    const sameEmailUsers = records.filter((item) => !item.removed && normalizeEmail(item.email) === email);
    if (sameEmailUsers.length) {
      const explicitExistingUserEdit = Boolean(record.id && sameEmailUsers.some((item) => item.id === record.id));
      const requestedRole = record.role || "";
      const requestedMember = record.isMember;
      record = mergeSettingsUserRecords(sameEmailUsers, record);
      if (explicitExistingUserEdit && requestedRole) {
        record.role = requestedRole;
      }
      if (explicitExistingUserEdit && Object.prototype.hasOwnProperty.call(payload, "isMember")) {
        record.isMember = requestedMember === true || requestedMember === "true" || requestedMember === "on";
      }
      const mergedAt = new Date().toISOString();
      records = records.map((item) => {
        if (item.id === record.id || item.removed || normalizeEmail(item.email) !== email) return item;
        return {
          ...item,
          removed: true,
          removedAt: item.removedAt || mergedAt,
          removedBy: item.removedBy || currentUser?.email || "system",
          mergedIntoId: record.id,
          updatedAt: mergedAt,
        };
      });
    }
  }
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
    const field = formFieldByName(targetForm, key);
    if (!field) return;
    if (field.type === "file") {
      field.value = "";
      return;
    }
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
  const userId = currentDbUserId();
  if (!userId) return { url: "", error: "Sign in before uploading files." };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeFolder = String(folder || "uploads").replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\/+|\/+$/g, "");
  const path = `users/${userId}/${safeFolder}/${Date.now()}-${safeName}`;
  const { data, error } = await supabaseClient.storage.from(MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) return { url: "", error: error.message, storagePath: "" };
  const { data: urlData } = supabaseClient.storage.from(MEDIA_BUCKET).getPublicUrl(data.path);
  return { url: urlData?.publicUrl || "", error: "", storagePath: data.path };
}

async function uploadDogPhotoToSupabase(file, dogId) {
  if (!file) return { url: "", error: "" };
  if (!isSupportedDogPhoto(file)) return { url: "", error: "Only JPG and PNG profile photos can be uploaded." };
  if ((file.size || 0) > MAX_MEDIA_UPLOAD_BYTES) return { url: "", error: `Profile photos must be ${MAX_MEDIA_UPLOAD_MB} MB or smaller.` };
  if (!supabaseClient) return { url: "", error: "The database connection is not available for photo upload." };
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  const { url, error, storagePath } = await uploadFileToSupabase(file, `dog-photos/${safeDogId}`);
  return { url, error, storagePath };
}

async function durableDogPhoto(kind, existing, formData, photoInput, dogId) {
  const file = selectedPhotoFor(kind, photoInput);
  if (file) {
    const { url, error, storagePath } = await uploadDogPhotoToSupabase(file, dogId);
    if (url || storagePath) return { profilePhotoUrl: url || "", profilePhotoPath: storagePath || "", profilePhotoData: "", profilePhotoMeta: existing.profilePhotoMeta || {}, photoError: "" };
    resetSelectedDogPhoto(kind, {});
    return { profilePhotoUrl: "", profilePhotoPath: "", profilePhotoData: "", profilePhotoMeta: existing.profilePhotoMeta || {}, photoError: error || "The profile photo could not be uploaded." };
  }
  if (formData.profilePhotoUrl) {
    return { profilePhotoUrl: formData.profilePhotoUrl, profilePhotoPath: formData.profilePhotoPath || existing.profilePhotoPath || "", profilePhotoData: "", profilePhotoMeta: existing.profilePhotoMeta || {}, photoError: "" };
  }
  if (existing.profilePhotoUrl || existing.profilePhotoPath || existing.profilePhotoData) {
    return { profilePhotoUrl: existing.profilePhotoUrl || "", profilePhotoPath: existing.profilePhotoPath || "", profilePhotoData: existing.profilePhotoData || "", profilePhotoMeta: existing.profilePhotoMeta || {}, photoError: "" };
  }
  return { profilePhotoUrl: "", profilePhotoPath: "", profilePhotoData: "", profilePhotoMeta: existing.profilePhotoMeta || {}, photoError: "" };
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
  if (!supabaseClient || !currentDbUserId()) {
    showToast("Sign in to upload files to the database.");
    return [];
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
      const { url, error, storagePath } = await uploadFileToSupabase(file, folder);
      return {
        id: uid("media"),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size || 0,
        savedAt: now,
        url,
        storagePath: storagePath || "",
        dataUrl: "",
        note: error ? `Upload failed: ${error}` : "",
      };
    }),
  );
  if (results.some((item) => item.note)) showToast("One or more files could not be uploaded.");
  return results.filter((item) => item.url || item.storagePath || item.dataUrl);
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

async function uploadBoardingDogDocumentFiles(input, dogId) {
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  return uploadMediaFiles(input, `boarding-dog-documents/${safeDogId}`, {
    allowedTypes: DOG_DOCUMENT_UPLOAD_TYPES,
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"],
    label: "boarding dog file",
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
    const displayStatus = boardingDisplayStatus(record);
    const status = record.id ? ` | ${displayStatus}` : "";
    const location = record.id && displayStatus === "In Kennel" ? ` | ${boardingKennelLocationLabel(record)}` : "";
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
    showMediaDialog(
      photo,
      "image/jpeg",
      `${record[elements.nameKey] || record.showName || "Dog"} profile photo`,
      kind === "owned" && record.id ? { type: "ownedDogPhoto", id: record.id } : null,
    );
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
  if (options.render !== false) {
    renderDailyTaskLists();
    fillCustomerDefaults();
    renderAllRecords();
  }
  if (options.switchAfterLogin !== false) switchPage(rememberedPageForRole(currentUser.role));
}

function stopAutoSync() {
  if (!syncIntervalId) return;
  window.clearInterval(syncIntervalId);
  syncIntervalId = null;
}

function clearLocalAppSession(options = {}) {
  stopAutoSync();
  localTestMode = false;
  currentUser = null;
  impersonationSession = null;
  localStorage.removeItem(stateKeys.session);
  localStorage.removeItem(stateKeys.impersonation);
  localStorage.removeItem(stateKeys.lastPage);
  helperName.value = "";
  helperEmail.value = "";
  helperKey.value = "";
  $("#globalQuickSearch").value = "";
  $("#notificationPanel").hidden = true;
  $("#customerSignupForm")?.toggleAttribute("hidden", true);
  $("#passwordRecoveryForm")?.toggleAttribute("hidden", true);
  $("#customerDogForm")?.toggleAttribute("hidden", true);
  $("#customerBookingForm")?.toggleAttribute("hidden", true);
  ["detailDialog", "mediaDialog", "bookingConfirmDialog", "passwordChangeDialog"].forEach((id) => {
    const dialog = document.getElementById(id);
    if (dialog?.open) dialog.close();
  });
  setMobileMoreOpen(false);
  updateHeaderUser();
  loginStatus.textContent = "Not logged in";
  loginHelp.textContent = "Sign in with email and password, Google, or another enabled account provider.";
  $("#clearHelperButton").hidden = true;
  updateNavigationAccess();
  fillCustomerDefaults();
  renderGlobalSearchResults();
  if (options.switchToLogin !== false) switchPage("loginPage");
  else document.body.classList.add("is-login-view");
}

function impersonationUserFromSettings(user = {}) {
  const email = normalizeEmail(user.email);
  return {
    key: user.authId || user.id || email || uid("impersonatedUser"),
    name: user.name || user.email || "Impersonated user",
    email: user.email || "",
    role: user.role || "customer",
    isMember: userMemberFlag(user),
    authId: user.authId || "",
    authProvider: "admin-impersonation",
    impersonatedUserId: user.id || "",
  };
}

function isImpersonating() {
  return Boolean(impersonationSession?.admin?.key && currentUser?.authProvider === "admin-impersonation");
}

function startUserImpersonation(user = {}) {
  if (currentRole() !== "admin" || !currentUser?.key) {
    showToast("Only admins can impersonate users.");
    return;
  }
  if (!user?.id) {
    showToast("Save the user before impersonating.");
    return;
  }
  const admin = { ...currentUser };
  const target = impersonationUserFromSettings(user);
  impersonationSession = {
    admin,
    target,
    returnPage: activePageId() || "settingsUsersPage",
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(stateKeys.impersonation, JSON.stringify(impersonationSession));
  $("#detailDialog")?.close();
  setHelper(target, { switchAfterLogin: false });
  switchPage(defaultPageForRole(target.role));
  showToast(`Viewing the app as ${target.name || target.email || "selected user"}.`);
}

function stopUserImpersonation() {
  if (!isImpersonating()) return false;
  const session = impersonationSession;
  impersonationSession = null;
  localStorage.removeItem(stateKeys.impersonation);
  setHelper(session.admin, { switchAfterLogin: false });
  switchPage(session.returnPage || "settingsUsersPage");
  showToast("Admin session restored.");
  return true;
}

async function clearHelper() {
  if (stopUserImpersonation()) return;
  suppressAuthSyncUntil = Date.now() + 10000;
  const client = supabaseClient;
  clearLocalAppSession({ switchToLogin: true });
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) showToast(`Logout could not finish with Supabase: ${error.message}`);
  }
  clearLocalAppSession({ switchToLogin: true });
  suppressAuthSyncUntil = 0;
}

function updateHeaderUser() {
  const impersonating = isImpersonating();
  headerUserName.textContent = impersonating ? `Impersonating ${currentUser?.name || currentUser?.email || "user"}` : currentUser?.name || "Not signed in";
  modeLabel.textContent = currentUser ? (impersonating ? `Admin view as ${roleLabel(currentUser.role)}` : localTestMode ? "Local test mode" : `${roleLabel(currentUser.role)} account`) : "Sign in to continue";
  headerLogoutButton.hidden = !currentUser;
  headerLogoutButton.textContent = impersonating ? "Stop Impersonation" : "Log out";
  headerLogoutButton.classList.toggle("stop-impersonation-button", impersonating);
  document.body.classList.toggle("role-helper", currentRole() === "helper");
  document.body.classList.toggle("role-admin", currentRole() === "admin");
  document.body.classList.toggle("role-customer", currentRole() === "customer");
  document.body.classList.toggle("is-impersonating", impersonating);
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
  const role = currentRole();
  const configured = mobileMoreMenuItems
    .filter((entry) => entry.pageId && !mobilePrimaryPageSet.has(entry.pageId) && pageAllowed(entry.pageId) && (!entry.roles?.length || entry.roles.includes(role)));
  const configuredIds = new Set(configured.map((entry) => entry.pageId));
  const remainingNavEntries = navigationPageEntries()
    .filter((entry) => entry.pageId && entry.pageId !== "loginPage" && !mobilePrimaryPageSet.has(entry.pageId) && !configuredIds.has(entry.pageId) && pageAllowed(entry.pageId));
  return [...configured, ...remainingNavEntries];
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
            return `<button type="button" class="mobile-more-menu-item mobile-more-item ${active ? "is-active" : ""}" data-page="${escapeHtml(entry.pageId)}"${active ? ' aria-current="page"' : ""}>${escapeHtml(entry.label)}</button>`;
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
  updateMobileNavigationAccess();
  renderGlobalSearchResults();
  const activePage = activePageId();
  if (helperIsLoggedIn() && activePage !== "loginPage" && !pageAllowed(activePage)) switchPage(defaultPageForRole());
}

function restoreSession() {
  const saved = JSON.parse(localStorage.getItem(stateKeys.session) || "null");
  if (!saved?.key) return false;
  const localSession = saved.authProvider === "local-test" || String(saved.key || "").startsWith("local-test-");
  if (!localSession) {
    localStorage.removeItem(stateKeys.session);
    localStorage.removeItem(stateKeys.impersonation);
    return false;
  }
  impersonationSession = JSON.parse(localStorage.getItem(stateKeys.impersonation) || "null");
  if (!impersonationSession?.admin?.key) impersonationSession = null;
  setHelper(saved, { switchAfterLogin: false, render: false });
  return true;
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

function bindTaskFilterToggle(row = $("#dailyTaskFilterToggleRow")) {
  if (!row || row.dataset.taskFilterBound === "true") return row;
  row.dataset.taskFilterBound = "true";
  const input = row.querySelector("#showRemainingTasksOnly") || row.querySelector('input[type="checkbox"]');
  if (input) {
    input.checked = !!showRemainingTasksOnly;
    input.addEventListener("change", (event) => {
      showRemainingTasksOnly = event.target.checked;
      renderDailyTaskLists();
    });
  }
  return row;
}

function ensureTaskFilterToggleRow() {
  let row = $("#dailyTaskFilterToggleRow");
  if (!row) {
    row = document.createElement("label");
    row.className = "toggle-row task-filter-toggle";
    row.id = "dailyTaskFilterToggleRow";
    row.innerHTML = '<input type="checkbox" id="showRemainingTasksOnly" /> Remaining tasks only';
  }
  const input = row.querySelector("#showRemainingTasksOnly") || row.querySelector('input[type="checkbox"]');
  if (input) {
    input.id = "showRemainingTasksOnly";
    input.checked = !!showRemainingTasksOnly;
  }
  return bindTaskFilterToggle(row);
}

function parkTaskFilterToggle() {
  const row = ensureTaskFilterToggleRow();
  const progress = $("#dailyTaskProgress");
  if (row && progress && row.parentElement !== progress.parentElement) progress.insertAdjacentElement("afterend", row);
  return row;
}

function syncTaskFilterTogglePlacement() {
  const row = ensureTaskFilterToggleRow();
  if (!row) return;
  const panel = $$("[data-task-panel]").find((item) => item.dataset.taskPanel === dailyTaskTab);
  const headingBody = panel?.querySelector(".section-heading > div");
  if (headingBody && row.parentElement !== headingBody) headingBody.appendChild(row);
  row.hidden = !headingBody;
}

function syncMobileReviewSections() {
  const details = $("#boardingRequestsDetails");
  if (!details) return;
  if (window.matchMedia("(max-width: 760px)").matches) details.removeAttribute("open");
  else details.setAttribute("open", "");
}

// === MODULE: DAILY ===
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
      ? `<span class="task-admin-tools"><span class="task-drag-handle" aria-hidden="true">Drag</span><label class="task-edit-label"><span class="sr-only">Edit task</span><input class="task-edit-input" type="text" value="${taskText}" data-action="edit-task" data-shift="${shift}" data-id="${task.id}" aria-label="Edit task text" /></label><button type="button" class="remove-task-button" data-action="remove-task" data-shift="${shift}" data-id="${task.id}" title="Remove task">&times;</button></span>`
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
  if (!pendingStructuredCareLogs.length) {
    list.innerHTML = "<p>No structured care logs added to this daily report yet.</p>";
    return;
  }
  const logItems = pendingStructuredCareLogs
    .map((log) => {
      const details = [log.date, log.minutes ? `${log.minutes} minutes` : "", log.note].filter(Boolean).join(" | ");
      const canModify = canModifyCareLog(log);
      const actions = canModify ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-care-log" data-id="${escapeHtml(log.id)}">Edit</button><button type="button" class="secondary-button danger-button" data-action="remove-care-log" data-id="${escapeHtml(log.id)}">Remove</button></div>` : "";
      return `<article class="record-card compact-record-card"><strong>${escapeHtml(log.dogName || "Dog")} - ${escapeHtml(log.careType || "Care")}</strong><p>${escapeHtml(details || "No extra details")}</p><span>${escapeHtml(log.completedBy || "")}</span>${mediaLinkHtml(log)}${actions}</article>`;
    })
    .join("");
  const countLabel = `${pendingStructuredCareLogs.length} care log${pendingStructuredCareLogs.length === 1 ? "" : "s"}`;
  list.innerHTML = `<details class="care-log-history-box"><summary><span>Saved care logs</span><small>${escapeHtml(countLabel)}</small></summary><div class="care-log-history-list">${logItems}</div></details>`;
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
  const canDragTabs = adminTaskTabDragEnabled();
  const tabButtons = taskTabMeta(config)
    .map((tab) => `<button type="button" data-task-tab="${escapeHtml(tab.id)}" role="tab" aria-selected="false" ${canDragTabs ? 'draggable="true" title="Drag to reorder tab"' : ""}>${escapeHtml(tab.label)}</button>`)
    .join("");
  const addButton = currentRole() === "admin" ? `<button type="button" class="secondary-button task-add-tab-button" data-action="add-task-tab">Add Tab</button>` : "";
  tabs.innerHTML = `${tabButtons}${addButton}`;
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

function clearTaskTabDragTargets() {
  $$("#dailyTaskTabs [data-task-tab]").forEach((button) => {
    button.classList.remove("is-drag-over", "is-drag-over-before", "is-drag-over-after");
    delete button.dataset.dropPosition;
  });
}

function markTaskTabDropTarget(targetButton, position = "before") {
  clearTaskTabDragTargets();
  if (!targetButton) return;
  targetButton.dataset.dropPosition = position;
  targetButton.classList.add("is-drag-over", position === "after" ? "is-drag-over-after" : "is-drag-over-before");
}

function taskTabButtonFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.("#dailyTaskTabs [data-task-tab]") || null;
}

async function reorderTaskTabByDrag(sourceId = "", targetId = "", position = "before") {
  if (!adminTaskTabDragEnabled() || !sourceId || !targetId || sourceId === targetId) return false;
  const config = readTaskConfig();
  const tabs = taskTabMeta(config);
  const order = tabs.map((tab) => tab.id);
  const sourceIndex = order.indexOf(sourceId);
  const targetIndex = order.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return false;
  const originalOrder = order.join("|");
  const [source] = order.splice(sourceIndex, 1);
  const adjustedTargetIndex = order.indexOf(targetId);
  if (adjustedTargetIndex < 0) return false;
  const insertIndex = position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  order.splice(insertIndex, 0, source);
  if (order.join("|") === originalOrder) return false;
  config._tabOrder = order;
  await persistTaskConfig(config);
  dailyTaskTab = sourceId;
  renderDailyTaskLists();
  showToast("Task tab order updated.");
  return true;
}

function resetDailyTaskTabPointerDrag() {
  dailyTaskTabPointerDrag?.sourceButton?.classList.remove("is-dragging");
  dailyTaskTabPointerDrag = null;
  document.body.classList.remove("is-task-tab-dragging");
  clearTaskTabDragTargets();
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
  const description = String(tab.description || "").trim();
  return `<section class="form-section collapsible-section" data-task-panel="${escapeHtml(tab.id)}" data-custom-task-panel data-collapsible-section hidden>
    <div class="section-heading">
      <span>${escapeHtml((tab.label || "C").slice(0, 1).toUpperCase())}</span>
      <div>
        <h2>${escapeHtml(tab.label)} Tasks</h2>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
      <button type="button" class="secondary-button section-toggle-button" data-action="toggle-section">Minimize</button>
    </div>
    <div class="section-body">
      <div class="checklist managed-task-list" data-custom-task-list data-shift="${escapeHtml(tab.id)}">${tasks.map((task) => taskLabel(task, tab.id)).join("")}</div>
      <div class="admin-task-controls" ${currentRole() === "admin" ? "" : "hidden"}>
        <input type="text" data-custom-task-input="${escapeHtml(tab.id)}" placeholder="Add a task to ${escapeHtml(tab.label)}" />
        <button type="button" data-action="add-custom-tab-task" data-shift="${escapeHtml(tab.id)}">Add Task</button>
        <span class="task-add-status" aria-live="polite"></span>
      </div>
      ${taskTabDeleteRowHtml(tab)}
    </div>
  </section>`;
}

function bindTaskListInteractions(listEl) {
  if (!listEl || listEl.dataset.taskEventsBound === "true") return;
  listEl.dataset.taskEventsBound = "true";
  listEl.addEventListener("click", async (event) => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    if (control.dataset.action === "edit-task") return;
    event.preventDefault();
    if (control.dataset.action === "complete-task") await completeDailyTask(control);
    if (control.dataset.action === "remove-task") await removeTask(control.dataset.shift, control.dataset.id);
  });
  listEl.addEventListener("change", async (event) => {
    const input = event.target.closest('[data-action="edit-task"]');
    if (!input) return;
    await editTask(input.dataset.shift, input.dataset.id, input.value, input);
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
  listEl.addEventListener("drop", async (event) => {
    const target = event.target.closest(".task-item[draggable='true']");
    if (!target) return;
    event.preventDefault();
    const [sourceShift, sourceId] = event.dataTransfer.getData("text/plain").split(":");
    target.classList.remove("is-drag-over");
    if (sourceShift === target.dataset.shift) await reorderTaskByDrag(sourceShift, sourceId, target.dataset.id);
  });
  listEl.addEventListener("dragend", () => {
    listEl.querySelectorAll(".task-item").forEach((row) => row.classList.remove("is-dragging", "is-drag-over"));
  });
}

function dailyTaskDraftInputs() {
  return [
    $("#newTaskText"),
    $("#newPmTaskText"),
    $("#newWeeklyTaskText"),
    $("#newTuesdayTaskText"),
    $("#newMonthlyTaskText"),
    ...$$("[data-custom-task-input]"),
    ...$$('[data-action="edit-task"]'),
  ].filter(Boolean);
}

function dailyTaskDraftInputKey(input) {
  if (!input) return "";
  if (input.dataset?.customTaskInput) return `custom:${input.dataset.customTaskInput}`;
  if (input.dataset?.action === "edit-task") return `edit:${input.dataset.shift || ""}:${input.dataset.id || ""}`;
  if (input.id) return `id:${input.id}`;
  return "";
}

function inputForDailyTaskDraftKey(key = "") {
  if (key.startsWith("custom:")) {
    const shift = key.slice("custom:".length);
    return $$("[data-custom-task-input]").find((input) => input.dataset.customTaskInput === shift) || null;
  }
  if (key.startsWith("edit:")) {
    const [, shift, id] = key.split(":");
    return $$('[data-action="edit-task"]').find((input) => input.dataset.shift === shift && input.dataset.id === id) || null;
  }
  if (key.startsWith("id:")) return document.getElementById(key.slice("id:".length));
  return null;
}

function captureDailyTaskDraftState() {
  const active = document.activeElement;
  const values = {};
  dailyTaskDraftInputs().forEach((input) => {
    const key = dailyTaskDraftInputKey(input);
    if (!key) return;
    const isEditInput = input.dataset?.action === "edit-task";
    if ((isEditInput && input === active) || (!isEditInput && (input.value || input === active))) {
      values[key] = input.value;
    }
  });
  const activeKey = dailyTaskDraftInputKey(active);
  return {
    values,
    activeKey,
    selectionStart: typeof active?.selectionStart === "number" ? active.selectionStart : null,
    selectionEnd: typeof active?.selectionEnd === "number" ? active.selectionEnd : null,
  };
}

function restoreDailyTaskDraftState(state = {}) {
  Object.entries(state.values || {}).forEach(([key, value]) => {
    const input = inputForDailyTaskDraftKey(key);
    if (input) input.value = value;
  });
  const active = inputForDailyTaskDraftKey(state.activeKey || "");
  if (!active) return;
  try {
    active.focus({ preventScroll: true });
  } catch {
    active.focus();
  }
  if (typeof state.selectionStart === "number" && typeof state.selectionEnd === "number" && active.setSelectionRange) {
    active.setSelectionRange(state.selectionStart, state.selectionEnd);
  }
}

function renderCustomTaskPanels(config = readTaskConfig()) {
  const container = $("#customTaskPanels");
  if (!container) return;
  container.innerHTML = (config._tabs || []).map((tab) => customTaskPanelHtml(tab, config[tab.id] || [])).join("");
  container.querySelectorAll("[data-custom-task-list]").forEach(bindTaskListInteractions);
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
    const list = $(`#${listId}`);
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
  return `<form id="taskTabForm" class="tracker-form">
    <label>Tab name<input type="text" name="label" required placeholder="Example: Puppy room, Deep clean, Sunday" /></label>
    <label>Tab description<textarea name="description" required rows="3" placeholder="Example: Tasks for puppy room cleaning, play yard reset, or Sunday deep clean"></textarea></label>
    <div class="button-row"><button type="submit">Add Tab</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
}

function openTaskTabPopup() {
  showDetailDialog("Add Task Tab", taskTabFormHtml());
}

async function saveTaskTabFromForm(formEl) {
  if (!validateForm(formEl)) return null;
  const payload = formPayload(formEl);
  const label = payload.label.trim();
  const description = (payload.description || "").trim();
  const config = readTaskConfig();
  const removedDefault = defaultTaskTabMeta.find((tab) => tab.label.toLowerCase() === label.toLowerCase() && (config._removedTabs || []).includes(tab.id));
  if (removedDefault) {
    config._removedTabs = (config._removedTabs || []).filter((tabId) => tabId !== removedDefault.id);
    if (!config[removedDefault.id]) config[removedDefault.id] = [];
    await persistTaskConfig(config);
    dailyTaskTab = removedDefault.id;
    renderDailyTaskLists();
    return removedDefault;
  }
  if (taskTabMeta(config).some((tab) => tab.label.toLowerCase() === label.toLowerCase())) {
    showToast("A task tab with that name already exists.");
    return null;
  }
  const tab = { id: normalizeTaskTabId(label), label, description, system: false };
  config._tabs.push(tab);
  config[tab.id] = [];
  await persistTaskConfig(config);
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

async function removeTaskTab(tabId = "") {
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
  await persistTaskConfig(config);
  if (dailyTaskTab === tabId) dailyTaskTab = taskTabMeta(readTaskConfig())[0]?.id || "";
  renderDailyTaskLists();
  return tab;
}

async function updateTaskOrder(shift, id, direction) {
  const config = readTaskConfig();
  const list = config[shift];
  const index = list.findIndex((task) => task.id === id);
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
  await persistTaskConfig(config);
  renderDailyTaskLists();
}

async function reorderTaskByDrag(shift, sourceId, targetId) {
  if (currentRole() !== "admin" || !shift || !sourceId || !targetId || sourceId === targetId) return;
  const config = readTaskConfig();
  const list = config[shift] || [];
  const sourceIndex = list.findIndex((task) => task.id === sourceId);
  const targetIndex = list.findIndex((task) => task.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [sourceTask] = list.splice(sourceIndex, 1);
  const insertIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  list.splice(insertIndex, 0, sourceTask);
  await persistTaskConfig(config);
  renderDailyTaskLists();
  showToast("Task order updated.");
}

async function editTask(shift, id, text, sourceInput) {
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
  await persistTaskConfig(config);
  showToast("Task text updated.");
}

function showTaskAddedStatus(input, message = "Task added.") {
  const controls = input?.closest?.(".admin-task-controls");
  const status = controls?.querySelector?.(".task-add-status");
  if (!status) return;
  status.textContent = message;
  status.classList.add("is-visible");
  window.clearTimeout(Number(status.dataset.clearTimer || 0));
  const timer = window.setTimeout(() => {
    status.textContent = "";
    status.classList.remove("is-visible");
    delete status.dataset.clearTimer;
  }, 2600);
  status.dataset.clearTimer = String(timer);
}

function clearAddedTaskInput(input, selector = "") {
  const freshInput = selector ? $(selector) : input;
  [input, freshInput].filter(Boolean).forEach((target) => {
    target.value = "";
  });
  showTaskAddedStatus(freshInput || input);
}

async function removeTask(shift, id) {
  const config = readTaskConfig();
  config[shift] = (config[shift] || []).filter((task) => task.id !== id);
  await persistTaskConfig(config);
  renderDailyTaskLists();
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

async function addCustomTask() {
  const input = $("#newTaskText");
  if (input && await addTaskToShift("morning", input.value)) clearAddedTaskInput(input, "#newTaskText");
}

async function addPmCustomTask() {
  const input = $("#newPmTaskText");
  if (input && await addTaskToShift("pm", input.value)) clearAddedTaskInput(input, "#newPmTaskText");
}

async function addManagedTask(shift, inputSelector) {
  const input = $(inputSelector);
  if (input && await addTaskToShift(shift, input.value)) clearAddedTaskInput(input, inputSelector);
}

async function addCustomTabTask(button) {
  const shift = button.dataset.shift || "";
  const input = $(`[data-custom-task-input="${shift}"]`);
  if (input && await addTaskToShift(shift, input.value)) clearAddedTaskInput(input, `[data-custom-task-input="${shift}"]`);
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
  $("#deleteOwnedDogButton").hidden = !formEl.elements.id.value;
  formEl.classList.toggle("is-readonly", locked);
}

async function sendPayload(payload) {
  if (localTestMode || !supabaseClient) {
    modeLabel.textContent = localTestMode ? "Local test saved" : "Local saved";
    return { ok: true, local: true };
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
    return { ok: true };
  } catch (error) {
    modeLabel.textContent = "Save failed";
    showToast(`Save failed: ${error.message}`);
    throw error;
  }
}

function remoteRecordsSignature(rows = []) {
  return rows
    .map((row) => `${row.type || ""}:${row.id || ""}:${row.updated_at || ""}`)
    .sort()
    .join("|");
}

function activePageIsScrollSensitive() {
  return ["boardingDogsPage", "ourDogsPage"].includes(activePageId());
}

function recentlyScrolled() {
  return Date.now() - lastUserScrollAt < REMOTE_RENDER_SCROLL_IDLE_MS;
}

function renderAllRecordsFromRemoteLoad() {
  if (deferredRemoteRenderTimer) {
    window.clearTimeout(deferredRemoteRenderTimer);
    deferredRemoteRenderTimer = null;
  }
  if (activePageIsScrollSensitive() && recentlyScrolled()) {
    modeLabel.textContent = "Loaded; updating after scroll";
    deferredRemoteRenderTimer = window.setTimeout(renderAllRecordsFromRemoteLoad, REMOTE_RENDER_SCROLL_IDLE_MS);
    return;
  }
  renderAllRecords();
}

async function fetchRemoteRecordRows() {
  const pageSize = 1000;
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseClient
      .from("kennel_records")
      .select("*")
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
    from += pageSize;
  }
}

async function loadRemoteRecords(options = {}) {
  if (localTestMode || !supabaseClient) {
    modeLabel.textContent = localTestMode ? "Local test mode" : "Local only";
    return;
  }
  if (remoteLoadInProgress) {
    if (remoteLoadStartedAt && Date.now() - remoteLoadStartedAt > REMOTE_LOAD_STALE_MS) {
      console.warn("Recovering stale remote record load.");
      remoteLoadInProgress = false;
      remoteLoadStartedAt = 0;
    } else {
      return;
    }
  }
  remoteLoadInProgress = true;
  remoteLoadStartedAt = Date.now();
  if (syncNowButton) syncNowButton.disabled = true;
  try {
    const data = await fetchRemoteRecordRows();
    const nextSignature = remoteRecordsSignature(data || []);
    const remoteDataChanged = nextSignature !== lastRemoteRecordsSignature;
    lastRemoteRecordsSignature = nextSignature;
    if (!remoteDataChanged) {
      modeLabel.textContent = "Synced";
      return;
    }
    const grouped = Object.fromEntries(recordTypes().map((type) => [type, []]));
    (data || []).forEach((row) => {
      if (grouped[row.type]) grouped[row.type].push(row.payload);
    });
    const loadedRemoteTaskTemplate = applyRemoteTaskTemplate(data || []);
    if (!loadedRemoteTaskTemplate && currentRole() === "admin") await saveTaskTemplateConfig(readTaskConfig());
    recordTypes().forEach((type) => mergeRecords(type, grouped[type] || [], { replaceLocal: true }));
    if (currentUser) {
      currentUser.role = roleForAccount(currentUser);
      localStorage.setItem(stateKeys.session, JSON.stringify(currentUser));
    }
    await syncMissingCustomerAccessProfiles();
    await syncLegacyDogModelRecords();
    if (options.render !== false) renderAllRecordsFromRemoteLoad();
    updateNavigationAccess();
    updateHeaderUser();
  } catch (error) {
    modeLabel.textContent = "Load failed";
    showToast(`Records could not load: ${error.message}`);
  } finally {
    remoteLoadInProgress = false;
    remoteLoadStartedAt = 0;
    lastRemoteLoadFinishedAt = Date.now();
    if (syncNowButton) syncNowButton.disabled = false;
  }
}

function startAutoSync() {
  stopAutoSync();
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

function defaultOperationHourRecords() {
  const now = new Date().toISOString();
  return operationWeekdays.map((day) => ({
    type: "operationHours",
    id: `operationHours-${day.key}`,
    weekday: day.key,
    weekdayLabel: day.label,
    dayIndex: day.dayIndex,
    isOpen: true,
    openTime: defaultOperationOpenTime,
    closeTime: defaultOperationCloseTime,
    submittedAt: now,
    updatedAt: now,
    removed: false,
  }));
}

function seedDefaultOperationHours() {
  if (readRecords("operationHours").length) return;
  writeRecords("operationHours", defaultOperationHourRecords());
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
  dropoffTime: "Requested drop-off date and time.",
  pickupTime: "Requested pick-up date and time.",
  requestText: "Required. Describe what is needed or suggested.",
  issue: "Required. Describe what needs attention.",
  manualClockIn: "Required for manual time entries.",
  manualClockOut: "Optional. Leave blank while the staff member is still on shift.",
  serviceName: "Required for the pricing catalog.",
  category: "Required so revenue can be grouped.",
  basePrice: "Required. Use 0 only for no-charge services.",
  unit: "Required so staff knows how the price is applied.",
};

const serviceFormFieldInfo = {
  serviceName: "Customer and staff-facing item name. Keep it specific, for example Full Premium Bath or Bootcamp Training.",
  category: "Groups revenue and controls where the item appears. Use Boarding for stay rates and boarding-related add-ons.",
  basePrice: "Price before quantity, billing days, dog count, tax, or manual stay adjustments are applied.",
  unit: "How the price is applied: per night or day for stays, per service or session for add-ons.",
  depositAmount: "Optional deposit collected or tracked for this item. Leave blank when no deposit applies.",
  taxRate: "Optional item-specific sales tax percentage. Leave blank when tax is not used for this item.",
  defaultDuration: "Optional time estimate staff can use for scheduling, such as 30 minutes.",
  boardingRateType: "Use Standard boarding rate for normal boarding prices. Use Boarding program when the item replaces normal boarding, such as Bootcamp with overnight accommodation.",
  requiresServiceId: "Makes this item dependent on another selected service or stay type, such as de-shedding after Full Premium Bath.",
  dependentServiceType: "Controls how a dependent item appears. Optional add-on shows under its parent when the parent is selected.",
  itemDescription: "Shown to customers from the item info icon. Use plain language about what is included.",
  pricingNotes: "Internal notes for staff/admin about rules, exceptions, discounts, or what to verify.",
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
  setupServiceFormInfoIcons();
}

function setupServiceFormInfoIcons() {
  const form = $("#serviceForm");
  if (!form) return;
  Object.entries(serviceFormFieldInfo).forEach(([fieldName, infoText]) => {
    const field = formFieldByName(form, fieldName);
    const label = field ? fieldLabel(field) : null;
    const title = label?.querySelector(".field-label-text");
    const titleText = title?.querySelector("span:not(.required-mark)");
    if (!title || !titleText || title.querySelector(".service-info-icon")) return;
    label.classList.add("has-field-info");
    titleText.insertAdjacentHTML("afterend", customerServiceInfoIconHtml(infoText));
  });
}

function setLabelText(label, text = "") {
  if (!label || !text) return;
  const title = label.querySelector(".field-label-text span");
  if (title) {
    title.textContent = text;
    return;
  }
  const firstText = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (firstText) firstText.textContent = text;
}

function setFieldRequired(field, required) {
  if (!field) return;
  field.required = Boolean(required);
  const label = fieldLabel(field);
  const title = label?.querySelector(".field-label-text");
  const mark = title?.querySelector(".required-mark");
  if (required && title && !mark) title.insertAdjacentHTML("beforeend", '<span class="required-mark" aria-label="required">*</span>');
  if (!required && mark) mark.remove();
}

function setFieldHelpText(field, text = "") {
  const help = fieldLabel(field)?.querySelector(".field-help");
  if (help) help.textContent = text;
}

function setCustomerBookingTimeCopy(mode = "boarding") {
  const formEl = $("#customerBookingForm");
  if (!formEl) return;
  const isServiceRequest = mode === "service";
  const dropoffField = formFieldByName(formEl, "dropoffTime");
  const pickupField = formFieldByName(formEl, "pickupTime");
  setLabelText(dropoffField?.closest("label"), isServiceRequest ? "Ideal drop off time" : "Drop-off time");
  setLabelText(pickupField?.closest("label"), isServiceRequest ? "Alternative drop off time" : "Pick-up time");
  setFieldRequired(dropoffField, true);
  setFieldRequired(pickupField, !isServiceRequest);
  setFieldHelpText(dropoffField, isServiceRequest ? "Ideal requested drop-off date and time." : "Requested drop-off date and time.");
  setFieldHelpText(pickupField, isServiceRequest ? "Optional alternate drop-off date and time." : "Requested pick-up date and time.");
  const heading = formEl.querySelector(".customer-booking-time-box strong");
  if (heading) heading.textContent = isServiceRequest ? "Requested drop off time" : "Boarding time";
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

function mediaAccessAttrs(item = {}, context = {}) {
  const storagePath = item.storagePath || item.profilePhotoPath || mediaStoragePathFromUrl(item.url || item.profilePhotoUrl) || "";
  const sourceRecordId = context.sourceRecordId || item.sourceRecordId || item.recordId || "";
  const sourceRecordType = context.sourceRecordType || item.sourceRecordType || item.recordType || "";
  const attrs = [];
  if (storagePath) attrs.push(`data-storage-path="${escapeHtml(storagePath)}"`);
  if (sourceRecordId) attrs.push(`data-source-record-id="${escapeHtml(sourceRecordId)}"`);
  if (sourceRecordType) attrs.push(`data-source-record-type="${escapeHtml(sourceRecordType)}"`);
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function mediaStoragePathFromUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  const pathFromText = (text = "") => {
    const prefix = "/storage/v1/object/public/kennel-media/";
    const signedPrefix = "/storage/v1/object/sign/kennel-media/";
    const marker = text.includes(signedPrefix) ? signedPrefix : prefix;
    const index = text.indexOf(marker);
    if (index >= 0) return decodeURIComponent(text.slice(index + marker.length).split("?")[0].split("#")[0]);
    return "";
  };
  try {
    const parsed = new URL(value, window.location.href);
    return pathFromText(parsed.pathname);
  } catch (_error) {
    return pathFromText(value);
  }
}

function profilePhotoDirectSource(record = {}) {
  return record.profilePhotoData || record.profilePhotoUrl || "";
}

function profilePhotoStoragePath(record = {}) {
  return record.profilePhotoPath || mediaStoragePathFromUrl(record.profilePhotoUrl) || "";
}

function profilePhotoHasSource(record = {}) {
  return Boolean(profilePhotoDirectSource(record) || profilePhotoStoragePath(record));
}

function profilePhotoAccessAttrs(record = {}, fallbackRecordType = "") {
  const storagePath = profilePhotoStoragePath(record);
  const sourceRecordId = record.profilePhotoSourceRecordId || record.profilePhotoRecordId || record.sourceRecordId || record.id || "";
  const sourceRecordType = record.profilePhotoSourceRecordType || record.profilePhotoRecordType || record.sourceRecordType || record.type || fallbackRecordType || "";
  const attrs = [];
  if (storagePath) {
    attrs.push(`data-profile-photo-path="${escapeHtml(storagePath)}"`);
    attrs.push(`data-storage-path="${escapeHtml(storagePath)}"`);
  }
  if (sourceRecordId) attrs.push(`data-source-record-id="${escapeHtml(sourceRecordId)}"`);
  attrs.push(`data-source-record-type="${escapeHtml(sourceRecordType)}"`);
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}

function profilePhotoInitialsForElement(element, img = null) {
  return (element.matches("[data-profile-photo-initials]") ? element : element.parentElement?.querySelector("[data-profile-photo-initials]"))
    || img?.parentElement?.querySelector?.("[data-profile-photo-initials]")
    || null;
}

async function hydrateProfilePhotoElement(element) {
  const storagePath = element?.dataset?.profilePhotoPath || element?.dataset?.storagePath || "";
  const img = element?.matches?.("img") ? element : element?.querySelector?.("img");
  if (!storagePath || !img || img.src) return;
  try {
    const src = await signedMediaUrlForPath(storagePath, {
      sourceRecordId: element.dataset.sourceRecordId || "",
      sourceRecordType: element.dataset.sourceRecordType || "",
    });
    if (!src) return;
    img.onload = () => {
      img.hidden = false;
      profilePhotoInitialsForElement(element, img)?.setAttribute("hidden", "");
    };
    img.src = src;
  } catch (error) {
    console.warn("Profile photo hydration failed.", error);
  }
}

function hydrateProfilePhotoElements(root = document) {
  [...(root?.querySelectorAll?.("[data-profile-photo-path]") || [])].forEach((element) => {
    hydrateProfilePhotoElement(element);
  });
}

async function signedMediaUrlForPath(storagePath = "", context = {}) {
  const path = String(storagePath || "").trim();
  if (!path || !supabaseClient || localTestMode) return "";
  const cached = signedMediaUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const { data, error } = await supabaseClient.functions.invoke("media-access", {
    body: {
      storagePath: path,
      recordId: context.sourceRecordId || context.recordId || "",
      recordType: context.sourceRecordType || context.recordType || "",
    },
  });
  if (error) throw error;
  const signedUrl = data?.signedUrl || "";
  if (signedUrl) {
    signedMediaUrlCache.set(path, {
      url: signedUrl,
      expiresAt: Date.now() + Math.max(60, Number(data?.expiresIn || 600) - 30) * 1000,
    });
  }
  return signedUrl;
}

async function openMediaFromButton(mediaButton) {
  const storagePath = mediaButton.dataset.storagePath || "";
  let src = mediaButton.dataset.src || "";
  if (storagePath) {
    try {
      src = await signedMediaUrlForPath(storagePath, {
        sourceRecordId: mediaButton.dataset.sourceRecordId || "",
        sourceRecordType: mediaButton.dataset.sourceRecordType || "",
      }) || src;
    } catch (error) {
      if (!src) {
        showDetailDialog("File Not Available", `<p>This file is stored privately, but Snuggle Stay could not create an access link right now.</p><p>${escapeHtml(error.message || String(error))}</p>`);
        return;
      }
      showToast("Using the saved file link because private access could not be refreshed.");
    }
  }
  showMediaDialog(src, mediaButton.dataset.mediaType, mediaButton.dataset.mediaName);
}

function mediaLinkHtml(record) {
  const links = [];
  if (record.mediaLink) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(record.mediaLink)}" data-media-type="external/link" data-media-name="Shared media">Open shared media</button>`);
  }
  if (record.profilePhotoUrl) {
    links.push(`<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(record.profilePhotoUrl)}" data-media-type="image/jpeg" data-media-name="Profile photo"${mediaAccessAttrs({ profilePhotoPath: record.profilePhotoPath || record.storagePath || "" }, { sourceRecordId: record.id || "", sourceRecordType: record.type || "" })}>Open profile photo</button>`);
  }
  if (record.mediaItems?.length) {
    links.push(
      ...record.mediaItems.map(
        (item) =>
          `<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="${escapeHtml(item.type)}" data-media-name="${escapeHtml(item.name)}"${mediaAccessAttrs(item, { sourceRecordId: record.id || item.sourceRecordId || "", sourceRecordType: record.type || item.sourceRecordType || "" })}>Open ${escapeHtml(item.name)}</button>`,
      ),
    );
  }
  if (record.vaccinationRecords?.length) {
    links.push(
      ...record.vaccinationRecords.map(
        (item) =>
          `<button type="button" class="media-preview-button" data-action="view-media" data-src="${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="${escapeHtml(item.type)}" data-media-name="${escapeHtml(item.name)}"${mediaAccessAttrs(item, { sourceRecordId: record.id || item.sourceRecordId || "", sourceRecordType: record.type || item.sourceRecordType || "" })}>Open vaccine record: ${escapeHtml(item.name)}</button>`,
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
    id: record.id || "",
    type: record.type || "boardingDog",
    profilePhotoUrl: record.profilePhotoUrl,
    profilePhotoPath: record.profilePhotoPath || "",
    vaccinationRecords: record.vaccinationRecords || [],
    vaccinationFiles: record.vaccinationFiles || "",
  });
  if (directMedia) sections.push(`<article class="record-card compact-record-card"><strong>Files attached to boarding record</strong>${directMedia}</article>`);
  if (linkedDog) {
    const linkedMedia = mediaLinkHtml({
      id: linkedDog.id || "",
      type: linkedDog.type || "customerDog",
      profilePhotoUrl: linkedDog.profilePhotoUrl,
      profilePhotoPath: linkedDog.profilePhotoPath || "",
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

function normalizedPhoneHref(phone = "") {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function phoneLinkHtml(phone = "", label = "") {
  const href = normalizedPhoneHref(phone);
  const display = label || phone;
  if (!href) return escapeHtml(display || "No phone saved");
  return `<a class="tel-link" href="${escapeHtml(href)}">${escapeHtml(display || phone)}</a>`;
}

function showDetailDialog(title, html, context = null, options = {}) {
  detailDialogContext = context;
  const dialog = $("#detailDialog");
  dialog?.classList.remove("is-customer-dog-editor");
  if (options.dialogClass) dialog?.classList.add(options.dialogClass);
  $("#detailDialogTitle").textContent = title;
  $("#detailDialogBody").innerHTML = html;
  const completeButton = $("#completeDetailTaskButton");
  const headerActionButton = $("#detailDialogHeaderAction");
  if (headerActionButton) {
    headerActionButton.hidden = !options.headerAction;
    headerActionButton.textContent = options.headerAction?.label || "";
    headerActionButton.dataset.action = options.headerAction?.action || "";
    headerActionButton.dataset.id = options.headerAction?.id || "";
    headerActionButton.dataset.sourceId = options.headerAction?.sourceId || "";
    headerActionButton.dataset.stayId = options.headerAction?.stayId || "";
    headerActionButton.dataset.requestCode = options.headerAction?.requestCode || "";
    headerActionButton.dataset.tab = options.headerAction?.tab || "";
  }
  if (context && ["request", "maintenance"].includes(context.type)) {
    const record = readRecords(context.type).find((item) => item.id === context.id);
    completeButton.hidden = Boolean(record?.completed);
  } else {
    completeButton.hidden = true;
  }
  if (dialog && !dialog.open) dialog.showModal();
}

function showMediaDialog(src, type, name, context = null) {
  mediaZoomLevel = 1;
  $("#mediaDialogTitle").textContent = name || "Media";
  const replacePhotoButton = $("#replaceOwnedDogPhotoButton");
  if (replacePhotoButton) {
    replacePhotoButton.hidden = context?.type !== "ownedDogPhoto" || !context?.id;
    replacePhotoButton.dataset.id = context?.id || "";
  }
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

const BOARDING_SERVICE_DUE_WINDOW_HOURS = 48;

function boardingServiceTaskDisplayName(value = "") {
  const item = value && typeof value === "object" ? value : {};
  const raw = typeof value === "string" ? value : item.serviceName || item.label || "Service";
  return String(raw)
    .replace(/\s+-\s+\$[\d,]+(?:\.\d{2})?.*$/i, "")
    .replace(/\s+requested$/i, "")
    .replace(/\s+x\d+$/i, "")
    .trim() || "Service";
}

function boardingStayRequestLabel(value = {}) {
  if (typeof value === "string") return String(value || "").trim();
  const item = value && typeof value === "object" ? value : {};
  const quantity = boardingServiceTaskQuantity(item);
  if (item.label) return String(item.label || "").trim();
  const serviceName = item.serviceName || item.name || "Service";
  return `${serviceName}${quantity > 1 ? ` x${quantity}` : ""} requested`;
}

function stayRequestIsFullBathLike(value = {}) {
  const item = value && typeof value === "object" ? value : {};
  const text = normalizedServiceLookupText(
    item.serviceName || item.name || item.label || item.value || boardingStayRequestLabel(value),
  );
  return text === "bath" || text.startsWith("full bath") || text.startsWith("full premium bath");
}

function stayRequestServiceUnitPriceForUser(serviceOrRequest = {}, user = currentUser) {
  if (isMemberUser(user) && stayRequestIsFullBathLike(serviceOrRequest)) return 100;
  return Number(serviceOrRequest?.basePrice || serviceOrRequest?.unitPrice || 0);
}

function serviceCatalogForStayRequests(options = {}) {
  const user = options.user || null;
  const includeAdminOnly = Boolean(options.includeAdminOnly);
  return readRecords("service")
    .filter((service) => !service.removed && serviceHasFlag(service, "Active"))
    .filter((service) => includeAdminOnly || !serviceHasFlag(service, "Admin only"))
    .filter((service) => service.category !== "Boarding" || serviceDependencyId(service))
    .filter((service) => !user || serviceMatchesCustomerPricingScope(service, user));
}

function normalizedServiceLookupText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+-\s+\$[\d,]+(?:\.\d{2})?.*$/i, "")
    .replace(/\s+requested$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function serviceDependencyId(service = {}) {
  return String(service.requiresServiceId || service.parentServiceId || "").trim();
}

function serviceDependencyType(service = {}) {
  if (!serviceDependencyId(service)) return "";
  return String(service.dependentServiceType || "optional-addon").trim() || "optional-addon";
}

function serviceDependencyParent(service = {}, catalog = readRecords("service")) {
  const parentId = serviceDependencyId(service);
  if (!parentId) return null;
  return catalog.find((item) => item.id === parentId && !item.removed) || null;
}

function serviceDependencySatisfied(service = {}, selectedIds = new Set()) {
  const parentId = serviceDependencyId(service);
  return !parentId || selectedIds.has(parentId);
}

function serviceHasDependentServices(service = {}, catalog = readRecords("service")) {
  return Boolean(service?.id && catalog.some((item) => !item.removed && serviceDependencyId(item) === service.id));
}

function serviceDependencyChipHtml(service = {}) {
  const parent = serviceDependencyParent(service);
  if (!parent) return "";
  const label = serviceDependencyType(service) === "optional-addon" ? "Add-on after" : "Requires";
  return `<span class="service-flag-list"><span class="service-flag-chip">${escapeHtml(label)} ${escapeHtml(serviceDependencyOptionLabel(parent))}</span></span>`;
}

function servicePricingScopeLabel(service = {}) {
  return serviceHasFlag(service, "Member Pricing") ? "Member Pricing" : "Regular Price (Non-Member)";
}

function serviceMatchesCustomerPricingScope(service = {}, user = currentUser) {
  const memberPricing = serviceHasFlag(service, "Member Pricing");
  return isMemberUser(user) ? memberPricing : !memberPricing;
}

function normalizedBoardingRateType(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["boarding-program", "program", "stay-program"].includes(normalized)) return "boarding-program";
  if (["standard-boarding", "boarding-rate", "standard"].includes(normalized)) return "standard-boarding";
  return "";
}

function serviceBoardingRateType(service = {}) {
  return normalizedBoardingRateType(service.boardingRateType || service.stayRateBehavior || service.boardingProgramType || "");
}

function serviceIsBoardingProgram(service = {}) {
  return serviceBoardingRateType(service) === "boarding-program";
}

function serviceIsStandardBoardingRate(service = {}) {
  const rateType = serviceBoardingRateType(service);
  if (rateType === "standard-boarding") return true;
  if (rateType || service.category !== "Boarding" || serviceDependencyId(service)) return false;
  const name = normalizedServiceLookupText(service.serviceName || service.name || "");
  const unit = normalizedServiceLookupText(service.unit || "");
  const legacyBoardingRate = name.includes("boarding") && (unit.includes("night") || unit.includes("day"));
  const legacyUpgrade = name === "premium overnight boarding kennel" || name.includes("upgrade");
  return legacyBoardingRate && !legacyUpgrade;
}

function serviceBoardingRateChipHtml(service = {}) {
  const rateType = serviceBoardingRateType(service) || (serviceIsStandardBoardingRate(service) ? "standard-boarding" : "");
  if (rateType === "boarding-program") return `<span class="service-flag-list"><span class="service-flag-chip">Boarding program</span></span>`;
  if (rateType === "standard-boarding") return `<span class="service-flag-list"><span class="service-flag-chip">Standard boarding rate</span></span>`;
  return "";
}

function serviceDependencyOptionLabel(service = {}) {
  return [
    service.serviceName || "Service",
    service.category || "",
    servicePricingScopeLabel(service),
  ].filter(Boolean).join(" - ");
}

function serviceDependencyOptionsHtml(currentService = {}) {
  const currentId = currentService.id || "";
  const selectedId = serviceDependencyId(currentService);
  const options = readRecords("service")
    .filter((service) => !service.removed && service.id !== currentId)
    .sort((a, b) => serviceDependencyOptionLabel(a).localeCompare(serviceDependencyOptionLabel(b)));
  const selectedParent = selectedId && !options.some((service) => service.id === selectedId)
    ? readRecords("service").find((service) => service.id === selectedId)
    : null;
  const serviceOptions = [
    ...(selectedParent ? [selectedParent] : []),
    ...options,
  ];
  return `<option value="">No dependency</option>${serviceOptions.map((service) => `<option value="${escapeHtml(service.id || "")}">${escapeHtml(serviceDependencyOptionLabel(service))}</option>`).join("")}`;
}

function renderServiceDependencyFields(record = {}) {
  const requiresSelect = $("#serviceRequiresServiceId");
  const typeSelect = $("#serviceDependentServiceType");
  if (requiresSelect) requiresSelect.innerHTML = serviceDependencyOptionsHtml(record);
  if (typeSelect && serviceDependencyId(record) && !record.dependentServiceType) typeSelect.value = "optional-addon";
  syncServiceDependencyFields();
}

function syncServiceDependencyFields() {
  const requiresSelect = $("#serviceRequiresServiceId");
  const typeSelect = $("#serviceDependentServiceType");
  if (!typeSelect) return;
  const hasDependency = Boolean(requiresSelect?.value);
  typeSelect.disabled = !hasDependency;
  if (!hasDependency) typeSelect.value = "";
  else if (!typeSelect.value) typeSelect.value = "optional-addon";
}

function applyLegacyServiceDependencyMigration(options = {}) {
  const services = readRecords("service");
  const fullBath = services.find((service) => !service.removed && ["full premium bath", "full bath"].includes(normalizedServiceLookupText(service.serviceName)));
  const deshedAddon = services.find((service) => {
    if (service.removed || service.id === fullBath?.id) return false;
    const name = normalizedServiceLookupText(service.serviceName);
    return name === "de shed w full bath" || name === "de shedding" || (name.includes("de shed") && name.includes("full bath"));
  });
  if (!fullBath?.id || !deshedAddon?.id) return null;
  if (Object.prototype.hasOwnProperty.call(deshedAddon, "requiresServiceId") || serviceDependencyId(deshedAddon)) return null;
  const updated = {
    ...deshedAddon,
    requiresServiceId: fullBath.id,
    dependentServiceType: deshedAddon.dependentServiceType || "optional-addon",
    itemDescription: deshedAddon.itemDescription || "May be added by staff when a dog requires more than 30 minutes of de-shedding for their regular bath.",
    updatedAt: new Date().toISOString(),
  };
  writeRecords("service", services.map((service) => (service.id === updated.id ? updated : service)));
  if (options.syncRemote && currentRole() === "admin") {
    sendPayload(updated).catch((error) => console.warn("Could not sync service dependency migration.", error));
  }
  return updated;
}

function applyLegacyBoardingProgramMigration(options = {}) {
  const services = readRecords("service");
  const bootcamp = services.find((service) => {
    if (service.removed || serviceBoardingRateType(service)) return false;
    const name = normalizedServiceLookupText(service.serviceName || "");
    const unit = normalizedServiceLookupText(service.unit || "");
    return name.includes("bootcamp") && unit.includes("night");
  });
  if (!bootcamp?.id) return null;
  const updated = {
    ...bootcamp,
    category: "Boarding",
    unit: bootcamp.unit || "per night",
    boardingRateType: "boarding-program",
    includesBoardingAccommodation: true,
    replacesStandardBoarding: true,
    itemDescription: bootcamp.itemDescription || "Bootcamp training program with overnight accommodation included.",
    updatedAt: new Date().toISOString(),
  };
  writeRecords("service", services.map((service) => (service.id === updated.id ? updated : service)));
  if (options.syncRemote && currentRole() === "admin") {
    sendPayload(updated).catch((error) => console.warn("Could not sync boarding program migration.", error));
  }
  return updated;
}

function serviceCatalogMatchForRequest(value = {}, options = {}) {
  const item = value && typeof value === "object" ? value : {};
  const serviceId = item.serviceId || item.id || "";
  const catalog = serviceCatalogForStayRequests(options);
  if (serviceId) {
    const exactId = catalog.find((service) => service.id === serviceId);
    if (exactId) return exactId;
  }
  const requestName = normalizedServiceLookupText(item.serviceName || boardingServiceTaskDisplayName(value));
  if (!requestName) return null;
  return catalog.find((service) => normalizedServiceLookupText(service.serviceName) === requestName)
    || catalog.find((service) => normalizedServiceLookupText(service.serviceName).includes(requestName) || requestName.includes(normalizedServiceLookupText(service.serviceName)));
}

function boardingStayRequestUnitPrice(value = {}, options = {}) {
  const item = value && typeof value === "object" ? value : {};
  const catalogService = serviceCatalogMatchForRequest(value, options);
  if (options.preferCatalogPricing && catalogService?.basePrice !== undefined) return stayRequestServiceUnitPriceForUser(catalogService, options.user);
  if (options.preferCatalogPricing && isMemberUser(options.user) && stayRequestIsFullBathLike(value)) return 100;
  const savedPrice = Number(item.unitPrice || item.basePrice || 0);
  if (isMemberUser(options.user) && stayRequestIsFullBathLike(value)) return 100;
  if (savedPrice) return savedPrice;
  return catalogService ? stayRequestServiceUnitPriceForUser(catalogService, options.user) : 0;
}

function boardingStayRequestUnit(value = {}, options = {}) {
  const item = value && typeof value === "object" ? value : {};
  return item.unit || serviceCatalogMatchForRequest(value, options)?.unit || "";
}

function customerFacingBoardingStayRequestLabel(value = {}, quantity = 1) {
  const service = serviceCatalogMatchForRequest(value) || (value && typeof value === "object" ? value : {});
  if (!customerServiceIsPremiumStayUpgrade(service)) return boardingStayRequestLabel(value);
  return `${customerServiceDisplayName(service)}${quantity > 1 ? ` x${quantity}` : ""} requested`;
}

function boardingStayRequestDisplayText(value = {}, options = {}) {
  const quantity = boardingServiceTaskQuantity(value);
  const label = options.customerFacing ? customerFacingBoardingStayRequestLabel(value, quantity) : boardingStayRequestLabel(value);
  const unitPrice = boardingStayRequestUnitPrice(value, options);
  const unit = boardingStayRequestUnit(value, options);
  const priceText = unitPrice ? ` - ${money(unitPrice * quantity)}${unit ? ` ${unit}` : ""}` : "";
  return `${label}${priceText}`;
}

function boardingStayServicesText(stay = {}, options = {}) {
  const requests = arrayValue(stay.requests).map((request) => boardingStayRequestDisplayText(request, options)).filter(Boolean);
  return requests.length ? requests.join(", ") : "No service requests";
}

function boardingStayRequestTotal(requests = [], options = {}) {
  return arrayValue(requests).reduce((total, request) => {
    const unitPrice = boardingStayRequestUnitPrice(request, options);
    const quantity = boardingServiceTaskQuantity(request);
    return total + (unitPrice * quantity);
  }, 0);
}

function activeBoardingPricingServices() {
  return readRecords("service").filter((service) => !service.removed && service.category === "Boarding" && serviceHasFlag(service, "Active") && serviceIsStandardBoardingRate(service));
}

function boardingRatePlanForCustomer(user = currentUser) {
  const isMemberPricing = isMemberUser(user);
  const activeBoarding = activeBoardingPricingServices();
  const memberService = activeBoarding.find((service) => serviceHasFlag(service, "Member Pricing"));
  const nonMemberService = activeBoarding.find((service) => !serviceHasFlag(service, "Member Pricing"));
  const memberPrimaryRate = Number(memberService?.basePrice || BOARDING_MEMBER_PRIMARY_RATE);
  const nonMemberRate = Number(nonMemberService?.basePrice || BOARDING_NON_MEMBER_RATE);
  return {
    isMemberPricing,
    primaryRate: isMemberPricing ? memberPrimaryRate : nonMemberRate,
    sharedCrateRate: isMemberPricing ? BOARDING_MEMBER_SHARED_CRATE_RATE : nonMemberRate,
    nonMemberRate,
    maxDogsPerCrate: BOARDING_MAX_DOGS_PER_CRATE,
  };
}

function boardingRatePlanForRecord(record = {}) {
  const owner = ownerAccountForBoarding(record) || savedUserFor({ email: record.ownerEmail || record.customerEmail }) || {};
  return boardingRatePlanForCustomer(owner);
}

function boardingPricingUserForRecord(record = {}, options = {}) {
  return options.user || options.ownerUser || ownerAccountForBoarding(record) || savedUserFor({ email: record.ownerEmail || record.customerEmail }) || null;
}

function boardingPricingDogKey(dog = {}) {
  return customerBookingSelectionKey(dog)
    || dog.id
    || dog.linkedCustomerDogId
    || dog.sourceBoardingDogId
    || boardingDogIdentityKey(dog)
    || normalizedDogIdentityName(dog);
}

function boardingLineRoleLabel(role = "") {
  if (role === "boarding-program") return "Boarding program";
  if (role === "shared-crate-additional") return "Shared crate dog";
  if (role === "non-member") return "Non-member boarding";
  return "Primary crate dog";
}

function boardingLineDisplayLabel(line = {}) {
  return line.stayProgramName || boardingLineRoleLabel(line.role);
}

function customerSharedCrateRequested() {
  const checkbox = $("#customerSharedCrateRequested");
  return Boolean(checkbox && checkbox.checked);
}

function boardingDogPricingLines(dogs = [], options = {}) {
  const ratePlan = options.ratePlan || boardingRatePlanForCustomer();
  const stayProgram = options.stayProgram || null;
  const days = Number(options.days || 0);
  const isServiceRequest = Boolean(options.isServiceRequest);
  const sharedCrateRequested = Boolean(options.sharedCrateRequested && ratePlan.isMemberPricing && !stayProgram);
  const programRate = Number(stayProgram?.rate ?? stayProgram?.basePrice ?? 0);
  return uniqueCustomerBookingDogs(dogs).map((dog, index) => {
    const pairIndex = Math.floor(index / ratePlan.maxDogsPerCrate);
    const position = index % ratePlan.maxDogsPerCrate;
    const sharedGroup = sharedCrateRequested && position > 0;
    const role = stayProgram ? "boarding-program" : ratePlan.isMemberPricing
      ? sharedGroup ? "shared-crate-additional" : "primary"
      : "non-member";
    const rate = isServiceRequest ? 0 : stayProgram ? programRate : sharedGroup ? ratePlan.sharedCrateRate : ratePlan.primaryRate;
    return {
      dogKey: boardingPricingDogKey(dog),
      dogId: dog.id || "",
      dogName: dog.dogName || "Dog",
      stayProgramId: stayProgram?.id || stayProgram?.serviceId || "",
      stayProgramName: stayProgram?.serviceName || stayProgram?.name || "",
      crateGroupId: sharedCrateRequested ? `crate-${pairIndex + 1}` : `solo-${boardingPricingDogKey(dog) || index}`,
      crateGroupPosition: sharedCrateRequested ? position + 1 : 1,
      role,
      rate,
      days,
      total: isServiceRequest ? 0 : days * rate,
      sharedCrateRequested,
    };
  });
}

function normalizeInvoiceAdjustments(adjustments = []) {
  return arrayValue(adjustments)
    .map((adjustment) => {
      const type = adjustment.type === "discount" ? "discount" : "charge";
      return {
        ...adjustment,
        type,
        label: adjustment.label || (type === "discount" ? "Discount" : "Other"),
        categoryKey: adjustment.categoryKey || (type === "discount" ? "discount" : "other"),
        amount: Math.max(0, Number(adjustment.amount || 0)),
        reason: String(adjustment.reason || adjustment.note || "").trim(),
        visibleToCustomer: adjustment.visibleToCustomer !== false,
      };
    })
    .filter((adjustment) => adjustment.amount > 0);
}

function invoiceAdjustmentSignedAmount(adjustment = {}) {
  const amount = Math.max(0, Number(adjustment.amount || 0));
  return adjustment.type === "discount" ? -amount : amount;
}

function invoiceAdjustmentsTotal(adjustments = []) {
  return normalizeInvoiceAdjustments(adjustments).reduce((total, adjustment) => total + invoiceAdjustmentSignedAmount(adjustment), 0);
}

function invoiceAdjustmentByKey(adjustments = [], key = "") {
  return normalizeInvoiceAdjustments(adjustments).find((adjustment) => adjustment.categoryKey === key) || {};
}

function invoiceAdjustmentFormChecks(formEl) {
  const otherAmount = Number(formEl.elements.otherChargeAmount?.value || 0);
  const discountAmount = Number(formEl.elements.discountAmount?.value || 0);
  const otherReason = String(formEl.elements.otherChargeReason?.value || "").trim();
  const discountReason = String(formEl.elements.discountReason?.value || "").trim();
  return [
    {
      field: formEl.elements.otherChargeReason,
      message: "Enter a reason for the Other charge.",
      valid: !otherAmount || Boolean(otherReason),
    },
    {
      field: formEl.elements.discountReason,
      message: "Enter a reason for the Discount.",
      valid: !discountAmount || Boolean(discountReason),
    },
  ].filter((check) => check.field);
}

function invoiceAdjustmentsFromStayForm(formEl, existingStay = {}, timestamp = new Date().toISOString()) {
  const existing = normalizeInvoiceAdjustments(existingStay.invoiceAdjustments);
  const preserved = existing.filter((adjustment) => !["other", "discount"].includes(adjustment.categoryKey));
  const existingOther = invoiceAdjustmentByKey(existing, "other");
  const existingDiscount = invoiceAdjustmentByKey(existing, "discount");
  const actorName = currentUser?.name || helperName?.value || "Staff";
  const actorEmail = currentUser?.email || helperEmail?.value || "";
  const makeAdjustment = (type, amount, reason, previous = {}) => {
    if (!amount) return null;
    return {
      ...previous,
      id: previous.id || uid("invoiceAdjustment"),
      type,
      categoryKey: type === "discount" ? "discount" : "other",
      label: type === "discount" ? "Discount" : "Other",
      amount: Math.max(0, Number(amount || 0)),
      reason: String(reason || "").trim(),
      visibleToCustomer: true,
      createdAt: previous.createdAt || timestamp,
      createdByName: previous.createdByName || actorName,
      createdByEmail: previous.createdByEmail || actorEmail,
      updatedAt: timestamp,
      updatedByName: actorName,
      updatedByEmail: actorEmail,
    };
  };
  return [
    ...preserved,
    makeAdjustment("charge", Number(formEl.elements.otherChargeAmount?.value || 0), formEl.elements.otherChargeReason?.value || "", existingOther),
    makeAdjustment("discount", Number(formEl.elements.discountAmount?.value || 0), formEl.elements.discountReason?.value || "", existingDiscount),
  ].filter(Boolean);
}

function invoiceAdjustmentEventChanges(previous = [], next = [], timestamp = new Date().toISOString()) {
  const oldByKey = new Map(normalizeInvoiceAdjustments(previous).map((adjustment) => [adjustment.categoryKey || adjustment.id, adjustment]));
  const nextByKey = new Map(normalizeInvoiceAdjustments(next).map((adjustment) => [adjustment.categoryKey || adjustment.id, adjustment]));
  const actorName = currentUser?.name || helperName?.value || "Staff";
  const actorEmail = currentUser?.email || helperEmail?.value || "";
  const events = [];
  nextByKey.forEach((adjustment, key) => {
    const old = oldByKey.get(key);
    const changed = old && (Number(old.amount || 0) !== Number(adjustment.amount || 0) || String(old.reason || "") !== String(adjustment.reason || ""));
    if (!old || changed) {
      events.push({
        id: uid("invoiceEvent"),
        action: old ? `updated-${adjustment.type}` : `added-${adjustment.type}`,
        adjustmentId: adjustment.id || "",
        label: adjustment.label || "",
        amount: adjustment.amount,
        reason: adjustment.reason,
        at: timestamp,
        by: actorName,
        byEmail: actorEmail,
      });
    }
  });
  oldByKey.forEach((adjustment, key) => {
    if (nextByKey.has(key)) return;
    events.push({
      id: uid("invoiceEvent"),
      action: `removed-${adjustment.type}`,
      adjustmentId: adjustment.id || "",
      label: adjustment.label || "",
      amount: adjustment.amount,
      reason: adjustment.reason,
      at: timestamp,
      by: actorName,
      byEmail: actorEmail,
    });
  });
  return events;
}

function invoiceAdjustmentsChanged(previous = [], next = []) {
  const stable = (adjustments) => normalizeInvoiceAdjustments(adjustments)
    .map((adjustment) => [adjustment.categoryKey, adjustment.type, Number(adjustment.amount || 0), adjustment.reason])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify(stable(previous)) !== JSON.stringify(stable(next));
}

function boardingPricingSnapshotForStay(record = {}, stay = {}, options = {}) {
  const ratePlan = options.ratePlan || boardingRatePlanForRecord(record);
  const pricingUser = boardingPricingUserForRecord(record, options);
  const servicePricingOptions = {
    user: pricingUser,
    preferCatalogPricing: Boolean(options.preferCatalogPricing || options.forceCurrentPricing || boardingStayCanUseCurrentPricing(record, stay)),
  };
  const stayType = options.stayType || stay.stayType || record.stayType || "Boarding";
  const isServiceRequest = stayType === "Service Request";
  const days = isServiceRequest ? 0 : boardingDays(stay.dropoffTime, stay.pickupTime);
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  const stayProgramName = stayProgram?.serviceName || stayProgram?.name || stay.stayProgramName || stay.pricingSnapshot?.stayProgramName || "";
  const stayProgramRate = Number(stayProgram?.rate ?? stayProgram?.basePrice ?? stay.stayProgramRate ?? stay.pricingSnapshot?.stayProgramRate ?? 0);
  const priorRole = stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.role || "";
  const role = options.currentDogRole || priorRole || (stayProgram ? "boarding-program" : ratePlan.isMemberPricing ? "primary" : "non-member");
  const rate = isServiceRequest ? 0 : stayProgram ? stayProgramRate : ratePlan.isMemberPricing && role === "shared-crate-additional" ? ratePlan.sharedCrateRate : ratePlan.primaryRate;
  const requests = options.requests || stay.requests || [];
  const adjustments = normalizeInvoiceAdjustments(options.invoiceAdjustments || stay.invoiceAdjustments || []);
  const boardingSubtotal = isServiceRequest ? 0 : days * rate;
  const serviceSubtotal = boardingStayRequestTotal(requests, servicePricingOptions);
  const adjustmentsTotal = invoiceAdjustmentsTotal(adjustments);
  const total = Math.max(0, boardingSubtotal + serviceSubtotal + adjustmentsTotal);
  return {
    version: "boarding-rate-v1",
    billingUnit: "boarding day/night",
    billingDays: days,
    isMemberPricing: ratePlan.isMemberPricing,
    maxDogsPerCrate: ratePlan.maxDogsPerCrate,
    stayProgramId: stayProgram?.id || stayProgram?.serviceId || stay.stayProgramId || stay.pricingSnapshot?.stayProgramId || "",
    stayProgramName,
    stayProgramRate,
    stayProgram: stayProgram ? { ...stayProgram, rate: stayProgramRate, serviceName: stayProgramName || stayProgram.serviceName || stayProgram.name || "Boarding program" } : null,
    replacesStandardBoarding: Boolean(stayProgram),
    currentDogKey: options.currentDogKey || stay.pricingSnapshot?.currentDogKey || record.id || "",
    currentDogName: options.currentDogName || stay.pricingSnapshot?.currentDogName || record.dogName || "",
    currentDogRole: role,
    currentDogRate: rate,
    sharedCrateRequested: Boolean(options.sharedCrateRequested || stay.pricingSnapshot?.sharedCrateRequested),
    crateGroupId: options.crateGroupId || stay.pricingSnapshot?.crateGroupId || "",
    boardingSubtotal,
    serviceSubtotal,
    adjustmentsTotal,
    total,
    groupBoardingSubtotal: options.groupBoardingSubtotal ?? stay.pricingSnapshot?.groupBoardingSubtotal ?? boardingSubtotal,
    groupServiceSubtotal: options.groupServiceSubtotal ?? stay.pricingSnapshot?.groupServiceSubtotal ?? serviceSubtotal,
    groupTotal: options.groupTotal ?? stay.pricingSnapshot?.groupTotal ?? total,
    lineItems: [
      ...(boardingSubtotal ? [{ type: stayProgram ? "boarding-program" : "boarding", label: stayProgramName || boardingLineRoleLabel(role), quantity: days, unitPrice: rate, amount: boardingSubtotal }] : []),
      ...arrayValue(requests).map((request) => ({
        type: "service",
        label: boardingServiceTaskDisplayName(request),
        quantity: boardingServiceTaskQuantity(request),
        unitPrice: boardingStayRequestUnitPrice(request, servicePricingOptions),
        amount: boardingStayRequestUnitPrice(request, servicePricingOptions) * boardingServiceTaskQuantity(request),
      })),
      ...adjustments.map((adjustment) => ({
        type: adjustment.type,
        label: adjustment.label,
        amount: invoiceAdjustmentSignedAmount(adjustment),
        reason: adjustment.reason,
      })),
    ],
  };
}

var boardingCurrentPricingStatuses = ["Pending", "Approved", "Checked In", "In Kennel", "Ready For Pickup"];

function boardingStayCanUseCurrentPricing(record = {}, stay = {}) {
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const customerRequest = Boolean(record.customerRequest || stay.source === "customer-request" || stay.source === "customer");
  return customerRequest && boardingCurrentPricingStatuses.includes(status);
}

function boardingCurrentDogRoleForStay(stay = {}, ratePlan = {}, options = {}) {
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  if (stayProgram) return "boarding-program";
  if (!ratePlan.isMemberPricing) return "non-member";
  const requestedRole = options.currentDogRole || stay.pricingSnapshot?.currentDogRole || stay.pricingSnapshot?.role || "";
  return requestedRole === "shared-crate-additional" ? "shared-crate-additional" : "primary";
}

function boardingCurrentPricingSnapshotForStay(record = {}, stay = {}, options = {}) {
  if (!boardingStayCanUseCurrentPricing(record, stay) && !options.forceCurrentPricing) return null;
  if (!options.forceCurrentPricing && !options.skipFamilyPricing) {
    const familySnapshot = boardingFamilyPricingSnapshotForStay(record, stay);
    if (familySnapshot) return familySnapshot;
  }
  const ratePlan = options.ratePlan || boardingRatePlanForRecord(record);
  const stayProgram = options.stayProgram || stay.stayProgram || stay.pricingSnapshot?.stayProgram || null;
  const sharedCrateRequested = Boolean(options.sharedCrateRequested ?? (stay.pricingSnapshot?.sharedCrateRequested && ratePlan.isMemberPricing));
  return boardingPricingSnapshotForStay(record, stay, {
    ...options,
    ratePlan,
    stayProgram,
    currentDogRole: boardingCurrentDogRoleForStay(stay, ratePlan, { ...options, stayProgram }),
    sharedCrateRequested,
  });
}

function boardingStayInvoiceTotal(record = {}, stay = {}, options = {}) {
  const currentSnapshot = options.pricingSnapshot || boardingCurrentPricingSnapshotForStay(record, stay, options);
  if (currentSnapshot) return Number(currentSnapshot.total || 0);
  if (stay.pricingSnapshot?.total !== undefined) return Number(stay.pricingSnapshot.total || 0);
  if (stay.estimatedTotal !== undefined && stay.estimatedTotal !== "") return Number(stay.estimatedTotal || 0);
  if (record.finalInvoiceTotal !== undefined && record.finalInvoiceTotal !== "") return Number(record.finalInvoiceTotal || 0);
  return Number(record.estimatedTotal || 0);
}

function boardingStayInvoiceSummaryHtml(record = {}, stay = {}, options = {}) {
  const currentSnapshot = options.pricingSnapshot || boardingCurrentPricingSnapshotForStay(record, stay, options);
  const snapshot = currentSnapshot || (stay.pricingSnapshot || {});
  const hasSnapshot = Boolean(snapshot.version || snapshot.lineItems);
  const adjustments = normalizeInvoiceAdjustments(stay.invoiceAdjustments);
  const lines = hasSnapshot ? arrayValue(snapshot.lineItems).filter((line) => Number(line.amount || 0)) : [];
  const customerAdjustments = adjustments.filter((adjustment) => adjustment.visibleToCustomer !== false);
  const adjustmentLines = customerAdjustments
    .map((adjustment) => `<div class="estimate-line"><span>${escapeHtml(adjustment.label)}${adjustment.reason ? `: ${escapeHtml(adjustment.reason)}` : ""}</span><span>${money(invoiceAdjustmentSignedAmount(adjustment))}</span></div>`)
    .join("");
  const total = currentSnapshot ? Number(currentSnapshot.total || 0) : boardingStayInvoiceTotal(record, stay);
  if (!lines.length && !adjustmentLines && !total) return "";
  const lineHtml = lines
    .filter((line) => !["charge", "discount"].includes(line.type))
    .map((line) => `<div class="estimate-line"><span>${escapeHtml(line.label || "Invoice item")}</span><span>${line.quantity ? `${escapeHtml(line.quantity)} x ${money(line.unitPrice || 0)} = ` : ""}${money(line.amount || 0)}</span></div>`)
    .join("");
  const totalLabel = options.final ? "Final total" : "Estimated total";
  return `<div class="estimate-box stay-invoice-summary">${lineHtml}${adjustmentLines}<div class="estimate-total"><strong>${totalLabel}</strong><span>${money(total)}</span></div></div>`;
}

function boardingStayHasService(stay = {}, label = "") {
  const normalizedLabel = normalizedServiceLookupText(label);
  return arrayValue(stay.requests).some((request) => {
    const requestLabel = normalizedServiceLookupText(boardingStayRequestLabel(request));
    const requestName = normalizedServiceLookupText(boardingServiceTaskDisplayName(request));
    return requestLabel === normalizedLabel || requestName === normalizedLabel || requestLabel.includes(normalizedLabel) || requestName.includes(normalizedLabel);
  });
}

function boardingServiceTaskQuantity(value = {}) {
  const item = value && typeof value === "object" ? value : {};
  if (item.quantity) return Math.max(1, Number(item.quantity || 1));
  const match = String(value || "").match(/\sx(\d+)\b/i);
  return match ? Math.max(1, Number(match[1] || 1)) : 1;
}

function boardingServiceTaskKey(task = {}) {
  return [
    String(task.serviceId || "").trim().toLowerCase(),
    boardingServiceTaskDisplayName(task).toLowerCase(),
  ].join("|");
}

function boardingServiceTaskNameKey(task = {}) {
  return boardingServiceTaskDisplayName(task).toLowerCase();
}

function boardingServiceTaskNameFromKey(taskKey = "") {
  return String(taskKey || "").split("|").pop() || "";
}

function boardingServiceTaskSources(record = {}, stay = {}) {
  const sources = [];
  const seenServiceKeys = new Set();
  const pricingOptions = { user: boardingPricingUserForRecord(record), preferCatalogPricing: true };
  const requestedSource = arrayValue(stay.requests);
  requestedSource.forEach((item, index) => {
    const service = item && typeof item === "object" ? item : {};
    const serviceName = boardingServiceTaskDisplayName(item);
    const quantity = boardingServiceTaskQuantity(item);
    const source = {
      id: service.id || service.serviceId || "",
      serviceId: service.id || service.serviceId || "",
      serviceName,
      label: `${serviceName}${quantity > 1 ? ` x${quantity}` : ""}`,
      quantity,
      unit: service.unit || boardingStayRequestUnit(item, pricingOptions),
      unitPrice: boardingStayRequestUnitPrice(item, pricingOptions),
      source: "requested",
      sourceIndex: index,
      requestedAt: stay.createdAt || record.submittedAt || "",
    };
    const key = boardingServiceTaskNameKey(source);
    if (seenServiceKeys.has(key)) return;
    seenServiceKeys.add(key);
    sources.push(source);
  });
  arrayValue(stay.checkIn?.addedServices).forEach((item, index) => {
    const service = item && typeof item === "object" ? item : {};
    const serviceName = boardingServiceTaskDisplayName(item);
    const quantity = boardingServiceTaskQuantity(service);
    const source = {
      id: service.id || service.serviceId || "",
      serviceId: service.id || service.serviceId || "",
      serviceName,
      label: `${serviceName}${quantity > 1 ? ` x${quantity}` : ""}`,
      quantity,
      unit: service.unit || boardingStayRequestUnit(service, pricingOptions),
      unitPrice: boardingStayRequestUnitPrice(service, pricingOptions),
      source: "check-in",
      sourceIndex: index,
      requestedAt: stay.checkIn?.verifiedAt || stay.updatedAt || "",
    };
    const key = boardingServiceTaskNameKey(source);
    if (seenServiceKeys.has(key)) return;
    seenServiceKeys.add(key);
    sources.push(source);
  });
  return sources;
}

function boardingServiceTaskStableId(record = {}, stay = {}, source = {}) {
  const stayIdentity = stay.requestCode || boardingStayRequestCode(record, stay) || stay.id || boardingStayMergeKeyForRecord(record, stay);
  return stableLegacyId("stayServiceTask", stayIdentity, boardingServiceTaskKey(source));
}

function boardingStayServiceTasks(record = {}, stay = {}) {
  if (!stay?.id) return [];
  const existing = arrayValue(stay.serviceTasks);
  const existingTasks = existing.filter((task) => task && typeof task === "object");
  const existingById = new Map(existingTasks.filter((task) => task.id).map((task) => [task.id, task]));
  const existingByKey = new Map(existingTasks.map((task) => [boardingServiceTaskKey(task), task]));
  const existingByName = new Map(existingTasks.map((task) => [boardingServiceTaskNameKey(task), task]));
  return boardingServiceTaskSources(record, stay).map((source) => {
    const id = boardingServiceTaskStableId(record, stay, source);
    const sourceKey = boardingServiceTaskKey(source);
    const previous = existingById.get(id) || existingById.get(source.id) || existingByKey.get(sourceKey) || existingByName.get(boardingServiceTaskNameKey(source)) || {};
    return {
      ...previous,
      ...source,
      id,
      status: previous.status || "pending",
      completedAt: previous.completedAt || "",
      completedBy: previous.completedBy || "",
      completedByEmail: previous.completedByEmail || "",
      updatedAt: previous.updatedAt || source.requestedAt || stay.updatedAt || "",
    };
  });
}

function boardingStayServiceStats(record = {}, stay = {}) {
  const tasks = boardingStayServiceTasks(record, stay);
  const completedTasks = tasks.filter((task) => task.status === "completed");
  const incompleteTasks = tasks.filter((task) => task.status !== "completed");
  return {
    tasks,
    total: tasks.length,
    completedTasks,
    incompleteTasks,
    completed: Boolean(tasks.length && incompleteTasks.length === 0),
  };
}

function boardingStayServiceDueInfo(record = {}, stay = {}, now = new Date()) {
  const stats = boardingStayServiceStats(record, stay);
  if (!stats.total) return null;
  if (stats.completed) return { label: "Services Completed", className: "is-service-complete", hoursRemaining: null, stats };
  const status = boardingStayDisplayStatus(record, stay);
  if (status === "Checked Out") return { label: "Services Incomplete", className: "is-service-overdue", hoursRemaining: null, stats };
  if (status === "Cancelled") return null;
  const pickup = new Date(stay.pickupTime || 0);
  if (Number.isNaN(pickup.getTime())) return { label: "Services Pending", className: "is-service-pending", hoursRemaining: null, stats };
  const hoursRemaining = Math.ceil((pickup - now) / 3600000);
  if (hoursRemaining <= 0) return { label: "Service Overdue", className: "is-service-overdue", hoursRemaining, stats };
  if (hoursRemaining <= BOARDING_SERVICE_DUE_WINDOW_HOURS) {
    return { label: `Service Due [${hoursRemaining}-hour]`, className: "is-service-due", hoursRemaining, stats };
  }
  return { label: "Services Pending", className: "is-service-pending", hoursRemaining, stats };
}

function boardingStayServiceFlagHtml(record = {}, stay = {}) {
  const dueInfo = boardingStayServiceDueInfo(record, stay);
  return dueInfo ? statusChipHtml(dueInfo.label, `boarding-service-chip ${dueInfo.className}`) : "";
}

function boardingStayServiceTaskListHtml(record = {}, stay = {}, options = {}) {
  const stats = boardingStayServiceStats(record, stay);
  if (!stats.total) return "";
  const stayAttrs = boardingStayDataAttrs(record, stay);
  return `<div class="boarding-service-task-list">
    <strong>Stay services</strong>
    ${stats.tasks.map((task) => {
      const complete = task.status === "completed";
      const meta = complete ? `Completed ${formatDateTime(task.completedAt) || ""}`.trim() : "Needs completion before pickup";
      const taskKey = boardingServiceTaskKey(task);
      const action = !complete && options.actions
        ? `<button type="button" class="secondary-button" data-action="complete-stay-service" data-dog-id="${escapeHtml(record.id || "")}"${stayAttrs} data-task-id="${escapeHtml(task.id)}" data-task-key="${escapeHtml(taskKey)}">Mark Done</button>`
        : "";
      return `<article class="record-card compact-record-card boarding-service-task-card ${complete ? "is-service-complete" : ""}">
        <div>
          <strong>${escapeHtml(task.label || task.serviceName || "Service")}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
        <div class="record-actions">${complete ? statusChipHtml("Done", "boarding-service-chip is-service-complete") : statusChipHtml("Open", "boarding-service-chip is-service-due")}${action}</div>
      </article>`;
    }).join("")}
  </div>`;
}

function boardingStayWithServiceTaskStatus(record = {}, stay = {}, taskId = "", status = "completed", targetTask = {}, targetTaskKey = "") {
  if (!stay?.id || (!taskId && !targetTaskKey)) return stay;
  const timestamp = new Date().toISOString();
  const staff = staffIdentity();
  const targetKey = targetTaskKey || (targetTask && Object.keys(targetTask).length ? boardingServiceTaskKey(targetTask) : "");
  const targetNameKey = targetTask && Object.keys(targetTask).length ? boardingServiceTaskNameKey(targetTask) : boardingServiceTaskNameFromKey(targetKey);
  const tasks = boardingStayServiceTasks(record, stay).map((task) => {
    const sameTask = task.id === taskId
      || (targetKey && boardingServiceTaskKey(task) === targetKey)
      || (targetNameKey && boardingServiceTaskNameKey(task) === targetNameKey);
    if (!sameTask) return task;
    return {
      ...task,
      status,
      completedAt: status === "completed" ? timestamp : task.completedAt || "",
      completedBy: status === "completed" ? staff.name : task.completedBy || "",
      completedByEmail: status === "completed" ? staff.email : task.completedByEmail || "",
      updatedAt: timestamp,
    };
  });
  return {
    ...stay,
    serviceTasks: tasks,
    updatedAt: timestamp,
  };
}

async function updateBoardingStayServiceTaskStatus(record = {}, reference = {}, taskId = "", status = "completed", taskKey = "") {
  const displayRecord = boardingDogRecordForDisplay(record.id || reference.dogId || "") || record;
  const targetStay = boardingStayByReference(displayRecord, reference);
  if (!displayRecord?.id || !targetStay?.id || (!taskId && !taskKey)) {
    showToast("That stay service could not be found.");
    return null;
  }
  const targetRequestCode = boardingStayRequestCode(displayRecord, targetStay);
  const targetTask = boardingStayServiceTasks(displayRecord, targetStay).find((task) => task.id === taskId || (taskKey && boardingServiceTaskKey(task) === taskKey)) || {};
  const targetTaskKey = taskKey || (targetTask && Object.keys(targetTask).length ? boardingServiceTaskKey(targetTask) : "");
  if (!targetTaskKey && !targetTask?.id) {
    showToast("That stay service could not be found.");
    return null;
  }
  const explicitStayIds = new Set([
    reference.stayId,
    reference.id,
    ...boardingStaySourceIds(targetStay),
  ].filter(Boolean).map(String));
  const explicitRequestCode = String(reference.requestCode || targetStay.requestCode || targetStay.requestId || targetStay.reservationId || "").trim();
  const matchingStayIndexes = (rawRecord = {}) => {
    const stays = arrayValue(rawRecord.stays);
    const indexed = stays.map((stay, index) => ({ stay, index }));
    let matches = indexed.filter(({ stay }) => {
      if (explicitStayIds.size && boardingStaySourceIds(stay).some((id) => explicitStayIds.has(id))) return true;
      if (explicitRequestCode && boardingStayRequestCode(rawRecord, stay) === explicitRequestCode) return true;
      return false;
    });
    if (!matches.length && explicitStayIds.size) {
      matches = indexed.filter(({ stay }) => boardingStaySharesExplicitIdentity(stay, targetStay));
    }
    if (!matches.length) {
      const identityMatches = indexed.filter(({ stay }) => boardingStayMatchesIdentity(stay, targetStay));
      if (identityMatches.length === 1) matches = identityMatches;
    }
    return matches.map((match) => match.index);
  };
  const sourceRecordIds = displayRecord.sourceRecordIds?.length ? displayRecord.sourceRecordIds : [displayRecord.id];
  const rawRecords = readRecords("boardingDog")
    .filter((item) => !item.removed && (sourceRecordIds.includes(item.id) || item.id === displayRecord.id));
  const savedRecords = [];
  for (const rawRecord of rawRecords.length ? rawRecords : [displayRecord]) {
    const stays = arrayValue(rawRecord.stays);
    const matchIndexes = new Set(matchingStayIndexes(rawRecord));
    if (!matchIndexes.size) continue;
    const nextStays = stays.map((stay, index) => (matchIndexes.has(index)
      ? boardingStayWithServiceTaskStatus(displayRecord, { ...stay, requestCode: stay.requestCode || targetRequestCode }, taskId, status, targetTask, targetTaskKey)
      : stay));
    const updated = upsertRecord("boardingDog", {
      ...rawRecord,
      stays: nextStays,
      updatedAt: new Date().toISOString(),
    });
    await sendPayload(updated);
    savedRecords.push(updated);
  }
  if (!savedRecords.length) {
    showToast("That stay service could not be matched to this stay.");
    return null;
  }
  const latest = boardingDogRecordForDisplay(displayRecord.id) || savedRecords[0] || displayRecord;
  if ($("#boardingDogForm")?.elements.id.value === latest.id || sourceRecordIds.includes($("#boardingDogForm")?.elements.id.value)) {
    renderBoardingStays(latest);
    renderBoardingCustomerUpdates(latest);
    renderBoardingHistory(latest);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  showToast(status === "completed" ? "Stay service marked done." : "Stay service updated.");
  return latest;
}

function stayServiceTaskByReference(record = {}, reference = {}, taskId = "", taskKey = "") {
  const stay = boardingStayByReference(record, reference);
  if (!stay) return null;
  return boardingStayServiceTasks(record, stay)
    .find((task) => task.id === taskId || (taskKey && boardingServiceTaskKey(task) === taskKey) || (taskKey && boardingServiceTaskNameKey(task) === boardingServiceTaskNameFromKey(taskKey)))
    || null;
}

function stayServiceCompletionConfirmationHtml(record = {}, reference = {}, task = {}, alertFilter = "") {
  const stay = boardingStayByReference(record, reference) || {};
  const requestCode = stay.id ? boardingStayRequestCode(record, stay) : reference.requestCode || "";
  const completedText = task.completedAt ? formatDateTime(task.completedAt) : formatDateTime(new Date().toISOString());
  return `<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>${escapeHtml(task.label || task.serviceName || "Stay service")} completed</strong>
      <p>${escapeHtml(record.dogName || "Boarding dog")} | Stay ID: ${escapeHtml(requestCode || "Not recorded")}</p>
      <p>Completed ${escapeHtml(completedText)}${task.completedBy ? ` by ${escapeHtml(task.completedBy)}` : ""}.</p>
    </article>
    <div class="button-row">
      <button type="button" class="secondary-button" data-action="open-boarding-editor" data-id="${escapeHtml(record.id || "")}" data-tab="Boarding & Request">Open Boarding & Request</button>
      ${alertFilter ? `<button type="button" class="secondary-button" data-action="open-dashboard-alert-popup" data-alert-filter="${escapeHtml(alertFilter)}">Back to ${escapeHtml(alertFilter)}</button>` : ""}
      <button type="button" class="secondary-button" data-action="close-dialog">Close</button>
    </div>
  </section>`;
}

function showStayServiceCompletionConfirmation(record = {}, reference = {}, taskId = "", taskKey = "", alertFilter = "") {
  const task = stayServiceTaskByReference(record, reference, taskId, taskKey) || {};
  showDetailDialog("Stay Service Completed", stayServiceCompletionConfirmationHtml(record, reference, task, alertFilter));
}

function boardingStayDetailCardHtml(record = {}, stay = {}, options = {}) {
  const isCustomer = Boolean(options.customer);
  const statusChip = isCustomer ? customerRequestStayStatusChipHtml(record, stay) : boardingStayStatusChipHtml(record, stay);
  const requestCode = stay.id ? (isCustomer ? customerStayIdChipHtml(record, stay) : boardingStayRequestCodeChipHtml(record, stay)) : "";
  const invoiceSummary = options.hideInvoiceSummary ? "" : boardingStayInvoiceSummaryHtml(record, stay);
  return `<article class="record-card ${options.compact ? "compact-record-card" : ""}">
    <strong>${escapeHtml(formatDateTime(stay.dropoffTime) || "Requested stay")}${stay.pickupTime ? ` to ${escapeHtml(formatDateTime(stay.pickupTime))}` : ""}</strong>
    <div class="chip-row">${requestCode}${statusChip}${boardingStayServiceFlagHtml(record, stay)}</div>
    <p>${escapeHtml(boardingStayServicesText(stay, { customerFacing: isCustomer, user: boardingPricingUserForRecord(record), preferCatalogPricing: true }))}</p>
    ${options.showServiceTasks ? boardingStayServiceTaskListHtml(record, stay, { actions: options.serviceActions }) : ""}
    ${stay.bathPlan ? `<p>${escapeHtml(stay.bathPlan)}</p>` : ""}
    ${stay.stayNotes ? `<p>${escapeHtml(stay.stayNotes)}</p>` : ""}
    ${invoiceSummary}
  </article>`;
}

function boardingDogSummaryHeaderHtml(record = {}, stay = {}) {
  const schedule = boardingScheduleText(record, stay);
  const kennel = boardingKennelLocationLabel(record, stay);
  const owner = record.ownerName || "No owner saved";
  const emergency = [record.emergencyName, record.emergencyPhone].filter(Boolean).join(" | ");
  return `<article class="boarding-detail-summary">
    <div>
      <strong>${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <span>${escapeHtml(schedule || "No stay schedule saved")}</span>
    </div>
    <div class="boarding-detail-summary-grid">
      <span><strong>Owner</strong>${escapeHtml(owner)}${record.ownerPhone ? ` ${phoneLinkHtml(record.ownerPhone)}` : ""}</span>
      <span><strong>Kennel</strong>${escapeHtml(kennel || "Not assigned")}</span>
      <span><strong>Emergency</strong>${emergency ? escapeHtml(record.emergencyName || "") + (record.emergencyPhone ? ` ${phoneLinkHtml(record.emergencyPhone)}` : "") : "Not saved"}</span>
    </div>
  </article>`;
}

function boardingDogDetailHtml(record, stayId = "") {
  if (currentRole() === "customer") return customerBoardingDogDetailHtml(record, stayId);
  const displayRecord = boardingDogWithStayStatus(record || {});
  const selectedStay = boardingStayByReference(displayRecord, stayId) || boardingPrimaryStay(displayRecord) || displayRecord.stays?.[0] || {};
  const selectedStayHtml = selectedStay.id ? `<h3>Selected Stay</h3>${boardingStayDetailCardHtml(displayRecord, selectedStay)}` : "";
  const stays = (displayRecord.stays || [])
    .map((stay) => boardingStayDetailCardHtml(displayRecord, stay, { compact: true }))
    .join("");
  const customerUpdates = (displayRecord.customerUpdates || [])
    .map((update) => `<article class="record-card compact-record-card"><strong>${escapeHtml(formatDateTime(update.createdAt || update.submittedAt) || "Customer update")}</strong><span>${escapeHtml([update.byName || "Staff", update.requestCode ? `Stay ID: ${update.requestCode}` : ""].filter(Boolean).join(" | "))}</span><p>${escapeHtml(update.note || "")}</p><div class="record-actions">${customerUpdateMediaHtml(update)}</div></article>`)
    .join("");
  const history = (displayRecord.statusHistory || [])
    .map((entry) => `<article class="record-card compact-record-card"><strong>${escapeHtml(entry.from || entry.fromStatus || "Unknown")} -> ${escapeHtml(entry.to || entry.toStatus || "Unknown")}</strong><span>${formatDateTime(entry.date || entry.changedAt)}${entry.by || entry.changedBy ? ` | ${escapeHtml(entry.by || entry.changedBy)}` : ""}</span></article>`)
    .join("");
  return `
    ${boardingDogSummaryHeaderHtml(displayRecord, selectedStay)}
    <div class="chip-row">${dogTypeBadgeHtml("boardingDog")}${selectedStay.id ? boardingStayRequestCodeChipHtml(displayRecord, selectedStay) : ""}${selectedStay.id ? boardingStayStatusChipHtml(displayRecord, selectedStay) : boardingStatusChipHtml(displayRecord)}${linkedCustomerDogForBoarding(displayRecord) ? statusChipHtml("Owner Linked") : ""}</div>
    ${selectedStayHtml}
    ${customerUploadSectionHtml(displayRecord)}
    ${customerUpdates ? `<h3>Customer Updates</h3>${customerUpdates}` : ""}
    ${stays ? `<h3>Stays</h3>${stays}` : ""}
    ${history ? `<h3>Status History</h3>${history}` : ""}
  `;
}

function customerBoardingDogDetailHtml(record = {}, stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId) || boardingPrimaryStay(displayRecord) || displayRecord.stays?.[0] || {};
  return `
    <div class="chip-row">${stay.id ? customerStayIdChipHtml(displayRecord, stay) : ""}${stay.id ? customerRequestStayStatusChipHtml(displayRecord, stay) : customerRequestStatusChipHtml(displayRecord)}</div>
    ${detailRows(displayRecord, [
      ["Dog", "dogName"],
      ["Owner", "ownerName"],
      ["Owner phone", "ownerPhone"],
      ["Emergency contact", "emergencyName"],
      ["Emergency phone", "emergencyPhone"],
      ["Feeding instructions", "foodInstructions"],
      ["Care notes", "specialCare"],
    ])}
    ${boardingStayDetailCardHtml(displayRecord, stay, { customer: true })}
    ${customerUploadSectionHtml(displayRecord)}
  `;
}

function boardingDogIdFromCustomerDogValue(value = "") {
  const id = String(value || "");
  return id.startsWith("boarding:") ? id.slice("boarding:".length) : id;
}

function customerDogHasBoardingLink(dog = {}, boardingId = "") {
  const id = boardingDogIdFromCustomerDogValue(boardingId);
  if (!id) return false;
  return [dog.sourceBoardingDogId, dog.linkedBoardingDogId]
    .map(boardingDogIdFromCustomerDogValue)
    .includes(id);
}

function explicitLinkedCustomerDogForBoarding(record = {}) {
  const boardingIds = new Set([
    record.id,
    ...(record.sourceRecordIds || []),
    ...(record.duplicateProfileIds || []),
  ].map(boardingDogIdFromCustomerDogValue).filter(Boolean));
  return readRecords("customerDog").find((dog) => {
    if (dog.removed) return false;
    if (record.linkedCustomerDogId && dog.id === record.linkedCustomerDogId) return true;
    return [...boardingIds].some((boardingId) => customerDogHasBoardingLink(dog, boardingId));
  }) || null;
}

function customerDogForBoardingRequest(record = {}) {
  if (!record?.id) return null;
  const currentEmail = normalizeEmail(currentUser?.email);
  const linkedDog = explicitLinkedCustomerDogForBoarding(record);
  if (linkedDog && (currentRole() === "admin" || customerDogVisibleToCustomer(linkedDog, currentEmail))) return linkedDog;
  return customerDogsForCurrentUser().find((dog) => customerDogHasBoardingLink(dog, record.id))
    || customerDogFromBoardingDog(record, currentEmail, { explicitOnly: true });
}

function openCustomerDogEditorForRequest(requestId = "") {
  const boardingId = boardingDogIdFromCustomerDogValue(requestId);
  const record = readRecords("boardingDog").find((item) => item.id === boardingId && !item.removed);
  if (!record || (currentRole() !== "admin" && !boardingDogVisibleToCustomer(record))) {
    showToast("This request is no longer available.");
    return;
  }
  const linkedDog = explicitLinkedCustomerDogForBoarding(record);
  const canEditLinkedDog = linkedDog && (currentRole() === "admin" || customerDogVisibleToCustomer(linkedDog));
  const dog = canEditLinkedDog
    ? linkedDog
    : customerDogFromBoardingDog(record, currentUser?.email, { explicitOnly: true });
  if (!dog) {
    showToast("The dog for this request could not be opened.");
    return;
  }
  const formDog = canEditLinkedDog
    ? { ...dog, sourceBoardingDogId: dog.sourceBoardingDogId || record.id, linkedBoardingDogId: dog.linkedBoardingDogId || record.id }
    : { ...dog, id: "", sourceBoardingDogId: record.id, linkedBoardingDogId: record.id };
  $("#detailDialog")?.close();
  switchPage("customerPage");
  openCustomerDog(formDog);
}

function openCustomerRequestDetail(record = {}, stayId = "") {
  if (!record?.id) return;
  const displayRecord = boardingDogWithStayStatus(record);
  const stay = boardingStayByReference(displayRecord, stayId) || boardingPrimaryStay(displayRecord) || displayRecord.stays?.[0] || {};
  const canShowStaffDogAction = currentRole() === "admin" && !isImpersonating() && activePageId() !== "customerRequestsPage";
  showDetailDialog(titleForRecord("boardingDog", displayRecord), detailForRecord("boardingDog", displayRecord, { stayId: stay.id || stayId }), null, {
    headerAction: canShowStaffDogAction ? {
      label: "Edit Dog",
      action: "open-boarding-dog-editor",
      id: displayRecord.id,
      stayId: stay.id || "",
      requestCode: stay.id ? boardingStayRequestCode(displayRecord, stay) : "",
    } : null,
  });
}

function detailForRecord(type, record, options = {}) {
  if (!record) return "";
  if (type === "dailyTask") return dailyDetailHtml(record);
  if (type === "boardingDog") return boardingDogDetailHtml(record, options.stayId || "");
  if (type === "request") return requestDetailHtml(record);
  if (type === "maintenance") return maintenanceDetailHtml(record);
  return genericDetailHtml(record);
}

function titleForRecord(type, record = {}) {
  if (currentRole() === "customer" && type === "boardingDog") return `Request: ${record.dogName || "Dog"}`;
  const labels = {
    ownedDog: `Dog: ${record.callName || record.showName || "Record"}`,
    boardingDog: `Boarding Dog: ${record.dogName || "Record"}`,
    request: `Request: ${record.category || "Record"}`,
    maintenance: `Maintenance: ${record.location || "Record"}`,
    timesheet: `Timesheet: ${record.helperName || "Record"}`,
    service: `Service: ${record.serviceName || "Record"}`,
    dailyTask: `Daily Report: ${record.date || "Record"}`,
    customerDog: `Customer Dog: ${record.dogName || "Record"}`,
    boardingAgreement: `Boarding Agreement: ${record.signerName || record.signerEmail || "Record"}`,
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
    clean.nextBath = nextBathFromFrequency(clean.lastBath, clean.bathIntervalDays);
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
      if (boardingStayHasService(stay, "Bath")) {
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

function boardingDogSearchText(record = {}) {
  const stayText = (record.stays || []).map((stay) => [
    boardingStayRequestCode(record, stay),
    boardingStayDisplayStatus(record, stay),
    formatDateTime(stay.dropoffTime),
    formatDateTime(stay.pickupTime),
    boardingKennelLocationLabel(record, stay),
    boardingStayServicesText(stay),
    stay.stayNotes || "",
    stay.bathPlan || "",
  ].filter(Boolean).join(" ")).join(" ");
  return [
    JSON.stringify(record),
    boardingDisplayStatus(record),
    boardingScheduleText(record),
    stayText,
  ].filter(Boolean).join(" ").toLowerCase();
}

function boardingDogMatchesSearch(record = {}, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return boardingDogSearchText(record).includes(normalizedQuery);
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
        <button type="button" class="secondary-button" data-action="quick-owned-log" data-care-type="Medical/Behavior Note" data-id="${escapeHtml(dog.id)}">Medical/Behavior</button>
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
    button.textContent = count > 0 ? `${base} (${count})` : base;
  });
}

function boardingRosterFilters() {
  return ["Active dogs", "Pending Approval", "Approved", "In Kennel", "Ready For Pickup", "All Boarding Dogs"];
}

function boardingRosterFilterLabel(filter) {
  if (filter === "Pending") return "Pending Approval";
  return filter === "Ready For Pickup" ? "Ready for Pickup" : filter;
}

function boardingDogMatchesRosterFilter(record = {}, filter = boardingDogRosterFilter) {
  const status = boardingDisplayStatus(record);
  const hasActiveStay = isCurrentlyBoarding(record);
  const hasStays = Boolean((record.stays || []).length);
  if (filter === "All Boarding Dogs") return true;
  if (filter === "Pending" || filter === "Pending Approval") return status === "Pending" && !hasActiveStay;
  if (filter === "Approved") return status === "Approved" && !hasActiveStay;
  if (filter === "In Kennel") return status === "In Kennel" && (hasActiveStay || !hasStays);
  if (filter === "Ready For Pickup") return status === "Ready For Pickup" && (hasActiveStay || !hasStays);
  return hasActiveStay || (!hasStays && ["Checked In", "In Kennel", "Ready For Pickup"].includes(status));
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

function boardingStayLeavesWithinHours(stay = {}, hours = 48, date = new Date()) {
  const pickup = new Date(stay.pickupTime || stay.scheduledPickupTime || stay.requestedPickupTime || "");
  const reference = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(reference.getTime())) return false;
  const remaining = pickup.getTime() - reference.getTime();
  return remaining >= 0 && remaining <= Math.max(1, Number(hours || 48)) * 60 * 60 * 1000;
}

function boardingQueueStayMatchesGroup(title = "", record = {}, stay = {}) {
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  const status = boardingStayDisplayStatus(record, stay);
  if (title === "Pending Approval") return status === "Pending";
  if (title === "Today Drop-offs") return sameDateValue(stay.dropoffTime, today) && ["Pending", "Approved", "Checked In"].includes(status);
  if (title === "Tomorrow Arrivals") return sameDateValue(stay.dropoffTime, tomorrow) && status === "Approved";
  if (title === "In Kennel") return status === "In Kennel" && Boolean(activeBoardingStay({ ...record, stays: [stay] }));
  if (title === "Leaving in 48 Hours") return ["Checked In", "In Kennel", "Ready For Pickup"].includes(status) && boardingStayLeavesWithinHours(stay, 48);
  if (title === "Today Pickups") return sameDateValue(stay.pickupTime, today) && ["Checked In", "In Kennel", "Ready For Pickup"].includes(status);
  return false;
}

function boardingQueueStayForGroup(title = "", record = {}) {
  const stays = record.stays || [];
  return stays.find((stay) => boardingQueueStayMatchesGroup(title, record, stay)) || null;
}

function boardingQueueRecordMatchesGroup(title = "", record = {}) {
  if ((record.stays || []).length) return Boolean(boardingQueueStayForGroup(title, record));
  const status = normalizeBoardingStatus(record);
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  if (title === "Pending Approval") return status === "Pending";
  if (title === "Today Drop-offs") return sameDateValue(record.dropoffTime, today) && ["Pending", "Approved", "Checked In"].includes(status);
  if (title === "Tomorrow Arrivals") return sameDateValue(record.dropoffTime, tomorrow) && status === "Approved";
  if (title === "In Kennel") return status === "In Kennel";
  if (title === "Leaving in 48 Hours") return ["Checked In", "In Kennel", "Ready For Pickup"].includes(status) && boardingStayLeavesWithinHours(record, 48);
  if (title === "Today Pickups") return sameDateValue(record.pickupTime, today) && ["Checked In", "In Kennel", "Ready For Pickup"].includes(status);
  return false;
}

function boardingQueueFlagHtml(label = "", value = "", className = "") {
  if (!value) return "";
  const classes = ["boarding-queue-flag", className].filter(Boolean).join(" ");
  return `<span class="${escapeHtml(classes)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></span>`;
}

function boardingQueueStayDateFlagsHtml(record = {}, stay = {}) {
  const dropoff = formatDateTime(stay.dropoffTime || record.dropoffTime);
  const pickup = formatDateTime(stay.pickupTime || record.pickupTime);
  if (isServiceRequestStay(record, stay)) {
    return boardingQueueFlagHtml("Requested", dropoff, "boarding-queue-time-flag");
  }
  return [
    boardingQueueFlagHtml("Drop-off", dropoff, "boarding-queue-time-flag"),
    boardingQueueFlagHtml("Pick-up", pickup, "boarding-queue-time-flag"),
  ].filter(Boolean).join("");
}

function boardingMobileScheduleFlagsHtml(record = {}, stay = {}) {
  const activeStay = stay?.id ? stay : boardingPrimaryStay(record) || {};
  const dropoff = formatDateTime(activeStay.dropoffTime || record.dropoffTime);
  const pickup = formatDateTime(activeStay.pickupTime || record.pickupTime);
  const flags = isServiceRequestStay(record, activeStay)
    ? [boardingQueueFlagHtml("Requested", dropoff, "boarding-queue-time-flag")]
    : [
        boardingQueueFlagHtml("Drop-off", dropoff, "boarding-queue-time-flag"),
        boardingQueueFlagHtml("Pick-up", pickup, "boarding-queue-time-flag"),
      ];
  const html = flags.filter(Boolean).join("");
  return html ? '<span class="boarding-mobile-schedule-line boarding-mobile-schedule-flags">' + html + '</span>' : "";
}

function boardingQueueKennelFlagHtml(record = {}, stay = {}) {
  const kennel = boardingKennelLocationLabel(record, stay);
  return boardingQueueFlagHtml("Kennel", kennel, "boarding-queue-kennel-flag");
}

function boardingQueueGroupHtml(title, records = []) {
  const PREVIEW_LIMIT = 6;
  const preview = records.slice(0, PREVIEW_LIMIT);
  const overflow = records.length - PREVIEW_LIMIT;
  const overflowHtml = overflow > 0
    ? `<button type="button" class="boarding-queue-overflow" data-action="boarding-queue-show-more" data-filter="${escapeHtml(title)}">+${overflow} more - view all</button>`
    : "";
  const cardClass = [
    "boarding-queue-card",
    title === "Leaving in 48 Hours" ? "is-leaving-soon" : "",
    records.length ? "" : "is-empty",
  ].filter(Boolean).join(" ");
  return `<article class="${cardClass}"><strong>${escapeHtml(title)}</strong><span>${records.length}</span>${
    preview.length
      ? preview.map((record) => {
        const stay = boardingQueueStayForGroup(title, record) || boardingPrimaryStay(record) || {};
        const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
        const metaFlags = [boardingQueueStayDateFlagsHtml(record, stay), boardingQueueKennelFlagHtml(record, stay)].filter(Boolean).join("");
        return `<button type="button" class="boarding-queue-item" data-action="open-queue-stay-status" data-id="${escapeHtml(record.id)}"${stayAttrs}><span class="boarding-queue-item-content"><span class="boarding-queue-item-title"><span>${escapeHtml(record.dogName || "Dog")}</span></span>${metaFlags ? `<span class="boarding-queue-meta-row">${metaFlags}</span>` : ""}</span></button>`;
      }).join("")
      : ""
  }${overflowHtml}</article>`;
}

function renderBoardingQueueGroups(records = []) {
  const container = $("#boardingQueueGroups");
  if (!container) return;
  const groups = [
    ["Pending Approval", records.filter((record) => boardingQueueRecordMatchesGroup("Pending Approval", record))],
    ["Tomorrow Arrivals", records.filter((record) => boardingQueueRecordMatchesGroup("Tomorrow Arrivals", record))],
    ["Today Drop-offs", records.filter((record) => boardingQueueRecordMatchesGroup("Today Drop-offs", record))],
    ["In Kennel", records.filter((record) => boardingQueueRecordMatchesGroup("In Kennel", record))],
    ["Today Pickups", records.filter((record) => boardingQueueRecordMatchesGroup("Today Pickups", record))],
  ].filter(([, groupRecords]) => groupRecords.length);
  container.innerHTML = groups
    .map(([title, groupRecords]) => boardingQueueGroupHtml(title, groupRecords))
    .join("");
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

function boardingDogVisibleToCustomer(record = {}, email = currentUser?.email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && boardingOwnerEmails(record).includes(normalizedEmail));
}

function customerDogIdentityKey(dog = {}, email = currentUser?.email) {
  const dogName = String(dog.dogName || "").trim().toLowerCase();
  if (!dogName) return "";
  const ownerEmails = uniqueEmails(dog.ownerEmail, dog.customerEmail, email);
  const ownerPhone = String(dog.ownerPhone || "").replace(/\D/g, "");
  const ownerName = String(dog.ownerName || "").trim().toLowerCase();
  const ownerKey = ownerEmails[0] || ownerPhone || ownerName;
  return ownerKey ? `${dogName}|${ownerKey}` : "";
}

function mergeCustomerDogDisplayGroup(records = []) {
  if (records.length <= 1) return records[0] || {};
  const primary = [...records].sort((a, b) => {
    const photoDiff = Number(Boolean(b.profilePhotoUrl || b.profilePhotoData)) - Number(Boolean(a.profilePhotoUrl || a.profilePhotoData));
    if (photoDiff) return photoDiff;
    return itemSortTime(b) - itemSortTime(a);
  })[0] || {};
  const merged = {
    ...primary,
    duplicateCustomerDogIds: [...new Set(records.map((record) => record.id).filter((id) => id && id !== primary.id))],
    vaccinationRecords: mergeObjectList(records, "vaccinationRecords", (item) => item.id || item.url || item.dataUrl || item.name || JSON.stringify(item)),
    customerUpdates: mergeObjectList(records, "customerUpdates", (item) => item.id || `${item.createdAt || item.submittedAt || ""}|${item.note || ""}`),
  };
  ["linkedBoardingDogId", "sourceBoardingDogId"].forEach((field) => {
    if (merged[field]) return;
    const fallback = records.find((record) => record[field]);
    if (fallback) merged[field] = fallback[field];
  });
  canonicalDogProfileFields.forEach((field) => {
    if (merged[field]) return;
    const fallback = records.find((record) => record[field]);
    if (fallback) merged[field] = fallback[field];
  });
  return merged;
}

function mergeCustomerDogDisplayRecords(records = [], email = currentUser?.email) {
  const groups = new Map();
  const ungrouped = [];
  records.forEach((record) => {
    const key = customerDogIdentityKey(record, email);
    if (!key) {
      ungrouped.push(record);
      return;
    }
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  return [...groups.values()].map(mergeCustomerDogDisplayGroup).concat(ungrouped);
}

function customerDogVisibleToCustomer(dog = {}, email = currentUser?.email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && uniqueEmails(dog.ownerEmail, dog.customerEmail).includes(normalizedEmail));
}

function profilePhotoSourceRecord(record = {}, fallbackRecordType = "") {
  if (!profilePhotoHasSource(record)) return {};
  return {
    ...record,
    id: record.profilePhotoSourceRecordId || record.profilePhotoRecordId || record.sourceRecordId || record.id || "",
    type: record.profilePhotoSourceRecordType || record.profilePhotoRecordType || record.sourceRecordType || record.type || fallbackRecordType || "",
  };
}

function boardingDogProfilePhotoRecord(record = {}) {
  if (profilePhotoHasSource(record)) return profilePhotoSourceRecord({ ...record, type: "boardingDog" }, "boardingDog");
  const linked = linkedCustomerDogForBoarding(record) || {};
  return profilePhotoHasSource(linked) ? profilePhotoSourceRecord(linked, linked.type || "customerDog") : {};
}

function canonicalDogMatchesCustomerDog(record = {}, dog = {}, email = currentUser?.email) {
  if (!record?.id || record.removed) return false;
  const customerDogIds = arrayValue(record.legacyCustomerDogIds);
  if (dog.id && customerDogIds.includes(dog.id)) return true;
  const boardingIds = arrayValue(record.legacyBoardingDogIds).map(boardingDogIdFromCustomerDogValue).filter(Boolean);
  const dogBoardingIds = [dog.sourceBoardingDogId, dog.linkedBoardingDogId, dog.id].map(boardingDogIdFromCustomerDogValue).filter(Boolean);
  if (boardingIds.length && dogBoardingIds.some((id) => boardingIds.includes(id))) return true;
  const ownerEmail = normalizeEmail(email || dog.customerEmail || dog.ownerEmail);
  const recordOwnerEmail = normalizeEmail(record.ownerEmail || record.customerEmail);
  const recordName = String(record.dogName || record.name || "").trim().toLowerCase();
  const dogName = String(dog.dogName || dog.name || "").trim().toLowerCase();
  return Boolean(ownerEmail && recordOwnerEmail === ownerEmail && recordName && dogName && recordName === dogName);
}

function canonicalDogProfilePhotoRecordForCustomerDog(dog = {}, email = currentUser?.email) {
  return readRecords("dog")
    .filter((record) => canonicalDogMatchesCustomerDog(record, dog, email) && profilePhotoHasSource(record))
    .sort((a, b) => itemSortTime(b) - itemSortTime(a))
    .map((record) => profilePhotoSourceRecord({ ...record, type: "dog" }, "dog"))[0] || {};
}

function customerDogFromBoardingDog(record = {}, email = currentUser?.email, options = {}) {
  const linked = (options.explicitOnly ? explicitLinkedCustomerDogForBoarding(record) : linkedCustomerDogForBoarding(record)) || {};
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail);
  const currentEmail = normalizeEmail(email);
  const photoRecord = boardingDogProfilePhotoRecord(record);
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
    dhppDuration: record.dhppDuration || linked.dhppDuration || "",
    rabiesGoodThreeYears: record.rabiesGoodThreeYears || linked.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(record, "rabies") || vaccineDurationIsThreeYears(linked, "rabies") ? "Yes" : ""),
    dhppGoodThreeYears: record.dhppGoodThreeYears || linked.dhppGoodThreeYears || (vaccineDurationIsThreeYears(record, "dhpp") || vaccineDurationIsThreeYears(linked, "dhpp") ? "Yes" : ""),
    profilePhotoUrl: profilePhotoDirectSource(photoRecord),
    profilePhotoPath: profilePhotoStoragePath(photoRecord),
    profilePhotoData: photoRecord.profilePhotoData || "",
    profilePhotoSourceRecordId: photoRecord.id || "",
    profilePhotoSourceRecordType: photoRecord.type || "",
    vaccinationRecords: record.vaccinationRecords || linked.vaccinationRecords || [],
    vaccinationFiles: record.vaccinationFiles || linked.vaccinationFiles || "",
  };
}

function customerDogsForCurrentUser() {
  const role = currentRole();
  const email = normalizeEmail(currentUser?.email);
  if (role !== "customer") return [];
  const dogs = mergeCustomerDogDisplayRecords(readRecords("customerDog")
    .filter((dog) => !dog.removed && customerDogVisibleToCustomer(dog, email))
    .map((dog) => {
      const boarding = boardingDogForCustomerDog(dog);
      const boardingPhotoRecord = boarding ? boardingDogProfilePhotoRecord(boarding) : {};
      const fallbackPhotoRecord = profilePhotoHasSource(boardingPhotoRecord) ? boardingPhotoRecord : canonicalDogProfilePhotoRecordForCustomerDog(dog, email);
      const fallbackPhoto = profilePhotoDirectSource(fallbackPhotoRecord);
      const fallbackPhotoPath = profilePhotoStoragePath(fallbackPhotoRecord);
      return (fallbackPhoto || fallbackPhotoPath) && !profilePhotoHasSource(dog) ? {
        ...dog,
        profilePhotoUrl: fallbackPhoto,
        profilePhotoPath: fallbackPhotoPath,
        profilePhotoSourceRecordId: fallbackPhotoRecord.id || "",
        profilePhotoSourceRecordType: fallbackPhotoRecord.type || "",
      } : dog;
    }), email);
  const seenCustomerIds = new Set(dogs.flatMap((dog) => [dog.id, ...(dog.duplicateCustomerDogIds || [])]).filter(Boolean));
  const seenIds = new Set(dogs.flatMap((dog) => [dog.linkedBoardingDogId, dog.sourceBoardingDogId].map(boardingDogIdFromCustomerDogValue)).filter(Boolean));
  const seenIdentityKeys = new Set(dogs.map((dog) => customerDogIdentityKey(dog, email)).filter(Boolean));
  consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record, email))
  )
    .forEach((record) => {
      const recordId = boardingDogIdFromCustomerDogValue(record.id);
      if (seenIds.has(recordId)) return;
      const linkedDog = explicitLinkedCustomerDogForBoarding(record);
      if (linkedDog?.id && seenCustomerIds.has(linkedDog.id)) return;
      const semanticLinkedDog = linkedCustomerDogForBoarding(record);
      if (semanticLinkedDog?.id && seenCustomerIds.has(semanticLinkedDog.id)) {
        seenIds.add(recordId);
        return;
      }
      if (dogs.some((dog) => boardingRecordMatchesCustomerDog(record, dog))) {
        seenIds.add(recordId);
        return;
      }
      const displayDog = customerDogFromBoardingDog(record, email);
      const identityKey = customerDogIdentityKey(displayDog, email);
      if (identityKey && seenIdentityKeys.has(identityKey)) return;
      dogs.push(displayDog);
      seenIds.add(recordId);
      if (displayDog.id && !displayDog.isSharedBoardingDog) seenCustomerIds.add(displayDog.id);
      if (identityKey) seenIdentityKeys.add(identityKey);
    });
  return dogs;
}

function customerDogPhotoRecordForDisplay(dog = {}, fallbackRecord = {}) {
  const linkedBoarding = fallbackRecord?.id ? fallbackRecord : boardingDogForCustomerDog(dog);
  const linkedBoardingPhotoRecord = linkedBoarding ? boardingDogProfilePhotoRecord(linkedBoarding) : {};
  const canonicalPhotoRecord = canonicalDogProfilePhotoRecordForCustomerDog(dog);
  if (profilePhotoHasSource(dog)) {
    const dogPath = profilePhotoStoragePath(dog);
    const linkedPath = profilePhotoStoragePath(linkedBoardingPhotoRecord);
    if (dogPath && linkedPath && dogPath === linkedPath) {
      return {
        ...linkedBoardingPhotoRecord,
        dogName: dog.dogName || linkedBoardingPhotoRecord.dogName || "Dog",
      };
    }
    return dog;
  }
  if (linkedBoarding && profilePhotoHasSource(linkedBoardingPhotoRecord)) {
    return {
      ...linkedBoardingPhotoRecord,
      dogName: dog.dogName || linkedBoardingPhotoRecord.dogName || "Dog",
    };
  }
  if (profilePhotoHasSource(canonicalPhotoRecord)) {
    return {
      ...canonicalPhotoRecord,
      dogName: dog.dogName || canonicalPhotoRecord.dogName || "Dog",
    };
  }
  return dog;
}

function customerDogPhotoHtml(dog = {}, options = {}) {
  const name = dog.dogName || "Dog";
  const photoRecord = options.photoRecord || dog;
  const photo = profilePhotoDirectSource(photoRecord);
  if (profilePhotoHasSource(photoRecord)) {
    return `<img class="customer-dog-photo"${profilePhotoAccessAttrs(photoRecord, photoRecord.type || dog.type || "customerDog")}${photo ? ` src="${escapeHtml(photo)}"` : ""} alt="${escapeHtml(name)}"${photo ? "" : " hidden"} /><span class="customer-dog-photo customer-dog-photo-initials" data-profile-photo-initials${photo ? " hidden" : ""}>${escapeHtml(avatarText(name))}</span>`;
  }
  return `<span class="customer-dog-photo customer-dog-photo-initials">${escapeHtml(avatarText(name))}</span>`;
}

function editableCustomerDogForCurrentUser(id = "", boardingId = "") {
  const dogId = String(id || "");
  const normalizedBoardingId = boardingDogIdFromCustomerDogValue(boardingId || dogId);
  const visibleDog = customerDogsForCurrentUser().find((dog) => dog.id === dogId || customerDogHasBoardingLink(dog, normalizedBoardingId));
  if (visibleDog) return visibleDog;
  const savedDog = readRecords("customerDog").find((dog) => dog.id === dogId && !dog.removed && (currentRole() === "admin" || customerDogVisibleToCustomer(dog)));
  if (savedDog) return savedDog;
  const boarding = readRecords("boardingDog").find((record) => record.id === normalizedBoardingId && !record.removed && (currentRole() === "admin" || boardingDogVisibleToCustomer(record)));
  return boarding ? customerDogForBoardingRequest(boarding) : null;
}

function openEditableCustomerDogById(id = "", boardingId = "") {
  const normalizedBoardingId = boardingDogIdFromCustomerDogValue(boardingId);
  const record = editableCustomerDogForCurrentUser(id, normalizedBoardingId);
  if (!record) {
    showToast("This dog profile could not be opened for editing.");
    return;
  }
  if (record.isSharedBoardingDog || normalizedBoardingId) {
    openCustomerDogEditorForRequest(normalizedBoardingId || record.sourceBoardingDogId || record.linkedBoardingDogId || record.id);
    return;
  }
  openCustomerDog(record);
}

function customerUpdatesForCurrentUser() {
  const email = normalizeEmail(currentUser?.email);
  const updateKeys = new Set();
  const boardingUpdates = readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record, email))
    .flatMap((record) => {
      const displayRecord = boardingDogRecordForDisplay(record.id) || boardingDogWithStayStatus(record);
      const stays = displayRecord.stays || [];
      return (displayRecord.customerUpdates || record.customerUpdates || []).map((update) => {
        const stay = boardingStayByReference(displayRecord, { stayId: update.stayId || "", requestCode: update.requestCode || "" }) || activeBoardingStay(displayRecord) || currentOrNextStay(displayRecord) || stays[0] || {};
        return { ...update, source: "boardingDog", dog: displayRecord, stay };
      });
    });
  const customerDogUpdates = readRecords("customerDog")
    .filter((dog) => !dog.removed && customerDogVisibleToCustomer(dog, email))
    .flatMap((dog) => (dog.customerUpdates || []).map((update) => ({
      ...update,
      source: "customerDog",
      dog,
      stay: {
        id: update.stayId || "",
        dropoffTime: update.stayDropoffTime || "",
        pickupTime: update.stayPickupTime || "",
      },
    })));
  return [...boardingUpdates, ...customerDogUpdates]
    .filter((update) => {
      const key = update.id || `${update.createdAt || ""}|${update.note || ""}|${update.stayId || ""}`;
      if (updateKeys.has(key)) return false;
      updateKeys.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderCustomerUpdates() {
  const list = $("#customerUpdatesList");
  if (!list) return;
  const updates = customerUpdatesForCurrentUser();
  if (!updates.length) {
    list.innerHTML = "<p>No boarding updates have been sent yet.</p>";
    return;
  }
  const grouped = updates.reduce((groups, update) => {
    const requestCode = update.requestCode || (update.stay?.id && update.dog ? boardingStayRequestCode(update.dog, update.stay) : "");
    const stayText = update.stayLabel || (update.stay?.dropoffTime || update.stay?.pickupTime
      ? `${formatDateTime(update.stay.dropoffTime)} to ${formatDateTime(update.stay.pickupTime)}`
      : "Current stay");
    const key = `${update.dog?.dogName || update.dogName || "Dog"}|${stayText}|${requestCode || update.stayId || update.stay?.id || ""}`;
    groups[key] = groups[key] || { dogName: update.dog?.dogName || update.dogName || "Dog", stayText, requestCode, updates: [] };
    groups[key].updates.push(update);
    return groups;
  }, {});
  list.innerHTML = Object.values(grouped)
    .map((group) => `<section class="customer-update-group">
      <h3>${escapeHtml(group.dogName)}</h3>
      <p>${group.requestCode ? `Stay ID: ${escapeHtml(group.requestCode)} | ` : ""}${escapeHtml(group.stayText)}</p>
      ${group.updates.map((update) => {
        const requestCode = update.requestCode || group.requestCode || "";
        const media = (update.mediaItems || []).map((item) => {
          const src = item.url || item.dataUrl || "";
          if (!src && !item.storagePath) return item.note ? `<p class="muted-text">${escapeHtml(item.name || "Media")}: ${escapeHtml(item.note)}</p>` : "";
          const isImage = String(item.type || "").startsWith("image/");
          const isVideo = String(item.type || "").startsWith("video/");
          const label = item.name || (isVideo ? "Open video" : isImage ? "Open photo" : "Open attachment");
          return `<button type="button" class="customer-update-media-button" data-action="view-media" data-src="${escapeHtml(src)}" data-media-type="${escapeHtml(item.type || "application/octet-stream")}" data-media-name="${escapeHtml(item.name || "Customer update media")}"${mediaAccessAttrs(item, { sourceRecordId: update.boardingDogId || item.sourceRecordId || "", sourceRecordType: "boardingDog" })}>${isImage && src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.name || "Customer update photo")}" />` : ""}<span>${escapeHtml(label)}</span></button>`;
        }).join("");
        return `<article class="record-card compact-record-card customer-update-card">
          <strong>${escapeHtml(formatDateTime(update.createdAt) || "Update")}</strong>
          <p>${escapeHtml(update.note || "No note added.")}</p>
          <small>${escapeHtml([update.byName || "", requestCode ? `Stay ID: ${requestCode}` : ""].filter(Boolean).join(" | "))}</small>
          ${media ? `<div class="customer-update-media-grid">${media}</div>` : ""}
        </article>`;
      }).join("")}
    </section>`)
    .join("");
}

function customerUploadedFileEntriesForCurrentUser() {
  const dogFiles = customerDogsForCurrentUser().flatMap((dog) => {
    const dogName = dog.dogName || "Dog";
    const entries = [];
    if (dog.profilePhotoUrl || dog.profilePhotoData) {
      entries.push({
        dogName,
        fileName: `${dogName} profile photo`,
        fileType: "Profile photo",
        src: dog.profilePhotoUrl || dog.profilePhotoData || "",
        mediaType: "image/jpeg",
        savedAt: dog.updatedAt || dog.submittedAt || "",
      });
    }
    (dog.vaccinationRecords || []).forEach((file, index) => {
      entries.push({
        dogName,
        fileName: file.name || `Vaccination record ${index + 1}`,
        fileType: file.vaccineType || "Vaccination record",
        src: file.url || file.dataUrl || "",
        mediaType: file.type || "application/pdf",
        savedAt: file.savedAt || file.createdAt || dog.updatedAt || dog.submittedAt || "",
      });
    });
    if (!(dog.vaccinationRecords || []).length && dog.vaccinationFiles) {
      String(dog.vaccinationFiles).split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => {
        entries.push({
          dogName,
          fileName: name,
          fileType: "Vaccination record",
          src: "",
          mediaType: "",
          savedAt: dog.updatedAt || dog.submittedAt || "",
        });
      });
    }
    return entries;
  });
  const agreementFiles = customerBoardingAgreementsForCurrentUser().map((agreement) => ({
    sourceRecordId: agreement.id || "",
    sourceRecordType: "boardingAgreement",
    dogName: "Owner profile",
    fileName: agreement.agreementTitle || CUSTOMER_BOARDING_AGREEMENT_TITLE,
    fileType: "Signed boarding agreement",
    savedAt: agreement.signedAt || agreement.submittedAt || "",
    agreementVersion: agreement.agreementVersion || "",
  }));
  return [...dogFiles, ...agreementFiles].sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

function renderCustomerFiles() {
  const list = $("#customerFilesList");
  if (!list) return;
  const files = customerUploadedFileEntriesForCurrentUser();
  list.innerHTML = files.length
    ? files.map((file) => {
      const action = file.sourceRecordType === "boardingAgreement"
        ? `<button type="button" class="secondary-button" data-action="view-customer-agreement" data-id="${escapeHtml(file.sourceRecordId || "")}">Open Agreement</button>`
        : file.src
        ? `<button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="${escapeHtml(file.src)}" data-media-type="${escapeHtml(file.mediaType || "")}" data-media-name="${escapeHtml(file.fileName)}">Open</button>`
        : `<button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="${escapeHtml(file.fileName)}">View Name</button>`;
      return `<article class="record-card compact-record-card">
        <strong>${escapeHtml(file.fileName)}</strong>
        <span>${escapeHtml(file.dogName)} | ${escapeHtml(file.fileType)}${file.agreementVersion ? ` | Version ${escapeHtml(file.agreementVersion)}` : ""}</span>
        ${file.savedAt ? `<p>${escapeHtml(formatDateTime(file.savedAt))}</p>` : ""}
        <div class="record-actions">${action}</div>
      </article>`;
    }).join("")
    : "<p>No uploaded files are saved yet.</p>";
}

function customerAgreementAppliesToEstimate(estimate = customerEstimateDetails()) {
  return !estimate?.isServiceRequest;
}

function customerAgreementFallbackClauses() {
  return [
    "I certify that I am the owner or authorized agent for the dog or dogs submitted for boarding.",
    "I authorize Cuddle Stay and its staff to board, handle, feed, exercise, and provide routine care for my dog or dogs during the requested stay.",
    "I confirm that the dog profile, vaccination information, medical history, behavior notes, feeding instructions, emergency contacts, and owner contact information I provided are accurate and complete to the best of my knowledge.",
    "I understand that boarding includes normal animal-care risks, including stress, minor illness, injury, escape attempts, and interaction with other dogs, and I agree to disclose any known aggression, bite history, contagious illness, medication needs, or special handling requirements before drop-off.",
    "I authorize Cuddle Stay to seek veterinary or emergency care if staff reasonably believes care is needed and I cannot be reached quickly. I accept financial responsibility for veterinary, medication, transportation, special handling, damage, late pickup, cancellation, and other approved charges related to my dog or dogs.",
    "I understand that staff approval is required before a boarding request is confirmed and that estimated totals can change when staff reviews dates, services, vaccination status, member pricing, shared-crate eligibility, or special care needs.",
    "I agree to follow drop-off, pickup, vaccine, payment, cancellation, and safety instructions provided by Cuddle Stay for the stay.",
    "I agree that this electronic signature is attached to and logically associated with this boarding agreement and has the same intent as my handwritten signature for boarding requests submitted through Snuggle Stay.",
  ];
}

function customerAgreementMarkdown(record = null) {
  const source = String(record?.agreementMarkdown || record?.agreementText || CUSTOMER_BOARDING_AGREEMENT_MARKDOWN || "").trim();
  if (source) return source;
  return [
    "# " + CUSTOMER_BOARDING_AGREEMENT_TITLE,
    "",
    ...customerAgreementFallbackClauses().map((clause, index) => String(index + 1) + ". " + clause),
  ].join("\n");
}

function customerAgreementClauses() {
  const headings = String(CUSTOMER_BOARDING_AGREEMENT_MARKDOWN || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^#\s+/.test(line))
    .map((line) => line.replace(/^#+\s+/, ""))
    .filter(Boolean);
  return headings.length ? headings : customerAgreementFallbackClauses();
}

function customerAgreementText() {
  return [
    CUSTOMER_BOARDING_AGREEMENT_TITLE,
    "Version: " + CUSTOMER_BOARDING_AGREEMENT_VERSION,
    "Effective date: " + CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE,
    customerAgreementMarkdown(),
    "Electronic consent: " + CUSTOMER_BOARDING_AGREEMENT_CONSENT_TEXT,
    "Signature intent: " + CUSTOMER_BOARDING_AGREEMENT_INTENT_TEXT,
  ].join("\n\n");
}

function customerAgreementSimpleHash(value = "", length = 16) {
  if (typeof shortStableHash === "function") return shortStableHash(value, length);
  let hash = 2166136261;
  String(value || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0").slice(0, length);
}

function customerAgreementDocumentFingerprint() {
  return "agreement-" + customerAgreementSimpleHash(customerAgreementText(), 24);
}

async function customerAgreementSha256Hex(value = "") {
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const data = new TextEncoder().encode(String(value || ""));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return "fallback-" + customerAgreementSimpleHash(value, 32);
}

function customerAgreementFormatInline(value = "") {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function customerAgreementMarkdownToHtml(markdown = "") {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const html = [];
  let openList = "";
  const closeList = () => {
    if (!openList) return;
    html.push("</" + openList + ">");
    openList = "";
  };
  const ensureList = (type) => {
    if (openList === type) return;
    closeList();
    html.push("<" + type + ">");
    openList = type;
  };
  lines.forEach((rawLine) => {
    const line = String(rawLine || "").trim();
    if (!line) {
      closeList();
      return;
    }
    if (/^-{3,}$/.test(line)) {
      closeList();
      html.push("<hr>");
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const tag = heading[1].length === 1 ? "h4" : "h5";
      html.push("<" + tag + ">" + customerAgreementFormatInline(heading[2]) + "</" + tag + ">");
      return;
    }
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      ensureList("ol");
      html.push("<li>" + customerAgreementFormatInline(ordered[1]) + "</li>");
      return;
    }
    const bullet = line.match(/^\*\s+(.+)$/);
    if (bullet) {
      ensureList("ul");
      html.push("<li>" + customerAgreementFormatInline(bullet[1]) + "</li>");
      return;
    }
    closeList();
    html.push("<p>" + customerAgreementFormatInline(line) + "</p>");
  });
  closeList();
  return html.join("");
}

function customerAgreementTreatmentLabel(value = "") {
  const labels = {
    limit: "Treatment authorized up to the stated amount",
    "no-limit": "All treatment reasonably necessary to stabilize or protect the dog is authorized without a preset financial limit",
    "approval-required": "Non-life-saving treatment requires owner or emergency-contact approval",
  };
  return labels[value] || "";
}

function customerAgreementMediaLabel(value = "") {
  const labels = {
    authorized: "Promotional and public media use is authorized as stated in the agreement",
    "opt-out": "Owner does not authorize promotional or public use of photographs or recordings of the dog",
  };
  return labels[value] || "";
}

function customerAgreementFieldValue(id = "") {
  return String($(`#${id}`)?.value || "").trim();
}

function customerAgreementCheckedField(name = "") {
  return document.querySelector(`#customerBookingForm input[name="${name}"]:checked`);
}

function customerAgreementCheckedValue(name = "") {
  return customerAgreementCheckedField(name)?.value || "";
}

function customerAgreementFirstValue(records = [], keys = []) {
  for (const record of records) {
    for (const key of keys) {
      const value = String(record?.[key] || "").trim();
      if (value) return value;
    }
  }
  return "";
}

function customerAgreementSelectedDogs(estimate = customerEstimateDetails()) {
  const estimateDogs = uniqueCustomerBookingDogs(estimate?.dogs || []);
  return estimateDogs.length ? estimateDogs : selectedCustomerDogs();
}

function customerAgreementDogInformation(estimate = customerEstimateDetails()) {
  return customerAgreementSelectedDogs(estimate).map((dog) => ({
    dogName: dog.dogName || "Dog",
    breedDescription: dog.breedDescription || dog.breed || "",
    dateOfBirth: dog.dateOfBirth || dog.birthday || "",
    age: typeof dogAgeText === "function" ? dogAgeText(dog) : "",
    spayNeuterStatus: dog.spayNeuterStatus || "",
    emergencyName: dog.emergencyName || "",
    emergencyPhone: dog.emergencyPhone || "",
    veterinarianClinic: dog.vetInfo || dog.veterinarian || dog.vetClinic || "",
    veterinarianPhone: dog.vetPhone || dog.vetPhoneNumber || dog.veterinarianPhone || "",
  }));
}

function customerAgreementDogSummaryHtml(estimate = customerEstimateDetails()) {
  const dogs = customerAgreementDogInformation(estimate);
  if (!dogs.length) return "<p>No dog is selected for this agreement yet.</p>";
  const rows = dogs.map((dog) => {
    const details = [
      dog.breedDescription,
      dog.age || dog.dateOfBirth,
      dog.spayNeuterStatus,
    ].filter(Boolean).join(" | ");
    return `<li><strong>${escapeHtml(dog.dogName || "Dog")}</strong>${details ? `<span>${escapeHtml(details)}</span>` : ""}</li>`;
  }).join("");
  return `<strong>Dog information included in this agreement</strong><ul>${rows}</ul>`;
}

function setCustomerAgreementFieldIfEmpty(id = "", value = "") {
  const field = $(`#${id}`);
  if (field && !String(field.value || "").trim() && String(value || "").trim()) {
    field.value = String(value || "").trim();
  }
}

function syncCustomerAgreementSignatureName() {
  const source = $("#customerAgreementSignerName");
  const target = $("#customerAgreementSignatureNameConfirm");
  if (target) target.value = String(source?.value || "").trim();
}

function syncCustomerAgreementTreatmentAmount() {
  const amountField = $("#customerAgreementTreatmentLimitAmount");
  const limitSelected = customerAgreementCheckedValue("agreementEmergencyTreatmentChoice") === "limit";
  if (!amountField) return;
  amountField.disabled = !limitSelected;
  amountField.required = limitSelected;
  if (!limitSelected) clearFieldError(amountField);
}

function initializeCustomerAgreementControls() {
  if (customerAgreementControlsInitialized) return;
  customerAgreementControlsInitialized = true;
  $("#customerAgreementSignerName")?.addEventListener("input", syncCustomerAgreementSignatureName);
  $$('input[name="agreementEmergencyTreatmentChoice"]').forEach((field) => {
    field.addEventListener("change", syncCustomerAgreementTreatmentAmount);
  });
}

function prefillCustomerAgreementFields(estimate = customerEstimateDetails()) {
  const dogs = customerAgreementSelectedDogs(estimate);
  const profile = savedUserFor(currentUser) || {};
  setCustomerAgreementFieldIfEmpty("customerAgreementSignerName", currentUser?.name || profile.name || "");
  setCustomerAgreementFieldIfEmpty("customerAgreementOwnerEmail", normalizeEmail(currentUser?.email || profile.email || ""));
  setCustomerAgreementFieldIfEmpty("customerAgreementOwnerPhone", profile.phone || profile.ownerPhone || customerAgreementFirstValue(dogs, ["ownerPhone", "customerPhone", "phone"]));
  setCustomerAgreementFieldIfEmpty("customerAgreementOwnerAddress", profile.address || profile.mailingAddress || profile.ownerAddress || "");
  setCustomerAgreementFieldIfEmpty("customerAgreementEmergencyName", customerAgreementFirstValue(dogs, ["emergencyName"]));
  setCustomerAgreementFieldIfEmpty("customerAgreementEmergencyPhone", customerAgreementFirstValue(dogs, ["emergencyPhone"]));
  setCustomerAgreementFieldIfEmpty("customerAgreementVetClinic", customerAgreementFirstValue(dogs, ["vetInfo", "veterinarian", "vetClinic"]));
  setCustomerAgreementFieldIfEmpty("customerAgreementVetPhone", customerAgreementFirstValue(dogs, ["vetPhone", "vetPhoneNumber", "veterinarianPhone"]));
  const dogSummary = $("#customerAgreementDogSummary");
  if (dogSummary) dogSummary.innerHTML = customerAgreementDogSummaryHtml(estimate);
  syncCustomerAgreementSignatureName();
  syncCustomerAgreementTreatmentAmount();
}

function customerAgreementResponsePayload(estimate = customerEstimateDetails()) {
  const emergencyTreatmentChoice = customerAgreementCheckedValue("agreementEmergencyTreatmentChoice");
  const mediaPreference = customerAgreementCheckedValue("agreementMediaPreference") || "authorized";
  const treatmentLimitRaw = customerAgreementFieldValue("customerAgreementTreatmentLimitAmount");
  const treatmentLimitAmount = emergencyTreatmentChoice === "limit" ? treatmentLimitRaw : "";
  return {
    ownerLegalName: customerAgreementFieldValue("customerAgreementSignerName"),
    ownerAddress: customerAgreementFieldValue("customerAgreementOwnerAddress"),
    ownerPhone: customerAgreementFieldValue("customerAgreementOwnerPhone"),
    ownerEmail: customerAgreementFieldValue("customerAgreementOwnerEmail") || normalizeEmail(currentUser?.email),
    emergencyContactName: customerAgreementFieldValue("customerAgreementEmergencyName"),
    emergencyContactPhone: customerAgreementFieldValue("customerAgreementEmergencyPhone"),
    veterinarianClinic: customerAgreementFieldValue("customerAgreementVetClinic"),
    veterinarianPhone: customerAgreementFieldValue("customerAgreementVetPhone"),
    emergencyTreatmentChoice,
    emergencyTreatmentLabel: customerAgreementTreatmentLabel(emergencyTreatmentChoice),
    emergencyTreatmentLimitAmount: treatmentLimitAmount,
    mediaPreference,
    mediaPreferenceLabel: customerAgreementMediaLabel(mediaPreference),
    mediaOptOut: mediaPreference === "opt-out",
    dogInformation: customerAgreementDogInformation(estimate),
  };
}

function customerAgreementCompletedFieldsText(responses = {}) {
  const dogLines = (Array.isArray(responses.dogInformation) ? responses.dogInformation : []).map((dog, index) => [
    `Dog ${index + 1}: ${dog.dogName || "Dog"}`,
    `Breed: ${dog.breedDescription || ""}`,
    `Age or DOB: ${[dog.age, dog.dateOfBirth].filter(Boolean).join(" / ") || ""}`,
    `Emergency contact: ${[dog.emergencyName, dog.emergencyPhone].filter(Boolean).join(" | ") || ""}`,
    `Veterinarian: ${[dog.veterinarianClinic, dog.veterinarianPhone].filter(Boolean).join(" | ") || ""}`,
  ].join("\n"));
  return [
    "Completed Agreement Fields",
    `Owner legal name: ${responses.ownerLegalName || ""}`,
    `Owner address: ${responses.ownerAddress || ""}`,
    `Owner phone: ${responses.ownerPhone || ""}`,
    `Owner email: ${responses.ownerEmail || ""}`,
    `Emergency contact name: ${responses.emergencyContactName || ""}`,
    `Emergency contact phone: ${responses.emergencyContactPhone || ""}`,
    `Veterinarian or clinic: ${responses.veterinarianClinic || ""}`,
    `Veterinarian phone: ${responses.veterinarianPhone || ""}`,
    `Emergency treatment spending authorization: ${responses.emergencyTreatmentLabel || ""}`,
    `Emergency treatment limit amount: ${responses.emergencyTreatmentLimitAmount ? "$" + responses.emergencyTreatmentLimitAmount : ""}`,
    `Media authorization: ${responses.mediaPreferenceLabel || ""}`,
    `Booking or stay ID: ${responses.bookingOrStayId || ""}`,
    `Completed at: ${responses.completedAt || ""}`,
    dogLines.join("\n\n"),
  ].filter((line) => String(line || "").trim()).join("\n");
}

function customerAgreementSignedDocumentText(responses = {}) {
  return `${customerAgreementText()}\n\n---\n\n${customerAgreementCompletedFieldsText(responses)}`;
}

function customerAgreementCompletionHtml(record = {}) {
  const responses = record?.agreementResponses || null;
  if (!responses) return "";
  const rows = [
    ["Owner legal name", "ownerLegalName"],
    ["Owner address", "ownerAddress"],
    ["Owner phone", "ownerPhone"],
    ["Owner email", "ownerEmail"],
    ["Emergency contact", "emergencyContactName"],
    ["Emergency phone", "emergencyContactPhone"],
    ["Veterinarian or clinic", "veterinarianClinic"],
    ["Veterinarian phone", "veterinarianPhone"],
    ["Treatment authorization", "emergencyTreatmentLabel"],
    ["Treatment amount", "treatmentLimitLabel"],
    ["Media authorization", "mediaPreferenceLabel"],
    ["Booking or stay ID", "bookingOrStayId"],
  ];
  const detailRecord = {
    ...responses,
    treatmentLimitLabel: responses.emergencyTreatmentLimitAmount ? `$${responses.emergencyTreatmentLimitAmount}` : "",
  };
  const dogs = (Array.isArray(responses.dogInformation) ? responses.dogInformation : []).map((dog) => {
    const meta = [
      dog.breedDescription,
      dog.age || dog.dateOfBirth,
      dog.spayNeuterStatus,
    ].filter(Boolean).join(" | ");
    const contacts = [
      [dog.emergencyName, dog.emergencyPhone].filter(Boolean).join(" | "),
      [dog.veterinarianClinic, dog.veterinarianPhone].filter(Boolean).join(" | "),
    ].filter(Boolean).join(" / ");
    return `<li><strong>${escapeHtml(dog.dogName || "Dog")}</strong>${meta ? `<span>${escapeHtml(meta)}</span>` : ""}${contacts ? `<small>${escapeHtml(contacts)}</small>` : ""}</li>`;
  }).join("");
  return `<section class="signed-agreement-responses"><h4>Completed agreement fields</h4><div class="signed-agreement-meta">${detailRows(detailRecord, rows)}</div>${dogs ? `<div class="agreement-dog-summary"><strong>Dog information</strong><ul>${dogs}</ul></div>` : ""}</section>`;
}

function customerAgreementDocumentHtml(record = null) {
  const version = record?.agreementVersion || CUSTOMER_BOARDING_AGREEMENT_VERSION;
  const effectiveDate = record?.agreementEffectiveDate || CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE;
  const title = record?.agreementTitle || CUSTOMER_BOARDING_AGREEMENT_TITLE;
  const markdown = customerAgreementMarkdown(record);
  return `<article class="customer-agreement-copy"><h3>${escapeHtml(title)}</h3><p>Version ${escapeHtml(version)} | Effective ${escapeHtml(effectiveDate)}</p><div class="customer-agreement-markdown">${customerAgreementMarkdownToHtml(markdown)}</div></article>${customerAgreementCompletionHtml(record)}`;
}

function customerAgreementSnapshotIsCurrent(record = {}) {
  if (!record || record.removed) return false;
  const signerEmail = normalizeEmail(record.signerEmail || record.ownerEmail || record.email);
  const currentEmail = normalizeEmail(currentUser?.email);
  return Boolean(currentEmail && signerEmail === currentEmail && record.signedAt && record.signatureHash && record.agreementVersion === CUSTOMER_BOARDING_AGREEMENT_VERSION && (!record.documentFingerprint || record.documentFingerprint === customerAgreementDocumentFingerprint()));
}

function customerAgreementProfileSnapshot(record = {}) {
  return {
    id: record.id || "",
    agreementTitle: record.agreementTitle || CUSTOMER_BOARDING_AGREEMENT_TITLE,
    agreementVersion: record.agreementVersion || CUSTOMER_BOARDING_AGREEMENT_VERSION,
    agreementEffectiveDate: record.agreementEffectiveDate || CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE,
    documentFingerprint: record.documentFingerprint || customerAgreementDocumentFingerprint(),
    documentHash: record.documentHash || "",
    signatureHash: record.signatureHash || "",
    signerName: record.signerName || "",
    signerEmail: normalizeEmail(record.signerEmail || record.ownerEmail || ""),
    signedAt: record.signedAt || "",
    signatureMethod: record.signatureMethod || "drawn-signature-pad",
    electronicConsentAccepted: record.electronicConsentAccepted === true,
    agreementAccepted: record.agreementAccepted === true,
    arbitrationAccepted: record.arbitrationAccepted === true,
    agreementResponses: record.agreementResponses || null,
  };
}

function customerBoardingAgreementsForCurrentUser() {
  const email = normalizeEmail(currentUser?.email);
  if (!email) return [];
  return readRecords("boardingAgreement")
    .filter((record) => !record.removed && normalizeEmail(record.signerEmail || record.ownerEmail) === email)
    .sort((a, b) => new Date(b.signedAt || b.submittedAt || 0) - new Date(a.signedAt || a.submittedAt || 0));
}

function customerCurrentBoardingAgreement() {
  const direct = customerBoardingAgreementsForCurrentUser().find(customerAgreementSnapshotIsCurrent);
  if (direct) return direct;
  const profile = savedUserFor(currentUser) || {};
  const profileAgreement = profile.latestBoardingAgreement || profile.boardingAgreement || null;
  return customerAgreementSnapshotIsCurrent(profileAgreement) ? profileAgreement : null;
}

function renderCustomerAgreementPanel(estimate = customerEstimateDetails()) {
  const panel = $("#customerAgreementPanel");
  if (!panel) return;
  const applies = customerAgreementAppliesToEstimate(estimate);
  panel.hidden = !applies;
  if (!applies) return;
  const currentAgreement = customerCurrentBoardingAgreement();
  const signed = Boolean(currentAgreement);
  const notice = $("#customerAgreementNotice");
  if (notice) {
    notice.hidden = !applies;
    notice.innerHTML = signed
      ? `<strong>Boarding agreement signed</strong><p>Current agreement on file for ${escapeHtml(currentAgreement.signerName || currentUser?.name || "this owner")}.</p>`
      : "<strong>Boarding agreement required</strong><p>This owner must review and e-sign the agreement on the Review step before submitting a boarding request.</p>";
  }
  const status = $("#customerAgreementStatus");
  if (status) {
    status.innerHTML = signed
      ? `<strong>Boarding agreement signed</strong><p>Signed by ${escapeHtml(currentAgreement.signerName || currentUser?.name || "Owner")} on ${escapeHtml(formatDateTime(currentAgreement.signedAt) || currentAgreement.signedAt || "file")}.</p>`
      : "<strong>Boarding agreement required</strong><p>Review and sign before submitting this boarding request.</p>";
  }
  const documentBody = $("#customerAgreementDocument");
  if (documentBody) documentBody.innerHTML = customerAgreementDocumentHtml();
  const details = $("#customerAgreementDetails");
  if (details) details.open = !signed;
  const block = $("#customerSignatureBlock");
  if (block) block.hidden = signed;
  initializeCustomerAgreementControls();
  prefillCustomerAgreementFields(estimate);
  window.setTimeout(() => initializeCustomerAgreementSignaturePad(), 0);
}

function customerSignatureCanvas() {
  return $("#customerSignaturePad");
}

function resizeCustomerSignatureCanvas() {
  const canvas = customerSignatureCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = Math.max(320, Math.round((rect.width || 720) * ratio));
  const height = Math.max(140, Math.round((rect.height || 220) * ratio));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineWidth = 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#102033";
  canvas.classList.toggle("is-empty", !customerAgreementSignatureHasInk);
}

function customerSignaturePoint(event) {
  const canvas = customerSignatureCanvas();
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function updateCustomerSignatureData() {
  const canvas = customerSignatureCanvas();
  const dataField = $("#customerAgreementSignatureData");
  if (!canvas || !dataField) return "";
  dataField.value = customerAgreementSignatureHasInk ? canvas.toDataURL("image/png") : "";
  canvas.classList.toggle("is-empty", !customerAgreementSignatureHasInk);
  return dataField.value;
}

function clearCustomerSignaturePad() {
  const canvas = customerSignatureCanvas();
  const context = canvas?.getContext("2d");
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  customerAgreementSignatureHasInk = false;
  customerAgreementSignatureDrawing = false;
  updateCustomerSignatureData();
}

function initializeCustomerAgreementSignaturePad() {
  const canvas = customerSignatureCanvas();
  if (!canvas) return;
  resizeCustomerSignatureCanvas();
  if (customerAgreementSignaturePadInitialized) return;
  customerAgreementSignaturePadInitialized = true;
  canvas.classList.add("is-empty");
  canvas.addEventListener("pointerdown", (event) => {
    if ($("#customerSignatureBlock")?.hidden) return;
    resizeCustomerSignatureCanvas();
    customerAgreementSignatureDrawing = true;
    customerAgreementSignatureHasInk = true;
    const context = canvas.getContext("2d");
    const point = customerSignaturePoint(event);
    context.fillStyle = "#102033";
    context.beginPath();
    context.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y);
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!customerAgreementSignatureDrawing) return;
    const context = canvas.getContext("2d");
    const point = customerSignaturePoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    event.preventDefault();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    canvas.addEventListener(eventName, (event) => {
      if (!customerAgreementSignatureDrawing) return;
      customerAgreementSignatureDrawing = false;
      updateCustomerSignatureData();
      canvas.releasePointerCapture?.(event.pointerId);
    });
  });
  $("#clearCustomerSignatureButton")?.addEventListener("click", clearCustomerSignaturePad);
  $("#printCustomerAgreementButton")?.addEventListener("click", () => window.print());
  window.addEventListener("resize", () => {
    if (!$("#customerSignatureBlock")?.hidden && !customerAgreementSignatureHasInk) resizeCustomerSignatureCanvas();
  });
}

function validateCustomerAgreementForBooking(estimate = customerEstimateDetails(), options = {}) {
  if (!customerAgreementAppliesToEstimate(estimate)) return true;
  if (customerCurrentBoardingAgreement()) return true;
  renderCustomerAgreementPanel(estimate);
  const signerName = $("#customerAgreementSignerName");
  const ownerAddress = $("#customerAgreementOwnerAddress");
  const ownerPhone = $("#customerAgreementOwnerPhone");
  const ownerEmail = $("#customerAgreementOwnerEmail");
  const emergencyName = $("#customerAgreementEmergencyName");
  const emergencyPhone = $("#customerAgreementEmergencyPhone");
  const vetClinic = $("#customerAgreementVetClinic");
  const vetPhone = $("#customerAgreementVetPhone");
  const treatmentChoice = customerAgreementCheckedField("agreementEmergencyTreatmentChoice");
  const treatmentAmount = $("#customerAgreementTreatmentLimitAmount");
  const mediaPreference = customerAgreementCheckedField("agreementMediaPreference");
  const electronicConsent = $("#customerAgreementElectronicConsent");
  const accepted = $("#customerAgreementAccepted");
  const arbitrationAccepted = $("#customerAgreementArbitrationAccepted");
  const signatureData = $("#customerAgreementSignatureData")?.value || "";
  const signatureError = $("#customerAgreementSignatureError");
  [
    signerName,
    ownerAddress,
    ownerPhone,
    ownerEmail,
    emergencyName,
    emergencyPhone,
    vetClinic,
    vetPhone,
    treatmentAmount,
    electronicConsent,
    accepted,
    arbitrationAccepted,
    ...$$('input[name="agreementEmergencyTreatmentChoice"]'),
    ...$$('input[name="agreementMediaPreference"]'),
  ].forEach((field) => field && clearFieldError(field));
  if (signatureError) {
    signatureError.textContent = "Complete the required agreement fields before submitting.";
    signatureError.hidden = true;
  }
  let firstInvalid = null;
  let message = "";
  const requireText = (field, fieldMessage) => {
    if (String(field?.value || "").trim()) return;
    if (field) setFieldError(field, fieldMessage);
    firstInvalid = firstInvalid || field;
    message = message || fieldMessage;
  };
  if (!String(signerName?.value || "").trim()) {
    requireText(signerName, "Owner legal name is required before signing.");
  }
  requireText(ownerAddress, "Owner address is required before signing.");
  requireText(ownerPhone, "Owner phone is required before signing.");
  requireText(ownerEmail, "Owner email is required before signing.");
  requireText(emergencyName, "Emergency contact name is required before signing.");
  requireText(emergencyPhone, "Emergency contact phone is required before signing.");
  requireText(vetClinic, "Veterinarian or clinic is required before signing.");
  requireText(vetPhone, "Veterinarian phone is required before signing.");
  if (!treatmentChoice) {
    const firstTreatmentChoice = document.querySelector('#customerBookingForm input[name="agreementEmergencyTreatmentChoice"]');
    if (firstTreatmentChoice) setFieldError(firstTreatmentChoice, "Select an emergency treatment authorization.");
    firstInvalid = firstInvalid || firstTreatmentChoice;
    message = message || "Select an emergency treatment authorization.";
  }
  if (treatmentChoice?.value === "limit" && (!String(treatmentAmount?.value || "").trim() || Number(treatmentAmount?.value || 0) <= 0)) {
    if (treatmentAmount) setFieldError(treatmentAmount, "Enter the approved emergency treatment amount.");
    firstInvalid = firstInvalid || treatmentAmount;
    message = message || "Enter the approved emergency treatment amount.";
  }
  if (!mediaPreference) {
    const firstMediaPreference = document.querySelector('#customerBookingForm input[name="agreementMediaPreference"]');
    if (firstMediaPreference) setFieldError(firstMediaPreference, "Select a media authorization preference.");
    firstInvalid = firstInvalid || firstMediaPreference;
    message = message || "Select a media authorization preference.";
  }
  if (!signatureData || !customerAgreementSignatureHasInk) {
    message = message || "Draw your signature before submitting.";
    firstInvalid = firstInvalid || customerSignatureCanvas();
  }
  if (!electronicConsent?.checked) {
    if (electronicConsent) setFieldError(electronicConsent, "Electronic records consent is required before signing.");
    firstInvalid = firstInvalid || electronicConsent;
    message = message || "Electronic records consent is required before signing.";
  }
  if (!accepted?.checked) {
    if (accepted) setFieldError(accepted, "Agreement acceptance is required before signing.");
    firstInvalid = firstInvalid || accepted;
    message = message || "Agreement acceptance is required before signing.";
  }
  if (!arbitrationAccepted?.checked) {
    if (arbitrationAccepted) setFieldError(arbitrationAccepted, "Separate arbitration acceptance is required before signing.");
    firstInvalid = firstInvalid || arbitrationAccepted;
    message = message || "Separate arbitration acceptance is required before signing.";
  }
  if (firstInvalid) {
    if (signatureError) {
      signatureError.textContent = message || "Complete the required agreement fields before submitting.";
      signatureError.hidden = false;
    }
    $("#customerAgreementPanel")?.scrollIntoView({ behavior: options.behavior || "smooth", block: "center" });
    if (typeof firstInvalid.focus === "function") firstInvalid.focus({ preventScroll: true });
    showToast(message || "Review and sign the boarding agreement before continuing.");
    return false;
  }
  return true;
}

function customerAgreementRequestContext(estimate = {}) {
  const dogs = uniqueCustomerBookingDogs(estimate.dogs || []);
  return {
    submissionId: estimate.submissionId || "",
    requestGroupId: estimate.requestGroupId || "",
    requestMode: estimate.isServiceRequest ? "service" : "boarding",
    dogNames: dogs.map((dog) => dog.dogName || "Dog"),
    dogIds: dogs.map((dog) => dog.id || dog.sourceBoardingDogId || "").filter(Boolean),
    dropoffTime: estimate.dropoffTime || "",
    pickupTime: estimate.pickupTime || "",
    estimatedTotal: estimate.total || 0,
  };
}

async function createCustomerBoardingAgreementRecord(estimate = {}) {
  const signerName = String($("#customerAgreementSignerName")?.value || currentUser?.name || "").trim();
  const signerEmail = normalizeEmail(currentUser?.email);
  const signatureImageData = $("#customerAgreementSignatureData")?.value || "";
  const signedAt = new Date().toISOString();
  const agreementMarkdown = customerAgreementMarkdown();
  const agreementResponses = {
    ...customerAgreementResponsePayload(estimate),
    completedAt: signedAt,
    bookingOrStayId: estimate.submissionId || estimate.requestGroupId || estimate.id || "",
  };
  const documentText = customerAgreementSignedDocumentText(agreementResponses);
  const documentHash = await customerAgreementSha256Hex(documentText);
  const signatureHash = await customerAgreementSha256Hex([signatureImageData, signerName, signerEmail, documentHash, signedAt].join("|"));
  return {
    type: "boardingAgreement",
    id: uid("boardingAgreement"),
    submittedAt: signedAt,
    signedAt,
    agreementTitle: CUSTOMER_BOARDING_AGREEMENT_TITLE,
    agreementVersion: CUSTOMER_BOARDING_AGREEMENT_VERSION,
    agreementEffectiveDate: CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE,
    agreementClauses: customerAgreementClauses(),
    agreementMarkdown,
    agreementText: documentText,
    documentFingerprint: customerAgreementDocumentFingerprint(),
    documentHash,
    signerName,
    signerEmail,
    ownerName: currentUser?.name || signerName,
    ownerEmail: signerEmail,
    signerUserId: currentUser?.key || currentUser?.authId || "",
    signerAuthProvider: currentUser?.authProvider || "",
    signerRole: currentRole(),
    signatureMethod: "drawn-signature-pad",
    signatureImageData,
    signatureHash,
    electronicConsentAccepted: true,
    agreementAccepted: true,
    arbitrationAccepted: true,
    agreementResponses,
    electronicConsentText: CUSTOMER_BOARDING_AGREEMENT_CONSENT_TEXT,
    signatureIntentText: CUSTOMER_BOARDING_AGREEMENT_INTENT_TEXT,
    signedUserAgent: navigator.userAgent || "",
    signedLocale: navigator.language || "",
    signedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    signedLocationHref: location.href || "",
    signedIpAddress: "",
    ipAddressSource: "not-collected-client-side",
    deviceAudit: {
      platform: navigator.platform || "",
      vendor: navigator.vendor || "",
      maxTouchPoints: navigator.maxTouchPoints || 0,
      viewportWidth: window.innerWidth || 0,
      viewportHeight: window.innerHeight || 0,
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    requestContext: customerAgreementRequestContext(estimate),
    auditEvents: [{ action: "viewed-and-signed", at: signedAt, signerEmail, userId: currentUser?.key || currentUser?.authId || "", documentFingerprint: customerAgreementDocumentFingerprint() }],
    removed: false,
  };
}

async function saveCustomerAgreementToProfile(record = {}) {
  if (!currentUser?.email) return null;
  const existing = savedUserFor(currentUser) || {};
  const agreementSnapshot = customerAgreementProfileSnapshot(record);
  const updatedProfile = upsertRecord("settingsUser", {
    ...profileRecordForUser(currentUser),
    ...existing,
    latestBoardingAgreement: agreementSnapshot,
    boardingAgreementSignedAt: agreementSnapshot.signedAt,
    boardingAgreementVersion: agreementSnapshot.agreementVersion,
    boardingAgreementRecordIds: mergeUniqueIds(existing.boardingAgreementRecordIds || [], [record.id]),
    removed: false,
  });
  currentUser.latestBoardingAgreement = agreementSnapshot;
  currentUser.boardingAgreementSignedAt = agreementSnapshot.signedAt;
  currentUser.boardingAgreementVersion = agreementSnapshot.agreementVersion;
  localStorage.setItem(stateKeys.session, JSON.stringify(currentUser));
  await sendPayload(updatedProfile);
  return updatedProfile;
}

async function ensureCustomerBoardingAgreementForEstimate(estimate = {}) {
  if (!customerAgreementAppliesToEstimate(estimate)) return null;
  const existing = customerCurrentBoardingAgreement();
  if (existing) return customerAgreementProfileSnapshot(existing);
  if (!validateCustomerAgreementForBooking(estimate, { behavior: "auto" })) return null;
  const payload = await createCustomerBoardingAgreementRecord(estimate);
  const record = upsertRecord("boardingAgreement", payload);
  await sendPayload(record);
  await saveCustomerAgreementToProfile(record);
  renderCustomerFiles();
  renderCustomerAgreementPanel(estimate);
  clearCustomerSignaturePad();
  return customerAgreementProfileSnapshot(record);
}

function customerAgreementDetailHtml(record = {}) {
  const rows = [
    ["Signer", "signerName"],
    ["Email", "signerEmail"],
    ["Signed", "signedLabel"],
    ["Version", "agreementVersion"],
    ["Electronic records consent", "electronicConsentAcceptedLabel"],
    ["General agreement accepted", "agreementAcceptedLabel"],
    ["Arbitration accepted", "arbitrationAcceptedLabel"],
    ["Document hash", "documentHash"],
    ["Signature hash", "signatureHash"],
  ];
  const detailRecord = {
    ...record,
    signedLabel: formatDateTime(record.signedAt) || record.signedAt || "",
    electronicConsentAcceptedLabel: record.electronicConsentAccepted ? "Yes" : "",
    agreementAcceptedLabel: record.agreementAccepted ? "Yes" : "",
    arbitrationAcceptedLabel: record.arbitrationAccepted ? "Yes" : "",
  };
  const signature = record.signatureImageData ? `<img class="signed-agreement-signature" src="${escapeHtml(record.signatureImageData)}" alt="Saved signature" />` : "";
  return customerAgreementDocumentHtml(record) + `<section class="signed-agreement-meta">${detailRows(detailRecord, rows)}</section>` + signature;
}

function openCustomerAgreementDetail(id = "") {
  const record = readRecords("boardingAgreement").find((item) => item.id === id && !item.removed);
  if (!record || normalizeEmail(record.signerEmail || record.ownerEmail) !== normalizeEmail(currentUser?.email)) {
    showToast("This agreement could not be opened.");
    return;
  }
  showDetailDialog("Signed Boarding Agreement", customerAgreementDetailHtml(record));
}

async function mirrorBoardingCustomerUpdateToCustomerDog(boardingRecord = {}, update = {}) {
  const linkedDog = linkedCustomerDogForBoarding(boardingRecord);
  if (!linkedDog?.id || linkedDog.isSharedBoardingDog) return null;
  const existingUpdates = linkedDog.customerUpdates || [];
  const nextUpdate = {
    ...update,
    sourceBoardingDogId: boardingRecord.id || "",
    linkedBoardingDogId: boardingRecord.id || "",
    dogName: boardingRecord.dogName || linkedDog.dogName || "",
  };
  const updates = [nextUpdate, ...existingUpdates.filter((item) => item.id !== update.id)];
  const updatedDog = upsertRecord("customerDog", {
    ...linkedDog,
    customerUpdates: updates,
    linkedBoardingDogId: boardingRecord.id || linkedDog.linkedBoardingDogId || "",
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updatedDog);
  return updatedDog;
}

function boardingDraftFromCustomerDog(dog = {}) {
  const combinedStatus = combinedDogSpayNeuterStatus(dog);
  return {
    dogName: dog.dogName || "",
    breedDescription: dog.breedDescription || "",
    sex: sexFromCombinedDogSpayNeuterStatus(combinedStatus) || dog.sex || "Unknown",
    spayNeuterStatus: combinedStatus,
    ownerName: dog.ownerName || "",
    ownerPhone: dog.ownerPhone || "",
    ownerEmail: dog.ownerEmail || dog.customerEmail || "",
    customerEmail: dog.customerEmail || dog.ownerEmail || "",
    emergencyName: dog.emergencyName || "",
    emergencyPhone: dog.emergencyPhone || "",
    vetInfo: dog.vetInfo || "",
    rabiesDate: dog.rabiesDate || "",
    dhppDate: dog.dhppDate || "",
    rabiesGoodThreeYears: dog.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(dog, "rabies") ? "Yes" : ""),
    dhppGoodThreeYears: dog.dhppGoodThreeYears || (vaccineDurationIsThreeYears(dog, "dhpp") ? "Yes" : ""),
    rabiesDuration: dog.rabiesDuration || (vaccineDurationIsThreeYears(dog, "rabies") ? "3 years" : ""),
    dhppDuration: dog.dhppDuration || (vaccineDurationIsThreeYears(dog, "dhpp") ? "3 years" : ""),
    bordetellaDate: dog.bordetellaDate || "",
    heartwormDate: dog.heartwormDate || "",
    specialCare: dog.specialCare || "",
    profilePhotoUrl: dog.profilePhotoUrl || "",
    profilePhotoPath: profilePhotoStoragePath(dog),
    profilePhotoData: dog.profilePhotoData || "",
    profilePhotoSourceRecordId: dog.profilePhotoSourceRecordId || dog.profilePhotoRecordId || dog.sourceRecordId || dog.id || "",
    profilePhotoSourceRecordType: dog.profilePhotoSourceRecordType || dog.profilePhotoRecordType || dog.sourceRecordType || dog.type || "customerDog",
    vaccinationRecords: dog.vaccinationRecords || [],
    vaccinationFiles: dog.vaccinationFiles || "",
    linkedCustomerDogId: dog.id || "",
    linkedOwnerEmail: dog.ownerEmail || dog.customerEmail || "",
    entrySource: "customer-profile",
  };
}

const canonicalDogProfileFields = [
  "dogName",
  "breedDescription",
  "dateOfBirth",
  "sex",
  "spayNeuterStatus",
  "ownerName",
  "ownerPhone",
  "ownerEmail",
  "customerEmail",
  "secondaryOwnerEmail",
  "emergencyName",
  "emergencyPhone",
  "vetInfo",
  "foodInstructions",
  "specialCare",
  "rabiesDate",
  "dhppDate",
  "bordetellaDate",
  "heartwormDate",
  "rabiesGoodThreeYears",
  "dhppGoodThreeYears",
  "rabiesDuration",
  "dhppDuration",
  "profilePhotoUrl",
  "profilePhotoPath",
  "profilePhotoData",
  "profilePhotoMeta",
  "profilePhotoSourceRecordId",
  "profilePhotoSourceRecordType",
  "vaccinationRecords",
  "vaccinationFiles",
];

function dogProfileFieldPatch(source = {}) {
  return canonicalDogProfileFields.reduce((patch, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) patch[field] = source[field];
    return patch;
  }, {});
}

function boardingDogWithCanonicalProfile(record = {}) {
  if (!record?.id) return record || {};
  const linked = linkedCustomerDogForBoarding(record);
  if (!linked?.id || linked.isSharedBoardingDog) return record;
  const profilePatch = dogProfileFieldPatch(linked);
  return {
    ...record,
    ...profilePatch,
    id: record.id,
    type: "boardingDog",
    linkedCustomerDogId: linked.id,
    linkedOwnerEmail: linked.ownerEmail || linked.customerEmail || record.linkedOwnerEmail || "",
    customerEmail: linked.customerEmail || linked.ownerEmail || record.customerEmail || "",
  };
}

function boardingDogWithCustomerProfilePatch(record = {}, customerDog = {}) {
  const profilePatch = dogProfileFieldPatch(customerDog);
  return {
    ...record,
    ...profilePatch,
    id: record.id,
    type: "boardingDog",
    linkedCustomerDogId: customerDog.id || record.linkedCustomerDogId || "",
    linkedOwnerEmail: customerDog.ownerEmail || customerDog.customerEmail || record.linkedOwnerEmail || "",
    customerEmail: customerDog.customerEmail || customerDog.ownerEmail || record.customerEmail || "",
  };
}

function matchingCustomerDogForBoardingProfile(record = {}) {
  const linked = linkedCustomerDogForBoarding(record);
  if (linked?.id && !linked.isSharedBoardingDog) return linked;
  const ownerEmails = boardingOwnerEmails(record);
  const dogName = String(record.dogName || "").trim().toLowerCase();
  if (!dogName || !ownerEmails.length) return null;
  return readRecords("customerDog").find((dog) => {
    if (dog.removed) return false;
    if (record.linkedCustomerDogId && dog.id === record.linkedCustomerDogId) return true;
    const dogEmails = uniqueEmails(dog.ownerEmail, dog.customerEmail);
    return dogEmails.some((email) => ownerEmails.includes(email))
      && String(dog.dogName || "").trim().toLowerCase() === dogName;
  }) || null;
}

async function saveCanonicalCustomerDogForBoarding(record = {}, previousRecord = {}) {
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail || record.linkedOwnerEmail);
  if (!ownerEmail || !record.dogName) return null;
  const existingDog = matchingCustomerDogForBoardingProfile(record) || matchingCustomerDogForBoardingProfile(previousRecord) || {};
  const profilePatch = dogProfileFieldPatch(record);
  const payload = {
    ...existingDog,
    ...profilePatch,
    type: "customerDog",
    id: existingDog.id || record.linkedCustomerDogId || uid("customerDog"),
    submittedAt: existingDog.submittedAt || record.submittedAt || new Date().toISOString(),
    ownerEmail,
    customerEmail: ownerEmail,
    ownerName: record.ownerName || existingDog.ownerName || "",
    linkedBoardingDogId: record.id || previousRecord.id || existingDog.linkedBoardingDogId || "",
    sourceBoardingDogId: record.id || previousRecord.id || existingDog.sourceBoardingDogId || "",
    sourceType: "boardingDog",
    removed: false,
  };
  const saved = upsertRecord("customerDog", payload);
  await sendPayload(saved);
  return saved;
}

function stableLegacyPart(value = "") {
  return String(value || "none")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "none";
}

function stableLegacyId(prefix = "legacy", ...parts) {
  return [prefix, ...parts.map(stableLegacyPart)].join("-");
}

function latestRecord(records = []) {
  return [...records].filter(Boolean).sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0))[0] || {};
}

function earliestTimestamp(records = []) {
  return [...records]
    .map((record) => record?.submittedAt || record?.createdAt || record?.updatedAt || "")
    .filter(Boolean)
    .sort()[0] || new Date().toISOString();
}

function legacyDogRecordDiffers(existing = {}, next = {}) {
  const scrub = (record = {}) => {
    const copy = { ...record };
    delete copy.updatedAt;
    return copy;
  };
  return JSON.stringify(scrub(existing)) !== JSON.stringify(scrub(next));
}

async function upsertDerivedRecord(type = "", payload = {}) {
  if (!type || !payload?.id) return null;
  const existing = readRecords(type).find((record) => record.id === payload.id);
  const next = {
    ...(existing || {}),
    ...payload,
    submittedAt: existing?.submittedAt || payload.submittedAt || new Date().toISOString(),
    removed: false,
  };
  if (existing && !legacyDogRecordDiffers(existing, next)) return null;
  const saved = upsertRecord(type, next);
  await sendPayload(saved);
  return saved;
}

function canonicalDogIdForLegacyCustomerDog(customerDog = {}) {
  const existing = readRecords("legacyDogLink").find((link) => !link.removed && link.oldCustomerDogId === customerDog.id);
  return existing?.dogId || stableLegacyId("dog", "customer", customerDog.id);
}

function canonicalDogIdForLegacyBoardingDog(boardingDog = {}) {
  const existing = readRecords("legacyDogLink").find((link) => !link.removed && link.oldBoardingDogId === boardingDog.id);
  return existing?.dogId || stableLegacyId("dog", "boarding", boardingDog.id);
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

function legacyCustomerDogForBoardingDog(record = {}, customerDogs = []) {
  if (!record?.id) return null;
  if (record.linkedCustomerDogId) {
    const linked = customerDogs.find((dog) => dog.id === record.linkedCustomerDogId && !dog.removed);
    if (linked) return { dog: linked, matchType: "linkedCustomerDogId", needsReview: false };
  }
  const explicit = customerDogs.find((dog) => !dog.removed && customerDogHasBoardingLink(dog, record.id));
  if (explicit) return { dog: explicit, matchType: "customerDogBoardingLink", needsReview: false };
  const uniqueMatch = uniqueEmailNameCustomerMatch(record, customerDogs);
  return uniqueMatch ? { dog: uniqueMatch, matchType: "uniqueEmailAndDogName", needsReview: true } : null;
}

function mergedLegacyVaccinationRecords(records = []) {
  const byKey = new Map();
  records.flatMap((record) => record.vaccinationRecords || []).forEach((item) => {
    const key = item.id || item.url || item.dataUrl || item.name || JSON.stringify(item);
    if (!key || byKey.has(key)) return;
    byKey.set(key, item);
  });
  return [...byKey.values()];
}

function canonicalDogPayloadFromLegacy(dogId = "", sources = {}) {
  const customerDogs = sources.customerDogs || [];
  const boardingDogs = sources.boardingDogs || [];
  const customerDog = latestRecord(customerDogs);
  const boardingDog = chooseBoardingProfilePrimary(boardingDogs) || latestRecord(boardingDogs);
  const ownerEmail = normalizeEmail(customerDog.ownerEmail || customerDog.customerEmail || boardingDog.ownerEmail || boardingDog.customerEmail || boardingDog.linkedOwnerEmail);
  const ownerAccount = ownerEmail ? savedUserFor({ email: ownerEmail }) || {} : {};
  const allSources = [...customerDogs, ...boardingDogs];
  return {
    type: "dog",
    id: dogId,
    submittedAt: earliestTimestamp(allSources),
    dogName: customerDog.dogName || boardingDog.dogName || "Dog",
    ownerUserId: ownerAccount.id || "",
    ownerEmail,
    ownerName: customerDog.ownerName || boardingDog.ownerName || ownerAccount.name || "",
    ownerPhone: customerDog.ownerPhone || boardingDog.ownerPhone || "",
    secondaryOwnerEmail: normalizeEmail(customerDog.secondaryOwnerEmail || boardingDog.secondaryOwnerEmail),
    breed: customerDog.breed || customerDog.breedDescription || boardingDog.breed || boardingDog.breedDescription || "",
    breedDescription: customerDog.breedDescription || boardingDog.breedDescription || "",
    sex: customerDog.sex || boardingDog.sex || "Unknown",
    birthday: customerDog.birthday || customerDog.dateOfBirth || boardingDog.birthday || boardingDog.dateOfBirth || "",
    weight: customerDog.weight || boardingDog.weight || "",
    notes: customerDog.notes || "",
    feedingInstructions: customerDog.foodInstructions || boardingDog.foodInstructions || "",
    medicationInstructions: customerDog.medicationInstructions || boardingDog.medicationInstructions || "",
    emergencyName: customerDog.emergencyName || boardingDog.emergencyName || "",
    emergencyPhone: customerDog.emergencyPhone || boardingDog.emergencyPhone || "",
    vetInfo: customerDog.vetInfo || boardingDog.vetInfo || "",
    temperamentNotes: boardingDog.temperamentNotes || boardingDog.handlingNotes || "",
    medicalNotes: customerDog.medicalNotes || boardingDog.medicalNotes || customerDog.specialCare || boardingDog.specialCare || "",
    specialInstructions: customerDog.specialInstructions || boardingDog.specialInstructions || customerDog.specialCare || boardingDog.specialCare || "",
    vaccinationRecords: mergedLegacyVaccinationRecords(allSources),
    vaccinationFiles: customerDog.vaccinationFiles || boardingDog.vaccinationFiles || "",
    dhppDate: customerDog.dhppDate || boardingDog.dhppDate || "",
    rabiesDate: customerDog.rabiesDate || boardingDog.rabiesDate || "",
    rabiesDuration: customerDog.rabiesDuration || boardingDog.rabiesDuration || "",
    dhppDuration: customerDog.dhppDuration || boardingDog.dhppDuration || "",
    rabiesGoodThreeYears: customerDog.rabiesGoodThreeYears || boardingDog.rabiesGoodThreeYears || "",
    dhppGoodThreeYears: customerDog.dhppGoodThreeYears || boardingDog.dhppGoodThreeYears || "",
    bordetellaDate: customerDog.bordetellaDate || boardingDog.bordetellaDate || "",
    heartwormDate: customerDog.heartwormDate || boardingDog.heartwormDate || "",
    profilePhotoUrl: customerDog.profilePhotoUrl || boardingDogPhotoSource(boardingDog) || "",
    profileStatus: customerDog.id || ownerAccount.id ? "claimed" : "unclaimed",
    source: customerDog.id ? (boardingDog.id ? "legacy_customer_and_boarding" : "legacy_customerDog") : "legacy_boardingDog",
    legacyCustomerDogIds: customerDogs.map((dog) => dog.id).filter(Boolean),
    legacyBoardingDogIds: boardingDogs.map((dog) => dog.id).filter(Boolean),
    migrationVersion: "legacy-dog-model-v1",
    migrationNeedsReview: Boolean(sources.needsReview),
    migrationMatchTypes: [...(sources.matchTypes || new Set())],
    removed: false,
  };
}

function reservationStatusFromLegacy(record = {}, stay = {}) {
  const status = stay.status || normalizeBoardingStatus(record);
  if (status === "Cancelled") return "cancelled";
  if (status === "Checked Out") return "checked_out";
  if (["Checked In", "In Kennel", "Ready For Pickup"].includes(status)) return "checked_in";
  if (status === "Approved") return "approved";
  if (status === "Declined") return "declined";
  if (record.customerRequest || status === "Pending") return "pending_customer_request";
  return "draft";
}

function legacyReservationSourcesForBoardingDog(record = {}) {
  const stays = record.stays || [];
  if (stays.length) return stays.map((stay, index) => ({ stay, index, synthetic: false }));
  const needsSynthetic = record.customerRequest || (record.requestedServices || []).length || record.dropoffTime || record.pickupTime || record.estimatedTotal;
  return needsSynthetic ? [{ stay: {}, index: 0, synthetic: true }] : [];
}

function legacyReservationId(record = {}, stay = {}, index = 0) {
  return stableLegacyId("boardingReservation", record.id, stay.id || stay.dropoffTime || "root", stay.pickupTime || index);
}

function canonicalReservationPayload(record = {}, dogId = "", stay = {}, index = 0) {
  const reservationId = legacyReservationId(record, stay, index);
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail || record.linkedOwnerEmail || record.requestedByEmail);
  const ownerAccount = ownerEmail ? savedUserFor({ email: ownerEmail }) || {} : {};
  return {
    type: "boardingReservation",
    id: reservationId,
    submittedAt: stay.createdAt || record.submittedAt || new Date().toISOString(),
    dogId,
    customerUserId: ownerAccount.id || "",
    customerEmail: ownerEmail,
    status: reservationStatusFromLegacy(record, stay),
    dropoffTime: stay.dropoffTime || record.dropoffTime || "",
    pickupTime: stay.pickupTime || record.pickupTime || "",
    estimatedTotal: Number(stay.estimatedTotal || record.estimatedTotal || 0),
    billingDays: Number(stay.billingDays || record.billingDays || 0),
    stayType: stay.stayType || record.stayType || "Boarding",
    createdBy: record.requestedByEmail || record.createdByEmail || record.ownerEmail || "",
    createdByName: record.requestedByName || record.createdByName || record.ownerName || "",
    notes: stay.stayNotes || record.stayNotes || "",
    legacyBoardingDogId: record.id || "",
    legacyStayId: stay.id || "",
    migrationVersion: "legacy-dog-model-v1",
    removed: false,
  };
}

function structuredReservationServicePayloads(record = {}, reservation = {}, includeRootServices = false) {
  const services = [];
  (reservation.legacyStayRequests || []).forEach((requestText, index) => {
    const original = String(requestText || "").trim();
    if (!original) return;
    services.push({
      type: "reservationService",
      id: stableLegacyId("reservationService", reservation.id, "stay-request", index, original),
      submittedAt: reservation.submittedAt,
      reservationId: reservation.id,
      serviceName: original.replace(/\s+requested$/i, "") || original,
      quantity: 1,
      unitPrice: 0,
      status: "requested",
      notes: original,
      legacyBoardingDogId: record.id || "",
      legacyStayId: reservation.legacyStayId || "",
      legacySource: "stay.requests",
      removed: false,
    });
  });
  if (includeRootServices) {
    (record.requestedServices || []).forEach((service, index) => {
      const serviceName = typeof service === "object" ? service.serviceName || service.name || service.id || "Service" : String(service || "Service");
      services.push({
        type: "reservationService",
        id: stableLegacyId("reservationService", reservation.id, "requested-service", index, serviceName),
        submittedAt: reservation.submittedAt,
        reservationId: reservation.id,
        serviceId: typeof service === "object" ? service.id || "" : "",
        serviceName,
        quantity: Number(typeof service === "object" ? service.quantity || 1 : 1),
        unitPrice: Number(typeof service === "object" ? service.unitPrice || service.basePrice || 0 : 0),
        status: "requested",
        notes: typeof service === "object" ? service.notes || service.pricingNotes || "" : String(service || ""),
        legacyBoardingDogId: record.id || "",
        legacySource: "boardingDog.requestedServices",
        removed: false,
      });
    });
  }
  return services;
}

function vaccinationPayloadsForDog(dog = {}) {
  const dateFields = [
    ["dhppDate", "DHPP"],
    ["rabiesDate", "Rabies"],
    ["bordetellaDate", "Bordetella"],
    ["heartwormDate", "Heartworm"],
  ];
  const payloads = dateFields
    .filter(([field]) => dog[field])
    .map(([field, label]) => ({
      type: "dogVaccination",
      id: stableLegacyId("dogVaccination", dog.id, field, dog[field]),
      submittedAt: dog.submittedAt,
      dogId: dog.id,
      vaccineType: label,
      vaccinationDate: dog[field],
      duration: field === "rabiesDate"
        ? dog.rabiesDuration || (vaccineDurationIsThreeYears(dog, "rabies") ? "3 years" : "")
        : field === "dhppDate"
          ? dog.dhppDuration || (vaccineDurationIsThreeYears(dog, "dhpp") ? "3 years" : "")
          : "",
      source: "legacy-dog-field",
      removed: false,
    }));
  (dog.vaccinationRecords || []).forEach((file, index) => {
    const key = file.id || file.url || file.dataUrl || file.name || index;
    payloads.push({
      type: "dogVaccination",
      id: stableLegacyId("dogVaccination", dog.id, "file", key),
      submittedAt: dog.submittedAt,
      dogId: dog.id,
      vaccineType: file.vaccineType || "Uploaded record",
      vaccinationDate: file.vaccinationDate || "",
      fileName: file.name || "",
      fileUrl: file.url || file.dataUrl || "",
      source: "legacy-vaccination-record",
      removed: false,
    });
  });
  return payloads;
}

function internalNotePayloadsForLegacyBoardingDog(record = {}, dogId = "") {
  const noteFields = [
    ["boardingHistory", "boarding_history"],
    ["dailyActivity", "daily_activity"],
    ["pickupReadyNote", "pickup_ready"],
    ["checkoutNote", "checkout"],
  ];
  return noteFields
    .filter(([field]) => record[field])
    .map(([field, noteType]) => ({
      type: "dogInternalNote",
      id: stableLegacyId("dogInternalNote", dogId, record.id, field),
      submittedAt: record.submittedAt || new Date().toISOString(),
      dogId,
      createdByStaffId: record.updatedByEmail || record.createdByEmail || "",
      noteType,
      note: record[field],
      visibleToCustomer: false,
      legacyBoardingDogId: record.id || "",
      removed: false,
    }));
}

function customerUpdatePayloadsForLegacyBoardingDog(record = {}, dogId = "", reservationIdsByStayId = new Map()) {
  return (record.customerUpdates || []).map((update, index) => ({
    type: "reservationCustomerUpdate",
    id: stableLegacyId("reservationCustomerUpdate", record.id, update.id || update.createdAt || index),
    submittedAt: update.createdAt || record.submittedAt || new Date().toISOString(),
    dogId,
    reservationId: reservationIdsByStayId.get(update.stayId || "") || reservationIdsByStayId.get("__first__") || "",
    title: update.title || "Customer update",
    note: update.note || "",
    mediaItems: update.mediaItems || [],
    visibleToCustomer: true,
    createdByStaffId: update.byEmail || update.createdByEmail || "",
    legacyBoardingDogId: record.id || "",
    legacyUpdateId: update.id || "",
    removed: false,
  }));
}

function userDogAccessPayload(user = {}, dogId = "", role = "owner", source = "legacy") {
  if (!user?.id || !dogId) return null;
  return {
    type: "userDogAccess",
    id: stableLegacyId("userDogAccess", user.id, dogId, role),
    submittedAt: user.submittedAt || new Date().toISOString(),
    userId: user.id,
    userEmail: normalizeEmail(user.email),
    dogId,
    role,
    source,
    removed: false,
  };
}

function dogClaimRequestPayload(dog = {}) {
  const contactKey = dog.ownerEmail || dog.ownerPhone;
  if (!dog?.id || !contactKey || dog.profileStatus !== "unclaimed") return null;
  return {
    type: "dogClaimRequest",
    id: stableLegacyId("dogClaimRequest", dog.id, contactKey),
    submittedAt: dog.submittedAt || new Date().toISOString(),
    dogId: dog.id,
    customerEmail: normalizeEmail(dog.ownerEmail),
    customerPhone: dog.ownerPhone || "",
    status: "pending",
    createdByStaffId: "",
    legacyCustomerDogIds: dog.legacyCustomerDogIds || [],
    legacyBoardingDogIds: dog.legacyBoardingDogIds || [],
    removed: false,
  };
}

function buildLegacyDogModelMigration() {
  const customerDogs = readRecords("customerDog").filter((dog) => !dog.removed);
  const boardingDogs = readRecords("boardingDog").filter((dog) => !dog.removed);
  const settings = settingsUsers().filter((user) => !user.removed);
  const sourcesByDog = new Map();
  const customerDogToDogId = new Map();
  const boardingDogToDogId = new Map();
  const boardingDogMatch = new Map();
  const ensureSource = (dogId) => {
    if (!sourcesByDog.has(dogId)) sourcesByDog.set(dogId, { customerDogs: [], boardingDogs: [], matchTypes: new Set(), needsReview: false });
    return sourcesByDog.get(dogId);
  };

  customerDogs.forEach((customerDog) => {
    const dogId = canonicalDogIdForLegacyCustomerDog(customerDog);
    customerDogToDogId.set(customerDog.id, dogId);
    ensureSource(dogId).customerDogs.push(customerDog);
  });

  boardingDogs.forEach((boardingDog) => {
    const match = legacyCustomerDogForBoardingDog(boardingDog, customerDogs);
    const dogId = match?.dog?.id ? customerDogToDogId.get(match.dog.id) || canonicalDogIdForLegacyCustomerDog(match.dog) : canonicalDogIdForLegacyBoardingDog(boardingDog);
    boardingDogToDogId.set(boardingDog.id, dogId);
    if (match?.dog?.id) {
      customerDogToDogId.set(match.dog.id, dogId);
      boardingDogMatch.set(boardingDog.id, match);
    }
    const source = ensureSource(dogId);
    if (match?.dog?.id && !source.customerDogs.some((dog) => dog.id === match.dog.id)) source.customerDogs.push(match.dog);
    source.boardingDogs.push(boardingDog);
    if (match?.matchType) source.matchTypes.add(match.matchType);
    source.needsReview = source.needsReview || Boolean(match?.needsReview);
  });

  const records = [];
  const reservationsByBoardingDog = new Map();
  sourcesByDog.forEach((sources, dogId) => {
    const dog = canonicalDogPayloadFromLegacy(dogId, sources);
    records.push(["dog", dog]);
    records.push(...vaccinationPayloadsForDog(dog).map((record) => ["dogVaccination", record]));
    sources.customerDogs.forEach((customerDog) => {
      records.push(["legacyDogLink", {
        type: "legacyDogLink",
        id: stableLegacyId("legacyDogLink", dogId, "customer", customerDog.id),
        submittedAt: customerDog.submittedAt || dog.submittedAt,
        dogId,
        oldCustomerDogId: customerDog.id,
        oldBoardingDogId: "",
        matchType: "customerDogSource",
        needsReview: false,
        migrationVersion: "legacy-dog-model-v1",
        removed: false,
      }]);
    });
    sources.boardingDogs.forEach((boardingDog) => {
      const match = boardingDogMatch.get(boardingDog.id);
      records.push(["legacyDogLink", {
        type: "legacyDogLink",
        id: stableLegacyId("legacyDogLink", dogId, "boarding", boardingDog.id, match?.dog?.id || "none"),
        submittedAt: boardingDog.submittedAt || dog.submittedAt,
        dogId,
        oldCustomerDogId: match?.dog?.id || boardingDog.linkedCustomerDogId || "",
        oldBoardingDogId: boardingDog.id,
        matchType: match?.matchType || "boardingDogSource",
        needsReview: Boolean(match?.needsReview),
        migrationVersion: "legacy-dog-model-v1",
        removed: false,
      }]);
      records.push(...internalNotePayloadsForLegacyBoardingDog(boardingDog, dogId).map((record) => ["dogInternalNote", record]));
    });
  });

  boardingDogs.forEach((boardingDog) => {
    const dogId = boardingDogToDogId.get(boardingDog.id);
    if (!dogId) return;
    const reservationSources = legacyReservationSourcesForBoardingDog(boardingDog);
    const reservationIdsByStayId = new Map();
    reservationSources.forEach(({ stay, index }, sourceIndex) => {
      const reservation = canonicalReservationPayload(boardingDog, dogId, stay, index);
      reservation.legacyStayRequests = stay.requests || [];
      records.push(["boardingReservation", reservation]);
      if (stay.id) reservationIdsByStayId.set(stay.id, reservation.id);
      if (sourceIndex === 0) reservationIdsByStayId.set("__first__", reservation.id);
      records.push(...structuredReservationServicePayloads(boardingDog, reservation, sourceIndex === 0).map((record) => ["reservationService", record]));
    });
    reservationsByBoardingDog.set(boardingDog.id, reservationIdsByStayId);
    records.push(...customerUpdatePayloadsForLegacyBoardingDog(boardingDog, dogId, reservationIdsByStayId).map((record) => ["reservationCustomerUpdate", record]));
  });

  settings.forEach((user) => {
    (user.linkedCustomerDogIds || []).forEach((legacyId) => {
      const dogId = customerDogToDogId.get(legacyId);
      const access = userDogAccessPayload(user, dogId, "owner", "legacy_settingsUser_customerDog");
      if (access) records.push(["userDogAccess", access]);
    });
    (user.linkedBoardingDogIds || []).forEach((legacyId) => {
      const dogId = boardingDogToDogId.get(legacyId);
      const access = userDogAccessPayload(user, dogId, "owner", "legacy_settingsUser_boardingDog");
      if (access) records.push(["userDogAccess", access]);
    });
  });

  [...sourcesByDog.entries()].forEach(([dogId, sources]) => {
    const dog = canonicalDogPayloadFromLegacy(dogId, sources);
    const ownerUser = dog.ownerEmail ? savedUserFor({ email: dog.ownerEmail }) || null : null;
    const secondaryUser = dog.secondaryOwnerEmail ? savedUserFor({ email: dog.secondaryOwnerEmail }) || null : null;
    const ownerAccess = userDogAccessPayload(ownerUser, dogId, "owner", "legacy_owner_email");
    const secondaryAccess = userDogAccessPayload(secondaryUser, dogId, "co_owner", "legacy_secondary_owner_email");
    if (ownerAccess) records.push(["userDogAccess", ownerAccess]);
    if (secondaryAccess) records.push(["userDogAccess", secondaryAccess]);
    if (!ownerAccess) {
      const claimRequest = dogClaimRequestPayload(dog);
      if (claimRequest) records.push(["dogClaimRequest", claimRequest]);
    }
  });

  return { records, customerDogToDogId, boardingDogToDogId, reservationsByBoardingDog };
}

async function syncLegacyDogModelRecords() {
  if (localTestMode || !supabaseClient || !["admin", "helper"].includes(currentRole())) return null;
  const migration = buildLegacyDogModelMigration();
  let savedCount = 0;
  for (const [type, payload] of migration.records) {
    const saved = await upsertDerivedRecord(type, payload);
    if (saved) savedCount += 1;
  }
  if (savedCount) modeLabel.textContent = "Dog links preserved";
  return { ...migration, savedCount };
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

function boardingScheduleText(record = {}, stayOverride = null) {
  const stay = stayOverride || boardingPrimaryStay(record) || {};
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const dropoff = stay.dropoffTime ? `Drop-off ${formatDateTime(stay.dropoffTime)}` : "";
  const pickup = stay.pickupTime ? `Pick-up ${formatDateTime(stay.pickupTime)}` : "";
  const kennel = status === "In Kennel" && (stay.kennelLocationName || record.kennelLocationName)
    ? `Kennel ${[stay.kennelBuilding || record.kennelBuilding, stay.kennelLocationName || record.kennelLocationName].filter(Boolean).join(" - ")}`
    : "";
  const pieces = [dropoff, pickup, kennel].filter(Boolean);
  return pieces.length ? pieces.join(" | ") : `${status} - no stay time saved`;
}

function boardingQuickSortTime(record = {}) {
  const stay = boardingPrimaryStay(record) || {};
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const value = ["Checked In", "In Kennel", "Ready For Pickup"].includes(status) ? stay.pickupTime : stay.dropoffTime;
  const date = new Date(value || record.updatedAt || record.submittedAt || 0);
  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function boardingQuickActionButtons(record = {}) {
  const stay = boardingPrimaryStay(record) || {};
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const buttons = [];
  if (status === "Pending") {
    buttons.push(`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Approved" data-id="${escapeHtml(record.id)}"${stayAttr}>Approve Request</button>`);
    buttons.push(`<button type="button" class="secondary-button danger-button" data-action="inline-boarding-status" data-next-status="Cancelled" data-id="${escapeHtml(record.id)}"${stayAttr}>Decline</button>`);
  }
  if (status === "Approved") {
    buttons.push(`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Checked In" data-id="${escapeHtml(record.id)}"${stayAttr}>Check In</button>`);
  }
  if (status === "Checked In") {
    buttons.push(`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="In Kennel" data-id="${escapeHtml(record.id)}"${stayAttr}>Mark In Kennel</button>`);
  }
  if (status === "In Kennel") {
    buttons.push(`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Ready For Pickup" data-id="${escapeHtml(record.id)}"${stayAttr}>Ready for Pickup</button>`);
  }
  if (status === "Ready For Pickup") {
    buttons.push(`<button type="button" class="secondary-button" data-action="inline-boarding-status" data-next-status="Checked Out" data-id="${escapeHtml(record.id)}"${stayAttr}>Check Out</button>`);
  }
  if (status === "Checked Out") {
    buttons.push(`<button type="button" class="secondary-button" data-action="change-boarding" data-id="${escapeHtml(record.id)}"${stayAttr}>View Record</button>`);
  } else {
    buttons.push(`<button type="button" class="secondary-button" data-action="change-boarding" data-id="${escapeHtml(record.id)}"${stayAttr}>Details</button>`);
  }
  return `<div class="quick-action-grid boarding-action-grid" data-inline-status-actions="${escapeHtml(record.id || "")}">${buttons.join("")}</div>`;
}

function boardingTableCellHtml(column = {}, record = {}) {
  const value = column.value(record);
  if (column.key === "dogName") {
    return `${escapeHtml(value)}<div class="chip-row compact-chip-row">${vaccinationStatusBadgeHtml(record)}</div>`;
  }
  return escapeHtml(value);
}

function boardingStayServiceSummary(record = {}, stayOverride = null) {
  const stay = stayOverride || activeBoardingStay(record) || currentOrNextStay(record) || (record.stays || [])[0] || {};
  const seen = new Set();
  const requested = arrayValue(stay.requests).map((item) => {
    if (typeof item === "string") return item;
    return `${item.serviceName || "Service"}${Number(item.quantity || 1) > 1 ? ` x${item.quantity}` : ""}`;
  });
  const added = arrayValue(stay.checkIn?.addedServices).map((service) => `${service.serviceName || "Service"}${Number(service.quantity || 1) > 1 ? ` x${service.quantity}` : ""}`);
  return [...requested, ...added].filter(Boolean).filter((label) => {
    const key = boardingServiceTaskDisplayName(label).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function boardingPickupReviewHtml(record = {}, options = {}) {
  const stay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) || {} : activeBoardingStay(record) || currentOrNextStay(record) || {};
  const services = boardingStayServiceSummary(record, stay);
  const belongings = stay.checkIn?.belongings || "No belongings listed";
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const serviceStats = boardingStayServiceStats(record, stay);
  const serviceReview = serviceStats.total
    ? boardingStayServiceTaskListHtml(record, stay, { actions: true })
    : `<article class="record-card compact-record-card"><strong>Requested / added services</strong><p>${escapeHtml(services.length ? services.join(", ") : "No services listed")}</p></article>`;
  const serviceMessage = serviceStats.total && serviceStats.incompleteTasks.length
    ? `<p class="service-warning-text">Complete all requested stay services before marking this dog ready for pickup.</p>`
    : serviceStats.total
      ? `<p class="success-text">All requested stay services are completed.</p>`
      : "";
  return `<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <p>${escapeHtml(record.ownerName || "No owner saved")} | ${phoneLinkHtml(record.ownerPhone)}</p>
      <p>${escapeHtml(record.ownerEmail || "No email saved")}</p>
    </article>
    ${stay.id ? boardingStayDetailCardHtml(record, stay, { compact: true, showServiceTasks: false }) : ""}
    <article class="record-card compact-record-card"><strong>Belongings to leave with dog</strong><p>${escapeHtml(belongings)}</p></article>
    ${serviceReview}
    ${serviceMessage}
    <label>Pickup note<textarea id="pickupReadyNote" rows="3" placeholder="Lost belonging, alternate pickup person, damaged crate, or other checkout note"></textarea></label>
    <div class="button-row"><button type="button" data-action="confirm-ready-for-pickup" data-id="${escapeHtml(record.id)}"${stayAttr}>Mark Ready For Pickup</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </section>`;
}

function openReadyForPickupReview(record = {}, options = {}) {
  showDetailDialog("Ready For Pickup Review", boardingPickupReviewHtml(record, options));
}

function boardingInvoiceTotal(record = {}, stayOverride = null) {
  const stay = stayOverride || activeBoardingStay(record) || currentOrNextStay(record) || (record.stays || [])[0] || {};
  return boardingStayInvoiceTotal(record, stay);
}

function boardingCheckoutInvoiceHtml(record = {}, options = {}) {
  const stay = (options.stayId || options.requestCode) ? boardingStayByReference(record, options) || {} : activeBoardingStay(record) || currentOrNextStay(record) || {};
  const services = boardingStayServiceSummary(record, stay);
  const total = boardingInvoiceTotal(record, stay);
  const paymentStatus = record.paymentStatus || "Unpaid";
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  return `<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>${escapeHtml(record.dogName || "Boarding dog")} final invoice</strong>
      <p>${escapeHtml(record.ownerName || "No owner saved")} | ${phoneLinkHtml(record.ownerPhone)}</p>
      <p>Status: ${escapeHtml(paymentStatus)}${record.paymentMethod ? ` by ${escapeHtml(record.paymentMethod)}` : ""}</p>
    </article>
    ${stay.id ? boardingStayDetailCardHtml(record, stay, { compact: true, hideInvoiceSummary: true }) : ""}
    <article class="record-card compact-record-card"><strong>Services</strong><p>${escapeHtml(services.length ? services.join(", ") : "No services listed")}</p></article>
    ${stay.id ? boardingStayInvoiceSummaryHtml(record, stay, { final: true }) : `<article class="record-card compact-record-card"><strong>Total</strong><p>${escapeHtml(total ? money(total) : "No invoice total saved")}</p></article>`}
    <label>Checkout note<textarea id="checkoutNote" rows="3" placeholder="Payment note, pickup person, invoice issue, or checkout detail"></textarea></label>
    <div class="button-row"><button type="button" data-action="checkout-paid-method" data-id="${escapeHtml(record.id)}"${stayAttr}>Paid</button><button type="button" class="secondary-button" data-action="confirm-check-out" data-id="${escapeHtml(record.id)}"${stayAttr}>Check Out</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </section>`;
}

function openCheckoutInvoicePopup(record = {}, options = {}) {
  showDetailDialog("Final Invoice", boardingCheckoutInvoiceHtml(record, options));
}

function paymentMethodHtml(record = {}, options = {}) {
  return `<form id="paymentMethodForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}" data-stay-id="${escapeHtml(options.stayId || "")}" data-request-code="${escapeHtml(options.requestCode || "")}">
    <label>Payment method<select name="paymentMethod" required><option value="">Select method</option><option>Cash</option><option>Venmo</option><option>PayPal</option><option>Zelle</option><option>Credit Card</option></select></label>
    <div class="button-row"><button type="submit">Paid</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>`;
}

function openPaymentMethodPopup(record = {}, options = {}) {
  showDetailDialog("Payment Method", paymentMethodHtml(record, options));
}

function boardingDogPhotoSource(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record) || {};
  return record.profilePhotoUrl || record.profilePhotoData || linkedDog.profilePhotoUrl || linkedDog.profilePhotoData || "";
}

async function syncLinkedCustomerDogPhotoFromBoarding(record = {}) {
  const photoUrl = profilePhotoDirectSource(record) || "";
  const photoPath = profilePhotoStoragePath(record) || "";
  const photoData = record.profilePhotoData || "";
  if (!record?.id || (!photoUrl && !photoPath && !photoData)) return null;
  const linked = linkedCustomerDogForBoarding(record);
  if (!linked?.id || linked.isSharedBoardingDog) return null;
  if ((linked.profilePhotoUrl || "") === photoUrl && (linked.profilePhotoPath || "") === photoPath && (linked.profilePhotoData || "") === photoData && (linked.profilePhotoSourceRecordId || "") === record.id && (linked.profilePhotoSourceRecordType || "") === "boardingDog") return linked;
  const updated = upsertRecord("customerDog", {
    ...linked,
    profilePhotoUrl: photoUrl || linked.profilePhotoUrl || "",
    profilePhotoPath: photoPath || linked.profilePhotoPath || "",
    profilePhotoData: photoData || linked.profilePhotoData || "",
    profilePhotoSourceRecordId: record.id,
    profilePhotoSourceRecordType: "boardingDog",
    linkedBoardingDogId: record.id,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  return updated;
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
  const stay = boardingPrimaryStay(record) || {};
  return `
    <article class="record-card mobile-roster-card">
      <div class="mobile-roster-card-main boarding-mobile-card-main">
        ${boardingDogMobilePhotoHtml(record)}
        <div class="boarding-mobile-card-content">
          <div class="boarding-card-title-row"><strong>${escapeHtml(record.dogName || "Boarding dog")}</strong>${vaccinationStatusBadgeHtml(record)}</div>
          <div class="chip-row">${stay.id ? boardingStayRequestCodeChipHtml(record, stay) : ""}${boardingRecordStatusButtonHtml(record)}</div>
          ${boardingMobileScheduleFlagsHtml(record, stay)}
          <p>${escapeHtml(record.ownerName || "No owner saved")}${record.ownerPhone ? ` | ${phoneLinkHtml(record.ownerPhone)}` : ""}</p>
        </div>
      </div>
      ${boardingQuickActionButtons(record)}
      <span class="inline-save-status" data-inline-status-message="${escapeHtml(record.id || "")}" aria-live="polite"></span>
    </article>`;
}

const stayRequestServiceOptions = [
  { value: "Full Bath requested", fallbackServiceName: "Full Bath", matchTerms: ["full premium bath", "full bath", "bath"], memberFallbackPrice: 100 },
  { value: "Nail trim requested", fallbackServiceName: "Nail trim", matchTerms: ["nail trim", "nail"] },
  { value: "Paw trim requested", fallbackServiceName: "Paw trim", matchTerms: ["paw trim", "paw"] },
  { value: "Training requested", fallbackServiceName: "Training", matchTerms: ["training"] },
  { value: "Exercise requested", fallbackServiceName: "Exercise", matchTerms: ["treadmill exercise", "exercise", "treadmill"] },
];

function serviceForStayRequestOption(option = {}, options = {}) {
  const terms = arrayValue(option.matchTerms).map(normalizedServiceLookupText).filter(Boolean);
  const services = serviceCatalogForStayRequests(options);
  return services.find((service) => terms.includes(normalizedServiceLookupText(service.serviceName)))
    || services.find((service) => {
      const name = normalizedServiceLookupText(service.serviceName);
      return terms.some((term) => name.includes(term) || term.includes(name));
    })
    || null;
}

function stayRequestOptionSnapshot(option = {}, options = {}) {
  const service = serviceForStayRequestOption(option, options) || {};
  const fallbackPrice = isMemberUser(options.user) ? option.memberFallbackPrice : option.nonMemberFallbackPrice;
  const unitPrice = service.id
    ? stayRequestServiceUnitPriceForUser(service, options.user)
    : Number(fallbackPrice || 0);
  return {
    id: service.id || "",
    serviceId: service.id || "",
    serviceName: service.serviceName || option.fallbackServiceName || boardingServiceTaskDisplayName(option.value),
    label: option.value || "Service requested",
    category: service.category || "",
    unit: service.unit || "",
    quantity: 1,
    unitPrice,
  };
}

function stayRequestMatchesOption(request = {}, option = {}) {
  const requestLabel = normalizedServiceLookupText(boardingStayRequestLabel(request));
  const requestName = normalizedServiceLookupText(boardingServiceTaskDisplayName(request));
  const optionValue = normalizedServiceLookupText(option.value);
  if (requestLabel === optionValue || requestName === optionValue) return true;
  return arrayValue(option.matchTerms).map(normalizedServiceLookupText).filter(Boolean).some((term) => requestLabel.includes(term) || requestName.includes(term));
}

function stayRequestMatchesService(request = {}, service = {}, options = {}) {
  if (!service?.id) return false;
  const item = request && typeof request === "object" ? request : {};
  const requestServiceId = item.serviceId || item.id || "";
  if (requestServiceId && requestServiceId === service.id) return true;
  const matched = serviceCatalogMatchForRequest(request, options);
  if (matched?.id === service.id) return true;
  const requestName = normalizedServiceLookupText(item.serviceName || boardingServiceTaskDisplayName(request));
  const serviceName = normalizedServiceLookupText(service.serviceName || "");
  if (!requestName || !serviceName) return false;
  return requestName === serviceName || requestName.includes(serviceName) || serviceName.includes(requestName);
}

function boardingStayRequestServiceCatalog(record = {}, stay = {}) {
  const user = boardingPricingUserForRecord(record);
  return serviceCatalogForStayRequests({ user })
    .sort((a, b) => [
      a.category || "",
      serviceDependencyId(a) ? serviceDependencyId(a) : "",
      serviceDependencyId(a) ? "1" : "0",
      customerServiceDisplayName(a),
    ].join("|").localeCompare([
      b.category || "",
      serviceDependencyId(b) ? serviceDependencyId(b) : "",
      serviceDependencyId(b) ? "1" : "0",
      customerServiceDisplayName(b),
    ].join("|")));
}

function stayRequestServiceCheckboxHtml(service = {}, requests = [], user = currentUser, options = {}) {
  const checked = requests.some((request) => stayRequestMatchesService(request, service, { user }));
  const label = `${customerServiceDisplayName(service)} requested`;
  const unitPrice = stayRequestServiceUnitPriceForUser(service, user);
  const price = unitPrice ? ` - ${money(unitPrice)}${service.unit ? ` ${service.unit}` : ""}` : "";
  const linkedNote = options.linkedParent
    ? `<span class="stay-request-linked-note">Linked to ${escapeHtml(customerServiceDisplayName(options.linkedParent))}</span>`
    : "";
  const className = options.linked ? ' class="stay-request-linked-label"' : "";
  return `<label${className}><input type="checkbox" name="stayRequests" value="${escapeHtml(label)}" data-service-id="${escapeHtml(service.id || "")}" data-service-name="${escapeHtml(service.serviceName || "")}" data-unit-price="${escapeHtml(unitPrice)}" data-unit="${escapeHtml(service.unit || "")}" ${checked ? "checked" : ""} /> <span>${escapeHtml(label)}${escapeHtml(price)}${linkedNote}</span></label>`;
}

function stayRequestCheckboxesHtml(stay = {}, record = {}) {
  const requests = arrayValue(stay.requests);
  const user = boardingPricingUserForRecord(record);
  const activeServices = boardingStayRequestServiceCatalog(record, stay);
  if (activeServices.length) {
    const parentServices = activeServices.filter((service) => !serviceDependencyId(service));
    const parentIds = new Set(parentServices.map((service) => service.id).filter(Boolean));
    const linkedServices = activeServices.filter((service) => serviceDependencyId(service));
    const linkedByParent = new Map();
    linkedServices.forEach((service) => {
      const parentId = serviceDependencyId(service);
      if (!linkedByParent.has(parentId)) linkedByParent.set(parentId, []);
      linkedByParent.get(parentId).push(service);
    });
    const parentHtml = parentServices
      .map((service) => {
        const childHtml = (linkedByParent.get(service.id) || [])
          .map((childService) => stayRequestServiceCheckboxHtml(childService, requests, user, { linked: true, linkedParent: service }))
          .join("");
        return `<div class="stay-request-service-group">${stayRequestServiceCheckboxHtml(service, requests, user)}${childHtml ? `<div class="stay-request-linked-options"><span class="stay-request-linked-heading">Linked add-ons</span>${childHtml}</div>` : ""}</div>`;
      })
      .join("");
    const orphanHtml = linkedServices
      .filter((service) => !parentIds.has(serviceDependencyId(service)))
      .map((service) => stayRequestServiceCheckboxHtml(service, requests, user))
      .join("");
    return `${parentHtml}${orphanHtml}`;
  }
  return stayRequestServiceOptions
    .map((option) => {
      const snapshot = stayRequestOptionSnapshot(option, { user });
      const checked = requests.some((request) => stayRequestMatchesOption(request, option));
      const price = snapshot.unitPrice ? ` - ${money(snapshot.unitPrice)}${snapshot.unit ? ` ${snapshot.unit}` : ""}` : "";
      return `<label><input type="checkbox" name="stayRequests" value="${escapeHtml(option.value)}" data-service-id="${escapeHtml(snapshot.serviceId || "")}" data-service-name="${escapeHtml(snapshot.serviceName || "")}" data-unit-price="${escapeHtml(snapshot.unitPrice || 0)}" data-unit="${escapeHtml(snapshot.unit || "")}" ${checked ? "checked" : ""} /> ${escapeHtml(option.value)}${escapeHtml(price)}</label>`;
    })
    .join("");
}

function selectedStayRequestsFromForm(formEl) {
  return [...formEl.querySelectorAll('input[name="stayRequests"]:checked')].map((input) => ({
    id: input.dataset.serviceId || "",
    serviceId: input.dataset.serviceId || "",
    serviceName: input.dataset.serviceName || boardingServiceTaskDisplayName(input.value),
    label: input.value,
    quantity: 1,
    unitPrice: Number(input.dataset.unitPrice || 0),
    unit: input.dataset.unit || "",
    source: "staff-admin",
  }));
}

function boardingStayEstimatedTotal(record = {}, existingStay = {}, selectedRequests = []) {
  const snapshot = boardingPricingSnapshotForStay(record, { ...existingStay, requests: selectedRequests }, { forceCurrentPricing: true, preferCatalogPricing: true });
  return snapshot.total;
}

function boardingStayBillingAdjustmentFieldsHtml(stay = {}) {
  const other = invoiceAdjustmentByKey(stay.invoiceAdjustments, "other");
  const discount = invoiceAdjustmentByKey(stay.invoiceAdjustments, "discount");
  return `<section class="popup-record-section billing-adjustment-section">
    <h3>Billing Adjustments</h3>
    <div class="field-grid">
      <label><span class="field-label-text"><span>Other amount</span></span><input type="number" name="otherChargeAmount" min="0" step="0.01" value="${escapeHtml(other.amount || "")}" /></label>
      <label><span class="field-label-text"><span>Other reason</span></span><input type="text" name="otherChargeReason" value="${escapeHtml(other.reason || "")}" placeholder="Reason shown to the customer" /></label>
      <label><span class="field-label-text"><span>Discount amount</span></span><input type="number" name="discountAmount" min="0" step="0.01" value="${escapeHtml(discount.amount || "")}" /></label>
      <label><span class="field-label-text"><span>Discount reason</span></span><input type="text" name="discountReason" value="${escapeHtml(discount.reason || "")}" placeholder="Reason shown to the customer" /></label>
    </div>
  </section>`;
}

function boardingStayLocationFieldsHtml(stay = {}) {
  const locations = kennelLocations({ activeOnly: true });
  const selectedLocation = locations.find((location) => location.id === stay.kennelLocationId);
  const selectedBuilding = stay.kennelBuilding || selectedLocation?.building || "";
  const buildings = [...new Set([...kennelBuildings(locations), selectedBuilding].filter(Boolean))];
  const buildingOptions = buildings.length
    ? `<option value="">No building assigned</option>${buildings.map((building) => `<option value="${escapeHtml(building)}" ${building === selectedBuilding ? "selected" : ""}>${escapeHtml(building)}</option>`).join("")}`
    : `<option value="">No active buildings saved</option>`;
  const matchingLocations = selectedBuilding ? locations.filter((location) => (location.building || "") === selectedBuilding) : [];
  const locationOptions = selectedBuilding ? kennelLocationOptionsForBuilding(selectedBuilding, stay.kennelLocationId || "") : "";
  const help = locations.length
    ? "Optional. This kennel assignment is saved on this boarding stay only."
    : "Add active kennel locations in Settings before assigning a stay location.";
  return `<div class="field-grid">
    <label>Building<select name="kennelBuilding" id="boardingStayLocationBuilding" ${locations.length ? "" : "disabled"}>${buildingOptions}</select><small>${escapeHtml(help)}</small></label>
    <label>Kennel<select name="kennelLocationId" id="boardingStayLocationId" ${selectedBuilding && matchingLocations.length ? "" : "disabled"}><option value="">No kennel assigned</option>${locationOptions}</select><small id="boardingStayLocationHelp">${selectedBuilding ? (matchingLocations.length ? "Available active kennels for this building." : "No active kennels are saved for this building.") : "Choose a building first."}</small></label>
  </div>`;
}

function updateBoardingStayLocationOptions(formEl) {
  if (!formEl) return;
  const building = formEl.elements.kennelBuilding?.value || "";
  const locations = kennelLocations({ activeOnly: true }).filter((location) => (location.building || "") === building);
  const locationSelect = formEl.elements.kennelLocationId;
  const help = $("#boardingStayLocationHelp");
  if (!locationSelect) return;
  locationSelect.innerHTML = `<option value="">No kennel assigned</option>${building ? kennelLocationOptionsForBuilding(building) : ""}`;
  locationSelect.disabled = !building || !locations.length;
  if (help) help.textContent = building ? (locations.length ? "Available active kennels for this building." : "No active kennels are saved for this building.") : "Choose a building first.";
}

function boardingStayFormHtml(record = {}, stay = {}) {
  const isEdit = Boolean(stay.id);
  return `
    <form id="boardingStayPopupForm" class="tracker-form" data-dog-id="${escapeHtml(record.id || "")}">
      <input type="hidden" name="stayId" value="${escapeHtml(stay.id || "")}" />
      ${isEdit ? `<div class="chip-row">${boardingStayRequestCodeChipHtml(record, stay)}${boardingStayStatusChipHtml(record, stay)}</div>` : ""}
      <div class="field-grid">
        <label>Drop-off time<input type="datetime-local" name="dropoffTime" required value="${escapeHtml(stay.dropoffTime?.slice(0, 16) || "")}" /></label>
        <label>Pick-up time<input type="datetime-local" name="pickupTime" required value="${escapeHtml(stay.pickupTime?.slice(0, 16) || "")}" /></label>
      </div>
      ${boardingStayLocationFieldsHtml(stay)}
      <div class="checklist compact">${stayRequestCheckboxesHtml(stay, record)}</div>
      ${boardingStayBillingAdjustmentFieldsHtml(stay)}
      <label>Stay notes<textarea name="stayNotes" rows="3" placeholder="Owner instructions or pickup grooming notes">${escapeHtml(stay.stayNotes || "")}</textarea></label>
      <div class="button-row"><button type="submit">${isEdit ? "Save Boarding Stay" : "Add Boarding Stay"}</button></div>
    </form>`;
}

function boardingSchedulePopupHtml(record = {}) {
  const displayRecord = boardingDogWithStayStatus(record);
  const staysHtml = (displayRecord.stays || []).length
    ? (displayRecord.stays || []).map((stay) => {
      const requestCode = boardingStayRequestCode(displayRecord, stay);
      const ownerUpdateButton = ownerUpdateStayIsAvailable(displayRecord, stay)
        ? `<button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="${escapeHtml(displayRecord.id)}" data-id="${escapeHtml(stay.id)}" data-request-code="${escapeHtml(requestCode)}">Update Owner</button>`
        : "";
      return `<article class="record-card"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><div class="chip-row">${boardingStayRequestCodeChipHtml(displayRecord, stay)}${boardingStayStatusButtonHtml(displayRecord, stay, "open-stay-status-menu")}${boardingStayServiceFlagHtml(displayRecord, stay)}</div><p>${escapeHtml(boardingStayServicesText(stay, { user: boardingPricingUserForRecord(displayRecord), preferCatalogPricing: true }))}</p>${boardingStayInvoiceSummaryHtml(displayRecord, stay)}${boardingStayServiceTaskListHtml(displayRecord, stay, { actions: true })}<p>${escapeHtml(stay.bathPlan || "")}</p><p>${escapeHtml(stay.stayNotes || "")}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay-popup" data-dog-id="${escapeHtml(displayRecord.id)}" data-id="${escapeHtml(stay.id)}" data-request-code="${escapeHtml(requestCode)}">Edit Stay</button>${ownerUpdateButton}</div></article>`;
    }).join("")
    : "<p>No boarding stays logged yet.</p>";
  return `${boardingStayFormHtml(displayRecord)}<section class="popup-record-section"><h3>Boarding stays</h3>${staysHtml}</section>`;
}

function openBoardingSchedulePopup(record = activeBoardingDog()) {
  if (!record?.id) {
    showToast("Save the boarding dog first.");
    return;
  }
  showDetailDialog(`${record.dogName || "Boarding Dog"} Boarding Request`, boardingSchedulePopupHtml(record));
}

function ownerUpdateStayForRecord(record = {}, reference = {}) {
  const referencedStay = boardingStayByReference(record, reference);
  if (ownerUpdateStayIsAvailable(record, referencedStay)) return referencedStay;
  if (referencedStay?.id) return {};
  const activeStay = activeBoardingStay(record);
  if (ownerUpdateStayIsAvailable(record, activeStay)) return activeStay;
  const currentStay = currentOrNextStay(record);
  if (ownerUpdateStayIsAvailable(record, currentStay)) return currentStay;
  return ownerUpdateStaysForRecord(record)[0] || {};
}

function ownerUpdateStayIsAvailable(record = {}, stay = {}) {
  if (!stay?.id) return false;
  return activeBoardingStayStatuses.includes(boardingStayDisplayStatus(record, stay));
}

function ownerUpdateStaysForRecord(record = {}) {
  return arrayValue(record.stays)
    .filter((stay) => ownerUpdateStayIsAvailable(record, stay))
    .sort((a, b) => new Date(a.pickupTime || a.dropoffTime || 0) - new Date(b.pickupTime || b.dropoffTime || 0));
}

function customerUpdateForStay(record = {}, stay = {}) {
  if (!stay?.id) return null;
  const requestCode = boardingStayRequestCode(record, stay);
  return arrayValue(record.customerUpdates).find((update) => {
    if (update.stayId && update.stayId === stay.id) return true;
    if (requestCode && update.requestCode === requestCode) return true;
    if (stay.dropoffTime && stay.pickupTime && update.stayDropoffTime === stay.dropoffTime && update.stayPickupTime === stay.pickupTime) return true;
    return false;
  }) || null;
}

function ownerUpdateReasonItems(record = {}, stay = {}) {
  const reasons = [];
  const flags = arrayValue(record.flags);
  if (flags.includes("Required update from owner")) {
    reasons.push("Owner update flag is active on this boarding dog.");
  }
  if (stay?.id) {
    const status = boardingStayDisplayStatus(record, stay);
    const requestCode = boardingStayRequestCode(record, stay);
    const latestUpdate = customerUpdateForStay(record, stay);
    if (!latestUpdate && activeBoardingStayStatuses.includes(status)) {
      reasons.push(`No stay update has been sent for Stay ID: ${requestCode || stay.id}.`);
    } else if (latestUpdate?.createdAt) {
      reasons.push(`Last stay update was sent ${formatDateTime(latestUpdate.createdAt)}.`);
    }
    const pickup = new Date(stay.pickupTime || 0);
    if (!Number.isNaN(pickup.getTime()) && activeBoardingStayStatuses.includes(status) && !stayHasActualPickupEvidence(stay)) {
      const hoursRemaining = Math.ceil((pickup - new Date()) / 3600000);
      if (hoursRemaining <= 0) reasons.push("Pickup time has passed; review the stay before checkout.");
      else if (hoursRemaining <= BOARDING_SERVICE_DUE_WINDOW_HOURS) reasons.push(`Pickup is in ${hoursRemaining} hour${hoursRemaining === 1 ? "" : "s"}.`);
    }
    const openServices = boardingStayServiceStats(record, stay).incompleteTasks;
    if (openServices.length) {
      reasons.push(`Open stay service${openServices.length === 1 ? "" : "s"}: ${openServices.map((task) => task.label || task.serviceName || "Service").join(", ")}.`);
    }
  }
  if (!reasons.length) reasons.push("Review the current stay and owner update history.");
  return reasons;
}

function ownerUpdateReasonHtml(record = {}, stay = {}) {
  const items = ownerUpdateReasonItems(record, stay);
  return `<ul class="compact-reason-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function openOwnerUpdateAlert(recordId, reference = {}) {
  const record = boardingDogRecordForDisplay(recordId) || readRecords("boardingDog").find((item) => item.id === recordId && !item.removed);
  if (!record) return;
  const stay = ownerUpdateStayForRecord(record, reference);
  if (!ownerUpdateStayIsAvailable(record, stay)) {
    showDetailDialog("Owner Update Not Available", `<p>Owner updates can be sent after ${escapeHtml(record.dogName || "this dog")} is checked in, in kennel, or ready for pickup.</p>`);
    return;
  }
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const requestCode = stay.id ? boardingStayRequestCode(record, stay) : "";
  showDetailDialog(
    `${record.dogName || "Boarding Dog"} Owner Update`,
    `<article class="record-card compact-record-card"><strong>${escapeHtml(record.dogName || "Boarding dog")}</strong><div class="chip-row">${stay.id ? customerStayIdChipHtml(record, stay) : ""}${stay.id ? boardingStayStatusChipHtml(record, stay) : ""}</div><p>${escapeHtml([record.ownerName, record.ownerPhone, record.ownerEmail].filter(Boolean).join(" | "))}</p><p>${escapeHtml(stay.id ? `${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}` : record.dailyActivity || "Owner update is marked as needed.")}</p>${ownerUpdateReasonHtml(record, stay)}</article>
    <form id="ownerUpdatePopupForm" class="tracker-form" data-id="${escapeHtml(record.id)}"${stayAttrs || ` data-request-code="${escapeHtml(requestCode)}"`}>
      <label>Daily activity update for owner<textarea name="dailyActivity" rows="4" placeholder="Eating, potty, play, exercise, mood, photos/videos taken">${escapeHtml(record.dailyActivity || "")}</textarea></label>
      <label>Update photo or video<input type="file" name="ownerUpdatePhoto" id="ownerUpdatePopupPhotoInput" accept="image/jpeg,image/png,video/mp4,video/quicktime,video/webm,video/x-m4v,.jpg,.jpeg,.png,.mp4,.mov,.webm,.m4v" multiple /></label>
      <label class="inline-check"><input type="checkbox" name="clearOwnerUpdate" checked /> Clear owner update alert after saving</label>
      <div class="button-row"><button type="submit">Save Owner Update</button><button type="button" class="secondary-button" data-action="open-boarding-editor" data-id="${escapeHtml(record.id)}">Open Boarding Dog</button></div>
    </form>`,
  );
}

function openBoardingStayPopup(record = activeBoardingDog(), stayId = "") {
  if (!record?.id) return;
  const displayRecord = boardingDogWithStayStatus(record);
  const stay = boardingStayByReference(displayRecord, stayId) || {};
  showDetailDialog(`${displayRecord.dogName || "Boarding Dog"} Boarding Request`, boardingStayFormHtml(displayRecord, stay));
}

function boardingFoodInstructions(record = {}) {
  return record.foodInstructions || record.foodAmount || record.feedingInstructions || record.feedingPlan || "";
}

function boardingCheckInServices(record = {}, addedServices = [], options = {}) {
  const stay = boardingStatusTargetStay(record, "Checked In", options) || {};
  const requested = arrayValue(stay.requests).map((request) => ({ label: boardingStayRequestDisplayText(request), source: "requested" }));
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
    dropoffTime: formEl.elements.dropoffTime?.value || "",
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
  const stay = boardingStatusTargetStay(record, nextStatus, options) || {};
  const formValues = state.formValues || {};
  const addedServices = state.addedServices || [];
  const serviceRows = boardingCheckInServices(record, addedServices, options);
  const foodInstructions = formValues.foodInstructions ?? boardingFoodInstructions(record);
  const belongings = formValues.belongings || stay.checkIn?.belongings || "";
  const earlyCheckIn = Boolean(options.early);
  const dropoffFieldHtml = earlyCheckIn
    ? `<label>Drop-off <small>Early check-in defaults to now. Adjust if needed.</small><input type="datetime-local" name="dropoffTime" required value="${escapeHtml(formValues.dropoffTime || dateTimeLocalValue(new Date().toISOString()))}" /></label>`
    : `<label>Drop-off<input type="text" value="${escapeHtml(formatDateTime(stay.dropoffTime) || "Not scheduled")}" readonly /></label>`;
  const serviceHtml = serviceRows.length
    ? `<div class="checkin-service-list">${serviceRows.map((item) => `<article class="record-card compact-record-card"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.source === "added" ? "Added during check-in" : "Requested by owner")}</span></article>`).join("")}</div>`
    : "";
  return `
    <form id="boardingCheckInForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}" data-stay-id="${escapeHtml(stay.id || options.stayId || "")}" data-request-code="${escapeHtml(options.requestCode || (stay.id ? boardingStayRequestCode(record, stay) : ""))}" data-next-status="${escapeHtml(nextStatus)}" data-allow-early="${options.allowEarly ? "true" : "false"}" data-early="${options.early ? "true" : "false"}">
      <input type="hidden" name="assignKennelAfterCheckIn" value="No" />
      ${boardingCheckInPhotoHtml(record)}
      <div class="field-grid">
        <label>Owner name<input type="text" value="${escapeHtml(record.ownerName || "")}" readonly /></label>
        <label>Owner phone<input type="tel" value="${escapeHtml(record.ownerPhone || "")}" readonly /></label>
        ${dropoffFieldHtml}
        <label>Pick-up<input type="text" value="${escapeHtml(formatDateTime(stay.pickupTime) || "Not scheduled")}" readonly /></label>
      </div>
      <label>Food instructions<textarea name="foodInstructions" rows="3" placeholder="Food amount, feeding schedule, medication with meals">${escapeHtml(foodInstructions)}</textarea></label>
      <label><span class="field-label-text"><span>Dog's belongings</span><span class="required-mark" aria-label="required">*</span></span><textarea name="belongings" rows="3" required placeholder="Leash, collar, food, treats, bowls, medication, toys">${escapeHtml(belongings)}</textarea></label>
      <section class="popup-record-section">
        <h3>Requested services</h3>
        ${serviceHtml}
        <div class="button-row"><button type="button" class="secondary-button" data-action="open-checkin-service-picker">Add service</button></div>
      </section>
      <div class="button-row"><button type="submit" data-checkin-mode="check-in-only">Check-In only</button><button type="submit" class="secondary-button" data-checkin-mode="assign-kennel">Check-In & Assign Kennel</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
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
  const targetStay = boardingStatusTargetStay(record, "Checked In", {
    stayId: formEl.dataset.stayId || "",
    requestCode: formEl.dataset.requestCode || "",
  });
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
    dropoffTime: data.dropoffTime || "",
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
    stayId: formEl.dataset.stayId || "",
    requestCode: formEl.dataset.requestCode || "",
    checkInSubmitted: true,
    checkInDetails,
  });
  if (!updated) return;
  await addAuditLog("Checked in boarding dog", "boardingDog", updated, `${updated.dogName || "Dog"} belongings: ${data.belongings || "none"}`);
  if (addedServices.length) {
    await addAuditLog("Added check-in service", "boardingDog", updated, addedServices.map((service) => `${service.serviceName} x${service.quantity}`).join(", "));
  }
  pendingBoardingCheckIn = null;
  if (data.assignKennelAfterCheckIn === "Yes") {
    openKennelAssignmentPopup(updated, "In Kennel");
    return;
  }
  showDetailDialog("Check-In Complete", `<p>${escapeHtml(updated.dogName || "Boarding dog")} has been checked in.</p><p>Belongings: ${escapeHtml(data.belongings || "None listed")}</p>`);
}

async function saveBoardingStayFromForm(formEl) {
  if (!validateForm(formEl, invoiceAdjustmentFormChecks(formEl))) return null;
  const dog = boardingDogRecordForDisplay(formEl.dataset.dogId) || activeBoardingDog();
  if (!dog) {
    showToast("Save the boarding dog first.");
    return null;
  }
  const payload = formPayload(formEl);
  const dropoffDate = parsedCustomerDateTime(payload.dropoffTime || "");
  const pickupDate = parsedCustomerDateTime(payload.pickupTime || "");
  if (!dropoffDate || !pickupDate || pickupDate <= dropoffDate) {
    const targetField = formFieldByName(formEl, !dropoffDate ? "dropoffTime" : "pickupTime");
    if (targetField) setFieldError(targetField, !dropoffDate ? "Drop-off time is required." : "Pick-up time must be after drop-off time.");
    showToast(!dropoffDate ? "Enter a valid drop-off time." : "Pick-up time must be after drop-off time.");
    return null;
  }
  const draftStayIdentity = {
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: payload.stayType || "",
  };
  const existingStay = boardingStayByReference(dog, payload.stayId)
    || (!payload.stayId ? (dog.stays || []).find((item) => boardingStayMatchesIdentity(item, draftStayIdentity)) : null);
  const timestamp = new Date().toISOString();
  const existingStayStatus = normalizeBoardingStatus({ boardingStatus: existingStay?.status || "" });
  const shouldAutoApproveStay = !existingStay || (!dog.customerRequest && existingStayStatus === "Pending");
  const selectedRequests = selectedStayRequestsFromForm(formEl);
  const invoiceAdjustments = invoiceAdjustmentsFromStayForm(formEl, existingStay || {}, timestamp);
  const adjustmentEvents = invoiceAdjustmentEventChanges(existingStay?.invoiceAdjustments || [], invoiceAdjustments, timestamp);
  const location = payload.kennelLocationId
    ? kennelLocations({ activeOnly: true }).find((item) => item.id === payload.kennelLocationId)
    : null;
  const draftStay = {
    ...(existingStay || {}),
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: existingStay?.stayType || "Boarding",
    requests: selectedRequests,
    invoiceAdjustments,
  };
  const pricingSnapshot = boardingPricingSnapshotForStay(dog, draftStay);
  const stay = {
    ...existingStay,
    id: payload.stayId || uid("stay"),
    createdAt: existingStay?.createdAt || timestamp,
    updatedAt: timestamp,
    source: existingStay?.source || "staff-admin",
    status: shouldAutoApproveStay ? "Approved" : existingStay?.status || "Approved",
    dropoffTime: payload.dropoffTime,
    pickupTime: payload.pickupTime,
    stayType: draftStay.stayType,
    billingDays: pricingSnapshot.billingDays,
    requests: selectedRequests,
    stayNotes: payload.stayNotes,
    invoiceAdjustments,
    invoiceEvents: [...arrayValue(existingStay?.invoiceEvents), ...adjustmentEvents],
    pricingSnapshot,
    estimatedTotal: pricingSnapshot.total,
    kennelBuilding: location ? location.building : payload.kennelBuilding || "",
    kennelLocationId: location ? location.id : "",
    kennelLocationName: location ? location.name : "",
    kennelAssignedAt: location ? existingStay?.kennelAssignedAt || timestamp : "",
  };
  stay.bathPlan = bathPlanForStay(stay);
  stay.requestCode = boardingStayRequestCode(dog, stay);
  stay.serviceTasks = boardingStayServiceTasks(dog, stay);
  const stays = (dog.stays || []).filter((item) => !boardingStayMatchesIdentity(item, stay));
  stays.unshift(stay);
  const currentDogStatus = normalizeBoardingStatus(dog);
  const statusUpdates = !existingStay && ["Pending", "Cancelled", "Checked Out"].includes(currentDogStatus)
    ? {
        boardingStatus: "Approved",
        statusHistory: [...(dog.statusHistory || []), { from: currentDogStatus, to: "Approved", date: timestamp, by: currentUser?.name || helperName?.value || "" }],
      }
    : {};
  const record = upsertRecord("boardingDog", { ...dog, ...statusUpdates, stays });
  await sendPayload(record);
  if (invoiceAdjustmentsChanged(existingStay?.invoiceAdjustments || [], invoiceAdjustments)) {
    const requestCode = boardingStayRequestCode(record, stay);
    const details = normalizeInvoiceAdjustments(invoiceAdjustments)
      .map((adjustment) => `${adjustment.label}: ${money(invoiceAdjustmentSignedAmount(adjustment))} - ${adjustment.reason}`)
      .join(" | ") || "Adjustments removed";
    await addAuditLog("Updated stay billing adjustments", "boardingDog", record, `Stay ID: ${requestCode} | ${details}`);
  }
  if ($("#boardingDogForm")?.elements.id.value === record.id) {
    renderBoardingStays(record);
    renderBoardingHistory(record);
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
    .filter((record) => !["Cancelled", "Checked Out"].includes(boardingDisplayStatus(record)))
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
    rabiesGoodThreeYears: record.rabiesGoodThreeYears || existingCustomerDog.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(record, "rabies") || vaccineDurationIsThreeYears(existingCustomerDog, "rabies") ? "Yes" : ""),
    dhppGoodThreeYears: record.dhppGoodThreeYears || existingCustomerDog.dhppGoodThreeYears || (vaccineDurationIsThreeYears(record, "dhpp") || vaccineDurationIsThreeYears(existingCustomerDog, "dhpp") ? "Yes" : ""),
    rabiesDuration: record.rabiesDuration || existingCustomerDog.rabiesDuration || (vaccineDurationIsThreeYears(record, "rabies") || vaccineDurationIsThreeYears(existingCustomerDog, "rabies") ? "3 years" : ""),
    dhppDuration: record.dhppDuration || existingCustomerDog.dhppDuration || (vaccineDurationIsThreeYears(record, "dhpp") || vaccineDurationIsThreeYears(existingCustomerDog, "dhpp") ? "3 years" : ""),
    bordetellaDate: record.bordetellaDate || existingCustomerDog.bordetellaDate || "",
    heartwormDate: record.heartwormDate || existingCustomerDog.heartwormDate || "",
    specialCare: record.specialCare || existingCustomerDog.specialCare || "",
    profilePhotoUrl: record.profilePhotoUrl || existingCustomerDog.profilePhotoUrl || "",
    profilePhotoPath: profilePhotoStoragePath(record) || profilePhotoStoragePath(existingCustomerDog) || "",
    profilePhotoData: existingCustomerDog.profilePhotoData || record.profilePhotoData || "",
    profilePhotoMeta: record.profilePhotoMeta || existingCustomerDog.profilePhotoMeta || {},
    profilePhotoSourceRecordId: record.profilePhotoSourceRecordId || record.profilePhotoRecordId || record.sourceRecordId || record.id || existingCustomerDog.profilePhotoSourceRecordId || "",
    profilePhotoSourceRecordType: record.profilePhotoSourceRecordType || record.profilePhotoRecordType || record.sourceRecordType || "boardingDog",
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

function normalizedDogIdentityName(record = {}) {
  return String(record.dogName || record.callName || record.showName || "").trim().toLowerCase();
}

function normalizedPhoneToken(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function boardingDogIdentityTokens(record = {}) {
  const dogName = normalizedDogIdentityName(record);
  if (!dogName) return [];
  const tokens = new Set();
  const addScoped = (kind = "", value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) tokens.add(`${dogName}|${kind}:${normalized}`);
  };
  const addPhone = (kind = "", value = "") => {
    const phone = normalizedPhoneToken(value);
    if (phone) addScoped(kind, phone);
  };

  [
    record.linkedCustomerDogId,
    record.sourceCustomerDogId,
    record.customerDogId,
    record.dogId,
    record.canonicalDogId,
    ...arrayValue(record.legacyCustomerDogIds),
  ].forEach((id) => addScoped("customer-dog", id));
  [
    record.linkedBoardingDogId,
    record.sourceBoardingDogId,
    ...arrayValue(record.sourceRecordIds),
    ...arrayValue(record.duplicateProfileIds),
    ...arrayValue(record.legacyBoardingDogIds),
  ].forEach((id) => addScoped("boarding-dog", id));
  boardingOwnerEmails(record).forEach((email) => addScoped("email", email));
  [
    record.ownerPhone,
    record.phone,
    record.customerPhone,
    record.requestedByPhone,
    record.emergencyPhone,
  ].forEach((phone) => addPhone("phone", phone));

  if (!tokens.size) addScoped("owner-name", record.ownerName);
  return [...tokens];
}

function boardingDogIdentityKey(record = {}) {
  return boardingDogIdentityTokens(record)[0] || "";
}

function groupedBoardingDogProfiles(records = []) {
  const groups = new Map();
  const tokenToGroup = new Map();
  const ungrouped = [];
  let groupIndex = 0;

  const createGroup = () => {
    const key = `boarding-profile-${groupIndex += 1}`;
    groups.set(key, []);
    return key;
  };

  const mergeGroups = (targetKey, sourceKey) => {
    if (!targetKey || !sourceKey || targetKey === sourceKey || !groups.has(sourceKey)) return targetKey;
    groups.set(targetKey, [...(groups.get(targetKey) || []), ...(groups.get(sourceKey) || [])]);
    groups.delete(sourceKey);
    tokenToGroup.forEach((groupKey, token) => {
      if (groupKey === sourceKey) tokenToGroup.set(token, targetKey);
    });
    return targetKey;
  };

  records.forEach((record) => {
    const item = boardingDogWithCanonicalProfile({ ...record, sourceType: "boardingDog" });
    const tokens = boardingDogIdentityTokens(item);
    if (!tokens.length) {
      ungrouped.push(item);
      return;
    }
    const existingGroups = [...new Set(tokens.map((token) => tokenToGroup.get(token)).filter(Boolean))];
    const groupKey = existingGroups.reduce((targetKey, sourceKey) => mergeGroups(targetKey, sourceKey), existingGroups[0] || createGroup());
    groups.set(groupKey, [...(groups.get(groupKey) || []), item]);
    tokens.forEach((token) => tokenToGroup.set(token, groupKey));
  });

  return { groups: [...groups.values()], ungrouped };
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
  return priorities[boardingDisplayStatus(record)] || 0;
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

function mergeBoardingStayRequestList(requests = []) {
  const byKey = new Map();
  arrayValue(requests).forEach((request) => {
    const key = boardingServiceTaskNameKey(request);
    if (!key) return;
    const existing = byKey.get(key);
    const existingPrice = existing ? boardingStayRequestUnitPrice(existing) : 0;
    const requestPrice = boardingStayRequestUnitPrice(request);
    if (!existing || (!existingPrice && requestPrice) || (typeof existing === "string" && typeof request === "object")) {
      byKey.set(key, request);
    }
  });
  return [...byKey.values()];
}

function boardingStayRequestsForMergedItems(items = [], best = {}) {
  const bestRequests = mergeBoardingStayRequestList(best.stay?.requests || []);
  if (bestRequests.length) return bestRequests;
  const fallback = items.find(({ stay }) => arrayValue(stay.requests).length);
  return fallback ? mergeBoardingStayRequestList(fallback.stay.requests) : [];
}

function mergeBoardingStayServiceTasksForRequests(items = [], best = {}, mergedRequests = []) {
  const allowedKeys = new Set([
    ...mergeBoardingStayRequestList(mergedRequests).map(boardingServiceTaskNameKey),
    ...boardingServiceTaskSources(best.record || {}, best.stay || {}).map(boardingServiceTaskNameKey),
  ].filter(Boolean));
  if (!allowedKeys.size) return [];
  const byKey = new Map();
  items.forEach(({ record, stay }) => {
    boardingStayServiceTasks(record, stay).forEach((task) => {
      const key = boardingServiceTaskNameKey(task);
      if (!allowedKeys.has(key)) return;
      const existing = byKey.get(key);
      const statusDiff = Number(task.status === "completed") - Number(existing?.status === "completed");
      const timeDiff = itemSortTime(task) - itemSortTime(existing || {});
      if (!existing || statusDiff > 0 || (statusDiff === 0 && timeDiff >= 0)) byKey.set(key, task);
    });
  });
  return [...byKey.values()];
}

function boardingStayMergeKey(stay = {}) {
  const sourceIds = boardingStaySourceIds(stay);
  const requestCode = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
  if (sourceIds.length) return `id:${sourceIds.sort().join("|")}`;
  if (requestCode) return `code:${requestCode}`;
  const dropoff = String(stay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  if (dropoff || pickup) return `time:${dropoff}|${pickup}`;
  return JSON.stringify(stay);
}

function boardingStayRequestsKey(stay = {}) {
  return [...new Set(arrayValue(stay.requests)
    .map((item) => (typeof item === "string" ? item : item?.serviceName || item?.label || JSON.stringify(item)))
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean))]
    .sort()
    .join("|");
}

function boardingStaySemanticMergeKey(record = {}, stay = {}) {
  const dropoff = String(stay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  if (!dropoff && !pickup) return "";
  return [
    "stay-window",
    dropoff,
    pickup,
    String(stay.stayType || record.stayType || "").trim().toLowerCase(),
  ].join("|");
}

function boardingStayMergeKeyForRecord(record = {}, stay = {}) {
  return boardingStaySemanticMergeKey(record, stay) || boardingStayMergeKey(stay);
}

function shortStableHash(value = "", length = 5) {
  const text = String(value || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(length, "0").slice(-length);
}

function boardingStaySourceIds(stay = {}) {
  return [...new Set([
    stay.id,
    ...(stay.sourceStayIds || []),
    ...(stay.duplicateStayIds || []),
  ].filter(Boolean).map(String))];
}

function boardingStayRequestCode(record = {}, stay = {}) {
  const existing = String(stay.requestCode || stay.requestId || stay.reservationId || "").trim();
  if (existing) return existing;
  const dateKey = (dateOnly(stay.dropoffTime) || dateOnly(stay.createdAt) || dateOnly(record.submittedAt) || "request").replaceAll("-", "");
  const sourceIds = boardingStaySourceIds(stay);
  const seed = [
    record.id,
    ...(record.sourceRecordIds || []),
    record.linkedCustomerDogId || "",
    record.ownerEmail || record.customerEmail || record.ownerPhone || "",
    record.dogName || "",
    ...sourceIds,
    stay.dropoffTime || "",
    stay.pickupTime || "",
    stay.createdAt || "",
  ].filter(Boolean).join("|");
  return `BR-${dateKey.toUpperCase()}-${shortStableHash(seed || JSON.stringify(stay || record))}`;
}

function boardingStayWithRequestCode(record = {}, stay = {}) {
  if (!stay || !Object.keys(stay).length) return stay || {};
  return {
    ...stay,
    requestCode: boardingStayRequestCode(record, stay),
  };
}

function boardingStayById(record = {}, stayId = "") {
  const id = String(stayId || "");
  if (!id) return null;
  return (record.stays || []).find((stay) => boardingStaySourceIds(stay).includes(id)) || null;
}

function boardingStayByReference(record = {}, reference = {}) {
  const normalized = typeof reference === "string"
    ? { stayId: reference }
    : reference || {};
  const stayId = String(normalized.stayId || normalized.id || "").trim();
  const requestCode = String(normalized.requestCode || "").trim();
  const stays = record.stays || [];
  if (stayId) {
    const exact = stays.find((stay) => String(stay.id || "") === stayId);
    if (exact) return exact;
  }
  if (requestCode) {
    const exactCode = stays.find((stay) => boardingStayRequestCode(record, stay) === requestCode);
    if (exactCode) return exactCode;
  }
  if (stayId) return boardingStayById(record, stayId);
  return null;
}

function boardingStayReferenceFromAction(action = {}) {
  return {
    stayId: action?.dataset?.stayId || action?.dataset?.id || "",
    requestCode: action?.dataset?.requestCode || "",
  };
}

function boardingStaySharesExplicitIdentity(stay = {}, targetStay = {}) {
  const stayIds = boardingStaySourceIds(stay);
  const targetIds = boardingStaySourceIds(targetStay);
  return Boolean(stayIds.length && targetIds.some((id) => stayIds.includes(id)));
}

function boardingStayMatchesIdentity(stay = {}, targetStay = {}) {
  if (!stay || !targetStay) return false;
  if (boardingStaySharesExplicitIdentity(stay, targetStay)) return true;
  const dropoff = String(stay.dropoffTime || "").trim();
  const targetDropoff = String(targetStay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  const targetPickup = String(targetStay.pickupTime || "").trim();
  if (!dropoff && !pickup) return false;
  if (dropoff !== targetDropoff || pickup !== targetPickup) return false;
  const stayType = String(stay.stayType || "").trim().toLowerCase();
  const targetStayType = String(targetStay.stayType || "").trim().toLowerCase();
  return !stayType || !targetStayType || stayType === targetStayType;
}

function boardingStayMergeTime(record = {}, stay = {}) {
  const stayIds = boardingStaySourceIds(stay);
  const statusHistoryTimes = (record.statusHistory || [])
    .filter((item) => item.stayId && stayIds.includes(String(item.stayId)))
    .map((item) => item.date);
  const values = [
    stay.updatedAt,
    stay.statusUpdatedAt,
    stay.actualDropoffAt,
    stay.kennelAssignedAt,
    stay.readyForPickupAt,
    stay.actualPickupAt,
    stay.approvedAt,
    stay.cancelledAt,
    stay.createdAt,
    stay.submittedAt,
    ...statusHistoryTimes,
  ]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => !Number.isNaN(value));
  if (values.length) return Math.max(...values);
  const fallback = new Date(stay.dropoffTime || 0).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
}

function mergeBoardingStays(records = [], primary = {}) {
  const byKey = new Map();
  records.forEach((record) => {
    arrayValue(record.stays).forEach((stay) => {
      const key = boardingStayMergeKeyForRecord(record, stay);
      if (!key) return;
      byKey.set(key, [...(byKey.get(key) || []), { record, stay }]);
    });
  });
  return [...byKey.values()].map((items) => {
    const rankedItems = [...items].sort((a, b) => {
      const timeDiff = boardingStayMergeTime(b.record, b.stay) - boardingStayMergeTime(a.record, a.stay);
      if (timeDiff) return timeDiff;
      const statusDiff = boardingStatusPriority({ ...b.record, stays: [b.stay] }) - boardingStatusPriority({ ...a.record, stays: [a.stay] });
      if (statusDiff) return statusDiff;
      return Number(b.record.id === primary.id) - Number(a.record.id === primary.id);
    });
    const [best] = rankedItems;
    const sourceStayIds = [...new Set(items.flatMap(({ stay }) => boardingStaySourceIds(stay)))];
    const sourceRecordIds = [...new Set(items.flatMap(({ record, stay }) => [record.id, ...(stay.sourceRecordIds || [])]).filter(Boolean))];
    const merged = {
      ...best.stay,
      status: boardingStayDisplayStatus(best.record, best.stay),
      sourceStayIds,
      duplicateStayIds: sourceStayIds.filter((id) => id !== best.stay.id),
      sourceRecordIds,
    };
    items.forEach(({ stay }) => {
      Object.entries(stay).forEach(([field, value]) => {
        if (["status", "requests", "serviceTasks", "sourceStayIds", "duplicateStayIds", "sourceRecordIds"].includes(field)) return;
        if (merged[field]) return;
        merged[field] = value;
      });
    });
    merged.requests = boardingStayRequestsForMergedItems(rankedItems, best);
    merged.serviceTasks = mergeBoardingStayServiceTasksForRequests(rankedItems, best, merged.requests);
    merged.requestCode = boardingStayRequestCode(best.record, merged);
    if (merged.status !== "In Kennel") {
      merged.kennelLocationId = "";
      merged.kennelLocationName = "";
      merged.kennelBuilding = "";
      merged.kennelAssignedAt = "";
    }
    return merged;
  }).sort((a, b) => new Date(b.dropoffTime || b.updatedAt || 0) - new Date(a.dropoffTime || a.updatedAt || 0));
}

function boardingDogWithMergedStays(record = {}) {
  if (!record) return {};
  return {
    ...record,
    sourceRecordIds: record.sourceRecordIds?.length ? record.sourceRecordIds : [record.id].filter(Boolean),
    stays: mergeBoardingStays([record], record),
  };
}

function mergeBoardingProfileGroup(records = []) {
  if (records.length <= 1) return boardingDogWithMergedStays(records[0] || {});
  const primary = chooseBoardingProfilePrimary(records);
  const merged = {
    ...primary,
    sourceRecordIds: [...new Set(records.map((record) => record.id).filter(Boolean))],
    duplicateProfileIds: [...new Set(records.map((record) => record.id).filter((id) => id && id !== primary.id))],
    stays: mergeBoardingStays(records, primary),
    statusHistory: mergeObjectList(records, "statusHistory", (item) => item.id || `${item.date || ""}|${item.from || ""}|${item.to || ""}|${item.by || ""}`)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    documents: mergeObjectList(records, "documents", (item) => item.id || item.url || item.dataUrl || item.name || JSON.stringify(item)),
    vaccinationRecords: mergeObjectList(records, "vaccinationRecords", (item) => item.id || item.url || item.dataUrl || item.name || JSON.stringify(item)),
    customerUpdates: mergeObjectList(records, "customerUpdates", (item) => item.id || `${item.createdAt || item.submittedAt || ""}|${item.note || ""}`),
    requestedServices: mergeObjectList(records, "requestedServices", (item) => item.id || `${item.serviceName || ""}|${item.quantity || ""}|${item.unitPrice || ""}`),
    flags: mergePrimitiveList(records, "flags"),
  };
  [
    "dogName", "breedDescription", "dateOfBirth", "profilePhotoUrl", "profilePhotoPath", "profilePhotoData", "profilePhotoMeta", "profilePhotoSourceRecordId", "profilePhotoSourceRecordType", "sex", "spayNeuterStatus",
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
  const { groups, ungrouped } = groupedBoardingDogProfiles(records);
  return groups.map(mergeBoardingProfileGroup).concat(ungrouped).map(boardingDogWithCanonicalProfile).map(boardingDogWithStayStatus);
}

function boardingDogRecordForDisplay(id = "") {
  if (!id) return null;
  const displayRecord = consolidatedBoardingDogRecords().find((record) => record.id === id || (record.sourceRecordIds || []).includes(id));
  if (displayRecord) return displayRecord;
  const rawRecord = readRecords("boardingDog").find((record) => record.id === id && !record.removed);
  return rawRecord ? boardingDogWithStayStatus(boardingDogWithCanonicalProfile(rawRecord)) : null;
}

function boardingStayEntryForRecord(record = {}, stay = {}) {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const matchedStay = stay?.id ? boardingStayByReference(displayRecord, { stayId: stay.id, requestCode: stay.requestCode || "" }) || stay : stay || {};
  const codedStay = boardingStayWithRequestCode(displayRecord, matchedStay);
  return {
    record: displayRecord,
    stay: codedStay,
    stayId: codedStay.id || "",
    requestCode: codedStay.id ? boardingStayRequestCode(displayRecord, codedStay) : "",
    status: codedStay.id ? boardingStayDisplayStatus(displayRecord, codedStay) : boardingDisplayStatus(displayRecord),
  };
}

function boardingStayEntries(records = []) {
  return records.flatMap((record) => {
    const displayRecord = boardingDogWithStayStatus(record || {});
    const stays = displayRecord.stays?.length ? displayRecord.stays : [{}];
    return stays.map((stay) => boardingStayEntryForRecord(displayRecord, stay));
  });
}

function boardingStayEntryKey(entry = {}) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const dogKey = boardingDogIdentityTokens(record).sort().join("|")
    || [record.id, ...(record.sourceRecordIds || [])].filter(Boolean).sort().join("|")
    || normalizedDogIdentityName(record);
  const timeKey = boardingStayMergeKeyForRecord(record, stay);
  const sourceKey = boardingStaySourceIds(stay).sort().join("|");
  const stayKey = timeKey?.startsWith("time:") || timeKey?.startsWith("stay-window|") ? timeKey : sourceKey || entry.requestCode || timeKey;
  return [dogKey, stayKey].filter(Boolean).join("::");
}

function uniqueBoardingStayEntries(entries = []) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = boardingStayEntryKey(entry);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function boardingStayEntrySortTime(entry = {}) {
  const stay = entry.stay || {};
  const record = entry.record || {};
  const value = stay.updatedAt || stay.createdAt || stay.dropoffTime || record.submittedAt || record.updatedAt || 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function findMatchingBoardingDogProfile(record = {}, options = {}) {
  const tokens = new Set(boardingDogIdentityTokens(record));
  if (!tokens.size) return null;
  return consolidatedBoardingDogRecords()
    .filter((item) => item.id !== options.excludeId && !(item.sourceRecordIds || []).includes(options.excludeId))
    .find((item) => boardingDogIdentityTokens(item).some((token) => tokens.has(token))) || null;
}

function handleBoardingViewToggle(view = "board") {
  boardingViewMode = view === "list" ? "list" : "board";
  $("#boardingBoardViewBtn")?.classList.toggle("is-active", boardingViewMode === "board");
  $("#boardingListViewBtn")?.classList.toggle("is-active", boardingViewMode === "list");
  $("#boardingQueueGroups")?.classList.toggle("is-hidden", boardingViewMode !== "board");
  $("#boardingDogsPage .table-settings-shell")?.classList.toggle("is-hidden", boardingViewMode !== "list");
  $("#boardingDogQuickCards")?.classList.toggle("is-hidden", boardingViewMode !== "list");
}

function renderBoardingDogs() {
  const query = $("#boardingDogSearch").value || "";
  const allRecords = consolidatedBoardingDogRecords();
  renderBoardingRosterTabs(allRecords);
  renderBoardingQueueGroups(allRecords);
  const hasSearchQuery = Boolean(query.trim());
  const matchingRecords = allRecords.filter((record) => boardingDogMatchesSearch(record, query));
  const rosterRecords = hasSearchQuery ? matchingRecords : matchingRecords.filter((record) => boardingDogMatchesRosterFilter(record));
  const filteredRecords = boardingDogPriorityFilter === "vaccines-expiring-soon"
    ? rosterRecords.filter((record) => vaccinationExpiresSoon(record, 30))
    : rosterRecords;
  const records = sortRecordsForTable("boardingDog", filteredRecords);
  const columns = activeColumns("boardingDog");
  $("#boardingDogTableHead").innerHTML = `<tr>${columns.map((column) => `<th data-sort-column="${column.key}" data-table="boardingDog" data-column="${column.key}" draggable="true" title="Drag to reorder. Double-click to sort.">${escapeHtml(column.label)}</th>`).join("")}<th>Actions</th></tr>`;
  $("#boardingDogTableBody").innerHTML = records.length
    ? records
        .map((record) => {
          return `<tr data-id="${record.id}" data-source="${escapeHtml(record.sourceType || record.type || "boardingDog")}">${columns.map((column) => `<td>${boardingTableCellHtml(column, record)}</td>`).join("")}<td><div class="record-actions table-actions">${dogTypeBadgeHtml("boardingDog")}${boardingStatusChipHtml(record)}${boardingQuickActionButtons(record)}<button type="button" class="secondary-button" data-action="open-boarding-request-tab" data-id="${escapeHtml(record.id)}">Boarding & Request</button>${boardingOwnerLinkButtonHtml(record)}<span class="inline-save-status" data-inline-status-message="${escapeHtml(record.id)}" aria-live="polite"></span></div></td></tr>`;
        })
        .join("")
    : `<tr><td colspan="${(columns.length || 1) + 1}">${hasSearchQuery ? "No boarding dog records match this search." : `No ${escapeHtml(boardingRosterFilterLabel(boardingDogRosterFilter)).toLowerCase()} match this search.`}</td></tr>`;
  renderBoardingQuickCards(records);
  renderColumnManager("boardingDog", "#boardingDogColumnManager");
  renderCustomerDogUploadCards();
  handleBoardingViewToggle(boardingViewMode);
}

function boardingStayNeedsDuplicateStatusSync(record = {}, stay = {}, nextStatus = "", options = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  if (status !== nextStatus) return true;
  if (nextStatus === "In Kennel") {
    const kennelLocation = options.kennelLocation || {};
    return Boolean(kennelLocation.id && stay.kennelLocationId !== kennelLocation.id);
  }
  return Boolean(
    stay.kennelLocationId
      || stay.kennelLocationName
      || stay.kennelBuilding
      || stay.kennelAssignedAt
      || record.kennelLocationId
      || record.kennelLocationName
      || record.kennelBuilding
      || record.kennelAssignedAt,
  );
}

async function syncDuplicateBoardingStayStatusRecords(originalRecord = {}, updatedRecord = {}, targetStay = {}, nextStatus = "", options = {}) {
  if (!targetStay?.id || !boardingLifecycleStatuses.includes(nextStatus)) return [];
  const sourceIds = [...new Set([
    originalRecord.id,
    updatedRecord.id,
    ...(originalRecord.sourceRecordIds || []),
    ...(updatedRecord.sourceRecordIds || []),
    ...(targetStay.sourceRecordIds || []),
  ].filter(Boolean))];
  const syncedRecords = [];
  const sourceRecords = readRecords("boardingDog").filter((record) => sourceIds.includes(record.id) && !record.removed && record.id !== updatedRecord.id);
  for (const sourceRecord of sourceRecords) {
    const sourceStay = (sourceRecord.stays || []).find((stay) => boardingStayMatchesIdentity(stay, targetStay));
    if (!sourceStay || !boardingStayNeedsDuplicateStatusSync(sourceRecord, sourceStay, nextStatus, options)) continue;
    const synced = withBoardingStatusTransition(sourceRecord, nextStatus, {
      ...options,
      stayId: sourceStay.id,
      forceStatusSync: true,
    });
    if (!synced) continue;
    const stored = upsertRecord("boardingDog", synced);
    await sendPayload(stored);
    syncedRecords.push(stored);
  }
  return syncedRecords;
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
  if (options.stayId) {
    await syncDuplicateBoardingStayStatusRecords(record, updated, boardingStayByReference(record, options) || boardingStayByReference(updated, options), nextStatus, options);
  }
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    renderBoardingHistory(updated);
    renderBoardingKennelLocationControl(updated);
    setDogPhoto("boarding", updated);
  }
  showToast(`Boarding status updated to ${nextStatus}.`);
  return updated;
}

function withInlineBoardingStatusTransition(record = {}, nextStatus = "", options = {}) {
  const timestamp = new Date().toISOString();
  const transitioned = withBoardingStatusTransition(record, nextStatus, {
    ...options,
    forceStatusSync: true,
    early: false,
  });
  if (!transitioned) return null;
  const history = [...(transitioned.statusHistory || [])];
  const latestIndex = history.length - 1;
  if (latestIndex >= 0) {
    history[latestIndex] = {
      ...history[latestIndex],
      status: nextStatus,
      changedAt: history[latestIndex].date || timestamp,
      changedBy: currentUser?.email || helperEmail?.value || "",
    };
  }
  return {
    ...transitioned,
    updatedAt: timestamp,
    statusHistory: history,
  };
}

function updateInlineBoardingStatusDom(button, optimisticRecord = {}) {
  const container = button.closest("tr, .mobile-roster-card");
  if (!container) return;
  const statusChip = container.querySelector(".boarding-status-chip");
  if (statusChip) statusChip.outerHTML = boardingStatusChipHtml(optimisticRecord);
  const actions = button.closest("[data-inline-status-actions]");
  if (actions) {
    actions.outerHTML = boardingQuickActionButtons(optimisticRecord);
    const nextActions = container.querySelector(`[data-inline-status-actions="${cssEscapeValue(optimisticRecord.id || "")}"]`);
    nextActions?.querySelectorAll("button").forEach((actionButton) => {
      actionButton.disabled = true;
      actionButton.classList.add("is-loading");
    });
  }
  const message = container.querySelector(`[data-inline-status-message="${cssEscapeValue(optimisticRecord.id || "")}"]`);
  if (message) {
    message.textContent = "Saving...";
    message.classList.remove("is-error", "is-saved");
  }
}

function setInlineBoardingStatusMessage(recordId = "", text = "", className = "") {
  $$(`[data-inline-status-message="${cssEscapeValue(recordId)}"]`).forEach((message) => {
    message.textContent = text;
    message.classList.toggle("is-error", className === "error");
    message.classList.toggle("is-saved", className === "saved");
  });
}

async function handleInlineBoardingStatusClick(button) {
  const record = boardingDogRecordForDisplay(button.dataset.id);
  const nextStatus = button.dataset.nextStatus || "";
  if (!record || !nextStatus) return;
  const reference = boardingStayReferenceFromAction(button);
  const options = reference.stayId ? reference : {};
  const optimisticRecord = withInlineBoardingStatusTransition(record, nextStatus, options);
  if (!optimisticRecord) {
    showToast("That boarding status transition is not allowed.");
    return;
  }
  button.disabled = true;
  button.classList.add("is-loading");
  updateInlineBoardingStatusDom(button, optimisticRecord);
  const savedLocal = upsertRecord("boardingDog", optimisticRecord);
  try {
    await sendPayload(savedLocal);
    if (options.stayId) {
      await syncDuplicateBoardingStayStatusRecords(record, savedLocal, boardingStayByReference(record, options) || boardingStayByReference(savedLocal, options), nextStatus, options);
    }
    await addAuditLog("Changed boarding status", "boardingDog", savedLocal, `${savedLocal.dogName || "Dog"}: ${nextStatus}`);
    renderBoardingDogs();
    renderBoardingRequests();
    renderCustomerRequests();
    renderDashboard();
    setInlineBoardingStatusMessage(savedLocal.id, "Saved", "saved");
    window.setTimeout(() => setInlineBoardingStatusMessage(savedLocal.id, "", ""), 2200);
  } catch (error) {
    upsertRecord("boardingDog", record);
    renderBoardingDogs();
    renderBoardingRequests();
    renderCustomerRequests();
    renderDashboard();
    setInlineBoardingStatusMessage(record.id, "Save failed - tap to retry.", "error");
    showToast(`Status save failed: ${error.message || error}`);
  }
}

async function handleBoardingTransition(record = {}, nextStatus = "", options = {}) {
  if (nextStatus === "Ready For Pickup") {
    openReadyForPickupReview(record, options);
    return null;
  }
  if (nextStatus === "Checked Out") {
    openCheckoutInvoicePopup(record, options);
    return null;
  }
  return saveBoardingStatusTransition(record, nextStatus, options);
}

function dogRosterKey(record) {
  return boardingDogIdentityTokens(record).sort().join("|")
    || `${record.dogName || record.callName || record.showName || ""}|${record.ownerEmail || record.ownerPhone || record.ownerName || record.sourceType || ""}`.toLowerCase();
}

function combinedBoardingDogRecords() {
  const records = readRecords("boardingDog")
    .filter((record) => !record.removed && !["Cancelled", "Checked Out"].includes(boardingDisplayStatus(record)))
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

function boardingRequestStatusFilterStorageKey() {
  const userKey = typeof currentUserNotificationKey === "function" ? currentUserNotificationKey() : "";
  return `${stateKeys.boardingRequestStatusFilter}:${userKey || "default"}`;
}

function readBoardingRequestStatusFilter() {
  try {
    const raw = localStorage.getItem(boardingRequestStatusFilterStorageKey());
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) return [...new Set(parsed.filter((status) => boardingLifecycleStatuses.includes(status)))];
    if (typeof parsed === "string" && boardingLifecycleStatuses.includes(parsed)) return [parsed];
  } catch (_error) {
    const legacy = localStorage.getItem(boardingRequestStatusFilterStorageKey()) || "";
    if (boardingLifecycleStatuses.includes(legacy)) return [legacy];
  }
  return [];
}

function writeBoardingRequestStatusFilter(statuses = []) {
  const clean = [...new Set(arrayValue(statuses).filter((status) => boardingLifecycleStatuses.includes(status)))];
  localStorage.setItem(boardingRequestStatusFilterStorageKey(), JSON.stringify(clean));
  return clean;
}

function boardingRequestFilterLabel(statuses = []) {
  if (!statuses.length || statuses.length === boardingLifecycleStatuses.length) return "All";
  if (statuses.length === 1) return statuses[0];
  return `${statuses.length} statuses`;
}

function syncBoardingRequestFilterUi(statuses = readBoardingRequestStatusFilter()) {
  const selected = statuses.filter((status) => boardingLifecycleStatuses.includes(status));
  const count = $("#boardingRequestFilterCount");
  const summary = $("#boardingRequestFilterSummary");
  if (count) count.textContent = boardingRequestFilterLabel(selected);
  if (summary) {
    summary.innerHTML = selected.length
      ? selected.map((status) => `<span class="status-chip">${escapeHtml(status)}</span>`).join("")
      : `<span class="status-chip">All statuses</span>`;
  }
}

function boardingRequestFilterPopupHtml(statuses = readBoardingRequestStatusFilter()) {
  const selected = new Set(statuses);
  return `<form id="boardingRequestFilterForm" class="tracker-form request-filter-popup">
    <article class="record-card compact-record-card">
      <strong>Boarding request views</strong>
      <p>Select one or more stay statuses. Leave all unchecked to show every boarding request.</p>
    </article>
    <div class="request-filter-options">
      ${boardingLifecycleStatuses.map((status) => `<label class="toggle-row request-filter-option"><input type="checkbox" name="statuses" value="${escapeHtml(status)}" ${selected.has(status) ? "checked" : ""} /> <span>${escapeHtml(status)}</span></label>`).join("")}
    </div>
    <div class="button-row">
      <button type="submit">Save Filter</button>
      <button type="button" class="secondary-button" data-action="clear-boarding-request-filter">Show All</button>
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </form>`;
}

function saveBoardingRequestFilterFromForm(formEl) {
  const selected = [...formEl.querySelectorAll('input[name="statuses"]:checked')].map((input) => input.value);
  const statuses = writeBoardingRequestStatusFilter(selected);
  syncBoardingRequestFilterUi(statuses);
  renderBoardingRequests();
  $("#detailDialog").close();
  showToast(statuses.length ? "Boarding request filter saved." : "Showing all boarding requests.");
}

function boardingFamilyOwnerKey(record = {}) {
  const explicitId = String(record.householdId || record.familyGroupId || record.familyId || record.customerAccountId || "").trim();
  if (explicitId) return `id:${explicitId}`;
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail || record.linkedOwnerEmail || record.requestedByEmail || "");
  if (ownerEmail) return `email:${ownerEmail}`;
  const ownerPhone = String(record.ownerPhone || record.customerPhone || record.requestedByPhone || "").replace(/\D/g, "");
  if (ownerPhone) return `phone:${ownerPhone}`;
  const ownerName = String(record.ownerName || record.requestedByName || "").trim().toLowerCase();
  return ownerName ? `name:${ownerName}` : "";
}

function boardingFamilyStayKey(stay = {}) {
  const dropoff = String(stay.dropoffTime || "").trim();
  const pickup = String(stay.pickupTime || "").trim();
  if (!dropoff || !pickup) return "";
  return `${dropoff}|${pickup}`;
}

function boardingFamilyGroupKey(entry = {}) {
  const ownerKey = boardingFamilyOwnerKey(entry.record || {});
  const stayKey = boardingFamilyStayKey(entry.stay || {});
  return ownerKey && stayKey ? `${ownerKey}::${stayKey}` : "";
}

function boardingFamilyName(record = {}) {
  const explicit = String(record.householdName || record.familyName || "").trim();
  if (explicit) return boardingFamilyNameLabel(explicit.replace(/\s+family$/i, ""));
  const ownerName = String(record.ownerName || record.requestedByName || "").trim();
  const parts = ownerName
    .replace(/[,&/]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length) return boardingFamilyNameLabel(parts[parts.length - 1]);
  const emailPrefix = String(record.ownerEmail || record.customerEmail || record.requestedByEmail || "").split("@")[0] || "";
  const emailParts = emailPrefix.split(/[._-]+/).filter(Boolean);
  return emailParts.length ? boardingFamilyNameLabel(emailParts[emailParts.length - 1]) : "Family";
}

function boardingFamilyNameLabel(value = "") {
  const label = String(value || "").trim();
  if (!label) return "Family";
  return label
    .split(/\s+/)
    .map((part) => part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

function boardingFamilyStatusSummary(entries = []) {
  const statuses = [...new Set(entries.map((entry) => entry.status).filter(Boolean))];
  if (!statuses.length) return "Status not set";
  return statuses.length === 1 ? statuses[0] : "Mixed statuses";
}

function boardingFamilyPricingSnapshots(entries = []) {
  const snapshots = new Map();
  const activeEntries = entries.filter((entry) => boardingStayCanUseCurrentPricing(entry.record || {}, entry.stay || {}));
  if (!activeEntries.length) return snapshots;
  const first = activeEntries[0] || {};
  const firstRecord = first.record || {};
  const firstStay = first.stay || {};
  const ratePlan = boardingRatePlanForRecord(firstRecord);
  const stayProgram = firstStay.stayProgram || firstStay.pricingSnapshot?.stayProgram || null;
  const isServiceRequest = String(firstStay.stayType || firstRecord.stayType || "").trim() === "Service Request";
  const days = isServiceRequest ? 0 : boardingDays(firstStay.dropoffTime, firstStay.pickupTime);
  const hadMemberSnapshot = activeEntries.some((entry) => entry.stay?.pricingSnapshot?.isMemberPricing);
  const explicitSharedCrate = activeEntries.some((entry) => entry.stay?.pricingSnapshot?.sharedCrateRequested);
  const sharedCrateRequested = Boolean(ratePlan.isMemberPricing && !stayProgram && activeEntries.length > 1 && (explicitSharedCrate || !hadMemberSnapshot));
  const useSavedMemberRoles = Boolean(ratePlan.isMemberPricing && activeEntries.some((entry) => entry.stay?.pricingSnapshot?.isMemberPricing && ["primary", "shared-crate-additional"].includes(entry.stay?.pricingSnapshot?.currentDogRole)));
  const lines = useSavedMemberRoles
    ? activeEntries.map((entry) => {
      const record = entry.record || {};
      const savedRole = entry.stay?.pricingSnapshot?.currentDogRole === "shared-crate-additional" ? "shared-crate-additional" : "primary";
      const rate = isServiceRequest ? 0 : savedRole === "shared-crate-additional" ? ratePlan.sharedCrateRate : ratePlan.primaryRate;
      return {
        dogKey: boardingPricingDogKey(record),
        dogId: record.id || "",
        dogName: record.dogName || "Dog",
        role: savedRole,
        rate,
        days,
        total: days * rate,
        sharedCrateRequested,
        crateGroupId: entry.stay?.pricingSnapshot?.crateGroupId || "",
      };
    })
    : boardingDogPricingLines(activeEntries.map((entry) => entry.record || {}), {
      ratePlan,
      days,
      isServiceRequest,
      sharedCrateRequested,
      stayProgram,
    });
  const groupBoardingSubtotal = lines.reduce((total, line) => total + Number(line.total || 0), 0);
  const groupServiceSubtotal = activeEntries.reduce((total, entry) => total + boardingStayRequestTotal(entry.stay?.requests || [], {
    user: boardingPricingUserForRecord(entry.record || {}),
    preferCatalogPricing: true,
  }), 0);
  const groupTotal = groupBoardingSubtotal + groupServiceSubtotal;
  activeEntries.forEach((entry, index) => {
    const record = entry.record || {};
    const stay = entry.stay || {};
    const line = lines[index] || {};
    snapshots.set(entry, boardingCurrentPricingSnapshotForStay(record, stay, {
      forceCurrentPricing: true,
      ratePlan,
      currentDogKey: line.dogKey || boardingPricingDogKey(record),
      currentDogName: line.dogName || record.dogName || "Dog",
      currentDogRole: line.role,
      sharedCrateRequested,
      crateGroupId: line.crateGroupId || "",
      stayProgram,
      groupBoardingSubtotal,
      groupServiceSubtotal,
      groupTotal,
    }));
  });
  return snapshots;
}

function boardingFamilyPricingSnapshotForStay(record = {}, stay = {}) {
  if (!stay?.id || !boardingStayCanUseCurrentPricing(record, stay)) return null;
  const targetEntry = boardingStayEntryForRecord(record, stay);
  const targetKey = boardingFamilyGroupKey(targetEntry);
  if (!targetKey) return null;
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog").filter((item) => item.customerRequest && !item.removed));
  const entries = uniqueBoardingStayEntries(boardingStayEntries(records)).filter((entry) => boardingFamilyGroupKey(entry) === targetKey);
  if (entries.length <= 1) return null;
  const snapshots = boardingFamilyPricingSnapshots(entries);
  const recordIds = new Set([record.id, ...(record.sourceRecordIds || [])].filter(Boolean));
  const matchedEntry = entries.find((entry) => {
    const entryRecordIds = [entry.record?.id, ...(entry.record?.sourceRecordIds || [])].filter(Boolean);
    const sameRecord = entryRecordIds.some((id) => recordIds.has(id));
    const sameStay = boardingStaySharesExplicitIdentity(entry.stay || {}, stay) || boardingStayMatchesIdentity(entry.stay || {}, stay);
    return sameRecord && sameStay;
  });
  return matchedEntry ? snapshots.get(matchedEntry) || null : null;
}

function boardingFamilyGroups(entries = []) {
  const groups = new Map();
  const singles = [];
  entries.forEach((entry) => {
    const key = boardingFamilyGroupKey(entry);
    if (!key) {
      singles.push(entry);
      return;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  const groupedKeys = new Set([...groups].filter(([, items]) => items.length > 1).map(([key]) => key));
  const output = [];
  const emitted = new Set();
  entries.forEach((entry) => {
    const key = boardingFamilyGroupKey(entry);
    if (key && groupedKeys.has(key)) {
      if (!emitted.has(key)) {
        output.push({ type: "family", entries: groups.get(key) });
        emitted.add(key);
      }
      return;
    }
    if (!key || singles.includes(entry) || !groupedKeys.has(key)) output.push({ type: "single", entry });
  });
  return output;
}

function boardingRequestCardHtml(entry = {}, options = {}) {
  const record = entry.record || {};
  const stay = entry.stay || {};
  const services = boardingStayServicesText(stay, { user: boardingPricingUserForRecord(record), preferCatalogPricing: true });
  const status = entry.status;
  const serviceOnly = isServiceRequestStay(record, stay);
  const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const pricingSnapshot = options.pricingSnapshot || boardingCurrentPricingSnapshotForStay(record, stay);
  const total = boardingStayInvoiceTotal(record, stay, pricingSnapshot ? { pricingSnapshot } : {});
  const approveAction = status === "Cancelled" ? `<button type="button" class="secondary-button" data-action="approve-boarding" data-id="${escapeHtml(record.id)}"${stayAttr}>Approve Request</button>` : "";
  const actions = `<div class="record-actions"><button type="button" class="secondary-button" data-action="change-boarding" data-id="${escapeHtml(record.id)}"${stayAttr}>Change</button>${approveAction}</div>${stay.id ? boardingStayTransitionActions(record, stay) : boardingTransitionActions(record)}`;
  const familyChip = options.familyName ? `<span class="status-chip boarding-family-chip">Same family: ${escapeHtml(options.familyName)}</span>` : "";
  return `<article class="record-card clickable-card ${serviceOnly ? "is-service-only-request" : ""} ${statusClassForRequest(status)} ${statusClassForBoardingStatus(status)}" data-id="${escapeHtml(record.id)}"${stayAttr} data-action="view-boarding-request"><strong>${escapeHtml(record.dogName || "Dog")}</strong><div class="chip-row">${dogTypeBadgeHtml("boardingDog")}${familyChip}${stay.id ? boardingStayRequestCodeChipHtml(record, stay) : ""}<button type="button" class="status-chip-button" data-action="open-boarding-request-tab" data-id="${escapeHtml(record.id)}"${stayAttr}>${stay.id ? boardingStayStatusChipHtml(record, stay) : boardingStatusChipHtml(record)}</button>${stay.id ? boardingStayServiceFlagHtml(record, stay) : ""}</div><span>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</span><p>${escapeHtml(services)}</p>${total ? `<p><strong>Estimated total:</strong> ${money(total)}</p>` : ""}${actions}</article>`;
}

function boardingFamilyGroupHtml(entries = []) {
  const first = entries[0] || {};
  const firstRecord = first.record || {};
  const firstStay = first.stay || {};
  const familyName = boardingFamilyName(firstRecord);
  const familyTitle = familyName.toLowerCase() === "family" ? "Family Stay" : `${familyName} Family Stay`;
  const dogNames = entries.map((entry) => entry.record?.dogName || "Dog").filter(Boolean);
  const statusSummary = boardingFamilyStatusSummary(entries);
  const pricingSnapshots = boardingFamilyPricingSnapshots(entries);
  return `<section class="boarding-family-group">
    <div class="boarding-family-header">
      <div>
        <strong>${escapeHtml(familyTitle)}</strong>
        <span>${escapeHtml(dogNames.join(", "))}</span>
        <p>${formatDateTime(firstStay.dropoffTime)} to ${formatDateTime(firstStay.pickupTime)}</p>
      </div>
      <div class="chip-row"><span class="status-chip boarding-family-chip">${entries.length} dogs</span><span class="status-chip">${escapeHtml(statusSummary)}</span></div>
    </div>
    <div class="boarding-family-dogs">${entries.map((entry) => boardingRequestCardHtml(entry, { familyName, pricingSnapshot: pricingSnapshots.get(entry) })).join("")}</div>
  </section>`;
}

function renderBoardingRequests() {
  const list = $("#boardingRequestRecords");
  if (!list) return;
  const statusFilters = readBoardingRequestStatusFilter();
  syncBoardingRequestFilterUi(statusFilters);
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => record.customerRequest)
    .filter((record) => !record.removed));
  const entries = uniqueBoardingStayEntries(boardingStayEntries(records))
    .filter((entry) => !statusFilters.length || statusFilters.includes(entry.status))
    .sort((a, b) => boardingStayEntrySortTime(b) - boardingStayEntrySortTime(a));
  list.innerHTML = entries.length
    ? boardingFamilyGroups(entries)
        .map((item) => (item.type === "family" ? boardingFamilyGroupHtml(item.entries) : boardingRequestCardHtml(item.entry)))
        .join("")
    : `<p>No ${statusFilters.length ? statusFilters.join(", ").toLowerCase() + " " : ""}boarding requests yet.</p>`;
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

function explicitBoardingStatus(value = "") {
  const status = String(value || "").trim();
  if (!status) return "";
  return boardingLifecycleStatuses.includes(status) ? status : normalizeBoardingStatus({ boardingStatus: status });
}

function activeBoardingStay(record = {}, date = new Date()) {
  const now = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(now.getTime())) return null;
  return (record.stays || []).find((stay) => {
    if (inactiveBoardingStayStatus(stay)) return false;
    const explicitStatus = explicitBoardingStatus(stay.status) || explicitBoardingStatus(record.boardingStatus || record.status);
    if (!activeBoardingStayStatuses.includes(explicitStatus)) return false;
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
    ? files.map((file) => `<article class="record-card compact-record-card"><strong>${escapeHtml(file.name || "Health record")}</strong><span>${escapeHtml(formatDateTime(file.savedAt || file.createdAt))}</span>${file.note ? `<p>${escapeHtml(file.note)}</p>` : ""}<div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="${escapeHtml(file.url || file.dataUrl || "")}" data-media-type="${escapeHtml(file.type || "")}" data-media-name="${escapeHtml(file.name || "Health record")}"${mediaAccessAttrs(file, { sourceRecordId: record.id || file.sourceRecordId || "", sourceRecordType: "boardingDog" })}>Open</button></div></article>`).join("")
    : `<article class="record-card compact-record-card"><strong>No health records uploaded yet.</strong><p>Choose files in this tab, then save the dog profile.</p></article>`;
}

function customerUpdateMediaHtml(update = {}) {
  const items = update.mediaItems || [];
  return items.map((item) => {
    const type = String(item.type || "");
    const label = type.startsWith("video/") ? "Open video" : type.startsWith("image/") ? "Open photo" : "Open media";
    return `<button type="button" class="media-preview-button secondary-button" data-action="view-media" data-src="${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="${escapeHtml(type || "application/octet-stream")}" data-media-name="${escapeHtml(item.name || "Customer update media")}"${mediaAccessAttrs(item, { sourceRecordId: update.boardingDogId || item.sourceRecordId || "", sourceRecordType: "boardingDog" })}>${label}</button>`;
  }).join("");
}

function renderBoardingCustomerUpdates(record = activeBoardingDog() || {}) {
  const list = $("#boardingCustomerUpdateList");
  if (!list) return;
  const displayRecord = boardingDogWithStayStatus(record || {});
  const activeStays = ownerUpdateStaysForRecord(displayRecord);
  const stayCards = activeStays.length
    ? `<section class="popup-record-section"><h3>Owner Updates by Stay</h3>${activeStays.map((stay) => {
        const requestCode = boardingStayRequestCode(displayRecord, stay);
        return `<article class="record-card compact-record-card customer-update-stay-card"><strong>${escapeHtml(displayRecord.dogName || "Boarding dog")}</strong><div class="chip-row">${customerStayIdChipHtml(displayRecord, stay)}${boardingStayStatusChipHtml(displayRecord, stay)}</div><p>${escapeHtml(formatDateTime(stay.dropoffTime))} to ${escapeHtml(formatDateTime(stay.pickupTime))}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="${escapeHtml(displayRecord.id || "")}" data-id="${escapeHtml(stay.id || "")}" data-request-code="${escapeHtml(requestCode)}">Update Owner</button></div></article>`;
      }).join("")}</section>`
    : `<article class="record-card compact-record-card"><strong>No in-care stay available.</strong><p>Owner updates can be sent after a stay is checked in, in kennel, or ready for pickup.</p></article>`;
  const updates = [...(displayRecord.customerUpdates || [])].sort((a, b) => new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0));
  const updateHistory = updates.length
    ? updates.map((update) => {
        const stay = boardingStayByReference(displayRecord, { stayId: update.stayId || "", requestCode: update.requestCode || "" }) || {};
        const requestCode = update.requestCode || (stay.id ? boardingStayRequestCode(displayRecord, stay) : "");
        return `<article class="record-card compact-record-card"><strong>${escapeHtml(formatDateTime(update.createdAt || update.submittedAt) || "Customer update")}</strong><span>${escapeHtml([update.byName || update.by || "Staff update", requestCode ? `Stay ID: ${requestCode}` : ""].filter(Boolean).join(" | "))}</span><p>${escapeHtml(update.note || "")}</p><div class="record-actions">${customerUpdateMediaHtml(update)}</div></article>`;
      }).join("")
    : `<article class="record-card compact-record-card"><strong>No customer updates sent yet.</strong><p>Updates sent from a stay will appear here and in the customer Updates menu.</p></article>`;
  list.innerHTML = `${stayCards}<section class="popup-record-section"><h3>Sent Updates</h3>${updateHistory}</section>`;
}

function boardingDogDocumentItems(record = {}) {
  const documents = arrayValue(record.documents);
  const legacyDocuments = documents.length ? documents : arrayValue(record.boardingDocuments);
  return legacyDocuments.map((item) => ({
    id: item.id || uid("file"),
    name: item.name || item.fileName || "Boarding dog file",
    type: item.type || item.contentType || "application/octet-stream",
    size: item.size || 0,
    savedAt: item.savedAt || item.uploadedAt || item.createdAt || "",
    url: item.url || "",
    storagePath: item.storagePath || item.path || "",
    dataUrl: item.dataUrl || "",
    note: item.note || "",
  }));
}

function boardingDogFileItem(item = {}, source, sourceLabel, options = {}) {
  return {
    id: item.id || uid("file"),
    parentId: options.parentId || "",
    sourceRecordId: options.sourceRecordId || "",
    source,
    sourceLabel,
    name: item.name || item.fileName || options.fallbackName || "Uploaded file",
    type: item.type || item.contentType || "application/octet-stream",
    size: item.size || 0,
    savedAt: item.savedAt || item.uploadedAt || item.createdAt || "",
    url: item.url || "",
    storagePath: item.storagePath || item.path || "",
    dataUrl: item.dataUrl || "",
    note: item.note || "",
    canRename: options.canRename !== false,
    canRemove: options.canRemove !== false,
  };
}

function boardingDogFileItems(record = {}) {
  const files = [
    ...boardingDogDocumentItems(record).map((file) => boardingDogFileItem(file, "boardingDocuments", "Staff uploaded file", { sourceRecordId: record.id, canRemove: true })),
    ...arrayValue(record.vaccinationRecords).map((file) => boardingDogFileItem(file, "boardingVaccination", "Health record", { sourceRecordId: record.id, fallbackName: "Health record" })),
    ...arrayValue(record.customerUpdates).flatMap((update) =>
      arrayValue(update.mediaItems).map((file) =>
        boardingDogFileItem(file, "boardingCustomerUpdate", "Customer update media", {
          parentId: update.id || "",
          sourceRecordId: record.id,
          fallbackName: "Customer update media",
        }),
      ),
    ),
  ];
  const linkedDog = linkedCustomerDogForBoarding(record);
  if (linkedDog) {
    files.push(
      ...arrayValue(linkedDog.vaccinationRecords).map((file) =>
        boardingDogFileItem(file, "customerVaccination", "Customer uploaded health record", {
          sourceRecordId: linkedDog.id,
          fallbackName: "Customer health record",
        }),
      ),
      ...arrayValue(linkedDog.documents).map((file) =>
        boardingDogFileItem(file, "customerDocuments", "Customer uploaded file", {
          sourceRecordId: linkedDog.id,
          fallbackName: "Customer file",
        }),
      ),
    );
  }
  return files.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

function renderBoardingDogFiles(record = activeBoardingDog() || {}) {
  const list = $("#boardingDogUploadedFileList");
  if (!list) return;
  if (!record?.id) {
    list.innerHTML = "<p>Save this boarding dog before uploading files.</p>";
    return;
  }
  const files = boardingDogFileItems(record);
  list.innerHTML = files.length
    ? files.map((file) => {
        const source = file.url || file.dataUrl || "";
        const savedText = file.savedAt ? `Uploaded ${formatDateTime(file.savedAt)}` : "Uploaded date not recorded";
        const sourceText = `<p>${escapeHtml(file.sourceLabel)}</p>`;
        const noteText = file.note ? `<p>${escapeHtml(file.note)}</p>` : "";
        const renameInput = file.canRename ? `<label>File name<input type="text" value="${escapeHtml(file.name)}" data-action="rename-boarding-file-input" data-id="${escapeHtml(file.id)}" data-source="${escapeHtml(file.source)}" data-parent-id="${escapeHtml(file.parentId)}" data-source-record-id="${escapeHtml(file.sourceRecordId)}" /></label>` : "";
        const renameButton = file.canRename ? `<button type="button" class="secondary-button" data-action="save-boarding-file-name" data-id="${escapeHtml(file.id)}" data-source="${escapeHtml(file.source)}" data-parent-id="${escapeHtml(file.parentId)}" data-source-record-id="${escapeHtml(file.sourceRecordId)}">Rename</button>` : "";
        const removeButton = file.canRemove ? `<button type="button" class="secondary-button danger-button" data-action="remove-boarding-file" data-id="${escapeHtml(file.id)}" data-source="${escapeHtml(file.source)}" data-parent-id="${escapeHtml(file.parentId)}" data-source-record-id="${escapeHtml(file.sourceRecordId)}">Remove</button>` : "";
        return `<article class="record-card compact-record-card dog-file-card" data-file-id="${escapeHtml(file.id)}"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(savedText)}</span>${sourceText}${noteText}${renameInput}<div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="${escapeHtml(source)}" data-media-type="${escapeHtml(file.type)}" data-media-name="${escapeHtml(file.name)}"${mediaAccessAttrs(file, { sourceRecordId: file.sourceRecordId || record.id || "", sourceRecordType: file.sourceRecordType || (file.source?.startsWith("customer") ? "customerDog" : "boardingDog") })}>Open</button>${renameButton}${removeButton}</div></article>`;
      }).join("")
    : "<p>No uploaded files saved for this boarding dog yet.</p>";
}

function refreshBoardingDogFileViews(record = activeBoardingDog() || {}) {
  const activeId = $("#boardingDogForm")?.elements.id.value || record?.id || "";
  const refreshed = boardingDogRecordForDisplay(activeId) || record;
  renderBoardingDogFiles(refreshed);
  renderBoardingVaccinationFiles(refreshed);
  renderBoardingCustomerUpdates(refreshed);
  renderBoardingDogs();
  renderCustomerDogs();
  return refreshed;
}

async function updateBoardingDogFileName({ source, id, parentId = "", sourceRecordId = "", name = "" } = {}) {
  const nextName = name.trim();
  if (!nextName) {
    showToast("File name cannot be blank.");
    return null;
  }
  if (source === "customerVaccination" || source === "customerDocuments") {
    const customerDog = readRecords("customerDog").find((record) => record.id === sourceRecordId && !record.removed);
    if (!customerDog) return null;
    const key = source === "customerVaccination" ? "vaccinationRecords" : "documents";
    const updated = upsertRecord("customerDog", {
      ...customerDog,
      [key]: arrayValue(customerDog[key]).map((file) => (file.id === id ? { ...file, name: nextName } : file)),
      updatedAt: new Date().toISOString(),
    });
    await sendPayload(updated);
    refreshBoardingDogFileViews(activeBoardingDog() || {});
    showToast("File renamed.");
    return updated;
  }
  const record = readRecords("boardingDog").find((item) => item.id === (sourceRecordId || activeBoardingDog({ raw: true })?.id) && !item.removed);
  if (!record) return null;
  const updates = {};
  if (source === "boardingDocuments") {
    updates.documents = boardingDogDocumentItems(record).map((file) => (file.id === id ? { ...file, name: nextName } : file));
  } else if (source === "boardingVaccination") {
    updates.vaccinationRecords = arrayValue(record.vaccinationRecords).map((file) => (file.id === id ? { ...file, name: nextName } : file));
    updates.vaccinationFiles = updates.vaccinationRecords.map((file) => file.name).join(", ");
  } else if (source === "boardingCustomerUpdate") {
    updates.customerUpdates = arrayValue(record.customerUpdates).map((update) =>
      update.id === parentId
        ? { ...update, mediaItems: arrayValue(update.mediaItems).map((file) => (file.id === id ? { ...file, name: nextName } : file)) }
        : update,
    );
  }
  const updated = upsertRecord("boardingDog", {
    ...record,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  refreshBoardingDogFileViews(updated);
  showToast("File renamed.");
  return updated;
}

async function updateBoardingDogDocuments(documents = []) {
  const active = activeBoardingDog({ raw: true }) || activeBoardingDog();
  if (!active?.id) {
    showToast("Save the boarding dog before managing files.");
    return null;
  }
  const updated = upsertRecord("boardingDog", {
    ...active,
    documents,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  return refreshBoardingDogFileViews(updated);
}

function boardingDogFileReferenceFromAction(action = {}) {
  return {
    source: action.dataset?.source || "",
    id: action.dataset?.id || "",
    parentId: action.dataset?.parentId || "",
    sourceRecordId: action.dataset?.sourceRecordId || "",
  };
}

function boardingDogFileFromReference(reference = {}, record = activeBoardingDog() || {}) {
  return boardingDogFileItems(record).find((file) =>
    file.id === reference.id
    && file.source === reference.source
    && (file.parentId || "") === (reference.parentId || "")
    && (file.sourceRecordId || "") === (reference.sourceRecordId || "")
  ) || null;
}

function boardingDogFileRemoveConfirmHtml(file = {}, reference = {}) {
  return `<article class="record-card compact-record-card danger-confirm-card">
    <strong>Remove ${escapeHtml(file.name || "this file")}?</strong>
    <p>This removes the file from ${escapeHtml(file.sourceLabel || "this boarding dog record")}. It does not delete the dog profile or any boarding stays.</p>
  </article>
  <div class="button-row">
    <button type="button" class="danger-button" data-action="confirm-remove-boarding-file" data-id="${escapeHtml(reference.id || "")}" data-source="${escapeHtml(reference.source || "")}" data-parent-id="${escapeHtml(reference.parentId || "")}" data-source-record-id="${escapeHtml(reference.sourceRecordId || "")}">Remove File</button>
    <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
  </div>`;
}

function openBoardingDogFileRemoveConfirm(reference = {}) {
  const file = boardingDogFileFromReference(reference);
  if (!file) {
    showToast("That file could not be found.");
    return;
  }
  showDetailDialog("Confirm Remove File", boardingDogFileRemoveConfirmHtml(file, reference));
}

async function removeBoardingDogFile(reference = {}) {
  const { source, id, parentId, sourceRecordId } = reference;
  if (!source || !id) return null;
  const timestamp = new Date().toISOString();
  if (source === "customerVaccination" || source === "customerDocuments") {
    const customerDog = readRecords("customerDog").find((record) => record.id === sourceRecordId && !record.removed);
    if (!customerDog) return null;
    const key = source === "customerVaccination" ? "vaccinationRecords" : "documents";
    const nextFiles = arrayValue(customerDog[key]).filter((file) => file.id !== id);
    const updates = { [key]: nextFiles, updatedAt: timestamp };
    if (source === "customerVaccination") updates.vaccinationFiles = nextFiles.map((file) => file.name || file.fileName).filter(Boolean).join(", ");
    const updated = upsertRecord("customerDog", { ...customerDog, ...updates });
    await sendPayload(updated);
    refreshBoardingDogFileViews(activeBoardingDog() || {});
    return updated;
  }
  const record = readRecords("boardingDog").find((item) => item.id === (sourceRecordId || activeBoardingDog({ raw: true })?.id) && !item.removed);
  if (!record) return null;
  const updates = {};
  if (source === "boardingDocuments") {
    updates.documents = boardingDogDocumentItems(record).filter((file) => file.id !== id);
  } else if (source === "boardingVaccination") {
    updates.vaccinationRecords = arrayValue(record.vaccinationRecords).filter((file) => file.id !== id);
    updates.vaccinationFiles = updates.vaccinationRecords.map((file) => file.name || file.fileName).filter(Boolean).join(", ");
  } else if (source === "boardingCustomerUpdate") {
    updates.customerUpdates = arrayValue(record.customerUpdates).map((update) =>
      update.id === parentId
        ? { ...update, mediaItems: arrayValue(update.mediaItems).filter((file) => file.id !== id) }
        : update,
    );
  } else {
    showToast("That file source cannot be removed here.");
    return null;
  }
  const updated = upsertRecord("boardingDog", { ...record, ...updates, updatedAt: timestamp });
  await sendPayload(updated);
  return refreshBoardingDogFileViews(updated);
}

async function saveBoardingCustomerUpdateForStay(record = {}, stay = {}, options = {}) {
  const displayRecord = boardingDogRecordForDisplay(record.id) || record;
  const targetStay = stay?.id ? stay : ownerUpdateStayForRecord(displayRecord, options.reference || {});
  const note = String(options.note || "").trim();
  const input = options.input || null;
  if (!displayRecord?.id) {
    showToast("Save the boarding dog before adding customer updates.");
    return null;
  }
  if (!targetStay?.id) {
    showToast("Choose a stay before sending a customer update.");
    return null;
  }
  if (!ownerUpdateStayIsAvailable(displayRecord, targetStay)) {
    showToast("Owner updates can only be sent for checked-in, in-kennel, or ready-for-pickup stays.");
    return null;
  }
  if (!note && !input?.files?.length) {
    showToast("Add a note, photo, or video before saving a customer update.");
    return null;
  }
  const timestamp = new Date().toISOString();
  const requestCode = boardingStayRequestCode(displayRecord, targetStay);
  const mediaItems = options.mediaItems || await uploadMediaFiles(input, `boarding-customer-updates/${displayRecord.id}/${targetStay.id}`, {
    allowedTypes: CUSTOMER_UPDATE_MEDIA_TYPES,
    allowedExtensions: CUSTOMER_UPDATE_MEDIA_EXTENSIONS,
    label: "customer update media",
  });
  if (!note && !mediaItems.length) {
    showToast("Add a note or upload a valid photo or video before saving a customer update.");
    return null;
  }
  const staff = staffIdentity();
  const update = {
    id: uid("customerUpdate"),
    createdAt: timestamp,
    stayId: targetStay.id || "",
    requestCode,
    stayDropoffTime: targetStay.dropoffTime || "",
    stayPickupTime: targetStay.pickupTime || "",
    stayLabel: targetStay.dropoffTime || targetStay.pickupTime ? `${formatDateTime(targetStay.dropoffTime)} to ${formatDateTime(targetStay.pickupTime)}` : "",
    boardingDogId: displayRecord.id || "",
    dogName: displayRecord.dogName || "",
    note,
    mediaItems,
    byName: staff.name,
    byEmail: staff.email,
  };
  const flags = options.clearOwnerUpdate ? (displayRecord.flags || []).filter((flag) => flag !== "Required update from owner") : displayRecord.flags || [];
  const updated = upsertRecord("boardingDog", {
    ...displayRecord,
    dailyActivity: note || displayRecord.dailyActivity || "",
    flags,
    customerUpdates: [update, ...(displayRecord.customerUpdates || []).filter((item) => item.id !== update.id)],
    latestCustomerUpdate: update,
    updatedAt: timestamp,
  });
  await sendPayload(updated);
  await notifyIfNeeded(updated, "customerStayUpdateSent");
  await mirrorBoardingCustomerUpdateToCustomerDog(updated, update);
  await addAuditLog("Added customer boarding update", "boardingDog", updated, `${updated.dogName || "Dog"} | ${requestCode} | ${note || mediaItems.map((item) => item.name).join(", ")}`);
  if (input) input.value = "";
  renderBoardingCustomerUpdates(updated);
  renderBoardingDogFiles(updated);
  renderBoardingDogs();
  renderCustomerDogs();
  renderCustomerRequests();
  renderCustomerUpdates();
  renderDashboard();
  showToast("Customer update saved.");
  return updated;
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
  const stay = activeBoardingStay(record) || currentOrNextStay(record) || {};
  return saveBoardingCustomerUpdateForStay(record, stay, { note, input });
}

function openOwnedDog(record = {}) {
  const ownedDogDetail = $("#ownedDogDetail");
  if (ownedDogDetail.parentElement !== document.body) {
    document.body.appendChild(ownedDogDetail);
  }
  ownedDogDetail.hidden = false;
  document.body.classList.add("owned-dog-modal-open");
  ownedDogDetail.scrollTop = 0;
  selectedDogPhotos.owned = null;
  $("#ownedDogDetailTitle").textContent = record.id ? `Edit ${record.callName || "Dog"}` : "Add New Dog";
  $("#ourDogForm").reset();
  const normalized = normalizeOwnedDogCare(record);
  setFormValues($("#ourDogForm"), normalized);
  $("#ourDogForm").elements.id.value = record.id || "";
  setDogPhoto("owned", normalized);
  setOwnedCareEntryVisibility(Boolean(record.id));
  renderOwnedActivity(normalized);
  renderOwnedDogFiles(normalized);
  updateOwnedDogConditionalFields();
  syncOwnedDogTabAvailability(normalized);
  setOwnedDogActiveTab("Overview");
  setOwnedFormLocked(false);
  $("#deleteOwnedDogButton").hidden = !record.id;
}

function closeOwnedDogModal() {
  const ownedDogDetail = $("#ownedDogDetail");
  if (ownedDogDetail) ownedDogDetail.hidden = true;
  document.body.classList.remove("owned-dog-modal-open");
}

function setOwnedCareEntryVisibility(visible = false) {
  $$("[data-owned-care-entry-panel]").forEach((panel) => {
    panel.hidden = !visible;
  });
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
  const combinedStatus = combinedDogSpayNeuterStatus(record);
  if (formEl.elements.spayNeuterStatus) formEl.elements.spayNeuterStatus.value = combinedStatus;
  if (formEl.elements.sex) formEl.elements.sex.value = sexFromCombinedDogSpayNeuterStatus(combinedStatus) || record.sex || "";
  if (formEl.elements.rabiesGoodThreeYears) formEl.elements.rabiesGoodThreeYears.checked = vaccineDurationIsThreeYears(record, "rabies");
  if (formEl.elements.dhppGoodThreeYears) formEl.elements.dhppGoodThreeYears.checked = vaccineDurationIsThreeYears(record, "dhpp");
  formEl.elements.id.value = record.id || "";
  if (formEl.elements.profilePhotoUrl && !record.id) formEl.elements.profilePhotoUrl.value = "";
  if ($("#boardingDogPhotoInput")) $("#boardingDogPhotoInput").value = "";
  if ($("#boardingDogVaccinationFiles")) $("#boardingDogVaccinationFiles").value = "";
  if ($("#boardingCustomerUpdatePhotoInput")) $("#boardingCustomerUpdatePhotoInput").value = "";
  if ($("#boardingDogUploadedFiles")) $("#boardingDogUploadedFiles").value = "";
}

function openBoardingDog(record = {}) {
  record = boardingDogWithCanonicalProfile(record);
  const boardingDogDetail = $("#boardingDogDetail");
  if (boardingDogDetail.parentElement !== document.body) {
    document.body.appendChild(boardingDogDetail);
  }
  boardingDogDetail.hidden = false;
  document.body.classList.add("boarding-dog-modal-open");
  boardingDogDetail.scrollTop = 0;
  $("#boardingDogDetailTitle").textContent = record.id ? `Edit ${record.dogName || "Boarding Dog"}` : "Add Boarding Dog";
  resetBoardingDogFormForRecord(record);
  setDogPhoto("boarding", record);
  $("#boardingSchedulePanel").hidden = !record.id;
  renderBoardingOwnerAccountPanel(record);
  renderBoardingVaccinationFiles(record);
  renderBoardingCustomerUpdates(record);
  renderBoardingDogFiles(record);
  renderBoardingKennelLocationControl(record);
  $$('input[name="boardingFlags"]').forEach((input) => {
    input.checked = (record.flags || []).includes(input.value);
  });
  renderBoardingStays(record);
  renderBoardingHistory(record);
  setBoardingFormLocked(false);
  setBoardingDogActiveTab("Dog Info");
}

function closeBoardingDogModal() {
  const boardingDogDetail = $("#boardingDogDetail");
  if (boardingDogDetail) boardingDogDetail.hidden = true;
  document.body.classList.remove("boarding-dog-modal-open");
}

function openBoardingDogToTab(record = {}, tabName = "Boarding & Request") {
  if (!record) return;
  openBoardingDog(record);
  setBoardingFormLocked(false);
  setBoardingDogActiveTab(tabName);
}

function setBoardingFormLocked() {
  const formEl = $("#boardingDogForm");
  [...formEl.elements].forEach((field) => {
    if (field.type === "hidden") return;
    if (field.id === "cancelBoardingDogEdit") return;
    field.disabled = false;
  });
  $("#boardingDogPhotoPicker").disabled = false;
  $("#boardingDogSaveButton").hidden = false;
  $("#deleteBoardingDogButton").hidden = !formEl.elements.id.value || currentRole() !== "admin";
  formEl.classList.remove("is-readonly");
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

function selectedBoardingKennelLocation(record = {}) {
  const stay = activeBoardingStay(record) || currentOrNextStay(record) || {};
  const id = record.kennelLocationId || stay.kennelLocationId || "";
  if (!id) return null;
  return kennelLocations({ activeOnly: true }).find((location) => location.id === id) || null;
}

function renderBoardingKennelLocationControl(record = activeBoardingDog()) {
  const label = $("#boardingKennelLocationLabel");
  const select = $("#boardingKennelLocationSelect");
  const status = boardingDisplayStatus(record || {});
  if (!label || !select) return;
  const show = status === "In Kennel";
  label.hidden = !show;
  select.disabled = !show || !record?.id;
  const selected = selectedBoardingKennelLocation(record);
  select.innerHTML = `<option value="">Select kennel location</option>${kennelLocations({ activeOnly: true })
    .map((location) => `<option value="${escapeHtml(location.id)}" ${selected?.id === location.id ? "selected" : ""}>${escapeHtml([location.building, location.name].filter(Boolean).join(" - "))}</option>`)
    .join("")}`;
}

async function updateBoardingKennelLocation(locationId = "") {
  const record = activeBoardingDog();
  if (!record?.id || !locationId) return;
  const location = kennelLocations({ activeOnly: true }).find((item) => item.id === locationId);
  if (!location) return;
  const timestamp = new Date().toISOString();
  const stays = (record.stays || []).map((stay) => {
    const target = activeBoardingStay(record) || currentOrNextStay(record);
    if (target?.id && stay.id !== target.id) return stay;
    return {
      ...stay,
      kennelLocationId: location.id,
      kennelLocationName: location.name,
      kennelBuilding: location.building,
      kennelAssignedAt: stay.kennelAssignedAt || timestamp,
      updatedAt: timestamp,
    };
  });
  const updated = upsertRecord("boardingDog", {
    ...record,
    boardingStatus: "In Kennel",
    kennelLocationId: location.id,
    kennelLocationName: location.name,
    kennelBuilding: location.building,
    kennelAssignedAt: record.kennelAssignedAt || timestamp,
    stays,
    updatedAt: timestamp,
  });
  await sendPayload(updated);
  await addAuditLog("Changed kennel location", "boardingDog", updated, `${updated.dogName || "Dog"} | ${location.building || ""} ${location.name || ""}`.trim());
  renderBoardingKennelLocationControl(updated);
  renderBoardingStays(updated);
  renderBoardingHistory(updated);
  renderBoardingDogs();
  renderCustomerRequests();
  showToast("Kennel location updated.");
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
  return `<article class="record-card"><strong>${escapeHtml(log.type)} - ${escapeHtml(log.date || "")}</strong><p>${escapeHtml([log.minutes ? `${log.minutes} minutes` : "", log.note || ""].filter(Boolean).join(" ") || "No notes")}</p><span>${escapeHtml(log.completedBy || "")}</span>${removable ? `<div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-owned-log" data-id="${escapeHtml(log.id)}">Remove Entry</button></div>` : ""}</article>`;
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
        .map(([group, items]) => `<section class="activity-group"><h3>${escapeHtml(group)}</h3>${items.map((log) => ownedDogActivityLogCardHtml(log, { removable })).join("")}</section>`)
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
    ? `<div class="collapsed-activity-groups">${entries.map(([group, count]) => `
      <section class="activity-group collapsed-activity-group">
        <button type="button" class="activity-group-toggle" data-action="toggle-owned-activity-group" data-id="${escapeHtml(record.id || "")}" data-group="${escapeHtml(group)}" aria-expanded="false">
          <span>${escapeHtml(group)}</span><strong>${count}</strong>
        </button>
        <div class="activity-group-content" data-activity-group-content hidden></div>
      </section>`).join("")}</div>`
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
        return `<article class="record-card compact-record-card dog-file-card" data-file-id="${escapeHtml(file.id)}"><strong>${escapeHtml(file.name)}</strong><span>${escapeHtml(savedText)}</span>${statusText}<label>Rename file<input type="text" value="${escapeHtml(file.name)}" data-action="rename-owned-file-input" data-id="${escapeHtml(file.id)}" /></label><div class="record-actions"><button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="${escapeHtml(source)}" data-media-type="${escapeHtml(file.type)}" data-media-name="${escapeHtml(file.name)}"${mediaAccessAttrs(file, { sourceRecordId: record.id || "", sourceRecordType: "ownedDog" })}>Open</button><button type="button" class="secondary-button" data-action="save-owned-file-name" data-id="${escapeHtml(file.id)}">Rename</button><button type="button" class="secondary-button danger-button" data-action="remove-owned-file" data-id="${escapeHtml(file.id)}">Remove</button></div></article>`;
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
    ["General note", dog.generalCareNotes || dog.notes || ""],
  ].filter(([, value]) => value);
  const quickButtons = ["Treadmill", "Scooter", "Yard Run", "Bath", "Training", "Medical/Behavior Note"]
    .map((type) => `<button type="button" class="secondary-button" data-action="popup-quick-care" data-care-type="${escapeHtml(type)}" data-id="${escapeHtml(dog.id)}">${escapeHtml(type === "Medical/Behavior Note" ? "Medical/Behavior" : type)}</button>`)
    .join("");
  const heatButton = dog.sex === "Female" ? `<button type="button" class="secondary-button" data-action="popup-quick-care" data-care-type="Heat Note" data-id="${escapeHtml(dog.id)}">Heat Note</button>` : "";
  return `${dashboardQuickCareSummaryHtml(dog, "Profile")}
    <section class="popup-record-section popup-quick-care-actions"><h3>Quick Care Actions</h3><div class="quick-action-grid">${quickButtons}${heatButton}<button type="button" class="secondary-button" data-action="open-owned-timeline" data-id="${escapeHtml(dog.id)}">Open Timeline</button></div></section>
    <section class="popup-record-section"><h3>Overview</h3>${detailRows.map(([label, value]) => `<div class="detail-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("")}</section>
    <section class="popup-record-section"><h3>Care Logs</h3><p class="section-help-text">Open a category to load its entries.</p>${ownedDogCollapsedActivityGroupsHtml(dog)}</section>`;
}

function openOwnedDogOverviewPopup(record = {}) {
  if (!record?.id) return;
  showDetailDialog(`${ownedDogDisplayName(record)} Profile`, ownedDogOverviewPopupHtml(record), null, {
    headerAction: {
      label: "Edit Full Dog Record",
      action: "open-owned-editor",
      id: record.id,
    },
  });
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
  const history = $("#ownedActivityHistory");
  if (history) history.innerHTML = ownedDogActivityEntriesHtml(record || {}, filter, { removable: true });
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
    dog.nextBath = nextBathFromFrequency(log.date, dog.bathIntervalDays || careDefaults.bathIntervalDays);
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
  sendPayload(record).catch((error) => console.warn("Owned care log save failed", error));
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
      showMediaDialog(photo, "image/jpeg", `${ownedDogDisplayName(record)} profile photo`, { type: "ownedDogPhoto", id: record.id });
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
    nextBath: latestBath ? nextBathFromFrequency(latestBath, dog.bathIntervalDays || careDefaults.bathIntervalDays) : dog.nextBath,
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
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stays = displayRecord?.stays || [];
  $("#boardingStayHistory").innerHTML = stays.length
    ? stays.map((stay) => {
      const requestCode = boardingStayRequestCode(displayRecord, stay);
      const ownerUpdateButton = ownerUpdateStayIsAvailable(displayRecord, stay)
        ? `<button type="button" class="secondary-button" data-action="open-owner-update-for-stay" data-dog-id="${escapeHtml(displayRecord.id)}" data-id="${escapeHtml(stay.id)}" data-request-code="${escapeHtml(requestCode)}">Update Owner</button>`
        : "";
      const serviceOnly = isServiceRequestStay(displayRecord, stay);
      return `<article class="record-card ${serviceOnly ? "is-service-only-request" : ""}"><strong>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</strong><div class="chip-row">${boardingStayRequestCodeChipHtml(displayRecord, stay)}${boardingStayStatusButtonHtml(displayRecord, stay)}${boardingStayServiceFlagHtml(displayRecord, stay)}</div><p>${escapeHtml(boardingStayServicesText(stay, { user: boardingPricingUserForRecord(displayRecord), preferCatalogPricing: true }))}</p>${boardingStayInvoiceSummaryHtml(displayRecord, stay)}${boardingStayServiceTaskListHtml(displayRecord, stay, { actions: true })}<p>${escapeHtml(stay.bathPlan || "")}</p><p>${escapeHtml(stay.stayNotes || "")}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="edit-stay" data-id="${escapeHtml(stay.id)}" data-request-code="${escapeHtml(requestCode)}">Edit Stay</button>${ownerUpdateButton}<button type="button" class="secondary-button danger-button" data-action="remove-stay" data-id="${escapeHtml(stay.id)}" data-request-code="${escapeHtml(requestCode)}">Remove Stay</button></div></article>`;
    }).join("")
    : "<p>No boarding stays logged yet.</p>";
}

function boardingStayStatusMenuHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  const nextStatuses = boardingStatusTransitions[status] || [];
  const stayAttrs = stay.id ? boardingStayDataAttrs(record, stay) : "";
  const servicesText = boardingStayServicesText(stay, { user: boardingPricingUserForRecord(record), preferCatalogPricing: true });
  const serviceSummary = servicesText === "No service requests" ? "No service requested" : servicesText;
  const serviceOnly = isServiceRequestStay(record, stay);
  return `<section class="popup-record-section">
    <article class="record-card compact-record-card ${serviceOnly ? "is-service-only-request" : ""}">
      <strong>${escapeHtml(formatDateTime(stay.dropoffTime))} to ${escapeHtml(formatDateTime(stay.pickupTime))}</strong>
      <div class="chip-row">${boardingStayRequestCodeChipHtml(record, stay)}${boardingStayStatusButtonHtml(record, stay, "open-stay-status-menu")}</div>
      <p><strong>Service request:</strong> ${escapeHtml(serviceSummary)}</p>
      <p>Status changes apply only to this boarding request/stay.</p>
    </article>
    <div class="record-actions">${nextStatuses.length ? nextStatuses.map((nextStatus) => `<button type="button" class="secondary-button" data-action="transition-boarding-stay" data-dog-id="${escapeHtml(record.id || "")}"${stayAttrs} data-next-status="${escapeHtml(nextStatus)}">${escapeHtml(stayTransitionLabel(status, nextStatus))}</button>`).join("") : "<p>No status changes are available for this stay.</p>"}</div>
  </section>`;
}

function openBoardingStayStatusMenu(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) {
    showToast("This boarding stay could not be opened.");
    return;
  }
  showDetailDialog("Update Stay Status", boardingStayStatusMenuHtml(displayRecord, stay), null, {
    headerAction: {
      label: "Edit Dog",
      action: "open-boarding-dog-editor",
      id: displayRecord.id,
      stayId: stay.id || "",
      requestCode: boardingStayRequestCode(displayRecord, stay),
      tab: "Boarding & Request",
    },
  });
}

async function saveBoardingStayStatusTransition(record = {}, stayId = "", nextStatus = "", reference = {}) {
  const options = typeof reference === "object" ? { ...reference, stayId: reference.stayId || stayId } : { stayId };
  if (!record?.id || !options.stayId || !boardingLifecycleStatuses.includes(nextStatus)) return null;
  const targetStay = boardingStayByReference(record, options);
  const transitioned = withBoardingStatusTransition(record, nextStatus, options);
  if (!transitioned) {
    showToast("That stay status transition is not allowed.");
    return null;
  }
  const updated = upsertRecord("boardingDog", transitioned);
  await sendPayload(updated);
  await syncDuplicateBoardingStayStatusRecords(record, updated, targetStay || boardingStayByReference(updated, options), nextStatus, options);
  await addAuditLog("Changed boarding stay status", "boardingDog", updated, `${updated.dogName || "Dog"} stay ${options.stayId}: ${nextStatus}`);
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    renderBoardingHistory(updated);
    renderBoardingKennelLocationControl(updated);
  }
  showToast(`Stay status updated to ${nextStatus}.`);
  return updated;
}

async function approveBoardingStay(record = {}, stayId = "", reference = {}) {
  const options = typeof reference === "object" ? { ...reference, stayId: reference.stayId || stayId, forceStatusSync: true } : { stayId, forceStatusSync: true };
  if (!record?.id || !options.stayId) return null;
  const targetStay = boardingStayByReference(record, options);
  if (!targetStay) return null;
  const currentStatus = boardingStayDisplayStatus(record, targetStay);
  const timestamp = new Date().toISOString();
  const transitioned = withBoardingStatusTransition(record, "Approved", options);
  if (!transitioned) return null;
  const updatedStays = (transitioned.stays || []).map((stay) => {
    if (!boardingStayMatchesIdentity(stay, targetStay)) return stay;
    return {
      ...stay,
      requestCode: stay.requestCode || boardingStayRequestCode(record, stay),
      status: "Approved",
      updatedAt: timestamp,
      approvedAt: stay.approvedAt || timestamp,
      approvedBy: stay.approvedBy || currentUser?.name || helperName?.value || "",
      cancelledAt: "",
      actualDropoffAt: "",
      actualPickupAt: "",
      readyForPickupAt: "",
      kennelLocationId: "",
      kennelLocationName: "",
      kennelBuilding: "",
      kennelAssignedAt: "",
      checkIn: null,
    };
  });
  const summaryStatus = boardingSummaryStatusFromStays(transitioned, updatedStays, "Approved");
  const updated = upsertRecord("boardingDog", {
    ...transitioned,
    boardingStatus: summaryStatus,
    approvedAt: record.approvedAt || timestamp,
    approvedBy: record.approvedBy || currentUser?.name || helperName?.value || "",
    cancelledAt: "",
    kennelLocationId: summaryStatus === "In Kennel" ? transitioned.kennelLocationId || "" : "",
    kennelLocationName: summaryStatus === "In Kennel" ? transitioned.kennelLocationName || "" : "",
    kennelBuilding: summaryStatus === "In Kennel" ? transitioned.kennelBuilding || "" : "",
    kennelAssignedAt: summaryStatus === "In Kennel" ? transitioned.kennelAssignedAt || "" : "",
    stays: updatedStays,
    statusHistory: [
      ...(record.statusHistory || []),
      {
        from: currentStatus,
        to: "Approved",
        stayId: options.stayId,
        date: timestamp,
        by: currentUser?.name || helperName?.value || "",
      },
    ],
    flags: (record.flags || []).filter((flag) => flag !== "Required update from owner"),
  });
  await sendPayload(updated);
  await syncDuplicateBoardingStayStatusRecords(record, updated, targetStay, "Approved", options);
  await addAuditLog("Approved boarding stay", "boardingDog", updated, `${updated.dogName || "Dog"} stay ${boardingStayRequestCode(updated, targetStay)}: Approved`);
  renderBoardingDogs();
  renderBoardingRequests();
  renderCustomerRequests();
  renderDashboard();
  if ($("#boardingDogForm")?.elements.id.value === updated.id) {
    renderBoardingStays(updated);
    renderBoardingHistory(updated);
    renderBoardingKennelLocationControl(updated);
  }
  showToast("Boarding request approved.");
  return updated;
}

function boardingStayLifecycleEvents(record = {}, stay = {}) {
  const events = [];
  const stayIds = boardingStaySourceIds(stay);
  const add = (label, date, by, note = "") => {
    if (!date && !note) return;
    events.push({ label, date, by, note });
  };
  add("Boarding request entered", stay.submittedAt || record.submittedAt, record.requestedBy || record.ownerName || record.submittedBy, stay.stayNotes || "");
  add("Request approved", stay.approvedAt || record.approvedAt, stay.approvedBy || record.approvedBy, "");
  add("Checked in", stay.checkedInAt || record.checkedInAt || stay.checkIn?.verifiedAt, stay.checkedInBy || stay.checkIn?.verifiedBy || record.checkedInBy, stay.checkIn?.belongings ? `Belongings: ${stay.checkIn.belongings}` : "");
  add("Placed in kennel", stay.kennelAssignedAt || record.kennelAssignedAt || record.inKennelAt, stay.kennelAssignedBy || record.kennelAssignedBy || record.statusHistory?.find((item) => item.to === "In Kennel")?.by, [stay.kennelBuilding || record.kennelBuilding, stay.kennelLocationName || record.kennelLocationName].filter(Boolean).join(" - "));
  add("Ready for pickup", stay.readyForPickupAt || record.readyForPickupAt, stay.readyForPickupBy || record.statusHistory?.find((item) => item.to === "Ready For Pickup")?.by, "");
  add("Checked out", stay.checkedOutAt || record.checkedOutAt, stay.checkedOutBy || record.statusHistory?.find((item) => item.to === "Checked Out")?.by, record.paymentStatus ? `Payment: ${record.paymentStatus}${record.paymentMethod ? ` by ${record.paymentMethod}` : ""}` : "");
  (record.statusHistory || []).forEach((item) => {
    if (item.stayId && stayIds.length && !stayIds.includes(String(item.stayId))) return;
    add(`Status changed: ${item.from || "Unknown"} to ${item.to || "Unknown"}`, item.date, item.by, item.early ? "Early transition" : "");
  });
  return events.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

function boardingStayHistoryPopupHtml(record = {}, stay = {}) {
  const events = boardingStayLifecycleEvents(record, stay);
  return `<section class="popup-record-section">
    <article class="record-card compact-record-card">
      <strong>${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <p>${escapeHtml(formatDateTime(stay.dropoffTime))} to ${escapeHtml(formatDateTime(stay.pickupTime))}</p>
      <div class="chip-row">${boardingStayRequestCodeChipHtml(record, stay)}${boardingStayStatusChipHtml(record, stay)}</div>
    </article>
    ${events.length ? events.map((event) => `<article class="record-card compact-record-card"><strong>${escapeHtml(event.label)}</strong><span>${escapeHtml([formatDateTime(event.date), event.by || ""].filter(Boolean).join(" | "))}</span>${event.note ? `<p>${escapeHtml(event.note)}</p>` : ""}</article>`).join("") : "<p>No lifecycle events recorded for this stay yet.</p>"}
  </section>`;
}

function renderBoardingHistory(record = activeBoardingDog()) {
  const list = $("#boardingHistoryList");
  if (!list) return;
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stays = displayRecord?.stays || [];
  list.innerHTML = stays.length
    ? stays
        .map((stay) => {
          const events = boardingStayLifecycleEvents(displayRecord, stay);
          const location = [stay.kennelBuilding || displayRecord.kennelBuilding, stay.kennelLocationName || displayRecord.kennelLocationName].filter(Boolean).join(" - ");
          const requestCode = boardingStayRequestCode(displayRecord, stay);
          return `<article class="record-card clickable-card compact-record-card" data-action="view-boarding-stay-history" data-id="${escapeHtml(stay.id || "")}" data-request-code="${escapeHtml(requestCode)}">
            <strong>${escapeHtml(formatDateTime(stay.dropoffTime))} to ${escapeHtml(formatDateTime(stay.pickupTime))}</strong>
            <div class="chip-row">${boardingStayRequestCodeChipHtml(displayRecord, stay)}${boardingStayStatusChipHtml(displayRecord, stay)}</div>
            <p>${escapeHtml(location || boardingStayServicesText(stay, { user: boardingPricingUserForRecord(displayRecord), preferCatalogPricing: true }) || "No location or service request saved")}</p>
            <span>${events.length} lifecycle event${events.length === 1 ? "" : "s"}</span>
          </article>`;
        })
        .join("")
    : "<p>No boarding history is available for this dog yet.</p>";
}

function openBoardingStayHistory(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) return;
  showDetailDialog("Boarding Stay History", boardingStayHistoryPopupHtml(displayRecord, stay));
}

function boardingStayRemoveConfirmHtml(record = {}, stay = {}) {
  return `
    <div class="tracker-form">
      <article class="record-card compact-record-card danger-confirm-card">
        <strong>Remove this boarding stay?</strong>
        <p>${escapeHtml(record.dogName || "Boarding dog")} | ${escapeHtml(boardingStayRequestCode(record, stay))} | ${escapeHtml(formatDateTime(stay.dropoffTime))} to ${escapeHtml(formatDateTime(stay.pickupTime))}</p>
        <p>This removes only this scheduled stay. The dog profile stays available.</p>
      </article>
      <div class="button-row">
        <button type="button" class="danger-button" data-action="confirm-remove-boarding-stay" data-dog-id="${escapeHtml(record.id || "")}" data-id="${escapeHtml(stay.id || "")}" data-request-code="${escapeHtml(boardingStayRequestCode(record, stay))}">Confirm Remove Stay</button>
        <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
      </div>
    </div>`;
}

function openBoardingStayRemoveConfirm(record = activeBoardingDog(), stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId);
  if (!displayRecord?.id || !stay) return;
  showDetailDialog("Confirm Remove Boarding Stay", boardingStayRemoveConfirmHtml(displayRecord, stay));
}

async function removeBoardingStayFromDog(dogId = "", stayId = "", reference = {}) {
  const displayRecord = boardingDogRecordForDisplay(dogId);
  if (!displayRecord || !stayId) return null;
  const targetStay = boardingStayByReference(displayRecord, typeof reference === "object" ? { ...reference, stayId: reference.stayId || stayId } : stayId);
  if (!targetStay) return null;
  const sourceIds = displayRecord.sourceRecordIds?.length ? displayRecord.sourceRecordIds : [displayRecord.id];
  const sourceRecords = readRecords("boardingDog").filter((record) => sourceIds.includes(record.id) && !record.removed);
  let updatedPrimary = null;
  for (const sourceRecord of sourceRecords) {
    const nextStays = (sourceRecord.stays || []).filter((stay) => !boardingStayMatchesIdentity(stay, targetStay));
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
    renderBoardingHistory(refreshed);
    renderBoardingDogs();
    renderBoardingRequests();
    renderCustomerRequests();
  }
  if (refreshed) await addAuditLog("Removed boarding stay", "boardingDog", refreshed, `${refreshed.dogName || "Dog"} | ${stayId}`);
  return refreshed;
}

function bathPlanForStay(stay) {
  if (!boardingStayHasService(stay, "Bath")) return "";
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
            `<article class="record-card clickable-card ${record.urgentNeeds ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}" data-action="view-request" data-id="${escapeHtml(record.id)}"><strong>${record.completed ? "Completed: " : ""}${record.urgentNeeds ? "Urgent: " : ""}${escapeHtml(record.category)}</strong><span>${escapeHtml(record.requestedBy || "Unknown")} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${escapeHtml(record.requestText || "")}</p>${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-request" data-id="${escapeHtml(record.id)}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button>${isAdmin ? `<button type="button" class="secondary-button danger-button" data-action="remove-request" data-id="${escapeHtml(record.id)}">Remove Request</button>` : ""}</div></article>`,
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
            `<article class="record-card clickable-card ${record.urgentAttention ? "is-urgent" : ""} ${record.completed ? "is-completed" : ""}" data-action="view-maintenance" data-id="${escapeHtml(record.id)}"><strong>${record.completed ? "Completed: " : ""}${record.urgentAttention ? "Urgent: " : ""}${escapeHtml(record.location)}</strong><span>${escapeHtml(record.reportedBy || "Unknown")} | ${formatDateTime(record.submittedAt)}${record.completedAt ? ` | Completed ${formatDateTime(record.completedAt)}` : ""}</span><p>${escapeHtml(record.issue || "")}</p>${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-maintenance" data-id="${escapeHtml(record.id)}">${record.completed ? "Move Back To Active" : "Mark Completed"}</button>${isAdmin ? `<button type="button" class="secondary-button danger-button" data-action="remove-maintenance" data-id="${escapeHtml(record.id)}">Remove Maintenance</button>` : ""}</div></article>`,
        )
        .join("")
    : `<p>${showCompleted ? "No maintenance items saved yet." : "No active maintenance items. Turn on completed history to review finished items."}</p>`;
}

function money(value) {
  const number = Number(value || 0);
  const prefix = number < 0 ? "-$" : "$";
  return `${prefix}${Math.abs(number).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function vaccineDurationIsThreeYears(record = {}, vaccineKey = "") {
  const duration = String(record?.[`${vaccineKey}Duration`] || "").toLowerCase();
  const flag = String(record?.[`${vaccineKey}GoodThreeYears`] || "").toLowerCase();
  return duration.includes("3") || flag === "yes" || flag === "true";
}

function dogNeedsDhppVaccineReview(dog = {}) {
  if (!dog.dhppDate) return false;
  const dhppDays = (new Date() - new Date(`${dog.dhppDate}T12:00:00`)) / 86400000;
  const reviewThresholdDays = vaccineDurationIsThreeYears(dog, "dhpp") ? 1065 : 335;
  return dhppDays >= reviewThresholdDays;
}

function dashboardMetrics() {
  const ownedDogs = readRecords("ownedDog").filter((record) => !record.removed);
  const allBoardingDogs = consolidatedBoardingDogRecords();
  const boardingDogs = allBoardingDogs.filter((record) => !["Cancelled", "Checked Out"].includes(boardingDisplayStatus(record)));
  const requests = readRecords("request").filter((record) => !record.removed);
  const maintenance = readRecords("maintenance").filter((record) => !record.removed);
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const currentBoarding = boardingDogs.filter((dog) => isCurrentlyBoarding(dog) || ["Checked In", "In Kennel", "Ready For Pickup"].includes(boardingDisplayStatus(dog)));
  const arrivals = [];
  const departures = [];
  const arrivalRecords = [];
  const departureRecords = [];
  const boardingBathDue = [];
  const boardingBathDueRecords = [];
  const boardingServiceDue = [];
  const boardingServiceDueKeys = new Set();
  let ownerUpdates = 0;
  boardingDogs.forEach((dog) => {
    if ((dog.flags || []).includes("Required update from owner")) ownerUpdates += 1;
  });
  allBoardingDogs.forEach((dog) => {
    (dog.stays || []).forEach((stay) => {
      const status = boardingStayDisplayStatus(dog, stay);
      const dashboardRecord = dashboardBoardingRecordForStay(dog, stay);
      if (stay.dropoffTime?.slice(0, 10) === selectedDate && ["Pending", "Approved", "Checked In"].includes(status)) {
        arrivals.push(dog.dogName);
        arrivalRecords.push(dashboardRecord);
      }
      if (stay.pickupTime?.slice(0, 10) === selectedDate && activeBoardingStayStatuses.includes(status) && !stayHasActualPickupEvidence(stay)) {
        departures.push(dog.dogName);
        departureRecords.push(dashboardRecord);
      }
      if (boardingStayHasService(stay, "Bath") && stay.pickupTime?.slice(0, 10) === selectedDate && !["Cancelled", "Checked Out"].includes(status) && !stayHasActualPickupEvidence(stay)) {
        boardingBathDue.push(dog.dogName);
        boardingBathDueRecords.push(dashboardRecord);
      }
      const serviceDue = boardingStayServiceDueInfo(dog, stay);
      if (serviceDue && activeBoardingStayStatuses.includes(status) && !serviceDue.stats.completed && !stayHasActualPickupEvidence(stay)) {
        const isDueWindow = serviceDue.hoursRemaining === null || serviceDue.hoursRemaining <= BOARDING_SERVICE_DUE_WINDOW_HOURS;
        if (isDueWindow) {
          serviceDue.stats.incompleteTasks.forEach((task) => {
            const dueStay = dashboardRecord.dashboardStay || stay;
            const requestCode = boardingStayRequestCode(dashboardRecord, dueStay);
            const dogKey = boardingDogIdentityTokens(dashboardRecord).sort().join("|")
              || [dashboardRecord.id, ...(dashboardRecord.sourceRecordIds || [])].filter(Boolean).sort().join("|")
              || normalizedDogIdentityName(dashboardRecord);
            const taskKey = boardingServiceTaskKey(task);
            const taskDedupeKey = boardingServiceTaskNameKey(task) || taskKey;
            const semanticDueKey = [dogKey, boardingStayMergeKeyForRecord(dashboardRecord, dueStay), taskDedupeKey].join("|");
            const dueKeys = [
              requestCode ? [requestCode, taskDedupeKey].join("|") : "",
              semanticDueKey,
            ].filter(Boolean);
            if (dueKeys.some((key) => boardingServiceDueKeys.has(key))) return;
            dueKeys.forEach((key) => boardingServiceDueKeys.add(key));
            boardingServiceDue.push({
              record: dashboardRecord,
              stay: dueStay,
              task,
              taskKey,
              dueInfo: serviceDue,
            });
          });
        }
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
  const vaccineIssues = ownedDogs.filter(dogNeedsDhppVaccineReview).length;
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
    boardingServiceDue,
    exerciseDueDogs,
    trainingDueDogs,
    ownedBathDueDogs,
    inHeatDogs,
    heatSoonDogs,
    medicalCareDogs,
    ownerUpdates,
    vaccineIssues,
    ownerUpdateDogs: boardingDogs.filter((dog) => (dog.flags || []).includes("Required update from owner")),
    vaccineIssueDogs: ownedDogs.filter(dogNeedsDhppVaccineReview),
    openRequestRecords: requests.filter((record) => !record.completed),
    urgentRequestRecords: requests.filter((record) => !record.completed && record.urgentNeeds),
    urgentMaintenanceRecords: maintenance.filter((record) => !record.completed && record.urgentAttention),
    openMaintenanceRecords: maintenance.filter((record) => !record.completed),
    openRequests: requests.filter((record) => !record.completed).length,
    urgentMaintenance: maintenance.filter((record) => !record.completed && record.urgentAttention).length,
    openMaintenance: maintenance.filter((record) => !record.completed).length,
  };
}

function countSeverityClass(count = 0) {
  if (count <= 0) return "is-count-clear";
  if (count <= 3) return "is-count-watch";
  return "is-count-urgent";
}

function boardingStayDateMatches(stay = {}, field = "dropoffTime", date = todayDate()) {
  return String(stay[field] || "").slice(0, 10) === date;
}

function dashboardPriorityMetrics(metrics = dashboardMetrics()) {
  const allBoardingDogs = consolidatedBoardingDogRecords();
  const selectedDate = metrics.selectedDate || todayDate();
  const dogsInKennelToday = allBoardingDogs.filter((record) => {
    const stay = boardingPrimaryStay(record) || {};
    const status = stay.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
    return ["Checked In", "In Kennel"].includes(status) && boardingStayDateMatches(stay, "dropoffTime", selectedDate);
  });
  const pendingRequests = allBoardingDogs.filter((record) => !record.removed && normalizeBoardingStatus(record) === "Pending");
  const vaccinesExpiringSoon = allBoardingDogs.filter((record) => !record.removed && vaccinationExpiresSoon(record, 30));
  return {
    dogsInKennelToday,
    pendingRequests,
    vaccinesExpiringSoon,
    urgentItems: metrics.urgentMaintenanceRecords || [],
  };
}

function renderDashboardPriorities(metrics = dashboardMetrics()) {
  const container = $("#dashboardPriorityCards");
  if (!container) return;
  const priorities = dashboardPriorityMetrics(metrics);
  const cards = [
    ["boarding-in-kennel", "Dogs In Kennel Today", priorities.dogsInKennelToday.length],
    ["boarding-pending", "Pending Requests", priorities.pendingRequests.length],
    ["boarding-vaccines", "Vaccines Expiring Soon", priorities.vaccinesExpiringSoon.length],
    ["maintenance-urgent", "Urgent Items", priorities.urgentItems.length],
  ];
  container.innerHTML = cards.map(([action, label, count]) => `<button type="button" class="dashboard-priority-card ${countSeverityClass(count)}" data-action="${escapeHtml(action)}"><strong>${count}</strong><span>${escapeHtml(label)}</span></button>`).join("");
}

function openDashboardPriority(action = "") {
  if (action === "maintenance-urgent") {
    switchPage("maintenancePage");
    return;
  }
  switchPage("boardingDogsPage");
  $("#boardingDogSearch").value = "";
  if (action === "boarding-pending") {
    boardingDogRosterFilter = "Pending";
    boardingDogPriorityFilter = "";
  } else if (action === "boarding-vaccines") {
    boardingDogRosterFilter = "All Boarding Dogs";
    boardingDogPriorityFilter = "vaccines-expiring-soon";
  } else {
    boardingDogRosterFilter = "In Kennel";
    boardingDogPriorityFilter = "";
  }
  renderBoardingDogs();
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
    ? `<img class="quick-care-dog-photo is-clickable-photo" src="${escapeHtml(photo)}" alt="${escapeHtml(ownedDogDisplayName(dog))}" data-action="view-dog-photo" data-dog-id="${escapeHtml(dog.id || "")}" data-src="${escapeHtml(photo)}" data-media-name="${escapeHtml(`${ownedDogDisplayName(dog)} profile photo`)}" />`
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
      ["Special care", dog.specialCare || "No special care note saved"],
      ["General note", dog.generalCareNotes || dog.notes || "No general note saved"],
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
  if (careType === "Medical/Behavior Note") {
    return `${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Medical/Behavior Note" data-dog-id="${escapeHtml(dog.id)}"><label>Note date<input type="date" name="date" required value="${todayDate()}" /></label><label>Medical/Behavior note<textarea name="note" rows="4" required placeholder="${escapeHtml(medicalCarePlaceholder)}"></textarea></label><div class="button-row"><button type="submit">Log Medical/Behavior</button></div></form>`;
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
    "Medical/Behavior Note": "Log Medical/Behavior",
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
    const note = ["Training", "Heat Note", "Medical/Behavior Note"].includes(careType) ? String(formData.get("note") || "").trim() : "";
    if (careType === "Medical/Behavior Note" && !note) {
      showToast("Enter a medical or behavior note before saving.");
      return;
    }
    const date = careTypeIsExercise(careType) || careType === "Training" ? todayDate() : String(formData.get("date") || todayDate());
    const defaultNotes = {
      Bath: "Bath logged from dashboard.",
      "Heat Note": "Heat cycle logged from dashboard.",
      "Medical/Behavior Note": medicalCareDefaultNote,
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
  const ordered = ["All", "Treadmill", "Scooter", "Yard Run", "Training", "Baths", "Stay Services", "Heat", "Medical/Care", "Owner Updates", "Requests", "Maintenance", "Vaccines"];
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
  if (alert.action === "complete-stay-service") return "Mark Done";
  return alert.type ? "Open" : "";
}

function dashboardAlertActionAttrs(alert = {}) {
  if (alert.action === "dashboard-quick-care") {
    return `data-action="dashboard-quick-care" data-dog-id="${escapeHtml(alert.dogId)}" data-care-type="${escapeHtml(alert.careType)}"`;
  }
  if (["view-medical-care", "view-vaccine-alert"].includes(alert.action)) {
    return `data-action="${escapeHtml(alert.action)}" data-dog-id="${escapeHtml(alert.dogId)}"`;
  }
  if (alert.action === "view-owner-update") {
    return `data-action="view-owner-update" data-id="${escapeHtml(alert.id)}" data-stay-id="${escapeHtml(alert.stayId || "")}" data-request-code="${escapeHtml(alert.requestCode || "")}"`;
  }
  if (alert.action === "complete-stay-service") {
    return `data-action="complete-stay-service" data-dog-id="${escapeHtml(alert.dogId)}" data-stay-id="${escapeHtml(alert.stayId)}" data-request-code="${escapeHtml(alert.requestCode)}" data-task-id="${escapeHtml(alert.taskId)}" data-task-key="${escapeHtml(alert.taskKey || "")}"`;
  }
  if (alert.type) {
    return `data-action="view-alert" data-type="${escapeHtml(alert.type)}" data-id="${escapeHtml(alert.id)}"`;
  }
  return "";
}

function dashboardAlertCardHtml(alert = {}) {
  const attrs = dashboardAlertActionAttrs(alert);
  const clickableClass = attrs ? "clickable-card " : "";
  const buttonLabel = dashboardAlertButtonLabel(alert);
  return `<article class="record-card ${clickableClass}is-urgent" ${attrs}><span class="status-chip">${escapeHtml(alert.category || "Alert")}</span>${alert.html || ""}${buttonLabel ? `<div class="record-actions"><button type="button" class="secondary-button">${escapeHtml(buttonLabel)}</button></div>` : ""}</article>`;
}

function dashboardAlertsForMetrics(metrics = dashboardMetrics()) {
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
  metrics.ownerUpdateDogs.forEach((dog) => {
    const stay = ownerUpdateStayForRecord(dog);
    const requestCode = stay?.id ? boardingStayRequestCode(dog, stay) : "";
    alerts.push({
      category: "Owner Updates",
      action: "view-owner-update",
      id: dog.id,
      stayId: stay?.id || "",
      requestCode,
      html: `<strong>Owner update needed: ${escapeHtml(dog.dogName || "Boarding dog")}</strong><p>${escapeHtml([dog.ownerName, dog.ownerPhone].filter(Boolean).join(" | "))}</p>${ownerUpdateReasonHtml(dog, stay)}`,
    });
  });
  metrics.boardingServiceDue.forEach((item) => alerts.push({ category: "Stay Services", action: "complete-stay-service", dogId: item.record.id, stayId: item.stay.id, requestCode: boardingStayRequestCode(item.record, item.stay), taskId: item.task.id, taskKey: item.taskKey || boardingServiceTaskKey(item.task), html: `<strong>${escapeHtml(item.dueInfo.label)}: ${escapeHtml(item.record.dogName || "Boarding dog")}</strong><p>${escapeHtml(item.task.label || item.task.serviceName || "Requested service")} | Stay ID: ${escapeHtml(boardingStayRequestCode(item.record, item.stay))}</p>` }));
  metrics.boardingBathDue.forEach((dogName) => alerts.push({ category: "Baths", html: `<strong>Bath due before pickup today</strong><p>${escapeHtml(dogName)}</p>` }));
  return alerts;
}

function dashboardFilteredAlerts(alerts = [], filter = dashboardAlertFilter) {
  return filter === "All" ? alerts : alerts.filter((alert) => alert.category === filter);
}

function dashboardAlertsSummaryHtml(alerts = []) {
  if (!alerts.length) return "<p>No action items today.</p>";
  const plural = alerts.length === 1 ? "item" : "items";
  return `<article class="record-card compact-record-card clickable-card" data-action="open-dashboard-alert-popup" data-alert-filter="All"><strong>${alerts.length} action ${plural} today</strong><p>Open the action list to review and complete today’s work.</p><div class="record-actions"><button type="button" class="secondary-button">Open All</button></div></article>`;
}

function dashboardAlertPopupHtml(filter = "All", alerts = dashboardAlertsForMetrics()) {
  const filteredAlerts = dashboardFilteredAlerts(alerts, filter);
  const plural = filteredAlerts.length === 1 ? "item" : "items";
  return `<section class="popup-record-section dashboard-alert-popup" data-dashboard-alert-popup="${escapeHtml(filter)}">
    <article class="record-card compact-record-card">
      <strong>${escapeHtml(filter)} Action Items</strong>
      <p>${filteredAlerts.length} ${plural} for ${escapeHtml($("#dashboardDate")?.value || todayDate())}. Use the buttons on each card to complete or open the related workflow.</p>
    </article>
    <div class="record-grid compact-record-grid">${filteredAlerts.length ? filteredAlerts.map(dashboardAlertCardHtml).join("") : "<p>No items in this category right now.</p>"}</div>
  </section>`;
}

function openDashboardAlertPopup(filter = "All") {
  dashboardAlertFilter = filter || "All";
  dashboardShowAllAlerts = false;
  const alerts = dashboardAlertsForMetrics(dashboardMetrics());
  renderDashboardAlertTabs(alerts);
  const dashboardAlerts = $("#dashboardAlerts");
  if (dashboardAlerts) dashboardAlerts.innerHTML = dashboardAlertsSummaryHtml(alerts);
  showDetailDialog(`${dashboardAlertFilter} Action Items`, dashboardAlertPopupHtml(dashboardAlertFilter, alerts));
}

function renderDashboard() {
  if (!$("#dashboardPage")) return;
  $("#dashboardDate").value ||= todayDate();
  const metrics = dashboardMetrics();
  renderDashboardReminders(metrics);
  const alerts = dashboardAlertsForMetrics(metrics);
  const dashboardAlerts = $("#dashboardAlerts");
  if (!dashboardAlerts) {
    renderDashboardTaskCalendar();
    return;
  }
  dashboardAlerts.innerHTML = dashboardAlertsSummaryHtml(alerts);
  renderDashboardTaskCalendar();
}

function renderDashboardReminders(metrics = dashboardMetrics()) {
  const panel = $("#dashboardReminderPanel");
  if (!panel) return;
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const reminders = [];
  metrics.vaccineIssueDogs.slice(0, 5).forEach((dog) => reminders.push({ label: "Vaccine", text: `${ownedDogDisplayName(dog)} needs vaccine date review.` }));
  metrics.arrivalRecords.slice(0, 5).forEach((record) => {
    const stay = dashboardStayForBoardingRecord(record);
    reminders.push({ label: "Boarding", text: `${record.dogName || "Boarding dog"} arrives ${formatDateTime(stay.dropoffTime)}.` });
  });
  metrics.departureRecords.slice(0, 5).forEach((record) => {
    const stay = dashboardStayForBoardingRecord(record);
    reminders.push({ label: "Pickup", text: `${record.dogName || "Boarding dog"} leaves ${formatDateTime(stay.pickupTime)}.` });
  });
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
          const safeType = escapeHtml(type);
          const safeId = escapeHtml(record.id);
          const removeAction = currentRole() === "admin" ? `<div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-timeline-record" data-type="${safeType}" data-id="${safeId}">Remove</button></div>` : "";
          return `<article class="record-card clickable-card" data-action="view-record" data-type="${safeType}" data-id="${safeId}"><strong>${formatDateTime(timestamp)} - ${escapeHtml(title)}</strong><span>${escapeHtml(helper)}</span><p>${escapeHtml(summary || "")}</p>${notes ? `<p>${escapeHtml(notes)}</p>` : ""}${mediaLinkHtml(record)}${removeAction}</article>`;
        })
        .join("")
    : "<p>No activity recorded for this date yet.</p>";
}

function dashboardDetailRecords(key) {
  const metrics = dashboardMetrics();
  const map = {
    needsAction: [...metrics.exerciseDueDogs, ...metrics.trainingDueDogs, ...metrics.ownedBathDueDogs, ...metrics.boardingServiceDue, ...metrics.inHeatDogs, ...metrics.heatSoonDogs, ...metrics.medicalCareDogs, ...metrics.ownerUpdateDogs, ...metrics.openRequestRecords, ...metrics.openMaintenanceRecords],
    exerciseDue: metrics.exerciseDueDogs,
    trainingDue: metrics.trainingDueDogs,
    boardingServices: metrics.boardingServiceDue,
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

function dashboardImagePreviewHtml(src = "", alt = "") {
  return src ? `<img class="dashboard-detail-thumb" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />` : "";
}

function firstRecordImage(record = {}) {
  const media = arrayValue(record.mediaItems).find((item) => String(item.type || "").startsWith("image/") && (item.url || item.dataUrl));
  return media?.url || media?.dataUrl || record.profilePhotoUrl || record.profilePhotoData || "";
}

function dashboardBoardingRecordForStay(record = {}, stay = {}) {
  const codedStay = boardingStayWithRequestCode(record, stay || {});
  return {
    ...record,
    dashboardStay: codedStay,
    dashboardStayId: codedStay.id || "",
    dashboardStayRequestCode: codedStay.id ? boardingStayRequestCode(record, codedStay) : "",
  };
}

function dashboardStayForBoardingRecord(record = {}) {
  return record.dashboardStay
    || boardingStayByReference(record, { stayId: record.dashboardStayId || "", requestCode: record.dashboardStayRequestCode || "" })
    || currentOrNextStay(record)
    || activeBoardingStay(record)
    || (record.stays || [])[0]
    || {};
}

function dashboardOwnedDogReason(record = {}, category = "") {
  const heat = ownedDogHeatStatus(record, $("#dashboardDate")?.value || todayDate());
  if (category === "Exercise") return `Exercise due${record.lastExerciseDate ? ` - last logged ${record.lastExerciseDate}` : ""}`;
  if (category === "Training") return `Training due${record.lastTrainingDate ? ` - last logged ${record.lastTrainingDate}` : ""}`;
  if (category === "Bath") return `Bath due${record.lastBath ? ` - last bath ${record.lastBath}` : ""}`;
  if (category === "Heat") return heat.label || "Heat watch";
  if (category === "Medical/Care") return record.careStatus || "Review medical or care notes";
  if (category === "Vaccine") return `DHPP date: ${record.dhppDate || "Not recorded"}`;
  return ownedDogCareSummary(record);
}

function dashboardOwnedDogNote(record = {}, category = "") {
  if (category === "Exercise") return record.exerciseRoutine || record.exerciseNotes || "Log exercise today.";
  if (category === "Training") return record.trainingRoutine || record.trainingGoals || record.trainingSessionNotes || "Log a training session.";
  if (category === "Bath") return record.bathRoutine || record.bathProducts || record.coatNotes || "Bath is due.";
  if (category === "Heat") return record.heatCycleNotes || record.heatCycle || "Review heat cycle status.";
  if (category === "Medical/Care") return record.medicalCareNotes || record.specialCare || record.behaviorNotes || "Review care notes.";
  if (category === "Vaccine") return "Review and update vaccine date.";
  return record.generalCareNotes || record.notes || "";
}

function dashboardOwnedDogCardHtml(record = {}, category = "Care") {
  const name = ownedDogDisplayName(record) || "Dog";
  return `<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-owned" data-id="${escapeHtml(record.id)}">
    ${dashboardImagePreviewHtml(firstRecordImage(record), name)}
    <div>
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(dashboardOwnedDogReason(record, category))}</span>
      <p>${escapeHtml(dashboardOwnedDogNote(record, category))}</p>
      <div class="record-actions"><button type="button" class="secondary-button">Open Dog</button></div>
    </div>
  </article>`;
}

function dashboardBoardingDogReason(record = {}, category = "") {
  const stay = dashboardStayForBoardingRecord(record);
  if (category === "Arrival") return `Arrives ${formatDateTime(stay.dropoffTime) || "today"}`;
  if (category === "Departure") return `Leaves ${formatDateTime(stay.pickupTime) || "today"}`;
  if (category === "Owner Update") return ownerUpdateReasonItems(record, stay)[0] || "Owner update needed";
  if (category === "Bath") return `Bath requested before pickup${stay.pickupTime ? ` ${formatDateTime(stay.pickupTime)}` : ""}`;
  return boardingScheduleText(record);
}

function dashboardBoardingDogCardHtml(record = {}, category = "Boarding") {
  const name = record.dogName || "Boarding dog";
  const stay = dashboardStayForBoardingRecord(record);
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : boardingDisplayStatus(record);
  const kennel = status === "In Kennel" ? boardingKennelLocationLabel(record, stay) : "";
  const stayAttrs = stay?.id ? boardingStayDataAttrs(record, stay) : "";
  const note = [
    record.ownerName ? `Owner: ${record.ownerName}` : "",
    status ? `Status: ${status}` : "",
    kennel ? `Kennel: ${kennel}` : "",
  ].filter(Boolean).join(" | ");
  const flagText = arrayValue(record.flags).join(", ");
  return `<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-boarding" data-id="${escapeHtml(record.id)}"${stayAttrs}>
    ${dashboardImagePreviewHtml(firstRecordImage(record), name)}
    <div>
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(dashboardBoardingDogReason(record, category))}</span>
      <p>${escapeHtml(note || boardingScheduleText(record))}</p>
      ${flagText ? `<p>${escapeHtml(flagText)}</p>` : ""}
      <div class="record-actions"><button type="button" class="secondary-button">Open Boarding Dog</button></div>
    </div>
  </article>`;
}

function dashboardBoardingServiceCardHtml(item = {}) {
  const record = item.record || {};
  const stay = item.stay || dashboardStayForBoardingRecord(record);
  const task = item.task || {};
  const dueInfo = item.dueInfo || boardingStayServiceDueInfo(record, stay) || {};
  const stayAttrs = stay?.id ? boardingStayDataAttrs(record, stay) : "";
  const taskKey = item.taskKey || boardingServiceTaskKey(task);
  return `<article class="record-card compact-record-card dashboard-detail-card boarding-service-due-card">
    ${dashboardImagePreviewHtml(firstRecordImage(record), record.dogName || "Boarding dog")}
    <div>
      <strong>${escapeHtml(record.dogName || "Boarding dog")}</strong>
      <span>${escapeHtml(dueInfo.label || "Stay service due")}</span>
      <p>${escapeHtml(task.label || task.serviceName || "Requested service")} | Stay ID: ${escapeHtml(stay?.id ? boardingStayRequestCode(record, stay) : "not assigned")}</p>
      <p>${escapeHtml(stay?.pickupTime ? `Pickup ${formatDateTime(stay.pickupTime)}` : "Pickup time not saved")}</p>
      <div class="record-actions"><button type="button" class="secondary-button" data-action="complete-stay-service" data-dog-id="${escapeHtml(record.id || "")}"${stayAttrs} data-task-id="${escapeHtml(task.id || "")}" data-task-key="${escapeHtml(taskKey)}">Mark Done</button><button type="button" class="secondary-button" data-action="dashboard-open-boarding" data-id="${escapeHtml(record.id || "")}"${stayAttrs}>Open Stay</button></div>
    </div>
  </article>`;
}

function dashboardMaintenanceCardHtml(record = {}) {
  const title = record.issue || record.location || "Maintenance item";
  const image = firstRecordImage(record);
  return `<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-maintenance" data-id="${escapeHtml(record.id)}">
    ${dashboardImagePreviewHtml(image, title)}
    <div>
      <strong>${record.urgentAttention ? "Urgent: " : ""}${escapeHtml(title)}</strong>
      <span>${escapeHtml([record.location, record.status || "Active"].filter(Boolean).join(" | "))}</span>
      <p>${escapeHtml(record.reportedBy ? `Reported by ${record.reportedBy}` : "Reporter not recorded")}</p>
      <div class="record-actions"><button type="button" class="secondary-button">View Details</button></div>
    </div>
  </article>`;
}

function dashboardRequestCardHtml(record = {}) {
  return `<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-request" data-id="${escapeHtml(record.id)}">
    <div>
      <strong>${record.urgentNeeds ? "Urgent: " : ""}${escapeHtml(record.category || "Request")}</strong>
      <span>${escapeHtml([record.requestedBy, record.status || "Active"].filter(Boolean).join(" | "))}</span>
      <p>${escapeHtml(record.requestText || record.reason || "No request details saved.")}</p>
      <div class="record-actions"><button type="button" class="secondary-button">View Details</button></div>
    </div>
  </article>`;
}

function dashboardActionGroupHtml(title, records = [], renderItem, emptyText = "No items in this group.") {
  const visible = records.slice(0, 4);
  const overflow = records.length - visible.length;
  return `<section class="popup-record-section dashboard-action-group">
    <h3>${escapeHtml(title)} <span>${records.length}</span></h3>
    ${visible.length ? visible.map(renderItem).join("") : `<p>${escapeHtml(emptyText)}</p>`}
    ${overflow > 0 ? `<p class="dashboard-group-more">${overflow} more item${overflow === 1 ? "" : "s"} in this group.</p>` : ""}
  </section>`;
}

function dashboardNeedsActionHtml(metrics = dashboardMetrics()) {
  const selectedDate = metrics.selectedDate || ($("#dashboardDate")?.value || todayDate());
  return `
    <p class="dashboard-detail-summary">Condensed action list for ${escapeHtml(selectedDate)}. Open a card when you need the full dog, request, or maintenance record.</p>
    ${dashboardActionGroupHtml("Care Due", [...metrics.exerciseDueDogs.map((dog) => ({ dog, category: "Exercise" })), ...metrics.trainingDueDogs.map((dog) => ({ dog, category: "Training" })), ...metrics.ownedBathDueDogs.map((dog) => ({ dog, category: "Bath" }))], (item) => dashboardOwnedDogCardHtml(item.dog, item.category))}
    ${dashboardActionGroupHtml("Stay Services Due", metrics.boardingServiceDue, dashboardBoardingServiceCardHtml)}
    ${dashboardActionGroupHtml("Heat Watch", [...metrics.inHeatDogs, ...metrics.heatSoonDogs], (dog) => dashboardOwnedDogCardHtml(dog, "Heat"))}
    ${dashboardActionGroupHtml("Owner Updates Needed", metrics.ownerUpdateDogs, (dog) => dashboardBoardingDogCardHtml(dog, "Owner Update"))}
    ${dashboardActionGroupHtml("Arrivals / Departures", [...metrics.arrivalRecords.map((dog) => ({ dog, category: "Arrival" })), ...metrics.departureRecords.map((dog) => ({ dog, category: "Departure" }))], (item) => dashboardBoardingDogCardHtml(item.dog, item.category))}
    ${dashboardActionGroupHtml("Active Boarders", metrics.currentBoarding, (dog) => dashboardBoardingDogCardHtml(dog, "Active"))}
    ${dashboardActionGroupHtml("Open Maintenance", metrics.openMaintenanceRecords, dashboardMaintenanceCardHtml)}
    ${dashboardActionGroupHtml("Open Requests", metrics.openRequestRecords, dashboardRequestCardHtml)}
  `;
}

function dashboardDetailHtml(key) {
  const metrics = dashboardMetrics();
  if (key === "needsAction") return dashboardNeedsActionHtml(metrics);
  const records = dashboardDetailRecords(key);
  if (!records.length) return "<p>No open items in this category.</p>";
  if (["exerciseDue", "trainingDue", "inHeat", "heatSoon", "careNotes", "vaccines"].includes(key)) {
    const categories = {
      exerciseDue: "Exercise",
      trainingDue: "Training",
      inHeat: "Heat",
      heatSoon: "Heat",
      careNotes: "Medical/Care",
      vaccines: "Vaccine",
    };
    return records.map((record) => dashboardOwnedDogCardHtml(record, categories[key])).join("");
  }
  if (["arrivals", "departures", "activeBoarders", "ownerUpdates"].includes(key)) {
    const categories = {
      arrivals: "Arrival",
      departures: "Departure",
      activeBoarders: "Active",
      ownerUpdates: "Owner Update",
    };
    return records.map((record) => dashboardBoardingDogCardHtml(record, categories[key])).join("");
  }
  if (key === "baths") {
    const owned = metrics.ownedBathDueDogs.map((record) => dashboardOwnedDogCardHtml(record, "Bath")).join("");
    const boarding = metrics.boardingBathDueRecords.map((record) => dashboardBoardingDogCardHtml(record, "Bath")).join("");
    return owned + boarding || "<p>No bath work due.</p>";
  }
  if (key === "boardingServices") return records.map(dashboardBoardingServiceCardHtml).join("");
  if (key === "requests") return records.map(dashboardRequestCardHtml).join("");
  if (key === "maintenance") return records.map(dashboardMaintenanceCardHtml).join("");
  return "<p>No open items in this category.</p>";
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
  showDetailDialog(labels[key] || "Dashboard Details", dashboardDetailHtml(key));
}

function renderFinancials() {
  if (!$("#financialCards")) return;
  if (currentRole() !== "admin") {
    $("#financialCards").innerHTML = "";
    return;
  }
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
    ? notes.map((note) => `<article class="record-card"><strong>${escapeHtml(note.title)}</strong><p>${escapeHtml(note.note)}</p><div class="record-actions"><button type="button" class="secondary-button" data-action="remove-cfo-note" data-id="${escapeHtml(note.id)}">Remove</button></div></article>`).join("")
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

function alertManagedUsers() {
  return settingsUsers().filter((user) => ["admin", "helper"].includes(user.role));
}

function customerAlertUsers() {
  return settingsUsers().filter((user) => user.role === "customer");
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
      return `<article class="record-card compact-record-card alert-preference-card">
        <strong>${escapeHtml(user.name || user.email || "Staff member")}</strong>
        <span>${escapeHtml(user.email || "")} | ${escapeHtml(roleLabel(user.role))}</span>
        <p>${labels.length ? escapeHtml(labels.join(", ")) : "No alerts selected."}</p>
      </article>`;
    }).join("")
    : `<article class="record-card compact-record-card"><strong>No staff users saved yet</strong><p>Add staff in Settings > Users before customizing alerts.</p></article>`;
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
    ? `<div class="record-grid alert-history-list">${records.map((record) => `<article class="record-card compact-record-card">
      <strong>${escapeHtml(notificationDisplayTitle(record))}</strong>
      <span>${escapeHtml(formatDateTime(record.submittedAt || record.updatedAt))} | ${escapeHtml((record.audienceEmails || []).length)} recipient${(record.audienceEmails || []).length === 1 ? "" : "s"} | ${escapeHtml(record.deliveryStatus || "queued")}</span>
      <p>${multilineHtml(notificationDisplayMessage(record))}</p>
    </article>`).join("")}</div>`
    : `<article class="record-card compact-record-card"><strong>No ${escapeHtml(urgentAlertTargetLabel(target).toLowerCase())} urgent alerts sent yet</strong><p>Sent alerts will show here for review.</p></article>`;
}

function urgentAlertPopupHtml(target = "staff") {
  const label = urgentAlertTargetLabel(target);
  const recipients = urgentAlertAudienceUsers(target);
  const recipientText = recipients.length
    ? recipients.map((user) => user.name || user.email).filter(Boolean).join(", ")
    : target === "customer"
      ? "No customer users found."
      : "No staff/admin users are enabled for urgent staff alerts.";
  return `<div class="profile-tabs alert-popup-tabs" role="tablist" aria-label="${escapeHtml(label)} alert tabs">
      <button type="button" class="secondary-button is-active" data-alert-popup-tab="compose" aria-selected="true">Alert Tab</button>
      <button type="button" class="secondary-button" data-alert-popup-tab="history" aria-selected="false">Alert History</button>
    </div>
    <form id="urgentAlertForm" class="tracker-form" data-alert-target="${escapeHtml(target)}" data-alert-panel="compose">
      <section class="alert-popup-panel" data-alert-panel="compose">
        <article class="record-card compact-record-card"><strong>Recipients</strong><p>${escapeHtml(recipientText)}</p></article>
        ${recipients.length ? `<section class="alert-checkbox-group"><h3>Send To</h3>${recipients.map((user) => {
          const email = user.email || "";
          const label = user.name || email || "Recipient";
          const detail = user.name && email ? ` <small>${escapeHtml(email)}</small>` : "";
          return `<label class="inline-check"><input type="checkbox" name="alertRecipientEmails" value="${escapeHtml(email)}" checked /> ${escapeHtml(label)}${detail}</label>`;
        }).join("")}</section>` : ""}
        <label>${escapeHtml(label)} alert message<textarea name="message" rows="5" required placeholder="Type the urgent alert message here"></textarea></label>
        <div class="button-row"><button type="submit" ${recipients.length ? "" : "disabled"}>Send Alert</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
      </section>
      <section class="alert-popup-panel" data-alert-panel="history" hidden>
        ${alertHistoryHtml(target)}
      </section>
    </form>`;
}

function openUrgentAlertPopup(target = "staff") {
  showDetailDialog(`Urgent ${urgentAlertTargetLabel(target)} Alert`, urgentAlertPopupHtml(target));
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
      showToast(`Alert source could not be saved: ${error.message}`);
      return null;
    }
  }
  const notification = await notifyIfNeeded(sourceRecord, eventName);
  await addAuditLog(`Sent urgent ${target} alert`, "notificationLog", notification || sourceRecord, `${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`);
  renderSettingsAlerts();
  renderNotifications();
  return notification;
}

function urgentAlertResultDialog(notification = {}) {
  const count = (notification.audienceEmails || []).length;
  const recipientText = `${count} recipient${count === 1 ? "" : "s"}`;
  const status = notification.deliveryStatus || "queued";
  const emailReason = notification.emailResult?.reason || notification.deliveryError || "";
  if (status === "sent") {
    showDetailDialog("Alert Sent", `<p>The urgent alert email was sent to ${escapeHtml(recipientText)}.</p>`);
    return;
  }
  if (status === "sms sent; email skipped") {
    showDetailDialog("Email Skipped", `<p>The alert was saved and SMS was sent, but email was skipped for ${escapeHtml(recipientText)}.</p>${emailReason ? `<p>${escapeHtml(emailReason)}</p>` : ""}`);
    return;
  }
  if (status === "skipped") {
    showDetailDialog("Email Not Sent", `<p>The alert was saved in-app, but no email was sent to ${escapeHtml(recipientText)}.</p>${emailReason ? `<p>${escapeHtml(emailReason)}</p>` : ""}`);
    return;
  }
  showDetailDialog("Alert Saved In App", `<p>The alert was saved for ${escapeHtml(recipientText)}, but external delivery did not complete.</p>${emailReason ? `<p>${escapeHtml(emailReason)}</p>` : ""}`);
}

function alertPreferencePopupHtml(selectedEmail = "") {
  const users = alertManagedUsers().sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || ""), undefined, { sensitivity: "base" }));
  const selectedUser = users.find((user) => normalizeEmail(user.email) === normalizeEmail(selectedEmail)) || users[0] || {};
  const selectedTypes = new Set(alertTypesForUser(selectedUser));
  const options = users.map((user) => `<option value="${escapeHtml(user.email || "")}" ${normalizeEmail(user.email) === normalizeEmail(selectedUser.email) ? "selected" : ""}>${escapeHtml(user.name || user.email || "Staff member")} (${escapeHtml(roleLabel(user.role))})</option>`).join("");
  const groups = [...new Set(alertTypeDefinitions.map((item) => item.group))];
  return `<form id="alertPreferenceForm" class="tracker-form" data-user-email="${escapeHtml(selectedUser.email || "")}">
    ${users.length ? `<label>Staff member<select name="userEmail" id="alertPreferenceUserSelect" required>${options}</select></label>
    <div class="alert-checkbox-grid">
      ${groups.map((group) => `<section class="alert-checkbox-group"><h3>${escapeHtml(group)}</h3>${alertTypeDefinitions.filter((item) => item.group === group).map((item) => `<label class="inline-check"><input type="checkbox" name="alertTypes" value="${escapeHtml(item.key)}" ${selectedTypes.has(item.key) ? "checked" : ""} /> ${escapeHtml(item.label)}</label>`).join("")}</section>`).join("")}
    </div>
    <div class="button-row"><button type="submit">Update Alert</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>` : `<article class="record-card compact-record-card"><strong>No staff users saved yet</strong><p>Add staff or admin users before customizing alerts.</p></article><div class="button-row"><button type="button" class="secondary-button" data-action="close-dialog">Close</button></div>`}
  </form>`;
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
  await addAuditLog("Updated alert preferences", "notificationPreference", record, `${user.name || user.email} | ${alertTypes.length} alert types`);
  renderSettingsAlerts();
  return record;
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
  tabs.innerHTML = `${names.map((name) => `<span class="task-tab-pill"><button type="button" data-kennel-building-tab="${escapeHtml(name)}" role="tab" aria-selected="${name === active ? "true" : "false"}" class="${name === active ? "is-active" : ""}">${escapeHtml(name)}</button></span>`).join("")}${canManage ? `<button type="button" class="secondary-button task-add-tab-button" data-action="add-kennel-building-tab">Add Tab</button>` : ""}`;
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
  const actionRow = $("#kennelBuildingActionRow");
  if (actionRow) {
    actionRow.innerHTML = currentRole() === "admin"
      ? `<button type="button" class="secondary-button danger-button" data-action="remove-kennel-building-tab" data-building="${escapeHtml(active)}">Delete ${escapeHtml(active)}</button>`
      : "";
  }
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
      <strong>Delete ${escapeHtml(building)}?</strong>
      <p>This deletes the building tab and ${count} saved location${count === 1 ? "" : "s"} under it.</p>
    </article>
    <div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-kennel-building-tab" data-building="${escapeHtml(building)}">Delete ${escapeHtml(building)}</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </div>`;
}

function openKennelBuildingRemoveConfirm(building = "") {
  if (building) showDetailDialog("Confirm Delete Building Tab", kennelBuildingRemoveConfirmHtml(building));
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

function operationBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return !["false", "off", "no", "closed", "0"].includes(String(value).toLowerCase());
}

function formFieldByName(formEl, name = "") {
  const field = formEl?.elements?.namedItem?.(name) || formEl?.elements?.[name] || null;
  return field && !field.tagName && typeof field.length === "number" && typeof field.item === "function" ? field.item(0) : field;
}

function normalizeOperationTime(value = "", fallback = defaultOperationOpenTime) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function operationHoursRecords() {
  const defaults = defaultOperationHourRecords();
  const recordsByWeekday = new Map(defaults.map((record) => [record.weekday, record]));
  readRecords("operationHours")
    .filter((record) => !record.removed)
    .forEach((record) => {
      const weekday = record.weekday || operationWeekdays.find((day) => day.dayIndex === Number(record.dayIndex))?.key;
      if (!weekday) return;
      const fallback = recordsByWeekday.get(weekday) || {};
      recordsByWeekday.set(weekday, { ...fallback, ...record, weekday });
    });
  return operationWeekdays.map((day) => {
    const record = recordsByWeekday.get(day.key) || {};
    return {
      ...record,
      type: "operationHours",
      id: record.id || `operationHours-${day.key}`,
      weekday: day.key,
      weekdayLabel: day.label,
      dayIndex: day.dayIndex,
      isOpen: operationBoolean(record.isOpen, true),
      openTime: normalizeOperationTime(record.openTime, defaultOperationOpenTime),
      closeTime: normalizeOperationTime(record.closeTime, defaultOperationCloseTime),
      removed: false,
    };
  });
}

function operationHoursForDate(date = todayDate()) {
  const parsed = new Date(`${dateOnly(date) || todayDate()}T12:00:00`);
  const dayIndex = Number.isNaN(parsed.getTime()) ? 1 : parsed.getDay();
  return operationHoursRecords().find((record) => Number(record.dayIndex) === dayIndex) || operationHoursRecords()[0];
}

function operationOverrideForDate(date = "") {
  const dateKey = dateOnly(date);
  if (!dateKey) return null;
  return readRecords("operationDateOverride")
    .filter((record) => !record.removed && record.date === dateKey)
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0))[0] || null;
}

function operationWindowForDate(date = "") {
  const dateKey = dateOnly(date);
  const weekly = operationHoursForDate(dateKey);
  const override = operationOverrideForDate(dateKey);
  const openSource = override || weekly;
  const isOpen = operationBoolean(openSource.isOpen, true);
  const openTime = normalizeOperationTime(openSource.openTime || weekly.openTime, weekly.openTime || defaultOperationOpenTime);
  const closeTime = normalizeOperationTime(openSource.closeTime || weekly.closeTime, weekly.closeTime || defaultOperationCloseTime);
  const invalidWindow = isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime);
  return {
    date: dateKey,
    isOpen: isOpen && !invalidWindow,
    openTime,
    closeTime,
    message: override?.customerMessage || "",
    override,
    weekly,
    invalidWindow,
  };
}

function operationWindowText(window = {}) {
  if (!window.date) return "Choose a date to see available customer request hours.";
  if (!window.isOpen) return window.invalidWindow ? "Hours need review by the kennel before customers can request this day." : "Closed to customer drop-off and pick-up requests.";
  return `Available ${displayTime(window.openTime)} - ${displayTime(window.closeTime)}`;
}

function operationDateLabel(date = "") {
  const dateKey = dateOnly(date);
  if (!dateKey) return "Selected date";
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function customerBookingAvailabilityForDateTime(value = "", label = "Selected time") {
  if (!value) return { valid: true, notices: [] };
  const date = dateOnly(value);
  const parsed = new Date(value);
  if (!date || Number.isNaN(parsed.getTime())) return { valid: false, fieldLabel: label, message: `${label} is not a valid date and time.`, notices: [] };
  const window = operationWindowForDate(date);
  const notices = [];
  if (window.message) notices.push(`${operationDateLabel(date)}: ${window.message}`);
  if (!window.isOpen) {
    return {
      valid: false,
      fieldLabel: label,
      message: `${label} falls on ${operationDateLabel(date)}. ${window.message || operationWindowText(window)}`,
      notices,
      window,
    };
  }
  const selectedMinutes = parsed.getHours() * 60 + parsed.getMinutes();
  const openMinutes = timeToMinutes(window.openTime);
  const closeMinutes = timeToMinutes(window.closeTime);
  if (selectedMinutes < openMinutes || selectedMinutes > closeMinutes) {
    return {
      valid: false,
      fieldLabel: label,
      message: `${label} must be between ${displayTime(window.openTime)} and ${displayTime(window.closeTime)} on ${operationDateLabel(date)}.`,
      notices,
      window,
    };
  }
  notices.push(`${label}: ${operationWindowText(window)}.`);
  return { valid: true, fieldLabel: label, notices, window };
}

function customerBookingAvailabilityChecks(formEl = $("#customerBookingForm")) {
  if (!formEl) return [];
  const isServiceRequest = $("#customerRequestMode")?.value === "service";
  const dropoffField = formFieldByName(formEl, "dropoffTime");
  const pickupField = formFieldByName(formEl, "pickupTime");
  const checks = [
    { field: dropoffField, result: customerBookingAvailabilityForDateTime(dropoffField?.value || "", isServiceRequest ? "Ideal drop off time" : "Drop-off time") },
  ];
  if (pickupField?.value || !isServiceRequest) {
    checks.push({ field: pickupField, result: customerBookingAvailabilityForDateTime(pickupField?.value || "", isServiceRequest ? "Alternative drop off time" : "Pick-up time") });
  }
  return checks;
}

function clearCustomerBookingTimeErrors(formEl = $("#customerBookingForm")) {
  ["dropoffTime", "pickupTime"].forEach((name) => {
    const field = formFieldByName(formEl, name);
    if (field) clearFieldError(field);
  });
}

function customerRequestMode() {
  return $("#customerRequestMode")?.value === "service" ? "service" : "boarding";
}

function parsedCustomerDateTime(value = "") {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function customerBookingDateOrderError(formEl = $("#customerBookingForm")) {
  const mode = customerRequestMode();
  const dropoffField = formFieldByName(formEl, "dropoffTime");
  const pickupField = formFieldByName(formEl, "pickupTime");
  const dropoff = parsedCustomerDateTime(dropoffField?.value || "");
  const pickup = parsedCustomerDateTime(pickupField?.value || "");
  if (dropoffField?.value && !dropoff) {
    return { field: dropoffField, message: "Requested drop-off time is not a valid date and time." };
  }
  if (pickupField?.value && !pickup) {
    return { field: pickupField, message: mode === "service" ? "Alternative drop off time is not a valid date and time." : "Pick-up time is not a valid date and time." };
  }
  const editingExisting = Boolean($("#editingCustomerRequestId")?.value);
  if (!editingExisting && dropoff && dropoff.getTime() < Date.now() - 300000) {
    return { field: dropoffField, message: "Requested drop-off time must be in the future." };
  }
  if (mode === "boarding" && dropoff && pickup && pickup <= dropoff) {
    return { field: pickupField, message: "Pick-up time must be after the drop-off time." };
  }
  return null;
}

function customerBookingAvailabilityMessagesHtml(checks = customerBookingAvailabilityChecks()) {
  const messages = [];
  const seen = new Set();
  checks.forEach(({ result }) => {
    (result.notices || []).forEach((notice) => {
      if (seen.has(notice)) return;
      seen.add(notice);
      messages.push({ type: result.valid ? "info" : "warning", text: notice });
    });
    if (!result.valid && result.message && !seen.has(result.message)) {
      seen.add(result.message);
      messages.push({ type: "warning", text: result.message });
    }
  });
  return messages.map((item) => `<article class="operation-availability-card ${item.type === "warning" ? "is-warning" : ""}">${escapeHtml(item.text)}</article>`).join("");
}

function renderCustomerBookingAvailabilityMessages() {
  const container = $("#customerBookingAvailabilityMessages");
  if (!container) return;
  const formEl = $("#customerBookingForm");
  if (!formEl || formEl.hidden) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = customerBookingAvailabilityMessagesHtml();
}

function validateCustomerBookingAvailability(formEl = $("#customerBookingForm")) {
  clearCustomerBookingTimeErrors(formEl);
  const dateOrderError = customerBookingDateOrderError(formEl);
  const checks = customerBookingAvailabilityChecks(formEl);
  let firstInvalid = dateOrderError?.field || null;
  if (dateOrderError?.field) setFieldError(dateOrderError.field, dateOrderError.message);
  checks.forEach(({ field, result }) => {
    if (!field || result.valid) return;
    setFieldError(field, result.message);
    firstInvalid = firstInvalid || field;
  });
  renderCustomerBookingAvailabilityMessages();
  if (firstInvalid) {
    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
    showToast(dateOrderError?.message || "Choose a customer request time inside the kennel hours.");
    return false;
  }
  return true;
}

function customerBookingEstimateAvailabilityChecks(estimate = {}) {
  const isServiceRequest = Boolean(estimate.isServiceRequest);
  return [
    { result: customerBookingAvailabilityForDateTime(estimate.dropoffTime || "", isServiceRequest ? "Ideal drop off time" : "Drop-off time") },
    { result: customerBookingAvailabilityForDateTime(estimate.pickupTime || "", isServiceRequest ? "Alternative drop off time" : "Pick-up time") },
  ].filter((item) => item.result);
}

function customerBookingEstimateAvailabilityValid(estimate = {}) {
  return customerBookingEstimateAvailabilityChecks(estimate).every((item) => item.result.valid);
}

function monthLabel(monthKey = operationCalendarMonth) {
  const date = new Date(`${monthKey || todayDate().slice(0, 7)}-01T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function operationCalendarDates(monthKey = operationCalendarMonth) {
  const first = new Date(`${monthKey}-01T12:00:00`);
  if (Number.isNaN(first.getTime())) return [];
  const firstOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - firstOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return localDateKey(date);
  });
}

function operationOverrideSummaryHtml() {
  const overrides = readRecords("operationDateOverride")
    .filter((record) => !record.removed)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return overrides.length
    ? overrides.map((record) => {
      const open = operationBoolean(record.isOpen, true);
      const timeText = open ? `${displayTime(record.openTime)} - ${displayTime(record.closeTime)}` : "Closed";
      return `<article class="record-card compact-record-card"><strong>${escapeHtml(operationDateLabel(record.date))}</strong><span>${escapeHtml(timeText)}</span>${record.customerMessage ? `<p>${escapeHtml(record.customerMessage)}</p>` : ""}<div class="record-actions"><button type="button" class="secondary-button" data-action="open-operation-date-override" data-date="${escapeHtml(record.date)}">Edit</button></div></article>`;
    }).join("")
    : `<article class="record-card compact-record-card"><strong>No date overrides saved</strong><p>Weekly hours apply until a specific calendar date is changed.</p></article>`;
}

function renderOperationHoursSettings() {
  const list = $("#operationHoursList");
  if (!list) return;
  const hours = operationHoursRecords();
  const openDays = hours.filter((record) => operationBoolean(record.isOpen, true)).length;
  const overrideCount = readRecords("operationDateOverride").filter((record) => !record.removed).length;
  const closedOverrides = readRecords("operationDateOverride").filter((record) => !record.removed && !operationBoolean(record.isOpen, true)).length;
  $("#operationHoursSummary").innerHTML = [
    ["Open days", openDays, "weekly customer request days"],
    ["Date overrides", overrideCount, "calendar-specific changes"],
    ["Closed dates", closedOverrides, "blocked request dates"],
  ].map(([label, value, note]) => `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><p>${escapeHtml(note)}</p></div>`).join("");
  list.innerHTML = hours.map((record) => {
    const open = operationBoolean(record.isOpen, true);
    return `<article class="record-card operation-day-card" data-weekday="${escapeHtml(record.weekday)}">
      <div class="operation-day-header">
        <strong>${escapeHtml(record.weekdayLabel || record.weekday)}</strong>
        <label class="toggle-row"><input type="checkbox" data-operation-open ${open ? "checked" : ""} /> Open</label>
      </div>
      <div class="field-grid">
        <label>Open time<input type="time" data-operation-open-time value="${escapeHtml(record.openTime || defaultOperationOpenTime)}" ${open ? "" : "disabled"} /></label>
        <label>Close time<input type="time" data-operation-close-time value="${escapeHtml(record.closeTime || defaultOperationCloseTime)}" ${open ? "" : "disabled"} /></label>
      </div>
      <p>${open ? `Customers can request drop-off and pick-up from ${escapeHtml(displayTime(record.openTime))} to ${escapeHtml(displayTime(record.closeTime))}.` : "Customers cannot request drop-off or pick-up on this weekday."}</p>
    </article>`;
  }).join("");
  const monthLabelEl = $("#operationCalendarMonthLabel");
  if (monthLabelEl) monthLabelEl.textContent = monthLabel(operationCalendarMonth);
  const calendar = $("#operationOverrideCalendar");
  if (calendar) {
    calendar.innerHTML = [
      ...operationWeekdays.map((day) => `<div class="operation-calendar-header">${escapeHtml(day.shortLabel)}</div>`),
      ...operationCalendarDates(operationCalendarMonth).map((date) => {
        const inMonth = date.slice(0, 7) === operationCalendarMonth;
        const window = operationWindowForDate(date);
        const override = window.override;
        const status = !window.isOpen ? "Closed" : override ? "Custom" : "Open";
        const message = override?.customerMessage ? "Message" : "";
        return `<button type="button" class="operation-calendar-day ${inMonth ? "" : "is-outside-month"} ${!window.isOpen ? "is-closed" : ""} ${override ? "has-override" : ""}" data-action="open-operation-date-override" data-date="${escapeHtml(date)}">
          <strong>${Number(date.slice(8, 10))}</strong>
          <span>${escapeHtml(status)}</span>
          ${message ? `<small>${escapeHtml(message)}</small>` : ""}
        </button>`;
      }),
    ].join("");
  }
  const overrideList = $("#operationOverrideList");
  if (overrideList) overrideList.innerHTML = operationOverrideSummaryHtml();
}

async function saveOperationHoursSettings() {
  if (currentRole() !== "admin") return null;
  const cards = $$("#operationHoursList .operation-day-card");
  const now = new Date().toISOString();
  const records = [];
  for (const card of cards) {
    const weekday = card.dataset.weekday || "";
    const day = operationWeekdays.find((item) => item.key === weekday);
    if (!day) continue;
    const isOpen = Boolean(card.querySelector("[data-operation-open]")?.checked);
    const openTime = normalizeOperationTime(card.querySelector("[data-operation-open-time]")?.value, defaultOperationOpenTime);
    const closeTime = normalizeOperationTime(card.querySelector("[data-operation-close-time]")?.value, defaultOperationCloseTime);
    if (isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime)) {
      showToast(`${day.label} close time must be after open time.`);
      card.querySelector("[data-operation-close-time]")?.focus();
      return null;
    }
    records.push({
      type: "operationHours",
      id: `operationHours-${day.key}`,
      weekday: day.key,
      weekdayLabel: day.label,
      dayIndex: day.dayIndex,
      isOpen,
      openTime,
      closeTime,
      submittedAt: readRecords("operationHours").find((record) => record.id === `operationHours-${day.key}`)?.submittedAt || now,
      updatedAt: now,
      updatedBy: currentUser?.email || helperEmail?.value || "",
      removed: false,
    });
  }
  for (const record of records) await sendPayload(upsertRecord("operationHours", record));
  await addAuditLog("Updated operation hours", "operationHours", { id: "weekly-operation-hours" }, "Weekly customer request hours updated.");
  renderOperationHoursSettings();
  renderCustomerBookingAvailabilityMessages();
  showToast("Hours of operation saved.");
  return records;
}

async function resetOperationHoursSettings() {
  if (currentRole() !== "admin") return null;
  const now = new Date().toISOString();
  for (const record of defaultOperationHourRecords()) {
    await sendPayload(upsertRecord("operationHours", { ...record, updatedAt: now, updatedBy: currentUser?.email || helperEmail?.value || "" }));
  }
  await addAuditLog("Reset operation hours", "operationHours", { id: "weekly-operation-hours" }, "Weekly customer request hours reset to 9 AM - 9 PM.");
  renderOperationHoursSettings();
  showToast("Weekly hours reset.");
  return true;
}

function operationDateOverrideFormHtml(date = todayDate()) {
  const dateKey = dateOnly(date) || todayDate();
  const existing = operationOverrideForDate(dateKey) || {};
  const weekly = operationHoursForDate(dateKey);
  const open = operationBoolean(existing.isOpen, operationBoolean(weekly.isOpen, true));
  const openTime = normalizeOperationTime(existing.openTime || weekly.openTime, defaultOperationOpenTime);
  const closeTime = normalizeOperationTime(existing.closeTime || weekly.closeTime, defaultOperationCloseTime);
  return `<form id="operationDateOverrideForm" class="tracker-form" data-date="${escapeHtml(dateKey)}" data-id="${escapeHtml(existing.id || "")}">
    <article class="record-card compact-record-card">
      <strong>${escapeHtml(operationDateLabel(dateKey))}</strong>
      <span>Weekly default: ${operationBoolean(weekly.isOpen, true) ? `${escapeHtml(displayTime(weekly.openTime))} - ${escapeHtml(displayTime(weekly.closeTime))}` : "Closed"}</span>
    </article>
    <label class="toggle-row"><input type="checkbox" name="isOpen" ${open ? "checked" : ""} /> Open to customer drop-off and pick-up requests</label>
    <div class="field-grid">
      <label>Open time<input type="time" name="openTime" value="${escapeHtml(openTime)}" ${open ? "" : "disabled"} /></label>
      <label>Close time<input type="time" name="closeTime" value="${escapeHtml(closeTime)}" ${open ? "" : "disabled"} /></label>
    </div>
    <label>Customer message<textarea name="customerMessage" rows="3" placeholder="Message customers will see when they select this date.">${escapeHtml(existing.customerMessage || "")}</textarea></label>
    <div class="button-row">
      <button type="submit">Save Date</button>
      ${existing.id ? `<button type="button" class="secondary-button danger-button" data-action="clear-operation-date-override" data-id="${escapeHtml(existing.id)}">Clear Override</button>` : ""}
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </form>`;
}

function openOperationDateOverridePopup(date = todayDate()) {
  if (currentRole() !== "admin") {
    showToast("Admin access required to edit hours of operation.");
    return;
  }
  showDetailDialog("Date Hours Override", operationDateOverrideFormHtml(date));
}

async function saveOperationDateOverrideFromForm(formEl) {
  if (currentRole() !== "admin") return null;
  const date = formEl.dataset.date || todayDate();
  const existing = formEl.dataset.id ? readRecords("operationDateOverride").find((record) => record.id === formEl.dataset.id) : operationOverrideForDate(date);
  const isOpenField = formFieldByName(formEl, "isOpen");
  const openTimeField = formFieldByName(formEl, "openTime");
  const closeTimeField = formFieldByName(formEl, "closeTime");
  const customerMessageField = formFieldByName(formEl, "customerMessage");
  const isOpen = Boolean(isOpenField?.checked);
  const openTime = normalizeOperationTime(openTimeField?.value, defaultOperationOpenTime);
  const closeTime = normalizeOperationTime(closeTimeField?.value, defaultOperationCloseTime);
  if (isOpen && timeToMinutes(closeTime) <= timeToMinutes(openTime)) {
    showToast("Close time must be after open time.");
    closeTimeField?.focus();
    return null;
  }
  const now = new Date().toISOString();
  const record = upsertRecord("operationDateOverride", {
    ...(existing || {}),
    type: "operationDateOverride",
    id: existing?.id || `operationDateOverride-${date}`,
    submittedAt: existing?.submittedAt || now,
    date,
    isOpen,
    openTime,
    closeTime,
    customerMessage: customerMessageField?.value.trim() || "",
    updatedAt: now,
    updatedBy: currentUser?.email || helperEmail?.value || "",
    removed: false,
  });
  await sendPayload(record);
  await addAuditLog("Updated operation date override", "operationDateOverride", record, `${operationDateLabel(date)} | ${isOpen ? `${displayTime(openTime)} - ${displayTime(closeTime)}` : "Closed"}`);
  renderOperationHoursSettings();
  renderCustomerBookingAvailabilityMessages();
  return record;
}

async function clearOperationDateOverride(id = "") {
  const record = readRecords("operationDateOverride").find((item) => item.id === id && !item.removed);
  if (!record || currentRole() !== "admin") return null;
  const updated = upsertRecord("operationDateOverride", { ...record, removed: true, removedAt: new Date().toISOString() });
  await sendPayload(updated);
  await addAuditLog("Cleared operation date override", "operationDateOverride", updated, operationDateLabel(updated.date));
  renderOperationHoursSettings();
  renderCustomerBookingAvailabilityMessages();
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
  const targetStay = boardingStatusTargetStay(record, nextStatus, options) || {};
  const selectedBuilding = targetStay.kennelBuilding || record.kennelBuilding || buildings[0] || "Shed";
  const buildingOptions = buildings.map((building) => `<option value="${escapeHtml(building)}" ${building === selectedBuilding ? "selected" : ""}>${escapeHtml(building)}</option>`).join("");
  const locationOptions = kennelLocationOptionsForBuilding(selectedBuilding, targetStay.kennelLocationId || record.kennelLocationId || "");
  const hasLocationsForBuilding = locations.some((location) => (location.building || "") === selectedBuilding);
  const help = locations.length ? "Choose the building first, then the exact kennel assignment." : "Add active kennel locations in Settings first.";
  return `<form id="kennelAssignmentForm" class="tracker-form" data-dog-id="${escapeHtml(record.id || "")}" data-stay-id="${escapeHtml(options.stayId || "")}" data-request-code="${escapeHtml(options.requestCode || "")}" data-next-status="${escapeHtml(nextStatus)}" data-allow-early="${options.allowEarly ? "true" : "false"}" data-early="${options.early ? "true" : "false"}">
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
  const canImpersonate = isEdit && currentRole() === "admin" && normalizeEmail(user.email) !== normalizeEmail(currentUser?.email);
  const latestAgreement = user.latestBoardingAgreement || {};
  const agreementCard = isEdit && latestAgreement.signedAt
    ? `<article class="record-card compact-record-card settings-user-login-card"><span>Boarding Agreement</span><strong>Signed ${escapeHtml(formatDateTime(latestAgreement.signedAt) || latestAgreement.signedAt)}</strong><p>${escapeHtml([latestAgreement.signerName || user.name || "", latestAgreement.agreementVersion ? "Version " + latestAgreement.agreementVersion : ""].filter(Boolean).join(" | "))}</p>${latestAgreement.id ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="view-settings-user-agreement" data-id="${escapeHtml(latestAgreement.id)}">Open Agreement</button></div>` : ""}</article>`
    : "";
  return `
    <form id="settingsUserPopupForm" class="tracker-form" data-user-id="${escapeHtml(user.id || "")}">
      <input type="hidden" name="id" value="${escapeHtml(user.id || "")}" />
      <article class="record-card compact-record-card settings-user-login-card">
        <span>${isEdit ? "Last Login" : "New User"}</span>
        <strong>${escapeHtml(isEdit ? settingsUserLastLoginText(user) : "Create access for a staff member, admin, customer, or member customer.")}</strong>
        <p>${isEdit ? (user.loginCount ? `${Number(user.loginCount)} recorded login${Number(user.loginCount) === 1 ? "" : "s"}.` : "This updates after the user signs in through the app.") : "Save the user first, then set a temporary password or send a reset email when needed."}</p>
      </article>
      ${agreementCard}
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
      <div class="button-row"><button type="submit">Save User</button>${canImpersonate ? `<button type="button" class="secondary-button" data-action="popup-impersonate-user" data-id="${escapeHtml(user.id || "")}">Impersonate User</button>` : ""}${isEdit ? `<button type="button" class="secondary-button danger-button" data-action="popup-remove-user" data-id="${escapeHtml(user.id || "")}">Remove</button>` : ""}<button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
    </form>`;
}

function openSettingsUserPopup(user = {}) {
  showDetailDialog(user.id ? `${user.name || user.email || "User"} Access` : "Add User", settingsUserPopupHtml(user));
}

function openSettingsUserAgreement(id = "") {
  if (!id || !["admin", "staff", "helper"].includes(currentRole())) {
    showToast("This agreement could not be opened.");
    return;
  }
  const record = readRecords("boardingAgreement").find((item) => item.id === id && !item.removed);
  if (!record) {
    showToast("This agreement could not be opened.");
    return;
  }
  if (typeof customerAgreementDetailHtml === "function") {
    showDetailDialog("Signed Boarding Agreement", customerAgreementDetailHtml(record));
    return;
  }
  showDetailDialog("Signed Boarding Agreement", detailRows(record, [
    ["Signer", "signerName"],
    ["Email", "signerEmail"],
    ["Signed", "signedAt"],
    ["Version", "agreementVersion"],
    ["Document hash", "documentHash"],
    ["Signature hash", "signatureHash"],
  ]));
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
  settingsUserTab = settingsUserTabFor(record);
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
    showDetailDialog("Admin Sign-In Required", `<p>${escapeHtml(sessionError)}</p><p>Use the Login page with an admin Settings user, then return to Settings and set the temporary password.</p>`);
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

// === MODULE: CUSTOMER ===
function renderCustomerDogs() {
  if (!$("#customerDogList")) return;
  if (currentRole() !== "customer") {
    $("#customerDogList").innerHTML = "";
    if ($("#customerBookingDogList")) $("#customerBookingDogList").innerHTML = "";
    $("#customerRequestActions")?.toggleAttribute("hidden", true);
    $("#customerNoDogRequestPrompt")?.toggleAttribute("hidden", true);
    if (activePageId() === "customerPage") switchPage(defaultPageForRole());
    return;
  }
  const dogs = customerDogsForCurrentUser();
  const checkedIds = new Set([...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]:checked')].map((input) => input.value));
  $("#openCustomerDogModalButton")?.toggleAttribute("hidden", !dogs.length);
  $("#customerDogList").innerHTML = dogs.length
    ? `${dogs.map(customerDogSummaryCardHtml).join("")}<div class="button-row"><button type="button" class="secondary-button" data-action="add-customer-dog-inline">Add Another Dog</button></div>`
    : customerDogWelcomeHtml();
  hydrateProfilePhotoElements($("#customerDogList"));
  if ($("#customerBookingDogList")) {
    $("#customerBookingDogList").innerHTML = dogs.length
      ? dogs.map((dog) => `<label class="customer-dog-item"><input type="checkbox" name="customerDogSelect" value="${dog.id}" ${checkedIds.has(dog.id) ? "checked" : ""} /> <strong>${escapeHtml(dog.dogName)}</strong><span>${escapeHtml(dog.breedDescription || "")}</span></label>`).join("")
      : `<article class="record-card compact-record-card"><strong>Add a dog before requesting boarding.</strong><p>Boarding requests need at least one dog profile first.</p><button type="button" class="secondary-button" data-action="customer-add-dog-cta">Add Dog</button></article>`;
  }
  $("#customerBookingForm")?.classList.toggle("has-no-customer-dogs", !dogs.length);
  $("#requestBoardingButton").disabled = !dogs.length;
  $("#customerRequestActions")?.toggleAttribute("hidden", !dogs.length);
  $("#customerNoDogRequestPrompt")?.toggleAttribute("hidden", dogs.length);
  renderCustomerStayProgramOptions();
  renderCustomerCrateShareOptions();
  renderCustomerServiceOptions();
  updateCustomerEstimate();
  renderCustomerProgress();
}

function renderCustomerProgress() {
  const panels = ["#customerOnboardingProgress", "#customerRequestProgress"].map((selector) => $(selector)).filter(Boolean);
  panels.forEach((panel) => {
    panel.innerHTML = "";
    panel.hidden = true;
  });
}

function vaccinationExpiryDate(record = {}) {
  const value = record.expires_at || record.expiresAt || record.expirationDate || record.expiration_date || "";
  const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function vaccinationFieldDate(record = {}, keys = []) {
  const value = keys.map((key) => record[key]).find(Boolean) || "";
  const date = value ? new Date(`${String(value).slice(0, 10)}T12:00:00`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function vaccinationDateExpiry(record = {}, vaccineKey = "", keys = [], defaultYears = 1) {
  const date = vaccinationFieldDate(record, keys);
  if (!date) return null;
  const years = vaccineDurationIsThreeYears(record, vaccineKey) ? 3 : defaultYears;
  const expiry = new Date(date);
  expiry.setFullYear(expiry.getFullYear() + years);
  return expiry;
}

function legacyVaccinationDateStatus(record = {}) {
  const expirations = [
    vaccinationDateExpiry(record, "rabies", ["rabiesDate", "rabiesVaccinationDate", "lastRabiesVaccination"], 1),
    vaccinationDateExpiry(record, "dhpp", ["dhppDate", "dhppVaccinationDate", "lastDhppVaccination"], 1),
    vaccinationDateExpiry(record, "bordetella", ["bordetellaDate", "bordetellaVaccinationDate", "lastBordetellaVaccination"], 1),
  ].filter(Boolean);
  if (!expirations.length) return "";
  const today = new Date(`${todayDate()}T00:00:00`);
  return expirations.some((date) => date >= today) ? "ok" : "expired";
}

function vaccinationStatusInfo(record = {}) {
  const records = arrayValue(record.vaccinationRecords);
  const expirations = records.map(vaccinationExpiryDate).filter(Boolean);
  const today = new Date(`${todayDate()}T00:00:00`);
  const hasVaccinationRecords = records.length > 0;
  const legacyDateStatus = legacyVaccinationDateStatus(record);
  if (legacyDateStatus === "ok") {
    return { label: "Vaccines OK", customerLabel: "Vaccines on file", className: "is-vaccine-ok", customerClassName: "is-vaccine-ok" };
  }
  if (hasVaccinationRecords && expirations.some((date) => date >= today)) {
    return { label: "Vaccines OK", customerLabel: "Vaccines on file", className: "is-vaccine-ok", customerClassName: "is-vaccine-ok" };
  }
  if (records.length || legacyDateStatus === "expired") {
    return { label: "Vaccines Expired", customerLabel: "Vaccines on file", className: "is-vaccine-expired", customerClassName: "is-vaccine-ok" };
  }
  const hasLegacyDates = Boolean(record.dhppDate || record.dhppVaccinationDate || record.lastDhppVaccination || record.rabiesDate || record.rabiesVaccinationDate || record.lastRabiesVaccination || record.bordetellaDate || record.bordetellaVaccinationDate || record.lastBordetellaVaccination || record.vaccinationFiles);
  if (hasLegacyDates) return { label: "Vaccines OK", customerLabel: "Vaccines on file", className: "is-vaccine-ok", customerClassName: "is-vaccine-ok" };
  return { label: "No Vaccines on File", customerLabel: "Vaccines needed", className: "is-vaccine-needed", customerClassName: "is-vaccine-needed" };
}

function vaccinationStatusBadgeHtml(record = {}, options = {}) {
  const info = vaccinationStatusInfo(record);
  const label = options.customer ? info.customerLabel : info.label;
  const className = options.customer ? info.customerClassName || info.className : info.className;
  return statusChipHtml(label, `vaccination-status-chip ${className}`);
}

function customerFacingVaccineStatus(dog = {}) {
  const info = vaccinationStatusInfo(dog);
  return {
    label: info.customerLabel || info.label,
    className: info.customerClassName || info.className,
    hasVaccines: (info.customerClassName || info.className) === "is-vaccine-ok",
  };
}

function vaccinationExpiresSoon(record = {}, days = 30) {
  const today = new Date(`${todayDate()}T00:00:00`);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  return arrayValue(record.vaccinationRecords)
    .map(vaccinationExpiryDate)
    .filter(Boolean)
    .some((date) => date >= today && date <= cutoff);
}

function dogAgeText(dog = {}) {
  const birth = dog.dateOfBirth || dog.birthday || "";
  if (!birth) return "";
  const birthDate = new Date(`${birth}T12:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) years -= 1;
  if (years > 0) return `${years} year${years === 1 ? "" : "s"} old`;
  const months = Math.max(0, (today.getFullYear() - birthDate.getFullYear()) * 12 + today.getMonth() - birthDate.getMonth());
  return months ? `${months} month${months === 1 ? "" : "s"} old` : "Under 1 month old";
}

function boardingRecordMatchesCustomerDog(record = {}, dog = {}) {
  const dogId = boardingDogIdFromCustomerDogValue(record.id);
  const customerBoardingIds = [dog.sourceBoardingDogId, dog.linkedBoardingDogId].map(boardingDogIdFromCustomerDogValue).filter(Boolean);
  if (record.linkedCustomerDogId && dog.id && record.linkedCustomerDogId === dog.id) return true;
  if (customerBoardingIds.includes(dogId)) return true;
  const recordName = String(record.dogName || "").trim().toLowerCase();
  const dogName = String(dog.dogName || "").trim().toLowerCase();
  if (!recordName || !dogName || recordName !== dogName) return false;
  const recordEmails = new Set(boardingOwnerEmails(record));
  const dogEmails = uniqueEmails(dog.ownerEmail, dog.customerEmail, currentUser?.email);
  if (dogEmails.some((email) => recordEmails.has(email))) return true;
  const recordPhone = String(record.ownerPhone || record.customerPhone || record.requestedByPhone || "").replace(/\D/g, "");
  const dogPhone = String(dog.ownerPhone || dog.customerPhone || "").replace(/\D/g, "");
  return Boolean(recordPhone && dogPhone && recordPhone === dogPhone);
}

function activeCustomerStayForDog(dog = {}) {
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record) && boardingRecordMatchesCustomerDog(record, dog)));
  const entries = boardingStayEntries(records)
    .filter(({ record, stay }) => ["Checked In", "In Kennel"].includes(boardingStayDisplayStatus(record, stay)))
    .sort((a, b) => boardingStayEntrySortTime(b) - boardingStayEntrySortTime(a));
  return entries[0] || null;
}

function customerDogSummaryCardHtml(dog = {}) {
  const activeStay = activeCustomerStayForDog(dog);
  const stay = activeStay?.stay || {};
  const record = activeStay?.record || {};
  const stayStatus = activeStay ? boardingStayDisplayStatus(record, stay) : "";
  const facts = [dog.breedDescription || dog.breed || "", dog.sex || "", dogAgeText(dog)].filter(Boolean).join(" | ");
  const vaccine = customerFacingVaccineStatus(dog);
  const photoRecord = customerDogPhotoRecordForDisplay(dog, record);
  return `<article class="customer-dog-summary-card">
    <div class="customer-dog-summary-main">
      ${customerDogPhotoHtml(dog, { photoRecord })}
      <div>
        <div class="customer-dog-summary-title">
          <h3>${escapeHtml(dog.dogName || "Your dog")}</h3>
          ${statusChipHtml(vaccine.label, `vaccination-status-chip ${vaccine.className}`)}
        </div>
        <p>${escapeHtml(facts || "Dog profile")}</p>
      </div>
    </div>
    <div class="customer-dashboard-actions">
      <button type="button" data-action="open-customer-boarding-request" data-id="${escapeHtml(dog.id || "")}">Book a Stay</button>
      <button type="button" class="secondary-button" data-action="edit-customer-dog-inline" data-id="${escapeHtml(dog.id || "")}" data-boarding-id="${escapeHtml(dog.sourceBoardingDogId || dog.linkedBoardingDogId || "")}">Edit Profile</button>
    </div>
    <section class="customer-current-stay">
      <strong>Current Stay</strong>
      ${activeStay ? `<div class="detail-row"><strong>Drop-off</strong><span>${escapeHtml(formatDateTime(stay.dropoffTime) || "Not scheduled")}</span></div><div class="detail-row"><strong>Pickup</strong><span>${escapeHtml(formatDateTime(stay.pickupTime) || "Not scheduled")}</span></div><div class="chip-row">${statusChipHtml(stayStatus, `boarding-status-chip ${statusClassForBoardingStatus(stayStatus)}`)}</div>` : `<p class="muted-text">No active stays</p>`}
    </section>
  </article>`;
}

function customerDogDashboardCardHtml(dog = {}) {
  return customerDogSummaryCardHtml(dog);
}

function customerDogWelcomeHtml() {
  return `<article class="customer-home-empty customer-welcome-card">
    <div class="customer-welcome-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M7.2 10.3c1.6-1.7 3.1-2.5 4.8-2.5s3.2.8 4.8 2.5" /><path d="M8.6 8.2 7.4 5.8a1.2 1.2 0 0 0-2.2.1L4.2 9" /><path d="m15.4 8.2 1.2-2.4a1.2 1.2 0 0 1 2.2.1l1 3.1" /><path d="M7.5 13.2c0 4 2.2 6.8 4.5 6.8s4.5-2.8 4.5-6.8" /><path d="M10 14h.01M14 14h.01M11 17h2" /></svg>
    </div>
    <h3>Welcome to Snuggle Stay</h3>
    <p>Add your dog's profile to get started</p>
    <button type="button" data-action="add-customer-dog-inline">Add Your Dog</button>
  </article>`;
}

function renderCustomerRequests() {
  const list = $("#customerRequestList");
  if (!list) return;
  renderCustomerProgress();
  const statusFilter = $("#customerRequestStatusFilter")?.value || "All";
  const entries = customerRequestEntries(statusFilter);
  list.innerHTML = entries.length
    ? entries
        .map((record) => {
          const stay = record.stay || {};
          record = record.record || record;
          const services = boardingStayServicesText(stay, { customerFacing: true });
          const total = boardingStayInvoiceTotal(record, stay);
          const estimate = total ? `<p><strong>Estimated total:</strong> ${money(total)}</p>` : "";
          const status = boardingStayDisplayStatus(record, stay);
          const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
          const canCustomerEdit = customerCanEditStayRequestStatus(status);
          const actions = canCustomerEdit
            ? `<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-customer-request" data-id="${escapeHtml(record.id)}"${stayAttr}>Update</button>${canTransitionBoardingStatus(record, "Cancelled", stay.id ? { stayId: stay.id } : {}) ? `<button type="button" class="secondary-button" data-action="cancel-customer-request" data-id="${escapeHtml(record.id)}"${stayAttr}>Cancel Request</button>` : ""}</div>`
            : "";
          return `<article class="record-card clickable-card ${statusClassForRequest(status)} ${statusClassForBoardingStatus(status)}" data-action="view-customer-request" data-id="${escapeHtml(record.id)}"${stayAttr}><strong>${escapeHtml(record.dogName || "Dog")}</strong><div class="chip-row">${stay.id ? customerStayIdChipHtml(record, stay) : ""}${customerRequestStayStatusChipHtml(record, stay)}</div><span>${formatDateTime(stay.dropoffTime)} to ${formatDateTime(stay.pickupTime)}</span><p>${escapeHtml(services)}</p>${estimate}${actions}</article>`;
        })
        .join("")
    : `<p>No ${statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}boarding requests submitted yet.</p>`;
}

function customerCanEditStayRequestStatus(status = "") {
  return normalizeBoardingStatus({ boardingStatus: status }) === "Pending";
}

function customerRequestEntries(statusFilter = "All") {
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && (record.customerRequest || (record.stays || []).length))
    .filter((record) => currentRole() === "admin" || boardingDogVisibleToCustomer(record)));
  return uniqueBoardingStayEntries(boardingStayEntries(records))
    .filter(({ status }) => statusFilter === "All" || status === statusFilter)
    .sort((a, b) => boardingStayEntrySortTime(b) - boardingStayEntrySortTime(a));
}

function customerRequestFingerprint(record = {}, stayOverride = null) {
  const stay = stayOverride || record.stays?.[0] || {};
  const serviceKey = arrayValue(stay.requests).map((item) => boardingStayRequestLabel(item).trim().toLowerCase()).sort().join("|");
  const dogKey = [record.linkedCustomerDogId || "", normalizeEmail(record.ownerEmail || record.customerEmail), String(record.dogName || "").trim().toLowerCase()].join("|");
  return [dogKey, stay.dropoffTime || "", stay.pickupTime || "", serviceKey].join("::");
}

function uniqueCustomerRequestEntries(entries = []) {
  return uniqueBoardingStayEntries(entries.map(({ record, stay }) => boardingStayEntryForRecord(record, stay)));
}

function uniqueCustomerRequestRecords(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const key = customerRequestFingerprint(record);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function customerRequestTimelineHtml(status = "Pending") {
  const normalized = boardingLifecycleStatuses.includes(status) ? status : "Pending";
  const className = normalized === "Cancelled" ? "is-cancelled" : "is-done";
  return `<div class="request-timeline"><span class="${className}">${escapeHtml(customerRequestStatusLabel(normalized))}</span></div>`;
}

const CUSTOMER_PREMIUM_STAY_UPGRADE_LABEL = "Upgrade Stay";
const CUSTOMER_PREMIUM_STAY_UPGRADE_DESCRIPTION = "Upgrade your dog's stay with a spacious glass-front suite, larger play yards, and extra enrichment featuring obstacle courses and interactive activities.";

function customerServiceIsPremiumStayUpgrade(service = {}) {
  return normalizedServiceLookupText(service.serviceName || service.name || "") === "premium overnight boarding kennel";
}

function customerServiceDisplayName(service = {}) {
  if (customerServiceIsPremiumStayUpgrade(service)) return CUSTOMER_PREMIUM_STAY_UPGRADE_LABEL;
  return service.serviceName || service.name || "Service";
}

function customerServiceInfoText(service = {}) {
  const itemDescription = String(service.itemDescription || "").trim();
  if (itemDescription) return itemDescription;
  if (customerServiceIsPremiumStayUpgrade(service)) return CUSTOMER_PREMIUM_STAY_UPGRADE_DESCRIPTION;
  return "";
}

function customerServiceInfoIconHtml(infoText = "") {
  return infoText ? `<span class="service-info-icon" role="button" tabindex="0" aria-label="${escapeHtml(infoText)}" title="${escapeHtml(infoText)}" data-tooltip="${escapeHtml(infoText)}"><img src="assets/icons/service-info-icon.png?v=20260526-info-icon-replacement" alt="" aria-hidden="true" /></span>` : "";
}

function serviceInfoTooltipText(icon) {
  return String(icon?.dataset?.tooltip || icon?.getAttribute("aria-label") || icon?.getAttribute("title") || "").trim();
}

function serviceInfoTooltipNode(icon) {
  if (!serviceInfoTooltipEl) {
    serviceInfoTooltipEl = document.createElement("div");
    serviceInfoTooltipEl.id = "serviceInfoTooltip";
    serviceInfoTooltipEl.className = "floating-service-tooltip";
    serviceInfoTooltipEl.setAttribute("role", "tooltip");
    serviceInfoTooltipEl.hidden = true;
  }
  const host = icon?.closest?.("dialog[open]") || document.body;
  if (serviceInfoTooltipEl.parentElement !== host) host.appendChild(serviceInfoTooltipEl);
  return serviceInfoTooltipEl;
}

function positionServiceInfoTooltip(icon = activeServiceInfoIcon) {
  if (!icon || !document.body.contains(icon) || !serviceInfoTooltipEl || serviceInfoTooltipEl.hidden) return;
  const margin = 12;
  const gap = 10;
  const iconRect = icon.getBoundingClientRect();
  serviceInfoTooltipEl.style.maxWidth = `${Math.max(180, Math.min(360, window.innerWidth - margin * 2))}px`;
  serviceInfoTooltipEl.style.left = "0";
  serviceInfoTooltipEl.style.top = "0";
  serviceInfoTooltipEl.style.visibility = "hidden";
  const tooltipRect = serviceInfoTooltipEl.getBoundingClientRect();
  let top = iconRect.top - tooltipRect.height - gap;
  let below = false;
  if (top < margin) {
    top = iconRect.bottom + gap;
    below = true;
  }
  if (top + tooltipRect.height > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - margin - tooltipRect.height);
  }
  const maxLeft = Math.max(margin, window.innerWidth - margin - tooltipRect.width);
  const preferredLeft = iconRect.left + iconRect.width / 2 - tooltipRect.width / 2;
  const left = Math.min(Math.max(margin, preferredLeft), maxLeft);
  serviceInfoTooltipEl.classList.toggle("is-below", below);
  serviceInfoTooltipEl.style.left = `${left}px`;
  serviceInfoTooltipEl.style.top = `${top}px`;
  serviceInfoTooltipEl.style.visibility = "visible";
}

function showServiceInfoTooltip(icon) {
  const text = serviceInfoTooltipText(icon);
  if (!icon || !text) return;
  if (icon.hasAttribute("title")) {
    icon.dataset.nativeTitle = icon.getAttribute("title") || "";
    icon.removeAttribute("title");
  }
  const tooltip = serviceInfoTooltipNode(icon);
  activeServiceInfoIcon = icon;
  tooltip.textContent = text;
  tooltip.hidden = false;
  icon.setAttribute("aria-describedby", tooltip.id);
  positionServiceInfoTooltip(icon);
}

function hideServiceInfoTooltip(icon = null) {
  if (icon && activeServiceInfoIcon && icon !== activeServiceInfoIcon) return;
  if (activeServiceInfoIcon) activeServiceInfoIcon.removeAttribute("aria-describedby");
  activeServiceInfoIcon = null;
  if (serviceInfoTooltipEl) serviceInfoTooltipEl.hidden = true;
}

function customerServiceDogKey(dog = {}) {
  return customerBookingSelectionKey(dog) || dog.id || normalizedDogIdentityName(dog) || dog.dogName || "dog";
}

function customerServiceDogFieldKey(dog = {}) {
  return `dog-${shortStableHash(customerServiceDogKey(dog), 10)}`;
}

function customerServiceFieldNameForDog(dog = {}) {
  return `customerServices-${customerServiceDogFieldKey(dog)}`;
}

function customerServiceQuantityFieldName(serviceId = "", dog = {}) {
  return `serviceQuantity-${customerServiceDogFieldKey(dog)}-${serviceId}`;
}

function customerServicesForDog(estimate = {}, dog = {}) {
  const dogKey = customerServiceDogKey(dog);
  return arrayValue(estimate.services).filter((service) => service.dogKey === dogKey || (!service.dogKey && arrayValue(estimate.dogs).length <= 1));
}

function customerServiceOptionHtml(service = {}, checkedIds = new Set(), options = {}) {
  const checked = checkedIds.has(service.id);
  const fieldDog = options.dog || {};
  const serviceFieldName = options.serviceFieldName || (options.dog ? customerServiceFieldNameForDog(fieldDog) : "customerServices");
  const quantityFieldName = options.quantityFieldName || (options.dog ? customerServiceQuantityFieldName(service.id, fieldDog) : `serviceQuantity-${service.id}`);
  const quantityValue = formFieldByName($("#customerBookingForm"), quantityFieldName)?.value || "1";
  const displayName = customerServiceDisplayName(service);
  const infoIcon = customerServiceInfoIconHtml(customerServiceInfoText(service));
  const addOnPrefix = options.addOn ? "Add-on: " : "";
  const extraClass = options.parent ? " service-option-parent" : "";
  const dogAttrs = options.dog ? ` data-service-scope="dog" data-dog-key="${escapeHtml(customerServiceDogKey(fieldDog))}"` : "";
  return `<label class="service-option${options.addOn ? " service-option-addon" : ""}${extraClass}"><span class="service-option-label"><input type="checkbox" name="${escapeHtml(serviceFieldName)}" value="${escapeHtml(service.id)}" ${checked ? "checked" : ""}${dogAttrs} /><span class="service-option-copy"><span class="service-option-text">${escapeHtml(addOnPrefix)}${escapeHtml(displayName)} - ${money(service.basePrice)} ${escapeHtml(service.unit || "")}</span>${infoIcon}</span></span><input class="service-quantity" type="number" name="${escapeHtml(quantityFieldName)}" min="1" step="1" value="${escapeHtml(quantityValue)}" ${checked ? "" : "disabled"} aria-label="${escapeHtml(displayName)} quantity"${dogAttrs} /></label>`;
}

function customerStayProgramServices(user = currentUser) {
  applyLegacyBoardingProgramMigration();
  return readRecords("service")
    .filter((service) => !service.removed && serviceHasFlag(service, "Active") && !serviceHasFlag(service, "Admin only") && serviceIsBoardingProgram(service))
    .filter((service) => serviceMatchesCustomerPricingScope(service, user))
    .sort((a, b) => String(a.serviceName || "").localeCompare(String(b.serviceName || "")));
}

function selectedCustomerStayProgramId() {
  const checked = document.querySelector('#customerStayProgramOptions input[name="customerStayProgram"]:checked');
  return checked?.value && checked.value !== "standard" ? checked.value : "";
}

function selectedCustomerStayProgram() {
  const id = selectedCustomerStayProgramId();
  if (!id) return null;
  return customerStayProgramServices().find((service) => service.id === id) || null;
}

function customerStayProgramSnapshot(service = null) {
  if (!service?.id) return null;
  return {
    id: service.id,
    serviceId: service.id,
    serviceName: service.serviceName || "Boarding program",
    name: service.serviceName || "Boarding program",
    rate: Number(service.basePrice || 0),
    unit: service.unit || "per night",
    isMemberPricing: serviceHasFlag(service, "Member Pricing"),
    includesBoardingAccommodation: true,
    replacesStandardBoarding: true,
  };
}

function renderCustomerStayProgramOptions() {
  const step = $("#customerStayProgramStep");
  const container = $("#customerStayProgramOptions");
  if (!step || !container) return;
  const show = customerRequestMode() === "boarding";
  const programs = show ? customerStayProgramServices() : [];
  step.hidden = !show || !programs.length;
  if (step.hidden) {
    container.innerHTML = "";
    return;
  }
  const existing = selectedCustomerStayProgramId();
  const selectedId = existing && programs.some((program) => program.id === existing) ? existing : "standard";
  const standardService = boardingPricingServiceForCustomer(currentUser);
  const standardLabel = standardService?.serviceName || "Standard Overnight Boarding";
  const options = [
    `<label class="service-option customer-stay-program-card"><span class="service-option-label"><input type="radio" name="customerStayProgram" value="standard" ${selectedId === "standard" ? "checked" : ""} /><span class="service-option-copy"><span class="service-option-text">${escapeHtml(standardLabel)} - ${money(standardService?.basePrice || boardingRatePlanForCustomer().primaryRate)} per night</span></span></span></label>`,
    ...programs.map((program) => {
      const infoIcon = customerServiceInfoIconHtml(customerServiceInfoText(program));
      return `<label class="service-option customer-stay-program-card"><span class="service-option-label"><input type="radio" name="customerStayProgram" value="${escapeHtml(program.id)}" ${selectedId === program.id ? "checked" : ""} /><span class="service-option-copy"><span class="service-option-text">${escapeHtml(customerServiceDisplayName(program))} - ${money(program.basePrice)} ${escapeHtml(program.unit || "per night")}</span>${infoIcon}</span></span></label>`;
    }),
  ];
  container.innerHTML = options.join("");
}

function customerImplicitDependencyIds() {
  const ids = new Set();
  if (customerRequestMode() === "boarding") {
    const stayProgram = selectedCustomerStayProgram();
    const dependencyService = stayProgram || boardingPricingServiceForCustomer(currentUser);
    if (dependencyService?.id) ids.add(dependencyService.id);
  }
  return ids;
}

function customerDependencyIds(checkedIds = new Set()) {
  return new Set([...checkedIds, ...customerImplicitDependencyIds()]);
}

function renderCustomerServiceOptions() {
  if (!$("#customerServiceOptions")) return;
  applyLegacyServiceDependencyMigration();
  applyLegacyBoardingProgramMigration();
  const formEl = $("#customerBookingForm");
  const dogs = selectedCustomerDogs();
  const services = readRecords("service").filter((service) => !service.removed && serviceHasFlag(service, "Active") && !serviceHasFlag(service, "Admin only") && (service.category !== "Boarding" || serviceDependencyId(service)) && serviceMatchesCustomerPricingScope(service, currentUser));
  const visibleServices = services.filter((service) => !serviceDependencyId(service));
  const groupedVisibleServices = visibleServices.reduce((groups, service) => {
    const category = String(service.category || "Other Services").trim() || "Other Services";
    groups[category] = [...(groups[category] || []), service];
    return groups;
  }, {});
  if (!dogs.length) {
    $("#customerServiceOptions").innerHTML = "<p>Select dog(s) first to choose services for each dog.</p>";
    return;
  }
  const dogGroupsHtml = dogs.map((dog, index) => {
    const checkedIds = new Set(checkedFrom(formEl, customerServiceFieldNameForDog(dog)));
    const dependencyIds = customerDependencyIds(checkedIds);
    const selectedCount = [...checkedIds].filter((id) => services.some((service) => service.id === id && serviceDependencySatisfied(service, dependencyIds))).length;
    const serviceBlockHtml = (service) => {
      const childServices = dependencyIds.has(service.id)
        ? services
            .filter((dependent) => serviceDependencyId(dependent) === service.id)
        : [];
      if (!childServices.length) return customerServiceOptionHtml(service, checkedIds, { dog });
      const optionHtml = customerServiceOptionHtml(service, checkedIds, { dog, parent: true });
      const addOnHtml = childServices
        .map((dependent) => customerServiceOptionHtml(dependent, checkedIds, { dog, addOn: serviceDependencyType(dependent) === "optional-addon" }))
        .join("");
      return `<div class="service-option-group">${optionHtml}<div class="service-option-addons">${addOnHtml}</div></div>`;
    };
    const visibleHtml = Object.entries(groupedVisibleServices).map(([category, items]) => {
      const hasChecked = items.some((service) => checkedIds.has(service.id));
      const categoryHtml = items.map(serviceBlockHtml).join("");
      return `<details class="customer-service-group" ${hasChecked ? "open" : ""}><summary><span><strong>${escapeHtml(category)}</strong><em>Click to view services</em></span><small>${items.length} option${items.length === 1 ? "" : "s"}</small></summary><div class="customer-service-group-body">${categoryHtml}</div></details>`;
    }).join("");
    const implicitDependencyServices = services.filter((service) => serviceDependencyId(service) && serviceDependencySatisfied(service, dependencyIds) && !visibleServices.some((parent) => parent.id === serviceDependencyId(service)));
    const implicitHtml = implicitDependencyServices
      .map((service) => customerServiceOptionHtml(service, checkedIds, { dog, addOn: serviceDependencyType(service) === "optional-addon" }))
      .join("");
    const bodyHtml = visibleServices.length || implicitHtml
      ? `${visibleHtml}${implicitHtml}`
      : "<p>No customer services are active yet.</p>";
    const openAttr = selectedCount || dogs.length <= 2 || index === 0 ? "open" : "";
    return `<details class="customer-dog-service-menu" ${openAttr}><summary><span><strong>${escapeHtml(dog.dogName || "Dog")}</strong><em>Click to view services for this dog</em></span><small>${selectedCount} selected</small></summary><div class="customer-dog-service-menu-body">${bodyHtml}</div></details>`;
  }).join("");
  $("#customerServiceOptions").innerHTML = dogGroupsHtml;
}

function selectedCustomerDogs() {
  const dogs = [...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]:checked')]
    .map((input) => customerDogsForCurrentUser().find((dog) => dog.id === input.value))
    .filter((dog) => dog && !dog.removed);
  return uniqueCustomerBookingDogs(dogs);
}

function renderCustomerCrateShareOptions() {
  const step = $("#customerCrateShareStep");
  const container = $("#customerCrateShareOptions");
  if (!step || !container) return;
  const dogs = selectedCustomerDogs();
  const isBoardingRequest = customerRequestMode() === "boarding";
  const stayProgram = selectedCustomerStayProgram();
  const ratePlan = boardingRatePlanForCustomer();
  const show = isBoardingRequest && !stayProgram && ratePlan.isMemberPricing && dogs.length > 1;
  step.hidden = !show;
  if (!show) {
    container.innerHTML = "";
    return;
  }
  const prior = $("#customerSharedCrateRequested");
  const checked = prior ? prior.checked : true;
  const lines = boardingDogPricingLines(dogs, { ratePlan, days: 1, sharedCrateRequested: true })
    .reduce((groups, line) => {
      groups[line.crateGroupId] = [...(groups[line.crateGroupId] || []), line.dogName];
      return groups;
    }, {});
  const groupSummary = Object.values(lines)
    .map((names, index) => `Crate ${index + 1}: ${names.join(" + ")}`)
    .join(" | ");
  container.innerHTML = `<label class="toggle-row"><input type="checkbox" id="customerSharedCrateRequested" name="customerSharedCrateRequested" ${checked ? "checked" : ""} /> Request shared-crate member pricing when staff approve it</label><p>${escapeHtml(groupSummary)}. Max ${BOARDING_MAX_DOGS_PER_CRATE} dogs per crate.</p>`;
}

function customerBookingSelectionKey(dog = {}) {
  const boardingId = boardingDogIdFromCustomerDogValue(dog.sourceBoardingDogId || dog.linkedBoardingDogId || (String(dog.id || "").startsWith("boarding:") ? dog.id : ""));
  if (boardingId) return `boarding:${boardingId}`;
  if (dog.id) return `customer:${dog.id}`;
  return customerDogIdentityKey(dog);
}

function uniqueCustomerBookingDogs(dogs = []) {
  const seen = new Set();
  return dogs.filter((dog) => {
    const key = customerBookingSelectionKey(dog);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function customerBookingDogIdentityTokens(dog = {}) {
  const dogName = normalizedDogIdentityName(dog);
  if (!dogName) return [];
  const tokens = new Set();
  const addScoped = (kind = "", value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) tokens.add(`${dogName}|${kind}:${normalized}`);
  };
  [
    dog.isSharedBoardingDog ? dog.linkedCustomerDogId : dog.id,
    dog.linkedCustomerDogId,
    dog.customerDogId,
  ].forEach((id) => addScoped("customer-dog", id));
  [
    boardingDogIdFromCustomerDogValue(dog.sourceBoardingDogId),
    boardingDogIdFromCustomerDogValue(dog.linkedBoardingDogId),
    String(dog.id || "").startsWith("boarding:") ? boardingDogIdFromCustomerDogValue(dog.id) : "",
  ].forEach((id) => addScoped("boarding-dog", id));
  uniqueEmails(dog.ownerEmail, dog.customerEmail, currentUser?.email).forEach((email) => addScoped("email", email));
  [
    dog.ownerPhone,
    dog.phone,
    dog.customerPhone,
    dog.emergencyPhone,
  ].forEach((phone) => {
    const normalized = normalizedPhoneToken(phone);
    if (normalized) addScoped("phone", normalized);
  });
  if (!tokens.size) addScoped("owner-name", dog.ownerName);
  return [...tokens];
}

function customerBookingDogMatchesRecord(dog = {}, record = {}) {
  const dogTokens = new Set(customerBookingDogIdentityTokens(dog));
  if (!dogTokens.size) return false;
  return boardingDogIdentityTokens(record).some((token) => dogTokens.has(token));
}

function customerBookingServiceKey(estimate = {}, dog = null) {
  const services = dog ? customerServicesForDog(estimate, dog) : arrayValue(estimate.services);
  return [
    String(estimate.stayProgram?.serviceName || estimate.stayProgram?.name || "").trim().toLowerCase(),
    ...new Set(services
    .map((service) => `${dog ? "" : (service.dogName || "Dog") + ": "}${service.serviceName || service.id || "Service"}${Number(service.quantity || 1) > 1 ? ` x${service.quantity}` : ""} requested`)
    .map((label) => String(label || "").trim().toLowerCase())
    .filter(Boolean)),
  ].filter(Boolean)
    .sort()
    .join("|");
}

function existingCustomerBookingEntryForDog(dog = {}, estimate = {}, options = {}) {
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && (record.customerRequest || (record.stays || []).length))
    .filter((record) => currentRole() === "admin" || boardingDogVisibleToCustomer(record)));
  return uniqueBoardingStayEntries(boardingStayEntries(records)).find(({ record, stay, status }) => {
    if (options.editingRecordId && (record.id === options.editingRecordId || (record.sourceRecordIds || []).includes(options.editingRecordId))) return false;
    if (!customerBookingDogMatchesRecord(dog, record)) return false;
    if (["Cancelled", "Checked Out"].includes(status)) return false;
    if (String(stay.dropoffTime || "") !== String(estimate.dropoffTime || "")) return false;
    if (String(stay.pickupTime || "") !== String(estimate.pickupTime || "")) return false;
    return true;
  }) || null;
}

function customerBookingStableId(prefix = "customer-booking", estimate = {}, dog = {}) {
  const seed = [
    customerBookingSelectionKey(dog),
    dog.dogName || "",
    estimate.dropoffTime || "",
    estimate.pickupTime || "",
    customerBookingServiceKey(estimate, dog),
  ].join("|");
  return `${prefix}-${shortStableHash(seed, 10)}`;
}

function validateCustomerDogSelection(options = {}) {
  const selected = selectedCustomerDogs();
  const error = $("#customerDogSelectionError");
  const section = $(".customer-dog-selection-step");
  const valid = selected.length > 0;
  if (error) error.hidden = valid;
  section?.classList.toggle("is-invalid", !valid);
  if (!valid && options.focus !== false) {
    section?.scrollIntoView({ block: "center", behavior: "auto" });
    showToast("Select at least one dog for the boarding request.");
  }
  return valid;
}

function resetCustomerDogForm() {
  $("#customerDogForm").reset();
  $("#customerDogId").value = "";
  $("#saveCustomerDogButton").textContent = "Save Dog";
  $("#customerDogFormTitle").textContent = "Add Dog";
  fillCustomerDefaults();
  resetSelectedDogPhoto("customer", {});
}

function restoreCustomerDogFormHome() {
  const formEl = $("#customerDogForm");
  const home = $("#customerDogFormHome");
  if (formEl) formEl.hidden = true;
  if (formEl && home && formEl.parentElement !== home) home.appendChild(formEl);
  $("#detailDialog")?.classList.remove("is-customer-dog-editor");
}

function closeCustomerDogModal() {
  restoreCustomerDogFormHome();
  if ($("#detailDialog")?.open) $("#detailDialog").close();
}

function openCustomerDogModal(record = {}) {
  openCustomerDog(record);
}

function openCustomerDogInline(record = {}) {
  const formEl = $("#customerDogForm");
  const home = $("#customerDogFormHome");
  if (!formEl || !home) return;
  $("#detailDialog")?.close();
  resetCustomerDogForm();
  setFormValues(formEl, record);
  $("#customerDogId").value = record.id || "";
  $("#saveCustomerDogButton").textContent = record.id ? "Update Changes" : "Save Dog";
  $("#customerDogFormTitle").textContent = record.id ? `Edit ${record.dogName || "Dog"}` : "Add Dog";
  setDogPhoto("customer", record);
  if (formEl.parentElement !== home) home.appendChild(formEl);
  formEl.hidden = false;
  formEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCustomerDog(record = {}) {
  const formEl = $("#customerDogForm");
  resetCustomerDogForm();
  setFormValues(formEl, record);
  $("#customerDogId").value = record.id || "";
  $("#saveCustomerDogButton").textContent = record.id ? "Update Changes" : "Save Dog";
  $("#customerDogFormTitle").textContent = record.id ? `Edit ${record.dogName || "Dog"}` : "Add Dog";
  setDogPhoto("customer", record);
  showDetailDialog(record.id ? `Edit ${record.dogName || "Dog"}` : "Add Dog", `<div id="customerDogPopupMount"></div>`, null, { dialogClass: "is-customer-dog-editor" });
  $("#customerDogPopupMount")?.appendChild(formEl);
  formEl.hidden = false;
  formEl.scrollTop = 0;
}

function openCustomerDogRemoveConfirm(record = {}) {
  showDetailDialog(
    "Remove Dog?",
    `<article class="record-card compact-record-card danger-confirm-card"><strong>Remove ${escapeHtml(record.dogName || "this dog")}?</strong><p>This removes the dog from your customer profile. Existing submitted requests stay on file.</p></article><div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-customer-dog" data-id="${escapeHtml(record.id || "")}">Remove Dog</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>`,
  );
}

async function removeCustomerDogById(id = "") {
  const record = readRecords("customerDog").find((item) => item.id === id);
  if (!record) return null;
  const updated = upsertRecord("customerDog", { ...record, removed: true, removedAt: new Date().toISOString() });
  await sendPayload(updated);
  if ($("#customerDogId")?.value === record.id) {
    resetCustomerDogForm();
    closeCustomerDogModal();
  }
  renderCustomerDogs();
  renderCustomerFiles();
  renderBoardingDogs();
  return updated;
}

function resetCustomerBookingForm() {
  const formEl = $("#customerBookingForm");
  formEl.reset();
  clearCustomerBookingTimeErrors(formEl);
  $("#editingCustomerRequestId").value = "";
  $("#editingCustomerStayId").value = "";
  $("#customerRequestMode").value = "boarding";
  $("#customerBookingFormTitle").textContent = "Request Boarding";
  $("#customerBookingFormHelp").textContent = "Choose dog(s), requested time, and optional services.";
  setCustomerBookingTimeCopy("boarding");
  $("#requestBoardingButton").textContent = "Send Request";
  pendingCustomerBooking = null;
  customerBookingSubmitInProgress = false;
  clearCustomerSignaturePad();
  if ($("#customerAgreementElectronicConsent")) $("#customerAgreementElectronicConsent").checked = false;
  if ($("#customerAgreementAccepted")) $("#customerAgreementAccepted").checked = false;
  if ($("#customerAgreementArbitrationAccepted")) $("#customerAgreementArbitrationAccepted").checked = false;
  if (typeof syncCustomerAgreementTreatmentAmount === "function") syncCustomerAgreementTreatmentAmount();
  if (typeof syncCustomerAgreementSignatureName === "function") syncCustomerAgreementSignatureName();
  if ($("#confirmBookingRequestButton")) $("#confirmBookingRequestButton").disabled = false;
  $("#bookingConfirmDialog")?.close();
  formEl.hidden = true;
  formEl.scrollTop = 0;
  renderCustomerDogs();
  renderCustomerStayProgramOptions();
  renderCustomerBookingAvailabilityMessages();
  updateCustomerEstimate();
}

function openCustomerBookingModal(mode = "boarding") {
  if (!customerDogsForCurrentUser().length) {
    switchPage("customerPage");
    openCustomerDogModal();
    return;
  }
  $("#detailDialog")?.close();
  $("#bookingConfirmDialog")?.close();
  $("#customerBookingForm").hidden = true;
  resetCustomerBookingForm();
  $("#customerRequestMode").value = mode;
  $("#customerBookingForm").hidden = false;
  $("#customerBookingForm").scrollTop = 0;
  $("#customerBookingFormTitle").textContent = mode === "service" ? "Request Service" : "Request Boarding";
  $("#customerBookingFormHelp").textContent = mode === "service" ? "Choose dog(s), service, and requested drop-off time." : "Choose dog(s), requested stay, and optional services.";
  setCustomerBookingTimeCopy(mode);
  clearCustomerBookingTimeErrors();
  $("#requestBoardingButton").textContent = "Send Request";
  renderCustomerBookingAvailabilityMessages();
  renderCustomerStayProgramOptions();
  renderCustomerCrateShareOptions();
  renderCustomerServiceOptions();
}

function editCustomerRequest(record, stayId = "") {
  if (!record) return;
  const displayRecord = boardingDogWithStayStatus(record);
  switchPage("customerRequestsPage");
  resetCustomerBookingForm();
  $("#customerBookingForm").hidden = false;
  const stay = boardingStayByReference(displayRecord, stayId) || displayRecord.stays?.[0] || {};
  const status = boardingStayDisplayStatus(displayRecord, stay);
  if (!customerCanEditStayRequestStatus(status)) {
    $("#customerBookingForm").hidden = true;
    showToast("This stay is already active. Ask staff to change an active kennel stay.");
    return;
  }
  $("#editingCustomerRequestId").value = displayRecord.id;
  $("#editingCustomerStayId").value = stay.id || "";
  const bookingForm = $("#customerBookingForm");
  formFieldByName(bookingForm, "dropoffTime").value = stay.dropoffTime?.slice(0, 16) || "";
  formFieldByName(bookingForm, "pickupTime").value = stay.pickupTime?.slice(0, 16) || "";
  formFieldByName(bookingForm, "requestNotes").value = stay.stayNotes || "";
  clearCustomerBookingTimeErrors(bookingForm);
  const dog = customerDogsForCurrentUser().find((item) => {
    if (item.sourceBoardingDogId && item.sourceBoardingDogId === displayRecord.id) return true;
    return item.dogName === displayRecord.dogName && normalizeEmail(item.ownerEmail || item.customerEmail) === normalizeEmail(displayRecord.ownerEmail || displayRecord.customerEmail);
  });
  if (dog) {
    const checkbox = [...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]')].find((input) => input.value === dog.id);
    if (checkbox) checkbox.checked = true;
  }
  renderCustomerStayProgramOptions();
  const stayProgramId = stay.stayProgramId || stay.pricingSnapshot?.stayProgramId || "";
  $("#customerBookingForm").querySelectorAll('input[name="customerStayProgram"]').forEach((input) => {
    input.checked = stayProgramId ? input.value === stayProgramId : input.value === "standard";
  });
  renderCustomerCrateShareOptions();
  const sharedCrateInput = $("#customerSharedCrateRequested");
  if (sharedCrateInput && stay.pricingSnapshot) sharedCrateInput.checked = Boolean(stay.pricingSnapshot.sharedCrateRequested);
  const serviceQuantities = new Map(arrayValue(stay.requests).map((item) => {
    if (typeof item === "object") return [item.id || item.serviceId || item.serviceName, Number(item.quantity || 1)];
    const cleaned = String(item || "").replace(/\s+requested$/i, "").trim();
    const match = cleaned.match(/^(.*?)\s+x(\d+)$/);
    return [match ? match[1].trim() : cleaned, match ? Number(match[2]) : 1];
  }));
  const applyServiceQuantities = () => {
    selectedCustomerDogs().forEach((selectedDog) => {
      $("#customerBookingForm").querySelectorAll(`input[name="${customerServiceFieldNameForDog(selectedDog)}"]`).forEach((input) => {
        const service = readRecords("service").find((item) => item.id === input.value);
        const quantity = serviceQuantities.get(service?.id) || serviceQuantities.get(service?.serviceName);
        input.checked = Boolean(quantity);
        const quantityInput = formFieldByName($("#customerBookingForm"), customerServiceQuantityFieldName(input.value, selectedDog));
        if (quantityInput) {
          quantityInput.value = String(quantity || 1);
          quantityInput.disabled = !input.checked;
        }
      });
    });
  };
  applyServiceQuantities();
  renderCustomerServiceOptions();
  applyServiceQuantities();
  $("#requestBoardingButton").textContent = "Update Request";
  $("#customerBookingFormTitle").textContent = "Update Request";
  $("#customerBookingFormHelp").textContent = "Update boarding time, requested services, or notes.";
  renderCustomerBookingAvailabilityMessages();
  updateCustomerEstimate();
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
  if (estimate.isServiceRequest) return "Service request";
  const days = Number(estimate.days || 0);
  return `${days} boarding day/night${days === 1 ? "" : "s"}`;
}

function customerEstimateDetails() {
  const formEl = $("#customerBookingForm");
  const data = formPayload(formEl);
  const isServiceRequest = customerRequestMode() === "service";
  const dogs = selectedCustomerDogs();
  const serviceCatalog = readRecords("service");
  const services = dogs.flatMap((dog) => {
    const selectedServiceIds = new Set(checkedFrom(formEl, customerServiceFieldNameForDog(dog)));
    const dependencyIds = customerDependencyIds(selectedServiceIds);
    return [...selectedServiceIds]
      .map((id) => {
        const service = serviceCatalog.find((item) => item.id === id);
        if (!service) return null;
        const quantity = Math.max(1, Number(formFieldByName(formEl, customerServiceQuantityFieldName(id, dog))?.value || 1));
        const unitPrice = Number(service.basePrice || 0);
        return {
          ...service,
          dogKey: customerServiceDogKey(dog),
          dogFieldKey: customerServiceDogFieldKey(dog),
          dogId: dog.id || "",
          dogName: dog.dogName || "Dog",
          quantity,
          perDogLineTotal: unitPrice * quantity,
          lineTotal: unitPrice * quantity,
        };
      })
      .filter((service) => service && serviceDependencySatisfied(service, dependencyIds))
      .filter(Boolean);
  });
  const days = isServiceRequest ? 0 : boardingDays(data.dropoffTime, data.pickupTime);
  const isDayCare = !isServiceRequest && isDayCareStay(data.dropoffTime, data.pickupTime);
  const ratePlan = boardingRatePlanForCustomer();
  const stayProgram = isServiceRequest ? null : customerStayProgramSnapshot(selectedCustomerStayProgram());
  const sharedCrateRequested = stayProgram ? false : customerSharedCrateRequested();
  const boardingLines = boardingDogPricingLines(dogs, { ratePlan, days, isServiceRequest, sharedCrateRequested, stayProgram });
  const boardingRate = stayProgram?.rate || ratePlan.primaryRate;
  const boardingCost = boardingLines.reduce((total, line) => total + Number(line.total || 0), 0);
  const serviceCost = services.reduce((total, service) => total + service.lineTotal, 0);
  return { dogs, services, days, isDayCare, isServiceRequest, stayProgram, boardingRate, ratePlan, sharedCrateRequested: sharedCrateRequested && ratePlan.isMemberPricing, boardingLines, boardingCost, serviceCost, total: boardingCost + serviceCost, dropoffTime: data.dropoffTime, pickupTime: isServiceRequest ? data.pickupTime || data.dropoffTime : data.pickupTime, requestNotes: data.requestNotes };
}

function boardingPricingServiceForCustomer(user = currentUser) {
  const activeBoarding = activeBoardingPricingServices();
  if (isMemberUser(user)) return activeBoarding.find((service) => serviceHasFlag(service, "Member Pricing")) || activeBoarding[0];
  return activeBoarding.find((service) => !serviceHasFlag(service, "Member Pricing")) || activeBoarding[0];
}

function updateCustomerEstimate() {
  if (!$("#customerEstimate")) return;
  const estimate = customerEstimateDetails();
  renderCustomerBookingAvailabilityMessages();
  const boardingLine = estimate.isServiceRequest ? "" : estimate.boardingLines.map((line) => `<div class="estimate-line"><span>${escapeHtml(line.dogName)} - ${escapeHtml(boardingLineDisplayLabel(line))}:</span><span>${Number(line.days || 0)} x ${money(line.rate)} = ${money(line.total)}</span></div>`).join("");
  $("#customerEstimate").innerHTML = estimate.dogs.length
    ? `<strong>${escapeHtml(boardingBillingLabel(estimate))}</strong>${boardingLine}${estimate.services.map((service) => `<div class="estimate-line"><span>${escapeHtml(service.dogName || "Dog")} - ${escapeHtml(customerServiceDisplayName(service))}</span><span>${Number(service.quantity || 1)} x ${money(service.basePrice)} = ${money(service.lineTotal)}</span></div>`).join("")}<div class="estimate-total"><strong>Estimated total</strong><span>${money(estimate.total)}</span></div>`
    : "Select dog(s), dates, and services to see an estimate.";
  renderCustomerAgreementPanel(estimate);
}

function showBookingConfirmDialog(estimate) {
  if (!customerBookingEstimateAvailabilityValid(estimate)) {
    showToast("Choose a customer request time inside the kennel hours.");
    renderCustomerBookingAvailabilityMessages();
    return;
  }
  if (!validateCustomerAgreementForBooking(estimate)) return;
  pendingCustomerBooking = { ...estimate, dogs: uniqueCustomerBookingDogs(estimate.dogs), submissionId: uid("customerBooking") };
  customerBookingSubmitInProgress = false;
  if ($("#confirmBookingRequestButton")) $("#confirmBookingRequestButton").disabled = false;
  const dogList = pendingCustomerBooking.dogs.map((dog) => {
    const line = pendingCustomerBooking.boardingLines.find((item) => item.dogKey === boardingPricingDogKey(dog)) || {};
    const rateText = pendingCustomerBooking.isServiceRequest ? "" : ` - ${escapeHtml(boardingLineDisplayLabel(line))} at ${money(line.rate || 0)}`;
    return `<li>${escapeHtml(dog.dogName)}${dog.breedDescription ? ` (${escapeHtml(dog.breedDescription)})` : ""}${rateText}</li>`;
  }).join("");
  const serviceList = pendingCustomerBooking.services.length
    ? pendingCustomerBooking.services.map((service) => `<li>${escapeHtml(service.dogName || "Dog")} - ${escapeHtml(customerServiceDisplayName(service))} x${Number(service.quantity || 1)} - ${money(service.lineTotal)} ${escapeHtml(service.unit || "")}</li>`).join("")
    : "<li>No added services selected</li>";
  const availabilityHtml = customerBookingAvailabilityMessagesHtml(customerBookingEstimateAvailabilityChecks(pendingCustomerBooking));
  $("#bookingConfirmBody").innerHTML = `
    <div class="booking-summary">
      <div><strong>Dog(s)</strong><ul>${dogList}</ul></div>
      <div><strong>${pendingCustomerBooking.isServiceRequest ? "Requested time" : "Stay"}</strong><p>${formatDateTime(pendingCustomerBooking.dropoffTime)}${pendingCustomerBooking.isServiceRequest ? "" : ` to ${formatDateTime(pendingCustomerBooking.pickupTime)}`}</p>${pendingCustomerBooking.isServiceRequest ? "" : `<p>${boardingBillingLabel(pendingCustomerBooking)}${pendingCustomerBooking.sharedCrateRequested ? " with shared-crate member pricing requested" : ""}</p><p>Boarding subtotal: ${money(pendingCustomerBooking.boardingCost)}</p>`}</div>
      ${availabilityHtml ? `<div class="operation-confirm-notices">${availabilityHtml}</div>` : ""}
      <div><strong>Services</strong><ul>${serviceList}</ul></div>
      ${customerAgreementAppliesToEstimate(pendingCustomerBooking) ? `<div><strong>Agreement</strong><p>${customerCurrentBoardingAgreement() ? "Current signed agreement on file." : "Signed agreement will be saved with this request."}</p></div>` : ""}
      <div class="estimate-total"><strong>Estimated total</strong><span>${money(pendingCustomerBooking.total)}</span></div>
      ${pendingCustomerBooking.requestNotes ? `<div><strong>Notes</strong><p>${escapeHtml(pendingCustomerBooking.requestNotes)}</p></div>` : ""}
    </div>
  `;
  $("#bookingConfirmDialog").showModal();
}

async function submitPendingCustomerBooking() {
  const estimate = pendingCustomerBooking;
  if (customerBookingSubmitInProgress) return;
  if (!estimate?.dogs?.length) return;
  if (!customerBookingEstimateAvailabilityValid(estimate)) {
    showToast("This request time is no longer inside the kennel hours. Please adjust it and try again.");
    customerBookingSubmitInProgress = false;
    $("#bookingConfirmDialog")?.close();
    return;
  }
  customerBookingSubmitInProgress = true;
  const confirmButton = $("#confirmBookingRequestButton");
  if (confirmButton) confirmButton.disabled = true;
  const editingId = $("#editingCustomerRequestId")?.value;
  const editingStayId = $("#editingCustomerStayId")?.value || "";
  const editingRecord = editingId ? boardingDogRecordForDisplay(editingId) : null;
  let savedCount = 0;
  let skippedCount = 0;
  const submittedDogKeys = new Set();
  let boardingAgreement = null;
  try {
    boardingAgreement = await ensureCustomerBoardingAgreementForEstimate(estimate);
    if (customerAgreementAppliesToEstimate(estimate) && !boardingAgreement) {
      customerBookingSubmitInProgress = false;
      if (confirmButton) confirmButton.disabled = false;
      $("#bookingConfirmDialog")?.close();
      return;
    }
    for (const dog of estimate.dogs) {
      const dogServices = customerServicesForDog(estimate, dog);
      const submittedDogKey = [customerBookingSelectionKey(dog), estimate.dropoffTime || "", estimate.pickupTime || "", customerBookingServiceKey(estimate, dog)].join("|");
      if (submittedDogKeys.has(submittedDogKey)) {
        skippedCount += 1;
        continue;
      }
      submittedDogKeys.add(submittedDogKey);
      const duplicateEntry = editingRecord ? null : existingCustomerBookingEntryForDog(dog, estimate, { editingRecordId: editingId, editingStayId });
      if (duplicateEntry) {
        skippedCount += 1;
        continue;
      }
      const sharedBoardingRecord = dog.sourceBoardingDogId ? readRecords("boardingDog").find((record) => record.id === dog.sourceBoardingDogId && !record.removed) : null;
      const existingTarget = (editingRecord && (editingRecord.dogName === dog.dogName || estimate.dogs.length === 1)) ? editingRecord : null;
      const useExisting = Boolean(existingTarget);
      const existingStay = editingStayId ? boardingStayByReference(existingTarget || {}, editingStayId) || {} : existingTarget?.stays?.[0] || {};
      const stayRequests = dogServices.map((service) => ({
        id: service.id,
        serviceId: service.id,
        serviceName: service.serviceName,
        label: `${service.serviceName}${Number(service.quantity || 1) > 1 ? ` x${service.quantity}` : ""} requested`,
        quantity: Number(service.quantity || 1),
        unitPrice: Number(service.basePrice || service.unitPrice || 0),
        unit: service.unit || "",
        source: "customer-request",
      }));
      const dogLine = estimate.boardingLines.find((line) => line.dogKey === boardingPricingDogKey(dog)) || {};
      const invoiceAdjustments = normalizeInvoiceAdjustments(existingStay.invoiceAdjustments || []);
      const stayType = estimate.isServiceRequest ? "Service Request" : estimate.isDayCare ? "Day Care" : "Boarding";
      const pricingSnapshot = boardingPricingSnapshotForStay(existingTarget || dog, {
        ...existingStay,
        dropoffTime: estimate.dropoffTime,
        pickupTime: estimate.pickupTime,
        stayType,
        requests: stayRequests,
        invoiceAdjustments,
      }, {
        ratePlan: estimate.ratePlan,
        currentDogKey: dogLine.dogKey || boardingPricingDogKey(dog),
        currentDogName: dogLine.dogName || dog.dogName || "Dog",
        currentDogRole: dogLine.role || (estimate.ratePlan?.isMemberPricing ? "primary" : "non-member"),
        sharedCrateRequested: estimate.sharedCrateRequested,
        crateGroupId: dogLine.crateGroupId || "",
        stayProgram: estimate.stayProgram,
        groupBoardingSubtotal: estimate.boardingCost,
        groupServiceSubtotal: estimate.serviceCost,
        groupTotal: estimate.total,
      });
      const stay = {
        id: editingRecord ? existingStay.id || editingStayId || uid("stay") : customerBookingStableId("stay", estimate, dog),
        status: editingRecord ? existingStay.status || normalizeBoardingStatus(editingRecord) : "pending_customer_request",
        createdAt: editingRecord ? existingStay.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "customer-request",
        dropoffTime: estimate.dropoffTime,
        pickupTime: estimate.pickupTime,
        stayType,
        stayProgramId: estimate.stayProgram?.id || "",
        stayProgramName: estimate.stayProgram?.serviceName || estimate.stayProgram?.name || "",
        stayProgramRate: estimate.stayProgram?.rate || "",
        stayProgram: estimate.stayProgram || null,
        billingDays: pricingSnapshot.billingDays,
        requests: stayRequests,
        stayNotes: estimate.requestNotes,
        invoiceAdjustments,
        invoiceEvents: existingStay.invoiceEvents || [],
        pricingSnapshot,
        boardingAgreement,
        boardingAgreementId: boardingAgreement?.id || "",
        boardingAgreementVersion: boardingAgreement?.agreementVersion || "",
        boardingAgreementSignedAt: boardingAgreement?.signedAt || "",
        boardingAgreementSignatureHash: boardingAgreement?.signatureHash || "",
        boardingAgreementDocumentHash: boardingAgreement?.documentHash || "",
        estimatedTotal: pricingSnapshot.total,
      };
      stay.bathPlan = bathPlanForStay(stay);
      stay.requestCode = boardingStayRequestCode(existingTarget || sharedBoardingRecord || dog, stay);
      stay.serviceTasks = boardingStayServiceTasks(existingTarget || sharedBoardingRecord || dog, stay);
      const existingStays = useExisting ? (existingTarget.stays || []).filter((item) => !boardingStaySharesExplicitIdentity(item, stay)) : [];
      existingStays.unshift(stay);
      const ownerEmail = normalizeEmail(existingTarget?.ownerEmail || dog.ownerEmail || currentUser?.email);
      const secondaryOwnerEmail = normalizeEmail(existingTarget?.secondaryOwnerEmail || dog.secondaryOwnerEmail);
      const existingStatus = useExisting ? normalizeBoardingStatus(existingTarget) : "Pending";
      const activeExistingStatus = ["Checked In", "In Kennel", "Ready For Pickup"].includes(existingStatus);
      const requestStatus = editingRecord ? existingStatus : activeExistingStatus ? existingStatus : "pending_customer_request";
      const statusHistory = useExisting
        ? [
            ...(existingTarget.statusHistory || []),
            ...(requestStatus !== existingStatus ? [{ from: existingStatus, to: requestStatus, date: new Date().toISOString(), by: currentUser?.name || dog.ownerName || "", source: "customer-request" }] : []),
          ]
        : [{ from: "", to: "pending_customer_request", date: new Date().toISOString(), by: currentUser?.name || dog.ownerName || "", source: "customer-request" }];
      const payload = {
        ...(useExisting ? existingTarget : {}),
        type: "boardingDog",
        id: useExisting ? existingTarget.id : customerBookingStableId("boardingDog", estimate, dog),
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
        linkedCustomerDogId: dog.isSharedBoardingDog ? linkedCustomerDogForBoarding(sharedBoardingRecord || {})?.id || dog.linkedCustomerDogId || "" : dog.id,
        linkedOwnerEmail: ownerEmail,
        emergencyName: dog.emergencyName,
        emergencyPhone: dog.emergencyPhone,
        specialCare: dog.specialCare,
        foodInstructions: dog.foodInstructions || existingTarget?.foodInstructions || "",
        spayNeuterStatus: dog.spayNeuterStatus,
        dhppDate: dog.dhppDate,
        rabiesDate: dog.rabiesDate,
        rabiesDuration: dog.rabiesDuration,
        dhppDuration: dog.dhppDuration,
        rabiesGoodThreeYears: dog.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(dog, "rabies") ? "Yes" : ""),
        dhppGoodThreeYears: dog.dhppGoodThreeYears || (vaccineDurationIsThreeYears(dog, "dhpp") ? "Yes" : ""),
        sourceBoardingDogId: dog.sourceBoardingDogId || "",
        profilePhotoUrl: dog.profilePhotoUrl || "",
        vaccinationRecords: dog.vaccinationRecords || [],
        vaccinationFiles: dog.vaccinationFiles || "",
        boardingAgreement,
        boardingAgreementId: boardingAgreement?.id || "",
        boardingAgreementVersion: boardingAgreement?.agreementVersion || "",
        boardingAgreementSignedAt: boardingAgreement?.signedAt || "",
        boardingAgreementSignatureHash: boardingAgreement?.signatureHash || "",
        boardingAgreementDocumentHash: boardingAgreement?.documentHash || "",
        estimatedTotal: pricingSnapshot.total,
        stayType,
        billingDays: pricingSnapshot.billingDays,
        requestedServices: dogServices.map((service) => ({ id: service.id, serviceName: service.serviceName, quantity: Number(service.quantity || 1), unitPrice: Number(service.basePrice || 0), dogName: dog.dogName || "Dog" })),
        flags: ["Required update from owner"],
        stays: existingStays,
        cancelledAt: normalizeBoardingStatus({ boardingStatus: requestStatus, customerRequest: true }) === "Pending" ? "" : existingTarget?.cancelledAt || "",
        checkedOutAt: normalizeBoardingStatus({ boardingStatus: requestStatus, customerRequest: true }) === "Pending" ? "" : existingTarget?.checkedOutAt || "",
      };
      const record = await saveAndNotify(payload, editingId ? "customerBoardingRequestUpdated" : "customerBoardingRequestCreated");
      savedCount += 1;
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
    resetCustomerBookingForm();
    const inlineStatus = $("#customerBookingInlineStatus");
    if (inlineStatus) {
      inlineStatus.textContent = editingId ? "Your request has been updated." : "Your request has been sent - we'll confirm within 24 hours.";
      inlineStatus.hidden = false;
      window.setTimeout(() => {
        inlineStatus.hidden = true;
      }, 8000);
    }
    if (!savedCount && skippedCount) {
      showDetailDialog("Request Already Exists", `<p>A matching request already exists for the selected dog${skippedCount === 1 ? "" : "s"} at that time.</p>`);
    } else {
      showToast(editingId ? "Request updated." : "Request sent.");
    }
  } catch (error) {
    pendingCustomerBooking = estimate;
    showToast(`Request could not be saved: ${error.message || error}`);
  } finally {
    customerBookingSubmitInProgress = false;
    if ($("#bookingConfirmDialog")?.open && confirmButton) confirmButton.disabled = false;
  }
}

const servicePricingFilters = [
  { key: "all", label: "All Prices" },
  { key: "member", label: "Member Pricing" },
  { key: "regular", label: "Regular Price (Non-Member)" },
];

function servicePricingFilterLabel(key = servicePricingFilter) {
  return servicePricingFilters.find((filter) => filter.key === key)?.label || "All Prices";
}

function serviceMatchesPricingFilter(record = {}, key = servicePricingFilter) {
  if (key === "member") return serviceHasFlag(record, "Member Pricing");
  if (key === "regular") return !serviceHasFlag(record, "Member Pricing");
  return true;
}

function setServicePricingFilter(key = "all") {
  const next = servicePricingFilters.some((filter) => filter.key === key) ? key : "all";
  servicePricingFilter = next;
  renderServices();
  $("#serviceTableBody")?.closest(".service-table-wrap")?.scrollTo({ top: 0, left: 0 });
}

function serviceEmptyStateText() {
  const label = servicePricingFilterLabel(servicePricingFilter);
  if (servicePricingFilter === "all") return "No services match this search.";
  return `No ${label.toLowerCase()} services match this view.`;
}

function renderServicePricingTabs(records = []) {
  const container = $("#servicePricingTabs");
  if (!container) return;
  container.innerHTML = servicePricingFilters.map((filter) => {
    const active = servicePricingFilter === filter.key;
    const count = records.filter((record) => serviceMatchesPricingFilter(record, filter.key)).length;
    return `<button type="button" class="secondary-button ${active ? "is-active" : ""}" data-service-pricing-filter="${escapeHtml(filter.key)}" role="tab" aria-selected="${active ? "true" : "false"}">${escapeHtml(filter.label)} <span>${count}</span></button>`;
  }).join("");
  container.querySelectorAll("[data-service-pricing-filter]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setServicePricingFilter(button.dataset.servicePricingFilter || "all");
    });
  });
}

function renderServices() {
  applyLegacyServiceDependencyMigration({ syncRemote: true });
  applyLegacyBoardingProgramMigration({ syncRemote: true });
  const query = $("#serviceSearch")?.value || "";
  const columns = tableColumns.service;
  const allRecords = sortRecordsForTable("service", readRecords("service").filter((record) => !record.removed && matches(record, query)));
  const records = allRecords.filter((record) => serviceMatchesPricingFilter(record));
  renderServicePricingTabs(allRecords);
  $("#serviceTableHead").innerHTML = `<tr>${columns.map((column) => `<th data-sort-column="${column.key}" data-table="service">${escapeHtml(column.label)}</th>`).join("")}<th>Actions</th></tr>`;
  $("#serviceTableBody").innerHTML = records.length
    ? records
        .map((record) => `<tr data-id="${record.id}"><td>${escapeHtml(record.serviceName || "")}</td><td>${escapeHtml(record.category || "")}</td><td>${money(record.basePrice)}</td><td>${escapeHtml(record.unit || "")}</td><td>${record.depositAmount ? money(record.depositAmount) : ""}</td><td>${record.taxRate ? `${escapeHtml(record.taxRate)}%` : ""}</td><td>${serviceChipsHtml(record)}</td><td><button type="button" class="secondary-button" data-action="edit-service" data-id="${escapeHtml(record.id)}">Edit</button></td></tr>`)
        .join("")
    : `<tr><td colspan="8">${escapeHtml(serviceEmptyStateText())}</td></tr>`;
}

function openService(record = {}) {
  const formRecord = {
    ...record,
    boardingRateType: record.boardingRateType || (record.category === "Boarding" && serviceIsStandardBoardingRate(record) ? "standard-boarding" : ""),
  };
  const panel = $("#serviceEditorPanel");
  if (panel && panel.parentElement !== document.body) document.body.appendChild(panel);
  if (panel) panel.hidden = false;
  const form = $("#serviceForm");
  form.reset();
  form.dataset.mode = formRecord.id ? "edit" : "create";
  renderServiceDependencyFields(formRecord);
  if (form.elements.id) {
    form.elements.id.value = formRecord.id || "";
    form.elements.id.defaultValue = formRecord.id || "";
  }
  setFormValues(form, formRecord);
  syncServiceDependencyFields();
  if (!formRecord.id && form.elements.id) form.elements.id.value = "";
  const flags = normalizedServiceFlags(formRecord.flags || ["Active"]);
  $$('input[name="serviceFlags"]').forEach((input) => {
    input.checked = flags.includes(input.value);
  });
  $("#serviceEditorTitle").textContent = formRecord.id ? "Edit Service" : "Add Service";
  $("#serviceSaveButton").textContent = formRecord.id ? "Update Service" : "Add Service";
  $("#removeServiceButton").hidden = !formRecord.id;
}

function closeServiceModal() {
  const form = $("#serviceForm");
  if (form) form.dataset.mode = "create";
  $("#serviceEditorPanel").hidden = true;
}

function serviceRemoveConfirmHtml(record = {}) {
  return `<div class="tracker-form">
    <article class="record-card compact-record-card danger-confirm-card">
      <strong>Remove this service?</strong>
      <p>${escapeHtml(record.serviceName || "Service")} | ${escapeHtml(record.category || "")} ${record.basePrice ? `| ${money(record.basePrice)}` : ""}</p>
      <p>This hides it from staff/admin catalogs and customer request options.</p>
    </article>
    <div class="button-row">
      <button type="button" class="danger-button" data-action="confirm-remove-service" data-id="${escapeHtml(record.id || "")}">Remove Service</button>
      <button type="button" class="secondary-button" data-action="close-dialog">Cancel</button>
    </div>
  </div>`;
}

function openServiceRemoveConfirm(record = {}) {
  if (!record?.id) return;
  showDetailDialog("Confirm Remove Service", serviceRemoveConfirmHtml(record));
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
  renderDailyTaskLists();
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
  renderOperationHoursSettings();
  renderSettingsAlerts();
  renderAuditLog();
  renderNotifications();
  renderCustomerDogs();
  renderCustomerRequests();
  renderCustomerUpdates();
  renderCustomerFiles();
  renderDemoSubmissions();
  updateTimeDisplays();
  renderGlobalSearchResults();
}

// === MODULE: SEARCH ===
function globalSearchEntries() {
  const entries = [];
  readRecords("ownedDog").filter((record) => !record.removed).forEach((record) => {
    const detail = [ownedDogCareSummary(record), record.ownerName, record.ownerEmail, (record.ownerPhone || "").replace(/\D/g, "")].filter(Boolean).join(" | ");
    entries.push({ label: ownedDogDisplayName(record), detail, type: "ownedDog", id: record.id, pageId: "ourDogsPage" });
  });
  readRecords("boardingDog").filter((record) => !record.removed).forEach((record) => {
    const phoneDigits = (record.ownerPhone || "").replace(/\D/g, "");
    const phoneLast4 = phoneDigits.slice(-4);
    const emergencyDigits = (record.emergencyPhone || "").replace(/\D/g, "");
    const detail = [
      record.ownerName,
      record.ownerEmail,
      phoneDigits,
      phoneLast4,
      emergencyDigits,
      record.emergencyName,
      boardingKennelLocationLabel(record),
      boardingDisplayStatus(record),
      boardingScheduleText(record),
    ].filter(Boolean).join(" | ");
    entries.push({ label: record.dogName || "Boarding dog", detail, type: "boardingDog", id: record.id, pageId: "boardingDogsPage" });
  });
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
  panel.hidden = !helperIsLoggedIn() || currentRole() === "customer";
  if (panel.hidden) return;
  const query = input.value.trim().toLowerCase();
  if (!query) {
    list.innerHTML = `<p>Search by dog name, owner name, phone number, kennel location, status, or record type.</p>`;
    return;
  }
  const results = globalSearchEntries()
    .filter((entry) => pageAllowed(entry.pageId) && `${entry.label} ${entry.detail} ${entry.type}`.toLowerCase().includes(query))
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

// === MODULE: NOTIFICATIONS ===
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
  return (notification.readBy || []).includes(currentUserNotificationKey());
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
  return ![
    "notification",
    "snuggle stay alert",
    "open this alert to review the related kennel record.",
    "open this alert to review the related kennel record",
  ].includes(normalized);
}

function notificationStayIdText(source = {}) {
  const stay = boardingPrimaryStay(source) || {};
  return source.latestCustomerUpdate?.requestCode
    || source.requestCode
    || stay.requestCode
    || (stay.id ? boardingStayRequestCode(source, stay) : "");
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
  const pieces = [dogName, owner, location, category, staff, status, stayId ? `Stay ID: ${stayId}` : ""]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);
  if (!pieces.length && sourceId) pieces.push(`Record ${sourceId}`);
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
  const details = [when ? `Created ${when}` : "", sourceId ? `Source ID: ${sourceId}` : ""].filter(Boolean).join(" | ");
  return `${subject} needs review.${details ? ` ${details}.` : ""} Open the related kennel record and complete the required follow-up.`;
}

function notificationDisplayTitle(notification = {}) {
  const savedTitle = String(notification.title || "").trim();
  if (notificationSavedTitleIsSpecific(savedTitle)) return savedTitle;
  const source = notificationSourceSnapshot(notification);
  const dogName = source.dogName || source.latestCustomerUpdate?.dogName || "";
  const eventName = notification.eventName || "";
  if (eventName === "customerBoardingRequestCreated") return `New boarding request: ${dogName || "Customer dog"}`;
  if (eventName === "customerBoardingRequestUpdated") return `Boarding request updated: ${dogName || "Customer dog"}`;
  if (eventName === "customerDogFileUploaded") return `Customer file uploaded: ${dogName || "Customer dog"}`;
  if (eventName === "urgentKennelRequestCreated") return `Urgent request: ${source.category || "Kennel request"}`;
  if (eventName === "urgentMaintenanceCreated") return `Urgent maintenance: ${source.location || "Kennel"}`;
  if (eventName === "timeOffRequested") return `Time off request: ${source.staffName || "Staff"}`;
  if (eventName === "timeOffReviewed") return `Time off ${String(source.status || "reviewed").toLowerCase()}: ${dateRangeText(source.startDate, source.endDate)}`;
  if (eventName === "schedulePublished") return "Kennel schedule published";
  if (eventName === "scheduleChangedAfterPublish") return `Schedule changed: ${source.staffName || "Staff"}`;
  if (eventName === "urgentStaffAlertSent") return "Urgent staff alert";
  if (eventName === "urgentCustomerAlertSent") return "Urgent customer alert";
  if (eventName === "customerStayUpdateSent") return `Stay update: ${dogName || "Customer dog"}`;
  if (notification.sourceType === "boardingDog") return `Boarding dog alert: ${notificationRecordDescriptor(notification, source) || dogName || "Dog"}`;
  if (notification.sourceType === "request") return `Request alert: ${source.category || "Kennel request"}`;
  if (notification.sourceType === "maintenance") return `Maintenance alert: ${source.location || "Kennel"}`;
  const sourceLabel = notificationSourceTypeLabel(notification.sourceType);
  const descriptor = notificationRecordDescriptor(notification, source);
  if (sourceLabel && descriptor) return `${sourceLabel}: ${descriptor}`;
  if (descriptor) return `Snuggle Stay alert: ${descriptor}`;
  if (sourceLabel) return `${sourceLabel} alert`;
  return notificationEventDisplayLabel(eventName || notification.sourceType || "Snuggle Stay alert");
}

function notificationDisplayMessage(notification = {}) {
  const savedMessage = String(notification.message || "").trim();
  if (notificationSavedMessageIsSpecific(savedMessage)) return savedMessage;
  const source = notificationSourceSnapshot(notification);
  const eventName = notification.eventName || "";
  const dogName = source.dogName || source.latestCustomerUpdate?.dogName || "";
  const owner = source.ownerName || source.ownerEmail || source.customerEmail || "A customer";
  const stayId = notificationStayIdText(source);
  if (eventName === "customerBoardingRequestCreated") {
    return `${owner} submitted a boarding request${dogName ? ` for ${dogName}` : ""}${boardingScheduleText(source) ? ` for ${boardingScheduleText(source)}` : ""}.`;
  }
  if (eventName === "customerBoardingRequestUpdated") return `${owner} updated a boarding request${dogName ? ` for ${dogName}` : ""}.`;
  if (eventName === "customerDogFileUploaded") return `${owner} uploaded a file${dogName ? ` for ${dogName}` : ""}.`;
  if (eventName === "urgentKennelRequestCreated") return source.requestText || "An urgent kennel request was submitted.";
  if (eventName === "urgentMaintenanceCreated") return source.issue || "An urgent maintenance item was submitted.";
  if (eventName === "timeOffRequested") return `${source.staffName || "Staff"} requested ${dateRangeText(source.startDate, source.endDate)} off.`;
  if (eventName === "timeOffReviewed") return `${source.reviewedBy || "Admin"} marked your time off request ${source.status || "reviewed"}.`;
  if (eventName === "schedulePublished") return `The schedule for ${dateRangeText(source.weekStart, addDays(source.weekStart, 6))} has been published.`;
  if (eventName === "scheduleChangedAfterPublish") return `${source.staffName || "A staff member"} has a schedule change on ${source.date || "the published schedule"}.`;
  if (eventName === "urgentStaffAlertSent" || eventName === "urgentCustomerAlertSent") return source.message || "An urgent alert was sent.";
  if (eventName === "customerStayUpdateSent") {
    const update = source.latestCustomerUpdate || {};
    const text = update.note || source.dailyActivity || "";
    return `${update.byName || "Kennel staff"} sent an update for ${dogName || "your dog"}${stayId ? ` (Stay ID: ${stayId})` : ""}.${text ? ` ${text}` : ""}`;
  }
  if (notificationSavedMessageIsSpecific(source.message)) return source.message;
  if (notification.sourceType === "boardingDog") {
    const stayId = notificationStayIdText(source);
    const status = source.boardingStatus || boardingDisplayStatus(source) || source.status || "Review needed";
    const ownerText = owner && owner !== "A customer" ? ` for ${owner}` : "";
    return `${dogName || "Boarding dog"}${ownerText} needs review${stayId ? ` for Stay ID: ${stayId}` : ""}. Current status: ${status}.`;
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
    customerDogFileUploaded: {
      title: `Customer file uploaded: ${record.dogName || "Customer dog"}`,
      message: `${record.ownerName || record.ownerEmail || record.customerEmail || "A customer"} uploaded a file${record.dogName ? ` for ${record.dogName}` : ""}.`,
      priority: "review",
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
      title: `Stay update: ${record.dogName || "Customer dog"}`,
      message: `${record.latestCustomerUpdate?.byName || "Kennel staff"} sent an update for ${record.dogName || "your dog"}${record.latestCustomerUpdate?.requestCode ? ` (Stay ID: ${record.latestCustomerUpdate.requestCode})` : ""}.`,
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
  const dedupeKey = `${eventName}:${sourceType}:${sourceId}:${record.updatedAt || record.submittedAt || now}`;
  const existing = readRecords("notificationLog").find((item) => item.dedupeKey === dedupeKey && !item.removed);
  if (existing) return existing;
  const displaySeed = { eventName, sourceType, sourceId, sourceSnapshot, title: config.title, message: config.message };
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
    sourceType,
    sourceId,
    sourceSnapshot,
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
    await sendPayload(notification);
  } catch (error) {
    console.warn("Could not save notification before delivery.", error);
  }
  try {
    const { data, error } = await supabaseClient.functions.invoke("send-notification", {
      body: { eventName, recordId: record.id, notificationId: notification.id },
    });
    if (error) throw error;
    const emailSkipped = Boolean(data?.emailResult?.skipped);
    const smsRequested = (config.channels || []).some((channel) => String(channel).toLowerCase() === "sms");
    const smsSkipped = Boolean(data?.smsResult?.skipped);
    const deliveryStatus = emailSkipped ? (smsRequested && !smsSkipped ? "sms sent; email skipped" : "skipped") : "sent";
    const updated = upsertRecord("notificationLog", {
      ...notification,
      deliveryStatus,
      emailResult: data?.emailResult || "",
      smsResult: data?.smsResult || "",
      sentAt: new Date().toISOString(),
    });
    if (["admin", "helper"].includes(currentRole())) await sendPayload(updated);
    renderNotifications();
    return updated;
  } catch (error) {
    const failed = upsertRecord("notificationLog", { ...notification, deliveryStatus: "in-app only", deliveryError: error.message || String(error) });
    if (["admin", "helper"].includes(currentRole())) await sendPayload(failed);
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
  const readButton = $("#showReadNotificationsButton");
  if (!button || !badge || !panel || !list || !summary) return;
  const available = readRecords("notificationLog")
    .filter((item) => !item.removed && notificationVisibleToCurrentUser(item))
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));
  const unread = available.filter((item) => !notificationIsRead(item));
  const read = available.filter((item) => notificationIsRead(item)).slice(0, MAX_READ_NOTIFICATIONS);
  visibleReadNotificationCount = Math.min(Math.max(visibleReadNotificationCount, 4), MAX_READ_NOTIFICATIONS);
  const notificationItemHtml = (item) => `<article class="notification-item ${notificationIsRead(item) ? "is-read" : ""} ${item.priority === "urgent" ? "is-urgent" : ""}" data-action="open-notification" data-id="${escapeHtml(item.id)}"><strong>${escapeHtml(notificationDisplayTitle(item))}</strong><p>${escapeHtml(notificationDisplayMessage(item))}</p><span>${escapeHtml(formatDateTime(item.submittedAt || item.updatedAt))} | ${escapeHtml(notificationChannelsText(item))}</span></article>`;
  button.hidden = !helperIsLoggedIn();
  const panelOpen = !panel.hidden;
  button.classList.toggle("is-alert-panel-open", panelOpen);
  if (button.firstChild) button.firstChild.nodeValue = panelOpen ? "Close Alert " : "Alerts ";
  badge.textContent = unread.length;
  badge.hidden = !unread.length;
  summary.textContent = unread.length ? `${unread.length} unread alert${unread.length === 1 ? "" : "s"}.` : "No unread alerts.";
  if (readButton) {
    readButton.hidden = !read.length;
    readButton.textContent = showReadNotifications ? "Hide Read" : `Read${read.length ? ` (${read.length})` : ""}`;
  }
  const unreadHtml = unread.length
    ? unread.map(notificationItemHtml).join("")
    : "<p>No unread alerts.</p>";
  const visibleRead = read.slice(0, visibleReadNotificationCount);
  const readHtml = showReadNotifications
    ? `<section class="notification-read-section"><h3>Read</h3>${visibleRead.length ? visibleRead.map(notificationItemHtml).join("") : "<p>No read alerts yet.</p>"}${read.length > visibleRead.length ? `<button type="button" class="secondary-button notification-show-more" data-action="show-more-read-notifications">Show More</button>` : ""}</section>`
    : "";
  list.innerHTML = available.length ? `${unreadHtml}${readHtml}` : "<p>No notifications yet.</p>";
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
  showDetailDialog(notificationDisplayTitle(notification), `<p>${escapeHtml(notificationDisplayMessage(notification))}</p>`);
}

function emailNow(subjectText, bodyText) {
  const ownerAlertEmail = getOwnerAlertEmail();
  if (!ownerAlertEmail) {
    showToast("No admin email is configured for alerts.");
    return;
  }
  window.location.href = `mailto:${ownerAlertEmail}?subject=${encodeURIComponent(subjectText)}&body=${encodeURIComponent(bodyText)}`;
}

function normalizeHelperName(value = "") {
  return value.toLowerCase().replace(/^ms\.?\s+/, "").replace(/\s+/g, " ").trim();
}

// === MODULE: TIMESHEET ===
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

function timesheetRecordDate(record = {}) {
  return dateOnly(record.date) || localDateFromStoredDateTime(record.clockInTime) || dateOnly(record.clockInTime);
}

function timesheetRecordTime(record = {}) {
  const value = record.clockInTime || `${timesheetRecordDate(record)}T12:00:00`;
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
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function syncTimesheetRangeUi(range = timesheetActiveRange()) {
  const startInput = $("#timesheetStartDate");
  const endInput = $("#timesheetEndDate");
  if (startInput) startInput.value = range.start || "";
  if (endInput) endInput.value = range.end || "";
  const title = $("#timesheetTableTitle");
  const help = $("#timesheetTableHelp");
  const summary = $("#timesheetRangeSummary");
  const label = range.start === range.end ? timesheetDateLabel(range.start) : `${timesheetDateLabel(range.start)} to ${timesheetDateLabel(range.end)}`;
  if (title) title.textContent = range.isFiltered ? "Selected Date Range" : "Current Week";
  if (help) help.textContent = range.isFiltered ? "Clock in and clock out records for the selected date range." : "Clock in and clock out records for this week.";
  if (summary) summary.textContent = label ? `Showing timesheet records for ${label}.` : "";
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
  const activeRange = timesheetActiveRange();
  const visibleRecords = records
    .filter((record) => timesheetRecordInDateRange(record, activeRange.start, activeRange.end))
    .sort((a, b) => timesheetRecordTime(b) - timesheetRecordTime(a));
  syncTimesheetRangeUi(activeRange);

  $("#timesheetRows").innerHTML = visibleRecords.length
    ? visibleRecords.map((record) => {
        const canEdit = isAdmin || canEditOwnToday(record);
        return `<tr><td>${escapeHtml(record.date)}</td><td>${escapeHtml(record.helperName)}</td><td>${formatDateTime(record.clockInTime)}</td><td>${formatDateTime(record.clockOutTime)}</td><td>${Number(record.hours || 0).toFixed(2)}</td><td>${escapeHtml(record.note || "")}</td><td>${canEdit ? `<button type="button" class="secondary-button" data-action="edit-time" data-id="${escapeHtml(record.id)}">Edit</button>` : ""}</td></tr>`;
      }).join("")
    : `<tr><td colspan="7">No time entries for this date range.</td></tr>`;

  $("#thisWeekHours").textContent = sumHours(currentWeekRecords).toFixed(2);
  $("#lastWeekHours").textContent = sumHours(records.filter((record) => inRange(record, lastWeekStart, thisWeekStart))).toFixed(2);
  $("#lastMonthHours").textContent = sumHours(records.filter((record) => inRange(record, lastMonthStart, thisMonthStart))).toFixed(2);
  $("#lastYearHours").textContent = sumHours(records.filter((record) => inRange(record, lastYearStart, thisYearStart))).toFixed(2);

  const helperTotals = visibleRecords.reduce((totals, record) => {
    totals[record.helperName] = (totals[record.helperName] || 0) + Number(record.hours || 0);
    return totals;
  }, {});
	  $("#weeklyHelperTotals").innerHTML = Object.keys(helperTotals).length
	    ? Object.entries(helperTotals).map(([helper, hours]) => `<div class="helper-total-item"><strong>${escapeHtml(isAdmin ? helper : "Your total")}</strong><span>${hours.toFixed(2)} hours ${activeRange.isFiltered ? "in selected range" : "this week"}</span></div>`).join("")
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
  sendPayload(record).catch((error) => console.warn("Timesheet save failed", error));
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
      <label>Clock out <small>Optional. Leave blank if this staff member is still on shift.</small><input type="datetime-local" name="manualClockOut" value="${escapeHtml(clockOutValue)}" /></label>
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
  const warnings = scheduleWarningsForShift({ ...record, staffName: selected.name, staffEmail: selected.email, date, startTime: record.startTime || "09:00", endTime: record.endTime || "12:00" });
  return `<form id="scheduleShiftForm" class="tracker-form" data-id="${escapeHtml(record.id || "")}">
    <div class="field-grid">
      <label>Staff<select name="staffKey" required>${staffOptionHtml(record)}</select></label>
      <label>Date<input type="date" name="date" value="${escapeHtml(date)}" required /></label>
      <label>Start time<input type="time" name="startTime" value="${escapeHtml(record.startTime || "09:00")}" required /></label>
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
    .filter((record) => !record.removed && !["Cancelled", "Checked Out"].includes(boardingDisplayStatus(record)))
    .map((record) => {
      const stay = boardingPrimaryStay(record) || {};
      const status = stay?.id ? boardingStayDisplayStatus(record, stay) : normalizeBoardingStatus(record);
      return {
        dog: record.dogName || "",
        owner: record.ownerName || "",
        phone: record.ownerPhone || "",
        status,
        kennel: status === "In Kennel" ? [stay.kennelBuilding || record.kennelBuilding, stay.kennelLocationName || record.kennelLocationName].filter(Boolean).join(" - ") : "",
        dropoff: formatDateTime(stay.dropoffTime),
        pickup: formatDateTime(stay.pickupTime),
        requests: boardingStayServicesText(stay),
      };
    });
  downloadCsv(`boarding-queue-${todayDate()}.csv`, rows);
}

function exportTimesheet() {
  const isAdmin = currentRole() === "admin";
  const range = timesheetActiveRange();
  const rows = readRecords("timesheet")
    .filter((record) => !record.removed && (isAdmin || timesheetBelongsToCurrentUser(record)))
    .filter((record) => timesheetRecordInDateRange(record, range.start, range.end))
    .sort((a, b) => timesheetRecordTime(b) - timesheetRecordTime(a))
    .map((record) => ({
      date: record.date || "",
      staff: record.helperName || "",
      clockIn: formatDateTime(record.clockInTime),
      clockOut: formatDateTime(record.clockOutTime),
      hours: Number(record.hours || 0).toFixed(2),
      note: record.note || "",
    }));
  downloadCsv(`timesheet-${range.start}-to-${range.end}.csv`, rows);
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
  window.addEventListener("resize", () => {
    syncMobileReviewSections();
    resetDailyTaskTabPointerDrag();
    renderDailyTaskTabs();
    setDailyTaskTab(dailyTaskTab);
    positionServiceInfoTooltip();
  });
  window.addEventListener("scroll", () => {
    lastUserScrollAt = Date.now();
    positionServiceInfoTooltip();
  }, { passive: true });
  document.addEventListener("scroll", () => positionServiceInfoTooltip(), { capture: true, passive: true });
  window.addEventListener("pageshow", (event) => {
    scheduleAppResumeRecovery(event.persisted ? "pageshow-bfcache" : "pageshow");
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleAppResumeRecovery("visibility");
  });
  window.addEventListener("focus", () => scheduleAppResumeRecovery("focus"));
  window.addEventListener("online", () => scheduleAppResumeRecovery("online"));
  window.addEventListener("hashchange", () => {
    const pageId = pageIdFromHash();
    if (pageId && pageId !== activePageId()) switchPage(pageId);
  });
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
    const button = event.target.closest(".mobile-more-menu-item[data-page], .mobile-more-item[data-page]");
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
  $("#applyTimesheetDateFilterButton")?.addEventListener("click", () => {
    const start = dateOnly($("#timesheetStartDate")?.value);
    const end = dateOnly($("#timesheetEndDate")?.value);
    if (!start && !end) {
      timesheetFilterStart = "";
      timesheetFilterEnd = "";
    } else {
      timesheetFilterStart = start || end;
      timesheetFilterEnd = end || start;
    }
    renderTimesheet();
  });
  $("#resetTimesheetDateFilterButton")?.addEventListener("click", () => {
    timesheetFilterStart = "";
    timesheetFilterEnd = "";
    renderTimesheet();
  });
  $("#exportCareLogsButton")?.addEventListener("click", exportCareLogs);
  document.addEventListener("pointerover", (event) => {
    const infoIcon = event.target.closest(".service-info-icon");
    if (infoIcon) showServiceInfoTooltip(infoIcon);
  });
  document.addEventListener("pointerout", (event) => {
    const infoIcon = event.target.closest(".service-info-icon");
    if (infoIcon && !infoIcon.contains(event.relatedTarget)) hideServiceInfoTooltip(infoIcon);
  });
  document.addEventListener("focusin", (event) => {
    const infoIcon = event.target.closest(".service-info-icon");
    if (infoIcon) showServiceInfoTooltip(infoIcon);
  });
  document.addEventListener("focusout", (event) => {
    const infoIcon = event.target.closest(".service-info-icon");
    if (infoIcon) hideServiceInfoTooltip(infoIcon);
  });
  document.addEventListener("click", (event) => {
    const infoIcon = event.target.closest(".service-info-icon");
    if (!infoIcon) {
      hideServiceInfoTooltip();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    infoIcon.focus();
    showServiceInfoTooltip(infoIcon);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMobileMoreOpen(false);
      hideServiceInfoTooltip();
    }
    const infoIcon = event.target.closest?.(".service-info-icon");
    if (infoIcon && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      showServiceInfoTooltip(infoIcon);
    }
  });
  $$(".nav-button").forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });
  syncNowButton.addEventListener("click", loadRemoteRecords);
  headerLogoutButton.addEventListener("click", clearHelper);
  $("#dashboardDate").addEventListener("change", () => {
    $("#calendarNoteForm").elements.noteDate.value = $("#dashboardDate").value || todayDate();
    renderDashboard();
  });
  $("#dashboardTaskCalendar").addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    $("#dashboardDate").value = button.dataset.date;
    $("#calendarNoteForm").elements.noteDate.value = button.dataset.date;
    renderDashboard();
  });
  $("#dashboardPriorityCards")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) openDashboardPriority(button.dataset.action || "");
  });
  $("#dashboardCards")?.addEventListener("click", (event) => {
    const card = event.target.closest('[data-action="dashboard-detail"]');
    if (card) showDashboardDetail(card.dataset.key);
  });
  $("#dashboardTimeline")?.addEventListener("click", (event) => {
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
  $("#dashboardAlerts")?.addEventListener("click", async (event) => {
    const alertPopupButton = event.target.closest('[data-action="open-dashboard-alert-popup"]');
    if (alertPopupButton) {
      openDashboardAlertPopup(alertPopupButton.dataset.alertFilter || "All");
      return;
    }
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
      openOwnerUpdateAlert(ownerUpdateCard.dataset.id, boardingStayReferenceFromAction(ownerUpdateCard));
      return;
    }
    const stayServiceCard = event.target.closest('[data-action="complete-stay-service"]');
    if (stayServiceCard) {
      const dog = boardingDogRecordForDisplay(stayServiceCard.dataset.dogId || stayServiceCard.dataset.id);
      const reference = boardingStayReferenceFromAction(stayServiceCard);
      const updated = await updateBoardingStayServiceTaskStatus(dog || {}, reference, stayServiceCard.dataset.taskId || "", "completed", stayServiceCard.dataset.taskKey || "");
      if (updated) showStayServiceCompletionConfirmation(updated, reference, stayServiceCard.dataset.taskId || "", stayServiceCard.dataset.taskKey || "", dashboardAlertFilter);
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
    openDashboardAlertPopup(button.dataset.alertFilter);
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
  bindTaskFilterToggle(ensureTaskFilterToggleRow());
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
  $("#closeDetailDialog").addEventListener("click", () => {
    if ($("#customerDogForm")?.parentElement?.id === "customerDogPopupMount") {
      closeCustomerDogModal();
      return;
    }
    $("#detailDialog").close();
  });
  $("#detailDialog").addEventListener("close", restoreCustomerDogFormHome);
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
    const operationDateOverrideForm = event.target.closest("#operationDateOverrideForm");
    const taskTabForm = event.target.closest("#taskTabForm");
    const kennelBuildingTabForm = event.target.closest("#kennelBuildingTabForm");
    const ownedDogPhotoUploadForm = event.target.closest("#ownedDogPhotoUploadForm");
    const boardingCheckInForm = event.target.closest("#boardingCheckInForm");
    const boardingCheckInServiceForm = event.target.closest("#boardingCheckInServiceForm");
    const paymentMethodForm = event.target.closest("#paymentMethodForm");
    const urgentAlertForm = event.target.closest("#urgentAlertForm");
    const alertPreferenceForm = event.target.closest("#alertPreferenceForm");
    const boardingRequestFilterForm = event.target.closest("#boardingRequestFilterForm");
    if (!quickCareForm && !stayPopupForm && !settingsPopupForm && !ownerUpdateForm && !vaccineUpdateForm && !careLogEditForm && !kennelAssignmentForm && !timesheetEditForm && !scheduleShiftForm && !timeOffRequestForm && !holidayForm && !operationDateOverrideForm && !taskTabForm && !kennelBuildingTabForm && !ownedDogPhotoUploadForm && !boardingCheckInForm && !boardingCheckInServiceForm && !paymentMethodForm && !urgentAlertForm && !alertPreferenceForm && !boardingRequestFilterForm) return;
    event.preventDefault();
    if (boardingRequestFilterForm) {
      saveBoardingRequestFilterFromForm(boardingRequestFilterForm);
      return;
    }
    if (urgentAlertForm) {
      const notification = await sendUrgentAlertFromForm(urgentAlertForm);
      if (notification) urgentAlertResultDialog(notification);
      return;
    }
    if (alertPreferenceForm) {
      const saved = await saveAlertPreferenceFromForm(alertPreferenceForm);
      if (saved) {
        $("#detailDialog").close();
        showToast("Alert preferences updated.");
      }
      return;
    }
    if (paymentMethodForm) {
      if (!validateForm(paymentMethodForm)) return;
      const record = boardingDogRecordForDisplay(paymentMethodForm.dataset.id);
      if (!record) return;
      const transitionOptions = {
        stayId: paymentMethodForm.dataset.stayId || "",
        requestCode: paymentMethodForm.dataset.requestCode || "",
        allowEarly: true,
      };
      transitionOptions.early = boardingTransitionIsEarly(record, "Checked Out", transitionOptions);
      const paid = upsertRecord("boardingDog", {
        ...record,
        paymentStatus: "Paid",
        paymentMethod: paymentMethodForm.elements.paymentMethod.value,
        paidAt: new Date().toISOString(),
        paidBy: currentUser?.name || helperName?.value || "",
      });
      await sendPayload(paid);
      await addAuditLog("Marked boarding invoice paid", "boardingDog", paid, `${paid.dogName || "Dog"} | ${paid.paymentMethod}`);
      await saveBoardingStatusTransition(paid, "Checked Out", transitionOptions);
      showDetailDialog("Payment Recorded", `<p>${escapeHtml(paid.dogName || "Dog")} was marked paid by ${escapeHtml(paid.paymentMethod)} and checked out.</p>`);
      return;
    }
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
    if (operationDateOverrideForm) {
      const saved = await saveOperationDateOverrideFromForm(operationDateOverrideForm);
      if (saved) {
        $("#detailDialog").close();
        showToast("Date hours saved.");
      }
      return;
    }
    if (taskTabForm) {
      const tab = await saveTaskTabFromForm(taskTabForm);
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
      const record = boardingDogRecordForDisplay(ownerUpdateForm.dataset.id) || readRecords("boardingDog").find((item) => item.id === ownerUpdateForm.dataset.id);
      if (!record) return;
      const data = formPayload(ownerUpdateForm);
      const reference = boardingStayReferenceFromAction(ownerUpdateForm);
      const stay = ownerUpdateStayForRecord(record, reference);
      const updated = await saveBoardingCustomerUpdateForStay(record, stay, {
        note: data.dailyActivity,
        input: ownerUpdateForm.elements.ownerUpdatePhoto,
        clearOwnerUpdate: Boolean(ownerUpdateForm.elements.clearOwnerUpdate?.checked),
        reference,
      });
      if (updated) showDetailDialog("Owner Update Saved", `<p>The owner update for ${escapeHtml(updated.dogName || "this dog")} was saved to Stay ID: ${escapeHtml(stay.id ? boardingStayRequestCode(updated, stay) : "")}.</p>`);
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
        stayId: kennelAssignmentForm.dataset.stayId || "",
        requestCode: kennelAssignmentForm.dataset.requestCode || "",
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
      showToast(record.clockOutTime
        ? `Timesheet saved with ${Number(record.hours || 0).toFixed(2)} hours recorded.`
        : "Open clock-in saved. Add the clock-out time after the shift ends.");
    }
  });
  $("#detailDialogBody").addEventListener("click", async (event) => {
    const alertTab = event.target.closest("[data-alert-popup-tab]");
    if (alertTab) {
      const formEl = alertTab.closest("#detailDialogBody")?.querySelector("#urgentAlertForm");
      const selectedPanel = alertTab.dataset.alertPopupTab;
      $$("#detailDialogBody [data-alert-popup-tab]").forEach((button) => {
        const active = button.dataset.alertPopupTab === selectedPanel;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");
      });
      $$("#detailDialogBody [data-alert-panel]").forEach((panel) => {
        if (panel === formEl) return;
        panel.hidden = panel.dataset.alertPanel !== selectedPanel;
      });
      return;
    }
    const checkInMode = event.target.closest("[data-checkin-mode]");
    if (checkInMode) {
      const checkInForm = checkInMode.closest("#boardingCheckInForm");
      if (checkInForm?.elements.assignKennelAfterCheckIn) {
        checkInForm.elements.assignKennelAfterCheckIn.value = checkInMode.dataset.checkinMode === "assign-kennel" ? "Yes" : "No";
      }
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    if (action.dataset.action === "open-dashboard-alert-popup") {
      openDashboardAlertPopup(action.dataset.alertFilter || "All");
      return;
    }
    if (action.dataset.action === "clear-boarding-request-filter") {
      writeBoardingRequestStatusFilter([]);
      syncBoardingRequestFilterUi([]);
      renderBoardingRequests();
      $("#detailDialog").close();
      showToast("Showing all boarding requests.");
      return;
    }
    if (action.dataset.action === "dashboard-quick-care") {
      openDashboardQuickCare(action.dataset.dogId, action.dataset.careType);
      return;
    }
    if (action.dataset.action === "view-medical-care") {
      openMedicalCareAlert(action.dataset.dogId);
      return;
    }
    if (action.dataset.action === "view-vaccine-alert") {
      openVaccineAlert(action.dataset.dogId);
      return;
    }
    if (action.dataset.action === "view-owner-update") {
      openOwnerUpdateAlert(action.dataset.id, boardingStayReferenceFromAction(action));
      return;
    }
    if (action.dataset.action === "view-alert") {
      const record = readRecords(action.dataset.type).find((item) => item.id === action.dataset.id);
      if (record) showDetailDialog(titleForRecord(action.dataset.type, record), detailForRecord(action.dataset.type, record), { type: action.dataset.type, id: record.id });
      return;
    }
    if (action.dataset.action === "dashboard-open-owned") {
      const dog = readRecords("ownedDog").find((record) => record.id === action.dataset.id && !record.removed);
      if (dog) openOwnedDogOverviewPopup(dog);
      return;
    }
    if (action.dataset.action === "dashboard-open-boarding") {
      const dog = readRecords("boardingDog").find((record) => record.id === action.dataset.id && !record.removed);
      if (dog) {
        $("#detailDialog").close();
        switchPage("boardingDogsPage");
        openBoardingDog(dog);
        setBoardingFormLocked(false);
      }
      return;
    }
    if (action.dataset.action === "dashboard-open-maintenance") {
      const record = readRecords("maintenance").find((item) => item.id === action.dataset.id && !item.removed);
      if (record) showDetailDialog(titleForRecord("maintenance", record), maintenanceDetailHtml(record), { type: "maintenance", id: record.id });
      return;
    }
    if (action.dataset.action === "dashboard-open-request") {
      const record = readRecords("request").find((item) => item.id === action.dataset.id && !item.removed);
      if (record) showDetailDialog(titleForRecord("request", record), requestDetailHtml(record), { type: "request", id: record.id });
      return;
    }
    if (action.dataset.action === "view-dog-photo") {
      showMediaDialog(
        action.dataset.src,
        "image/jpeg",
        action.dataset.mediaName || "Dog profile photo",
        action.dataset.dogId ? { type: "ownedDogPhoto", id: action.dataset.dogId } : null,
      );
      return;
    }
    if (action.dataset.action === "edit-stay-popup") {
      const dog = boardingDogRecordForDisplay(action.dataset.dogId);
      openBoardingStayPopup(dog, boardingStayReferenceFromAction(action));
      return;
    }
    if (action.dataset.action === "open-stay-status-menu") {
      const dog = boardingDogRecordForDisplay(action.dataset.dogId);
      openBoardingStayStatusMenu(dog, boardingStayReferenceFromAction(action));
      return;
    }
    if (action.dataset.action === "open-owner-update-for-stay") {
      const dog = boardingDogRecordForDisplay(action.dataset.dogId || action.dataset.id);
      if (dog) openOwnerUpdateAlert(dog.id, boardingStayReferenceFromAction(action));
      return;
    }
    if (action.dataset.action === "transition-boarding-stay") {
      const dog = boardingDogRecordForDisplay(action.dataset.dogId);
      const options = boardingStayReferenceFromAction(action);
      const stay = boardingStayByReference(dog || {}, options) || {};
      const currentStayStatus = boardingStayDisplayStatus(dog, stay);
      if (action.dataset.nextStatus === "Checked In") {
        options.allowEarly = true;
        options.early = boardingTransitionIsEarly(dog, "Checked In", options);
      }
      let updated = null;
      if (action.dataset.nextStatus === "Checked In" && currentStayStatus === "In Kennel") {
        updated = await saveBoardingStayStatusTransition(dog, options.stayId, action.dataset.nextStatus, options);
      } else if (["Checked In", "In Kennel"].includes(action.dataset.nextStatus)) {
        updated = await saveBoardingStatusTransition(dog, action.dataset.nextStatus, options);
      } else {
        updated = await saveBoardingStayStatusTransition(dog, options.stayId, action.dataset.nextStatus, options);
      }
      if (updated) $("#detailDialog").close();
      return;
    }
    if (action.dataset.action === "open-checkin-service-picker") {
      openBoardingCheckInServicePicker();
      return;
    }
    if (action.dataset.action === "complete-stay-service") {
      const dog = boardingDogRecordForDisplay(action.dataset.dogId || action.dataset.id);
      const alertFilter = action.closest("[data-dashboard-alert-popup]")?.dataset.dashboardAlertPopup || "";
      const updated = await updateBoardingStayServiceTaskStatus(dog || {}, boardingStayReferenceFromAction(action), action.dataset.taskId || "", "completed", action.dataset.taskKey || "");
      if (updated) showStayServiceCompletionConfirmation(updated, boardingStayReferenceFromAction(action), action.dataset.taskId || "", action.dataset.taskKey || "", alertFilter);
      return;
    }
    if (action.dataset.action === "confirm-ready-for-pickup") {
      const record = boardingDogRecordForDisplay(action.dataset.id);
      const options = action.dataset.stayId ? boardingStayReferenceFromAction(action) : {};
      const targetStay = record ? (boardingStayByReference(record, options) || activeBoardingStay(record) || currentOrNextStay(record) || {}) : {};
      const serviceStats = record ? boardingStayServiceStats(record, targetStay) : { incompleteTasks: [] };
      if (serviceStats.incompleteTasks.length) {
        showToast("Complete requested stay services before marking ready.");
        return;
      }
      const note = $("#pickupReadyNote")?.value.trim() || "";
      const noteRecord = record && note ? upsertRecord("boardingDog", { ...record, pickupReadyNote: note, updatedAt: new Date().toISOString() }) : record;
      if (record && note) await sendPayload(noteRecord);
      if (noteRecord) await saveBoardingStatusTransition(noteRecord, "Ready For Pickup", options);
      if (record) showDetailDialog("Ready For Pickup", `<p>${escapeHtml(record.dogName || "Dog")} is marked ready for pickup.</p>`);
      return;
    }
    if (action.dataset.action === "checkout-paid-method") {
      const record = boardingDogRecordForDisplay(action.dataset.id);
      if (record) openPaymentMethodPopup(record, boardingStayReferenceFromAction(action));
      return;
    }
    if (action.dataset.action === "confirm-check-out") {
      const record = boardingDogRecordForDisplay(action.dataset.id);
      const note = $("#checkoutNote")?.value.trim() || "";
      const noteRecord = record && note ? upsertRecord("boardingDog", { ...record, checkoutNote: note, updatedAt: new Date().toISOString() }) : record;
      if (record && note) await sendPayload(noteRecord);
      const options = action.dataset.stayId ? boardingStayReferenceFromAction(action) : {};
      options.allowEarly = true;
      options.early = boardingTransitionIsEarly(noteRecord || {}, "Checked Out", options);
      if (noteRecord) await saveBoardingStatusTransition(noteRecord, "Checked Out", options);
      if (record) showDetailDialog("Checked Out", `<p>${escapeHtml(record.dogName || "Dog")} has been checked out.</p>`);
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
    if (action.dataset.action === "toggle-owned-activity-group") {
      const groupSection = action.closest(".collapsed-activity-group");
      const content = groupSection?.querySelector("[data-activity-group-content]");
      const expanded = action.getAttribute("aria-expanded") === "true";
      if (!groupSection || !content) return;
      if (!expanded && content.dataset.loaded !== "true") {
        const dog = readRecords("ownedDog").find((record) => record.id === action.dataset.id && !record.removed);
        content.innerHTML = dog ? ownedDogActivityGroupEntriesHtml(dog, action.dataset.group || "") : "<p>This dog record is no longer available.</p>";
        content.dataset.loaded = "true";
      }
      action.setAttribute("aria-expanded", expanded ? "false" : "true");
      content.hidden = expanded;
      groupSection.classList.toggle("is-open", !expanded);
      return;
    }
    if (action.dataset.action === "open-customer-dog-editor") {
      openCustomerDogEditorForRequest(action.dataset.id);
      return;
    }
    if (action.dataset.action === "open-boarding-dog-editor") {
      const dog = boardingDogRecordForDisplay(action.dataset.id);
      if (!dog) return;
      $("#detailDialog").close();
      switchPage("boardingDogsPage");
      openBoardingDogToTab(dog, action.dataset.tab || "Dog Info");
      return;
    }
    if (action.dataset.action === "confirm-remove-task-tab") {
      const removed = await removeTaskTab(action.dataset.taskTabId);
      $("#detailDialog").close();
      if (removed) showToast("Task tab removed.");
    }
    if (action.dataset.action === "confirm-remove-kennel-building-tab") {
      const removed = await removeKennelBuilding(action.dataset.building);
      $("#detailDialog").close();
      if (removed) showToast("Building tab removed.");
    }
    if (action.dataset.action === "clear-operation-date-override") {
      const removed = await clearOperationDateOverride(action.dataset.id);
      $("#detailDialog").close();
      if (removed) showToast("Date override cleared.");
    }
    if (action.dataset.action === "confirm-remove-service") {
      const removed = await markRecordRemoved("service", action.dataset.id);
      $("#detailDialog").close();
      closeServiceModal();
      if (removed) {
        await addAuditLog("Removed service", "service", removed, removed.serviceName || "");
        renderServices();
        renderFinancials();
        renderDashboard();
        showToast("Service removed.");
      }
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
        showToast("Dog record opened for editing.");
      }
    }
    if (action.dataset.action === "open-boarding-editor") {
      const dog = boardingDogRecordForDisplay(action.dataset.id);
      if (dog) {
        $("#detailDialog").close();
        switchPage("boardingDogsPage");
        openBoardingDogToTab(dog, action.dataset.tab || "Dog Info");
      }
    }
    if (action.dataset.action === "popup-set-password") await adminSetTemporaryPassword(action.closest("form"), action);
    if (action.dataset.action === "popup-send-reset") await adminSendPasswordResetEmail(action.closest("form"), action);
    if (action.dataset.action === "popup-impersonate-user") {
      const user = readRecords("settingsUser").find((item) => item.id === action.dataset.id && !item.removed);
      if (user) startUserImpersonation(user);
      return;
    }
    if (action.dataset.action === "popup-remove-user") {
      const user = readRecords("settingsUser").find((item) => item.id === action.dataset.id && !item.removed);
      if (user) openSettingsUserRemoveConfirm(user, { returnToUser: true });
    }
    if (action.dataset.action === "view-settings-user-agreement") {
      if (typeof openSettingsUserAgreement === "function") openSettingsUserAgreement(action.dataset.id || "");
      return;
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
    if (action.dataset.action === "confirm-remove-customer-dog") {
      const removed = await removeCustomerDogById(action.dataset.id);
      $("#detailDialog").close();
      if (removed) showToast(`${removed.dogName || "Dog"} removed.`);
      return;
    }
    if (action.dataset.action === "confirm-delete-boarding-dog") {
      const removed = await deleteBoardingDogById(action.dataset.id);
      $("#detailDialog").close();
      if (removed) showToast("Boarding dog profile deleted.");
    }
    if (action.dataset.action === "confirm-remove-boarding-stay") {
      const updated = await removeBoardingStayFromDog(action.dataset.dogId, action.dataset.id, boardingStayReferenceFromAction(action));
      $("#detailDialog").close();
      if (updated) showToast("Boarding stay removed.");
    }
    if (action.dataset.action === "confirm-remove-boarding-file") {
      const removed = await removeBoardingDogFile(boardingDogFileReferenceFromAction(action));
      $("#detailDialog").close();
      if (removed) showToast("File removed.");
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
    const boardingStayLocationBuilding = event.target.closest("#boardingStayLocationBuilding");
    if (boardingStayLocationBuilding) {
      updateBoardingStayLocationOptions(boardingStayLocationBuilding.closest("#boardingStayPopupForm"));
      return;
    }
    const alertPreferenceUser = event.target.closest("#alertPreferenceUserSelect");
    if (alertPreferenceUser) {
      openAlertPreferencePopup(alertPreferenceUser.value);
      return;
    }
    const timesheetStaff = event.target.closest("#timesheetStaffSelect");
    if (timesheetStaff) {
      syncTimesheetStaffFields(timesheetStaff.closest("#timesheetEditForm"));
      return;
    }
    const operationOpenToggle = event.target.closest('#operationDateOverrideForm input[name="isOpen"]');
    if (operationOpenToggle) {
      const formEl = operationOpenToggle.closest("#operationDateOverrideForm");
      ["openTime", "closeTime"].forEach((name) => {
        const field = formFieldByName(formEl, name);
        if (field) field.disabled = !operationOpenToggle.checked;
      });
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
  $("#detailDialogHeaderAction")?.addEventListener("click", () => {
    const action = $("#detailDialogHeaderAction");
    if (action?.dataset.action === "open-boarding-dog-editor") {
      const dog = boardingDogRecordForDisplay(action.dataset.id);
      if (!dog) return;
      $("#detailDialog").close();
      switchPage("boardingDogsPage");
      openBoardingDogToTab(dog, action.dataset.tab || "Dog Info");
      showToast("Boarding dog profile opened.");
      return;
    }
    if (action?.dataset.action === "open-customer-dog-editor") {
      openCustomerDogEditorForRequest(action.dataset.id);
      return;
    }
    if (action?.dataset.action !== "open-owned-editor") return;
    const dog = readRecords("ownedDog").find((record) => record.id === action.dataset.id && !record.removed);
    if (!dog) return;
    $("#detailDialog").close();
    switchPage("ourDogsPage");
    openOwnedDog(dog);
    setOwnedFormLocked(false);
    showToast("Dog record opened for editing.");
  });
  $("#closeMediaDialog").addEventListener("click", () => $("#mediaDialog").close());
  $("#replaceOwnedDogPhotoButton")?.addEventListener("click", () => {
    const dogId = $("#replaceOwnedDogPhotoButton")?.dataset.id || "";
    const dog = readRecords("ownedDog").find((record) => record.id === dogId && !record.removed);
    if (!dog) return;
    $("#mediaDialog").close();
    openOwnedDogPhotoUploadPopup(dog);
  });
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
    openMediaFromButton(mediaButton);
  });
  form.addEventListener("change", () => {
    updateCompletionCount();
    updateConditionalSections();
    updateRotationBanner();
  });
  $("#dailyTaskTabs")?.addEventListener("click", (event) => {
    if (suppressDailyTaskTabClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressDailyTaskTabClick = false;
      return;
    }
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
  $("#dailyTaskTabs")?.addEventListener("dragstart", (event) => {
    const button = event.target.closest('[data-task-tab][draggable="true"]');
    if (!button || !adminTaskTabDragEnabled()) return;
    button.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", button.dataset.taskTab || "");
  });
  $("#dailyTaskTabs")?.addEventListener("dragover", (event) => {
    const button = event.target.closest('[data-task-tab][draggable="true"]');
    if (!button || !adminTaskTabDragEnabled()) return;
    event.preventDefault();
    markTaskTabDropTarget(button, taskTabDropPositionFromEvent(event, button));
  });
  $("#dailyTaskTabs")?.addEventListener("dragleave", (event) => {
    const button = event.target.closest("[data-task-tab]");
    if (button) {
      button.classList.remove("is-drag-over", "is-drag-over-before", "is-drag-over-after");
      delete button.dataset.dropPosition;
    }
  });
  $("#dailyTaskTabs")?.addEventListener("drop", async (event) => {
    const target = event.target.closest('[data-task-tab][draggable="true"]');
    if (!target || !adminTaskTabDragEnabled()) return;
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain");
    const position = target.dataset.dropPosition || taskTabDropPositionFromEvent(event, target);
    clearTaskTabDragTargets();
    await reorderTaskTabByDrag(sourceId, target.dataset.taskTab || "", position);
  });
  $("#dailyTaskTabs")?.addEventListener("dragend", () => {
    $$("#dailyTaskTabs [data-task-tab]").forEach((button) => button.classList.remove("is-dragging"));
    clearTaskTabDragTargets();
  });
  $("#dailyTaskTabs")?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest('[data-task-tab][draggable="true"]');
    if (!button || !adminTaskTabDragEnabled() || event.button !== 0) return;
    dailyTaskTabPointerDrag = {
      sourceButton: button,
      sourceId: button.dataset.taskTab || "",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
      targetButton: null,
      position: "before",
    };
    button.setPointerCapture?.(event.pointerId);
  });
  $("#dailyTaskTabs")?.addEventListener("pointermove", (event) => {
    const drag = dailyTaskTabPointerDrag;
    if (!drag || drag.pointerId !== event.pointerId || !adminTaskTabDragEnabled()) return;
    const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && moved < 6) return;
    if (!drag.dragging) {
      drag.dragging = true;
      suppressDailyTaskTabClick = true;
      drag.sourceButton?.classList.add("is-dragging");
      document.body.classList.add("is-task-tab-dragging");
    }
    event.preventDefault();
    const target = taskTabButtonFromPoint(event.clientX, event.clientY);
    if (!target || target.dataset.taskTab === drag.sourceId) {
      clearTaskTabDragTargets();
      drag.targetButton = null;
      return;
    }
    drag.targetButton = target;
    drag.position = taskTabDropPositionFromEvent(event, target);
    markTaskTabDropTarget(target, drag.position);
  });
  $("#dailyTaskTabs")?.addEventListener("pointerup", async (event) => {
    const drag = dailyTaskTabPointerDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.sourceButton?.releasePointerCapture?.(event.pointerId);
    if (drag.dragging) {
      event.preventDefault();
      suppressDailyTaskTabClick = true;
      const target = taskTabButtonFromPoint(event.clientX, event.clientY) || drag.targetButton;
      const position = target ? taskTabDropPositionFromEvent(event, target) : drag.position;
      if (target && target.dataset.taskTab !== drag.sourceId) await reorderTaskTabByDrag(drag.sourceId, target.dataset.taskTab || "", position);
      window.setTimeout(() => {
        suppressDailyTaskTabClick = false;
      }, 0);
    }
    resetDailyTaskTabPointerDrag();
  });
  $("#dailyTaskTabs")?.addEventListener("pointercancel", () => {
    suppressDailyTaskTabClick = false;
    resetDailyTaskTabPointerDrag();
  });
  $("#customTaskPanels")?.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="add-custom-tab-task"]');
    if (button) await addCustomTabTask(button);
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
    sendPayload(record).catch((error) => console.warn("Clock-in save failed", error));
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
	  $("#showReadNotificationsButton")?.addEventListener("click", () => {
	    showReadNotifications = !showReadNotifications;
	    visibleReadNotificationCount = 4;
	    renderNotifications();
	  });
	  $("#notificationList")?.addEventListener("click", (event) => {
	    const showMore = event.target.closest('[data-action="show-more-read-notifications"]');
	    if (showMore) {
	      visibleReadNotificationCount = Math.min(visibleReadNotificationCount + 4, MAX_READ_NOTIFICATIONS);
	      renderNotifications();
	      return;
	    }
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

  $("#ownedLastBath").addEventListener("change", () => ($("#ownedNextBath").value = nextBathFromFrequency($("#ownedLastBath").value, numberFrom($("#ourDogForm").elements.bathIntervalDays?.value, careDefaults.bathIntervalDays))));
  $("#ourDogForm").elements.bathIntervalDays.addEventListener("change", () => ($("#ownedNextBath").value = nextBathFromFrequency($("#ownedLastBath").value, numberFrom($("#ourDogForm").elements.bathIntervalDays?.value, careDefaults.bathIntervalDays))));
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
  $("#closeOwnedDogDialogButton")?.addEventListener("click", closeOwnedDogModal);
  $("#cancelOwnedDogEdit").addEventListener("click", closeOwnedDogModal);
  $("#deleteOwnedDogButton").addEventListener("click", async () => {
    const dog = activeOwnedDog();
    if (!dog) return;
    if (!window.confirm(`Remove ${dog.callName || dog.showName || "this dog"} from Our Dogs?`)) return;
    const updated = await markRecordRemoved("ownedDog", dog.id);
    closeOwnedDogModal();
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
      const bathIntervalDays = nonNegativeNumberFrom(formData.bathIntervalDays, nonNegativeNumberFrom(normalizedExisting.bathIntervalDays, careDefaults.bathIntervalDays));
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
        rabiesGoodThreeYears: formEl.elements.rabiesGoodThreeYears?.checked ? "Yes" : "",
        exerciseFrequencyDays: nonNegativeNumberFrom(formData.exerciseFrequencyDays, nonNegativeNumberFrom(normalizedExisting.exerciseFrequencyDays, careDefaults.exerciseFrequencyDays)),
        trainingFrequencyDays: nonNegativeNumberFrom(formData.trainingFrequencyDays, nonNegativeNumberFrom(normalizedExisting.trainingFrequencyDays, careDefaults.trainingFrequencyDays)),
        bathIntervalDays,
        heatCycleLengthDays,
        nextBath: formData.nextBath || nextBathFromFrequency(formData.lastBath, bathIntervalDays),
        lastHeat: isFemale ? formData.lastHeat : "",
        nextHeat: isFemale ? formData.nextHeat || (formData.lastHeat ? addDays(formData.lastHeat, heatCycleLengthDays) : "") : "",
        heatCycle: isFemale ? formData.heatCycle || "" : "",
        heatCycleStatus: isFemale ? formData.heatCycleStatus || "" : "",
        heatCycleNotes: isFemale ? formData.heatCycleNotes || "" : "",
        profilePhotoUrl: photo.profilePhotoUrl,
        profilePhotoPath: photo.profilePhotoPath,
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
      setOwnedCareEntryVisibility(true);
      setDogPhoto("owned", record);
      renderOwnedActivity(record);
      renderOwnedDogFiles(record);
      renderOwnedDogs();
      renderBoardingDogs();
      renderDashboard();
      selectedDogPhotos.owned = null;
      syncOwnedDogTabAvailability(record);
      setOwnedFormLocked(false);
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
    boardingDogPriorityFilter = "";
    renderBoardingDogs();
  });
  $("#boardingViewToggle")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) handleBoardingViewToggle(button.dataset.view);
  });
  $("#boardingQueueGroups")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "boarding-queue-show-more") {
      const filterMap = {
        "Pending Approval": "Pending",
        "Today Drop-offs": "Active dogs",
        "Tomorrow Arrivals": "Active dogs",
        "In Kennel": "In Kennel",
        "Today Pickups": "Ready For Pickup",
      };
      boardingDogRosterFilter = filterMap[button.dataset.filter || ""] || "All Boarding Dogs";
      boardingDogPriorityFilter = "";
      handleBoardingViewToggle("list");
      renderBoardingDogs();
      return;
    }
    if (button.dataset.action !== "open-queue-stay-status") return;
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (!record) return;
    const reference = boardingStayReferenceFromAction(button);
    const stayId = reference.stayId || (currentOrNextStay(record) || activeBoardingStay(record) || {}).id || "";
    if (stayId) openBoardingStayStatusMenu(record, { ...reference, stayId });
    else openBoardingDogToTab(record, "Boarding & Request");
  });
  $("#boardingOwnerAccountPanel")?.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="link-boarding-owner"]');
    if (!button) return;
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (record) await linkBoardingDogOwnerAccount(record);
  });
  $("#boardingDogTableSettingsButton")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const panel = $("#boardingDogColumnManager");
    setTableSettingsPopoverOpen("#boardingDogTableSettingsButton", "#boardingDogColumnManager", Boolean(panel?.hidden));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".table-settings-shell")) return;
    setTableSettingsPopoverOpen("#boardingDogTableSettingsButton", "#boardingDogColumnManager", false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setTableSettingsPopoverOpen("#boardingDogTableSettingsButton", "#boardingDogColumnManager", false);
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
  $("#closeBoardingDogDialogButton")?.addEventListener("click", closeBoardingDogModal);
  $("#cancelBoardingDogEdit").addEventListener("click", closeBoardingDogModal);
  $("#deleteBoardingDogButton")?.addEventListener("click", () => {
    const dog = activeBoardingDog();
    if (dog) openBoardingDogDeleteConfirm(dog);
  });
  $("#boardingDogPhotoPicker").addEventListener("click", () => handleDogPhotoClick("boarding"));
  $("#boardingDogPhotoInput").addEventListener("change", async () => previewSelectedDogPhoto("boarding"));
  $("#addBoardingCustomerUpdateButton")?.addEventListener("click", addBoardingCustomerUpdate);
  $("#uploadBoardingDogFilesButton")?.addEventListener("click", async () => {
    const dog = activeBoardingDog({ raw: true }) || activeBoardingDog();
    if (!dog?.id) {
      showToast("Save the boarding dog before uploading files.");
      return;
    }
    const input = $("#boardingDogUploadedFiles");
    const uploads = await uploadBoardingDogDocumentFiles(input, dog.id);
    if (!uploads.length) return;
    const documents = [...boardingDogDocumentItems(dog), ...uploads];
    const updated = await updateBoardingDogDocuments(documents);
    if (input) input.value = "";
    if (updated) showToast(`${uploads.length} file${uploads.length > 1 ? "s" : ""} added.`);
  });
  $("#boardingDogUploadedFileList")?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action || action.dataset.action === "view-media") return;
    if (action.dataset.action === "save-boarding-file-name") {
      const card = action.closest("[data-file-id]");
      const input = card?.querySelector('[data-action="rename-boarding-file-input"]');
      await updateBoardingDogFileName({
        source: action.dataset.source || "",
        id: action.dataset.id || "",
        parentId: action.dataset.parentId || "",
        sourceRecordId: action.dataset.sourceRecordId || "",
        name: input?.value || "",
      });
    }
    if (action.dataset.action === "remove-boarding-file") {
      openBoardingDogFileRemoveConfirm(boardingDogFileReferenceFromAction(action));
    }
  });
  $("#boardingHistoryList")?.addEventListener("click", (event) => {
    const card = event.target.closest('[data-action="view-boarding-stay-history"]');
    if (!card) return;
    openBoardingStayHistory(activeBoardingDog(), boardingStayReferenceFromAction(card));
  });
  $("#boardingKennelLocationSelect")?.addEventListener("change", async (event) => {
    await updateBoardingKennelLocation(event.target.value);
  });
  $("#boardingDogTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row || row.dataset.source !== "boardingDog") return;
    openBoardingDog(boardingDogRecordForDisplay(row.dataset.id));
  });
  $("#boardingRequestFilterButton")?.addEventListener("click", () => {
    showDetailDialog("Filter Boarding Requests", boardingRequestFilterPopupHtml());
  });
  $("#boardingRequestRecords").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    const action = button?.dataset.action;
    if (["approve-boarding", "change-boarding", "cancel-boarding", "transition-boarding", "open-boarding-request-tab"].includes(action)) {
      event.stopPropagation();
      const record = boardingDogRecordForDisplay(button.dataset.id);
      const reference = boardingStayReferenceFromAction(button);
      const stayId = reference.stayId || "";
      if (!record) return;
      if (action === "approve-boarding") {
        if (stayId) {
          await approveBoardingStay(record, stayId, reference);
        } else {
          const updated = upsertRecord("boardingDog", approveBoardingRecord(record));
          await sendPayload(updated);
          renderBoardingDogs();
          renderBoardingRequests();
          renderCustomerRequests();
          showToast("Boarding request approved.");
        }
      }
      if (action === "change-boarding") {
        openBoardingDogToTab(record, "Boarding & Request");
      }
      if (action === "open-boarding-request-tab") {
        openBoardingDogToTab(record, "Boarding & Request");
      }
      if (action === "cancel-boarding") {
        const updated = stayId
          ? await saveBoardingStayStatusTransition(record, stayId, "Cancelled", reference)
          : upsertRecord("boardingDog", withBoardingStatusTransition(record, "Cancelled") || record);
        if (!stayId) await sendPayload(updated);
        renderBoardingDogs();
        renderBoardingRequests();
        renderCustomerRequests();
        if (!stayId) showToast("Boarding request cancelled.");
      }
      if (action === "transition-boarding") {
        const next = button.dataset.nextStatus;
        const options = stayId ? reference : {};
        if (next === "Checked In") {
          options.allowEarly = true;
          options.early = boardingTransitionIsEarly(record, next, options);
        }
        await handleBoardingTransition(record, next, options);
      }
      return;
    }
    const card = event.target.closest('[data-action="view-boarding-request"]');
    if (!card) return;
    const record = boardingDogRecordForDisplay(card.dataset.id);
    if (record) openCustomerRequestDetail(record, boardingStayReferenceFromAction(card));
  });
  $("#boardingDogTableBody").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.stopPropagation();
    const record = boardingDogRecordForDisplay(button.dataset.id);
    const reference = boardingStayReferenceFromAction(button);
    const stayId = reference.stayId || "";
    if (!record) return;
    if (button.dataset.action === "inline-boarding-status") {
      await handleInlineBoardingStatusClick(button);
      return;
    }
    if (button.dataset.action === "link-boarding-owner") {
      await linkBoardingDogOwnerAccount(record);
      return;
    }
    if (button.dataset.action === "approve-boarding") {
      if (stayId) {
        await approveBoardingStay(record, stayId, reference);
      } else {
        const updated = upsertRecord("boardingDog", approveBoardingRecord(record));
        await sendPayload(updated);
        renderBoardingDogs();
        renderBoardingRequests();
        showToast("Boarding request approved.");
      }
    }
    if (button.dataset.action === "change-boarding") {
      openBoardingDog(record);
      setBoardingFormLocked(false);
    }
    if (button.dataset.action === "open-boarding-request-tab") {
      openBoardingDogToTab(record, "Boarding & Request");
    }
    if (button.dataset.action === "cancel-boarding") {
      const updated = stayId
        ? await saveBoardingStayStatusTransition(record, stayId, "Cancelled", reference)
        : upsertRecord("boardingDog", withBoardingStatusTransition(record, "Cancelled") || record);
      if (!stayId) await sendPayload(updated);
      renderBoardingDogs();
      renderBoardingRequests();
      renderCustomerRequests();
      if (!stayId) showToast("Boarding request cancelled.");
    }
    if (button.dataset.action === "transition-boarding") {
      const options = stayId ? reference : {};
      if (button.dataset.nextStatus === "Checked In") {
        options.allowEarly = true;
        options.early = boardingTransitionIsEarly(record, button.dataset.nextStatus, options);
      }
      await handleBoardingTransition(record, button.dataset.nextStatus, options);
    }
  });
  $("#boardingDogQuickCards")?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const record = boardingDogRecordForDisplay(button.dataset.id);
    if (!record) return;
    if (button.dataset.action === "change-boarding") {
      openBoardingDogToTab(record, "Boarding & Request");
      return;
    }
    if (button.dataset.action === "inline-boarding-status") {
      await handleInlineBoardingStatusClick(button);
      return;
    }
    if (button.dataset.action === "open-mobile-stay-status-menu") {
      const reference = boardingStayReferenceFromAction(button);
      openBoardingStayStatusMenu(record, { ...reference, stayId: reference.stayId || (currentOrNextStay(record) || activeBoardingStay(record) || {}).id });
      return;
    }
    if (button.dataset.action === "quick-approve-boarding") {
      const reference = boardingStayReferenceFromAction(button);
      const updated = reference.stayId
        ? await approveBoardingStay(record, reference.stayId, reference)
        : await saveBoardingStatusTransition(record, "Approved");
      if (updated && !reference.stayId) showToast("Boarding request approved.");
      return;
    }
    if (button.dataset.action === "quick-boarding-transition") {
      const allowEarly = button.dataset.allowEarly === "true";
      const reference = boardingStayReferenceFromAction(button);
      const options = reference.stayId ? reference : {};
      options.allowEarly = allowEarly;
      options.early = allowEarly && boardingTransitionIsEarly(record, button.dataset.nextStatus, options);
      await handleBoardingTransition(record, button.dataset.nextStatus, options);
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
      const combinedStatus = combinedDogSpayNeuterStatus(formData);
      const derivedSex = sexFromCombinedDogSpayNeuterStatus(combinedStatus) || formData.sex || "";
      if (formEl.elements.sex) formEl.elements.sex.value = derivedSex;
      if (!validateForm(formEl)) return;
      let existing = activeBoardingDog() || {};
      if (!existing.id) {
        existing = findMatchingBoardingDogProfile(formData) || {};
      }
      const isNewBoardingDog = !existing.id;
      const dogId = existing.id || formData.id || uid("boardingDog");
      const timestamp = new Date().toISOString();
      const currentStatus = existing.id ? normalizeBoardingStatus(existing) : "Approved";
      const selectedStatus = currentStatus;
      const photo = await durableDogPhoto("boarding", existing, formData, $("#boardingDogPhotoInput"), dogId);
      const vaccinationUploads = await uploadVaccinationFiles($("#boardingDogVaccinationFiles"), dogId);
      const documentUploads = await uploadBoardingDogDocumentFiles($("#boardingDogUploadedFiles"), dogId);
      const statusHistory = existing.statusHistory || [];
      const statusScopedStays = existing.stays || [];
      let payload = {
        ...existing,
        type: "boardingDog",
        id: dogId,
        submittedAt: existing.submittedAt || timestamp,
        ...formData,
        sex: derivedSex || formData.sex || existing.sex || "",
        spayNeuterStatus: combinedStatus || formData.spayNeuterStatus || existing.spayNeuterStatus || "",
        ownerEmail: normalizeEmail(formData.ownerEmail),
        customerEmail: normalizeEmail(formData.customerEmail || formData.ownerEmail || existing.customerEmail),
        linkedOwnerEmail: normalizeEmail(formData.ownerEmail || existing.linkedOwnerEmail),
        secondaryOwnerEmail: normalizeEmail(formData.secondaryOwnerEmail),
        boardingStatus: selectedStatus,
        statusHistory,
        entrySource: existing.entrySource || (existing.customerRequest ? "customer" : "staff-admin"),
        rabiesGoodThreeYears: formEl.elements.rabiesGoodThreeYears.checked ? "Yes" : "",
        dhppGoodThreeYears: formEl.elements.dhppGoodThreeYears?.checked ? "Yes" : "",
        rabiesDuration: formEl.elements.rabiesGoodThreeYears.checked ? "3 years" : "",
        dhppDuration: formEl.elements.dhppGoodThreeYears?.checked ? "3 years" : "",
        flags: formEl.querySelector('[name="boardingFlags"]') ? checkedFrom(formEl, "boardingFlags") : existing.flags || [],
        profilePhotoUrl: photo.profilePhotoUrl,
        profilePhotoPath: photo.profilePhotoPath,
        profilePhotoData: photo.profilePhotoData,
        documents: [...boardingDogDocumentItems(existing), ...documentUploads],
        vaccinationRecords: [...(existing.vaccinationRecords || []), ...vaccinationUploads],
        vaccinationFiles: [...(existing.vaccinationRecords || []), ...vaccinationUploads].map((file) => file.name).join(", "),
        stays: statusScopedStays,
        checkedInAt: selectedStatus === "Checked In" ? existing.checkedInAt || timestamp : existing.checkedInAt || "",
        inKennelAt: selectedStatus === "In Kennel" ? existing.inKennelAt || timestamp : existing.inKennelAt || "",
        readyForPickupAt: selectedStatus === "Ready For Pickup" ? existing.readyForPickupAt || timestamp : existing.readyForPickupAt || "",
        checkedOutAt: selectedStatus === "Checked Out" ? existing.checkedOutAt || timestamp : existing.checkedOutAt || "",
        cancelledAt: selectedStatus === "Cancelled" ? existing.cancelledAt || timestamp : existing.cancelledAt || "",
      };
      const canonicalDog = await saveCanonicalCustomerDogForBoarding(payload, existing);
      if (canonicalDog) payload = boardingDogWithCustomerProfilePatch(payload, canonicalDog);
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
      if ($("#boardingDogUploadedFiles")) $("#boardingDogUploadedFiles").value = "";
      renderBoardingVaccinationFiles(record);
      renderBoardingCustomerUpdates(record);
      renderBoardingDogFiles(record);
      renderBoardingStays(record);
      renderBoardingHistory(record);
      if (isNewBoardingDog) boardingDogRosterFilter = "All Boarding Dogs";
      renderBoardingOwnerAccountPanel(record);
      renderBoardingDogs();
      renderBoardingRequests();
      renderCustomerDogs();
      renderCustomerUpdates();
      selectedDogPhotos.boarding = null;
      setBoardingFormLocked(false);
      if (photo.photoError) {
        showDetailDialog("Boarding Dog Saved Without Photo", `<p>${escapeHtml(record.dogName || "Boarding dog")} has been saved, but the profile photo could not be uploaded: ${escapeHtml(photo.photoError)}</p>`);
      } else {
        showDetailDialog("Boarding Dog Saved", `<p>${escapeHtml(record.dogName || "Boarding dog")} has been saved.</p>`);
      }
    } catch (error) {
      showDetailDialog("Boarding Dog Not Saved", `<p>The boarding dog record could not be saved: ${escapeHtml(error.message)}</p>`);
    }
  });
  $("#openBoardingStayPopupButton")?.addEventListener("click", () => {
    const dog = activeBoardingDog();
    if (!dog?.id) {
      showToast("Save the boarding dog first.");
      return;
    }
    openBoardingStayPopup(dog);
  });
  $("#boardingStayHistory").addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="edit-stay"], [data-action="remove-stay"], [data-action="change-stay-status"], [data-action="complete-stay-service"], [data-action="open-owner-update-for-stay"]');
    if (!button) return;
    const dog = activeBoardingDog();
    const reference = boardingStayReferenceFromAction(button);
    if (button.dataset.action === "change-stay-status") openBoardingStayStatusMenu(dog, reference);
    if (button.dataset.action === "edit-stay") openBoardingStayPopup(dog, reference);
    if (button.dataset.action === "remove-stay") openBoardingStayRemoveConfirm(dog, reference);
    if (button.dataset.action === "open-owner-update-for-stay") openOwnerUpdateAlert(dog?.id || button.dataset.dogId, reference);
    if (button.dataset.action === "complete-stay-service") {
      const updated = await updateBoardingStayServiceTaskStatus(dog || {}, reference, button.dataset.taskId || "", "completed", button.dataset.taskKey || "");
      if (updated) showStayServiceCompletionConfirmation(updated, reference, button.dataset.taskId || "", button.dataset.taskKey || "");
    }
  });
  $("#boardingCustomerUpdateList")?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="open-owner-update-for-stay"]');
    if (!button) return;
    const dog = activeBoardingDog() || boardingDogRecordForDisplay(button.dataset.dogId);
    openOwnerUpdateAlert(dog?.id || button.dataset.dogId, boardingStayReferenceFromAction(button));
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
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    const data = formPayload(formEl);
    const editingId = formEl.dataset.mode === "edit" ? data.id : "";
    const existing = editingId ? readRecords("service").find((record) => record.id === editingId) : {};
    const serviceId = editingId || uid("service");
    const boardingRateType = normalizedBoardingRateType(data.boardingRateType);
    if (boardingRateType) data.category = "Boarding";
    const validDependency = data.requiresServiceId && data.requiresServiceId !== serviceId && readRecords("service").some((record) => record.id === data.requiresServiceId && !record.removed);
    const requiresServiceId = validDependency ? data.requiresServiceId : "";
    const dependentServiceType = requiresServiceId ? data.dependentServiceType || "optional-addon" : "";
    const flags = normalizedServiceFlags(checkedFrom(formEl, "serviceFlags"));
    const deposit = Number(data.depositAmount || 0);
    const basePrice = Number(data.basePrice || 0);
    if (deposit > 500 || (basePrice && deposit / basePrice > 0.2)) {
      showToast("Deposit guardrail: review contract language for deposits above $500 or 20%.");
    }
    const payload = {
      ...existing,
      ...data,
      id: serviceId,
      type: "service",
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      boardingRateType,
      includesBoardingAccommodation: boardingRateType === "boarding-program",
      replacesStandardBoarding: boardingRateType === "boarding-program",
      requiresServiceId,
      dependentServiceType,
      flags,
    };
    const record = upsertRecord("service", payload);
    await sendPayload(record);
    await addAuditLog(existing?.id ? "Updated service" : "Created service", "service", record, `${record.category || "Service"} ${money(record.basePrice)}`);
    renderServices();
    renderDashboard();
    renderFinancials();
    closeServiceModal();
    showToast("Service pricing saved.");
  });
  $("#addServiceButton")?.addEventListener("click", () => openService());
  $("#closeServiceModalButton")?.addEventListener("click", closeServiceModal);
  $("#resetServiceForm").addEventListener("click", closeServiceModal);
  $("#serviceRequiresServiceId")?.addEventListener("change", syncServiceDependencyFields);
  $("#removeServiceButton")?.addEventListener("click", () => {
    const id = $("#serviceForm")?.elements.id.value;
    const record = readRecords("service").find((item) => item.id === id && !item.removed);
    if (record) openServiceRemoveConfirm(record);
  });
  $("#servicePricingTabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-service-pricing-filter]");
    if (!button) return;
    setServicePricingFilter(button.dataset.servicePricingFilter || "all");
  });
  $("#serviceSearch").addEventListener("input", renderServices);
  $("#serviceTableHead").addEventListener("click", (event) => {
    const header = event.target.closest("[data-sort-column]");
    if (header) setTableSort("service", header.dataset.sortColumn);
  });
  $("#serviceTableBody").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="edit-service"]');
    if (!button) return;
    const record = readRecords("service").find((item) => item.id === button.dataset.id && !item.removed);
    if (record) openService(record);
  });
  $("#serviceTableBody").addEventListener("dblclick", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openService(readRecords("service").find((record) => record.id === row.dataset.id));
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
      const sourceBoardingDogId = boardingDogIdFromCustomerDogValue(data.sourceBoardingDogId || existing.sourceBoardingDogId || "");
      const linkedBoardingDogId = boardingDogIdFromCustomerDogValue(data.linkedBoardingDogId || existing.linkedBoardingDogId || sourceBoardingDogId);
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
        secondaryOwnerEmail: normalizeEmail(data.secondaryOwnerEmail),
        sourceBoardingDogId,
        linkedBoardingDogId,
        profilePhotoUrl: photo.profilePhotoUrl,
        profilePhotoPath: photo.profilePhotoPath,
        profilePhotoData: photo.profilePhotoData,
        vaccinationRecords: [...(existing.vaccinationRecords || []), ...vaccinationUploads],
        vaccinationFiles: [...(existing.vaccinationRecords || []), ...vaccinationUploads].map((file) => file.name).join(", "),
        removed: false,
      };
      const record = upsertRecord("customerDog", payload);
      await sendPayload(record);
      const boardingRecordId = boardingDogIdFromCustomerDogValue(record.sourceBoardingDogId || record.linkedBoardingDogId);
      if (boardingRecordId && (currentRole() === "admin" || customerDogVisibleToCustomer(record))) {
        const boarding = readRecords("boardingDog").find((item) => item.id === boardingRecordId && !item.removed);
        if (boarding && (currentRole() === "admin" || boardingDogVisibleToCustomer(boarding))) {
          const linkedBoarding = upsertRecord("boardingDog", boardingDogWithCustomerProfilePatch(boarding, record));
          await sendPayload(linkedBoarding);
        }
      }
      if (vaccinationUploads.length || (photo.profilePhotoUrl && photo.profilePhotoUrl !== (existing.profilePhotoUrl || ""))) {
        await notifyIfNeeded(record, "customerDogFileUploaded");
      }
      await ensureCustomerAccessProfile({
        email: record.customerEmail || record.ownerEmail,
        name: record.ownerName,
        customerDogId: record.id,
      });
      resetCustomerDogForm();
      closeCustomerDogModal();
      renderCustomerDogs();
      renderCustomerFiles();
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
  $("#openCustomerDogModalButton")?.addEventListener("click", () => openCustomerDogModal());
  $("#closeCustomerDogModalButton")?.addEventListener("click", closeCustomerDogModal);
  $("#newCustomerDogButton").addEventListener("click", () => {
    resetCustomerDogForm();
    closeCustomerDogModal();
  });
  $("#openCustomerBoardingRequestButton")?.addEventListener("click", () => openCustomerBookingModal("boarding"));
  $("#openCustomerServiceRequestButton")?.addEventListener("click", () => openCustomerBookingModal("service"));
  $("#closeCustomerBookingModalButton")?.addEventListener("click", resetCustomerBookingForm);
  $("#customerRequestAddDogButton")?.addEventListener("click", () => {
    switchPage("customerPage");
    openCustomerDogModal();
  });
  $("#customerBookingForm").addEventListener("change", (event) => {
    if (event.target.name === "customerServices") {
      const quantityInput = formFieldByName($("#customerBookingForm"), `serviceQuantity-${event.target.value}`);
      if (quantityInput) {
        quantityInput.disabled = !event.target.checked;
        if (event.target.checked && !quantityInput.value) quantityInput.value = "1";
      }
      const service = readRecords("service").find((item) => item.id === event.target.value);
      if (serviceHasDependentServices(service)) renderCustomerServiceOptions();
    }
    if (event.target.id === "customerSharedCrateRequested") renderCustomerCrateShareOptions();
    if (event.target.name === "customerStayProgram") {
      renderCustomerCrateShareOptions();
      renderCustomerServiceOptions();
    }
    updateCustomerEstimate();
  });
  $("#customerBookingForm").addEventListener("input", (event) => {
    if (event.target.classList.contains("service-quantity")) updateCustomerEstimate();
  });
  $("#customerBookingDogList").addEventListener("change", () => {
    validateCustomerDogSelection({ focus: false });
    renderCustomerCrateShareOptions();
    updateCustomerEstimate();
  });
  $("#customerBookingDogList").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="customer-add-dog-cta"]');
    if (button) {
      switchPage("customerPage");
      openCustomerDogModal();
    }
  });
  $("#customerDogList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "add-customer-dog-inline") {
      openCustomerDogInline();
      return;
    }
    if (button.dataset.action === "add-another-customer-dog") {
      openCustomerDogModal();
      return;
    }
    if (button.dataset.action === "book-customer-stay" || button.dataset.action === "open-customer-boarding-request") {
      switchPage("customerRequestsPage");
      openCustomerBookingModal("boarding");
      return;
    }
    if (button.dataset.action === "edit-customer-dog-inline") {
      const record = editableCustomerDogForCurrentUser(button.dataset.id, button.dataset.boardingId || "");
      if (!record) {
        showToast("This dog profile could not be opened for editing.");
        return;
      }
      openCustomerDogInline(record);
      return;
    }
    if (button.dataset.action === "view-customer-request") {
      const boarding = readRecords("boardingDog").find((item) => item.id === boardingDogIdFromCustomerDogValue(button.dataset.id) && !item.removed);
      if (boarding) openCustomerRequestDetail(boarding);
      return;
    }
    if (button.dataset.action === "edit-customer-dog") {
      openEditableCustomerDogById(button.dataset.id, button.dataset.boardingId || "");
      return;
    }
    if (button.dataset.action === "remove-customer-dog") {
      const record = readRecords("customerDog").find((item) => item.id === button.dataset.id && !item.removed && customerDogVisibleToCustomer(item));
      if (!record) return;
      openCustomerDogRemoveConfirm(record);
    }
  });
  $("#customerRequestStatusFilter").addEventListener("change", renderCustomerRequests);
  $("#customerFilesList")?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="view-customer-agreement"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openCustomerAgreementDetail(button.dataset.id || "");
  });
  $("#customerRequestList").addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (actionButton?.dataset.action === "edit-customer-request") {
      event.stopPropagation();
      editCustomerRequest(boardingDogRecordForDisplay(actionButton.dataset.id), boardingStayReferenceFromAction(actionButton));
      return;
    }
    if (actionButton?.dataset.action === "cancel-customer-request") {
      event.stopPropagation();
      const record = boardingDogRecordForDisplay(actionButton.dataset.id);
      if (!record) return;
      const reference = boardingStayReferenceFromAction(actionButton);
      const updated = actionButton.dataset.stayId
        ? await saveBoardingStayStatusTransition(record, reference.stayId, "Cancelled", reference)
        : await saveBoardingStatusTransition(record, "Cancelled");
      if (!updated) return;
      renderCustomerRequests();
      renderBoardingDogs();
      renderBoardingRequests();
      showDetailDialog("Request Cancelled", `<p>${escapeHtml(record.dogName || "This request")} has been cancelled.</p>`);
      return;
    }
    const card = event.target.closest('[data-action="view-customer-request"]');
    if (!card) return;
    const record = boardingDogRecordForDisplay(card.dataset.id);
    if (record) openCustomerRequestDetail(record, boardingStayReferenceFromAction(card));
  });
  $("#customerBookingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = event.submitter || event.currentTarget.querySelector('[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.textContent = "Reviewing…";
    }
    try {
      const dropoffField = formFieldByName(event.currentTarget, "dropoffTime");
      const pickupField = formFieldByName(event.currentTarget, "pickupTime");
      if ($("#customerRequestMode")?.value === "service" && dropoffField?.value && !pickupField?.value) {
        pickupField.value = dropoffField.value;
      }
      if (!validateCustomerDogSelection()) return;
      if (!validateForm(event.currentTarget)) return;
      if (!validateCustomerBookingAvailability(event.currentTarget)) return;
      const estimate = customerEstimateDetails();
      if (!estimate.dogs.length) {
        showToast("Select at least one dog for the boarding request.");
        return;
      }
      showBookingConfirmDialog(estimate);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || "Review Request";
        delete submitButton.dataset.originalText;
      }
    }
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
  $("#openUrgentStaffAlertButton")?.addEventListener("click", () => openUrgentAlertPopup("staff"));
  $("#openUrgentCustomerAlertButton")?.addEventListener("click", () => openUrgentAlertPopup("customer"));
  $("#openCustomizeAlertsButton")?.addEventListener("click", () => openAlertPreferencePopup());
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
    const tab = event.target.closest("[data-kennel-building-tab]");
    if (!tab) return;
    kennelBuildingTab = tab.dataset.kennelBuildingTab || "Shed";
    renderKennelLocations();
  });
  $("#kennelBuildingActionRow")?.addEventListener("click", (event) => {
    const action = event.target.closest('[data-action="remove-kennel-building-tab"]');
    if (action) openKennelBuildingRemoveConfirm(action.dataset.building);
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
  $("#operationHoursList")?.addEventListener("change", (event) => {
    const toggle = event.target.closest("[data-operation-open]");
    if (!toggle) return;
    const card = toggle.closest(".operation-day-card");
    card?.querySelectorAll("[data-operation-open-time], [data-operation-close-time]").forEach((field) => {
      field.disabled = !toggle.checked;
    });
  });
  $("#saveOperationHoursButton")?.addEventListener("click", saveOperationHoursSettings);
  $("#resetOperationHoursButton")?.addEventListener("click", resetOperationHoursSettings);
  $("#prevOperationMonthButton")?.addEventListener("click", () => {
    const current = new Date(`${operationCalendarMonth}-01T12:00:00`);
    current.setMonth(current.getMonth() - 1);
    operationCalendarMonth = localDateKey(current).slice(0, 7);
    renderOperationHoursSettings();
  });
  $("#nextOperationMonthButton")?.addEventListener("click", () => {
    const current = new Date(`${operationCalendarMonth}-01T12:00:00`);
    current.setMonth(current.getMonth() + 1);
    operationCalendarMonth = localDateKey(current).slice(0, 7);
    renderOperationHoursSettings();
  });
  $("#operationOverrideCalendar")?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="open-operation-date-override"]');
    if (button) openOperationDateOverridePopup(button.dataset.date);
  });
  $("#operationOverrideList")?.addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="open-operation-date-override"]');
    if (button) openOperationDateOverridePopup(button.dataset.date);
  });
}

function switchPage(pageId) {
  pageId = normalizePageId(pageId);
  if (!pageAllowed(pageId)) {
    showToast(helperIsLoggedIn() ? "Your login does not have access to that page." : "Sign in first.");
    const fallback = helperIsLoggedIn() ? defaultPageForRole(currentRole()) : "loginPage";
    pageId = pageAllowed(fallback) ? fallback : "loginPage";
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
  if (pageId === "boardingDogsPage") {
    boardingViewMode = window.innerWidth >= 768 ? "list" : "board";
    handleBoardingViewToggle(boardingViewMode);
  }
  syncMobileNavigationActive(pageId);
  setMobileMoreOpen(false);
  document.body.classList.toggle("is-login-view", pageId === "loginPage" && !helperIsLoggedIn());
  if (pageId === "ourDogsPage") window.setTimeout(() => $("#ownedDogSearch")?.focus(), 100);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureAppShellVisible(reason = "") {
  const wasBooting = document.body.classList.contains("is-auth-booting");
  if (wasBooting) document.body.classList.remove("is-auth-booting");
  recoverStaleAuthSync(reason);
  if (remoteLoadInProgress && remoteLoadStartedAt && Date.now() - remoteLoadStartedAt > REMOTE_LOAD_STALE_MS) {
    console.warn(`Recovering stale remote load${reason ? ` after ${reason}` : ""}.`);
    remoteLoadInProgress = false;
    remoteLoadStartedAt = 0;
    if (syncNowButton) syncNowButton.disabled = false;
  }
  updateNavigationAccess();
  const activeId = activePageId();
  const activePage = document.getElementById(activeId);
  const needsPageRepair = !activePage?.classList.contains("is-active") || !pageAllowed(activeId) || (helperIsLoggedIn() && activeId === "loginPage");
  if (needsPageRepair) {
    const fallback = helperIsLoggedIn() ? rememberedPageForRole(currentRole()) : "loginPage";
    switchPage(pageAllowed(fallback) ? fallback : "loginPage");
  } else {
    document.body.classList.toggle("is-login-view", activeId === "loginPage" && !helperIsLoggedIn());
    syncMobileNavigationActive(activeId);
  }
  if (wasBooting && helperIsLoggedIn()) renderAllRecords();
}

function scheduleAppResumeRecovery(reason = "resume") {
  if (appResumeTimer) window.clearTimeout(appResumeTimer);
  appResumeTimer = window.setTimeout(() => {
    appResumeTimer = null;
    resumeAppFromLifecycle(reason);
  }, 150);
}

async function resumeAppFromLifecycle(reason = "resume") {
  if (!appInitialized && reason !== "pageshow-bfcache") return;
  const now = Date.now();
  if (now - lastAppResumeAt < APP_RESUME_DEBOUNCE_MS) return;
  lastAppResumeAt = now;
  ensureAppShellVisible(reason);
  if (!helperIsLoggedIn()) {
    const restored = await restoreSupabaseSession();
    if (restored) {
      renderAllRecords();
      ensureAppShellVisible(`${reason}:session-restored`);
    }
    return;
  }
  if (supabaseClient && !localTestMode && !remoteLoadInProgress && now - lastRemoteLoadFinishedAt > APP_RESUME_REMOTE_REFRESH_MS) {
    loadRemoteRecords({ render: true }).catch((error) => {
      console.warn("Resume sync failed.", error);
    });
  }
}

async function initializeApp() {
  document.body.classList.add("is-auth-booting");
  let renderedDuringSessionRestore = false;
  try {
    initSupabaseClient();
    ensureTaskConfig();
    setDefaultDateAndDay();
    $("#dashboardDate").value = todayDate();
    seedDefaultServices();
    seedDefaultCfoNotes();
    seedDefaultKennelLocations();
    seedDefaultKennelBuildings();
    seedDefaultOperationHours();
    updateConditionalSections();
    updateRotationBanner();
    updateCompletionCount();
    updateTimeDisplays();
    renderDailyTaskLists();
    setupRequiredFields();
    initEvents();
    showAuthRedirectError();
    hydrateLoginFromUrl();
    if (!helperIsLoggedIn()) {
      const restoredFromSupabase = await restoreSupabaseSession();
      renderedDuringSessionRestore = restoredFromSupabase;
      if (!restoredFromSupabase && !restoreSession()) {
        clearLocalAppSession({ switchToLogin: false });
      }
    }
    updateNavigationAccess();
    if (helperIsLoggedIn()) {
      if (!renderedDuringSessionRestore) renderAllRecords();
      switchPage(rememberedPageForRole(currentRole()));
      requirePasswordChangeIfNeeded();
    } else {
      switchPage("loginPage");
    }
  } catch (error) {
    console.error("App startup recovered after an error.", error);
    const cachedUser = cachedSupabaseSessionUser();
    if (!helperIsLoggedIn() && cachedUser) {
      setHelper(cachedUser, { switchAfterLogin: false, render: false });
      renderAllRecords();
      switchPage(rememberedPageForRole(currentRole()));
      showToast("The app restored from saved login. Sync will retry when the connection is ready.");
    } else if (!helperIsLoggedIn()) {
      clearLocalAppSession({ switchToLogin: false });
      switchPage("loginPage");
    } else {
      renderAllRecords();
      switchPage(rememberedPageForRole(currentRole()));
    }
  } finally {
    appInitialized = true;
    ensureAppShellVisible("startup");
    document.body.classList.remove("is-auth-booting");
  }
}

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
