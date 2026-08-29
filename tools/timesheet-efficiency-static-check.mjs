import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const read = (path) => fs.readFileSync(path, "utf8");

const checks = [
  {
    path: "js/shared.js",
    mustInclude: "sendPayloadBatch",
    message: "Missing batch save helper.",
  },
  {
    path: "js/timesheet.js",
    mustInclude: "bulkScheduleFormHtml",
    message: "Missing bulk add shifts modal.",
  },
  {
    path: "js/timesheet.js",
    mustInclude: "copyLastWeekPreviewFormHtml",
    message: "Copy Last Week must preview before saving.",
  },
  {
    path: "js/timesheet.js",
    mustInclude: "duplicateScheduleShift",
    message: "Missing Duplicate Shift flow.",
  },
  {
    path: "js/timesheet.js",
    mustInclude: "copyDayScheduleFormHtml",
    message: "Missing Copy Day flow.",
  },
  {
    path: "js/timesheet.js",
    mustInclude: "scheduleTemplatesPopupHtml",
    message: "Missing reusable schedule templates.",
  },
  {
    path: "js/timesheet.js",
    mustInclude: "clockExceptionFormHtml",
    message: "Missing improved clock exception flow.",
  },
  {
    path: "supabase-schema.sql",
    mustInclude: "kennel_staff_can_read_record",
    message: "Missing staff schedule/timesheet read privacy helper.",
  },
  {
    path: "supabase-schema.sql",
    mustInclude: "kennel_staff_can_write_record",
    message: "Missing staff schedule/timesheet write privacy helper.",
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.path);
  if (check.mustInclude && !text.includes(check.mustInclude)) failures.push(check.message);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

const timesheet = read("js/timesheet.js");
const main = read("js/main.js");
const index = read("index.html");
const moduleMatch = timesheet.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
assert.ok(moduleMatch, "Timesheet embedded module is readable.");
const localDateKey = (value = new Date()) => {
  const source = value instanceof Date ? value : new Date(String(value).includes("T") ? value : `${value}T12:00:00`);
  const year = source.getFullYear();
  const month = String(source.getMonth() + 1).padStart(2, "0");
  const day = String(source.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const context = {
  localDateKey,
  dateOnly(value = "") { return localDateKey(value); },
  todayDate() { return "2026-08-29"; },
  addDays(dateString, daysToAdd) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate() + daysToAdd);
    return localDateKey(date);
  },
};
vm.createContext(context);
vm.runInContext(`const __snuggleStayModuleSource = ${moduleMatch[1]}; (0, eval)(__snuggleStayModuleSource);`, context);
const augustDates = vm.runInContext('staffScheduleMonthDates("2026-08-29")', context);
assert.equal(augustDates[0], "2026-07-26", "August 2026 month grid starts on Sunday, July 26.");
assert.equal(augustDates.indexOf("2026-08-29") % 7, 6, "Saturday, August 29 renders in the Saturday column.");
assert.match(timesheet, /\[\["Sunday", "Sun"\].*\["Saturday", "Sat"\]\]/s, "Month headers remain Sunday through Saturday.");
assert.ok(main.includes('timesheet.js?v=20260829-staff-schedule-sunday-grid-v5'), "Staff schedule weekday fix is cache-busted.");
assert.ok(index.includes('staff-schedule-sunday-grid-v64'), "Production entrypoint exposes the staff schedule weekday fix.");

console.log("Timesheet efficiency static checks passed.");
