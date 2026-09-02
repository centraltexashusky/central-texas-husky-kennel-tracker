import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function moduleSource(path) {
  const source = fs.readFileSync(path, "utf8");
  const literal = source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
  return literal ? vm.runInNewContext(literal[1]) : source;
}

function balancedFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  const signatureEnd = source.slice(start).match(/\)\s*\{/);
  assert.ok(signatureEnd, `Missing body for ${name}`);
  const braceStart = start + signatureEnd.index + signatureEnd[0].lastIndexOf("{");
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = braceStart; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unterminated ${name}`);
}

const index = fs.readFileSync("index.html", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const shared = moduleSource("js/shared.js");
const boarding = moduleSource("js/boarding.js");
const customer = moduleSource("js/customer.js");
const migration = fs.readFileSync("supabase/migrations/20260901154451_protect_customer_dog_pricing_eligibility.sql", "utf8");

assert.match(index, /data-roles="admin">Pricing eligibility[\s\S]*name="pricingScopeOverride"[\s\S]*Regular pricing for this dog/, "admin dog profiles expose a regular-pricing override");
assert.match(shared, /canonicalDogProfileFields[\s\S]*"pricingScopeOverride"/, "the override is part of the canonical dog profile");
assert.match(shared, /Changed dog pricing eligibility/, "staff eligibility changes are audited");
assert.match(shared, /existing = await resolveCanonicalBoardingDogForSave\([\s\S]*saveCanonicalCustomerDogForBoarding\(payload, existing\)/, "boarding profile saves resolve the active linked row before syncing the customer profile");
assert.match(shared, /const canonicalBoardingDog = [\s\S]*await resolveCanonicalBoardingDogForSave\([\s\S]*sourceBoardingDogId = canonicalBoardingDog\.id/, "customer dog saves repair stale boarding links before persisting the profile");
assert.match(shared, /"dogName", "pricingScopeOverride", "linkedCustomerDogId", "sourceCustomerDogId"/, "merged boarding profiles preserve canonical pricing and customer links");
assert.match(shared, /#customerBookingDogList[\s\S]*addEventListener\("change"[\s\S]*renderCustomerStayProgramOptions\(\)[\s\S]*renderCustomerCrateShareOptions\(\)/, "changing the selected dog set refreshes mixed member and regular stay-pricing options");
assert.match(boarding, /record\.sourceBoardingDogId[\s\S]*boardingDogWithCanonicalSaveIdentity\(record, detachedCanonical/, "staff edits to detached amendments do not create a second active boarding profile");
assert.match(boarding, /function boardingDogFormRecordId[\s\S]*formFieldByName\(formEl, "id"\)[\s\S]*dataset[\s\S]*boardingDogRecordId/, "boarding profile edits read the active record ID without the form collection name collision");
assert.match(boarding, /function setBoardingDogFormRecordId[\s\S]*formFieldByName\(formEl, "id"\)[\s\S]*boardingDogRecordId = normalizedId/, "boarding profile edits persist the active record ID in both the named field and a stable dataset backup");
assert.match(boarding, /boardingDogEditorRecord = record\?\.id \? record : null/, "the on-demand roster keeps the opened dog record available to the profile editor");
assert.match(boarding, /function activeBoardingDog[\s\S]*boardingDogEditorRecord[\s\S]*boardingDogRecordForDisplay\(id\) \|\| raw \|\| editorRecord/, "profile edits fall back to the opened on-demand record when the full roster is not resident");
assert.match(shared, /setBoardingDogFormRecordId\(formEl, record\.id\);[\s\S]*boardingDogEditorRecord = record;/, "successful saves refresh the active on-demand profile record");
assert.match(shared, /let payload = \{[\s\S]*\.\.\.formData,[\s\S]*id: dogId,[\s\S]*saveCanonicalCustomerDogForBoarding\(payload, existing\)/, "the resolved canonical boarding ID cannot be overwritten by the blank form ID");
assert.doesNotMatch(boarding, /#boardingDogForm[^\n]*elements\.id\.value/, "boarding profile actions do not use the ambiguous form elements.id collection");
assert.match(shared, /setBoardingDogFormRecordId\(formEl, record\.id\)/, "successful boarding saves retain the canonical record ID");
assert.match(shared, /pricingEligibilityChanged[\s\S]*forceCurrentPricing: true[\s\S]*estimatedTotal: pricingSnapshot\.total/, "staff pricing eligibility changes reprice active stay totals");
assert.match(boarding, /function boardingRatePlanForRecord[\s\S]*boardingRatePlanForDog/, "staff pricing resolves the dog-level scope");
assert.match(boarding, /function boardingStayRequestServiceCatalog[\s\S]*customerPricingScopeForDog\(record, user\)[\s\S]*serviceMatchesPricingScopeForResolution\(service, pricingScope\)/, "the staff stay editor filters add-on services by the individual dog's pricing scope");
assert.match(boarding, /function resolveCanonicalBoardingDogForSave[\s\S]*payload->>linkedCustomerDogId/, "profile saves perform a targeted canonical lookup when the linked row is not loaded");
assert.match(boarding, /statusChipHtml\("Regular pricing", "pricing-scope-chip"\)/, "staff roster cards show the dog-level pricing designation");
assert.match(boarding, /hasExplicitSharedCrateRequest[\s\S]*sharedCrateRequested: sharedCrateRequested && dogRatePlan\.isMemberPricing/, "recalculation clears stale shared-crate pricing from regular-priced dogs");
assert.match(customer, /customerServiceVisibleForCurrentUser\(service, dog\)/, "services are filtered separately for each selected dog");
assert.match(customer, /pricingScopes\.size > 1[\s\S]*per-dog member and regular rates/, "mixed-scope booking copy explains per-dog rates");
assert.match(customer, /pricingScopeOverride: dogPricingScopeOverride\(dog\)/, "customer requests preserve the canonical dog pricing override");
assert.match(customer, /sharedCrateRequested: Boolean\(dogLine\.sharedCrateRequested\)/, "regular-priced dogs cannot inherit a household shared-crate discount");

const context = {
  currentUser: { membership: "member" },
  normalizedPricingScope(value = "") {
    const normalized = String(value || "").trim().toLowerCase().replaceAll("_", "-");
    if (["member", "membership"].includes(normalized)) return "member";
    if (["non-member", "nonmember", "regular"].includes(normalized)) return "non-member";
    return "";
  },
  customerPricingScopeForUser: () => "member",
  boardingRatePlanForCustomer: () => context.memberPlan,
  boardingRatePlanForDog: () => context.regularPlan,
  boardingPricingUserForRecord: () => context.currentUser,
  uniqueCustomerBookingDogs: (dogs) => dogs,
  boardingPricingDogKey: (dog) => dog.id,
};
context.memberPlan = {
  isMemberPricing: true,
  customerPricingScope: "member",
  primaryRate: 45,
  sharedCrateRate: 25,
  maxDogsPerCrate: 2,
  primaryRateConfig: { ok: true, serviceId: "member-primary", serviceName: "Member boarding", pricingScope: "member" },
  sharedCrateRateConfig: { ok: true, serviceId: "member-shared", serviceName: "Member shared crate", pricingScope: "member" },
};
context.regularPlan = {
  isMemberPricing: false,
  customerPricingScope: "non-member",
  primaryRate: 60,
  sharedCrateRate: 60,
  maxDogsPerCrate: 2,
  primaryRateConfig: { ok: true, serviceId: "regular-primary", serviceName: "Regular boarding", pricingScope: "non-member" },
  sharedCrateRateConfig: { ok: true, serviceId: "regular-primary", serviceName: "Regular boarding", pricingScope: "non-member" },
};
vm.createContext(context);
for (const name of ["dogPricingScopeOverride", "customerPricingScopeForDog", "dogUsesRegularPricingOverride", "boardingDogPricingLines"]) {
  vm.runInContext(balancedFunctionSource(boarding, name), context);
}

const canonicalContext = {
  arrayValue: (value) => Array.isArray(value) ? value : [],
  readRecords: () => [],
  boardingRecordSortTime: (record) => Date.parse(record.updatedAt || record.submittedAt || 0) || 0,
  matchingCustomerDogForBoardingProfile: () => null,
  localTestMode: false,
  supabaseClient: {},
};
vm.createContext(canonicalContext);
for (const name of ["canonicalActiveBoardingDogForCustomerDog", "boardingDogWithCanonicalSaveIdentity"]) {
  vm.runInContext(balancedFunctionSource(boarding, name), canonicalContext);
}
const staleProfile = {
  id: "boardingDog-stale",
  linkedCustomerDogId: "",
  sourceCustomerDogId: "customerDog-coco",
  sourceRecordIds: ["boardingDog-stale", "boardingDog-canonical"],
  stays: [{ id: "stay-new" }],
  pricingScopeOverride: "non-member",
};
const canonicalProfile = {
  id: "boardingDog-canonical",
  linkedCustomerDogId: "customerDog-coco",
  submittedAt: "2026-06-17T01:33:20.779Z",
  updatedAt: "2026-08-31T15:55:14.934Z",
  stays: [{ id: "stay-old" }],
};
assert.equal(
  canonicalContext.canonicalActiveBoardingDogForCustomerDog("customerDog-coco", [staleProfile, canonicalProfile])?.id,
  "boardingDog-canonical",
  "the unique linked boarding profile wins over a stale consolidated primary",
);
const canonicalSave = canonicalContext.boardingDogWithCanonicalSaveIdentity(staleProfile, canonicalProfile, "customerDog-coco");
assert.equal(canonicalSave.id, "boardingDog-canonical");
assert.equal(canonicalSave.linkedCustomerDogId, "customerDog-coco");
assert.equal(canonicalSave.pricingScopeOverride, "non-member");
assert.deepEqual(Array.from(canonicalSave.stays, (stay) => stay.id), ["stay-new"], "the edited merged stay payload is preserved");
assert.ok(Array.from(canonicalSave.duplicateProfileIds).includes("boardingDog-stale"), "the stale primary remains recorded as profile history");

const remoteFilters = [];
const remoteChain = {
  from(value) { remoteFilters.push(["from", value]); return this; },
  select(value) { remoteFilters.push(["select", value]); return this; },
  eq(field, value) { remoteFilters.push(["eq", field, value]); return this; },
  order(field) { remoteFilters.push(["order", field]); return this; },
  async limit(value) {
    remoteFilters.push(["limit", value]);
    return { data: [{ id: canonicalProfile.id, payload: canonicalProfile, updated_at: canonicalProfile.updatedAt }], error: null };
  },
};
canonicalContext.cuddleStayRequest = async (request) => request(remoteChain);
vm.runInContext("async " + balancedFunctionSource(boarding, "resolveCanonicalBoardingDogForSave"), canonicalContext);
const remotelyResolvedSave = await canonicalContext.resolveCanonicalBoardingDogForSave(staleProfile, {});
assert.equal(remotelyResolvedSave.id, "boardingDog-canonical", "a save can recover the canonical identity when the row was not loaded");
assert.ok(remoteFilters.some((entry) => entry[0] === "eq" && entry[1] === "payload->>linkedCustomerDogId" && entry[2] === "customerDog-coco"), "the fallback lookup is scoped to the linked customer dog");

assert.equal(context.customerPricingScopeForDog({ id: "member-dog" }, context.currentUser), "member");
assert.equal(context.customerPricingScopeForDog({ id: "regular-dog", pricingScopeOverride: "regular" }, context.currentUser), "non-member");
const lines = context.boardingDogPricingLines([
  { id: "member-a", dogName: "Member A" },
  { id: "regular", dogName: "Regular", pricingScopeOverride: "non-member" },
  { id: "member-b", dogName: "Member B" },
], { ratePlan: context.memberPlan, user: context.currentUser, days: 2, sharedCrateRequested: true });
assert.deepEqual(Array.from(lines, (line) => line.role), ["primary", "non-member", "shared-crate-additional"]);
assert.deepEqual(Array.from(lines, (line) => line.total), [90, 120, 50]);
assert.equal(lines[0].crateGroupId, lines[2].crateGroupId, "eligible member dogs still share the same crate group");
assert.notEqual(lines[1].crateGroupId, lines[0].crateGroupId, "the regular-priced dog remains a solo billing group");
assert.equal(lines[1].sharedCrateRequested, false);
assert.equal(lines[1].pricingScopeOverride, "non-member");

assert.match(migration, /before insert or update of type, payload on cuddle_stay\.kennel_records/, "database writes are protected by a trigger");
assert.match(migration, /Only staff can change customer dog pricing eligibility/, "customers cannot alter an existing entitlement");
assert.match(migration, /Boarding request pricing eligibility must match the linked customer dog/, "customer requests must copy the canonical dog entitlement");
assert.match(migration, /record\.user_id = auth\.uid\(\)/, "linked entitlement checks are scoped to the authenticated owner");
assert.match(migration, /security invoker[\s\S]*set search_path = ''/, "trigger functions use an explicit empty search path");
assert.match(migration, /revoke all on function cuddle_stay_private\.protect_customer_dog_pricing_eligibility\(\)/, "the trigger function is not directly callable by clients");
assert.match(main, /shared\.js\?[^"\n]*dog-pricing-eligibility-v90/, "shared cache key is current");
assert.match(main, /customer\.js\?[^"\n]*dog-pricing-eligibility-v90/, "customer cache key is current");
assert.match(main, /boarding\.js\?[^"\n]*dog-pricing-eligibility-v90/, "boarding cache key is current");
assert.match(index, /main\.js\?[^"\n]*dog-pricing-eligibility-v90/, "application entrypoint cache key is current");
assert.match(main, /shared\.js\?[^"\n]*canonical-boarding-save-v94/, "the canonical save fix is cache-busted in shared code");
assert.match(main, /boarding\.js\?[^"\n]*canonical-boarding-save-v94/, "the canonical save resolver is cache-busted");
assert.match(index, /main\.js\?[^"\n]*canonical-boarding-save-v94/, "the canonical save fix is cache-busted at the entrypoint");
assert.match(main, /shared\.js\?[^"\n]*canonical-linked-fallback-v95/, "the canonical merged-profile fallback is cache-busted in shared code");
assert.match(main, /boarding\.js\?[^"\n]*canonical-linked-fallback-v95/, "the canonical linked-record fallback is cache-busted");
assert.match(index, /main\.js\?[^"\n]*canonical-linked-fallback-v95/, "the canonical linked-record fallback is cache-busted at the entrypoint");

console.log("Per-dog pricing eligibility checks passed.");
