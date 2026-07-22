import fs from "node:fs";
import vm from "node:vm";

function embeddedSource(path) {
  const source = fs.readFileSync(path, "utf8");
  const match = source.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
  if (!match) throw new Error(`Could not extract embedded module from ${path}.`);
  const context = {};
  vm.runInNewContext(`globalThis.moduleSource = ${match[1]};`, context);
  return context.moduleSource;
}

const settings = embeddedSource("js/settings.js");
const customer = embeddedSource("js/customer.js");
const shared = embeddedSource("js/shared.js");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

const normalizeMatch = settings.match(/function normalizeOperationTime\(value = "", fallback = defaultOperationOpenTime\) \{[\s\S]*?\n\}/);
const windowsMatch = settings.match(/function operationTimeWindows\(record = \{\}\) \{[\s\S]*?\n\}/);
const validationMatch = settings.match(/function operationTimeWindowValidation\(windows = \[\]\) \{[\s\S]*?\n\}/);
if (!normalizeMatch || !windowsMatch || !validationMatch) {
  failures.push("Could not extract multi-window normalization and validation helpers.");
} else {
  const normalizeOperationTime = Function("defaultOperationOpenTime", `return (${normalizeMatch[0]});`)("09:00");
  const timeToMinutes = (value = "") => {
    const [hours, minutes] = String(value).split(":").map(Number);
    return hours * 60 + minutes;
  };
  const operationTimeWindows = Function(
    "normalizeOperationTime",
    "defaultOperationOpenTime",
    "defaultOperationCloseTime",
    `return (${windowsMatch[0]});`,
  )(normalizeOperationTime, "09:00", "21:00");
  const validate = Function(
    "normalizeOperationTime",
    "timeToMinutes",
    `return (${validationMatch[0]});`,
  )(normalizeOperationTime, timeToMinutes);

  const legacy = operationTimeWindows({ openTime: "08:00", closeTime: "12:00" });
  if (legacy.length !== 1 || legacy[0].openTime !== "08:00" || legacy[0].closeTime !== "12:00") failures.push("Legacy single-window records are not preserved.");
  const split = validate([{ openTime: "14:00", closeTime: "18:00" }, { openTime: "09:00", closeTime: "12:00" }]);
  if (!split.valid || split.windows[0].openTime !== "09:00" || split.windows[1].openTime !== "14:00") failures.push("Split hours are not accepted and sorted.");
  if (validate([{ openTime: "09:00", closeTime: "15:00" }, { openTime: "14:00", closeTime: "18:00" }]).valid) failures.push("Overlapping operation windows are accepted.");
  if (validate([{ openTime: "09:00", closeTime: "" }]).valid) failures.push("Incomplete operation windows are accepted.");
  if (validate([{ openTime: "18:00", closeTime: "09:00" }]).valid) failures.push("Reverse operation windows are accepted.");
}

if (!settings.includes('data-action="add-operation-window"')) failures.push("Weekday cards have no add-window button.");
if (!settings.includes('data-action="remove-operation-window"')) failures.push("Additional weekday windows cannot be removed.");
if (!settings.includes("windows,")) failures.push("Saved operation-hours records do not persist the windows array.");
if (!settings.includes('if (!Object.prototype.hasOwnProperty.call(record, "windows")) delete merged.windows;')) failures.push("Legacy custom hours are overwritten by default windows.");
if (!customer.includes("windows.some((availableWindow)")) failures.push("Customer booking validation does not check every saved window.");
if (!customer.includes("operationTimeWindowsText(windows)")) failures.push("Customer booking errors do not list the valid windows.");
if (!shared.includes('action.dataset.action === "add-operation-window"')) failures.push("The add-window interaction is not wired.");
if (!styles.includes(".operation-time-window-row")) failures.push("Multi-window rows are not styled.");
if (!main.includes('shared.js?v=20260722-multi-operation-windows')
  || !main.includes('customer.js?v=20260722-multi-operation-windows')
  || !main.includes('settings.js?v=20260722-multi-operation-windows')) failures.push("Changed operation-hour modules are not cache-busted.");
if (!index.includes('styles.css?v=20260722-multi-operation-windows')
  || !index.includes('js/main.js?v=20260722-multi-operation-windows')) failures.push("Operation-hours production assets are not cache-busted.");

const bookingMatch = customer.match(/function customerBookingAvailabilityForDateTime\(value = "", label = "Selected time"\) \{[\s\S]*?\n\}\n\nfunction customerBookingAvailabilityChecks/);
if (!bookingMatch) {
  failures.push("Could not extract customer booking availability validation.");
} else {
  const bookingSource = bookingMatch[0].replace(/\n\nfunction customerBookingAvailabilityChecks$/, "");
  const splitWindow = {
    date: "2026-07-27",
    isOpen: true,
    windows: [
      { openTime: "09:00", closeTime: "12:00" },
      { openTime: "14:00", closeTime: "18:00" },
    ],
    message: "",
  };
  const bookingCheck = Function(
    "dateOnly",
    "operationWindowForDate",
    "operationDateLabel",
    "operationWindowText",
    "timeToMinutes",
    "operationTimeWindowsText",
    `return (${bookingSource});`,
  )(
    (value) => String(value || "").slice(0, 10),
    () => splitWindow,
    () => "Monday, Jul 27, 2026",
    () => "Available 9:00 AM - 12:00 PM and 2:00 PM - 6:00 PM",
    (value = "") => {
      const [hours, minutes] = String(value).split(":").map(Number);
      return hours * 60 + minutes;
    },
    () => "9:00 AM - 12:00 PM and 2:00 PM - 6:00 PM",
  );
  if (!bookingCheck("2026-07-27T10:00", "Drop-off time").valid) failures.push("Customer requests inside the first window are rejected.");
  if (bookingCheck("2026-07-27T13:00", "Drop-off time").valid) failures.push("Customer requests inside a closed gap are accepted.");
  if (!bookingCheck("2026-07-27T15:00", "Drop-off time").valid) failures.push("Customer requests inside the second window are rejected.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Operation hours multi-window checks passed.");
