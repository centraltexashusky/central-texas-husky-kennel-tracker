import fs from "node:fs";

const settingsSource = fs.readFileSync("js/settings.js", "utf8");
const mainSource = fs.readFileSync("js/main.js", "utf8");
const indexSource = fs.readFileSync("index.html", "utf8");

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function financialEntryDate(record = {}, stay = {}) {
  return dateOnly(stay.dropoffTime || record.dropoffTime || stay.paidAt || record.paidAt || stay.checkedOutAt || record.checkedOutAt || stay.pickupTime || stay.createdAt || record.submittedAt || record.updatedAt);
}

const juneStayCheckedOutInJuly = financialEntryDate(
  { checkedOutAt: "2026-07-05T15:30:00", submittedAt: "2026-06-24T10:30:00" },
  { dropoffTime: "2026-06-24T10:30:00", pickupTime: "2026-06-29T15:30:00", checkedOutAt: "2026-07-05T15:30:00" },
);

const checks = [
  {
    pass: settingsSource.includes("return dateOnly(stay.dropoffTime || record.dropoffTime || stay.paidAt || record.paidAt || stay.checkedOutAt || record.checkedOutAt || stay.pickupTime"),
    message: "financial reporting date must prefer the stay drop-off date before payment, checkout, or pickup dates.",
  },
  {
    pass: settingsSource.includes("Financials use every non-cancelled boarding stay that starts in the selected date range."),
    message: "financial calculation note must explain that the date range is based on stay start date.",
  },
  {
    pass: juneStayCheckedOutInJuly === "2026-06-24",
    message: "a June boarding stay checked out in July must report in June financials.",
  },
  {
    pass: mainSource.includes("settings.js?v=20260713-financial-dropoff-reporting-date"),
    message: "main module must import the cache-busted financial settings module.",
  },
  {
    pass: indexSource.includes("js/main.js?v=20260713-financial-dropoff-reporting-date"),
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
