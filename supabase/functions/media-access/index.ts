import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MEDIA_BUCKET = "kennel-media";
const SIGNED_URL_SECONDS = 600;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MediaAccessBody = {
  storagePath?: string;
  recordId?: string;
  recordType?: string;
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
  return splitEnv("ADMIN_ALERT_EMAILS").length
    ? splitEnv("ADMIN_ALERT_EMAILS")
    : splitEnv("ADMIN_EMAILS").length
      ? splitEnv("ADMIN_EMAILS")
      : ["centraltexashusky@gmail.com"];
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

function recordAudienceHasEmail(record: Record<string, unknown>, email: string) {
  const target = normalizeEmail(email);
  if (!target || !Array.isArray(record.audienceEmails)) return false;
  return record.audienceEmails.some((value) => normalizeEmail(value) === target);
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

function safeStoragePath(value: unknown) {
  const path = String(value || "").trim();
  if (!path || path.includes("..") || path.startsWith("/") || !path.startsWith("users/")) return "";
  return path;
}

function storageOwnerUserId(path: string) {
  return path.split("/")[1] || "";
}

function payloadReferencesPath(payload: Record<string, unknown>, storagePath: string) {
  return JSON.stringify(payload).includes(storagePath);
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
  if (userError || !user?.email || !user?.id) return json({ error: "Login required." }, 401);

  const body = await req.json().catch(() => ({})) as MediaAccessBody;
  const storagePath = safeStoragePath(body.storagePath);
  if (!storagePath) return json({ error: "Valid storagePath is required." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const isStaff = await callerIsStaff(adminClient, user.email);
  let allowed = isStaff || storageOwnerUserId(storagePath) === user.id;

  if (!allowed && body.recordId) {
    const { data: sourceRow, error: sourceError } = await adminClient
      .from("kennel_records")
      .select("id,type,payload")
      .eq("id", String(body.recordId))
      .maybeSingle();
    if (sourceError) return json({ error: sourceError.message }, 500);
    const payload = (sourceRow?.payload && typeof sourceRow.payload === "object" ? sourceRow.payload : {}) as Record<string, unknown>;
    allowed = Boolean(
      sourceRow
        && (!body.recordType || sourceRow.type === body.recordType)
        && payloadReferencesPath(payload, storagePath)
        && (recordHasEmail(payload, user.email) || recordAudienceHasEmail(payload, user.email)),
    );
  }

  if (!allowed) return json({ error: "Not authorized for this file." }, 403);

  const { data, error } = await adminClient.storage.from(MEDIA_BUCKET).createSignedUrl(storagePath, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) return json({ error: error?.message || "Could not create a signed media URL." }, 500);
  return json({ signedUrl: data.signedUrl, expiresIn: SIGNED_URL_SECONDS });
});
