import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const script = fs.readFileSync(new URL("../script.js", import.meta.url), "utf8");
const failures = [];

for (const [label, source] of [["generated module", shared], ["legacy bundle", script]]) {
  const renderDashboard = source.match(/function renderDashboard\(\) \{[\s\S]*?\n\}\n\nfunction renderDashboardReminders/)?.[0] || "";
  if (!renderDashboard) {
    failures.push(`${label} is missing renderDashboard().`);
    continue;
  }
  for (const removed of [
    "Needs Action Today",
    "Exercise Due",
    "Training Due",
    "Baths Due",
    "Females In Heat",
    "Stay Services Due",
    "Heat Expected Soon",
    "Medical/Care Notes",
    "Arrivals today",
    "Departures today",
    "Active Boarders",
    "Owner updates needed",
    "Open requests",
    "Open maintenance",
  ]) {
    if (renderDashboard.includes(removed)) failures.push(`${label} still renders removed card ${removed}.`);
  }
  if (renderDashboard.includes("renderDashboardPriorities(metrics)")) failures.push(`${label} still renders Today's Priorities.`);
  if (renderDashboard.includes("renderDashboardTimeline()")) failures.push(`${label} still renders Daily Timeline.`);
  if (renderDashboard.includes("renderDashboardAlertTabs(alerts)")) failures.push(`${label} still renders dashboard alert filters.`);
}

for (const removedMarkup of ["dashboardPriorityCards", "dashboardTimelineSection", 'id="dashboardTimeline"', 'id="dashboardAlertTabs"', 'id="dashboardCards"']) {
  if (index.includes(removedMarkup)) failures.push(`index.html still contains ${removedMarkup}.`);
}

if (!index.includes("js/main.js?v=20260723-customer-file-view-v2-dashboard-simplify")) failures.push("index.html cache key was not updated.");
if (!shared.includes('$("#dashboardTimeline")?.addEventListener')) failures.push("Generated module timeline listener is not safe when the removed timeline is absent.");
if (!script.includes('$("#dashboardTimeline")?.addEventListener')) failures.push("Legacy bundle timeline listener is not safe when the removed timeline is absent.");
if (!shared.includes('$("#dashboardCards")?.addEventListener')) failures.push("Generated module dashboard card listener is not safe when the removed cards are absent.");
if (!script.includes('$("#dashboardCards")?.addEventListener')) failures.push("Legacy bundle dashboard card listener is not safe when the removed cards are absent.");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Dashboard simplification static checks passed.");
