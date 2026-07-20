// === MODULE: CUSTOMER ===
const __snuggleStayModuleSource = `var customerDogWizardStep = "profile";
var customerBookingWizardStep = "pets";
var customerLastSavedDogId = "";
var customerDogWizardSteps = [
  { key: "profile", label: "Dog Profile" },
  { key: "care", label: "Care Info" },
  { key: "records", label: "Records" },
];
var customerBookingWizardSteps = [
  { key: "pets", label: "Pets & Dates" },
  { key: "options", label: "Boarding Options" },
  { key: "services", label: "Add-ons" },
  { key: "visit", label: "Visit Info" },
  { key: "review", label: "Review" },
];
var CUSTOMER_BOARDING_AGREEMENT_SOURCE = globalThis.CUDDLE_STAY_BOARDING_AGREEMENT || {};
var CUSTOMER_BOARDING_AGREEMENT_VERSION = CUSTOMER_BOARDING_AGREEMENT_SOURCE.version || "2026-07-12-cuddle-stay-v2";
var CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE = CUSTOMER_BOARDING_AGREEMENT_SOURCE.effectiveDate || "2026-07-12";
var CUSTOMER_BOARDING_AGREEMENT_TITLE = CUSTOMER_BOARDING_AGREEMENT_SOURCE.title || "Cuddle Stay Boarding Services Agreement";
var CUSTOMER_BOARDING_AGREEMENT_CONSENT_TEXT = CUSTOMER_BOARDING_AGREEMENT_SOURCE.electronicConsentText || "I consent to conducting this transaction electronically, receiving and retaining this agreement electronically, and using my electronic signature for this boarding agreement.";
var CUSTOMER_BOARDING_AGREEMENT_INTENT_TEXT = CUSTOMER_BOARDING_AGREEMENT_SOURCE.signatureIntentText || "I have reviewed the Cuddle Stay Boarding Services Agreement and intend my electronic signature to have the same legal effect as a handwritten signature.";
var CUSTOMER_BOARDING_AGREEMENT_MARKDOWN = String(CUSTOMER_BOARDING_AGREEMENT_SOURCE.markdown || "").trim();
var customerAgreementSignaturePadInitialized = false;
var customerAgreementControlsInitialized = false;
var customerAgreementSignatureDrawing = false;
var customerAgreementSignatureHasInk = false;

function customerAgreementAppliesToEstimate(estimate = customerEstimateDetails()) {
  return !estimate?.isServiceRequest;
}

function customerAgreementFallbackClauses() {
  return [
    "I certify that I am the owner or authorized agent for the dog or dogs submitted for boarding.",
    "I authorize Cuddle Stay and its staff to board, handle, feed, exercise, and provide routine care for my dog or dogs during the requested stay.",
    "I confirm that the dog profile, vaccination information, medical history, behavior notes, feeding instructions, emergency contacts, and owner contact information I provided are accurate and complete to the best of my knowledge.",
    "I understand that boarding includes normal animal-care risks, including stress, minor illness, injury, escape attempts, and interaction with other dogs, and I agree to disclose any known aggression, bite history, contagious illness, medication needs, or special handling requirements before drop-off.",
    "I authorize Cuddle Stay to seek veterinary or emergency care if staff reasonably believes care is needed and I cannot be reached quickly. I accept financial responsibility for veterinary, medication, transportation, special handling, damage, late pickup, cancellation, and other approved charges related to my dog or dogs.",
    "I understand that staff approval is required before a boarding request is confirmed and that estimated totals can change when staff reviews dates, services, vaccination status, member pricing, shared-crate eligibility, or special care needs.",
    "I agree to follow drop-off, pickup, vaccine, payment, cancellation, and safety instructions provided by Cuddle Stay for the stay.",
    "I agree that this electronic signature is attached to and logically associated with this boarding agreement and has the same intent as my handwritten signature for boarding requests submitted through Snuggle Stay.",
  ];
}

function customerAgreementMarkdown(record = null) {
  const source = String(record?.agreementMarkdown || record?.agreementText || CUSTOMER_BOARDING_AGREEMENT_MARKDOWN || "").trim();
  if (source) return source;
  return [
    "# " + CUSTOMER_BOARDING_AGREEMENT_TITLE,
    "",
    ...customerAgreementFallbackClauses().map((clause, index) => String(index + 1) + ". " + clause),
  ].join("\\n");
}

function customerAgreementClauses() {
  const headings = String(CUSTOMER_BOARDING_AGREEMENT_MARKDOWN || "")
    .split(/\\r?\\n/)
    .map((line) => line.trim())
    .filter((line) => /^#\\s+/.test(line))
    .map((line) => line.replace(/^#+\\s+/, ""))
    .filter(Boolean);
  return headings.length ? headings : customerAgreementFallbackClauses();
}

function customerAgreementText() {
  return [
    CUSTOMER_BOARDING_AGREEMENT_TITLE,
    "Version: " + CUSTOMER_BOARDING_AGREEMENT_VERSION,
    "Effective date: " + CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE,
    customerAgreementMarkdown(),
    "Electronic consent: " + CUSTOMER_BOARDING_AGREEMENT_CONSENT_TEXT,
    "Signature intent: " + CUSTOMER_BOARDING_AGREEMENT_INTENT_TEXT,
  ].join("\\n\\n");
}

function customerAgreementSimpleHash(value = "", length = 16) {
  if (typeof shortStableHash === "function") return shortStableHash(value, length);
  let hash = 2166136261;
  String(value || "").split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0").slice(0, length);
}

function customerAgreementDocumentFingerprint() {
  return "agreement-" + customerAgreementSimpleHash(customerAgreementText(), 24);
}

async function customerAgreementSha256Hex(value = "") {
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const data = new TextEncoder().encode(String(value || ""));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return "fallback-" + customerAgreementSimpleHash(value, 32);
}

function customerAgreementFormatInline(value = "") {
  return escapeHtml(value).replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
}

function customerAgreementMarkdownToHtml(markdown = "") {
  const lines = String(markdown || "").replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n").split("\\n");
  const html = [];
  let openList = "";
  const closeList = () => {
    if (!openList) return;
    html.push("</" + openList + ">");
    openList = "";
  };
  const ensureList = (type) => {
    if (openList === type) return;
    closeList();
    html.push("<" + type + ">");
    openList = type;
  };
  lines.forEach((rawLine) => {
    const line = String(rawLine || "").trim();
    if (!line) {
      closeList();
      return;
    }
    if (/^-{3,}$/.test(line)) {
      closeList();
      html.push("<hr>");
      return;
    }
    const heading = line.match(/^(#{1,3})\\s+(.+)$/);
    if (heading) {
      closeList();
      const tag = heading[1].length === 1 ? "h4" : "h5";
      html.push("<" + tag + ">" + customerAgreementFormatInline(heading[2]) + "</" + tag + ">");
      return;
    }
    const ordered = line.match(/^\\d+\\.\\s+(.+)$/);
    if (ordered) {
      ensureList("ol");
      html.push("<li>" + customerAgreementFormatInline(ordered[1]) + "</li>");
      return;
    }
    const bullet = line.match(/^\\*\\s+(.+)$/);
    if (bullet) {
      ensureList("ul");
      html.push("<li>" + customerAgreementFormatInline(bullet[1]) + "</li>");
      return;
    }
    closeList();
    html.push("<p>" + customerAgreementFormatInline(line) + "</p>");
  });
  closeList();
  return html.join("");
}

function customerAgreementTreatmentLabel(value = "") {
  const labels = {
    limit: "Treatment authorized up to the stated amount",
    "no-limit": "All treatment reasonably necessary to stabilize or protect the dog is authorized without a preset financial limit",
    "approval-required": "Non-life-saving treatment requires owner or emergency-contact approval",
  };
  return labels[value] || "";
}

function customerAgreementMediaLabel(value = "") {
  const labels = {
    authorized: "Promotional and public media use is authorized as stated in the agreement",
    "opt-out": "Owner does not authorize promotional or public use of photographs or recordings of the dog",
  };
  return labels[value] || "";
}

function customerAgreementFieldValue(id = "") {
  return String($("#" + id)?.value || "").trim();
}

function customerAgreementCheckedField(name = "") {
  return document.querySelector("#customerBookingForm input[name=\\"" + name + "\\"]:checked");
}

function customerAgreementCheckedValue(name = "") {
  return customerAgreementCheckedField(name)?.value || "";
}

function setCustomerAgreementFieldIfEmpty(id = "", value = "") {
  const field = $("#" + id);
  if (field && !String(field.value || "").trim() && String(value || "").trim()) {
    field.value = String(value || "").trim();
  }
}

function syncCustomerAgreementTreatmentAmount() {
  const amountField = $("#customerAgreementTreatmentLimitAmount");
  const limitSelected = customerAgreementCheckedValue("agreementEmergencyTreatmentChoice") === "limit";
  if (!amountField) return;
  amountField.disabled = !limitSelected;
  amountField.required = limitSelected;
  if (!limitSelected) clearFieldError(amountField);
}

function initializeCustomerAgreementControls() {
  if (customerAgreementControlsInitialized) return;
  customerAgreementControlsInitialized = true;
  $$("input[name=\\"agreementEmergencyTreatmentChoice\\"]").forEach((field) => {
    field.addEventListener("change", syncCustomerAgreementTreatmentAmount);
  });
}

function prefillCustomerAgreementFields(estimate = customerEstimateDetails()) {
  const profile = savedUserFor(currentUser) || {};
  setCustomerAgreementFieldIfEmpty("customerAgreementSignatureNameConfirm", currentUser?.name || profile.name || "");
  syncCustomerAgreementTreatmentAmount();
}

function customerAgreementResponsePayload(estimate = customerEstimateDetails()) {
  const emergencyTreatmentChoice = customerAgreementCheckedValue("agreementEmergencyTreatmentChoice");
  const mediaPreference = customerAgreementCheckedValue("agreementMediaPreference") || "authorized";
  const treatmentLimitRaw = customerAgreementFieldValue("customerAgreementTreatmentLimitAmount");
  const treatmentLimitAmount = emergencyTreatmentChoice === "limit" ? treatmentLimitRaw : "";
  return {
    signerLegalName: customerAgreementFieldValue("customerAgreementSignatureNameConfirm"),
    ownerEmail: normalizeEmail(currentUser?.email),
    emergencyTreatmentChoice,
    emergencyTreatmentLabel: customerAgreementTreatmentLabel(emergencyTreatmentChoice),
    emergencyTreatmentLimitAmount: treatmentLimitAmount,
    mediaPreference,
    mediaPreferenceLabel: customerAgreementMediaLabel(mediaPreference),
    mediaOptOut: mediaPreference === "opt-out",
  };
}

function customerAgreementCompletedFieldsText(responses = {}) {
  return [
    "Completed Agreement Fields",
    "Signer legal name: " + (responses.signerLegalName || ""),
    "Emergency treatment spending authorization: " + (responses.emergencyTreatmentLabel || ""),
    "Emergency treatment limit amount: " + (responses.emergencyTreatmentLimitAmount ? "$" + responses.emergencyTreatmentLimitAmount : ""),
    "Media authorization: " + (responses.mediaPreferenceLabel || ""),
    "Booking or stay ID: " + (responses.bookingOrStayId || ""),
    "Completed at: " + (responses.completedAt || ""),
  ].filter((line) => String(line || "").trim()).join("\\n");
}

function customerAgreementSignedDocumentText(responses = {}) {
  return customerAgreementText() + "\\n\\n---\\n\\n" + customerAgreementCompletedFieldsText(responses);
}

function customerAgreementCompletionHtml(record = {}) {
  const responses = record?.agreementResponses || null;
  if (!responses) return "";
  const rows = [
    ["Signer legal name", "signerLegalName"],
    ["Treatment authorization", "emergencyTreatmentLabel"],
    ["Treatment amount", "treatmentLimitLabel"],
    ["Media authorization", "mediaPreferenceLabel"],
    ["Booking or stay ID", "bookingOrStayId"],
  ];
  const detailRecord = {
    ...responses,
    treatmentLimitLabel: responses.emergencyTreatmentLimitAmount ? "$" + responses.emergencyTreatmentLimitAmount : "",
  };
  return "<section class=\\"signed-agreement-responses\\"><h4>Completed agreement selections</h4><div class=\\"signed-agreement-meta\\">" + detailRows(detailRecord, rows) + "</div></section>";
}

function customerAgreementDocumentHtml(record = null) {
  const version = record?.agreementVersion || CUSTOMER_BOARDING_AGREEMENT_VERSION;
  const effectiveDate = record?.agreementEffectiveDate || CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE;
  const title = record?.agreementTitle || CUSTOMER_BOARDING_AGREEMENT_TITLE;
  const markdown = customerAgreementMarkdown(record);
  return "<article class=\\"customer-agreement-copy\\"><h3>" + escapeHtml(title) + "</h3><p>Version " + escapeHtml(version) + " | Effective " + escapeHtml(effectiveDate) + "</p><div class=\\"customer-agreement-markdown\\">" + customerAgreementMarkdownToHtml(markdown) + "</div></article>" + customerAgreementCompletionHtml(record);
}

function customerAgreementSnapshotIsCurrent(record = {}) {
  if (!record || record.removed) return false;
  const signerEmail = normalizeEmail(record.signerEmail || record.ownerEmail || record.email);
  const currentEmail = normalizeEmail(currentUser?.email);
  return Boolean(
    currentEmail
      && signerEmail === currentEmail
      && record.signedAt
      && record.signatureHash
      && record.agreementVersion === CUSTOMER_BOARDING_AGREEMENT_VERSION
      && (!record.documentFingerprint || record.documentFingerprint === customerAgreementDocumentFingerprint()),
  );
}

function customerAgreementProfileSnapshot(record = {}) {
  return {
    id: record.id || "",
    agreementTitle: record.agreementTitle || CUSTOMER_BOARDING_AGREEMENT_TITLE,
    agreementVersion: record.agreementVersion || CUSTOMER_BOARDING_AGREEMENT_VERSION,
    agreementEffectiveDate: record.agreementEffectiveDate || CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE,
    documentFingerprint: record.documentFingerprint || customerAgreementDocumentFingerprint(),
    documentHash: record.documentHash || "",
    signatureHash: record.signatureHash || "",
    signerName: record.signerName || "",
    signerEmail: normalizeEmail(record.signerEmail || record.ownerEmail || ""),
    signedAt: record.signedAt || "",
    signatureMethod: record.signatureMethod || "drawn-signature-pad",
    electronicConsentAccepted: record.electronicConsentAccepted === true,
    agreementAccepted: record.agreementAccepted === true,
    arbitrationAccepted: record.arbitrationAccepted === true,
    agreementResponses: record.agreementResponses || null,
  };
}

function customerBoardingAgreementsForCurrentUser() {
  const email = normalizeEmail(currentUser?.email);
  if (!email) return [];
  return readRecords("boardingAgreement")
    .filter((record) => !record.removed && normalizeEmail(record.signerEmail || record.ownerEmail) === email)
    .sort((a, b) => new Date(b.signedAt || b.submittedAt || 0) - new Date(a.signedAt || a.submittedAt || 0));
}

function customerCurrentBoardingAgreement() {
  const direct = customerBoardingAgreementsForCurrentUser().find(customerAgreementSnapshotIsCurrent);
  if (direct) return direct;
  const profile = savedUserFor(currentUser) || {};
  const profileAgreement = profile.latestBoardingAgreement || profile.boardingAgreement || null;
  return customerAgreementSnapshotIsCurrent(profileAgreement) ? profileAgreement : null;
}

function renderCustomerAgreementPanel(estimate = customerEstimateDetails()) {
  const panel = $("#customerAgreementPanel");
  if (!panel) return;
  const applies = customerAgreementAppliesToEstimate(estimate);
  panel.hidden = !applies;
  if (!applies) return;
  const currentAgreement = customerCurrentBoardingAgreement();
  const signed = Boolean(currentAgreement);
  const notice = $("#customerAgreementNotice");
  if (notice) {
    notice.hidden = !applies;
    notice.innerHTML = signed
      ? "<strong>Boarding agreement signed</strong><p>Current agreement on file for " + escapeHtml(currentAgreement.signerName || currentUser?.name || "this owner") + ".</p>"
      : "<strong>Boarding agreement required</strong><p>This owner must review and e-sign the agreement on the Review step before submitting a boarding request.</p>";
  }
  const status = $("#customerAgreementStatus");
  if (status) {
    status.innerHTML = signed
      ? "<strong>Boarding agreement signed</strong><p>Signed by " + escapeHtml(currentAgreement.signerName || currentUser?.name || "Owner") + " on " + escapeHtml(formatDateTime(currentAgreement.signedAt) || currentAgreement.signedAt || "file") + ".</p>"
      : "<strong>Boarding agreement required</strong><p>Review and sign before submitting this boarding request.</p>";
  }
  const documentBody = $("#customerAgreementDocument");
  if (documentBody) documentBody.innerHTML = customerAgreementDocumentHtml();
  const details = $("#customerAgreementDetails");
  if (details) details.open = !signed;
  const block = $("#customerSignatureBlock");
  if (block) block.hidden = signed;
  initializeCustomerAgreementControls();
  prefillCustomerAgreementFields(estimate);
  window.setTimeout(() => initializeCustomerAgreementSignaturePad(), 0);
}

function customerSignatureCanvas() {
  return $("#customerSignaturePad");
}

function resizeCustomerSignatureCanvas() {
  const canvas = customerSignatureCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const width = Math.max(320, Math.round((rect.width || 720) * ratio));
  const height = Math.max(140, Math.round((rect.height || 220) * ratio));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineWidth = 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#102033";
  canvas.classList.toggle("is-empty", !customerAgreementSignatureHasInk);
}

function customerSignaturePoint(event) {
  const canvas = customerSignatureCanvas();
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function updateCustomerSignatureData() {
  const canvas = customerSignatureCanvas();
  const dataField = $("#customerAgreementSignatureData");
  if (!canvas || !dataField) return "";
  dataField.value = customerAgreementSignatureHasInk ? canvas.toDataURL("image/png") : "";
  canvas.classList.toggle("is-empty", !customerAgreementSignatureHasInk);
  return dataField.value;
}

function clearCustomerSignaturePad() {
  const canvas = customerSignatureCanvas();
  const context = canvas?.getContext("2d");
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
  customerAgreementSignatureHasInk = false;
  customerAgreementSignatureDrawing = false;
  updateCustomerSignatureData();
}

function initializeCustomerAgreementSignaturePad() {
  const canvas = customerSignatureCanvas();
  if (!canvas) return;
  resizeCustomerSignatureCanvas();
  if (customerAgreementSignaturePadInitialized) return;
  customerAgreementSignaturePadInitialized = true;
  canvas.classList.add("is-empty");
  canvas.addEventListener("pointerdown", (event) => {
    if ($("#customerSignatureBlock")?.hidden) return;
    resizeCustomerSignatureCanvas();
    customerAgreementSignatureDrawing = true;
    customerAgreementSignatureHasInk = true;
    const context = canvas.getContext("2d");
    const point = customerSignaturePoint(event);
    context.fillStyle = "#102033";
    context.beginPath();
    context.arc(point.x, point.y, 1.2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y);
    canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!customerAgreementSignatureDrawing) return;
    const context = canvas.getContext("2d");
    const point = customerSignaturePoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
    event.preventDefault();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
    canvas.addEventListener(eventName, (event) => {
      if (!customerAgreementSignatureDrawing) return;
      customerAgreementSignatureDrawing = false;
      updateCustomerSignatureData();
      canvas.releasePointerCapture?.(event.pointerId);
    });
  });
  $("#clearCustomerSignatureButton")?.addEventListener("click", clearCustomerSignaturePad);
  $("#printCustomerAgreementButton")?.addEventListener("click", () => window.print());
  window.addEventListener("resize", () => {
    if (!$("#customerSignatureBlock")?.hidden && !customerAgreementSignatureHasInk) resizeCustomerSignatureCanvas();
  });
}

function validateCustomerAgreementForBooking(estimate = customerEstimateDetails(), options = {}) {
  if (!customerAgreementAppliesToEstimate(estimate)) return true;
  if (customerCurrentBoardingAgreement()) return true;
  renderCustomerAgreementPanel(estimate);
  const signerName = $("#customerAgreementSignatureNameConfirm");
  const treatmentChoice = customerAgreementCheckedField("agreementEmergencyTreatmentChoice");
  const treatmentAmount = $("#customerAgreementTreatmentLimitAmount");
  const mediaPreference = customerAgreementCheckedField("agreementMediaPreference");
  const electronicConsent = $("#customerAgreementElectronicConsent");
  const accepted = $("#customerAgreementAccepted");
  const arbitrationAccepted = $("#customerAgreementArbitrationAccepted");
  const signatureData = $("#customerAgreementSignatureData")?.value || "";
  const signatureError = $("#customerAgreementSignatureError");
  [
    signerName,
    treatmentAmount,
    electronicConsent,
    accepted,
    arbitrationAccepted,
    ...$$("input[name=\\"agreementEmergencyTreatmentChoice\\"]"),
    ...$$("input[name=\\"agreementMediaPreference\\"]"),
  ].forEach((field) => field && clearFieldError(field));
  if (signatureError) {
    signatureError.textContent = "Complete the required agreement fields before submitting.";
    signatureError.hidden = true;
  }
  let firstInvalid = null;
  let message = "";
  const requireText = (field, fieldMessage) => {
    if (String(field?.value || "").trim()) return;
    if (field) setFieldError(field, fieldMessage);
    firstInvalid = firstInvalid || field;
    message = message || fieldMessage;
  };
  if (!String(signerName?.value || "").trim()) {
    requireText(signerName, "Owner legal name is required before signing.");
  }
  if (!treatmentChoice) {
    const firstTreatmentChoice = document.querySelector("#customerBookingForm input[name=\\"agreementEmergencyTreatmentChoice\\"]");
    if (firstTreatmentChoice) setFieldError(firstTreatmentChoice, "Select an emergency treatment authorization.");
    firstInvalid = firstInvalid || firstTreatmentChoice;
    message = message || "Select an emergency treatment authorization.";
  }
  if (treatmentChoice?.value === "limit" && (!String(treatmentAmount?.value || "").trim() || Number(treatmentAmount?.value || 0) <= 0)) {
    if (treatmentAmount) setFieldError(treatmentAmount, "Enter the approved emergency treatment amount.");
    firstInvalid = firstInvalid || treatmentAmount;
    message = message || "Enter the approved emergency treatment amount.";
  }
  if (!mediaPreference) {
    const firstMediaPreference = document.querySelector("#customerBookingForm input[name=\\"agreementMediaPreference\\"]");
    if (firstMediaPreference) setFieldError(firstMediaPreference, "Select a media authorization preference.");
    firstInvalid = firstInvalid || firstMediaPreference;
    message = message || "Select a media authorization preference.";
  }
  if (!signatureData || !customerAgreementSignatureHasInk) {
    message = message || "Draw your signature before submitting.";
    firstInvalid = firstInvalid || customerSignatureCanvas();
  }
  if (!electronicConsent?.checked) {
    if (electronicConsent) setFieldError(electronicConsent, "Electronic records consent is required before signing.");
    firstInvalid = firstInvalid || electronicConsent;
    message = message || "Electronic records consent is required before signing.";
  }
  if (!accepted?.checked) {
    if (accepted) setFieldError(accepted, "Agreement acceptance is required before signing.");
    firstInvalid = firstInvalid || accepted;
    message = message || "Agreement acceptance is required before signing.";
  }
  if (!arbitrationAccepted?.checked) {
    if (arbitrationAccepted) setFieldError(arbitrationAccepted, "Separate arbitration acceptance is required before signing.");
    firstInvalid = firstInvalid || arbitrationAccepted;
    message = message || "Separate arbitration acceptance is required before signing.";
  }
  if (firstInvalid) {
    if (signatureError) {
      signatureError.textContent = message || "Complete the required agreement fields before submitting.";
      signatureError.hidden = false;
    }
    $("#customerAgreementPanel")?.scrollIntoView({ behavior: options.behavior || "smooth", block: "center" });
    if (typeof firstInvalid.focus === "function") firstInvalid.focus({ preventScroll: true });
    showToast(message || "Review and sign the boarding agreement before continuing.");
    return false;
  }
  return true;
}

function customerAgreementRequestContext(estimate = {}) {
  const dogs = uniqueCustomerBookingDogs(estimate.dogs || []);
  return {
    submissionId: estimate.submissionId || "",
    requestGroupId: estimate.requestGroupId || "",
    requestMode: estimate.isServiceRequest ? "service" : "boarding",
    dogNames: dogs.map((dog) => dog.dogName || "Dog"),
    dogIds: dogs.map((dog) => dog.id || dog.sourceBoardingDogId || "").filter(Boolean),
    dropoffTime: estimate.dropoffTime || "",
    pickupTime: estimate.pickupTime || "",
    estimatedTotal: estimate.total || 0,
  };
}

async function createCustomerBoardingAgreementRecord(estimate = {}) {
  const signerName = String($("#customerAgreementSignatureNameConfirm")?.value || currentUser?.name || "").trim();
  const signerEmail = normalizeEmail(currentUser?.email);
  const signatureImageData = $("#customerAgreementSignatureData")?.value || "";
  const signedAt = new Date().toISOString();
  const agreementMarkdown = customerAgreementMarkdown();
  const agreementResponses = {
    ...customerAgreementResponsePayload(estimate),
    completedAt: signedAt,
    bookingOrStayId: estimate.submissionId || estimate.requestGroupId || estimate.id || "",
  };
  const documentText = customerAgreementSignedDocumentText(agreementResponses);
  const documentHash = await customerAgreementSha256Hex(documentText);
  const signatureHash = await customerAgreementSha256Hex([signatureImageData, signerName, signerEmail, documentHash, signedAt].join("|"));
  const userAgent = navigator.userAgent || "";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  return {
    type: "boardingAgreement",
    id: uid("boardingAgreement"),
    submittedAt: signedAt,
    signedAt,
    agreementTitle: CUSTOMER_BOARDING_AGREEMENT_TITLE,
    agreementVersion: CUSTOMER_BOARDING_AGREEMENT_VERSION,
    agreementEffectiveDate: CUSTOMER_BOARDING_AGREEMENT_EFFECTIVE_DATE,
    agreementClauses: customerAgreementClauses(),
    agreementMarkdown,
    agreementText: documentText,
    documentFingerprint: customerAgreementDocumentFingerprint(),
    documentHash,
    signerName,
    signerEmail,
    ownerName: currentUser?.name || signerName,
    ownerEmail: signerEmail,
    signerUserId: currentUser?.key || currentUser?.authId || "",
    signerAuthProvider: currentUser?.authProvider || "",
    signerRole: currentRole(),
    signatureMethod: "drawn-signature-pad",
    signatureImageData,
    signatureHash,
    electronicConsentAccepted: true,
    agreementAccepted: true,
    arbitrationAccepted: true,
    agreementResponses,
    electronicConsentText: CUSTOMER_BOARDING_AGREEMENT_CONSENT_TEXT,
    signatureIntentText: CUSTOMER_BOARDING_AGREEMENT_INTENT_TEXT,
    signedUserAgent: userAgent,
    signedLocale: navigator.language || "",
    signedTimezone: timezone,
    signedLocationHref: location.href || "",
    signedIpAddress: "",
    ipAddressSource: "not-collected-client-side",
    deviceAudit: {
      platform: navigator.platform || "",
      vendor: navigator.vendor || "",
      maxTouchPoints: navigator.maxTouchPoints || 0,
      viewportWidth: window.innerWidth || 0,
      viewportHeight: window.innerHeight || 0,
      screenWidth: window.screen?.width || 0,
      screenHeight: window.screen?.height || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    requestContext: customerAgreementRequestContext(estimate),
    auditEvents: [
      {
        action: "viewed-and-signed",
        at: signedAt,
        signerEmail,
        userId: currentUser?.key || currentUser?.authId || "",
        documentFingerprint: customerAgreementDocumentFingerprint(),
      },
    ],
    removed: false,
  };
}

async function saveCustomerAgreementToProfile(record = {}) {
  if (!currentUser?.email) return null;
  const existing = savedUserFor(currentUser) || {};
  const agreementSnapshot = customerAgreementProfileSnapshot(record);
  const updatedProfile = upsertRecord("settingsUser", {
    ...profileRecordForUser(currentUser),
    ...existing,
    latestBoardingAgreement: agreementSnapshot,
    boardingAgreementSignedAt: agreementSnapshot.signedAt,
    boardingAgreementVersion: agreementSnapshot.agreementVersion,
    boardingAgreementRecordIds: mergeUniqueIds(existing.boardingAgreementRecordIds || [], [record.id]),
    removed: false,
  });
  currentUser.latestBoardingAgreement = agreementSnapshot;
  currentUser.boardingAgreementSignedAt = agreementSnapshot.signedAt;
  currentUser.boardingAgreementVersion = agreementSnapshot.agreementVersion;
  safeLocalStorageSetItem(stateKeys.session, JSON.stringify(currentUser), { quiet: true });
  await sendPayload(updatedProfile);
  return updatedProfile;
}

async function ensureCustomerBoardingAgreementForEstimate(estimate = {}) {
  if (!customerAgreementAppliesToEstimate(estimate)) return null;
  const existing = customerCurrentBoardingAgreement();
  if (existing) return customerAgreementProfileSnapshot(existing);
  if (!validateCustomerAgreementForBooking(estimate, { behavior: "auto" })) return null;
  const payload = await createCustomerBoardingAgreementRecord(estimate);
  const record = upsertRecord("boardingAgreement", payload);
  await sendPayload(record);
  await saveCustomerAgreementToProfile(record);
  renderCustomerFiles();
  renderCustomerAgreementPanel(estimate);
  clearCustomerSignaturePad();
  return customerAgreementProfileSnapshot(record);
}

function customerAgreementDetailHtml(record = {}) {
  const rows = [
    ["Signer", "signerName"],
    ["Email", "signerEmail"],
    ["Signed", "signedLabel"],
    ["Version", "agreementVersion"],
    ["Electronic records consent", "electronicConsentAcceptedLabel"],
    ["General agreement accepted", "agreementAcceptedLabel"],
    ["Arbitration accepted", "arbitrationAcceptedLabel"],
    ["Document hash", "documentHash"],
    ["Signature hash", "signatureHash"],
    ["Device", "deviceLabel"],
  ];
  const detailRecord = {
    ...record,
    signedLabel: formatDateTime(record.signedAt) || record.signedAt || "",
    electronicConsentAcceptedLabel: record.electronicConsentAccepted ? "Yes" : "",
    agreementAcceptedLabel: record.agreementAccepted ? "Yes" : "",
    arbitrationAcceptedLabel: record.arbitrationAccepted ? "Yes" : "",
    deviceLabel: [record.signedTimezone, record.signedLocale].filter(Boolean).join(" | "),
  };
  const signature = record.signatureImageData ? "<img class=\\"signed-agreement-signature\\" src=\\"" + escapeHtml(record.signatureImageData) + "\\" alt=\\"Saved signature\\" />" : "";
  return customerAgreementDocumentHtml(record)
    + "<section class=\\"signed-agreement-meta\\">" + detailRows(detailRecord, rows) + "</section>"
    + signature;
}

function openCustomerAgreementDetail(id = "") {
  const record = readRecords("boardingAgreement").find((item) => item.id === id && !item.removed);
  if (!record || normalizeEmail(record.signerEmail || record.ownerEmail) !== normalizeEmail(currentUser?.email)) {
    showToast("This agreement could not be opened.");
    return;
  }
  showDetailDialog("Signed Boarding Agreement", customerAgreementDetailHtml(record));
}

function customerRequestStatusLabel(status = "") {
  const normalized = boardingLifecycleStatuses.includes(status) ? status : normalizeBoardingStatus({ boardingStatus: status, customerRequest: true });
  const labels = {
    Pending: "Request Pending",
    Approved: "Request Approved",
    "Checked In": "Checked In",
    "In Kennel": "In Kennel",
    "Ready For Pickup": "Ready For Pickup",
    "Checked Out": "Completed",
    Cancelled: "Request Cancelled",
  };
  return labels[normalized] || "Request Pending";
}

function customerRequestStatusChipHtml(record = {}) {
  const status = boardingDisplayStatus(record);
  return statusChipHtml(customerRequestStatusLabel(status), \`boarding-status-chip \${statusClassForBoardingStatus(status)}\`);
}

function customerRequestStayStatusChipHtml(record = {}, stay = {}) {
  const status = boardingStayDisplayStatus(record, stay);
  return statusChipHtml(customerRequestStatusLabel(status), \`boarding-status-chip \${statusClassForBoardingStatus(status)}\`);
}

function customerStayIdChipHtml(record = {}, stay = {}) {
  return boardingStayRequestCodeChipHtml(record, stay, { labelPrefix: "Stay ID" });
}

function customerProfilePayload({ email = "", name = "", customerDogId = "", boardingDogId = "", authId = "" } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const existing = savedUserFor({ email: normalizedEmail, key: authId }) || {};
  return {
    ...existing,
    type: "settingsUser",
    id: existing.id || uid("settingsUser"),
    submittedAt: existing.submittedAt || new Date().toISOString(),
    name: existing.name || name || normalizedEmail,
    email: normalizedEmail,
    authId: existing.authId || authId || "",
    role: existing.role || "customer",
    authProvider: existing.authProvider || "customer-signup",
    linkedCustomerDogIds: mergeUniqueIds(existing.linkedCustomerDogIds || [], [customerDogId]),
    linkedBoardingDogIds: mergeUniqueIds(existing.linkedBoardingDogIds || [], [boardingDogId]),
    removed: false,
  };
}

function customerUploadSectionHtml(record = {}) {
  const linkedDog = linkedCustomerDogForBoarding(record);
  const sections = [];
  const directMedia = mediaLinkHtml({
    id: record.id || "",
    type: record.type || "boardingDog",
    profilePhotoUrl: record.profilePhotoUrl,
    profilePhotoPath: record.profilePhotoPath || "",
    vaccinationRecords: record.vaccinationRecords || [],
    vaccinationFiles: record.vaccinationFiles || "",
  });
  if (directMedia) sections.push(\`<article class="record-card compact-record-card"><strong>Files attached to boarding record</strong>\${directMedia}</article>\`);
  if (linkedDog) {
    const linkedMedia = mediaLinkHtml({
      id: linkedDog.id || "",
      type: linkedDog.type || "customerDog",
      profilePhotoUrl: linkedDog.profilePhotoUrl,
      profilePhotoPath: linkedDog.profilePhotoPath || "",
      vaccinationRecords: linkedDog.vaccinationRecords || [],
      vaccinationFiles: linkedDog.vaccinationFiles || "",
    });
    sections.push(\`<article class="record-card compact-record-card"><strong>\${escapeHtml(linkedDog.dogName || record.dogName || "Customer dog")}</strong><p>\${escapeHtml(linkedDog.ownerEmail || linkedDog.customerEmail || record.ownerEmail || "")}</p>\${linkedMedia || "<p>No uploaded customer files saved for this dog yet.</p>"}</article>\`);
  }
  return sections.length ? \`<h3>Customer Uploaded Files</h3><div class="record-grid compact-record-grid">\${sections.join("")}</div>\` : "";
}

function customerFacingBoardingStayRequestLabel(value = {}, quantity = 1) {
  const service = serviceCatalogMatchForRequest(value) || (value && typeof value === "object" ? value : {});
  if (!customerServiceIsPremiumStayUpgrade(service)) return boardingStayRequestLabel(value);
  return \`\${customerServiceDisplayName(service)}\${quantity > 1 ? \` x\${quantity}\` : ""} requested\`;
}

function customerSharedCrateRequested() {
  const checkbox = $("#customerSharedCrateRequested");
  return Boolean(checkbox && checkbox.checked);
}

function customerBoardingDogDetailHtml(record = {}, stayId = "") {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, stayId) || boardingPrimaryStay(displayRecord) || displayRecord.stays?.[0] || {};
  return \`
    <div class="chip-row">\${stay.id ? customerStayIdChipHtml(displayRecord, stay) : ""}\${stay.id ? customerRequestStayStatusChipHtml(displayRecord, stay) : customerRequestStatusChipHtml(displayRecord)}</div>
    \${detailRows(displayRecord, [
      ["Dog", "dogName"],
      ["Owner", "ownerName"],
      ["Owner phone", "ownerPhone"],
      ["Emergency contact", "emergencyName"],
      ["Emergency phone", "emergencyPhone"],
      ["Feeding instructions", "foodInstructions"],
      ["Care notes", "specialCare"],
    ])}
    \${boardingStayDetailCardHtml(displayRecord, stay, { customer: true })}
    \${customerUploadSectionHtml(displayRecord)}
  \`;
}

function customerDogHasBoardingLink(dog = {}, boardingId = "") {
  const id = boardingDogIdFromCustomerDogValue(boardingId);
  if (!id) return false;
  return [dog.sourceBoardingDogId, dog.linkedBoardingDogId]
    .map(boardingDogIdFromCustomerDogValue)
    .includes(id);
}

function customerDogForBoardingRequest(record = {}) {
  if (!record?.id) return null;
  const currentEmail = normalizeEmail(currentUser?.email);
  const linkedDog = explicitLinkedCustomerDogForBoarding(record);
  if (linkedDog && (currentRole() === "admin" || customerDogVisibleToCustomer(linkedDog, currentEmail))) return linkedDog;
  return customerDogsForCurrentUser().find((dog) => customerDogHasBoardingLink(dog, record.id))
    || customerDogFromBoardingDog(record, currentEmail, { explicitOnly: true });
}

function openCustomerDogEditorForRequest(requestId = "") {
  const boardingId = boardingDogIdFromCustomerDogValue(requestId);
  const record = readRecords("boardingDog").find((item) => item.id === boardingId && !item.removed);
  if (!record || (currentRole() !== "admin" && !boardingDogVisibleToCustomer(record))) {
    showToast("This request is no longer available.");
    return;
  }
  const linkedDog = explicitLinkedCustomerDogForBoarding(record);
  const canEditLinkedDog = linkedDog && (currentRole() === "admin" || customerDogVisibleToCustomer(linkedDog));
  const dog = canEditLinkedDog
    ? linkedDog
    : customerDogFromBoardingDog(record, currentUser?.email, { explicitOnly: true });
  if (!dog) {
    showToast("The dog for this request could not be opened.");
    return;
  }
  const formDog = canEditLinkedDog
    ? { ...dog, sourceBoardingDogId: dog.sourceBoardingDogId || record.id, linkedBoardingDogId: dog.linkedBoardingDogId || record.id }
    : { ...dog, id: "", sourceBoardingDogId: record.id, linkedBoardingDogId: record.id };
  $("#detailDialog")?.close();
  switchPage("customerPage");
  openCustomerDog(formDog);
}

function openCustomerRequestDetail(record = {}, stayId = "") {
  if (!record?.id) return;
  const displayRecord = boardingDogWithStayStatus(record);
  const stay = boardingStayByReference(displayRecord, stayId) || boardingPrimaryStay(displayRecord) || displayRecord.stays?.[0] || {};
  const canShowStaffDogAction = currentRole() === "admin" && !isImpersonating() && activePageId() !== "customerRequestsPage";
  showDetailDialog(titleForRecord("boardingDog", displayRecord), detailForRecord("boardingDog", displayRecord, { stayId: stay.id || stayId }), null, {
    headerAction: canShowStaffDogAction ? {
      label: "Edit Dog",
      action: "open-boarding-dog-editor",
      id: displayRecord.id,
      stayId: stay.id || "",
      requestCode: stay.id ? boardingStayRequestCode(displayRecord, stay) : "",
    } : null,
  });
}

function customerDogIdentityKey(dog = {}, email = currentUser?.email) {
  const dogName = String(dog.dogName || "").trim().toLowerCase();
  if (!dogName) return "";
  const ownerEmails = uniqueEmails(dog.ownerEmail, dog.customerEmail, email);
  const ownerPhone = String(dog.ownerPhone || "").replace(/\\D/g, "");
  const ownerName = String(dog.ownerName || "").trim().toLowerCase();
  const ownerKey = ownerEmails[0] || ownerPhone || ownerName;
  return ownerKey ? \`\${dogName}|\${ownerKey}\` : "";
}

function customerDogVisibleToCustomer(dog = {}, email = currentUser?.email) {
  const normalizedEmail = normalizeEmail(email);
  return Boolean(normalizedEmail && uniqueEmails(dog.ownerEmail, dog.customerEmail).includes(normalizedEmail));
}

function profilePhotoSourceRecord(record = {}, fallbackRecordType = "") {
  if (!profilePhotoHasSource(record)) return {};
  return {
    ...record,
    id: record.profilePhotoSourceRecordId || record.profilePhotoRecordId || record.sourceRecordId || record.id || "",
    type: record.profilePhotoSourceRecordType || record.profilePhotoRecordType || record.sourceRecordType || record.type || fallbackRecordType || "",
  };
}

function boardingDogProfilePhotoRecord(record = {}) {
  if (profilePhotoHasSource(record)) return profilePhotoSourceRecord({ ...record, type: "boardingDog" }, "boardingDog");
  const linked = linkedCustomerDogForBoarding(record) || {};
  return profilePhotoHasSource(linked) ? profilePhotoSourceRecord(linked, linked.type || "customerDog") : {};
}

function canonicalDogMatchesCustomerDog(record = {}, dog = {}, email = currentUser?.email) {
  if (!record?.id || record.removed) return false;
  const customerDogIds = arrayValue(record.legacyCustomerDogIds);
  if (dog.id && customerDogIds.includes(dog.id)) return true;
  const boardingIds = arrayValue(record.legacyBoardingDogIds).map(boardingDogIdFromCustomerDogValue).filter(Boolean);
  const dogBoardingIds = [dog.sourceBoardingDogId, dog.linkedBoardingDogId, dog.id].map(boardingDogIdFromCustomerDogValue).filter(Boolean);
  if (boardingIds.length && dogBoardingIds.some((id) => boardingIds.includes(id))) return true;
  const ownerEmail = normalizeEmail(email || dog.customerEmail || dog.ownerEmail);
  const recordOwnerEmail = normalizeEmail(record.ownerEmail || record.customerEmail);
  const recordName = String(record.dogName || record.name || "").trim().toLowerCase();
  const dogName = String(dog.dogName || dog.name || "").trim().toLowerCase();
  return Boolean(ownerEmail && recordOwnerEmail === ownerEmail && recordName && dogName && recordName === dogName);
}

function canonicalDogProfilePhotoRecordForCustomerDog(dog = {}, email = currentUser?.email) {
  return readRecords("dog")
    .filter((record) => canonicalDogMatchesCustomerDog(record, dog, email) && profilePhotoHasSource(record))
    .sort((a, b) => itemSortTime(b) - itemSortTime(a))
    .map((record) => profilePhotoSourceRecord({ ...record, type: "dog" }, "dog"))[0] || {};
}

function customerDogFromBoardingDog(record = {}, email = currentUser?.email, options = {}) {
  const linked = (options.explicitOnly ? explicitLinkedCustomerDogForBoarding(record) : linkedCustomerDogForBoarding(record)) || {};
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail);
  const currentEmail = normalizeEmail(email);
  const photoRecord = boardingDogProfilePhotoRecord(record);
  return {
    ...linked,
    type: "customerDog",
    id: \`boarding:\${record.id}\`,
    sourceType: "boardingDog",
    isSharedBoardingDog: true,
    sourceBoardingDogId: record.id,
    linkedBoardingDogId: record.id,
    dogName: record.dogName || linked.dogName || "Boarding dog",
    breedDescription: record.breedDescription || linked.breedDescription || "",
    dateOfBirth: record.dateOfBirth || linked.dateOfBirth || "",
    sex: record.sex || linked.sex || "Unknown",
    spayNeuterStatus: record.spayNeuterStatus || linked.spayNeuterStatus || "Unknown",
    ownerName: record.ownerName || linked.ownerName || "",
    ownerPhone: record.ownerPhone || linked.ownerPhone || "",
    ownerEmail: ownerEmail || currentEmail,
    customerEmail: currentEmail || ownerEmail,
    secondaryOwnerEmail: normalizeEmail(record.secondaryOwnerEmail),
    emergencyName: record.emergencyName || linked.emergencyName || "",
    emergencyPhone: record.emergencyPhone || linked.emergencyPhone || "",
    specialCare: record.specialCare || linked.specialCare || "",
    foodInstructions: record.foodInstructions || linked.foodInstructions || "",
    dhppDate: record.dhppDate || linked.dhppDate || "",
    rabiesDate: record.rabiesDate || linked.rabiesDate || "",
    bordetellaDate: record.bordetellaDate || linked.bordetellaDate || "",
    heartwormDate: record.heartwormDate || linked.heartwormDate || "",
    rabiesDuration: record.rabiesDuration || linked.rabiesDuration || "",
    dhppDuration: record.dhppDuration || linked.dhppDuration || "",
    rabiesGoodThreeYears: record.rabiesGoodThreeYears || linked.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(record, "rabies") || vaccineDurationIsThreeYears(linked, "rabies") ? "Yes" : ""),
    dhppGoodThreeYears: record.dhppGoodThreeYears || linked.dhppGoodThreeYears || (vaccineDurationIsThreeYears(record, "dhpp") || vaccineDurationIsThreeYears(linked, "dhpp") ? "Yes" : ""),
    profilePhotoUrl: profilePhotoDirectSource(photoRecord),
    profilePhotoPath: profilePhotoStoragePath(photoRecord),
    profilePhotoData: photoRecord.profilePhotoData || "",
    profilePhotoSourceRecordId: photoRecord.id || "",
    profilePhotoSourceRecordType: photoRecord.type || "",
    vaccinationRecords: record.vaccinationRecords || linked.vaccinationRecords || [],
    vaccinationFiles: record.vaccinationFiles || linked.vaccinationFiles || "",
  };
}

function customerDogsForCurrentUser() {
  const role = currentRole();
  const email = normalizeEmail(currentUser?.email);
  if (role !== "customer") return [];
  const dogs = mergeCustomerDogDisplayRecords(readRecords("customerDog")
    .filter((dog) => !dog.removed && customerDogVisibleToCustomer(dog, email))
    .map((dog) => {
      const boarding = boardingDogForCustomerDog(dog);
      const boardingPhotoRecord = boarding ? boardingDogProfilePhotoRecord(boarding) : {};
      const fallbackPhotoRecord = profilePhotoHasSource(boardingPhotoRecord) ? boardingPhotoRecord : canonicalDogProfilePhotoRecordForCustomerDog(dog, email);
      const fallbackPhoto = profilePhotoDirectSource(fallbackPhotoRecord);
      const fallbackPhotoPath = profilePhotoStoragePath(fallbackPhotoRecord);
      return (fallbackPhoto || fallbackPhotoPath) && !profilePhotoHasSource(dog) ? {
        ...dog,
        profilePhotoUrl: fallbackPhoto,
        profilePhotoPath: fallbackPhotoPath,
        profilePhotoSourceRecordId: fallbackPhotoRecord.id || "",
        profilePhotoSourceRecordType: fallbackPhotoRecord.type || "",
      } : dog;
    }), email);
  const seenCustomerIds = new Set(dogs.flatMap((dog) => [dog.id, ...(dog.duplicateCustomerDogIds || [])]).filter(Boolean));
  const seenIds = new Set(dogs.flatMap((dog) => [dog.linkedBoardingDogId, dog.sourceBoardingDogId].map(boardingDogIdFromCustomerDogValue)).filter(Boolean));
  const seenIdentityKeys = new Set(dogs.map((dog) => customerDogIdentityKey(dog, email)).filter(Boolean));
  consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record, email))
  )
    .forEach((record) => {
      const recordId = boardingDogIdFromCustomerDogValue(record.id);
      if (seenIds.has(recordId)) return;
      const linkedDog = explicitLinkedCustomerDogForBoarding(record);
      if (linkedDog?.id && seenCustomerIds.has(linkedDog.id)) return;
      const semanticLinkedDog = linkedCustomerDogForBoarding(record);
      if (semanticLinkedDog?.id && seenCustomerIds.has(semanticLinkedDog.id)) {
        seenIds.add(recordId);
        return;
      }
      if (dogs.some((dog) => boardingRecordMatchesCustomerDog(record, dog))) {
        seenIds.add(recordId);
        return;
      }
      const displayDog = customerDogFromBoardingDog(record, email);
      const identityKey = customerDogIdentityKey(displayDog, email);
      if (identityKey && seenIdentityKeys.has(identityKey)) return;
      dogs.push(displayDog);
      seenIds.add(recordId);
      if (displayDog.id && !displayDog.isSharedBoardingDog) seenCustomerIds.add(displayDog.id);
      if (identityKey) seenIdentityKeys.add(identityKey);
    });
  return dogs;
}

function customerDogPhotoRecordForDisplay(dog = {}, fallbackRecord = {}) {
  const linkedBoarding = fallbackRecord?.id ? fallbackRecord : boardingDogForCustomerDog(dog);
  const linkedBoardingPhotoRecord = linkedBoarding ? boardingDogProfilePhotoRecord(linkedBoarding) : {};
  const canonicalPhotoRecord = canonicalDogProfilePhotoRecordForCustomerDog(dog);
  if (profilePhotoHasSource(dog)) {
    const dogPath = profilePhotoStoragePath(dog);
    const linkedPath = profilePhotoStoragePath(linkedBoardingPhotoRecord);
    if (dogPath && linkedPath && dogPath === linkedPath) {
      return {
        ...linkedBoardingPhotoRecord,
        dogName: dog.dogName || linkedBoardingPhotoRecord.dogName || "Dog",
      };
    }
    return dog;
  }
  if (linkedBoarding && profilePhotoHasSource(linkedBoardingPhotoRecord)) {
    return {
      ...linkedBoardingPhotoRecord,
      dogName: dog.dogName || linkedBoardingPhotoRecord.dogName || "Dog",
    };
  }
  if (profilePhotoHasSource(canonicalPhotoRecord)) {
    return {
      ...canonicalPhotoRecord,
      dogName: dog.dogName || canonicalPhotoRecord.dogName || "Dog",
    };
  }
  return dog;
}

function customerDogPhotoHtml(dog = {}, options = {}) {
  const name = dog.dogName || "Dog";
  const photoRecord = options.photoRecord || dog;
  const photo = profilePhotoDirectSource(photoRecord);
  if (profilePhotoHasSource(photoRecord)) {
    return \`<img class="customer-dog-photo"\${profilePhotoAccessAttrs(photoRecord, photoRecord.type || dog.type || "customerDog")}\${photo ? \` src="\${escapeHtml(photo)}"\` : ""} alt="\${escapeHtml(name)}"\${photo ? "" : " hidden"} /><span class="customer-dog-photo customer-dog-photo-initials" data-profile-photo-initials\${photo ? " hidden" : ""}>\${escapeHtml(avatarText(name))}</span>\`;
  }
  return \`<span class="customer-dog-photo customer-dog-photo-initials">\${escapeHtml(avatarText(name))}</span>\`;
}

function editableCustomerDogForCurrentUser(id = "", boardingId = "") {
  const dogId = String(id || "");
  const normalizedBoardingId = boardingDogIdFromCustomerDogValue(boardingId || dogId);
  const visibleDog = customerDogsForCurrentUser().find((dog) => dog.id === dogId || customerDogHasBoardingLink(dog, normalizedBoardingId));
  if (visibleDog) return visibleDog;
  const savedDog = readRecords("customerDog").find((dog) => dog.id === dogId && !dog.removed && (currentRole() === "admin" || customerDogVisibleToCustomer(dog)));
  if (savedDog) return savedDog;
  const boarding = readRecords("boardingDog").find((record) => record.id === normalizedBoardingId && !record.removed && (currentRole() === "admin" || boardingDogVisibleToCustomer(record)));
  return boarding ? customerDogForBoardingRequest(boarding) : null;
}

function customerUpdatesForCurrentUser() {
  const email = normalizeEmail(currentUser?.email);
  const updateKeys = new Set();
  const boardingUpdates = readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record, email))
    .flatMap((record) => {
      const displayRecord = boardingDogRecordForDisplay(record.id) || boardingDogWithStayStatus(record);
      const stays = displayRecord.stays || [];
      return (displayRecord.customerUpdates || record.customerUpdates || []).map((update) => {
        const stay = boardingStayByReference(displayRecord, { stayId: update.stayId || "", requestCode: update.requestCode || "" }) || activeBoardingStay(displayRecord) || currentOrNextStay(displayRecord) || stays[0] || {};
        return { ...update, source: "boardingDog", dog: displayRecord, stay };
      });
    });
  const customerDogUpdates = readRecords("customerDog")
    .filter((dog) => !dog.removed && customerDogVisibleToCustomer(dog, email))
    .flatMap((dog) => (dog.customerUpdates || []).map((update) => ({
      ...update,
      source: "customerDog",
      dog,
      stay: {
        id: update.stayId || "",
        dropoffTime: update.stayDropoffTime || "",
        pickupTime: update.stayPickupTime || "",
      },
    })));
  return [...boardingUpdates, ...customerDogUpdates]
    .filter((update) => {
      const key = update.id || \`\${update.createdAt || ""}|\${update.note || ""}|\${update.stayId || ""}\`;
      if (updateKeys.has(key)) return false;
      updateKeys.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderCustomerUpdates() {
  const list = $("#customerUpdatesList");
  if (!list) return;
  const updates = customerUpdatesForCurrentUser();
  if (!updates.length) {
    list.innerHTML = "<p>No boarding updates have been sent yet.</p>";
    return;
  }
  const grouped = updates.reduce((groups, update) => {
    const requestCode = update.requestCode || (update.stay?.id && update.dog ? boardingStayRequestCode(update.dog, update.stay) : "");
    const stayText = update.stayLabel || (update.stay?.dropoffTime || update.stay?.pickupTime
      ? stayScheduleRangeLabel(update.dog || {}, update.stay || {})
      : "Current stay");
    const key = \`\${update.dog?.dogName || update.dogName || "Dog"}|\${stayText}|\${requestCode || update.stayId || update.stay?.id || ""}\`;
    groups[key] = groups[key] || { dogName: update.dog?.dogName || update.dogName || "Dog", stayText, requestCode, updates: [] };
    groups[key].updates.push(update);
    return groups;
  }, {});
  list.innerHTML = Object.values(grouped)
    .map((group) => \`<section class="customer-update-group">
      <h3>\${escapeHtml(group.dogName)}</h3>
      <p>\${group.requestCode ? \`Stay ID: \${escapeHtml(group.requestCode)} | \` : ""}\${escapeHtml(group.stayText)}</p>
      \${group.updates.map((update) => {
        const requestCode = update.requestCode || group.requestCode || "";
        const media = (update.mediaItems || []).map((item) => {
          const src = item.url || item.dataUrl || "";
          if (!src && !item.storagePath) return item.note ? \`<p class="muted-text">\${escapeHtml(item.name || "Media")}: \${escapeHtml(item.note)}</p>\` : "";
          const isImage = String(item.type || "").startsWith("image/");
          const isVideo = String(item.type || "").startsWith("video/");
          const label = item.name || (isVideo ? "Open video" : isImage ? "Open photo" : "Open attachment");
          return \`<button type="button" class="customer-update-media-button" data-action="view-media" data-src="\${escapeHtml(src)}" data-media-type="\${escapeHtml(item.type || "application/octet-stream")}" data-media-name="\${escapeHtml(item.name || "Customer update media")}"\${mediaAccessAttrs(item, { sourceRecordId: update.boardingDogId || item.sourceRecordId || "", sourceRecordType: "boardingDog" })}>\${isImage && src ? \`<img src="\${escapeHtml(src)}" alt="\${escapeHtml(item.name || "Customer update photo")}" />\` : ""}<span>\${escapeHtml(label)}</span></button>\`;
        }).join("");
        return \`<article class="record-card compact-record-card customer-update-card">
          <strong>\${escapeHtml(formatDateTime(update.createdAt) || "Update")}</strong>
          <p>\${escapeHtml(update.note || "No note added.")}</p>
          <small>\${escapeHtml([update.byName || "", requestCode ? \`Stay ID: \${requestCode}\` : ""].filter(Boolean).join(" | "))}</small>
          \${media ? \`<div class="customer-update-media-grid">\${media}</div>\` : ""}
        </article>\`;
      }).join("")}
    </section>\`)
    .join("");
}

function customerUploadedFileEntriesForCurrentUser() {
  const dogFiles = customerDogsForCurrentUser().flatMap((dog) => {
    const dogName = dog.dogName || "Dog";
    const entries = [];
    if (dog.profilePhotoUrl || dog.profilePhotoData || dog.profilePhotoPath) {
      entries.push({
        sourceRecordId: dog.id || "",
        sourceRecordType: dog.type || "customerDog",
        dogName,
        fileName: \`\${dogName} profile photo\`,
        fileType: "Profile photo",
        src: dog.profilePhotoUrl || dog.profilePhotoData || "",
        storagePath: dog.profilePhotoPath || "",
        mediaType: "image/jpeg",
        savedAt: dog.updatedAt || dog.submittedAt || "",
      });
    }
    (dog.vaccinationRecords || []).forEach((file, index) => {
      entries.push({
        sourceRecordId: dog.id || file.sourceRecordId || "",
        sourceRecordType: dog.type || file.sourceRecordType || "customerDog",
        dogName,
        fileName: file.name || \`Vaccination record \${index + 1}\`,
        fileType: file.vaccineType || "Vaccination record",
        src: file.url || file.dataUrl || "",
        storagePath: file.storagePath || "",
        mediaType: file.type || "application/pdf",
        savedAt: file.savedAt || file.createdAt || dog.updatedAt || dog.submittedAt || "",
      });
    });
    if (!(dog.vaccinationRecords || []).length && dog.vaccinationFiles) {
      String(dog.vaccinationFiles).split(",").map((name) => name.trim()).filter(Boolean).forEach((name) => {
        entries.push({
          dogName,
          fileName: name,
          fileType: "Vaccination record",
          src: "",
          mediaType: "",
          savedAt: dog.updatedAt || dog.submittedAt || "",
        });
      });
    }
    return entries;
  });
  const agreementFiles = customerBoardingAgreementsForCurrentUser().map((agreement) => ({
    sourceRecordId: agreement.id || "",
    sourceRecordType: "boardingAgreement",
    dogName: "Owner profile",
    fileName: agreement.agreementTitle || CUSTOMER_BOARDING_AGREEMENT_TITLE,
    fileType: "Signed boarding agreement",
    savedAt: agreement.signedAt || agreement.submittedAt || "",
    agreementRecord: agreement,
    agreementVersion: agreement.agreementVersion || "",
  }));
  return [...dogFiles, ...agreementFiles].sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));
}

function renderCustomerFiles() {
  const list = $("#customerFilesList");
  if (!list) return;
  const files = customerUploadedFileEntriesForCurrentUser();
  list.innerHTML = files.length
    ? files.map((file) => {
      const action = file.sourceRecordType === "boardingAgreement"
        ? \`<button type="button" class="secondary-button" data-action="view-customer-agreement" data-id="\${escapeHtml(file.sourceRecordId || "")}">Open Agreement</button>\`
        : file.src || file.storagePath
        ? \`<button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="\${escapeHtml(file.src || "")}" data-media-type="\${escapeHtml(file.mediaType || "")}" data-media-name="\${escapeHtml(file.fileName)}"\${mediaAccessAttrs(file, { sourceRecordId: file.sourceRecordId || "", sourceRecordType: file.sourceRecordType || "" })}>Open</button>\`
        : \`<button type="button" class="secondary-button media-preview-button" data-action="view-media" data-src="" data-media-type="" data-media-name="\${escapeHtml(file.fileName)}">View Name</button>\`;
      return \`<article class="record-card compact-record-card">
        <strong>\${escapeHtml(file.fileName)}</strong>
        <span>\${escapeHtml(file.dogName)} | \${escapeHtml(file.fileType)}\${file.agreementVersion ? \` | Version \${escapeHtml(file.agreementVersion)}\` : ""}</span>
        \${file.savedAt ? \`<p>\${escapeHtml(formatDateTime(file.savedAt))}</p>\` : ""}
        <div class="record-actions">\${action}</div>
      </article>\`;
    }).join("")
    : "<p>No uploaded files are saved yet.</p>";
}

async function saveCanonicalCustomerDogForBoarding(record = {}, previousRecord = {}) {
  const ownerEmail = normalizeEmail(record.ownerEmail || record.customerEmail || record.linkedOwnerEmail);
  if (!ownerEmail || !record.dogName) return null;
  const existingDog = matchingCustomerDogForBoardingProfile(record) || matchingCustomerDogForBoardingProfile(previousRecord) || {};
  const profilePatch = dogProfileFieldPatch(record);
  const payload = {
    ...existingDog,
    ...profilePatch,
    type: "customerDog",
    id: existingDog.id || record.linkedCustomerDogId || uid("customerDog"),
    submittedAt: existingDog.submittedAt || record.submittedAt || new Date().toISOString(),
    ownerEmail,
    customerEmail: ownerEmail,
    ownerName: record.ownerName || existingDog.ownerName || "",
    linkedBoardingDogId: record.id || previousRecord.id || existingDog.linkedBoardingDogId || "",
    sourceBoardingDogId: record.id || previousRecord.id || existingDog.sourceBoardingDogId || "",
    sourceType: "boardingDog",
    removed: false,
  };
  const saved = upsertRecord("customerDog", payload);
  await sendPayload(saved);
  return saved;
}

function vaccinationPayloadsForDog(dog = {}) {
  const dateFields = [
    ["dhppDate", "DHPP"],
    ["rabiesDate", "Rabies"],
    ["bordetellaDate", "Bordetella"],
    ["heartwormDate", "Heartworm"],
  ];
  const payloads = dateFields
    .filter(([field]) => dog[field])
    .map(([field, label]) => ({
      type: "dogVaccination",
      id: stableLegacyId("dogVaccination", dog.id, field, dog[field]),
      submittedAt: dog.submittedAt,
      dogId: dog.id,
      vaccineType: label,
      vaccinationDate: dog[field],
      duration: field === "rabiesDate"
        ? dog.rabiesDuration || (vaccineDurationIsThreeYears(dog, "rabies") ? "3 years" : "")
        : field === "dhppDate"
          ? dog.dhppDuration || (vaccineDurationIsThreeYears(dog, "dhpp") ? "3 years" : "")
          : "",
      source: "legacy-dog-field",
      removed: false,
    }));
  (dog.vaccinationRecords || []).forEach((file, index) => {
    const key = file.id || file.url || file.dataUrl || file.name || index;
    payloads.push({
      type: "dogVaccination",
      id: stableLegacyId("dogVaccination", dog.id, "file", key),
      submittedAt: dog.submittedAt,
      dogId: dog.id,
      vaccineType: file.vaccineType || "Uploaded record",
      vaccinationDate: file.vaccinationDate || "",
      fileName: file.name || "",
      fileUrl: file.url || file.dataUrl || "",
      source: "legacy-vaccination-record",
      removed: false,
    });
  });
  return payloads;
}

function customerUpdatePayloadsForLegacyBoardingDog(record = {}, dogId = "", reservationIdsByStayId = new Map()) {
  return (record.customerUpdates || []).map((update, index) => ({
    type: "reservationCustomerUpdate",
    id: stableLegacyId("reservationCustomerUpdate", record.id, update.id || update.createdAt || index),
    submittedAt: update.createdAt || record.submittedAt || new Date().toISOString(),
    dogId,
    reservationId: reservationIdsByStayId.get(update.stayId || "") || reservationIdsByStayId.get("__first__") || "",
    title: update.title || "Customer update",
    note: update.note || "",
    mediaItems: update.mediaItems || [],
    visibleToCustomer: true,
    createdByStaffId: update.byEmail || update.createdByEmail || "",
    legacyBoardingDogId: record.id || "",
    legacyUpdateId: update.id || "",
    removed: false,
  }));
}

function customerUpdateForStay(record = {}, stay = {}) {
  if (!stay?.id) return null;
  const requestCode = boardingStayRequestCode(record, stay);
  return arrayValue(record.customerUpdates).find((update) => {
    if (update.stayId && update.stayId === stay.id) return true;
    if (requestCode && update.requestCode === requestCode) return true;
    if (stay.dropoffTime && stay.pickupTime && update.stayDropoffTime === stay.dropoffTime && update.stayPickupTime === stay.pickupTime) return true;
    return false;
  }) || null;
}

function renderCustomerDogUploadCards() {
  const list = $("#customerDogUploadCards");
  if (!list) return;
  const records = readRecords("customerDog")
    .filter((record) => !record.removed)
    .filter((record) => record.profilePhotoUrl || record.vaccinationRecords?.length || record.vaccinationFiles)
    .sort((a, b) => String(a.dogName || "").localeCompare(String(b.dogName || "")));
  list.innerHTML = records.length
    ? records
        .map((record) => {
          const boardingRecord = boardingDogForCustomerDog(record);
          const boardingAction = boardingRecord
            ? \`<button type="button" class="secondary-button" data-action="open-linked-boarding-dog" data-id="\${escapeHtml(boardingRecord.id)}">Open boarding record</button>\`
            : \`<button type="button" class="secondary-button" data-action="create-boarding-from-customer-dog" data-id="\${escapeHtml(record.id)}">Create boarding profile</button>\`;
          return \`<article class="record-card compact-record-card"><strong>\${escapeHtml(record.dogName || "Customer dog")}</strong><span>\${escapeHtml(record.ownerName || record.ownerEmail || record.customerEmail || "Customer")}</span><p>\${escapeHtml(record.breedDescription || "")}</p>\${mediaLinkHtml(record)}<div class="record-actions">\${boardingAction}</div></article>\`;
        })
        .join("")
    : "<p>No customer-uploaded dog files are saved yet.</p>";
}

function customerUpdateMediaHtml(update = {}) {
  const items = update.mediaItems || [];
  return items.map((item) => {
    const type = String(item.type || "");
    const label = type.startsWith("video/") ? "Open video" : type.startsWith("image/") ? "Open photo" : "Open media";
    return \`<button type="button" class="media-preview-button secondary-button" data-action="view-media" data-src="\${escapeHtml(item.url || item.dataUrl || "")}" data-media-type="\${escapeHtml(type || "application/octet-stream")}" data-media-name="\${escapeHtml(item.name || "Customer update media")}"\${mediaAccessAttrs(item, { sourceRecordId: update.boardingDogId || item.sourceRecordId || "", sourceRecordType: "boardingDog" })}>\${label}</button>\`;
  }).join("");
}

function customerBookingAvailabilityForDateTime(value = "", label = "Selected time") {
  if (!value) return { valid: true, notices: [] };
  const date = dateOnly(value);
  const parsed = new Date(value);
  if (!date || Number.isNaN(parsed.getTime())) return { valid: false, fieldLabel: label, message: \`\${label} is not a valid date and time.\`, notices: [] };
  const window = operationWindowForDate(date);
  const notices = [];
  if (window.message) notices.push(\`\${operationDateLabel(date)}: \${window.message}\`);
  if (!window.isOpen) {
    return {
      valid: false,
      fieldLabel: label,
      message: \`\${label} falls on \${operationDateLabel(date)}. \${window.message || operationWindowText(window)}\`,
      notices,
      window,
    };
  }
  const selectedMinutes = parsed.getHours() * 60 + parsed.getMinutes();
  const openMinutes = timeToMinutes(window.openTime);
  const closeMinutes = timeToMinutes(window.closeTime);
  if (selectedMinutes < openMinutes || selectedMinutes > closeMinutes) {
    return {
      valid: false,
      fieldLabel: label,
      message: \`\${label} must be between \${displayTime(window.openTime)} and \${displayTime(window.closeTime)} on \${operationDateLabel(date)}.\`,
      notices,
      window,
    };
  }
  notices.push(\`\${label}: \${operationWindowText(window)}.\`);
  return { valid: true, fieldLabel: label, notices, window };
}

function customerBookingAvailabilityChecks(formEl = $("#customerBookingForm")) {
  if (!formEl) return [];
  const isServiceRequest = $("#customerRequestMode")?.value === "service";
  const dropoffField = formFieldByName(formEl, "dropoffTime");
  const pickupField = formFieldByName(formEl, "pickupTime");
  const checks = [
    { field: dropoffField, result: customerBookingAvailabilityForDateTime(dropoffField?.value || "", "Drop-off time") },
  ];
  if (!isServiceRequest) {
    checks.push({ field: pickupField, result: customerBookingAvailabilityForDateTime(pickupField?.value || "", "Pick-up time") });
  }
  return checks;
}

function customerRequestMode() {
  return $("#customerRequestMode")?.value === "service" ? "service" : "boarding";
}

function setCustomerRequestActionMode(mode = "boarding") {
  const normalizedMode = mode === "service" ? "service" : "boarding";
  const boardingButton = $("#openCustomerBoardingRequestButton");
  const serviceButton = $("#openCustomerServiceRequestButton");
  boardingButton?.classList.toggle("is-active", normalizedMode === "boarding");
  boardingButton?.classList.toggle("secondary-button", normalizedMode !== "boarding");
  boardingButton?.setAttribute("aria-pressed", normalizedMode === "boarding" ? "true" : "false");
  serviceButton?.classList.toggle("is-active", normalizedMode === "service");
  serviceButton?.classList.toggle("secondary-button", normalizedMode !== "service");
  serviceButton?.setAttribute("aria-pressed", normalizedMode === "service" ? "true" : "false");
}

function customerBookingDateOrderError(formEl = $("#customerBookingForm")) {
  const mode = customerRequestMode();
  const dropoffField = formFieldByName(formEl, "dropoffTime");
  const pickupField = formFieldByName(formEl, "pickupTime");
  const dropoff = parsedCustomerDateTime(dropoffField?.value || "");
  const pickup = parsedCustomerDateTime(pickupField?.value || "");
  if (dropoffField?.value && !dropoff) {
    return { field: dropoffField, message: "Requested drop-off time is not a valid date and time." };
  }
  if (mode === "boarding" && pickupField?.value && !pickup) {
    return { field: pickupField, message: "Pick-up time is not a valid date and time." };
  }
  const editingExisting = Boolean($("#editingCustomerRequestId")?.value);
  if (!editingExisting && dropoff && dropoff.getTime() < Date.now() - 300000) {
    return { field: dropoffField, message: "Requested drop-off time must be in the future." };
  }
  if (mode === "boarding" && dropoff && pickup && pickup <= dropoff) {
    return { field: pickupField, message: "Pick-up time must be after the drop-off time." };
  }
  return null;
}

function customerBookingAvailabilityMessagesHtml(checks = customerBookingAvailabilityChecks()) {
  const messages = [];
  const seen = new Set();
  checks.forEach(({ result }) => {
    (result.notices || []).forEach((notice) => {
      if (seen.has(notice)) return;
      seen.add(notice);
      messages.push({ type: result.valid ? "info" : "warning", text: notice });
    });
    if (!result.valid && result.message && !seen.has(result.message)) {
      seen.add(result.message);
      messages.push({ type: "warning", text: result.message });
    }
  });
  return messages.map((item) => \`<article class="operation-availability-card \${item.type === "warning" ? "is-warning" : ""}">\${escapeHtml(item.text)}</article>\`).join("");
}

function renderCustomerBookingAvailabilityMessages() {
  const container = $("#customerBookingAvailabilityMessages");
  if (!container) return;
  const formEl = $("#customerBookingForm");
  if (!formEl || formEl.hidden) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = customerBookingAvailabilityMessagesHtml();
}

function customerBookingEstimateAvailabilityChecks(estimate = {}) {
  const isServiceRequest = Boolean(estimate.isServiceRequest);
  const checks = [
    { result: customerBookingAvailabilityForDateTime(estimate.dropoffTime || "", "Drop-off time") },
  ];
  if (!isServiceRequest) checks.push({ result: customerBookingAvailabilityForDateTime(estimate.pickupTime || "", "Pick-up time") });
  return checks.filter((item) => item.result);
}

function customerBookingEstimateAvailabilityValid(estimate = {}) {
  return customerBookingEstimateAvailabilityChecks(estimate).every((item) => item.result.valid);
}

function customerFlowStepperHtml(steps = [], activeKey = "", options = {}) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.key === activeKey));
  const mobileLabel = steps[activeIndex]?.label || steps[0]?.label || "";
  const mobile = options.mobileSummary !== false
    ? \`<div class="customer-flow-mobile-summary">Step \${activeIndex + 1} of \${steps.length}: \${escapeHtml(mobileLabel)}</div>\`
    : "";
  return \`\${mobile}<div class="customer-flow-step-list">\${steps.map((step, index) => {
    const state = index < activeIndex ? "is-complete" : index === activeIndex ? "is-active" : "";
    return \`<span class="\${state}"><i>\${index + 1}</i>\${escapeHtml(step.label)}</span>\`;
  }).join("")}</div>\`;
}

function visibleCustomerBookingWizardSteps() {
  if (customerRequestMode() === "service") {
    return customerBookingWizardSteps.filter((step) => step.key !== "options");
  }
  return customerBookingWizardSteps;
}

function renderCustomerOnboardingProgress(dogs = customerDogsForCurrentUser()) {
  const panel = $("#customerOnboardingProgress");
  if (!panel) return;
  const dogForm = $("#customerDogForm");
  const inlineDogFormOpen = dogForm && !dogForm.hidden && dogForm.parentElement?.id === "customerDogFormHome";
  if (currentRole() !== "customer" || inlineDogFormOpen || dogs.length) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const activeKey = dogs.length ? "request" : "dog";
  const steps = [
    { key: "account", label: "Account" },
    { key: "dog", label: "Dog Profile" },
    { key: "request", label: "Request Stay" },
  ];
  panel.hidden = false;
  panel.innerHTML = \`<div class="customer-progress-copy"><strong>\${dogs.length ? "Ready when you are" : "First visit setup"}</strong><span>\${dogs.length ? "Book a stay or keep adding dog profiles." : "Add your first dog before requesting boarding or services."}</span></div>\${customerFlowStepperHtml(steps, activeKey, { mobileSummary: false })}\`;
  const markers = panel.querySelectorAll(".customer-flow-step-list span");
  if (markers[0]) markers[0].classList.add("is-complete");
  if (dogs.length && markers[1]) markers[1].classList.add("is-complete");
}

function renderCustomerProgress() {
  renderCustomerOnboardingProgress();
}

function renderCustomerDogWizardStep() {
  const formEl = $("#customerDogForm");
  if (!formEl) return;
  const steps = customerDogWizardSteps;
  if (!steps.some((step) => step.key === customerDogWizardStep)) customerDogWizardStep = steps[0].key;
  const activeIndex = steps.findIndex((step) => step.key === customerDogWizardStep);
  $("#customerDogWizardStepper").innerHTML = customerFlowStepperHtml(steps, customerDogWizardStep);
  formEl.querySelectorAll("[data-customer-dog-step]").forEach((panel) => {
    panel.hidden = panel.dataset.customerDogStep !== customerDogWizardStep;
  });
  $("#customerDogBackButton").hidden = activeIndex <= 0;
  $("#customerDogNextButton").hidden = activeIndex >= steps.length - 1;
  $("#saveCustomerDogButton").hidden = activeIndex < steps.length - 1;
}

function customerVisibleStepFields(container) {
  return [...(container?.querySelectorAll("input, select, textarea") || [])]
    .filter((field) => field.name && !field.disabled && field.type !== "hidden" && field.type !== "file");
}

function validateCustomerDogWizardStep() {
  const panel = document.querySelector(\`[data-customer-dog-step="\${cssEscapeValue(customerDogWizardStep)}"]\`);
  let firstInvalid = null;
  customerVisibleStepFields(panel).forEach(clearFieldError);
  customerVisibleStepFields(panel).forEach((field) => {
    const empty = field.required && !String(field.value || "").trim();
    const badFormat = field.value && !field.checkValidity();
    if (empty || badFormat) {
      setFieldError(field, empty ? \`\${friendlyName(field)} is required before continuing.\` : \`Check \${friendlyName(field).toLowerCase()} before continuing.\`);
      firstInvalid = firstInvalid || field;
    }
  });
  if (!firstInvalid) return true;
  firstInvalid.focus({ preventScroll: true });
  firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
  showToast("Please fix the highlighted fields before continuing.");
  return false;
}

function setCustomerDogWizardStep(stepKey = "profile") {
  customerDogWizardStep = customerDogWizardSteps.some((step) => step.key === stepKey) ? stepKey : "profile";
  renderCustomerDogWizardStep();
}

function goToNextCustomerDogStep() {
  if (!validateCustomerDogWizardStep()) return;
  const index = customerDogWizardSteps.findIndex((step) => step.key === customerDogWizardStep);
  if (index < customerDogWizardSteps.length - 1) setCustomerDogWizardStep(customerDogWizardSteps[index + 1].key);
}

function goToPreviousCustomerDogStep() {
  const index = customerDogWizardSteps.findIndex((step) => step.key === customerDogWizardStep);
  if (index > 0) setCustomerDogWizardStep(customerDogWizardSteps[index - 1].key);
}

function updateCustomerBookingOptionsEmptyState() {
  const empty = $("#customerBoardingOptionsEmpty");
  if (!empty) return;
  const optionsStep = document.querySelector('[data-customer-booking-step="options"]');
  const visibleOptions = [...(optionsStep?.querySelectorAll(".customer-form-step") || [])].some((panel) => !panel.hidden);
  empty.hidden = customerRequestMode() !== "boarding" || visibleOptions;
}

function renderCustomerBookingWizardStep() {
  const formEl = $("#customerBookingForm");
  if (!formEl) return;
  const steps = visibleCustomerBookingWizardSteps();
  if (!steps.some((step) => step.key === customerBookingWizardStep)) customerBookingWizardStep = steps[0].key;
  const activeIndex = steps.findIndex((step) => step.key === customerBookingWizardStep);
  $("#customerBookingWizardStepper").innerHTML = customerFlowStepperHtml(steps, customerBookingWizardStep);
  formEl.querySelectorAll("[data-customer-booking-step]").forEach((panel) => {
    panel.hidden = panel.dataset.customerBookingStep !== customerBookingWizardStep;
  });
  updateCustomerBookingOptionsEmptyState();
  $("#customerBookingBackButton").hidden = activeIndex <= 0;
  $("#customerBookingNextButton").hidden = activeIndex >= steps.length - 1;
  $("#requestBoardingButton").hidden = activeIndex < steps.length - 1;
  updateCustomerEstimate();
  updateCustomerStickyBookNow();
}

function setCustomerBookingWizardStep(stepKey = "pets") {
  const steps = visibleCustomerBookingWizardSteps();
  customerBookingWizardStep = steps.some((step) => step.key === stepKey) ? stepKey : steps[0].key;
  renderCustomerBookingWizardStep();
}

function validateCustomerBookingWizardStep() {
  const formEl = $("#customerBookingForm");
  if (customerBookingWizardStep === "pets") {
    if (!validateCustomerDogSelection()) return false;
    const panel = document.querySelector('[data-customer-booking-step="pets"]');
    const fields = customerVisibleStepFields(panel);
    let firstInvalid = null;
    fields.forEach(clearFieldError);
    fields.forEach((field) => {
      const empty = field.required && !String(field.value || "").trim();
      const badFormat = field.value && !field.checkValidity();
      if (empty || badFormat) {
        setFieldError(field, empty ? \`\${friendlyName(field)} is required before continuing.\` : \`Check \${friendlyName(field).toLowerCase()} before continuing.\`);
        firstInvalid = firstInvalid || field;
      }
    });
    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast("Please choose the dog and requested times before continuing.");
      return false;
    }
    return validateCustomerBookingAvailability(formEl);
  }
  return true;
}

function goToNextCustomerBookingStep() {
  if (!validateCustomerBookingWizardStep()) return;
  const steps = visibleCustomerBookingWizardSteps();
  const index = steps.findIndex((step) => step.key === customerBookingWizardStep);
  if (index < steps.length - 1) setCustomerBookingWizardStep(steps[index + 1].key);
}

function goToPreviousCustomerBookingStep() {
  const steps = visibleCustomerBookingWizardSteps();
  const index = steps.findIndex((step) => step.key === customerBookingWizardStep);
  if (index > 0) setCustomerBookingWizardStep(steps[index - 1].key);
}

function scrollCustomerBookingAreaIntoView(preferOpenForm = true) {
  window.setTimeout(() => {
    const bookingForm = $("#customerBookingForm");
    const target = preferOpenForm && bookingForm && !bookingForm.hidden
      ? bookingForm
      : $("#customerRequestActions") || $("#customerNoDogRequestPrompt") || $("#customerRequestsPage");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function handleCustomerBookNowClick() {
  if (currentRole() !== "customer") return;
  const dogs = customerDogsForCurrentUser();
  const bookingForm = $("#customerBookingForm");
  const requestPageActive = activePageId() === "customerRequestsPage";
  const bookingOpen = bookingForm && !bookingForm.hidden;
  if (bookingOpen && !requestPageActive) {
    switchPage("customerRequestsPage");
    scrollCustomerBookingAreaIntoView();
    return;
  }
  if (!dogs.length) {
    if (!requestPageActive) {
      switchPage("customerRequestsPage");
      scrollCustomerBookingAreaIntoView(false);
      return;
    }
    switchPage("customerPage");
    openCustomerDogModal();
    return;
  }
  if (bookingOpen) {
    const steps = visibleCustomerBookingWizardSteps();
    const activeIndex = steps.findIndex((step) => step.key === customerBookingWizardStep);
    if (activeIndex < steps.length - 1) {
      goToNextCustomerBookingStep();
      return;
    }
    $("#requestBoardingButton")?.click();
    return;
  }
  switchPage("customerRequestsPage");
  openCustomerBookingModal("boarding");
}

function updateCustomerStickyBookNow() {
  const button = $("#customerStickyBookNowButton");
  if (!button) return;
  if (currentRole() !== "customer" || activePageId() === "loginPage") {
    button.hidden = true;
    return;
  }
  const dogs = customerDogsForCurrentUser();
  const requestPageActive = activePageId() === "customerRequestsPage";
  const bookingOpen = $("#customerBookingForm") && !$("#customerBookingForm").hidden;
  button.hidden = false;
  if (!dogs.length && requestPageActive) {
    button.textContent = "Add Your First Dog";
  } else if (bookingOpen) {
    const steps = visibleCustomerBookingWizardSteps();
    const activeIndex = steps.findIndex((step) => step.key === customerBookingWizardStep);
    button.textContent = requestPageActive && activeIndex >= steps.length - 1 ? "Review Request" : "Continue";
  } else {
    button.textContent = "Book Now";
  }
}

function fillCustomerDefaults() {
  if (!$("#customerOwnerEmail")) return;
  $("#customerOwnerName").value = currentUser?.name || "";
  $("#customerOwnerEmail").value = currentUser?.email || "";
}

function renderCustomerDogs() {
  if (!$("#customerDogList")) return;
  if (currentRole() !== "customer") {
    $("#customerDogList").innerHTML = "";
    if ($("#customerBookingDogList")) $("#customerBookingDogList").innerHTML = "";
    $("#customerRequestActions")?.toggleAttribute("hidden", true);
    $("#customerNoDogRequestPrompt")?.toggleAttribute("hidden", true);
    updateCustomerStickyBookNow();
    if (activePageId() === "customerPage") switchPage(defaultPageForRole());
    return;
  }
  const dogs = customerDogsForCurrentUser();
  const checkedIds = new Set([...document.querySelectorAll('#customerBookingDogList input[name="customerDogSelect"]:checked')].map((input) => input.value));
  const addDogButton = $("#openCustomerDogModalButton");
  if (addDogButton) {
    addDogButton.hidden = !dogs.length;
    addDogButton.textContent = "Add Another Dog";
  }
  const inlineFirstDogFormOpen = !dogs.length && !$("#customerDogForm")?.hidden && $("#customerDogForm")?.parentElement?.id === "customerDogFormHome";
  $("#customerDogList").toggleAttribute("hidden", inlineFirstDogFormOpen);
  $("#customerDogList").innerHTML = dogs.length
    ? dogs.map(customerDogSummaryCardHtml).join("")
    : inlineFirstDogFormOpen ? "" : customerDogWelcomeHtml();
  hydrateProfilePhotoElements($("#customerDogList"));
  if ($("#customerBookingDogList")) {
    $("#customerBookingDogList").innerHTML = dogs.length
      ? dogs.map((dog) => \`<label class="customer-dog-item"><input type="checkbox" name="customerDogSelect" value="\${dog.id}" \${checkedIds.has(dog.id) ? "checked" : ""} /> <strong>\${escapeHtml(dog.dogName)}</strong><span>\${escapeHtml(dog.breedDescription || "")}</span></label>\`).join("")
      : \`<article class="record-card compact-record-card"><strong>Add a dog before requesting boarding.</strong><p>Boarding requests need at least one dog profile first.</p><button type="button" class="secondary-button" data-action="customer-add-dog-cta">Add Dog</button></article>\`;
  }
  $("#customerBookingForm")?.classList.toggle("has-no-customer-dogs", !dogs.length);
  $("#requestBoardingButton").disabled = !dogs.length || checkedIds.size > BOARDING_MAX_DOGS_PER_REQUEST;
  $("#customerRequestActions")?.toggleAttribute("hidden", !dogs.length);
  $("#customerNoDogRequestPrompt")?.toggleAttribute("hidden", dogs.length);
  renderCustomerStayProgramOptions();
  renderCustomerCrateShareOptions();
  renderCustomerServiceOptions();
  updateCustomerEstimate();
  renderCustomerProgress();
  updateCustomerStickyBookNow();
}

function vaccinationExpiryDate(record = {}) {
  const value = record.expires_at || record.expiresAt || record.expirationDate || record.expiration_date || "";
  const date = value ? new Date(\`\${String(value).slice(0, 10)}T12:00:00\`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function vaccinationFieldDate(record = {}, keys = []) {
  const value = keys.map((key) => record[key]).find(Boolean) || "";
  const date = value ? new Date(\`\${String(value).slice(0, 10)}T12:00:00\`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function vaccinationDateExpiry(record = {}, vaccineKey = "", keys = [], defaultYears = 1) {
  const date = vaccinationFieldDate(record, keys);
  if (!date) return null;
  const years = vaccineDurationIsThreeYears(record, vaccineKey) ? 3 : defaultYears;
  const expiry = new Date(date);
  expiry.setFullYear(expiry.getFullYear() + years);
  return expiry;
}

function legacyVaccinationDateStatus(record = {}) {
  const expirations = [
    vaccinationDateExpiry(record, "rabies", ["rabiesDate", "rabiesVaccinationDate", "lastRabiesVaccination"], 1),
    vaccinationDateExpiry(record, "dhpp", ["dhppDate", "dhppVaccinationDate", "lastDhppVaccination"], 1),
    vaccinationDateExpiry(record, "bordetella", ["bordetellaDate", "bordetellaVaccinationDate", "lastBordetellaVaccination"], 1),
  ].filter(Boolean);
  if (!expirations.length) return "";
  const today = new Date(\`\${todayDate()}T00:00:00\`);
  return expirations.some((date) => date >= today) ? "ok" : "expired";
}

function vaccinationStatusInfo(record = {}) {
  const records = arrayValue(record.vaccinationRecords);
  const expirations = records.map(vaccinationExpiryDate).filter(Boolean);
  const today = new Date(\`\${todayDate()}T00:00:00\`);
  const hasVaccinationRecords = records.length > 0;
  const legacyDateStatus = legacyVaccinationDateStatus(record);
  if (legacyDateStatus === "ok") {
    return { label: "Vaccines OK", customerLabel: "Vaccines on file", className: "is-vaccine-ok", customerClassName: "is-vaccine-ok" };
  }
  if (hasVaccinationRecords && expirations.some((date) => date >= today)) {
    return { label: "Vaccines OK", customerLabel: "Vaccines on file", className: "is-vaccine-ok", customerClassName: "is-vaccine-ok" };
  }
  if (records.length || legacyDateStatus === "expired") {
    return { label: "Vaccines Expired", customerLabel: "Vaccines on file", className: "is-vaccine-expired", customerClassName: "is-vaccine-ok" };
  }
  const hasLegacyDates = Boolean(record.dhppDate || record.dhppVaccinationDate || record.lastDhppVaccination || record.rabiesDate || record.rabiesVaccinationDate || record.lastRabiesVaccination || record.bordetellaDate || record.bordetellaVaccinationDate || record.lastBordetellaVaccination || record.vaccinationFiles);
  if (hasLegacyDates) return { label: "Vaccines OK", customerLabel: "Vaccines on file", className: "is-vaccine-ok", customerClassName: "is-vaccine-ok" };
  return { label: "No Vaccines on File", customerLabel: "Vaccines needed", className: "is-vaccine-needed", customerClassName: "is-vaccine-needed" };
}

function vaccinationStatusBadgeHtml(record = {}, options = {}) {
  const info = vaccinationStatusInfo(record);
  const label = options.customer ? info.customerLabel : info.label;
  const className = options.customer ? info.customerClassName || info.className : info.className;
  return statusChipHtml(label, \`vaccination-status-chip \${className}\`);
}

function customerFacingVaccineStatus(dog = {}) {
  const info = vaccinationStatusInfo(dog);
  return {
    label: info.customerLabel || info.label,
    className: info.customerClassName || info.className,
    hasVaccines: (info.customerClassName || info.className) === "is-vaccine-ok",
  };
}

function vaccinationExpiresSoon(record = {}, days = 30) {
  const today = new Date(\`\${todayDate()}T00:00:00\`);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + days);
  return arrayValue(record.vaccinationRecords)
    .map(vaccinationExpiryDate)
    .filter(Boolean)
    .some((date) => date >= today && date <= cutoff);
}

function dogAgeText(dog = {}) {
  const birth = dog.dateOfBirth || dog.birthday || "";
  if (!birth) return "";
  const birthDate = new Date(\`\${birth}T12:00:00\`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) years -= 1;
  if (years > 0) return \`\${years} year\${years === 1 ? "" : "s"} old\`;
  const months = Math.max(0, (today.getFullYear() - birthDate.getFullYear()) * 12 + today.getMonth() - birthDate.getMonth());
  return months ? \`\${months} month\${months === 1 ? "" : "s"} old\` : "Under 1 month old";
}

function boardingRecordMatchesCustomerDog(record = {}, dog = {}) {
  const dogId = boardingDogIdFromCustomerDogValue(record.id);
  const customerBoardingIds = [dog.sourceBoardingDogId, dog.linkedBoardingDogId].map(boardingDogIdFromCustomerDogValue).filter(Boolean);
  if (record.linkedCustomerDogId && dog.id && record.linkedCustomerDogId === dog.id) return true;
  if (customerBoardingIds.includes(dogId)) return true;
  const recordName = String(record.dogName || "").trim().toLowerCase();
  const dogName = String(dog.dogName || "").trim().toLowerCase();
  if (!recordName || !dogName || recordName !== dogName) return false;
  const recordEmails = new Set(boardingOwnerEmails(record));
  const dogEmails = uniqueEmails(dog.ownerEmail, dog.customerEmail, currentUser?.email);
  if (dogEmails.some((email) => recordEmails.has(email))) return true;
  const recordPhone = String(record.ownerPhone || record.customerPhone || record.requestedByPhone || "").replace(/\\D/g, "");
  const dogPhone = String(dog.ownerPhone || dog.customerPhone || "").replace(/\\D/g, "");
  return Boolean(recordPhone && dogPhone && recordPhone === dogPhone);
}

function activeCustomerStayForDog(dog = {}) {
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && boardingDogVisibleToCustomer(record) && boardingRecordMatchesCustomerDog(record, dog)));
  const entries = boardingStayEntries(records)
    .filter(({ record, stay }) => ["Checked In", "In Kennel"].includes(boardingStayDisplayStatus(record, stay)))
    .sort((a, b) => boardingStayEntrySortTime(b) - boardingStayEntrySortTime(a));
  return entries[0] || null;
}

function customerDogSummaryCardHtml(dog = {}) {
  const activeStay = activeCustomerStayForDog(dog);
  const stay = activeStay?.stay || {};
  const record = activeStay?.record || {};
  const stayStatus = activeStay ? boardingStayDisplayStatus(record, stay) : "";
  const facts = [dog.breedDescription || dog.breed || "", dog.sex || "", dogAgeText(dog)].filter(Boolean).join(" | ");
  const vaccine = customerFacingVaccineStatus(dog);
  const photoRecord = customerDogPhotoRecordForDisplay(dog, record);
  return \`<article class="customer-dog-summary-card">
    <div class="customer-dog-summary-main">
      \${customerDogPhotoHtml(dog, { photoRecord })}
      <div>
        <div class="customer-dog-summary-title">
          <h3>\${escapeHtml(dog.dogName || "Your dog")}</h3>
          \${statusChipHtml(vaccine.label, \`vaccination-status-chip \${vaccine.className}\`)}
        </div>
        <p>\${escapeHtml(facts || "Dog profile")}</p>
      </div>
    </div>
    <div class="customer-dashboard-actions">
      <button type="button" data-action="open-customer-boarding-request" data-id="\${escapeHtml(dog.id || "")}">Book a Stay</button>
      <button type="button" class="secondary-button" data-action="edit-customer-dog-inline" data-id="\${escapeHtml(dog.id || "")}" data-boarding-id="\${escapeHtml(dog.sourceBoardingDogId || dog.linkedBoardingDogId || "")}">Edit Profile</button>
    </div>
    <section class="customer-current-stay">
      <strong>Current Stay</strong>
      \${activeStay ? \`<div class="detail-row"><strong>Drop-off</strong><span>\${escapeHtml(formatDateTime(stay.dropoffTime) || "Not scheduled")}</span></div><div class="detail-row"><strong>Pickup</strong><span>\${escapeHtml(formatDateTime(stay.pickupTime) || "Not scheduled")}</span></div><div class="chip-row">\${statusChipHtml(stayStatus, \`boarding-status-chip \${statusClassForBoardingStatus(stayStatus)}\`)}</div>\` : \`<p class="muted-text">No active stays</p>\`}
    </section>
  </article>\`;
}

function customerDogDashboardCardHtml(dog = {}) {
  return customerDogSummaryCardHtml(dog);
}

function customerDogSavedNextActionHtml(dog = {}) {
  const vaccine = customerFacingVaccineStatus(dog);
  const facts = [dog.spayNeuterStatus || dog.sex || "", dog.breedDescription || "", dogAgeText(dog)].filter(Boolean).join(" | ");
  return \`<article class="customer-next-action-card">
    <div class="customer-next-action-summary">
      \${customerDogPhotoHtml(dog)}
      <div>
        <span class="customer-flow-kicker">Dog saved</span>
        <h3>\${escapeHtml(dog.dogName || "Your dog")} has been added</h3>
        <p>\${escapeHtml(facts || "Profile ready for booking requests")}</p>
        <div class="chip-row">\${statusChipHtml(vaccine.label, \`vaccination-status-chip \${vaccine.className}\`)}</div>
      </div>
    </div>
    <div class="customer-next-action-buttons">
      <button type="button" class="secondary-button" data-action="add-another-customer-dog">Add Another Dog</button>
      <button type="button" data-action="open-customer-boarding-request">Request Boarding Stay</button>
      <button type="button" class="secondary-button" data-action="request-customer-service">Request Service Only</button>
    </div>
  </article>\`;
}

function customerDogWelcomeHtml() {
  return \`<article class="customer-home-empty customer-welcome-card">
    <div class="customer-welcome-icon is-logo" aria-hidden="true">
      <img class="customer-welcome-logo" src="assets/icons/arkinlight-husky-logo-transparent.png?v=20260530-my-dog-logo-crop" alt="" />
    </div>
    <span class="customer-flow-kicker">Welcome\${currentUser?.name ? \`, \${escapeHtml(currentUser.name.split(" ")[0])}\` : ""}</span>
    <h3>Add your first dog to start booking</h3>
    <p>Add the basics now. Vaccines and records can be uploaded here and staff can review them before check-in.</p>
    <div class="customer-welcome-checklist">
      <span>Dog profile</span>
      <span>Care notes</span>
      <span>Vet and emergency info</span>
      <span>Vaccine records</span>
    </div>
    <button type="button" data-action="add-customer-dog-inline">Add Your First Dog</button>
  </article>\`;
}

function customerCanCancelStayRequestStatus(status = "") {
  return ["Pending", "Approved"].includes(normalizeBoardingStatus({ boardingStatus: status }));
}

function customerCancellationReasonFormHtml(record = {}, reference = {}) {
  const displayRecord = boardingDogWithStayStatus(record || {});
  const stay = boardingStayByReference(displayRecord, reference) || boardingPrimaryStay(displayRecord) || {};
  const stayAttrs = stay.id ? boardingStayDataAttrs(displayRecord, stay) : "";
  const requestCode = stay.id ? boardingStayRequestCode(displayRecord, stay) : "";
  return \`<form id="customerCancellationReasonForm" class="tracker-form" data-id="\${escapeHtml(displayRecord.id || "")}"\${stayAttrs || \` data-request-code="\${escapeHtml(requestCode)}"\`}>
    <article class="record-card compact-record-card">
      <strong>\${escapeHtml(displayRecord.dogName || "Boarding dog")}</strong>
      <div class="chip-row">\${stay.id ? customerStayIdChipHtml(displayRecord, stay) : ""}\${stay.id ? customerRequestStayStatusChipHtml(displayRecord, stay) : customerRequestStatusChipHtml(displayRecord)}</div>
      <p>\${escapeHtml(stayScheduleRangeLabel(displayRecord, stay))}</p>
    </article>
    <label>Reason for cancellation<textarea name="customerCancellationReason" rows="4" required placeholder="Tell us why you need to cancel this stay."></textarea></label>
    <div class="button-row"><button type="submit" class="danger-button">Cancel Stay</button><button type="button" class="secondary-button" data-action="close-dialog">Keep Stay</button></div>
  </form>\`;
}

function openCustomerCancellationReason(record = {}, reference = {}) {
  showDetailDialog("Cancel Stay", customerCancellationReasonFormHtml(record, reference));
}

async function submitCustomerCancellationReason(formEl) {
  const record = boardingDogRecordForDisplay(formEl.dataset.id);
  if (!record) {
    showToast("This stay could not be found.");
    return null;
  }
  const reference = boardingStayReferenceFromAction(formEl);
  const stay = boardingStayByReference(record, reference) || boardingPrimaryStay(record) || {};
  const currentStatus = stay.id ? boardingStayDisplayStatus(record, stay) : boardingDisplayStatus(record);
  const reason = normalizedBoardingDeclineNote(formEl.elements.customerCancellationReason?.value || "");
  if (!reason) {
    showToast("Enter a cancellation reason before cancelling this stay.");
    return null;
  }
  const options = {
    ...reference,
    customerCancellationReason: reason,
    role: "customer",
    source: "customer",
    name: currentUser?.name || record.ownerName || "Customer",
    email: currentUser?.email || record.ownerEmail || record.customerEmail || "",
  };
  const updated = reference.stayId
    ? await saveBoardingStayStatusTransition(record, reference.stayId, "Cancelled", options)
    : await saveBoardingStatusTransition(record, "Cancelled", options);
  if (!updated) return null;
  const staffNotified = currentStatus === "Approved";
  if (staffNotified) await notifyIfNeeded(updated, "customerApprovedStayCancelled");
  renderCustomerRequests();
  renderBoardingDogs();
  renderBoardingRequests();
  renderDashboard();
  $("#detailDialog")?.close();
  showDetailDialog("Stay Cancelled", \`<p>\${escapeHtml(record.dogName || "This stay")} has been cancelled.\${staffNotified ? " Staff has been notified." : ""}</p>\`);
  return updated;
}

function renderCustomerRequests() {
  const list = $("#customerRequestList");
  if (!list) return;
  renderCustomerProgress();
  const statusFilter = $("#customerRequestStatusFilter")?.value || "All";
  const entries = customerRequestEntries(statusFilter);
  list.innerHTML = entries.length
    ? entries
        .map((record) => {
          const stay = record.stay || {};
          record = record.record || record;
          const services = boardingStayServicesText(stay, { customerFacing: true });
          const total = boardingStayInvoiceTotal(record, stay);
          const estimate = total ? \`<p><strong>Estimated total:</strong> \${money(total)}</p>\` : "";
          const status = boardingStayDisplayStatus(record, stay);
          const stayAttr = stay.id ? boardingStayDataAttrs(record, stay) : "";
          const canCustomerEdit = customerCanEditStayRequestStatus(status);
          const canCustomerCancel = customerCanCancelStayRequestStatus(status) && canTransitionBoardingStatus(record, "Cancelled", stay.id ? { stayId: stay.id } : {});
          const declineNote = boardingDeclineNoteFor(record, stay);
          const declineHtml = status === "Cancelled" && declineNote?.note ? \`<p><strong>Decline reason:</strong> \${escapeHtml(declineNote.note)}</p>\` : "";
          const cancellationAudit = status === "Cancelled" ? boardingCancellationAuditHtml(record, stay, { customer: true }) : "";
          const reasonHtml = status === "Cancelled" ? boardingCancellationReasonHtml(record, stay, { customer: true }) : "";
          const actions = canCustomerEdit || canCustomerCancel
            ? \`<div class="record-actions">\${canCustomerEdit ? \`<button type="button" class="secondary-button" data-action="edit-customer-request" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Edit Request</button>\` : ""}\${canCustomerCancel ? \`<button type="button" class="secondary-button danger-button" data-action="cancel-customer-request" data-id="\${escapeHtml(record.id)}"\${stayAttr}>Cancel Request</button>\` : ""}</div>\`
            : "";
          return \`<article class="record-card clickable-card \${statusClassForRequest(status)} \${statusClassForBoardingStatus(status)}" data-action="view-customer-request" data-id="\${escapeHtml(record.id)}"\${stayAttr}><strong>\${escapeHtml(record.dogName || "Dog")}</strong><div class="chip-row">\${stay.id ? customerStayIdChipHtml(record, stay) : ""}\${customerRequestStayStatusChipHtml(record, stay)}</div><span>\${escapeHtml(stayScheduleRangeLabel(record, stay))}</span><p>\${escapeHtml(services)}</p>\${estimate}\${cancellationAudit}\${reasonHtml}\${declineHtml}\${actions}</article>\`;
        })
        .join("")
    : \`<p>No \${statusFilter === "All" ? "" : statusFilter.toLowerCase() + " "}boarding requests submitted yet.</p>\`;
}

function customerCanEditStayRequestStatus(status = "") {
  return ["Pending", "Approved"].includes(normalizeBoardingStatus({ boardingStatus: status }));
}

function customerRequestEntries(statusFilter = "All") {
  const records = consolidatedBoardingDogRecords(readRecords("boardingDog")
    .filter((record) => !record.removed && (record.customerRequest || (record.stays || []).length))
    .filter((record) => currentRole() === "admin" || boardingDogVisibleToCustomer(record)));
  return uniqueBoardingStayEntries(boardingStayEntries(records))
    .filter(({ status }) => statusFilter === "All" || status === statusFilter)
    .sort((a, b) => boardingStayEntrySortTime(b) - boardingStayEntrySortTime(a));
}

function customerRequestFingerprint(record = {}, stayOverride = null) {
  const stay = stayOverride || record.stays?.[0] || {};
  const serviceKey = arrayValue(stay.requests).map((item) => boardingStayRequestLabel(item).trim().toLowerCase()).sort().join("|");
  const dogKey = [record.linkedCustomerDogId || "", normalizeEmail(record.ownerEmail || record.customerEmail), String(record.dogName || "").trim().toLowerCase()].join("|");
  return [dogKey, stay.dropoffTime || "", stay.pickupTime || "", serviceKey].join("::");
}

function customerRequestTimelineHtml(status = "Pending") {
  const normalized = boardingLifecycleStatuses.includes(status) ? status : "Pending";
  const className = normalized === "Cancelled" ? "is-cancelled" : "is-done";
  return \`<div class="request-timeline"><span class="\${className}">\${escapeHtml(customerRequestStatusLabel(normalized))}</span></div>\`;
}

function customerServiceIsPremiumStayUpgrade(service = {}) {
  return normalizedServiceLookupText(service.serviceName || service.name || "") === "premium overnight boarding kennel";
}

function customerServiceDisplayName(service = {}) {
  if (customerServiceIsPremiumStayUpgrade(service)) return CUSTOMER_PREMIUM_STAY_UPGRADE_LABEL;
  return service.serviceName || service.name || "Service";
}

function customerServiceInfoText(service = {}) {
  const itemDescription = String(service.itemDescription || "").trim();
  if (itemDescription) return itemDescription;
  if (customerServiceIsPremiumStayUpgrade(service)) return CUSTOMER_PREMIUM_STAY_UPGRADE_DESCRIPTION;
  return "";
}

function customerServiceInfoIconHtml(infoText = "") {
  return infoText ? \`<span class="service-info-icon" role="button" tabindex="0" aria-label="\${escapeHtml(infoText)}" title="\${escapeHtml(infoText)}" data-tooltip="\${escapeHtml(infoText)}"><img src="assets/icons/service-info-icon.png?v=20260526-info-icon-replacement" alt="" aria-hidden="true" /></span>\` : "";
}

function customerServiceDogKey(dog = {}) {
  return customerBookingSelectionKey(dog) || dog.id || normalizedDogIdentityName(dog) || dog.dogName || "dog";
}

function customerServiceDogFieldKey(dog = {}) {
  return \`dog-\${shortStableHash(customerServiceDogKey(dog), 10)}\`;
}

function customerServiceFieldNameForDog(dog = {}) {
  return \`customerServices-\${customerServiceDogFieldKey(dog)}\`;
}

function customerServiceQuantityFieldName(serviceId = "", dog = {}) {
  return \`serviceQuantity-\${customerServiceDogFieldKey(dog)}-\${serviceId}\`;
}

function customerServicesForDog(estimate = {}, dog = {}) {
  const dogKey = customerServiceDogKey(dog);
  return arrayValue(estimate.services).filter((service) => service.dogKey === dogKey || (!service.dogKey && arrayValue(estimate.dogs).length <= 1));
}

function customerServiceOptionHtml(service = {}, checkedIds = new Set(), options = {}) {
  const checked = checkedIds.has(service.id);
  const fieldDog = options.dog || {};
  const serviceFieldName = options.serviceFieldName || (options.dog ? customerServiceFieldNameForDog(fieldDog) : "customerServices");
  const quantityFieldName = options.quantityFieldName || (options.dog ? customerServiceQuantityFieldName(service.id, fieldDog) : \`serviceQuantity-\${service.id}\`);
  const quantityValue = formFieldByName($("#customerBookingForm"), quantityFieldName)?.value || "1";
  const displayName = customerServiceDisplayName(service);
  const infoIcon = customerServiceInfoIconHtml(customerServiceInfoText(service));
  const pricingError = servicePriceError(service, displayName);
  const priceText = pricingError ? "Pricing not configured" : \`\${money(servicePriceValue(service))} \${escapeHtml(service.unit || "")}\`;
  const addOnPrefix = options.addOn ? "Add-on: " : "";
  const extraClass = options.parent ? " service-option-parent" : "";
  const dogAttrs = options.dog ? \` data-service-scope="dog" data-dog-key="\${escapeHtml(customerServiceDogKey(fieldDog))}"\` : "";
  return \`<label class="service-option\${options.addOn ? " service-option-addon" : ""}\${extraClass}"><span class="service-option-label"><input type="checkbox" name="\${escapeHtml(serviceFieldName)}" value="\${escapeHtml(service.id)}" \${checked ? "checked" : ""}\${dogAttrs} /><span class="service-option-copy"><span class="service-option-text">\${escapeHtml(addOnPrefix)}\${escapeHtml(displayName)} - \${priceText}</span>\${infoIcon}</span></span><input class="service-quantity" type="number" name="\${escapeHtml(quantityFieldName)}" min="1" step="1" value="\${escapeHtml(quantityValue)}" \${checked ? "" : "disabled"} aria-label="\${escapeHtml(displayName)} quantity"\${dogAttrs} /></label>\`;
}

function customerStayProgramServices(user = currentUser) {
  applyLegacyBoardingProgramMigration();
  return readRecords("service")
    .filter((service) => !service.removed && serviceHasFlag(service, "Active") && !serviceHasFlag(service, "Admin only") && serviceIsBoardingProgram(service))
    .filter((service) => serviceMatchesCustomerPricingScope(service, user))
    .sort((a, b) => String(a.serviceName || "").localeCompare(String(b.serviceName || "")));
}

function customerStayProgramSnapshot(service = null) {
  if (!service?.id) return null;
  const pricingError = servicePriceError(service, customerServiceDisplayName(service));
  const rate = pricingError ? 0 : servicePriceValue(service);
  return {
    id: service.id,
    serviceId: service.id,
    serviceName: service.serviceName || "Boarding program",
    name: service.serviceName || "Boarding program",
    rate,
    unit: service.unit || "per night",
    isMemberPricing: serviceHasFlag(service, "Member Pricing"),
    includesBoardingAccommodation: true,
    replacesStandardBoarding: true,
    pricingScope: servicePricingScope(service),
    pricingError,
  };
}

function renderCustomerStayProgramOptions() {
  const step = $("#customerStayProgramStep");
  const container = $("#customerStayProgramOptions");
  if (!step || !container) return;
  const show = customerRequestMode() === "boarding";
  const programs = show ? customerStayProgramServices() : [];
  step.hidden = !show || !programs.length;
  if (step.hidden) {
    container.innerHTML = "";
    updateCustomerBookingOptionsEmptyState();
    return;
  }
  const existing = selectedCustomerStayProgramId();
  const selectedId = existing && programs.some((program) => program.id === existing) ? existing : "standard";
  const ratePlan = boardingRatePlanForCustomer(currentUser);
  const standardRate = ratePlan.primaryRateConfig || {};
  const standardService = standardRate.ok ? standardRate.service : null;
  const standardLabel = standardService?.serviceName || "Standard Overnight Boarding";
  const standardPriceText = standardRate.ok
    ? \`\${money(standardRate.rate)} \${escapeHtml(standardRate.unit || "per night")}\`
    : "Pricing not configured";
  const options = [
    \`<label class="service-option customer-stay-program-card"><span class="service-option-label"><input type="radio" name="customerStayProgram" value="standard" \${selectedId === "standard" ? "checked" : ""} /><span class="service-option-copy"><span class="service-option-text">\${escapeHtml(standardLabel)} - \${standardPriceText}</span></span></span></label>\`,
    ...programs.map((program) => {
      const infoIcon = customerServiceInfoIconHtml(customerServiceInfoText(program));
      const pricingError = servicePriceError(program, customerServiceDisplayName(program));
      const priceText = pricingError ? "Pricing not configured" : \`\${money(servicePriceValue(program))} \${escapeHtml(program.unit || "per night")}\`;
      return \`<label class="service-option customer-stay-program-card"><span class="service-option-label"><input type="radio" name="customerStayProgram" value="\${escapeHtml(program.id)}" \${selectedId === program.id ? "checked" : ""} /><span class="service-option-copy"><span class="service-option-text">\${escapeHtml(customerServiceDisplayName(program))} - \${priceText}</span>\${infoIcon}</span></span></label>\`;
    }),
  ];
  container.innerHTML = options.join("");
  updateCustomerBookingOptionsEmptyState();
}

function customerImplicitDependencyIds() {
  const ids = new Set();
  if (customerRequestMode() === "boarding") {
    const stayProgram = selectedCustomerStayProgram();
    const dependencyService = stayProgram || boardingPricingServiceForCustomer(currentUser);
    if (dependencyService?.id) ids.add(dependencyService.id);
  }
  return ids;
}

function customerDependencyIds(checkedIds = new Set()) {
  return new Set([...checkedIds, ...customerImplicitDependencyIds()]);
}

function customerServiceVisibleForCurrentUser(service = {}) {
  return !service.removed
    && serviceHasFlag(service, "Active")
    && !serviceHasFlag(service, "Admin only")
    && (service.category !== "Boarding" || serviceDependencyId(service))
    && serviceMatchesCustomerPricingScope(service, currentUser);
}

function renderCustomerServiceOptions() {
  if (!$("#customerServiceOptions")) return;
  applyLegacyServiceDependencyMigration();
  applyLegacyBoardingProgramMigration();
  const formEl = $("#customerBookingForm");
  const dogs = selectedCustomerDogs();
  const services = readRecords("service").filter(customerServiceVisibleForCurrentUser);
  const visibleServices = services.filter((service) => !serviceDependencyId(service));
  const groupedVisibleServices = visibleServices.reduce((groups, service) => {
    const category = String(service.category || "Other Services").trim() || "Other Services";
    groups[category] = [...(groups[category] || []), service];
    return groups;
  }, {});
  if (!dogs.length) {
    $("#customerServiceOptions").innerHTML = "<p>Select dog(s) first to choose services for each dog.</p>";
    return;
  }
  const dogGroupsHtml = dogs.map((dog, index) => {
    const checkedIds = new Set(checkedFrom(formEl, customerServiceFieldNameForDog(dog)));
    const dependencyIds = customerDependencyIds(checkedIds);
    const selectedCount = [...checkedIds].filter((id) => services.some((service) => service.id === id && serviceDependencySatisfied(service, dependencyIds))).length;
    const serviceBlockHtml = (service) => {
      const childServices = dependencyIds.has(service.id)
        ? services
            .filter((dependent) => serviceDependencyId(dependent) === service.id)
        : [];
      if (!childServices.length) return customerServiceOptionHtml(service, checkedIds, { dog });
      const optionHtml = customerServiceOptionHtml(service, checkedIds, { dog, parent: true });
      const addOnHtml = childServices
        .map((dependent) => customerServiceOptionHtml(dependent, checkedIds, { dog, addOn: serviceDependencyType(dependent) === "optional-addon" }))
        .join("");
      return \`<div class="service-option-group">\${optionHtml}<div class="service-option-addons">\${addOnHtml}</div></div>\`;
    };
    const visibleHtml = Object.entries(groupedVisibleServices).map(([category, items]) => {
      const hasChecked = items.some((service) => checkedIds.has(service.id));
      const categoryHtml = items.map(serviceBlockHtml).join("");
      return \`<details class="customer-service-group" \${hasChecked ? "open" : ""}><summary><span><strong>\${escapeHtml(category)}</strong><em>Click to view services</em></span><small>\${items.length} option\${items.length === 1 ? "" : "s"}</small></summary><div class="customer-service-group-body">\${categoryHtml}</div></details>\`;
    }).join("");
    const implicitDependencyServices = services.filter((service) => serviceDependencyId(service) && serviceDependencySatisfied(service, dependencyIds) && !visibleServices.some((parent) => parent.id === serviceDependencyId(service)));
    const implicitHtml = implicitDependencyServices
      .map((service) => customerServiceOptionHtml(service, checkedIds, { dog, addOn: serviceDependencyType(service) === "optional-addon" }))
      .join("");
    const bodyHtml = visibleServices.length || implicitHtml
      ? \`\${visibleHtml}\${implicitHtml}\`
      : "<p>No customer services are active yet.</p>";
    const openAttr = selectedCount || dogs.length <= 2 || index === 0 ? "open" : "";
    const selectedClass = selectedCount ? " has-selected-services" : "";
    return \`<details class="customer-dog-service-menu\${selectedClass}" \${openAttr}><summary><span><strong>\${escapeHtml(dog.dogName || "Dog")}</strong><em>Click to view services for this dog</em></span><small>\${selectedCount} selected</small></summary><div class="customer-dog-service-menu-body">\${bodyHtml}</div></details>\`;
  }).join("");
  $("#customerServiceOptions").innerHTML = dogGroupsHtml;
}

function renderCustomerCrateShareOptions() {
  const step = $("#customerCrateShareStep");
  const container = $("#customerCrateShareOptions");
  if (!step || !container) return;
  const dogs = selectedCustomerDogs();
  const isBoardingRequest = customerRequestMode() === "boarding";
  const stayProgram = selectedCustomerStayProgram();
  const ratePlan = boardingRatePlanForCustomer();
  const show = isBoardingRequest && !stayProgram && ratePlan.isMemberPricing && dogs.length > 1;
  step.hidden = !show;
  if (!show) {
    container.innerHTML = "";
    updateCustomerBookingOptionsEmptyState();
    return;
  }
  const prior = $("#customerSharedCrateRequested");
  const checked = prior ? prior.checked : true;
  const lines = boardingDogPricingLines(dogs, { ratePlan, days: 1, sharedCrateRequested: true })
    .reduce((groups, line) => {
      groups[line.crateGroupId] = [...(groups[line.crateGroupId] || []), line.dogName];
      return groups;
    }, {});
  const groupSummary = Object.values(lines)
    .map((names, index) => \`Crate \${index + 1}: \${names.join(" + ")}\`)
    .join(" | ");
  container.innerHTML = \`<label class="toggle-row"><input type="checkbox" id="customerSharedCrateRequested" name="customerSharedCrateRequested" \${checked ? "checked" : ""} /> Request shared-crate member pricing when staff approve it</label><p>\${escapeHtml(groupSummary)}. Max \${BOARDING_MAX_DOGS_PER_CRATE} dogs per crate.</p>\`;
  updateCustomerBookingOptionsEmptyState();
}

function customerBookingSelectionKey(dog = {}) {
  const boardingId = boardingDogIdFromCustomerDogValue(dog.sourceBoardingDogId || dog.linkedBoardingDogId || (String(dog.id || "").startsWith("boarding:") ? dog.id : ""));
  if (boardingId) return \`boarding:\${boardingId}\`;
  if (dog.id) return \`customer:\${dog.id}\`;
  return customerDogIdentityKey(dog);
}

function customerBookingDogIdentityTokens(dog = {}) {
  const dogName = normalizedDogIdentityName(dog);
  if (!dogName) return [];
  const tokens = new Set();
  const addScoped = (kind = "", value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized) tokens.add(\`\${dogName}|\${kind}:\${normalized}\`);
  };
  [
    dog.isSharedBoardingDog ? dog.linkedCustomerDogId : dog.id,
    dog.linkedCustomerDogId,
    dog.customerDogId,
  ].forEach((id) => addScoped("customer-dog", id));
  [
    boardingDogIdFromCustomerDogValue(dog.sourceBoardingDogId),
    boardingDogIdFromCustomerDogValue(dog.linkedBoardingDogId),
    String(dog.id || "").startsWith("boarding:") ? boardingDogIdFromCustomerDogValue(dog.id) : "",
  ].forEach((id) => addScoped("boarding-dog", id));
  uniqueEmails(dog.ownerEmail, dog.customerEmail, currentUser?.email).forEach((email) => addScoped("email", email));
  [
    dog.ownerPhone,
    dog.phone,
    dog.customerPhone,
    dog.emergencyPhone,
  ].forEach((phone) => {
    const normalized = normalizedPhoneToken(phone);
    if (normalized) addScoped("phone", normalized);
  });
  if (!tokens.size) addScoped("owner-name", dog.ownerName);
  return [...tokens];
}

function customerBookingDogMatchesRecord(dog = {}, record = {}) {
  const dogTokens = new Set(customerBookingDogIdentityTokens(dog));
  if (!dogTokens.size) return false;
  return boardingDogIdentityTokens(record).some((token) => dogTokens.has(token));
}

function customerBookingServiceKey(estimate = {}, dog = null) {
  const services = dog ? customerServicesForDog(estimate, dog) : arrayValue(estimate.services);
  return [
    String(estimate.stayProgram?.serviceName || estimate.stayProgram?.name || "").trim().toLowerCase(),
    ...new Set(services
    .map((service) => \`\${dog ? "" : (service.dogName || "Dog") + ": "}\${service.serviceName || service.id || "Service"}\${Number(service.quantity || 1) > 1 ? \` x\${service.quantity}\` : ""} requested\`)
    .map((label) => String(label || "").trim().toLowerCase())
    .filter(Boolean)),
  ].filter(Boolean)
    .sort()
    .join("|");
}

function customerBookingStableId(prefix = "customer-booking", estimate = {}, dog = {}) {
  const seed = [
    customerBookingSelectionKey(dog),
    dog.dogName || "",
    estimate.dropoffTime || "",
    estimate.pickupTime || "",
    customerBookingServiceKey(estimate, dog),
  ].join("|");
  return \`\${prefix}-\${shortStableHash(seed, 10)}\`;
}

function openCustomerDogModal(record = {}) {
  openCustomerDog(record);
}

function openCustomerDogInline(record = {}) {
  const formEl = $("#customerDogForm");
  const home = $("#customerDogFormHome");
  if (!formEl || !home) return;
  $("#detailDialog")?.close();
  resetCustomerDogForm();
  setFormValues(formEl, record);
  $("#customerDogId").value = record.id || "";
  $("#saveCustomerDogButton").textContent = record.id ? "Update Changes" : "Save Dog";
  $("#customerDogFormTitle").textContent = record.id ? \`Edit \${record.dogName || "Dog"}\` : "Add Dog";
  setDogPhoto("customer", record);
  setCustomerDogWizardStep("profile");
  if (formEl.parentElement !== home) home.appendChild(formEl);
  formEl.hidden = false;
  renderCustomerDogs();
  formEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCustomerDog(record = {}) {
  const formEl = $("#customerDogForm");
  resetCustomerDogForm();
  setFormValues(formEl, record);
  $("#customerDogId").value = record.id || "";
  $("#saveCustomerDogButton").textContent = record.id ? "Update Changes" : "Save Dog";
  $("#customerDogFormTitle").textContent = record.id ? \`Edit \${record.dogName || "Dog"}\` : "Add Dog";
  setDogPhoto("customer", record);
  setCustomerDogWizardStep("profile");
  showDetailDialog(record.id ? \`Edit \${record.dogName || "Dog"}\` : "Add Dog", \`<div id="customerDogPopupMount"></div>\`, null, { dialogClass: "is-customer-dog-editor" });
  $("#customerDogPopupMount")?.appendChild(formEl);
  formEl.hidden = false;
  formEl.scrollTop = 0;
}

function openCustomerDogRemoveConfirm(record = {}) {
  showDetailDialog(
    "Remove Dog?",
    \`<article class="record-card compact-record-card danger-confirm-card"><strong>Remove \${escapeHtml(record.dogName || "this dog")}?</strong><p>This removes the dog from your customer profile. Existing submitted requests stay on file.</p></article><div class="button-row"><button type="button" class="danger-button" data-action="confirm-remove-customer-dog" data-id="\${escapeHtml(record.id || "")}">Remove Dog</button><button type="button" class="secondary-button" data-action="close-dialog">Cancel</button></div>\`,
  );
}

function openCustomerBookingModal(mode = "boarding") {
  if (!customerDogsForCurrentUser().length) {
    switchPage("customerPage");
    openCustomerDogModal();
    return;
  }
  $("#detailDialog")?.close();
  $("#bookingConfirmDialog")?.close();
  $("#customerBookingForm").hidden = true;
  resetCustomerBookingForm();
  $("#customerRequestMode").value = mode;
  setCustomerRequestActionMode(mode);
  $("#customerBookingForm").hidden = false;
  $("#customerBookingForm").scrollTop = 0;
  $("#customerBookingFormTitle").textContent = mode === "service" ? "Request Service" : "Request Boarding";
  $("#customerBookingFormHelp").textContent = mode === "service" ? "Choose dog(s), service, and requested drop-off time." : "Choose dog(s), requested stay, and optional services.";
  setCustomerBookingTimeCopy(mode);
  clearCustomerBookingTimeErrors();
  $("#requestBoardingButton").textContent = "Review Request";
  renderCustomerBookingAvailabilityMessages();
  renderCustomerStayProgramOptions();
  renderCustomerCrateShareOptions();
  renderCustomerServiceOptions();
  setCustomerBookingWizardStep("pets");
}

function customerEstimateDetails() {
  const formEl = $("#customerBookingForm");
  const data = formPayload(formEl);
  const isServiceRequest = customerRequestMode() === "service";
  const dogs = selectedCustomerDogs();
  const serviceCatalog = readRecords("service");
  const services = dogs.flatMap((dog) => {
    const selectedServiceIds = new Set(checkedFrom(formEl, customerServiceFieldNameForDog(dog)));
    const dependencyIds = customerDependencyIds(selectedServiceIds);
    return [...selectedServiceIds]
      .map((id) => {
        const service = serviceCatalog.find((item) => item.id === id);
        if (!service || !customerServiceVisibleForCurrentUser(service)) return null;
        const quantity = Math.max(1, Number(formFieldByName(formEl, customerServiceQuantityFieldName(id, dog))?.value || 1));
        const pricingError = servicePriceError(service, customerServiceDisplayName(service));
        const unitPrice = pricingError ? 0 : servicePriceValue(service);
        return {
          ...service,
          dogKey: customerServiceDogKey(dog),
          dogFieldKey: customerServiceDogFieldKey(dog),
          dogId: dog.id || "",
          dogName: dog.dogName || "Dog",
          quantity,
          perDogLineTotal: unitPrice * quantity,
          lineTotal: unitPrice * quantity,
          pricingError,
        };
      })
      .filter((service) => service && serviceDependencySatisfied(service, dependencyIds))
      .filter(Boolean);
  });
  const days = isServiceRequest ? 0 : boardingDays(data.dropoffTime, data.pickupTime);
  const isDayCare = !isServiceRequest && isDayCareStay(data.dropoffTime, data.pickupTime);
  const ratePlan = boardingRatePlanForCustomer();
  const stayProgram = isServiceRequest ? null : customerStayProgramSnapshot(selectedCustomerStayProgram());
  const sharedCrateRequested = stayProgram ? false : customerSharedCrateRequested();
  const boardingLines = boardingDogPricingLines(dogs, { ratePlan, days, isServiceRequest, sharedCrateRequested, stayProgram });
  const boardingRate = stayProgram?.rate || ratePlan.primaryRate;
  const boardingCost = boardingLines.reduce((total, line) => total + Number(line.total || 0), 0);
  const serviceCost = services.reduce((total, service) => total + service.lineTotal, 0);
  const serviceErrors = services.map((service) => service.pricingError).filter(Boolean);
  const boardingErrors = isServiceRequest ? [] : boardingLines.map((line) => line.pricingError).filter(Boolean);
  const pricingErrors = [
    ...(isServiceRequest && dogs.length && !services.length ? ["Select at least one service before submitting a service request."] : []),
    ...(stayProgram?.pricingError ? [stayProgram.pricingError] : []),
    ...boardingErrors,
    ...serviceErrors,
  ].filter(Boolean);
  return {
    dogs,
    services,
    days,
    isDayCare,
    isServiceRequest,
    stayProgram,
    boardingRate,
    ratePlan,
    sharedCrateRequested: sharedCrateRequested && ratePlan.isMemberPricing,
    boardingLines,
    boardingCost,
    serviceCost,
    pricingErrors: [...new Set(pricingErrors)],
    total: pricingErrors.length ? 0 : boardingCost + serviceCost,
    dropoffTime: data.dropoffTime,
    pickupTime: isServiceRequest ? "" : data.pickupTime,
    requestNotes: data.requestNotes,
  };
}

async function submitPendingCustomerBooking() {
  const estimate = pendingCustomerBooking;
  if (customerBookingSubmitInProgress) return;
  if (!estimate?.dogs?.length) return;
  const dogSelectionMessage = customerDogSelectionErrorMessage(uniqueCustomerBookingDogs(estimate.dogs || []).length);
  if (dogSelectionMessage) {
    showToast(dogSelectionMessage);
    customerBookingSubmitInProgress = false;
    return;
  }
  const pricingErrors = customerEstimateBlockingErrors(estimate);
  if (pricingErrors.length) {
    showDetailDialog("Request Needs Staff Pricing", customerEstimateErrorsHtml(estimate));
    customerBookingSubmitInProgress = false;
    return;
  }
  if (!customerBookingEstimateAvailabilityValid(estimate)) {
    showToast("This request time is no longer inside the kennel hours. Please adjust it and try again.");
    customerBookingSubmitInProgress = false;
    $("#bookingConfirmDialog")?.close();
    return;
  }
  customerBookingSubmitInProgress = true;
  const confirmButton = $("#confirmBookingRequestButton");
  if (confirmButton) confirmButton.disabled = true;
  const editingId = $("#editingCustomerRequestId")?.value;
  const editingStayId = $("#editingCustomerStayId")?.value || "";
  const editingRecord = editingId ? boardingDogRecordForDisplay(editingId) : null;
  const requestGroupId = editingRecord?.requestGroupId || editingRecord?.reservationGroupId || estimate.requestGroupId || estimate.submissionId || uid("requestGroup");
  const groupDogNames = uniqueCustomerBookingDogs(estimate.dogs).map((dog) => dog.dogName || "Dog");
  const groupDogIds = uniqueCustomerBookingDogs(estimate.dogs).map((dog) => dog.id || dog.sourceBoardingDogId || "").filter(Boolean);
  const groupDogCount = groupDogNames.length;
  const groupSelectedServices = [...new Set(arrayValue(estimate.services).map((service) => service.serviceName || service.name || "").filter(Boolean))];
  let savedCount = 0;
  let skippedCount = 0;
  const submittedDogKeys = new Set();
  let boardingAgreement = null;
  try {
    boardingAgreement = await ensureCustomerBoardingAgreementForEstimate(estimate);
    if (customerAgreementAppliesToEstimate(estimate) && !boardingAgreement) {
      customerBookingSubmitInProgress = false;
      if (confirmButton) confirmButton.disabled = false;
      $("#bookingConfirmDialog")?.close();
      return;
    }
    for (const dog of estimate.dogs) {
      const dogServices = customerServicesForDog(estimate, dog);
      const submittedDogKey = [customerBookingSelectionKey(dog), estimate.dropoffTime || "", estimate.pickupTime || "", customerBookingServiceKey(estimate, dog)].join("|");
      if (submittedDogKeys.has(submittedDogKey)) {
        skippedCount += 1;
        continue;
      }
      submittedDogKeys.add(submittedDogKey);
      const duplicateEntry = editingRecord ? null : existingCustomerBookingEntryForDog(dog, estimate, { editingRecordId: editingId, editingStayId });
      if (duplicateEntry) {
        skippedCount += 1;
        continue;
      }
      const sharedBoardingRecord = dog.sourceBoardingDogId
        ? boardingDogRecordForDisplay(dog.sourceBoardingDogId)
        : consolidatedBoardingDogRecords().find((record) => record.linkedCustomerDogId === dog.id) || null;
      const existingTarget = (editingRecord && (editingRecord.dogName === dog.dogName || estimate.dogs.length === 1))
        ? editingRecord
        : sharedBoardingRecord;
      const useExisting = Boolean(existingTarget);
      const existingStay = editingStayId ? boardingStayByReference(existingTarget || {}, editingStayId) || {} : {};
      const existingStayRequestCode = existingStay && Object.keys(existingStay).length
        ? boardingStayRequestCode(existingTarget || sharedBoardingRecord || dog, existingStay)
        : "";
      const existingStaySourceIds = [...new Set([
        ...(typeof boardingStaySourceIds === "function" ? boardingStaySourceIds(existingStay) : [existingStay.id].filter(Boolean)),
        editingStayId,
      ].filter(Boolean).map(String))];
      const stayRequests = dogServices.map((service) => ({
        id: service.id,
        serviceId: service.id,
        serviceName: service.serviceName,
        label: \`\${service.serviceName}\${Number(service.quantity || 1) > 1 ? \` x\${service.quantity}\` : ""} requested\`,
        quantity: Number(service.quantity || 1),
        unitPrice: Number(service.basePrice || service.unitPrice || 0),
        unit: service.unit || "",
        source: "customer-request",
      }));
      const dogLine = estimate.boardingLines.find((line) => line.dogKey === boardingPricingDogKey(dog)) || {};
      const invoiceAdjustments = normalizeInvoiceAdjustments(existingStay.invoiceAdjustments || []);
      const stayType = estimate.isServiceRequest ? "Service Request" : estimate.isDayCare ? "Day Care" : "Boarding";
      const requestProfileSnapshot = {
        customerDogId: dog.id || "",
        sourceBoardingDogId: dog.sourceBoardingDogId || "",
        dogName: dog.dogName || "",
        breedDescription: dog.breedDescription || "",
        sex: dog.sex || "",
        spayNeuterStatus: dog.spayNeuterStatus || "",
        dateOfBirth: dog.dateOfBirth || "",
        age: typeof dogAgeText === "function" ? dogAgeText(dog) : "",
        vetInfo: dog.vetInfo || "",
        emergencyName: dog.emergencyName || "",
        emergencyPhone: dog.emergencyPhone || "",
        emergencyRelation: dog.emergencyRelation || "",
        foodInstructions: dog.foodInstructions || "",
        specialCare: dog.specialCare || "",
        medicationInstructions: dog.medicationInstructions || "",
        dhppDate: dog.dhppDate || "",
        rabiesDate: dog.rabiesDate || "",
        bordetellaDate: dog.bordetellaDate || "",
        heartwormDate: dog.heartwormDate || "",
        profilePhotoUrl: dog.profilePhotoUrl || "",
        profilePhotoPath: dog.profilePhotoPath || "",
        vaccinationRecords: dog.vaccinationRecords || [],
        vaccinationFiles: dog.vaccinationFiles || "",
      };
      const pricingSnapshot = boardingPricingSnapshotForStay(existingTarget || dog, {
        ...existingStay,
        dropoffTime: estimate.dropoffTime,
        pickupTime: estimate.pickupTime,
        stayType,
        requests: stayRequests,
        invoiceAdjustments,
      }, {
        ratePlan: estimate.ratePlan,
        currentDogKey: dogLine.dogKey || boardingPricingDogKey(dog),
        currentDogName: dogLine.dogName || dog.dogName || "Dog",
        currentDogRole: dogLine.role || (estimate.ratePlan?.isMemberPricing ? "primary" : "non-member"),
        sharedCrateRequested: estimate.sharedCrateRequested,
        crateGroupId: dogLine.crateGroupId || "",
        stayProgram: estimate.stayProgram,
        groupBoardingSubtotal: estimate.boardingCost,
        groupServiceSubtotal: estimate.serviceCost,
        groupTotal: estimate.total,
        dogCount: estimate.dogs.length,
        perDogBreakdown: estimate.boardingLines,
        pricingErrors: estimate.pricingErrors || [],
      });
      const existingStatus = useExisting ? normalizeBoardingStatus(existingTarget) : "Pending";
      const existingStayStatus = existingStay.id ? boardingStayDisplayStatus(existingTarget || {}, existingStay) : existingStatus;
      const activeExistingStatus = ["Checked In", "In Kennel", "Ready For Pickup"].includes(existingStatus);
      const requestReviewStatus = "pending_customer_request";
      const requestStatus = activeExistingStatus ? existingStatus : requestReviewStatus;
      const statusHistoryFrom = editingRecord ? existingStayStatus || existingStatus : existingStatus;
      const statusHistoryTo = editingRecord ? requestReviewStatus : requestStatus;
      const statusHistory = useExisting
        ? [
            ...(existingTarget.statusHistory || []),
            ...(normalizeBoardingStatus({ boardingStatus: statusHistoryFrom, customerRequest: true }) !== normalizeBoardingStatus({ boardingStatus: statusHistoryTo, customerRequest: true })
              ? [{ from: statusHistoryFrom, to: statusHistoryTo, date: new Date().toISOString(), by: currentUser?.name || dog.ownerName || "", source: "customer-request" }]
              : []),
          ]
        : [{ from: "", to: requestReviewStatus, date: new Date().toISOString(), by: currentUser?.name || dog.ownerName || "", source: "customer-request" }];
      const stay = {
        id: editingRecord ? existingStay.id || editingStayId || uid("stay") : customerBookingStableId("stay", estimate, dog),
        status: requestReviewStatus,
        createdAt: editingRecord ? existingStay.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "customer-request",
        sourceStayIds: editingRecord ? existingStaySourceIds : [],
        requestGroupId,
        reservationGroupId: requestGroupId,
        familyReservationId: requestGroupId,
        requestGroupDogIds: groupDogIds,
        requestGroupDogNames: groupDogNames,
        requestGroupDogCount: groupDogCount,
        requestGroupTotal: estimate.total,
        requestGroupStatus: requestReviewStatus,
        dropoffTime: estimate.dropoffTime,
        pickupTime: estimate.pickupTime,
        scheduledDropoffTime: estimate.dropoffTime,
        requestedDropoffTime: estimate.dropoffTime,
        scheduledPickupTime: estimate.pickupTime,
        requestedPickupTime: estimate.pickupTime,
        stayType,
        stayProgramId: estimate.stayProgram?.id || "",
        stayProgramName: estimate.stayProgram?.serviceName || estimate.stayProgram?.name || "",
        stayProgramRate: estimate.stayProgram?.rate || "",
        stayProgram: estimate.stayProgram || null,
        billingDays: pricingSnapshot.billingDays,
        requests: stayRequests,
        stayNotes: estimate.requestNotes,
        invoiceAdjustments,
        invoiceEvents: existingStay.invoiceEvents || [],
        pricingSnapshot,
        groupTotal: estimate.total,
        requestProfileSnapshot,
        boardingAgreement,
        boardingAgreementId: boardingAgreement?.id || "",
        boardingAgreementVersion: boardingAgreement?.agreementVersion || "",
        boardingAgreementSignedAt: boardingAgreement?.signedAt || "",
        boardingAgreementSignatureHash: boardingAgreement?.signatureHash || "",
        boardingAgreementDocumentHash: boardingAgreement?.documentHash || "",
        estimatedTotal: pricingSnapshot.total,
      };
      stay.bathPlan = bathPlanForStay(stay);
      stay.requestCode = existingStay.requestCode || existingStayRequestCode || boardingStayRequestCode(existingTarget || sharedBoardingRecord || dog, stay);
      stay.serviceTasks = boardingStayServiceTasks(existingTarget || sharedBoardingRecord || dog, stay);
      const existingStays = useExisting ? (existingTarget.stays || []).filter((item) => {
        if (boardingStaySharesExplicitIdentity(item, stay)) return false;
        const itemRequestCode = boardingStayRequestCode(existingTarget || sharedBoardingRecord || dog, item);
        return !stay.requestCode || itemRequestCode !== stay.requestCode;
      }) : [];
      existingStays.unshift(stay);
      const ownerEmail = normalizeEmail(existingTarget?.ownerEmail || dog.ownerEmail || currentUser?.email);
      const secondaryOwnerEmail = normalizeEmail(existingTarget?.secondaryOwnerEmail || dog.secondaryOwnerEmail);
      const payload = {
        ...(useExisting ? existingTarget : {}),
        type: "boardingDog",
        id: useExisting ? existingTarget.id : customerBookingStableId("boardingDog", estimate, dog),
        submittedAt: useExisting ? existingTarget.submittedAt || new Date().toISOString() : new Date().toISOString(),
        boardingStatus: requestStatus,
        statusHistory,
        customerRequest: true,
        requestGroupId,
        reservationGroupId: requestGroupId,
        familyReservationId: requestGroupId,
        requestGroupDogIds: groupDogIds,
        requestGroupDogNames: groupDogNames,
        requestGroupDogCount: groupDogCount,
        requestGroupServiceNames: groupSelectedServices,
        requestGroupTotal: estimate.total,
        requestGroupStatus: requestReviewStatus,
        dogName: dog.dogName,
        breedDescription: dog.breedDescription,
        dateOfBirth: dog.dateOfBirth || existingTarget?.dateOfBirth || "",
        sex: dog.sex || existingTarget?.sex || "",
        ownerName: dog.ownerName,
        ownerPhone: dog.ownerPhone,
        ownerEmail,
        customerEmail: ownerEmail,
        secondaryOwnerEmail,
        requestedByEmail: currentUser?.email || ownerEmail,
        requestedByName: currentUser?.name || dog.ownerName || "",
        linkedCustomerDogId: dog.isSharedBoardingDog ? linkedCustomerDogForBoarding(sharedBoardingRecord || {})?.id || dog.linkedCustomerDogId || "" : dog.id,
        linkedOwnerEmail: ownerEmail,
        emergencyName: dog.emergencyName,
        emergencyPhone: dog.emergencyPhone,
        emergencyRelation: dog.emergencyRelation || existingTarget?.emergencyRelation || "",
        specialCare: dog.specialCare,
        medicationInstructions: dog.medicationInstructions || existingTarget?.medicationInstructions || "",
        foodInstructions: dog.foodInstructions || existingTarget?.foodInstructions || "",
        spayNeuterStatus: dog.spayNeuterStatus,
        vetInfo: dog.vetInfo || existingTarget?.vetInfo || "",
        dhppDate: dog.dhppDate,
        rabiesDate: dog.rabiesDate,
        bordetellaDate: dog.bordetellaDate || existingTarget?.bordetellaDate || "",
        heartwormDate: dog.heartwormDate || existingTarget?.heartwormDate || "",
        rabiesDuration: dog.rabiesDuration,
        dhppDuration: dog.dhppDuration,
        rabiesGoodThreeYears: dog.rabiesGoodThreeYears || (vaccineDurationIsThreeYears(dog, "rabies") ? "Yes" : ""),
        dhppGoodThreeYears: dog.dhppGoodThreeYears || (vaccineDurationIsThreeYears(dog, "dhpp") ? "Yes" : ""),
        sourceBoardingDogId: dog.sourceBoardingDogId || "",
        profilePhotoUrl: dog.profilePhotoUrl || "",
        profilePhotoPath: dog.profilePhotoPath || "",
        vaccinationRecords: dog.vaccinationRecords || [],
        vaccinationFiles: dog.vaccinationFiles || "",
        requestProfileSnapshot,
        boardingAgreement,
        boardingAgreementId: boardingAgreement?.id || "",
        boardingAgreementVersion: boardingAgreement?.agreementVersion || "",
        boardingAgreementSignedAt: boardingAgreement?.signedAt || "",
        boardingAgreementSignatureHash: boardingAgreement?.signatureHash || "",
        boardingAgreementDocumentHash: boardingAgreement?.documentHash || "",
        estimatedTotal: pricingSnapshot.total,
        stayType,
        billingDays: pricingSnapshot.billingDays,
        requestedServices: dogServices.map((service) => ({ id: service.id, serviceName: service.serviceName, quantity: Number(service.quantity || 1), unitPrice: Number(service.basePrice || 0), dogName: dog.dogName || "Dog" })),
        flags: ["Required update from owner"],
        stays: existingStays,
        customerEditedAt: editingRecord ? new Date().toISOString() : existingTarget?.customerEditedAt || "",
        customerEditedPreviousStatus: editingRecord ? statusHistoryFrom : existingTarget?.customerEditedPreviousStatus || "",
        cancelledAt: normalizeBoardingStatus({ boardingStatus: requestStatus, customerRequest: true }) === "Pending" ? "" : existingTarget?.cancelledAt || "",
        checkedOutAt: normalizeBoardingStatus({ boardingStatus: requestStatus, customerRequest: true }) === "Pending" ? "" : existingTarget?.checkedOutAt || "",
      };
      const record = await saveAndNotify(payload, editingId ? "customerBoardingRequestUpdated" : "customerBoardingRequestCreated");
      savedCount += 1;
      await ensureCustomerAccessProfile({
        email: record.ownerEmail,
        name: record.ownerName,
        customerDogId: dog.isSharedBoardingDog ? record.linkedCustomerDogId : dog.id,
        boardingDogId: record.id,
      });
      if (record.secondaryOwnerEmail) {
        await ensureCustomerAccessProfile({
          email: record.secondaryOwnerEmail,
          name: record.secondaryOwnerName || record.ownerName,
          boardingDogId: record.id,
        });
      }
    }
    pendingCustomerBooking = null;
    $("#bookingConfirmDialog").close();
    resetCustomerBookingForm();
    renderBoardingDogs();
    renderBoardingRequests();
    renderCustomerDogs();
    renderCustomerRequests();
    renderDashboard();
    switchPage("customerRequestsPage");
    resetCustomerBookingForm();
    const inlineStatus = $("#customerBookingInlineStatus");
    if (inlineStatus) {
      inlineStatus.textContent = editingId ? "Your request has been updated." : "Your request has been sent - we'll confirm within 24 hours.";
      inlineStatus.hidden = false;
      window.setTimeout(() => {
        inlineStatus.hidden = true;
      }, 8000);
    }
    if (!savedCount && skippedCount) {
      showDetailDialog("Request Already Exists", \`<p>A matching request already exists for the selected dog\${skippedCount === 1 ? "" : "s"} at that time.</p>\`);
    } else {
      showToast(editingId ? "Request updated." : "Request sent.");
    }
  } catch (error) {
    pendingCustomerBooking = estimate;
    showToast(\`Request could not be saved: \${error.message || error}\`);
  } finally {
    customerBookingSubmitInProgress = false;
    if ($("#bookingConfirmDialog")?.open && confirmButton) confirmButton.disabled = false;
  }
}
//# sourceURL=snuggle-stay/customer.js
`;
(0, eval)(__snuggleStayModuleSource);
