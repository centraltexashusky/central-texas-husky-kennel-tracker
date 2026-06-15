import fs from "node:fs";

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

console.log("Timesheet efficiency static checks passed.");
