import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

const dateOnlySource = shared.match(/function dateOnly\([\s\S]*?\n\}/)?.[0] || "";
const formatDateOnlySource = shared.match(/function formatDateOnly\([\s\S]*?\n\}/)?.[0] || "";
if (!formatDateOnlySource || !formatDateOnlySource.includes("dateOnly(value)")) {
  failures.push("The boarding preflight date formatter is missing or bypasses the date-only parser.");
} else {
  try {
    const localDateKey = (value) => String(value || "").slice(0, 10);
    const executableFormatDateOnlySource = formatDateOnlySource.replaceAll("\\`", "`").replaceAll("\\${", "${");
    const formatDateOnly = new Function("localDateKey", `${dateOnlySource}; ${executableFormatDateOnlySource}; return formatDateOnly;`)(localDateKey);
    if (formatDateOnly("2026-08-23") !== "Aug 23, 2026") {
      failures.push("The boarding preflight date formatter changes calendar dates across time zones.");
    }
  } catch (error) {
    failures.push(`The boarding preflight date formatter could not run: ${error.message}`);
  }
}

const preflightSource = boarding.match(/function requireBoardingApprovalPreflight[\s\S]*?\n\}/)?.[0] || "";
if (!preflightSource.includes("boardingRequirementOverrideMatches")
  || !preflightSource.includes('data-action="open-boarding-requirement-override"')
  || !boarding.includes("async function persistBoardingRequirementOverride")
  || !boarding.includes('supabaseClient.rpc("kennel_apply_boarding_requirement_override"')) {
  failures.push("Staff cannot securely override a blocked boarding approval or check-in.");
}
const checkInSubmitSource = shared.match(/async function submitBoardingCheckIn[\s\S]*?\n\}/)?.[0] || "";
if (!checkInSubmitSource.includes("pendingBoardingCheckIn?.options?.requirementsOverride")) {
  failures.push("A saved boarding override is lost before the check-in transition completes.");
}

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
if (!styles.includes(".popup-feedback.is-dialog-overlay")
  || !shared.includes('feedback.classList.toggle("is-dialog-overlay", isDialogOverlay)')
  || !shared.includes('feedback.style.top = String(host.scrollTop + 16) + "px"')) {
  failures.push("Popup feedback is not positioned in the visible portion of the active native dialog.");
}
if (!shared.includes('host.addEventListener("close", () => clearPopupFeedback(host), { once: true })') || !shared.includes('hiddenObserver.observe(host, { attributes: true, attributeFilter: ["hidden"] })')) {
  failures.push("Popup feedback can survive after a native or custom modal is closed.");
}
if (!boarding.includes("clearPopupFeedback(boardingDogDetail)")) {
  failures.push("Reopening a boarding profile can show stale popup feedback from an earlier action.");
}
const requestCardSource = boarding.match(/function boardingRequestCardHtml[\s\S]*?\n\}/)?.[0] || "";
const openBoardingDogSource = boarding.match(/function openBoardingDog\(record = \{\}\)[\s\S]*?\n\}/)?.[0] || "";
if (!requestCardSource.includes('data-action="change-boarding"')) {
  failures.push("Staff can no longer open the request editor for an active stay.");
}
if (!openBoardingDogSource.includes("setBoardingFormLocked(false)")) {
  failures.push("Staff boarding profiles are unexpectedly locked during an active stay.");
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
const approveStaySource = boarding.match(/async function approveBoardingStay[\s\S]*?\n\}/)?.[0] || "";
for (const [label, source] of [["profile", statusTransitionSource], ["stay", stayTransitionSource], ["approval", approveStaySource]]) {
  const remoteIndex = source.indexOf("await sendPayload(");
  const localIndex = source.indexOf('upsertRecord("boardingDog"');
  if (!(remoteIndex >= 0 && localIndex > remoteIndex)) {
    failures.push(`The ${label} lifecycle transition mutates local status before the remote save succeeds.`);
  }
  if (!source.includes("queueBoardingStatusFollowUps")) {
    failures.push(`The ${label} lifecycle transition still blocks on optional follow-up work.`);
  }
  if (!source.includes("boardingDogForPersistence")) {
    failures.push(`The ${label} lifecycle transition can overwrite a detached request's canonical dog link.`);
  }
}
const persistenceGuardSource = boarding.match(/function boardingDogForPersistence[\s\S]*?\n\}/)?.[0] || "";
if (!persistenceGuardSource.includes('!String(sourceRecord.linkedCustomerDogId || "").trim()')
  || !persistenceGuardSource.includes('String(sourceRecord.sourceBoardingDogId || "").trim()')
  || !persistenceGuardSource.includes('linkedCustomerDogId: ""')) {
  failures.push("Detached boarding requests do not preserve their persistence identity.");
}
try {
  const makeGuard = new Function("readRecords", `${persistenceGuardSource}; return boardingDogForPersistence;`);
  const detached = {
    id: "boarding-request",
    linkedCustomerDogId: "",
    sourceCustomerDogId: "customer-dog",
    sourceBoardingDogId: "boarding-profile",
  };
  const guard = makeGuard(() => [detached]);
  const protectedRequest = guard({
    ...detached,
    linkedCustomerDogId: "customer-dog",
    boardingStatus: "Approved",
  });
  if (protectedRequest.linkedCustomerDogId !== "" || protectedRequest.boardingStatus !== "Approved") {
    failures.push("The persistence guard does not protect a detached request while retaining its lifecycle update.");
  }
  const canonical = {
    id: "boarding-profile",
    linkedCustomerDogId: "customer-dog",
    sourceBoardingDogId: "",
  };
  const canonicalGuard = makeGuard(() => [canonical]);
  if (canonicalGuard(canonical) !== canonical) {
    failures.push("The persistence guard changes a canonical boarding profile.");
  }
} catch (error) {
  failures.push(`The detached boarding request regression fixture could not run: ${error.message}`);
}
const staySaveSource = boarding.match(/async function saveBoardingStayFromForm[\s\S]*?\n\}/)?.[0] || "";
const stayRemoteIndex = staySaveSource.indexOf("await sendPayload(candidate)");
const stayLocalIndex = staySaveSource.indexOf('upsertRecord("boardingDog", candidate)');
if (!staySaveSource.includes("boardingDogForPersistence")
  || !staySaveSource.includes("stays, updatedAt: timestamp")
  || !(stayRemoteIndex >= 0 && stayLocalIndex > stayRemoteIndex)) {
  failures.push("Boarding stay edits can still save a merged display record or change local state before remote persistence succeeds.");
}
if (!boarding.includes("if (syncedRecords.length) await sendPayloadBatch(syncedRecords)")) {
  failures.push("Duplicate boarding profiles are still synchronized through sequential network writes.");
}
if (!shared.includes('runPopupOperation(action, "Updating..."') || !shared.includes('"Check-in could not be completed"') || !shared.includes('"Kennel assignment could not be completed"') || !shared.includes('"Checkout could not be completed"')) {
  failures.push("Lifecycle controls do not restore responsive loading/error states across the full flow.");
}

for (const [label, source] of [["shared module", main], ["boarding module", main], ["stylesheet", index], ["entrypoint", index]]) {
  if (!source.includes("boarding-lifecycle-feedback-v33")) failures.push(`${label} is not cache-busted for the lifecycle feedback fix.`);
  if (!source.includes("boarding-stay-edit-feedback-v36")) failures.push(`${label} is not cache-busted for the boarding stay edit and modal feedback fix.`);
}
if (!main.includes("boarding-detached-profile-v34") || !index.includes("boarding-detached-profile-v34")) {
  failures.push("The detached boarding-profile persistence fix is not cache-busted.");
}
if (!main.includes("boarding-stay-revision-v37") || !index.includes("boarding-stay-revision-v37")) {
  failures.push("The boarding stay row-revision fix is not cache-busted.");
}
if (!main.includes("boarding-checkin-preflight-v38") || !index.includes("boarding-checkin-preflight-v38")) {
  failures.push("The boarding check-in preflight runtime fix is not cache-busted.");
}
if (!main.includes("boarding-requirement-override-v39") || !index.includes("boarding-requirement-override-v39")) {
  failures.push("The staff boarding-requirement override is not cache-busted.");
}
if (!main.includes("maintenance-alert-detail-active-request-lock-v36") || !index.includes("maintenance-alert-detail-active-request-lock-v36")) {
  failures.push("The maintenance alert and active-stay request lock fix is not cache-busted.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Boarding lifecycle and popup feedback checks passed.");
