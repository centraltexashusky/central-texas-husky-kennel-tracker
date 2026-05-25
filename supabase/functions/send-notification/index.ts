import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotifyBody = {
  eventName?: string;
  recordId?: string;
  notificationId?: string;
};

const MEDIA_BUCKET = "kennel-media";
const DEFAULT_MEDIA_LINK_SECONDS = 7 * 24 * 60 * 60;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  return splitEnv("ADMIN_ALERT_EMAILS").length ? splitEnv("ADMIN_ALERT_EMAILS") : splitEnv("ADMIN_EMAILS").length ? splitEnv("ADMIN_EMAILS") : ["centraltexashusky@gmail.com"];
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
  if (adminEmails().map(normalizeEmail).includes(normalized) || normalized === "centraltexashusky@gmail.com" || normalized === "cthusky05@gmail.com") return true;
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

async function notificationContent(adminClient: ReturnType<typeof createClient>, eventName: string, record: Record<string, unknown>, notification: Record<string, unknown> = {}) {
  const stay = firstStay(record);
  const audienceEmails = recordAudienceEmails(notification).length ? recordAudienceEmails(notification) : recordAudienceEmails(record);
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    const action = eventName.endsWith("Updated") ? "updated" : "submitted";
    const media = await recordMediaLines(adminClient, record);
    return {
      subject: `${eventName.endsWith("Updated") ? "Updated" : "New"} boarding request: ${record.dogName || "Customer dog"}`,
      body: [
        `A customer boarding request was ${action}.`,
        "",
        `Dog: ${record.dogName || ""}`,
        `Owner: ${record.ownerName || record.ownerEmail || ""}`,
        `Stay: ${stay.dropoffTime || ""} to ${stay.pickupTime || ""}`,
        `Requested services: ${Array.isArray(record.requestedServices) ? record.requestedServices.map((item) => (typeof item === "object" ? (item as Record<string, unknown>).serviceName : item)).join(", ") : ""}`,
        `Estimated total: ${record.estimatedTotal || ""}`,
        `Notes: ${stay.stayNotes || ""}`,
        ...(media.length ? ["", "Media links:", ...media] : []),
        "",
        `Review request: ${appLink("#boardingDogsPage")}`,
      ].join("\n"),
      priority: "normal",
      to: audienceEmails.length ? audienceEmails : adminEmails(),
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
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text: body }),
  });
  if (!response.ok) throw new Error(`Resend failed: ${response.status} ${await response.text()}`);
  return await response.json();
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
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    if (!response.ok) throw new Error(`Twilio failed: ${response.status} ${await response.text()}`);
    results.push(await response.json());
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Supabase function secrets are missing." }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user?.email) return json({ error: "Login required." }, 401);

  const body = await req.json().catch(() => ({})) as NotifyBody;
  const eventName = String(body.eventName || "");
  const recordId = String(body.recordId || "");
  if (!eventName || !recordId) return json({ error: "eventName and recordId are required." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sourceRow, error: sourceError } = await adminClient
    .from("kennel_records")
    .select("id,type,payload")
    .eq("id", recordId)
    .maybeSingle();
  if (sourceError) return json({ error: sourceError.message }, 500);
  if (!sourceRow?.payload || typeof sourceRow.payload !== "object") return json({ error: "Source record not found." }, 404);

  const sourceRecord = {
    ...(sourceRow.payload as Record<string, unknown>),
    id: sourceRow.id,
    type: sourceRow.type,
  };
  const isStaff = await callerIsStaff(adminClient, user.email);
  if (!isStaff && !recordHasEmail(sourceRecord, user.email)) {
    return json({ error: "Not authorized for this notification source." }, 403);
  }
  if (eventName === "customerStayUpdateSent" && !isStaff) {
    return json({ error: "Only staff can send customer stay update notifications." }, 403);
  }

  let notificationPayload: Record<string, unknown> = {};
  if (body.notificationId) {
    const { data } = await adminClient.from("kennel_records").select("payload").eq("id", body.notificationId).maybeSingle();
    notificationPayload = (data?.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, unknown>;
  }

  const content = await notificationContent(adminClient, eventName, sourceRecord, notificationPayload);
  if (!content) return json({ error: "Unsupported notification event." }, 400);

  const emailResult = await sendEmail(uniqueEmails(content.to), content.subject, content.body);
  const smsResult = content.sms ? await sendSms(`${content.subject}: ${String(sourceRecord.dogName || sourceRecord.location || sourceRecord.category || "")}. ${appUrl()}`) : { skipped: true };
  const emailSkipped = Boolean((emailResult as Record<string, unknown>)?.skipped);
  const smsSkipped = Boolean((smsResult as Record<string, unknown>)?.skipped);
  const deliveryStatus = emailSkipped && (!content.sms || smsSkipped) ? "skipped" : "sent";

  if (body.notificationId) {
    const existingPayload = notificationPayload;
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

  return json({ ok: true, eventName, emailResult, smsResult });
});
