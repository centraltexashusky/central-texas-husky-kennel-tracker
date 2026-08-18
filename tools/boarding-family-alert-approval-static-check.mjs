import assert from "node:assert/strict";
import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const notifications = fs.readFileSync("js/notifications.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");

const inlineStart = shared.indexOf("async function handleInlineBoardingStatusClick");
const inlineEnd = shared.indexOf("// Extracted to js/boarding.js: handleBoardingTransition", inlineStart);
const inlineSource = shared.slice(inlineStart, inlineEnd);

assert.match(inlineSource, /boardingDogForPersistence\(notificationCandidate\)/, "inline approval must strip display-only customer profile links before saving");
assert.match(inlineSource, /boardingDogForPersistence\(originalRecord\)/, "failed inline approval must restore the persistence-safe source record");
assert.ok(
  inlineSource.indexOf("boardingDogForPersistence(notificationCandidate)") < inlineSource.indexOf("sendPayload(savedLocal)"),
  "inline approval must normalize the record before its remote upsert",
);

assert.match(notifications, /function boardingRequestAlertGroup\(/, "boarding alerts must recover every request in the family group");
assert.match(notifications, /function boardingRequestAlertGroupReviewHtml\(/, "boarding alerts must render grouped review content");
assert.match(notifications, /remoteTypesFullyLoadedInMemory\.has\("notificationLog"\)/, "recovery alerts must wait for a complete notification snapshot");
assert.match(notifications, /BOARDING_REQUEST_ALERT_RECOVERY_GRACE_MS/, "recovery alerts must allow the normal delivery pipeline to finish");
assert.match(notifications, /sameSourceRequest/, "recovery alerts must match the original source and request code");
assert.match(notifications, /data-action="transition-boarding-family-group"/, "grouped alerts must offer one group approval action");
assert.match(shared, /action\.dataset\.action === "transition-boarding-family-group"[\s\S]*saveBoardingFamilyGroupStatus/, "the popup action must update the whole family request group");
assert.match(boarding, /requestGroupStatus:[\s\S]*reservationStatusFromLegacy/, "boarding transitions must keep the saved family-group status aligned with the stay status");
assert.match(boarding, /function withBoardingStatusTransition[\s\S]*updatedAt: timestamp,[\s\S]*boardingStatus: summaryStatus/, "boarding transitions must advance the record revision timestamp for remote reloads");

console.log("Boarding family alert approval checks passed.");
