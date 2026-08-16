import assert from "node:assert/strict";
import fs from "node:fs";

const edge = fs.readFileSync("supabase/functions/send-notification/index.ts", "utf8");
const customer = fs.readFileSync("js/customer.js", "utf8");
const notifications = fs.readFileSync("js/notifications.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

const submitStart = customer.indexOf("async function submitPendingCustomerBooking()");
const submitEnd = customer.indexOf("//# sourceURL=snuggle-stay/customer.js", submitStart);
const submitSource = customer.slice(submitStart, submitEnd);

assert.match(submitSource, /requestGroupRequestedServices/, "grouped requests must retain services for every selected dog");
assert.match(submitSource, /dogNames: groupDogNames/, "grouped requests must retain every selected dog name");
assert.match(submitSource, /const savedRecords = \[\]/, "request records must be collected before notification delivery");
assert.match(submitSource, /const customerAccessProfiles = \[\]/, "customer access profile refreshes must be deferred until after the alert");
assert.match(submitSource, /await sendPayloadBatch\(savedRecords, \{ retryIndividually: false \}\)/, "the complete family request must persist atomically before notification delivery");
assert.doesNotMatch(submitSource, /await sendPayload\(record\)/, "family request members must not persist one dog at a time");
assert.match(submitSource, /notifyIfNeeded\(savedRecords\[0\]/, "one grouped notification must be sent from the first saved request");
assert.doesNotMatch(submitSource, /saveAndNotify\(payload/, "multi-dog requests must not send one email per dog");
assert.ok(
  submitSource.indexOf("notifyIfNeeded(savedRecords[0]") < submitSource.indexOf("for (const profile of customerAccessProfiles)"),
  "staff alert delivery must run before customer access profile housekeeping",
);
assert.match(
  shared,
  /if\s*\(isStaffRole\(\)\s*\|\|\s*notificationVisibleToCurrentUser\(notification\)\)\s*\{[\s\S]*?await\s+sendPayload\(notification\)/,
  "customer staff-only alerts should rely on the edge function instead of failing notificationLog RLS",
);

assert.match(notifications, /function boardingRequestDogNames/, "in-app request alerts must understand grouped dog names");
assert.match(edge, /function renderExecutedAgreementEmail/, "signed agreements need a dedicated email renderer");
assert.match(edge, /template: "executed_boarding_agreement_v2"/, "signed agreements must use the dedicated template");
assert.match(edge, /html: adminRendered\.html/, "admin agreement messages must include the dedicated HTML");
assert.match(edge, /html: customerRendered\.html/, "customer agreement messages must include the dedicated HTML");
assert.match(edge, /record\.requestGroupRequestedServices/, "admin request emails must use grouped service details");
assert.match(edge, /record\.requestGroupDogNames/, "admin request emails must use grouped dog names");
const edgeHandlerStart = edge.indexOf("Deno.serve(async (req) =>");
const edgeHandlerSource = edge.slice(edgeHandlerStart);
assert.ok(
  edgeHandlerSource.indexOf('deliveryStatus: "pending"') < edgeHandlerSource.indexOf("await notificationContent"),
  "the in-app notification must be persisted before email content or delivery can fail",
);
assert.match(edgeHandlerSource, /deliveryStatus: "failed"[\s\S]*deliveryError/, "email preparation failures must remain visible in the notification log");
assert.match(
  edge,
  /record\.requestGroupTotal\s*\|\|\s*stay\.requestGroupTotal\s*\|\|\s*record\.estimatedTotal/,
  "grouped request emails must prefer the whole-group total over one dog's subtotal",
);

const rendererStart = edge.indexOf("function agreementInlineHtml");
const rendererEnd = edge.indexOf("function renderExecutedAgreementEmail", rendererStart);
const rendererSource = edge.slice(rendererStart, rendererEnd)
  .replace("const html: string[] = [];", "const html = [];")
  .replace('(kind: "ol" | "ul")', "(kind)");
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const renderers = new Function(
  "escapeHtml",
  `${rendererSource}\nreturn { agreementMarkdownToEmailHtml, agreementMarkdownToPlainText };`,
)(escapeHtml);
const sample = `# CUDDLE STAY

**PLEASE READ THIS AGREEMENT CAREFULLY.**

# 1. OWNER REPRESENTATIONS

1. Owner is at least eighteen years old.
2. Owner has authority.

* First risk;
* Second risk.

☐ I agree.`;
const html = renderers.agreementMarkdownToEmailHtml(sample);
const text = renderers.agreementMarkdownToPlainText(sample);
assert.match(html, /<h2[^>]*>CUDDLE STAY<\/h2>/, "contract headings must render as headings");
assert.match(html, /<strong[^>]*>PLEASE READ THIS AGREEMENT CAREFULLY\.<\/strong>/, "contract emphasis must remain bold");
assert.equal((html.match(/Owner is at least eighteen years old\./g) || []).length, 1, "contract clauses must not be duplicated");
assert.equal((html.match(/<ol/g) || []).length, 1, "numbered clauses must remain one ordered list");
assert.equal((html.match(/<ul/g) || []).length, 1, "bullet clauses must remain one bullet list");
assert.match(html, /☐.*I agree\./, "agreement selections must remain readable");
assert.doesNotMatch(html, /\*\*|# CUDDLE/, "raw Markdown markers must not reach the HTML email");
assert.doesNotMatch(text, /\*\*|^#/m, "plain-text agreement copies must remove Markdown markers");

assert.match(main, /boarding-family-alert-approval-v27/, "grouped request modules are not cache-busted");
assert.match(index, /boarding-family-alert-approval-v27/, "the app entrypoint is not cache-busted");

console.log("Boarding notification email checks passed.");
