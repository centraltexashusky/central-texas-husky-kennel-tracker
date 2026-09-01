import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function moduleSource(path) {
  const source = fs.readFileSync(path, "utf8");
  const literal = source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
  return literal ? vm.runInNewContext(literal[1]) : source;
}

function balancedFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  const signatureEnd = source.slice(start).match(/\)\s*\{/);
  assert.ok(signatureEnd, `Missing body for ${name}`);
  const braceStart = start + signatureEnd.index + signatureEnd[0].lastIndexOf("{");
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = braceStart; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unterminated ${name}`);
}

const timesheet = moduleSource("js/timesheet.js");
const shared = moduleSource("js/shared.js");
const notifications = moduleSource("js/notifications.js");
const edgeFunction = fs.readFileSync("supabase/functions/send-notification/index.ts", "utf8");
const migration = [
  "supabase/migrations/20260901160000_protect_staff_time_off_changes.sql",
  "supabase/migrations/20260901162500_harden_staff_time_off_audit_history.sql",
  "supabase/migrations/20260901200000_allow_staff_time_off_upsert_transitions.sql",
].map((path) => fs.readFileSync(path, "utf8")).join("\n");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const packageJson = fs.readFileSync("package.json", "utf8");

assert.match(timesheet, /data-action="revise-time-off"[\s\S]*data-action="cancel-time-off-request"/, "staff request cards expose revise and cancel actions");
assert.match(timesheet, /data-action="revise-time-off"[^>]*>Change Request<\//, "approved requests use a clear change action label");
assert.match(timesheet, /Saving a revision returns this request to Pending/, "the revision dialog explains re-review");
assert.match(timesheet, /function staffTimeOffForDate[\s\S]*\["Pending", "Approved"\]/, "cancelled and denied requests no longer create schedule conflicts");
assert.match(shared, /#timeOffCancellationForm[\s\S]*cancelTimeOffRequestFromForm/, "the cancellation confirmation form is persisted");
assert.match(shared, /dataset\.action === "revise-time-off"[\s\S]*openTimeOffRequestPopup/, "the revise action opens the populated request form");
assert.match(shared, /timeOffRevised[\s\S]*timeOffCancelled/, "admin alert preferences include both staff changes");
assert.match(notifications, /timeOffRevised:[\s\S]*audienceRoles: \["admin"\]/, "revisions notify admins");
assert.match(notifications, /timeOffCancelled:[\s\S]*audienceRoles: \["admin"\]/, "cancellations notify admins");
assert.match(edgeFunction, /"timeOffCancelled"[\s\S]*"timeOffRevised"/, "the notification function allows both events");
assert.match(edgeFunction, /Cancellation note: \$\{record\.cancellationReason/, "cancellation emails include the audit note");

const context = {
  role: "helper",
  owner: true,
  currentRole() { return context.role; },
  staffRecordBelongsToCurrentUser() { return context.owner; },
};
vm.createContext(context);
for (const name of ["timeOffRequestChangeAllowed", "timeOffRequestCanStaffChange", "revisedTimeOffRequestRecord", "cancelledTimeOffRequestRecord"]) {
  vm.runInContext(balancedFunctionSource(timesheet, name), context);
}

assert.equal(context.timeOffRequestCanStaffChange({ status: "Pending" }), true);
assert.equal(context.timeOffRequestCanStaffChange({ status: "Approved" }), true);
assert.equal(context.timeOffRequestCanStaffChange({ status: "Denied" }), false);
assert.equal(context.timeOffRequestCanStaffChange({ status: "Cancelled" }), false);
context.owner = false;
assert.equal(context.timeOffRequestCanStaffChange({ status: "Pending" }), false, "staff cannot revise another employee's request");
context.owner = true;
context.role = "admin";
assert.equal(context.timeOffRequestCanStaffChange({ status: "Pending" }), false, "admin review remains separate from staff self-service");

const timestamp = "2026-09-01T19:00:00.000Z";
const existing = {
  id: "time-off-1",
  type: "timeOffRequest",
  staffName: "Alexis Hernandez",
  staffEmail: "alexis@example.com",
  startDate: "2026-09-05",
  endDate: "2026-09-06",
  reason: "Original reason",
  status: "Approved",
  reviewedAt: "2026-08-30T18:00:00.000Z",
  reviewedBy: "Admin",
  reviewNote: "Approved",
  statusHistory: [],
};
const revised = context.revisedTimeOffRequestRecord(existing, {
  startDate: "2026-09-07",
  endDate: "2026-09-08",
  reason: "Revised reason",
}, { name: "Alexis Hernandez", email: "alexis@example.com" }, timestamp);
assert.equal(revised.id, existing.id);
assert.equal(revised.staffEmail, existing.staffEmail);
assert.equal(revised.status, "Pending");
assert.equal(revised.reviewedAt, "");
assert.equal(revised.revisionCount, 1);
assert.equal(revised.revisionHistory[0].previousStatus, "Approved");
assert.deepEqual(Array.from(revised.statusHistory, (item) => `${item.from}:${item.to}`), ["Approved:Pending"]);

const cancelled = context.cancelledTimeOffRequestRecord(existing, "Plans changed", { name: "Alexis Hernandez", email: "alexis@example.com" }, timestamp);
assert.equal(cancelled.id, existing.id);
assert.equal(cancelled.status, "Cancelled");
assert.equal(cancelled.cancellationReason, "Plans changed");
assert.equal(cancelled.cancelledByEmail, existing.staffEmail);
assert.deepEqual(Array.from(cancelled.statusHistory, (item) => `${item.from}:${item.to}`), ["Approved:Cancelled"]);

assert.match(migration, /before insert or update of type, payload on cuddle_stay\.kennel_records/, "database writes are protected by a trigger");
assert.match(migration, /Staff can only change their own time off requests/, "the trigger enforces request ownership");
assert.match(migration, /old_status not in \('Pending', 'Approved'\)/, "closed requests are immutable for staff");
assert.match(migration, /new_status not in \('Pending', 'Cancelled'\)/, "staff transitions are limited to revise or cancel");
assert.match(migration, /new\.payload - allowed_change_keys/, "unrelated payload fields cannot be altered through self-service");
assert.match(migration, /new_revision_history @> old_revision_history/, "revision audit history cannot be removed");
assert.match(migration, /new_status_history @> old_status_history/, "status audit history cannot be removed");
assert.match(migration, /cancelledByEmail'[\s\S]*<> auth_email/, "the database verifies the cancellation actor");
assert.match(migration, /new\.payload - cancellation_change_keys/, "cancelling cannot silently revise request details");
assert.match(migration, /existing_upsert_payload[\s\S]*record\.id = new\.id[\s\S]*coalesce\(existing_upsert_payload ->> 'status', 'Pending'\) in \('Pending', 'Approved'\)/, "existing active requests may pass the insert phase of an upsert");
assert.match(migration, /security invoker[\s\S]*set search_path = ''/, "the trigger uses an explicit empty search path");
assert.match(migration, /revoke all on function cuddle_stay_private\.protect_staff_time_off_changes\(\)/, "the trigger function cannot be called directly by clients");
assert.match(main, /shared\.js\?[^"\n]*time-off-self-service-v91/, "shared cache key is current");
assert.match(main, /notifications\.js\?[^"\n]*time-off-self-service-v91/, "notifications cache key is current");
assert.match(main, /timesheet\.js\?[^"\n]*time-off-upsert-fix-v92/, "timesheet cache key is current");
assert.match(index, /main\.js\?[^"\n]*time-off-upsert-fix-v92/, "application entrypoint cache key is current");
assert.ok(packageJson.includes("time-off-request-self-service-static-check.mjs"), "the regression check runs in the full suite");

console.log("Time off request self-service checks passed.");
