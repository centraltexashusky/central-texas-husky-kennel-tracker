import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getCorsHeaders(req: Request): Record<string, string> {
  const allowedOrigin =
    Deno.env.get("APP_PRODUCTION_URL")?.replace(/\/$/, "") ||
    "https://kennel.centraltexashusky.com";
  const requestOrigin = req.headers.get("Origin") || "";
  const origin = requestOrigin === allowedOrigin ? allowedOrigin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

type NotifyBody = {
  type?: string;
  audience?: string;
  eventName?: string;
  recordId?: string;
  notificationId?: string;
};

type MediaEmailLink = {
  label: string;
  url: string;
};

const MEDIA_BUCKET = "kennel-media";
const DEFAULT_MEDIA_LINK_SECONDS = 7 * 24 * 60 * 60;

const json = (body: Record<string, unknown>, status: number, req: Request) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

function splitEnv(name: string) {
  return (Deno.env.get(name) || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uniqueEmails(values: unknown[]) {
  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function adminEmails() {
  const fromEnv = splitEnv("ADMIN_ALERT_EMAILS").length
    ? splitEnv("ADMIN_ALERT_EMAILS")
    : splitEnv("ADMIN_EMAILS");
  if (!fromEnv.length) {
    console.warn("No ADMIN_ALERT_EMAILS or ADMIN_EMAILS env var set. Admin notifications will not be delivered.");
  }
  return fromEnv;
}

function recordHasEmail(record: Record<string, unknown>, email: string) {
  const target = normalizeEmail(email);
  if (!target) return false;
  return [
    record.ownerEmail,
    record.customerEmail,
    record.requestedByEmail,
    record.linkedOwnerEmail,
    record.secondaryOwnerEmail,
    record.staffEmail,
    record.helperEmail,
  ].some((value) => normalizeEmail(value) === target);
}

async function callerIsStaff(adminClient: ReturnType<typeof createClient>, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (adminEmails().map(normalizeEmail).includes(normalized)) return true;
  const { data } = await adminClient
    .from("kennel_records")
    .select("payload")
    .eq("type", "settingsUser")
    .filter("payload->>email", "eq", normalized)
    .maybeSingle();
  const payload = (data?.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, unknown>;
  const role = String(payload.role || "").toLowerCase();
  return ["admin", "helper", "staff"].includes(role) && String(payload.removed || "false").toLowerCase() !== "true";
}

function recordAudienceEmails(record: Record<string, unknown>) {
  return Array.isArray(record.audienceEmails)
    ? uniqueEmails(record.audienceEmails)
    : [];
}

function normalizedStaffRole(value: unknown) {
  const role = String(value || "").trim().toLowerCase();
  return role === "staff" ? "helper" : role;
}

function recordIsRemoved(record: Record<string, unknown>) {
  return record.removed === true || String(record.removed || "").trim().toLowerCase() === "true";
}

async function settingsUserEmailsByRoles(adminClient: ReturnType<typeof createClient>, roles: string[]) {
  const roleSet = new Set(roles.map(normalizedStaffRole).filter(Boolean));
  if (!roleSet.size) return [];
  const { data, error } = await adminClient
    .from("kennel_records")
    .select("payload")
    .eq("type", "settingsUser");
  if (error) {
    console.warn("Could not resolve settings users for notification audience.", error.message);
    return [];
  }
  return uniqueEmails(
    (data || [])
      .map((row) => row.payload && typeof row.payload === "object" ? row.payload as Record<string, unknown> : {})
      .filter((payload) => !recordIsRemoved(payload) && roleSet.has(normalizedStaffRole(payload.role)))
      .map((payload) => payload.email),
  );
}

async function notificationAudienceEmails(
  adminClient: ReturnType<typeof createClient>,
  eventName: string,
  record: Record<string, unknown>,
  notification: Record<string, unknown> = {},
) {
  const audienceEmails = recordAudienceEmails(notification).length ? recordAudienceEmails(notification) : recordAudienceEmails(record);
  if (eventName !== "schedulePublished") return audienceEmails;
  return uniqueEmails([
    ...audienceEmails,
    ...(await settingsUserEmailsByRoles(adminClient, ["helper", "admin"])),
  ]);
}

function appUrl() {
  return Deno.env.get("APP_PRODUCTION_URL") || "https://kennel.centraltexashusky.com/";
}

function appLink(hash = "") {
  const base = appUrl().replace(/#.*$/, "").replace(/\/?$/, "/");
  return hash ? `${base}${hash.startsWith("#") ? hash : `#${hash}`}` : base;
}

function absoluteAppUrl(path = "/") {
  const base = appUrl().replace(/#.*$/, "").replace(/\/$/, "");
  const cleanPath = path.startsWith("/") || path.startsWith("#") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

function emailLogoUrl() {
  return Deno.env.get("LOGO_URL") || absoluteAppUrl("/images/arkinlight-trophy-logo-email.png");
}

function emailValue(value: unknown, fallback = "Not provided") {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : fallback;
}

function emailTextValue(value: unknown, fallback = "Not provided") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatEmailDateTime(value: unknown) {
  if (!value) return "Not provided";
  const text = String(value).trim();
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return escapeHtml(text);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(date);
}

function formatEmailDateTimeText(value: unknown) {
  if (!value) return "Not provided";
  const text = String(value).trim();
  const localIsoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d{1,6})?)?$/);
  if (localIsoMatch) {
    const [, year, month, day, hour, minute] = localIsoMatch;
    const monthName = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][Number(month) - 1] || month;
    const hourNumber = Number(hour);
    const hour12 = hourNumber % 12 || 12;
    const period = hourNumber >= 12 ? "PM" : "AM";
    return `${monthName} ${Number(day)}, ${year} at ${hour12}:${minute} ${period}`;
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(date);
}

function formatEmailMoneyText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Not provided";
  const numberValue = typeof value === "number" ? value : Number(raw.replace(/[$,]/g, ""));
  if (!Number.isFinite(numberValue)) return raw;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(numberValue) ? 0 : 2,
  }).format(numberValue);
}

function formatEmailMoney(value: unknown) {
  return escapeHtml(formatEmailMoneyText(value));
}

function formatEmailSchedulePlainText(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Not provided";
  const isoDateTimePattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:?\d{2})?/g;
  return raw.replace(isoDateTimePattern, (match) => formatEmailDateTimeText(match));
}

function formatEmailScheduleText(value: unknown) {
  return escapeHtml(formatEmailSchedulePlainText(value));
}

function formatPremiumDetailValue(label: unknown, value: unknown) {
  const labelText = String(label || "").toLowerCase();
  if (/(total|amount|cost|price|fee|deposit|balance)/.test(labelText)) return formatEmailMoney(value);
  if (/(time|date|drop|pick|stay|week|shift)/.test(labelText)) return formatEmailScheduleText(value);
  return emailValue(value);
}

function premiumDetailValueHtml(label: unknown, value: unknown) {
  const mediaLink = mediaEmailLinkFromLine(`${String(label || "").trim()}: ${String(value ?? "").trim()}`, String(label || ""));
  return mediaLink ? mediaLinkButtonHtml(mediaLink) : formatPremiumDetailValue(label, value);
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function safeStoragePath(value: unknown) {
  const path = String(value || "").trim();
  if (!path || path.includes("..") || path.startsWith("/") || !path.startsWith("users/")) return "";
  return path;
}

function mediaLinkSeconds() {
  const configured = Number(Deno.env.get("MEDIA_EMAIL_LINK_EXPIRES_SECONDS") || "");
  return Number.isFinite(configured) && configured >= 600 ? configured : DEFAULT_MEDIA_LINK_SECONDS;
}

function mediaLabel(item: Record<string, unknown>, index: number) {
  const type = String(item.type || item.contentType || "");
  const name = String(item.name || item.fileName || "").trim();
  if (name) return name;
  if (type.startsWith("video/")) return `Video ${index + 1}`;
  if (type.startsWith("image/")) return `Photo ${index + 1}`;
  return `Media ${index + 1}`;
}

function mediaKindFromText(value = "") {
  const text = value.toLowerCase();
  if (/(video\/|\.mp4\b|\.mov\b|\.webm\b|\.m4v\b|\bvideo\b)/.test(text)) return "video";
  if (/(image\/|\.jpe?g\b|\.png\b|\.webp\b|\.gif\b|\bphoto\b|\bimage\b)/.test(text)) return "photo";
  return "document";
}

function mediaButtonLabelFromText(value = "") {
  return `Click here to view ${mediaKindFromText(value)}`;
}

function mediaPlainTextLine(link: MediaEmailLink) {
  return `${link.label}: ${link.url}`;
}

function mediaEmailLinkFromLine(line = "", heading = ""): MediaEmailLink | null {
  const cleanLine = line.replace(/^-\s*/, "").trim();
  const urlMatch = cleanLine.match(/https?:\/\/\S+/);
  if (!urlMatch) return null;
  const url = urlMatch[0];
  const rawLabel = cleanLine.replace(url, "").replace(/[:\-]\s*$/, "").trim();
  const context = [heading, rawLabel, url].filter(Boolean).join(" ");
  if (!/(media|file|photo|video|document|image)/i.test(context)) return null;
  return {
    label: /^click here to view/i.test(rawLabel) ? rawLabel : mediaButtonLabelFromText(context),
    url,
  };
}

function mediaLinkButtonHtml(link: MediaEmailLink) {
  return `<a href="${escapeHtml(link.url)}" style="display:inline-block;background:#111111;border:1px solid #d7a83d;border-radius:12px;color:#fff8dd;text-decoration:none;font-size:14px;font-weight:800;line-height:1.25;padding:12px 18px;">${escapeHtml(link.label)}</a>`;
}

function mediaLinksButtonListHtml(links: MediaEmailLink[]) {
  return links.map((link) => `<div style="margin-top:10px;">${mediaLinkButtonHtml(link)}</div>`).join("");
}

function uniqueMediaEmailLinks(links: MediaEmailLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const url = String(link?.url || "").trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

function normalizeMediaEmailLinks(value: unknown, heading = "Media links") {
  const items = Array.isArray(value) ? value : [];
  const links: MediaEmailLink[] = [];
  for (const item of items) {
    if (item && typeof item === "object") {
      const media = item as Record<string, unknown>;
      const url = String(media.url || "").trim();
      if (!url || url.startsWith("data:")) continue;
      const label = String(media.label || "").trim();
      links.push({
        label: /^click here to view/i.test(label) ? label : mediaButtonLabelFromText([heading, label, url].filter(Boolean).join(" ")),
        url,
      });
      continue;
    }
    const link = mediaEmailLinkFromLine(String(item || ""), heading);
    if (link) links.push(link);
  }
  return links;
}

async function mediaLines(adminClient: ReturnType<typeof createClient>, mediaItems: unknown[]) {
  const lines: MediaEmailLink[] = [];
  const seconds = mediaLinkSeconds();
  for (const [index, rawItem] of mediaItems.entries()) {
    const item = (rawItem && typeof rawItem === "object" ? rawItem : {}) as Record<string, unknown>;
    const storagePath = safeStoragePath(item.storagePath || item.path || item.profilePhotoPath);
    let url = String(item.url || "").trim();
    if (storagePath) {
      const { data, error } = await adminClient.storage.from(MEDIA_BUCKET).createSignedUrl(storagePath, seconds);
      if (!error && data?.signedUrl) url = data.signedUrl;
    }
    if (!url || url.startsWith("data:")) continue;
    lines.push({
      label: mediaButtonLabelFromText([mediaLabel(item, index), item.type, item.contentType, url].filter(Boolean).join(" ")),
      url,
    });
  }
  return lines;
}

async function recordMediaLines(adminClient: ReturnType<typeof createClient>, record: Record<string, unknown>) {
  const mediaItems = [
    ...arrayValue(record.mediaItems),
    ...arrayValue(record.vaccinationRecords),
    ...arrayValue(record.documents),
  ];
  if (record.profilePhotoPath || record.profilePhotoUrl) {
    mediaItems.push({
      name: "Profile photo",
      type: "image/jpeg",
      storagePath: record.profilePhotoPath,
      url: record.profilePhotoUrl,
    });
  }
  return mediaLines(adminClient, mediaItems);
}

function customerStayAudienceEmails(record: Record<string, unknown>, notification: Record<string, unknown>) {
  const notificationAudience = recordAudienceEmails(notification);
  if (notificationAudience.length) return notificationAudience;
  return uniqueEmails([
    record.ownerEmail,
    record.customerEmail,
    record.linkedOwnerEmail,
    record.secondaryOwnerEmail,
  ]);
}

function firstStay(record: Record<string, unknown>) {
  const stays = Array.isArray(record.stays) ? record.stays : [];
  return (stays[0] && typeof stays[0] === "object" ? stays[0] : {}) as Record<string, unknown>;
}

function notificationTextIsSpecific(value: unknown) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  if (["notification", "snuggle stay alert", "alert"].includes(normalized)) return false;
  if (normalized.includes("needs review") && normalized.includes("open the related kennel record")) return false;
  return true;
}

function stayRequestCode(record: Record<string, unknown>, stay: Record<string, unknown>) {
  const existing = String(stay.requestCode || stay.requestId || stay.reservationId || record.requestCode || "").trim();
  if (existing) return existing;
  return String(stay.id || "").trim();
}

function notificationSourceSnapshot(notification: Record<string, unknown>) {
  return notification.sourceSnapshot && typeof notification.sourceSnapshot === "object"
    ? notification.sourceSnapshot as Record<string, unknown>
    : {};
}

function notificationActionTarget(notification: Record<string, unknown>) {
  return notification.actionTarget && typeof notification.actionTarget === "object"
    ? notification.actionTarget as Record<string, unknown>
    : {};
}

function objectValue(source: Record<string, unknown>, key: string) {
  return source[key] && typeof source[key] === "object"
    ? source[key] as Record<string, unknown>
    : {};
}

function customerRequestStatusReference(record: Record<string, unknown>) {
  const latest = objectValue(record, "latestCustomerRequestStatus");
  return {
    requestCode: String(latest.requestCode || "").trim(),
    stayId: String(latest.stayId || "").trim(),
  };
}

function statusHistoryReference(record: Record<string, unknown>, eventName = "") {
  const targetStatus = eventName === "boardingCustomerRequestApproved"
    ? "Approved"
    : eventName === "boardingCustomerRequestDeclined" || eventName === "boardingCustomerRequestCancelled"
    ? "Cancelled"
    : "";
  if (!targetStatus) return { requestCode: "", stayId: "" };
  const history = arrayValue(record.statusHistory)
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .reverse();
  const match = history.find((item) => String(item.to || "").trim() === targetStatus && (item.stayId || item.requestCode));
  return {
    requestCode: String(match?.requestCode || "").trim(),
    stayId: String(match?.stayId || "").trim(),
  };
}

function notificationTargetStayReferences(
  record: Record<string, unknown>,
  notification: Record<string, unknown>,
  eventName = "",
) {
  const source = notificationSourceSnapshot(notification);
  const actionTarget = notificationActionTarget(notification);
  const ready = objectValue(source, "latestServiceReadyForPickup");
  const sourceStatus = customerRequestStatusReference(source);
  const recordStatus = customerRequestStatusReference(record);
  const sourceHistory = statusHistoryReference(source, eventName);
  const recordHistory = statusHistoryReference(record, eventName);
  const notificationReference = {
    requestCode: String(notification.requestCode || "").trim(),
    stayId: String(notification.stayId || "").trim(),
  };
  const actionReference = {
    requestCode: String(actionTarget.requestCode || "").trim(),
    stayId: String(actionTarget.stayId || "").trim(),
  };
  const readyReference = {
    requestCode: String(ready.requestCode || "").trim(),
    stayId: String(ready.stayId || "").trim(),
  };
  const customerStatusEvent = [
    "boardingCustomerRequestApproved",
    "boardingCustomerRequestDeclined",
    "boardingCustomerRequestCancelled",
    "boardingCustomerRequestUpdatedByStaff",
  ].includes(eventName);
  const references = customerStatusEvent
    ? [sourceStatus, recordStatus, sourceHistory, recordHistory, notificationReference, actionReference, readyReference]
    : [notificationReference, actionReference, readyReference, sourceStatus, recordStatus, sourceHistory, recordHistory];
  return references.filter((reference) => reference.stayId || reference.requestCode);
}

function notificationTargetStayId(notification: Record<string, unknown>) {
  const source = notificationSourceSnapshot(notification);
  const actionTarget = notificationActionTarget(notification);
  const ready = objectValue(source, "latestServiceReadyForPickup");
  const latestStatus = customerRequestStatusReference(source);
  return String(
    notification.stayId
    || notification.requestCode
    || actionTarget.stayId
    || actionTarget.requestCode
    || latestStatus.stayId
    || latestStatus.requestCode
    || ready.requestCode
    || ready.stayId
    || "",
  ).trim();
}

function stayMatchesTargetId(record: Record<string, unknown>, stay: Record<string, unknown>, targetId: string) {
  if (!targetId) return false;
  return [stay.id, stay.requestCode, stay.requestId, stay.reservationId, stayRequestCode(record, stay)]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .includes(targetId);
}

function stayMatchesReference(record: Record<string, unknown>, stay: Record<string, unknown>, reference: Record<string, string>) {
  return stayMatchesTargetId(record, stay, reference.stayId) || stayMatchesTargetId(record, stay, reference.requestCode);
}

function notificationTargetStay(record: Record<string, unknown>, notification: Record<string, unknown> = {}, eventName = "") {
  const targetId = notificationTargetStayId(notification);
  const source = notificationSourceSnapshot(notification);
  const records = [source, record].filter((item) => Object.keys(item).length);
  const references = notificationTargetStayReferences(record, notification, eventName);
  for (const reference of references) {
    for (const candidateRecord of records) {
      const match = arrayValue(candidateRecord.stays)
        .find((stay) => stay && typeof stay === "object" && stayMatchesReference(candidateRecord, stay as Record<string, unknown>, reference));
      if (match && typeof match === "object") return match as Record<string, unknown>;
    }
  }
  for (const candidateRecord of records) {
    const match = arrayValue(candidateRecord.stays)
      .find((stay) => stay && typeof stay === "object" && stayMatchesTargetId(candidateRecord, stay as Record<string, unknown>, targetId));
    if (match && typeof match === "object") return match as Record<string, unknown>;
  }
  return firstStay(record);
}

function stayScheduleText(stay: Record<string, unknown>) {
  const dropoff = String(stay.dropoffTime || stay.requestedDropoffTime || "").trim();
  const pickup = String(stay.pickupTime || stay.requestedPickupTime || "").trim();
  if (dropoff && pickup) return `${dropoff} to ${pickup}`;
  return dropoff || pickup || "";
}

function stayScheduleEmailText(stay: Record<string, unknown>) {
  const schedule = stayScheduleText(stay);
  return schedule ? formatEmailSchedulePlainText(schedule) : "";
}

function isServiceRequest(record: Record<string, unknown>, stay: Record<string, unknown>) {
  return String(stay.stayType || record.stayType || "").trim() === "Service Request";
}

function requestTypeLabel(record: Record<string, unknown>, stay: Record<string, unknown>) {
  return isServiceRequest(record, stay) ? "service request" : "boarding request";
}

function customerEmailsForRecord(record: Record<string, unknown>) {
  return uniqueEmails([
    record.ownerEmail,
    record.customerEmail,
    record.linkedOwnerEmail,
    record.secondaryOwnerEmail,
    record.requestedByEmail,
  ]);
}

function requestServiceItems(record: Record<string, unknown>, stay: Record<string, unknown>) {
  const stayRequests = Array.isArray(stay.requests) ? stay.requests : [];
  const recordRequests = Array.isArray(record.requestedServices) ? record.requestedServices : [];
  const hasSpecificStay = Boolean(
    stay.id
    || stay.dropoffTime
    || stay.pickupTime
    || stay.requestedDropoffTime
    || stay.requestedPickupTime
    || Object.prototype.hasOwnProperty.call(stay, "requests")
  );
  if (hasSpecificStay) return stayRequests;
  return stayRequests.length ? stayRequests : recordRequests;
}

function serviceLine(rawItem: unknown) {
  if (!rawItem || typeof rawItem !== "object") return String(rawItem || "").trim();
  const item = rawItem as Record<string, unknown>;
  const name = String(item.serviceName || item.name || item.label || item.id || "Service").replace(/\s+requested$/i, "").trim();
  const quantity = Number(item.quantity || item.count || 1);
  const count = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  return `${count} x ${name} requested`;
}

function requestServiceLines(record: Record<string, unknown>, stay: Record<string, unknown>) {
  return requestServiceItems(record, stay)
    .map(serviceLine)
    .filter(Boolean);
}

function declineNoteText(record: Record<string, unknown>, stay: Record<string, unknown>) {
  const declineNote = stay.declineNote && typeof stay.declineNote === "object" ? stay.declineNote as Record<string, unknown> : {};
  return String(
    declineNote.note
      || stay.declineReason
      || stay.customerDeclineNote
      || record.declineReason
      || record.customerDeclineNote
      || "",
  ).trim();
}

function latestCustomerCancellationReason(record: Record<string, unknown>, stay: Record<string, unknown>) {
  const latest = record.latestCustomerCancellation && typeof record.latestCustomerCancellation === "object"
    ? record.latestCustomerCancellation as Record<string, unknown>
    : {};
  return String(latest.reason || stay.customerCancellationReason || record.customerCancellationReason || "").trim();
}

function customerStatusLabel(eventName: string) {
  if (eventName === "boardingCustomerRequestApproved") return "approved";
  if (eventName === "boardingCustomerRequestDeclined") return "declined";
  if (eventName === "boardingCustomerRequestCancelled") return "cancelled";
  if (eventName === "boardingCustomerRequestUpdatedByStaff") return "updated";
  return "updated";
}

function serviceEmailDisplay(line: string) {
  const match = line.match(/^(\d+)\s*x\s*(.*?)\s*requested$/i);
  if (!match) return { quantity: "1", name: line.replace(/\s+requested$/i, "").trim(), detail: "Requested service" };
  return {
    quantity: match[1],
    name: match[2].trim(),
    detail: `${match[1]} x requested`,
  };
}

function getBoardingEmailDetails(record: Record<string, unknown>, stay: Record<string, unknown>) {
  const customer =
    record.ownerName
    || record.customerName
    || record.requestedBy
    || record.ownerEmail
    || record.customerEmail
    || "Customer";
  const email =
    record.ownerEmail
    || record.customerEmail
    || record.requestedByEmail
    || record.linkedOwnerEmail
    || "";
  const phone =
    record.ownerPhone
    || record.customerPhone
    || record.phone
    || "";
  const dogList = Array.isArray(record.dogNames)
    ? record.dogNames.join(", ")
    : record.dogNames || record.dogs || record.dogName || stay.dogName || "";
  const dropOff =
    stay.dropoffTime
    || stay.requestedDropoffTime
    || stay.dropOff
    || stay.dropOffDate
    || record.dropOff
    || record.dropOffDate
    || record.startDate
    || "";
  const pickUp =
    stay.pickupTime
    || stay.requestedPickupTime
    || stay.pickUp
    || stay.pickUpDate
    || record.pickUp
    || record.pickUpDate
    || record.endDate
    || "";
  const notes =
    stay.stayNotes
    || stay.notes
    || stay.message
    || record.notes
    || record.message
    || record.specialInstructions
    || "";
  const requestId = stayRequestCode(record, stay);
  return {
    customer,
    dashboardUrl: appLink("#boardingDogsPage"),
    dogs: dogList,
    dropOff,
    email,
    notes,
    phone,
    pickUp,
    requestId,
    total: record.estimatedTotal || stay.estimatedTotal || "",
  };
}

function renderAdminBoardingRequestEmail(
  record: Record<string, unknown>,
  stay: Record<string, unknown>,
  options: {
    action?: string;
    requestType?: string;
    serviceLines?: string[];
    mediaLines?: MediaEmailLink[];
  } = {},
) {
  const details = getBoardingEmailDetails(record, stay);
  const logoUrl = emailLogoUrl();
  const serviceLines = options.serviceLines?.length ? options.serviceLines : requestServiceLines(record, stay);
  const mediaLines = normalizeMediaEmailLinks(options.mediaLines || []);
  const requestType = options.requestType || requestTypeLabel(record, stay);
  const isServiceOnly = requestType.toLowerCase().includes("service");
  const action = String(options.action || "submitted").toLowerCase();
  const requestTitle = isServiceOnly ? "Service Request" : "Boarding Request";
  const title = action === "updated" ? `${requestTitle} Updated` : `${requestTitle} Received`;
  const intro = action === "updated"
    ? `A ${requestType} has been updated and needs review.`
    : `A new ${requestType} has been submitted.`;
  const subjectCustomer = String(details.customer || "New Customer").trim();
  const serviceHtml = serviceLines.length
    ? serviceLines.map((line) => {
        const service = serviceEmailDisplay(line);
        return `<tr>
          <td width="54" valign="top" style="padding:10px 0;border-bottom:1px solid #ead9b4;">
            <div style="width:34px;height:34px;border-radius:999px;background:#111111;color:#d7a83d;text-align:center;line-height:34px;font-weight:800;font-size:15px;">${escapeHtml(service.quantity)}</div>
          </td>
          <td valign="top" style="padding:10px 0;border-bottom:1px solid #ead9b4;">
            <div style="font-size:16px;line-height:1.35;color:#111111;font-weight:800;">${emailValue(service.name)}</div>
            <div style="margin-top:3px;font-size:13px;line-height:1.4;color:#766341;text-transform:uppercase;letter-spacing:1px;font-weight:700;">${emailValue(service.detail)}</div>
          </td>
        </tr>`;
      }).join("")
    : `<tr><td style="padding:10px 0;color:#5d6673;font-size:15px;">No requested services listed.</td></tr>`;
  const mediaHtml = mediaLines.length
    ? `<tr>
        <td style="padding:0 34px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf1;border:1px solid #d7b46a;border-radius:18px;">
            <tr>
              <td style="padding:20px 24px;">
                <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:18px;font-weight:700;">Media links</div>
                ${mediaLinksButtonListHtml(mediaLines)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";
  const notesHtml = String(details.notes || "").trim()
    ? `<div style="margin-top:22px;padding-top:18px;border-top:1px dotted #d7b46a;text-align:left;">
        <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Notes:</div>
        <div style="margin-top:7px;font-size:15px;line-height:1.55;color:#344054;">${emailValue(details.notes)}</div>
      </div>`
    : "";

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1e8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e8;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#fffaf1;border-radius:24px;overflow:hidden;border:1px solid #d7b46a;box-shadow:0 20px 60px rgba(17,17,17,0.16);">
            <tr>
              <td style="background:#050505;padding:34px 34px 28px;border-bottom:5px solid #b98524;text-align:center;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding-bottom:18px;">
                      <img src="${escapeHtml(logoUrl)}" width="112" alt="Central Texas Husky trophy logo" style="display:block;width:112px;max-width:112px;height:auto;margin:0 auto;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;letter-spacing:4px;color:#fff8dd;text-transform:uppercase;font-weight:700;">
                        CENTRAL<br>TEXAS HUSKY
                      </div>
                      <div style="margin-top:12px;color:#d2a13a;font-size:15px;letter-spacing:5px;text-transform:uppercase;font-weight:700;">
                        BOARDING &amp; SERVICES
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:22px 34px;">
                <span style="display:inline-block;width:78px;border-top:1px solid #c6932f;vertical-align:middle;margin-right:18px;"></span>
                <span style="display:inline-block;width:86px;height:86px;border-radius:999px;background:#080808;border:4px solid #d2a13a;box-shadow:0 10px 24px rgba(0,0,0,0.25);text-align:center;line-height:86px;color:#d2a13a;font-size:36px;vertical-align:middle;">
                  &#9733;
                </span>
                <span style="display:inline-block;width:78px;border-top:1px solid #c6932f;vertical-align:middle;margin-left:18px;"></span>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 34px;text-align:center;">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;line-height:1.18;color:#111111;">
                  ${escapeHtml(title)}
                </h1>
                <div style="margin:14px auto 20px;width:160px;border-top:1px solid #c6932f;"></div>
                <p style="margin:0 0 8px;font-size:18px;line-height:1.5;color:#111827;">
                  Hi Central Texas Husky Team,
                </p>
                <p style="margin:0;font-size:17px;line-height:1.6;color:#344054;">
                  ${escapeHtml(intro)}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf1;border:1px solid #d7b46a;border-radius:18px;box-shadow:0 10px 30px rgba(185,133,36,0.1);">
                  <tr>
                    <td style="padding:24px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%" valign="top" style="padding:0 18px 18px 0;border-bottom:1px dotted #d7b46a;">
                            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Customer:</div>
                            <div style="margin-top:7px;font-size:17px;line-height:1.45;color:#111827;">${emailValue(details.customer)}</div>
                          </td>
                          <td width="50%" valign="top" style="padding:0 0 18px 18px;border-left:1px solid #e3c88d;border-bottom:1px dotted #d7b46a;">
                            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Email:</div>
                            <div style="margin-top:7px;font-size:17px;line-height:1.45;color:#111827;">${emailValue(details.email)}</div>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding:18px 18px 18px 0;border-bottom:1px dotted #d7b46a;">
                            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Phone:</div>
                            <div style="margin-top:7px;font-size:17px;line-height:1.45;color:#111827;">${emailValue(details.phone)}</div>
                          </td>
                          <td width="50%" valign="top" style="padding:18px 0 18px 18px;border-left:1px solid #e3c88d;border-bottom:1px dotted #d7b46a;">
                            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Dogs:</div>
                            <div style="margin-top:7px;font-size:17px;line-height:1.45;color:#111827;">${emailValue(details.dogs)}</div>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" valign="top" style="padding:18px 18px 0 0;">
                            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Drop-off:</div>
                            <div style="margin-top:7px;font-size:17px;line-height:1.45;color:#111827;">${formatEmailDateTime(details.dropOff)}</div>
                          </td>
                          <td width="50%" valign="top" style="padding:18px 0 0 18px;border-left:1px solid #e3c88d;">
                            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;font-weight:700;">Pick-up:</div>
                            <div style="margin-top:7px;font-size:17px;line-height:1.45;color:#111827;">${formatEmailDateTime(details.pickUp)}</div>
                          </td>
                        </tr>
                      </table>
                      ${notesHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 34px 30px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf1;border:1px solid #d7b46a;border-radius:18px;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:18px;font-weight:700;">Requested services</div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                        ${serviceHtml}
                      </table>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#111111;border-radius:12px;">
                        <tr>
                          <td style="padding:16px 18px;color:#fff8dd;font-weight:800;font-size:16px;">Estimated total</td>
                          <td align="right" style="padding:16px 18px;color:#fff8dd;font-weight:900;font-size:24px;">${formatEmailMoney(details.total)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${mediaHtml}

            <tr>
              <td align="center" style="padding:0 34px 34px;">
                <a href="${escapeHtml(details.dashboardUrl)}" style="display:inline-block;background:#c9962f;background:linear-gradient(180deg,#f0c76c,#b98524);border:1px solid #8a5c14;border-radius:12px;color:#111111;text-decoration:none;font-size:18px;font-weight:800;padding:17px 62px;box-shadow:0 8px 18px rgba(185,133,36,0.22);">
                  View Request
                </a>
                <p style="margin:24px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-style:italic;color:#344054;">
                  &mdash; Central Texas Husky Team &mdash;
                </p>
              </td>
            </tr>

            <tr>
              <td style="background:#050505;border-top:4px solid #b98524;padding:22px;text-align:center;">
                <p style="margin:0;color:#d2a13a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
                  Central Texas Husky &middot; Boarding &amp; Services
                </p>
              </td>
            </tr>
          </table>

          <p style="max-width:720px;margin:14px auto 0;color:#8a7d67;font-size:12px;line-height:1.5;text-align:center;">
            This is an automated staff notification from the Central Texas Husky boarding app.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    title,
    "",
    `Customer: ${emailTextValue(details.customer)}`,
    `Email: ${emailTextValue(details.email)}`,
    `Phone: ${emailTextValue(details.phone)}`,
    `Dogs: ${emailTextValue(details.dogs)}`,
    `Drop-off: ${formatEmailDateTimeText(details.dropOff)}`,
    `Pick-up: ${formatEmailDateTimeText(details.pickUp)}`,
    serviceLines.length ? "Requested services:" : "",
    ...serviceLines.map((line) => `- ${line}`),
    `Estimated total: ${emailTextValue(details.total)}`,
    details.notes ? `Notes: ${String(details.notes)}` : "",
    ...(mediaLines.length ? ["", "Media links:", ...mediaLines.map(mediaPlainTextLine)] : []),
    "",
    `View Request: ${details.dashboardUrl}`,
  ].filter(Boolean).join("\n");

  return {
    html,
    logoUrl,
    subject: `${action === "updated" ? "Updated" : "New"} ${requestType} from ${subjectCustomer}`,
    template: "admin_boarding_request_premium",
    text,
  };
}

type ParsedEmailBody = {
  actionLabel: string;
  actionUrl: string;
  details: { label: string; value: string }[];
  intro: string[];
  lists: { title: string; items: string[] }[];
  mediaLinks: MediaEmailLink[];
};

function parsePremiumTextBody(body: string): ParsedEmailBody {
  const rawLines = body.split(/\r?\n/).map((line) => line.trim());
  const appBase = appUrl().replace(/#.*$/, "").replace(/\/$/, "");
  let actionIndex = -1;
  for (let index = rawLines.length - 1; index >= 0; index -= 1) {
    const line = rawLines[index];
    if (!line.includes("http")) continue;
    if (line.includes(appBase) || line.includes("kennel.centraltexashusky.com")) {
      actionIndex = index;
      break;
    }
  }

  let actionLabel = "Open Snuggle Stay";
  let actionUrl = appLink();
  if (actionIndex >= 0) {
    const actionLine = rawLines[actionIndex];
    const urlMatch = actionLine.match(/https?:\/\/\S+/);
    if (urlMatch) actionUrl = urlMatch[0];
    const label = actionLine.replace(/https?:\/\/\S+/, "").replace(/[:\-]\s*$/, "").trim();
    if (label) actionLabel = label;
  }

  const details: ParsedEmailBody["details"] = [];
  const intro: string[] = [];
  const lists: ParsedEmailBody["lists"] = [];
  const mediaLinks: MediaEmailLink[] = [];
  let currentListTitle = "";

  for (const [index, line] of rawLines.entries()) {
    if (!line || index === actionIndex) continue;
    if (line.endsWith(":") && !line.includes("http")) {
      currentListTitle = line.replace(/:$/, "").trim();
      if (!lists.some((list) => list.title === currentListTitle)) {
        lists.push({ title: currentListTitle, items: [] });
      }
      continue;
    }
    const mediaLink = mediaEmailLinkFromLine(line, currentListTitle);
    if (mediaLink) {
      mediaLinks.push(mediaLink);
      continue;
    }
    if (line.startsWith("-")) {
      const listTitle = currentListTitle || "Details";
      let list = lists.find((item) => item.title === listTitle);
      if (!list) {
        list = { title: listTitle, items: [] };
        lists.push(list);
      }
      list.items.push(line.replace(/^-\s*/, "").trim());
      continue;
    }
    const detailMatch = line.match(/^([^:]{2,48}):\s*(.*)$/);
    if (detailMatch) {
      const detailMediaLink = mediaEmailLinkFromLine(line, detailMatch[1].trim());
      if (detailMediaLink) {
        mediaLinks.push(detailMediaLink);
        continue;
      }
      details.push({
        label: detailMatch[1].trim(),
        value: detailMatch[2].trim() || "Not provided",
      });
      continue;
    }
    intro.push(line);
  }

  return {
    actionLabel,
    actionUrl,
    details,
    intro,
    lists: lists.filter((list) => list.items.length),
    mediaLinks,
  };
}

function premiumAudienceLabel(audience: unknown, priority: unknown) {
  const isUrgent = String(priority || "").toLowerCase() === "urgent";
  const value = String(audience || "").toLowerCase();
  if (isUrgent && value.includes("customer")) return "Urgent Customer";
  if (isUrgent) return "Urgent Staff/Admin";
  if (value.includes("customer")) return "Customer";
  if (value.includes("admin") || value.includes("staff")) return "Staff/Admin";
  return "Notification";
}

function renderPremiumTextEmail(options: {
  audience?: unknown;
  body: string;
  mediaLinks?: MediaEmailLink[];
  priority?: unknown;
  subject: string;
}) {
  const logoUrl = emailLogoUrl();
  const parsed = parsePremiumTextBody(options.body);
  const title = options.subject || "Snuggle Stay Notification";
  const audienceLabel = premiumAudienceLabel(options.audience, options.priority);
  const isUrgent = String(options.priority || "").toLowerCase() === "urgent";
  const introText = parsed.intro.length
    ? parsed.intro.join("<br>")
    : "A Snuggle Stay notification needs your attention.";
  const mediaLinks = uniqueMediaEmailLinks([
    ...parsed.mediaLinks,
    ...normalizeMediaEmailLinks(options.mediaLinks || [], "Media links"),
  ]);
  const detailsHtml = parsed.details.length
    ? parsed.details.map((detail, index) => {
        const isLast = index === parsed.details.length - 1;
        const valueHtml = premiumDetailValueHtml(detail.label, detail.value);
        return `<tr>
          <td valign="top" style="padding:${index === 0 ? "0" : "14px"} 0 14px;${isLast ? "" : "border-bottom:1px dotted #d7b46a;"}">
            <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:16px;line-height:1.25;font-weight:700;">${emailValue(detail.label)}:</div>
            <div style="margin-top:6px;font-size:16px;line-height:1.45;color:#111827;overflow-wrap:break-word;word-break:normal;">${valueHtml}</div>
          </td>
        </tr>`;
      }).join("")
    : "";

  const detailCardHtml = parsed.details.length
    ? `<tr>
        <td style="padding:0 22px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf1;border:1px solid #d7b46a;border-radius:16px;box-shadow:0 10px 30px rgba(185,133,36,0.1);">
            <tr>
              <td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${detailsHtml}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const listsHtml = parsed.lists.map((list) => {
    const rows = list.items.map((item) => {
      const service = serviceEmailDisplay(item);
      const isRequestedService = /\brequested\b/i.test(item) || /^\d+\s*x\s+/i.test(item);
      return `<tr>
        <td width="48" valign="top" style="padding:10px 0;border-bottom:1px solid #ead9b4;">
          <div style="width:32px;height:32px;border-radius:999px;background:#111111;color:#d7a83d;text-align:center;line-height:32px;font-weight:800;font-size:14px;">${isRequestedService ? emailValue(service.quantity) : "&bull;"}</div>
        </td>
        <td valign="top" style="padding:10px 0;border-bottom:1px solid #ead9b4;">
          <div style="font-size:15px;line-height:1.35;color:#111111;font-weight:800;">${isRequestedService ? emailValue(service.name) : emailValue(item)}</div>
          <div style="margin-top:3px;font-size:12px;line-height:1.4;color:#766341;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">${isRequestedService ? emailValue(service.detail) : emailValue(list.title)}</div>
        </td>
      </tr>`;
    }).join("");
    return `<tr>
      <td style="padding:0 22px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf1;border:1px solid #d7b46a;border-radius:16px;">
          <tr>
            <td style="padding:18px 20px;">
              <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;line-height:1.25;font-weight:700;">${emailValue(list.title)}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                ${rows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  const mediaLinksHtml = mediaLinks.length
    ? `<tr>
      <td style="padding:0 22px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf1;border:1px solid #d7b46a;border-radius:16px;">
          <tr>
            <td style="padding:18px 20px;">
              <div style="font-family:Georgia,'Times New Roman',serif;color:#9a6815;font-size:17px;line-height:1.25;font-weight:700;">Media links</div>
              ${mediaLinksButtonListHtml(mediaLinks)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  const accentColor = isUrgent ? "#d84a3f" : "#b98524";
  const ctaLabel = parsed.actionLabel || "Open Snuggle Stay";
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f1e8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e8;padding:16px 6px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffaf1;border-radius:20px;overflow:hidden;border:1px solid #d7b46a;box-shadow:0 20px 60px rgba(17,17,17,0.16);">
            <tr>
              <td style="background:#050505;padding:22px 20px 20px;border-bottom:4px solid ${accentColor};text-align:center;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding-bottom:12px;">
                      <img src="${escapeHtml(logoUrl)}" width="84" alt="Central Texas Husky trophy logo" style="display:block;width:84px;max-width:84px;height:auto;margin:0 auto;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center">
                      <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.08;letter-spacing:2.5px;color:#fff8dd;text-transform:uppercase;font-weight:700;">
                        CENTRAL<br>TEXAS HUSKY
                      </div>
                      <div style="margin-top:10px;color:#d2a13a;font-size:12px;line-height:1.4;letter-spacing:3px;text-transform:uppercase;font-weight:700;">
                        BOARDING &amp; SERVICES
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 20px 8px;">
                <span style="display:inline-block;border:1px solid #dec58d;border-radius:999px;padding:7px 18px;color:#9a6815;text-transform:uppercase;letter-spacing:1.6px;font-size:12px;font-weight:800;background:#fffaf1;">
                  ${escapeHtml(audienceLabel)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 22px 24px;text-align:center;">
                <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.22;color:#111111;">
                  ${escapeHtml(title)}
                </h1>
                <div style="margin:12px auto 16px;width:128px;border-top:1px solid #c6932f;"></div>
                <p style="margin:0;font-size:15px;line-height:1.55;color:#344054;">
                  ${introText}
                </p>
              </td>
            </tr>
            ${detailCardHtml}
            ${listsHtml}
            ${mediaLinksHtml}
            <tr>
              <td align="center" style="padding:0 22px 28px;">
                <a href="${escapeHtml(parsed.actionUrl)}" style="display:block;background:#c9962f;background:linear-gradient(180deg,#f0c76c,#b98524);border:1px solid #8a5c14;border-radius:12px;color:#111111;text-decoration:none;font-size:17px;font-weight:800;padding:15px 20px;box-shadow:0 8px 18px rgba(185,133,36,0.22);">
                  ${escapeHtml(ctaLabel)}
                </a>
                <p style="margin:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;color:#344054;">
                  &mdash; Central Texas Husky Team &mdash;
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#050505;border-top:4px solid ${accentColor};padding:18px;text-align:center;">
                <p style="margin:0;color:#d2a13a;font-size:11px;line-height:1.5;letter-spacing:1.8px;text-transform:uppercase;">
                  Central Texas Husky &middot; Boarding &amp; Services
                </p>
              </td>
            </tr>
          </table>
          <p style="max-width:600px;margin:12px auto 0;color:#8a7d67;font-size:11px;line-height:1.5;text-align:center;">
            This is an automated notification from the Central Texas Husky boarding app.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    logoUrl,
    subject: title,
    template: "premium_notification_universal",
    text: options.body,
  };
}

function notificationFallbackFields(eventName: string, sourceRecord: Record<string, unknown>, notificationId = ""): Record<string, unknown> {
  const stay = firstStay(sourceRecord);
  const sourceType = String(sourceRecord.type || "").trim();
  const sourceId = String(sourceRecord.id || "").trim();
  const dogName = String(sourceRecord.dogName || "").trim();
  const ownerName = String(sourceRecord.ownerName || sourceRecord.ownerEmail || sourceRecord.customerEmail || "A customer").trim();
  const stayId = stayRequestCode(sourceRecord, stay);
  if (eventName === "serviceRequestReadyForPickup") {
    return {
      id: notificationId,
      type: "notificationLog",
      eventName,
      sourceType: "boardingDog",
      sourceId,
      sourceSnapshot: sourceRecord,
      title: `Ready for pickup: ${dogName || "Customer dog"}`,
      message: `${dogName || "Your dog"} is ready for pickup${stayId ? ` (Stay ID: ${stayId})` : ""}.`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceEmails: customerEmailsForRecord(sourceRecord),
      alertCategory: "Boarding",
      alertReason: "Service request ready for pickup",
      dogName,
      ownerName,
      stayId,
      actionLabel: "Open Request",
      actionTarget: {
        eventName,
        sourceType: "boardingDog",
        sourceId,
        stayId,
        requestCode: stayId,
      },
      readBy: [],
    };
  }
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    const action = eventName.endsWith("Updated") ? "updated" : "submitted";
    const schedule = stayScheduleText(stay);
    return {
      id: notificationId,
      type: "notificationLog",
      eventName,
      sourceType: "boardingDog",
      sourceId,
      sourceSnapshot: sourceRecord,
      title: `Boarding request needs approval: ${dogName || "Customer dog"}`,
      message: `${ownerName} ${action} a boarding request${dogName ? ` for ${dogName}` : ""}${schedule ? ` for ${schedule}` : ""}. Open this alert to approve or decline the request.`,
      priority: "normal",
      channels: ["email", "inApp"],
      audienceRoles: ["admin"],
      alertCategory: "Boarding",
      alertReason: eventName.endsWith("Updated") ? "Boarding request updated" : "Boarding request needs approval",
      dogName,
      ownerName,
      stayId,
      actionLabel: "Review Request",
      actionTarget: {
        eventName,
        sourceType: "boardingDog",
        sourceId,
        stayId,
        requestCode: stayId,
      },
      readBy: [],
    };
  }
  return {
    id: notificationId,
    type: "notificationLog",
    eventName,
    sourceType,
    sourceId,
    sourceSnapshot: sourceRecord,
  };
}

function hydrateNotificationPayload(
  existingPayload: Record<string, unknown>,
  eventName: string,
  sourceRecord: Record<string, unknown>,
  notificationId = "",
) {
  const fallback = notificationFallbackFields(eventName, sourceRecord, notificationId);
  return {
    ...fallback,
    ...existingPayload,
    id: notificationId,
    type: "notificationLog",
    eventName: String(existingPayload.eventName || fallback.eventName || eventName),
    sourceType: String(existingPayload.sourceType || fallback.sourceType || ""),
    sourceId: String(existingPayload.sourceId || fallback.sourceId || ""),
    sourceSnapshot: existingPayload.sourceSnapshot && typeof existingPayload.sourceSnapshot === "object"
      ? existingPayload.sourceSnapshot
      : fallback.sourceSnapshot,
    title: notificationTextIsSpecific(existingPayload.title) ? existingPayload.title : fallback.title,
    message: notificationTextIsSpecific(existingPayload.message) ? existingPayload.message : fallback.message,
    alertCategory: existingPayload.alertCategory || fallback.alertCategory,
    alertReason: existingPayload.alertReason || fallback.alertReason,
    actionLabel: existingPayload.actionLabel || fallback.actionLabel,
    actionTarget: existingPayload.actionTarget || fallback.actionTarget,
    dogName: existingPayload.dogName || fallback.dogName,
    ownerName: existingPayload.ownerName || fallback.ownerName,
    stayId: existingPayload.stayId || fallback.stayId,
    readBy: Array.isArray(existingPayload.readBy) ? existingPayload.readBy : fallback.readBy,
  };
}

async function notificationContent(adminClient: ReturnType<typeof createClient>, eventName: string, record: Record<string, unknown>, notification: Record<string, unknown> = {}) {
  const stay = notificationTargetStay(record, notification, eventName);
  const audienceEmails = await notificationAudienceEmails(adminClient, eventName, record, notification);
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    const action = eventName.endsWith("Updated") ? "updated" : "submitted";
    const media = await recordMediaLines(adminClient, record);
    const requestType = requestTypeLabel(record, stay);
    const serviceLines = requestServiceLines(record, stay);
    const adminTo = audienceEmails.length ? audienceEmails : adminEmails();
    const customerTo = customerEmailsForRecord(record);
    const customerSchedule = stayScheduleEmailText(stay);
    const estimatedTotal = formatEmailMoneyText(record.estimatedTotal || stay.estimatedTotal || "");
    const dogName = String(record.dogName || "Customer dog");
    const adminRendered = renderAdminBoardingRequestEmail(record, stay, {
      action,
      requestType,
      serviceLines,
      mediaLines: media,
    });
    console.log("admin_boarding_email_template_rendered", {
      template: adminRendered.template,
      hasLogoUrl: Boolean(adminRendered.logoUrl),
      recipientCount: adminTo.length,
    });
    const customerBody = [
      `We received your ${requestType}${dogName ? ` for ${dogName}` : ""}.`,
      "",
      customerSchedule ? `Requested time: ${customerSchedule}` : "",
      serviceLines.length ? "Requested services:" : "",
      ...serviceLines.map((line) => `- ${line}`),
      `Estimated total: ${estimatedTotal}`,
      `Notes: ${stay.stayNotes || ""}`,
      "",
      "Our team will review the request and follow up after it is approved or if we need more details.",
      `Open your requests: ${appLink("#customerRequestsPage")}`,
    ].filter(Boolean).join("\n");
    const emails = [
      {
        audience: "admin",
        to: adminTo,
        subject: adminRendered.subject,
        body: adminRendered.text,
        html: adminRendered.html,
        template: adminRendered.template,
      },
      ...(customerTo.length
        ? [{ audience: "customer", to: customerTo, subject: `We received your ${requestType}: ${dogName}`, body: customerBody }]
        : []),
    ];
    return {
      emails,
      subject: emails[0].subject,
      body: emails[0].body,
      priority: "normal",
      to: adminTo,
      sms: false,
    };
  }
  if (eventName === "customerApprovedStayCancelled") {
    const requestType = requestTypeLabel(record, stay);
    const schedule = stayScheduleEmailText(stay);
    const reason = latestCustomerCancellationReason(record, stay);
    return {
      subject: `Approved ${requestType} cancelled: ${record.dogName || "Customer dog"}`,
      body: [
        `A customer cancelled an approved ${requestType}.`,
        "",
        `Dog: ${record.dogName || ""}`,
        `Owner: ${record.ownerName || record.ownerEmail || ""}`,
        `Email: ${record.ownerEmail || record.customerEmail || record.requestedByEmail || ""}`,
        `Phone: ${record.ownerPhone || record.customerPhone || ""}`,
        schedule ? `Requested time: ${schedule}` : "",
        reason ? `Customer reason: ${reason}` : "",
        "",
        `Open stay: ${appLink("#boardingDogsPage")}`,
      ].filter(Boolean).join("\n"),
      priority: "review",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: false,
    };
  }
  if (
    eventName === "boardingCustomerRequestApproved"
    || eventName === "boardingCustomerRequestDeclined"
    || eventName === "boardingCustomerRequestCancelled"
    || eventName === "boardingCustomerRequestUpdatedByStaff"
  ) {
    const label = customerStatusLabel(eventName);
    const requestType = requestTypeLabel(record, stay);
    const serviceLines = requestServiceLines(record, stay);
    const schedule = stayScheduleEmailText(stay);
    const reason = label === "declined" || label === "cancelled" ? declineNoteText(record, stay) : "";
    const estimatedTotal = formatEmailMoneyText(record.estimatedTotal || stay.estimatedTotal || "");
    return {
      subject: `Your ${requestType} was ${label}: ${record.dogName || "Customer dog"}`,
      body: [
        `Your ${requestType}${record.dogName ? ` for ${record.dogName}` : ""} was ${label}.`,
        "",
        schedule ? `Requested time: ${schedule}` : "",
        serviceLines.length ? "Requested services:" : "",
        ...serviceLines.map((line) => `- ${line}`),
        reason ? `Reason: ${reason}` : "",
        `Estimated total: ${estimatedTotal}`,
        "",
        `Open your requests: ${appLink("#customerRequestsPage")}`,
      ].filter(Boolean).join("\n"),
      priority: label === "approved" ? "normal" : "review",
      to: customerEmailsForRecord(record),
      sms: false,
    };
  }
  if (eventName === "serviceRequestReadyForPickup") {
    const requestCode = stayRequestCode(record, stay);
    const serviceLines = requestServiceLines(record, stay);
    const schedule = stayScheduleEmailText(stay);
    return {
      subject: `${record.dogName || "Your dog"} is ready for pickup`,
      body: [
        `Good news, ${record.dogName || "your dog"} is ready for pickup.`,
        "",
        requestCode ? `Stay ID: ${requestCode}` : "",
        schedule ? `Requested time: ${schedule}` : "",
        serviceLines.length ? "Services:" : "",
        ...serviceLines.map((line) => `- ${line}`),
        "",
        "Please come by when you are ready. Reply or contact Central Texas Husky if you need to coordinate pickup details.",
        `Open your requests: ${appLink("#customerRequestsPage")}`,
      ].filter(Boolean).join("\n"),
      priority: "normal",
      to: customerStayAudienceEmails(record, notification),
      sms: false,
    };
  }
  if (eventName === "customerDogFileUploaded") {
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `Customer file uploaded: ${record.dogName || "Customer dog"}`,
      body: [
        "A customer uploaded a file to a dog profile.",
        "",
        `Dog: ${record.dogName || ""}`,
        `Owner: ${record.ownerName || record.ownerEmail || record.customerEmail || ""}`,
        `Files: ${record.vaccinationFiles || (record.profilePhotoUrl ? "Profile photo" : "Uploaded file")}`,
        ...(media.length ? ["", "File links:", ...media.map(mediaPlainTextLine)] : []),
        "",
        `Review uploaded files: ${appLink("#boardingDogsPage")}`,
      ].join("\n"),
      priority: "review",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: false,
    };
  }
  if (eventName === "careLogAdminAlertCreated") {
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `Medical/behavior alert: ${record.dogName || "Our dog"}`,
      body: [
        "A medical/behavior care note needs admin attention.",
        "",
        `Dog: ${record.dogName || ""}`,
        `Date: ${record.date || record.dailyReportDate || ""}`,
        `Logged by: ${record.completedBy || record.completedEmail || ""}`,
        `Note: ${record.note || ""}`,
        ...(media.length ? ["", "Media links:", ...media.map(mediaPlainTextLine)] : []),
        "",
        `Review daily care log: ${appLink("#dailyPage")}`,
      ].join("\n"),
      priority: "review",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: false,
    };
  }
  if (eventName === "kennelRequestCreated") {
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `New kennel request: ${record.category || "Request"}`,
      body: [
        "A staff kennel request was submitted.",
        "",
        `Requested by: ${record.requestedBy || record.requestedByEmail || ""}`,
        `Category: ${record.category || ""}`,
        `Request: ${record.requestText || ""}`,
        `Reason: ${record.reason || ""}`,
        ...(media.length ? ["", "Media links:", ...media.map(mediaPlainTextLine)] : []),
        "",
        `Review request: ${appLink("#requestsPage")}`,
      ].join("\n"),
      priority: "review",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: false,
    };
  }
  if (eventName === "urgentKennelRequestCreated") {
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `Urgent kennel request: ${record.category || "Request"}`,
      body: [
        "An urgent kennel request was submitted.",
        "",
        `Requested by: ${record.requestedBy || record.requestedByEmail || ""}`,
        `Category: ${record.category || ""}`,
        `Request: ${record.requestText || ""}`,
        `Reason: ${record.reason || ""}`,
        ...(media.length ? ["", "Media links:", ...media.map(mediaPlainTextLine)] : []),
        "",
        `Review request: ${appLink("#requestsPage")}`,
      ].join("\n"),
      priority: "urgent",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: true,
    };
  }
  if (eventName === "maintenanceCreated") {
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `New maintenance: ${record.location || "Kennel"}`,
      body: [
        "A maintenance item was submitted.",
        "",
        `Reported by: ${record.reportedBy || record.reportedByEmail || ""}`,
        `Location: ${record.location || ""}`,
        `Issue: ${record.issue || ""}`,
        `Suggested action: ${record.suggestedAction || ""}`,
        `Files: ${record.mediaFiles || ""}`,
        ...(media.length ? ["", "Media links:", ...media.map(mediaPlainTextLine)] : []),
        "",
        `Review request: ${appLink("#maintenancePage")}`,
      ].join("\n"),
      priority: "review",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: false,
    };
  }
  if (eventName === "urgentMaintenanceCreated") {
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `Urgent maintenance: ${record.location || "Kennel"}`,
      body: [
        "An urgent maintenance item was submitted.",
        "",
        `Reported by: ${record.reportedBy || record.reportedByEmail || ""}`,
        `Location: ${record.location || ""}`,
        `Issue: ${record.issue || ""}`,
        `Suggested action: ${record.suggestedAction || ""}`,
        `Files: ${record.mediaFiles || ""}`,
        ...(media.length ? ["", "Media links:", ...media.map(mediaPlainTextLine)] : []),
        "",
        `Review request: ${appLink("#maintenancePage")}`,
      ].join("\n"),
      priority: "urgent",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: true,
    };
  }
  if (eventName === "timeOffRequested") {
    return {
      subject: `Time off request: ${record.staffName || "Staff"}`,
      body: [
        "A staff time off request needs review.",
        "",
        `Staff: ${record.staffName || record.staffEmail || ""}`,
        `Dates: ${record.startDate || ""}${record.endDate && record.endDate !== record.startDate ? ` to ${record.endDate}` : ""}`,
        `Reason: ${record.reason || ""}`,
        "",
        `Review request: ${appLink("#timesheetPage")}`,
      ].join("\n"),
      priority: "review",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: false,
    };
  }
  if (eventName === "timeOffReviewed") {
    return {
      subject: `Time off ${String(record.status || "reviewed").toLowerCase()}: ${record.startDate || ""}`,
      body: [
        `Your time off request was ${String(record.status || "reviewed").toLowerCase()}.`,
        "",
        `Dates: ${record.startDate || ""}${record.endDate && record.endDate !== record.startDate ? ` to ${record.endDate}` : ""}`,
        `Reviewed by: ${record.reviewedBy || ""}`,
        `Note: ${record.reviewNote || ""}`,
        "",
        `Open schedule: ${appLink("#timesheetPage")}`,
      ].join("\n"),
      priority: "normal",
      to: audienceEmails.length ? audienceEmails : [String(record.staffEmail || "")].filter(Boolean),
      sms: false,
    };
  }
  if (eventName === "schedulePublished" || eventName === "scheduleChangedAfterPublish") {
    return {
      subject: eventName === "schedulePublished" ? "Kennel schedule published" : "Kennel schedule changed",
      body: [
        eventName === "schedulePublished" ? "The kennel schedule has been published." : "A published kennel schedule was changed.",
        "",
        `Week: ${record.weekStart || record.date || ""}${record.weekEnd ? ` to ${record.weekEnd}` : ""}`,
        `Staff: ${record.staffName || ""}`,
        `Shift: ${record.startTime || ""}${record.endTime ? ` to ${record.endTime}` : ""}`,
        "",
        `View schedule: ${appLink("#timesheetPage")}`,
      ].join("\n"),
      priority: "normal",
      to: audienceEmails.length ? audienceEmails : record.staffEmail ? [String(record.staffEmail)] : adminEmails(),
      sms: false,
    };
  }
  if (eventName === "urgentStaffAlertSent" || eventName === "urgentCustomerAlertSent") {
    const isCustomer = eventName === "urgentCustomerAlertSent";
    return {
      subject: isCustomer ? "Urgent customer alert" : "Urgent staff alert",
      body: [
        isCustomer ? "An urgent customer alert was sent from Snuggle Stay." : "An urgent staff alert was sent from Snuggle Stay.",
        "",
        String(record.message || ""),
        "",
        `Sent by: ${record.submittedBy || record.submittedByEmail || ""}`,
        `Open Snuggle Stay: ${appLink(isCustomer ? "#customerPage" : "#dashboardPage")}`,
      ].join("\n"),
      priority: "urgent",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
      sms: !isCustomer,
    };
  }
  if (eventName === "customerStayUpdateSent") {
    const update = (record.latestCustomerUpdate && typeof record.latestCustomerUpdate === "object" ? record.latestCustomerUpdate : {}) as Record<string, unknown>;
    const requestCode = String(update.requestCode || "").trim();
    const stayLabel = String(update.stayLabel || "").trim();
    const media = await mediaLines(adminClient, arrayValue(update.mediaItems));
    const subject = `Stay update: ${record.dogName || update.dogName || "Your dog"}${requestCode ? ` (${requestCode})` : ""}`;
    const body = [
      "Central Texas Husky sent a stay update.",
      "",
      `Dog: ${record.dogName || update.dogName || ""}`,
      requestCode ? `Stay ID: ${requestCode}` : "",
      stayLabel ? `Stay: ${stayLabel}` : "",
      `Update: ${update.note || record.dailyActivity || ""}`,
      ...(media.length ? ["", "Photo/video links:", ...media.map(mediaPlainTextLine)] : []),
      "",
      `Open updates: ${appLink("#customerUpdatesPage")}`,
    ].filter(Boolean).join("\n");
    const rendered = renderPremiumTextEmail({
      audience: "Customer",
      body,
      mediaLinks: media,
      priority: "normal",
      subject,
    });
    return {
      subject,
      body,
      html: rendered.html,
      priority: "normal",
      template: rendered.template,
      to: customerStayAudienceEmails(record, notification),
      sms: false,
    };
  }
  return null;
}

type EmailSendOptions = {
  html?: string;
  replyTo?: string;
  template?: string;
};

async function sendEmail(to: string[], subject: string, body: string, options: EmailSendOptions = {}) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("ALERT_FROM_EMAIL") || "";
  if (!apiKey || !from || !to.length) return { skipped: true, reason: "Email provider secrets are missing." };
  try {
    const payload: Record<string, unknown> = { from, to, subject, text: body };
    if (options.html) payload.html = options.html;
    if (options.replyTo) payload.reply_to = options.replyTo;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_error) {
      data = text;
    }
    if (!response.ok) {
      console.error("email_provider_failed", {
        provider: "resend",
        status: response.status,
        template: options.template || "plain_text",
        reason: text.slice(0, 1000),
      });
      return { failed: true, status: response.status, reason: `Resend failed: ${text}` };
    }
    return { ok: true, status: response.status, data };
  } catch (error) {
    return { failed: true, reason: error instanceof Error ? error.message : String(error) };
  }
}

function emailResultStatus(result: unknown, key: "skipped" | "failed") {
  const value = result && typeof result === "object" ? (result as Record<string, unknown>)[key] : false;
  return Boolean(value);
}

function summarizeEmailResults(results: Record<string, unknown>[]) {
  if (results.length === 1) return results[0].result || {};
  return {
    messages: results,
    skipped: results.length > 0 && results.every((item) => emailResultStatus(item.result, "skipped")),
    failed: results.some((item) => emailResultStatus(item.result, "failed")),
    sentCount: results.filter((item) => !emailResultStatus(item.result, "skipped") && !emailResultStatus(item.result, "failed")).length,
  };
}

async function sendSms(message: string) {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const from = Deno.env.get("TWILIO_FROM_NUMBER") || "";
  const toNumbers = splitEnv("ADMIN_ALERT_PHONES");
  if (!accountSid || !authToken || !from || !toNumbers.length) return { skipped: true, reason: "SMS provider secrets are missing." };
  const results = [];
  for (const to of toNumbers) {
    const params = new URLSearchParams({ To: to, From: from, Body: message.slice(0, 300) });
    try {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      const text = await response.text();
      let data: unknown = text;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (_error) {
        data = text;
      }
      results.push(response.ok ? { ok: true, to, data } : { failed: true, to, status: response.status, reason: `Twilio failed: ${text}` });
    } catch (error) {
      results.push({ failed: true, to, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return {
    messages: results,
    failed: results.some((item) => Boolean(item.failed)),
    sentCount: results.filter((item) => !item.failed).length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405, req);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Supabase function secrets are missing." }, 500, req);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user?.email) return json({ error: "Login required." }, 401, req);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = await req.json().catch(() => ({})) as NotifyBody;
  const isStaff = await callerIsStaff(adminClient, user.email);

  if (String(body.type || "") === "template_test" && String(body.audience || "") === "admin") {
    if (!isStaff) return json({ error: "Only staff can send this template test." }, 403, req);
    const sampleRecord: Record<string, unknown> = {
      id: "template-test",
      type: "boardingDog",
      dogName: "Luna",
      ownerName: "John Smith",
      ownerEmail: "john.smith@email.com",
      ownerPhone: "(512) 555-1234",
      estimatedTotal: 100,
    };
    const sampleStay: Record<string, unknown> = {
      id: "template-test",
      requestCode: "template-test",
      requestedDropoffTime: "2025-06-20T10:00:00-05:00",
      requestedPickupTime: "2025-06-24T10:00:00-05:00",
      stayNotes: "Looking forward to boarding Luna!",
      requests: [{ serviceName: "Full Premium Bath", quantity: 1 }],
    };
    const rendered = renderAdminBoardingRequestEmail(sampleRecord, sampleStay, {
      action: "submitted",
      requestType: "boarding request",
      serviceLines: ["1 x Full Premium Bath requested"],
    });
    const to = adminEmails();
    console.log("admin_boarding_email_template_rendered", {
      template: rendered.template,
      hasLogoUrl: Boolean(rendered.logoUrl),
      recipientCount: to.length,
    });
    const providerStatus = await sendEmail(to, rendered.subject, rendered.text, {
      html: rendered.html,
      template: rendered.template,
    });
    const providerResult = providerStatus as Record<string, unknown>;
    return json({
      ok: !Boolean(providerResult.failed) && !Boolean(providerResult.skipped),
      template: rendered.template,
      providerStatus,
    }, 200, req);
  }

  const eventName = String(body.eventName || "");
  const recordId = String(body.recordId || "");
  if (!eventName || !recordId) return json({ error: "eventName and recordId are required." }, 400, req);

  const { data: sourceRow, error: sourceError } = await adminClient
    .from("kennel_records")
    .select("id,type,payload,submitted_at,updated_at")
    .eq("id", recordId)
    .maybeSingle();
  if (sourceError) return json({ error: sourceError.message }, 500, req);
  if (!sourceRow?.payload || typeof sourceRow.payload !== "object") return json({ error: "Source record not found." }, 404, req);

  const sourceRecord = {
    ...(sourceRow.payload as Record<string, unknown>),
    id: sourceRow.id,
    type: sourceRow.type,
    submittedAt: (sourceRow as Record<string, unknown>).submitted_at || (sourceRow.payload as Record<string, unknown>).submittedAt || "",
    updatedAt: (sourceRow as Record<string, unknown>).updated_at || (sourceRow.payload as Record<string, unknown>).updatedAt || "",
  };
  if (!isStaff && !recordHasEmail(sourceRecord, user.email)) {
    return json({ error: "Not authorized for this notification source." }, 403, req);
  }
  const staffOnlyCustomerEvents = new Set([
    "customerStayUpdateSent",
    "boardingCustomerRequestApproved",
    "boardingCustomerRequestDeclined",
    "boardingCustomerRequestCancelled",
    "boardingCustomerRequestUpdatedByStaff",
    "serviceRequestReadyForPickup",
  ]);
  if (staffOnlyCustomerEvents.has(eventName) && !isStaff) {
    return json({ error: "Only staff can send this customer notification." }, 403, req);
  }

  let notificationPayload: Record<string, unknown> = {};
  if (body.notificationId) {
    const { data } = await adminClient.from("kennel_records").select("payload").eq("id", body.notificationId).maybeSingle();
    notificationPayload = (data?.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, unknown>;
  }

  const content = await notificationContent(adminClient, eventName, sourceRecord, notificationPayload);
  if (!content) return json({ error: "Unsupported notification event." }, 400, req);

  const emailMessages = Array.isArray((content as Record<string, unknown>).emails)
    ? ((content as Record<string, unknown>).emails as Record<string, unknown>[])
    : [{
        audience: "default",
        to: content.to,
        subject: content.subject,
        body: content.body,
        html: (content as Record<string, unknown>).html,
        template: (content as Record<string, unknown>).template,
      }];
  const emailResults: Record<string, unknown>[] = [];
  for (const message of emailMessages) {
    const messageSubject = String(message.subject || content.subject || "Snuggle Stay alert");
    const messageBody = String(message.body || content.body || "");
    const renderedFallback = typeof message.html === "string"
      ? null
      : renderPremiumTextEmail({
          audience: message.audience || "default",
          body: messageBody,
          priority: content.priority,
          subject: messageSubject,
        });
    const messageHtml = typeof message.html === "string" ? message.html : renderedFallback?.html;
    const messageTemplate = typeof message.template === "string" ? message.template : renderedFallback?.template;
    const result = await sendEmail(
      uniqueEmails(Array.isArray(message.to) ? message.to : [message.to]),
      messageSubject,
      messageBody,
      {
        html: messageHtml,
        template: messageTemplate,
      },
    );
    emailResults.push({
      audience: message.audience || "default",
      to: uniqueEmails(Array.isArray(message.to) ? message.to : [message.to]),
      result,
    });
  }
  const emailResult = summarizeEmailResults(emailResults);
  const smsResult = content.sms ? await sendSms(`${content.subject}: ${String(sourceRecord.dogName || sourceRecord.location || sourceRecord.category || "")}. ${appUrl()}`) : { skipped: true };
  const emailSkipped = Boolean((emailResult as Record<string, unknown>)?.skipped);
  const emailFailed = Boolean((emailResult as Record<string, unknown>)?.failed);
  const smsSkipped = Boolean((smsResult as Record<string, unknown>)?.skipped);
  const smsFailed = Boolean((smsResult as Record<string, unknown>)?.failed);
  const deliveryStatus = emailFailed
    ? (content.sms && !smsSkipped && !smsFailed ? "sms sent; email failed" : "failed")
    : emailSkipped
    ? (content.sms && !smsSkipped && !smsFailed ? "sms sent; email skipped" : "skipped")
    : "sent";

  if (body.notificationId) {
    const existingPayload = hydrateNotificationPayload(notificationPayload, eventName, sourceRecord, body.notificationId);
    const now = new Date().toISOString();
    await adminClient.from("kennel_records").upsert({
      id: body.notificationId,
      type: "notificationLog",
      payload: {
        ...existingPayload,
        id: body.notificationId,
        type: "notificationLog",
        updatedAt: now,
        deliveryStatus,
        emailResult,
        smsResult,
        sentAt: now,
      },
      helper_email: user.email,
      user_id: user.id,
      submitted_at: String(existingPayload.submittedAt || now),
      updated_at: now,
    });
  }

  return json({ ok: true, eventName, emailResult, smsResult }, 200, req);
});
