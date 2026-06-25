import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function normalizedAdminEmails() {
  return (Deno.env.get("ADMIN_EMAILS") || "centraltexashusky@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function safeRole(value: unknown) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "staff") return "helper";
  return ["customer", "helper", "admin"].includes(role) ? role : "customer";
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
  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();
  if (callerError || !caller?.email) return json({ error: "Admin login required." }, 401);

  const callerEmail = caller.email.toLowerCase();
  const callerIsAdmin = normalizedAdminEmails().includes(callerEmail) || caller.app_metadata?.role === "admin";
  if (!callerIsAdmin) return json({ error: "Only an admin can change user passwords." }, 403);

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const authId = String(body.authId || "").trim();
  const name = String(body.name || email).trim();
  const role = safeRole(body.role);
  const password = String(body.password || "");
  const requirePasswordChange = body.requirePasswordChange !== false;

  if (!email || !email.includes("@")) return json({ error: "A valid target email is required." }, 400);
  if (password.length < 8) return json({ error: "Temporary password must be at least 8 characters." }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let targetUserId = authId;
  if (!targetUserId) {
    for (let page = 1; page <= 10 && !targetUserId; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: error.message }, 500);
      const match = data.users.find((user) => user.email?.toLowerCase() === email);
      if (match) targetUserId = match.id;
      if (!data.users.length || data.users.length < 1000) break;
    }
  }

  if (targetUserId) {
    const { data, error } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role },
    });
    if (error) return json({ error: error.message }, 500);
    targetUserId = data.user.id;
  } else {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role },
    });
    if (error) return json({ error: error.message }, 500);
    targetUserId = data.user.id;
  }

  const now = new Date().toISOString();
  const { data: existingRows, error: lookupError } = await adminClient
    .from("kennel_records")
    .select("id,payload")
    .eq("type", "settingsUser")
    .filter("payload->>email", "eq", email)
    .limit(1);
  if (lookupError) return json({ error: lookupError.message }, 500);

  const existing = existingRows?.[0];
  const recordId = existing?.id || `settingsUser-${email.replace(/[^a-z0-9]+/g, "-")}`;
  const existingPayload = (existing?.payload && typeof existing.payload === "object" ? existing.payload : {}) as Record<string, unknown>;
  const profilePayload = {
    ...existingPayload,
    type: "settingsUser",
    id: recordId,
    submittedAt: existingPayload.submittedAt || now,
    updatedAt: now,
    name,
    email,
    authId: targetUserId,
    role,
    authProvider: "supabase",
    passwordChangeRequired: requirePasswordChange,
    passwordChangeRequiredAt: requirePasswordChange ? now : "",
    passwordChangeSetBy: callerEmail,
    removed: false,
  };
  delete profilePayload.pin;

  const { error: profileError } = await adminClient.from("kennel_records").upsert({
    id: recordId,
    type: "settingsUser",
    payload: profilePayload,
    helper_email: callerEmail,
    user_id: caller.id,
    submitted_at: String(profilePayload.submittedAt),
    updated_at: now,
  });
  if (profileError) return json({ error: profileError.message }, 500);

  return json({ userId: targetUserId, recordId, email, passwordChangeRequired: requirePasswordChange });
});
