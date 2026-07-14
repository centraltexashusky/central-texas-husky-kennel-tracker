// === MODULE: DOG SHOW ===
const DOG_SHOW_VIEW_KEY = "cth-dog-show-view";
const DOG_SHOW_EVENT_KEY = "cth-dog-show-active-event";
const DOG_SHOW_CALENDAR_VIEW_KEY = "cth-dog-show-calendar-view";
const DOG_SHOW_CALENDAR_DATE_KEY = "cth-dog-show-calendar-date";
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

let dogShowView = ["home", "dogs", "schedule", "tasks", "more"].includes(localStorage.getItem(DOG_SHOW_VIEW_KEY))
  ? localStorage.getItem(DOG_SHOW_VIEW_KEY)
  : "home";
let dogShowDogFilter = "all";
let dogShowDogQuery = "";
let dogShowTaskFilter = "open";
let dogShowSelectedTaskIds = new Set();
let dogShowCalendarView = ["weekend", "day"].includes(localStorage.getItem(DOG_SHOW_CALENDAR_VIEW_KEY)) ? localStorage.getItem(DOG_SHOW_CALENDAR_VIEW_KEY) : "weekend";
let dogShowCalendarDate = localStorage.getItem(DOG_SHOW_CALENDAR_DATE_KEY) || "";
let dogShowCalendarDragTaskId = "";

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

function dogShowTasks(event = dogShowActiveEvent()) {
  return event ? dogShowRecords("showDayTask", event.id) : [];
}

function dogShowLogs(event = dogShowActiveEvent()) {
  return event ? dogShowRecords("showCareLog", event.id) : [];
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

function dogShowTaskColor(task = {}) {
  return task.color || DOG_SHOW_TASK_COLORS[task.taskType] || DOG_SHOW_TASK_COLORS.General;
}

function dogShowDateTime(date = "", time = "") {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function dogShowRingDateTime(entry = {}) {
  return dogShowDateTime(entry.ringDate, entry.ringTime);
}

function dogShowPrepTimes(entry = {}) {
  const ring = dogShowRingDateTime(entry);
  if (!ring) return { ring: null, ready: null, start: null };
  const buffer = Math.max(0, Number(entry.readyBufferMinutes || 15));
  const duration = Math.max(0, Number(entry.prepMinutes || 45));
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
  return events.map((event) => `<option value="${escapeHtml(event.id)}"${event.id === active?.id ? " selected" : ""}>${escapeHtml(event.name || "Untitled Show")}${event.status === "Completed" ? " - Completed" : ""}</option>`).join("");
}

function dogShowAvatarText(name = "Dog") {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "D";
}

function dogShowPhotoHtml(entry = {}, className = "dog-show-dog-photo") {
  const dog = dogShowSourceDog(entry);
  const name = dogShowEntryName(entry);
  const photo = typeof profilePhotoDirectSource === "function" ? profilePhotoDirectSource(dog) : dog.profilePhotoUrl || "";
  const hasPhoto = typeof profilePhotoHasSource === "function" ? profilePhotoHasSource(dog) : Boolean(photo);
  if (!hasPhoto) return `<span class="${className} is-initials">${escapeHtml(dogShowAvatarText(name))}</span>`;
  const attrs = typeof profilePhotoAccessAttrs === "function" ? profilePhotoAccessAttrs({ ...dog, type: entry.dogType }, entry.dogType) : "";
  return `<span class="${className}"><img${photo ? ` src="${escapeHtml(photo)}"` : ""} alt="${escapeHtml(name)}"${attrs}${photo ? "" : " hidden"}/><span data-profile-photo-initials${photo ? " hidden" : ""}>${escapeHtml(dogShowAvatarText(name))}</span></span>`;
}

function dogShowResultForEntry(entry = {}, event = dogShowActiveEvent()) {
  return dogShowResults(event).find((result) => result.showEntryId === entry.id) || null;
}

function dogShowConflictEntryIds(entries = dogShowEntries()) {
  const conflicts = new Set();
  const showing = entries.filter((entry) => entry.attendanceRole === "Showing" && dogShowRingDateTime(entry));
  showing.forEach((left, index) => {
    const leftTimes = dogShowPrepTimes(left);
    const leftPeople = [left.handlerEmail, left.helperEmail].filter(Boolean).map(normalizeEmail);
    showing.slice(index + 1).forEach((right) => {
      const rightTimes = dogShowPrepTimes(right);
      const sharedPerson = [right.handlerEmail, right.helperEmail].filter(Boolean).map(normalizeEmail).some((email) => leftPeople.includes(email));
      const overlaps = leftTimes.start < rightTimes.ring && rightTimes.start < leftTimes.ring;
      if (sharedPerson && overlaps) {
        conflicts.add(left.id);
        conflicts.add(right.id);
      }
    });
  });
  return conflicts;
}

function dogShowEntryRowHtml(entry = {}, options = {}) {
  const state = dogShowAttentionState(entry);
  const lastLog = dogShowLastLog(entry);
  const prep = dogShowPrepTimes(entry);
  const showing = entry.attendanceRole === "Showing";
  const timestamp = lastLog ? dogShowFormatTime(lastLog.loggedAt || lastLog.updatedAt) : "No log";
  const timestampTitle = lastLog ? dogShowFormatDateTime(lastLog.loggedAt || lastLog.updatedAt) : "No care has been logged at this show.";
  const meta = showing
    ? [entry.dogType === "boardingDog" ? "Boarding" : "Our Dog", entry.ringNumber ? `Ring ${entry.ringNumber}` : "Ring missing", entry.ringTime ? dogShowFormatTime(prep.ring) : "Time missing", dogShowStaffLabel(entry.handlerEmail)].join(" · ")
    : [entry.dogType === "boardingDog" ? "Boarding" : "Our Dog", "Socialization", dogShowStaffLabel(entry.helperEmail || entry.handlerEmail)].join(" · ");
  return `<button type="button" class="dog-show-dog-row is-${state}${options.conflict ? " has-conflict" : ""}" data-action="open-show-dog" data-id="${escapeHtml(entry.id)}">
    ${dogShowPhotoHtml(entry)}
    <span class="dog-show-dog-copy"><strong>${escapeHtml(dogShowEntryName(entry))}</strong><small>${escapeHtml(meta)}</small></span>
    <span class="dog-show-dog-status"><span class="dog-show-time-chip is-${state}" title="${escapeHtml(timestampTitle)}">${escapeHtml(timestamp)}</span><span class="dog-show-role-chip">${showing ? "Show" : "Social"}</span></span>
  </button>`;
}

function dogShowRenderEmpty(title, copy, action = "new-show-event", label = "Create Show") {
  return `<section class="dog-show-empty"><span>S</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p><button type="button" data-action="${escapeHtml(action)}">${escapeHtml(label)}</button></section>`;
}

function dogShowHomeHtml(event) {
  const entries = dogShowEntries(event);
  const tasks = dogShowTasks(event);
  const results = dogShowResults(event);
  const conflicts = dogShowConflictEntryIds(entries);
  const needCare = entries.filter((entry) => dogShowAttentionState(entry) !== "current");
  const openTasks = tasks.filter((task) => task.status !== "Completed");
  const showing = entries.filter((entry) => entry.attendanceRole === "Showing");
  const nextRing = showing.map((entry) => ({ entry, time: dogShowRingDateTime(entry) })).filter((item) => item.time && item.time >= new Date()).sort((a, b) => a.time - b.time)[0];
  const nextActions = [...entries].sort((a, b) => {
    const careDiff = ["missing", "stale", "current"].indexOf(dogShowAttentionState(a)) - ["missing", "stale", "current"].indexOf(dogShowAttentionState(b));
    return careDiff || (dogShowPrepTimes(a).start?.getTime() || Infinity) - (dogShowPrepTimes(b).start?.getTime() || Infinity);
  }).slice(0, 10);
  const coverage = new Map();
  entries.forEach((entry) => {
    const email = entry.handlerEmail || entry.helperEmail || "";
    if (!email) return;
    coverage.set(email, (coverage.get(email) || 0) + 1);
  });
  const coverageText = [...coverage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([email, count]) => `${dogShowStaffLabel(email)} ${count}`).join(" · ") || "Assign handlers and helpers from each dog card.";
  return `<div class="dog-show-view dog-show-home-view">
    <section class="dog-show-event-summary"><div><span>Dog Shows</span><h3>${escapeHtml(event.name || "Show Weekend")}</h3><p>${escapeHtml([dogShowFormatDate(event.startDate), event.venue, event.cityState].filter(Boolean).join(" · "))}</p></div><button type="button" class="secondary-button" data-action="edit-show-event">Show Setup</button></section>
    <section class="dog-show-stat-grid">
      <article><span>Need care</span><strong>${needCare.length}</strong><small>stale or no log</small></article>
      <article><span>Next ring</span><strong>${nextRing ? dogShowFormatTime(nextRing.time) : "--"}</strong><small>${nextRing ? dogShowEntryName(nextRing.entry) : "No upcoming ring"}</small></article>
      <article><span>Open tasks</span><strong>${openTasks.length}</strong><small>${conflicts.size ? `${conflicts.size} schedule conflicts` : "team workload"}</small></article>
      <article><span>Results</span><strong>${results.length}/${showing.length}</strong><small>showing dogs logged</small></article>
    </section>
    <section class="dog-show-section-band"><div><h3>Next Actions</h3><p>Care status first, then preparation time.</p></div><button type="button" class="secondary-button" data-dog-show-view="dogs">All Dogs</button></section>
    <div class="dog-show-roster-list">${nextActions.length ? nextActions.map((entry) => dogShowEntryRowHtml(entry, { conflict: conflicts.has(entry.id) })).join("") : dogShowRenderEmpty("No dogs added", "Add Our Dogs or Boarding Dogs to this show weekend.", "add-show-dogs", "Add Dogs")}</div>
    <section class="dog-show-coverage"><div><h3>Team Coverage</h3><p>${escapeHtml(coverageText)}</p></div><div class="dog-show-progress"><span style="width:${Math.min(100, entries.length ? ((entries.length - needCare.length) / entries.length) * 100 : 0)}%"></span></div></section>
  </div>`;
}

function dogShowDogsHtml(event) {
  const conflicts = dogShowConflictEntryIds();
  const entries = dogShowEntries(event).filter((entry) => {
    const query = dogShowDogQuery.toLowerCase();
    const matchesQuery = !query || [dogShowEntryName(entry), entry.classEntered, entry.ringNumber, dogShowStaffLabel(entry.handlerEmail), dogShowStaffLabel(entry.helperEmail)].join(" ").toLowerCase().includes(query);
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
    <div class="dog-show-roster-list">${entries.length ? entries.map((entry) => dogShowEntryRowHtml(entry, { conflict: conflicts.has(entry.id) })).join("") : dogShowRenderEmpty("No matching dogs", "Change the filter or add dogs to this show.", "add-show-dogs", "Add Dogs")}</div>
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

function dogShowCalendarHtml(event) {
  const days = dogShowCalendarDays(event);
  const eventDays = dogShowShowDays(event);
  const entries = dogShowEntries(event);
  const tasks = dogShowTasks(event).filter((task) => task.source !== "auto-ring-prep");
  const startHour = 6;
  const endHour = 22;
  const slotsPerHour = 2;
  const slotCount = (endHour - startHour) * slotsPerHour;
  const timedActivities = [];
  const allDayByDate = new Map(days.map((date) => [dogShowDateKey(date), []]));
  entries.forEach((entry) => {
    const key = entry.ringDate || event.startDate;
    if (!allDayByDate.has(key)) return;
    if (entry.attendanceRole !== "Showing") {
      allDayByDate.get(key).push({ kind: "social", title: `Socialization · ${dogShowEntryName(entry)}`, meta: dogShowStaffLabel(entry.helperEmail || entry.handlerEmail), action: "open-show-dog", id: entry.id });
      return;
    }
    const prep = dogShowPrepTimes(entry);
    if (!prep.start) {
      allDayByDate.get(key).push({ kind: "unscheduled", title: `Prep · ${dogShowEntryName(entry)}`, meta: "Ring time needed", action: "open-show-dog", id: entry.id });
      return;
    }
    timedActivities.push({ date: dogShowDateKey(prep.start), time: prep.start, duration: Math.max(30, Number(entry.prepMinutes || 45)), kind: "show", title: `Prep · ${dogShowEntryName(entry)}`, meta: `Ready ${dogShowFormatTime(prep.ready)} · Ring ${dogShowFormatTime(prep.ring)}`, action: "open-show-dog", id: entry.id, entry });
  });
  tasks.forEach((task) => {
    const due = new Date(task.dueAt || "");
    const key = dogShowDateKey(due);
    if (!allDayByDate.has(key) || Number.isNaN(due.getTime())) return;
    const entry = dogShowCalendarTaskEntry(task, entries);
    timedActivities.push({ date: key, time: due, duration: 60, kind: "task", title: task.title || "Show task", meta: task.status === "Completed" ? `Completed by ${task.completedBy || "Staff"} · ${dogShowFormatDateTime(task.completedAt)}` : `${task.taskType || "Task"} · ${dogShowStaffLabel(task.assignedEmail)}`, action: "open-calendar-task", id: task.id, entry, task, color: dogShowTaskColor(task) });
  });
  timedActivities.forEach((activity) => {
    const minutes = activity.time.getHours() * 60 + activity.time.getMinutes();
    activity.slot = Math.max(0, Math.min(slotCount - 1, Math.floor((minutes - startHour * 60) / 30)));
    const peers = timedActivities.filter((item) => item.date === activity.date && Math.max(0, Math.min(slotCount - 1, Math.floor((item.time.getHours() * 60 + item.time.getMinutes() - startHour * 60) / 30))) === activity.slot);
    activity.laneCount = peers.length;
    activity.laneIndex = peers.indexOf(activity);
  });
  const headers = days.map((date, index) => `<div class="dog-show-calendar-day-heading" style="grid-column:${index + 2};grid-row:1"><strong>${escapeHtml(date.toLocaleDateString(undefined, { weekday: "short" }))}</strong><span>${escapeHtml(date.toLocaleDateString(undefined, { month: "short", day: "numeric" }))}</span></div>`).join("");
  const allDay = days.map((date, index) => {
    const key = dogShowDateKey(date);
    const activities = allDayByDate.get(key) || [];
    return `<div class="dog-show-calendar-all-day" style="grid-column:${index + 2};grid-row:2">${activities.map((activity) => `<button type="button" class="dog-show-calendar-all-day-item is-${activity.kind}" data-action="${activity.action}" data-id="${escapeHtml(activity.id)}"><strong>${escapeHtml(activity.title)}</strong><span>${escapeHtml(activity.meta)}</span></button>`).join("")}</div>`;
  }).join("");
  const timeLabels = Array.from({ length: endHour - startHour }, (_, index) => `<div class="dog-show-calendar-time" style="grid-column:1;grid-row:${index * slotsPerHour + 3}/span ${slotsPerHour}">${escapeHtml(new Date(2000, 0, 1, startHour + index).toLocaleTimeString([], { hour: "numeric" }))}</div>`).join("");
  const slots = Array.from({ length: slotCount }, (_, slot) => days.map((date, dayIndex) => {
    const minutes = startHour * 60 + slot * 30;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const dueAt = `${dogShowDateKey(date)}T${time}`;
    return `<button type="button" class="dog-show-calendar-slot" data-action="new-show-task" data-due-at="${dueAt}" aria-label="Add task ${escapeHtml(dogShowFormatDate(dogShowDateKey(date)))} at ${escapeHtml(dogShowFormatTime(dueAt))}" style="grid-column:${dayIndex + 2};grid-row:${slot + 3}"></button>`;
  }).join("")).join("");
  const activityCards = timedActivities.map((activity) => {
    const dayIndex = days.findIndex((date) => dogShowDateKey(date) === activity.date);
    const span = Math.max(2, Math.ceil(activity.duration / 30));
    const completed = activity.task?.status === "Completed";
    const photo = activity.entry ? dogShowPhotoHtml(activity.entry, "dog-show-calendar-photo") : "";
    return `<button type="button" class="dog-show-calendar-event is-${activity.kind}${completed ? " is-completed" : ""}" data-action="${activity.action}" data-id="${escapeHtml(activity.id)}"${activity.kind === "task" && !completed ? ` draggable="true" data-calendar-task-id="${escapeHtml(activity.id)}"` : ""} style="grid-column:${dayIndex + 2};grid-row:${activity.slot + 3}/span ${span};--lane-count:${activity.laneCount};--lane-index:${activity.laneIndex};--task-color:${escapeHtml(activity.color || "#315F85")}">${completed ? '<span class="dog-show-calendar-check" aria-hidden="true">✓</span>' : ""}${photo}<span class="dog-show-calendar-event-copy"><span>${escapeHtml(dogShowFormatTime(activity.time))}</span><strong>${escapeHtml(activity.title)}</strong><small>${escapeHtml(activity.meta)}</small></span></button>`;
  }).join("");
  const selectedIndex = eventDays.findIndex((date) => dogShowDateKey(date) === dogShowCalendarDate);
  const defaultTaskDate = dogShowCalendarView === "day" ? dogShowCalendarDate : event.startDate || todayDate();
  return `<section class="dog-show-calendar-panel"><div class="dog-show-calendar-toolbar"><div><h3>${dogShowCalendarView === "day" ? "Day Calendar" : "Weekend Calendar"}</h3><p>Click an open time to add a task. Drag open tasks to reschedule.</p></div><div class="dog-show-calendar-controls"><div class="dog-show-calendar-view-toggle" role="group" aria-label="Calendar view"><button type="button" data-calendar-view="weekend" class="${dogShowCalendarView === "weekend" ? "is-active" : ""}">Weekend</button><button type="button" data-calendar-view="day" class="${dogShowCalendarView === "day" ? "is-active" : ""}">Day</button></div>${dogShowCalendarView === "day" ? `<button type="button" class="dog-show-calendar-nav" data-calendar-day-offset="-1" aria-label="Previous show day"${selectedIndex <= 0 ? " disabled" : ""}>‹</button><span class="dog-show-calendar-range">${escapeHtml(dogShowFormatDate(dogShowCalendarDate))}</span><button type="button" class="dog-show-calendar-nav" data-calendar-day-offset="1" aria-label="Next show day"${selectedIndex >= eventDays.length - 1 ? " disabled" : ""}>›</button>` : `<span class="dog-show-calendar-range">${escapeHtml(`${dogShowFormatDate(event.startDate)} – ${dogShowFormatDate(event.endDate || event.startDate)}`)}</span>`}<button type="button" data-action="new-show-task" data-due-at="${escapeHtml(`${defaultTaskDate}T09:00`)}">New Task</button></div></div><div class="dog-show-calendar-board"><div class="dog-show-calendar-timeline" style="--dog-show-day-count:${days.length};--dog-show-slot-count:${slotCount};--dog-show-grid-width:${68 + days.length * 210}px"><div class="dog-show-calendar-corner" style="grid-column:1;grid-row:1">Time</div><div class="dog-show-calendar-all-day-label" style="grid-column:1;grid-row:2">All day</div>${headers}${allDay}${timeLabels}${slots}${activityCards}</div></div></section>`;
}

function dogShowScheduleHtml(event) {
  const conflicts = dogShowConflictEntryIds();
  const entries = dogShowEntries(event).sort((a, b) => (dogShowPrepTimes(a).start?.getTime() || Infinity) - (dogShowPrepTimes(b).start?.getTime() || Infinity));
  const rows = entries.map((entry) => {
    const prep = dogShowPrepTimes(entry);
    const conflict = conflicts.has(entry.id);
    if (entry.attendanceRole !== "Showing") {
      return `<button type="button" class="dog-show-schedule-row is-social" data-action="edit-show-entry" data-id="${escapeHtml(entry.id)}"><span class="dog-show-schedule-time">Flexible</span>${dogShowPhotoHtml(entry, "dog-show-schedule-photo")}<span class="dog-show-schedule-main"><strong>${escapeHtml(dogShowNameWithBreed(entry))}</strong><small>Socialization<br>${escapeHtml(dogShowStaffLabel(entry.helperEmail || entry.handlerEmail))}</small></span><span class="dog-show-role-chip">Social</span></button>`;
    }
    return `<button type="button" class="dog-show-schedule-row${conflict ? " has-conflict" : ""}" data-action="edit-show-entry" data-id="${escapeHtml(entry.id)}">
      <span class="dog-show-schedule-time"><strong>${prep.start ? dogShowFormatTime(prep.start) : "--"}</strong><small>Prep start</small></span>
      ${dogShowPhotoHtml(entry, "dog-show-schedule-photo")}<span class="dog-show-schedule-main"><strong>${escapeHtml(dogShowNameWithBreed(entry))}</strong><small>${escapeHtml([entry.classEntered || "Class missing", entry.ringNumber ? `Ring ${entry.ringNumber}` : "Ring missing", dogShowStaffLabel(entry.handlerEmail)].join(" · "))}</small><span class="dog-show-time-line">Ready ${prep.ready ? dogShowFormatTime(prep.ready) : "--"} <i></i> Ring ${prep.ring ? dogShowFormatTime(prep.ring) : "--"}</span></span>
      <span class="dog-show-schedule-duration">${Number(entry.prepMinutes || 45)}m${conflict ? "<small>Conflict</small>" : "<small>Prep</small>"}</span>
    </button>`;
  }).join("");
  return `<div class="dog-show-view dog-show-schedule-view">
    ${dogShowCalendarHtml(event)}
    <section class="dog-show-list-toolbar"><div><h3>Prep Schedule</h3><p>Preparation is counted backward from each ring time.</p></div><button type="button" data-action="add-show-dogs">Add Dogs</button></section>
    ${conflicts.size ? `<div class="dog-show-alert"><strong>${conflicts.size} dogs have a handler/helper overlap.</strong><span>Open the highlighted schedule rows to reassign coverage.</span></div>` : ""}
    <div class="dog-show-schedule-list">${rows || dogShowRenderEmpty("No schedule yet", "Add dogs, then enter ring time and preparation duration.", "add-show-dogs", "Add Dogs")}</div>
  </div>`;
}

function dogShowTaskMatchesFilter(task = {}) {
  if (dogShowTaskFilter === "all") return true;
  if (dogShowTaskFilter === "completed") return task.status === "Completed";
  if (dogShowTaskFilter === "mine") return task.status !== "Completed" && normalizeEmail(task.assignedEmail) === normalizeEmail(currentUser?.email);
  return task.status !== "Completed";
}

function dogShowTasksHtml(event) {
  const tasks = dogShowTasks(event).filter(dogShowTaskMatchesFilter).sort((a, b) => String(a.status === "Completed").localeCompare(String(b.status === "Completed")) || new Date(a.dueAt || 8640000000000000) - new Date(b.dueAt || 8640000000000000));
  const all = dogShowTasks(event);
  return `<div class="dog-show-view dog-show-tasks-view">
    <section class="dog-show-list-toolbar"><div><h3>Show Tasks</h3><p>Assigned work stays separate from boarding daily tasks.</p></div><div class="button-row"><button type="button" class="secondary-button" data-action="create-water-round">Water Round</button><button type="button" data-action="new-show-task">New Task</button></div></section>
    <div class="dog-show-filter-row" role="group" aria-label="Task filters">
      <button type="button" data-task-filter="open" class="${dogShowTaskFilter === "open" ? "is-active" : ""}">Open ${all.filter((task) => task.status !== "Completed").length}</button>
      <button type="button" data-task-filter="mine" class="${dogShowTaskFilter === "mine" ? "is-active" : ""}">Mine</button>
      <button type="button" data-task-filter="completed" class="${dogShowTaskFilter === "completed" ? "is-active" : ""}">Done ${all.filter((task) => task.status === "Completed").length}</button>
      <button type="button" data-task-filter="all" class="${dogShowTaskFilter === "all" ? "is-active" : ""}">All ${all.length}</button>
    </div>
    <div class="dog-show-task-batch"><label><input type="checkbox" data-action="select-visible-show-tasks" /> Select visible</label><button type="button" class="secondary-button" data-action="complete-selected-show-tasks"${dogShowSelectedTaskIds.size ? "" : " disabled"}>Complete selected (${dogShowSelectedTaskIds.size})</button></div>
    <div class="dog-show-task-list">${tasks.length ? tasks.map((task) => {
      const entry = dogShowEntries(event).find((item) => item.id === task.showEntryId);
      return `<article class="dog-show-task-row${task.status === "Completed" ? " is-complete" : ""}">
        <input type="checkbox" data-show-task-select="${escapeHtml(task.id)}" aria-label="Select ${escapeHtml(task.title || "task")}"${dogShowSelectedTaskIds.has(task.id) ? " checked" : ""}${task.status === "Completed" ? " disabled" : ""}/>
        <button type="button" data-action="edit-show-task" data-id="${escapeHtml(task.id)}"><strong>${escapeHtml(task.title || "Show task")}</strong><span>${escapeHtml([entry ? dogShowEntryName(entry) : "Team task", task.taskType || "General", dogShowStaffLabel(task.assignedEmail)].join(" · "))}</span><small>${task.status === "Completed" ? `Completed by ${escapeHtml(task.completedBy || "Staff")} · ${dogShowFormatDateTime(task.completedAt)}` : `Due ${dogShowFormatDateTime(task.dueAt)}`}</small></button>
        ${task.status === "Completed" ? `<span class="dog-show-task-done">Done</span>` : `<button type="button" class="secondary-button dog-show-complete-button" data-action="complete-show-task" data-id="${escapeHtml(task.id)}">Complete</button>`}
      </article>`;
    }).join("") : dogShowRenderEmpty("No tasks in this view", "Add a team task or create a water round for every dog.", "new-show-task", "New Task")}</div>
  </div>`;
}

function dogShowMoreHtml(event) {
  const entries = dogShowEntries(event);
  const results = dogShowResults(event);
  const packing = Array.isArray(event.packingItems) && event.packingItems.length ? event.packingItems : DOG_SHOW_DEFAULT_PACKING.map((label, index) => ({ id: `default-${index}`, label, completed: false }));
  const helperEmails = Array.isArray(event.helperEmails) ? event.helperEmails : [];
  return `<div class="dog-show-view dog-show-more-view">
    <section class="dog-show-list-toolbar"><div><h3>Show Operations</h3><p>Setup, packing, helpers, and results.</p></div></section>
    <div class="dog-show-more-grid">
      <button type="button" data-action="edit-show-event"><span>S</span><strong>Show Setup</strong><small>Venue, dates, links, and notes</small></button>
      <button type="button" data-action="add-show-dogs"><span>D</span><strong>Add Dogs</strong><small>Our Dogs or Boarding Dogs</small></button>
      <button type="button" data-action="show-helper-summary"><span>H</span><strong>Helpers</strong><small>${helperEmails.length} assigned to this weekend</small></button>
      <button type="button" data-action="show-result-summary"><span>R</span><strong>Results</strong><small>${results.length} of ${entries.filter((entry) => entry.attendanceRole === "Showing").length} showing dogs logged</small></button>
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
    const active = button.dataset.dogShowView === dogShowView;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (!event) {
    content.innerHTML = dogShowRenderEmpty("Create the first show weekend", "Add the event once, then build the roster, prep schedule, helper tasks, and results.");
    return;
  }
  const renderers = {
    home: dogShowHomeHtml,
    dogs: dogShowDogsHtml,
    schedule: dogShowScheduleHtml,
    tasks: dogShowTasksHtml,
    more: dogShowMoreHtml,
  };
  content.innerHTML = renderers[dogShowView](event);
  if (typeof scheduleProfilePhotoHydrationSweep === "function") scheduleProfilePhotoHydrationSweep(40);
}

function setDogShowView(view = "home") {
  if (!["home", "dogs", "schedule", "tasks", "more"].includes(view)) return;
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

function openDogShowEventForm(event = {}) {
  const helperEmails = Array.isArray(event.helperEmails) ? event.helperEmails : [];
  openDogShowDialog(event.id ? "Edit Show Weekend" : "New Show Weekend", `<form id="dogShowEventForm" class="tracker-form" data-id="${escapeHtml(event.id || "")}">
    <div class="field-grid">
      <label>Show name<input name="name" value="${escapeHtml(event.name || "")}" required placeholder="Austin Kennel Club Weekend"/></label>
      <label>Club<input name="club" value="${escapeHtml(event.club || "")}" placeholder="Austin Kennel Club"/></label>
      <label>Venue<input name="venue" value="${escapeHtml(event.venue || "")}" placeholder="Expo Center"/></label>
      <label>City / state<input name="cityState" value="${escapeHtml(event.cityState || "")}" placeholder="Austin, TX"/></label>
      <label>Start date<input type="date" name="startDate" value="${escapeHtml(event.startDate || todayDate())}" required/></label>
      <label>End date<input type="date" name="endDate" value="${escapeHtml(event.endDate || event.startDate || todayDate())}" required/></label>
      <label>Entry closing date<input type="date" name="entryClosingDate" value="${escapeHtml(event.entryClosingDate || "")}"/></label>
      <label>Superintendent<input name="superintendent" value="${escapeHtml(event.superintendent || "")}"/></label>
      <label>Event source URL<input type="url" name="sourceUrl" value="${escapeHtml(event.sourceUrl || "")}"/></label>
      <label>Premium list URL<input type="url" name="premiumUrl" value="${escapeHtml(event.premiumUrl || "")}"/></label>
      <label>Judging program URL<input type="url" name="judgingProgramUrl" value="${escapeHtml(event.judgingProgramUrl || "")}"/></label>
      <label>Status<select name="status"><option${event.status !== "Completed" ? " selected" : ""}>Active</option><option${event.status === "Completed" ? " selected" : ""}>Completed</option></select></label>
    </div>
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

function openDogShowEntryForm(entry = {}) {
  const event = dogShowActiveEvent();
  const prep = dogShowPrepTimes(entry);
  const logs = dogShowLogs(event).filter((log) => log.showEntryId === entry.id).sort((a, b) => new Date(b.loggedAt || 0) - new Date(a.loggedAt || 0)).slice(0, 10);
  const result = dogShowResultForEntry(entry, event);
  openDogShowDialog(dogShowEntryName(entry), `<div class="dog-show-detail-header">${dogShowPhotoHtml(entry, "dog-show-detail-photo")}<div><strong>${escapeHtml(dogShowEntryName(entry))}</strong><span>${escapeHtml([entry.dogType === "boardingDog" ? "Boarding Dog" : "Our Dog", entry.attendanceRole, entry.classEntered].filter(Boolean).join(" · "))}</span><small>Last attended: ${escapeHtml(dogShowLastLog(entry) ? dogShowFormatDateTime(dogShowLastLog(entry).loggedAt) : "No log")}</small></div></div>
    <section class="dog-show-dialog-section"><h3>Quick Log</h3><div class="dog-show-quick-grid">
      <button type="button" data-action="quick-show-log" data-log-type="Potty" data-id="${escapeHtml(entry.id)}">Potty</button>
      <button type="button" data-action="quick-show-log" data-log-type="Water" data-id="${escapeHtml(entry.id)}">Water</button>
      <button type="button" data-action="quick-show-log" data-log-type="Feeding" data-id="${escapeHtml(entry.id)}">Feeding</button>
      <button type="button" data-action="open-show-note" data-log-type="Behavior / Medical" data-id="${escapeHtml(entry.id)}">Behavior / Medical</button>
      <button type="button" data-action="open-show-note" data-log-type="Owner Note" data-id="${escapeHtml(entry.id)}">Owner Note</button>
      <button type="button" data-action="open-show-result" data-id="${escapeHtml(entry.id)}">${result ? "Edit Result" : "Log Result"}</button>
    </div></section>
    <form id="dogShowEntryForm" class="tracker-form" data-id="${escapeHtml(entry.id)}">
      <div class="field-grid">
        <label>Attendance role<select name="attendanceRole"><option${entry.attendanceRole === "Showing" ? " selected" : ""}>Showing</option><option${entry.attendanceRole !== "Showing" ? " selected" : ""}>Socialization</option></select></label>
        <label>Class entered<input name="classEntered" value="${escapeHtml(entry.classEntered || "")}" placeholder="Open Bitch"/></label>
        <label>Ring date<input type="date" name="ringDate" value="${escapeHtml(entry.ringDate || event?.startDate || todayDate())}"/></label>
        <label>Ring time<input type="time" name="ringTime" value="${escapeHtml(entry.ringTime || "")}"/></label>
        <label>Ring number<input name="ringNumber" value="${escapeHtml(entry.ringNumber || "")}"/></label>
        <label>Prep minutes<input type="number" name="prepMinutes" min="0" max="240" step="5" value="${Number(entry.prepMinutes || 45)}"/></label>
        <label>Ready-before-ring buffer<input type="number" name="readyBufferMinutes" min="0" max="60" step="5" value="${Number(entry.readyBufferMinutes || 15)}"/></label>
        <label>Handler<select name="handlerEmail">${dogShowStaffOptions(entry.handlerEmail || "")}</select></label>
        <label>Care helper<select name="helperEmail">${dogShowStaffOptions(entry.helperEmail || "")}</select></label>
        <label>Armband<input name="armbandNumber" value="${escapeHtml(entry.armbandNumber || "")}"/></label>
        <label>Judge<input name="judge" value="${escapeHtml(entry.judge || "")}"/></label>
        <label>Entry status<select name="status">${["Considering", "Entered", "Confirmed", "Scratched", "Completed"].map((status) => `<option${status === (entry.status || "Confirmed") ? " selected" : ""}>${status}</option>`).join("")}</select></label>
      </div>
      <div class="dog-show-prep-preview"><strong>Prep starts ${prep.start ? dogShowFormatTime(prep.start) : "after ring time is entered"}</strong><span>Ready ${prep.ready ? dogShowFormatTime(prep.ready) : "--"} · Ring ${prep.ring ? dogShowFormatTime(prep.ring) : "--"}</span></div>
      <label>Show notes<textarea name="notes" rows="2">${escapeHtml(entry.notes || "")}</textarea></label>
      <div class="button-row"><button type="submit">Save Dog</button><button type="button" class="secondary-button" data-action="remove-show-entry" data-id="${escapeHtml(entry.id)}">Remove From Show</button></div>
    </form>
    <section class="dog-show-dialog-section"><h3>Show Timeline</h3><div class="dog-show-log-timeline">${logs.length ? logs.map((log) => `<article><strong>${escapeHtml(log.activityType || "Care")}</strong><span>${escapeHtml(log.note || "Logged")}</span><small>${escapeHtml(dogShowFormatDateTime(log.loggedAt || log.updatedAt))} · ${escapeHtml(log.helperName || dogShowStaffLabel(log.helperEmail))}${log.customerVisible ? " · Owner visible" : ""}</small></article>`).join("") : "<p>No show care logged yet.</p>"}</div></section>`);
}

function openDogShowNoteForm(entry, logType) {
  const ownerNote = logType === "Owner Note";
  openDogShowDialog(`${logType}: ${dogShowEntryName(entry)}`, `<form id="dogShowNoteForm" class="tracker-form" data-id="${escapeHtml(entry.id)}" data-log-type="${escapeHtml(logType)}">
    <label>${ownerNote ? "Note to owner" : "Behavior / medical note"}<textarea name="note" rows="4" required autofocus></textarea></label>
    ${ownerNote ? `<label class="inline-check"><input type="checkbox" name="customerVisible" checked/> Visible to owner/customer updates</label>` : `<label>Severity<select name="severity"><option>Observation</option><option>Needs follow-up</option><option>Urgent</option></select></label>`}
    <div class="button-row"><button type="submit">Save Note</button><button type="button" class="secondary-button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Back</button></div>
  </form>`);
}

function openDogShowResultForm(entry) {
  const result = dogShowResultForEntry(entry) || {};
  openDogShowDialog(`Result: ${dogShowEntryName(entry)}`, `<form id="dogShowResultForm" class="tracker-form" data-entry-id="${escapeHtml(entry.id)}" data-id="${escapeHtml(result.id || "")}">
    <div class="field-grid">
      <label>Outcome<select name="outcome">${["Win", "Placement", "No placement", "Scratched", "Socialization only"].map((value) => `<option${value === result.outcome ? " selected" : ""}>${value}</option>`).join("")}</select></label>
      <label>Placement<input name="placement" value="${escapeHtml(result.placement || "")}" placeholder="1st Open Bitch"/></label>
      <label>Awards<input name="awards" value="${escapeHtml(result.awards || "")}" placeholder="Winners Bitch, Best of Winners"/></label>
      <label>Points / major estimate<input name="points" value="${escapeHtml(result.points || "")}"/></label>
    </div>
    <label>Judge notes<textarea name="judgeNotes" rows="3">${escapeHtml(result.judgeNotes || "")}</textarea></label>
    <label>Owner-facing summary<textarea name="customerSummary" rows="3">${escapeHtml(result.customerSummary || "")}</textarea></label>
    <label class="inline-check"><input type="checkbox" name="customerVisible"${result.customerVisible ? " checked" : ""}/> Visible to owner/customer updates</label>
    <div class="button-row"><button type="submit">Save Result</button><button type="button" class="secondary-button" data-action="back-to-show-dog" data-id="${escapeHtml(entry.id)}">Back</button></div>
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
      <label>Due date / time<input type="datetime-local" name="dueAt" value="${escapeHtml(task.dueAt ? task.dueAt.slice(0, 16) : new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16))}" required/></label>
      <label>Status<select name="status"><option${task.status !== "Completed" ? " selected" : ""}>Open</option><option${task.status === "Completed" ? " selected" : ""}>Completed</option></select></label>
      <label class="dog-show-task-color-field">Task color<span><input type="color" name="color" value="${escapeHtml(color)}" aria-label="Task color"/><output>${escapeHtml(color.toUpperCase())}</output></span></label>
    </div>
    <label>Notes<textarea name="notes" rows="3">${escapeHtml(task.notes || "")}</textarea></label>
    <div class="button-row"><button type="submit">Save Task</button><button type="button" class="secondary-button" data-action="close-show-dialog">Cancel</button></div>
  </form>`);
}

function openDogShowCalendarTask(task = {}) {
  if (!task.id) return;
  const entry = dogShowCalendarTaskEntry(task);
  const completed = task.status === "Completed";
  openDogShowDialog(task.title || "Show Task", `<div class="dog-show-calendar-task-detail" style="--task-color:${escapeHtml(dogShowTaskColor(task))}">${entry ? dogShowPhotoHtml(entry, "dog-show-detail-photo") : ""}<div><strong>${escapeHtml(task.title || "Show task")}</strong><span>${escapeHtml([entry ? dogShowEntryName(entry) : "Team task", task.taskType || "General", dogShowStaffLabel(task.assignedEmail)].join(" · "))}</span><small>Scheduled ${escapeHtml(dogShowFormatDateTime(task.dueAt))}</small>${completed ? `<p class="dog-show-task-completion">✓ Completed by ${escapeHtml(task.completedBy || "Staff")} · ${escapeHtml(dogShowFormatDateTime(task.completedAt))}</p>` : ""}</div></div><div class="button-row">${completed ? "" : `<button type="button" data-action="complete-show-task" data-id="${escapeHtml(task.id)}">Complete Task</button>`}<button type="button" class="secondary-button" data-action="edit-show-task" data-id="${escapeHtml(task.id)}">Edit Task</button><button type="button" class="secondary-button" data-action="close-show-dialog">Close</button></div>`);
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
  const prep = dogShowPrepTimes(entry);
  const existing = dogShowTasks().find((task) => task.source === "auto-ring-prep" && task.showEntryId === entry.id);
  if (entry.attendanceRole !== "Showing" || !prep.start) {
    if (existing && existing.status !== "Completed") await saveDogShowRecord("showDayTask", { ...existing, removed: true, removedAt: new Date().toISOString() });
    return;
  }
  await saveDogShowRecord("showDayTask", {
    ...(existing || {}), id: existing?.id || uid("showDayTask"), showEventId: entry.showEventId, showEntryId: entry.id, dogId: entry.dogId, dogType: entry.dogType, title: `Ring prep: ${dogShowEntryName(entry)}`, taskType: "Ring Prep", dueAt: prep.start.toISOString(), assignedEmail: entry.helperEmail || entry.handlerEmail || "", status: existing?.status === "Completed" ? "Completed" : "Open", source: "auto-ring-prep", submittedAt: existing?.submittedAt || new Date().toISOString(), helperEmail: currentUser?.email || "",
  });
}

async function saveDogShowEntry(form) {
  const entry = dogShowEntries().find((item) => item.id === form.dataset.id);
  if (!entry) return;
  const data = formPayload(form);
  const saved = await saveDogShowRecord("showEntry", { ...entry, ...data, prepMinutes: Number(data.prepMinutes || 0), readyBufferMinutes: Number(data.readyBufferMinutes || 0), helperEmailUpdatedBy: currentUser?.email || "" });
  await syncDogShowPrepTask(saved);
  openDogShowEntryForm(saved);
  renderDogShow();
  showToast("Dog show details saved.");
}

async function createDogShowLog(entry, activityType, note = "Logged", options = {}) {
  const record = await saveDogShowRecord("showCareLog", {
    id: uid("showCareLog"), showEventId: entry.showEventId, showEntryId: entry.id, dogId: entry.dogId, dogType: entry.dogType, dogName: dogShowEntryName(entry), activityType, note, severity: options.severity || "", customerVisible: options.customerVisible === true, loggedAt: new Date().toISOString(), helperName: currentUser?.name || "Staff", helperEmail: currentUser?.email || "", submittedAt: new Date().toISOString(),
  });
  renderDogShow();
  return record;
}

async function saveDogShowNote(form) {
  const entry = dogShowEntries().find((item) => item.id === form.dataset.id);
  if (!entry) return;
  const data = formPayload(form);
  await createDogShowLog(entry, form.dataset.logType || "Note", data.note || "Logged", { severity: data.severity || "", customerVisible: Boolean(form.elements.customerVisible?.checked) });
  openDogShowEntryForm(entry);
  showToast("Show note saved.");
}

async function saveDogShowResult(form) {
  const entry = dogShowEntries().find((item) => item.id === form.dataset.entryId);
  if (!entry) return;
  const existing = form.dataset.id ? readRecords("showResult").find((result) => result.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  await saveDogShowRecord("showResult", { ...existing, ...data, id: existing.id || uid("showResult"), showEventId: entry.showEventId, showEntryId: entry.id, dogId: entry.dogId, dogType: entry.dogType, dogName: dogShowEntryName(entry), customerVisible: Boolean(form.elements.customerVisible?.checked), loggedAt: existing.loggedAt || new Date().toISOString(), helperEmail: currentUser?.email || "", submittedAt: existing.submittedAt || new Date().toISOString() });
  await createDogShowLog(entry, "Result", [data.outcome, data.placement, data.awards].filter(Boolean).join(" · ") || "Result logged", { customerVisible: Boolean(form.elements.customerVisible?.checked) });
  openDogShowEntryForm(entry);
  showToast("Show result saved.");
}

async function saveDogShowTask(form) {
  const existing = form.dataset.id ? readRecords("showDayTask").find((task) => task.id === form.dataset.id) || {} : {};
  const data = formPayload(form);
  const entry = dogShowEntries().find((item) => item.id === data.showEntryId);
  const completed = data.status === "Completed";
  await saveDogShowRecord("showDayTask", { ...existing, ...data, id: existing.id || uid("showDayTask"), showEventId: dogShowActiveEvent()?.id || "", dogId: entry?.dogId || "", dogType: entry?.dogType || "", dueAt: new Date(data.dueAt).toISOString(), color: data.color || dogShowTaskColor({ ...existing, taskType: data.taskType }), completedAt: completed ? existing.completedAt || new Date().toISOString() : "", completedBy: completed ? existing.completedBy || currentUser?.name || "Staff" : "", completedEmail: completed ? existing.completedEmail || currentUser?.email || "" : "", submittedAt: existing.submittedAt || new Date().toISOString(), helperEmail: currentUser?.email || "" });
  document.getElementById("dogShowDialog")?.close();
  renderDogShow();
  showToast("Show task saved.");
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
  openDogShowDialog("Show Results", results.length ? `<div class="dog-show-summary-list">${results.map((result) => `<button type="button" data-action="open-show-dog" data-id="${escapeHtml(result.showEntryId)}"><strong>${escapeHtml(result.dogName || "Dog")}</strong><span>${escapeHtml([result.outcome, result.placement, result.awards].filter(Boolean).join(" · ") || "Result logged")}</span></button>`).join("")}</div>` : dogShowRenderEmpty("No results logged", "Open a showing dog's card and choose Log Result.", "close-show-dialog", "Close"));
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
    if (!event.target.matches('#dogShowTaskForm input[name="color"]')) return;
    const output = event.target.closest("label")?.querySelector("output");
    if (output) output.textContent = String(event.target.value || "").toUpperCase();
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
    const filter = event.target.closest("[data-dog-filter]");
    if (filter) { dogShowDogFilter = filter.dataset.dogFilter; renderDogShow(); return; }
    const taskFilter = event.target.closest("[data-task-filter]");
    if (taskFilter) { dogShowTaskFilter = taskFilter.dataset.taskFilter; renderDogShow(); return; }
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
    if (action.dataset.action === "add-show-dogs") openDogShowAddDogsForm();
    if (action.dataset.action === "open-show-dog" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "edit-show-entry" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "new-show-task") openDogShowTaskForm({ dueAt: action.dataset.dueAt || "" });
    if (action.dataset.action === "edit-show-task") openDogShowTaskForm(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "open-calendar-task") openDogShowCalendarTask(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "complete-show-task") await completeDogShowTasks([action.dataset.id]);
    if (action.dataset.action === "complete-selected-show-tasks") await completeDogShowTasks([...dogShowSelectedTaskIds]);
    if (action.dataset.action === "select-visible-show-tasks") {
      dogShowTasks().filter(dogShowTaskMatchesFilter).filter((task) => task.status !== "Completed").forEach((task) => dogShowSelectedTaskIds.add(task.id));
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
    if (action.dataset.dogShowMoreAction === "boarding") switchPage("dashboardPage", { history: "push" });
  });

  dialog?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.target.id === "dogShowEventForm") await saveDogShowEvent(event.target);
    if (event.target.id === "dogShowAddDogsForm") await saveDogShowDogs(event.target);
    if (event.target.id === "dogShowEntryForm") await saveDogShowEntry(event.target);
    if (event.target.id === "dogShowNoteForm") await saveDogShowNote(event.target);
    if (event.target.id === "dogShowResultForm") await saveDogShowResult(event.target);
    if (event.target.id === "dogShowTaskForm") await saveDogShowTask(event.target);
  });

  dialog?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const entry = action.dataset.id ? dogShowEntries().find((item) => item.id === action.dataset.id) : null;
    if (action.dataset.action === "close-show-dialog") dialog.close();
    if (action.dataset.action === "edit-show-event") openDogShowEventForm(dogShowActiveEvent() || {});
    if (action.dataset.action === "edit-show-task") openDogShowTaskForm(dogShowTasks().find((task) => task.id === action.dataset.id) || {});
    if (action.dataset.action === "complete-show-task") {
      await completeDogShowTasks([action.dataset.id]);
      dialog.close();
    }
    if (action.dataset.action === "back-to-show-dog" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "open-show-dog" && entry) openDogShowEntryForm(entry);
    if (action.dataset.action === "quick-show-log" && entry) {
      const button = action;
      button.disabled = true;
      await createDogShowLog(entry, action.dataset.logType, `${action.dataset.logType} logged`);
      openDogShowEntryForm(entry);
      showToast(`${action.dataset.logType} logged for ${dogShowEntryName(entry)}.`);
    }
    if (action.dataset.action === "open-show-note" && entry) openDogShowNoteForm(entry, action.dataset.logType || "Note");
    if (action.dataset.action === "open-show-result" && entry) openDogShowResultForm(entry);
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
