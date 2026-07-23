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

if (!fileRecord.includes('readRecords("customerDog")') || !fileItems.includes("notificationFileItems")) failures.push("Customer file alerts do not resolve the live dog record and exact upload references.");
if (!fileItems.includes("vaccinationRecords") || !fileItems.includes("record.documents") || !fileItems.includes("profilePhotoStoragePath")) failures.push("Legacy alerts cannot recover the customer's current uploaded files.");
if (!filePopup.includes('data-action="open-customer-notification-file"') || !filePopup.includes("mediaAccessAttrs") || !filePopup.includes("View File")) failures.push("The notification popup does not render an openable file control.");
if (!openNotification.includes('notification.eventName === "customerDogFileUploaded"') || !openNotification.includes("openCustomerDogFileNotification(notification)")) failures.push("Customer file notifications still fall through to the generic popup.");
if (!notifications.includes('if (name === "customerDogFileUploaded") return "View File";')) failures.push("Customer file notifications do not advertise the correct action.");
if (!shared.includes("compact.notificationFileItems = compactMediaItemsForStorage")) failures.push("Notification file references are not compacted safely for storage.");
if (!shared.includes('notifyIfNeeded({ ...record, notificationFileItems }, "customerDogFileUploaded")')) failures.push("New customer upload alerts do not retain the exact uploaded files.");
if (!shared.includes('action.dataset.action === "open-customer-notification-file"') || !shared.includes("await openMediaFromButton(action)")) failures.push("The customer notification file button is not handled inside the popup before event propagation.");
if (!main.includes('notifications.js?v=20260723-customer-file-view-v2')) failures.push("The notification module is not cache-busted.");
if (!index.includes('js/main.js?v=20260723-customer-file-view-v2')) failures.push("The application entrypoint is not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Customer file notification static checks passed.");
