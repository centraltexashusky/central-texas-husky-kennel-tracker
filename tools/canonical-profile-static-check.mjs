#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");
const passwordFunction = fs.readFileSync(new URL("../supabase/functions/admin-set-password/index.ts", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const roleResolver = schema.slice(
  schema.indexOf("create or replace function kennel_private.kennel_user_role()"),
  schema.indexOf("create or replace function kennel_private.kennel_is_admin()"),
);

assert.match(
  shared,
  /retiredDuplicates[\s\S]*sendPayloadBatch\(\[\.\.\.retiredDuplicates, payload\]/,
  "settings profile saves must retire duplicate rows remotely before saving the canonical row",
);
assert.match(
  shared,
  /!activeProfile && removedSettingsUserForEmail/,
  "a historical merged row must not block updates to an active customer profile",
);
assert.match(
  customer,
  /customerBoardingRecordCanAcceptRequestWrite\(existingTarget\)/,
  "new customer boarding requests must only reuse a canonical profile that contains request-safe history",
);
assert.match(
  customer,
  /function customerBoardingRequestTargetForDog\(dog = \{\}\)[\s\S]*linkedCustomerDogId[\s\S]*sourceBoardingDogId/,
  "customer requests must resolve the active linked profile before relying on a possibly retired boarding source id",
);
assert.match(
  customer,
  /const sharedBoardingRecord = customerBoardingRequestTargetForDog\(dog\)/,
  "customer request submission must use canonical profile fallback resolution",
);
assert.match(
  customer,
  /detachedFromHistoricalProfile[\s\S]*linkedCustomerDogId: detachedFromHistoricalProfile[\s\S]*sourceBoardingDogId:/,
  "new requests must detach from completed boarding history while keeping source links to the dog profile",
);
assert.match(
  customer,
  /customerBoardingEditableRequestRecord\(editingId, editingStayId\)/,
  "customer edits must write the raw pending request row instead of a merged record with staff history",
);
assert.match(
  customer,
  /refreshCustomerBoardingRecordsBeforeEditSubmit\(editingId\)[\s\S]*customerBoardingEditCanStillSubmit\(editingRecord \|\| \{\}, editingStayId\)/,
  "customer amendments must refresh and re-check the stay status immediately before the final save",
);
assert.match(
  customer,
  /Could Not Verify Request Status[\s\S]*Your changes were not submitted because the current stay status could not be verified/,
  "customer amendments must fail closed when the current stay status cannot be verified",
);
assert.match(
  customer,
  /Request Changes Locked[\s\S]*Kennel staff can still update the active stay/,
  "an already-open customer amendment must be blocked after staff activates the stay",
);
assert.match(
  customer,
  /editingRecord \? editingRecordCanAcceptRequestWrite : customerBoardingRecordCanAcceptRequestWrite\(existingTarget\)/,
  "customer edits must apply the request-safe history guard instead of automatically reusing the source row",
);
assert.match(
  customer,
  /customerBookingAmendmentStableId\("stay", editingRecord, existingStay\)/,
  "an edit to a mixed-history profile must use a detached amendment stay identity",
);
assert.match(
  customer,
  /customerBookingAmendmentStableId\("boardingDog", editingRecord, existingStay\)/,
  "an edit to a mixed-history profile must use a detached amendment record identity",
);
const statusGuardSource = customer.match(/function customerBoardingStatusIsRequestWritable\(value = ""\) \{[\s\S]*?\n\}/)?.[0] || "";
const recordGuardSource = customer.match(/function customerBoardingRecordCanAcceptRequestWrite\(record = \{\}\) \{[\s\S]*?\n\}/)?.[0] || "";
const requestWriteGuard = new Function(
  "arrayValue",
  `${statusGuardSource}\n${recordGuardSource}\nreturn customerBoardingRecordCanAcceptRequestWrite;`,
)((value) => Array.isArray(value) ? value : []);
assert.equal(
  requestWriteGuard({ id: "pending-profile", boardingStatus: "Pending", stays: [{ status: "pending_customer_request" }], statusHistory: [{ from: "Pending", to: "Pending" }] }),
  true,
  "a request-only boarding profile should remain reusable",
);
const requestTargetSource = customer.match(/function customerBoardingRequestTargetForDog\(dog = \{\}\) \{[\s\S]*?\n\}/)?.[0] || "";
const requestTargetForDog = new Function(
  "consolidatedBoardingDogRecords",
  "boardingDogRecordForDisplay",
  "boardingDogIdFromCustomerDogValue",
  "arrayValue",
  `${requestTargetSource}\nreturn customerBoardingRequestTargetForDog;`,
)(
  () => [{
    id: "boardingDog-canonical",
    linkedCustomerDogId: "customerDog-mango",
    sourceBoardingDogId: "boardingDog-retired",
    sourceRecordIds: ["boardingDog-canonical"],
  }],
  () => null,
  (value) => String(value || "").startsWith("boardingDog-") ? String(value) : "",
  (value) => Array.isArray(value) ? value : [],
);
assert.equal(
  requestTargetForDog({ id: "customerDog-mango", sourceBoardingDogId: "boardingDog-retired" })?.id,
  "boardingDog-canonical",
  "a stale source boarding id must fall back to the active profile linked to the customer dog",
);
assert.equal(
  requestWriteGuard({ id: "historical-profile", boardingStatus: "Checked Out", checkedOutAt: "2026-07-17T14:00:00Z", stays: [{ status: "Checked Out" }], statusHistory: [{ from: "Ready For Pickup", to: "Checked Out" }] }),
  false,
  "a completed boarding profile must not be rewritten by a new customer request",
);
assert.equal(
  requestWriteGuard({ id: "merged-profile", boardingStatus: "Pending", stays: [{ status: "Pending" }, { status: "Checked Out", checkedOutAt: "2026-07-17T14:00:00Z" }] }),
  false,
  "a merged profile with pending and historical stays must detach the new request",
);
assert.match(main, /customer-request-amendment-v35[\s\S]*maintenance-alert-detail-active-request-lock-v36/, "the customer module active-stay lock is not cache-busted");
assert.match(index, /customer-request-amendment-v35-maintenance-alert-detail-active-request-lock-v36/, "the app entrypoint active-stay lock is not cache-busted");
assert.match(main, /customer-canonical-profile-fallback-v42/, "the customer canonical-profile fallback is not cache-busted");
assert.match(index, /customer-canonical-profile-fallback-v42/, "the app entrypoint canonical-profile fallback is not cache-busted");
assert.match(
  schema,
  /create unique index if not exists kennel_records_one_active_settings_user_email_idx/,
  "the database must enforce one active settings profile per email",
);
assert.match(
  schema,
  /create unique index if not exists kennel_records_one_active_boarding_profile_idx/,
  "the database must enforce one active boarding profile per customer dog",
);
assert.match(
  roleResolver,
  /payload ->> 'removed', 'false'\)\) <> 'true'/,
  "staff role resolution must prefer active profiles over retired duplicates",
);
assert.match(
  roleResolver,
  /elsif exists \([\s\S]*Profile history without an active row means the account was revoked/,
  "staff role resolution must preserve explicit account revocation",
);
assert.match(
  passwordFunction,
  /activeRows\.filter\(\(row\) => row\.id !== recordId\)/,
  "admin password changes must retire any older active settings profiles",
);

console.log("Canonical profile static checks passed.");
