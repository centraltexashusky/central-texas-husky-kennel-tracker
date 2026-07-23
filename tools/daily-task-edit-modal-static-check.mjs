import fs from "node:fs";

const sources = {
  daily: fs.readFileSync("js/daily.js", "utf8"),
  shared: fs.readFileSync("js/shared.js", "utf8"),
  legacy: fs.readFileSync("script.js", "utf8"),
  styles: fs.readFileSync("styles.css", "utf8"),
  main: fs.readFileSync("js/main.js", "utf8"),
  index: fs.readFileSync("index.html", "utf8"),
};

const failures = [];
for (const [name, source] of [["daily", sources.daily], ["legacy", sources.legacy]]) {
  if (!source.includes('data-action="open-edit-task"')) failures.push(`${name} task cards are missing the Edit button.`);
  if (!source.includes('id="dailyTaskEditForm"')) failures.push(`${name} is missing the task edit popup form.`);
  if (source.includes('class="task-edit-label"') || source.includes('class="task-edit-input"')) failures.push(`${name} still renders the inline task editor.`);
}
if (!sources.shared.includes('openDailyTaskEditPopup(control.dataset.shift, control.dataset.id)')) failures.push("Task Edit clicks do not open the popup.");
if (!sources.shared.includes('event.target.closest("#dailyTaskEditForm")')) failures.push("The task edit popup is not connected to the shared submit handler.");
if (!sources.styles.includes("#detailDialog:has(#dailyTaskEditForm)")) failures.push("The task edit popup is not constrained to a compact width.");
if (!sources.main.includes("daily.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-task-edit-modal")) failures.push("The Daily Tasks module cache key was not updated.");
if (!sources.index.includes("styles.css?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-dog-show-timeline-task-edit-modal")) failures.push("The stylesheet cache key was not updated.");
if (!sources.index.includes("js/main.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues-board-queue-cleanup-dog-show-timeline-task-edit-modal")) failures.push("The application entrypoint cache key was not updated.");

if (failures.length) {
  console.error("Daily task edit modal static check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Daily task edit modal static check passed.");
