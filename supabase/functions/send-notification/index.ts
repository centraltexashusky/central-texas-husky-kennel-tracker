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
  eventName?: string;
  recordId?: string;
  notificationId?: string;
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

function appUrl() {
  return Deno.env.get("APP_PRODUCTION_URL") || "https://kennel.centraltexashusky.com/";
}

function appLink(hash = "") {
  const base = appUrl().replace(/#.*$/, "").replace(/\/?$/, "/");
  return hash ? `${base}${hash.startsWith("#") ? hash : `#${hash}`}` : base;
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

async function mediaLines(adminClient: ReturnType<typeof createClient>, mediaItems: unknown[]) {
  const lines: string[] = [];
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
    lines.push(`${mediaLabel(item, index)}: ${url}`);
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

function stayScheduleText(stay: Record<string, unknown>) {
  const dropoff = String(stay.dropoffTime || stay.requestedDropoffTime || "").trim();
  const pickup = String(stay.pickupTime || stay.requestedPickupTime || "").trim();
  if (dropoff && pickup) return `${dropoff} to ${pickup}`;
  return dropoff || pickup || "";
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

function notificationFallbackFields(eventName: string, sourceRecord: Record<string, unknown>, notificationId = ""): Record<string, unknown> {
  const stay = firstStay(sourceRecord);
  const sourceType = String(sourceRecord.type || "").trim();
  const sourceId = String(sourceRecord.id || "").trim();
  const dogName = String(sourceRecord.dogName || "").trim();
  const ownerName = String(sourceRecord.ownerName || sourceRecord.ownerEmail || sourceRecord.customerEmail || "A customer").trim();
  const stayId = stayRequestCode(sourceRecord, stay);
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
  const stay = firstStay(record);
  const audienceEmails = recordAudienceEmails(notification).length ? recordAudienceEmails(notification) : recordAudienceEmails(record);
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    const action = eventName.endsWith("Updated") ? "updated" : "submitted";
    const media = await recordMediaLines(adminClient, record);
    const requestType = requestTypeLabel(record, stay);
    const serviceLines = requestServiceLines(record, stay);
    const adminTo = audienceEmails.length ? audienceEmails : adminEmails();
    const customerTo = customerEmailsForRecord(record);
    const schedule = stayScheduleText(stay);
    const dogName = String(record.dogName || "Customer dog");
    const adminBody = [
      `A customer ${requestType} was ${action}.`,
      "",
      `Dog: ${dogName}`,
      `Owner: ${record.ownerName || record.ownerEmail || ""}`,
      `Email: ${record.ownerEmail || record.customerEmail || record.requestedByEmail || ""}`,
      `Phone: ${record.ownerPhone || record.customerPhone || ""}`,
      schedule ? `Requested time: ${schedule}` : "",
      serviceLines.length ? "Requested services:" : "",
      ...serviceLines.map((line) => `- ${line}`),
      `Estimated total: ${record.estimatedTotal || stay.estimatedTotal || ""}`,
      `Notes: ${stay.stayNotes || ""}`,
      ...(media.length ? ["", "Media links:", ...media] : []),
      "",
      `Review request: ${appLink("#boardingDogsPage")}`,
    ].filter(Boolean).join("\n");
    const customerBody = [
      `We received your ${requestType}${dogName ? ` for ${dogName}` : ""}.`,
      "",
      schedule ? `Requested time: ${schedule}` : "",
      serviceLines.length ? "Requested services:" : "",
      ...serviceLines.map((line) => `- ${line}`),
      `Estimated total: ${record.estimatedTotal || stay.estimatedTotal || ""}`,
      `Notes: ${stay.stayNotes || ""}`,
      "",
      "Our team will review the request and follow up after it is approved or if we need more details.",
      `Open your requests: ${appLink("#customerRequestsPage")}`,
    ].filter(Boolean).join("\n");
    const emails = [
      { audience: "admin", to: adminTo, subject: `${eventName.endsWith("Updated") ? "Updated" : "New"} ${requestType}: ${dogName}`, body: adminBody },
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
    const schedule = stayScheduleText(stay);
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
    const schedule = stayScheduleText(stay);
    const reason = label === "declined" || label === "cancelled" ? declineNoteText(record, stay) : "";
    return {
      subject: `Your ${requestType} was ${label}: ${record.dogName || "Customer dog"}`,
      body: [
        `Your ${requestType}${record.dogName ? ` for ${record.dogName}` : ""} was ${label}.`,
        "",
        schedule ? `Requested time: ${schedule}` : "",
        serviceLines.length ? "Requested services:" : "",
        ...serviceLines.map((line) => `- ${line}`),
        reason ? `Reason: ${reason}` : "",
        `Estimated total: ${record.estimatedTotal || stay.estimatedTotal || ""}`,
        "",
        `Open your requests: ${appLink("#customerRequestsPage")}`,
      ].filter(Boolean).join("\n"),
      priority: label === "approved" ? "normal" : "review",
      to: customerEmailsForRecord(record),
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
        `Files: ${record.vaccinationFiles || record.profilePhotoUrl || "Uploaded file"}`,
        ...(media.length ? ["", "File links:", ...media] : []),
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
        ...(media.length ? ["", "Media links:", ...media] : []),
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
        ...(media.length ? ["", "Media links:", ...media] : []),
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
        ...(media.length ? ["", "Media links:", ...media] : []),
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
        ...(media.length ? ["", "Media links:", ...media] : []),
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
        ...(media.length ? ["", "Media links:", ...media] : []),
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
    return {
      subject: `Stay update: ${record.dogName || update.dogName || "Your dog"}${requestCode ? ` (${requestCode})` : ""}`,
      body: [
        "Central Texas Husky sent a stay update.",
        "",
        `Dog: ${record.dogName || update.dogName || ""}`,
        requestCode ? `Stay ID: ${requestCode}` : "",
        stayLabel ? `Stay: ${stayLabel}` : "",
        `Update: ${update.note || record.dailyActivity || ""}`,
        ...(media.length ? ["", "Photo/video links:", ...media] : []),
        "",
        `Open updates: ${appLink("#customerUpdatesPage")}`,
      ].filter(Boolean).join("\n"),
      priority: "normal",
      to: customerStayAudienceEmails(record, notification),
      sms: false,
    };
  }
  return null;
}

async function sendEmail(to: string[], subject: string, body: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY") || "";
  const from = Deno.env.get("ALERT_FROM_EMAIL") || "";
  if (!apiKey || !from || !to.length) return { skipped: true, reason: "Email provider secrets are missing." };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    const text = await response.text();
    let data: unknown = text;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_error) {
      data = text;
    }
    if (!response.ok) return { failed: true, status: response.status, reason: `Resend failed: ${text}` };
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

  const body = await req.json().catch(() => ({})) as NotifyBody;
  const eventName = String(body.eventName || "");
  const recordId = String(body.recordId || "");
  if (!eventName || !recordId) return json({ error: "eventName and recordId are required." }, 400, req);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
  const isStaff = await callerIsStaff(adminClient, user.email);
  if (!isStaff && !recordHasEmail(sourceRecord, user.email)) {
    return json({ error: "Not authorized for this notification source." }, 403, req);
  }
  const staffOnlyCustomerEvents = new Set([
    "customerStayUpdateSent",
    "boardingCustomerRequestApproved",
    "boardingCustomerRequestDeclined",
    "boardingCustomerRequestCancelled",
    "boardingCustomerRequestUpdatedByStaff",
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
    : [{ audience: "default", to: content.to, subject: content.subject, body: content.body }];
  const emailResults: Record<string, unknown>[] = [];
  for (const message of emailMessages) {
    const result = await sendEmail(
      uniqueEmails(Array.isArray(message.to) ? message.to : [message.to]),
      String(message.subject || content.subject || "Snuggle Stay alert"),
      String(message.body || content.body || ""),
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
