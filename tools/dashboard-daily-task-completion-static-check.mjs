import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const daily = fs.readFileSync("js/daily.js", "utf8");
const legacy = fs.readFileSync("script.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} is present`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} could not be extracted`);
}

const aggregateSource = [
  extractFunction(legacy, "dashboardDailyWorkRecordForDate"),
  extractFunction(legacy, "dashboardDailyWorkRecords"),
].join("\n");

const storedReports = [{
  id: "dailyTask-2026-08-16",
  type: "dailyTask",
  date: "2026-08-16",
  submittedAt: "2026-08-16T13:50:00Z",
  updatedAt: "2026-08-16T13:50:00Z",
  completedTasks: [],
  structuredCareLogs: Array.from({ length: 4 }, (_, index) => ({ id: `care-${index}`, loggedAt: `2026-08-16T13:5${index}:00Z` })),
}];
const atomicByDate = {
  "2026-08-09": Array.from({ length: 26 }, (_, index) => ({ id: `nine-${index}`, date: "2026-08-09", taskId: `task-${index}`, completedAt: `2026-08-10T04:03:${String(index).padStart(2, "0")}Z` })),
  "2026-08-16": Array.from({ length: 19 }, (_, index) => ({ id: `sixteen-${index}`, date: "2026-08-16", taskId: `task-${index}`, completedAt: `2026-08-17T03:20:${String(index).padStart(2, "0")}Z` })),
};
const allAtomic = Object.values(atomicByDate).flat();
const dateOnly = (value = "") => String(value).slice(0, 10);
const dailySubmissionDate = (record = {}) => dateOnly(record.date || record.submittedAt);
const dailyTaskRecordsForDate = (date) => storedReports.filter((record) => !record.removed && dailySubmissionDate(record) === date);
const dailyTaskRecordForDate = (date) => dailyTaskRecordsForDate(date)[0] || null;
const completedTasksForDate = (date) => atomicByDate[date] || [];
const structuredCareLogsForDate = (date) => dailyTaskRecordsForDate(date).flatMap((record) => record.structuredCareLogs || []);
const dailyTaskRecordId = (date) => `dailyTask-${date}`;
const readRecords = (type) => type === "dailyTask" ? storedReports : type === "dailyTaskCompletion" ? allAtomic : [];

const buildAggregates = new Function(
  "dateOnly",
  "dailyTaskRecordsForDate",
  "dailyTaskRecordForDate",
  "completedTasksForDate",
  "structuredCareLogsForDate",
  "dailyTaskRecordId",
  "dailySubmissionDate",
  "readRecords",
  `${aggregateSource}\nreturn { dashboardDailyWorkRecordForDate, dashboardDailyWorkRecords };`,
)(dateOnly, dailyTaskRecordsForDate, dailyTaskRecordForDate, completedTasksForDate, structuredCareLogsForDate, dailyTaskRecordId, dailySubmissionDate, readRecords);

const augNine = buildAggregates.dashboardDailyWorkRecordForDate("2026-08-09");
assert.equal(augNine.dashboardDerived, true, "a task-only date gets a derived calendar record");
assert.equal(augNine.completedTasks.length, 26, "a task-only date keeps every atomic completion");

const augSixteen = buildAggregates.dashboardDailyWorkRecordForDate("2026-08-16");
assert.equal(augSixteen.dashboardDerived, false, "an existing care-log report remains linked to its stored record");
assert.equal(augSixteen.completedTasks.length, 19, "atomic completions replace the stale embedded zero count");
assert.equal(augSixteen.structuredCareLogs.length, 4, "care logs remain in the combined daily work record");
assert.deepEqual(buildAggregates.dashboardDailyWorkRecords().map((record) => record.date).sort(), ["2026-08-09", "2026-08-16"], "calendar work dates are the union of reports and atomic completions");

const calendarSource = extractFunction(shared, "renderDashboardTaskCalendar");
assert.doesNotMatch(calendarSource, /reportCounts|calendar-report-count/, "dashboard calendar no longer computes or renders Daily Timeline counts");
assert.match(calendarSource, /calendarNoteKindLabel\(record\) === "Special Note"/, "dashboard calendar counts only special notes");
assert.match(shared, /dashboardTimelineRequestedDate !== selectedDate/, "Daily Timeline waits for an explicit date selection");
assert.match(shared, /completedTasksForDate\(record\.date\)\.length/, "timeline counts atomic completions");
assert.match(shared, /data-date=/, "timeline cards retain the work date for derived details");
assert.match(shared, /dashboardDailyWorkRecordForDate\(card\.dataset\.date/, "timeline opens details for task-only dates");
assert.match(daily, /const completedTasks = reportDate \? completedTasksForDate\(reportDate\)/, "daily report details use atomic completion rows");
assert.match(main, /dashboard-daily-completion-v48/, "shared module cache key is updated");
assert.match(index, /dashboard-daily-completion-v48/, "application cache key is updated");

console.log("Dashboard daily task completion regression checks passed.");
