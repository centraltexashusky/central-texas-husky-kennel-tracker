import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const auth = fs.readFileSync("js/auth.js", "utf8");
const scheduler = fs.readFileSync("js/task-scheduler.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260722190000_window_scheduled_care_task_reads.sql", "utf8");
const boardingMigration = fs.readFileSync("supabase/migrations/20260722203000_load_active_boarding_records_first.sql", "utf8");
const failures = [];

if (!shared.includes("const productionMemoryOnly = Boolean(supabaseClient && !localTestMode);")) failures.push("Production records are still persisted to browser storage.");
if (!shared.includes("localStorage.removeItem(stateKeys[type]);")) failures.push("Legacy record caches are not removed.");
if (!auth.includes("prepareProductionMemoryRecordCache()")) failures.push("Production login does not run record-cache cleanup.");
if (!shared.includes("remoteTypesFullyLoadedInMemory.has(type)")) failures.push("A new tab can incorrectly start with a delta-only load.");
if (!shared.includes('supabaseClient.rpc("kennel_scheduled_care_tasks_window"')) failures.push("Scheduled care tasks do not use the bounded database query.");
if (!scheduler.includes("scheduledCareTaskDateIsLoaded(nextBathDate)")) failures.push("Owned-dog auto tasks can be duplicated outside the loaded date window.");
if (!main.includes('task-scheduler.js?v=20260722-compact-week-grid-fit')) failures.push("Automatic task identity fix is not cache-busted.");
if (!index.includes('js/main.js?v=20260723-customer-file-view')) failures.push("Application entrypoint does not expose the automatic task identity fix.");
if ((scheduler.match(/id: existing\.id \|\| scheduledCareAutoTaskId\(sourceKey\)/g) || []).length !== 3) failures.push("Every automatic task path must use a deterministic source-key ID.");
if (!scheduler.includes("function scheduledCareTaskBackgroundSyncAllowed()")) failures.push("Background task sync has no authenticated staff guard.");
if ((scheduler.match(/if \(!scheduledCareTaskBackgroundSyncAllowed\(\)\) return/g) || []).length < 7) failures.push("One or more background task sync entry points can run before staff authentication.");
const backgroundGuardMatch = scheduler.match(/function scheduledCareTaskBackgroundSyncAllowed\(\) \{[\s\S]*?\n\}/);
if (!backgroundGuardMatch) {
  failures.push("Could not extract background task synchronization guard.");
} else {
  const makeGuard = (localTestMode, supabaseClient, loggedIn, staff) => Function(
    "localTestMode",
    "supabaseClient",
    "helperIsLoggedIn",
    "isStaffRole",
    `return (${backgroundGuardMatch[0]});`,
  )(localTestMode, supabaseClient, () => loggedIn, () => staff);
  if (makeGuard(false, {}, false, true)()) failures.push("Signed-out sessions can start background task writes.");
  if (makeGuard(false, {}, true, false)()) failures.push("Authenticated customers can start staff task synchronization.");
  if (!makeGuard(false, {}, true, true)()) failures.push("Authenticated staff cannot start task synchronization.");
  if (!makeGuard(true, null, false, false)()) failures.push("Local test mode lost automatic task synchronization.");
}
const autoTaskIdMatch = scheduler.match(/function scheduledCareAutoTaskId\(sourceKey = ""\) \{[\s\S]*?\n\}/);
if (!autoTaskIdMatch) {
  failures.push("Could not extract automatic task ID generator.");
} else {
  const uid = () => "random-fallback";
  const scheduledCareAutoTaskId = Function("uid", `return (${autoTaskIdMatch[0]});`)(uid);
  const first = scheduledCareAutoTaskId("boardingServiceRequest:dog-1:stay-1:bath:1");
  const repeated = scheduledCareAutoTaskId("boardingServiceRequest:dog-1:stay-1:bath:1");
  const different = scheduledCareAutoTaskId("boardingServiceRequest:dog-1:stay-1:bath:2");
  if (first !== repeated) failures.push("Repeated automatic generation does not reuse the same primary key.");
  if (first === different) failures.push("Different automatic source keys collide.");
  if (!first.startsWith("scheduledCareTask-auto-")) failures.push("Automatic task IDs do not use the reserved prefix.");
  if (scheduledCareAutoTaskId("") !== "random-fallback") failures.push("Manual/fallback task identity behavior changed.");
}
if ((scheduler.match(/refreshScheduledCareTaskWindow\(taskSchedulerAnchorDate\)/g) || []).length < 4) failures.push("Scheduler navigation does not refresh date windows.");
if (!migration.includes("security invoker")) failures.push("Windowed scheduler function does not preserve caller RLS.");
if (!migration.includes("kennel_records_active_scheduled_task_date_updated_idx")) failures.push("Windowed scheduler query has no supporting index.");
if (!migration.includes("sourceManualOverride")) failures.push("Windowed reads do not prefer a staff-adjusted auto task.");
if (!migration.includes("where ranked.source_rank = 1")) failures.push("Windowed reads do not collapse duplicate active auto tasks.");
if (!migration.includes("and (p_since_updated_at is null or ranked.updated_at >= p_since_updated_at)")) failures.push("Delta filtering happens before canonical task selection.");
if (!shared.includes('supabaseClient.rpc("kennel_active_boarding_records"')) failures.push("Boarding Dogs does not load the active roster first.");
if (!shared.includes("boardingFullHistory: true")) failures.push("Boarding history cannot be loaded on demand.");
if (!shared.includes('boardingDogRosterFilter === "All Boarding Dogs"')) failures.push("All Boarding Dogs does not trigger the historical load.");
if (!boardingMigration.includes("current_date + 365")) failures.push("Active boarding scope does not include upcoming reservations.");
if (!boardingMigration.includes("security invoker")) failures.push("Active boarding query does not preserve caller RLS.");

const countdownMatch = boarding.match(/function boardingServiceCountdownLabel\(dueInfo = null\) \{[\s\S]*?\n\}/);
if (!countdownMatch) {
  failures.push("Could not extract boarding service countdown function.");
} else {
  const countdown = Function(`return (${countdownMatch[0]});`)();
  if (countdown({ hoursRemaining: 264, stats: {} }) !== "") failures.push("264-hour countdown is still visible.");
  if (countdown({ hoursRemaining: 73, stats: {} }) !== "") failures.push("73-hour countdown is still visible.");
  if (countdown({ hoursRemaining: 72, stats: {} }) !== "Due in 72h") failures.push("72-hour countdown is not visible.");
  if (countdown({ hoursRemaining: 1, stats: {} }) !== "Due in 1h") failures.push("Near-due countdown is not visible.");
  if (countdown({ hoursRemaining: 0, stats: {} }) !== "Overdue") failures.push("Overdue state was lost.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Scalable record loading checks passed.");
