import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260818190000_isolate_cuddle_stay_schema.sql", "utf8");
const deleteSecurityMigration = fs.readFileSync("supabase/migrations/20260818194500_tighten_cuddle_stay_delete_and_function_security.sql", "utf8");
const revocationMigration = fs.readFileSync("supabase/migrations/20260818204500_prevent_removed_user_self_reregistration.sql", "utf8");
const membershipRepairMigration = fs.readFileSync("supabase/migrations/20260818210000_repair_active_profile_memberships.sql", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const notifications = fs.readFileSync("js/notifications.js", "utf8");
const edgeFiles = [
  "supabase/functions/admin-set-password/index.ts",
  "supabase/functions/media-access/index.ts",
  "supabase/functions/send-notification/index.ts",
  "supabase/functions/show-calendar-scrape/index.ts",
].map((file) => fs.readFileSync(file, "utf8"));

const failures = [];
const requiredMigrationClauses = [
  "alter table public.kennel_records set schema cuddle_stay",
  "alter table public.daily_task_completions set schema cuddle_stay",
  "alter table public.notification_reads set schema cuddle_stay",
  "alter table public.app_settings set schema cuddle_stay",
  "create table if not exists shared.organization_members",
  "alter table shared.organization_members enable row level security",
  "revoke all on schema cuddle_stay from public, anon, authenticated",
  "alter default privileges for role postgres in schema cuddle_stay revoke all",
  "create schema isolation_test_app",
  "drop schema isolation_test_app cascade",
  "alter role authenticator set pgrst.db_schemas = 'public, graphql_public, cuddle_stay'",
];
for (const clause of requiredMigrationClauses) {
  if (!migration.includes(clause)) failures.push(`Missing migration boundary: ${clause}`);
}
if (!shared.includes('var CUDDLE_STAY_SCHEMA = "cuddle_stay"') || !shared.includes("function cuddleStayDb")) {
  failures.push("Browser database access is not centralized on cuddle_stay.");
}
if (!shared.includes('schema: CUDDLE_STAY_SCHEMA, table: "kennel_records"')) {
  failures.push("Realtime does not subscribe to the Cuddle Stay schema.");
}
if (shared.includes('schema: "public", table: "kennel_records"') || shared.includes('cuddleStayDb(client, "public")')) {
  failures.push("Browser code still contains a public-schema fallback.");
}
for (const [index, source] of edgeFiles.entries()) {
  if (!source.includes('const CUDDLE_STAY_SCHEMA = "cuddle_stay"') || !source.includes("client.schema(CUDDLE_STAY_SCHEMA)")) {
    failures.push(`Edge Function ${index + 1} does not target cuddle_stay explicitly.`);
  }
  if (source.includes('schema("public")') || source.includes("resolveCuddleStaySchema")) {
    failures.push(`Edge Function ${index + 1} still contains a public-schema fallback.`);
  }
}
if (notifications.includes('.from("kennel_records")\n    .delete()')) {
  failures.push("Browser notification retention still performs a hard delete.");
}
if (!deleteSecurityMigration.includes("revoke delete on cuddle_stay.kennel_records from authenticated")) {
  failures.push("Authenticated hard deletes are not revoked by migration.");
}
if (!revocationMigration.includes("shared.organization_member_revocations")
  || !revocationMigration.includes("Cuddle Stay access has been removed")
  || !revocationMigration.includes("active_profile.id <> new.id")) {
  failures.push("Removed users can still self-register a new Cuddle Stay membership.");
}
if (!membershipRepairMigration.includes("clear_false_revocations")
  || !membershipRepairMigration.includes("insert into shared.organization_members")) {
  failures.push("Active profiles are not repaired after duplicate-profile revocation.");
}
if (/SUPABASE_SERVICE_ROLE_KEY/.test(shared)) failures.push("A service-role secret reference reached browser code.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}
console.log("Cuddle Stay schema isolation static checks passed.");
