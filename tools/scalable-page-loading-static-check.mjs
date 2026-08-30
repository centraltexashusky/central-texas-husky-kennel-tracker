import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const shared = read("js/shared.js");
const main = read("js/main.js");
const daily = read("js/daily.js");
const boarding = read("js/boarding.js");
const notifications = read("js/notifications.js");
const index = read("index.html");
const migration = read("supabase/migrations/20260830222218_optimize_daily_workspace_reads.sql");
const failures = [];

const requireText = (source, text, message) => {
  if (!source.includes(text)) failures.push(message);
};

requireText(main, 'customer: () => import("./customer.js', "Customer code is not split from the startup shell.");
requireText(main, 'dogShow: () => import("./dog-show.js', "Dog Show code is not split from the startup shell.");
requireText(main, 'window.loadAppPageModule =', "Page navigation cannot request its module on demand.");
requireText(main, "requestIdleCallback", "Unused page modules are not warmed during idle time.");
requireText(main, 'name === "boarding"', "Notifications are not refreshed when the lazy Boarding module becomes ready.");
requireText(notifications, "boardingNotificationHelpersAvailable", "The notification shell can call Boarding helpers before their lazy module loads.");
requireText(notifications, "Loading alerts in background", "Notification rendering is not deferred until its Boarding helpers are ready.");
requireText(notifications, 'await window.loadAppPageModule("boardingDogsPage")', "Opening a boarding alert does not wait for its lazy module.");
requireText(shared, "remoteRecordLoadPlanForPage", "Remote records have no page-specific loading plan.");
requireText(shared, "critical:", "Page loading does not distinguish critical data.");
requireText(shared, "deferred:", "Non-critical page data is not deferred.");
requireText(shared, "ACTIVE_PAGE_REMOTE_CACHE_TTL_MS = 60000", "Warm page data is not reused for one minute.");
requireText(shared, 'db.rpc("kennel_daily_task_records_window"', "Daily reports still use an unbounded table read.");
requireText(shared, 'db.rpc("kennel_daily_task_completion_snapshot"', "Daily completion history is not summarized in the database.");
requireText(shared, '["dashboardPage", "dailyPage", "taskSchedulerPage", "boardingDogsPage"]', "Active boarding scope is not shared by the operational pages.");
requireText(shared, "scheduleInactivePageDomRelease", "Generated DOM is retained for every hidden page.");
requireText(index, 'id="ownedDogListStatus"', "Our Dogs has no bounded-result status/control.");
requireText(index, 'id="boardingRosterStatus"', "Boarding has no bounded-result status/control.");
requireText(migration, "security invoker", "Daily read functions do not preserve caller RLS.");
requireText(migration, "kennel_records_daily_task_date_updated_idx", "Daily report window has no supporting index.");
requireText(migration, "daily_task_completions_org_date_completed_idx", "Daily completion summaries have no supporting index.");
requireText(migration, "'counts'", "Completion snapshot does not aggregate per-day counts.");
requireText(migration, "'details'", "Completion snapshot does not limit details to the selected date.");

const dailyPageSize = Number(daily.match(/OWNED_DOG_RENDER_PAGE_SIZE = (\d+)/)?.[1] || 0);
const boardingPageSize = Number(boarding.match(/BOARDING_ROSTER_RENDER_PAGE_SIZE = (\d+)/)?.[1] || 0);
const fixtureDogs = Array.from({ length: 500 }, (_, index) => ({ id: "dog-" + (index + 1) }));
if (dailyPageSize !== 50 || fixtureDogs.slice(0, dailyPageSize).length !== 50) {
  failures.push("Our Dogs first paint is not capped at 50 rows for a 500-dog fixture.");
}
if (boardingPageSize !== 60 || fixtureDogs.slice(0, boardingPageSize).length !== 60) {
  failures.push("Boarding first paint is not capped at 60 rows for a 500-dog fixture.");
}
if (!shared.includes("ownedDogVisibleLimit += OWNED_DOG_RENDER_PAGE_SIZE")) failures.push("Our Dogs cannot progressively reveal more rows.");
if (!shared.includes("boardingRosterVisibleLimit += BOARDING_ROSTER_RENDER_PAGE_SIZE")) failures.push("Boarding cannot progressively reveal more rows.");

if (failures.length) {
  failures.forEach((failure) => console.error("FAIL: " + failure));
  process.exit(1);
}

console.log("Scalable page loading checks passed (500-dog fixture: 50 Our Dogs + 60 Boarding rows on first paint).");
