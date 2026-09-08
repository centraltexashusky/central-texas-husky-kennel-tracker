import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const notifications = read("js/notifications.js");
const shared = read("js/shared.js");
const main = read("js/main.js");
const index = read("index.html");
const failures = [];

const section = (start, end) => {
  const from = notifications.indexOf(start);
  const to = notifications.indexOf(end, from + start.length);
  return from >= 0 && to > from ? notifications.slice(from, to) : "";
};
const fileRecord = section("function customerDogFileNotificationRecord", "function customerDogFileNotificationItems");
const fileItems = section("function customerDogFileNotificationItems", "function customerDogFileNotificationHtml");
const filePopup = section("function customerDogFileNotificationHtml", "function openCustomerDogFileNotification");
const openNotification = section("async function openNotification", "function emailNow");
const operationalAlert = section("async function openOperationalNotificationRecord", "function openCareLogNotificationRecord");
const customerDogSubmit = shared.slice(shared.indexOf('$("#customerDogForm").addEventListener("submit"'), shared.indexOf("await ensureCustomerAccessProfile", shared.indexOf('$("#customerDogForm").addEventListener("submit"')));
const edge = read("supabase/functions/send-notification/index.ts");
const queueMigration = read("supabase/migrations/20260908190000_queue_customer_file_alert_before_delivery.sql");

if (!fileRecord.includes('readRecords("customerDog")') || !fileItems.includes("notificationFileItems")) failures.push("Customer file alerts do not resolve the live dog record and exact upload references.");
if (!fileItems.includes("vaccinationRecords") || !fileItems.includes("record.documents") || !fileItems.includes("profilePhotoStoragePath")) failures.push("Legacy alerts cannot recover the customer's current uploaded files.");
if (!filePopup.includes('data-action="open-customer-notification-file"') || !filePopup.includes("mediaAccessAttrs") || !filePopup.includes("View File")) failures.push("The notification popup does not render an openable file control.");
if (!openNotification.includes('notification.eventName === "customerDogFileUploaded"') || !openNotification.includes("openCustomerDogFileNotification(notification)")) failures.push("Customer file notifications still fall through to the generic popup.");
if (!notifications.includes('if (name === "customerDogFileUploaded") return "View File";')) failures.push("Customer file notifications do not advertise the correct action.");
if (!shared.includes("compact.notificationFileItems = compactMediaItemsForStorage")) failures.push("Notification file references are not compacted safely for storage.");
if (!shared.includes('notifyIfNeeded({ ...record, notificationFileItems }, "customerDogFileUploaded")')) failures.push("New customer upload alerts do not retain the exact uploaded files.");
if (customerDogSubmit.indexOf('notifyIfNeeded({ ...record, notificationFileItems }, "customerDogFileUploaded")') < 0
  || customerDogSubmit.indexOf('notifyIfNeeded({ ...record, notificationFileItems }, "customerDogFileUploaded")') > customerDogSubmit.indexOf("const boardingRecordId")) failures.push("Customer upload alerts can still be suppressed by later linked-profile synchronization failures.");
if (!edge.includes('if (eventName === "customerDogFileUploaded")')
  || !edge.includes('audienceRoles: ["admin"]')
  || !edge.includes('actionLabel: "View File"')) failures.push("The server fallback cannot create a complete admin-visible customer file alert.");
if (!shared.includes('db.rpc("queue_customer_dog_file_notification"')
  || !shared.includes("p_file_items: record.notificationFileItems")) failures.push("Customer file delivery does not durably queue its staff alert first.");
if (!queueMigration.includes("security definer")
  || !queueMigration.includes("Every alert file must already belong to this dog profile")
  || !queueMigration.includes("audienceRoles', jsonb_build_array('admin')")
  || !queueMigration.includes("deliveryStatus', 'queued'")) failures.push("The durable customer file alert queue is missing authorization or staff visibility safeguards.");
if (!shared.includes('action.dataset.action === "open-customer-notification-file"') || !shared.includes("await openMediaFromButton(action)")) failures.push("The customer notification file button is not handled inside the popup before event propagation.");
if (!operationalAlert.includes("fullRefresh: true") || !operationalAlert.includes("for (let attempt = 0; attempt < 2") || !operationalAlert.includes("notificationSourceSnapshot(notification)")) failures.push("Request and maintenance alerts can still race the scoped record loader and fall back to a generic popup.");
if (!openNotification.includes("await openOperationalNotificationRecord(sourceType, sourceId, notification)")) failures.push("Operational alerts do not wait for the exact record popup.");
if (!main.includes('notifications.js?v=20260723-customer-file-view-v2') || !main.includes("maintenance-alert-detail-active-request-lock-v36")) failures.push("The notification module is not cache-busted.");
if (!index.includes('js/main.js?v=20260723-customer-file-view-v2') || !index.includes("maintenance-alert-detail-active-request-lock-v36")) failures.push("The application entrypoint is not cache-busted.");
if (!main.includes("durable-customer-file-alert-v106") || !index.includes("durable-customer-file-alert-v106")) failures.push("The durable customer file alert path is not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Customer file notification static checks passed.");
