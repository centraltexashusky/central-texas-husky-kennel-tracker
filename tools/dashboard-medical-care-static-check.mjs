import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

if (!shared.includes("function dashboardMedicalCareItems")) failures.push("Dashboard care notes are not normalized into actionable items.");
if (!shared.includes("function dashboardMedicalCareCardHtml")) failures.push("Dashboard care detail does not have a focused card renderer.");
if (!shared.includes('data-action="dashboard-log-medical-care"')) failures.push("Dashboard care cards do not expose a log action.");
if (!shared.includes("Required follow-up")) failures.push("Dashboard care cards do not explain the required follow-up.");
if (!shared.includes('if (key === "careNotes")')) failures.push("Medical/Care Notes still uses the generic dashboard detail renderer.");
if (!shared.includes('openDashboardQuickCare(action.dataset.id, "Medical/Behavior Note")')) failures.push("Dashboard care logging does not open the focused medical/behavior workflow.");
if (!styles.includes(".dashboard-care-note") || !styles.includes(".dashboard-care-next-step")) failures.push("Actionable dashboard care details are not styled.");
if (!main.includes('shared.js?v=20260723-customer-file-view')) failures.push("Dashboard care behavior is not cache-busted.");
if (!index.includes('styles.css?v=20260723-profile-ux-fixes-v2')
  || !index.includes('js/main.js?v=20260723-customer-file-view')) failures.push("Dashboard care assets are not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Dashboard medical/care static checks passed.");
