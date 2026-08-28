import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function moduleSource(path) {
  const source = fs.readFileSync(path, "utf8");
  const literal = source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
  return literal ? vm.runInNewContext(literal[1]) : source;
}

function functionSource(source, name, optional = false) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`));
  if (!match && !optional) throw new Error(`Missing ${name}`);
  return match?.[0] || "";
}

const services = [
  { serviceId: "deshed", serviceName: "De-Shedding Treatment", quantity: 1, unitPrice: 65 },
  { serviceId: "pawdicure", serviceName: "Pawdicure Service", quantity: 1, unitPrice: 35 },
];
function revision(id, updatedAt, calculatedAt, requests, adjustment = 60) {
  const serviceSubtotal = requests.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const total = 135 + adjustment + serviceSubtotal;
  return {
    id,
    stays: [{
      id: `stay-${id}`, requestCode: "BR-TEST-SERVICE-REVISION", status: "Approved",
      dropoffTime: "2026-08-28T16:00", pickupTime: "2026-08-31T10:40", updatedAt,
      requests, serviceTasks: requests.map((request) => ({ ...request, status: "pending" })),
      invoiceAdjustments: [{ id: "adjustment", type: "charge", amount: adjustment }],
      invoiceEvents: [{ id: `event-${id}`, amount: adjustment }],
      estimatedTotal: total, billingDays: 3, groupTotal: total + 145, requestGroupTotal: total + 145,
      stayProgram: null, stayProgramId: "", stayProgramName: "", stayProgramRate: 0,
      pricingSnapshot: {
        version: "boarding-rate-v2", calculatedAt, total, serviceSubtotal, boardingSubtotal: 135,
        adjustmentsTotal: adjustment, billingDays: 3, groupTotal: total + 145,
        currentDogRole: "shared-crate-additional", sharedCrateRequested: true,
        lineItems: [
          { type: "boarding", amount: 135, quantity: 3, unitPrice: 45 },
          ...requests.map((request) => ({ type: "service", label: request.serviceName,
            quantity: request.quantity, unitPrice: request.unitPrice, amount: request.quantity * request.unitPrice })),
          { type: "charge", amount: adjustment },
        ],
      },
    }],
  };
}

const legacy = moduleSource("script.js");
const shared = moduleSource("js/shared.js");
const boarding = moduleSource("js/boarding.js");
const settings = moduleSource("js/settings.js");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
for (const module of ["shared", "boarding"]) {
  assert.ok(main.split("\n").some((line) => line.startsWith(`import "./${module}.js?`) && line.includes("service-pricing-revision-v62")), `${module} import must be cache-busted`);
}
assert.ok(index.includes("service-pricing-revision-v62"), "Entrypoint must be cache-busted");
assert.ok(fs.readFileSync("package.json", "utf8").includes("boarding-service-pricing-revision-check.mjs"), "Regression test must run in the full suite");
for (const [label, source] of [["modules", shared + boarding + settings], ["legacy", legacy]]) {
  const context = {
    arrayValue: (value) => Array.isArray(value) ? value : [],
    boardingServiceTaskNameKey: (request) => request.serviceId || request.serviceName || String(request),
    boardingStayRequestUnitPrice: (request) => Number(request.unitPrice || 0),
    boardingServiceTaskSources: (_record, stay) => stay.requests || [],
    boardingStayServiceTasks: (_record, stay) => stay.serviceTasks || [],
    boardingStayMergeKeyForRecord: (_record, stay) => `${stay.dropoffTime}|${stay.pickupTime}`,
    boardingStayMergeTime: (_record, stay) => Date.parse(stay.updatedAt),
    boardingStatusPriority: () => 0,
    boardingStayDisplayStatus: (_record, stay) => stay.status,
    boardingStaySourceIds: (stay) => [stay.id],
    boardingStayRequestCode: (_record, stay) => stay.requestCode,
    itemSortTime: (item) => Date.parse(item.updatedAt || 0) || 0,
  };
  vm.createContext(context);
  for (const name of ["mergeBoardingStayRequestList", "boardingStayPricingItemForMerge",
    "boardingStayRequestsForMergedItems", "mergeBoardingStayServiceTasksForRequests", "mergeBoardingStays"]) {
    vm.runInContext(functionSource(source, name, name === "boardingStayPricingItemForMerge"), context);
  }
  const merge = (...records) => context.mergeBoardingStays(records, records[0])[0];
  const original = revision("original", "2026-08-28T20:28:04.739Z", "2026-08-28T18:58:39.154Z", []);
  const amendment = revision("amendment", "2026-08-28T20:28:03.987Z", "2026-08-28T20:14:56.178Z", services);
  const unchanged = JSON.stringify([original, amendment]);
  for (const records of [[original, amendment], [amendment, original]]) {
    const merged = merge(...records);
    assert.equal(merged.pricingSnapshot.total, 295, `${label}: status sync must not restore the $195 snapshot`);
    assert.equal(merged.pricingSnapshot, amendment.stays[0].pricingSnapshot, "Use saved pricing; do not recalculate the agreed rates");
    assert.equal(merged.estimatedTotal, 295);
    assert.equal(merged.groupTotal, 440);
    assert.equal(merged.requestGroupTotal, 440);
    assert.equal(merged.requests.length, 2);
    assert.equal(merged.serviceTasks.length, 2);
    assert.equal(merged.invoiceAdjustments[0].amount, 60);
    assert.equal(merged.pricingSnapshot.currentDogRole, "shared-crate-additional");
    assert.equal(merged.status, "Approved");
    assert.equal(merged.id, original.stays[0].id, "Lifecycle identity still follows the latest status update");
  }
  assert.equal(JSON.stringify([original, amendment]), unchanged, "Merging must not mutate source records");

  // A staff revision remains authoritative even if an older request gets a later status update.
  const staff = revision("staff", "2026-08-28T21:25:25Z", "2026-08-28T21:25:25Z", services, 80);
  const statusOnly = structuredClone(amendment);
  statusOnly.stays[0].updatedAt = "2026-08-28T21:30:00Z";
  statusOnly.stays[0].status = "Checked Out";
  statusOnly.stays[0].serviceTasks[0].status = "completed";
  const latest = merge(staff, statusOnly);
  assert.equal(latest.pricingSnapshot.total, 315);
  assert.equal(latest.invoiceAdjustments[0].amount, 80);
  assert.equal(latest.invoiceEvents[0].id, "event-staff");
  assert.equal(latest.status, "Checked Out");
  assert.equal(latest.serviceTasks[0].status, "completed", "Service completion must survive invoice selection");

  for (const requests of [[{ ...services[0], quantity: 2 }], [services[1]], []]) {
    const changed = revision("changed", "2026-08-28T21:25:25Z", "2026-08-28T21:25:25Z", requests, 0);
    changed.stays[0].invoiceAdjustments = [];
    const merged = merge(statusOnly, changed);
    assert.equal(JSON.stringify(merged.requests), JSON.stringify(requests), "Quantity changes and explicit removals must win");
    assert.equal(merged.serviceTasks.length, requests.length, "Removed services must not reappear as tasks");
    assert.equal(merged.invoiceAdjustments.length, 0);
    assert.equal(merged.pricingSnapshot.total, 135 + requests.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  }

  const oldRecord = structuredClone(original);
  const oldAmendment = structuredClone(amendment);
  delete oldRecord.stays[0].pricingSnapshot.calculatedAt;
  delete oldAmendment.stays[0].pricingSnapshot.calculatedAt;
  assert.equal(merge(oldRecord, oldAmendment).pricingSnapshot.total, 195, "Undated legacy snapshots retain existing precedence");
  assert.equal(merge(staff).pricingSnapshot.total, 315, "Single records must remain unchanged");
}
console.log("Boarding service pricing revision checks passed (modules and legacy).");
