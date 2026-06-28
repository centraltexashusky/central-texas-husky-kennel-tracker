import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MEDIA_BUCKET = "kennel-media";
const SIGNED_URL_SECONDS = 600;
const PROFILE_THUMB_VARIANT = "profileThumb";
const PROFILE_THUMB_TRANSFORM = {
  width: 160,
  height: 160,
  resize: "cover" as const,
  quality: 70,
};
const ALLOWED_STORAGE_PREFIXES = [
  "users/",
  "dog-photos/",
  "vaccination-records/",
  "owned-dog-documents/",
  "boarding-dog-documents/",
  "care-notes/",
  "requests/",
  "maintenance/",
  "boarding-customer-updates/",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MediaAccessBody = {
  storagePath?: string;
  recordId?: string;
  recordType?: string;
  variant?: string;
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
  if (!path || path.includes("..") || path.startsWith("/") || !ALLOWED_STORAGE_PREFIXES.some((prefix) => path.startsWith(prefix))) return "";
  return path;
}

function storageOwnerUserId(path: string) {
  if (!path.startsWith("users/")) return "";
  return path.split("/")[1] || "";
}

function storagePathIsDogPhoto(path: string) {
  return path.startsWith("dog-photos/") || path.includes("/dog-photos/");
}

function signedUrlOptionsFor(body: MediaAccessBody, storagePath: string) {
  if (body.variant === PROFILE_THUMB_VARIANT && storagePathIsDogPhoto(storagePath)) {
    return { transform: PROFILE_THUMB_TRANSFORM };
  }
  return undefined;
}

function normalizeStoragePathReference(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return "";
  const direct = safeStoragePath(text);
  if (direct) return direct;

  try {
    const url = new URL(text);
    const objectMarker = "/storage/v1/object/";
    const signedMarker = "/storage/v1/object/sign/";
    const marker = url.pathname.includes(signedMarker) ? signedMarker : objectMarker;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return "";
    const afterMarker = url.pathname.slice(markerIndex + marker.length);
    const bucketPrefix = `${MEDIA_BUCKET}/`;
    const withoutBucket = afterMarker.startsWith(bucketPrefix) ? afterMarker.slice(bucketPrefix.length) : afterMarker;
    return safeStoragePath(decodeURIComponent(withoutBucket.split("?")[0] || ""));
  } catch {
    return "";
  }
}

function payloadReferencesExactPath(value: unknown, storagePath: string, depth = 0): boolean {
  if (!storagePath || depth > 8) return false;
  if (typeof value === "string") return normalizeStoragePathReference(value) === storagePath;
  if (Array.isArray(value)) return value.some((item) => payloadReferencesExactPath(item, storagePath, depth + 1));
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => payloadReferencesExactPath(item, storagePath, depth + 1));
  }
  return false;
}

function sourceRowIsTrustedMediaGrant(
  row: { id?: string; type?: string; user_id?: string; payload?: unknown } | null | undefined,
  user: { id: string; email?: string },
  storagePath: string,
  requestedType = "",
) {
  if (!row || !storagePath) return false;
  if (requestedType && row.type !== requestedType) return false;

  const rowUserId = String(row.user_id || "");
  // Efficiency flow: do not let a customer-created row grant access to arbitrary non-owned media.
  if (!rowUserId || rowUserId === user.id) return false;

  const payload = (row.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
  return payloadReferencesExactPath(payload, storagePath)
    && (recordHasEmail(payload, user.email || "") || recordAudienceHasEmail(payload, user.email || ""));
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
    // Efficiency flow: non-staff source-record authorization must go through the user client so RLS still applies.
    const { data: sourceRow, error: sourceError } = await userClient
      .from("kennel_records")
      .select("id,type,user_id,payload")
      .eq("id", String(body.recordId))
      .maybeSingle();
    if (sourceError) return json({ error: sourceError.message }, 500);
    allowed = sourceRowIsTrustedMediaGrant(sourceRow, user, storagePath, body.recordType || "");
  }

  if (!allowed) return json({ error: "Not authorized for this file." }, 403);

  const signedUrlOptions = signedUrlOptionsFor(body, storagePath);
  const { data, error } = await adminClient.storage.from(MEDIA_BUCKET).createSignedUrl(storagePath, SIGNED_URL_SECONDS, signedUrlOptions);
  if (error || !data?.signedUrl) return json({ error: error?.message || "Could not create a signed media URL." }, 500);
  return json({ signedUrl: data.signedUrl, expiresIn: SIGNED_URL_SECONDS, variant: signedUrlOptions ? PROFILE_THUMB_VARIANT : "full" });
});
