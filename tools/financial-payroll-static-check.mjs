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
if (!/js\/main\.js\?v=2026072[3-9]-/.test(index)) {
  failures.push("The application entrypoint does not expose the payroll fix.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Financial payroll checks passed.");
