import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const shared = fs.readFileSync("js/shared.js", "utf8");
const timesheet = fs.readFileSync("js/timesheet.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

if (!shared.includes('financialsPage: ["boardingDog", "service", "timesheet", "showEvent", "financialTransaction"]')) {
  failures.push("Financials does not load completed timesheet records.");
}
if (!shared.includes('activePage === "financialsPage" && hasAny(["boardingDog", "service", "timesheet", "settingsUser", "showEvent", "financialTransaction"])')) {
  failures.push("Financials does not refresh when hours or hourly rates change.");
}
if (!timesheet.includes('Number(record.hours || 0) > 0 && record.clockOutTime')) {
  failures.push("Payroll must use completed clock records with positive hours.");
}
if (!timesheet.includes("const hours = payrollRoundToHundredth(item.hours);") || !timesheet.includes("const total = payrollRoundToHundredth(hours * Number(item.rate || 0));")) {
  failures.push("Payroll must multiply the same two-decimal employee hours displayed in the table by the saved hourly rate.");
}
if (timesheet.includes("existing.total += entry.total")) {
  failures.push("Payroll still adds per-clock-entry pay instead of calculating from displayed employee hours.");
}
if (!index.includes('data-timesheet-tab="payroll"') || !index.includes('id="timesheetPayrollPanel"')) {
  failures.push("Timesheet does not expose the admin payroll review tab and panel.");
}
if (!index.includes("displayed two-decimal completed hours × hourly rate")) {
  failures.push("Payroll does not explain the visible calculation used for each employee.");
}
if (!timesheet.includes('staffPayrollSummaryForRange(range, { includeAll: true })')) {
  failures.push("Payroll review does not summarize all employees in the selected date range.");
}
if (!timesheet.includes('const users = payrollSettingsUsers();') || !timesheet.includes('readRecords("settingsUser")')) {
  failures.push("Payroll does not retain saved rates from removed staff profiles.");
}
if (!timesheet.includes('!["review", "payroll"].includes(tab) || currentRole() === "admin"')) {
  failures.push("Sensitive payroll details are not restricted to admins.");
}
if (!timesheet.includes('item.missingRate ? "—"')) {
  failures.push("Missing hourly rates can be mistaken for valid zero-dollar pay.");
}
if (!shared.includes('"#applyPayrollDateFilterButton"') || !shared.includes('"#resetPayrollDateFilterButton"')) {
  failures.push("Payroll date range controls are not connected.");
}
if (!/shared\.js\?v=2026072[3-9]-/.test(main)) {
  failures.push("The payroll record-loading fix is not cache-busted.");
}
if (!main.includes('timesheet.js?v=20260829-removed-user-payroll-rate-v4')) {
  failures.push("The removed-user payroll-rate fix is not cache-busted.");
}
if (!index.includes('removed-user-payroll-rate-v63"></script>')) {
  failures.push("The application entrypoint does not expose the payroll fix.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

const moduleMatch = timesheet.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
assert.ok(moduleMatch, "Timesheet embedded module is readable.");
const settingsUserRecords = [
  { id: "active-admin", name: "Admin", email: "admin@example.com", role: "admin", hourlyRate: 20, removed: false, updatedAt: "2026-08-29T10:00:00Z" },
  { id: "removed-alexis", name: "Alexis Hernandez", email: "vqparz@icloud.com", role: "staff", hourlyRate: 14, removed: true, removedAt: "2026-08-29T11:00:00Z", updatedAt: "2026-08-29T11:00:00Z" },
];
const timesheetRecords = [
  { id: "alexis-shift", type: "timesheet", helperName: "Alexis Hernandez", helperEmail: "vqparz@icloud.com", date: "2026-08-25", clockInTime: "2026-08-25T08:00:00Z", clockOutTime: "2026-08-25T14:49:12Z", hours: 6.82, removed: false },
];
const context = {
  readRecords(type) {
    if (type === "settingsUser") return settingsUserRecords;
    if (type === "timesheet") return timesheetRecords;
    return [];
  },
  isStaffRole(role = "") { return ["admin", "staff", "helper"].includes(role); },
  normalizeEmail(value = "") { return String(value).trim().toLowerCase(); },
  normalizeHelperName(value = "") { return String(value).trim().toLowerCase(); },
  dateOnly(value = "") { return String(value).slice(0, 10); },
  localDateFromStoredDateTime(value = "") { return String(value).slice(0, 10); },
  timesheetBelongsToCurrentUser() { return false; },
};
vm.createContext(context);
vm.runInContext(`const __snuggleStayModuleSource = ${moduleMatch[1]}; (0, eval)(__snuggleStayModuleSource);`, context);
const removedUserPayroll = vm.runInContext('staffPayrollSummaryForRange({ start: "2026-08-24", end: "2026-08-30" }, { includeAll: true })', context);
assert.equal(removedUserPayroll.staff.length, 1, "Removed staff still appear in completed payroll history.");
assert.equal(removedUserPayroll.staff[0].rate, 14, "Removed staff keep their saved hourly rate.");
assert.equal(removedUserPayroll.staff[0].total, 95.48, "Removed staff gross pay uses the retained rate.");
assert.equal(removedUserPayroll.missingRateCount, 0, "A removed staff profile with a saved rate is not marked missing.");

console.log("Financial payroll checks passed.");
