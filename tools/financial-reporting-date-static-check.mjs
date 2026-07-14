import fs from "node:fs";

const settingsSource = fs.readFileSync("js/settings.js", "utf8");
const mainSource = fs.readFileSync("js/main.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function financialEntryDate(record = {}, stay = {}) {
  return dateOnly(stay.pickupTime || record.pickupTime || stay.paidAt || record.paidAt || stay.checkedOutAt || record.checkedOutAt || stay.dropoffTime || stay.createdAt || record.submittedAt || record.updatedAt);
}

const juneDropoffJulyPickup = financialEntryDate(
  { submittedAt: "2026-06-24T10:30:00" },
  { dropoffTime: "2026-06-24T10:30:00", pickupTime: "2026-07-05T15:30:00" },
);
const julyDropoffAugustPickup = financialEntryDate(
  { submittedAt: "2026-07-23T10:00:00" },
  { dropoffTime: "2026-07-23T10:00:00", pickupTime: "2026-08-10T12:00:00" },
);

const checks = [
  {
    pass: settingsSource.includes("return dateOnly(stay.pickupTime || record.pickupTime || stay.paidAt || record.paidAt || stay.checkedOutAt || record.checkedOutAt || stay.dropoffTime"),
    message: "financial reporting date must prefer the stay pickup date before payment, checkout, or drop-off dates.",
  },
  {
    pass: settingsSource.includes("Financials use every non-cancelled boarding stay with a pickup date in the selected date range."),
    message: "financial calculation note must explain that the date range is based on pickup date.",
  },
  {
    pass: juneDropoffJulyPickup === "2026-07-05",
    message: "a June drop-off with a July pickup must report in July financials.",
  },
  {
    pass: julyDropoffAugustPickup === "2026-08-10",
    message: "a July drop-off with an August pickup must not report in a July-only range.",
  },
  {
    pass: mainSource.includes("settings.js?v=20260713-financial-pickup-reporting-date"),
    message: "main module must import the cache-busted financial settings module.",
  },
  {
    pass: indexSource.includes("js/main.js?v=20260713-financial-pickup-reporting-date"),
    message: "index.html must expose the latest main module cache key.",
  },
];

const failures = checks
  .filter((check) => !check.pass)
  .map((check) => `- ${check.message}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Financial reporting date static checks passed.");
