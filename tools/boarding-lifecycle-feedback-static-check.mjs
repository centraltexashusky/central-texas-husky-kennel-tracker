import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

const toastSource = shared.match(/function showToast[\s\S]*?\n\}/)?.[0] || "";
if (!shared.includes("function activePopupFeedbackHost") || !toastSource.includes("showPopupFeedback(message)")) {
  failures.push("Global feedback is not mirrored inside the active popup.");
}
if (!shared.includes('"dialog[open]"') || !shared.includes('".boarding-dog-modal:not([hidden])"')) {
  failures.push("Native dialogs and profile modals are not both covered by popup feedback.");
}
if (!shared.includes("clearPopupFeedback(dialog)") || !styles.includes(".popup-feedback.is-error")) {
  failures.push("Popup feedback is not reset or styled as a visible error state.");
}
if (!shared.includes('host.addEventListener("close", () => clearPopupFeedback(host), { once: true })') || !shared.includes('hiddenObserver.observe(host, { attributes: true, attributeFilter: ["hidden"] })')) {
  failures.push("Popup feedback can survive after a native or custom modal is closed.");
}
if (!boarding.includes("clearPopupFeedback(boardingDogDetail)")) {
  failures.push("Reopening a boarding profile can show stale popup feedback from an earlier action.");
}

const sendPayloadSource = shared.match(/async function sendPayload\([\s\S]*?\n\}/)?.[0] || "";
const sendPayloadBatchSource = shared.match(/async function sendPayloadBatch\([\s\S]*?\n\}/)?.[0] || "";
if (!shared.includes("REMOTE_REQUEST_TIMEOUT_MS = 12000") || !sendPayloadSource.includes("withRemoteRequestTimeout") || !sendPayloadBatchSource.includes("withRemoteRequestTimeout")) {
  failures.push("Remote record saves are not bounded by the shared request deadline.");
}
if (!sendPayloadSource.includes("query.abortSignal(signal)") || !sendPayloadBatchSource.includes("query.abortSignal(signal)")) {
  failures.push("Supabase record saves do not abort stalled PostgREST requests.");
}
if (!shared.includes('withRemoteRequestTimeout(\n      supabaseClient.functions.invoke("send-notification"')) {
  failures.push("Notification delivery can still stall the UI indefinitely.");
}

const statusTransitionSource = boarding.match(/async function saveBoardingStatusTransition[\s\S]*?\n\}/)?.[0] || "";
const stayTransitionSource = boarding.match(/async function saveBoardingStayStatusTransition[\s\S]*?\n\}/)?.[0] || "";
for (const [label, source] of [["profile", statusTransitionSource], ["stay", stayTransitionSource]]) {
  const remoteIndex = source.indexOf("await sendPayload(");
  const localIndex = source.indexOf('upsertRecord("boardingDog"');
  if (!(remoteIndex >= 0 && localIndex > remoteIndex)) {
    failures.push(`The ${label} lifecycle transition mutates local status before the remote save succeeds.`);
  }
  if (!source.includes("queueBoardingStatusFollowUps")) {
    failures.push(`The ${label} lifecycle transition still blocks on optional follow-up work.`);
  }
}
if (!boarding.includes("if (syncedRecords.length) await sendPayloadBatch(syncedRecords)")) {
  failures.push("Duplicate boarding profiles are still synchronized through sequential network writes.");
}
if (!shared.includes('runPopupOperation(action, "Updating..."') || !shared.includes('"Check-in could not be completed"') || !shared.includes('"Kennel assignment could not be completed"') || !shared.includes('"Checkout could not be completed"')) {
  failures.push("Lifecycle controls do not restore responsive loading/error states across the full flow.");
}

for (const [label, source] of [["shared module", main], ["boarding module", main], ["stylesheet", index], ["entrypoint", index]]) {
  if (!source.includes("boarding-lifecycle-feedback-v33")) failures.push(`${label} is not cache-busted for this fix.`);
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Boarding lifecycle and popup feedback checks passed.");
