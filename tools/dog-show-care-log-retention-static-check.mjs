import assert from "node:assert/strict";
import fs from "node:fs";

const migrationPath = "supabase/migrations/20260728030000_cleanup_expired_show_care_logs.sql";
const migration = fs.readFileSync(migrationPath, "utf8");
const schema = fs.readFileSync("supabase-schema.sql", "utf8");

for (const sql of [migration, schema]) {
  assert.match(sql, /cleanup_expired_show_care_logs\(\)/, "Cleanup function is missing.");
  assert.match(sql, /care_log\.type = 'showCareLog'/, "Cleanup is not limited to Dog Show care logs.");
  assert.match(
    sql,
    /activityType', ''\)\) in \('potty', 'water', 'feeding'\)/,
    "Cleanup is not limited to potty, water, and feeding logs.",
  );
  assert.match(sql, /show_event\.id = care_log\.payload ->> 'showEventId'/, "Cleanup does not require a linked show.");
  assert.match(sql, /::date <= current_date - 7/, "Cleanup does not retain logs for seven days after the show.");
  assert.match(sql, /cron\.schedule\(/, "Daily cleanup job is missing.");
  assert.match(sql, /'17 8 \* \* \*'/, "Cleanup is not scheduled daily.");
  assert.doesNotMatch(sql, /care_log\.type\s*!=/, "Cleanup scope could include non-care records.");
}

console.log("Dog Show care-log retention checks passed.");
