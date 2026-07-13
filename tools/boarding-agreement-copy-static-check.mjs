import fs from "node:fs";

const agreement = fs.readFileSync("js/boarding-agreement.js", "utf8");
const customer = fs.readFileSync("js/customer.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");

const requiredSnippets = [
  [agreement, 'version: "2026-07-12-cuddle-stay-v2"'],
  [agreement, 'effectiveDate: "2026-07-12"'],
  [main, "20260712-cuddle-stay-agreement-copy"],
  [main, "20260712-agreement-copy-and-checks"],
  [index, "20260712-agreement-copy-and-checks"],
  [index, "styles.css?v=20260712-agreement-errors-red-borders"],
  [index, "agreement-required-checks"],
  [index, 'id="customerAgreementElectronicConsent"'],
  [index, 'id="customerAgreementAccepted"'],
  [index, 'id="customerAgreementArbitrationAccepted"'],
  [index, 'id="customerAgreementSignatureNameConfirm"'],
  [customer, 'const signerName = $("#customerAgreementSignatureNameConfirm");'],
  [customer, 'signerLegalName: customerAgreementFieldValue("customerAgreementSignatureNameConfirm")'],
  [styles, "padding-left: 28px;"],
  [styles, ".customer-agreement-document li::marker"],
  [styles, ".agreement-required-checks .agreement-choice"],
  [styles, "#customerSignatureBlock > label.inline-check"],
  [styles, "border-color: #BF4E45 !important;"],
  [styles, ':root[data-theme="light"] body:not(.is-login-view) .form-error'],
  [styles, "color: #8F241C !important;"],
];

const forbiddenAgreementSnippets = [
  "# REQUIRED GENERAL ACCEPTANCE",
  "# REQUIRED SEPARATE ARBITRATION ACCEPTANCE",
  "# OWNER AND DOG INFORMATION",
  "☐ **I HAVE READ",
  "**Owner’s Address:**",
  "**Owner’s Phone Number:**",
  "**Dog’s Name:**",
  "**Veterinarian Phone Number:**",
];

const removedUiIds = [
  "customerAgreementOwnerPhone",
  "customerAgreementOwnerAddress",
  "customerAgreementOwnerEmail",
  "customerAgreementDogSummary",
  "customerAgreementEmergencyName",
  "customerAgreementEmergencyPhone",
  "customerAgreementVetClinic",
  "customerAgreementVetPhone",
];

for (const [source, snippet] of requiredSnippets) {
  if (!source.includes(snippet)) {
    throw new Error(`Missing required agreement copy/UI snippet: ${snippet}`);
  }
}

for (const snippet of forbiddenAgreementSnippets) {
  if (agreement.includes(snippet)) {
    throw new Error(`Agreement copy still contains redundant/static content: ${snippet}`);
  }
}

for (const id of removedUiIds) {
  if (index.includes(id)) throw new Error(`Signing UI still contains removed redundant field: ${id}`);
  if (customer.includes(id)) throw new Error(`Customer agreement logic still references removed redundant field: ${id}`);
}

if (/ownerLegalName|dogInformation|emergencyContactName|veterinarianClinic/.test(customer)) {
  throw new Error("Customer agreement response still stores redundant owner/dog/contact detail fields.");
}

console.log("boarding-agreement-copy-static-check passed");
