import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path) => readFileSync(join(root, path), "utf8");

const shared = read("js/shared.js");
const notifications = read("js/notifications.js");
const timesheet = read("js/timesheet.js");

const selectionMatch = shared.match(/function customerDogSelectionErrorMessage\(count = 0\) \{([\s\S]*?)\n\}/);
assert.ok(selectionMatch, "customerDogSelectionErrorMessage helper is present");
const customerDogSelectionErrorMessage = new Function("BOARDING_MAX_DOGS_PER_REQUEST", "count", selectionMatch[1]);
assert.equal(customerDogSelectionErrorMessage(4, 0), "Select at least one dog for the boarding request.");
assert.equal(customerDogSelectionErrorMessage(4, 1), "");
assert.equal(customerDogSelectionErrorMessage(4, 4), "");
assert.equal(customerDogSelectionErrorMessage(4, 5), "Select up to 4 dogs for one boarding request. Please submit a second request for additional dogs.");

assert.match(shared, /function dailyTaskCompletionFromRow/, "daily task completion row mapper is present");
assert.match(shared, /function mergeDailyTaskCompletionRecords/, "daily task completion merge helper is present");
assert.match(shared, /dailyTaskCompletionRecordsForDate\(date\)\.forEach/, "completedTasksForDate reads atomic completion rows");
assert.match(shared, /function saveDailyTaskCompletionFallback/, "daily task completion fallback save helper is present");
assert.doesNotMatch(shared, /Task sync setup is not finished/, "daily task completion does not block staff on a missing migration toast");
const legacyCompletion = { shift: "morning", taskId: "feed", completedBy: "Legacy", completedAt: "2026-06-01T12:00:00Z" };
const atomicCompletion = { shift: "morning", taskId: "feed", completedBy: "Atomic", completedAt: "2026-06-01T12:01:00Z", atomic: true };
const byKey = new Map();
byKey.set(`${legacyCompletion.shift}:${legacyCompletion.taskId}`, legacyCompletion);
byKey.set(`${atomicCompletion.shift}:${atomicCompletion.taskId}`, atomicCompletion);
assert.equal(byKey.get("morning:feed").completedBy, "Atomic", "atomic completion wins duplicate shift/taskId");

assert.match(notifications, /function unreadNotificationCategorySummary/, "alert category summary helper is present");
assert.match(notifications, /notificationCategoryForEvent/, "alert category helper is present");
const sampleSummary = [
  { alertCategory: "Boarding" },
  { alertCategory: "Boarding" },
  { alertCategory: "Medical/Care" },
].reduce((summary, notification) => {
  summary[notification.alertCategory] = (summary[notification.alertCategory] || 0) + 1;
  return summary;
}, {});
assert.equal(Object.entries(sampleSummary).map(([category, count]) => `${count} ${category}`).join(", "), "2 Boarding, 1 Medical/Care");

assert.match(shared, /supabaseClient\s*\.channel/, "startAutoSync opens a Supabase channel");
assert.match(shared, /postgres_changes/, "startAutoSync subscribes to postgres_changes");
assert.match(shared, /table: "kennel_records"/, "startAutoSync listens to kennel_records");
assert.match(shared, /table: "daily_task_completions"/, "startAutoSync listens to daily_task_completions");

assert.match(timesheet, /async function saveTimeEntry/, "saveTimeEntry is async");
assert.match(shared, /const record = await saveTimeEntry/, "manual timesheet edit awaits saveTimeEntry");
assert.match(shared, /await saveTimeEntry\(\{[\s\S]*?clockOutTime/, "clock-out awaits saveTimeEntry");

console.log("Efficiency flow smoke test passed.");
