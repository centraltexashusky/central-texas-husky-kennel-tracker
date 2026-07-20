// === MODULE: DOG SHOW ===
const DOG_SHOW_VIEW_KEY = "cth-dog-show-view";
const DOG_SHOW_EVENT_KEY = "cth-dog-show-active-event";
const DOG_SHOW_CALENDAR_VIEW_KEY = "cth-dog-show-calendar-view";
const DOG_SHOW_CALENDAR_DATE_KEY = "cth-dog-show-calendar-date";
const DOG_SHOW_TASK_DAY_KEY = "cth-dog-show-task-expanded-day";
const DOG_SHOW_RING_ROW_STATE_KEY = "cth-dog-show-ring-row-state";
const DOG_SHOW_PROGRESS_TAB_KEY = "cth-dog-show-progress-tab";
const DOG_SHOW_CALENDAR_SLOT_MINUTES = 15;
const DOG_SHOW_STALE_MINUTES = 60;
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

let dogShowView = ["home", "dogs", "schedule", "tasks", "more", "progress"].includes(localStorage.getItem(DOG_SHOW_VIEW_KEY))
  ? localStorage.getItem(DOG_SHOW_VIEW_KEY)
  : "home";
let dogShowDogFilter = "all";
let dogShowDogQuery = "";
let dogShowTaskFilter = "open";
let dogShowSelectedTaskIds = new Set();
let dogShowCalendarView = ["weekend", "day"].includes(localStorage.getItem(DOG_SHOW_CALENDAR_VIEW_KEY)) ? localStorage.getItem(DOG_SHOW_CALENDAR_VIEW_KEY) : "weekend";
let dogShowCalendarDate = localStorage.getItem(DOG_SHOW_CALENDAR_DATE_KEY) || "";
let dogShowCalendarDragTaskId = "";
let dogShowBulkCarePending = false;
let dogShowProgressTab = ["overview", "dogs", "judges"].includes(localStorage.getItem(DOG_SHOW_PROGRESS_TAB_KEY)) ? localStorage.getItem(DOG_SHOW_PROGRESS_TAB_KEY) : "overview";
let dogShowProgressDogKey = "";
let dogShowProgressJudge = "";

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
    prepMinutes: entry.prepMinutes,
    readyBufferMinutes: entry.readyBufferMinutes,
  }] : [];
  return source.map((schedule, index) => ({
    ...schedule,
    id: schedule.id || `${entry.id || "entry"}-ring-${index + 1}`,
    prepMinutes: Number(schedule.prepMinutes ?? entry.prepMinutes ?? 45),
    readyBufferMinutes: Number(schedule.readyBufferMinutes ?? entry.readyBufferMinutes ?? 15),
  }));
}

function dogShowRingDateTime(entry = {}, schedule = dogShowRingSchedules(entry)[0] || {}) {
  return dogShowDateTime(schedule.ringDate || entry.ringDate, schedule.ringTime || entry.ringTime);
}

function dogShowPrepTimes(entry = {}, schedule = dogShowRingSchedules(entry)[0] || {}) {
  const ring = dogShowRingDateTime(entry, schedule);
  if (!ring) return { ring: null, ready: null, start: null };
  const buffer = Math.max(0, Number(schedule.readyBufferMinutes ?? entry.readyBufferMinutes ?? 15));
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

function dogShowEventOptions(active = dogShowActiveEvent()) {
  const events = dogShowEvents();
  if (!events.length) return `<option value="">No shows yet</option>`;
  return events.map((event) => {
    const weekend = `${dogShowFormatMonthDay(event.startDate)} - ${dogShowFormatMonthDay(event.endDate || event.startDate)}`;
    return `<option value="${escapeHtml(event.id)}"${event.id === active?.id ? " selected" : ""}>${escapeHtml(`${event.name || "Untitled Show"} · ${weekend}`)}${event.status === "Completed" ? " - Completed" : ""}</option>`;
  }).join("");
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
  const majorRatio = progress.targetMajors ? progress.totalMajors / progress.targetMajors : 1;
  return Math.max(0, Math.min(100, Math.round(Math.min(pointRatio, majorRatio) * 100)));
}

function dogShowProgressBarHtml(progress = {}) {
  const percent = dogShowProgressPercent(progress);
  return `<div class="dog-show-title-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>`;
}

function dogShowJudgeNotes() {
  return dogShowProgressRecords("judgeNote").sort((left, right) => String(left.judgeName || "").localeCompare(String(right.judgeName || "")));
}

function dogShowJudgeNameKey(name = "") {
  return String(name || "").trim().toLowerCase();
}

function dogShowObservedJudges() {
  const names = new Map();
  dogShowRecords("showEntry").forEach((entry) => dogShowRingSchedules(entry).forEach((schedule) => {
    if (schedule.judge) names.set(dogShowJudgeNameKey(schedule.judge), schedule.judge.trim());
  }));
  dogShowAppearanceResultsAll().forEach((result) => {
    if (result.judge) names.set(dogShowJudgeNameKey(result.judge), result.judge.trim());
  });
  dogShowJudgeNotes().forEach((note) => {
    if (note.judgeName) names.set(dogShowJudgeNameKey(note.judgeName), note.judgeName.trim());
  });
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}

function dogShowJudgeEvidence(name = "") {
  const key = dogShowJudgeNameKey(name);
  const results = dogShowAppearanceResultsAll().filter((result) => dogShowJudgeNameKey(result.judge) === key);
  return {
    results,
    placements: results.filter((result) => ["Win", "Placement"].includes(result.outcome)).length,
    points: results.reduce((total, result) => total + dogShowPointValue(result), 0),
    majors: results.reduce((total, result) => total + dogShowMajorValue(result), 0),
  };
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
    return `<button type="button" class="dog-show-progress-history-row" data-action="open-progress-result" data-result-id="${escapeHtml(result.id)}"><span class="dog-show-history-date">${escapeHtml(dogShowFormatDate(result.ringDate || event.startDate))}</span><span><strong>${escapeHtml(event.name || result.showName || "Dog Show")}</strong><small>${escapeHtml([result.ringNumber ? `Ring ${result.ringNumber}` : "Ring not set", result.classEntered || "Class not set", result.judge ? `Judge: ${result.judge}` : "Judge not set"].join(" · "))}</small><em>${escapeHtml([dogShowOutcomeLabel(result.outcome), result.placement, result.awards].filter(Boolean).join(" · ") || "Result logged")}</em></span><span class="dog-show-history-points"><strong>+${points}</strong><small>${dogShowMajorValue(result) ? "Major" : "points"}</small></span></button>`;
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
    return `<button type="button" data-action="select-progress-judge" data-judge="${escapeHtml(judge)}" class="${dogShowJudgeNameKey(judge) === dogShowJudgeNameKey(dogShowProgressJudge) ? "is-active" : ""}"><span class="dog-show-judge-rating is-${escapeHtml(String(judgeNote.recommendation || "Watch").toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(judgeNote.recommendation || "Watch")}</span><strong>${escapeHtml(judge)}</strong><small>${dogShowJudgeEvidence(judge).results.length} logged results</small></button>`;
  }).join("")}</aside><div class="dog-show-judge-detail">${dogShowProgressJudge ? `<section class="dog-show-judge-hero"><div><span>Judge Intelligence</span><h3>${escapeHtml(dogShowProgressJudge)}</h3><p>${escapeHtml(note.preferenceTags || "No preference tags yet")}</p></div><button type="button" class="secondary-button" data-action="edit-judge-note" data-judge="${escapeHtml(dogShowProgressJudge)}">Edit Notes</button></section><section class="dog-show-progress-breakdown"><div><span>Entries logged</span><strong>${evidence.results.length}</strong><small>Under this judge</small></div><div><span>Placements</span><strong>${evidence.placements}</strong><small>Wins and placements</small></div><div><span>Points</span><strong>${evidence.points}</strong><small>${evidence.majors} majors</small></div></section><section class="dog-show-progress-section"><header><div><h3>Team Notes</h3><p>Internal observations only. Treat patterns as guidance, not guarantees.</p></div></header><dl class="dog-show-judge-notes"><div><dt>Recommendation</dt><dd>${escapeHtml(note.recommendation || "Watch")}</dd></div><div><dt>Best fit dogs</dt><dd>${escapeHtml(note.bestFitDogs || "Not recorded")}</dd></div><div><dt>Preferences</dt><dd>${escapeHtml(note.preferenceTags || "Not recorded")}</dd></div><div><dt>Notes</dt><dd>${escapeHtml(note.notes || "No internal notes yet")}</dd></div></dl></section>` : dogShowRenderEmpty("No judges found", "Add a judge note or enter judges on ring appearances.", "edit-judge-note", "Add Judge")}</div></div>`;
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
      <button type="button" data-action="open-show-progress"><span>P</span><strong>Show Progress</strong><small>Career points, show history, and judge notes</small></button>
    </div>
    <section class="dog-show-panel"><div class="dog-show-panel-heading"><div><h3>Packing List</h3><p>${packing.filter((item) => item.completed).length} of ${packing.length} packed</p></div></div>
      <div class="dog-show-packing-list">${packing.map((item) => `<div class="dog-show-packing-item"><label><input type="checkbox" data-packing-id="${escapeHtml(item.id)}"${item.completed ? " checked" : ""}/><span>${escapeHtml(item.label)}</span></label><button type="button" class="dog-show-remove-packing" data-action="remove-packing-item" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.label)}" title="Remove item">×</button></div>`).join("")}</div>
      <form id="dogShowPackingForm" class="dog-show-inline-form"><input type="text" name="label" placeholder="Add packing item" required/><button type="submit">Add</button></form>
    </section>
    <section class="dog-show-panel"><div class="dog-show-panel-heading"><div><h3>Weekend Helpers</h3><p>${helperEmails.length ? helperEmails.map(dogShowStaffLabel).join(" · ") : "No weekend helper list selected yet."}</p></div><button type="button" class="secondary-button" data-action="edit-show-event">Edit</button></div></section>
  </div>`;
}

function renderDogShow() {
  const content = document.getElementById("dogShowContent");
  if (!content) return;
  const event = dogShowActiveEvent();
  const select = document.getElementById("dogShowEventSelect");
  if (select) select.innerHTML = dogShowEventOptions(event);
  document.querySelectorAll("[data-dog-show-view]").forEach((button) => {
    const visibleView = dogShowView === "progress" ? "more" : dogShowView;
    const active = button.dataset.dogShowView === visibleView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (!event && dogShowView !== "progress") {
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
  };
  content.innerHTML = renderers[dogShowView](event);
  if (typeof scheduleProfilePhotoHydrationSweep === "function") scheduleProfilePhotoHydrationSweep(40);
}

function setDogShowView(view = "home") {
  if (!["home", "dogs", "schedule", "tasks", "more", "progress"].includes(view)) return;
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
    <div class="field-grid">
      <label class="dog-show-field-wide dog-show-status-field">Status<select name="status"><option${event.status !== "Completed" ? " selected" : ""}>Active</option><option${event.status === "Completed" ? " selected" : ""}>Completed</option></select></label>
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

function dogShowRingScheduleRowHtml(schedule = {}, index = 0) {
  const prep = dogShowPrepTimes({}, schedule);
  const scheduleId = schedule.id || uid("showRing");
  return `<details class="dog-show-ring-schedule-row" data-ring-schedule-row data-schedule-id="${escapeHtml(scheduleId)}"${dogShowRingRowIsOpen(scheduleId) ? " open" : ""}>
    <summary class="dog-show-ring-schedule-heading" data-action="toggle-ring-schedule"><span><strong>Ring appearance ${index + 1}</strong><small data-ring-schedule-summary>${escapeHtml([dogShowFormatDate(schedule.ringDate), schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring not set"].join(" · "))}</small></span></summary>
    <div class="dog-show-ring-schedule-content"><div class="dog-show-ring-schedule-actions"><button type="button" class="dog-show-remove-ring" data-action="remove-ring-schedule" aria-label="Remove ring appearance" title="Remove ring appearance">×</button></div>
    <div class="field-grid dog-show-ring-schedule-grid">
      <label>Ring date<input type="date" name="ringDate" value="${escapeHtml(schedule.ringDate || "")}"/></label>
      <label>Ring time<input type="time" name="ringTime" value="${escapeHtml(schedule.ringTime || "")}"/></label>
      <label>Ring number<input name="ringNumber" value="${escapeHtml(schedule.ringNumber || "")}" placeholder="14"/></label>
      <label>Class entered<input name="classEntered" value="${escapeHtml(schedule.classEntered || "")}" placeholder="Open Bitch"/></label>
      <label>Prep minutes<input type="number" name="prepMinutes" min="0" max="240" step="5" value="${Number(schedule.prepMinutes ?? 45)}"/></label>
      <label>Ready-before-ring buffer<input type="number" name="readyBufferMinutes" min="0" max="60" step="5" value="${Number(schedule.readyBufferMinutes ?? 15)}"/></label>
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
    if (heading) heading.textContent = `Ring appearance ${index + 1}`;
    if (summary) summary.textContent = [dogShowFormatDate(schedule.ringDate), schedule.ringNumber ? `Ring ${schedule.ringNumber}` : "Ring not set"].join(" · ");
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
      <details class="dog-show-collapsible-section dog-show-ring-schedules" data-show-ring-appearances${entry.attendanceRole === "Showing" ? "" : " hidden"}${viewState.ringSchedulesOpen === false ? "" : " open"}><summary><span><strong>Ring Appearances</strong><small data-ring-appearance-count>${ringSchedules.length} scheduled</small></span></summary><div class="dog-show-collapsible-content dog-show-ring-schedules-content"><div class="dog-show-ring-schedules-toolbar"><p>Add a separate assignment for each show day, ring, or class.</p><button type="button" class="secondary-button" data-action="add-ring-schedule">Add Ring Appearance</button></div><div id="dogShowRingScheduleRows">${ringSchedules.map(dogShowRingScheduleRowHtml).join("")}</div></div></details>
      <label>Show notes<textarea name="notes" rows="2">${escapeHtml(entry.notes || "")}</textarea></label>
      <div class="button-row"><button type="submit">Save Dog</button><button type="button" class="secondary-button" data-action="remove-show-entry" data-id="${escapeHtml(entry.id)}">Remove From Show</button></div>
    </form>
    <section class="dog-show-dialog-section"><h3>Show Timeline</h3><div class="dog-show-log-timeline">${logs.length ? logs.map((log) => `<article><strong>${escapeHtml(log.activityType || "Care")}</strong><span>${escapeHtml(log.note || "Logged")}</span><small>${escapeHtml(dogShowFormatDateTime(log.loggedAt || log.updatedAt))} · ${escapeHtml(log.helperName || dogShowStaffLabel(log.helperEmail))}${log.customerVisible ? " · Owner visible" : ""}</small>${canRemoveLogs ? `<button type="button" class="dog-show-remove-log" data-action="remove-show-log" data-id="${escapeHtml(log.id)}" data-entry-id="${escapeHtml(entry.id)}" aria-label="Remove ${escapeHtml(dogShowCareLogName(log))} log" title="Remove logged item">×</button>` : ""}</article>`).join("") : "<p>No show care logged yet.</p>"}</div></section>`);
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
    return `<button type="button" data-action="open-show-result" data-id="${escapeHtml(entry.id)}" data-ring-schedule-id="${escapeHtml(schedule.id)}"><strong>${escapeHtml(dogShowRingAppearanceTitle(schedule, index))}</strong><span>${escapeHtml(dogShowRingAppearanceMeta(schedule))}</span><small>${result ? escapeHtml([dogShowOutcomeLabel(result.outcome), result.placement, result.awards].filter(Boolean).join(" · ") || "Result logged") : "No result logged"}</small></button>`;
  }).join("")}</div><div class="button-row"><button type="button" class="secondary-button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Back to Dog</button></div></section>`);
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
  const resultContext = schedule
    ? `<div class="dog-show-result-context"><strong>${escapeHtml(dogShowRingAppearanceTitle(schedule, scheduleIndex))}</strong><span>${escapeHtml(dogShowRingAppearanceMeta(schedule))}</span></div>`
    : `<div class="dog-show-result-context"><strong>General show result</strong><span>No ring appearance is assigned.</span></div>`;
  openDogShowDialog(`Result: ${dogShowEntryName(entry)}`, `<form id="dogShowResultForm" class="tracker-form" data-entry-id="${escapeHtml(entry.id)}" data-ring-schedule-id="${escapeHtml(schedule?.id || "")}" data-id="${escapeHtml(result.id || "")}">
    ${resultContext}
    <div class="field-grid">
      <label>Outcome<select name="outcome">${["Win", "Placement", "No placement", "Scratched", "Socialization only"].map((value) => `<option value="${value}"${value === result.outcome ? " selected" : ""}>${dogShowOutcomeLabel(value)}</option>`).join("")}</select></label>
      <label>Placement<input name="placement" value="${escapeHtml(result.placement || "")}" placeholder="1st Open Bitch"/></label>
      <label>Awards<input name="awards" value="${escapeHtml(result.awards || "")}" placeholder="Winners Bitch, Best of Winners"/></label>
      <label>Points earned<input type="number" name="pointsEarned" min="0" max="5" step="1" value="${pointsEarned}"/></label>
    </div>
    <label class="inline-check"><input type="checkbox" name="isMajor"${dogShowMajorValue(result) ? " checked" : ""}/> This result earned a major</label>
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

async function saveDogShowEvent(form) {
  const existing = form.dataset.id ? readRecords("showEvent").find((event) => event.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  const helperEmails = [...form.querySelectorAll('input[name="helperEmails"]:checked')].map((input) => input.value);
  const packingItems = Array.isArray(existing.packingItems) && existing.packingItems.length
    ? existing.packingItems
    : DOG_SHOW_DEFAULT_PACKING.map((label, index) => ({ id: `packing-${Date.now()}-${index}`, label, completed: false }));
  const saved = await saveDogShowRecord("showEvent", { ...existing, ...data, id: existing.id || uid("showEvent"), helperEmails, packingItems, submittedAt: existing.submittedAt || new Date().toISOString(), helperEmail: currentUser?.email || "" });
  localStorage.setItem(DOG_SHOW_EVENT_KEY, saved.id);
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast("Show weekend saved.");
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
  const pointsEarned = Math.max(0, Number(data.pointsEarned || 0));
  const isMajor = Boolean(form.elements.isMajor?.checked);
  const ownerEmails = [sourceDog.ownerEmail, sourceDog.customerEmail, sourceDog.linkedOwnerEmail, sourceDog.secondaryOwnerEmail]
    .map(normalizeEmail)
    .filter(Boolean);
  const result = await saveDogShowRecord("showResult", {
    ...existing,
    ...data,
    recordKind: "appearanceResult",
    pointsEarned,
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
  await createDogShowLog(entry, "Result", [appearance, dogShowOutcomeLabel(data.outcome), data.placement, data.awards].filter(Boolean).join(" · ") || "Result logged", { customerVisible, ringScheduleId: result.ringScheduleId });
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
    return `<button type="button" data-action="open-show-result" data-id="${escapeHtml(result.showEntryId)}" data-ring-schedule-id="${escapeHtml(schedule?.id || "")}"><strong>${escapeHtml(result.dogName || dogShowEntryName(entry) || "Dog")}</strong><span>${escapeHtml([appearance, schedule ? dogShowRingAppearanceMeta(schedule) : ""].filter(Boolean).join(" · "))}</span><small>${escapeHtml([dogShowOutcomeLabel(result.outcome), result.placement, result.awards].filter(Boolean).join(" · ") || "Result logged")}</small></button>`;
  }).join("")}</div>` : dogShowRenderEmpty("No results logged", "Open a showing dog's card and choose a ring appearance to log its result.", "close-show-dialog", "Close"));
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
    if (event.target.matches('#dogShowTaskForm input[name="color"]')) {
      const output = event.target.closest("label")?.querySelector("output");
      if (output) output.textContent = String(event.target.value || "").toUpperCase();
    }
    if (event.target.closest("[data-ring-schedule-row]")) refreshDogShowRingScheduleRows(event.target.closest("form"));
  });

  dialog?.addEventListener("change", (event) => {
    const entryForm = event.target.closest("#dogShowEntryForm");
    if (entryForm && event.target.matches('[name="attendanceRole"], [name="status"]')) refreshDogShowAssignmentSummary(entryForm);
  });

  page.addEventListener("change", async (event) => {
    if (event.target.matches("[data-show-task-select]")) {
      if (event.target.checked) dogShowSelectedTaskIds.add(event.target.dataset.showTaskSelect);
      else dogShowSelectedTaskIds.delete(event.target.dataset.showTaskSelect);
      renderDogShow();
    }
    if (event.target.matches("[data-packing-id]")) await updateDogShowPackingItem(event.target.dataset.packingId, event.target.checked);
  });

  page.addEventListener("submit", async (event) => {
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
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const entry = action.dataset.id ? dogShowEntries().find((item) => item.id === action.dataset.id) : null;
    if (action.dataset.action === "new-show-event") openDogShowEventForm();
    if (action.dataset.action === "edit-show-event") openDogShowEventForm(dogShowActiveEvent() || {});
    if (action.dataset.action === "open-show-progress") setDogShowView("progress");
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
    if (action.dataset.action === "open-progress-result") {
      const result = dogShowAppearanceResultsAll().find((item) => item.id === action.dataset.resultId);
      if (result?.showEventId && result.showEntryId) {
        localStorage.setItem(DOG_SHOW_EVENT_KEY, result.showEventId);
        const resultEntry = dogShowEntries().find((item) => item.id === result.showEntryId);
        if (resultEntry) openDogShowResultForm(resultEntry, result.ringScheduleId || "");
      }
    }
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
    if (action.dataset.dogShowMoreAction === "boarding") switchPage("dashboardPage", { history: "push" });
  });

  dialog?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target.id === "dogShowEventForm") await saveDogShowEvent(event.target);
    if (event.target.id === "dogShowAddDogsForm") await saveDogShowDogs(event.target);
    if (event.target.id === "dogShowEntryForm") await saveDogShowEntry(event.target);
    if (event.target.id === "dogShowNoteForm") await saveDogShowNote(event.target);
    if (event.target.id === "dogShowResultForm") await saveDogShowResult(event.target);
    if (event.target.id === "dogShowCareerProfileForm") await saveDogShowCareerProfile(event.target);
    if (event.target.id === "dogShowJudgeNoteForm") await saveDogShowJudgeNote(event.target);
    if (event.target.id === "dogShowTaskForm") await saveDogShowTask(event.target);
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
    if (action.dataset.action === "close-show-dialog") dialog.close();
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
