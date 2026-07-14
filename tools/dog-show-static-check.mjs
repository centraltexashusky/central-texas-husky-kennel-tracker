import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const required = [
  ["index.html", 'data-page="dogShowPage"', "Missing Dog Shows top-level navigation."],
  ["index.html", 'id="dogShowPage"', "Missing isolated Dog Show page."],
  ["index.html", 'id="dogShowMobileNav"', "Missing Dog Show mobile menu."],
  ["index.html", 'id="dogShowMoreMenu"', "Missing Dog Show More action menu."],
  ["index.html", 'data-dog-show-view="home"', "Missing Home view."],
  ["index.html", 'data-dog-show-view="dogs"', "Missing Dogs view."],
  ["index.html", 'data-dog-show-view="schedule"', "Missing Schedule view."],
  ["index.html", 'data-dog-show-view="tasks"', "Missing Tasks view."],
  ["index.html", 'data-dog-show-view="more"', "Missing More view."],
  ["js/main.js", 'import "./dog-show.js', "Dog Show module is not loaded."],
  ["js/shared.js", 'dogShowPage: ["showEvent"', "Dog Show remote records are not page-scoped."],
  ["js/shared.js", 'dogShowPage: () => renderDogShow()', "Dog Show page renderer is not registered."],
  ["js/shared.js", 'if (typeof setupDogShowEventListeners', "Dog Show event listeners are not initialized."],
  ["js/dog-show.js", "DOG_SHOW_STALE_MINUTES", "Dog attention timestamps are not monitored."],
  ["js/dog-show.js", "dogShowConflictEntryIds", "Prep/helper conflicts are not detected."],
  ["js/dog-show.js", "syncDogShowPrepTask", "Ring prep tasks are not generated from the backward schedule."],
  ["js/dog-show.js", "dogShowNameWithBreed", "Schedule rows do not include dog breed details."],
  ["js/dog-show.js", "dogShowRingSchedules", "Dog entries do not support multiple ring appearances."],
  ["js/dog-show.js", "ringSchedules,", "Multiple ring appearances are not saved on the show entry."],
  ["js/dog-show.js", "data-ring-schedule-row", "The dog dialog is missing repeatable ring appearance controls."],
  ["js/dog-show.js", 'data-action="add-ring-schedule"', "Users cannot add another ring appearance."],
  ["js/dog-show.js", "ringScheduleId: schedule.id", "Generated prep tasks are not tied to individual ring appearances."],
  ["js/dog-show.js", "schedule.ringNumber ? `Ring ${schedule.ringNumber}`", "Calendar and prep views do not show per-appearance ring numbers."],
  ["js/dog-show.js", "dogShowBreed(entry)", "Calendar and schedule views do not show dog breeds."],
  ["js/dog-show.js", "scheduleProfilePhotoHydrationSweep(20)", "Dog detail photos are not hydrated when the dialog opens."],
  ["js/dog-show.js", 'data-action="new-show-task" data-due-at=', "Calendar time slots cannot create show tasks."],
  ["js/dog-show.js", "dogShowPrepTaskFor", "Calendar does not reuse generated ring prep tasks."],
  ["js/dog-show.js", 'action: "open-calendar-task"', "Generated ring prep tasks do not open as completable calendar tasks."],
  ["js/dog-show.js", "DOG_SHOW_TASK_COLORS", "Show task color coding is missing."],
  ["js/dog-show.js", "DOG_SHOW_CALENDAR_SLOT_MINUTES = 15", "Show calendar does not use 15-minute intervals."],
  ["js/dog-show.js", "dogShowTaskColorStyle", "Show task colors are not converted into visible calendar tints."],
  ["js/dog-show.js", 'data-action="duplicate-show-task"', "Show tasks cannot be duplicated from the task dialog."],
  ["js/dog-show.js", "openDuplicateDogShowTask", "Duplicate show tasks are not supported."],
  ["js/dog-show.js", 'dueAt: task.dueAt || ""', "Duplicate show tasks do not preserve the original date and time."],
  ["js/dog-show.js", 'data-action="delete-show-task"', "The show task editor is missing a delete action."],
  ["js/dog-show.js", "removeDogShowTask", "Show tasks cannot be soft deleted."],
  ["js/dog-show.js", "currentRole() !== \"admin\"", "Admin-only dog show log removal is not enforced in the handler."],
  ["js/dog-show.js", 'data-action="remove-show-log"', "Admins cannot remove dog show timeline logs."],
  ["js/dog-show.js", "updated and saved", "Saving dog details does not provide a clear confirmation."],
  ["js/dog-show.js", "dogShowFormatMonthDay", "Show selector options do not include weekend date ranges."],
  ["js/dog-show.js", '<span class="dog-show-schedule-time">Social</span>', "Socialization rows do not use the requested Social label."],
  ["js/dog-show.js", 'draggable="true" data-calendar-task-id=', "Show calendar tasks are not draggable."],
  ["js/dog-show.js", "moveDogShowCalendarTask", "Show calendar task rescheduling is missing."],
  ["js/dog-show.js", 'data-calendar-view="weekend"', "Weekend and day calendar views are missing."],
  ["js/dog-show.js", "Completed by", "Calendar completion audit details are missing."],
  ["js/dog-show.js", "createDogShowWaterRound", "Large-team water rounds are missing."],
  ["js/dog-show.js", "completeDogShowTasks", "Batch task completion is missing."],
  ["js/dog-show.js", "quick-show-log", "One-tap dog care logging is missing."],
  ["js/dog-show.js", "customerVisible", "Owner-visible notes/results are not separated."],
  ["styles.css", "body.is-dog-show-mode #mobileBottomNav", "Regular boarding mobile navigation is not isolated from Dog Show mode."],
  ["styles.css", ".dog-show-mobile-nav", "Dog Show mobile navigation styling is missing."],
  ["styles.css", ".dog-show-calendar-timeline", "Task Scheduler-style Dog Show timeline is missing."],
  ["styles.css", ".dog-show-calendar-event.is-completed", "Completed calendar task styling is missing."],
  ["styles.css", "background: var(--task-tint", "Calendar task cards do not visibly use their selected color."],
  ["styles.css", ".dog-show-remove-packing", "Packing item remove control styling is missing."],
  ["styles.css", ".dog-show-remove-log", "Admin show-log remove control styling is missing."],
  ["supabase-schema.sql", "'showEvent'", "RLS does not allow show event writes."],
  ["supabase-schema.sql", "'showCareLog'", "RLS does not allow show care log writes."],
];

const forbidden = [
  ['upsertRecord("boardingDog"', "Dog Show module must not write boarding dog records."],
  ['saveDogShowRecord("boardingDog"', "Dog Show module must not save boarding dog records."],
  ['upsertRecord("careLog"', "Dog Show module must not write boarding/shared care logs."],
  ['upsertRecord("scheduledCareTask"', "Dog Show prep tasks must stay out of the boarding scheduler."],
];

const failures = [];
for (const [path, needle, message] of required) {
  if (!read(path).includes(needle)) failures.push(message);
}
const dogShowSource = read("js/dog-show.js");
const duplicateTaskSource = dogShowSource.slice(dogShowSource.indexOf("function openDuplicateDogShowTask"), dogShowSource.indexOf("async function saveDogShowRecord"));
if (duplicateTaskSource.includes("setMinutes")) failures.push("Duplicate show tasks must not change the original date and time.");
for (const [needle, message] of forbidden) {
  if (dogShowSource.includes(needle)) failures.push(message);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Dog Show static checks passed.");
