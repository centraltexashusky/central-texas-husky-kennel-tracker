#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { DOG_SHOW_AKC_BREEDS_2026 } from "../js/akc-breed-names.js";
import { DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026 } from "../js/dog-show-point-data.js";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const boarding = fs.readFileSync(new URL("../js/boarding.js", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const maintenance = fs.readFileSync(new URL("./boarding-data-maintenance.mjs", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const breedNames = fs.readFileSync(new URL("../js/akc-breed-names.js", import.meta.url), "utf8");

for (const field of ["akcRegistrationNumber", "microchipNumber", "sireName", "damName"]) {
  assert.equal(
    (index.match(new RegExp(`name="${field}"`, "g")) || []).length,
    3,
    `${field} must be available in Our Dogs, customer dogs, and Boarding Dogs`,
  );
  assert.match(shared, new RegExp(`"${field}"`), `${field} must be part of canonical dog profile syncing`);
  assert.match(boarding, new RegExp(`${field}: dog\\.${field}`), `${field} must copy from a customer dog into Boarding Dogs`);
  assert.match(customer, new RegExp(`${field}: record\\.${field}`), `${field} must remain available through customer/boarding profile projection`);
  assert.match(maintenance, new RegExp(`"${field}"`), `${field} must survive boarding record consolidation`);
  assert.doesNotMatch(
    index,
    new RegExp(`<label>[^<]+<small>Optional</small><input[^>]+name="${field}"`),
    `${field} must not display an Optional helper label`,
  );
}

assert.equal(
  (index.match(/data-akc-breed-select/g) || []).length,
  2,
  "customer and boarding dog forms must use the shared AKC breed selector",
);
assert.equal(
  (index.match(/data-akc-breed-other/g) || []).length,
  2,
  "customer and boarding dog forms must expose custom breed text for Other type",
);
assert.match(shared, /DOG_SHOW_AKC_BREEDS_2026/, "breed choices must reuse the lightweight AKC breed-name catalog");
assert.match(breedNames, /"Siberian Huskies"/, "the shared breed-name catalog must retain official Siberian Husky choices");
assert.deepEqual(DOG_SHOW_AKC_BREEDS_2026, DOG_SHOW_AKC_BREED_POINT_SCHEDULES_2026.breeds, "the lightweight catalog must exactly match the official point schedule breed list");
assert.match(shared, /select\.add\(new Option\("Other type", AKC_OTHER_BREED_VALUE\)\)/, "breed selector must include Other type");
assert.match(shared, /function syncAkcBreedControl/, "existing breed values must be restored into the breed selector");
assert.match(shared, /function handleAkcBreedSelection/, "Other type must reveal the custom breed input");
assert.match(main, /dog-profile-registration-akc-breeds/, "changed profile modules must be cache-busted");

console.log("Dog profile registration and AKC breed static checks passed.");
