import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const customer = read("js/customer.js");
const boarding = read("js/boarding.js");
const notifications = read("js/notifications.js");
const shared = read("js/shared.js");
const settings = read("js/settings.js");
const edge = read("supabase/functions/send-notification/index.ts");
const migration = read("supabase/migrations/20260816013000_harden_kennel_record_authorization.sql");
const overrideMigration = read("supabase/migrations/20260817174936_add_staff_boarding_requirement_override.sql");

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

const customerSubmit = customer.slice(customer.indexOf("async function submitPendingCustomerBooking"));
requireMatch(customerSubmit, /sendPayloadBatch\(savedRecords, \{ retryIndividually: false \}\)/, "Customer family requests must use one atomic batch without individual fallback.");
requireMatch(customerSubmit, /if \(savedRecords\.length\) writeRecords\("boardingDog", originalBoardingRecords\)/, "Failed family submissions must restore the pre-submit local roster.");
requireMatch(customerSubmit, /notificationDeliveryWarning/, "Customer success feedback must distinguish saved requests from delayed notification delivery.");

const groupSave = boarding.slice(boarding.indexOf("async function saveBoardingFamilyGroupStatus"), boarding.indexOf("function renderBoardingRequests"));
requireMatch(groupSave, /sendPayloadBatch\(candidates, \{ retryIndividually: false \}\)/, "Family approval/cancellation must use one atomic batch.");
requireMatch(groupSave, /boardingApprovalPreflightIssues/, "Family approval must block incomplete vaccine or agreement requirements.");
if (/await (approveBoardingStay|saveBoardingStayStatusTransition|saveBoardingStatusTransition)\(/.test(groupSave)) {
  throw new Error("Family status changes must not persist dogs sequentially.");
}
requireMatch(boarding, /return explicitGroupKey \? \[explicitGroupKey\] : boardingFamilyHouseholdStayKeys\(entry\)/, "Explicit group IDs must be authoritative.");
requireMatch(boarding, /function requireBoardingApprovalPreflight/, "Approval and check-in must share a safety preflight.");
requireMatch(shared, /requiredVaccines\.every\(\(vaccine\) => currentRecordVaccines\.has\(vaccine\)\)/, "Vaccines OK must require every configured core vaccine, not any one current record.");
if (/keys\.push\(\\`name:/.test(boarding)) throw new Error("Owner name alone must never group boarding requests.");

requireMatch(notifications, /function notificationIsRead[\s\S]*readRecords\("notificationRead"\)/, "Alert read status must honor saved per-reader receipts independently of approval.");
requireMatch(notifications, /Delivery needs attention:/, "Alert cards must expose delivery failures.");
requireMatch(notifications, /ensurePendingBoardingRequestRecoveryAlerts/, "Pending requests missing their original alert must generate a recovery alert.");
requireMatch(shared, /PARTIAL_BATCH_SAVE/, "Partial batch persistence must throw a typed error.");
const inlineStatus = shared.slice(shared.indexOf("async function handleInlineBoardingStatusClick"), shared.indexOf("function dogRosterKey"));
requireMatch(inlineStatus, /boardingCustomerRequestStatusEventName/, "Quick-card approvals must resolve the customer notification event.");
requireMatch(inlineStatus, /await notifyIfNeeded\(savedLocal, customerNotificationEvent\)/, "Quick-card approvals must send the customer status notification after persistence.");
requireMatch(shared, /notificationList[\s\S]*addEventListener\("keydown"/, "Alert cards must be keyboard operable.");
requireMatch(settings, /function kennelLocationOccupancyMap/, "Kennel assignment must calculate occupancy in one pass.");
requireMatch(settings, /occupied by/, "Kennel assignment options must identify current occupants.");
requireMatch(settings, /Occupied kennels can be shared/, "Kennel assignment must explain that occupied kennels remain available.");
if (/Kennel Is Occupied/.test(shared)) throw new Error("Shared kennels must not be rejected during assignment.");
requireMatch(shared, /function boardingOutstandingCriticalCareTasks/, "Release safety must inspect overdue medication and feeding tasks.");
requireMatch(shared, /showOutstandingCriticalCareBlock\(record, outstandingCare, "ready for pickup"\)/, "Ready-for-pickup must block on overdue critical care.");
requireMatch(shared, /showOutstandingCriticalCareBlock\(record, outstandingCare, "check out"\)/, "Checkout must block on overdue critical care.");

requireMatch(edge, /select\("id,type,payload,user_id,helper_email"\)/, "Notification IDs must be checked against their existing record type.");
requireMatch(edge, /data && data\.type !== "notificationLog"/, "Notification delivery must reject IDs owned by another record type.");
requireMatch(edge, /from\("kennel_records"\)\.insert\(pendingRow\)/, "New notification rows must use insert-only semantics.");
requireMatch(edge, /"Idempotency-Key"/, "Provider calls must carry a deterministic idempotency key.");
requireMatch(edge, /parsed\.intro\.map\(\(line\) => escapeHtml\(line\)\)/, "Email introduction text must be HTML escaped.");

requireMatch(migration, /type <> 'boardingDog' or public\.kennel_customer_boarding_payload_is_request\(payload\)/, "Customer RLS must reject updates to already-active boarding rows.");
requireMatch(migration, /incoming_payload ->> 'isMember'/, "Self-profile RLS must protect membership entitlements.");
requireMatch(migration, /incoming_payload ->> 'hourlyRate'/, "Self-profile RLS must protect payroll rates.");
requireMatch(overrideMigration, /auth\.uid\(\) is null or not kennel_private\.kennel_is_staff_member\(\)/, "Boarding requirement overrides must enforce staff authorization on the server.");
requireMatch(overrideMigration, /char_length\(v_reason\) < 10/, "Boarding requirement overrides must require a meaningful reason.");
requireMatch(overrideMigration, /insert into public\.kennel_records[\s\S]*'auditLog'/, "Boarding requirement overrides must create an immutable staff audit record.");
requireMatch(overrideMigration, /security invoker[\s\S]*kennel_apply_boarding_requirement_override_internal/, "The public override RPC must remain an invoker wrapper around the checked private function.");
requireMatch(overrideMigration, /revoke all on function public\.kennel_apply_boarding_requirement_override[\s\S]*from anon/, "Anonymous users must not execute the boarding override RPC.");

console.log("Boarding transaction and authorization regression checks passed.");
