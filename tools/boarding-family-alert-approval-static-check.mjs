import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const notifications = fs.readFileSync("js/notifications.js", "utf8");

const inlineStart = shared.indexOf("async function handleInlineBoardingStatusClick");
const inlineEnd = shared.indexOf("// Extracted to js/boarding.js: handleBoardingTransition", inlineStart);
const inlineSource = shared.slice(inlineStart, inlineEnd);

assert.match(inlineSource, /boardingDogForPersistence\(optimisticRecord\)/, "inline approval must strip display-only customer profile links before saving");
assert.match(inlineSource, /boardingDogForPersistence\(originalRecord\)/, "failed inline approval must restore the persistence-safe source record");
assert.ok(
  inlineSource.indexOf("boardingDogForPersistence(optimisticRecord)") < inlineSource.indexOf("sendPayload(savedLocal)"),
  "inline approval must normalize the record before its remote upsert",
);

assert.match(notifications, /function boardingRequestAlertGroup\(/, "boarding alerts must recover every request in the family group");
assert.match(notifications, /function boardingRequestAlertGroupReviewHtml\(/, "boarding alerts must render grouped review content");
assert.match(notifications, /data-action="transition-boarding-family-group"/, "grouped alerts must offer one group approval action");
assert.match(shared, /action\.dataset\.action === "transition-boarding-family-group"[\s\S]*saveBoardingFamilyGroupStatus/, "the popup action must update the whole family request group");

console.log("Boarding family alert approval checks passed.");
