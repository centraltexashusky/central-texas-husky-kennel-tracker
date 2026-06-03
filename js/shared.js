// === MODULE: SHARED ===
const __snuggleStayModuleSource = `// === MODULE: SHARED ===
var SUPABASE_URL = "https://vwvkzniygessvwifrwvn.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_IeKmeCMalVYUnYQUe3gEew_NdjAzmAQ";
var MEDIA_BUCKET = "kennel-media";
var MAX_MEDIA_UPLOAD_MB = 50;
var MAX_MEDIA_UPLOAD_BYTES = MAX_MEDIA_UPLOAD_MB * 1024 * 1024;
var IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png"];
var VIDEO_UPLOAD_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
var CUSTOMER_UPDATE_MEDIA_TYPES = [...IMAGE_UPLOAD_TYPES, ...VIDEO_UPLOAD_TYPES];
var CUSTOMER_UPDATE_MEDIA_EXTENSIONS = [".jpg", ".jpeg", ".png", ".mp4", ".mov", ".webm", ".m4v"];
var VACCINATION_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png"];
var DOG_DOCUMENT_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
var APP_PRODUCTION_URL = "https://kennel.centraltexashusky.com/";
var APP_WIX_EMBED_URL = "https://www.centraltexashusky.com/kennel-tracker";
var APP_AUTH_REDIRECT_URL = APP_PRODUCTION_URL;
var TASK_TEMPLATE_RECORD_TYPE = "dailyTaskTemplate";
var TASK_TEMPLATE_RECORD_ID = "daily-task-template";

var $ = (selector) => document.querySelector(selector);
var $$ = (selector) => [...document.querySelectorAll(selector)];
function cssEscapeValue(value = "") {
  const text = String(value || "");
  if (globalThis.CSS?.escape) return CSS.escape(text);
  return text.replace(/["\\\\]/g, "\\\\$&");
}

var form = $("#kennelForm");
var modeLabel = $("#modeLabel");
var daySelect = $("#dayOfWeek");
var mondaySection = $("#mondaySection");
var tuesdaySection = $("#tuesdaySection");
var helperName = $("#helperName");
var helperEmail = $("#helperEmail");
var helperKey = $("#helperKey");
var loginStatus = $("#loginStatus");
var loginHelp = $("#loginHelp");
var syncNowButton = $("#syncNowButton");
var headerUserName = $("#headerUserName");
var headerLogoutButton = $("#headerLogoutButton");
var syncIntervalId = null;
var remoteLoadInProgress = false;
var lastRemoteRecordsSignature = null;
var deferredRemoteRenderTimer = null;
var lastUserScrollAt = 0;
var currentUser = null;
var impersonationSession = null;
var supabaseClient = null;
var detailDialogContext = null;
var pendingCustomerBooking = null;
var customerBookingSubmitInProgress = false;
var pendingBoardingCheckIn = null;
var activeClockIn = JSON.parse(localStorage.getItem("cth-active-clock-in") || "null") || "";
var localTestMode = false;
var dailyTaskTab = "morning";
var dailyTaskTabPointerDrag = null;
var suppressDailyTaskTabClick = false;
var dashboardAlertFilter = "All";
var dashboardShowAllAlerts = false;
var timesheetTab = "clock";
var timesheetFilterStart = "";
var timesheetFilterEnd = "";
var scheduleWeekDate = todayDate();
var operationCalendarMonth = todayDate().slice(0, 7);
var settingsUserTab = "admin";
var settingsUserSort = { key: "name", direction: "asc" };
var servicePricingFilter = "all";
var kennelBuildingTab = "Shed";
var boardingDogRosterFilter = "Active dogs";
var boardingDogPriorityFilter = "";
var boardingViewMode = "board";
var showRemainingTasksOnly = true;
var selectedDogPhotos = { owned: null, boarding: null, customer: null };
var ownedDogCareFilter = "All";
var pendingStructuredCareLogs = [];
var mediaZoomLevel = 1;
var activeServiceInfoIcon = null;
var serviceInfoTooltipEl = null;
var signedMediaUrlCache = new Map();
var customerProfileSyncInProgress = false;
var authSessionSyncPromise = null;
var authSessionSyncStartedAt = 0;
var suppressAuthSyncUntil = 0;
var taskTemplateSyncTimer = null;
var applyingRemoteTaskConfig = false;
var REMOTE_RENDER_SCROLL_IDLE_MS = 1200;
var REMOTE_LOAD_STALE_MS = 15000;
var AUTH_BOOT_TIMEOUT_MS = 8000;
var AUTH_SYNC_STALE_MS = 15000;
var APP_RESUME_DEBOUNCE_MS = 900;
var APP_RESUME_REMOTE_REFRESH_MS = 30000;
var remoteLoadStartedAt = 0;
var lastRemoteLoadFinishedAt = 0;
var appInitialized = false;
var appResumeTimer = null;
var lastAppResumeAt = 0;
var showReadNotifications = false;
var visibleReadNotificationCount = 4;
var MAX_READ_NOTIFICATIONS = 10;

var careDefaults = {
  exerciseFrequencyDays: 0,
  trainingFrequencyDays: 0,
  bathIntervalDays: 0,
  heatCycleLengthDays: 183,
  heatExpectedSoonDays: 21,
  heatInHeatDays: 21,
};

var bathCareDefaultNote = "Ultimate shampoo, nailed trimed, paws trimmed, and ears cleaned";
var heatCareDefaultNote = "something important about the heat.";
var medicalCareDefaultNote = "injury to leg, fighting with others...";
var medicalCarePlaceholder = "injury to leg, fighting with others...";
var autoCareNotes = new Set([bathCareDefaultNote, heatCareDefaultNote, medicalCareDefaultNote, ""]);
var taskShiftLabels = {
  morning: "Morning",
  pm: "Evening",
  weekly: "Monday",
  tuesday: "Tuesday",
  monthly: "Monthly",
};
var defaultTaskTabMeta = [
  { id: "morning", label: "Morning", system: true },
  { id: "pm", label: "Evening", system: true },
  { id: "weekly", label: "Mondays", system: true },
  { id: "tuesday", label: "Tuesdays", system: true },
  { id: "monthly", label: "Monthly", system: true },
];
var mobilePrimaryPageIds = ["dashboardPage", "dailyPage", "timesheetPage", "customerPage", "customerRequestsPage", "customerUpdatesPage", "customerFilesPage"];
var mobilePrimaryPageSet = new Set(mobilePrimaryPageIds);
var mobileMoreMenuItems = [
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
var settingsPageIds = new Set(["settingsUsersPage", "settingsKennelLocationsPage", "settingsHoursPage", "servicesPage", "settingsAlertsPage", "settingsAuditLogPage"]);
var operationWeekdays = [
  { key: "monday", label: "Monday", shortLabel: "Mon", dayIndex: 1 },
  { key: "tuesday", label: "Tuesday", shortLabel: "Tue", dayIndex: 2 },
  { key: "wednesday", label: "Wednesday", shortLabel: "Wed", dayIndex: 3 },
  { key: "thursday", label: "Thursday", shortLabel: "Thu", dayIndex: 4 },
  { key: "friday", label: "Friday", shortLabel: "Fri", dayIndex: 5 },
  { key: "saturday", label: "Saturday", shortLabel: "Sat", dayIndex: 6 },
  { key: "sunday", label: "Sunday", shortLabel: "Sun", dayIndex: 0 },
];
var defaultOperationOpenTime = "09:00";
var defaultOperationCloseTime = "21:00";

var alertTypeDefinitions = [
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
var adminDefaultAlertTypes = new Set([
  "customerBoardingRequestCreated",
  "customerBoardingRequestUpdated",
  "customerDogFileUploaded",
  "urgentKennelRequestCreated",
  "urgentMaintenanceCreated",
  "timeOffRequested",
  "urgentStaffAlertSent",
  "urgentCustomerAlertSent",
]);
var staffDefaultAlertTypes = new Set(["timeOffReviewed", "schedulePublished", "scheduleChangedAfterPublish", "urgentStaffAlertSent"]);

var boardingLifecycleStatuses = ["Pending", "Approved", "Checked In", "In Kennel", "Ready For Pickup", "Checked Out", "Cancelled"];
var activeBoardingStayStatuses = ["Checked In", "In Kennel", "Ready For Pickup"];
var boardingStatusTransitions = {
  Pending: ["Approved", "Cancelled"],
  Approved: ["Checked In", "Cancelled"],
  "Checked In": ["Approved", "In Kennel"],
  "In Kennel": ["Approved", "Checked In", "Ready For Pickup"],
  "Ready For Pickup": ["In Kennel", "Checked Out"],
  "Checked Out": [],
  Cancelled: [],
};

var defaultDailyTasks = {
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

var defaultManagedTasks = {
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

var stateKeys = {
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

var BOARDING_MEMBER_PRIMARY_RATE = 45;
var BOARDING_MEMBER_SHARED_CRATE_RATE = 35;
var BOARDING_NON_MEMBER_RATE = 65;
var BOARDING_MAX_DOGS_PER_CRATE = 2;

var defaultServices = [
  { serviceName: "Companion Puppy Placement", category: "Puppy placement", basePrice: "1800", unit: "per puppy", depositAmount: "500", defaultDuration: "", flags: ["Active", "Admin only"], pricingNotes: "Recommended range $1,500-$2,200 for standard companion puppies." },
  { serviceName: "Older Puppy Hold Deposit", category: "Deposit", basePrice: "500", unit: "flat deposit", depositAmount: "500", defaultDuration: "3-7 day hold", flags: ["Active", "Admin only"], pricingNotes: "Lower friction than a 50% reservation while still confirming intent." },
  { serviceName: "Private Yard Rental", category: "Private yard rental", basePrice: "12", unit: "per dog/hour", depositAmount: "", defaultDuration: "60 minutes", flags: ["Active", "Owner bookable later", "Vaccine proof required"], pricingNotes: "Test $10-$12 per dog/hour first; premium slots can be $15-$20." },
  { serviceName: "Husky De-shed", category: "Grooming", basePrice: "75", unit: "per service", depositAmount: "", defaultDuration: "60-90 minutes", flags: ["Active"], pricingNotes: "Price as labor-intensive coat work, not a small bath add-on." },
  { serviceName: "Treadmill Exercise", category: "Exercise", basePrice: "25", unit: "per session", depositAmount: "", defaultDuration: "30 minutes", flags: ["Active"], pricingNotes: "Good add-on for boarding/alumni care." },
  { serviceName: "Member Overnight Care", category: "Boarding", basePrice: "65", unit: "per night", depositAmount: "100", defaultDuration: "overnight", flags: ["Active", "Member Pricing", "Vaccine proof required"], pricingNotes: "Member pricing for approved customer accounts while capacity, insurance, and procedures are proven." },
];

var defaultCfoNotes = [
  { title: "Older puppy pricing", note: "Current $2,500 pricing should show clear proof of value: training, health records, temperament, AKC status, and included support." },
  { title: "Deposit guardrail", note: "Review deposits above $500 or 20% of purchase price before using them publicly." },
  { title: "Private yard rental", note: "Start around $10-$12 per dog/hour; test premium $15-$20 blocks when shade, water, privacy, and photo-friendly features are ready." },
];

var defaultKennelLocations = [
  { building: "Mansion", name: "Mansion 1", active: "on" },
  { building: "Mansion", name: "Mansion 2", active: "on" },
  { building: "Mansion", name: "Mansion 3", active: "on" },
  { building: "Shed", name: "Shed 1", active: "on" },
  { building: "Shed", name: "Shed 2", active: "on" },
  { building: "Shed", name: "Shed 3", active: "on" },
];

var tableColumns = {
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
  return \`\${prefix}-\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
}

function localDateKey(value = new Date()) {
  const source = value instanceof Date ? value : new Date(String(value).includes("T") ? value : \`\${value}T12:00:00\`);
  if (Number.isNaN(source.getTime())) return "";
  const year = source.getFullYear();
  const month = String(source.getMonth() + 1).padStart(2, "0");
  const day = String(source.getDate()).padStart(2, "0");
  return \`\${year}-\${month}-\${day}\`;
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
  const dayName = new Date(\`\${sourceDate}T12:00:00\`).toLocaleDateString("en-US", { weekday: "long" });
  if ([...daySelect.options].some((option) => option.value === dayName)) {
    daySelect.value = dayName;
  }
}

function addMonths(dateString, monthsToAdd) {
  if (!dateString) return "";
  const date = new Date(\`\${dateString}T12:00:00\`);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, daysToAdd) {
  if (!dateString) return "";
  const date = new Date(\`\${dateString}T12:00:00\`);
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value) {
  if (!value) return "";
  return localDateKey(value);
}

function dateOnlyTime(value) {
  const date = dateOnly(value);
  return date ? new Date(\`\${date}T12:00:00\`).getTime() : 0;
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

// Extracted to js/daily.js: careDueFromDate


// Extracted to js/daily.js: ownedDogExerciseDue


// Extracted to js/daily.js: ownedDogTrainingDue


// Extracted to js/daily.js: ownedDogBathDue


function nextBathFromFrequency(lastBath = "", intervalDays = 0) {
  return lastBath && Number(intervalDays || 0) > 0 ? addDays(lastBath, intervalDays) : "";
}

// Extracted to js/daily.js: ownedDogHeatStatus


// Extracted to js/daily.js: ownedDogDisplayName


// Extracted to js/daily.js: ownedDogCareSummary


// Extracted to js/daily.js: ownedDogHasCareNote


// Extracted to js/daily.js: ownedDogMatchesCareFilter


// Extracted to js/boarding.js: statusChipHtml


// Extracted to js/settings.js: normalizedServiceFlags


// Extracted to js/settings.js: serviceHasFlag


// Extracted to js/notifications.js: normalizeEmail


// Extracted to js/notifications.js: uniqueEmails


// Extracted to js/settings.js: serviceFlagChipsHtml


// Extracted to js/settings.js: serviceChipsHtml


function isMemberUser(user = currentUser) {
  if (!user) return false;
  const profile = savedUserFor(user) || {};
  return profile.isMember === true || profile.isMember === "on" || profile.isMember === "true" || profile.member === true
    || user.isMember === true || user.isMember === "on" || user.isMember === "true" || user.member === true;
}

// Extracted to js/boarding.js: dogTypeBadgeHtml


// === MODULE: BOARDING ===
// Extracted to js/boarding.js: normalizeBoardingStatus


// Extracted to js/boarding.js: statusClassForBoardingStatus


// Extracted to js/boarding.js: boardingStatusChipHtml


// Extracted to js/customer.js: customerRequestStatusLabel


// Extracted to js/customer.js: customerRequestStatusChipHtml


// Extracted to js/customer.js: customerRequestStayStatusChipHtml


// Extracted to js/boarding.js: boardingStayStatusChipHtml


// Extracted to js/boarding.js: boardingStayRequestCodeChipHtml


// Extracted to js/customer.js: customerStayIdChipHtml


// Extracted to js/boarding.js: boardingStayDataAttrs


// Extracted to js/boarding.js: boardingStayStatusButtonHtml


// Extracted to js/boarding.js: boardingRecordStatusButtonHtml


// Extracted to js/boarding.js: boardingKennelLocationLabel


// Extracted to js/boarding.js: transitionLabel


// Extracted to js/boarding.js: stayTransitionLabel


// Extracted to js/boarding.js: canTransitionBoardingStatus


// Extracted to js/boarding.js: boardingTransitionActions


// Extracted to js/boarding.js: boardingStayTransitionActions


function isFutureDateTime(value, date = new Date()) {
  const target = new Date(value);
  return !Number.isNaN(target.getTime()) && target > date;
}

// Extracted to js/boarding.js: boardingStatusTargetStay


function mergeStayRequestLabels(existing = [], additions = []) {
  return [...new Set([...(existing || []), ...(additions || [])].filter(Boolean))];
}

// Extracted to js/boarding.js: boardingStatusScopedStays


// Extracted to js/boarding.js: boardingSummaryStatusFromStays


// Extracted to js/boarding.js: boardingTransitionIsEarly


// Extracted to js/boarding.js: withBoardingStatusTransition


// Extracted to js/boarding.js: approveBoardingRecord


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

// Extracted to js/boarding.js: boardingStayDisplayStatus


// Extracted to js/boarding.js: boardingPrimaryStay


// Extracted to js/boarding.js: boardingDisplayStatus


// Extracted to js/boarding.js: boardingDogWithStayStatus


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
  return \`\${date.getFullYear()}-\${pad(date.getMonth() + 1)}-\${pad(date.getDate())}T\${pad(date.getHours())}:\${pad(date.getMinutes())}\`;
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

// Extracted to js/daily.js: taskTemplateId


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
  return \`custom-\${String(label || "task-tab").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "task-tab"}-\${Date.now().toString(36)}\`;
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

// Extracted to js/daily.js: taskTemplatePayload


async function saveTaskTemplateConfig(config = readTaskConfig()) {
  if (localTestMode || !supabaseClient || currentRole() !== "admin") return null;
  return sendPayload(taskTemplatePayload(config));
}

// Extracted to js/timesheet.js: scheduleTaskTemplateSync


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

// Extracted to js/daily.js: taskTemplateRecordFromRows


function applyRemoteTaskTemplate(rows = []) {
  const template = taskTemplateRecordFromRows(rows);
  if (!template) return false;
  applyingRemoteTaskConfig = true;
  writeTaskConfig(normalizeTaskConfig(template.config || template), { syncRemote: false });
  applyingRemoteTaskConfig = false;
  return true;
}

// Extracted to js/settings.js: readTableConfig


// Extracted to js/settings.js: writeTableConfig


// Extracted to js/settings.js: saveCurrentUserTablePreferences


// Extracted to js/settings.js: readTableSort


// Extracted to js/settings.js: writeTableSort


// Extracted to js/settings.js: activeColumns


// Extracted to js/settings.js: renderColumnManager


// Extracted to js/settings.js: setTableSettingsPopoverOpen


// Extracted to js/settings.js: updateTableColumnConfig


// Extracted to js/settings.js: reorderTableColumn


// Extracted to js/settings.js: handleTableHeaderDragStart


// Extracted to js/settings.js: handleTableHeaderDragOver


// Extracted to js/settings.js: handleTableHeaderDrop


// Extracted to js/settings.js: handleTableHeaderDragEnd


// Extracted to js/settings.js: setTableSort


// Extracted to js/settings.js: sortRecordsForTable


// Extracted to js/settings.js: tableHeaderHtml


// === MODULE: AUTH ===
// Extracted to js/auth.js: supabaseReady


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
    "dog", "userDogAccess", "boardingReservation", "reservationService", "dogVaccination", "dogInternalNote", "dogActivityLog", "reservationCustomerUpdate", "dogClaimRequest", "legacyDogLink",
    "settingsUser", "cfoNote", "calendarNote", "kennelLocation", "kennelBuilding", "operationHours", "operationDateOverride", "auditLog", "staffSchedule", "timeOffRequest", "kennelHoliday", "scheduleTemplate", "schedulePublish", "notificationLog", "notificationPreference",
  ];
}

// === MODULE: SETTINGS ===
// Extracted to js/settings.js: settingsUsers


// Bootstrap: if no admin settingsUser records exist yet, grant access via
// Supabase Studio by inserting a settingsUser record with role: "admin"
// and the admin email. The app will pick it up on next load.
// Extracted to js/notifications.js: getAdminEmails


// Extracted to js/notifications.js: getOwnerAlertEmail


function savedUserFor(account = {}) {
  if (!account) return undefined;
  const email = normalizeEmail(account.email);
  return settingsUsers().find((user) => (user.authId && user.authId === account.key) || (user.alternateAuthIds || []).includes(account.key) || (email && normalizeEmail(user.email) === email));
}

// Extracted to js/auth.js: roleForAccount


// Extracted to js/auth.js: userFromSupabase


function isSupabaseUser() {
  return currentUser?.authProvider === "supabase";
}

function currentDbUserId() {
  return isSupabaseUser() ? currentUser.key : null;
}

// Extracted to js/auth.js: loginWithProvider


// Extracted to js/auth.js: authRedirectUrl


// Extracted to js/auth.js: showAuthRedirectError


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
    key: \`local-test-\${email || Date.now()}\`,
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
    \`<p>You are signed in locally as a \${escapeHtml(roleLabel(currentRole()).toLowerCase())} for UI testing. Remote Supabase login was not used\${reason ? \`: \${escapeHtml(reason)}\` : "."}</p><p>Changes will stay in this browser's local storage during this test session.</p>\`,
  );
}

// Extracted to js/auth.js: hydrateLoginFromUrl


// Extracted to js/notifications.js: adminEmailList


// Extracted to js/auth.js: activeSupabaseAdminSession


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
  return \`\${action}:\${String(email || "").toLowerCase()}\`;
}

// Extracted to js/auth.js: authThrottleWait


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
    role: existing.role || user.role || "customer",
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

// Extracted to js/settings.js: settingsUserRoleRank


// Extracted to js/settings.js: canonicalSettingsUser


// Extracted to js/settings.js: mergeSettingsUserRecords


// Extracted to js/customer.js: customerProfilePayload


// Extracted to js/notifications.js: removedSettingsUserForEmail


async function ensureCustomerAccessProfile(source = {}, options = {}) {
  const payload = customerProfilePayload(source);
  if (!payload) return null;
  if (!options.allowRemovedRecreate && removedSettingsUserForEmail(payload.email)) return null;
  const record = upsertRecord("settingsUser", payload);
  await sendPayload(record);
  return record;
}

// Extracted to js/notifications.js: consolidateDuplicateSettingsUsersByEmail


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

// Extracted to js/notifications.js: isEmailConfirmationError


function appTimeoutError(label = "Operation") {
  const error = new Error(\`\${label} timed out.\`);
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

// Extracted to js/auth.js: cachedSupabaseSessionUser


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
  console.warn(\`Recovering stale auth sync\${reason ? \` after \${reason}\` : ""}.\`);
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
    const refreshedUser = { ...user, role: roleForAccount(user) || user.role || "customer" };
    const profile = await ensureAppUserProfile(refreshedUser);
    const syncedUser = {
      ...refreshedUser,
      role: profile?.role || roleForAccount(refreshedUser),
      name: profile?.name || refreshedUser.name,
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

// Extracted to js/auth.js: loginWithPassword


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
    showDetailDialog("Please Wait", \`<p>Try again in \${Math.ceil(wait / 1000)} seconds.</p>\`);
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
        full_name: \`\${firstName} \${lastName}\`.trim(),
        role: "customer",
      },
    },
  });
  setSubmitState(button, false);
  if (error) {
    suppressAuthSyncUntil = 0;
    showDetailDialog(
      "Account Not Created",
      \`<p>\${escapeHtml(error.message)}</p><p>If this email already has an account, use the main sign-in form instead.</p>\`,
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
    \`<p>A confirmation email was sent to \${escapeHtml(email)}. Confirm the email first, then return here and sign in with your email and password.</p><p>Google sign-in is already authenticated by Google, so it does not use this email confirmation step.</p>\`,
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
    showDetailDialog("Please Wait", \`<p>Try again in \${Math.ceil(wait / 1000)} seconds.</p>\`);
    return;
  }
  const button = $("#sendRecoveryCodeButton");
  setSubmitState(button, true, "Sending...");
  markAuthAttempt("recovery", email);
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
  setSubmitState(button, false);
  if (error) {
    showDetailDialog("Reset Email Not Sent", \`<p>The password reset email could not be sent: \${escapeHtml(error.message)}</p>\`);
    return;
  }
  showDetailDialog(
    "Reset Email Sent",
    \`<p>A password reset email was sent to \${escapeHtml(email)}. Open the link in that email. It should return to \${escapeHtml(authRedirectUrl())} so the new password can be saved.</p>\`,
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
      \`<p>Use <strong>Send Reset Email</strong>, open the reset link from the email, then return here to save the new password. The reset link must open \${escapeHtml(authRedirectUrl())}.</p>\`,
    );
    return;
  }
  const button = formEl.querySelector('button[type="submit"]');
  setSubmitState(button, true, "Changing...");
  const { data: updateData, error: updateError } = await supabaseClient.auth.updateUser({ password });
  setSubmitState(button, false);
  if (updateError) {
    showDetailDialog("Password Not Changed", \`<p>\${escapeHtml(updateError.message)}</p>\`);
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

// Extracted to js/auth.js: requirePasswordChangeIfNeeded


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

// Extracted to js/auth.js: restoreSupabaseSession


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

// Extracted to js/settings.js: addAuditLog


function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\\n]/.test(text) ? \`"\${text.replace(/"/g, '""')}"\` : text;
}

function downloadCsv(filename, rows = []) {
  if (!rows.length) {
    showToast("No records available to export.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\\n");
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
  return [...targetForm.querySelectorAll(\`input[name="\${name}"]:checked\`)].map((input) => input.value);
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
  return ["image/jpeg", "image/png"].includes(type) || /\\.(jpe?g|png)$/.test(name);
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
  const safeFolder = String(folder || "uploads").replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\\/+|\\/+$/g, "");
  const path = \`users/\${userId}/\${safeFolder}/\${Date.now()}-\${safeName}\`;
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
  if ((file.size || 0) > MAX_MEDIA_UPLOAD_BYTES) return { url: "", error: \`Profile photos must be \${MAX_MEDIA_UPLOAD_MB} MB or smaller.\` };
  if (!supabaseClient) return { url: "", error: "The database connection is not available for photo upload." };
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  const { url, error, storagePath } = await uploadFileToSupabase(file, \`dog-photos/\${safeDogId}\`);
  return { url, error, storagePath };
}

async function durableDogPhoto(kind, existing, formData, photoInput, dogId) {
  const file = selectedPhotoFor(kind, photoInput);
  if (file) {
    const { url, error, storagePath } = await uploadDogPhotoToSupabase(file, dogId);
    if (url) return { profilePhotoUrl: url, profilePhotoPath: storagePath || "", profilePhotoData: "", photoError: "" };
    resetSelectedDogPhoto(kind, {});
    return { profilePhotoUrl: "", profilePhotoPath: "", profilePhotoData: "", photoError: error || "The profile photo could not be uploaded." };
  }
  if (formData.profilePhotoUrl) {
    return { profilePhotoUrl: formData.profilePhotoUrl, profilePhotoPath: formData.profilePhotoPath || existing.profilePhotoPath || "", profilePhotoData: "", photoError: "" };
  }
  if (existing.profilePhotoUrl) {
    return { profilePhotoUrl: existing.profilePhotoUrl, profilePhotoPath: existing.profilePhotoPath || "", profilePhotoData: "", photoError: "" };
  }
  return { profilePhotoUrl: "", profilePhotoPath: "", profilePhotoData: "", photoError: "" };
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
    showToast(\`\${rejectedCount} \${label}\${rejectedCount > 1 ? "s were" : " was"} skipped because the file type is not supported.\`);
  }
  if (!acceptedFiles.length) return [];
  const now = new Date().toISOString();
  const oversized = acceptedFiles.filter((file) => (file.size || 0) > MAX_MEDIA_UPLOAD_BYTES);
  if (oversized.length) {
    showToast(\`Files over \${MAX_MEDIA_UPLOAD_MB} MB cannot be uploaded.\`);
  }
  if (!supabaseClient || !currentDbUserId()) {
    showToast("Sign in to upload files to the database.");
    return [];
  }
  showToast(\`Uploading \${acceptedFiles.length} file\${acceptedFiles.length > 1 ? "s" : ""}...\`);
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
          note: \`Not uploaded. Maximum file size is \${MAX_MEDIA_UPLOAD_MB} MB.\`,
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
        note: error ? \`Upload failed: \${error}\` : "",
      };
    }),
  );
  if (results.some((item) => item.note)) showToast("One or more files could not be uploaded.");
  return results.filter((item) => item.url || item.storagePath || item.dataUrl);
}

async function uploadVaccinationFiles(input, dogId) {
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  return uploadMediaFiles(input, \`vaccination-records/\${safeDogId}\`, {
    allowedTypes: VACCINATION_UPLOAD_TYPES,
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
    label: "vaccination record",
  });
}

async function uploadOwnedDogDocumentFiles(input, dogId) {
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  return uploadMediaFiles(input, \`owned-dog-documents/\${safeDogId}\`, {
    allowedTypes: DOG_DOCUMENT_UPLOAD_TYPES,
    allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"],
    label: "dog document",
  });
}

async function uploadBoardingDogDocumentFiles(input, dogId) {
  const safeDogId = String(dogId || uid("dog")).replace(/[^a-z0-9_-]/gi, "-");
  return uploadMediaFiles(input, \`boarding-dog-documents/\${safeDogId}\`, {
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
    const status = record.id ? \` | \${displayStatus}\` : "";
    const location = record.id && displayStatus === "In Kennel" ? \` | \${boardingKennelLocationLabel(record)}\` : "";
    const ownerText = $("#boardingDogHeaderOwner");
    if (ownerText) ownerText.textContent = \`\${owner}\${status}\${location}\`;
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
      \`\${record[elements.nameKey] || record.showName || "Dog"} profile photo\`,
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
    .split(/\\s+/)
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

// Extracted to js/auth.js: setHelper


function stopAutoSync() {
  if (!syncIntervalId) return;
  window.clearInterval(syncIntervalId);
  syncIntervalId = null;
}

// Extracted to js/auth.js: clearLocalAppSession


// Extracted to js/settings.js: impersonationUserFromSettings


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
  const admin = {
    ...currentUser,
    role: roleForAccount(currentUser) || currentUser.role || "admin",
  };
  const target = impersonationUserFromSettings(user);
  impersonationSession = {
    admin,
    target,
    returnPage: activePageId() || "settingsUsersPage",
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(stateKeys.impersonation, JSON.stringify(impersonationSession));
  $("#detailDialog")?.close();
  setHelper(target, { switchAfterLogin: false, persistSession: false });
  switchPage(defaultPageForRole(target.role));
  showToast(\`Viewing the app as \${target.name || target.email || "selected user"}.\`);
}

function stopUserImpersonation() {
  if (!isImpersonating()) return false;
  const session = impersonationSession;
  impersonationSession = null;
  localStorage.removeItem(stateKeys.impersonation);
  const admin = {
    ...session.admin,
    role: roleForAccount(session.admin) || session.admin?.role || "admin",
  };
  setHelper(admin, { switchAfterLogin: false });
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
    if (error) showToast(\`Logout could not finish with Supabase: \${error.message}\`);
  }
  clearLocalAppSession({ switchToLogin: true });
  suppressAuthSyncUntil = 0;
}

function updateHeaderUser() {
  const impersonating = isImpersonating();
  headerUserName.textContent = impersonating ? \`Impersonating \${currentUser?.name || currentUser?.email || "user"}\` : currentUser?.name || "Not signed in";
  modeLabel.textContent = currentUser ? (impersonating ? \`Admin view as \${roleLabel(currentUser.role)}\` : localTestMode ? "Local test mode" : \`\${roleLabel(currentUser.role)} account\`) : "Sign in to continue";
  headerLogoutButton.hidden = !currentUser;
  headerLogoutButton.textContent = impersonating ? "Stop Impersonation" : "Log out";
  headerLogoutButton.classList.toggle("stop-impersonation-button", impersonating);
  document.body.classList.toggle("role-helper", currentRole() === "helper");
  document.body.classList.toggle("role-admin", currentRole() === "admin");
  document.body.classList.toggle("role-customer", currentRole() === "customer");
  document.body.classList.toggle("is-impersonating", impersonating);
  renderNotifications();
}

// Extracted to js/auth.js: helperIsLoggedIn


// Extracted to js/auth.js: currentRole


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
  return $(\`.side-nav .nav-button[data-page="\${normalizePageId(pageId)}"]\`);
}

// Extracted to js/auth.js: pageAllowed


function pageIdFromHash() {
  const raw = normalizePageId(decodeURIComponent(window.location.hash || "").replace(/^#/, "").trim());
  if (!raw) return "";
  const page = document.getElementById(raw);
  return page?.classList.contains("page-view") ? raw : "";
}

// Extracted to js/auth.js: defaultPageForRole


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
            return \`<button type="button" class="mobile-more-menu-item mobile-more-item \${active ? "is-active" : ""}" data-page="\${escapeHtml(entry.pageId)}"\${active ? ' aria-current="page"' : ""}>\${escapeHtml(entry.label)}</button>\`;
          },
        )
        .join("")
    : \`<p class="mobile-more-empty">No additional pages are available for this login.</p>\`;
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

// Extracted to js/auth.js: restoreSession


function roleLabel(role = "") {
  if (role === "admin") return "Admin";
  if (role === "helper") return "Staff";
  return "Customer";
}

function getDeepCleanBuilding(date = new Date()) {
  const cleanDate = date instanceof Date ? date : new Date(\`\${dateOnly(date) || todayDate()}T12:00:00\`);
  const monthDelta = (cleanDate.getFullYear() - 2026) * 12 + cleanDate.getMonth() - 4;
  return Math.abs(monthDelta) % 2 === 0 ? "Dog Mansion" : "Dog Shed";
}

function monthlyDeepCleanBuildingForRecord(record = {}) {
  if (record.monthlyDeepCleanBuilding) return record.monthlyDeepCleanBuilding;
  if (record.deepCleanBuilding && record.deepCleanBuilding !== "Not applicable") return record.deepCleanBuilding;
  return getDeepCleanBuilding(record.date || record.submittedAt || todayDate());
}

function updateRotationBanner() {
  const selectedDate = form.elements.date.value ? new Date(\`\${form.elements.date.value}T12:00:00\`) : new Date();
  const monthLabel = selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  $("#rotationBanner").textContent = \`\${monthLabel} rotation: deep clean \${getDeepCleanBuilding(selectedDate)} during the first week.\`;
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
  if (summary) summary.textContent = \`\${completed} completed | \${remaining} still open\`;
}

function syncMobileReviewSections() {
  const details = $("#boardingRequestsDetails");
  if (!details) return;
  if (window.matchMedia("(max-width: 760px)").matches) details.removeAttribute("open");
  else details.setAttribute("open", "");
}

// === MODULE: DAILY ===
// Extracted to js/daily.js: taskInputName


// Extracted to js/daily.js: taskTabMeta


// Extracted to js/daily.js: taskTabLabel


// Extracted to js/daily.js: taskKey


function currentDailyDate() {
  return form?.elements.date?.value || todayDate();
}

// Extracted to js/daily.js: dailyTaskRecordId


// Extracted to js/daily.js: dailyTaskRecordsForDate


// Extracted to js/daily.js: dailyTaskRecordForDate


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
      const key = completion.taskId ? taskKey(completion.shift, completion.taskId) : \`\${completion.shift}:text:\${completion.taskText}\`;
      if (!byKey.has(key)) byKey.set(key, completion);
    });
  });
  return [...byKey.values()].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
}

// Extracted to js/daily.js: dailyTaskCompletionIndex


// Extracted to js/daily.js: taskArraysFromCompletions


function structuredCareLogsForDate(date = currentDailyDate()) {
  const byId = new Map();
  dailyTaskRecordsForDate(date).forEach((record) => {
    (record.structuredCareLogs || record.careLogs || []).forEach((log) => {
      byId.set(log.id || \`\${log.dogId}-\${log.careType}-\${log.date}-\${log.note}\`, log);
    });
  });
  return [...byId.values()].sort((a, b) => new Date(b.loggedAt || b.createdAt || 0) - new Date(a.loggedAt || a.createdAt || 0));
}

// Extracted to js/daily.js: dailyWorkPayload


async function saveDailyWorkPayload(payload) {
  const record = upsertRecord("dailyTask", payload);
  await sendPayload(record);
  await syncOwnedDogCareFromDailyReport(record);
  renderDailyTaskLists(record);
  renderDemoSubmissions();
  renderDashboard();
  return record;
}

// Extracted to js/daily.js: taskLabel


// Extracted to js/daily.js: ownedDogOptionsHtml


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
  if ($("#careQuickPhotos")) $("#careQuickPhotos").value = "";
  $("#careQuickDate").value = form?.elements.date?.value || todayDate();
  updateCareQuickFields();
}

function renderStructuredCareLogs() {
  const list = $("#structuredCareLogList");
  if (!list) return;
  list.innerHTML = pendingStructuredCareLogs.length
    ? pendingStructuredCareLogs
        .map((log) => {
          const details = [log.date, log.minutes ? \`\${log.minutes} minutes\` : "", log.note].filter(Boolean).join(" | ");
          const canModify = canModifyCareLog(log);
          const actions = canModify ? \`<div class="record-actions"><button type="button" class="secondary-button" data-action="edit-care-log" data-id="\${escapeHtml(log.id)}">Edit</button><button type="button" class="secondary-button danger-button" data-action="remove-care-log" data-id="\${escapeHtml(log.id)}">Remove</button></div>\` : "";
          return \`<article class="record-card compact-record-card"><strong>\${escapeHtml(log.dogName || "Dog")} - \${escapeHtml(log.careType || "Care")}</strong><p>\${escapeHtml(details || "No extra details")}</p><span>\${escapeHtml(log.completedBy || "")}</span>\${mediaLinkHtml(log)}\${actions}</article>\`;
        })
        .join("")
    : "<p>No structured care logs added to this daily report yet.</p>";
}

function canModifyCareLog(log = {}) {
  if (currentRole() === "admin") return true;
  const currentEmail = String(currentUser?.email || helperEmail.value || "").toLowerCase();
  return currentEmail && String(log.completedEmail || "").toLowerCase() === currentEmail;
}

// Extracted to js/daily.js: careLogEditFormHtml


function selectedCareDog() {
  const dogId = $("#careQuickDogId")?.value || "";
  return readRecords("ownedDog").find((record) => record.id === dogId && !record.removed) || null;
}

// Extracted to js/daily.js: careTypeIsExercise


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
  setCareFieldVisibility("#careQuickPhotosLabel", isBath || isHeat || isMedical || isTraining || !careType);
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
    showDetailDialog("Invalid Heat Entry", \`<p>Heat notes can only be logged for female dogs. \${escapeHtml(ownedDogDisplayName(dog))} is saved as \${escapeHtml(dog.sex || "not female")}.</p>\`);
    return;
  }
  if (careTypeIsExercise(careType) && Number($("#careQuickMinutes")?.value || 0) <= 0) {
    showToast("Enter exercise minutes before logging.");
    return;
  }
  if (["Bath", "Heat Note", "Medical/Behavior Note", "Training"].includes(careType) && !($("#careQuickDate")?.value || "")) {
    $("#careQuickDate").value = form?.elements.date?.value || todayDate();
  }
  const logDate = $("#careQuickDate")?.value || form?.elements.date?.value || todayDate();
  const mediaItems = await uploadMediaFiles($("#careQuickPhotos"), \`care-notes/\${dog.id}/\${logDate}\`, {
    allowedTypes: IMAGE_UPLOAD_TYPES,
    allowedExtensions: [".jpg", ".jpeg", ".png"],
    label: "care photo",
  });
  const log = buildStructuredCareLog(dog, {
    careType,
    minutes: $("#careQuickMinutes")?.value || "",
    note: $("#careQuickNote")?.value || "",
    date: logDate,
    mediaItems,
  });
  const record = await saveStructuredCareLog(log);
  resetCareQuickLogForm();
  showDetailDialog(
    \`\${careType} Logged\`,
    \`<div class="detail-row"><strong>Dog</strong><span>\${escapeHtml(log.dogName)}</span></div><div class="detail-row"><strong>Date</strong><span>\${escapeHtml(log.date)}</span></div>\${log.minutes ? \`<div class="detail-row"><strong>Minutes</strong><span>\${escapeHtml(log.minutes)}</span></div>\` : ""}\${log.note ? \`<div class="detail-row"><strong>Note</strong><span>\${escapeHtml(log.note)}</span></div>\` : ""}\${mediaLinkHtml(log)}<div class="detail-row"><strong>Saved by</strong><span>\${escapeHtml(log.completedBy || "Staff")}</span></div>\`,
  );
  return record;
}

function buildStructuredCareLog(dog, { careType, minutes = "", note = "", date = todayDate(), mediaItems = [] } = {}) {
  return {
    id: uid("care"),
    dogId: dog.id,
    dogName: ownedDogDisplayName(dog),
    careType,
    minutes,
    note,
    mediaItems: arrayValue(mediaItems),
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
    showToast(\`Already completed by \${completed.completedBy || "another staff member"}.\`);
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
  showToast(\`\${taskText} marked done.\`);
}

// Extracted to js/daily.js: removeDailyCareLog


// Extracted to js/daily.js: updateDailyCareLog


// Extracted to js/daily.js: renderDailyTaskTabs


// Extracted to js/daily.js: adminTaskTabDragEnabled


// Extracted to js/daily.js: taskTabDropPositionFromEvent


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

// Extracted to js/daily.js: taskTabButtonFromPoint


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

// Extracted to js/daily.js: resetDailyTaskTabPointerDrag


// Extracted to js/daily.js: taskTabDeleteRowHtml


function syncStaticTaskTabDeleteRows(config = readTaskConfig()) {
  const activeTabs = new Map(taskTabMeta(config).map((tab) => [tab.id, tab]));
  defaultTaskTabMeta.forEach((tab) => {
    const panelBody = document.querySelector(\`[data-task-panel="\${tab.id}"] .section-body\`);
    if (!panelBody) return;
    panelBody.querySelectorAll("[data-task-tab-delete-row]").forEach((row) => row.remove());
    if (activeTabs.has(tab.id)) panelBody.insertAdjacentHTML("beforeend", taskTabDeleteRowHtml(activeTabs.get(tab.id)));
  });
}

// Extracted to js/daily.js: customTaskPanelHtml


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
    event.dataTransfer.setData("text/plain", \`\${row.dataset.shift}:\${row.dataset.id}\`);
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

// Extracted to js/daily.js: dailyTaskDraftInputs


// Extracted to js/daily.js: dailyTaskDraftInputKey


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

// Extracted to js/daily.js: renderDailyTaskLists


// Extracted to js/daily.js: setDailyTaskTab


// Extracted to js/daily.js: taskTabFormHtml


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

// Extracted to js/daily.js: taskTabRemoveConfirmHtml


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

async function removeTask(shift, id) {
  const config = readTaskConfig();
  config[shift] = (config[shift] || []).filter((task) => task.id !== id);
  await persistTaskConfig(config);
  renderDailyTaskLists();
}

// Extracted to js/timesheet.js: addTaskToShift


async function addCustomTask() {
  const input = $("#newTaskText");
  if (input && await addTaskToShift("morning", input.value)) input.value = "";
}

async function addPmCustomTask() {
  const input = $("#newPmTaskText");
  if (input && await addTaskToShift("pm", input.value)) input.value = "";
}

async function addManagedTask(shift, inputSelector) {
  const input = $(inputSelector);
  if (input && await addTaskToShift(shift, input.value)) input.value = "";
}

async function addCustomTabTask(button) {
  const shift = button.dataset.shift || "";
  const input = $(\`[data-custom-task-input="\${shift}"]\`);
  if (input && await addTaskToShift(shift, input.value)) input.value = "";
}

// Extracted to js/daily.js: setOwnedFormLocked


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
    showToast(\`Save failed: \${error.message}\`);
    throw error;
  }
}

function remoteRecordsSignature(rows = []) {
  return rows
    .map((row) => \`\${row.type || ""}:\${row.id || ""}:\${row.updated_at || ""}\`)
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
    showToast(\`Records could not load: \${error.message}\`);
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

// Extracted to js/settings.js: seedDefaultServices


// Extracted to js/settings.js: seedDefaultCfoNotes


// Extracted to js/settings.js: seedDefaultKennelLocations


// Extracted to js/settings.js: seedDefaultKennelBuildings


// Extracted to js/settings.js: defaultOperationHourRecords


// Extracted to js/settings.js: seedDefaultOperationHours


var fieldHelp = {
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
  manualClockOut: "Required for manual time entries.",
  serviceName: "Required for the pricing catalog.",
  category: "Required so revenue can be grouped.",
  basePrice: "Required. Use 0 only for no-charge services.",
  unit: "Required so staff knows how the price is applied.",
};

var serviceFormFieldInfo = {
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
        title.innerHTML = \`<span>\${text}</span>\`;
        label.insertBefore(title, label.firstChild);
      }
    }
    if (field.required) {
      const title = label.querySelector(".field-label-text");
      if (title && !title.querySelector(".required-mark")) {
        title.insertAdjacentHTML("beforeend", '<span class="required-mark" aria-label="required">*</span>');
      }
      if (!label.querySelector(".field-help") && fieldHelp[field.name]) {
        field.insertAdjacentHTML("afterend", \`<span class="field-help">\${fieldHelp[field.name]}</span>\`);
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

// Extracted to js/settings.js: setupServiceFormInfoIcons


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
  return escapeHtml(value).replaceAll("\\n", "<br>");
}

function mediaAccessAttrs(item = {}, context = {}) {
  const storagePath = item.storagePath || item.profilePhotoPath || "";
  const sourceRecordId = context.sourceRecordId || item.sourceRecordId || item.recordId || "";
  const sourceRecordType = context.sourceRecordType || item.sourceRecordType || item.recordType || "";
  const attrs = [];
  if (storagePath) attrs.push(\`data-storage-path="\${escapeHtml(storagePath)}"\`);
  if (sourceRecordId) attrs.push(\`data-source-record-id="\${escapeHtml(sourceRecordId)}"\`);
  if (sourceRecordType) attrs.push(\`data-source-record-type="\${escapeHtml(sourceRecordType)}"\`);
  return attrs.length ? \` \${attrs.join(" ")}\` : "";
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
        showDetailDialog("File Not Available", \`<p>This file is stored privately, but Snuggle Stay could not create an access link right now.</p><p>\${escapeHtml(error.message || String(error))}</p>\`);
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
    links.push(\`<button type="button" class="media-preview-button" data-action="view-media" data-src="\${escapeHtml(record.mediaLink)}" data-media-type="external/link" data-media-name="Shared media">Open shared media</button>\`);
  }
  if (record.profilePhotoUrl) {
    links.push(\`<button type="button" class="media-preview-button" data-action="view-media" data-src="\${escapeHtml(record.profilePhotoUrl)}" data-media-type="image/jpeg" data-media-name="Profile photo"\${mediaAccessAttrs({ profilePhotoPath: record.profilePhotoPath || record.storagePath || "" }, { sourceRecordId: record.id || "", sourceRecordType: record.type || "" })}>Open profile photo</button>\`);
  }
  if (record.mediaItems?.length) {
    links.push(
      ...record.mediaItems.map(
        (item) =>
          \`<button type="button" class="media-preview-button" data-action="view-media" data-src="\${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="\${escapeHtml(item.type)}" data-media-name="\${escapeHtml(item.name)}"\${mediaAccessAttrs(item, { sourceRecordId: record.id || item.sourceRecordId || "", sourceRecordType: record.type || item.sourceRecordType || "" })}>Open \${escapeHtml(item.name)}</button>\`,
      ),
    );
  }
  if (record.vaccinationRecords?.length) {
    links.push(
      ...record.vaccinationRecords.map(
        (item) =>
          \`<button type="button" class="media-preview-button" data-action="view-media" data-src="\${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="\${escapeHtml(item.type)}" data-media-name="\${escapeHtml(item.name)}"\${mediaAccessAttrs(item, { sourceRecordId: record.id || item.sourceRecordId || "", sourceRecordType: record.type || item.sourceRecordType || "" })}>Open vaccine record: \${escapeHtml(item.name)}</button>\`,
      ),
    );
  } else if (record.vaccinationFiles) {
    links.push(\`<button type="button" class="media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="\${escapeHtml(record.vaccinationFiles)}">Open vaccine record</button>\`);
  } else if (record.mediaFiles) {
    links.push(\`<button type="button" class="media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="\${escapeHtml(record.mediaFiles)}">Open uploaded file</button>\`);
  }
  return links.length ? \`<div class="detail-media">\${links.join(" ")}</div>\` : "";
}

// Extracted to js/customer.js: customerUploadSectionHtml


function detailRows(record, keys) {
  return keys
    .map(([label, key]) => {
      const value = record[key];
      if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return "";
      return \`<div class="detail-row"><strong>\${label}</strong><span>\${Array.isArray(value) ? escapeHtml(value.join(", ")) : escapeHtml(value)}</span></div>\`;
    })
    .join("");
}

function normalizedPhoneHref(phone = "") {
  const digits = String(phone || "").replace(/[^\\d+]/g, "");
  return digits ? \`tel:\${digits}\` : "";
}

function phoneLinkHtml(phone = "", label = "") {
  const href = normalizedPhoneHref(phone);
  const display = label || phone;
  if (!href) return escapeHtml(display || "No phone saved");
  return \`<a class="tel-link" href="\${escapeHtml(href)}">\${escapeHtml(display || phone)}</a>\`;
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
    $("#mediaDialogBody").innerHTML = \`<p>This file was not uploaded to the database. The maximum file size is \${MAX_MEDIA_UPLOAD_MB} MB.</p>\${name ? \`<p><strong>Saved file name:</strong> \${escapeHtml(name)}</p>\` : ""}\`;
    $("#mediaDialog").showModal();
    return;
  }
  const safeSrc = escapeHtml(src || "");
  const safeName = escapeHtml(name || "Uploaded media");
  const openLink = \`<p><a href="\${safeSrc}" target="_blank" rel="noopener">Open uploaded file in database</a></p>\`;
  $("#mediaDialogBody").innerHTML = (type?.startsWith("video/")
    ? \`<video src="\${safeSrc}" controls playsinline></video>\`
    : type?.startsWith("image/") || /\\.(png|jpe?g|gif|webp|avif|bmp|svg)(\\?|#|$)/i.test(src)
      ? \`<div class="media-zoom-controls"><button type="button" class="secondary-button" data-action="media-zoom-out">Zoom Out</button><span id="mediaZoomLabel">100%</span><button type="button" class="secondary-button" data-action="media-zoom-in">Zoom In</button></div><div class="media-zoom-frame"><img id="zoomableMediaImage" src="\${safeSrc}" alt="\${safeName}" /></div>\`
      : /\\.(mp4|mov|webm|m4v)(\\?|#|$)/i.test(src)
        ? \`<video src="\${safeSrc}" controls playsinline></video>\`
        : type === "external/link"
          ? \`<iframe class="media-iframe" src="\${safeSrc}" title="\${safeName}"></iframe><a href="\${safeSrc}" target="_blank" rel="noopener">Open in a new tab</a>\`
          : \`<p>This file type cannot be previewed here.</p>\`) + openLink;
  $("#mediaDialog").showModal();
}

function updateMediaZoom() {
  const image = $("#zoomableMediaImage");
  const label = $("#mediaZoomLabel");
  if (!image) return;
  image.style.transform = \`scale(\${mediaZoomLevel})\`;
  if (label) label.textContent = \`\${Math.round(mediaZoomLevel * 100)}%\`;
}

// Extracted to js/daily.js: dailyDetailHtml


function requestDetailHtml(record) {
  return \`\${detailRows(record, [["Category", "category"], ["Requested by", "requestedBy"], ["Submitted", "submittedAt"], ["Status", "status"], ["Request", "requestText"], ["Reason", "reason"], ["Completed by", "completedBy"], ["Completed at", "completedAt"]])}\${mediaLinkHtml(record)}\`;
}

function maintenanceDetailHtml(record) {
  return \`\${detailRows(record, [["Location", "location"], ["Reported by", "reportedBy"], ["Submitted", "submittedAt"], ["Status", "status"], ["Issue", "issue"], ["Suggested action", "suggestedAction"], ["Completed by", "completedBy"], ["Completed at", "completedAt"]])}\${mediaLinkHtml(record)}\`;
}

function genericDetailHtml(record) {
  const rows = Object.entries(record)
    .filter(([key, value]) => !["profilePhotoData", "type", "removed", "completed", "mediaItems", "vaccinationRecords"].includes(key) && value !== "" && value !== null && value !== undefined)
    .map(([key, value]) => \`<div class="detail-row"><strong>\${escapeHtml(key)}</strong><span>\${Array.isArray(value) ? escapeHtml(value.join(", ")) : escapeHtml(typeof value === "object" ? JSON.stringify(value, null, 2) : value)}</span></div>\`)
    .join("");
  return \`\${rows}\${mediaLinkHtml(record)}\`;
}

var BOARDING_SERVICE_DUE_WINDOW_HOURS = 48;

// Extracted to js/boarding.js: boardingServiceTaskDisplayName


// Extracted to js/boarding.js: boardingStayRequestLabel


// Extracted to js/settings.js: serviceCatalogForStayRequests


// Extracted to js/settings.js: normalizedServiceLookupText


// Extracted to js/settings.js: serviceDependencyId


// Extracted to js/settings.js: serviceDependencyType


// Extracted to js/settings.js: serviceDependencyParent


// Extracted to js/settings.js: serviceDependencySatisfied


// Extracted to js/settings.js: serviceHasDependentServices


// Extracted to js/settings.js: serviceDependencyChipHtml


// Extracted to js/settings.js: servicePricingScopeLabel


// Extracted to js/settings.js: serviceMatchesCustomerPricingScope


function normalizedBoardingRateType(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["boarding-program", "program", "stay-program"].includes(normalized)) return "boarding-program";
  if (["standard-boarding", "boarding-rate", "standard"].includes(normalized)) return "standard-boarding";
  return "";
}

// Extracted to js/settings.js: serviceBoardingRateType


// Extracted to js/settings.js: serviceIsBoardingProgram


// Extracted to js/settings.js: serviceIsStandardBoardingRate


// Extracted to js/settings.js: serviceBoardingRateChipHtml


// Extracted to js/settings.js: serviceDependencyOptionLabel


// Extracted to js/settings.js: serviceDependencyOptionsHtml


// Extracted to js/settings.js: renderServiceDependencyFields


// Extracted to js/settings.js: syncServiceDependencyFields


// Extracted to js/settings.js: applyLegacyServiceDependencyMigration


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

// Extracted to js/settings.js: serviceCatalogMatchForRequest


// Extracted to js/boarding.js: boardingStayRequestUnitPrice


// Extracted to js/boarding.js: boardingStayRequestUnit


// Extracted to js/customer.js: customerFacingBoardingStayRequestLabel


// Extracted to js/boarding.js: boardingStayRequestDisplayText


// Extracted to js/boarding.js: boardingStayServicesText


// Extracted to js/boarding.js: boardingStayRequestTotal


// Extracted to js/boarding.js: activeBoardingPricingServices


// Extracted to js/boarding.js: boardingRatePlanForCustomer


// Extracted to js/boarding.js: boardingRatePlanForRecord


// Extracted to js/boarding.js: boardingPricingDogKey


// Extracted to js/boarding.js: boardingLineRoleLabel


// Extracted to js/boarding.js: boardingLineDisplayLabel


// Extracted to js/customer.js: customerSharedCrateRequested


// Extracted to js/boarding.js: boardingDogPricingLines


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
        action: old ? \`updated-\${adjustment.type}\` : \`added-\${adjustment.type}\`,
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
      action: \`removed-\${adjustment.type}\`,
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

// Extracted to js/boarding.js: boardingPricingSnapshotForStay


// Extracted to js/boarding.js: boardingStayInvoiceTotal


// Extracted to js/boarding.js: boardingStayInvoiceSummaryHtml


// Extracted to js/boarding.js: boardingStayHasService


// Extracted to js/boarding.js: boardingServiceTaskQuantity


// Extracted to js/boarding.js: boardingServiceTaskKey


// Extracted to js/boarding.js: boardingServiceTaskNameKey


// Extracted to js/boarding.js: boardingServiceTaskNameFromKey


// Extracted to js/boarding.js: boardingServiceTaskSources


// Extracted to js/boarding.js: boardingServiceTaskStableId


// Extracted to js/boarding.js: boardingStayServiceTasks


// Extracted to js/boarding.js: boardingStayServiceStats


// Extracted to js/boarding.js: boardingStayServiceDueInfo


// Extracted to js/boarding.js: boardingStayServiceFlagHtml


// Extracted to js/boarding.js: boardingStayServiceTaskListHtml


// Extracted to js/boarding.js: boardingStayWithServiceTaskStatus


// Extracted to js/boarding.js: updateBoardingStayServiceTaskStatus


// Extracted to js/settings.js: stayServiceTaskByReference


// Extracted to js/settings.js: stayServiceCompletionConfirmationHtml


// Extracted to js/settings.js: showStayServiceCompletionConfirmation


// Extracted to js/boarding.js: boardingStayDetailCardHtml


// Extracted to js/boarding.js: boardingDogSummaryHeaderHtml


// Extracted to js/boarding.js: boardingDogDetailHtml


// Extracted to js/customer.js: customerBoardingDogDetailHtml


// Extracted to js/boarding.js: boardingDogIdFromCustomerDogValue


// Extracted to js/customer.js: customerDogHasBoardingLink


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

// Extracted to js/customer.js: customerDogForBoardingRequest


// Extracted to js/customer.js: openCustomerDogEditorForRequest


// Extracted to js/customer.js: openCustomerRequestDetail


function detailForRecord(type, record, options = {}) {
  if (!record) return "";
  if (type === "dailyTask") return dailyDetailHtml(record);
  if (type === "boardingDog") return boardingDogDetailHtml(record, options.stayId || "");
  if (type === "request") return requestDetailHtml(record);
  if (type === "maintenance") return maintenanceDetailHtml(record);
  return genericDetailHtml(record);
}

function alertRecordContextHtml(type, record = {}) {
  const linkedCustomerDog = type === "boardingDog" ? explicitLinkedCustomerDogForBoarding(record) : null;
  const dogName = record.dogName || record.callName || record.showName || linkedCustomerDog?.dogName || "";
  const customerName = record.ownerName || record.customerName || linkedCustomerDog?.ownerName || record.requestedBy || "";
  const customerEmail = record.ownerEmail || record.customerEmail || linkedCustomerDog?.ownerEmail || "";
  const customerPhone = record.ownerPhone || record.customerPhone || linkedCustomerDog?.ownerPhone || "";
  const rows = [
    ["Dog", dogName],
    ["Customer", customerName],
    ["Customer email", customerEmail],
    ["Customer phone", customerPhone],
  ].filter(([, value]) => value);
  if (!rows.length) return "";
  return \`<section class="popup-record-section alert-context-section"><h3>Alert context</h3>\${rows.map(([label, value]) => \`<div class="detail-row"><strong>\${escapeHtml(label)}</strong><span>\${escapeHtml(value)}</span></div>\`).join("")}</section>\`;
}

function alertDetailForRecord(type, record = {}) {
  return \`\${alertRecordContextHtml(type, record)}\${detailForRecord(type, record)}\`;
}

function alertTitleForRecord(type, record = {}) {
  const linkedCustomerDog = type === "boardingDog" ? explicitLinkedCustomerDogForBoarding(record) : null;
  const dogName = record.dogName || record.callName || record.showName || linkedCustomerDog?.dogName || "";
  if (dogName) return \`Alert: \${dogName}\`;
  return \`Alert: \${titleForRecord(type, record).replace(/^Record Details$/, "Record")}\`;
}

function titleForRecord(type, record = {}) {
  if (currentRole() === "customer" && type === "boardingDog") return \`Request: \${record.dogName || "Dog"}\`;
  const labels = {
    ownedDog: \`Dog: \${record.callName || record.showName || "Record"}\`,
    boardingDog: \`Boarding Dog: \${record.dogName || "Record"}\`,
    request: \`Request: \${record.category || "Record"}\`,
    maintenance: \`Maintenance: \${record.location || "Record"}\`,
    timesheet: \`Timesheet: \${record.helperName || "Record"}\`,
    service: \`Service: \${record.serviceName || "Record"}\`,
    dailyTask: \`Daily Report: \${record.date || "Record"}\`,
    customerDog: \`Customer Dog: \${record.dogName || "Record"}\`,
    settingsUser: \`User: \${record.name || record.email || "Record"}\`,
    cfoNote: \`CFO Note: \${record.title || "Record"}\`,
    calendarNote: \`Calendar Note: \${record.noteDate || "Record"}\`,
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
      const message = empty ? \`\${friendlyName(field)} is required before saving.\` : \`Check \${friendlyName(field).toLowerCase()} before saving.\`;
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
    id: log.id ? \`\${record.id}-\${log.id}-\${type}\` : uid("care-log"),
    sourceDailyTaskId: record.id,
    sourceCareLogId: log.id || "",
    type,
    date,
    minutes: log.minutes || "",
    note: log.note || "",
    mediaItems: arrayValue(log.mediaItems),
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

// Extracted to js/daily.js: syncOwnedDogCareFromDailyReport


async function syncBathDatesFromDailyReport(record) {
  await syncOwnedDogCareFromDailyReport(record);
}

function upcomingBoardingTaskText() {
  const today = todayDate();
  const tomorrow = addDays(today, 1);
  const tasks = [];
  readRecords("boardingDog").forEach((dog) => {
    (dog.stays || []).forEach((stay) => {
      if (stay.dropoffTime?.slice(0, 10) === today) tasks.push(\`\${dog.dogName} drop-off scheduled at \${formatDateTime(stay.dropoffTime)}.\`);
      if (stay.pickupTime?.slice(0, 10) === today) tasks.push(\`\${dog.dogName} pick-up scheduled at \${formatDateTime(stay.pickupTime)}.\`);
      if (boardingStayHasService(stay, "Bath")) {
        const pickupDate = stay.pickupTime?.slice(0, 10);
        if (pickupDate === today) tasks.push(\`\${dog.dogName} bath requested. \${stay.bathPlan}\`);
        if (pickupDate === tomorrow) tasks.push(\`\${dog.dogName} bath requested for tomorrow pickup. Complete bath today if pickup is during busy kennel hours.\`);
      }
    });
  });
  return tasks.join("\\n");
}

// Extracted to js/daily.js: dailySubmissionDate


function isRecentDailySubmission(record = {}, daysBack = 3) {
  const recordDate = dailySubmissionDate(record);
  if (!recordDate) return false;
  return recordDate >= addDays(todayDate(), -daysBack) && recordDate <= todayDate();
}

// Extracted to js/daily.js: dailySubmissionDisplayPriority


function staffNoteTimePrefix(value = new Date()) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Extracted to js/daily.js: calendarNoteKind


// Extracted to js/daily.js: calendarNoteKindLabel


function staffNoteIdentityKey(note = {}) {
  const author = String(note.createdBy || note.helperName || note.authorName || note.updatedBy || "").trim().toLowerCase();
  const email = String(note.createdByEmail || note.updatedByEmail || note.helperEmail || note.authorEmail || "").trim().toLowerCase();
  const hasUsefulAuthor = author && !["author not recorded", "unknown staff", "staff"].includes(author);
  if (hasUsefulAuthor) return \`name:\${author}\`;
  return email ? \`email:\${email}\` : "unknown";
}

function staffNoteGroupKey(note = {}) {
  return [calendarNoteDate(note), staffNoteIdentityKey(note)].join("|");
}

// Extracted to js/daily.js: calendarNoteGroupKey


function specialNoteEntryText(value = "", timestamp = new Date()) {
  const timeText = staffNoteTimePrefix(timestamp);
  return String(value || "")
    .split("\\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => /\\[[^\\]]*\\d{1,2}:\\d{2}[^\\]]*\\]\\s*$/i.test(line) ? line : \`\${line} - [\${timeText}]\`)
    .join("\\n");
}

// Extracted to js/daily.js: calendarNoteDisplayText


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
    existing.note = [existing.note, note.note].filter(Boolean).join("\\n");
    existing.updatedAt = new Date(existing.updatedAt || existing.submittedAt || 0) > new Date(note.updatedAt || note.submittedAt || 0) ? existing.updatedAt : note.updatedAt;
  });
  return [...groups.values()];
}

// Extracted to js/daily.js: groupedCalendarNotesForDisplay


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
            return \`<article class="submission-item clickable-card\${noteClass}" data-action="\${noteAction}" data-id="\${escapeHtml(submission.id)}" data-ids="\${escapeHtml(ids || "")}"><strong>\${escapeHtml(submission.noteDate || submission.date || "")} - \${escapeHtml(noteKind)}</strong><p class="staff-note-message">\${multilineHtml(submission.note || "")}</p><span>Written by \${escapeHtml(calendarNoteAuthorText(submission))}</span></article>\`;
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
            .map(([name, count]) => \`\${name}: \${count}\`)
            .join(" | ");
          const remaining = Math.max(totalConfiguredTaskCount() - completedTasks.length, 0);
          return \`<article class="submission-item clickable-card" data-action="view-daily" data-id="\${submission.id}"><strong>\${escapeHtml(submission.date || dailySubmissionDate(submission))} - Completed Work</strong><p>\${escapeHtml(submission.dayOfWeek || "")} | \${completedTasks.length} task\${completedTasks.length === 1 ? "" : "s"} done | \${remaining} open | \${careLogs.length} care log\${careLogs.length === 1 ? "" : "s"}</p><p>\${escapeHtml(staffSummary || "No task completions yet.")}</p></article>\`;
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

// Extracted to js/boarding.js: boardingDogSearchText


// Extracted to js/boarding.js: boardingDogMatchesSearch


// Extracted to js/daily.js: ownedDogCareTagsHtml


// Extracted to js/daily.js: ownedDogMobileCardHtml


// Extracted to js/daily.js: ownedDogPhotoUploadDialogHtml


// Extracted to js/daily.js: openOwnedDogPhotoUploadPopup


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
  showToast(\`\${ownedDogDisplayName(updated) || "Dog"} photo uploaded.\`);
}

// Extracted to js/daily.js: renderOwnedDogMobileCards


// Extracted to js/daily.js: renderOwnedDogs


// Extracted to js/daily.js: renderOwnedDogFilterCounts


// Extracted to js/boarding.js: boardingRosterFilters


// Extracted to js/boarding.js: boardingRosterFilterLabel


// Extracted to js/boarding.js: boardingDogMatchesRosterFilter


// Extracted to js/boarding.js: renderBoardingRosterTabs


function sameDateValue(value, date = todayDate()) {
  return dateOnly(value) === date;
}

// Extracted to js/boarding.js: boardingQueueStayMatchesGroup


// Extracted to js/boarding.js: boardingQueueStayForGroup


// Extracted to js/boarding.js: boardingQueueRecordMatchesGroup


// Extracted to js/boarding.js: boardingQueueGroupHtml


// Extracted to js/boarding.js: renderBoardingQueueGroups


function linkedCustomerDogForBoarding(record = {}) {
  const ownerEmails = boardingOwnerEmails(record);
  if (!ownerEmails.length) return null;
  return readRecords("customerDog").find((dog) => {
    if (dog.removed) return false;
    if (record.linkedCustomerDogId && dog.id === record.linkedCustomerDogId) return true;
    return dog.linkedBoardingDogId === record.id || (ownerEmails.includes(normalizeEmail(dog.ownerEmail || dog.customerEmail)) && String(dog.dogName || "").trim().toLowerCase() === String(record.dogName || "").trim().toLowerCase());
  }) || null;
}

// Extracted to js/boarding.js: boardingDogForCustomerDog


// Extracted to js/notifications.js: baseBoardingOwnerEmails


// Extracted to js/notifications.js: boardingOwnerEmails


// Extracted to js/boarding.js: boardingDogVisibleToCustomer


// Extracted to js/customer.js: customerDogIdentityKey


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
    customerUpdates: mergeObjectList(records, "customerUpdates", (item) => item.id || \`\${item.createdAt || item.submittedAt || ""}|\${item.note || ""}\`),
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

// Extracted to js/customer.js: customerDogVisibleToCustomer


// Extracted to js/customer.js: customerDogFromBoardingDog


// Extracted to js/customer.js: customerDogsForCurrentUser


// Extracted to js/customer.js: customerDogPhotoHtml


// Extracted to js/customer.js: editableCustomerDogForCurrentUser


// Extracted to js/settings.js: openEditableCustomerDogById


// Extracted to js/customer.js: customerUpdatesForCurrentUser


// Extracted to js/customer.js: renderCustomerUpdates


// Extracted to js/customer.js: customerUploadedFileEntriesForCurrentUser


// Extracted to js/customer.js: renderCustomerFiles


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

// Extracted to js/boarding.js: boardingDraftFromCustomerDog


var canonicalDogProfileFields = [
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
  "profilePhotoData",
  "vaccinationRecords",
  "vaccinationFiles",
];

function dogProfileFieldPatch(source = {}) {
  return canonicalDogProfileFields.reduce((patch, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) patch[field] = source[field];
    return patch;
  }, {});
}

// Extracted to js/boarding.js: boardingDogWithCanonicalProfile


// Extracted to js/boarding.js: boardingDogWithCustomerProfilePatch


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

// Extracted to js/customer.js: saveCanonicalCustomerDogForBoarding


// Extracted to js/settings.js: stableLegacyPart


// Extracted to js/settings.js: stableLegacyId


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

// Extracted to js/notifications.js: legacyOwnerEmailsForRecord


// Extracted to js/notifications.js: uniqueEmailNameCustomerMatch


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

// Extracted to js/boarding.js: reservationStatusFromLegacy


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

// Extracted to js/settings.js: structuredReservationServicePayloads


// Extracted to js/customer.js: vaccinationPayloadsForDog


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

// Extracted to js/customer.js: customerUpdatePayloadsForLegacyBoardingDog


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

// Extracted to js/boarding.js: boardingOwnerLinkButtonHtml


// Extracted to js/boarding.js: renderBoardingOwnerAccountPanel


// Extracted to js/timesheet.js: boardingScheduleText


// Extracted to js/boarding.js: boardingQuickSortTime


// Extracted to js/boarding.js: boardingQuickActionButtons


// Extracted to js/boarding.js: boardingTableCellHtml


// Extracted to js/boarding.js: boardingStayServiceSummary


// Extracted to js/boarding.js: boardingPickupReviewHtml


function openReadyForPickupReview(record = {}, options = {}) {
  showDetailDialog("Ready For Pickup Review", boardingPickupReviewHtml(record, options));
}

// Extracted to js/boarding.js: boardingInvoiceTotal


// Extracted to js/boarding.js: boardingCheckoutInvoiceHtml


function openCheckoutInvoicePopup(record = {}, options = {}) {
  showDetailDialog("Final Invoice", boardingCheckoutInvoiceHtml(record, options));
}

function paymentMethodHtml(record = {}, options = {}) {
  return \`<form id="paymentMethodForm" class="tracker-form" data-id="\${escapeHtml(record.id || "")}" data-stay-id="\${escapeHtml(options.stayId || "")}" data-request-code="\${escapeHtml(options.requestCode || "")}">
    <label>Payment method<select name="paymentMethod" required><option value="">Select method</option><option>Cash</option><option>Venmo</option><option>PayPal</option><option>Zelle</option><option>Credit Card</option></select></label>
    <div class="button-row"><button type="submit">Paid</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>
  </form>\`;
}

function openPaymentMethodPopup(record = {}, options = {}) {
  showDetailDialog("Payment Method", paymentMethodHtml(record, options));
}

// Extracted to js/boarding.js: boardingDogPhotoSource


async function syncLinkedCustomerDogPhotoFromBoarding(record = {}) {
  const photoUrl = record.profilePhotoUrl || "";
  const photoData = record.profilePhotoData || "";
  if (!record?.id || (!photoUrl && !photoData)) return null;
  const linked = linkedCustomerDogForBoarding(record);
  if (!linked?.id || linked.isSharedBoardingDog) return null;
  if ((linked.profilePhotoUrl || "") === photoUrl && (linked.profilePhotoData || "") === photoData) return linked;
  const updated = upsertRecord("customerDog", {
    ...linked,
    profilePhotoUrl: photoUrl || linked.profilePhotoUrl || "",
    profilePhotoData: photoData || linked.profilePhotoData || "",
    linkedBoardingDogId: record.id,
    updatedAt: new Date().toISOString(),
  });
  await sendPayload(updated);
  return updated;
}

// Extracted to js/boarding.js: boardingDogMobilePhotoHtml


// Extracted to js/boarding.js: boardingQuickCardHtml


var stayRequestServiceOptions = [
  { value: "Bath requested", fallbackServiceName: "Bath", matchTerms: ["full bath", "bath"] },
  { value: "Nail trim requested", fallbackServiceName: "Nail trim", matchTerms: ["nail trim", "nail"] },
  { value: "Paw trim requested", fallbackServiceName: "Paw trim", matchTerms: ["paw trim", "paw"] },
  { value: "Training requested", fallbackServiceName: "Training", matchTerms: ["training"] },
  { value: "Exercise requested", fallbackServiceName: "Exercise", matchTerms: ["treadmill exercise", "exercise", "treadmill"] },
];

// Extracted to js/boarding.js: serviceForStayRequestOption


// Extracted to js/boarding.js: stayRequestOptionSnapshot


// Extracted to js/boarding.js: stayRequestMatchesOption


// Extracted to js/boarding.js: stayRequestCheckboxesHtml


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

// Extracted to js/boarding.js: boardingStayEstimatedTotal


// Extracted to js/boarding.js: boardingStayBillingAdjustmentFieldsHtml


// Extracted to js/boarding.js: boardingStayLocationFieldsHtml


// Extracted to js/boarding.js: updateBoardingStayLocationOptions


// Extracted to js/boarding.js: boardingStayFormHtml


// Extracted to js/timesheet.js: boardingSchedulePopupHtml


// Extracted to js/timesheet.js: openBoardingSchedulePopup


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

// Extracted to js/customer.js: customerUpdateForStay


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
      reasons.push(\`No stay update has been sent for Stay ID: \${requestCode || stay.id}.\`);
    } else if (latestUpdate?.createdAt) {
      reasons.push(\`Last stay update was sent \${formatDateTime(latestUpdate.createdAt)}.\`);
    }
    const pickup = new Date(stay.pickupTime || 0);
    if (!Number.isNaN(pickup.getTime()) && activeBoardingStayStatuses.includes(status) && !stayHasActualPickupEvidence(stay)) {
      const hoursRemaining = Math.ceil((pickup - new Date()) / 3600000);
      if (hoursRemaining <= 0) reasons.push("Pickup time has passed; review the stay before checkout.");
      else if (hoursRemaining <= BOARDING_SERVICE_DUE_WINDOW_HOURS) reasons.push(\`Pickup is in \${hoursRemaining} hour\${hoursRemaining === 1 ? "" : "s"}.\`);
    }
    const openServices = boardingStayServiceStats(record, stay).incompleteTasks;
    if (openServices.length) {
      reasons.push(\`Open stay service\${openServices.length === 1 ? "" : "s"}: \${openServices.map((task) => task.label || task.serviceName || "Service").join(", ")}.\`);
    }
  }
  if (!reasons.length) reasons.push("Review the current stay and owner update history.");
  return reasons;
}

function ownerUpdateReasonHtml(record = {}, stay = {}) {
  const items = ownerUpdateReasonItems(record, stay);
  return \`<ul class="compact-reason-list">\${items.map((item) => \`<li>\${escapeHtml(item)}</li>\`).join("")}</ul>\`;
}

// Extracted to js/notifications.js: openOwnerUpdateAlert


// Extracted to js/boarding.js: openBoardingStayPopup


// Extracted to js/boarding.js: boardingFoodInstructions


// Extracted to js/boarding.js: boardingCheckInServices


// Extracted to js/settings.js: activeCheckInServices


// Extracted to js/settings.js: checkInServiceSnapshot


function captureBoardingCheckInState(formEl = $("#boardingCheckInForm")) {
  if (!formEl || !pendingBoardingCheckIn) return pendingBoardingCheckIn || {};
  pendingBoardingCheckIn.formValues = {
    belongings: formEl.elements.belongings?.value || "",
    foodInstructions: formEl.elements.foodInstructions?.value || "",
    dropoffTime: formEl.elements.dropoffTime?.value || "",
  };
  return pendingBoardingCheckIn;
}

// Extracted to js/boarding.js: boardingCheckInPhotoHtml


// Extracted to js/boarding.js: boardingCheckInHtml


// Extracted to js/boarding.js: openBoardingCheckInPopup


// Extracted to js/boarding.js: boardingCheckInServicePickerHtml


// Extracted to js/boarding.js: openBoardingCheckInServicePicker


// Extracted to js/settings.js: submitBoardingCheckInServiceForm


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
      showToast(\`Photo upload failed: \${error.message}\`);
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
    addedServiceLabels: addedServices.map((service) => \`\${service.serviceName}\${Number(service.quantity || 1) > 1 ? \` x\${service.quantity}\` : ""} requested\`),
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
  await addAuditLog("Checked in boarding dog", "boardingDog", updated, \`\${updated.dogName || "Dog"} belongings: \${data.belongings || "none"}\`);
  if (addedServices.length) {
    await addAuditLog("Added check-in service", "boardingDog", updated, addedServices.map((service) => \`\${service.serviceName} x\${service.quantity}\`).join(", "));
  }
  pendingBoardingCheckIn = null;
  if (data.assignKennelAfterCheckIn === "Yes") {
    openKennelAssignmentPopup(updated, "In Kennel");
    return;
  }
  showDetailDialog("Check-In Complete", \`<p>\${escapeHtml(updated.dogName || "Boarding dog")} has been checked in.</p><p>Belongings: \${escapeHtml(data.belongings || "None listed")}</p>\`);
}

// Extracted to js/boarding.js: saveBoardingStayFromForm


// Extracted to js/boarding.js: renderBoardingQuickCards


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
  showDetailDialog("Customer Login Prepared", \`<p>\${escapeHtml(record.ownerName || ownerEmail)} can sign up or sign in with \${escapeHtml(ownerEmail)}. Snuggle Stay will link that customer account to \${escapeHtml(customerDog.dogName || record.dogName || "this dog")}.</p><p>This boarding dog can still have stays added by staff or admin even if the owner has not logged in yet.</p>\`);
}

function normalizedDogIdentityName(record = {}) {
  return String(record.dogName || record.callName || record.showName || "").trim().toLowerCase();
}

function normalizedPhoneToken(value = "") {
  return String(value || "").replace(/\\D/g, "");
}

// Extracted to js/boarding.js: boardingDogIdentityTokens


// Extracted to js/boarding.js: boardingDogIdentityKey


function groupedBoardingDogProfiles(records = []) {
  const groups = new Map();
  const tokenToGroup = new Map();
  const ungrouped = [];
  let groupIndex = 0;

  const createGroup = () => {
    const key = \`boarding-profile-\${groupIndex += 1}\`;
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

// Extracted to js/boarding.js: boardingStatusPriority


// Extracted to js/boarding.js: boardingRecordSortTime


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

// Extracted to js/boarding.js: boardingStayRequestsForMergedItems


// Extracted to js/settings.js: mergeBoardingStayServiceTasksForRequests


// Extracted to js/boarding.js: boardingStayMergeKey


// Extracted to js/boarding.js: boardingStayRequestsKey


// Extracted to js/boarding.js: boardingStaySemanticMergeKey


// Extracted to js/boarding.js: boardingStayMergeKeyForRecord


// Extracted to js/settings.js: shortStableHash


// Extracted to js/boarding.js: boardingStaySourceIds


// Extracted to js/boarding.js: boardingStayRequestCode


// Extracted to js/boarding.js: boardingStayWithRequestCode


// Extracted to js/boarding.js: boardingStayById


// Extracted to js/boarding.js: boardingStayByReference


// Extracted to js/boarding.js: boardingStayReferenceFromAction


// Extracted to js/boarding.js: boardingStaySharesExplicitIdentity


// Extracted to js/boarding.js: boardingStayMatchesIdentity


// Extracted to js/boarding.js: boardingStayMergeTime


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

// Extracted to js/boarding.js: boardingDogWithMergedStays


function mergeBoardingProfileGroup(records = []) {
  if (records.length <= 1) return boardingDogWithMergedStays(records[0] || {});
  const primary = chooseBoardingProfilePrimary(records);
  const merged = {
    ...primary,
    sourceRecordIds: [...new Set(records.map((record) => record.id).filter(Boolean))],
    duplicateProfileIds: [...new Set(records.map((record) => record.id).filter((id) => id && id !== primary.id))],
    stays: mergeBoardingStays(records, primary),
    statusHistory: mergeObjectList(records, "statusHistory", (item) => item.id || \`\${item.date || ""}|\${item.from || ""}|\${item.to || ""}|\${item.by || ""}\`)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    documents: mergeObjectList(records, "documents", (item) => item.id || item.url || item.dataUrl || item.name || JSON.stringify(item)),
    vaccinationRecords: mergeObjectList(records, "vaccinationRecords", (item) => item.id || item.url || item.dataUrl || item.name || JSON.stringify(item)),
    customerUpdates: mergeObjectList(records, "customerUpdates", (item) => item.id || \`\${item.createdAt || item.submittedAt || ""}|\${item.note || ""}\`),
    requestedServices: mergeObjectList(records, "requestedServices", (item) => item.id || \`\${item.serviceName || ""}|\${item.quantity || ""}|\${item.unitPrice || ""}\`),
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
  const { groups, ungrouped } = groupedBoardingDogProfiles(records);
  return groups.map(mergeBoardingProfileGroup).concat(ungrouped).map(boardingDogWithCanonicalProfile).map(boardingDogWithStayStatus);
}

// Extracted to js/boarding.js: boardingDogRecordForDisplay


// Extracted to js/boarding.js: boardingStayEntryForRecord


// Extracted to js/boarding.js: boardingStayEntries


// Extracted to js/boarding.js: boardingStayEntryKey


function uniqueBoardingStayEntries(entries = []) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = boardingStayEntryKey(entry);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Extracted to js/boarding.js: boardingStayEntrySortTime


function findMatchingBoardingDogProfile(record = {}, options = {}) {
  const tokens = new Set(boardingDogIdentityTokens(record));
  if (!tokens.size) return null;
  return consolidatedBoardingDogRecords()
    .filter((item) => item.id !== options.excludeId && !(item.sourceRecordIds || []).includes(options.excludeId))
    .find((item) => boardingDogIdentityTokens(item).some((token) => tokens.has(token))) || null;
}

// Extracted to js/boarding.js: handleBoardingViewToggle


// Extracted to js/boarding.js: renderBoardingDogs


// Extracted to js/boarding.js: boardingStayNeedsDuplicateStatusSync


// Extracted to js/boarding.js: syncDuplicateBoardingStayStatusRecords


// Extracted to js/boarding.js: saveBoardingStatusTransition


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
    const nextActions = container.querySelector(\`[data-inline-status-actions="\${cssEscapeValue(optimisticRecord.id || "")}"]\`);
    nextActions?.querySelectorAll("button").forEach((actionButton) => {
      actionButton.disabled = true;
      actionButton.classList.add("is-loading");
    });
  }
  const message = container.querySelector(\`[data-inline-status-message="\${cssEscapeValue(optimisticRecord.id || "")}"]\`);
  if (message) {
    message.textContent = "Saving...";
    message.classList.remove("is-error", "is-saved");
  }
}

function setInlineBoardingStatusMessage(recordId = "", text = "", className = "") {
  $$(\`[data-inline-status-message="\${cssEscapeValue(recordId)}"]\`).forEach((message) => {
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
    await addAuditLog("Changed boarding status", "boardingDog", savedLocal, \`\${savedLocal.dogName || "Dog"}: \${nextStatus}\`);
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
    showToast(\`Status save failed: \${error.message || error}\`);
  }
}

// Extracted to js/boarding.js: handleBoardingTransition


function dogRosterKey(record) {
  return boardingDogIdentityTokens(record).sort().join("|")
    || \`\${record.dogName || record.callName || record.showName || ""}|\${record.ownerEmail || record.ownerPhone || record.ownerName || record.sourceType || ""}\`.toLowerCase();
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

// Extracted to js/boarding.js: boardingRequestStatusFilterStorageKey


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

// Extracted to js/boarding.js: boardingRequestFilterLabel


function syncBoardingRequestFilterUi(statuses = readBoardingRequestStatusFilter()) {
  const selected = statuses.filter((status) => boardingLifecycleStatuses.includes(status));
  const count = $("#boardingRequestFilterCount");
  const summary = $("#boardingRequestFilterSummary");
  if (count) count.textContent = boardingRequestFilterLabel(selected);
  if (summary) {
    summary.innerHTML = selected.length
      ? selected.map((status) => \`<span class="status-chip">\${escapeHtml(status)}</span>\`).join("")
      : \`<span class="status-chip">All statuses</span>\`;
  }
}

// Extracted to js/boarding.js: boardingRequestFilterPopupHtml


// Extracted to js/boarding.js: saveBoardingRequestFilterFromForm


// Extracted to js/boarding.js: boardingFamilyOwnerKey


// Extracted to js/boarding.js: boardingFamilyStayKey


// Extracted to js/boarding.js: boardingFamilyGroupKey


// Extracted to js/boarding.js: boardingFamilyName


// Extracted to js/boarding.js: boardingFamilyNameLabel


// Extracted to js/boarding.js: boardingFamilyStatusSummary


// Extracted to js/boarding.js: boardingFamilyGroups


// Extracted to js/boarding.js: boardingRequestCardHtml


// Extracted to js/boarding.js: boardingFamilyGroupHtml


// Extracted to js/boarding.js: renderBoardingRequests


// Extracted to js/customer.js: renderCustomerDogUploadCards


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

// Extracted to js/boarding.js: activeBoardingStay


// Extracted to js/boarding.js: currentOrNextStay


function isCurrentlyBoarding(record) {
  return Boolean(activeBoardingStay(record));
}

// Extracted to js/daily.js: setOwnedDogActiveTab


// Extracted to js/daily.js: syncOwnedDogTabAvailability


// Extracted to js/boarding.js: setBoardingDogActiveTab


// Extracted to js/boarding.js: renderBoardingVaccinationFiles


// Extracted to js/customer.js: customerUpdateMediaHtml


// Extracted to js/boarding.js: renderBoardingCustomerUpdates


// Extracted to js/boarding.js: boardingDogDocumentItems


// Extracted to js/boarding.js: boardingDogFileItem


// Extracted to js/boarding.js: boardingDogFileItems


// Extracted to js/boarding.js: renderBoardingDogFiles


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

// Extracted to js/boarding.js: updateBoardingDogFileName


// Extracted to js/boarding.js: updateBoardingDogDocuments


// Extracted to js/boarding.js: boardingDogFileReferenceFromAction


// Extracted to js/boarding.js: boardingDogFileFromReference


// Extracted to js/boarding.js: boardingDogFileRemoveConfirmHtml


// Extracted to js/boarding.js: openBoardingDogFileRemoveConfirm


// Extracted to js/boarding.js: removeBoardingDogFile


// Extracted to js/boarding.js: saveBoardingCustomerUpdateForStay


// Extracted to js/boarding.js: addBoardingCustomerUpdate


// Extracted to js/daily.js: openOwnedDog


function closeOwnedDogModal() {
  const ownedDogDetail = $("#ownedDogDetail");
  if (ownedDogDetail) ownedDogDetail.hidden = true;
  document.body.classList.remove("owned-dog-modal-open");
}

// Extracted to js/daily.js: setOwnedCareEntryVisibility


// Extracted to js/boarding.js: resetBoardingDogFormForRecord


// Extracted to js/boarding.js: openBoardingDog


function closeBoardingDogModal() {
  const boardingDogDetail = $("#boardingDogDetail");
  if (boardingDogDetail) boardingDogDetail.hidden = true;
  document.body.classList.remove("boarding-dog-modal-open");
}

// Extracted to js/boarding.js: openBoardingDogToTab


// Extracted to js/boarding.js: setBoardingFormLocked


// Extracted to js/daily.js: updateOwnedDogConditionalFields


function updateDhppWarning() {
  const value = $("#ownedDhppDate").value;
  const warning = $("#ownedDhppWarning");
  const label = $("#ownedDhppLabel");
  warning.textContent = "";
  label.classList.remove("is-orange-warning", "is-red-warning");
  if (!value) return;
  const monthsOld = (new Date() - new Date(\`\${value}T12:00:00\`)) / (1000 * 60 * 60 * 24 * 30.4375);
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

// Extracted to js/boarding.js: activeBoardingDog


// Extracted to js/settings.js: selectedBoardingKennelLocation


// Extracted to js/boarding.js: renderBoardingKennelLocationControl


// Extracted to js/boarding.js: updateBoardingKennelLocation


// Extracted to js/daily.js: ownedDogActivityLogs


// Extracted to js/daily.js: ownedDogActivityEntriesHtml


// Extracted to js/daily.js: ownedDogDocumentItems


// Extracted to js/daily.js: renderOwnedDogFiles


// Extracted to js/daily.js: updateOwnedDogDocuments


// Extracted to js/daily.js: ownedDogTrainingHistoryHtml


// Extracted to js/daily.js: ownedDogTimelineHtml


// Extracted to js/daily.js: openOwnedDogTimeline


// Extracted to js/notifications.js: openMedicalCareAlert


// Extracted to js/daily.js: ownedDogOverviewPopupHtml


// Extracted to js/daily.js: openOwnedDogOverviewPopup


// Extracted to js/notifications.js: openVaccineAlert


// Extracted to js/daily.js: renderOwnedActivity


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

// Extracted to js/daily.js: addOwnedLog


function quickOwnedCareInput(type) {
  const exerciseTypes = ["Treadmill", "Scooter", "Yard Run"];
  if (exerciseTypes.includes(type)) {
    const value = window.prompt(\`\${type} minutes\`, "15");
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

// Extracted to js/daily.js: handleOwnedDogRosterAction


// Extracted to js/daily.js: removeOwnedLog


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

// Extracted to js/boarding.js: renderBoardingStays


// Extracted to js/boarding.js: boardingStayStatusMenuHtml


// Extracted to js/boarding.js: openBoardingStayStatusMenu


// Extracted to js/boarding.js: saveBoardingStayStatusTransition


// Extracted to js/boarding.js: approveBoardingStay


// Extracted to js/boarding.js: boardingStayLifecycleEvents


// Extracted to js/boarding.js: boardingStayHistoryPopupHtml


// Extracted to js/boarding.js: renderBoardingHistory


// Extracted to js/boarding.js: openBoardingStayHistory


// Extracted to js/boarding.js: boardingStayRemoveConfirmHtml


// Extracted to js/boarding.js: openBoardingStayRemoveConfirm


// Extracted to js/boarding.js: removeBoardingStayFromDog


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
            \`<article class="record-card clickable-card \${record.urgentNeeds ? "is-urgent" : ""} \${record.completed ? "is-completed" : ""}" data-action="view-request" data-id="\${escapeHtml(record.id)}"><strong>\${record.completed ? "Completed: " : ""}\${record.urgentNeeds ? "Urgent: " : ""}\${escapeHtml(record.category)}</strong><span>\${escapeHtml(record.requestedBy || "Unknown")} | \${formatDateTime(record.submittedAt)}\${record.completedAt ? \` | Completed \${formatDateTime(record.completedAt)}\` : ""}</span><p>\${escapeHtml(record.requestText || "")}</p>\${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-request" data-id="\${escapeHtml(record.id)}">\${record.completed ? "Move Back To Active" : "Mark Completed"}</button>\${isAdmin ? \`<button type="button" class="secondary-button danger-button" data-action="remove-request" data-id="\${escapeHtml(record.id)}">Remove Request</button>\` : ""}</div></article>\`,
        )
        .join("")
    : \`<p>\${showCompleted ? "No requests saved yet." : "No active requests. Turn on completed history to review finished items."}</p>\`;
}

function renderMaintenance() {
  const showCompleted = $("#showCompletedMaintenance")?.checked;
  const isAdmin = currentRole() === "admin";
  const records = readRecords("maintenance").filter((record) => !record.removed).filter((record) => showCompleted || !record.completed);
  $("#maintenanceRecords").innerHTML = records.length
    ? records
        .map(
          (record) =>
            \`<article class="record-card clickable-card \${record.urgentAttention ? "is-urgent" : ""} \${record.completed ? "is-completed" : ""}" data-action="view-maintenance" data-id="\${escapeHtml(record.id)}"><strong>\${record.completed ? "Completed: " : ""}\${record.urgentAttention ? "Urgent: " : ""}\${escapeHtml(record.location)}</strong><span>\${escapeHtml(record.reportedBy || "Unknown")} | \${formatDateTime(record.submittedAt)}\${record.completedAt ? \` | Completed \${formatDateTime(record.completedAt)}\` : ""}</span><p>\${escapeHtml(record.issue || "")}</p>\${mediaLinkHtml(record)}<div class="record-actions"><button type="button" class="secondary-button" data-action="toggle-maintenance" data-id="\${escapeHtml(record.id)}">\${record.completed ? "Move Back To Active" : "Mark Completed"}</button>\${isAdmin ? \`<button type="button" class="secondary-button danger-button" data-action="remove-maintenance" data-id="\${escapeHtml(record.id)}">Remove Maintenance</button>\` : ""}</div></article>\`,
        )
        .join("")
    : \`<p>\${showCompleted ? "No maintenance items saved yet." : "No active maintenance items. Turn on completed history to review finished items."}</p>\`;
}

function money(value) {
  const number = Number(value || 0);
  const prefix = number < 0 ? "-$" : "$";
  return \`\${prefix}\${Math.abs(number).toLocaleString("en-US", { maximumFractionDigits: 0 })}\`;
}

function vaccineDurationIsThreeYears(record = {}, vaccineKey = "") {
  const duration = String(record?.[vaccineKey + "Duration"] || "").toLowerCase();
  const flag = String(record?.[vaccineKey + "GoodThreeYears"] || "").toLowerCase();
  return duration.includes("3") || flag === "yes" || flag === "true";
}

function dogNeedsDhppVaccineReview(dog = {}) {
  if (!dog.dhppDate) return false;
  const dhppDays = (new Date() - new Date(String(dog.dhppDate) + "T12:00:00")) / 86400000;
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

// Extracted to js/boarding.js: boardingStayDateMatches


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
  container.innerHTML = cards.map(([action, label, count]) => \`<button type="button" class="dashboard-priority-card \${countSeverityClass(count)}" data-action="\${escapeHtml(action)}"><strong>\${count}</strong><span>\${escapeHtml(label)}</span></button>\`).join("");
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
  const routineText = \`\${dog.exerciseRoutine || ""} \${dog.exerciseNotes || ""}\`.toLowerCase();
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
    ? \`<img class="quick-care-dog-photo is-clickable-photo" src="\${escapeHtml(photo)}" alt="\${escapeHtml(ownedDogDisplayName(dog))}" data-action="view-dog-photo" data-dog-id="\${escapeHtml(dog.id || "")}" data-src="\${escapeHtml(photo)}" data-media-name="\${escapeHtml(\`\${ownedDogDisplayName(dog)} profile photo\`)}" />\`
    : \`<div class="quick-care-dog-photo quick-care-dog-initials">\${escapeHtml(avatarText(ownedDogDisplayName(dog)))}</div>\`;
  const rowsByCareType = {
    Training: [
      ["Training status", ownedDogTrainingDue(dog) ? "Training due" : "Current"],
      ["Last training", dog.lastTrainingDate || "Not recorded"],
      ["Training routine", dog.trainingRoutine || dog.trainingGoals || "No routine saved"],
    ],
    Bath: [
      ["Last bath", dog.lastBath || "Not recorded"],
      ["Next bath", dog.nextBath || "Not scheduled"],
      ["Bath interval", \`\${dog.bathIntervalDays || careDefaults.bathIntervalDays} days\`],
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
    ["Last " + careType, latestExercise ? \`\${latestExercise.minutes || 0} minutes on \${latestExercise.date || "unknown date"}\` : "Not recorded"],
    ["Routine", dog.exerciseRoutine || dog.exerciseNotes || "No routine saved"],
  ];
  const rows = (careTypeIsExercise(careType) ? exerciseRows : rowsByCareType[careType] || rowsByCareType.Profile)
    .filter(([, value]) => value)
    .map(([label, value]) => \`<div><span>\${escapeHtml(label)}</span><strong>\${escapeHtml(value)}</strong></div>\`)
    .join("");
  return \`<section class="quick-care-dog-summary">\${photoHtml}<div><h3>\${escapeHtml(ownedDogDisplayName(dog))}</h3><div class="quick-care-dog-facts">\${rows}</div></div></section>\`;
}

function dashboardQuickCareFormHtml(dog, careType) {
  const summary = dashboardQuickCareSummaryHtml(dog, careType);
  if (careTypeIsExercise(careType)) {
    return \`\${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="\${escapeHtml(careType)}" data-dog-id="\${escapeHtml(dog.id)}"><label>Minutes<input type="number" name="minutes" min="1" required value="\${escapeHtml(lastExerciseMinutesForDog(dog, careType))}" /></label><div class="button-row"><button type="submit">Log Exercise</button></div></form>\`;
  }
  if (careType === "Training") {
    return \`\${summary}\${ownedDogTrainingHistoryHtml(dog)}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Training" data-dog-id="\${escapeHtml(dog.id)}"><label>Training note<textarea name="note" rows="4" placeholder="basic training, stacking, gaiting, ring routine"></textarea></label><div class="button-row"><button type="submit">Log Training</button></div></form>\`;
  }
  if (careType === "Bath") {
    return \`\${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Bath" data-dog-id="\${escapeHtml(dog.id)}"><label>Bath date<input type="date" name="date" required value="\${todayDate()}" /></label><div class="button-row"><button type="submit">Log Bath</button></div></form>\`;
  }
  if (careType === "Heat Note") {
    return \`\${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Heat Note" data-dog-id="\${escapeHtml(dog.id)}"><label>Heat date<input type="date" name="date" required value="\${todayDate()}" /></label><label>Heat note<textarea name="note" rows="3" placeholder="Heat observation, behavior, separation, or breeding watch note"></textarea></label><div class="button-row"><button type="submit">Log Heat</button></div></form>\`;
  }
  if (careType === "Medical/Behavior Note") {
    return \`\${summary}<form id="dashboardQuickCareForm" class="tracker-form dashboard-quick-care-form" data-care-type="Medical/Behavior Note" data-dog-id="\${escapeHtml(dog.id)}"><label>Note date<input type="date" name="date" required value="\${todayDate()}" /></label><label>Medical/Behavior note<textarea name="note" rows="4" required placeholder="\${escapeHtml(medicalCarePlaceholder)}"></textarea></label><div class="button-row"><button type="submit">Log Medical/Behavior</button></div></form>\`;
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
    showDetailDialog("Invalid Heat Entry", \`<p>Heat logs can only be saved for female dogs. \${escapeHtml(ownedDogDisplayName(dog))} is saved as \${escapeHtml(dog.sex || "not female")}.</p>\`);
    return;
  }
  const titles = {
    Training: "Log Training",
    Bath: "Log Bath",
    "Heat Note": "Log Heat Cycle",
    "Medical/Behavior Note": "Log Medical/Behavior",
  };
  showDetailDialog(titles[careType] || \`Log \${careType}\`, dashboardQuickCareFormHtml(dog, careType));
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
    showDetailDialog("Invalid Heat Entry", \`<p>Heat logs can only be saved for female dogs. \${escapeHtml(ownedDogDisplayName(dog))} is saved as \${escapeHtml(dog.sex || "not female")}.</p>\`);
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
      \`\${careTypeIsExercise(careType) ? "Exercise" : careType === "Heat Note" ? "Heat" : careType} Logged\`,
      \`<div class="detail-row"><strong>Dog</strong><span>\${escapeHtml(log.dogName)}</span></div><div class="detail-row"><strong>Date</strong><span>\${escapeHtml(log.date)}</span></div><div class="detail-row"><strong>Care type</strong><span>\${escapeHtml(log.careType)}</span></div>\${log.minutes ? \`<div class="detail-row"><strong>Minutes</strong><span>\${escapeHtml(log.minutes)}</span></div>\` : ""}\${log.note ? \`<div class="detail-row"><strong>Note</strong><span>\${escapeHtml(log.note)}</span></div>\` : ""}<div class="detail-row"><strong>Saved by</strong><span>\${escapeHtml(log.completedBy || "Staff")}</span></div>\`,
    );
  } catch (error) {
    showDetailDialog("Care Log Not Saved", \`<p>The care log could not be saved: \${escapeHtml(error.message)}</p>\`);
  } finally {
    setSubmitState(submitButton, false);
  }
}

// Extracted to js/notifications.js: renderDashboardAlertTabs


// Extracted to js/notifications.js: dashboardAlertButtonLabel


// Extracted to js/notifications.js: dashboardAlertActionAttrs


// Extracted to js/notifications.js: dashboardAlertCardHtml


// Extracted to js/notifications.js: dashboardAlertsForMetrics


// Extracted to js/notifications.js: dashboardFilteredAlerts


// Extracted to js/notifications.js: dashboardAlertsSummaryHtml


// Extracted to js/notifications.js: dashboardAlertPopupHtml


// Extracted to js/notifications.js: openDashboardAlertPopup


function renderDashboard() {
  if (!$("#dashboardCards")) return;
  $("#dashboardDate").value ||= todayDate();
  const metrics = dashboardMetrics();
  renderDashboardPriorities(metrics);
  const needsActionCount =
    metrics.exerciseDueDogs.length +
    metrics.trainingDueDogs.length +
    metrics.ownedBathDueDogs.length +
    metrics.boardingServiceDue.length +
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
    ["boardingServices", "Stay Services Due", metrics.boardingServiceDue.length, metrics.boardingServiceDue.length ? "Requested boarding stay services inside the 48-hour pickup window." : "No stay services due."],
    ["inHeat", "Females In Heat", metrics.inHeatDogs.length, metrics.inHeatDogs.map(ownedDogDisplayName).join(", ") || "None."],
    ["heatSoon", "Heat Expected Soon", metrics.heatSoonDogs.length, metrics.heatSoonDogs.map(ownedDogDisplayName).join(", ") || "None."],
    ["careNotes", "Medical/Care Notes", metrics.medicalCareDogs.length, "Our Dogs with special care, medical, or behavior notes."],
    ["arrivals", "Arrivals today", metrics.arrivals.length, metrics.arrivals.join(", ") || "None scheduled."],
    ["departures", "Departures today", metrics.departures.length, metrics.departures.join(", ") || "None scheduled."],
    ["activeBoarders", "Active Boarders", metrics.currentBoarding.length, "Checked-in, in-kennel, ready for pickup, or current by stay dates."],
    ["ownerUpdates", "Owner updates needed", metrics.ownerUpdates, "Boarding records flagged for owner update."],
    ["requests", "Open requests", metrics.openRequests, "Active supply/process requests."],
    ["maintenance", "Open maintenance", metrics.openMaintenance, \`\${metrics.urgentMaintenance} urgent.\`],
  ];
  $("#dashboardCards").innerHTML = cards.map(([key, label, value, note]) => \`<article class="dashboard-card clickable-card" data-action="dashboard-detail" data-key="\${key}"><span>\${label}</span><strong>\${value}</strong><p>\${note}</p></article>\`).join("");
  renderDashboardReminders(metrics);
  const alerts = dashboardAlertsForMetrics(metrics);
  renderDashboardAlertTabs(alerts);
  const dashboardAlerts = $("#dashboardAlerts");
  if (!dashboardAlerts) {
    renderDashboardTaskCalendar();
    renderDashboardTimeline();
    return;
  }
  dashboardAlerts.innerHTML = dashboardAlertsSummaryHtml(alerts);
  renderDashboardTaskCalendar();
  renderDashboardTimeline();
}

function renderDashboardReminders(metrics = dashboardMetrics()) {
  const panel = $("#dashboardReminderPanel");
  if (!panel) return;
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const reminders = [];
  metrics.vaccineIssueDogs.slice(0, 5).forEach((dog) => reminders.push({ label: "Vaccine", text: \`\${ownedDogDisplayName(dog)} needs vaccine date review.\` }));
  metrics.arrivalRecords.slice(0, 5).forEach((record) => {
    const stay = dashboardStayForBoardingRecord(record);
    reminders.push({ label: "Boarding", text: \`\${record.dogName || "Boarding dog"} arrives \${formatDateTime(stay.dropoffTime)}.\` });
  });
  metrics.departureRecords.slice(0, 5).forEach((record) => {
    const stay = dashboardStayForBoardingRecord(record);
    reminders.push({ label: "Pickup", text: \`\${record.dogName || "Boarding dog"} leaves \${formatDateTime(stay.pickupTime)}.\` });
  });
  panel.innerHTML = reminders.length
    ? \`<strong>Reminders for \${escapeHtml(selectedDate)}</strong>\${reminders.map((item) => \`<article><span>\${escapeHtml(item.label)}</span><p>\${escapeHtml(item.text)}</p></article>\`).join("")}\`
    : \`<strong>Reminders for \${escapeHtml(selectedDate)}</strong><p>No vaccine or boarding reminders for this date.</p>\`;
}

function renderDashboardTaskCalendar() {
  const calendar = $("#dashboardTaskCalendar");
  if (!calendar) return;
  const selectedDate = $("#dashboardDate")?.value || todayDate();
  const selected = new Date(\`\${selectedDate}T12:00:00\`);
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
  const blanks = Array.from({ length: firstDay }, () => \`<span class="calendar-blank"></span>\`);
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = \`\${year}-\${String(month + 1).padStart(2, "0")}-\${String(day).padStart(2, "0")}\`;
    const reportCount = reportCounts[date] || 0;
    const noteCount = noteCounts[date] || 0;
    const hasRecords = reportCount || noteCount;
    const badges = [
      noteCount ? \`<small class="calendar-note-count" aria-label="\${noteCount} note\${noteCount === 1 ? "" : "s"}">\${noteCount}</small>\` : "",
      reportCount ? \`<small class="calendar-report-count" aria-label="\${reportCount} report\${reportCount === 1 ? "" : "s"}">\${reportCount}</small>\` : "",
    ].join("");
    return \`<button type="button" class="calendar-day \${date === selectedDate ? "is-selected" : ""} \${hasRecords ? "has-records" : ""} \${noteCount ? "has-notes" : ""}" data-date="\${date}"><span>\${day}</span>\${badges}</button>\`;
  });
  calendar.innerHTML = \`<div class="calendar-title"><strong>Task Calendar</strong><span>\${monthName}</span></div><div class="calendar-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div class="calendar-grid">\${blanks.join("")}\${days.join("")}</div>\`;
  renderCalendarNotes();
}

// Extracted to js/daily.js: calendarNoteAuthorText


// Extracted to js/daily.js: calendarNoteDate


// Extracted to js/daily.js: calendarNoteCreatedByCurrentUser


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
          const editAction = currentRole() === "admin" && !isGroupedCalendarNote ? \`<button type="button" class="secondary-button" data-action="edit-calendar-note" data-id="\${note.id}">Edit</button>\` : "";
          const removeAction = canRemoveCalendarNote(note) ? \`<button type="button" class="secondary-button danger-button" data-action="\${isGroupedCalendarNote ? "remove-calendar-note-group" : "remove-calendar-note"}" data-id="\${note.id}" data-ids="\${escapeHtml(groupedIds.join(","))}">Remove</button>\` : "";
          const actions = editAction || removeAction ? \`<div class="record-actions">\${editAction}\${removeAction}</div>\` : "";
          const noteKind = calendarNoteKindLabel(note);
          return \`<article class="record-card \${isSelected ? "is-approved" : ""} \${noteKind === "Staff Note" ? "is-staff-note" : "is-special-note"}"><strong>\${escapeHtml(noteKind)} - \${escapeHtml(note.noteDate || "")}</strong><span>Written by \${escapeHtml(calendarNoteAuthorText(note))}</span><p>\${multilineHtml(note.note || "")}</p>\${actions}</article>\`;
        })
        .join("")
    : \`<p>\${emptyMessage}</p>\`;
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
          const summary = record.requestText || record.issue || record.dogName || record.callName || record.serviceName || (type === "dailyTask" ? \`\${completedCount} tasks completed, \${careCount} care logs\` : \`\${record.dailyTasks?.length || 0} AM tasks, \${record.pmTasks?.length || 0} PM tasks checked\`);
          const notes = record.ownerNotes || record.reason || record.suggestedAction || record.pricingNotes || "";
          const safeType = escapeHtml(type);
          const safeId = escapeHtml(record.id);
          const removeAction = currentRole() === "admin" ? \`<div class="record-actions"><button type="button" class="secondary-button danger-button" data-action="remove-timeline-record" data-type="\${safeType}" data-id="\${safeId}">Remove</button></div>\` : "";
          return \`<article class="record-card clickable-card" data-action="view-record" data-type="\${safeType}" data-id="\${safeId}"><strong>\${formatDateTime(timestamp)} - \${escapeHtml(title)}</strong><span>\${escapeHtml(helper)}</span><p>\${escapeHtml(summary || "")}</p>\${notes ? \`<p>\${escapeHtml(notes)}</p>\` : ""}\${mediaLinkHtml(record)}\${removeAction}</article>\`;
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
  return src ? \`<img class="dashboard-detail-thumb" src="\${escapeHtml(src)}" alt="\${escapeHtml(alt)}" />\` : "";
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
  if (category === "Exercise") return \`Exercise due\${record.lastExerciseDate ? \` - last logged \${record.lastExerciseDate}\` : ""}\`;
  if (category === "Training") return \`Training due\${record.lastTrainingDate ? \` - last logged \${record.lastTrainingDate}\` : ""}\`;
  if (category === "Bath") return \`Bath due\${record.lastBath ? \` - last bath \${record.lastBath}\` : ""}\`;
  if (category === "Heat") return heat.label || "Heat watch";
  if (category === "Medical/Care") return record.careStatus || "Review medical or care notes";
  if (category === "Vaccine") return \`DHPP date: \${record.dhppDate || "Not recorded"}\`;
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
  return \`<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-owned" data-id="\${escapeHtml(record.id)}">
    \${dashboardImagePreviewHtml(firstRecordImage(record), name)}
    <div>
      <strong>\${escapeHtml(name)}</strong>
      <span>\${escapeHtml(dashboardOwnedDogReason(record, category))}</span>
      <p>\${escapeHtml(dashboardOwnedDogNote(record, category))}</p>
      <div class="record-actions"><button type="button" class="secondary-button">Open Dog</button></div>
    </div>
  </article>\`;
}

function dashboardBoardingDogReason(record = {}, category = "") {
  const stay = dashboardStayForBoardingRecord(record);
  if (category === "Arrival") return \`Arrives \${formatDateTime(stay.dropoffTime) || "today"}\`;
  if (category === "Departure") return \`Leaves \${formatDateTime(stay.pickupTime) || "today"}\`;
  if (category === "Owner Update") return ownerUpdateReasonItems(record, stay)[0] || "Owner update needed";
  if (category === "Bath") return \`Bath requested before pickup\${stay.pickupTime ? \` \${formatDateTime(stay.pickupTime)}\` : ""}\`;
  return boardingScheduleText(record);
}

function dashboardBoardingDogCardHtml(record = {}, category = "Boarding") {
  const name = record.dogName || "Boarding dog";
  const stay = dashboardStayForBoardingRecord(record);
  const status = stay?.id ? boardingStayDisplayStatus(record, stay) : boardingDisplayStatus(record);
  const kennel = status === "In Kennel" ? boardingKennelLocationLabel(record, stay) : "";
  const stayAttrs = stay?.id ? boardingStayDataAttrs(record, stay) : "";
  const note = [
    record.ownerName ? \`Owner: \${record.ownerName}\` : "",
    status ? \`Status: \${status}\` : "",
    kennel ? \`Kennel: \${kennel}\` : "",
  ].filter(Boolean).join(" | ");
  const flagText = arrayValue(record.flags).join(", ");
  return \`<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-boarding" data-id="\${escapeHtml(record.id)}"\${stayAttrs}>
    \${dashboardImagePreviewHtml(firstRecordImage(record), name)}
    <div>
      <strong>\${escapeHtml(name)}</strong>
      <span>\${escapeHtml(dashboardBoardingDogReason(record, category))}</span>
      <p>\${escapeHtml(note || boardingScheduleText(record))}</p>
      \${flagText ? \`<p>\${escapeHtml(flagText)}</p>\` : ""}
      <div class="record-actions"><button type="button" class="secondary-button">Open Boarding Dog</button></div>
    </div>
  </article>\`;
}

// Extracted to js/settings.js: dashboardBoardingServiceCardHtml


function dashboardMaintenanceCardHtml(record = {}) {
  const title = record.issue || record.location || "Maintenance item";
  const image = firstRecordImage(record);
  return \`<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-maintenance" data-id="\${escapeHtml(record.id)}">
    \${dashboardImagePreviewHtml(image, title)}
    <div>
      <strong>\${record.urgentAttention ? "Urgent: " : ""}\${escapeHtml(title)}</strong>
      <span>\${escapeHtml([record.location, record.status || "Active"].filter(Boolean).join(" | "))}</span>
      <p>\${escapeHtml(record.reportedBy ? \`Reported by \${record.reportedBy}\` : "Reporter not recorded")}</p>
      <div class="record-actions"><button type="button" class="secondary-button">View Details</button></div>
    </div>
  </article>\`;
}

function dashboardRequestCardHtml(record = {}) {
  return \`<article class="record-card compact-record-card clickable-card dashboard-detail-card" data-action="dashboard-open-request" data-id="\${escapeHtml(record.id)}">
    <div>
      <strong>\${record.urgentNeeds ? "Urgent: " : ""}\${escapeHtml(record.category || "Request")}</strong>
      <span>\${escapeHtml([record.requestedBy, record.status || "Active"].filter(Boolean).join(" | "))}</span>
      <p>\${escapeHtml(record.requestText || record.reason || "No request details saved.")}</p>
      <div class="record-actions"><button type="button" class="secondary-button">View Details</button></div>
    </div>
  </article>\`;
}

function dashboardActionGroupHtml(title, records = [], renderItem, emptyText = "No items in this group.") {
  const visible = records.slice(0, 4);
  const overflow = records.length - visible.length;
  return \`<section class="popup-record-section dashboard-action-group">
    <h3>\${escapeHtml(title)} <span>\${records.length}</span></h3>
    \${visible.length ? visible.map(renderItem).join("") : \`<p>\${escapeHtml(emptyText)}</p>\`}
    \${overflow > 0 ? \`<p class="dashboard-group-more">\${overflow} more item\${overflow === 1 ? "" : "s"} in this group.</p>\` : ""}
  </section>\`;
}

function dashboardNeedsActionHtml(metrics = dashboardMetrics()) {
  const selectedDate = metrics.selectedDate || ($("#dashboardDate")?.value || todayDate());
  return \`
    <p class="dashboard-detail-summary">Condensed action list for \${escapeHtml(selectedDate)}. Open a card when you need the full dog, request, or maintenance record.</p>
    \${dashboardActionGroupHtml("Care Due", [...metrics.exerciseDueDogs.map((dog) => ({ dog, category: "Exercise" })), ...metrics.trainingDueDogs.map((dog) => ({ dog, category: "Training" })), ...metrics.ownedBathDueDogs.map((dog) => ({ dog, category: "Bath" }))], (item) => dashboardOwnedDogCardHtml(item.dog, item.category))}
    \${dashboardActionGroupHtml("Stay Services Due", metrics.boardingServiceDue, dashboardBoardingServiceCardHtml)}
    \${dashboardActionGroupHtml("Heat Watch", [...metrics.inHeatDogs, ...metrics.heatSoonDogs], (dog) => dashboardOwnedDogCardHtml(dog, "Heat"))}
    \${dashboardActionGroupHtml("Owner Updates Needed", metrics.ownerUpdateDogs, (dog) => dashboardBoardingDogCardHtml(dog, "Owner Update"))}
    \${dashboardActionGroupHtml("Arrivals / Departures", [...metrics.arrivalRecords.map((dog) => ({ dog, category: "Arrival" })), ...metrics.departureRecords.map((dog) => ({ dog, category: "Departure" }))], (item) => dashboardBoardingDogCardHtml(item.dog, item.category))}
    \${dashboardActionGroupHtml("Active Boarders", metrics.currentBoarding, (dog) => dashboardBoardingDogCardHtml(dog, "Active"))}
    \${dashboardActionGroupHtml("Open Maintenance", metrics.openMaintenanceRecords, dashboardMaintenanceCardHtml)}
    \${dashboardActionGroupHtml("Open Requests", metrics.openRequestRecords, dashboardRequestCardHtml)}
  \`;
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

// Extracted to js/settings.js: renderFinancials


// Extracted to js/settings.js: renderCfoNotes


var settingsUserTabLabels = {
  admin: "Admin",
  staff: "Staff",
  customer: "Customer",
  member: "Customer Member",
};

function userMemberFlag(user = {}) {
  return user.isMember === true || user.isMember === "on" || user.isMember === "true" || user.member === true;
}

// Extracted to js/settings.js: settingsUserTabFor


// Extracted to js/settings.js: settingsUserDisplayRole


// Extracted to js/settings.js: settingsUserPasswordText


// Extracted to js/settings.js: defaultSettingsUserForActiveTab


// Extracted to js/settings.js: settingsUserSortValue


// Extracted to js/settings.js: sortedSettingsUsers


// Extracted to js/settings.js: setSettingsUserSort


// Extracted to js/settings.js: renderSettingsUserTabs


// Extracted to js/settings.js: renderSettingsUserSortHeaders


// Extracted to js/settings.js: renderSettingsUsers


// Extracted to js/notifications.js: alertManagedUsers


// Extracted to js/notifications.js: customerAlertUsers


// Extracted to js/notifications.js: notificationPreferences


// Extracted to js/notifications.js: alertPreferenceForEmail


// Extracted to js/notifications.js: defaultAlertTypesForUser


// Extracted to js/notifications.js: alertTypesForUser


// Extracted to js/notifications.js: userReceivesAlertType


// Extracted to js/notifications.js: alertTypeLabel


// Extracted to js/notifications.js: renderSettingsAlertPreferences


// Extracted to js/notifications.js: renderSettingsAlerts


// Extracted to js/notifications.js: urgentAlertEventName


// Extracted to js/notifications.js: urgentAlertAudienceUsers


// Extracted to js/notifications.js: urgentAlertTargetLabel


// Extracted to js/notifications.js: notificationRecordsForEvent


// Extracted to js/notifications.js: alertHistoryHtml


// Extracted to js/notifications.js: urgentAlertPopupHtml


// Extracted to js/notifications.js: openUrgentAlertPopup


// Extracted to js/notifications.js: sendUrgentAlertFromForm


// Extracted to js/notifications.js: urgentAlertResultDialog


// Extracted to js/notifications.js: alertPreferencePopupHtml


// Extracted to js/notifications.js: openAlertPreferencePopup


// Extracted to js/notifications.js: saveAlertPreferenceFromForm


// Extracted to js/settings.js: kennelLocations


// Extracted to js/settings.js: kennelBuildingRecords


// Extracted to js/settings.js: kennelBuildingNames


// Extracted to js/settings.js: kennelBuildings


// Extracted to js/settings.js: activeKennelBuildingName


// Extracted to js/settings.js: renderKennelBuildingTabs


// Extracted to js/settings.js: kennelLocationOptionsForBuilding


// Extracted to js/settings.js: renderKennelLocations


// Extracted to js/settings.js: kennelBuildingFormHtml


// Extracted to js/settings.js: openKennelBuildingPopup


// Extracted to js/settings.js: saveKennelBuildingFromForm


// Extracted to js/settings.js: kennelBuildingRemoveConfirmHtml


// Extracted to js/settings.js: openKennelBuildingRemoveConfirm


// Extracted to js/settings.js: removeKennelBuilding


// Extracted to js/settings.js: addKennelLocationToActiveBuilding


// Extracted to js/settings.js: removeKennelLocationById


// Extracted to js/settings.js: operationBoolean


function formFieldByName(formEl, name = "") {
  const field = formEl?.elements?.namedItem?.(name) || formEl?.elements?.[name] || null;
  return field && !field.tagName && typeof field.length === "number" && typeof field.item === "function" ? field.item(0) : field;
}

// Extracted to js/settings.js: normalizeOperationTime


// Extracted to js/settings.js: operationHoursRecords


// Extracted to js/settings.js: operationHoursForDate


// Extracted to js/settings.js: operationOverrideForDate


// Extracted to js/settings.js: operationWindowForDate


// Extracted to js/settings.js: operationWindowText


// Extracted to js/settings.js: operationDateLabel


// Extracted to js/customer.js: customerBookingAvailabilityForDateTime


// Extracted to js/customer.js: customerBookingAvailabilityChecks


function clearCustomerBookingTimeErrors(formEl = $("#customerBookingForm")) {
  ["dropoffTime", "pickupTime"].forEach((name) => {
    const field = formFieldByName(formEl, name);
    if (field) clearFieldError(field);
  });
}

// Extracted to js/customer.js: customerRequestMode


function parsedCustomerDateTime(value = "") {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Extracted to js/customer.js: customerBookingDateOrderError


// Extracted to js/customer.js: customerBookingAvailabilityMessagesHtml


// Extracted to js/customer.js: renderCustomerBookingAvailabilityMessages


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

// Extracted to js/customer.js: customerBookingEstimateAvailabilityChecks


// Extracted to js/customer.js: customerBookingEstimateAvailabilityValid


function monthLabel(monthKey = operationCalendarMonth) {
  const date = new Date(\`\${monthKey || todayDate().slice(0, 7)}-01T12:00:00\`);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Extracted to js/settings.js: operationCalendarDates


// Extracted to js/settings.js: operationOverrideSummaryHtml


// Extracted to js/settings.js: renderOperationHoursSettings


// Extracted to js/settings.js: saveOperationHoursSettings


// Extracted to js/settings.js: resetOperationHoursSettings


// Extracted to js/settings.js: operationDateOverrideFormHtml


// Extracted to js/settings.js: openOperationDateOverridePopup


// Extracted to js/settings.js: saveOperationDateOverrideFromForm


// Extracted to js/settings.js: clearOperationDateOverride


// Extracted to js/settings.js: renderAuditLog


// Extracted to js/settings.js: kennelAssignmentPopupHtml


// Extracted to js/settings.js: openKennelAssignmentPopup


// Extracted to js/settings.js: updateKennelAssignmentLocations


// Extracted to js/settings.js: openSettingsUser


// Extracted to js/settings.js: settingsUserLastLoginText


// Extracted to js/settings.js: settingsUserPopupHtml


// Extracted to js/settings.js: openSettingsUserPopup


// Extracted to js/settings.js: settingsUserRemoveConfirmHtml


// Extracted to js/settings.js: openSettingsUserRemoveConfirm


// Extracted to js/settings.js: removeSettingsUserById


// Extracted to js/boarding.js: boardingDogDeleteConfirmHtml


// Extracted to js/boarding.js: openBoardingDogDeleteConfirm


// Extracted to js/boarding.js: deleteBoardingDogById


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

// Extracted to js/settings.js: activeSettingsUserForm


// Extracted to js/auth.js: settingsFormProfileData


// Extracted to js/auth.js: saveSettingsUserProfile


// Extracted to js/auth.js: adminSetTemporaryPassword


// Extracted to js/notifications.js: adminSendPasswordResetEmail


// Extracted to js/customer.js: fillCustomerDefaults


// === MODULE: CUSTOMER ===
// Extracted to js/customer.js: renderCustomerDogs


// Extracted to js/customer.js: renderCustomerProgress


// Extracted to js/customer.js: vaccinationExpiryDate


// Extracted to js/customer.js: vaccinationStatusInfo


// Extracted to js/customer.js: vaccinationStatusBadgeHtml


// Extracted to js/customer.js: customerFacingVaccineStatus


// Extracted to js/customer.js: vaccinationExpiresSoon


// Extracted to js/customer.js: dogAgeText


// Extracted to js/customer.js: boardingRecordMatchesCustomerDog


// Extracted to js/customer.js: activeCustomerStayForDog


// Extracted to js/customer.js: customerDogSummaryCardHtml


// Extracted to js/customer.js: customerDogDashboardCardHtml


// Extracted to js/customer.js: customerDogWelcomeHtml


// Extracted to js/customer.js: renderCustomerRequests


// Extracted to js/customer.js: customerCanEditStayRequestStatus


// Extracted to js/customer.js: customerRequestEntries


// Extracted to js/customer.js: customerRequestFingerprint


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

// Extracted to js/customer.js: customerRequestTimelineHtml


var CUSTOMER_PREMIUM_STAY_UPGRADE_LABEL = "Upgrade Stay";
var CUSTOMER_PREMIUM_STAY_UPGRADE_DESCRIPTION = "Upgrade your dog's stay with a spacious glass-front suite, larger play yards, and extra enrichment featuring obstacle courses and interactive activities.";

// Extracted to js/customer.js: customerServiceIsPremiumStayUpgrade


// Extracted to js/customer.js: customerServiceDisplayName


// Extracted to js/customer.js: customerServiceInfoText


// Extracted to js/customer.js: customerServiceInfoIconHtml


// Extracted to js/settings.js: serviceInfoTooltipText


// Extracted to js/settings.js: serviceInfoTooltipNode


// Extracted to js/settings.js: positionServiceInfoTooltip


// Extracted to js/settings.js: showServiceInfoTooltip


// Extracted to js/settings.js: hideServiceInfoTooltip


// Extracted to js/customer.js: customerServiceOptionHtml


// Extracted to js/customer.js: customerStayProgramServices


function selectedCustomerStayProgramId() {
  const checked = document.querySelector('#customerStayProgramOptions input[name="customerStayProgram"]:checked');
  return checked?.value && checked.value !== "standard" ? checked.value : "";
}

function selectedCustomerStayProgram() {
  const id = selectedCustomerStayProgramId();
  if (!id) return null;
  return customerStayProgramServices().find((service) => service.id === id) || null;
}

// Extracted to js/customer.js: customerStayProgramSnapshot


// Extracted to js/customer.js: renderCustomerStayProgramOptions


// Extracted to js/customer.js: customerImplicitDependencyIds


// Extracted to js/customer.js: customerDependencyIds


// Extracted to js/customer.js: renderCustomerServiceOptions


function selectedCustomerDogs() {
  const dogs = [...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]:checked')]
    .map((input) => customerDogsForCurrentUser().find((dog) => dog.id === input.value))
    .filter((dog) => dog && !dog.removed);
  return uniqueCustomerBookingDogs(dogs);
}

// Extracted to js/customer.js: renderCustomerCrateShareOptions


// Extracted to js/customer.js: customerBookingSelectionKey


function uniqueCustomerBookingDogs(dogs = []) {
  const seen = new Set();
  return dogs.filter((dog) => {
    const key = customerBookingSelectionKey(dog);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Extracted to js/customer.js: customerBookingDogIdentityTokens


// Extracted to js/customer.js: customerBookingDogMatchesRecord


// Extracted to js/customer.js: customerBookingServiceKey


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

// Extracted to js/customer.js: customerBookingStableId


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
  if (typeof setCustomerDogWizardStep === "function") setCustomerDogWizardStep("profile");
}

function restoreCustomerDogFormHome() {
  const formEl = $("#customerDogForm");
  const home = $("#customerDogFormHome");
  if (formEl) formEl.hidden = true;
  if (formEl && home && formEl.parentElement !== home) home.appendChild(formEl);
  $("#detailDialog")?.classList.remove("is-customer-dog-editor");
  if (typeof renderCustomerDogs === "function") renderCustomerDogs();
}

function closeCustomerDogModal() {
  restoreCustomerDogFormHome();
  if ($("#detailDialog")?.open) $("#detailDialog").close();
}

// Extracted to js/customer.js: openCustomerDogModal


// Extracted to js/customer.js: openCustomerDogInline


// Extracted to js/customer.js: openCustomerDog


// Extracted to js/customer.js: openCustomerDogRemoveConfirm


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
  $("#requestBoardingButton").textContent = "Review Request";
  pendingCustomerBooking = null;
  customerBookingSubmitInProgress = false;
  if ($("#confirmBookingRequestButton")) $("#confirmBookingRequestButton").disabled = false;
  $("#bookingConfirmDialog")?.close();
  formEl.hidden = true;
  formEl.scrollTop = 0;
  renderCustomerDogs();
  renderCustomerStayProgramOptions();
  renderCustomerServiceOptions();
  renderCustomerBookingAvailabilityMessages();
  if (typeof setCustomerBookingWizardStep === "function") setCustomerBookingWizardStep("pets");
  updateCustomerEstimate();
  if (typeof updateCustomerStickyBookNow === "function") updateCustomerStickyBookNow();
}

// Extracted to js/customer.js: openCustomerBookingModal


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
    const cleaned = String(item || "").replace(/\\s+requested$/i, "").trim();
    const match = cleaned.match(/^(.*?)\\s+x(\\d+)$/);
    return [match ? match[1].trim() : cleaned, match ? Number(match[2]) : 1];
  }));
  const applyServiceQuantities = () => {
    const selectedDog = dog || selectedCustomerDogs()[0] || {};
    const serviceFieldName = customerServiceFieldNameForDog(selectedDog);
    $("#customerBookingForm").querySelectorAll(\`input[name="\${serviceFieldName}"]\`).forEach((input) => {
      const service = readRecords("service").find((item) => item.id === input.value);
      const quantity = serviceQuantities.get(service?.id) || serviceQuantities.get(service?.serviceName);
      input.checked = Boolean(quantity);
      const quantityInput = formFieldByName($("#customerBookingForm"), customerServiceQuantityFieldName(input.value, selectedDog));
      if (quantityInput) {
        quantityInput.value = String(quantity || 1);
        quantityInput.disabled = !input.checked;
      }
    });
  };
  renderCustomerServiceOptions();
  applyServiceQuantities();
  renderCustomerServiceOptions();
  applyServiceQuantities();
  $("#requestBoardingButton").textContent = "Review Updates";
  $("#customerBookingFormTitle").textContent = "Update Request";
  $("#customerBookingFormHelp").textContent = "Update boarding time, requested services, or notes.";
  renderCustomerBookingAvailabilityMessages();
  if (typeof setCustomerBookingWizardStep === "function") setCustomerBookingWizardStep("pets");
  updateCustomerEstimate();
}

// Extracted to js/boarding.js: boardingDays


function isDayCareStay(dropoffTime, pickupTime) {
  if (!dropoffTime || !pickupTime) return false;
  const drop = new Date(dropoffTime);
  const pick = new Date(pickupTime);
  if (pick <= drop) return false;
  return drop.getFullYear() === pick.getFullYear() && drop.getMonth() === pick.getMonth() && drop.getDate() === pick.getDate();
}

// Extracted to js/boarding.js: boardingBillingLabel


// Extracted to js/customer.js: customerEstimateDetails


// Extracted to js/boarding.js: boardingPricingServiceForCustomer


function updateCustomerEstimate() {
  if (!$("#customerEstimate")) return;
  const estimate = customerEstimateDetails();
  renderCustomerBookingAvailabilityMessages();
  const dogSummary = estimate.dogs.length ? \`<div class="estimate-line"><span>Dog\${estimate.dogs.length === 1 ? "" : "s"}</span><span>\${escapeHtml(estimate.dogs.map((dog) => dog.dogName || "Dog").join(", "))}</span></div>\` : "";
  const staySummary = estimate.dropoffTime ? \`<div class="estimate-line"><span>\${estimate.isServiceRequest ? "Requested time" : "Drop-off"}</span><span>\${escapeHtml(formatDateTime(estimate.dropoffTime))}</span></div>\${!estimate.isServiceRequest && estimate.pickupTime ? \`<div class="estimate-line"><span>Pick-up</span><span>\${escapeHtml(formatDateTime(estimate.pickupTime))}</span></div>\` : ""}\` : "";
  const boardingLine = estimate.isServiceRequest ? "" : estimate.boardingLines.map((line) => \`<div class="estimate-line"><span>\${escapeHtml(line.dogName)} - \${escapeHtml(boardingLineDisplayLabel(line))}</span><span>\${Number(line.days || 0)} x \${money(line.rate)} = \${money(line.total)}</span></div>\`).join("");
  const serviceLine = estimate.services.length
    ? estimate.services.map((service) => \`<div class="estimate-line"><span>\${escapeHtml(service.dogName || "Dog")} - \${escapeHtml(customerServiceDisplayName(service))}</span><span>\${Number(service.quantity || 1)} x \${money(service.basePrice)} = \${money(service.lineTotal)}</span></div>\`).join("")
    : \`<div class="estimate-line muted-estimate-line"><span>Add-ons</span><span>None selected</span></div>\`;
  $("#customerEstimate").innerHTML = estimate.dogs.length
    ? \`<div class="estimate-heading"><strong>Reservation Summary</strong><span>Final approval comes from staff</span></div>\${dogSummary}\${staySummary}\${estimate.isServiceRequest ? "" : \`<h4>Boarding</h4><strong>\${escapeHtml(boardingBillingLabel(estimate))}</strong>\${boardingLine || \`<div class="estimate-line muted-estimate-line"><span>Boarding subtotal</span><span>Choose dates to estimate</span></div>\`}\`}<h4>Add-ons</h4>\${serviceLine}<div class="estimate-total"><strong>Estimated total</strong><span>\${money(estimate.total)}</span></div>\`
    : "Select dog(s), dates, and services to see an estimate.";
  if (typeof updateCustomerStickyBookNow === "function") updateCustomerStickyBookNow();
}

function showBookingConfirmDialog(estimate) {
  if (!customerBookingEstimateAvailabilityValid(estimate)) {
    showToast("Choose a customer request time inside the kennel hours.");
    renderCustomerBookingAvailabilityMessages();
    return;
  }
  pendingCustomerBooking = { ...estimate, dogs: uniqueCustomerBookingDogs(estimate.dogs), submissionId: uid("customerBooking") };
  customerBookingSubmitInProgress = false;
  if ($("#confirmBookingRequestButton")) $("#confirmBookingRequestButton").disabled = false;
  const dogList = pendingCustomerBooking.dogs.map((dog) => {
    const line = pendingCustomerBooking.boardingLines.find((item) => item.dogKey === boardingPricingDogKey(dog)) || {};
    const rateText = pendingCustomerBooking.isServiceRequest ? "" : \` - \${escapeHtml(boardingLineDisplayLabel(line))} at \${money(line.rate || 0)}\`;
    return \`<li>\${escapeHtml(dog.dogName)}\${dog.breedDescription ? \` (\${escapeHtml(dog.breedDescription)})\` : ""}\${rateText}</li>\`;
  }).join("");
  const serviceList = pendingCustomerBooking.services.length
    ? pendingCustomerBooking.services.map((service) => \`<li>\${escapeHtml(service.dogName || "Dog")}: \${escapeHtml(customerServiceDisplayName(service))} x\${Number(service.quantity || 1)} - \${money(service.lineTotal)} \${escapeHtml(service.unit || "")}</li>\`).join("")
    : "<li>No added services selected</li>";
  const availabilityHtml = customerBookingAvailabilityMessagesHtml(customerBookingEstimateAvailabilityChecks(pendingCustomerBooking));
  $("#bookingConfirmBody").innerHTML = \`
    <div class="booking-summary">
      <div><strong>Dog(s)</strong><ul>\${dogList}</ul></div>
      <div><strong>\${pendingCustomerBooking.isServiceRequest ? "Requested time" : "Stay"}</strong><p>\${formatDateTime(pendingCustomerBooking.dropoffTime)}\${pendingCustomerBooking.isServiceRequest ? "" : \` to \${formatDateTime(pendingCustomerBooking.pickupTime)}\`}</p>\${pendingCustomerBooking.isServiceRequest ? "" : \`<p>\${boardingBillingLabel(pendingCustomerBooking)}\${pendingCustomerBooking.sharedCrateRequested ? " with shared-crate member pricing requested" : ""}</p><p>Boarding subtotal: \${money(pendingCustomerBooking.boardingCost)}</p>\`}</div>
      \${availabilityHtml ? \`<div class="operation-confirm-notices">\${availabilityHtml}</div>\` : ""}
      <div><strong>Services</strong><ul>\${serviceList}</ul></div>
      <div class="estimate-total"><strong>Estimated total</strong><span>\${money(pendingCustomerBooking.total)}</span></div>
      \${pendingCustomerBooking.requestNotes ? \`<div><strong>Notes</strong><p>\${escapeHtml(pendingCustomerBooking.requestNotes)}</p></div>\` : ""}
    </div>
  \`;
  $("#bookingConfirmDialog").showModal();
}

// Extracted to js/customer.js: submitPendingCustomerBooking


var servicePricingFilters = [
  { key: "all", label: "All Prices" },
  { key: "member", label: "Member Pricing" },
  { key: "regular", label: "Regular Price (Non-Member)" },
];

// Extracted to js/settings.js: servicePricingFilterLabel


// Extracted to js/settings.js: serviceMatchesPricingFilter


// Extracted to js/settings.js: setServicePricingFilter


// Extracted to js/settings.js: serviceEmptyStateText


// Extracted to js/settings.js: renderServicePricingTabs


// Extracted to js/settings.js: renderServices


// Extracted to js/settings.js: openService


// Extracted to js/settings.js: closeServiceModal


// Extracted to js/settings.js: serviceRemoveConfirmHtml


// Extracted to js/settings.js: openServiceRemoveConfirm


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
// Extracted to js/search.js: globalSearchEntries


// Extracted to js/search.js: renderGlobalSearchResults


// Extracted to js/search.js: openGlobalSearchResult


// === MODULE: NOTIFICATIONS ===
// Extracted to js/notifications.js: currentUserNotificationKey


// Extracted to js/notifications.js: notificationVisibleToCurrentUser


// Extracted to js/notifications.js: notificationIsRead


// Extracted to js/notifications.js: notificationSourceSnapshot


// Extracted to js/notifications.js: notificationEventDisplayLabel


// Extracted to js/notifications.js: notificationSavedTitleIsSpecific


// Extracted to js/notifications.js: notificationSavedMessageIsSpecific


// Extracted to js/notifications.js: notificationStayIdText


// Extracted to js/notifications.js: notificationDisplayTitle


// Extracted to js/notifications.js: notificationDisplayMessage


// Extracted to js/notifications.js: notificationChannelsText


// Extracted to js/notifications.js: customerStayUpdateAudienceEmails


// Extracted to js/notifications.js: notificationEventConfig


// Extracted to js/notifications.js: notificationAudienceEmails


// Extracted to js/notifications.js: createNotificationRecord


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

// Extracted to js/notifications.js: renderNotifications


// Extracted to js/notifications.js: markNotificationRead


// Extracted to js/notifications.js: markAllNotificationsRead


// Extracted to js/notifications.js: openNotification


// Extracted to js/notifications.js: emailNow


function normalizeHelperName(value = "") {
  return value.toLowerCase().replace(/^ms\\.?\\s+/, "").replace(/\\s+/g, " ").trim();
}

// === MODULE: TIMESHEET ===
// Extracted to js/timesheet.js: timesheetBelongsToCurrentUser


// Extracted to js/timesheet.js: findOpenClockInForCurrentUser


// Extracted to js/timesheet.js: syncActiveClockInFromOpenRecord


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

// Extracted to js/timesheet.js: timesheetDefaultRange


// Extracted to js/timesheet.js: timesheetActiveRange


// Extracted to js/timesheet.js: timesheetRecordDate


// Extracted to js/timesheet.js: timesheetRecordTime


// Extracted to js/timesheet.js: timesheetRecordInDateRange


// Extracted to js/timesheet.js: timesheetDateLabel


// Extracted to js/timesheet.js: syncTimesheetRangeUi


function sumHours(records) {
  return records.reduce((total, record) => total + Number(record.hours || 0), 0);
}

// Extracted to js/timesheet.js: renderTimesheet


// Extracted to js/timesheet.js: saveTimeEntry


// Extracted to js/timesheet.js: timesheetStaffChoices


// Extracted to js/timesheet.js: timesheetStaffOptionValue


// Extracted to js/timesheet.js: selectedTimesheetStaff


// Extracted to js/timesheet.js: syncTimesheetStaffFields


// Extracted to js/timesheet.js: timesheetEditFormHtml


// Extracted to js/timesheet.js: openTimesheetEditPopup


// Extracted to js/timesheet.js: openTimesheetDeleteConfirm


// Extracted to js/timesheet.js: removeTimesheetEntryById


function dateRangeText(start = "", end = "") {
  if (!start && !end) return "";
  if (!end || start === end) return start || end;
  return \`\${start} to \${end}\`;
}

// Extracted to js/timesheet.js: scheduleWeekStartString


// Extracted to js/timesheet.js: scheduleWeekDates


// Extracted to js/timesheet.js: setTimesheetTab


// Extracted to js/timesheet.js: renderTimesheetTabs


function staffRecordBelongsToCurrentUser(record = {}) {
  if (!currentUser) return false;
  const email = normalizeEmail(currentUser.email || helperEmail.value);
  const recordEmail = normalizeEmail(record.staffEmail || record.helperEmail || "");
  if (email && recordEmail && email === recordEmail) return true;
  const currentNames = [currentUser.name, helperName.value].filter(Boolean).map(normalizeHelperName);
  return currentNames.includes(normalizeHelperName(record.staffName || record.helperName || ""));
}

// Extracted to js/timesheet.js: staffScheduleRecords


// Extracted to js/timesheet.js: staffScheduleRecordsForWeek


// Extracted to js/timesheet.js: timeOffRequests


// Extracted to js/timesheet.js: holidaysForRange


// Extracted to js/timesheet.js: holidayForDate


function timeToMinutes(value = "") {
  const [hours = "0", minutes = "0"] = String(value).split(":");
  return Number(hours) * 60 + Number(minutes);
}

// Extracted to js/timesheet.js: shiftHours


function displayTime(value = "") {
  if (!value) return "";
  const [hourText, minuteText = "00"] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return \`\${displayHour}:\${minuteText} \${suffix}\`;
}

// Extracted to js/timesheet.js: formatShiftTime


function staffOptionHtml(record = {}) {
  const selectedStaff = selectedTimesheetStaff({ helperName: record.staffName, helperEmail: record.staffEmail });
  return timesheetStaffChoices({ helperName: record.staffName, helperEmail: record.staffEmail }).map((staff) => {
    const value = timesheetStaffOptionValue(staff);
    const selected = value === timesheetStaffOptionValue(selectedStaff);
    return \`<option value="\${escapeHtml(value)}" data-name="\${escapeHtml(staff.name || "")}" data-email="\${escapeHtml(staff.email || "")}" \${selected ? "selected" : ""}>\${escapeHtml(staff.name || staff.email || "Staff")}</option>\`;
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

// Extracted to js/timesheet.js: shiftOverlaps


// Extracted to js/timesheet.js: staffTimeOffForDate


// Extracted to js/timesheet.js: scheduleWarningsForShift


// Extracted to js/timesheet.js: renderScheduleTab


// Extracted to js/timesheet.js: renderTimeOffTab


// Extracted to js/timesheet.js: renderHolidayTab


function reviewIssuesForWeek(start = scheduleWeekStartString()) {
  const dates = scheduleWeekDates(start);
  const shifts = staffScheduleRecordsForWeek(start);
  const timesheets = readRecords("timesheet").filter((record) => !record.removed && record.date >= start && record.date < addDays(start, 7));
  const issues = [];
  dates.forEach((date) => {
    if (!shifts.some((shift) => shift.date === date)) issues.push({ title: "Missing coverage", detail: \`No staff shift saved for \${date}.\`, priority: "review" });
  });
  shifts.forEach((shift) => {
    scheduleWarningsForShift(shift).forEach((warning) => issues.push({ title: \`\${shift.staffName || "Staff"} schedule warning\`, detail: warning, priority: "review" }));
    const clocked = timesheets.some((entry) => normalizeEmail(entry.helperEmail) === normalizeEmail(shift.staffEmail) && entry.date === shift.date);
    if (!clocked && shift.date <= todayDate()) issues.push({ title: "Scheduled staff has no clock record", detail: \`\${shift.staffName || "Staff"} was scheduled \${shift.date} \${formatShiftTime(shift)}.\`, priority: "review" });
  });
  timesheets.forEach((entry) => {
    if (entry.clockInTime && !entry.clockOutTime) issues.push({ title: "Open clock-in", detail: \`\${entry.helperName || "Staff"} still has an open clock-in from \${formatDateTime(entry.clockInTime)}.\`, priority: "urgent" });
    const scheduled = shifts.some((shift) => normalizeEmail(shift.staffEmail) === normalizeEmail(entry.helperEmail) && shift.date === entry.date);
    if (!scheduled) issues.push({ title: "Unscheduled clock-in", detail: \`\${entry.helperName || "Staff"} clocked in on \${entry.date} without a saved shift.\`, priority: "review" });
  });
  return issues;
}

// Extracted to js/timesheet.js: renderScheduleReviewTab


// Extracted to js/timesheet.js: scheduleShiftFormHtml


// Extracted to js/timesheet.js: openScheduleShiftPopup


// Extracted to js/timesheet.js: saveScheduleShiftFromForm


// Extracted to js/timesheet.js: timeOffRequestFormHtml


// Extracted to js/timesheet.js: openTimeOffRequestPopup


// Extracted to js/timesheet.js: saveTimeOffRequestFromForm


// Extracted to js/timesheet.js: openTimeOffReviewPopup


// Extracted to js/timesheet.js: reviewTimeOffRequest


// Extracted to js/timesheet.js: holidayFormHtml


// Extracted to js/timesheet.js: openHolidayPopup


// Extracted to js/timesheet.js: saveHolidayFromForm


// Extracted to js/timesheet.js: cancelScheduleShift


// Extracted to js/timesheet.js: publishScheduleWeek


// Extracted to js/timesheet.js: copyLastWeekSchedule


// Extracted to js/timesheet.js: currentShiftForStaff


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
  downloadCsv(\`boarding-queue-\${todayDate()}.csv\`, rows);
}

// Extracted to js/timesheet.js: exportTimesheet


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
  downloadCsv(\`care-logs-\${todayDate()}.csv\`, rows);
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
  $("#viewTimesheetButton")?.addEventListener("click", openTimesheetViewPopup);
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
      note: data.id ? noteText : [existingNoteText, noteText].filter(Boolean).join("\\n"),
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
    showDetailDialog("Special Note Saved", \`<p>The special note has been saved for \${escapeHtml(savedDate)}.</p>\`);
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
    const noteEntry = \`\${staffNoteTimePrefix(now)}- \${data.note.trim()}\`;
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
      note: [existing?.note, noteEntry].filter(Boolean).join("\\n"),
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
    showDetailDialog("Staff Note Saved", \`<p>The note was saved for \${escapeHtml(record.noteDate)} and added to recent submissions.</p>\`);
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
  $("#cancelCustomerSignupButton")?.addEventListener("click", () => {
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
      showDetailDialog(\`Edit \${log.careType || "Care Log"}\`, careLogEditFormHtml(log));
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
    const boardingDeclineRequestForm = event.target.closest("#boardingDeclineRequestForm");
    const paymentMethodForm = event.target.closest("#paymentMethodForm");
    const urgentAlertForm = event.target.closest("#urgentAlertForm");
    const alertPreferenceForm = event.target.closest("#alertPreferenceForm");
    const boardingRequestFilterForm = event.target.closest("#boardingRequestFilterForm");
    if (!quickCareForm && !stayPopupForm && !settingsPopupForm && !ownerUpdateForm && !vaccineUpdateForm && !careLogEditForm && !kennelAssignmentForm && !timesheetEditForm && !scheduleShiftForm && !timeOffRequestForm && !holidayForm && !operationDateOverrideForm && !taskTabForm && !kennelBuildingTabForm && !ownedDogPhotoUploadForm && !boardingCheckInForm && !boardingCheckInServiceForm && !boardingDeclineRequestForm && !paymentMethodForm && !urgentAlertForm && !alertPreferenceForm && !boardingRequestFilterForm) return;
    event.preventDefault();
    if (boardingDeclineRequestForm) {
      if (!validateForm(boardingDeclineRequestForm)) return;
      await submitBoardingDeclineRequest(boardingDeclineRequestForm);
      return;
    }
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
      await addAuditLog("Marked boarding invoice paid", "boardingDog", paid, \`\${paid.dogName || "Dog"} | \${paid.paymentMethod}\`);
      await saveBoardingStatusTransition(paid, "Checked Out", transitionOptions);
      showDetailDialog("Payment Recorded", \`<p>\${escapeHtml(paid.dogName || "Dog")} was marked paid by \${escapeHtml(paid.paymentMethod)} and checked out.</p>\`);
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
        showDetailDialog("Boarding Request Saved", \`<p>The boarding request was saved for \${escapeHtml(record.dogName || "this dog")}.</p>\`);
      }
      return;
    }
    if (settingsPopupForm) {
      const formData = settingsFormProfileData(settingsPopupForm);
      const wasExisting = Boolean(formData.id || savedUserFor({ email: formData.email })?.id);
      const record = await saveSettingsUserProfile({}, settingsPopupForm);
      if (record) {
        await addAuditLog(wasExisting ? "Updated user" : "Created user", "settingsUser", record, roleLabel(record.role));
        showDetailDialog("User Saved", \`<p>\${escapeHtml(record.name || record.email)} has been saved.</p>\`);
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
      if (updated) showDetailDialog("Owner Update Saved", \`<p>The owner update for \${escapeHtml(updated.dogName || "this dog")} was saved to Stay ID: \${escapeHtml(stay.id ? boardingStayRequestCode(updated, stay) : "")}.</p>\`);
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
      showDetailDialog("Vaccine Update Saved", \`<p>The vaccine dates for \${escapeHtml(ownedDogDisplayName(updated))} were saved.</p>\`);
      return;
    }
    if (careLogEditForm) {
      const data = formPayload(careLogEditForm);
      const updated = await updateDailyCareLog(careLogEditForm.dataset.id, {
        date: data.date,
        minutes: data.minutes,
        note: data.note,
      });
      if (updated) showDetailDialog("Care Log Updated", \`<p>\${escapeHtml(updated.dogName || "Care log")} was updated.</p>\`);
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
      if (updated) showDetailDialog("Kennel Assigned", \`<p>\${escapeHtml(updated.dogName || "Dog")} is now In Kennel at \${escapeHtml(location.building)} - \${escapeHtml(location.name)}.</p>\`);
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
      showToast(\`Timesheet saved with \${Number(record.hours || 0).toFixed(2)} hours recorded.\`);
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
      if (record) showDetailDialog(alertTitleForRecord(action.dataset.type, record), alertDetailForRecord(action.dataset.type, record), { type: action.dataset.type, id: record.id });
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
      if (record) showDetailDialog("Ready For Pickup", \`<p>\${escapeHtml(record.dogName || "Dog")} is marked ready for pickup.</p>\`);
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
      if (record) showDetailDialog("Checked Out", \`<p>\${escapeHtml(record.dogName || "Dog")} has been checked out.</p>\`);
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
      if (updated) showToast(\`Time off \${updated.status.toLowerCase()}.\`);
    }
    if (action.dataset.action === "popup-quick-care") {
      openDashboardQuickCare(action.dataset.id, action.dataset.careType);
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
      if (removed) showToast(\`\${removed.dogName || "Dog"} removed.\`);
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
        showDetailDialog(calendarNoteKindLabel(groupedNote), \`<div class="detail-row"><strong>Date</strong><span>\${escapeHtml(calendarNoteDate(groupedNote) || "")}</span></div><div class="detail-row"><strong>Written by</strong><span>\${escapeHtml(calendarNoteAuthorText(groupedNote))}</span></div><div class="detail-row"><strong>Note</strong><span>\${multilineHtml(groupedNote.note || "")}</span></div>\`);
      }
      return;
    }
    const noteCard = event.target.closest('[data-action="view-calendar-note"]');
    if (noteCard) {
      const note = readRecords("calendarNote").find((item) => item.id === noteCard.dataset.id);
      if (note) showDetailDialog(titleForRecord("calendarNote", note), \`<div class="detail-row"><strong>Date</strong><span>\${escapeHtml(note.noteDate || "")}</span></div><div class="detail-row"><strong>Written by</strong><span>\${escapeHtml(calendarNoteAuthorText(note))}</span></div><div class="detail-row"><strong>Note</strong><span>\${multilineHtml(calendarNoteDisplayText(note))}</span></div>\`);
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
      form.querySelectorAll(\`input[name="\${name}"]\`).forEach((input) => {
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
	        note: String(openRecord.note || "").startsWith("Open clock-in") ? String(openRecord.note || "").replace(/^Open clock-in\\s*\\|\\s*/, "") : openRecord.note,
	      }, { silent: true });
      activeClockIn = "";
      localStorage.removeItem("cth-active-clock-in");
      updateTimeDisplays();
      showToast(\`Timesheet submitted with \${Number(record.hours || 0).toFixed(2)} hours recorded.\`);
      return;
    }
	    const clockInTime = new Date().toISOString();
	    const matchingShift = currentShiftForStaff(helperEmail.value || currentUser.email, new Date());
	    const scheduleNote = matchingShift ? \`Scheduled shift: \${formatShiftTime(matchingShift)}\` : "Unscheduled clock-in";
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
	      note: \`Open clock-in | \${scheduleNote}\`,
	      scheduleShiftId: matchingShift?.id || "",
	      scheduleException: matchingShift ? "" : "Unscheduled clock-in",
    });
    activeClockIn = { id: record.id, clockInTime, helperEmail: record.helperEmail };
    localStorage.setItem("cth-active-clock-in", JSON.stringify(activeClockIn));
    sendPayload(record).catch((error) => console.warn("Clock-in save failed", error));
    updateTimeDisplays();
    showToast(\`Clock-in confirmed: \${formatDateTime(clockInTime)}.\`);
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
    if (chip) event.dataTransfer.setData("text/plain", \`\${chip.dataset.table}:\${chip.dataset.column}\`);
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
    if (!window.confirm(\`Remove \${dog.callName || dog.showName || "this dog"} from Our Dogs?\`)) return;
    const updated = await markRecordRemoved("ownedDog", dog.id);
    closeOwnedDogModal();
    renderOwnedDogs();
    renderBoardingDogs();
    showDetailDialog("Dog Removed", \`<p>\${escapeHtml(updated?.callName || updated?.showName || "Dog")} has been removed from the active dog list.</p>\`);
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
    if (updated) showToast(\`\${uploads.length} file\${uploads.length > 1 ? "s" : ""} added.\`);
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
        showDetailDialog("Dog Saved Without Photo", \`<p>\${escapeHtml(record.callName || record.showName || "Dog")} has been saved, but the profile photo could not be uploaded: \${escapeHtml(photo.photoError)}</p>\`);
      } else {
        showDetailDialog("Dog Saved", \`<p>\${escapeHtml(record.callName || record.showName || "Dog")} has been saved.</p>\`);
      }
    } catch (error) {
      showDetailDialog("Dog Not Saved", \`<p>The dog record could not be saved: \${escapeHtml(error.message)}</p>\`);
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
    if (chip) event.dataTransfer.setData("text/plain", \`\${chip.dataset.table}:\${chip.dataset.column}\`);
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
    if (updated) showToast(\`\${uploads.length} file\${uploads.length > 1 ? "s" : ""} added.\`);
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
        showToast(\`\${dog.dogName || "Customer dog"} was loaded into a new boarding profile. Review and save it.\`);
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
          await addAuditLog("Changed boarding owner email", "boardingDog", record, \`\${oldOwnerEmail || "none"} -> \${newOwnerEmail || "none"}\`);
        }
        if (oldSecondaryOwnerEmail !== newSecondaryOwnerEmail) {
          await addAuditLog("Changed secondary owner email", "boardingDog", record, \`\${oldSecondaryOwnerEmail || "none"} -> \${newSecondaryOwnerEmail || "none"}\`);
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
        showDetailDialog("Boarding Dog Saved Without Photo", \`<p>\${escapeHtml(record.dogName || "Boarding dog")} has been saved, but the profile photo could not be uploaded: \${escapeHtml(photo.photoError)}</p>\`);
      } else {
        showDetailDialog("Boarding Dog Saved", \`<p>\${escapeHtml(record.dogName || "Boarding dog")} has been saved.</p>\`);
      }
    } catch (error) {
      showDetailDialog("Boarding Dog Not Saved", \`<p>The boarding dog record could not be saved: \${escapeHtml(error.message)}</p>\`);
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
      showDetailDialog("Request Not Logged", \`<p>The request could not be saved: \${escapeHtml(error.message)}</p>\`);
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
      showDetailDialog("Maintenance Item Not Logged", \`<p>The maintenance item could not be saved: \${escapeHtml(error.message)}</p>\`);
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
    await addAuditLog(existing?.id ? "Updated service" : "Created service", "service", record, \`\${record.category || "Service"} \${money(record.basePrice)}\`);
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
  $("#customerDogBackButton")?.addEventListener("click", goToPreviousCustomerDogStep);
  $("#customerDogNextButton")?.addEventListener("click", goToNextCustomerDogStep);
  $("#customerBookingBackButton")?.addEventListener("click", goToPreviousCustomerBookingStep);
  $("#customerBookingNextButton")?.addEventListener("click", goToNextCustomerBookingStep);
  $("#customerStickyBookNowButton")?.addEventListener("click", handleCustomerBookNowClick);
  $("#customerDogForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    if (!validateForm(formEl)) return;
    const uploadStatus = $("#customerUploadStatus");
    try {
      const data = formPayload(formEl);
      const existing = data.id ? readRecords("customerDog").find((record) => record.id === data.id) || {} : {};
      const isNewCustomerDog = !existing?.id;
      const hadCustomerDogsBeforeSave = customerDogsForCurrentUser().length > 0;
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
      customerLastSavedDogId = isNewCustomerDog ? record.id : "";
      renderCustomerDogs();
      renderCustomerFiles();
      renderBoardingDogs();
      const uploadText = vaccinationUploads.length ? \`\${vaccinationUploads.length} vaccination file(s) uploaded.\` : "No new vaccination files uploaded.";
      if (uploadStatus) uploadStatus.textContent = uploadText;
      const message = photo.photoError
        ? \`<p>\${escapeHtml(record.dogName || "Dog")} has been saved, but the profile photo could not be uploaded: \${escapeHtml(photo.photoError)}</p>\`
        : \`<p>\${escapeHtml(record.dogName || "Dog")} has been saved to your list.</p><p>\${escapeHtml(uploadText)}</p>\`;
      if (isNewCustomerDog && !photo.photoError) {
        showToast(hadCustomerDogsBeforeSave ? "Dog added. Choose what to do next." : "First dog added. You can book now.");
      } else {
        showDetailDialog(existing?.id ? "Dog Updated" : "Dog Saved", message);
      }
    } catch (error) {
      if (uploadStatus) uploadStatus.textContent = "The dog profile or files could not be saved.";
      showDetailDialog("Dog Not Saved", \`<p>The dog record could not be saved: \${escapeHtml(error.message)}</p>\`);
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
    const dogServiceCheckbox = event.target.matches('input[type="checkbox"][data-service-scope="dog"]');
    if (dogServiceCheckbox) {
      const quantityInput = formFieldByName($("#customerBookingForm"), \`serviceQuantity-\${event.target.value}\`);
      const scopedQuantityInput = event.target.closest(".service-option")?.querySelector(".service-quantity");
      if (quantityInput) {
        quantityInput.disabled = !event.target.checked;
        if (event.target.checked && !quantityInput.value) quantityInput.value = "1";
      }
      if (scopedQuantityInput) {
        scopedQuantityInput.disabled = !event.target.checked;
        if (event.target.checked && !scopedQuantityInput.value) scopedQuantityInput.value = "1";
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
    renderCustomerServiceOptions();
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
    if (button.dataset.action === "request-customer-service") {
      switchPage("customerRequestsPage");
      openCustomerBookingModal("service");
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
      showDetailDialog("Request Cancelled", \`<p>\${escapeHtml(record.dogName || "This request")} has been cancelled.</p>\`);
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
    const current = new Date(\`\${operationCalendarMonth}-01T12:00:00\`);
    current.setMonth(current.getMonth() - 1);
    operationCalendarMonth = localDateKey(current).slice(0, 7);
    renderOperationHoursSettings();
  });
  $("#nextOperationMonthButton")?.addEventListener("click", () => {
    const current = new Date(\`\${operationCalendarMonth}-01T12:00:00\`);
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
    const nextHash = \`#\${encodeURIComponent(pageId)}\`;
    if (window.location.hash !== nextHash) window.history.replaceState({}, document.title, \`\${window.location.pathname}\${window.location.search}\${nextHash}\`);
  } else if (pageId === "loginPage" && window.location.hash && pageIdFromHash()) {
    window.history.replaceState({}, document.title, \`\${window.location.pathname}\${window.location.search}\`);
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
  if (typeof updateCustomerStickyBookNow === "function") updateCustomerStickyBookNow();
  if (pageId === "ourDogsPage") window.setTimeout(() => $("#ownedDogSearch")?.focus(), 100);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureAppShellVisible(reason = "") {
  const wasBooting = document.body.classList.contains("is-auth-booting");
  if (wasBooting) document.body.classList.remove("is-auth-booting");
  recoverStaleAuthSync(reason);
  if (remoteLoadInProgress && remoteLoadStartedAt && Date.now() - remoteLoadStartedAt > REMOTE_LOAD_STALE_MS) {
    console.warn(\`Recovering stale remote load\${reason ? \` after \${reason}\` : ""}.\`);
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

// Extracted to js/timesheet.js: scheduleAppResumeRecovery


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
      ensureAppShellVisible(\`\${reason}:session-restored\`);
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
//# sourceURL=snuggle-stay/shared.js
`;
(0, eval)(__snuggleStayModuleSource);
