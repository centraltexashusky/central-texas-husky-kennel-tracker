import fs from "node:fs";

const source = fs.readFileSync("supabase/functions/send-notification/index.ts", "utf8");

const checks = [
  ["KENNEL_EMAIL_TIME_ZONE = \"America/Chicago\"", "notification emails must use the kennel Central Time zone."],
  ["KENNEL_EMAIL_TIME_ZONE_LABEL = \"CT\"", "notification emails must label displayed times as Central Time."],
  ["function formatEmailLocalDateTimeText", "local app datetime strings must be treated as Central Time, not server time."],
  ["function formatEmailZonedDateTimeText", "UTC/offset timestamps must be converted into Central Time."],
  ["function formatEmailTimeRangeText", "staff shift time ranges must be formatted with Central Time."],
  ["formatEmailDateTime(details.dropOff)", "admin request HTML drop-off must use the Central Time formatter."],
  ["formatEmailDateTime(details.pickUp)", "admin request HTML pick-up must use the Central Time formatter."],
  ["formatEmailDateTimeText(details.dropOff)", "admin request plain-text drop-off must use the Central Time formatter."],
  ["formatEmailDateTimeText(details.pickUp)", "admin request plain-text pick-up must use the Central Time formatter."],
  ["const schedule = stayScheduleEmailText(stay);", "customer-facing request emails must use formatted Central Time schedule text."],
  ["const shiftText = formatEmailTimeRangeText(record.startTime, record.endTime);", "schedule published emails must format shift times in Central Time."],
  ["Shift: ${shiftText}", "schedule published emails must render the formatted shift time."],
];

const failures = checks
  .filter(([needle]) => !source.includes(needle))
  .map(([, message]) => message);

if (failures.length) {
  console.error(failures.map((item) => "- " + item).join("\n"));
  process.exit(1);
}

console.log("Notification timezone static checks passed.");
