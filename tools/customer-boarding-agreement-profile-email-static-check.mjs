import fs from "node:fs";

const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
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
if (!indexHtml.includes('id="customerAgreementRecordsList"') ||
  !indexHtml.includes("Signed Contracts &amp; Agreements") ||
  !indexHtml.includes('id="customerFilesList"')) {
  throw new Error("My Records must separate executed agreements from dog profile files.");
}
if (!customer.includes("function renderCustomerAgreementRecords()") ||
  !customer.includes("customerAgreementCardResponseSummaryHtml") ||
  !customer.includes("acknowledgementResponses") ||
  !customer.includes("customerFieldResponses")) {
  throw new Error("Customer agreement cards must show acknowledgements and manually entered information.");
}
if (!shared.includes('$("#customerFilesPage")?.addEventListener("click"')) {
  throw new Error("Agreement actions must work from the dedicated My Records agreement section.");
}
if (!edgeFunction.includes('"FULLY EXECUTED AGREEMENT"') || !edgeFunction.includes("agreementText")) {
  throw new Error("Both agreement emails must include the completed agreement text.");
}
if (!edgeFunction.includes("record.signatureHash") || !edgeFunction.includes("record.documentHash")) {
  throw new Error("The agreement emails must include signature and document verification hashes.");
}
if (!edgeFunction.includes('audience: "admin"') ||
  !edgeFunction.includes('audience: "customer"') ||
  !edgeFunction.includes('subject: `Your fully executed agreement: ${agreementTitle}`') ||
  !edgeFunction.includes('appLink("#customerFilesPage")')) {
  throw new Error("The executed agreement must be emailed separately to both the admin and customer.");
}
if (!edgeFunction.includes("acknowledgementResponses.flatMap") ||
  !edgeFunction.includes("customerFieldResponses.flatMap")) {
  throw new Error("Executed-agreement emails must include checkbox selections and customer-entered answers.");
}
if (!edgeFunction.includes('eventName === "customerBoardingAgreementSigned"') ||
  !edgeFunction.includes('settingsUserEmailsByRoles(adminClient, ["admin"])')) {
  throw new Error("The signed-agreement email must resolve administrators server-side.");
}

console.log("customer-boarding-agreement-profile-email-static-check passed");
