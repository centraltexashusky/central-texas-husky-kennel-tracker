import fs from "node:fs";

const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const settings = fs.readFileSync(new URL("../js/settings.js", import.meta.url), "utf8");
const notifications = fs.readFileSync(new URL("../js/notifications.js", import.meta.url), "utf8");
const edgeFunction = fs.readFileSync(
  new URL("../supabase/functions/send-notification/index.ts", import.meta.url),
  "utf8",
);

const agreementSaveIndex = customer.indexOf('await sendPayload(record);');
const profileSaveIndex = customer.indexOf('await saveCustomerAgreementToProfile(record);', agreementSaveIndex);
const notificationIndex = customer.indexOf('await notifyIfNeeded(record, "customerBoardingAgreementSigned");', profileSaveIndex);
if (agreementSaveIndex < 0 || profileSaveIndex < 0 || notificationIndex < 0) {
  throw new Error("A newly signed agreement must be saved, linked to the profile, and then notify the admin.");
}

if (!settings.includes('function latestBoardingAgreementForSettingsUser(user = {})')) {
  throw new Error("The staff profile view must resolve the canonical signed agreement by customer email.");
}
if (!settings.includes('readRecords("boardingAgreement")')) {
  throw new Error("The staff profile view must read canonical boarding agreement records.");
}
if (!settings.includes('"Saved to customer profile"')) {
  throw new Error("The customer profile must clearly identify the saved boarding agreement.");
}

for (const source of [notifications, edgeFunction]) {
  if (!source.includes("customerBoardingAgreementSigned")) {
    throw new Error("The signed-agreement notification event is missing from a delivery layer.");
  }
}
if (!notifications.includes('audienceRoles: ["admin"]')) {
  throw new Error("The signed-agreement notification must target the admin audience.");
}
if (!edgeFunction.includes('"SIGNED AGREEMENT"') || !edgeFunction.includes("agreementText")) {
  throw new Error("The admin email must include the completed agreement text.");
}
if (!edgeFunction.includes("record.signatureHash") || !edgeFunction.includes("record.documentHash")) {
  throw new Error("The admin email must include signature and document verification hashes.");
}
if (!edgeFunction.includes('eventName === "customerBoardingAgreementSigned"') ||
  !edgeFunction.includes('settingsUserEmailsByRoles(adminClient, ["admin"])')) {
  throw new Error("The signed-agreement email must resolve administrators server-side.");
}

console.log("customer-boarding-agreement-profile-email-static-check passed");
