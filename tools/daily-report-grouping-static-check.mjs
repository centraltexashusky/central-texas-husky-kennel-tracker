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
  if (!source.includes('aria-label="Remove task"><span aria-hidden="true">&times;</span>')) {
    failures.push(`${name} task removal control must render only a visible multiplication sign with an accessible label.`);
  }
  if (source.includes('<span class="sr-only">Remove task</span>')) {
    failures.push(`${name} task removal control still renders the visible fallback text.`);
  }
  if (!source.includes("function completedTasksGroupedHtml")) {
    failures.push(`${name} daily reports do not group completed work by staff member.`);
  }
  if (!source.includes("function boardingTaskGroupsForDisplay")) {
    failures.push(`${name} daily reports do not group boarding work by dog.`);
  }
  if (source.includes('["Date", "date"],') || source.includes('["Staff", "helperName"],') || source.includes('["Morning tasks", "dailyTasks"],')) {
    failures.push(`${name} daily reports still render the redundant date, staff, day, or shift-summary block.`);
  }
  if (!source.includes("boardingTaskGroups,")) {
    failures.push(`${name} daily report payloads do not preserve structured boarding-task groups.`);
  }
}

for (const [name, source] of [["shared", sources.shared], ["legacy", sources.legacy]]) {
  if (!source.includes("function upcomingBoardingTaskGroups")) {
    failures.push(`${name} does not build structured boarding-task groups.`);
  }
  if (!source.includes("function boardingTaskTextFromGroups")) {
    failures.push(`${name} does not preserve the legacy boarding-task text field.`);
  }
}

if (!sources.styles.includes(".daily-report-group-list")) failures.push("Daily report group styling is missing.");
if (!sources.main.includes("task-edit-modal-daily-report-groups-compact")) failures.push("The Daily Tasks module cache key was not updated.");
if (!sources.index.includes("dashboard-timeline-restore-daily-report-groups-compact")) failures.push("The application cache key was not updated.");
if (!sources.index.includes("task-edit-modal-daily-report-groups")) failures.push("The stylesheet cache key was not updated.");

if (failures.length) {
  console.error("Daily report grouping static check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Daily report grouping static check passed.");
