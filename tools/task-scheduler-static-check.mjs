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
  ["js/task-scheduler.js", "boardingServiceOptionsForScheduler", "Missing boarding service selection."],
  ["js/task-scheduler.js", "taskSchedulerMonthWeekdayHeadersHtml", "Month view must render weekday headers."],
  ["js/task-scheduler.js", "retireDuplicateOwnedDogNextBathTasks", "Owned dog next-bath sync must retire duplicate generated tasks."],
  ["js/task-scheduler.js", "scheduledCareTaskMonthChipHtml", "Month view must use compact single-line task chips."],
  ["js/task-scheduler.js", "taskSchedulerView = \"day\"", "Month date-cell clicks must drill into day view."],
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
