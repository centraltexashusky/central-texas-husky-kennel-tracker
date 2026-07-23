import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const timesheet = fs.readFileSync("js/timesheet.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

if (!shared.includes('financialsPage: ["boardingDog", "service", "timesheet"]')) {
  failures.push("Financials does not load completed timesheet records.");
}
if (!shared.includes('activePage === "financialsPage" && hasAny(["boardingDog", "service", "timesheet", "settingsUser"])')) {
  failures.push("Financials does not refresh when hours or hourly rates change.");
}
if (!timesheet.includes('Number(record.hours || 0) > 0 && record.clockOutTime')) {
  failures.push("Payroll must use completed clock records with positive hours.");
}
if (!timesheet.includes("total: hours * rate")) {
  failures.push("Payroll no longer multiplies completed hours by the saved hourly rate.");
}
if (!main.includes('shared.js?v=20260723-profile-ux-fixes-v2')) {
  failures.push("The payroll record-loading fix is not cache-busted.");
}
if (!index.includes('js/main.js?v=20260723-profile-ux-fixes-v2')) {
  failures.push("The application entrypoint does not expose the payroll fix.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Financial payroll checks passed.");
