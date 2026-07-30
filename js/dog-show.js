import {
  akcBreedPointSchedule2026,
  akcPointCalculatorBreeds2026,
  akcPointCalculatorStates2026,
  calculateAkcBreedPointScenarios2026,
} from "./dog-show-point-calculator.js?v=20260727-akc-all-breed-calculator-special-outcomes-v2";

// === MODULE: DOG SHOW ===
const DOG_SHOW_VIEW_KEY = "cth-dog-show-view";
const DOG_SHOW_EVENT_KEY = "cth-dog-show-active-event";
const DOG_SHOW_CALENDAR_VIEW_KEY = "cth-dog-show-calendar-view";
const DOG_SHOW_CALENDAR_DATE_KEY = "cth-dog-show-calendar-date";
const DOG_SHOW_MASTER_CALENDAR_VIEW_KEY = "cth-dog-show-master-calendar-view";
const DOG_SHOW_MASTER_CALENDAR_DATE_KEY = "cth-dog-show-master-calendar-date";
const DOG_SHOW_TASK_DAY_KEY = "cth-dog-show-task-expanded-day";
const DOG_SHOW_RING_ROW_STATE_KEY = "cth-dog-show-ring-row-state";
const DOG_SHOW_PROGRESS_TAB_KEY = "cth-dog-show-progress-tab";
const DOG_SHOW_CALCULATOR_KEY = "cth-dog-show-calculator";
const DOG_SHOW_PLANNER_RECORD_ID = "showPlanner-current";
const DOG_SHOW_PLANNER_BREED_CODE = "346";
const DOG_SHOW_PLANNER_DEFAULT_BREED = "Siberian Husky";
const DOG_SHOW_PLANNER_CANDIDATE_KIND = "showPlannerCandidate";
const DOG_SHOW_AKC_JUDGE_SEARCH_URL = "https://www.apps.akc.org/a/judges_directory/index.cfm?sso=rel";
const DOG_SHOW_AKC_JUDGE_RESULTS_URL = "https://www.apps.akc.org/apps/judges_directory/index.cfm?action=results";
const DOG_SHOW_CALENDAR_SLOT_MINUTES = 15;
const DOG_SHOW_STALE_MINUTES = 60;
const DOG_SHOW_EVENT_STATUS_OPTIONS = [
  { value: "Going To", label: "Going To — Planned" },
  { value: "Going", label: "Going — Booked/Paid" },
  { value: "Active", label: "Active — Show Underway" },
  { value: "Completed", label: "Completed" },
];
const DOG_SHOW_PLANNER_EVENT_TYPE_OPTIONS = [
  { value: "all-breed", label: "All-Breed (AB)" },
  { value: "specialty", label: "Specialty" },
  { value: "owner-handled", label: "Owner-Handled (NOHS)" },
  { value: "junior-showmanship", label: "Junior Showmanship" },
  { value: "beginner-puppy", label: "Beginner Puppy" },
  { value: "group-show", label: "Group Show" },
  { value: "limited-breed", label: "Limited-Breed" },
  { value: "open-show", label: "Open Show" },
  { value: "sweepstakes", label: "Sweepstakes" },
];
const DOG_SHOW_AKC_POINT_SCHEDULES = {
  2026: {
    effectiveDate: "2026-05-12",
    divisions: {
      1: {
        states: ["CT", "ME", "MA", "NH", "RI", "VT"],
        dogs: [2, 4, 5, 6, 9],
        bitches: [2, 5, 8, 12, 19],
      },
      2: {
        states: ["DE", "NJ", "NY", "PA"],
        dogs: [2, 3, 4, 6, 10],
        bitches: [2, 4, 6, 10, 16],
      },
      3: {
        states: ["DC", "MD", "NC", "VA", "WV"],
        dogs: [2, 4, 6, 9, 14],
        bitches: [2, 5, 7, 10, 15],
      },
      4: {
        states: ["FL", "GA", "SC"],
        dogs: [2, 3, 4, 5, 7],
        bitches: [2, 4, 5, 7, 10],
      },
      5: {
        states: ["IN", "KY", "MI", "OH"],
        dogs: [2, 3, 4, 5, 7],
        bitches: [2, 4, 5, 7, 10],
      },
      6: {
        states: ["CO", "NV", "UT"],
        dogs: [2, 3, 4, 5, 6],
        bitches: [2, 4, 5, 7, 10],
      },
      7: {
        states: ["KS", "OK", "TX"],
        dogs: [2, 4, 5, 8, 13],
        bitches: [2, 4, 6, 10, 18],
      },
      8: {
        states: ["OR", "WA"],
        dogs: [2, 4, 5, 7, 11],
        bitches: [2, 3, 4, 8, 14],
      },
      9: {
        states: ["AZ", "CA"],
        dogs: [2, 3, 4, 5, 6],
        bitches: [2, 4, 5, 7, 10],
      },
      10: {
        states: ["AK"],
        dogs: [2, 3, 4, 5, 6],
        bitches: [2, 3, 4, 5, 6],
      },
      11: {
        states: ["HI"],
        dogs: [2, 3, 4, 5, 6],
        bitches: [2, 3, 4, 5, 6],
      },
      12: {
        states: ["MX", "PR"],
        dogs: [2, 3, 4, 5, 6],
        bitches: [2, 3, 4, 5, 6],
      },
      13: {
        states: ["ID", "MT", "NE", "NM", "ND", "SD", "WY"],
        dogs: [2, 4, 6, 7, 8],
        bitches: [2, 3, 4, 6, 9],
      },
      14: {
        states: ["AL", "AR", "LA", "MS", "TN"],
        dogs: [2, 4, 5, 6, 7],
        bitches: [2, 4, 6, 7, 10],
      },
      15: {
        states: ["IL", "IA", "MN", "MO", "WI"],
        dogs: [2, 3, 4, 6, 11],
        bitches: [2, 5, 7, 10, 15],
      },
    },
  },
};
const DOG_SHOW_AKC_STATE_NAMES = {
  AK: "Alaska", AL: "Alabama", AR: "Arkansas", AZ: "Arizona", CA: "California",
  CO: "Colorado", CT: "Connecticut", DC: "District of Columbia", DE: "Delaware",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", IA: "Iowa", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  MA: "Massachusetts", MD: "Maryland", ME: "Maine", MI: "Michigan", MN: "Minnesota",
  MO: "Missouri", MS: "Mississippi", MT: "Montana", MX: "Mexico", NC: "North Carolina",
  ND: "North Dakota", NE: "Nebraska", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NV: "Nevada", NY: "New York", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", PR: "Puerto Rico", RI: "Rhode Island",
  SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas",
  UT: "Utah", VA: "Virginia", VT: "Vermont", WA: "Washington", WI: "Wisconsin",
  WV: "West Virginia", WY: "Wyoming",
};
const DOG_SHOW_TASK_COLORS = {
  Grooming: "#7C5CBF",
  Potty: "#B7791F",
  Water: "#2F6F9F",
  Feeding: "#D56A3A",
  Packing: "#4B7A67",
  Paperwork: "#64748B",
  Travel: "#287F87",
  "Ring Prep": "#B4557A",
  "Owner Update": "#3B6FC4",
  General: "#315F85",
};
const DOG_SHOW_DEFAULT_PACKING = [
  "Crates and crate cards",
  "Grooming kit and dryer",
  "Bait, water, and bowls",
  "Leads, armbands, and number clips",
  "Paperwork and vaccination records",
  "First aid and cooling supplies",
];
const DOG_SHOW_EXPENSE_CATEGORIES = [
  "Entry fees",
  "Travel",
  "Lodging",
  "Grooming reservation",
  "Food",
  "Parking",
  "Supplies",
  "Other",
];
const DOG_SHOW_INCOME_CATEGORIES = [
  "Prize money",
  "Group win reward",
  "Best in Show reward",
  "Handling bonus",
  "Owner compensation",
  "Reimbursement",
  "Other income",
];

function dogShowFinanceCategoryOptions(entryType = "expense", selectedCategory = "") {
  const categories = entryType === "income" ? DOG_SHOW_INCOME_CATEGORIES : DOG_SHOW_EXPENSE_CATEGORIES;
  const fallback = entryType === "income" ? "Prize money" : "Other";
  const selected = categories.includes(selectedCategory) ? selectedCategory : fallback;
  return categories
    .map((category) => `<option value="${escapeHtml(category)}"${category === selected ? " selected" : ""}>${escapeHtml(category)}</option>`)
    .join("");
}

let dogShowView = ["home", "dogs", "schedule", "tasks", "more", "progress", "planner", "calendar", "calculator", "expenses"].includes(localStorage.getItem(DOG_SHOW_VIEW_KEY))
  ? localStorage.getItem(DOG_SHOW_VIEW_KEY)
  : "home";
let dogShowDogFilter = "all";
let dogShowDogQuery = "";
let dogShowTaskFilter = "open";
let dogShowSelectedTaskIds = new Set();
let dogShowCalendarView = ["weekend", "day"].includes(localStorage.getItem(DOG_SHOW_CALENDAR_VIEW_KEY)) ? localStorage.getItem(DOG_SHOW_CALENDAR_VIEW_KEY) : "weekend";
let dogShowCalendarDate = localStorage.getItem(DOG_SHOW_CALENDAR_DATE_KEY) || "";
let dogShowMasterCalendarView = ["year", "month", "week", "day"].includes(localStorage.getItem(DOG_SHOW_MASTER_CALENDAR_VIEW_KEY)) ? localStorage.getItem(DOG_SHOW_MASTER_CALENDAR_VIEW_KEY) : "month";
let dogShowMasterCalendarDate = localStorage.getItem(DOG_SHOW_MASTER_CALENDAR_DATE_KEY) || todayDate();
let dogShowCalendarDragTaskId = "";
let dogShowBulkCarePending = false;
let dogShowProgressTab = ["overview", "dogs", "judges"].includes(localStorage.getItem(DOG_SHOW_PROGRESS_TAB_KEY)) ? localStorage.getItem(DOG_SHOW_PROGRESS_TAB_KEY) : "overview";
let dogShowProgressDogKey = "";
let dogShowProgressJudge = "";
let dogShowCalculatorState = loadDogShowCalculatorState();
let dogShowPlannerMetadataRefreshKey = "";

function loadDogShowCalculatorState() {
  const fallback = {
    state: "TX",
    breed: "Siberian Huskies",
    classDogs: 0,
    classBitches: 0,
    championDogs: 0,
    championBitches: 0,
  };
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(DOG_SHOW_CALCULATOR_KEY) || "{}") || {}) };
  } catch {
    return fallback;
  }
}

function dogShowRecords(type, eventId = "") {
  return readRecords(type).filter((record) => !record.removed && (!eventId || record.showEventId === eventId));
}

function dogShowEvents() {
  return dogShowRecords("showEvent").sort((a, b) => {
    const activeDiff = Number(b.status !== "Completed") - Number(a.status !== "Completed");
    return activeDiff || String(a.startDate || "9999-12-31").localeCompare(String(b.startDate || "9999-12-31"));
  });
}

function dogShowActiveEvent() {
  const events = dogShowEvents();
  const savedId = localStorage.getItem(DOG_SHOW_EVENT_KEY) || "";
  const selected = events.find((event) => event.id === savedId) || events.find((event) => event.status !== "Completed") || events[0] || null;
  if (selected && selected.id !== savedId) localStorage.setItem(DOG_SHOW_EVENT_KEY, selected.id);
  return selected;
}

function dogShowEntries(event = dogShowActiveEvent()) {
  return event ? dogShowRecords("showEntry", event.id) : [];
}

function dogShowPrepTaskLogicalKey(task = {}, entries = []) {
  if (task.source !== "auto-ring-prep") {
    return `task:${task.id || [task.showEntryId, task.taskType, task.dueAt, task.title].join(":")}`;
  }
  const entry = entries.find((item) => item.id === task.showEntryId || (item.dogId === task.dogId && item.dogType === task.dogType));
  const firstScheduleId = entry ? dogShowRingSchedules(entry)[0]?.id || "" : "";
  const entryKey = task.showEntryId || `${task.dogType || "dog"}:${task.dogId || "unknown"}`;
  return `auto-ring-prep:${entryKey}:${task.ringScheduleId || firstScheduleId || task.dueAt || task.id}`;
}

function dogShowPreferredPrepTask(left = {}, right = {}) {
  const completedDiff = Number(right.status === "Completed") - Number(left.status === "Completed");
  if (completedDiff) return completedDiff > 0 ? right : left;
  const updatedDiff = new Date(right.updatedAt || right.submittedAt || 0) - new Date(left.updatedAt || left.submittedAt || 0);
  if (updatedDiff) return updatedDiff > 0 ? right : left;
  return right.ringScheduleId && !left.ringScheduleId ? right : left;
}

function dogShowUniqueTasks(tasks = [], entries = []) {
  const byKey = new Map();
  tasks.forEach((task) => {
    const key = dogShowPrepTaskLogicalKey(task, entries);
    const existing = byKey.get(key);
    byKey.set(key, existing && task.source === "auto-ring-prep" ? dogShowPreferredPrepTask(existing, task) : task);
  });
  return [...byKey.values()];
}

function dogShowTasks(event = dogShowActiveEvent()) {
  return event ? dogShowUniqueTasks(dogShowRecords("showDayTask", event.id), dogShowEntries(event)) : [];
}

function dogShowLogs(event = dogShowActiveEvent()) {
  return event ? dogShowRecords("showCareLog", event.id) : [];
}

function dogShowCareLogName(log = {}) {
  const activityType = log.activityType || "Care";
  return activityType === "Potty" && log.pottyType ? `${activityType} (${log.pottyType})` : activityType;
}

function dogShowResults(event = dogShowActiveEvent()) {
  return event ? dogShowRecords("showResult", event.id) : [];
}

function dogShowStaffUsers() {
  return readRecords("settingsUser")
    .filter((user) => !user.removed && ["helper", "staff", "admin"].includes(String(user.role || "").toLowerCase()))
    .sort((a, b) => String(a.name || a.email || "").localeCompare(String(b.name || b.email || "")));
}

function dogShowOwnedDogs() {
  return readRecords("ownedDog").filter((dog) => !dog.removed).sort((a, b) => dogShowDogName(a, "ownedDog").localeCompare(dogShowDogName(b, "ownedDog")));
}

function dogShowBoardingDogs() {
  const records = typeof consolidatedBoardingDogRecords === "function"
    ? consolidatedBoardingDogRecords().filter((dog) => !dog.removed)
    : readRecords("boardingDog").filter((dog) => !dog.removed);
  return records.sort((a, b) => dogShowDogName(a, "boardingDog").localeCompare(dogShowDogName(b, "boardingDog")));
}

function dogShowDogName(record = {}, dogType = "") {
  if (dogType === "boardingDog" || record.dogType === "boardingDog") return record.dogName || record.callName || "Boarding Dog";
  return record.callName || record.showName || record.dogName || "Dog";
}

function dogShowSourceDog(entry = {}) {
  const source = entry.dogType === "boardingDog" ? dogShowBoardingDogs() : dogShowOwnedDogs();
  return source.find((dog) => dog.id === entry.dogId || (dog.sourceRecordIds || []).includes(entry.dogId)) || {};
}

function dogShowEntryName(entry = {}) {
  return entry.dogName || dogShowDogName(dogShowSourceDog(entry), entry.dogType);
}

function dogShowBreed(entry = {}) {
  const dog = dogShowSourceDog(entry);
  return entry.breedDescription || entry.breed || dog.breedDescription || dog.breed || (entry.dogType === "ownedDog" ? "Siberian Husky" : "");
}

function dogShowNameWithBreed(entry = {}) {
  return [dogShowEntryName(entry), dogShowBreed(entry)].filter(Boolean).join(" - ");
}

function dogShowCalendarRingTitle(entry = {}, schedule = {}) {
  return `Ring ${schedule.ringNumber || "--"} - ${dogShowBreed(entry) || "Breed not listed"}`;
}

function dogShowTaskColor(task = {}) {
  return task.color || DOG_SHOW_TASK_COLORS[task.taskType] || DOG_SHOW_TASK_COLORS.General;
}

function dogShowTaskColorStyle(task = {}) {
  const color = dogShowTaskColor(task);
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return `--task-color:${escapeHtml(color)}`;
  const value = Number.parseInt(match[1], 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `--task-color:${color};--task-tint:rgba(${red},${green},${blue},0.3);--task-border:rgba(${red},${green},${blue},0.82)`;
}

function dogShowDateTimeInputValue(value) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return String(value || "").slice(0, 16);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dogShowTaskDurationMinutes(task = {}, fallback = 60) {
  const duration = Number(task.durationMinutes);
  return Math.max(15, Math.min(720, Number.isFinite(duration) && duration > 0 ? duration : fallback));
}

function dogShowTaskEndAt(task = {}, fallback = 60) {
  const start = new Date(task.dueAt || "");
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + dogShowTaskDurationMinutes(task, fallback) * 60000);
}

function dogShowDateTime(date = "", time = "") {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function dogShowRingSchedules(entry = {}) {
  const stored = Array.isArray(entry.ringSchedules) ? entry.ringSchedules.filter((schedule) => schedule && !schedule.removed) : [];
  const legacyExists = [entry.ringDate, entry.ringTime, entry.ringNumber, entry.classEntered].some(Boolean);
  const source = stored.length ? stored : legacyExists ? [{
    id: `${entry.id || "entry"}-ring-1`,
    ringDate: entry.ringDate || "",
    ringTime: entry.ringTime || "",
    ringNumber: entry.ringNumber || "",
    classEntered: entry.classEntered || "",
    armbandNumber: entry.armbandNumber || "",
    judge: entry.judge || "",
    classDogCount: entry.classDogCount,
    classBitchCount: entry.classBitchCount,
    specialDogCount: entry.specialDogCount,
    specialBitchCount: entry.specialBitchCount,
    prepMinutes: entry.prepMinutes,
    readyBufferMinutes: entry.readyBufferMinutes,
  }] : [];
  return source.map((schedule, index) => ({
    ...schedule,
    id: schedule.id || `${entry.id || "entry"}-ring-${index + 1}`,
    prepMinutes: Number(schedule.prepMinutes ?? entry.prepMinutes ?? 45),
    readyBufferMinutes: Number(schedule.readyBufferMinutes ?? entry.readyBufferMinutes ?? 15),
    classDogCount: Math.max(0, Number(schedule.classDogCount ?? 0)),
    classBitchCount: Math.max(0, Number(schedule.classBitchCount ?? 0)),
    specialDogCount: Math.max(0, Number(schedule.specialDogCount ?? 0)),
    specialBitchCount: Math.max(0, Number(schedule.specialBitchCount ?? 0)),
  }));
}

function dogShowEntryCounts(schedule = {}) {
  return {
    classDogs: Math.max(0, Number(schedule.classDogCount ?? 0)),
    classBitches: Math.max(0, Number(schedule.classBitchCount ?? 0)),
    specialDogs: Math.max(0, Number(schedule.specialDogCount ?? 0)),
    specialBitches: Math.max(0, Number(schedule.specialBitchCount ?? 0)),
  };
}

function dogShowEntryCountLabel(schedule = {}) {
  const counts = dogShowEntryCounts(schedule);
  return `${counts.classDogs}-${counts.classBitches}-${counts.specialDogs}-${counts.specialBitches}`;
}

function dogShowEntryCountsEntered(schedule = {}) {
  return Object.values(dogShowEntryCounts(schedule)).some((count) => count > 0);
}

function dogShowEventState(event = {}) {
  const source = [event.state, event.cityState, event.venueAddress, event.venue].filter(Boolean).join(" ");
  const matches = [...source.toUpperCase().matchAll(/(?:^|[\s,])([A-Z]{2})(?=$|[\s,\d])/g)];
  return matches.map((match) => match[1]).find((state) => Object.values(DOG_SHOW_AKC_POINT_SCHEDULES[2026].divisions).some((division) => division.states.includes(state))) || "";
}

function dogShowPointSchedule(event = {}, schedule = {}, stateOverride = "") {
  const ringDate = schedule.ringDate || event.startDate || "";
  const year = Number(String(ringDate).slice(0, 4));
  const yearSchedule = DOG_SHOW_AKC_POINT_SCHEDULES[year];
  if (!yearSchedule || !ringDate || ringDate < yearSchedule.effectiveDate) return null;
  const state = String(stateOverride || dogShowEventState(event)).trim().toUpperCase();
  const divisionEntry = Object.entries(yearSchedule.divisions).find(([, division]) => division.states.includes(state));
  if (!divisionEntry) return null;
  return {
    year,
    state,
    division: Number(divisionEntry[0]),
    ...divisionEntry[1],
  };
}

function dogShowPointsForCount(count = 0, thresholds = []) {
  return thresholds.reduce((points, threshold, index) => count >= threshold ? index + 1 : points, 0);
}

function dogShowBreedPointEstimate(entry = {}, schedule = {}, result = {}) {
  const event = dogShowEvents().find((item) => item.id === entry.showEventId) || dogShowActiveEvent() || {};
  const pointSchedule = dogShowPointSchedule(event, schedule, result.pointScheduleState);
  if (!dogShowEntryCountsEntered(schedule)) return { points: null, reason: "Enter the four breed counts to calculate points." };
  if (!pointSchedule) return { points: null, reason: "Choose the 2026 show location to use its official AKC Siberian Husky schedule." };
  const sourceDog = dogShowSourceDog(entry);
  const sexValue = String(entry.sex || sourceDog.sex || sourceDog.gender || "").toLowerCase();
  const sex = sexValue.includes("female") || sexValue.includes("bitch") ? "bitch" : sexValue.includes("male") || sexValue.includes("dog") ? "dog" : "";
  if (!sex) return { points: null, reason: "Set the dog's sex in Our Dogs before calculating points." };
  const outcome = String(result.outcome || "").toLowerCase();
  const awardText = String(result.awards || "").toUpperCase();
  if (outcome && !["win", "placement"].includes(outcome)) return { points: 0, isMajor: false, count: 0, reason: "This outcome does not earn championship points.", pointSchedule };
  const hasAward = (award) => new RegExp(`(?:^|[\\s,/;+&-])${award}(?=$|[\\s,/;+&-])`).test(awardText);
  const isBob = hasAward("BOB") || hasAward("BOV");
  const isBos = hasAward("BOS");
  const isBow = hasAward("BOW");
  const isWinners = sex === "dog" ? hasAward("WD") : hasAward("WB");
  if (!isBob && !isBos && !isBow && !isWinners) {
    return { points: null, reason: `Add ${sex === "dog" ? "WD" : "WB"}, BOW, BOB/BOV, or BOS to the breed awards.`, pointSchedule };
  }
  const counts = dogShowEntryCounts(schedule);
  const dogPoints = dogShowPointsForCount(counts.classDogs, pointSchedule.dogs);
  const bitchPoints = dogShowPointsForCount(counts.classBitches, pointSchedule.bitches);
  const ownClassCount = sex === "dog" ? counts.classDogs : counts.classBitches;
  const ownSpecialCount = sex === "dog" ? counts.specialDogs : counts.specialBitches;
  const ownThresholds = sex === "dog" ? pointSchedule.dogs : pointSchedule.bitches;
  let competitionCount = ownClassCount;
  if (isBob) competitionCount += counts.specialDogs + counts.specialBitches;
  else if (isBos) competitionCount += ownSpecialCount;
  let points = dogShowPointsForCount(competitionCount, ownThresholds);
  if (isBow) {
    points = Math.max(points, dogPoints, bitchPoints);
    if (points === 0 && counts.classDogs + counts.classBitches >= ownThresholds[0]) points = 1;
  }
  points = Math.min(5, points);
  return {
    points,
    isMajor: points >= 3,
    count: competitionCount,
    reason: `${dogShowEntryCountLabel(schedule)} in ${pointSchedule.state} · 2026 AKC Division ${pointSchedule.division} Siberian Husky schedule`,
    pointSchedule,
  };
}

function dogShowRingDateTime(entry = {}, schedule = dogShowRingSchedules(entry)[0] || {}) {
  return dogShowDateTime(schedule.ringDate || entry.ringDate, schedule.ringTime || entry.ringTime);
}

function dogShowPrepTimes(entry = {}, schedule = dogShowRingSchedules(entry)[0] || {}) {
  const ring = dogShowRingDateTime(entry, schedule);
  if (!ring) return { ring: null, ready: null, start: null };
  const buffer = Math.max(-120, Math.min(60, Number(schedule.readyBufferMinutes ?? entry.readyBufferMinutes ?? 15)));
  const duration = Math.max(0, Number(schedule.prepMinutes ?? entry.prepMinutes ?? 45));
  const ready = new Date(ring.getTime() - buffer * 60000);
  const start = new Date(ready.getTime() - duration * 60000);
  return { ring, ready, start };
}

function dogShowFormatTime(value) {
  const date = value instanceof Date ? value : new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Time missing";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dogShowFormatDate(value = "") {
  const date = value ? new Date(`${value}T12:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return "Date missing";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function dogShowFormatMonthDay(value = "") {
  const date = value ? new Date(`${value}T12:00:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return "--/--";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

function dogShowFormatDateTime(value = "") {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "No log";
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function dogShowLastLog(entry = {}, event = dogShowActiveEvent()) {
  return dogShowLogs(event)
    .filter((log) => log.showEntryId === entry.id || (log.dogId === entry.dogId && log.dogType === entry.dogType))
    .sort((a, b) => new Date(b.loggedAt || b.updatedAt || 0) - new Date(a.loggedAt || a.updatedAt || 0))[0] || null;
}

function dogShowLastActivityLog(entry = {}, activityType = "", event = dogShowActiveEvent()) {
  return dogShowLogs(event)
    .filter((log) => (log.showEntryId === entry.id || (log.dogId === entry.dogId && log.dogType === entry.dogType)) && log.activityType === activityType)
    .sort((a, b) => new Date(b.loggedAt || b.updatedAt || 0) - new Date(a.loggedAt || a.updatedAt || 0))[0] || null;
}

function dogShowLogBelongsToEntry(log = {}, entry = {}) {
  return log.showEntryId === entry.id || (log.dogId === entry.dogId && log.dogType === entry.dogType);
}

function dogShowLastPottyOutcomeLog(entry = {}, outcome = "", event = dogShowActiveEvent()) {
  const target = String(outcome || "").toLowerCase();
  return dogShowLogs(event)
    .filter((log) => dogShowLogBelongsToEntry(log, entry)
      && log.activityType === "Potty"
      && String(log.pottyType || log.note || "").toLowerCase().includes(target))
    .sort((a, b) => new Date(b.loggedAt || b.updatedAt || 0) - new Date(a.loggedAt || a.updatedAt || 0))[0] || null;
}

function dogShowCarePriority(entry = {}, event = dogShowActiveEvent()) {
  const careTypes = [
    { key: "potty", activityType: "Potty", label: "Potty" },
    { key: "water", activityType: "Water", label: "Water" },
    { key: "food", activityType: "Feeding", label: "Food" },
  ].map((careType) => ({ ...careType, log: dogShowLastActivityLog(entry, careType.activityType, event) }));
  const missing = careTypes.find((careType) => !careType.log);
  if (missing) return missing;
  const oldest = careTypes.sort((left, right) => new Date(left.log.loggedAt || left.log.updatedAt || 0) - new Date(right.log.loggedAt || right.log.updatedAt || 0))[0];
  return dogShowMinutesSince(oldest.log.loggedAt || oldest.log.updatedAt) >= DOG_SHOW_STALE_MINUTES
    ? oldest
    : { key: "current", activityType: "", label: "Care current", log: oldest.log };
}

function dogShowActivityTimeHtml(entry = {}, activityType = "") {
  const log = dogShowLastActivityLog(entry, activityType);
  const value = log ? dogShowFormatTime(log.loggedAt || log.updatedAt) : "No log";
  const title = log ? `Last completed ${dogShowFormatDateTime(log.loggedAt || log.updatedAt)}` : "Not logged at this show";
  return `<small title="${escapeHtml(title)}">${log ? "Last " : ""}${escapeHtml(value)}</small>`;
}

function dogShowPottyTimesHtml(entry = {}) {
  const outcomes = [
    { key: "pee", label: "Pee" },
    { key: "poop", label: "Poop" },
  ];
  return `<span class="dog-show-potty-times">${outcomes.map((outcome) => {
    const log = dogShowLastPottyOutcomeLog(entry, outcome.key);
    const value = log ? dogShowFormatTime(log.loggedAt || log.updatedAt) : "--";
    const title = log ? `Last ${outcome.label.toLowerCase()} ${dogShowFormatDateTime(log.loggedAt || log.updatedAt)}` : `${outcome.label} not logged at this show`;
    return `<small title="${escapeHtml(title)}"><i class="dog-show-potty-icon is-${outcome.key}" aria-hidden="true"></i><span>${escapeHtml(outcome.label)} ${escapeHtml(value)}</span></small>`;
  }).join("")}</span>`;
}

function dogShowMedicalSeverity(entry = {}) {
  const log = dogShowLastActivityLog(entry, "Behavior / Medical");
  const severity = String(log?.severity || "").trim();
  if (severity === "Urgent") return { key: "high", label: "Urgent" };
  if (severity === "Needs follow-up") return { key: "medium", label: "Needs follow-up" };
  if (severity === "Observation") return { key: "low", label: "Observation" };
  return { key: "", label: "" };
}

function dogShowMinutesSince(value = "") {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? Math.max(0, Math.floor((Date.now() - time) / 60000)) : Infinity;
}

function dogShowAttentionState(entry = {}) {
  const log = dogShowLastLog(entry);
  if (!log) return "missing";
  return dogShowMinutesSince(log.loggedAt || log.updatedAt) >= DOG_SHOW_STALE_MINUTES ? "stale" : "current";
}

function dogShowStaffLabel(email = "") {
  const user = dogShowStaffUsers().find((item) => normalizeEmail(item.email) === normalizeEmail(email));
  return user?.name || email || "Unassigned";
}

function dogShowStaffOptions(selected = "", includeBlank = true) {
  const options = dogShowStaffUsers().map((user) => {
    const value = user.email || user.id;
    return `<option value="${escapeHtml(value)}"${normalizeEmail(value) === normalizeEmail(selected) ? " selected" : ""}>${escapeHtml(user.name || user.email || "Staff")}</option>`;
  }).join("");
  return (includeBlank ? `<option value="">Unassigned</option>` : "") + options;
}

function dogShowEventWeekendKey(event = {}) {
  return String(event.club || event.name || "Dog Show")
    .toLowerCase()
    .replace(/\bkennel club\b/g, "kc")
    .replace(/\bcounty\b/g, "cnty")
    .replace(/\bincorporated\b|\binc\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function dogShowEventWeekendGroups(events = dogShowEvents()) {
  const currentByClub = new Map();
  const groups = [];
  [...events]
    .sort((left, right) => String(left.startDate || "").localeCompare(String(right.startDate || "")) || String(left.name || left.club || "").localeCompare(String(right.name || right.club || "")))
    .forEach((event) => {
      const key = dogShowEventWeekendKey(event);
      const current = currentByClub.get(key);
      const currentEnd = current?.endDate || "";
      const nextAllowedDate = currentEnd ? dogShowPlannerDateOffset(currentEnd, 1) : "";
      if (current && event.startDate && event.startDate <= nextAllowedDate) {
        current.events.push(event);
        current.startDate = [current.startDate, event.startDate].filter(Boolean).sort()[0] || "";
        current.endDate = [current.endDate, event.endDate || event.startDate].filter(Boolean).sort().at(-1) || current.startDate;
        return;
      }
      const group = {
        id: `show-weekend:${event.id}`,
        key,
        title: event.name || event.club || "Dog Show",
        location: event.venueAddress || event.cityState || event.venue || "Location pending",
        startDate: event.startDate || todayDate(),
        endDate: event.endDate || event.startDate || todayDate(),
        events: [event],
      };
      groups.push(group);
      currentByClub.set(key, group);
    });
  return groups;
}

function dogShowEventOptions(active = dogShowActiveEvent()) {
  const groups = dogShowEventWeekendGroups();
  if (!groups.length) return `<option value="">No shows yet</option>`;
  return groups.map((group) => {
    if (group.events.length === 1) {
      const event = group.events[0];
      const weekend = `${dogShowFormatMonthDay(event.startDate)} - ${dogShowFormatMonthDay(event.endDate || event.startDate)}`;
      return `<option value="${escapeHtml(event.id)}"${event.id === active?.id ? " selected" : ""}>${escapeHtml(`${event.name || "Untitled Show"} · ${weekend} · ${dogShowEventStatus(event.status)}`)}</option>`;
    }
    const label = `${group.title} · ${dogShowFormatMonthDay(group.startDate)} - ${dogShowFormatMonthDay(group.endDate)} · ${group.events.length} events`;
    const options = group.events.map((event) => {
      const day = dogShowFormatMonthDay(event.startDate);
      const weekend = `${dogShowFormatMonthDay(group.startDate)} - ${dogShowFormatMonthDay(group.endDate)}`;
      return `<option value="${escapeHtml(event.id)}"${event.id === active?.id ? " selected" : ""}>${escapeHtml(`${group.title} · ${weekend} · ${day} · ${dogShowEventStatus(event.status)}`)}</option>`;
    }).join("");
    return `<optgroup label="${escapeHtml(label)}">${options}</optgroup>`;
  }).join("");
}

function dogShowEventStatus(value = "") {
  const normalized = String(value || "").trim();
  if (normalized === "Confirmed") return "Going";
  if (DOG_SHOW_EVENT_STATUS_OPTIONS.some((option) => option.value === normalized)) return normalized;
  return "Going To";
}

function dogShowEventStatusOptions(selected = "") {
  const current = dogShowEventStatus(selected);
  return DOG_SHOW_EVENT_STATUS_OPTIONS.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === current ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function dogShowAvatarText(name = "Dog") {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "D";
}

function dogShowPhotoHtml(entry = {}, className = "dog-show-dog-photo") {
  const dog = dogShowSourceDog(entry);
  const name = dogShowEntryName(entry);
  const photoClass = [className, dogPhotoSexClass(dog)].filter(Boolean).join(" ");
  const photo = typeof profilePhotoDirectSource === "function" ? profilePhotoDirectSource(dog) : dog.profilePhotoUrl || "";
  const hasPhoto = typeof profilePhotoHasSource === "function" ? profilePhotoHasSource(dog) : Boolean(photo);
  if (!hasPhoto) return `<span class="${escapeHtml(photoClass)} is-initials">${escapeHtml(dogShowAvatarText(name))}</span>`;
  const attrs = typeof profilePhotoAccessAttrs === "function" ? profilePhotoAccessAttrs({ ...dog, type: entry.dogType }, entry.dogType) : "";
  return `<span class="${escapeHtml(photoClass)}"><img${photo ? ` src="${escapeHtml(photo)}"` : ""} alt="${escapeHtml(name)}"${attrs}${photo ? "" : " hidden"}/><span data-profile-photo-initials${photo ? " hidden" : ""}>${escapeHtml(dogShowAvatarText(name))}</span></span>`;
}

function dogShowResultsForEntry(entry = {}, event = dogShowActiveEvent()) {
  return dogShowResults(event).filter((result) => result.showEntryId === entry.id);
}

function dogShowResultForSchedule(entry = {}, schedule = null, event = dogShowActiveEvent(), results = dogShowResultsForEntry(entry, event)) {
  if (!schedule) return results.find((result) => !result.ringScheduleId) || null;
  const exact = results.find((result) => result.ringScheduleId === schedule.id);
  if (exact) return exact;
  const firstScheduleId = dogShowRingSchedules(entry)[0]?.id || "";
  return schedule.id === firstScheduleId ? results.find((result) => !result.ringScheduleId) || null : null;
}

function dogShowResultProgress(event = dogShowActiveEvent(), entries = dogShowEntries(event)) {
  const resultsByEntry = new Map();
  dogShowResults(event).forEach((result) => {
    if (!resultsByEntry.has(result.showEntryId)) resultsByEntry.set(result.showEntryId, []);
    resultsByEntry.get(result.showEntryId).push(result);
  });
  const appearances = entries
    .filter((entry) => entry.attendanceRole === "Showing")
    .flatMap((entry) => dogShowRingSchedules(entry).map((schedule) => ({ entry, schedule })));
  return {
    logged: appearances.filter(({ entry, schedule }) => dogShowResultForSchedule(entry, schedule, event, resultsByEntry.get(entry.id) || [])).length,
    total: appearances.length,
  };
}

function dogShowOutcomeLabel(value = "") {
  return value === "Scratched" ? "Withdrawn before judging" : value;
}

function dogShowProgressRecords(kind = "") {
  return dogShowRecords("showResult").filter((record) => record.recordKind === kind);
}

function dogShowPlannerRecord() {
  return dogShowProgressRecords("showPlanner").sort((left, right) => new Date(right.updatedAt || right.submittedAt || 0) - new Date(left.updatedAt || left.submittedAt || 0))[0] || {};
}

function dogShowPlannerCalendarBreedName(value = "") {
  const text = String(value || "").trim();
  if (!text) return DOG_SHOW_PLANNER_DEFAULT_BREED;
  const parenthetical = text.match(/^(.+?)\s+(\(.+\))$/);
  if (parenthetical) return `${dogShowPlannerCalendarBreedName(parenthetical[1])} ${parenthetical[2]}`;
  if (/ies$/i.test(text)) return text.replace(/ies$/i, "y");
  if (/Dogs$/i.test(text)) return text.replace(/Dogs$/i, "Dog");
  if (/s$/i.test(text) && !/(?:Belgian Malinois|Bouvier des Flandres|Dogue de Bordeaux|Great Pyrenees|Griffon Bruxellois|Kuvasz)$/i.test(text)) return text.replace(/s$/i, "");
  return text;
}

function dogShowPlannerBreedOptions() {
  return [...new Set([
    DOG_SHOW_PLANNER_DEFAULT_BREED,
    ...akcPointCalculatorBreeds2026().map(dogShowPlannerCalendarBreedName),
  ])].sort((left, right) => left.localeCompare(right));
}

function dogShowPlannerBreedMatches(left = "", right = "") {
  const normalize = (value) => dogShowPlannerCalendarBreedName(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  return Boolean(normalize(left)) && normalize(left) === normalize(right);
}

function dogShowPlannerCandidates() {
  return dogShowProgressRecords(DOG_SHOW_PLANNER_CANDIDATE_KIND)
    .sort((left, right) => String(left.show?.startDate || "").localeCompare(String(right.show?.startDate || "")) || String(left.show?.club || "").localeCompare(String(right.show?.club || "")));
}

function dogShowPlannerShowKey(show = {}) {
  if (show.canonicalId) return `canonical:${show.canonicalId}`;
  if (show.eventNumber) return `akc:${show.eventNumber}`;
  if (show.externalId) return `external:${show.externalId}`;
  return [show.startDate, show.club || show.name, show.cityState].map((value) => String(value || "").trim().toLowerCase()).join("|");
}

function dogShowPlannerShowMatchKeys(show = {}) {
  const sourceIds = show.sourceIds && typeof show.sourceIds === "object" ? Object.values(show.sourceIds) : [];
  const keys = [
    dogShowPlannerShowKey(show),
    show.canonicalId ? `canonical:${show.canonicalId}` : "",
    show.eventNumber ? `akc:${show.eventNumber}` : "",
    show.externalId ? `external:${show.externalId}` : "",
    ...sourceIds.filter(Boolean).map((value) => `external:${value}`),
    [show.startDate, show.club || show.name, show.cityState].map((value) => String(value || "").trim().toLowerCase()).join("|"),
  ];
  return [...new Set(keys.filter(Boolean))];
}

function dogShowPlannerTargets(plan = dogShowPlannerRecord()) {
  if (plan.searchMode === "breed") {
    const breed = dogShowPlannerCalendarBreedName(plan.breedName || plan.shows?.[0]?.breedName);
    return breed ? [{ targetType: "breed", breed }] : [];
  }
  const selected = new Set(Array.isArray(plan.dogKeys) ? plan.dogKeys : []);
  return dogShowPlannerDogs()
    .filter((dog) => selected.has(dog.key))
    .map((dog) => ({
      targetType: "dog",
      dogKey: dog.key,
      dogName: dogShowEntryName(dog.entry),
      breed: dogShowPlannerCalendarBreedName(dogShowBreed(dog.entry) || DOG_SHOW_PLANNER_DEFAULT_BREED),
    }));
}

function dogShowPlannerTargetKey(target = {}) {
  return target.targetType === "dog"
    ? `dog:${target.dogKey || String(target.dogName || "").toLowerCase()}`
    : `breed:${dogShowPlannerCalendarBreedName(target.breed).toLowerCase()}`;
}

function dogShowPlannerCandidateForShow(show = {}) {
  const keys = new Set(dogShowPlannerShowMatchKeys(show));
  return dogShowPlannerCandidates().find((candidate) => {
    if (keys.has(candidate.showKey)) return true;
    return dogShowPlannerShowMatchKeys(candidate.show || {}).some((key) => keys.has(key));
  }) || null;
}

function dogShowPlannerCandidateHasTargets(candidate = {}, plan = dogShowPlannerRecord()) {
  const saved = new Set((candidate.targets || []).map(dogShowPlannerTargetKey));
  const current = dogShowPlannerTargets(plan);
  return Boolean(current.length) && current.every((target) => saved.has(dogShowPlannerTargetKey(target)));
}

function dogShowAppearanceResultsAll() {
  return dogShowRecords("showResult").filter((record) => !record.recordKind || record.recordKind === "appearanceResult");
}

function dogShowDogIdentity(record = {}) {
  const name = record.dogName || dogShowEntryName(record) || "Dog";
  return `${record.dogType || "dog"}:${record.dogId || String(name).trim().toLowerCase()}`;
}

function dogShowProgressDogs() {
  const entries = dogShowRecords("showEntry").filter((entry) => entry.showEventId);
  const byDog = new Map();
  entries.forEach((entry) => {
    const key = dogShowDogIdentity(entry);
    const current = byDog.get(key);
    if (!current || new Date(entry.updatedAt || entry.submittedAt || 0) > new Date(current.updatedAt || current.submittedAt || 0)) byDog.set(key, entry);
  });
  dogShowAppearanceResultsAll().forEach((result) => {
    const key = dogShowDogIdentity(result);
    if (!byDog.has(key)) byDog.set(key, { ...result, id: result.showEntryId || result.id });
  });
  return [...byDog.entries()].map(([key, entry]) => ({ key, entry })).sort((left, right) => dogShowEntryName(left.entry).localeCompare(dogShowEntryName(right.entry)));
}

function dogShowCareerProfile(dogKey = "") {
  return dogShowProgressRecords("careerProfile").find((profile) => profile.dogKey === dogKey || dogShowDogIdentity(profile) === dogKey) || {};
}

function dogShowPointValue(result = {}) {
  const explicit = Number(result.pointsEarned);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  const match = String(result.points || "").match(/\d+(?:\.\d+)?/);
  return match ? Math.max(0, Number(match[0])) : 0;
}

function dogShowMajorValue(result = {}) {
  return result.isMajor === true || result.isMajor === "true" || /\bmajor\b/i.test(String(result.points || "")) ? 1 : 0;
}

function dogShowResultAwardsSummary(result = {}) {
  const breedAward = String(result.awards || "").trim();
  const groupAward = String(result.groupAward || "").trim();
  const groupJudge = String(result.groupJudge || "").trim();
  const groupPoints = dogShowManualGroupPoints(result);
  const bisAward = String(result.bisAward || "").trim();
  const bisJudge = String(result.bisJudge || "").trim();
  const ohGroupAward = String(result.ohGroupAward || "").trim();
  const ohGroupJudge = String(result.ohGroupJudge || "").trim();
  const ohBisAward = String(result.ohBisAward || "").trim();
  const ohBisJudge = String(result.ohBisJudge || "").trim();
  return [
    breedAward ? `BOB/BOV: ${breedAward}` : "",
    groupAward || groupJudge || Number.isFinite(groupPoints) ? `Regular Group: ${groupAward || "Award not set"}${groupJudge ? ` (Judge: ${groupJudge})` : ""}${Number.isFinite(groupPoints) ? ` · ${groupPoints} manual point${groupPoints === 1 ? "" : "s"}` : ""}` : "",
    bisAward || bisJudge ? `Regular BIS: ${bisAward || "Award not set"}${bisJudge ? ` (Judge: ${bisJudge})` : ""}` : "",
    ohGroupAward || ohGroupJudge ? `OH Group: ${ohGroupAward || "Award not set"}${ohGroupJudge ? ` (Judge: ${ohGroupJudge})` : ""}` : "",
    ohBisAward || ohBisJudge ? `OH BIS: ${ohBisAward || "Award not set"}${ohBisJudge ? ` (Judge: ${ohBisJudge})` : ""}` : "",
  ].filter(Boolean).join(" · ");
}

function dogShowResultJudgeNames(result = {}) {
  return [result.judge, result.groupJudge, result.bisJudge, result.ohGroupJudge, result.ohBisJudge].map((name) => String(name || "").trim()).filter(Boolean);
}

function dogShowResultHistoryForDog(dogKey = "") {
  const entries = dogShowRecords("showEntry");
  const events = new Map(dogShowEvents().map((event) => [event.id, event]));
  const byAppearance = new Map();
  dogShowAppearanceResultsAll().filter((result) => dogShowDogIdentity(result) === dogKey).forEach((result) => {
    const key = result.ringScheduleId ? `${result.showEntryId}:${result.ringScheduleId}` : result.id;
    const previous = byAppearance.get(key);
    if (!previous || new Date(result.updatedAt || result.loggedAt || 0) > new Date(previous.updatedAt || previous.loggedAt || 0)) byAppearance.set(key, result);
  });
  return [...byAppearance.values()].map((result) => ({
    result,
    entry: entries.find((entry) => entry.id === result.showEntryId) || {},
    event: events.get(result.showEventId) || {},
  })).sort((left, right) => new Date(`${right.result.ringDate || right.event.startDate || "1900-01-01"}T${right.result.ringTime || "00:00"}`) - new Date(`${left.result.ringDate || left.event.startDate || "1900-01-01"}T${left.result.ringTime || "00:00"}`));
}

function dogShowDogProgress(dog = {}) {
  const profile = dogShowCareerProfile(dog.key);
  const history = dogShowResultHistoryForDog(dog.key);
  const priorPoints = Math.max(0, Number(profile.startingPoints || 0));
  const priorMajors = Math.max(0, Number(profile.startingMajors || 0));
  const loggedPoints = history.reduce((total, item) => total + dogShowPointValue(item.result), 0);
  const loggedMajors = history.reduce((total, item) => total + dogShowMajorValue(item.result), 0);
  const targetPoints = Math.max(1, Number(profile.targetPoints || 15));
  const targetMajors = Math.max(0, Number(profile.targetMajors ?? 2));
  return {
    ...dog,
    profile,
    history,
    priorPoints,
    priorMajors,
    loggedPoints,
    loggedMajors,
    totalPoints: priorPoints + loggedPoints,
    totalMajors: priorMajors + loggedMajors,
    targetPoints,
    targetMajors,
  };
}

function dogShowProgressPercent(progress = {}) {
  const pointRatio = progress.totalPoints / Math.max(1, progress.targetPoints);
  return Math.max(0, Math.min(100, Math.round(pointRatio * 100)));
}

function dogShowProgressBarHtml(progress = {}) {
  const percent = dogShowProgressPercent(progress);
  return `<div class="dog-show-title-progress" role="progressbar" aria-label="${progress.totalPoints} of ${progress.targetPoints} championship points" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>`;
}

function dogShowJudgeNotes() {
  return dogShowProgressRecords("judgeNote").sort((left, right) => String(left.judgeName || "").localeCompare(String(right.judgeName || "")));
}

function dogShowJudgeNameKey(name = "") {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:mr|mrs|ms|miss|dr|judge|col)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dogShowObservedJudges() {
  const names = new Map();
  dogShowRecords("showEntry").forEach((entry) => dogShowRingSchedules(entry).forEach((schedule) => {
    if (schedule.judge) names.set(dogShowJudgeNameKey(schedule.judge), schedule.judge.trim());
  }));
  dogShowAppearanceResultsAll().forEach((result) => {
    dogShowResultJudgeNames(result).forEach((judge) => names.set(dogShowJudgeNameKey(judge), judge));
  });
  dogShowJudgeNotes().forEach((note) => {
    if (note.judgeName) names.set(dogShowJudgeNameKey(note.judgeName), note.judgeName.trim());
  });
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}

function dogShowJudgeEvidence(name = "") {
  const key = dogShowJudgeNameKey(name);
  const results = dogShowAppearanceResultsAll().filter((result) => dogShowResultJudgeNames(result).some((judge) => dogShowJudgeNameKey(judge) === key));
  return {
    results,
    placements: results.filter((result) => ["Win", "Placement"].includes(result.outcome) || result.groupAward || result.bisAward || result.ohGroupAward || result.ohBisAward).length,
    points: results.reduce((total, result) => total + dogShowPointValue(result), 0),
    majors: results.reduce((total, result) => total + dogShowMajorValue(result), 0),
  };
}

function dogShowJudgeEvidenceResults(name = "", kind = "entries") {
  const evidence = dogShowJudgeEvidence(name);
  if (kind === "placements") {
    return evidence.results.filter((result) => ["Win", "Placement"].includes(result.outcome) || result.groupAward || result.bisAward || result.ohGroupAward || result.ohBisAward);
  }
  if (kind === "points") return evidence.results.filter((result) => dogShowPointValue(result) > 0 || dogShowMajorValue(result) > 0);
  return evidence.results;
}

function dogShowJudgeRoleSummary(result = {}, judgeName = "") {
  const key = dogShowJudgeNameKey(judgeName);
  return [
    [result.judge, "Breed"],
    [result.groupJudge, "Regular Group"],
    [result.bisJudge, "Regular BIS"],
    [result.ohGroupJudge, "OH Group"],
    [result.ohBisJudge, "OH BIS"],
  ].filter(([name]) => dogShowJudgeNameKey(name) === key).map(([, role]) => role).join(", ");
}

function dogShowAkcJudgeSearchParts(judgeName = "") {
  const parts = String(judgeName || "")
    .replace(/^(?:mr|mrs|ms|miss|dr|col|colonel|hon|judge)\.?\s+/i, "")
    .replace(/\s+(?:jr|sr|ii|iii|iv)\.?$/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    firstName: parts.length > 1 ? parts[0] : "",
    lastName: parts.at(-1) || "",
  };
}

function dogShowAkcJudgeSearchFormHtml(judgeName = "") {
  const { firstName, lastName } = dogShowAkcJudgeSearchParts(judgeName);
  return `<form id="dogShowAkcJudgeSearchForm" class="dog-show-judge-directory-form" action="${DOG_SHOW_AKC_JUDGE_RESULTS_URL}" method="post">
    <input type="hidden" name="searchtype" value="simple"/>
    <input type="hidden" name="breeds" value="999"/>
    <input type="hidden" name="judge_id" value=""/>
    <input type="hidden" name="firstName" value="${escapeHtml(firstName)}"/>
    <input type="hidden" name="lastName" value="${escapeHtml(lastName)}"/>
    <button type="submit" class="secondary-button dog-show-judge-directory-link">Search ${escapeHtml(judgeName)} in the AKC Judges Directory</button>
  </form>`;
}

function submitDogShowAkcJudgeSearch(form) {
  const targetName = `akcJudgeSearch${Date.now()}`;
  const directoryWindow = window.open(DOG_SHOW_AKC_JUDGE_SEARCH_URL, targetName);
  if (!directoryWindow) {
    showToast("Allow pop-ups to search the AKC Judges Directory.");
    return;
  }
  form.target = targetName;
  let submitted = false;
  const submitSearch = () => {
    if (submitted) return;
    submitted = true;
    HTMLFormElement.prototype.submit.call(form);
  };
  try {
    directoryWindow.addEventListener("load", submitSearch, { once: true });
  } catch {
    // The timed fallback below covers browsers that isolate the new window immediately.
  }
  window.setTimeout(submitSearch, 1500);
}

function openDogShowJudgeEvidence(judgeName = "", kind = "entries", dogKeys = []) {
  const labels = { entries: "Entries Logged", placements: "Placements", points: "Points" };
  const selectedDogs = new Set(Array.isArray(dogKeys) ? dogKeys : []);
  const results = dogShowJudgeEvidenceResults(judgeName, kind).filter((result) => !selectedDogs.size || selectedDogs.has(dogShowDogIdentity(result)));
  const events = new Map(dogShowEvents().map((event) => [event.id, event]));
  const entries = new Map(dogShowRecords("showEntry").map((entry) => [entry.id, entry]));
  const rows = results.map((result) => {
    const event = events.get(result.showEventId) || {};
    const entry = entries.get(result.showEntryId) || {};
    const points = dogShowPointValue(result);
    const summary = [dogShowOutcomeLabel(result.outcome), result.placement, dogShowResultAwardsSummary(result)].filter(Boolean).join(" · ") || "Result logged";
    return `<button type="button" class="dog-show-judge-evidence-row" data-action="open-progress-result" data-result-id="${escapeHtml(result.id)}">
      <span><strong>${escapeHtml(result.dogName || dogShowEntryName(entry) || "Dog")}</strong><small>${escapeHtml([event.name || result.showName || "Dog Show", dogShowFormatDate(result.ringDate || event.startDate), dogShowJudgeRoleSummary(result, judgeName)].filter(Boolean).join(" · "))}</small><em>${escapeHtml(summary)}</em></span>
      <span class="dog-show-judge-evidence-points"><strong>${points ? `+${points}` : "—"}</strong><small>${dogShowMajorValue(result) ? "Major" : points ? "points" : "No points"}</small></span>
    </button>`;
  }).join("");
  openDogShowDialog(`${labels[kind] || labels.entries}: ${judgeName}`, `<section class="dog-show-judge-evidence-dialog">
    <p>Logged ring results where this person was recorded as a breed, group, BIS, or owner-handled judge${selectedDogs.size ? " for the dogs selected in this plan" : ""}.</p>
    ${dogShowAkcJudgeSearchFormHtml(judgeName)}
    <small class="dog-show-judge-directory-note">Use the official AKC search to review approvals, breed eligibility, and assignment history.</small>
    <div class="dog-show-judge-evidence-list">${rows || dogShowRenderEmpty("No matching results", `There are no ${String(labels[kind] || labels.entries).toLowerCase()} to show for this judge${selectedDogs.size ? " and the selected dogs" : ""}.`)}</div>
  </section>`);
}

function dogShowJudgeNote(name = "") {
  const key = dogShowJudgeNameKey(name);
  return dogShowJudgeNotes().find((note) => dogShowJudgeNameKey(note.judgeName) === key) || {};
}

function dogShowProgressNavHtml() {
  return `<nav class="dog-show-progress-nav segmented-control" aria-label="Show progress views">${[
    ["overview", "Overview"],
    ["dogs", "Dogs"],
    ["judges", "Judges"],
  ].map(([value, label]) => `<button type="button" data-progress-tab="${value}" class="${dogShowProgressTab === value ? "is-active" : ""}" aria-pressed="${dogShowProgressTab === value}">${label}</button>`).join("")}</nav>`;
}

function dogShowProgressDogRowHtml(progress = {}, action = "select-progress-dog") {
  const remainingPoints = Math.max(0, progress.targetPoints - progress.totalPoints);
  const remainingMajors = Math.max(0, progress.targetMajors - progress.totalMajors);
  const titleComplete = !remainingPoints && !remainingMajors;
  return `<button type="button" class="dog-show-progress-dog-row" data-action="${action}" data-dog-key="${escapeHtml(progress.key)}">
    ${dogShowPhotoHtml(progress.entry, "dog-show-progress-photo")}
    <span class="dog-show-progress-dog-copy"><strong>${escapeHtml(dogShowNameWithBreed(progress.entry))}</strong><small>${progress.totalPoints} of ${progress.targetPoints} points · ${progress.totalMajors} of ${progress.targetMajors} majors</small>${dogShowProgressBarHtml(progress)}<em>${titleComplete ? "Title requirements reached" : `${remainingPoints} points · ${remainingMajors} majors needed`}</em></span>
    <span class="dog-show-progress-total"><strong>${progress.totalPoints}</strong><small>points</small></span>
  </button>`;
}

function dogShowProgressOverviewHtml() {
  const dogs = dogShowProgressDogs().map(dogShowDogProgress);
  const results = dogShowAppearanceResultsAll();
  const totalPoints = dogs.reduce((total, dog) => total + dog.totalPoints, 0);
  const totalMajors = dogs.reduce((total, dog) => total + dog.totalMajors, 0);
  const titled = dogs.filter((dog) => dog.totalPoints >= dog.targetPoints && dog.totalMajors >= dog.targetMajors).length;
  const judgeNotes = dogShowJudgeNotes();
  return `<div class="dog-show-progress-overview">
    <section class="dog-show-progress-summary"><div><span>Career points tracked</span><strong>${totalPoints}</strong><small>${dogs.reduce((total, dog) => total + dog.loggedPoints, 0)} earned in logged shows</small></div><div><span>Majors tracked</span><strong>${totalMajors}</strong><small>Prior and logged majors</small></div><div><span>Results logged</span><strong>${results.length}</strong><small>Unique ring appearances</small></div><div><span>Titles reached</span><strong>${titled}</strong><small>Based on each dog’s targets</small></div></section>
    <section class="dog-show-progress-section"><header><div><h3>Dog Progress</h3><p>Prior totals remain separate from points earned in this dashboard.</p></div><button type="button" class="secondary-button" data-progress-tab="dogs">Review Dogs</button></header><div class="dog-show-progress-list">${dogs.length ? dogs.map((dog) => dogShowProgressDogRowHtml(dog)).join("") : dogShowRenderEmpty("No show history yet", "Add dogs and ring results to begin tracking progress.")}</div></section>
    <section class="dog-show-progress-section"><header><div><h3>Judge Intelligence</h3><p>Internal notes help the team choose future entries.</p></div><button type="button" class="secondary-button" data-action="edit-judge-note">Add Judge Note</button></header><div class="dog-show-judge-snapshot">${judgeNotes.length ? judgeNotes.slice(0, 4).map((note) => `<button type="button" data-action="select-progress-judge" data-judge="${escapeHtml(note.judgeName)}"><span class="dog-show-judge-rating is-${escapeHtml(String(note.recommendation || "Watch").toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(note.recommendation || "Watch")}</span><strong>${escapeHtml(note.judgeName || "Judge")}</strong><small>${escapeHtml(note.preferenceTags || "No preferences noted")}</small></button>`).join("") : `<p class="muted-copy">No judge notes have been added.</p>`}</div></section>
  </div>`;
}

function dogShowProgressHistoryHtml(progress = {}) {
  if (!progress.history.length) return dogShowRenderEmpty("No ring results logged", "Results will appear here after they are saved for a ring appearance.");
  return progress.history.map(({ result, event }) => {
    const points = dogShowPointValue(result);
    return `<button type="button" class="dog-show-progress-history-row" data-action="open-progress-result" data-result-id="${escapeHtml(result.id)}"><span class="dog-show-history-date">${escapeHtml(dogShowFormatDate(result.ringDate || event.startDate))}</span><span><strong>${escapeHtml(event.name || result.showName || "Dog Show")}</strong><small>${escapeHtml([result.ringNumber ? `Ring ${result.ringNumber}` : "Ring not set", result.classEntered || "Class not set", result.judge ? `Judge: ${result.judge}` : "Judge not set"].join(" · "))}</small><em>${escapeHtml([dogShowOutcomeLabel(result.outcome), result.placement, dogShowResultAwardsSummary(result)].filter(Boolean).join(" · ") || "Result logged")}</em></span><span class="dog-show-history-points"><strong>+${points}</strong><small>${dogShowMajorValue(result) ? "Major" : "points"}</small></span></button>`;
  }).join("");
}

function dogShowProgressDogsHtml() {
  const dogs = dogShowProgressDogs().map(dogShowDogProgress);
  if (!dogShowProgressDogKey || !dogs.some((dog) => dog.key === dogShowProgressDogKey)) dogShowProgressDogKey = dogs[0]?.key || "";
  const selected = dogs.find((dog) => dog.key === dogShowProgressDogKey);
  if (!selected) return dogShowRenderEmpty("No show dogs yet", "Add a dog to a show weekend to create its progress profile.");
  return `<div class="dog-show-progress-dogs-layout"><aside class="dog-show-progress-dog-selector" aria-label="Show dogs">${dogs.map((dog) => `<button type="button" data-action="select-progress-dog" data-dog-key="${escapeHtml(dog.key)}" class="${dog.key === selected.key ? "is-active" : ""}">${dogShowPhotoHtml(dog.entry, "dog-show-progress-photo")}<span><strong>${escapeHtml(dogShowEntryName(dog.entry))}</strong><small>${dog.totalPoints} points · ${dog.totalMajors} majors</small></span></button>`).join("")}</aside>
    <div class="dog-show-progress-dog-detail"><section class="dog-show-progress-dog-hero">${dogShowPhotoHtml(selected.entry, "dog-show-progress-hero-photo")}<div><span>Career Progress</span><h3>${escapeHtml(dogShowNameWithBreed(selected.entry))}</h3><p>${selected.totalPoints} of ${selected.targetPoints} points · ${selected.totalMajors} of ${selected.targetMajors} majors</p>${dogShowProgressBarHtml(selected)}</div><button type="button" class="secondary-button" data-action="edit-career-baseline" data-dog-key="${escapeHtml(selected.key)}">Edit Prior Points</button></section>
      <section class="dog-show-progress-breakdown"><div><span>Prior points</span><strong>${selected.priorPoints}</strong><small>${selected.priorMajors} prior majors</small></div><div><span>Logged here</span><strong>${selected.loggedPoints}</strong><small>${selected.loggedMajors} logged majors</small></div><div><span>Current total</span><strong>${selected.totalPoints}</strong><small>${Math.max(0, selected.targetPoints - selected.totalPoints)} points needed</small></div></section>
      <section class="dog-show-progress-section"><header><div><h3>Show History</h3><p>Each result is tied to one ring appearance.</p></div></header><div class="dog-show-progress-history">${dogShowProgressHistoryHtml(selected)}</div></section>
    </div></div>`;
}

function dogShowProgressJudgesHtml() {
  const judges = dogShowObservedJudges();
  if (!dogShowProgressJudge || !judges.some((judge) => dogShowJudgeNameKey(judge) === dogShowJudgeNameKey(dogShowProgressJudge))) dogShowProgressJudge = judges[0] || "";
  const note = dogShowJudgeNote(dogShowProgressJudge);
  const evidence = dogShowJudgeEvidence(dogShowProgressJudge);
  return `<div class="dog-show-progress-judges-layout"><aside class="dog-show-judge-selector"><button type="button" class="secondary-button" data-action="edit-judge-note">Add Judge</button>${judges.map((judge) => {
    const judgeNote = dogShowJudgeNote(judge);
    return `<button type="button" data-action="select-progress-judge" data-judge="${escapeHtml(judge)}" class="${dogShowJudgeNameKey(judge) === dogShowJudgeNameKey(dogShowProgressJudge) ? "is-active" : ""}"><span class="dog-show-judge-rating is-${escapeHtml(String(judgeNote.recommendation || "Watch").toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(judgeNote.recommendation || "Watch")}</span><span class="dog-show-judge-selector-copy"><strong>${escapeHtml(judge)}</strong><small>${dogShowJudgeEvidence(judge).results.length} logged result${dogShowJudgeEvidence(judge).results.length === 1 ? "" : "s"}</small></span></button>`;
  }).join("")}</aside><div class="dog-show-judge-detail">${dogShowProgressJudge ? `<section class="dog-show-judge-hero"><div><span>Judge Intelligence</span><h3>${escapeHtml(dogShowProgressJudge)}</h3><p>${escapeHtml(note.preferenceTags || "No preference tags yet")}</p></div><button type="button" class="secondary-button" data-action="edit-judge-note" data-judge="${escapeHtml(dogShowProgressJudge)}">Edit Notes</button></section><section class="dog-show-progress-breakdown dog-show-judge-metrics"><button type="button" class="dog-show-judge-metric" data-action="open-judge-evidence" data-evidence-kind="entries" aria-label="View entries logged under ${escapeHtml(dogShowProgressJudge)}"><span>Entries logged</span><strong>${evidence.results.length}</strong><small>View result details <i aria-hidden="true">›</i></small></button><button type="button" class="dog-show-judge-metric" data-action="open-judge-evidence" data-evidence-kind="placements" aria-label="View placements under ${escapeHtml(dogShowProgressJudge)}"><span>Placements</span><strong>${evidence.placements}</strong><small>View wins and placements <i aria-hidden="true">›</i></small></button><button type="button" class="dog-show-judge-metric" data-action="open-judge-evidence" data-evidence-kind="points" aria-label="View points earned under ${escapeHtml(dogShowProgressJudge)}"><span>Points</span><strong>${evidence.points}</strong><small>${evidence.majors} major${evidence.majors === 1 ? "" : "s"} <i aria-hidden="true">›</i></small></button></section><section class="dog-show-progress-section"><header><div><h3>Team Notes</h3><p>Internal observations only. Treat patterns as guidance, not guarantees.</p></div></header><dl class="dog-show-judge-notes"><div><dt>Recommendation</dt><dd>${escapeHtml(note.recommendation || "Watch")}</dd></div><div><dt>Best fit dogs</dt><dd>${escapeHtml(note.bestFitDogs || "Not recorded")}</dd></div><div><dt>Preferences</dt><dd>${escapeHtml(note.preferenceTags || "Not recorded")}</dd></div><div><dt>Notes</dt><dd>${escapeHtml(note.notes || "No internal notes yet")}</dd></div></dl></section>` : dogShowRenderEmpty("No judges found", "Add a judge note or enter judges on ring appearances.", "edit-judge-note", "Add Judge")}</div></div>`;
}

function dogShowProgressHtml() {
  const content = dogShowProgressTab === "dogs" ? dogShowProgressDogsHtml() : dogShowProgressTab === "judges" ? dogShowProgressJudgesHtml() : dogShowProgressOverviewHtml();
  return `<div class="dog-show-view dog-show-progress-view"><section class="dog-show-progress-heading"><div><span>SHOW RECORDS</span><h3>Show Progress</h3><p>Career points, ring results, and internal judge intelligence.</p></div></section>${dogShowProgressNavHtml()}${content}</div>`;
}

function dogShowConflictEntryIds(entries = dogShowEntries()) {
  const conflicts = new Set();
  const appearances = entries.filter((entry) => entry.attendanceRole === "Showing").flatMap((entry) => dogShowRingSchedules(entry).map((schedule) => ({ entry, schedule, times: dogShowPrepTimes(entry, schedule) })).filter((item) => item.times.ring));
  appearances.forEach((left, index) => {
    const leftPeople = [left.entry.handlerEmail, left.entry.helperEmail].filter(Boolean).map(normalizeEmail);
    appearances.slice(index + 1).forEach((right) => {
      const sharedPerson = [right.entry.handlerEmail, right.entry.helperEmail].filter(Boolean).map(normalizeEmail).some((email) => leftPeople.includes(email));
      const leftTimes = left.times;
      const rightTimes = right.times;
      const overlaps = leftTimes.start < rightTimes.ring && rightTimes.start < leftTimes.ring;
      if (sharedPerson && overlaps) {
        conflicts.add(left.entry.id);
        conflicts.add(right.entry.id);
      }
    });
  });
  return conflicts;
}

function dogShowEntryRowHtml(entry = {}, options = {}) {
  const state = dogShowAttentionState(entry);
  const carePriority = dogShowCarePriority(entry);
  const lastLog = dogShowLastLog(entry);
  const schedule = dogShowRingSchedules(entry)[0] || {};
  const scheduleCount = dogShowRingSchedules(entry).length;
  const prep = dogShowPrepTimes(entry, schedule);
  const showing = entry.attendanceRole === "Showing";
  const medicalSeverity = dogShowMedicalSeverity(entry);
  const timestamp = lastLog ? dogShowFormatTime(lastLog.loggedAt || lastLog.updatedAt) : "No log";
  const timestampTitle = lastLog ? dogShowFormatDateTime(lastLog.loggedAt || lastLog.updatedAt) : "No care has been logged at this show.";
  const ringFlag = showing
    ? `${schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring not set"} - ${schedule.ringTime ? dogShowFormatTime(prep.ring) : "Time not set"}`
    : "";
  const meta = showing
    ? [scheduleCount > 1 ? `${scheduleCount} appearances` : "", dogShowStaffLabel(entry.handlerEmail)].filter(Boolean).join(" · ")
    : ["Socialization", dogShowStaffLabel(entry.helperEmail || entry.handlerEmail)].filter(Boolean).join(" · ");
  const quickActions = options.quickActions ? `<div class="dog-show-card-quick-actions" role="group" aria-label="Quick care for ${escapeHtml(dogShowEntryName(entry))}">
    <button type="button" data-action="open-show-potty" data-care-action="potty" data-id="${escapeHtml(entry.id)}"><strong>Potty</strong>${dogShowPottyTimesHtml(entry)}</button>
    <button type="button" data-action="quick-show-log" data-care-action="water" data-log-type="Water" data-id="${escapeHtml(entry.id)}"><strong>Water</strong>${dogShowActivityTimeHtml(entry, "Water")}</button>
    <button type="button" data-action="quick-show-log" data-care-action="food" data-log-type="Feeding" data-id="${escapeHtml(entry.id)}"><strong>Food</strong>${dogShowActivityTimeHtml(entry, "Feeding")}</button>
    <button type="button"${medicalSeverity.key ? ` class="severity-${medicalSeverity.key}" title="Latest severity: ${escapeHtml(medicalSeverity.label)}"` : ""} data-action="open-show-note" data-care-action="medical" data-log-type="Behavior / Medical" data-id="${escapeHtml(entry.id)}"><strong>Medical/Behavior</strong>${dogShowActivityTimeHtml(entry, "Behavior / Medical")}</button>
  </div>` : "";
  return `<article class="dog-show-dog-row is-${state} care-priority-${carePriority.key}${options.conflict ? " has-conflict" : ""}" title="Care priority: ${escapeHtml(carePriority.label)}">
    <button type="button" class="dog-show-dog-primary" data-action="open-show-dog" data-id="${escapeHtml(entry.id)}">
      ${dogShowPhotoHtml(entry)}
      <span class="dog-show-dog-copy"><strong>${escapeHtml(dogShowEntryName(entry))}</strong><span class="dog-show-dog-meta">${ringFlag ? `<span class="dog-show-ring-flag">${escapeHtml(ringFlag)}</span>` : ""}<small>${escapeHtml(meta)}</small></span></span>
      <span class="dog-show-dog-status"><span class="dog-show-time-chip is-${state}" title="${escapeHtml(timestampTitle)}">${escapeHtml(timestamp)}</span><span class="dog-show-role-chip">${showing ? "Show" : "Social"}</span></span>
    </button>
    ${quickActions}
  </article>`;
}

function dogShowRenderEmpty(title, copy, action = "new-show-event", label = "Create Show") {
  return `<section class="dog-show-empty"><span>S</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p><button type="button" data-action="${escapeHtml(action)}">${escapeHtml(label)}</button></section>`;
}

function dogShowUpcomingTableHtml(activeEvent = dogShowActiveEvent()) {
  const events = dogShowEvents()
    .filter((event) => dogShowPlannerLifecycleStatus(event) !== "Completed")
    .sort((left, right) => String(left.startDate || "").localeCompare(String(right.startDate || "")) || String(left.name || "").localeCompare(String(right.name || "")));
  if (!events.length) return "";
  const rows = events.map((event) => {
    const entries = dogShowEntries(event);
    const dogNames = entries.map(dogShowEntryName);
    const helpers = (Array.isArray(event.helperEmails) ? event.helperEmails : []).map(dogShowStaffLabel);
    const location = event.venueAddress || event.cityState || event.venue || "Location pending";
    return `<tr class="${event.id === activeEvent?.id ? "is-current" : ""}" data-show-table-row="${escapeHtml(event.id)}">
      <td class="dog-show-upcoming-select-cell"><input type="checkbox" data-show-table-select="${escapeHtml(event.id)}" aria-label="Select ${escapeHtml(event.name || "show")}"/></td>
      <td data-label="Show"><strong>${escapeHtml(event.name || event.club || "Dog Show")}</strong><small>${escapeHtml(location)}</small></td>
      <td data-label="Dates"><strong>${escapeHtml(dogShowPlannerDateRange(event))}</strong>${event.entryClosingDate ? `<small>Closes ${escapeHtml(dogShowFormatDate(event.entryClosingDate))}</small>` : ""}</td>
      <td data-label="Status"><select data-show-quick-status="${escapeHtml(event.id)}" aria-label="Status for ${escapeHtml(event.name || "show")}">${dogShowEventStatusOptions(event.status)}</select></td>
      <td data-label="Dogs"><strong>${entries.length}</strong><small title="${escapeHtml(dogNames.join(", "))}">${escapeHtml(dogNames.length ? dogNames.join(", ") : "No dogs assigned")}</small></td>
      <td data-label="Helpers"><strong>${helpers.length}</strong><small title="${escapeHtml(helpers.join(", "))}">${escapeHtml(helpers.length ? helpers.join(", ") : "No helpers assigned")}</small></td>
      <td data-label="Actions"><div class="dog-show-upcoming-actions"><button type="button" class="secondary-button" data-action="open-show-table-event" data-event-id="${escapeHtml(event.id)}">Open</button><button type="button" class="secondary-button" data-action="manage-show-table-team" data-event-id="${escapeHtml(event.id)}">Dogs & Helpers</button><button type="button" class="secondary-button" data-action="edit-show-table-event" data-event-id="${escapeHtml(event.id)}">Setup</button></div></td>
    </tr>`;
  }).join("");
  return `<section class="dog-show-upcoming-shows">
    <header><div><span>SHOW MANAGEMENT</span><h3>Upcoming & Current Shows</h3><p>Update registration status, dogs, and helpers without opening each show.</p></div><strong>${events.length} show${events.length === 1 ? "" : "s"}</strong></header>
    <div class="dog-show-upcoming-bulk">
      <label class="inline-check"><input type="checkbox" data-show-table-select-all/><span>Select all</span></label>
      <label>Set selected shows to<select data-show-table-bulk-status>${dogShowEventStatusOptions("Going")}</select></label>
      <button type="button" data-action="apply-show-table-status">Apply Status</button>
    </div>
    <div class="dog-show-upcoming-table-wrap"><table class="dog-show-upcoming-table">
      <thead><tr><th scope="col"><span class="visually-hidden">Select</span></th><th scope="col">Show</th><th scope="col">Dates</th><th scope="col">Status</th><th scope="col">Dogs</th><th scope="col">Helpers</th><th scope="col">Quick actions</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </section>`;
}

function dogShowHomeHtml(event) {
  const entries = dogShowEntries(event);
  const tasks = dogShowTasks(event);
  const resultProgress = dogShowResultProgress(event, entries);
  const conflicts = dogShowConflictEntryIds(entries);
  const needCare = entries.filter((entry) => dogShowAttentionState(entry) !== "current");
  const openTasks = tasks.filter((task) => task.status !== "Completed");
  const showing = entries.filter((entry) => entry.attendanceRole === "Showing");
  const nextRing = showing.flatMap((entry) => dogShowRingSchedules(entry).map((schedule) => ({ entry, schedule, time: dogShowRingDateTime(entry, schedule) }))).filter((item) => item.time && item.time >= new Date()).sort((a, b) => a.time - b.time)[0];
  const nextActions = [...entries].sort((a, b) => {
    const careDiff = ["missing", "stale", "current"].indexOf(dogShowAttentionState(a)) - ["missing", "stale", "current"].indexOf(dogShowAttentionState(b));
    const aStart = dogShowRingSchedules(a).map((schedule) => dogShowPrepTimes(a, schedule).start?.getTime() || Infinity).sort((left, right) => left - right)[0] || Infinity;
    const bStart = dogShowRingSchedules(b).map((schedule) => dogShowPrepTimes(b, schedule).start?.getTime() || Infinity).sort((left, right) => left - right)[0] || Infinity;
    return careDiff || aStart - bStart;
  }).slice(0, 10);
  const assignedEntries = entries.filter((entry) => entry.handlerEmail || entry.helperEmail);
  const assignmentText = entries.length ? `${assignedEntries.length} of ${entries.length} dogs assigned to a handler or care helper` : "No dogs added to this show yet";
  const staySummary = [event.stayType, event.stayName, event.stayAddress].filter(Boolean).join(" · ");
  return `<div class="dog-show-view dog-show-home-view">
    ${dogShowUpcomingTableHtml(event)}
    <section class="dog-show-event-summary"><div><span>Dog Shows</span><h3>${escapeHtml(event.name || "Show Weekend")}</h3><p>${escapeHtml([dogShowFormatDate(event.startDate), event.venue, event.venueAddress || event.cityState].filter(Boolean).join(" · "))}</p>${staySummary ? `<small>Stay: ${escapeHtml(staySummary)}</small>` : ""}</div><button type="button" class="secondary-button" data-action="edit-show-event">Show Setup</button></section>
    <section class="dog-show-stat-grid">
      <article><span>Need care</span><strong>${needCare.length}</strong><small>stale or no log</small></article>
      <article><span>Next ring</span><strong>${nextRing ? dogShowFormatTime(nextRing.time) : "--"}</strong><small>${nextRing ? dogShowEntryName(nextRing.entry) : "No upcoming ring"}</small></article>
      <article><span>Open tasks</span><strong>${openTasks.length}</strong><small>${conflicts.size ? `${conflicts.size} schedule conflicts` : "team workload"}</small></article>
      <article><span>Results</span><strong>${resultProgress.logged}/${resultProgress.total}</strong><small>ring appearances logged</small></article>
    </section>
    <section class="dog-show-section-band"><div><h3>Next Actions</h3><p>Care status first, then preparation time.</p></div><button type="button" class="secondary-button" data-dog-show-view="dogs">All Dogs</button></section>
    <div class="dog-show-roster-list">${nextActions.length ? nextActions.map((entry) => dogShowEntryRowHtml(entry, { conflict: conflicts.has(entry.id) })).join("") : dogShowRenderEmpty("No dogs added", "Add Our Dogs or Boarding Dogs to this show weekend.", "add-show-dogs", "Add Dogs")}</div>
    <section class="dog-show-coverage"><div><h3>Dog Assignments</h3><p>${escapeHtml(assignmentText)}</p></div><div class="dog-show-progress" role="progressbar" aria-label="Dogs assigned" aria-valuemin="0" aria-valuemax="${Math.max(1, entries.length)}" aria-valuenow="${assignedEntries.length}"><span style="width:${Math.min(100, entries.length ? (assignedEntries.length / entries.length) * 100 : 0)}%"></span></div></section>
  </div>`;
}

function dogShowDogsHtml(event) {
  const conflicts = dogShowConflictEntryIds();
  const entries = dogShowEntries(event).filter((entry) => {
    const query = dogShowDogQuery.toLowerCase();
    const scheduleSearch = dogShowRingSchedules(entry).flatMap((schedule) => [schedule.classEntered, schedule.ringNumber, schedule.ringDate, schedule.ringTime]);
    const matchesQuery = !query || [dogShowEntryName(entry), dogShowBreed(entry), ...scheduleSearch, dogShowStaffLabel(entry.handlerEmail), dogShowStaffLabel(entry.helperEmail)].join(" ").toLowerCase().includes(query);
    const state = dogShowAttentionState(entry);
    const matchesFilter = dogShowDogFilter === "all"
      || (dogShowDogFilter === "need" && state !== "current")
      || (dogShowDogFilter === "mine" && [entry.handlerEmail, entry.helperEmail].map(normalizeEmail).includes(normalizeEmail(currentUser?.email)))
      || (dogShowDogFilter === "showing" && entry.attendanceRole === "Showing")
      || (dogShowDogFilter === "social" && entry.attendanceRole !== "Showing");
    return matchesQuery && matchesFilter;
  }).sort((a, b) => dogShowEntryName(a).localeCompare(dogShowEntryName(b)));
  const all = dogShowEntries(event);
  const needCount = all.filter((entry) => dogShowAttentionState(entry) !== "current").length;
  const mineCount = all.filter((entry) => [entry.handlerEmail, entry.helperEmail].map(normalizeEmail).includes(normalizeEmail(currentUser?.email))).length;
  return `<div class="dog-show-view dog-show-dogs-view">
    <section class="dog-show-list-toolbar"><div><h3>Dogs At Show</h3><p>${all.length} dogs · last-attended time visible on every row</p></div><button type="button" data-action="add-show-dogs">Add Dogs</button></section>
    <label class="dog-show-search"><span class="visually-hidden">Search show dogs</span><input type="search" id="dogShowDogSearch" value="${escapeHtml(dogShowDogQuery)}" placeholder="Search dog, helper, class, or ring" /></label>
    <div class="dog-show-filter-row" role="group" aria-label="Dog roster filters">
      <button type="button" data-dog-filter="all" class="${dogShowDogFilter === "all" ? "is-active" : ""}">All ${all.length}</button>
      <button type="button" data-dog-filter="need" class="${dogShowDogFilter === "need" ? "is-active" : ""}">Need ${needCount}</button>
      <button type="button" data-dog-filter="mine" class="${dogShowDogFilter === "mine" ? "is-active" : ""}">Mine ${mineCount}</button>
      <button type="button" data-dog-filter="showing" class="${dogShowDogFilter === "showing" ? "is-active" : ""}">Showing ${all.filter((entry) => entry.attendanceRole === "Showing").length}</button>
      <button type="button" data-dog-filter="social" class="${dogShowDogFilter === "social" ? "is-active" : ""}">Social ${all.filter((entry) => entry.attendanceRole !== "Showing").length}</button>
    </div>
    <div class="dog-show-count-strip"><strong>${entries.length} shown</strong><span>${needCount ? `${needCount} need attention` : "All dogs current"}</span></div>
    ${all.length ? `<div class="dog-show-bulk-care" role="group" aria-label="Log care for all show dogs">
      <button type="button" class="is-potty" data-action="open-bulk-show-potty"><strong>Potty All Dogs</strong><small>Choose outcome for ${all.length}</small></button>
      <button type="button" class="is-water" data-action="bulk-show-log" data-log-type="Water"><strong>Water All Dogs</strong><small>Log now for ${all.length}</small></button>
      <button type="button" class="is-food" data-action="bulk-show-log" data-log-type="Feeding"><strong>Feed All Dogs</strong><small>Log now for ${all.length}</small></button>
    </div>` : ""}
    <div class="dog-show-roster-list">${entries.length ? entries.map((entry) => dogShowEntryRowHtml(entry, { conflict: conflicts.has(entry.id), quickActions: true })).join("") : dogShowRenderEmpty("No matching dogs", "Change the filter or add dogs to this show.", "add-show-dogs", "Add Dogs")}</div>
  </div>`;
}

function dogShowShowDays(event = {}) {
  const start = event.startDate ? new Date(`${event.startDate}T12:00:00`) : new Date();
  const end = event.endDate ? new Date(`${event.endDate}T12:00:00`) : new Date(start);
  const days = [];
  for (let cursor = new Date(start); cursor <= end && days.length < 14; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days.length ? days : [start];
}

function dogShowDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dogShowCalendarDays(event = {}) {
  const eventDays = dogShowShowDays(event);
  const eventKeys = eventDays.map(dogShowDateKey);
  if (!eventKeys.includes(dogShowCalendarDate)) dogShowCalendarDate = eventKeys[0] || todayDate();
  localStorage.setItem(DOG_SHOW_CALENDAR_DATE_KEY, dogShowCalendarDate);
  return dogShowCalendarView === "day" ? eventDays.filter((date) => dogShowDateKey(date) === dogShowCalendarDate) : eventDays;
}

function dogShowCalendarTaskEntry(task = {}, entries = dogShowEntries()) {
  return entries.find((entry) => entry.id === task.showEntryId || (entry.dogId === task.dogId && entry.dogType === task.dogType)) || null;
}

function dogShowPrepTaskFor(entry = {}, schedule = {}, event = dogShowActiveEvent()) {
  const tasks = dogShowTasks(event).filter((task) => task.source === "auto-ring-prep" && task.showEntryId === entry.id);
  return tasks.find((task) => task.ringScheduleId === schedule.id)
    || (dogShowRingSchedules(entry)[0]?.id === schedule.id ? tasks.find((task) => !task.ringScheduleId) : null)
    || null;
}

function dogShowScheduleForPrepTask(task = {}, entry = dogShowCalendarTaskEntry(task)) {
  if (!entry) return null;
  const schedules = dogShowRingSchedules(entry || {});
  return schedules.find((schedule) => schedule.id === task.ringScheduleId) || schedules[0] || null;
}

function dogShowCalendarHtml(event) {
  const days = dogShowCalendarDays(event);
  const eventDays = dogShowShowDays(event);
  const entries = dogShowEntries(event);
  const tasks = dogShowTasks(event);
  const startHour = 6;
  const endHour = 22;
  const slotsPerHour = 60 / DOG_SHOW_CALENDAR_SLOT_MINUTES;
  const slotCount = (endHour - startHour) * slotsPerHour;
  const timedActivities = [];
  const allDayByDate = new Map(days.map((date) => [dogShowDateKey(date), []]));
  entries.forEach((entry) => {
    if (entry.attendanceRole !== "Showing") {
      const key = event.startDate;
      if (!allDayByDate.has(key)) return;
      allDayByDate.get(key).push({ kind: "social", title: `Socialization · ${dogShowEntryName(entry)}`, meta: dogShowStaffLabel(entry.helperEmail || entry.handlerEmail), action: "open-show-dog", id: entry.id });
      return;
    }
    const schedules = dogShowRingSchedules(entry);
    (schedules.length ? schedules : [{ id: `${entry.id}-ring-needed`, ringDate: event.startDate, prepMinutes: Number(entry.prepMinutes ?? 45), readyBufferMinutes: Number(entry.readyBufferMinutes ?? 15) }]).forEach((schedule) => {
      const key = schedule.ringDate || event.startDate;
      if (!allDayByDate.has(key)) return;
      const prep = dogShowPrepTimes(entry, schedule);
      const calendarTitle = dogShowCalendarRingTitle(entry, schedule);
      if (!prep.start) {
        allDayByDate.get(key).push({ kind: "unscheduled", title: calendarTitle, meta: `${dogShowEntryName(entry)} · ${schedule.classEntered || "Class not listed"} · Ring time needed`, action: "open-show-dog", id: entry.id });
        return;
      }
      if (dogShowPrepTaskFor(entry, schedule, event)) return;
      timedActivities.push({ date: dogShowDateKey(prep.start), time: prep.start, duration: Math.max(30, Number(schedule.prepMinutes || 45)), kind: "task", title: calendarTitle, meta: `${dogShowEntryName(entry)} · Ready ${dogShowFormatTime(prep.ready)} · Ring ${dogShowFormatTime(prep.ring)}`, action: "open-show-prep", id: entry.id, scheduleId: schedule.id, entry, task: { taskType: "Ring Prep" }, isFallbackPrep: true });
    });
  });
  tasks.forEach((task) => {
    const due = new Date(task.dueAt || "");
    const key = dogShowDateKey(due);
    if (!allDayByDate.has(key) || Number.isNaN(due.getTime())) return;
    const entry = dogShowCalendarTaskEntry(task, entries);
    const schedule = task.source === "auto-ring-prep" ? dogShowScheduleForPrepTask(task, entry) : null;
    const prep = schedule ? dogShowPrepTimes(entry, schedule) : null;
    const title = schedule && entry ? dogShowCalendarRingTitle(entry, schedule) : task.title || "Show task";
    const duration = schedule ? Math.max(30, Number(schedule.prepMinutes || 45)) : dogShowTaskDurationMinutes(task);
    const openMeta = schedule
      ? `${dogShowEntryName(entry)} · Ready ${prep?.ready ? dogShowFormatTime(prep.ready) : "--"} · Ring ${prep?.ring ? dogShowFormatTime(prep.ring) : "--"}`
      : `${duration} min · ${task.taskType || "Task"} · ${dogShowStaffLabel(task.assignedEmail)}`;
    timedActivities.push({ date: key, time: due, duration, kind: "task", title, meta: task.status === "Completed" ? `Completed by ${task.completedBy || "Staff"} · ${dogShowFormatDateTime(task.completedAt)}` : openMeta, action: "open-calendar-task", id: task.id, entry, task });
  });
  timedActivities.forEach((activity) => {
    const minutes = activity.time.getHours() * 60 + activity.time.getMinutes();
    activity.slot = Math.max(0, Math.min(slotCount - 1, Math.floor((minutes - startHour * 60) / DOG_SHOW_CALENDAR_SLOT_MINUTES)));
    activity.endMinutes = minutes + Math.max(DOG_SHOW_CALENDAR_SLOT_MINUTES, Number(activity.duration || DOG_SHOW_CALENDAR_SLOT_MINUTES));
  });
  days.forEach((date) => {
    const dateActivities = timedActivities.filter((activity) => activity.date === dogShowDateKey(date)).sort((left, right) => left.time - right.time || right.endMinutes - left.endMinutes);
    let group = [];
    let groupEnd = -Infinity;
    const assignGroupLanes = () => {
      const laneEnds = [];
      group.forEach((activity) => {
        const startMinutes = activity.time.getHours() * 60 + activity.time.getMinutes();
        let laneIndex = laneEnds.findIndex((laneEnd) => laneEnd <= startMinutes);
        if (laneIndex < 0) laneIndex = laneEnds.length;
        laneEnds[laneIndex] = activity.endMinutes;
        activity.laneIndex = laneIndex;
      });
      group.forEach((activity) => { activity.laneCount = Math.max(1, laneEnds.length); });
    };
    dateActivities.forEach((activity) => {
      const startMinutes = activity.time.getHours() * 60 + activity.time.getMinutes();
      if (group.length && startMinutes >= groupEnd) {
        assignGroupLanes();
        group = [];
        groupEnd = -Infinity;
      }
      group.push(activity);
      groupEnd = Math.max(groupEnd, activity.endMinutes);
    });
    if (group.length) assignGroupLanes();
  });
  const headers = days.map((date, index) => `<div class="dog-show-calendar-day-heading" style="grid-column:${index + 2};grid-row:1"><strong>${escapeHtml(date.toLocaleDateString(undefined, { weekday: "short" }))}</strong><span>${escapeHtml(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</span></div>`).join("");
  const allDay = days.map((date, index) => {
    const key = dogShowDateKey(date);
    const activities = allDayByDate.get(key) || [];
    return `<div class="dog-show-calendar-all-day" style="grid-column:${index + 2};grid-row:2">${activities.map((activity) => `<button type="button" class="dog-show-calendar-all-day-item is-${activity.kind}" data-action="${activity.action}" data-id="${escapeHtml(activity.id)}"><strong>${escapeHtml(activity.title)}</strong><span>${escapeHtml(activity.meta)}</span></button>`).join("")}</div>`;
  }).join("");
  const timeLabels = Array.from({ length: endHour - startHour }, (_, index) => `<div class="dog-show-calendar-time" style="grid-column:1;grid-row:${index * slotsPerHour + 3}/span ${slotsPerHour}">${escapeHtml(new Date(2000, 0, 1, startHour + index).toLocaleTimeString([], { hour: "numeric" }))}</div>`).join("");
  const slots = Array.from({ length: slotCount }, (_, slot) => days.map((date, dayIndex) => {
    const minutes = startHour * 60 + slot * DOG_SHOW_CALENDAR_SLOT_MINUTES;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const dueAt = `${dogShowDateKey(date)}T${time}`;
    return `<button type="button" class="dog-show-calendar-slot${(slot + 1) % slotsPerHour === 0 ? " is-hour-end" : ""}" data-action="new-show-task" data-due-at="${dueAt}" aria-label="Add task ${escapeHtml(dogShowFormatDate(dogShowDateKey(date)))} at ${escapeHtml(dogShowFormatTime(dueAt))}" style="grid-column:${dayIndex + 2};grid-row:${slot + 3}"></button>`;
  }).join("")).join("");
  const activityCards = timedActivities.map((activity) => {
    const dayIndex = days.findIndex((date) => dogShowDateKey(date) === activity.date);
    const span = Math.max(1, Math.min(slotCount - activity.slot, Math.ceil(activity.duration / DOG_SHOW_CALENDAR_SLOT_MINUTES)));
    const completed = activity.task?.status === "Completed";
    const photo = activity.entry ? dogShowPhotoHtml(activity.entry, "dog-show-calendar-photo") : "";
    const canDrag = Boolean(activity.task?.id && !completed);
    return `<button type="button" class="dog-show-calendar-event is-${activity.kind}${activity.isFallbackPrep ? " is-fallback-prep" : ""}${completed ? " is-completed" : ""}" data-action="${activity.action}" data-id="${escapeHtml(activity.id)}"${activity.scheduleId ? ` data-ring-schedule-id="${escapeHtml(activity.scheduleId)}"` : ""}${canDrag ? ` draggable="true" data-calendar-task-id="${escapeHtml(activity.task.id)}"` : ""} style="grid-column:${dayIndex + 2};grid-row:${activity.slot + 3}/span ${span};--lane-count:${activity.laneCount};--lane-index:${activity.laneIndex};${activity.task ? dogShowTaskColorStyle(activity.task) : "--task-color:#315F85"}">${completed ? '<span class="dog-show-calendar-check" aria-hidden="true">✓</span>' : ""}${photo}<span class="dog-show-calendar-event-copy"><span>${escapeHtml(dogShowFormatTime(activity.time))}</span><strong>${escapeHtml(activity.title)}</strong><small>${escapeHtml(activity.meta)}</small></span></button>`;
  }).join("");
  const selectedIndex = eventDays.findIndex((date) => dogShowDateKey(date) === dogShowCalendarDate);
  const defaultTaskDate = dogShowCalendarView === "day" ? dogShowCalendarDate : event.startDate || todayDate();
  return `<section class="dog-show-calendar-panel"><div class="dog-show-calendar-toolbar"><div><h3>${dogShowCalendarView === "day" ? "Day Calendar" : "Weekend Calendar"}</h3><p>Click an open time to add a task. Drag open tasks to reschedule.</p></div><div class="dog-show-calendar-controls"><div class="dog-show-calendar-view-toggle" role="group" aria-label="Calendar view"><button type="button" data-calendar-view="weekend" class="${dogShowCalendarView === "weekend" ? "is-active" : ""}">Weekend</button><button type="button" data-calendar-view="day" class="${dogShowCalendarView === "day" ? "is-active" : ""}">Day</button></div>${dogShowCalendarView === "day" ? `<button type="button" class="dog-show-calendar-nav" data-calendar-day-offset="-1" aria-label="Previous show day"${selectedIndex <= 0 ? " disabled" : ""}>‹</button><span class="dog-show-calendar-range">${escapeHtml(dogShowFormatDate(dogShowCalendarDate))}</span><button type="button" class="dog-show-calendar-nav" data-calendar-day-offset="1" aria-label="Next show day"${selectedIndex >= eventDays.length - 1 ? " disabled" : ""}>›</button>` : `<span class="dog-show-calendar-range">${escapeHtml(`${dogShowFormatDate(event.startDate)} – ${dogShowFormatDate(event.endDate || event.startDate)}`)}</span>`}<button type="button" data-action="new-show-task" data-due-at="${escapeHtml(`${defaultTaskDate}T09:00`)}">New Task</button></div></div><div class="dog-show-calendar-board"><div class="dog-show-calendar-timeline" style="--dog-show-day-count:${days.length};--dog-show-slot-count:${slotCount};--dog-show-grid-width:${68 + days.length * 210}px"><div class="dog-show-calendar-corner" style="grid-column:1;grid-row:1">Time</div><div class="dog-show-calendar-all-day-label" style="grid-column:1;grid-row:2">All day</div>${headers}${allDay}${timeLabels}${slots}${activityCards}</div></div></section>`;
}

function dogShowScheduleHtml(event) {
  const conflicts = dogShowConflictEntryIds();
  const entries = dogShowEntries(event);
  const appearances = entries.flatMap((entry) => {
    if (entry.attendanceRole !== "Showing") return [{ entry, schedule: null, prep: { start: null, ready: null, ring: null } }];
    const schedules = dogShowRingSchedules(entry);
    return (schedules.length ? schedules : [{ id: `${entry.id}-ring-needed`, ringDate: event.startDate, prepMinutes: Number(entry.prepMinutes ?? 45), readyBufferMinutes: Number(entry.readyBufferMinutes ?? 15) }]).map((schedule) => ({ entry, schedule, prep: dogShowPrepTimes(entry, schedule) }));
  }).sort((a, b) => (a.prep.start?.getTime() || Infinity) - (b.prep.start?.getTime() || Infinity));
  const rowHtml = ({ entry, schedule, prep }) => {
    const conflict = conflicts.has(entry.id);
    if (entry.attendanceRole !== "Showing") {
      return `<button type="button" class="dog-show-schedule-row is-social" data-action="edit-show-entry" data-id="${escapeHtml(entry.id)}"><span class="dog-show-schedule-time">Social</span>${dogShowPhotoHtml(entry, "dog-show-schedule-photo")}<span class="dog-show-schedule-main"><strong>${escapeHtml(dogShowNameWithBreed(entry))}</strong><small>Socialization<br>${escapeHtml(dogShowStaffLabel(entry.helperEmail || entry.handlerEmail))}</small></span></button>`;
    }
    return `<button type="button" class="dog-show-schedule-row${conflict ? " has-conflict" : ""}" data-action="edit-show-entry" data-id="${escapeHtml(entry.id)}">
      <span class="dog-show-schedule-time"><strong>${prep.start ? dogShowFormatTime(prep.start) : "--"}</strong><small>Prep start</small></span>
      ${dogShowPhotoHtml(entry, "dog-show-schedule-photo")}<span class="dog-show-schedule-main"><strong>${escapeHtml(dogShowNameWithBreed(entry))}</strong><small>${escapeHtml([dogShowFormatDate(schedule.ringDate), schedule.classEntered || "Class missing", schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring missing", dogShowStaffLabel(entry.handlerEmail)].join(" · "))}</small><span class="dog-show-time-line">Ready ${prep.ready ? dogShowFormatTime(prep.ready) : "--"} <i></i> Ring ${prep.ring ? dogShowFormatTime(prep.ring) : "--"}</span></span>
      <span class="dog-show-schedule-duration">${Number(schedule.prepMinutes || 45)}m${conflict ? "<small>Conflict</small>" : "<small>Prep</small>"}</span>
    </button>`;
  };
  const datedGroups = new Map();
  const socialAppearances = [];
  appearances.forEach((appearance) => {
    if (appearance.entry.attendanceRole !== "Showing") {
      socialAppearances.push(appearance);
      return;
    }
    const dateKey = appearance.schedule?.ringDate || event.startDate || "Date needed";
    if (!datedGroups.has(dateKey)) datedGroups.set(dateKey, []);
    datedGroups.get(dateKey).push(appearance);
  });
  const scheduleGroups = [...datedGroups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([dateKey, items]) => `<section class="dog-show-schedule-day"><header class="dog-show-schedule-day-header"><strong>${escapeHtml(dogShowFormatDate(dateKey))}</strong><span>${items.length} appearance${items.length === 1 ? "" : "s"}</span></header><div class="dog-show-schedule-list">${items.map(rowHtml).join("")}</div></section>`);
  if (socialAppearances.length) scheduleGroups.push(`<section class="dog-show-schedule-day is-social-group"><header class="dog-show-schedule-day-header"><strong>Socialization</strong><span>${socialAppearances.length} dog${socialAppearances.length === 1 ? "" : "s"}</span></header><div class="dog-show-schedule-list">${socialAppearances.map(rowHtml).join("")}</div></section>`);
  return `<div class="dog-show-view dog-show-schedule-view">
    ${dogShowCalendarHtml(event)}
    <section class="dog-show-list-toolbar"><div><h3>Prep Schedule</h3><p>Preparation is counted backward from each ring time.</p></div><button type="button" data-action="add-show-dogs">Add Dogs</button></section>
    ${conflicts.size ? `<div class="dog-show-alert"><strong>${conflicts.size} dogs have a handler/helper overlap.</strong><span>Open the highlighted schedule rows to reassign coverage.</span></div>` : ""}
    <div class="dog-show-schedule-groups">${scheduleGroups.join("") || dogShowRenderEmpty("No schedule yet", "Add dogs, then enter ring time and preparation duration.", "add-show-dogs", "Add Dogs")}</div>
  </div>`;
}

function dogShowTaskMatchesFilter(task = {}) {
  if (dogShowTaskFilter === "all") return true;
  if (dogShowTaskFilter === "completed") return task.status === "Completed";
  if (dogShowTaskFilter === "mine") return task.status !== "Completed" && normalizeEmail(task.assignedEmail) === normalizeEmail(currentUser?.email);
  return task.status !== "Completed";
}

function dogShowTaskRowHtml(task = {}, event = dogShowActiveEvent()) {
  const entry = dogShowEntries(event).find((item) => item.id === task.showEntryId);
  const schedule = task.source === "auto-ring-prep" ? dogShowScheduleForPrepTask(task, entry) : null;
  const duration = dogShowTaskDurationMinutes(task, schedule ? Math.max(30, Number(schedule.prepMinutes || 45)) : 60);
  return `<article class="dog-show-task-row${task.status === "Completed" ? " is-complete" : ""}">
    <input type="checkbox" data-show-task-select="${escapeHtml(task.id)}" aria-label="Select ${escapeHtml(task.title || "task")}"${dogShowSelectedTaskIds.has(task.id) ? " checked" : ""}${task.status === "Completed" ? " disabled" : ""}/>
    <button type="button" data-action="edit-show-task" data-id="${escapeHtml(task.id)}"><strong>${escapeHtml(task.title || "Show task")}</strong><span>${escapeHtml([entry ? dogShowEntryName(entry) : "Team task", task.taskType || "General", `${duration} min`, dogShowStaffLabel(task.assignedEmail)].join(" · "))}</span><small>${task.status === "Completed" ? `Completed by ${escapeHtml(task.completedBy || "Staff")} · ${dogShowFormatDateTime(task.completedAt)}` : `Due ${dogShowFormatDateTime(task.dueAt)}`}</small></button>
    ${task.status === "Completed" ? `<span class="dog-show-task-done">Done</span>` : `<button type="button" class="secondary-button dog-show-complete-button" data-action="complete-show-task" data-id="${escapeHtml(task.id)}">Complete</button>`}
  </article>`;
}

function dogShowTaskDayState(event = dogShowActiveEvent()) {
  try {
    return JSON.parse(localStorage.getItem(DOG_SHOW_TASK_DAY_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function dogShowTaskDayStateId(event = dogShowActiveEvent()) {
  return `${event?.id || "no-event"}:${dogShowTaskFilter}`;
}

function dogShowExpandedTaskDay(event = dogShowActiveEvent(), dateKeys = []) {
  const saved = dogShowTaskDayState()[dogShowTaskDayStateId(event)];
  if (saved === "none") return "";
  if (dateKeys.includes(saved)) return saved;
  const today = todayDate();
  return dateKeys.includes(today) ? today : dateKeys[0] || "";
}

function setDogShowExpandedTaskDay(event = dogShowActiveEvent(), dateKey = "") {
  const state = dogShowTaskDayState(event);
  state[dogShowTaskDayStateId(event)] = dateKey || "none";
  localStorage.setItem(DOG_SHOW_TASK_DAY_KEY, JSON.stringify(state));
}

function dogShowTasksHtml(event) {
  const tasks = dogShowTasks(event).filter(dogShowTaskMatchesFilter).sort((a, b) => new Date(a.dueAt || 8640000000000000) - new Date(b.dueAt || 8640000000000000) || String(a.status === "Completed").localeCompare(String(b.status === "Completed")));
  const all = dogShowTasks(event);
  const selectableTaskIds = tasks.filter((task) => task.status !== "Completed").map((task) => task.id);
  const allVisibleSelected = selectableTaskIds.length > 0 && selectableTaskIds.every((id) => dogShowSelectedTaskIds.has(id));
  const tasksByDate = new Map();
  tasks.forEach((task) => {
    const dateKey = dogShowDateKey(new Date(task.dueAt || "")) || "Date missing";
    if (!tasksByDate.has(dateKey)) tasksByDate.set(dateKey, []);
    tasksByDate.get(dateKey).push(task);
  });
  const taskEntries = [...tasksByDate.entries()].sort(([left], [right]) => left.localeCompare(right));
  const expandedDate = dogShowExpandedTaskDay(event, taskEntries.map(([dateKey]) => dateKey));
  const taskGroups = taskEntries.map(([dateKey, items], index) => {
    const expanded = dateKey === expandedDate;
    const panelId = `dogShowTaskDay-${index}`;
    return `<section class="dog-show-task-day${expanded ? " is-expanded" : " is-collapsed"}"><header class="dog-show-task-day-header"><button type="button" class="dog-show-task-day-toggle" data-task-day-toggle="${escapeHtml(dateKey)}" aria-expanded="${expanded}" aria-controls="${panelId}"><strong>${escapeHtml(dateKey === "Date missing" ? dateKey : dogShowFormatDate(dateKey))}</strong><span>${items.length} task${items.length === 1 ? "" : "s"}</span><i aria-hidden="true"></i></button></header><div class="dog-show-task-list" id="${panelId}"${expanded ? "" : " hidden"}>${items.map((task) => dogShowTaskRowHtml(task, event)).join("")}</div></section>`;
  }).join("");
  return `<div class="dog-show-view dog-show-tasks-view">
    <section class="dog-show-list-toolbar"><div><h3>Show Tasks</h3><p>Assigned work stays separate from boarding daily tasks.</p></div><div class="button-row"><button type="button" class="secondary-button" data-action="create-water-round">Water Round</button><button type="button" data-action="new-show-task">New Task</button></div></section>
    <div class="dog-show-filter-row" role="group" aria-label="Task filters">
      <button type="button" data-task-filter="open" class="${dogShowTaskFilter === "open" ? "is-active" : ""}">Open ${all.filter((task) => task.status !== "Completed").length}</button>
      <button type="button" data-task-filter="mine" class="${dogShowTaskFilter === "mine" ? "is-active" : ""}">Mine</button>
      <button type="button" data-task-filter="completed" class="${dogShowTaskFilter === "completed" ? "is-active" : ""}">Done ${all.filter((task) => task.status === "Completed").length}</button>
      <button type="button" data-task-filter="all" class="${dogShowTaskFilter === "all" ? "is-active" : ""}">All ${all.length}</button>
    </div>
    <div class="dog-show-task-batch"><label><input type="checkbox" data-action="select-visible-show-tasks"${allVisibleSelected ? " checked" : ""}${selectableTaskIds.length ? "" : " disabled"} /> ${allVisibleSelected ? "Unselect visible" : "Select visible"}</label><button type="button" class="secondary-button" data-action="complete-selected-show-tasks"${dogShowSelectedTaskIds.size ? "" : " disabled"}>Complete selected (${dogShowSelectedTaskIds.size})</button></div>
    <div class="dog-show-task-groups">${taskGroups || dogShowRenderEmpty("No tasks in this view", "Add a team task or create a water round for every dog.", "new-show-task", "New Task")}</div>
  </div>`;
}

function dogShowMoreHtml(event) {
  const entries = dogShowEntries(event);
  const resultProgress = dogShowResultProgress(event, entries);
  const packing = Array.isArray(event.packingItems) && event.packingItems.length ? event.packingItems : DOG_SHOW_DEFAULT_PACKING.map((label, index) => ({ id: `default-${index}`, label, completed: false }));
  const helperEmails = Array.isArray(event.helperEmails) ? event.helperEmails : [];
  return `<div class="dog-show-view dog-show-more-view">
    <section class="dog-show-list-toolbar"><div><h3>Show Operations</h3><p>Setup, packing, helpers, and results.</p></div></section>
    <div class="dog-show-more-grid">
      <button type="button" data-action="edit-show-event"><span>S</span><strong>Show Setup</strong><small>Venue, stay, dates, links, and notes</small></button>
      <button type="button" data-action="add-show-dogs"><span>D</span><strong>Add Dogs</strong><small>Our Dogs or Boarding Dogs</small></button>
      <button type="button" data-action="show-helper-summary"><span>H</span><strong>Helpers</strong><small>${helperEmails.length} assigned to this weekend</small></button>
      <button type="button" data-action="show-result-summary"><span>R</span><strong>Results</strong><small>${resultProgress.logged} of ${resultProgress.total} ring appearances logged</small></button>
      <button type="button" data-action="open-show-planner"><span>F</span><strong>Find Shows</strong><small>Compare future panels against your dogs' history</small></button>
      <button type="button" data-action="open-show-calendar"><span>Y</span><strong>Show Calendar</strong><small>Year, month, week, and day planning</small></button>
      <button type="button" data-action="open-show-calculator"><span>C</span><strong>Calculator</strong><small>Estimate AKC breed points from the official schedule</small></button>
      <button type="button" data-action="open-show-expenses"><span>$</span><strong>Finances</strong><small>Track show costs, income, and rewards</small></button>
      <button type="button" data-action="open-show-progress"><span>P</span><strong>Show Progress</strong><small>Career points, show history, and judge notes</small></button>
    </div>
    <section class="dog-show-panel"><div class="dog-show-panel-heading"><div><h3>Packing List</h3><p>${packing.filter((item) => item.completed).length} of ${packing.length} packed</p></div></div>
      <div class="dog-show-packing-list">${packing.map((item) => `<div class="dog-show-packing-item"><label><input type="checkbox" data-packing-id="${escapeHtml(item.id)}"${item.completed ? " checked" : ""}/><span>${escapeHtml(item.label)}</span></label><button type="button" class="dog-show-remove-packing" data-action="remove-packing-item" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.label)}" title="Remove item">×</button></div>`).join("")}</div>
      <form id="dogShowPackingForm" class="dog-show-inline-form"><input type="text" name="label" placeholder="Add packing item" required/><button type="submit">Add</button></form>
    </section>
    <section class="dog-show-panel"><div class="dog-show-panel-heading"><div><h3>Weekend Helpers</h3><p>${helperEmails.length ? helperEmails.map(dogShowStaffLabel).join(" · ") : "No weekend helper list selected yet."}</p></div><button type="button" class="secondary-button" data-action="edit-show-event">Edit</button></div></section>
  </div>`;
}

function dogShowCalculatorOptions(values = [], selected = "", labels = {}) {
  return values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(labels[value] ? `${labels[value]} (${value})` : value)}</option>`).join("");
}

function dogShowCalculatorPointBadge(points) {
  if (!Number.isFinite(points)) return `<span class="dog-show-calculator-not-entered">Not entered</span>`;
  return `<strong class="dog-show-calculator-point-badge${points >= 3 ? " is-major" : ""}">${points} point${points === 1 ? "" : "s"}${points >= 3 ? "<em>Major</em>" : ""}</strong>`;
}

function dogShowCalculatorOutcomeLine(label, points) {
  return `<li><span>${label}</span>${dogShowCalculatorPointBadge(points)}</li>`;
}

function dogShowCalculatorOutcomeCard(title, subtitle, eligible, lines = [], tone = "") {
  return `<article class="dog-show-calculator-outcome-card ${tone}${eligible ? "" : " is-ineligible"}">
    <header><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(subtitle)}</p></div></header>
    ${eligible ? `<ul>${lines.join("")}</ul>` : `<p class="dog-show-calculator-empty-outcome">No ${escapeHtml(title.toLowerCase())} entered.</p>`}
  </article>`;
}

function dogShowCalculatorHtml() {
  const state = dogShowCalculatorState;
  const result = calculateAkcBreedPointScenarios2026(state);
  const outcomeCards = result ? [
    dogShowCalculatorOutcomeCard("Class Dog", "Championship points", result.outcomes.classDogs.eligible, [
      dogShowCalculatorOutcomeLine("If the class dog wins <strong>WD</strong>", result.outcomes.classDogs.winners),
      dogShowCalculatorOutcomeLine("If WD wins <strong>BOW</strong>", result.outcomes.classDogs.bestOfWinners),
      dogShowCalculatorOutcomeLine("If WD wins <strong>BOW</strong> and WB goes <strong>BOS</strong>", result.outcomes.classDogs.bestOfWinnersWhenOppositeWinnerIsBos),
      dogShowCalculatorOutcomeLine("If WD goes <strong>BOS</strong>", result.outcomes.classDogs.bestOfOppositeSex),
      dogShowCalculatorOutcomeLine("If WD goes <strong>BOB/BOV</strong>", result.outcomes.classDogs.bestOfBreed),
    ], "is-class-dog"),
    dogShowCalculatorOutcomeCard("Special Dog", "Grand Championship points", result.outcomes.specialDogs.eligible, [
      dogShowCalculatorOutcomeLine("If the special dog receives <strong>SD</strong>", result.outcomes.specialDogs.select),
      dogShowCalculatorOutcomeLine("If the special dog goes <strong>BOS</strong>", result.outcomes.specialDogs.bestOfOppositeSex),
      dogShowCalculatorOutcomeLine("If the special dog goes <strong>BOB/BOV</strong>", result.outcomes.specialDogs.bestOfBreed),
    ], "is-special-dog"),
    dogShowCalculatorOutcomeCard("Class Bitch", "Championship points", result.outcomes.classBitches.eligible, [
      dogShowCalculatorOutcomeLine("If the class bitch wins <strong>WB</strong>", result.outcomes.classBitches.winners),
      dogShowCalculatorOutcomeLine("If WB wins <strong>BOW</strong>", result.outcomes.classBitches.bestOfWinners),
      dogShowCalculatorOutcomeLine("If WB wins <strong>BOW</strong> and WD goes <strong>BOS</strong>", result.outcomes.classBitches.bestOfWinnersWhenOppositeWinnerIsBos),
      dogShowCalculatorOutcomeLine("If WB goes <strong>BOS</strong>", result.outcomes.classBitches.bestOfOppositeSex),
      dogShowCalculatorOutcomeLine("If WB goes <strong>BOB/BOV</strong>", result.outcomes.classBitches.bestOfBreed),
    ], "is-class-bitch"),
    dogShowCalculatorOutcomeCard("Special Bitch", "Grand Championship points", result.outcomes.specialBitches.eligible, [
      dogShowCalculatorOutcomeLine("If the special bitch receives <strong>SB</strong>", result.outcomes.specialBitches.select),
      dogShowCalculatorOutcomeLine("If the special bitch goes <strong>BOS</strong>", result.outcomes.specialBitches.bestOfOppositeSex),
      dogShowCalculatorOutcomeLine("If the special bitch goes <strong>BOB/BOV</strong>", result.outcomes.specialBitches.bestOfBreed),
    ], "is-special-bitch"),
  ] : [];
  const pointHeadings = [1, 2, 3, 4, 5];
  return `<div class="dog-show-view dog-show-calculator-view">
    <section class="dog-show-calculator-heading">
      <div><span>AKC BREED POINTS</span><h3>Point Calculator</h3><p>Estimate Championship and Grand Championship breed points from the show location and dogs actually judged.</p></div>
      <a class="secondary-button" href="https://www.akc.org/sports/conformation/resources/counting-points/" target="_blank" rel="noopener noreferrer">How AKC counts points</a>
    </section>
    <form id="dogShowCalculatorForm" class="dog-show-calculator-form">
      <div class="dog-show-calculator-selects">
        <label>State / location<select name="state" required>${dogShowCalculatorOptions(akcPointCalculatorStates2026().sort((left, right) => String(DOG_SHOW_AKC_STATE_NAMES[left] || left).localeCompare(String(DOG_SHOW_AKC_STATE_NAMES[right] || right))), state.state, DOG_SHOW_AKC_STATE_NAMES)}</select></label>
        <label>Breed or variety<select name="breed" required>${dogShowCalculatorOptions(akcPointCalculatorBreeds2026(), state.breed)}</select></label>
      </div>
      <fieldset class="dog-show-calculator-counts">
        <legend>Breed entries judged</legend>
        <p>Enter the dogs present and judged. “Special” means a Champion competing in Best of Breed/Variety. Do not include absentees or excused dogs.</p>
        <div>
          <label>Class Dogs<input type="number" name="classDogs" min="0" step="1" inputmode="numeric" value="${Number(state.classDogs) || 0}"/></label>
          <label>Class Bitches<input type="number" name="classBitches" min="0" step="1" inputmode="numeric" value="${Number(state.classBitches) || 0}"/></label>
          <label>Special Dogs<input type="number" name="championDogs" min="0" step="1" inputmode="numeric" value="${Number(state.championDogs) || 0}"/></label>
          <label>Special Bitches<input type="number" name="championBitches" min="0" step="1" inputmode="numeric" value="${Number(state.championBitches) || 0}"/></label>
        </div>
      </fieldset>
      <button type="submit">Calculate Points</button>
    </form>
    ${result ? `<section class="dog-show-calculator-results" aria-live="polite">
      <header><div><span>ESTIMATED OUTCOMES</span><h3>${escapeHtml(result.schedule.breed)}</h3><p>${escapeHtml(DOG_SHOW_AKC_STATE_NAMES[result.schedule.state] || result.schedule.state)} · AKC Division ${result.schedule.division} · 2026 schedule</p></div><strong>${result.counts.classDogs}-${result.counts.classBitches}-${result.counts.championDogs}-${result.counts.championBitches}</strong></header>
      <div class="dog-show-calculator-outcomes">${outcomeCards.join("")}</div>
      <div class="dog-show-calculator-schedule">
        <div><h3>Official point thresholds</h3><p>Number competing for each point value.</p></div>
        <div class="dog-show-calculator-thresholds">
          <div><span></span>${pointHeadings.map((points) => `<strong>${points} pt</strong>`).join("")}</div>
          <div><span>Dogs</span>${result.schedule.dogs.map((count) => `<b>${count}</b>`).join("")}</div>
          <div><span>Bitches</span>${result.schedule.bitches.map((count) => `<b>${count}</b>`).join("")}</div>
        </div>
      </div>
      <p class="dog-show-calculator-note">Class outcomes estimate Championship points. Special outcomes estimate Grand Championship points for SD/SB, BOS, and BOB/BOV. Confirm the posted judge's book and AKC schedule before recording points. Group-derived points are not included here.</p>
    </section>` : ""}
    <footer class="dog-show-calculator-source">Schedule effective May 12, 2026 · <a href="https://www.akc.org/sports/conformation/resources/points-schedule/" target="_blank" rel="noopener noreferrer">Official AKC Point Schedule</a> · <a href="https://www.akc.org/sports/conformation/grand-championship/counting-grand-champion-points/" target="_blank" rel="noopener noreferrer">How AKC counts Grand Championship points</a></footer>
  </div>`;
}

function dogShowExpenses(event = dogShowActiveEvent()) {
  return (Array.isArray(event?.expenses) ? event.expenses : [])
    .filter((expense) => expense && !expense.removed)
    .sort((left, right) => String(right.incurredDate || right.submittedAt || "").localeCompare(String(left.incurredDate || left.submittedAt || "")));
}

function dogShowExpenseCurrency(value = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function dogShowFinanceTotals(transactions = []) {
  const expenses = transactions.filter((transaction) => transaction.entryType !== "income");
  const income = transactions.filter((transaction) => transaction.entryType === "income");
  const expenseTotal = expenses.reduce((sum, transaction) => sum + Math.max(0, Number(transaction.amount) || 0), 0);
  const incomeTotal = income.reduce((sum, transaction) => sum + Math.max(0, Number(transaction.amount) || 0), 0);
  return { expenseCount: expenses.length, incomeCount: income.length, expenseTotal, incomeTotal, netTotal: incomeTotal - expenseTotal };
}

function dogShowFinanceRowHtml(transaction = {}) {
  const isIncome = transaction.entryType === "income";
  return `<article class="dog-show-expense-row">
    <div><span class="dog-show-finance-kind is-${isIncome ? "income" : "expense"}">${isIncome ? "Income / reward" : "Expense"}</span><strong>${escapeHtml(transaction.category || "Other")}</strong><span>${escapeHtml(transaction.description || transaction.category || "Show transaction")}</span><small>${escapeHtml(dogShowFormatDate(transaction.incurredDate || String(transaction.submittedAt || "").slice(0, 10)))}</small></div>
    <strong class="${isIncome ? "is-income" : "is-expense"}">${isIncome ? "+" : "−"}${dogShowExpenseCurrency(transaction.amount)}</strong>
    <div class="dog-show-expense-actions">
      <button type="button" class="secondary-button" data-action="edit-show-expense" data-expense-id="${escapeHtml(transaction.id)}" aria-label="Edit ${escapeHtml(transaction.description || transaction.category || "transaction")}">Edit</button>
      <button type="button" class="dog-show-remove-expense" data-action="remove-show-expense" data-expense-id="${escapeHtml(transaction.id)}" aria-label="Remove ${escapeHtml(transaction.description || transaction.category || "transaction")}" title="Remove transaction">×</button>
    </div>
  </article>`;
}

function dogShowFinanceGroupHtml(title = "", transactions = [], options = {}) {
  const totals = dogShowFinanceTotals(transactions);
  const itemLabel = `${transactions.length} item${transactions.length === 1 ? "" : "s"}`;
  const summary = `${totals.expenseCount} expense${totals.expenseCount === 1 ? "" : "s"} · ${totals.incomeCount} reward${totals.incomeCount === 1 ? "" : "s"}`;
  return `<section class="dog-show-expense-group${options.className ? ` ${escapeHtml(options.className)}` : ""}">
    <header><div><h3>${escapeHtml(title)}</h3><p>${itemLabel} · ${summary}</p></div><strong class="${totals.netTotal >= 0 ? "is-income" : "is-expense"}">${dogShowExpenseCurrency(totals.netTotal)} net</strong></header>
    <div>${transactions.length ? transactions.map(dogShowFinanceRowHtml).join("") : `<p class="dog-show-expense-empty">${escapeHtml(options.emptyText || "No transactions recorded.")}</p>`}</div>
  </section>`;
}

function dogShowExpenseDogGroups(event = dogShowActiveEvent(), transactions = dogShowExpenses(event)) {
  const entries = dogShowEntries(event);
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  const entryByName = new Map(entries.map((entry) => [String(dogShowEntryName(entry) || "").trim().toLowerCase(), entry]));
  const groups = new Map();
  transactions.forEach((transaction) => {
    const transactionName = String(transaction.dogName || "").trim();
    const entry = entryById.get(transaction.showEntryId) || entryByName.get(transactionName.toLowerCase()) || null;
    const key = entry?.id || transaction.showEntryId || (transactionName ? `dog:${transactionName.toLowerCase()}` : "");
    if (!key) return;
    if (!groups.has(key)) groups.set(key, { key, entry, label: entry ? dogShowEntryName(entry) : transactionName || "Dog", transactions: [] });
    groups.get(key).transactions.push(transaction);
  });
  const rosterOrder = new Map(entries.map((entry, index) => [entry.id, index]));
  return [...groups.values()].sort((left, right) => {
    const leftOrder = rosterOrder.has(left.entry?.id) ? rosterOrder.get(left.entry.id) : Number.MAX_SAFE_INTEGER;
    const rightOrder = rosterOrder.has(right.entry?.id) ? rosterOrder.get(right.entry.id) : Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.label.localeCompare(right.label);
  });
}

function dogShowExpenseSplitCount(event = dogShowActiveEvent(), rosterCount = dogShowEntries(event).length) {
  const saved = Math.round(Number(event?.expenseSplitDogCount) || 0);
  if (!rosterCount) return 0;
  return Math.min(rosterCount, Math.max(1, saved || rosterCount));
}

function dogShowExpensesHtml(event) {
  const expenses = dogShowExpenses(event);
  const totals = dogShowFinanceTotals(expenses);
  const showWideTransactions = expenses.filter((transaction) => !transaction.showEntryId && !transaction.dogName);
  const showWideTotals = dogShowFinanceTotals(showWideTransactions);
  const rosterCount = dogShowEntries(event).length;
  const splitCount = dogShowExpenseSplitCount(event, rosterCount);
  const splitAmount = splitCount ? showWideTotals.expenseTotal / splitCount : 0;
  const dogGroups = dogShowExpenseDogGroups(event, expenses);
  return `<div class="dog-show-view dog-show-expenses-view">
    <section class="dog-show-expenses-heading"><div><span>SHOW FINANCES</span><h3>Income & Expenses</h3><p>Track show-wide costs and rewards. Assign a dog only when the transaction belongs to that dog.</p></div><button type="button" data-action="new-show-expense">Add Transaction</button></section>
    <div class="dog-show-expense-stats">
      <article><span>Total expenses</span><strong>${dogShowExpenseCurrency(totals.expenseTotal)}</strong><small>${totals.expenseCount} cost item${totals.expenseCount === 1 ? "" : "s"}</small></article>
      <article><span>Income / rewards</span><strong class="is-income">${dogShowExpenseCurrency(totals.incomeTotal)}</strong><small>${totals.incomeCount} reward item${totals.incomeCount === 1 ? "" : "s"}</small></article>
      <article><span>Net</span><strong class="${totals.netTotal >= 0 ? "is-income" : "is-expense"}">${dogShowExpenseCurrency(totals.netTotal)}</strong><small>${escapeHtml(event?.name || "Current show")}</small></article>
    </div>
    <section class="dog-show-expense-split">
      <div><span>SHOW-WIDE EXPENSE SPLIT</span><h3>${dogShowExpenseCurrency(splitAmount)} per participating dog</h3><p>Divide show-wide expenses only. Dog-specific expenses, income, and rewards are excluded.</p></div>
      <div class="dog-show-expense-split-metrics"><div><span>Show-wide expenses</span><strong>${dogShowExpenseCurrency(showWideTotals.expenseTotal)}</strong></div><div><span>Dogs on show roster</span><strong>${rosterCount}</strong></div></div>
      <form id="dogShowExpenseSplitForm">
        <label><span class="dog-show-expense-split-label">Dogs sharing expenses <span class="service-info-icon dog-show-expense-split-info" role="button" tabindex="0" aria-label="Lower this count to exclude your own dog or another dog that should not share the costs." title="Lower this count to exclude your own dog or another dog that should not share the costs." data-tooltip="Lower this count to exclude your own dog or another dog that should not share the costs."><img src="assets/icons/service-info-icon.png?v=20260526-info-icon-replacement" alt="" aria-hidden="true"/></span></span><input type="number" name="expenseSplitDogCount" min="1" ${rosterCount ? `max="${rosterCount}"` : ""} step="1" inputmode="numeric" value="${splitCount || ""}" ${rosterCount ? "" : "disabled"}/></label>
        <button type="submit" ${rosterCount ? "" : "disabled"}>Update Split</button>
      </form>
    </section>
    <div class="dog-show-expense-ledgers">
      <div><h3>Show-wide transactions</h3><p>Costs and rewards that are not assigned to one dog.</p>${dogShowFinanceGroupHtml("Show-wide", showWideTransactions, { className: "is-show-wide", emptyText: "No show-wide transactions yet." })}</div>
      <div><h3>Transactions by dog</h3><p>Each dog has its own expense, income, and net total.</p>${dogGroups.length ? dogGroups.map((group) => dogShowFinanceGroupHtml(group.label, group.transactions, { className: "is-dog-ledger" })).join("") : `<p class="dog-show-expense-empty is-standalone">No dog-specific transactions yet.</p>`}</div>
    </div>
  </div>`;
}

function openDogShowExpenseForm(expense = {}) {
  const event = dogShowActiveEvent();
  if (!event) {
    showToast("Choose a show before recording an expense.");
    return;
  }
  const isEditing = Boolean(expense.id);
  const entryType = expense.entryType === "income" ? "income" : "expense";
  const categoryOptions = dogShowFinanceCategoryOptions(entryType, expense.category);
  const dogOptions = dogShowEntries(event).map((entry) => `<option value="${escapeHtml(entry.id)}"${entry.id === expense.showEntryId ? " selected" : ""}>${escapeHtml(dogShowEntryName(entry))}</option>`).join("");
  openDogShowDialog(isEditing ? "Edit Show Transaction" : "Add Show Transaction", `<form id="dogShowExpenseForm" class="dog-show-expense-form" data-expense-id="${escapeHtml(expense.id || "")}">
    <div class="field-grid">
      <label>Transaction type<select name="entryType" required><option value="expense"${entryType === "expense" ? " selected" : ""}>Expense</option><option value="income"${entryType === "income" ? " selected" : ""}>Income / reward</option></select></label>
      <label>Dog (optional)<select name="showEntryId"><option value="">Show-wide / no dog</option>${dogOptions}</select></label>
      <label>Category<select name="category" required>${categoryOptions}</select></label>
      <label class="dog-show-field-wide">Brief description<input type="text" name="description" maxlength="120" placeholder="Bark-Vader Group 1 reward, hotel deposit, fuel..." value="${escapeHtml(expense.description || "")}" required/></label>
      <label>Amount<input type="number" name="amount" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" value="${expense.amount ? escapeHtml(expense.amount) : ""}" required/></label>
      <label>Transaction date<input type="date" name="incurredDate" value="${escapeHtml(expense.incurredDate || todayDate())}" required/></label>
    </div>
    <div class="button-row"><button type="submit">${isEditing ? "Update Transaction" : "Save Transaction"}</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function dogShowPlannerDogs() {
  const byKey = new Map(dogShowProgressDogs().map((dog) => [dog.key, dog]));
  dogShowOwnedDogs().forEach((dog) => {
    const entry = { ...dog, dogId: dog.id, dogType: "ownedDog", dogName: dogShowDogName(dog, "ownedDog") };
    const key = dogShowDogIdentity(entry);
    if (!byKey.has(key)) byKey.set(key, { key, entry });
  });
  return [...byKey.values()].sort((left, right) => dogShowEntryName(left.entry).localeCompare(dogShowEntryName(right.entry)));
}

function dogShowPlannerDogEvidence(judgeName = "", dogKeys = [], breedName = "") {
  const selected = new Set(dogKeys);
  const results = dogShowJudgeEvidenceResults(judgeName, "entries").filter((result) => {
    if (selected.size) return selected.has(dogShowDogIdentity(result));
    if (breedName) return dogShowPlannerBreedMatches(dogShowBreed(result), breedName);
    return true;
  });
  return {
    results,
    placements: results.filter((result) => ["Win", "Placement"].includes(result.outcome) || result.groupAward || result.bisAward || result.ohGroupAward || result.ohBisAward),
    points: results.reduce((total, result) => total + dogShowPointValue(result), 0),
  };
}

function dogShowPlannerJudgeAssessment(judgeName = "", dogKeys = [], breedName = "") {
  if (!judgeName) return { score: null, label: "Panel pending", historyLabel: "No judge assignment published", recommendation: "", evidence: { results: [], placements: [], points: 0 } };
  const evidence = dogShowPlannerDogEvidence(judgeName, dogKeys, breedName);
  const note = dogShowJudgeNote(judgeName);
  const recommendation = String(note.recommendation || "Watch");
  let score = 50;
  if (evidence.placements.length) score += Math.min(28, 12 + (evidence.placements.length * 5) + Math.min(8, evidence.points * 2));
  else if (evidence.results.length) score += Math.min(12, evidence.results.length * 4);
  if (recommendation === "Show Under") score += 18;
  if (recommendation === "Avoid") score -= 30;
  score = Math.max(0, Math.min(100, score));
  const label = score >= 78 ? "Recommended" : score >= 60 ? "Positive" : score <= 35 ? "Caution" : "Neutral";
  const historyLabel = evidence.results.length
    ? `${evidence.results.length} prior result${evidence.results.length === 1 ? "" : "s"} · ${evidence.placements.length} placement${evidence.placements.length === 1 ? "" : "s"} · ${evidence.points} point${evidence.points === 1 ? "" : "s"}`
    : `No logged history${dogKeys.length ? " for selected dogs" : breedName ? ` for ${breedName}` : ""}`;
  return { score, label, historyLabel, recommendation, evidence, note };
}

function dogShowPlannerJudgeHtml(roleLabel = "", judgeName = "", plan = {}) {
  if (!judgeName) return `<div class="dog-show-planner-judge is-pending"><span>${escapeHtml(roleLabel)} Judge</span><strong>Panel pending</strong><small>No judge assignment published</small></div>`;
  const assessment = dogShowPlannerJudgeAssessment(judgeName, plan.dogKeys || [], plan.breedName || "");
  return `<button type="button" class="dog-show-planner-judge" data-action="open-planner-judge-history" data-judge="${escapeHtml(judgeName)}" aria-label="View ${escapeHtml(roleLabel)} judge history for ${escapeHtml(judgeName)}">
    <span>${escapeHtml(roleLabel)} Judge</span>
    <strong>${escapeHtml(judgeName)}</strong>
    <span class="dog-show-planner-judge-score"><b>${assessment.score}</b><em>${escapeHtml(assessment.label)}</em></span>
    <small>${escapeHtml(assessment.historyLabel)}</small>
  </button>`;
}

function dogShowPlannerAssessment(show = {}, plan = {}) {
  const dogKeys = Array.isArray(plan.dogKeys) ? plan.dogKeys : [];
  const dogNames = new Map(dogShowPlannerDogs().map((dog) => [dog.key, dogShowEntryName(dog.entry)]));
  const panel = [
    ["breed", show.breedJudge || "", "Breed"],
    ["group", show.groupJudge || "", "Group"],
    ["bis", show.bisJudge || "", "BIS"],
  ].filter(([, judge]) => judge);
  let score = panel.length ? 50 : 35;
  const reasons = [];
  panel.forEach(([role, judge, label]) => {
    const evidence = dogShowPlannerDogEvidence(judge, dogKeys, plan.breedName || "");
    const note = dogShowJudgeNote(judge);
    const recommendation = String(note.recommendation || "Watch");
    if (evidence.placements.length) {
      score += role === "breed" ? Math.min(28, 14 + evidence.placements.length * 5) : Math.min(16, 8 + evidence.placements.length * 3);
      const matchedDogs = [...new Set(evidence.placements.map((result) => dogNames.get(dogShowDogIdentity(result)) || result.dogName || "selected dog"))];
      reasons.push(`${judge} has placed ${matchedDogs.join(", ")} in ${evidence.placements.length} logged result${evidence.placements.length === 1 ? "" : "s"}.`);
    } else if (evidence.results.length) {
      score += 4;
      reasons.push(`${judge} has ${evidence.results.length} logged appearance${evidence.results.length === 1 ? "" : "s"} with the selected dog${dogKeys.length === 1 ? "" : "s"}.`);
    }
    if (recommendation === "Show Under") {
      score += role === "breed" ? 16 : 8;
      reasons.push(`${label} judge ${judge} is marked Show Under by the team.`);
    }
    if (recommendation === "Avoid") {
      score -= role === "breed" ? 30 : 14;
      reasons.push(`${label} judge ${judge} is marked Avoid by the team.`);
    }
  });
  if (show.nohs) {
    score += 3;
    reasons.push("National Owner-Handled Series is offered.");
  }
  if (!panel.length) reasons.push("The judge panel is not published yet, so this show needs review later.");
  if (!reasons.length) reasons.push("No prior result or team-note match was found for this panel.");
  score = Math.max(0, Math.min(100, score));
  const label = score >= 78 ? "Strong Match" : score >= 58 ? "Possible" : "Review";
  return { score, label, reasons };
}

function dogShowPlannerEventFlagLabels(show = {}) {
  const labelByCode = {
    AB: "All-Breed",
    S: "Specialty",
    PS: "Specialty",
    DS: "Specialty",
    SP: "Specialty",
    SPEC: "Specialty",
    SPECIALTY: "Specialty",
    JS: "Junior Showmanship",
    JSHW: "Junior Showmanship",
    BGP: "Beginner Puppy",
    BPUP: "Beginner Puppy",
    PUP: "Puppy Competition",
    GRP: "Group Show",
    GROUP: "Group Show",
    LB: "Limited-Breed",
    OS: "Open Show",
    FSS: "FSS Open Show",
    SWE: "Sweepstakes",
    SWEEPSTAKES: "Sweepstakes",
    OB: "Obedience",
    RLY: "Rally",
    FCAT: "Fast CAT",
  };
  const flags = String(show.showType || "")
    .split(/[\/,|+]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => labelByCode[value.toUpperCase()] || value);
  if (show.nohs || show.ownerHandled) flags.push("Owner-Handled");
  return [...new Set(flags)];
}

function dogShowPlannerEventTypeKeys(show = {}) {
  const labels = dogShowPlannerEventFlagLabels(show).map((label) => label.toLowerCase());
  const keys = [];
  if (labels.includes("all-breed")) keys.push("all-breed");
  if (labels.includes("specialty")) keys.push("specialty");
  if (labels.includes("owner-handled")) keys.push("owner-handled");
  if (labels.includes("junior showmanship") || show.juniorShowmanship) keys.push("junior-showmanship");
  if (labels.includes("beginner puppy") || show.beginnerPuppy) keys.push("beginner-puppy");
  if (labels.includes("group show")) keys.push("group-show");
  if (labels.includes("limited-breed")) keys.push("limited-breed");
  if (labels.some((label) => label === "open show" || label === "fss open show")) keys.push("open-show");
  if (labels.includes("sweepstakes")) keys.push("sweepstakes");
  return [...new Set(keys)];
}

function dogShowPlannerMatchesEventTypes(show = {}, eventTypes = []) {
  const selected = new Set(Array.isArray(eventTypes) ? eventTypes : []);
  if (!selected.size) return true;
  return dogShowPlannerEventTypeKeys(show).some((type) => selected.has(type));
}

function dogShowPlannerEventTypeLabels(eventTypes = []) {
  const selected = new Set(Array.isArray(eventTypes) ? eventTypes : []);
  return DOG_SHOW_PLANNER_EVENT_TYPE_OPTIONS
    .filter((option) => selected.has(option.value))
    .map((option) => option.label);
}

function dogShowPlannerSourceLinksHtml(show = {}, options = {}) {
  if (options.localFixture) return "";
  const sources = Array.isArray(show.sources) ? show.sources : [];
  const fallbackSources = [
    show.akcSourceUrl ? { type: "akc", label: "AKC Event", url: show.akcSourceUrl } : null,
    show.canineChronicleSourceUrl ? { type: "canine-chronicle", label: "Canine Chronicle", url: show.canineChronicleSourceUrl } : null,
    show.superintendentUrl ? { type: "superintendent", label: "Superintendent", url: show.superintendentUrl } : null,
    !sources.length && show.sourceUrl ? { type: "source", label: "View Source", url: show.sourceUrl } : null,
  ].filter(Boolean);
  const unique = new Map([...sources, ...fallbackSources].map((source) => [source.type || source.url, source]));
  return [...unique.values()]
    .filter((source) => source?.url)
    .map((source) => `<a class="secondary-button dog-show-source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label || "View Source")}</a>`)
    .join("");
}

function dogShowPlannerEventFlagsHtml(show = {}) {
  const flags = dogShowPlannerEventFlagLabels(show);
  return flags.length ? `<div class="dog-show-planner-flags" aria-label="Event format">${flags.map((flag) => `<span>${escapeHtml(flag)}</span>`).join("")}</div>` : "";
}

function openDogShowPlannerDecision(showId = "") {
  const plan = dogShowPlannerRecord();
  const show = (plan.shows || []).find((item) => String(item.externalId || "") === String(showId || ""));
  if (!show) return showToast("The selected show could not be found.");
  const assessment = dogShowPlannerAssessment(show, plan);
  const selectedDogNames = dogShowPlannerDogs().filter((dog) => (plan.dogKeys || []).includes(dog.key)).map((dog) => dogShowEntryName(dog.entry));
  const evaluatedLabel = plan.searchMode === "breed"
    ? dogShowPlannerCalendarBreedName(plan.breedName || show.breedName)
    : selectedDogNames.join(", ") || "All tracked show dogs";
  const judges = [
    ["Breed", show.breedJudge || ""],
    ["Group", show.groupJudge || ""],
    ["BIS", show.bisJudge || ""],
  ];
  const judgeRows = judges.map(([role, judge]) => {
    if (!judge) return `<article class="dog-show-decision-judge is-pending"><header><span>${role} Judge</span><strong>Panel pending</strong></header><p>No assignment has been published.</p></article>`;
    const judgeAssessment = dogShowPlannerJudgeAssessment(judge, plan.dogKeys || [], plan.breedName || "");
    return `<article class="dog-show-decision-judge">
      <header><span>${role} Judge</span><strong>${escapeHtml(judge)}</strong><div><b>${judgeAssessment.score}</b><em>${escapeHtml(judgeAssessment.label)}</em></div></header>
      <p>${escapeHtml(judgeAssessment.historyLabel)}</p>
      <small>Team recommendation: ${escapeHtml(judgeAssessment.recommendation || "Watch")}</small>
      <button type="button" class="secondary-button" data-action="open-planner-judge-history" data-judge="${escapeHtml(judge)}">View Judge History</button>
    </article>`;
  }).join("");
  openDogShowDialog(`Show Decision: ${show.club || show.name || "Dog Show"}`, `<section class="dog-show-planner-decision">
    <header class="dog-show-decision-summary"><div>${dogShowPlannerEventFlagsHtml(show)}<h3>${escapeHtml(show.club || show.name || "Dog Show")}</h3><p>${escapeHtml([dogShowPlannerDateRange(show), show.cityState].filter(Boolean).join(" · "))}</p></div><div class="dog-show-planner-score"><strong>${assessment.score}</strong><span>${assessment.label}</span></div></header>
    <div class="dog-show-decision-dogs"><span>${plan.searchMode === "breed" ? "Breed evaluated" : "Dogs evaluated"}</span><strong>${escapeHtml(evaluatedLabel)}</strong></div>
    <div class="dog-show-decision-judges">${judgeRows}</div>
    <section class="dog-show-decision-reasons"><h3>Why this score</h3><ul>${assessment.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul></section>
    <div class="button-row">${dogShowPlannerSourceLinksHtml(show, { localFixture: plan.localFixture })}<button type="button" class="secondary-button" data-action="close-show-dialog">Close</button></div>
  </section>`);
}

function dogShowPlannerDateRange(show = {}) {
  const start = dogShowFormatDate(show.startDate);
  const end = show.endDate && show.endDate !== show.startDate ? dogShowFormatDate(show.endDate) : "";
  return end ? `${start} – ${end}` : start;
}

function dogShowPlannerCandidateHtml(candidate = {}) {
  const show = candidate.show || {};
  const targets = Array.isArray(candidate.targets) ? candidate.targets : [];
  const breeds = [...new Set(targets.map((target) => dogShowPlannerCalendarBreedName(target.breed)).filter(Boolean))];
  const dogs = [...new Set(targets.filter((target) => target.targetType === "dog").map((target) => target.dogName).filter(Boolean))];
  return `<article class="dog-show-potential-card" data-candidate-id="${escapeHtml(candidate.id || "")}">
    <header><div><span>${escapeHtml(show.state || "Show")}</span><h4>${escapeHtml(show.club || show.name || "Dog Show")}</h4><p>${escapeHtml(show.cityState || "Location pending")}</p></div><strong>${escapeHtml(dogShowPlannerDateRange(show))}</strong></header>
    ${dogShowPlannerEventFlagsHtml(show)}
    <dl>
      <div><dt>Breed${breeds.length === 1 ? "" : "s"}</dt><dd>${escapeHtml(breeds.join(", ") || "Not selected")}</dd></div>
      <div><dt>Dogs</dt><dd>${escapeHtml(dogs.join(", ") || "Breed-only research")}</dd></div>
    </dl>
    <footer><span>Potential Show</span><div class="button-row"><button type="button" data-action="add-potential-show" data-candidate-id="${escapeHtml(candidate.id)}">Add Show</button><button type="button" class="secondary-button" data-action="remove-potential-show" data-candidate-id="${escapeHtml(candidate.id)}">Remove</button></div></footer>
  </article>`;
}

function dogShowPlannerLifecycleStatus(event = {}) {
  if (event.status === "Completed" || (event.endDate && event.endDate < todayDate())) return "Completed";
  if (event.startDate && event.startDate <= todayDate() && (event.endDate || event.startDate) >= todayDate()) return "Active";
  return dogShowEventStatus(event.status);
}

function dogShowPlannerPointScheduleBreeds(event = {}, entries = dogShowEntries(event), planner = dogShowPlannerRecord()) {
  const plannerCandidate = dogShowPlannerCandidateForShow({
    ...event,
    externalId: event.plannerExternalId || event.externalId || "",
    club: event.club || event.name || "",
    cityState: event.cityState || event.venueAddress || "",
  });
  const relatedPlannerShow = (planner.shows || []).find((show) => {
    if (dogShowPlannerEventForShow(show)?.id === event.id) return true;
    const showName = String(show.club || show.name || "").trim().toLowerCase();
    const eventName = String(event.club || event.name || "").trim().toLowerCase();
    return Boolean(show.startDate && show.startDate === event.startDate && showName && showName === eventName);
  });
  const requestedBreeds = [
    ...entries.map(dogShowBreed),
    event.breedName,
    plannerCandidate?.show?.breedName,
    ...(plannerCandidate?.targets || []).map((target) => target.breed),
    relatedPlannerShow?.breedName,
    relatedPlannerShow && planner.searchMode === "breed" ? planner.breedName : "",
  ].filter(Boolean);
  if (planner.searchMode === "breed") {
    requestedBreeds.push(planner.breedName || planner.shows?.[0]?.breedName || DOG_SHOW_PLANNER_DEFAULT_BREED);
  }
  return [...new Set(requestedBreeds.map((breed) => (
    akcPointCalculatorBreeds2026().find((candidate) => dogShowPlannerBreedMatches(candidate, breed)) || ""
  )).filter(Boolean))];
}

function dogShowPlannerPointScheduleHtml(event = {}, lifecycleStatus = "Going To", planner = dogShowPlannerRecord()) {
  if (lifecycleStatus === "Completed") return "";
  const state = dogShowEventState(event);
  const breeds = dogShowPlannerPointScheduleBreeds(event, dogShowEntries(event), planner);
  const showDate = String(event.startDate || "");
  const schedules = state && showDate >= "2026-05-12" && showDate <= "2027-05-11"
    ? breeds.map((breed) => akcBreedPointSchedule2026(state, breed)).filter(Boolean)
    : [];
  if (!schedules.length) {
    const reason = !state
      ? "Add a two-letter state to the show address to load its AKC division."
      : !breeds.length
        ? "Add a dog to the show roster to load that breed's point schedule."
        : "No matching 2026 AKC breed schedule is available for this show.";
    return `<section class="dog-show-plan-point-schedule is-empty"><header><div><span>AKC BREED POINTS</span><strong>Point schedule unavailable</strong></div></header><p>${escapeHtml(reason)}</p></section>`;
  }
  const first = schedules[0];
  const points = [1, 2, 3, 4, 5];
  return `<section class="dog-show-plan-point-schedule">
    <header><div><span>AKC BREED POINTS</span><strong>${escapeHtml(`${DOG_SHOW_AKC_STATE_NAMES[first.state] || first.state} · D${first.division}`)}</strong></div><a href="https://www.akc.org/sports/conformation/resources/points-schedule/" target="_blank" rel="noopener noreferrer">Official schedule</a></header>
    <div class="dog-show-plan-point-schedule-list">${schedules.map((schedule) => `<article><h5>${escapeHtml(schedule.breed)}</h5><div class="dog-show-plan-point-thresholds" role="table" aria-label="${escapeHtml(`${schedule.breed} number competing for 1 through 5 breed points`)}"><div role="row"><span role="rowheader">Dogs</span>${schedule.dogs.map((count, index) => `<b role="cell" aria-label="${points[index]} point requires ${count} dogs"><small>${points[index]} pt</small>${count}</b>`).join("")}</div><div role="row"><span role="rowheader">Bitches</span>${schedule.bitches.map((count, index) => `<b role="cell" aria-label="${points[index]} point requires ${count} bitches"><small>${points[index]} pt</small>${count}</b>`).join("")}</div></div></article>`).join("")}</div>
    <p title="Special dogs and bitches can affect BOB/BOV and BOS outcomes.">Counts for 1–5 points · Group points excluded.<span class="sr-only"> Special dogs and bitches can affect BOB/BOV and BOS outcomes.</span></p>
  </section>`;
}

function dogShowPlannerEventPlanHtml(event = {}, lifecycleStatus = "Going To", planner = dogShowPlannerRecord()) {
  const entries = dogShowEntries(event);
  const dogs = entries.map(dogShowEntryName).filter(Boolean);
  return `<article class="dog-show-plan-event-card is-${lifecycleStatus.toLowerCase().replace(/\s+/g, "-")}">
    <header><div><span>${escapeHtml(lifecycleStatus)}</span><h4>${escapeHtml(event.name || event.club || "Dog Show")}</h4><p>${escapeHtml(event.venueAddress || event.cityState || event.venue || "Location pending")}</p></div><strong>${escapeHtml(dogShowPlannerDateRange(event))}</strong></header>
    ${dogShowPlannerEventFlagsHtml(event)}
    <dl><div><dt>Status</dt><dd>${escapeHtml(lifecycleStatus)}</dd></div><div><dt>Dogs</dt><dd>${escapeHtml(dogs.join(", ") || "No dogs added yet")}</dd></div></dl>
    ${dogShowPlannerPointScheduleHtml(event, lifecycleStatus, planner)}
    <footer><span>${entries.length} dog${entries.length === 1 ? "" : "s"} on roster</span><button type="button" data-action="open-planner-show-event" data-event-id="${escapeHtml(event.id || "")}">Open Show</button></footer>
  </article>`;
}

function dogShowPlannerVisibleCandidates(potentialShows = dogShowPlannerCandidates(), events = dogShowEvents()) {
  const promotedExternalIds = new Set(events.map((event) => event.plannerExternalId).filter(Boolean));
  const promotedSourceUrls = new Set(events.map((event) => event.sourceUrl).filter(Boolean));
  const promotedShowDates = new Set(events.map((event) => `${String(event.startDate || "")}|${String(event.club || event.name || "").trim().toLowerCase()}`));
  return potentialShows.filter((candidate) => {
    const show = candidate.show || {};
    const showDateKey = `${String(show.startDate || "")}|${String(show.club || show.name || "").trim().toLowerCase()}`;
    return (!show.externalId || !promotedExternalIds.has(show.externalId))
      && (!show.sourceUrl || !promotedSourceUrls.has(show.sourceUrl))
      && !promotedShowDates.has(showDateKey);
  });
}

function dogShowPlannerLifecycleHtml(potentialShows = [], planner = dogShowPlannerRecord()) {
  const events = dogShowEvents();
  const groups = new Map(["Active", "Going", "Going To", "Potential Plan", "Completed"].map((status) => [status, []]));
  events.forEach((event) => {
    const status = dogShowPlannerLifecycleStatus(event);
    groups.get(status).push({ kind: "event", event });
  });
  dogShowPlannerVisibleCandidates(potentialShows, events)
    .forEach((candidate) => groups.get("Potential Plan").push({ kind: "potential", candidate }));
  const itemCount = [...groups.values()].reduce((sum, items) => sum + items.length, 0);
  if (!itemCount) return "";
  const statusSummary = [...groups.entries()].map(([status, items]) => `<span class="is-${status.toLowerCase().replace(/\s+/g, "-")}"><strong>${items.length}</strong>${escapeHtml(status)}</span>`).join("");
  const groupHtml = [...groups.entries()].map(([status, items]) => {
    const sorted = [...items].sort((left, right) => {
      const leftDate = left.event?.startDate || left.candidate?.show?.startDate || "";
      const rightDate = right.event?.startDate || right.candidate?.show?.startDate || "";
      return status === "Completed" ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
    });
    const expanded = status === "Active";
    return `<details class="dog-show-plan-stage is-${status.toLowerCase().replace(/\s+/g, "-")}"${expanded ? " open" : ""}><summary><span><strong>${escapeHtml(status)}</strong><em>${items.length}</em></span><i aria-hidden="true"></i></summary><div>${sorted.length ? sorted.map((item) => item.kind === "event" ? dogShowPlannerEventPlanHtml(item.event, status, planner) : dogShowPlannerCandidateHtml(item.candidate)).join("") : `<p class="dog-show-plan-empty">No ${escapeHtml(status.toLowerCase())} shows.</p>`}</div></details>`;
  }).join("");
  return `<section class="dog-show-plan-board"><header><div><span>SHOW LIFECYCLE</span><h3>Show Plan</h3><p>View every show by stage—from early research through the active weekend and completed history. Research for another breed is appended to the same show.</p></div><strong>${itemCount} show${itemCount === 1 ? "" : "s"}</strong></header><div class="dog-show-plan-status-summary">${statusSummary}</div><div class="dog-show-plan-stages">${groupHtml}</div></section>`;
}

function dogShowPlannerPotentialButtonHtml(show = {}, plan = dogShowPlannerRecord()) {
  const candidate = dogShowPlannerCandidateForShow(show);
  const inPotentialPlan = dogShowPlannerCandidateHasTargets(candidate || {}, plan);
  return inPotentialPlan
    ? `<button type="button" class="secondary-button" data-action="remove-potential-show" data-candidate-id="${escapeHtml(candidate?.id || "")}">Remove Potential</button>`
    : `<button type="button" class="secondary-button" data-action="save-potential-show" data-show-id="${escapeHtml(show.externalId || "")}">Potential Show</button>`;
}

function dogShowPlannerEventMatchKeys(event = {}) {
  return dogShowPlannerShowMatchKeys({
    ...event,
    externalId: event.plannerExternalId || event.externalId || "",
    club: event.club || event.name || "",
    cityState: event.cityState || event.venueAddress || "",
  });
}

function dogShowPlannerEventForShow(show = {}, events = dogShowEvents()) {
  const keys = new Set(dogShowPlannerShowMatchKeys(show));
  return events.find((event) => dogShowPlannerEventMatchKeys(event).some((key) => keys.has(key))) || null;
}

function dogShowPlannerDateRangesOverlap(left = {}, right = {}) {
  const leftStart = String(left.startDate || "");
  const rightStart = String(right.startDate || "");
  if (!leftStart || !rightStart) return false;
  const leftEnd = String(left.endDate || leftStart);
  const rightEnd = String(right.endDate || rightStart);
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function dogShowPlannerSameShow(left = {}, right = {}) {
  const keys = new Set(dogShowPlannerShowMatchKeys(left));
  return dogShowPlannerShowMatchKeys(right).some((key) => keys.has(key));
}

function dogShowPlannerConflictsForShow(show = {}, events = dogShowEvents(), candidates = dogShowPlannerCandidates()) {
  const eventConflicts = events
    .filter((event) => !dogShowPlannerSameShow(show, {
      ...event,
      externalId: event.plannerExternalId || event.externalId || "",
      club: event.club || event.name || "",
      cityState: event.cityState || event.venueAddress || "",
    }))
    .filter((event) => dogShowPlannerDateRangesOverlap(show, event))
    .map((event) => ({ name: event.club || event.name || "Added show", startDate: event.startDate, endDate: event.endDate }));
  const potentialConflicts = candidates
    .map((candidate) => candidate.show || {})
    .filter((candidateShow) => !dogShowPlannerSameShow(show, candidateShow))
    .filter((candidateShow) => dogShowPlannerDateRangesOverlap(show, candidateShow))
    .map((candidateShow) => ({ name: candidateShow.club || candidateShow.name || "Potential show", startDate: candidateShow.startDate, endDate: candidateShow.endDate }));
  const unique = new Map([...eventConflicts, ...potentialConflicts].map((conflict) => [
    `${conflict.name}|${conflict.startDate}|${conflict.endDate}`,
    conflict,
  ]));
  return [...unique.values()];
}

function dogShowPlannerCardState(show = {}, plan = dogShowPlannerRecord(), events = dogShowEvents(), candidates = dogShowPlannerCandidates()) {
  const event = dogShowPlannerEventForShow(show, events);
  const candidate = dogShowPlannerCandidateForShow(show);
  const potential = dogShowPlannerCandidateHasTargets(candidate || {}, plan);
  const conflicts = dogShowPlannerConflictsForShow(show, events, candidates);
  return { event, candidate, potential, conflicts };
}

function dogShowPlannerCardStateHtml(state = {}) {
  const conflictTitle = (state.conflicts || []).map((conflict) => `${conflict.name} (${dogShowPlannerDateRange(conflict)})`).join("; ");
  if (!state.event && !state.potential && !state.conflicts?.length) return "";
  return `<div class="dog-show-planner-state-flags">
    ${state.event ? `<span class="is-added">Added Show</span>` : ""}
    ${state.potential ? `<span class="is-potential">In Potential Plan</span>` : ""}
    ${state.conflicts?.length ? `<span class="is-conflict" title="Overlaps ${escapeHtml(conflictTitle)}">Date Conflict</span>` : ""}
  </div>`;
}

function dogShowPlannerAddButtonHtml(show = {}, state = dogShowPlannerCardState(show)) {
  return state.event
    ? `<button type="button" class="danger-button dog-show-remove-added-button" data-action="remove-planned-show" data-show-id="${escapeHtml(show.externalId || "")}">Remove Show</button>`
    : `<button type="button" data-action="add-planned-show" data-show-id="${escapeHtml(show.externalId || "")}">Add Show</button>`;
}

function dogShowMasterDate(value = dogShowMasterCalendarDate || todayDate()) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value || todayDate()}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(`${todayDate()}T12:00:00`) : date;
}

function dogShowMasterCalendarEventStatus(event = {}) {
  return dogShowPlannerLifecycleStatus(event);
}

function dogShowMasterCalendarItems() {
  const events = dogShowEvents();
  const activeEventId = dogShowActiveEvent()?.id || "";
  const eventItems = dogShowEventWeekendGroups(events).map((group) => {
    const statuses = group.events.map((event) => dogShowMasterCalendarEventStatus(event));
    const status = statuses.includes("Active")
      ? "Active"
      : statuses.includes("Going")
        ? "Going"
        : statuses.includes("Going To")
          ? "Going To"
        : statuses.every((value) => value === "Completed")
          ? "Completed"
          : statuses[0] || "Going To";
    const activeMember = group.events.find((event) => event.id === activeEventId) || group.events[0];
    return {
      id: group.id,
      kind: "event",
      eventId: activeMember.id,
      eventIds: group.events.map((event) => event.id),
      memberCount: group.events.length,
      title: group.title,
      location: group.location,
      startDate: group.startDate,
      endDate: group.endDate,
      status,
      flags: [...new Set(group.events.flatMap((event) => dogShowPlannerEventFlagLabels(event)))],
    };
  });
  const potentialItems = dogShowPlannerVisibleCandidates(dogShowPlannerCandidates(), events).map((candidate) => {
    const show = candidate.show || {};
    return {
      id: `potential:${candidate.id}`,
      kind: "potential",
      candidateId: candidate.id,
      title: show.club || show.name || "Dog Show",
      location: show.cityState || "Location pending",
      startDate: show.startDate || todayDate(),
      endDate: show.endDate || show.startDate || todayDate(),
      status: "Potential",
      flags: dogShowPlannerEventFlagLabels(show),
    };
  });
  return [...eventItems, ...potentialItems].sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)) || String(left.title).localeCompare(String(right.title)));
}

function dogShowMasterCalendarItemsOnDate(items = [], dateKey = todayDate()) {
  return items.filter((item) => item.startDate <= dateKey && item.endDate >= dateKey);
}

function dogShowMasterCalendarItemHtml(item = {}, compact = false) {
  const statusClass = String(item.status || "Going To").toLowerCase().replace(/\s+/g, "-");
  const actionData = item.kind === "potential"
    ? `data-candidate-id="${escapeHtml(item.candidateId || "")}"`
    : `data-event-id="${escapeHtml(item.eventId || "")}" data-event-ids="${escapeHtml((item.eventIds || [item.eventId]).filter(Boolean).join("|"))}"`;
  const groupMeta = Number(item.memberCount || 0) > 1 ? `${dogShowPlannerDateRange(item)} · ${item.memberCount} events` : "";
  return `<button type="button" class="dog-show-master-calendar-item is-${statusClass}${compact ? " is-compact" : ""}${groupMeta ? " is-grouped" : ""}" data-action="open-show-calendar-item" data-kind="${escapeHtml(item.kind || "event")}" ${actionData} aria-label="${escapeHtml(`${item.title}, ${item.status}, ${dogShowPlannerDateRange(item)}${groupMeta ? `, ${item.memberCount} events` : ""}`)}"><strong>${escapeHtml(item.title || "Dog Show")}</strong>${compact ? (groupMeta ? `<small>${escapeHtml(groupMeta)}</small>` : "") : `<span>${escapeHtml(item.location || "Location pending")}</span><small>${escapeHtml(dogShowPlannerDateRange(item))} · ${escapeHtml(item.status || "Going To")}${groupMeta ? ` · ${item.memberCount} events` : ""}</small>`}</button>`;
}

function dogShowMasterCalendarRangeLabel() {
  const anchor = dogShowMasterDate();
  if (dogShowMasterCalendarView === "year") return String(anchor.getFullYear());
  if (dogShowMasterCalendarView === "month") return anchor.toLocaleDateString([], { month: "long", year: "numeric" });
  if (dogShowMasterCalendarView === "day") return anchor.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const start = new Date(anchor);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString([], { month: "short", day: "numeric" })} – ${end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

function dogShowMasterCalendarYearHtml(items = []) {
  const year = dogShowMasterDate().getFullYear();
  const months = Array.from({ length: 12 }, (_, monthIndex) => {
    const first = new Date(year, monthIndex, 1, 12);
    const last = new Date(year, monthIndex + 1, 0, 12);
    const monthStart = dogShowDateKey(first);
    const monthEnd = dogShowDateKey(last);
    const monthItems = items.filter((item) => item.startDate <= monthEnd && item.endDate >= monthStart);
    const blankDays = Array.from({ length: first.getDay() }, () => `<span class="dog-show-master-year-blank"></span>`).join("");
    const dayButtons = Array.from({ length: last.getDate() }, (_, index) => {
      const date = new Date(year, monthIndex, index + 1, 12);
      const dateKey = dogShowDateKey(date);
      const dayItems = dogShowMasterCalendarItemsOnDate(items, dateKey);
      const dots = dayItems.slice(0, 3).map((item) => `<i class="is-${String(item.status).toLowerCase().replace(/\s+/g, "-")}"></i>`).join("");
      const dateLabel = date.toLocaleDateString([], { month: "long", day: "numeric" });
      const showPreview = dayItems.map((item) => `${item.title || "Dog Show"} (${item.status || "Going To"})`).join(" · ");
      const accessibleLabel = `${dateLabel}, ${dayItems.length} show${dayItems.length === 1 ? "" : "s"}${showPreview ? `: ${showPreview}` : ""}`;
      return `<button type="button" class="${dateKey === todayDate() ? "is-today" : ""}${dayItems.length ? " has-shows" : ""}" data-show-calendar-jump-date="${dateKey}" data-show-calendar-jump-view="day"${showPreview ? ` title="${escapeHtml(showPreview)}"` : ""} aria-label="${escapeHtml(accessibleLabel)}"><span>${index + 1}</span><em>${dots}</em></button>`;
    }).join("");
    return `<section class="dog-show-master-year-month"><header><button type="button" data-show-calendar-jump-date="${monthStart}" data-show-calendar-jump-view="month">${escapeHtml(first.toLocaleDateString([], { month: "long" }))}</button><span>${monthItems.length}</span></header><div class="dog-show-master-year-weekdays"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="dog-show-master-year-days">${blankDays}${dayButtons}</div>${monthItems.length ? `<div class="dog-show-master-year-agenda">${monthItems.map((item) => dogShowMasterCalendarItemHtml(item, true)).join("")}</div>` : ""}</section>`;
  }).join("");
  return `<div class="dog-show-master-year-grid">${months}</div>`;
}

function dogShowMasterCalendarMonthHtml(items = []) {
  const anchor = dogShowMasterDate();
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const dates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => `<div><span class="weekday-full">${day}</span><span class="weekday-short">${day.slice(0, 3)}</span></div>`).join("");
  const days = dates.map((date) => {
    const dateKey = dogShowDateKey(date);
    const dayItems = dogShowMasterCalendarItemsOnDate(items, dateKey);
    return `<section class="dog-show-master-month-day${date.getMonth() !== anchor.getMonth() ? " is-outside" : ""}${dateKey === todayDate() ? " is-today" : ""}"><header><button type="button" data-show-calendar-jump-date="${dateKey}" data-show-calendar-jump-view="day">${date.getDate()}</button></header><div>${dayItems.slice(0, 3).map((item) => dogShowMasterCalendarItemHtml(item, true)).join("")}${dayItems.length > 3 ? `<button type="button" class="dog-show-master-calendar-more" data-show-calendar-jump-date="${dateKey}" data-show-calendar-jump-view="day">+${dayItems.length - 3} more</button>` : ""}</div></section>`;
  }).join("");
  return `<div class="dog-show-master-month-grid">${weekdays}${days}</div>`;
}

function dogShowMasterCalendarWeekHtml(items = []) {
  const start = dogShowMasterDate();
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = dogShowDateKey(date);
    const dayItems = dogShowMasterCalendarItemsOnDate(items, dateKey);
    return `<section class="dog-show-master-week-day${dateKey === todayDate() ? " is-today" : ""}"><header><button type="button" data-show-calendar-jump-date="${dateKey}" data-show-calendar-jump-view="day"><span>${escapeHtml(date.toLocaleDateString([], { weekday: "short" }))}</span><strong>${date.getDate()}</strong></button></header><div>${dayItems.length ? dayItems.map((item) => dogShowMasterCalendarItemHtml(item)).join("") : `<p>No shows</p>`}</div></section>`;
  }).join("");
  return `<div class="dog-show-master-week-grid">${days}</div>`;
}

function dogShowMasterCalendarDayHtml(items = []) {
  const dateKey = dogShowDateKey(dogShowMasterDate());
  const dayItems = dogShowMasterCalendarItemsOnDate(items, dateKey);
  return `<section class="dog-show-master-day-list"><header><span>${escapeHtml(dogShowMasterDate().toLocaleDateString([], { weekday: "long" }))}</span><strong>${escapeHtml(dogShowMasterDate().toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }))}</strong></header><div>${dayItems.length ? dayItems.map((item) => dogShowMasterCalendarItemHtml(item)).join("") : dogShowRenderEmpty("No shows on this date", "Use the arrows or calendar views to find another show date.")}</div></section>`;
}

function dogShowMasterCalendarHtml() {
  const items = dogShowMasterCalendarItems();
  const viewHtml = dogShowMasterCalendarView === "year"
    ? dogShowMasterCalendarYearHtml(items)
    : dogShowMasterCalendarView === "month"
      ? dogShowMasterCalendarMonthHtml(items)
      : dogShowMasterCalendarView === "week"
        ? dogShowMasterCalendarWeekHtml(items)
        : dogShowMasterCalendarDayHtml(items);
  return `<div class="dog-show-view dog-show-master-calendar-view"><section class="dog-show-planner-heading"><div><span>SHOW PLANNING</span><h3>Show Calendar</h3><p>Follow each show from research and planning through booked, active, and completed.</p></div><button type="button" data-action="open-show-planner">Find Shows</button></section><section class="dog-show-master-calendar"><header><div class="dog-show-master-calendar-view-toggle" role="group" aria-label="Show Calendar view">${["year", "month", "week", "day"].map((view) => `<button type="button" data-show-master-calendar-view="${view}" class="${dogShowMasterCalendarView === view ? "is-active" : ""}">${view[0].toUpperCase()}${view.slice(1)}</button>`).join("")}</div><div class="dog-show-master-calendar-navigation"><button type="button" class="secondary-button" data-show-calendar-offset="-1" aria-label="Previous ${escapeHtml(dogShowMasterCalendarView)}">‹</button><button type="button" class="secondary-button" data-show-calendar-today>Today</button><strong>${escapeHtml(dogShowMasterCalendarRangeLabel())}</strong><button type="button" class="secondary-button" data-show-calendar-offset="1" aria-label="Next ${escapeHtml(dogShowMasterCalendarView)}">›</button></div></header><div class="dog-show-master-calendar-legend" aria-label="Show statuses"><span class="is-potential">Potential</span><span class="is-going-to">Going To</span><span class="is-going">Going (Booked/Paid)</span><span class="is-active">Active</span><span class="is-completed">Completed</span></div><div class="dog-show-master-calendar-body">${viewHtml}</div></section></div>`;
}

function dogShowPlannerHtml() {
  const plan = dogShowPlannerRecord();
  const shows = Array.isArray(plan.shows) ? [...plan.shows] : [];
  const selectedDogNames = dogShowPlannerDogs().filter((dog) => (plan.dogKeys || []).includes(dog.key)).map((dog) => dogShowEntryName(dog.entry));
  const selectedBreed = dogShowPlannerCalendarBreedName(plan.breedName || shows[0]?.breedName || DOG_SHOW_PLANNER_DEFAULT_BREED);
  const selectedEventTypeLabels = dogShowPlannerEventTypeLabels(plan.eventTypes);
  const potentialShows = dogShowPlannerCandidates();
  const operationalShows = dogShowEvents();
  const ranked = shows.map((show) => ({ show, assessment: dogShowPlannerAssessment(show, plan) })).sort((left, right) => right.assessment.score - left.assessment.score || String(left.show.startDate || "").localeCompare(String(right.show.startDate || "")));
  const fetchedLabel = plan.fetchedAt ? new Date(plan.fetchedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
  return `<div class="dog-show-view dog-show-planner-view">
    <section class="dog-show-planner-heading"><div><span>SHOW INTELLIGENCE</span><h3>Show Planner</h3><p>Compare future ${escapeHtml(selectedBreed)} panels with selected dogs' results, breed research, and internal judge notes.</p></div><button type="button" data-action="edit-show-plan">${plan.id ? "Update Search" : "Find Shows"}</button></section>
    ${plan.id ? `<section class="dog-show-planner-criteria"><div><span>${plan.searchMode === "breed" ? "Breed" : "Dogs"}</span><strong>${escapeHtml(plan.searchMode === "breed" ? selectedBreed : selectedDogNames.join(", ") || "All tracked show dogs")}</strong></div><div><span>Dates</span><strong>${escapeHtml(dogShowPlannerDateRange({ startDate: plan.startDate, endDate: plan.endDate }))}</strong></div><div><span>States</span><strong>${escapeHtml((plan.states || []).join(", ") || "Nationwide")}</strong></div><div><span>Formats</span><strong>${escapeHtml(selectedEventTypeLabels.join(", ") || "All formats")}</strong></div><div><span>Last checked</span><strong>${escapeHtml(fetchedLabel || "Not available")}</strong></div></section>` : ""}
    ${dogShowPlannerLifecycleHtml(potentialShows, plan)}
    ${ranked.length ? `<section class="dog-show-planner-results"><header><div><h3>Recommended Shows</h3><p>${ranked.length} show${ranked.length === 1 ? "" : "s"} found. Recommendations explain the evidence used; they are guidance, not a prediction.</p></div></header><div class="dog-show-planner-list">${ranked.map(({ show, assessment }) => {
      const state = dogShowPlannerCardState(show, plan, operationalShows, potentialShows);
      return `<article class="dog-show-planner-card is-${assessment.label.toLowerCase().replace(/\s+/g, "-")}${state.event ? " is-added-show" : ""}${state.conflicts.length ? " has-schedule-conflict" : ""}">
      <header><div>${dogShowPlannerEventFlagsHtml(show)}${dogShowPlannerCardStateHtml(state)}<h3>${escapeHtml(show.club || show.name || "Dog Show")}</h3><p>${escapeHtml([dogShowPlannerDateRange(show), show.cityState].filter(Boolean).join(" · "))}</p></div><div class="dog-show-planner-score"><strong>${assessment.score}</strong><span>${assessment.label}</span></div></header>
      <div class="dog-show-planner-panel">${dogShowPlannerJudgeHtml("Breed", show.breedJudge || "", plan)}${dogShowPlannerJudgeHtml("Group", show.groupJudge || "", plan)}${dogShowPlannerJudgeHtml("BIS", show.bisJudge || "", plan)}</div>
      <ul>${assessment.reasons.slice(0, 3).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>
      <footer><div class="dog-show-planner-meta">${show.eventNumber ? `<span>AKC #${escapeHtml(show.eventNumber)}</span>` : ""}${show.entryClosingDate ? `<span>Closes ${escapeHtml(dogShowFormatDate(show.entryClosingDate))}</span>` : ""}${show.superintendent ? `<span>${escapeHtml(show.superintendent)}</span>` : ""}${show.verifiedBy ? `<span>Verified by ${escapeHtml(show.verifiedBy)}</span>` : ""}</div><div class="button-row"><button type="button" class="secondary-button" data-action="view-show-decision" data-show-id="${escapeHtml(show.externalId || "")}">View Show Decision</button>${dogShowPlannerSourceLinksHtml(show, { localFixture: plan.localFixture })}${dogShowPlannerPotentialButtonHtml(show, plan)}${dogShowPlannerAddButtonHtml(show, state)}</div></footer>
    </article>`;
    }).join("")}</div></section>` : dogShowRenderEmpty("Find the right show for your dogs", "Choose the dogs or breed, dates, optional states, and show formats. The planner will import future shows and rank their published judge panels against your history.", "edit-show-plan", "Find Shows")}
    <section class="dog-show-planner-source-note"><strong>Source and limitations</strong><p>Listings are combined and deduplicated using the AKC event number from AKC Event Search and Canine Chronicle. AKC event details and published superintendent documents enrich each show when available. Always confirm the latest premium list before entering because panels and assignments can change.</p></section>
  </div>`;
}

function dogShowPlannerDateOffset(dateValue = todayDate(), days = 90) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return dogShowDateKey(date);
}

function openDogShowPlannerForm() {
  const plan = dogShowPlannerRecord();
  const dogs = dogShowPlannerDogs();
  const searchMode = plan.searchMode === "breed" ? "breed" : "dogs";
  const selectedKeys = new Set(Array.isArray(plan.dogKeys) && plan.dogKeys.length ? plan.dogKeys : dogs.slice(0, 1).map((dog) => dog.key));
  const selectedEventTypes = new Set(Array.isArray(plan.eventTypes) ? plan.eventTypes : []);
  const breedName = dogShowPlannerCalendarBreedName(plan.breedName || DOG_SHOW_PLANNER_DEFAULT_BREED);
  const breedOptions = dogShowPlannerBreedOptions().map((breed) => `<option value="${escapeHtml(breed)}"></option>`).join("");
  const eventTypeOptions = DOG_SHOW_PLANNER_EVENT_TYPE_OPTIONS.map((option) => `<label class="dog-show-check-option"><input type="checkbox" name="eventTypes" value="${escapeHtml(option.value)}"${selectedEventTypes.has(option.value) ? " checked" : ""}/><span><strong>${escapeHtml(option.label)}</strong></span></label>`).join("");
  openDogShowDialog("Find Dog Shows", `<form id="dogShowPlannerForm" class="tracker-form">
    <p class="dog-show-form-intro">Search using specific dogs for judge-history scoring, or research any breed without adding a dog first.</p>
    <details class="dog-show-collapsible-section dog-show-planner-search-section"${searchMode === "dogs" ? " open" : ""}>
      <summary><span><strong>Dogs to evaluate</strong><small>Use Our Dogs and customer dogs for personalized judge scoring.</small></span></summary>
      <div class="dog-show-collapsible-content">
        <label class="dog-show-planner-mode-option"><input type="radio" name="searchMode" value="dogs"${searchMode === "dogs" ? " checked" : ""}/><span><strong>Search using selected dogs</strong><small>Results are ranked against each selected dog's logged history.</small></span></label>
        <div class="dog-show-planner-dog-options">${dogs.length ? dogs.map((dog) => `<label class="dog-show-check-option"><input type="checkbox" name="dogKeys" value="${escapeHtml(dog.key)}"${selectedKeys.has(dog.key) ? " checked" : ""}/>${dogShowPhotoHtml(dog.entry, "dog-show-planner-dog-photo")}<span><strong>${escapeHtml(dogShowEntryName(dog.entry))}</strong><small>${escapeHtml(dogShowBreed(dog.entry) || DOG_SHOW_PLANNER_DEFAULT_BREED)}</small></span></label>`).join("") : `<p class="muted-copy">Add a dog in Our Dogs or to a show roster first.</p>`}</div>
      </div>
    </details>
    <details class="dog-show-collapsible-section dog-show-planner-search-section"${searchMode === "breed" ? " open" : ""}>
      <summary><span><strong>Search by breed</strong><small>Research a breed without selecting a dog.</small></span></summary>
      <div class="dog-show-collapsible-content">
        <label class="dog-show-planner-mode-option"><input type="radio" name="searchMode" value="breed"${searchMode === "breed" ? " checked" : ""}/><span><strong>Search using a breed only</strong><small>The calendar will use that breed's published breed and group judges.</small></span></label>
        <label>Breed<input name="breedName" list="dogShowPlannerBreedList" value="${escapeHtml(breedName)}" autocomplete="off" placeholder="Start typing a breed name"/><small>Select a breed from the list or enter its official name.</small></label>
        <datalist id="dogShowPlannerBreedList">${breedOptions}</datalist>
      </div>
    </details>
    <div class="field-grid"><label>Start date<input type="date" name="startDate" value="${escapeHtml(plan.startDate || todayDate())}" required/></label><label>End date<input type="date" name="endDate" value="${escapeHtml(plan.endDate || dogShowPlannerDateOffset(todayDate(), 90))}" required/></label><label class="dog-show-field-wide">States<input name="states" value="${escapeHtml(Array.isArray(plan.states) ? plan.states.join(", ") : "TX, OK, LA")}" placeholder="Leave blank for all states"/><small>Optional. Enter two-letter state codes separated by commas, or leave blank to search nationwide.</small></label></div>
    <fieldset class="dog-show-form-section dog-show-planner-format-section"><legend>Show formats</legend><p>Select one or more formats to narrow the results. Leave every box unchecked to include all published conformation shows.</p><div class="dog-show-planner-format-options">${eventTypeOptions}</div></fieldset>
    <div class="dog-show-form-actions"><button type="submit">Find &amp; Rank Shows</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function dogShowPlannerLocalShows(startDate = todayDate(), breedName = DOG_SHOW_PLANNER_DEFAULT_BREED) {
  const first = dogShowPlannerDateOffset(startDate, 14);
  const second = dogShowPlannerDateOffset(startDate, 35);
  return [
    { externalId: "local-planner-1", startDate: first, endDate: dogShowPlannerDateOffset(first, 1), club: "Central Texas Kennel Club", cityState: "Belton, TX", state: "TX", showType: "AB/JS/BgP", nohs: true, entryClosingDate: dogShowPlannerDateOffset(startDate, 7), breedName, breedJudge: dogShowObservedJudges()[0] || "Panel pending", groupJudge: dogShowObservedJudges()[1] || "", bisJudge: dogShowObservedJudges()[2] || "", superintendent: "Sample Superintendent" },
    { externalId: "local-planner-2", startDate: second, endDate: dogShowPlannerDateOffset(second, 2), club: "Red River Dog Show Cluster", cityState: "Shreveport, LA", state: "LA", showType: "SP", nohs: false, entryClosingDate: dogShowPlannerDateOffset(startDate, 28), breedName, breedJudge: dogShowObservedJudges()[3] || "Panel pending", groupJudge: dogShowObservedJudges()[4] || "", bisJudge: dogShowObservedJudges()[5] || "", superintendent: "Sample Superintendent" },
  ];
}

function dogShowPlannerNeedsMetadataRefresh(plan = dogShowPlannerRecord()) {
  return Boolean(
    plan.id
    && !plan.localFixture
    && Number(plan.metadataVersion || 0) < 5
    && Array.isArray(plan.shows)
    && plan.shows.length
    && plan.startDate
    && plan.endDate
    && Array.isArray(plan.states)
  );
}

function dogShowPlannerMergeMetadata(show = {}, imported = {}) {
  const merged = { ...show };
  Object.entries(imported).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) merged[key] = value;
  });
  return merged;
}

async function refreshDogShowPlannerMetadata(plan = dogShowPlannerRecord()) {
  if (!dogShowPlannerNeedsMetadataRefresh(plan)) return;
  const refreshKey = `${plan.id}:${plan.updatedAt || plan.submittedAt || ""}`;
  if (dogShowPlannerMetadataRefreshKey === refreshKey) return;
  dogShowPlannerMetadataRefreshKey = refreshKey;
  try {
    if (typeof supabaseClient === "undefined" || !supabaseClient?.functions) return;
    const { data, error } = await supabaseClient.functions.invoke("show-calendar-scrape", {
      body: {
        startDate: plan.startDate,
        endDate: plan.endDate,
        states: plan.states,
        eventTypes: plan.eventTypes || [],
        breedCode: plan.breedCode || "",
        breedName: plan.breedName || DOG_SHOW_PLANNER_DEFAULT_BREED,
      },
    });
    if (error) throw error;
    const importedShows = Array.isArray(data?.shows) ? data.shows : [];
    const importedByKey = new Map();
    importedShows.forEach((show) => dogShowPlannerShowMatchKeys(show).forEach((key) => importedByKey.set(key, show)));
    const importedMatch = (show) => dogShowPlannerShowMatchKeys(show).map((key) => importedByKey.get(key)).find(Boolean);
    const matchedShowCount = plan.shows.filter(importedMatch).length;
    if (!matchedShowCount) throw new Error("No saved planner shows matched the refreshed calendar results.");
    const shows = plan.shows.map((show) => dogShowPlannerMergeMetadata(show, importedMatch(show) || {}));
    await saveDogShowRecord("showResult", {
      ...plan,
      shows,
      sourceUrl: data?.sourceUrl || plan.sourceUrl,
      fetchedAt: data?.fetchedAt || plan.fetchedAt,
      sourceUrls: data?.sourceUrls || plan.sourceUrls,
      sourceCounts: data?.sourceCounts || plan.sourceCounts,
      metadataVersion: 5,
      metadataRefreshedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser?.name || "Staff",
      helperEmail: currentUser?.email || plan.helperEmail || "",
    });
    if (dogShowView === "planner") {
      renderDogShow();
      showToast("AKC identifiers, show details, and superintendent sources refreshed.");
    }
  } catch (error) {
    console.warn("Could not refresh saved Show Planner metadata.", error);
  }
}

async function saveDogShowPlanner(form) {
  const button = form.querySelector('button[type="submit"]');
  const data = formPayload(form);
  const searchMode = data.searchMode === "breed" ? "breed" : "dogs";
  const dogKeys = [...form.querySelectorAll('input[name="dogKeys"]:checked')].map((input) => input.value);
  const selectedDogKeys = new Set(dogKeys);
  const selectedDogBreeds = [...new Set(dogShowPlannerDogs()
    .filter((dog) => selectedDogKeys.has(dog.key))
    .map((dog) => dogShowPlannerCalendarBreedName(dogShowBreed(dog.entry) || DOG_SHOW_PLANNER_DEFAULT_BREED)))];
  const breedName = searchMode === "breed"
    ? dogShowPlannerCalendarBreedName(data.breedName)
    : selectedDogBreeds[0] || DOG_SHOW_PLANNER_DEFAULT_BREED;
  const states = String(data.states || "").split(/[\s,]+/).map((state) => state.trim().toUpperCase()).filter((state) => /^[A-Z]{2}$/.test(state));
  const eventTypes = [...form.querySelectorAll('input[name="eventTypes"]:checked')].map((input) => input.value);
  if (searchMode === "dogs" && !dogKeys.length) return showToast("Choose at least one dog, or use Search by breed.");
  if (searchMode === "dogs" && selectedDogBreeds.length > 1) return showToast("Choose dogs from one breed at a time, or search each breed separately.");
  if (searchMode === "breed" && !String(data.breedName || "").trim()) return showToast("Choose or enter a breed.");
  if (data.endDate < data.startDate) return showToast("The end date must be after the start date.");
  const rangeDays = Math.ceil((new Date(`${data.endDate}T12:00:00`).getTime() - new Date(`${data.startDate}T12:00:00`).getTime()) / 86_400_000);
  if (rangeDays > 370) return showToast("Choose a date range of one year or less.");
  button.disabled = true;
  button.textContent = "Checking show calendars…";
  let response = null;
  let errorMessage = "";
  try {
    if (typeof supabaseClient === "undefined" || !supabaseClient?.functions) throw new Error("The show calendar service is unavailable.");
    const requestedBreedCode = dogShowPlannerBreedMatches(breedName, DOG_SHOW_PLANNER_DEFAULT_BREED) ? DOG_SHOW_PLANNER_BREED_CODE : "";
    const { data: functionData, error } = await supabaseClient.functions.invoke("show-calendar-scrape", { body: { startDate: data.startDate, endDate: data.endDate, states, eventTypes, breedCode: requestedBreedCode, breedName } });
    if (error) {
      let functionMessage = "";
      if (error.context && typeof error.context.json === "function") {
        const payload = await error.context.json().catch(() => ({}));
        functionMessage = payload?.error || payload?.message || "";
      }
      throw new Error(functionMessage || error.message || "Could not import show listings.");
    }
    response = functionData;
  } catch (error) {
    errorMessage = error?.message || "Could not import show listings.";
  }
  const localFixture = new URLSearchParams(window.location.search).get("localTest") === "1" && !Array.isArray(response?.shows);
  const resolvedBreedName = dogShowPlannerCalendarBreedName(response?.breedName || breedName);
  const shows = (localFixture ? dogShowPlannerLocalShows(data.startDate, resolvedBreedName) : Array.isArray(response?.shows) ? response.shows : [])
    .map((show) => ({ ...show, breedName: dogShowPlannerCalendarBreedName(show.breedName || resolvedBreedName) }))
    .filter((show) => dogShowPlannerMatchesEventTypes(show, eventTypes));
  if (!shows.length && !localFixture) {
    button.disabled = false;
    button.textContent = "Find & Rank Shows";
    showToast(errorMessage || "No shows matched that date range, location, and show-format selection.");
    return;
  }
  await saveDogShowRecord("showResult", {
    id: DOG_SHOW_PLANNER_RECORD_ID,
    recordKind: "showPlanner",
    searchMode,
    dogKeys: searchMode === "dogs" ? dogKeys : [],
    breedName: resolvedBreedName,
    startDate: data.startDate,
    endDate: data.endDate,
    states,
    eventTypes,
    breedCode: response?.breedCode || (dogShowPlannerBreedMatches(resolvedBreedName, DOG_SHOW_PLANNER_DEFAULT_BREED) ? DOG_SHOW_PLANNER_BREED_CODE : ""),
    shows,
    sourceUrl: response?.sourceUrl || "https://caninechronicleshowcalendar.com/K9shows.php",
    sourceUrls: response?.sourceUrls || {
      akc: "https://webapps.akc.org/event-search/",
      canineChronicle: "https://caninechronicleshowcalendar.com/K9shows.php",
    },
    sourceCounts: response?.sourceCounts || {},
    fetchedAt: response?.fetchedAt || new Date().toISOString(),
    metadataVersion: 5,
    metadataRefreshedAt: new Date().toISOString(),
    localFixture,
    submittedAt: dogShowPlannerRecord().submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    helperEmail: currentUser?.email || "",
  });
  document.getElementById("dogShowDialog")?.close();
  setDogShowView("planner");
  showToast(`${shows.length} ${resolvedBreedName} show${shows.length === 1 ? "" : "s"} ranked.`);
}

async function saveDogShowPotentialShow(externalId = "") {
  const plan = dogShowPlannerRecord();
  const show = (plan.shows || []).find((item) => String(item.externalId || "") === String(externalId || ""));
  if (!show) return showToast("The selected show could not be found.");
  const targets = dogShowPlannerTargets(plan).map((target) => ({
    ...target,
    breedJudge: show.breedJudge || "",
    groupName: show.groupName || "Group",
    groupJudge: show.groupJudge || "",
  }));
  if (!targets.length) return showToast("Choose a dog or breed before saving a potential show.");
  const existing = dogShowPlannerCandidateForShow(show);
  const mergedTargets = new Map((existing?.targets || []).map((target) => [dogShowPlannerTargetKey(target), target]));
  const previousSize = mergedTargets.size;
  targets.forEach((target) => mergedTargets.set(dogShowPlannerTargetKey(target), target));
  if (existing && mergedTargets.size === previousSize) return showToast("This show and selection are already in the potential plan.");
  await saveDogShowRecord("showResult", {
    ...(existing || {}),
    id: existing?.id || uid("showPlan"),
    recordKind: DOG_SHOW_PLANNER_CANDIDATE_KIND,
    showKey: dogShowPlannerShowKey(show),
    show: { ...show, breedName: dogShowPlannerCalendarBreedName(show.breedName || plan.breedName) },
    targets: [...mergedTargets.values()],
    status: "Potential",
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.name || "Staff",
    helperEmail: currentUser?.email || "",
  });
  renderDogShow();
  showToast(existing ? "Breed or dog added to the existing potential show." : "Potential show added to the plan.");
}

async function removeDogShowPotentialShow(candidateId = "") {
  const candidate = dogShowPlannerCandidates().find((item) => item.id === candidateId);
  if (!candidate) return;
  await saveDogShowRecord("showResult", {
    ...candidate,
    removed: true,
    removedAt: new Date().toISOString(),
    removedBy: currentUser?.name || "Staff",
    removedEmail: currentUser?.email || "",
  });
  renderDogShow();
  showToast("Potential show removed.");
}

function openDogShowImportedEvent(show = {}, targets = [], options = {}) {
  if (!show.startDate) return showToast("The selected show could not be found.");
  const breeds = [...new Set(targets.map((target) => dogShowPlannerCalendarBreedName(target.breed)).filter(Boolean))];
  const dogs = [...new Set(targets.filter((target) => target.targetType === "dog").map((target) => target.dogName).filter(Boolean))];
  const selectedBreed = dogShowPlannerCalendarBreedName(show.breedName || breeds[0] || DOG_SHOW_PLANNER_DEFAULT_BREED);
  const panelNotes = [...new Set(targets.map((target) => {
    const breed = dogShowPlannerCalendarBreedName(target.breed || selectedBreed);
    return [target.breedJudge ? `${breed} judge: ${target.breedJudge}` : "", target.groupJudge ? `${target.groupName || "Group"} judge: ${target.groupJudge}` : ""].filter(Boolean).join("\n");
  }).filter(Boolean))];
  openDogShowEventForm({
    name: show.club || show.name || "Dog Show",
    club: show.club || "",
    venue: show.venue || "",
    venueAddress: show.venueAddress || show.cityState || "",
    cityState: show.cityState || "",
    startDate: show.startDate || todayDate(),
    endDate: show.endDate || show.startDate || todayDate(),
    entryClosingDate: show.entryClosingDate || "",
    superintendent: show.superintendent || "",
    sourceUrl: show.akcSourceUrl || show.sourceUrl || "",
    premiumUrl: show.premiumUrl || "",
    judgingProgramUrl: show.judgingProgramUrl || "",
    showType: show.showType || "",
    nohs: Boolean(show.nohs || show.ownerHandled),
    plannerExternalId: show.canonicalId || show.externalId || "",
    plannerCandidateId: options.candidateId || "",
    breedName: show.breedName || selectedBreed,
    notes: `Imported from AKC Event Search and Canine Chronicle.${show.eventNumber ? `\nAKC event number: ${show.eventNumber}` : ""}${breeds.length ? `\nBreeds researched: ${breeds.join(", ")}` : ""}${dogs.length ? `\nDogs considered: ${dogs.join(", ")}` : ""}${panelNotes.length ? `\n${panelNotes.join("\n")}` : show.breedJudge ? `\n${selectedBreed} judge: ${show.breedJudge}` : ""}${show.groupJudge && !panelNotes.length ? `\n${show.groupName || "Group"} judge: ${show.groupJudge}` : ""}${show.bisJudge ? `\nBIS judge: ${show.bisJudge}` : ""}${show.superintendentUrl ? `\nSuperintendent source: ${show.superintendentUrl}` : ""}`,
    status: "Going To",
  });
}

function openDogShowPlannedEvent(externalId = "") {
  const plan = dogShowPlannerRecord();
  const show = (plan.shows || []).find((item) => item.externalId === externalId);
  if (!show) return;
  openDogShowImportedEvent(show, dogShowPlannerTargets(plan));
}

async function removeDogShowPlannedEvent(externalId = "") {
  const plan = dogShowPlannerRecord();
  const show = (plan.shows || []).find((item) => item.externalId === externalId);
  const event = show ? dogShowPlannerEventForShow(show) : null;
  if (!event) return showToast("The added show could not be found.");
  if (!window.confirm(`Remove ${event.club || event.name || "this show"} from the show schedule? Its roster, tasks, and results will be hidden.`)) return;
  await saveDogShowRecord("showEvent", {
    ...event,
    removed: true,
    removedAt: new Date().toISOString(),
    removedBy: currentUser?.name || "Staff",
    removedEmail: currentUser?.email || "",
  });
  if (localStorage.getItem(DOG_SHOW_EVENT_KEY) === event.id) localStorage.removeItem(DOG_SHOW_EVENT_KEY);
  renderDogShow();
  showToast("Show removed from the schedule.");
}

function openDogShowPotentialEvent(candidateId = "") {
  const candidate = dogShowPlannerCandidates().find((item) => item.id === candidateId);
  if (!candidate) return showToast("The potential show could not be found.");
  openDogShowImportedEvent(candidate.show || {}, candidate.targets || [], { candidateId: candidate.id });
}

function openDogShowPlannerEvent(eventId = "") {
  const event = dogShowEvents().find((candidate) => candidate.id === eventId);
  if (!event) return showToast("The selected show could not be found.");
  localStorage.setItem(DOG_SHOW_EVENT_KEY, event.id);
  setDogShowView("home");
}

function openDogShowCalendarEvent(eventIds = "", fallbackEventId = "") {
  const ids = String(eventIds || "").split("|").filter(Boolean);
  const events = dogShowEvents().filter((event) => ids.includes(event.id));
  const selectedDate = dogShowDateKey(dogShowMasterDate());
  const matchingDate = events.find((event) => (event.startDate || "") <= selectedDate && (event.endDate || event.startDate || "") >= selectedDate);
  const savedId = localStorage.getItem(DOG_SHOW_EVENT_KEY) || "";
  const savedMember = events.find((event) => event.id === savedId);
  openDogShowPlannerEvent((matchingDate || savedMember || events[0])?.id || fallbackEventId);
}

function renderDogShow() {
  const content = document.getElementById("dogShowContent");
  if (!content) return;
  const event = dogShowActiveEvent();
  const select = document.getElementById("dogShowEventSelect");
  if (select) select.innerHTML = dogShowEventOptions(event);
  document.querySelectorAll("[data-dog-show-view]").forEach((button) => {
    const mobileMoreActive = button.closest("#dogShowMobileNav") && button.dataset.dogShowView === "more" && ["progress", "planner", "calendar", "calculator", "expenses"].includes(dogShowView);
    const active = mobileMoreActive || button.dataset.dogShowView === dogShowView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (!event && !["progress", "planner", "calendar", "calculator"].includes(dogShowView)) {
    content.innerHTML = dogShowRenderEmpty("Create the first show weekend", "Add the event once, then build the roster, prep schedule, helper tasks, and results.");
    return;
  }
  const renderers = {
    home: dogShowHomeHtml,
    dogs: dogShowDogsHtml,
    schedule: dogShowScheduleHtml,
    tasks: dogShowTasksHtml,
    more: dogShowMoreHtml,
    progress: dogShowProgressHtml,
    planner: dogShowPlannerHtml,
    calendar: dogShowMasterCalendarHtml,
    calculator: dogShowCalculatorHtml,
    expenses: dogShowExpensesHtml,
  };
  content.innerHTML = renderers[dogShowView](event);
  if (dogShowView === "planner") void refreshDogShowPlannerMetadata();
  if (typeof scheduleProfilePhotoHydrationSweep === "function") scheduleProfilePhotoHydrationSweep(40);
}

function setDogShowView(view = "home") {
  if (!["home", "dogs", "schedule", "tasks", "more", "progress", "planner", "calendar", "calculator", "expenses"].includes(view)) return;
  dogShowView = view;
  localStorage.setItem(DOG_SHOW_VIEW_KEY, view);
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderDogShow();
}

function syncDogShowShell(pageId = typeof activePageId === "function" ? activePageId() : "") {
  const active = pageId === "dogShowPage";
  document.body.classList.toggle("is-dog-show-mode", active);
  const nav = document.getElementById("dogShowMobileNav");
  if (nav) nav.hidden = !active || !helperIsLoggedIn();
  if (!active) {
    document.getElementById("dogShowDialog")?.close();
    setDogShowMoreMenuOpen(false);
  }
}

function setDogShowMoreMenuOpen(open) {
  const menu = document.getElementById("dogShowMoreMenu");
  const backdrop = document.getElementById("dogShowMoreBackdrop");
  if (!menu || !backdrop) return;
  const visible = Boolean(open);
  menu.hidden = !visible;
  backdrop.hidden = !visible;
  document.body.classList.toggle("dog-show-more-menu-open", visible);
  const button = document.querySelector('#dogShowMobileNav [data-dog-show-view="more"]');
  button?.setAttribute("aria-expanded", String(visible));
  button?.classList.toggle("is-menu-open", visible);
}

function openDogShowDialog(title, html) {
  const dialog = document.getElementById("dogShowDialog");
  if (!dialog) return;
  document.getElementById("dogShowDialogTitle").textContent = title;
  document.getElementById("dogShowDialogBody").innerHTML = html;
  if (!dialog.open) dialog.showModal();
  if (typeof scheduleProfilePhotoHydrationSweep === "function") scheduleProfilePhotoHydrationSweep(20);
}

function dogShowHelperCheckboxes(selected = []) {
  const selectedEmails = new Set(selected.map(normalizeEmail));
  const users = dogShowStaffUsers();
  return users.length ? users.map((user) => `<label class="dog-show-check-option"><input type="checkbox" name="helperEmails" value="${escapeHtml(user.email || user.id)}"${selectedEmails.has(normalizeEmail(user.email || user.id)) ? " checked" : ""}/><span><strong>${escapeHtml(user.name || user.email || "Staff")}</strong><small>${escapeHtml(roleLabel(user.role || "helper"))}</small></span></label>`).join("") : `<p class="muted-copy">Add staff or helper accounts in Settings first.</p>`;
}

function dogShowStayTypeOptions(selected = "") {
  const options = [
    { value: "", label: "Not set" },
    { value: "Hotel", label: "Hotel" },
    { value: "Camper / RV site", label: "Camper / RV site" },
    { value: "Dry camping at venue", label: "Dry camping at venue" },
    { value: "Day trip / no overnight", label: "Day trip / no overnight" },
    { value: "Other", label: "Other" },
  ];
  return options.map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selected ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

function openDogShowEventForm(event = {}) {
  const helperEmails = Array.isArray(event.helperEmails) ? event.helperEmails : [];
  openDogShowDialog(event.id ? "Edit Show Weekend" : "New Show Weekend", `<form id="dogShowEventForm" class="tracker-form" data-id="${escapeHtml(event.id || "")}">
    <input type="hidden" name="showType" value="${escapeHtml(event.showType || "")}"/>
    <input type="hidden" name="nohs" value="${(event.nohs || event.ownerHandled) ? "true" : "false"}"/>
    <input type="hidden" name="plannerExternalId" value="${escapeHtml(event.plannerExternalId || "")}"/>
    <input type="hidden" name="plannerCandidateId" value="${escapeHtml(event.plannerCandidateId || "")}"/>
    <input type="hidden" name="breedName" value="${escapeHtml(event.breedName || "")}"/>
    <div class="field-grid">
      <label class="dog-show-field-wide dog-show-status-field">Status<select name="status">${dogShowEventStatusOptions(event.status)}</select><small>Going To = planned; Going = booked/paid; Active = show underway.</small></label>
      <label>Show name<input name="name" value="${escapeHtml(event.name || "")}" required placeholder="Austin Kennel Club Weekend"/></label>
      <label>Club<input name="club" value="${escapeHtml(event.club || "")}" placeholder="Austin Kennel Club"/></label>
      <label>Venue<input name="venue" value="${escapeHtml(event.venue || "")}" placeholder="Expo Center"/></label>
      <label class="dog-show-field-wide">Full venue address<input name="venueAddress" value="${escapeHtml(event.venueAddress || event.cityState || "")}" placeholder="123 Show Drive, Austin, TX 78701" autocomplete="street-address"/></label>
      <label>Start date<input type="date" name="startDate" value="${escapeHtml(event.startDate || todayDate())}" required/></label>
      <label>End date<input type="date" name="endDate" value="${escapeHtml(event.endDate || event.startDate || todayDate())}" required/></label>
      <label>Entry closing date<input type="date" name="entryClosingDate" value="${escapeHtml(event.entryClosingDate || "")}"/></label>
      <label>Superintendent<input name="superintendent" value="${escapeHtml(event.superintendent || "")}"/></label>
      <label>Event source URL<input type="url" name="sourceUrl" value="${escapeHtml(event.sourceUrl || "")}"/></label>
      <label>Premium list URL<input type="url" name="premiumUrl" value="${escapeHtml(event.premiumUrl || "")}"/></label>
      <label>Judging program URL<input type="url" name="judgingProgramUrl" value="${escapeHtml(event.judgingProgramUrl || "")}"/></label>
    </div>
    <fieldset class="dog-show-form-section"><legend>Stay at show</legend><div class="field-grid">
      <label>Stay type<select name="stayType">${dogShowStayTypeOptions(event.stayType || "")}</select></label>
      <label>Hotel, campground, or site name<input name="stayName" value="${escapeHtml(event.stayName || "")}" placeholder="Hotel or campsite name"/></label>
      <label class="dog-show-field-wide">Stay address<input name="stayAddress" value="${escapeHtml(event.stayAddress || "")}" placeholder="Full hotel, campground, or site address" autocomplete="street-address"/></label>
      <label class="dog-show-field-wide">Reservation or campsite details<textarea name="stayDetails" rows="2" placeholder="Confirmation number, campsite, check-in, hookups, or arrival notes">${escapeHtml(event.stayDetails || "")}</textarea></label>
    </div></fieldset>
    <label>Weekend notes<textarea name="notes" rows="3">${escapeHtml(event.notes || "")}</textarea></label>
    <fieldset><legend>Helpers attending</legend><div class="dog-show-check-grid">${dogShowHelperCheckboxes(helperEmails)}</div></fieldset>
    <div class="button-row"><button type="submit">Save Show</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function dogShowQuickTeamDogOptions(event = {}) {
  const selected = new Set(dogShowEntries(event).map((entry) => `${entry.dogType}:${entry.dogId}`));
  const option = (dog, dogType) => {
    const key = `${dogType}:${dog.id}`;
    return `<label class="dog-show-check-option"><input type="checkbox" name="dogKeys" value="${escapeHtml(key)}"${selected.has(key) ? " checked" : ""}/><span><strong>${escapeHtml(dogShowDogName(dog, dogType))}</strong><small>${dogType === "boardingDog" ? "Customer dog" : "Our dog"}</small></span></label>`;
  };
  return `<div class="dog-show-source-group"><h3>Our Dogs</h3><div class="dog-show-check-grid">${dogShowOwnedDogs().map((dog) => option(dog, "ownedDog")).join("") || "<p>No Our Dogs available.</p>"}</div></div>
    <div class="dog-show-source-group"><h3>Customer Dogs</h3><div class="dog-show-check-grid">${dogShowBoardingDogs().map((dog) => option(dog, "boardingDog")).join("") || "<p>No customer dogs available.</p>"}</div></div>`;
}

function openDogShowQuickTeamForm(eventId = "") {
  const event = dogShowEvents().find((candidate) => candidate.id === eventId);
  if (!event) return showToast("The selected show could not be found.");
  const helperEmails = Array.isArray(event.helperEmails) ? event.helperEmails : [];
  openDogShowDialog(`Manage: ${event.name || event.club || "Dog Show"}`, `<form id="dogShowQuickTeamForm" class="tracker-form" data-event-id="${escapeHtml(event.id)}">
    <section class="dog-show-quick-team-summary">
      <div><span>DATES</span><strong>${escapeHtml(dogShowPlannerDateRange(event))}</strong></div>
      <label>Status<select name="status">${dogShowEventStatusOptions(event.status)}</select></label>
    </section>
    <fieldset><legend>Dogs attending</legend><p class="dog-show-form-note">Check dogs to add them. Uncheck dogs to remove them from this show while preserving their prior show records.</p>${dogShowQuickTeamDogOptions(event)}</fieldset>
    <fieldset><legend>Helpers attending</legend><div class="dog-show-check-grid">${dogShowHelperCheckboxes(helperEmails)}</div></fieldset>
    <div class="button-row dog-show-dialog-sticky-actions"><button type="submit">Save Show Team</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function dogShowAvailableDogOptions() {
  const event = dogShowActiveEvent();
  const existing = new Set(dogShowEntries(event).map((entry) => `${entry.dogType}:${entry.dogId}`));
  const option = (dog, type) => {
    const key = `${type}:${dog.id}`;
    const disabled = existing.has(key);
    return `<label class="dog-show-check-option${disabled ? " is-disabled" : ""}"><input type="checkbox" name="dogKeys" value="${escapeHtml(key)}"${disabled ? " disabled" : ""}/><span><strong>${escapeHtml(dogShowDogName(dog, type))}</strong><small>${type === "boardingDog" ? "Boarding Dog" : "Our Dog"}${disabled ? " · Already added" : ""}</small></span></label>`;
  };
  return `<div class="dog-show-source-group"><h3>Our Dogs</h3><div class="dog-show-check-grid">${dogShowOwnedDogs().map((dog) => option(dog, "ownedDog")).join("") || "<p>No Our Dogs available.</p>"}</div></div>
    <div class="dog-show-source-group"><h3>Boarding Dogs</h3><div class="dog-show-check-grid">${dogShowBoardingDogs().map((dog) => option(dog, "boardingDog")).join("") || "<p>No Boarding Dogs available.</p>"}</div></div>`;
}

function openDogShowAddDogsForm() {
  const event = dogShowActiveEvent();
  if (!event) return openDogShowEventForm();
  openDogShowDialog("Add Dogs To Show", `<form id="dogShowAddDogsForm" class="tracker-form">
    <div class="field-grid">
      <label>Attendance role<select name="attendanceRole"><option>Showing</option><option>Socialization</option></select></label>
      <label>Primary handler<select name="handlerEmail">${dogShowStaffOptions(currentUser?.email || "")}</select></label>
      <label>Care helper<select name="helperEmail">${dogShowStaffOptions("")}</select></label>
      <label>Default prep minutes<input type="number" name="prepMinutes" min="0" max="240" step="5" value="45"/></label>
    </div>
    <p class="dog-show-form-note">Select several dogs and add them in one step. Ring details can be entered from Schedule.</p>
    ${dogShowAvailableDogOptions()}
    <div class="button-row dog-show-dialog-sticky-actions"><button type="submit">Add Selected Dogs</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function dogShowRingRowState() {
  try {
    return JSON.parse(localStorage.getItem(DOG_SHOW_RING_ROW_STATE_KEY) || "{}") || {};
  } catch (error) {
    return {};
  }
}

function dogShowRingRowIsOpen(scheduleId = "") {
  return dogShowRingRowState()[scheduleId] === true;
}

function setDogShowRingRowOpen(scheduleId = "", open = false) {
  if (!scheduleId) return;
  const state = dogShowRingRowState();
  state[scheduleId] = Boolean(open);
  localStorage.setItem(DOG_SHOW_RING_ROW_STATE_KEY, JSON.stringify(state));
}

function removeDogShowRingRowState(scheduleId = "") {
  if (!scheduleId) return;
  const state = dogShowRingRowState();
  delete state[scheduleId];
  localStorage.setItem(DOG_SHOW_RING_ROW_STATE_KEY, JSON.stringify(state));
}

function dogShowTimelineDateKey(log = {}) {
  return dateOnly(log.loggedAt || log.updatedAt || "") || "Date missing";
}

function dogShowTimelineLogHtml(log = {}, entry = {}, canRemoveLogs = false) {
  return `<article><strong>${escapeHtml(log.activityType || "Care")}</strong><span>${escapeHtml(log.note || "Logged")}</span><small>${escapeHtml(dogShowFormatDateTime(log.loggedAt || log.updatedAt))} · ${escapeHtml(log.helperName || dogShowStaffLabel(log.helperEmail))}${log.customerVisible ? " · Owner visible" : ""}</small>${canRemoveLogs ? `<button type="button" class="dog-show-remove-log" data-action="remove-show-log" data-id="${escapeHtml(log.id)}" data-entry-id="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(dogShowCareLogName(log))} log" title="Remove logged item">×</button>` : ""}</article>`;
}

function dogShowTimelineLogsForDate(entry = {}, dateKey = "") {
  return dogShowLogs()
    .filter((log) => dogShowLogBelongsToEntry(log, entry) && dogShowTimelineDateKey(log) === dateKey)
    .sort((a, b) => new Date(b.loggedAt || b.updatedAt || 0) - new Date(a.loggedAt || a.updatedAt || 0));
}

function dogShowTimelineLogsHtml(logs = [], entry = {}, canRemoveLogs = false) {
  return logs.map((log) => dogShowTimelineLogHtml(log, entry, canRemoveLogs)).join("");
}

function dogShowTimelineGroupsHtml(logs = [], entry = {}, canRemoveLogs = false, openDates = []) {
  if (!logs.length) return "<p>No show care logged yet.</p>";
  const groups = new Map();
  logs.forEach((log) => {
    const dateKey = dogShowTimelineDateKey(log);
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(log);
  });
  const today = todayDate();
  const requestedOpenDates = new Set(Array.isArray(openDates) ? openDates : []);
  return `<div class="dog-show-timeline-groups">${[...groups.entries()].map(([dateKey, items], index) => {
    const expanded = dateKey === today || requestedOpenDates.has(dateKey);
    const label = dateKey === "Date missing" ? dateKey : dateKey === today ? `Today · ${dogShowFormatDate(dateKey)}` : dogShowFormatDate(dateKey);
    const panelId = `dogShowTimelineDay-${index}`;
    return `<details class="dog-show-timeline-day" data-show-timeline-day="${escapeHtml(dateKey)}"${expanded ? " open" : ""}><summary class="dog-show-timeline-day-heading" data-action="toggle-show-timeline-day" aria-controls="${panelId}"><span><strong>${escapeHtml(label)}</strong><small>${items.length} item${items.length === 1 ? "" : "s"}</small></span></summary><div class="dog-show-log-timeline" id="${panelId}" data-show-timeline-lazy data-entry-id="${escapeHtml(entry.id)}" data-date-key="${escapeHtml(dateKey)}" data-loaded="${expanded ? "true" : "false"}">${expanded ? dogShowTimelineLogsHtml(items, entry, canRemoveLogs) : ""}</div></details>`;
  }).join("")}</div>`;
}

function hydrateDogShowTimelineDay(day) {
  const container = day?.querySelector("[data-show-timeline-lazy]");
  if (!container || container.dataset.loaded === "true") return;
  const entry = dogShowEntries().find((item) => item.id === container.dataset.entryId);
  if (!entry) return;
  const logs = dogShowTimelineLogsForDate(entry, container.dataset.dateKey);
  container.innerHTML = logs.length
    ? dogShowTimelineLogsHtml(logs, entry, currentRole() === "admin")
    : "<p>No show care logged for this date.</p>";
  container.dataset.loaded = "true";
}

function dogShowRingScheduleRowHtml(schedule = {}, index = 0) {
  const prep = dogShowPrepTimes({}, schedule);
  const scheduleId = schedule.id || uid("showRing");
  const entryCountLabel = dogShowEntryCountLabel(schedule);
  return `<details class="dog-show-ring-schedule-row" data-ring-schedule-row data-schedule-id="${escapeHtml(scheduleId)}"${dogShowRingRowIsOpen(scheduleId) ? " open" : ""}>
    <summary class="dog-show-ring-schedule-heading" data-action="toggle-ring-schedule"><span><strong>Ring appearance ${index + 1}</strong><small data-ring-schedule-summary>${escapeHtml([dogShowFormatDate(schedule.ringDate), schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring not set", dogShowEntryCountsEntered(schedule) ? `Entry ${entryCountLabel}` : ""].filter(Boolean).join(" · "))}</small></span></summary>
    <div class="dog-show-ring-schedule-content"><div class="dog-show-ring-schedule-actions"><button type="button" class="dog-show-remove-ring" data-action="remove-ring-schedule" aria-label="Remove ring appearance" title="Remove ring appearance">×</button></div>
    <div class="field-grid dog-show-ring-schedule-grid">
      <label>Ring date<input type="date" name="ringDate" value="${escapeHtml(schedule.ringDate || "")}"/></label>
      <label>Ring time<input type="time" name="ringTime" value="${escapeHtml(schedule.ringTime || "")}"/></label>
      <label>Ring number<input name="ringNumber" value="${escapeHtml(schedule.ringNumber || "")}" placeholder="14"/></label>
      <label>Class entered<input name="classEntered" value="${escapeHtml(schedule.classEntered || "")}" placeholder="Open Bitch"/></label>
      <fieldset class="dog-show-breed-entry-counts dog-show-field-wide">
        <legend>Breed entry counts</legend>
        <p>Dogs – Bitches – Dog specials – Bitch specials</p>
        <div class="dog-show-entry-count-grid">
          <label>Dogs<input type="number" inputmode="numeric" name="classDogCount" min="0" step="1" value="${Math.max(0, Number(schedule.classDogCount || 0))}"/></label>
          <label>Bitches<input type="number" inputmode="numeric" name="classBitchCount" min="0" step="1" value="${Math.max(0, Number(schedule.classBitchCount || 0))}"/></label>
          <label>Dog specials<input type="number" inputmode="numeric" name="specialDogCount" min="0" step="1" value="${Math.max(0, Number(schedule.specialDogCount || 0))}"/></label>
          <label>Bitch specials<input type="number" inputmode="numeric" name="specialBitchCount" min="0" step="1" value="${Math.max(0, Number(schedule.specialBitchCount || 0))}"/></label>
        </div>
        <output data-entry-count-summary>${escapeHtml(entryCountLabel)}</output>
      </fieldset>
      <label>Prep minutes<input type="number" name="prepMinutes" min="0" max="240" step="5" value="${Number(schedule.prepMinutes ?? 45)}"/></label>
      <label>Ready buffer (+ before / − after)<input type="number" name="readyBufferMinutes" min="-120" max="60" step="5" value="${Number(schedule.readyBufferMinutes ?? 15)}"/></label>
      <label>Armband<input name="armbandNumber" value="${escapeHtml(schedule.armbandNumber || "")}"/></label>
      <label>Judge<input name="judge" value="${escapeHtml(schedule.judge || "")}"/></label>
    </div>
    <div class="dog-show-prep-preview" data-ring-schedule-preview><strong>Prep starts ${prep.start ? dogShowFormatTime(prep.start) : "after ring time is entered"}</strong><span>Ready ${prep.ready ? dogShowFormatTime(prep.ready) : "--"} · Ring ${prep.ring ? dogShowFormatTime(prep.ring) : "--"}</span></div>
    </div>
  </details>`;
}

function dogShowRingScheduleFromRow(row) {
  const value = (name) => row.querySelector(`[name="${name}"]`)?.value?.trim() || "";
  return {
    id: row.dataset.scheduleId || uid("showRing"),
    ringDate: value("ringDate"),
    ringTime: value("ringTime"),
    ringNumber: value("ringNumber"),
    classEntered: value("classEntered"),
    armbandNumber: value("armbandNumber"),
    judge: value("judge"),
    classDogCount: Math.max(0, Number(value("classDogCount") || 0)),
    classBitchCount: Math.max(0, Number(value("classBitchCount") || 0)),
    specialDogCount: Math.max(0, Number(value("specialDogCount") || 0)),
    specialBitchCount: Math.max(0, Number(value("specialBitchCount") || 0)),
    prepMinutes: Number(value("prepMinutes") || 0),
    readyBufferMinutes: Number(value("readyBufferMinutes") || 0),
  };
}

function refreshDogShowRingScheduleRows(form) {
  form?.querySelectorAll("[data-ring-schedule-row]").forEach((row, index) => {
    const schedule = dogShowRingScheduleFromRow(row);
    const prep = dogShowPrepTimes({}, schedule);
    const heading = row.querySelector(".dog-show-ring-schedule-heading strong");
    const summary = row.querySelector("[data-ring-schedule-summary]");
    const preview = row.querySelector("[data-ring-schedule-preview]");
    const entryCountSummary = row.querySelector("[data-entry-count-summary]");
    if (heading) heading.textContent = `Ring appearance ${index + 1}`;
    if (summary) summary.textContent = [dogShowFormatDate(schedule.ringDate), schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring not set", dogShowEntryCountsEntered(schedule) ? `Entry ${dogShowEntryCountLabel(schedule)}` : ""].filter(Boolean).join(" · ");
    if (entryCountSummary) entryCountSummary.textContent = dogShowEntryCountLabel(schedule);
    if (preview) preview.innerHTML = `<strong>Prep starts ${prep.start ? dogShowFormatTime(prep.start) : "after ring time is entered"}</strong><span>Ready ${prep.ready ? dogShowFormatTime(prep.ready) : "--"} · Ring ${prep.ring ? dogShowFormatTime(prep.ring) : "--"}</span>`;
  });
  const count = form?.querySelectorAll("[data-ring-schedule-row]").length || 0;
  const countLabel = form?.querySelector("[data-ring-appearance-count]");
  if (countLabel) countLabel.textContent = `${count} scheduled`;
}

function refreshDogShowAssignmentSummary(form) {
  const summary = form?.querySelector("[data-show-assignment-summary]");
  const role = form.elements.attendanceRole?.value || "Showing";
  const statusField = form.elements.status;
  const status = statusField?.selectedOptions?.[0]?.textContent || statusField?.value || "Confirmed";
  if (summary) summary.textContent = `${role} · ${status}`;
  const ringSchedules = form?.querySelector("[data-show-ring-appearances]");
  if (ringSchedules) ringSchedules.hidden = role !== "Showing";
}

function dogShowEntryDialogViewState() {
  const body = document.getElementById("dogShowDialogBody");
  const form = document.getElementById("dogShowEntryForm");
  const assignment = form?.querySelector(".dog-show-collapsible-section:not(.dog-show-ring-schedules)");
  const ringSchedules = form?.querySelector(".dog-show-ring-schedules");
  return {
    assignmentOpen: assignment ? assignment.open : true,
    ringSchedulesOpen: ringSchedules ? ringSchedules.open : true,
    timelineOpenDates: Array.from(body?.querySelectorAll("[data-show-timeline-day][open]") || []).map((day) => day.dataset.showTimelineDay),
    scrollTop: body?.scrollTop || 0,
  };
}

function openDogShowEntryForm(entry = {}, quickConfirmation = {}, viewState = {}) {
  const event = dogShowActiveEvent();
  const savedSchedules = dogShowRingSchedules(entry);
  const ringSchedules = savedSchedules.length ? savedSchedules : [{ id: uid("showRing"), ringDate: event?.startDate || todayDate(), prepMinutes: Number(entry.prepMinutes ?? 45), readyBufferMinutes: Number(entry.readyBufferMinutes ?? 15) }];
  const logs = dogShowLogs(event)
    .filter((log) => dogShowLogBelongsToEntry(log, entry))
    .sort((a, b) => new Date(b.loggedAt || b.updatedAt || 0) - new Date(a.loggedAt || a.updatedAt || 0));
  const canRemoveLogs = currentRole() === "admin";
  const entryResults = dogShowResultsForEntry(entry, event);
  const resultCount = savedSchedules.filter((schedule) => dogShowResultForSchedule(entry, schedule, event, entryResults)).length;
  const resultButtonLabel = entry.attendanceRole === "Showing" && savedSchedules.length
    ? `Results ${resultCount}/${savedSchedules.length}`
    : entry.attendanceRole === "Showing" ? "Set Up Result" : entryResults.length ? "Edit Result" : "Log Result";
  const confirmedLogType = quickConfirmation.type || "";
  const confirmationLabel = quickConfirmation.label || confirmedLogType;
  const quickConfirmationText = confirmedLogType ? `${confirmationLabel} logged at ${dogShowFormatTime(quickConfirmation.loggedAt)} by ${quickConfirmation.helperName || currentUser?.name || "Staff"}.` : "";
  openDogShowDialog(dogShowEntryName(entry), `<div class="dog-show-detail-header">${dogShowPhotoHtml(entry, "dog-show-detail-photo")}<div><strong>${escapeHtml(dogShowNameWithBreed(entry))}</strong><span>${escapeHtml([entry.dogType === "boardingDog" ? "Boarding Dog" : "Our Dog", entry.attendanceRole, savedSchedules.length ? `${savedSchedules.length} ring appearance${savedSchedules.length === 1 ? "" : "s"}` : "Ring schedule needed"].filter(Boolean).join(" · "))}</span><small>Last attended: ${escapeHtml(dogShowLastLog(entry) ? dogShowFormatDateTime(dogShowLastLog(entry).loggedAt) : "No log")}</small></div></div>
    <section class="dog-show-dialog-section"><h3>Quick Log</h3><div class="dog-show-quick-grid">
      <button type="button" class="${confirmedLogType === "Potty" ? "is-logged" : ""}" data-action="open-show-potty" data-id="${escapeHtml(entry.id)}">Potty</button>
      <button type="button" class="${confirmedLogType === "Water" ? "is-logged" : ""}" data-action="quick-show-log" data-log-type="Water" data-id="${escapeHtml(entry.id)}">Water</button>
      <button type="button" class="${confirmedLogType === "Feeding" ? "is-logged" : ""}" data-action="quick-show-log" data-log-type="Feeding" data-id="${escapeHtml(entry.id)}">Feeding</button>
      <button type="button" data-action="open-show-note" data-log-type="Behavior / Medical" data-id="${escapeHtml(entry.id)}">Behavior / Medical</button>
      <button type="button" data-action="open-show-note" data-log-type="Owner Note" data-id="${escapeHtml(entry.id)}">Owner Note</button>
      <button type="button" data-action="open-show-result" data-id="${escapeHtml(entry.id)}">${escapeHtml(resultButtonLabel)}</button>
    </div>${quickConfirmationText ? `<p class="dog-show-quick-confirmation" role="status"><span aria-hidden="true">✓</span>${escapeHtml(quickConfirmationText)}</p>` : ""}</section>
    <form id="dogShowEntryForm" class="tracker-form" data-id="${escapeHtml(entry.id)}">
      <details class="dog-show-collapsible-section"${viewState.assignmentOpen === false ? "" : " open"}><summary><span><strong>Show Assignment</strong><small data-show-assignment-summary>${escapeHtml([entry.attendanceRole || "Showing", entry.status === "Scratched" ? "Withdrawn" : entry.status || "Confirmed"].join(" · "))}</small></span></summary><div class="dog-show-collapsible-content"><div class="field-grid">
          <label>Attendance role<select name="attendanceRole"><option${entry.attendanceRole === "Showing" ? " selected" : ""}>Showing</option><option${entry.attendanceRole !== "Showing" ? " selected" : ""}>Socialization</option></select></label>
          <label>Handler<select name="handlerEmail">${dogShowStaffOptions(entry.handlerEmail || "")}</select></label>
          <label>Care helper<select name="helperEmail">${dogShowStaffOptions(entry.helperEmail || "")}</select></label>
          <label>Entry status<select name="status">${[{ value: "Considering", label: "Considering" }, { value: "Entered", label: "Entered" }, { value: "Confirmed", label: "Confirmed" }, { value: "Scratched", label: "Withdrawn" }, { value: "Completed", label: "Completed" }].map((status) => `<option value="${status.value}"${status.value === (entry.status || "Confirmed") ? " selected" : ""}>${status.label}</option>`).join("")}</select></label>
        </div></div></details>
      <details class="dog-show-collapsible-section dog-show-ring-schedules" data-show-ring-appearances${entry.attendanceRole === "Showing" ? "" : " hidden"}${viewState.ringSchedulesOpen === false ? "" : " open"}><summary><span><strong>Ring Appearances</strong><small data-ring-appearance-count>${ringSchedules.length} scheduled</small></span></summary><div class="dog-show-collapsible-content dog-show-ring-schedules-content"><div class="dog-show-ring-schedules-toolbar"><p>Add a separate assignment for each show day, ring, or class.</p></div><div id="dogShowRingScheduleRows">${ringSchedules.map(dogShowRingScheduleRowHtml).join("")}</div><div class="dog-show-ring-schedules-footer"><button type="button" class="secondary-button" data-action="add-ring-schedule">Add Ring Appearance</button></div></div></details>
      <label>Show notes<textarea name="notes" rows="2">${escapeHtml(entry.notes || "")}</textarea></label>
      <div class="button-row"><button type="submit">Save Dog</button><button type="button" class="secondary-button" data-action="remove-show-entry" data-id="${escapeHtml(entry.id)}">Remove From Show</button></div>
    </form>
    <section class="dog-show-dialog-section"><h3>Show Timeline</h3>${dogShowTimelineGroupsHtml(logs, entry, canRemoveLogs, viewState.timelineOpenDates)}</section>`);
  if (Number.isFinite(viewState.scrollTop)) {
    requestAnimationFrame(() => {
      const body = document.getElementById("dogShowDialogBody");
      if (body) body.scrollTop = viewState.scrollTop;
    });
  }
}

function openDogShowPottyPicker(entry) {
  openDogShowDialog(`Potty: ${dogShowEntryName(entry)}`, `<section class="dog-show-dialog-section dog-show-potty-picker">
    <div class="dog-show-result-context"><strong>What did ${escapeHtml(dogShowEntryName(entry))} do?</strong><span>The selected outcome will be logged with your name and the current time.</span></div>
    <div class="dog-show-potty-grid" role="group" aria-label="Potty outcome">
      <button type="button" data-action="quick-show-potty" data-potty-type="Pee" data-id="${escapeHtml(entry.id)}">Pee</button>
      <button type="button" data-action="quick-show-potty" data-potty-type="Poop" data-id="${escapeHtml(entry.id)}">Poop</button>
      <button type="button" data-action="quick-show-potty" data-potty-type="Pee + Poop" data-id="${escapeHtml(entry.id)}">Pee + Poop</button>
    </div>
    <div class="button-row"><button type="button" class="secondary-button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Back</button></div>
  </section>`);
}

function openDogShowBulkPottyPicker() {
  const entries = dogShowEntries();
  if (!entries.length) return showToast("Add dogs before logging a potty outcome for the team.");
  openDogShowDialog("Potty All Dogs", `<section class="dog-show-dialog-section dog-show-potty-picker">
    <div class="dog-show-result-context"><strong>What did all ${entries.length} dogs do?</strong><span>Choose an outcome, then confirm before it is logged for every dog.</span></div>
    <div class="dog-show-potty-grid" role="group" aria-label="Potty outcome for all show dogs">
      <button type="button" data-action="quick-show-bulk-potty" data-potty-type="Pee">Pee</button>
      <button type="button" data-action="quick-show-bulk-potty" data-potty-type="Poop">Poop</button>
      <button type="button" data-action="quick-show-bulk-potty" data-potty-type="Pee + Poop">Pee + Poop</button>
    </div>
    <div class="button-row"><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </section>`);
}

function openDogShowNoteForm(entry, logType) {
  const ownerNote = logType === "Owner Note";
  openDogShowDialog(`${logType}: ${dogShowEntryName(entry)}`, `<form id="dogShowNoteForm" class="tracker-form" data-id="${escapeHtml(entry.id)}" data-log-type="${escapeHtml(logType)}">
    <label>${ownerNote ? "Note to owner" : "Behavior / medical note"}<textarea name="note" rows="4" required autofocus></textarea></label>
    ${ownerNote ? `<label class="inline-check"><input type="checkbox" name="customerVisible" checked/> Visible to owner/customer updates</label>` : `<label>Severity<select name="severity"><option>Observation</option><option>Needs follow-up</option><option>Urgent</option></select></label>`}
    <div class="button-row"><button type="submit">Save Note</button><button type="button" class="secondary-button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Back</button></div>
  </form>`);
}

function dogShowRingAppearanceTitle(schedule = {}, index = 0) {
  const ringDateTime = dogShowRingDateTime({}, schedule);
  return [
    dogShowFormatDate(schedule.ringDate) || `Appearance ${index + 1}`,
    schedule.ringTime && ringDateTime ? dogShowFormatTime(ringDateTime) : "Time not set",
  ].filter(Boolean).join(" · ");
}

function dogShowRingAppearanceMeta(schedule = {}) {
  return [
    schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring not set",
    schedule.classEntered || "Class not set",
    dogShowEntryCountsEntered(schedule) ? `Entry ${dogShowEntryCountLabel(schedule)}` : "",
    schedule.judge ? `Judge: ${schedule.judge}` : "",
  ].filter(Boolean).join(" · ");
}

function openDogShowResultPicker(entry) {
  const schedules = dogShowRingSchedules(entry);
  const entryResults = dogShowResultsForEntry(entry);
  if (!schedules.length) {
    return openDogShowDialog(`Results: ${dogShowEntryName(entry)}`, `<section class="dog-show-dialog-section"><div class="dog-show-result-context"><strong>Ring appearance required</strong><span>Add the date, time, ring, and class before logging this dog's result.</span></div><div class="button-row"><button type="button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Add Ring Appearance</button></div></section>`);
  }
  openDogShowDialog(`Results: ${dogShowEntryName(entry)}`, `<section class="dog-show-dialog-section"><div><h3>Choose Ring Appearance</h3><p class="muted-copy">Log each show separately, including multiple shows on the same day.</p></div><div class="dog-show-summary-list dog-show-result-appearance-list">${schedules.map((schedule, index) => {
    const result = dogShowResultForSchedule(entry, schedule, dogShowActiveEvent(), entryResults);
    return `<button type="button" data-action="open-show-result" data-id="${escapeHtml(entry.id)}" data-ring-schedule-id="${escapeHtml(schedule.id)}"><strong>${escapeHtml(dogShowRingAppearanceTitle(schedule, index))}</strong><span>${escapeHtml(dogShowRingAppearanceMeta(schedule))}</span><small>${result ? escapeHtml([dogShowOutcomeLabel(result.outcome), result.placement, dogShowResultAwardsSummary(result)].filter(Boolean).join(" · ") || "Result logged") : "No result logged"}</small></button>`;
  }).join("")}</div><div class="button-row"><button type="button" class="secondary-button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Back to Dog</button></div></section>`);
}

function dogShowPointStateOptions(selected = "") {
  const supportedStates = Object.entries(DOG_SHOW_AKC_STATE_NAMES).sort((left, right) => left[1].localeCompare(right[1]));
  return `<option value="">Choose location</option>${supportedStates.map(([value, label]) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("")}`;
}

function dogShowManualGroupPoints(result = {}) {
  if (result.groupPointsEarned === "" || result.groupPointsEarned == null) return null;
  const value = Number(result.groupPointsEarned);
  return Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : null;
}

function dogShowChampionshipPoints(estimate = {}, result = {}) {
  const breedPoints = Number.isFinite(estimate.points) ? estimate.points : 0;
  const groupPoints = dogShowManualGroupPoints(result);
  return Math.max(breedPoints, Number.isFinite(groupPoints) ? groupPoints : 0);
}

function dogShowPointEstimateHtml(entry = {}, schedule = {}, result = {}) {
  const estimate = dogShowBreedPointEstimate(entry, schedule, result);
  const hasEstimate = Number.isFinite(estimate.points);
  return `<div class="dog-show-point-estimate${hasEstimate ? " has-estimate" : ""}" data-dog-show-point-estimate>
    <div><span>AKC breed point estimate</span><strong data-point-estimate-value>${hasEstimate ? `${estimate.points} point${estimate.points === 1 ? "" : "s"}${estimate.isMajor ? " · Major" : ""}` : "Needs more information"}</strong><small data-point-estimate-reason>${escapeHtml(estimate.reason || "")}</small><small class="dog-show-point-source"><a href="https://www.akc.org/sports/conformation/resources/points-schedule/" target="_blank" rel="noopener">2026 AKC schedule</a> · <a href="https://www.akc.org/sports/conformation/resources/counting-points/" target="_blank" rel="noopener">Counting rules</a></small></div>
    <button type="button" class="secondary-button" data-action="apply-point-estimate"${hasEstimate ? "" : " hidden"}>Use Best Value</button>
  </div>`;
}

function refreshDogShowPointEstimate(form, forcePoints = false) {
  if (!form) return;
  const entry = dogShowEntries().find((item) => item.id === form.dataset.entryId);
  const schedule = dogShowRingSchedules(entry || {}).find((item) => item.id === form.dataset.ringScheduleId);
  const container = form.querySelector("[data-dog-show-point-estimate]");
  if (!entry || !schedule || !container) return;
  const estimate = dogShowBreedPointEstimate(entry, schedule, {
    outcome: form.elements.outcome?.value || "",
    awards: form.elements.awards?.value || "",
    pointScheduleState: form.elements.pointScheduleState?.value || "",
  });
  const hasEstimate = Number.isFinite(estimate.points);
  const value = container.querySelector("[data-point-estimate-value]");
  const reason = container.querySelector("[data-point-estimate-reason]");
  const applyButton = container.querySelector('[data-action="apply-point-estimate"]');
  container.classList.toggle("has-estimate", hasEstimate);
  if (value) value.textContent = hasEstimate ? `${estimate.points} point${estimate.points === 1 ? "" : "s"}${estimate.isMajor ? " · Major" : ""}` : "Needs more information";
  if (reason) reason.textContent = estimate.reason || "";
  if (applyButton) applyButton.hidden = !hasEstimate;
  if (hasEstimate && (forcePoints || form.dataset.pointEstimateAuto === "true")) {
    const points = dogShowChampionshipPoints(estimate, {
      groupPointsEarned: form.elements.groupPointsEarned?.value ?? "",
    });
    form.elements.pointsEarned.value = String(points);
    form.elements.isMajor.checked = points >= 3;
  }
}

function openDogShowResultForm(entry, ringScheduleId = "") {
  const schedules = dogShowRingSchedules(entry);
  const schedule = schedules.find((item) => item.id === ringScheduleId) || null;
  const result = dogShowResultForSchedule(entry, schedule, dogShowActiveEvent(), dogShowResultsForEntry(entry)) || {};
  const sourceDog = dogShowSourceDog(entry);
  const ownerEmailAvailable = [sourceDog.ownerEmail, sourceDog.customerEmail, sourceDog.linkedOwnerEmail, sourceDog.secondaryOwnerEmail].some(Boolean);
  const emailOwner = result.id ? result.customerVisible === true : ownerEmailAvailable;
  const scheduleIndex = schedule ? schedules.findIndex((item) => item.id === schedule.id) : -1;
  const pointsEarned = dogShowPointValue(result);
  const eventState = result.pointScheduleState || dogShowEventState(dogShowActiveEvent() || {});
  const estimateInput = { ...result, pointScheduleState: eventState };
  const pointEstimate = schedule ? dogShowBreedPointEstimate(entry, schedule, estimateInput) : { points: null };
  const displayedPoints = result.id || !Number.isFinite(pointEstimate.points) ? pointsEarned : pointEstimate.points;
  const regularAwardsExpanded = [result.groupAward, result.groupJudge, result.groupPointsEarned, result.bisAward, result.bisJudge].some(Boolean);
  const ownerHandledAwardsExpanded = [result.ohGroupAward, result.ohGroupJudge, result.ohBisAward, result.ohBisJudge].some(Boolean);
  const resultContext = schedule
    ? `<div class="dog-show-result-context"><strong>${escapeHtml(dogShowRingAppearanceTitle(schedule, scheduleIndex))}</strong><span>${escapeHtml(dogShowRingAppearanceMeta(schedule))}</span></div>`
    : `<div class="dog-show-result-context"><strong>General show result</strong><span>No ring appearance is assigned.</span></div>`;
  openDogShowDialog(`Result: ${dogShowEntryName(entry)}`, `<form id="dogShowResultForm" class="tracker-form" data-entry-id="${escapeHtml(entry.id)}" data-ring-schedule-id="${escapeHtml(schedule?.id || "")}" data-id="${escapeHtml(result.id || "")}" data-point-estimate-auto="${result.id ? "false" : "true"}">
    ${resultContext}
    <label>Outcome<select name="outcome">${["Win", "Placement", "No placement", "Scratched", "Socialization only"].map((value) => `<option value="${value}"${value === result.outcome ? " selected" : ""}>${dogShowOutcomeLabel(value)}</option>`).join("")}</select></label>
    <fieldset class="dog-show-result-tier dog-show-result-tier-breed">
      <legend>Breed / Variety (BOB/BOV)</legend>
      <div class="field-grid">
        <label>Placement<input name="placement" value="${escapeHtml(result.placement || "")}" placeholder="1st Open Bitch"/></label>
        <label>BOB/BOV &amp; breed awards<input name="awards" value="${escapeHtml(result.awards || "")}" placeholder="WD, BOW, BOB or BOV"/></label>
        <label>Championship points used<input type="number" name="pointsEarned" min="0" max="5" step="1" value="${displayedPoints}"/></label>
        <label>Point schedule state<select name="pointScheduleState">${dogShowPointStateOptions(eventState)}</select></label>
      </div>
      <label class="inline-check"><input type="checkbox" name="isMajor"${result.id ? dogShowMajorValue(result) ? " checked" : "" : pointEstimate.isMajor ? " checked" : ""}/> This result earned a major</label>
      ${schedule ? dogShowPointEstimateHtml(entry, schedule, estimateInput) : ""}
    </fieldset>
    <details class="dog-show-result-award-section"${regularAwardsExpanded ? " open" : ""}>
      <summary><span>Regular Group &amp; BIS</span><small>Group and Best in Show awards</small></summary>
      <div class="dog-show-result-award-content">
        <section class="dog-show-result-award-card">
          <h3>Regular Group</h3>
          <div class="field-grid">
            <label>Group win / award<input name="groupAward" value="${escapeHtml(result.groupAward || "")}" placeholder="Group 1, Group 2, Group 3 or Group 4"/></label>
            <label>Group judge<input name="groupJudge" value="${escapeHtml(result.groupJudge || "")}" placeholder="Judge name"/></label>
            <label>Group points (manual)<input type="number" name="groupPointsEarned" min="0" max="5" step="1" value="${escapeHtml(result.groupPointsEarned ?? "")}" placeholder="Enter when known"/></label>
          </div>
          <small class="dog-show-group-points-note">AKC uses the higher of the breed points or eligible Group points; these values are not added together.</small>
        </section>
        <section class="dog-show-result-award-card">
          <h3>Regular Best in Show</h3>
          <div class="field-grid">
            <label>BIS award<input name="bisAward" value="${escapeHtml(result.bisAward || "")}" placeholder="BIS or RBIS"/></label>
            <label>BIS judge<input name="bisJudge" value="${escapeHtml(result.bisJudge || "")}" placeholder="Judge name"/></label>
          </div>
        </section>
      </div>
    </details>
    <details class="dog-show-result-award-section"${ownerHandledAwardsExpanded ? " open" : ""}>
      <summary><span>OH Group &amp; OH BIS</span><small>Owner-Handled Group and Best in Show awards</small></summary>
      <div class="dog-show-result-award-content">
        <section class="dog-show-result-award-card">
          <h3>OH Group</h3>
          <div class="field-grid">
            <label>OH Group win / award<input name="ohGroupAward" value="${escapeHtml(result.ohGroupAward || "")}" placeholder="OH Group 1, 2, 3 or 4"/></label>
            <label>OH Group judge<input name="ohGroupJudge" value="${escapeHtml(result.ohGroupJudge || "")}" placeholder="Judge name"/></label>
          </div>
        </section>
        <section class="dog-show-result-award-card">
          <h3>OH Best in Show</h3>
          <div class="field-grid">
            <label>OH BIS award<input name="ohBisAward" value="${escapeHtml(result.ohBisAward || "")}" placeholder="OH BIS or OH RBIS"/></label>
            <label>OH BIS judge<input name="ohBisJudge" value="${escapeHtml(result.ohBisJudge || "")}" placeholder="Judge name"/></label>
          </div>
        </section>
      </div>
    </details>
    <label>Judge notes<textarea name="judgeNotes" rows="3">${escapeHtml(result.judgeNotes || "")}</textarea></label>
    <label>Owner-facing summary<textarea name="customerSummary" rows="3">${escapeHtml(result.customerSummary || "")}</textarea></label>
    <label class="inline-check"><input type="checkbox" name="customerVisible"${emailOwner ? " checked" : ""}${ownerEmailAvailable ? "" : " disabled"}/> ${ownerEmailAvailable ? "Email owner immediately" : "Owner email unavailable"}</label>
    <div class="button-row"><button type="submit">Save Result</button><button type="button" class="secondary-button" data-action="${schedule ? "back-to-show-results" : "back-to-show-dog"}" data-id="${escapeHtml(entry.id)}">Back</button></div>
  </form>`);
}

function openDogShowCareerProfileForm(dogKey = "") {
  const dog = dogShowProgressDogs().find((item) => item.key === dogKey);
  if (!dog) return;
  const profile = dogShowCareerProfile(dogKey);
  openDogShowDialog(`Prior Points: ${dogShowEntryName(dog.entry)}`, `<form id="dogShowCareerProfileForm" class="tracker-form" data-dog-key="${escapeHtml(dogKey)}" data-id="${escapeHtml(profile.id || "")}">
    <div class="dog-show-form-note"><strong>Career starting point</strong><span>Enter points and majors earned before this dashboard. These values stay separate from logged ring results.</span></div>
    <div class="field-grid">
      <label>Prior points<input type="number" name="startingPoints" min="0" step="1" value="${Math.max(0, Number(profile.startingPoints || 0))}" required/></label>
      <label>Prior majors<input type="number" name="startingMajors" min="0" step="1" value="${Math.max(0, Number(profile.startingMajors || 0))}" required/></label>
      <label>Title point target<input type="number" name="targetPoints" min="1" step="1" value="${Math.max(1, Number(profile.targetPoints || 15))}" required/></label>
      <label>Title major target<input type="number" name="targetMajors" min="0" step="1" value="${Math.max(0, Number(profile.targetMajors ?? 2))}" required/></label>
      <label>Effective date<input type="date" name="effectiveDate" value="${escapeHtml(profile.effectiveDate || todayDate())}"/></label>
    </div>
    <label>Source note<textarea name="sourceNote" rows="3" placeholder="AKC record, previous handler, owner records">${escapeHtml(profile.sourceNote || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Prior Points</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function openDogShowJudgeNoteForm(judgeName = "") {
  const note = dogShowJudgeNote(judgeName);
  const dogs = dogShowProgressDogs();
  openDogShowDialog(note.id ? `Judge Notes: ${note.judgeName}` : "Add Judge Note", `<form id="dogShowJudgeNoteForm" class="tracker-form" data-id="${escapeHtml(note.id || "")}">
    <div class="dog-show-form-note"><strong>Internal team intelligence</strong><span>Keep observations factual and tied to repeated show experience.</span></div>
    <div class="field-grid">
      <label>Judge name<input name="judgeName" list="dogShowJudgeNames" value="${escapeHtml(note.judgeName || judgeName)}" required/><datalist id="dogShowJudgeNames">${dogShowObservedJudges().map((judge) => `<option value="${escapeHtml(judge)}"></option>`).join("")}</datalist></label>
      <label>Recommendation<select name="recommendation">${["Show Under", "Watch", "Avoid"].map((value) => `<option${value === (note.recommendation || "Watch") ? " selected" : ""}>${value}</option>`).join("")}</select></label>
    </div>
    <label>Preference tags<input name="preferenceTags" value="${escapeHtml(note.preferenceTags || "")}" placeholder="Clean movement, balanced outline, confident temperament"/></label>
    <label>Best fit dogs<input name="bestFitDogs" value="${escapeHtml(note.bestFitDogs || "")}" placeholder="${escapeHtml(dogs.slice(0, 3).map((dog) => dogShowEntryName(dog.entry)).join(", "))}"/></label>
    <label>Internal notes<textarea name="notes" rows="5" placeholder="What the team observed, what was rewarded, and what to watch next time">${escapeHtml(note.notes || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Judge Note</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function openDogShowTaskForm(task = {}) {
  const entries = dogShowEntries();
  const color = dogShowTaskColor(task);
  openDogShowDialog(task.id ? "Edit Show Task" : "New Show Task", `<form id="dogShowTaskForm" class="tracker-form" data-id="${escapeHtml(task.id || "")}">
    <div class="field-grid">
      <label>Task<input name="title" value="${escapeHtml(task.title || "")}" required placeholder="Coat touch-up"/></label>
      <label>Task type<select name="taskType">${["Grooming", "Potty", "Water", "Feeding", "Packing", "Paperwork", "Travel", "Ring Prep", "Owner Update", "General"].map((type) => `<option${type === task.taskType ? " selected" : ""}>${type}</option>`).join("")}</select></label>
      <label>Dog<select name="showEntryId"><option value="">Team task</option>${entries.map((entry) => `<option value="${escapeHtml(entry.id)}"${entry.id === task.showEntryId ? " selected" : ""}>${escapeHtml(dogShowEntryName(entry))}</option>`).join("")}</select></label>
      <label>Assigned to<select name="assignedEmail">${dogShowStaffOptions(task.assignedEmail || currentUser?.email || "")}</select></label>
      <label>Due date / time<input type="datetime-local" name="dueAt" step="900" value="${escapeHtml(dogShowDateTimeInputValue(task.dueAt || new Date(Date.now() + 30 * 60000)))}" required/></label>
      <label>Duration (minutes)<input type="number" name="durationMinutes" min="15" max="720" step="15" value="${dogShowTaskDurationMinutes(task)}" required/></label>
      <label>Status<select name="status"><option${task.status !== "Completed" ? " selected" : ""}>Open</option><option${task.status === "Completed" ? " selected" : ""}>Completed</option></select></label>
      <label class="dog-show-task-color-field">Task color<span><input type="color" name="color" value="${escapeHtml(color)}" aria-label="Task color"/><output>${escapeHtml(color.toUpperCase())}</output></span></label>
    </div>
    <label>Notes<textarea name="notes" rows="3">${escapeHtml(task.notes || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Task</button>${task.id ? `<button type="button" class="secondary-button danger-button" data-action="delete-show-task" data-id="${escapeHtml(task.id)}">Delete Task</button>` : ""}<button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function openDogShowCalendarTask(task = {}) {
  if (!task.id) return;
  const entry = dogShowCalendarTaskEntry(task);
  const completed = task.status === "Completed";
  const schedule = task.source === "auto-ring-prep" ? dogShowScheduleForPrepTask(task, entry) : null;
  const duration = dogShowTaskDurationMinutes(task, schedule ? Math.max(30, Number(schedule.prepMinutes || 45)) : 60);
  const endAt = dogShowTaskEndAt(task, duration);
  openDogShowDialog(task.title || "Show Task", `<div class="dog-show-calendar-task-detail" style="${dogShowTaskColorStyle(task)}">${entry ? dogShowPhotoHtml(entry, "dog-show-detail-photo") : ""}<div><strong>${escapeHtml(task.title || "Show task")}</strong><span>${escapeHtml([entry ? dogShowEntryName(entry) : "Team task", task.taskType || "General", dogShowStaffLabel(task.assignedEmail)].join(" · "))}</span><small>Scheduled ${escapeHtml(dogShowFormatDateTime(task.dueAt))}${endAt ? ` - ${escapeHtml(dogShowFormatTime(endAt))}` : ""} · ${duration} min</small>${completed ? `<p class="dog-show-task-completion">✓ Completed by ${escapeHtml(task.completedBy || "Staff")} · ${escapeHtml(dogShowFormatDateTime(task.completedAt))}</p>` : ""}</div></div><div class="button-row">${completed ? "" : `<button type="button" data-action="complete-show-task" data-id="${escapeHtml(task.id)}">Complete Task</button>`}<button type="button" class="secondary-button" data-action="duplicate-show-task" data-id="${escapeHtml(task.id)}">Duplicate</button><button type="button" class="secondary-button" data-action="edit-show-task" data-id="${escapeHtml(task.id)}">Edit Task</button><button type="button" class="secondary-button" data-action="close-show-dialog">Close</button></div>`);
}

async function openDogShowPrepTask(entry = {}, schedule = {}) {
  let existing = dogShowPrepTaskFor(entry, schedule);
  if (existing) return openDogShowCalendarTask(existing);
  await syncDogShowPrepTask(entry);
  existing = dogShowPrepTaskFor(entry, schedule);
  if (existing) {
    renderDogShow();
    return openDogShowCalendarTask(existing);
  }
  const prep = dogShowPrepTimes(entry, schedule);
  openDogShowDialog(`Prep: ${dogShowEntryName(entry)}`, `<div class="dog-show-calendar-task-detail" style="${dogShowTaskColorStyle({ taskType: "Ring Prep" })}">${dogShowPhotoHtml(entry, "dog-show-detail-photo")}<div><strong>${escapeHtml(`Prep · ${dogShowEntryName(entry)}`)}</strong><span>${escapeHtml([dogShowBreed(entry), schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring", schedule.classEntered].filter(Boolean).join(" · "))}</span><small>Ready ${prep.ready ? escapeHtml(dogShowFormatTime(prep.ready)) : "--"} · Ring ${prep.ring ? escapeHtml(dogShowFormatTime(prep.ring)) : "--"}</small></div></div><div class="button-row"><button type="button" data-action="complete-show-prep" data-id="${escapeHtml(entry.id)}" data-ring-schedule-id="${escapeHtml(schedule.id || "")}">Complete Prep</button><button type="button" class="secondary-button" data-action="open-show-dog" data-id="${escapeHtml(entry.id)}">Edit Dog Details</button><button type="button" class="secondary-button" data-action="close-show-dialog">Close</button></div>`);
}

function openDuplicateDogShowTask(task = {}) {
  if (!task.id) return;
  openDogShowTaskForm({
    title: task.title || "",
    taskType: task.taskType || "General",
    showEntryId: task.showEntryId || "",
    assignedEmail: task.assignedEmail || "",
    dueAt: task.dueAt || "",
    durationMinutes: dogShowTaskDurationMinutes(task),
    status: "Open",
    color: dogShowTaskColor(task),
    notes: task.notes || "",
  });
}

async function saveDogShowRecord(type, payload) {
  const record = upsertRecord(type, { ...payload, type });
  await sendPayload(record);
  return record;
}

async function saveDogShowExpense(form) {
  const event = dogShowActiveEvent();
  if (!event) return;
  const data = formPayload(form);
  const existingExpenses = dogShowExpenses(event);
  const existing = form.dataset.expenseId
    ? existingExpenses.find((candidate) => candidate.id === form.dataset.expenseId)
    : null;
  const amount = Math.max(0, Number(data.amount) || 0);
  const description = String(data.description || "").trim();
  if (!description || amount <= 0) {
    showToast("Enter a brief description and an amount greater than $0.");
    return;
  }
  const entryType = data.entryType === "income" ? "income" : "expense";
  const allowedCategories = entryType === "income" ? DOG_SHOW_INCOME_CATEGORIES : DOG_SHOW_EXPENSE_CATEGORIES;
  const entry = data.showEntryId
    ? dogShowEntries(event).find((candidate) => candidate.id === data.showEntryId)
    : null;
  const expense = {
    ...(existing || {}),
    id: existing?.id || uid("showExpense"),
    entryType,
    category: allowedCategories.includes(data.category) ? data.category : (entryType === "income" ? "Other income" : "Other"),
    description,
    amount: Math.round(amount * 100) / 100,
    incurredDate: data.incurredDate || todayDate(),
    submittedAt: existing?.submittedAt || new Date().toISOString(),
    submittedBy: existing?.submittedBy || currentUser?.name || "Staff",
    submittedEmail: existing?.submittedEmail || currentUser?.email || "",
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.name || "Staff",
    updatedEmail: currentUser?.email || "",
  };
  if (entry) {
    expense.showEntryId = entry.id;
    expense.dogId = entry.dogId || "";
    expense.dogType = entry.dogType || "";
    expense.dogName = dogShowEntryName(entry);
  } else {
    delete expense.showEntryId;
    delete expense.dogId;
    delete expense.dogType;
    delete expense.dogName;
  }
  const nextExpenses = existing
    ? existingExpenses.map((candidate) => candidate.id === existing.id ? expense : candidate)
    : [...existingExpenses, expense];
  await saveDogShowRecord("showEvent", {
    ...event,
    expenses: nextExpenses,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.name || "Staff",
    updatedEmail: currentUser?.email || "",
  });
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast(`${entryType === "income" ? "Income / reward" : "Expense"} ${existing ? "updated" : "saved"}.`);
}

async function saveDogShowExpenseSplit(form) {
  const event = dogShowActiveEvent();
  if (!event) return;
  const rosterCount = dogShowEntries(event).length;
  if (!rosterCount) {
    showToast("Add dogs to the show roster before splitting expenses.");
    return;
  }
  const data = formPayload(form);
  const requestedCount = Math.round(Number(data.expenseSplitDogCount) || 0);
  if (requestedCount < 1 || requestedCount > rosterCount) {
    showToast(`Enter a number from 1 to ${rosterCount}.`);
    return;
  }
  await saveDogShowRecord("showEvent", {
    ...event,
    expenseSplitDogCount: requestedCount,
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.name || "Staff",
    updatedEmail: currentUser?.email || "",
  });
  renderDogShow();
  showToast(`Expenses are split across ${requestedCount} dog${requestedCount === 1 ? "" : "s"}.`);
}

async function removeDogShowExpense(expenseId = "") {
  const event = dogShowActiveEvent();
  const expense = dogShowExpenses(event).find((candidate) => candidate.id === expenseId);
  if (!event || !expense || !window.confirm(`Remove ${expense.description || expense.category || "this expense"}?`)) return;
  await saveDogShowRecord("showEvent", {
    ...event,
    expenses: (Array.isArray(event.expenses) ? event.expenses : []).filter((candidate) => candidate.id !== expenseId),
    updatedAt: new Date().toISOString(),
    updatedBy: currentUser?.name || "Staff",
    updatedEmail: currentUser?.email || "",
  });
  renderDogShow();
  showToast("Show transaction removed.");
}

async function saveDogShowEvent(form) {
  const existing = form.dataset.id ? readRecords("showEvent").find((event) => event.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  data.status = dogShowEventStatus(data.status);
  const helperEmails = [...form.querySelectorAll('input[name="helperEmails"]:checked')].map((input) => input.value);
  const packingItems = Array.isArray(existing.packingItems) && existing.packingItems.length
    ? existing.packingItems
    : DOG_SHOW_DEFAULT_PACKING.map((label, index) => ({ id: `packing-${Date.now()}-${index}`, label, completed: false }));
  const saved = await saveDogShowRecord("showEvent", { ...existing, ...data, nohs: data.nohs === "true", id: existing.id || uid("showEvent"), helperEmails, packingItems, submittedAt: existing.submittedAt || new Date().toISOString(), helperEmail: currentUser?.email || "" });
  localStorage.setItem(DOG_SHOW_EVENT_KEY, saved.id);
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast("Show weekend saved.");
}

async function saveDogShowTableStatuses(eventIds = [], status = "Going To") {
  const selectedIds = new Set(eventIds.filter(Boolean));
  const nextStatus = dogShowEventStatus(status);
  const timestamp = new Date().toISOString();
  const records = dogShowEvents()
    .filter((event) => selectedIds.has(event.id))
    .map((event) => upsertRecord("showEvent", {
      ...event,
      status: nextStatus,
      updatedAt: timestamp,
      updatedBy: currentUser?.name || "Staff",
      updatedEmail: currentUser?.email || "",
    }));
  if (!records.length) return false;
  await sendPayloadBatch(records);
  renderDogShow();
  return true;
}

async function saveDogShowQuickTeam(form) {
  const event = dogShowEvents().find((candidate) => candidate.id === form.dataset.eventId);
  if (!event) return showToast("The selected show could not be found.");
  const selectedDogKeys = new Set([...form.querySelectorAll('input[name="dogKeys"]:checked')].map((input) => input.value));
  const selectedHelperEmails = [...form.querySelectorAll('input[name="helperEmails"]:checked')].map((input) => input.value);
  const allEntries = readRecords("showEntry").filter((entry) => entry.showEventId === event.id);
  const allDogs = [
    ...dogShowOwnedDogs().map((dog) => ({ dog, dogType: "ownedDog" })),
    ...dogShowBoardingDogs().map((dog) => ({ dog, dogType: "boardingDog" })),
  ];
  const timestamp = new Date().toISOString();
  const entryUpdates = [];
  allDogs.forEach(({ dog, dogType }) => {
    const key = `${dogType}:${dog.id}`;
    const matching = allEntries.filter((entry) => entry.dogType === dogType && entry.dogId === dog.id);
    const active = matching.find((entry) => !entry.removed);
    if (selectedDogKeys.has(key) && !active) {
      const archived = matching[0];
      entryUpdates.push(upsertRecord("showEntry", {
        ...(archived || {}),
        type: "showEntry",
        id: archived?.id || uid("showEntry"),
        showEventId: event.id,
        dogId: dog.id,
        dogType,
        dogName: dogShowDogName(dog, dogType),
        attendanceRole: archived?.attendanceRole || "Showing",
        handlerEmail: archived?.handlerEmail || "",
        helperEmail: archived?.helperEmail || "",
        prepMinutes: Number(archived?.prepMinutes || 45),
        readyBufferMinutes: Number(archived?.readyBufferMinutes || 15),
        status: archived?.status || "Confirmed",
        removed: false,
        removedAt: "",
        removedBy: "",
        removedEmail: "",
        submittedAt: archived?.submittedAt || timestamp,
        updatedAt: timestamp,
        updatedBy: currentUser?.name || "Staff",
        updatedEmail: currentUser?.email || "",
      }));
    }
    if (!selectedDogKeys.has(key)) {
      matching.filter((entry) => !entry.removed).forEach((entry) => {
        entryUpdates.push(upsertRecord("showEntry", {
          ...entry,
          removed: true,
          removedAt: timestamp,
          removedBy: currentUser?.name || "Staff",
          removedEmail: currentUser?.email || "",
        }));
      });
    }
  });
  const updatedEvent = upsertRecord("showEvent", {
    ...event,
    status: dogShowEventStatus(form.elements.status.value),
    helperEmails: selectedHelperEmails,
    updatedAt: timestamp,
    updatedBy: currentUser?.name || "Staff",
    updatedEmail: currentUser?.email || "",
  });
  await sendPayloadBatch([updatedEvent, ...entryUpdates]);
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast("Show status, dogs, and helpers updated.");
}

async function saveDogShowDogs(form) {
  const event = dogShowActiveEvent();
  if (!event) return;
  const data = formPayload(form);
  const keys = [...form.querySelectorAll('input[name="dogKeys"]:checked')].map((input) => input.value);
  if (!keys.length) return showToast("Select at least one dog.");
  const records = keys.map((key) => {
    const [dogType, dogId] = key.split(":");
    const dog = (dogType === "boardingDog" ? dogShowBoardingDogs() : dogShowOwnedDogs()).find((item) => item.id === dogId) || {};
    return upsertRecord("showEntry", {
      type: "showEntry", id: uid("showEntry"), showEventId: event.id, dogId, dogType, dogName: dogShowDogName(dog, dogType), attendanceRole: data.attendanceRole || "Showing", handlerEmail: data.handlerEmail || "", helperEmail: data.helperEmail || "", prepMinutes: Number(data.prepMinutes || 45), readyBufferMinutes: 15, status: "Confirmed", submittedAt: new Date().toISOString(), helperEmailCreatedBy: currentUser?.email || "",
    });
  });
  await sendPayloadBatch(records);
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast(`${records.length} dog${records.length === 1 ? "" : "s"} added to the show.`);
}

async function syncDogShowPrepTask(entry) {
  const existingTasks = dogShowRecords("showDayTask", entry.showEventId).filter((task) => task.source === "auto-ring-prep" && task.showEntryId === entry.id);
  const schedules = entry.attendanceRole === "Showing"
    ? dogShowRingSchedules(entry).map((schedule) => ({ schedule, prep: dogShowPrepTimes(entry, schedule) })).filter((item) => item.prep.start)
    : [];
  const keptTaskIds = new Set();

  for (const [index, item] of schedules.entries()) {
    const { schedule, prep } = item;
    const candidates = existingTasks.filter((task) => task.ringScheduleId === schedule.id || (index === 0 && !task.ringScheduleId));
    const existing = candidates.reduce((preferred, task) => preferred ? dogShowPreferredPrepTask(preferred, task) : task, null);
    const saved = await saveDogShowRecord("showDayTask", {
      ...(existing || {}),
      id: existing?.id || `showDayTask-ring-prep-${entry.id}-${schedule.id}`,
      showEventId: entry.showEventId,
      showEntryId: entry.id,
      ringScheduleId: schedule.id,
      dogId: entry.dogId,
      dogType: entry.dogType,
      title: `Ring prep: ${dogShowEntryName(entry)}${schedule.ringNumber ? ` - Ring ${schedule.ringNumber}` : ""}`,
      taskType: "Ring Prep",
      dueAt: prep.start.toISOString(),
      durationMinutes: Math.max(30, Number(schedule.prepMinutes || 45)),
      assignedEmail: entry.helperEmail || entry.handlerEmail || "",
      status: existing?.status === "Completed" ? "Completed" : "Open",
      source: "auto-ring-prep",
      submittedAt: existing?.submittedAt || new Date().toISOString(),
      helperEmail: currentUser?.email || "",
      removed: false,
      removedAt: "",
    });
    keptTaskIds.add(saved.id);
  }

  for (const task of existingTasks) {
    if (!keptTaskIds.has(task.id) && task.status !== "Completed") {
      await saveDogShowRecord("showDayTask", { ...task, removed: true, removedAt: new Date().toISOString(), removedBy: currentUser?.name || "Staff", removedEmail: currentUser?.email || "" });
    }
  }
}

async function saveDogShowEntry(form) {
  const entry = dogShowEntries().find((item) => item.id === form.dataset.id);
  if (!entry) return;
  const data = formPayload(form);
  const ringSchedules = [...form.querySelectorAll("[data-ring-schedule-row]")].map(dogShowRingScheduleFromRow);
  const firstSchedule = ringSchedules[0] || {};
  const saved = await saveDogShowRecord("showEntry", {
    ...entry,
    ...data,
    ringSchedules,
    ringDate: firstSchedule.ringDate || "",
    ringTime: firstSchedule.ringTime || "",
    ringNumber: firstSchedule.ringNumber || "",
    classEntered: firstSchedule.classEntered || "",
    armbandNumber: firstSchedule.armbandNumber || "",
    judge: firstSchedule.judge || "",
    classDogCount: Math.max(0, Number(firstSchedule.classDogCount || 0)),
    classBitchCount: Math.max(0, Number(firstSchedule.classBitchCount || 0)),
    specialDogCount: Math.max(0, Number(firstSchedule.specialDogCount || 0)),
    specialBitchCount: Math.max(0, Number(firstSchedule.specialBitchCount || 0)),
    prepMinutes: Number(firstSchedule.prepMinutes ?? entry.prepMinutes ?? 45),
    readyBufferMinutes: Number(firstSchedule.readyBufferMinutes ?? entry.readyBufferMinutes ?? 15),
    helperEmailUpdatedBy: currentUser?.email || "",
  });
  await syncDogShowPrepTask(saved);
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast(`${dogShowEntryName(saved)} updated and saved.`);
}

async function createDogShowLog(entry, activityType, note = "Logged", options = {}) {
  const record = await saveDogShowRecord("showCareLog", {
    id: uid("showCareLog"), showEventId: entry.showEventId, showEntryId: entry.id, ringScheduleId: options.ringScheduleId || "", dogId: entry.dogId, dogType: entry.dogType, dogName: dogShowEntryName(entry), activityType, pottyType: options.pottyType || "", note, severity: options.severity || "", customerVisible: options.customerVisible === true, loggedAt: new Date().toISOString(), helperName: currentUser?.name || "Staff", helperEmail: currentUser?.email || "", submittedAt: new Date().toISOString(),
  });
  renderDogShow();
  return record;
}

async function createDogShowBulkCareLogs(activityType = "", options = {}) {
  if (dogShowBulkCarePending) return false;
  const event = dogShowActiveEvent();
  const entries = dogShowEntries(event);
  const normalizedType = activityType === "Feeding" ? "Feeding" : activityType === "Potty" ? "Potty" : "Water";
  const pottyType = normalizedType === "Potty" ? String(options.pottyType || "") : "";
  const actionLabel = pottyType || (normalizedType === "Feeding" ? "food" : "water");
  if (!event || !entries.length) {
    showToast("Add dogs before logging care for the team.");
    return false;
  }
  if (normalizedType === "Potty" && !pottyType) return false;
  if (!window.confirm(`Log ${actionLabel.toLowerCase()} now for all ${entries.length} dogs at ${event.name || "this show"}?`)) return false;

  dogShowBulkCarePending = true;
  const loggedAt = new Date().toISOString();
  const records = entries.map((entry) => upsertRecord("showCareLog", {
    type: "showCareLog",
    id: uid("showCareLog"),
    showEventId: event.id,
    showEntryId: entry.id,
    ringScheduleId: "",
    dogId: entry.dogId,
    dogType: entry.dogType,
    dogName: dogShowEntryName(entry),
    activityType: normalizedType,
    pottyType,
    note: `${pottyType || normalizedType} logged for all show dogs`,
    severity: "",
    customerVisible: false,
    loggedAt,
    helperName: currentUser?.name || "Staff",
    helperEmail: currentUser?.email || "",
    submittedAt: loggedAt,
  }));

  try {
    await sendPayloadBatch(records);
    renderDogShow();
    showToast(`${pottyType || (normalizedType === "Feeding" ? "Food" : "Water")} logged for all ${records.length} dogs.`);
    return true;
  } finally {
    dogShowBulkCarePending = false;
  }
}

async function saveDogShowNote(form) {
  const entry = dogShowEntries().find((item) => item.id === form.dataset.id);
  if (!entry) return;
  const data = formPayload(form);
  const logType = form.dataset.logType || "Note";
  await createDogShowLog(entry, logType, data.note || "Logged", { severity: data.severity || "", customerVisible: Boolean(form.elements.customerVisible?.checked) });
  document.getElementById("dogShowDialog")?.close();
  showToast(`${logType} logged for ${dogShowEntryName(entry)}.`);
}

async function saveDogShowResult(form) {
  const entry = dogShowEntries().find((item) => item.id === form.dataset.entryId);
  if (!entry) return;
  const event = dogShowActiveEvent() || {};
  const sourceDog = dogShowSourceDog(entry);
  const schedules = dogShowRingSchedules(entry);
  const ringScheduleId = form.dataset.ringScheduleId || "";
  const schedule = schedules.find((item) => item.id === ringScheduleId) || null;
  if (entry.attendanceRole === "Showing" && !schedule) return showToast("Choose a ring appearance before logging the result.");
  const existing = form.dataset.id ? readRecords("showResult").find((result) => result.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  const customerVisible = Boolean(form.elements.customerVisible?.checked);
  const pointsEarned = Math.min(5, Math.max(0, Number(data.pointsEarned || 0)));
  const groupPointsEarned = data.groupPointsEarned === "" ? "" : Math.min(5, Math.max(0, Number(data.groupPointsEarned || 0)));
  const isMajor = Boolean(form.elements.isMajor?.checked);
  const pointEstimate = schedule ? dogShowBreedPointEstimate(entry, schedule, data) : { points: null };
  const entryCounts = dogShowEntryCounts(schedule || {});
  const ownerEmails = [sourceDog.ownerEmail, sourceDog.customerEmail, sourceDog.linkedOwnerEmail, sourceDog.secondaryOwnerEmail]
    .map(normalizeEmail)
    .filter(Boolean);
  const result = await saveDogShowRecord("showResult", {
    ...existing,
    ...data,
    recordKind: "appearanceResult",
    pointsEarned,
    groupPointsEarned,
    isMajor,
    id: existing.id || (schedule ? `showResult-${entry.id}-${schedule.id}` : uid("showResult")),
    showEventId: entry.showEventId,
    showEntryId: entry.id,
    ringScheduleId: schedule?.id || "",
    ringDate: schedule?.ringDate || "",
    ringTime: schedule?.ringTime || "",
    ringNumber: schedule?.ringNumber || "",
    classEntered: schedule?.classEntered || "",
    judge: schedule?.judge || "",
    classDogCount: entryCounts.classDogs,
    classBitchCount: entryCounts.classBitches,
    specialDogCount: entryCounts.specialDogs,
    specialBitchCount: entryCounts.specialBitches,
    breedEntryCount: schedule ? dogShowEntryCountLabel(schedule) : "",
    calculatedPoints: Number.isFinite(pointEstimate.points) ? pointEstimate.points : null,
    pointScheduleYear: pointEstimate.pointSchedule?.year || "",
    pointScheduleDivision: pointEstimate.pointSchedule?.division || "",
    pointScheduleState: pointEstimate.pointSchedule?.state || data.pointScheduleState || "",
    dogId: entry.dogId,
    dogType: entry.dogType,
    dogName: dogShowEntryName(entry),
    breed: dogShowBreed(entry),
    ownerName: sourceDog.ownerName || sourceDog.customerName || "",
    ownerEmail: sourceDog.ownerEmail || "",
    customerEmail: sourceDog.customerEmail || "",
    linkedOwnerEmail: sourceDog.linkedOwnerEmail || "",
    secondaryOwnerEmail: sourceDog.secondaryOwnerEmail || "",
    showName: event.name || "Dog Show",
    showClub: event.club || "",
    showVenue: event.venue || "",
    showLocation: event.venueAddress || event.cityState || "",
    resultIsUpdate: Boolean(existing.id && existing.customerVisible),
    customerVisible,
    loggedAt: existing.loggedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    helperName: currentUser?.name || "Staff",
    helperEmail: currentUser?.email || "",
    submittedAt: existing.submittedAt || new Date().toISOString(),
  });
  const appearance = schedule ? dogShowRingAppearanceMeta(schedule) : "General show result";
  await createDogShowLog(entry, "Result", [appearance, dogShowOutcomeLabel(data.outcome), data.placement, dogShowResultAwardsSummary(result)].filter(Boolean).join(" · ") || "Result logged", { customerVisible, ringScheduleId: result.ringScheduleId });
  const notification = customerVisible && ownerEmails.length
    ? await notifyIfNeeded(result, "dogShowResultPublished")
    : null;
  if (schedules.length) openDogShowResultPicker(entry);
  else openDogShowEntryForm(entry);
  const savedMessage = schedule ? `Result saved for ${dogShowRingAppearanceTitle(schedule, schedules.indexOf(schedule))}.` : "Show result saved.";
  const ownerMessage = customerVisible
    ? ownerEmails.length
      ? notification?.deliveryStatus === "sent" ? " Owner email sent." : " Owner notification queued."
      : " No owner email is available for this dog."
    : "";
  showToast(`${savedMessage}${ownerMessage}`);
}

async function saveDogShowCareerProfile(form) {
  const dogKey = form.dataset.dogKey || "";
  const dog = dogShowProgressDogs().find((item) => item.key === dogKey);
  if (!dog) return;
  const existing = form.dataset.id ? readRecords("showResult").find((record) => record.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  await saveDogShowRecord("showResult", {
    ...existing,
    id: existing.id || `showCareerProfile-${dog.entry.dogType || "dog"}-${dog.entry.dogId || dog.entry.id}`,
    recordKind: "careerProfile",
    dogKey,
    dogId: dog.entry.dogId || "",
    dogType: dog.entry.dogType || "",
    dogName: dogShowEntryName(dog.entry),
    breed: dogShowBreed(dog.entry),
    startingPoints: Math.max(0, Number(data.startingPoints || 0)),
    startingMajors: Math.max(0, Number(data.startingMajors || 0)),
    targetPoints: Math.max(1, Number(data.targetPoints || 15)),
    targetMajors: Math.max(0, Number(data.targetMajors || 0)),
    effectiveDate: data.effectiveDate || "",
    sourceNote: data.sourceNote || "",
    updatedBy: currentUser?.name || "Staff",
    helperEmail: currentUser?.email || "",
    submittedAt: existing.submittedAt || new Date().toISOString(),
  });
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast(`Prior points saved for ${dogShowEntryName(dog.entry)}.`);
}

async function saveDogShowJudgeNote(form) {
  const existing = form.dataset.id ? readRecords("showResult").find((record) => record.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  const judgeName = String(data.judgeName || "").trim();
  if (!judgeName) return;
  const matching = dogShowJudgeNote(judgeName);
  await saveDogShowRecord("showResult", {
    ...matching,
    ...existing,
    id: existing.id || matching.id || uid("showJudgeNote"),
    recordKind: "judgeNote",
    judgeName,
    recommendation: data.recommendation || "Watch",
    preferenceTags: data.preferenceTags || "",
    bestFitDogs: data.bestFitDogs || "",
    notes: data.notes || "",
    updatedBy: currentUser?.name || "Staff",
    helperEmail: currentUser?.email || "",
    submittedAt: existing.submittedAt || matching.submittedAt || new Date().toISOString(),
  });
  dogShowProgressJudge = judgeName;
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast(`Judge notes saved for ${judgeName}.`);
}

async function saveDogShowTask(form) {
  const existing = form.dataset.id ? readRecords("showDayTask").find((task) => task.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  const entry = dogShowEntries().find((item) => item.id === data.showEntryId);
  const completed = data.status === "Completed";
  await saveDogShowRecord("showDayTask", { ...existing, ...data, id: existing.id || uid("showDayTask"), showEventId: dogShowActiveEvent()?.id || "", dogId: entry?.dogId || "", dogType: entry?.dogType || "", dueAt: new Date(data.dueAt).toISOString(), durationMinutes: dogShowTaskDurationMinutes(data), color: data.color || dogShowTaskColor({ ...existing, taskType: data.taskType }), completedAt: completed ? existing.completedAt || new Date().toISOString() : "", completedBy: completed ? existing.completedBy || currentUser?.name || "Staff" : "", completedEmail: completed ? existing.completedEmail || currentUser?.email || "" : "", submittedAt: existing.submittedAt || new Date().toISOString(), helperEmail: currentUser?.email || "" });
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast("Show task saved.");
}

async function removeDogShowTask(id = "") {
  const task = dogShowTasks().find((item) => item.id === id);
  if (!task || !window.confirm(`Delete ${task.title || "this show task"}?`)) return;
  const removed = await saveDogShowRecord("showDayTask", { ...task, removed: true, removedAt: new Date().toISOString(), removedBy: currentUser?.name || "Staff", removedEmail: currentUser?.email || "" });
  dogShowSelectedTaskIds.delete(task.id);
  if (typeof addAuditLog === "function") await addAuditLog("Deleted dog show task", "showDayTask", removed, task.title || "Show task");
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast("Show task deleted.");
}

async function removeDogShowLog(id = "", entryId = "") {
  if (currentRole() !== "admin") return showToast("Admin access required to remove a logged item.");
  const viewState = dogShowEntryDialogViewState();
  const log = dogShowLogs().find((item) => item.id === id);
  if (!log || !window.confirm(`Remove this ${dogShowCareLogName(log)} log?`)) return;
  const removed = await saveDogShowRecord("showCareLog", { ...log, removed: true, removedAt: new Date().toISOString(), removedBy: currentUser?.name || "Admin", removedEmail: currentUser?.email || "" });
  if (typeof addAuditLog === "function") await addAuditLog("Removed dog show care log", "showCareLog", removed, `${log.dogName || "Dog"} · ${dogShowCareLogName(log)}`);
  renderDogShow();
  const entry = dogShowEntries().find((item) => item.id === (entryId || log.showEntryId));
  if (entry) openDogShowEntryForm(entry, {}, viewState);
  else document.getElementById("dogShowDialog")?.close();
  showToast("Logged item removed.");
}

async function completeDogShowPrep(entryId = "", scheduleId = "") {
  const entry = dogShowEntries().find((item) => item.id === entryId);
  if (!entry) return;
  const schedule = dogShowRingSchedules(entry).find((item) => item.id === scheduleId);
  if (!schedule) return showToast("Ring preparation schedule was not found.");
  await syncDogShowPrepTask(entry);
  const task = dogShowPrepTaskFor(entry, schedule);
  if (!task) return showToast("Ring preparation task could not be created.");
  await completeDogShowTasks([task.id]);
  document.getElementById("dogShowDialog")?.close();
}

async function completeDogShowTasks(ids = []) {
  const tasks = dogShowTasks().filter((task) => ids.includes(task.id) && task.status !== "Completed");
  const completed = tasks.map((task) => upsertRecord("showDayTask", { ...task, type: "showDayTask", status: "Completed", completedAt: new Date().toISOString(), completedBy: currentUser?.name || "Staff", completedEmail: currentUser?.email || "" }));
  if (completed.length) await sendPayloadBatch(completed);
  completed.forEach((task) => dogShowSelectedTaskIds.delete(task.id));
  renderDogShow();
  if (completed.length) showToast(`${completed.length} task${completed.length === 1 ? "" : "s"} completed.`);
}

async function moveDogShowCalendarTask(taskId, dueAt) {
  const task = dogShowTasks().find((item) => item.id === taskId);
  if (!task || task.status === "Completed" || !dueAt) return;
  await saveDogShowRecord("showDayTask", { ...task, dueAt: new Date(dueAt).toISOString(), updatedAt: new Date().toISOString(), updatedBy: currentUser?.name || "Staff", updatedEmail: currentUser?.email || "" });
  renderDogShow();
  showToast(`${task.title || "Task"} moved to ${dogShowFormatDateTime(dueAt)}.`);
}

async function createDogShowWaterRound() {
  const event = dogShowActiveEvent();
  const entries = dogShowEntries(event);
  if (!entries.length) return showToast("Add dogs before creating a water round.");
  if (!window.confirm(`Create a water-check task for all ${entries.length} dogs?`)) return;
  const dueAt = new Date(Date.now() + 15 * 60000).toISOString();
  const records = entries.map((entry) => upsertRecord("showDayTask", { type: "showDayTask", id: uid("showDayTask"), showEventId: event.id, showEntryId: entry.id, dogId: entry.dogId, dogType: entry.dogType, title: `Water check: ${dogShowEntryName(entry)}`, taskType: "Water", dueAt, assignedEmail: currentUser?.email || "", status: "Open", source: "water-round", submittedAt: new Date().toISOString(), helperEmail: currentUser?.email || "" }));
  await sendPayloadBatch(records);
  renderDogShow();
  showToast(`Water round created for ${records.length} dogs.`);
}

async function updateDogShowPackingItem(id, completed) {
  const event = dogShowActiveEvent();
  if (!event) return;
  const items = (Array.isArray(event.packingItems) && event.packingItems.length ? event.packingItems : DOG_SHOW_DEFAULT_PACKING.map((label, index) => ({ id: `default-${index}`, label, completed: false })))
    .map((item) => item.id === id ? { ...item, completed } : item);
  await saveDogShowRecord("showEvent", { ...event, packingItems: items });
  renderDogShow();
}

async function addDogShowPackingItem(form) {
  const event = dogShowActiveEvent();
  const label = String(form.elements.label.value || "").trim();
  if (!event || !label) return;
  const items = Array.isArray(event.packingItems) ? event.packingItems.slice() : [];
  items.push({ id: uid("showPacking"), label, completed: false });
  await saveDogShowRecord("showEvent", { ...event, packingItems: items });
  renderDogShow();
}

async function removeDogShowPackingItem(id) {
  const event = dogShowActiveEvent();
  if (!event || !window.confirm("Remove this packing item?")) return;
  const items = (Array.isArray(event.packingItems) && event.packingItems.length ? event.packingItems : DOG_SHOW_DEFAULT_PACKING.map((label, index) => ({ id: `default-${index}`, label, completed: false }))).filter((item) => item.id !== id);
  await saveDogShowRecord("showEvent", { ...event, packingItems: items });
  renderDogShow();
}

function openDogShowHelperSummary() {
  const event = dogShowActiveEvent();
  const emails = Array.isArray(event?.helperEmails) ? event.helperEmails : [];
  openDogShowDialog("Weekend Helpers", emails.length ? `<div class="dog-show-summary-list">${emails.map((email) => {
    const assigned = dogShowEntries(event).filter((entry) => [entry.handlerEmail, entry.helperEmail].map(normalizeEmail).includes(normalizeEmail(email))).length;
    const open = dogShowTasks(event).filter((task) => normalizeEmail(task.assignedEmail) === normalizeEmail(email) && task.status !== "Completed").length;
    return `<article><strong>${escapeHtml(dogShowStaffLabel(email))}</strong><span>${assigned} dogs · ${open} open tasks</span></article>`;
  }).join("")}</div><div class="button-row"><button type="button" data-action="edit-show-event">Edit Helper List</button></div>` : dogShowRenderEmpty("No helpers selected", "Add helpers in Show Setup.", "edit-show-event", "Show Setup"));
}

function openDogShowResultSummary() {
  const event = dogShowActiveEvent();
  const results = dogShowResults(event);
  const entries = dogShowEntries(event);
  openDogShowDialog("Show Results", results.length ? `<div class="dog-show-summary-list dog-show-result-appearance-list">${results.map((result) => {
    const entry = entries.find((item) => item.id === result.showEntryId) || {};
    const schedules = dogShowRingSchedules(entry);
    const schedule = schedules.find((item) => item.id === result.ringScheduleId) || (!result.ringScheduleId ? schedules[0] : null);
    const appearance = schedule ? dogShowRingAppearanceTitle(schedule, schedules.indexOf(schedule)) : "General result";
    return `<button type="button" data-action="open-show-result" data-id="${escapeHtml(result.showEntryId)}" data-ring-schedule-id="${escapeHtml(schedule?.id || "")}"><strong>${escapeHtml(result.dogName || dogShowEntryName(entry) || "Dog")}</strong><span>${escapeHtml([appearance, schedule ? dogShowRingAppearanceMeta(schedule) : ""].filter(Boolean).join(" · "))}</span><small>${escapeHtml([dogShowOutcomeLabel(result.outcome), result.placement, dogShowResultAwardsSummary(result)].filter(Boolean).join(" · ") || "Result logged")}</small></button>`;
  }).join("")}</div>` : dogShowRenderEmpty("No results logged", "Open a showing dog's card and choose a ring appearance to log its result.", "close-show-dialog", "Close"));
}

function openDogShowProgressResult(resultId = "") {
  const result = dogShowAppearanceResultsAll().find((item) => item.id === resultId);
  if (!result?.showEventId || !result.showEntryId) return;
  localStorage.setItem(DOG_SHOW_EVENT_KEY, result.showEventId);
  const resultEntry = dogShowEntries().find((item) => item.id === result.showEntryId);
  if (resultEntry) openDogShowResultForm(resultEntry, result.ringScheduleId || "");
}

function setupDogShowEventListeners() {
  const page = document.getElementById("dogShowPage");
  if (!page || page.dataset.dogShowBound === "true") return;
  page.dataset.dogShowBound = "true";
  const mobileNav = document.getElementById("dogShowMobileNav");
  const dialog = document.getElementById("dogShowDialog");

  const handleViewClick = (event) => {
    const button = event.target.closest("[data-dog-show-view]");
    if (!button) return;
    if (button.dataset.dogShowView === "more" && window.matchMedia("(max-width: 980px)").matches) {
      setDogShowMoreMenuOpen(document.getElementById("dogShowMoreMenu")?.hidden);
      return;
    }
    setDogShowMoreMenuOpen(false);
    setDogShowView(button.dataset.dogShowView);
  };
  page.addEventListener("click", handleViewClick);
  mobileNav?.addEventListener("click", handleViewClick);
  document.getElementById("dogShowNewEventButton")?.addEventListener("click", () => openDogShowEventForm());
  document.getElementById("dogShowEventSelect")?.addEventListener("change", (event) => {
    if (event.target.value) localStorage.setItem(DOG_SHOW_EVENT_KEY, event.target.value);
    dogShowSelectedTaskIds.clear();
    renderDogShow();
  });
  document.getElementById("dogShowDialogCloseButton")?.addEventListener("click", () => dialog?.close());

  page.addEventListener("input", (event) => {
    if (event.target.id !== "dogShowDogSearch") return;
    dogShowDogQuery = event.target.value || "";
    renderDogShow();
    requestAnimationFrame(() => {
      const input = document.getElementById("dogShowDogSearch");
      input?.focus();
      input?.setSelectionRange(dogShowDogQuery.length, dogShowDogQuery.length);
    });
  });

  dialog?.addEventListener("input", (event) => {
    const plannerForm = event.target.closest("#dogShowPlannerForm");
    if (plannerForm && event.target.matches('[name="breedName"]') && String(event.target.value || "").trim()) {
      plannerForm.elements.searchMode.value = "breed";
    }
    if (event.target.matches('#dogShowTaskForm input[name="color"]')) {
      const output = event.target.closest("label")?.querySelector("output");
      if (output) output.textContent = String(event.target.value || "").toUpperCase();
    }
    if (event.target.closest("[data-ring-schedule-row]")) refreshDogShowRingScheduleRows(event.target.closest("form"));
    const resultForm = event.target.closest("#dogShowResultForm");
    if (resultForm && event.target.matches('[name="pointsEarned"], [name="isMajor"]')) resultForm.dataset.pointEstimateAuto = "false";
    if (resultForm && event.target.matches('[name="outcome"], [name="awards"], [name="pointScheduleState"], [name="groupPointsEarned"]')) refreshDogShowPointEstimate(resultForm);
  });

  dialog?.addEventListener("change", (event) => {
    const plannerForm = event.target.closest("#dogShowPlannerForm");
    if (plannerForm && event.target.matches('[name="dogKeys"]') && event.target.checked) plannerForm.elements.searchMode.value = "dogs";
    if (plannerForm && event.target.matches('[name="breedName"]') && String(event.target.value || "").trim()) plannerForm.elements.searchMode.value = "breed";
    const entryForm = event.target.closest("#dogShowEntryForm");
    if (entryForm && event.target.matches('[name="attendanceRole"], [name="status"]')) refreshDogShowAssignmentSummary(entryForm);
    const resultForm = event.target.closest("#dogShowResultForm");
    if (resultForm && event.target.matches('[name="outcome"], [name="awards"], [name="pointScheduleState"], [name="groupPointsEarned"]')) refreshDogShowPointEstimate(resultForm);
    const expenseForm = event.target.closest("#dogShowExpenseForm");
    if (expenseForm && event.target.matches('[name="entryType"]')) {
      expenseForm.elements.category.innerHTML = dogShowFinanceCategoryOptions(event.target.value);
    }
  });

  page.addEventListener("change", async (event) => {
    if (event.target.matches("[data-show-table-select-all]")) {
      page.querySelectorAll("[data-show-table-select]").forEach((input) => {
        input.checked = event.target.checked;
      });
      return;
    }
    if (event.target.matches("[data-show-quick-status]")) {
      const status = event.target.value;
      event.target.disabled = true;
      const saved = await saveDogShowTableStatuses([event.target.dataset.showQuickStatus], status);
      if (saved) showToast(`Show status updated to ${dogShowEventStatus(status)}.`);
      return;
    }
    if (event.target.matches("[data-show-task-select]")) {
      if (event.target.checked) dogShowSelectedTaskIds.add(event.target.dataset.showTaskSelect);
      else dogShowSelectedTaskIds.delete(event.target.dataset.showTaskSelect);
      renderDogShow();
    }
    if (event.target.matches("[data-packing-id]")) await updateDogShowPackingItem(event.target.dataset.packingId, event.target.checked);
  });

  page.addEventListener("submit", async (event) => {
    if (event.target.id === "dogShowExpenseSplitForm") {
      event.preventDefault();
      await saveDogShowExpenseSplit(event.target);
      return;
    }
    if (event.target.id === "dogShowCalculatorForm") {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.target).entries());
      dogShowCalculatorState = {
        state: data.state || "TX",
        breed: data.breed || "Siberian Huskies",
        classDogs: Math.max(0, Number(data.classDogs) || 0),
        classBitches: Math.max(0, Number(data.classBitches) || 0),
        championDogs: Math.max(0, Number(data.championDogs) || 0),
        championBitches: Math.max(0, Number(data.championBitches) || 0),
      };
      localStorage.setItem(DOG_SHOW_CALCULATOR_KEY, JSON.stringify(dogShowCalculatorState));
      renderDogShow();
      return;
    }
    if (event.target.id !== "dogShowPackingForm") return;
    event.preventDefault();
    await addDogShowPackingItem(event.target);
  });

  page.addEventListener("click", async (event) => {
    const progressTab = event.target.closest("[data-progress-tab]");
    if (progressTab) {
      dogShowProgressTab = progressTab.dataset.progressTab;
      localStorage.setItem(DOG_SHOW_PROGRESS_TAB_KEY, dogShowProgressTab);
      renderDogShow();
      return;
    }
    const filter = event.target.closest("[data-dog-filter]");
    if (filter) { dogShowDogFilter = filter.dataset.dogFilter; renderDogShow(); return; }
    const taskFilter = event.target.closest("[data-task-filter]");
    if (taskFilter) { dogShowTaskFilter = taskFilter.dataset.taskFilter; renderDogShow(); return; }
    const taskDayToggle = event.target.closest("[data-task-day-toggle]");
    if (taskDayToggle) {
      setDogShowExpandedTaskDay(dogShowActiveEvent(), taskDayToggle.getAttribute("aria-expanded") === "true" ? "" : taskDayToggle.dataset.taskDayToggle);
      renderDogShow();
      return;
    }
    const calendarView = event.target.closest("[data-calendar-view]");
    if (calendarView) {
      dogShowCalendarView = calendarView.dataset.calendarView === "day" ? "day" : "weekend";
      localStorage.setItem(DOG_SHOW_CALENDAR_VIEW_KEY, dogShowCalendarView);
      renderDogShow();
      return;
    }
    const dayOffset = event.target.closest("[data-calendar-day-offset]");
    if (dayOffset) {
      const days = dogShowShowDays(dogShowActiveEvent());
      const index = days.findIndex((date) => dogShowDateKey(date) === dogShowCalendarDate);
      const next = days[index + Number(dayOffset.dataset.calendarDayOffset || 0)];
      if (next) {
        dogShowCalendarDate = dogShowDateKey(next);
        localStorage.setItem(DOG_SHOW_CALENDAR_DATE_KEY, dogShowCalendarDate);
        renderDogShow();
      }
      return;
    }
    const masterCalendarView = event.target.closest("[data-show-master-calendar-view]");
    if (masterCalendarView) {
      dogShowMasterCalendarView = masterCalendarView.dataset.showMasterCalendarView || "month";
      localStorage.setItem(DOG_SHOW_MASTER_CALENDAR_VIEW_KEY, dogShowMasterCalendarView);
      renderDogShow();
      return;
    }
    const masterCalendarOffset = event.target.closest("[data-show-calendar-offset]");
    if (masterCalendarOffset) {
      const anchor = dogShowMasterDate();
      const offset = Number(masterCalendarOffset.dataset.showCalendarOffset || 0);
      if (dogShowMasterCalendarView === "year") anchor.setFullYear(anchor.getFullYear() + offset);
      else if (dogShowMasterCalendarView === "month") anchor.setMonth(anchor.getMonth() + offset);
      else anchor.setDate(anchor.getDate() + (dogShowMasterCalendarView === "week" ? 7 : 1) * offset);
      dogShowMasterCalendarDate = dogShowDateKey(anchor);
      localStorage.setItem(DOG_SHOW_MASTER_CALENDAR_DATE_KEY, dogShowMasterCalendarDate);
      renderDogShow();
      return;
    }
    const masterCalendarToday = event.target.closest("[data-show-calendar-today]");
    if (masterCalendarToday) {
      dogShowMasterCalendarDate = todayDate();
      localStorage.setItem(DOG_SHOW_MASTER_CALENDAR_DATE_KEY, dogShowMasterCalendarDate);
      renderDogShow();
      return;
    }
    const masterCalendarJump = event.target.closest("[data-show-calendar-jump-date]");
    if (masterCalendarJump) {
      dogShowMasterCalendarDate = masterCalendarJump.dataset.showCalendarJumpDate || todayDate();
      dogShowMasterCalendarView = masterCalendarJump.dataset.showCalendarJumpView || dogShowMasterCalendarView;
      localStorage.setItem(DOG_SHOW_MASTER_CALENDAR_DATE_KEY, dogShowMasterCalendarDate);
      localStorage.setItem(DOG_SHOW_MASTER_CALENDAR_VIEW_KEY, dogShowMasterCalendarView);
      renderDogShow();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const entry = action.dataset.id ? dogShowEntries().find((item) => item.id === action.dataset.id) : null;
    if (action.dataset.action === "apply-show-table-status") {
      const selectedIds = [...page.querySelectorAll("[data-show-table-select]:checked")].map((input) => input.dataset.showTableSelect);
      const status = page.querySelector("[data-show-table-bulk-status]")?.value || "Going";
      if (!selectedIds.length) {
        showToast("Select at least one show to update.");
        return;
      }
      action.disabled = true;
      const saved = await saveDogShowTableStatuses(selectedIds, status);
      if (saved) showToast(`${selectedIds.length} show${selectedIds.length === 1 ? "" : "s"} updated to ${dogShowEventStatus(status)}.`);
      return;
    }
    if (action.dataset.action === "open-show-table-event") {
      openDogShowPlannerEvent(action.dataset.eventId || "");
      return;
    }
    if (action.dataset.action === "manage-show-table-team") {
      openDogShowQuickTeamForm(action.dataset.eventId || "");
      return;
    }
    if (action.dataset.action === "edit-show-table-event") {
      const selectedEvent = dogShowEvents().find((candidate) => candidate.id === action.dataset.eventId);
      if (selectedEvent) openDogShowEventForm(selectedEvent);
      return;
    }
    if (action.dataset.action === "new-show-event") openDogShowEventForm();
    if (action.dataset.action === "edit-show-event") openDogShowEventForm(dogShowActiveEvent() || {});
    if (action.dataset.action === "open-show-progress") setDogShowView("progress");
    if (action.dataset.action === "open-show-planner") setDogShowView("planner");
    if (action.dataset.action === "open-show-calendar") setDogShowView("calendar");
    if (action.dataset.action === "open-show-calculator") setDogShowView("calculator");
    if (action.dataset.action === "open-show-expenses") setDogShowView("expenses");
    if (action.dataset.action === "new-show-expense") openDogShowExpenseForm();
    if (action.dataset.action === "edit-show-expense") {
      const expense = dogShowExpenses(dogShowActiveEvent()).find((candidate) => candidate.id === action.dataset.expenseId);
      if (expense) openDogShowExpenseForm(expense);
    }
    if (action.dataset.action === "remove-show-expense") await removeDogShowExpense(action.dataset.expenseId || "");
    if (action.dataset.action === "edit-show-plan") openDogShowPlannerForm();
    if (action.dataset.action === "view-show-decision") openDogShowPlannerDecision(action.dataset.showId || "");
    if (action.dataset.action === "open-planner-judge-history") openDogShowJudgeEvidence(action.dataset.judge || "", "entries", dogShowPlannerRecord().dogKeys || []);
    if (action.dataset.action === "save-potential-show") await saveDogShowPotentialShow(action.dataset.showId || "");
    if (action.dataset.action === "add-potential-show") openDogShowPotentialEvent(action.dataset.candidateId || "");
    if (action.dataset.action === "remove-potential-show") await removeDogShowPotentialShow(action.dataset.candidateId || "");
    if (action.dataset.action === "add-planned-show") openDogShowPlannedEvent(action.dataset.showId || "");
    if (action.dataset.action === "remove-planned-show") await removeDogShowPlannedEvent(action.dataset.showId || "");
    if (action.dataset.action === "open-planner-show-event") openDogShowPlannerEvent(action.dataset.eventId || "");
    if (action.dataset.action === "open-show-calendar-item") {
      if (action.dataset.kind === "potential") {
        const candidateId = action.dataset.candidateId || "";
        setDogShowView("planner");
        requestAnimationFrame(() => {
          const card = [...document.querySelectorAll("[data-candidate-id]")].find((item) => item.dataset.candidateId === candidateId);
          const stage = card?.closest("details");
          if (stage) stage.open = true;
          card?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      } else {
        openDogShowCalendarEvent(action.dataset.eventIds || "", action.dataset.eventId || "");
      }
    }
    if (action.dataset.action === "open-judge-evidence") openDogShowJudgeEvidence(dogShowProgressJudge, action.dataset.evidenceKind || "entries");
    if (action.dataset.action === "select-progress-dog") {
      dogShowProgressDogKey = action.dataset.dogKey || "";
      dogShowProgressTab = "dogs";
      localStorage.setItem(DOG_SHOW_PROGRESS_TAB_KEY, dogShowProgressTab);
      renderDogShow();
    }
    if (action.dataset.action === "edit-career-baseline") openDogShowCareerProfileForm(action.dataset.dogKey || dogShowProgressDogKey);
    if (action.dataset.action === "select-progress-judge") {
      dogShowProgressJudge = action.dataset.judge || "";
      dogShowProgressTab = "judges";
      localStorage.setItem(DOG_SHOW_PROGRESS_TAB_KEY, dogShowProgressTab);
      renderDogShow();
    }
    if (action.dataset.action === "edit-judge-note") openDogShowJudgeNoteForm(action.dataset.judge || dogShowProgressJudge);
    if (action.dataset.action === "open-progress-result") openDogShowProgressResult(action.dataset.resultId || "");
    if (action.dataset.action === "add-show-dogs") openDogShowAddDogsForm();
    if (action.dataset.action === "open-show-dog" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "open-show-potty" && entry) openDogShowPottyPicker(entry);
    if (action.dataset.action === "open-bulk-show-potty") openDogShowBulkPottyPicker();
    if (action.dataset.action === "bulk-show-log") await createDogShowBulkCareLogs(action.dataset.logType);
    if (action.dataset.action === "quick-show-log" && entry) {
      action.disabled = true;
      await createDogShowLog(entry, action.dataset.logType, `${action.dataset.logType} logged`);
      showToast(`${action.dataset.logType} logged for ${dogShowEntryName(entry)}.`);
    }
    if (action.dataset.action === "open-show-note" && entry) openDogShowNoteForm(entry, action.dataset.logType || "Note");
    if (action.dataset.action === "edit-show-entry" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "open-show-prep" && entry) {
      const schedule = dogShowRingSchedules(entry).find((item) => item.id === action.dataset.ringScheduleId);
      if (schedule) await openDogShowPrepTask(entry, schedule);
    }
    if (action.dataset.action === "new-show-task") openDogShowTaskForm({ dueAt: action.dataset.dueAt || "" });
    if (action.dataset.action === "edit-show-task") openDogShowTaskForm(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "open-calendar-task") openDogShowCalendarTask(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "complete-show-task") await completeDogShowTasks([action.dataset.id]);
    if (action.dataset.action === "complete-selected-show-tasks") await completeDogShowTasks([...dogShowSelectedTaskIds]);
    if (action.dataset.action === "select-visible-show-tasks") {
      const visibleTaskIds = dogShowTasks().filter(dogShowTaskMatchesFilter).filter((task) => task.status !== "Completed").map((task) => task.id);
      const unselectVisible = visibleTaskIds.length > 0 && visibleTaskIds.every((id) => dogShowSelectedTaskIds.has(id));
      visibleTaskIds.forEach((id) => unselectVisible ? dogShowSelectedTaskIds.delete(id) : dogShowSelectedTaskIds.add(id));
      renderDogShow();
    }
    if (action.dataset.action === "create-water-round") await createDogShowWaterRound();
    if (action.dataset.action === "show-helper-summary") openDogShowHelperSummary();
    if (action.dataset.action === "show-result-summary") openDogShowResultSummary();
    if (action.dataset.action === "remove-packing-item") await removeDogShowPackingItem(action.dataset.id);
    if (action.dataset.action === "return-boarding-dashboard") switchPage("dashboardPage", { history: "push" });
  });

  page.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-calendar-task-id]");
    if (!card) return;
    dogShowCalendarDragTaskId = card.dataset.calendarTaskId || "";
    card.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", dogShowCalendarDragTaskId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  });

  page.addEventListener("dragover", (event) => {
    const slot = event.target.closest(".dog-show-calendar-slot[data-due-at]");
    if (!slot || !dogShowCalendarDragTaskId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    page.querySelectorAll(".dog-show-calendar-slot.is-drop-target").forEach((item) => item.classList.remove("is-drop-target"));
    slot.classList.add("is-drop-target");
  });

  page.addEventListener("drop", async (event) => {
    const slot = event.target.closest(".dog-show-calendar-slot[data-due-at]");
    if (!slot || !dogShowCalendarDragTaskId) return;
    event.preventDefault();
    const taskId = dogShowCalendarDragTaskId;
    dogShowCalendarDragTaskId = "";
    await moveDogShowCalendarTask(taskId, slot.dataset.dueAt);
  });

  page.addEventListener("dragend", () => {
    dogShowCalendarDragTaskId = "";
    page.querySelectorAll(".is-dragging, .is-drop-target").forEach((item) => item.classList.remove("is-dragging", "is-drop-target"));
  });

  document.getElementById("dogShowMoreBackdrop")?.addEventListener("click", () => setDogShowMoreMenuOpen(false));
  document.getElementById("dogShowMoreMenu")?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-dog-show-more-action]");
    if (!action) return;
    setDogShowMoreMenuOpen(false);
    if (action.dataset.dogShowMoreAction === "operations") setDogShowView("more");
    if (action.dataset.dogShowMoreAction === "progress") setDogShowView("progress");
    if (action.dataset.dogShowMoreAction === "planner") setDogShowView("planner");
    if (action.dataset.dogShowMoreAction === "calendar") setDogShowView("calendar");
    if (action.dataset.dogShowMoreAction === "calculator") setDogShowView("calculator");
    if (action.dataset.dogShowMoreAction === "expenses") setDogShowView("expenses");
    if (action.dataset.dogShowMoreAction === "boarding") switchPage("dashboardPage", { history: "push" });
  });

  dialog?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target.id === "dogShowAkcJudgeSearchForm") {
      submitDogShowAkcJudgeSearch(event.target);
      return;
    }
    if (event.target.id === "dogShowEventForm") await saveDogShowEvent(event.target);
    if (event.target.id === "dogShowQuickTeamForm") await saveDogShowQuickTeam(event.target);
    if (event.target.id === "dogShowAddDogsForm") await saveDogShowDogs(event.target);
    if (event.target.id === "dogShowEntryForm") await saveDogShowEntry(event.target);
    if (event.target.id === "dogShowNoteForm") await saveDogShowNote(event.target);
    if (event.target.id === "dogShowResultForm") await saveDogShowResult(event.target);
    if (event.target.id === "dogShowCareerProfileForm") await saveDogShowCareerProfile(event.target);
    if (event.target.id === "dogShowJudgeNoteForm") await saveDogShowJudgeNote(event.target);
    if (event.target.id === "dogShowTaskForm") await saveDogShowTask(event.target);
    if (event.target.id === "dogShowPlannerForm") await saveDogShowPlanner(event.target);
    if (event.target.id === "dogShowExpenseForm") await saveDogShowExpense(event.target);
  });

  dialog?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const entry = action.dataset.id ? dogShowEntries().find((item) => item.id === action.dataset.id) : null;
    if (action.dataset.action === "add-ring-schedule") {
      const rows = dialog.querySelector("#dogShowRingScheduleRows");
      const schedule = { id: uid("showRing"), ringDate: dogShowActiveEvent()?.startDate || todayDate(), prepMinutes: 45, readyBufferMinutes: 15 };
      setDogShowRingRowOpen(schedule.id, true);
      rows?.insertAdjacentHTML("beforeend", dogShowRingScheduleRowHtml(schedule, rows.children.length));
      refreshDogShowRingScheduleRows(action.closest("form"));
      rows?.lastElementChild?.querySelector('input[name="ringDate"]')?.focus();
      return;
    }
    if (action.dataset.action === "remove-ring-schedule") {
      const row = action.closest("[data-ring-schedule-row]");
      removeDogShowRingRowState(row?.dataset.scheduleId || "");
      row?.remove();
      refreshDogShowRingScheduleRows(action.closest("form"));
      return;
    }
    if (action.dataset.action === "toggle-ring-schedule") {
      const row = action.closest("[data-ring-schedule-row]");
      requestAnimationFrame(() => setDogShowRingRowOpen(row?.dataset.scheduleId || "", Boolean(row?.open)));
      return;
    }
    if (action.dataset.action === "toggle-show-timeline-day") {
      const day = action.closest("[data-show-timeline-day]");
      requestAnimationFrame(() => {
        if (day?.open) hydrateDogShowTimelineDay(day);
      });
      return;
    }
    if (action.dataset.action === "apply-point-estimate") {
      const resultForm = action.closest("#dogShowResultForm");
      refreshDogShowPointEstimate(resultForm, true);
      if (resultForm) resultForm.dataset.pointEstimateAuto = "false";
      return;
    }
    if (action.dataset.action === "close-show-dialog") dialog.close();
    if (action.dataset.action === "open-planner-judge-history") openDogShowJudgeEvidence(action.dataset.judge || "", "entries", dogShowPlannerRecord().dogKeys || []);
    if (action.dataset.action === "open-progress-result") openDogShowProgressResult(action.dataset.resultId || "");
    if (action.dataset.action === "edit-show-event") openDogShowEventForm(dogShowActiveEvent() || {});
    if (action.dataset.action === "edit-show-task") openDogShowTaskForm(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "duplicate-show-task") openDuplicateDogShowTask(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "delete-show-task") await removeDogShowTask(action.dataset.id);
    if (action.dataset.action === "remove-show-log") await removeDogShowLog(action.dataset.id, action.dataset.entryId);
    if (action.dataset.action === "complete-show-prep") await completeDogShowPrep(action.dataset.id, action.dataset.ringScheduleId);
    if (action.dataset.action === "complete-show-task") {
      await completeDogShowTasks([action.dataset.id]);
      dialog.close();
    }
    if (action.dataset.action === "back-to-show-dog" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "back-to-show-results" && entry) openDogShowResultPicker(entry);
    if (action.dataset.action === "open-show-dog" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "open-show-potty" && entry) openDogShowPottyPicker(entry);
    if (action.dataset.action === "quick-show-potty" && entry) {
      const pottyType = action.dataset.pottyType || "";
      if (!pottyType) return;
      action.disabled = true;
      await createDogShowLog(entry, "Potty", pottyType, { pottyType });
      dialog.close();
      showToast(`${pottyType} logged for ${dogShowEntryName(entry)}.`);
    }
    if (action.dataset.action === "quick-show-bulk-potty") {
      const pottyType = action.dataset.pottyType || "";
      if (!pottyType) return;
      action.disabled = true;
      const logged = await createDogShowBulkCareLogs("Potty", { pottyType });
      if (logged) dialog.close();
      else action.disabled = false;
    }
    if (action.dataset.action === "quick-show-log" && entry) {
      const button = action;
      button.disabled = true;
      const createdLog = await createDogShowLog(entry, action.dataset.logType, `${action.dataset.logType} logged`);
      openDogShowEntryForm(entry, { type: action.dataset.logType, loggedAt: createdLog?.loggedAt || new Date().toISOString(), helperName: createdLog?.helperName || "" });
      showToast(`${action.dataset.logType} logged for ${dogShowEntryName(entry)}.`);
    }
    if (action.dataset.action === "open-show-note" && entry) openDogShowNoteForm(entry, action.dataset.logType || "Note");
    if (action.dataset.action === "open-show-result" && entry) {
      const ringScheduleId = action.dataset.ringScheduleId || "";
      if (ringScheduleId || entry.attendanceRole !== "Showing") openDogShowResultForm(entry, ringScheduleId);
      else openDogShowResultPicker(entry);
    }
    if (action.dataset.action === "remove-show-entry" && entry && window.confirm(`Remove ${dogShowEntryName(entry)} from this show?`)) {
      await saveDogShowRecord("showEntry", { ...entry, removed: true, removedAt: new Date().toISOString(), removedBy: currentUser?.email || "" });
      dialog.close();
      renderDogShow();
      showToast("Dog removed from this show only.");
    }
  });
}

Object.assign(globalThis, {
  renderDogShow,
  setupDogShowEventListeners,
  syncDogShowShell,
});
