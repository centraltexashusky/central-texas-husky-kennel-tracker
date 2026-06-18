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
  ["js/task-scheduler.js", "retireDuplicateOwnedDogNextBathTasks", "Owned dog next-bath sync must retire duplicate generated tasks."],
  ["js/task-scheduler.js", "BOARDING_SERVICE_AUTO_TASK_SOURCE", "Boarding service requests must auto-generate scheduler tasks."],
  ["js/task-scheduler.js", "syncBoardingServiceTasksForRecord", "Boarding service request scheduler sync is missing."],
  ["js/task-scheduler.js", "confirmationStatus", "Generated boarding service tasks must track pending/confirmed state."],
  ["js/task-scheduler.js", "boardingServiceUnitIndex", "Generated boarding service tasks must track service quantity units."],
  ["js/boarding.js", "retireScheduledCareTasksForBoardingServiceUnit", "Completing a boarding service unit must retire the matching open calendar task."],
  ["js/boarding.js", "data-unit-index", "Boarding service completion buttons must target individual service units."],
  ["styles.css", "is-pending-confirmation", "Pending check-in scheduler tasks must have a distinct visual state."],
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

if (failures.length) {
  console.error(failures.map((item) => "- " + item).join("\n"));
  process.exit(1);
}

console.log("Task scheduler static checks passed.");
