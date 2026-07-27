import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseHTML } from "npm:linkedom@0.18.12";

const CALENDAR_URL = "https://caninechronicleshowcalendar.com/K9shows.php";
const SITE_URL = "https://caninechronicleshowcalendar.com/";
const MAX_RANGE_DAYS = 370;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CalendarRequest = {
  startDate?: string;
  endDate?: string;
  states?: string[];
  breedCode?: string;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();
const normalizeEmail = (value: unknown) => clean(value).toLowerCase();

function adminEmails() {
  return (Deno.env.get("ADMIN_ALERT_EMAILS") || Deno.env.get("ADMIN_EMAILS") || "centraltexashusky@gmail.com")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

async function callerIsStaff(adminClient: ReturnType<typeof createClient>, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  if (adminEmails().includes(normalized) || ["centraltexashusky@gmail.com", "cthusky05@gmail.com"].includes(normalized)) return true;
  const { data, error } = await adminClient
    .from("kennel_records")
    .select("payload")
    .eq("type", "settingsUser")
    .filter("payload->>email", "eq", normalized);
  if (error) return false;
  return (data || []).some((row) => {
    const payload = (row?.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, unknown>;
    const role = clean(payload.role).toLowerCase();
    const removed = payload.removed === true || clean(payload.removed).toLowerCase() === "true";
    return !removed && ["admin", "helper", "staff"].includes(role);
  });
}

function validDate(value: unknown) {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(new Date(`${text}T12:00:00Z`).getTime()) ? text : "";
}

function dateInRange(month: number, day: number, startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate >= start && candidate <= end) return candidate.toISOString().slice(0, 10);
  }
  return "";
}

function dateNearShow(month: number, day: number, showDate: string) {
  const show = new Date(`${showDate}T12:00:00Z`);
  const sameYear = new Date(Date.UTC(show.getUTCFullYear(), month - 1, day));
  if (sameYear > show) sameYear.setUTCFullYear(sameYear.getUTCFullYear() - 1);
  return sameYear.toISOString().slice(0, 10);
}

function datesInText(value: string) {
  return [...value.matchAll(/\b(\d{1,2})\/(\d{1,2})\b/g)].map((match) => ({ month: Number(match[1]), day: Number(match[2]) }));
}

function queryArrayValue(url: URL, key: string) {
  return url.searchParams.get(key) || url.searchParams.get(`${key}[]`) || "";
}

function embeddedUrl(value: unknown, filePattern: RegExp) {
  const match = clean(value).match(filePattern)?.[0] || "";
  if (!match) return null;
  try {
    return new URL(match.replace(/&amp;/gi, "&"), SITE_URL);
  } catch {
    return null;
  }
}

function panelJudge(title: unknown, label: string) {
  const match = String(title || "").match(new RegExp(`${label}:<\\/td><td[^>]*>([\\s\\S]*?)<\\/td>`, "i"));
  return clean((match?.[1] || "").replace(/<[^>]+>/g, " "));
}

function calendarPanelTitle(html: string, externalId: string) {
  const markerIndex = html.indexOf(`showpop.php?shno=${externalId}`);
  if (markerIndex < 0) return "";
  const nextShowIndex = html.indexOf("showpop.php?shno=", markerIndex + 20);
  const showHtml = html.slice(markerIndex, nextShowIndex > markerIndex ? nextShowIndex : markerIndex + 20_000);
  return showHtml.match(/title="([^"]*Best-In-Show Judge:[^"]*)"/i)?.[1] || "";
}

function parseShowRows(html: string, startDate: string, endDate: string, breedCode: string) {
  const { document } = parseHTML(html);
  const shows = new Map<string, Record<string, unknown>>();
  [...document.querySelectorAll("tr")].forEach((row) => {
    const anchors = [...row.querySelectorAll("a")];
    const showAnchor = anchors.find((anchor) => /showpop\.php\?[^#]*shno=/i.test(anchor.getAttribute("href") || ""));
    if (!showAnchor) return;
    const showUrl = embeddedUrl(showAnchor.getAttribute("href"), /showpop\.php\?[^"')\s]+/i);
    if (!showUrl) return;
    const externalId = queryArrayValue(showUrl, "shno");
    if (!externalId) return;

    const cells = [...row.children].filter((child) => ["TD", "TH"].includes(child.tagName));
    const rowText = clean(row.textContent);
    const dates = datesInText(rowText);
    if (!dates.length) return;
    const showDate = dateInRange(dates[0].month, dates[0].day, startDate, endDate);
    if (!showDate) return;

    const stateAnchor = anchors.find((anchor) => {
      try {
        const url = new URL(anchor.getAttribute("href") || "", SITE_URL);
        return Boolean(queryArrayValue(url, "state"));
      } catch {
        return false;
      }
    });
    let state = "";
    if (stateAnchor) {
      try {
        state = queryArrayValue(new URL(stateAnchor.getAttribute("href") || "", SITE_URL), "state").toUpperCase();
      } catch {
        state = clean(stateAnchor.textContent).toUpperCase();
      }
    }
    const locationCellIndex = cells.findIndex((cell) => state && clean(cell.textContent).split(/\s+/).includes(state));
    const city = locationCellIndex > 0 ? clean(cells[locationCellIndex - 1]?.textContent) : "";
    const club = clean(showAnchor.textContent) || clean(cells.find((cell) => cell.contains(showAnchor))?.textContent);
    const panelTitle = calendarPanelTitle(html, externalId);
    const typeAnchor = anchors.find((anchor) => /(?:showtype|opWtype|type=)/i.test(anchor.getAttribute("href") || ""));
    const showType = clean(typeAnchor?.textContent) || (rowText.match(/\b(AB|SP|SWE|BPUP|FCAT|OB|RLY)\b/i)?.[1] || "");
    const nohs = /\bNOHS\b/i.test(rowText);
    const superintendent = ["Onofrio", "MB-F", "Rau", "Bradshaw", "BaRay", "Foy Trent", "Executive", "Show Secretary"]
      .find((name) => rowText.toLowerCase().includes(name.toLowerCase())) || "";
    const closing = dates.length > 1 ? dates[dates.length - 1] : null;
    const panelUrl = new URL(`judpan.php?code=&shno=${encodeURIComponent(externalId)}`, SITE_URL).toString();
    shows.set(externalId, {
      externalId,
      startDate: showDate,
      endDate: showDate,
      club,
      name: club,
      cityState: [city, state].filter(Boolean).join(", "),
      city,
      state,
      showType,
      nohs,
      superintendent,
      entryClosingDate: closing ? dateNearShow(closing.month, closing.day, showDate) : "",
      breedJudge: "",
      groupJudge: panelJudge(panelTitle, "Working Group"),
      bisJudge: panelJudge(panelTitle, "Best-In-Show Judge"),
      sourceUrl: showUrl.toString(),
      panelUrl,
      source: "Canine Chronicle Show Calendar",
    });
  });
  return [...shows.values()].sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)));
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
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await callerIsStaff(adminClient, user.email))) return json({ error: "Staff access required." }, 403);

  const body = await req.json().catch(() => ({})) as CalendarRequest;
  const startDate = validDate(body.startDate);
  const endDate = validDate(body.endDate);
  const breedCode = /^\d{1,5}$/.test(clean(body.breedCode)) ? clean(body.breedCode) : "346";
  const states = [...new Set((Array.isArray(body.states) ? body.states : []).map((state) => clean(state).toUpperCase()).filter((state) => /^[A-Z]{2}$/.test(state)))].slice(0, 8);
  if (!startDate || !endDate || endDate < startDate) return json({ error: "A valid startDate and endDate are required." }, 400);
  const rangeDays = Math.ceil((new Date(`${endDate}T12:00:00Z`).getTime() - new Date(`${startDate}T12:00:00Z`).getTime()) / 86_400_000);
  if (rangeDays > MAX_RANGE_DAYS) return json({ error: `Date range cannot exceed ${MAX_RANGE_DAYS} days.` }, 400);
  if (!states.length) return json({ error: "At least one valid state is required." }, 400);

  const sourceUrl = new URL(CALENDAR_URL);
  sourceUrl.searchParams.set("month", "0");
  sourceUrl.searchParams.append("breed[]", breedCode);
  states.forEach((state) => sourceUrl.searchParams.append("state[]", state));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "SnuggleStayShowPlanner/1.0 (centraltexashusky@gmail.com)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return json({ error: `Calendar source returned ${response.status}.` }, 502);
    const html = await response.text();
    const shows = parseShowRows(html, startDate, endDate, breedCode);
    return json({ shows, sourceUrl: sourceUrl.toString(), fetchedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not fetch the show calendar." }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
