import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");
const migration = [
  fs.readFileSync("supabase/migrations/20260830235500_lazy_boarding_history_and_update_retention.sql", "utf8"),
  fs.readFileSync("supabase/migrations/20260831050000_consolidated_boarding_update_retention.sql", "utf8"),
].join("\n");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

assert.match(shared, /db\.rpc\("kennel_boarding_roster_records"/, "the full boarding roster uses compact database projections");
assert.match(shared, /boardingPayloadForRemoteWrite/, "projected records hydrate archived fields before a write");
assert.match(shared, /savedHistoricalStays/, "writes preserve historical stays that were intentionally deferred");
assert.match(shared, /db\.rpc\("kennel_calendar_notes_window"/, "calendar note reads are bounded to the visible date window");
assert.match(shared, /function statusChipHtml/, "shell-level roster rendering does not depend on the Boarding module for status chips");
assert.match(shared, /function customerUpdateForStay[\s\S]*record\.latestCustomerUpdate/, "dashboard owner-update alerts use the compact projection without loading customer history");

assert.match(boarding, /db\.rpc\("kennel_boarding_past_stays"/, "past stays load through a dog-scoped RPC");
assert.match(boarding, /db\.rpc\("kennel_boarding_customer_updates"/, "owner updates load only for the selected dog");
assert.match(boarding, /Past stays load only when this section is opened/, "the Past Boarding control explains its lazy behavior");
assert.match(boarding, /boardingPastStayCardHtml/, "checked-out stays use a dedicated lightweight card");
assert.doesNotMatch(boarding.match(/function boardingPastStayCardHtml[\s\S]*?\n\}/)?.[0] || "", /confirm-undo-stay-service|complete-stay-service|edit-stay|remove-stay/, "historical stay cards have no live-work actions");
assert.match(boarding, /Completed service log/, "historical services retain simple completion audit text");
const nonDestructiveMigration = fs.readFileSync("supabase/migrations/20261124000000_retain_boarding_customer_update_media.sql", "utf8");
assert.doesNotMatch(boarding, /kennel_boarding_customer_update_retention_plan|kennel_apply_boarding_customer_update_retention/);
assert.match(nonDestructiveMigration, /"storagePaths":\[\]/, "stale clients receive no object deletion plan");
assert.match(nonDestructiveMigration, /"removedUpdateCount":0/, "stale clients cannot remove saved references");

for (const functionName of [
  "kennel_compact_boarding_payload",
  "kennel_boarding_roster_records",
  "kennel_boarding_past_stays",
  "kennel_boarding_customer_updates",
  "kennel_calendar_notes_window",
  "kennel_boarding_customer_update_retention_plan",
  "kennel_apply_boarding_customer_update_retention",
]) {
  assert.ok(migration.includes(functionName), `${functionName} is included in the migration`);
}
assert.match(migration, /security definer[\s\S]*Staff access is required to manage boarding update retention/, "privileged retention functions enforce staff membership");
assert.match(migration, /revoke all on function cuddle_stay\.kennel_apply_boarding_customer_update_retention\(text\[\]\) from public, anon/, "retention execution is not public");
assert.match(migration, /with scoped_records as[\s\S]*latest_stay as/, "owner-update reads select one newest stay across the consolidated profile");
assert.match(main, /boarding-roster-counts-v89-dog-pricing-eligibility-v90/, "boarding module cache key is current");
assert.match(index, /boarding-roster-counts-v89-dog-pricing-eligibility-v90/, "application entrypoint cache key is current");

console.log("Boarding lazy history and retention checks passed.");
