import fs from "node:fs";

const sources = {
  daily: fs.readFileSync("js/daily.js", "utf8"),
  shared: fs.readFileSync("js/shared.js", "utf8"),
  legacy: fs.readFileSync("script.js", "utf8"),
  main: fs.readFileSync("js/main.js", "utf8"),
  index: fs.readFileSync("index.html", "utf8"),
};

const failures = [];

for (const [name, source] of [["daily", sources.daily], ["legacy", sources.legacy]]) {
  if (!source.includes("function dailyCareLogCompletionMetaHtml")) {
    failures.push(`${name} is missing the structured-care completion metadata renderer.`);
  }
  if (!source.includes('"<span>Completed " + escapeHtml(workDate) + " by " + escapeHtml(staffName)')) {
    failures.push(`${name} does not show the work date and completing staff member.`);
  }
  if (!source.includes("log.loggedAt || log.createdAt || log.updatedAt")) {
    failures.push(`${name} does not use the saved log timestamp for the logged-time label.`);
  }
  if (!source.includes("dailyCareLogCompletionMetaHtml(log, record)")) {
    failures.push(`${name} does not render completion metadata on each daily-report care card.`);
  }
}

if (!sources.shared.includes('completedBy: helperName.value || currentUser?.name || ""')) {
  failures.push("New structured care logs do not save the completing staff member.");
}
if (!sources.shared.includes("date: date || todayDate()") || !sources.shared.includes("loggedAt: now")) {
  failures.push("New structured care logs do not preserve both the work date and exact logged timestamp.");
}
if (!sources.main.includes("daily-care-log-staff-date-v44")) failures.push("The Daily Tasks module cache key was not updated.");
if (!sources.index.includes("daily-care-log-staff-date-v44")) failures.push("The application cache key was not updated.");

if (failures.length) {
  console.error("Daily care-log metadata static check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Daily care-log metadata static check passed.");
