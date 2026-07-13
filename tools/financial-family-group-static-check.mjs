import fs from "node:fs";

const boardingSource = fs.readFileSync("js/boarding.js", "utf8");

const sourceChecks = [
  {
    pass: boardingSource.includes("const stayKey = boardingFamilyStayKey(entry.stay || {});")
      && boardingSource.includes("return \\`group:\\${explicitGroupId}\\${stayKey ? \\`::\\${stayKey}\\` : \"\"}\\`;"),
    message: "explicit family/request grouping must include the stay window when available.",
  },
];

function boardingFamilyStayTimeKey(value = "") {
  const raw = String(value || "").trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toISOString().slice(0, 16);
}

function boardingFamilyStayKey(stay = {}) {
  const dropoff = boardingFamilyStayTimeKey(stay.dropoffTime);
  const pickup = boardingFamilyStayTimeKey(stay.pickupTime);
  if (!dropoff || !pickup) return "";
  return `${dropoff}|${pickup}`;
}

function boardingFamilyExplicitGroupKey(entry = {}) {
  const explicitGroupId = String(entry.stay?.requestGroupId || entry.stay?.reservationGroupId || entry.stay?.familyReservationId || entry.record?.requestGroupId || entry.record?.reservationGroupId || entry.record?.familyReservationId || "").trim();
  if (!explicitGroupId) return "";
  const stayKey = boardingFamilyStayKey(entry.stay || {});
  return `group:${explicitGroupId}${stayKey ? `::${stayKey}` : ""}`;
}

const sameFamilyFirstStay = {
  record: { requestGroupId: "family-kim-murphy" },
  stay: { requestGroupId: "family-kim-murphy", dropoffTime: "2026-07-14T16:00", pickupTime: "2026-07-22T11:00" },
};
const sameFamilyDifferentStay = {
  record: { requestGroupId: "family-kim-murphy" },
  stay: { requestGroupId: "family-kim-murphy", dropoffTime: "2026-06-20T10:00", pickupTime: "2026-06-23T10:00" },
};
const sameFamilySameStay = {
  record: { requestGroupId: "family-kim-murphy" },
  stay: { requestGroupId: "family-kim-murphy", dropoffTime: "2026-07-14T16:00", pickupTime: "2026-07-22T11:00" },
};

const firstStayKey = boardingFamilyExplicitGroupKey(sameFamilyFirstStay);
const differentStayKey = boardingFamilyExplicitGroupKey(sameFamilyDifferentStay);
const sameStayKey = boardingFamilyExplicitGroupKey(sameFamilySameStay);

const behaviorChecks = [
  {
    pass: firstStayKey && differentStayKey && firstStayKey !== differentStayKey,
    message: "same family/request id with different stay windows must split into separate financial line items.",
  },
  {
    pass: firstStayKey && sameStayKey && firstStayKey === sameStayKey,
    message: "same family/request id with the same stay window must still group as one family stay.",
  },
  {
    pass: firstStayKey.includes("2026-07-14T") && firstStayKey.includes("2026-07-22T"),
    message: "explicit group key must carry the stay time window for auditability.",
  },
];

const failures = [...sourceChecks, ...behaviorChecks]
  .filter((check) => !check.pass)
  .map((check) => `- ${check.message}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Financial family grouping static checks passed.");
