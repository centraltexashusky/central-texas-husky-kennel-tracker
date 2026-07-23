import fs from "node:fs";

const daily = fs.readFileSync("js/daily.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");
const scheduler = fs.readFileSync("js/task-scheduler.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const legacy = fs.readFileSync("script.js", "utf8");
const failures = [];

const overview = daily.match(/function ownedDogOverviewPopupHtml[\s\S]*?\n\}/)?.[0] || "";
const quickActionsIndex = overview.indexOf("Quick Care Actions");
const overviewIndex = overview.indexOf("<h3>Overview</h3>");
const careLogsIndex = overview.indexOf("<h3>Care Logs</h3>");
if (!(quickActionsIndex >= 0 && quickActionsIndex < overviewIndex && overviewIndex < careLogsIndex)) {
  failures.push("Our Dogs quick-care actions are not above the overview and collapsed care logs.");
}
if (!overview.includes("ownedDogCollapsedActivityGroupsHtml(dog)") || overview.includes('ownedDogActivityEntriesHtml(dog, "All")')) {
  failures.push("Our Dogs overview still eagerly renders every care log.");
}
if (!daily.includes('data-action="toggle-owned-activity-group"') || !daily.includes("data-activity-group-content hidden")) {
  failures.push("Collapsed care-log groups are missing their deferred content controls.");
}
if (!shared.includes('action.dataset.action === "toggle-owned-activity-group"') || !shared.includes('content.dataset.loaded !== "true"')) {
  failures.push("Care-log groups do not lazy-render on first expansion.");
}
if (!daily.includes("const careAlert = ownedDogCareAlertNotes(dog)") || !daily.includes('class="special-care-alert-note"')) {
  failures.push("Special Care cards do not show the actual saved care alert.");
}
if (overview.includes("Medical / care alert")) {
  failures.push("Medical / care alert still appears in the general overview.");
}

for (const source of [daily, legacy]) {
  if (!source.includes('if (filter === "Vaccine") return ownedDogNeedsVaccineReview(record, date)')) {
    failures.push("Our Dogs Vaccine filter does not use actionable vaccine review logic.");
  }
  if (!source.includes("vaccineReview: allDogs.filter((dog) => ownedDogNeedsVaccineReview(dog)).length")) {
    failures.push("Our Dogs Vaccine filter count is missing.");
  }
}
if (!index.includes('data-filter="Vaccine">Vaccine</button>')) failures.push("Our Dogs Vaccine button is missing.");

for (const expected of [
  'title === "Leaving in 48 Hours"',
  'boardingStayLeavesWithinHours(stay, 48)',
  '["Leaving in 48 Hours", records.filter',
]) {
  if (!boarding.includes(expected)) failures.push(`Boarding queue is missing: ${expected}`);
}
if (!boarding.includes('records.length ? "" : "is-empty"') || boarding.includes("No dogs in this group.")) {
  failures.push("Zero-count boarding groups are not minimized.");
}
if (!styles.includes(".boarding-queue-card.is-empty")) failures.push("Minimized boarding groups are missing compact styling.");

if (!scheduler.includes("return mobileWeek ? 220 : 130")) failures.push("Mobile week columns are not widened for a 2-3 day viewport.");
if (!styles.includes("scroll-snap-type: x proximity") || !styles.includes("-webkit-overflow-scrolling: touch")) {
  failures.push("Mobile week view is not configured for intentional horizontal scrolling.");
}

for (const expected of [
  "shared.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues",
  "boarding.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues",
  "daily.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues",
  "notifications.js?v=20260723-customer-file-view-v2-dashboard-vaccine-queues",
  "task-scheduler.js?v=20260722-compact-week-grid-fit-operational-flow",
]) {
  if (!main.includes(expected)) failures.push(`Main module cache key is missing: ${expected}`);
}
if (!index.includes("styles.css?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues")) failures.push("Updated responsive styles are not cache-busted.");
if (!index.includes("js/main.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues")) failures.push("Updated operational modules are not exposed by the entrypoint.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Operational flow UX checks passed.");
