#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");
const passwordFunction = fs.readFileSync(new URL("../supabase/functions/admin-set-password/index.ts", import.meta.url), "utf8");

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
  /consolidatedBoardingDogRecords\(\)\.find\(\(record\) => record\.linkedCustomerDogId === dog\.id\)/,
  "new customer boarding requests must reuse the dog's canonical boarding profile",
);
assert.match(
  customer,
  /: sharedBoardingRecord;[\s\S]*const existingStay = editingStayId/,
  "new stays must append to the reused boarding profile without treating an old stay as the edited stay",
);
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
  passwordFunction,
  /activeRows\.filter\(\(row\) => row\.id !== recordId\)/,
  "admin password changes must retire any older active settings profiles",
);

console.log("Canonical profile static checks passed.");
