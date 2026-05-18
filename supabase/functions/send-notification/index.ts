import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotifyBody = {
  eventName?: string;
  recordId?: string;
  notificationId?: string;
  record?: Record<string, unknown>;
};

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

function adminEmails() {
  return splitEnv("ADMIN_ALERT_EMAILS").length ? splitEnv("ADMIN_ALERT_EMAILS") : splitEnv("ADMIN_EMAILS").length ? splitEnv("ADMIN_EMAILS") : ["centraltexashusky@gmail.com"];
}

function appUrl() {
  return Deno.env.get("APP_PRODUCTION_URL") || "https://kennel.centraltexashusky.com/";
}

function firstStay(record: Record<string, unknown>) {
  const stays = Array.isArray(record.stays) ? record.stays : [];
  return (stays[0] && typeof stays[0] === "object" ? stays[0] : {}) as Record<string, unknown>;
}

function notificationContent(eventName: string, record: Record<string, unknown>) {
  const stay = firstStay(record);
  if (eventName === "customerBoardingRequestCreated" || eventName === "customerBoardingRequestUpdated") {
    const action = eventName.endsWith("Updated") ? "updated" : "submitted";
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
        "",
        `Review request: ${appUrl()}`,
      ].join("\n"),
      priority: "normal",
      to: adminEmails(),
      sms: false,
    };
  }
  if (eventName === "customerDogFileUploaded") {
    return {
      subject: `Customer file uploaded: ${record.dogName || "Customer dog"}`,
      body: [
        "A customer uploaded a file to a dog profile.",
        "",
        `Dog: ${record.dogName || ""}`,
        `Owner: ${record.ownerName || record.ownerEmail || record.customerEmail || ""}`,
        `Files: ${record.vaccinationFiles || record.profilePhotoUrl || "Uploaded file"}`,
        "",
        `Review uploaded files: ${appUrl()}`,
      ].join("\n"),
      priority: "review",
      to: adminEmails(),
      sms: false,
    };
  }
  if (eventName === "urgentKennelRequestCreated") {
    return {
      subject: `Urgent kennel request: ${record.category || "Request"}`,
      body: [
        "An urgent kennel request was submitted.",
        "",
        `Requested by: ${record.requestedBy || record.requestedByEmail || ""}`,
        `Category: ${record.category || ""}`,
        `Request: ${record.requestText || ""}`,
        `Reason: ${record.reason || ""}`,
        "",
        `Review request: ${appUrl()}`,
      ].join("\n"),
      priority: "urgent",
      to: adminEmails(),
      sms: true,
    };
  }
  if (eventName === "urgentMaintenanceCreated") {
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
        "",
        `Review request: ${appUrl()}`,
      ].join("\n"),
      priority: "urgent",
      to: adminEmails(),
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
        `Review request: ${appUrl()}`,
      ].join("\n"),
      priority: "review",
      to: adminEmails(),
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
        `Open schedule: ${appUrl()}`,
      ].join("\n"),
      priority: "normal",
      to: [String(record.staffEmail || "")].filter(Boolean),
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
        `View schedule: ${appUrl()}`,
      ].join("\n"),
      priority: "normal",
      to: record.staffEmail ? [String(record.staffEmail)] : adminEmails(),
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
  const content = notificationContent(eventName, body.record || {});
  if (!content) return json({ error: "Unsupported notification event." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const emailResult = await sendEmail(content.to.map(normalizeEmail).filter(Boolean), content.subject, content.body);
  const smsResult = content.sms ? await sendSms(`${content.subject}: ${String(body.record?.dogName || body.record?.location || body.record?.category || "")}. ${appUrl()}`) : { skipped: true };
  const emailSkipped = Boolean((emailResult as Record<string, unknown>)?.skipped);
  const smsSkipped = Boolean((smsResult as Record<string, unknown>)?.skipped);
  const deliveryStatus = emailSkipped && (!content.sms || smsSkipped) ? "skipped" : "sent";

  if (body.notificationId) {
    const { data } = await adminClient.from("kennel_records").select("payload").eq("id", body.notificationId).maybeSingle();
    const existingPayload = (data?.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, unknown>;
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
