import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const checks = [
  ["index.html", "taskSchedulerPage", "Missing Task Scheduling page shell."],
  ["index.html", "data-page=\"taskSchedulerPage\"", "Missing Task Scheduling nav item."],
  ["js/shared.js", "scheduledCareTask", "scheduledCareTask must be registered in shared state/record types."],
  ["js/shared.js", "taskSchedulerPage", "taskSchedulerPage must be registered for rendering and remote loading."],
  ["js/task-scheduler.js", "renderTaskScheduler", "Missing Task Scheduler renderer."],
  ["js/task-scheduler.js", "completeScheduledCareTask", "Missing complete-and-log behavior."],
  ["js/task-scheduler.js", "moveScheduledCareTask", "Missing drag/drop move behavior."],
  ["js/task-scheduler.js", "taskSchedulerDropSlotFromPoint", "Drag/drop must calculate the hovered scheduler slot."],
  ["js/task-scheduler.js", "confirmRemoveScheduledCareTask", "Task deletion must require confirmation."],
  ["js/task-scheduler.js", "view-task-scheduler-dog-profile", "Task details must link to the boarding dog profile."],
  ["js/task-scheduler.js", "boardingServiceOptionsForScheduler", "Missing boarding service selection."],
  ["js/task-scheduler.js", "taskSchedulerMonthWeekdayHeadersHtml", "Month view must render weekday headers."],
  ["js/task-scheduler.js", "const start = dateOnly(date) || todayDate();", "Week view must start at the current anchor date."],
  ["js/task-scheduler.js", "const todayClass = date === todayDate() ? \" is-today\" : \"\";", "Month view must mark the current day."],
  ["js/task-scheduler.js", "retireDuplicateOwnedDogNextBathTasks", "Owned dog next-bath sync must retire duplicate generated tasks."],
  ["js/task-scheduler.js", "BOARDING_SERVICE_AUTO_TASK_SOURCE", "Boarding service requests must auto-generate scheduler tasks."],
  ["js/task-scheduler.js", "syncBoardingServiceTasksForRecord", "Boarding service request scheduler sync is missing."],
  ["js/task-scheduler.js", "BOARDING_STAY_MILESTONE_TASK_SOURCE", "Boarding stay drop-off/pick-up milestones must auto-generate scheduler tasks."],
  ["js/task-scheduler.js", "syncBoardingStayMilestoneTasksForRecord", "Boarding stay milestone scheduler sync is missing."],
  ["js/task-scheduler.js", "Service Drop Off", "Service-only requests must auto-generate a drop-off task."],
  ["js/task-scheduler.js", "confirmationStatus", "Generated boarding service tasks must track pending/confirmed state."],
  ["js/task-scheduler.js", "boardingServiceUnitIndex", "Generated boarding service tasks must track service quantity units."],
  ["js/task-scheduler.js", "Completed & Logged", "Completed tasks must keep a disabled completion control visible."],
  ["js/task-scheduler.js", "task-scheduler-complete-badge", "Completed calendar tasks must render a visible checkmark."],
  ["js/task-scheduler.js", "syncScheduledCareTasksFromDailyRecord", "Daily care logs must complete matching scheduled care tasks."],
  ["js/task-scheduler.js", "legacyBathLogsForDailyRecord", "Legacy daily bath logs must complete matching scheduled care tasks."],
  ["js/task-scheduler.js", "record.dogsBathedIds", "Scheduler daily sync must include legacy dogsBathedIds bath evidence."],
  ["js/task-scheduler.js", "schedulerCareLogsForDailyRecord(record)", "Completed task detail lookup must use the combined scheduler care log source."],
  ["js/shared.js", "syncScheduledCareTasksFromDailyRecord(record", "Daily work saves must run scheduler completion sync before dog care resync."],
  ["js/boarding.js", "retireScheduledCareTasksForBoardingServiceUnit", "Completing a boarding service unit must retire the matching open calendar task."],
  ["js/boarding.js", "data-unit-index", "Boarding service completion buttons must target individual service units."],
  ["styles.css", "is-pending-confirmation", "Pending check-in scheduler tasks must have a distinct visual state."],
  ["styles.css", "is-drop-off", "Drop-off task type must have a distinct scheduler color hook."],
  ["styles.css", "is-pick-up", "Pick-up task type must have a distinct scheduler color hook."],
  ["styles.css", "complete-scheduled-care-task\"]:disabled", "Completed scheduler task action must render disabled."],
  ["js/task-scheduler.js", "scheduledCareTaskMonthChipHtml", "Month view must use compact single-line task chips."],
  ["js/task-scheduler.js", "taskSchedulerView = \"day\"", "Month date-cell clicks must drill into day view."],
  ["styles.css", "grid-template-columns: 52px minmax(0, 1fr)", "Mobile day view must fit the viewport width."],
  ["styles.css", "@media (max-width: 980px) and (orientation: landscape)", "Landscape mobile must hide the bottom nav."],
  ["styles.css", "@media (max-width: 900px) and (orientation: landscape)", "Task Scheduler landscape view must remove bottom-nav spacing."],
  ["js/boarding.js", "careLogs", "Boarding dog profile must render scheduled care logs."],
  ["supabase-schema.sql", "scheduledCareTask", "RLS must allow staff/admin scheduled care task writes."],
];

const failures = [];

for (const [path, needle, message] of checks) {
  if (!read(path).includes(needle)) failures.push(message);
}

const scheduler = read("js/task-scheduler.js");
const dayWidthMatch = scheduler.match(/function taskSchedulerDayMinWidth\(dates = \[\]\) \{[\s\S]*?\n\}/);
if (!dayWidthMatch) {
  failures.push("Could not extract scheduler day-width calculation.");
} else {
  const makeDayMinWidth = (view, overlap) => Function(
    "taskSchedulerView",
    "taskSchedulerMaxOverlap",
    `return (${dayWidthMatch[0]});`,
  )(view, () => overlap);
  if (makeDayMinWidth("week", 12)([]) !== 104) failures.push("Busy tasks can still make every week column excessively wide.");
  if (makeDayMinWidth("day", 1)([]) !== 420) failures.push("Day view lost its readable minimum width.");
  if (makeDayMinWidth("day", 12)([]) !== 640) failures.push("Day view overlap width is not capped.");
}

if (failures.length) {
  console.error(failures.map((item) => "- " + item).join("\n"));
  process.exit(1);
}

console.log("Task scheduler static checks passed.");
