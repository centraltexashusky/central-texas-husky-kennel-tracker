import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const edgeFunction = read("supabase/functions/send-notification/index.ts");
const shared = read("js/shared.js");
const boarding = read("js/boarding.js");
const main = read("js/main.js");
const index = read("index.html");
const atomicUpdateMigration = read("supabase/migrations/20260818211500_atomic_staff_owner_updates.sql");

const callerIsStaff = edgeFunction.match(/async function callerIsStaff[\s\S]*?\n}\n\nfunction recordAudienceEmails/)?.[0] || "";
const failures = [];

if (!callerIsStaff) failures.push("The notification staff authorization helper could not be found.");
if (callerIsStaff.includes(".maybeSingle()")) failures.push("Notification staff authorization still assumes one settings user row per email.");
if (!callerIsStaff.includes("return (data || []).some")) failures.push("Notification staff authorization does not accept any active matching staff profile.");
if (!callerIsStaff.includes('return !removed && ["admin", "helper", "staff"].includes(role);')) failures.push("Notification staff authorization does not reject removed profiles while accepting staff roles.");
if (!shared.includes('await edgeFunctionErrorMessage(error, "Notification delivery could not complete.")')) failures.push("Notification delivery does not preserve the Edge Function error response.");
if (!boarding.includes('const notification = await notifyIfNeeded(updated, "customerStayUpdateSent");')) failures.push("Owner updates do not retain the email delivery result.");
if (!boarding.includes('db.rpc("kennel_save_boarding_customer_update"')) failures.push("Staff owner updates do not use the atomic database RPC.");
if (boarding.includes('await sendPayload(updated);\n  const notification = await notifyIfNeeded(updated, "customerStayUpdateSent");')) failures.push("Owner updates still rewrite the full merged boarding profile before notification.");
if (!boarding.includes('uploadedMediaItems.filter((item) => mediaItemHasOpenableSource(item))')) failures.push("Failed owner-update uploads can still be stored as attachments.");
if (!boarding.includes("boardingCustomerUpdateDeliverySummary(notification)")) failures.push("Owner updates do not translate delivery results into user-facing status.");
if (!boarding.includes("ownerUpdateNotification: notification")) failures.push("Owner-update callers cannot inspect the email delivery result.");
if (!shared.includes('delivery.title')) failures.push("The owner-update popup does not display the actual delivery outcome.");
if (!shared.includes('delivery.reason')) failures.push("The owner-update popup does not display the delivery failure reason.");
if (!main.includes('dog-show-invoice-record-v37')) failures.push("Shared notification handling is not cache-busted.");
if (!main.includes('atomic-owner-update-v45')) failures.push("Boarding owner-update handling is not cache-busted.");
if (!index.includes('dog-show-lifecycle-owner-update-photo-invoice-v39')) failures.push("The production module entrypoint is not cache-busted.");
if (!index.includes('atomic-owner-update-v49')) failures.push("The production entrypoint does not load the atomic owner-update release.");
if (!atomicUpdateMigration.includes("auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member()")) failures.push("Atomic owner updates do not enforce staff authorization.");
if (!atomicUpdateMigration.includes("for update")) failures.push("Atomic owner updates do not lock the boarding row before appending.");
if (!atomicUpdateMigration.includes("object_record.owner_id = auth.uid()::text")) failures.push("Atomic owner updates do not validate uploaded media ownership.");
if (!atomicUpdateMigration.includes("'Added customer boarding update'")) failures.push("Atomic owner updates do not create a staff audit record.");
if (!atomicUpdateMigration.includes("revoke all on function cuddle_stay_private.kennel_save_boarding_customer_update_internal")) failures.push("The private owner-update function remains directly executable.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Owner update email static check passed.");
