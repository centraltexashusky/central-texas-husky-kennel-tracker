import fs from "node:fs";

const settings = fs.readFileSync(new URL("../js/settings.js", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");

for (const expected of [
  "function boardingAgreementSnapshotFromBoardingRecord(record = {})",
  'readRecords("boardingDog")',
  "archivedFromBoardingRecord: true",
  "sourceBoardingDogId",
  "sourceDogName",
  "Saved with booking record",
  "function allSettingsUserAgreementSnapshots()",
]) {
  if (!settings.includes(expected)) {
    throw new Error(`Legacy signed-agreement profile resolution is missing: ${expected}`);
  }
}

if (!shared.includes('settingsUsersPage: { critical: ["settingsUser"], deferred: ["boardingAgreement", "boardingDog"] }')) {
  throw new Error("The Settings Users page must load boarding records that contain legacy signed agreements.");
}
if (!shared.includes('hasAny(["settingsUser", "boardingAgreement", "boardingDog"])')) {
  throw new Error("The Settings Users page must rerender when a legacy boarding agreement arrives.");
}

for (const expected of [
  "function customerLegacyAgreementNoticeHtml(record = {})",
  "function customerLegacyAgreementSummaryHtml(record = {})",
  "The drawn signature image was not retained in this older booking format.",
  "the current agreement text is not substituted for it",
  "record.agreementVersion === CUSTOMER_BOARDING_AGREEMENT_VERSION",
]) {
  if (!customer.includes(expected)) {
    throw new Error(`Legacy agreement integrity handling is missing: ${expected}`);
  }
}

console.log("customer-legacy-boarding-agreement-static-check passed");
