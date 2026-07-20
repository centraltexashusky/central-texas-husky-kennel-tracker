import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const edgeFunction = read("supabase/functions/send-notification/index.ts");
const shared = read("js/shared.js");
const boarding = read("js/boarding.js");
const main = read("js/main.js");
const index = read("index.html");

const callerIsStaff = edgeFunction.match(/async function callerIsStaff[\s\S]*?\n}\n\nfunction recordAudienceEmails/)?.[0] || "";
const failures = [];

if (!callerIsStaff) failures.push("The notification staff authorization helper could not be found.");
if (callerIsStaff.includes(".maybeSingle()")) failures.push("Notification staff authorization still assumes one settings user row per email.");
if (!callerIsStaff.includes("return (data || []).some")) failures.push("Notification staff authorization does not accept any active matching staff profile.");
if (!callerIsStaff.includes('return !removed && ["admin", "helper", "staff"].includes(role);')) failures.push("Notification staff authorization does not reject removed profiles while accepting staff roles.");
if (!shared.includes('await edgeFunctionErrorMessage(error, "Notification delivery could not complete.")')) failures.push("Notification delivery does not preserve the Edge Function error response.");
if (!boarding.includes('const notification = await notifyIfNeeded(updated, "customerStayUpdateSent");')) failures.push("Owner updates do not retain the email delivery result.");
if (!boarding.includes("boardingCustomerUpdateDeliverySummary(notification)")) failures.push("Owner updates do not translate delivery results into user-facing status.");
if (!boarding.includes("ownerUpdateNotification: notification")) failures.push("Owner-update callers cannot inspect the email delivery result.");
if (!shared.includes('delivery.title')) failures.push("The owner-update popup does not display the actual delivery outcome.");
if (!shared.includes('delivery.reason')) failures.push("The owner-update popup does not display the delivery failure reason.");
if (!main.includes('shared.js?v=20260720-canonical-customer-profiles')) failures.push("Shared notification handling is not cache-busted.");
if (!main.includes('boarding.js?v=20260720-owner-update-email-delivery')) failures.push("Boarding owner-update handling is not cache-busted.");
if (!index.includes('js/main.js?v=20260720-canonical-customer-profiles')) failures.push("The production module entrypoint is not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Owner update email static check passed.");
