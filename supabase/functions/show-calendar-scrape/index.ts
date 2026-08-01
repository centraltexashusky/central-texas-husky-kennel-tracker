import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const AKC_API_URL = "https://webapps.akc.org/event-search/api/";
const AKC_EVENT_URL = "https://www.apps.akc.org/apps/events/search/index_results.cfm";
const AKC_DOCUMENT_URL = "https://www.apps.akc.org/apps/eventplans/eventsearch/blocks/dsp_generate_pdf.cfm";
const AKC_SEARCH_URL = "https://webapps.akc.org/event-search/";
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
  eventTypes?: string[];
  breedCode?: string;
  breedName?: string;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown) => String(value || "").replace(/\s+/g, " ").trim();
const normalizeEmail = (value: unknown) => clean(value).toLowerCase();
const SHOW_FORMAT_FILTERS = new Set([
  "all-breed",
  "specialty",
  "owner-handled",
  "junior-showmanship",
  "beginner-puppy",
  "group-show",
  "limited-breed",
  "open-show",
  "sweepstakes",
]);

function showFormatKeys(show: Record<string, unknown>) {
  const typeTokens = clean(show.showType)
    .split(/[\/,|+]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  const tokenSet = new Set(typeTokens);
  const keys = new Set<string>();
  if (tokenSet.has("AB") || typeTokens.some((value) => /ALL[\s-]*BREED/.test(value))) keys.add("all-breed");
  if (typeTokens.some((value) => ["S", "PS", "DS", "SP", "SPEC", "SPECIALTY"].includes(value) || /SPECIALTY/.test(value))) keys.add("specialty");
  if (show.nohs === true || show.ownerHandled === true || typeTokens.some((value) => ["NOHS", "OH"].includes(value) || /OWNER[\s-]*HANDLED/.test(value))) keys.add("owner-handled");
  if (show.juniorShowmanship === true || typeTokens.some((value) => ["JS", "JSHW"].includes(value) || /JUNIOR SHOWMANSHIP/.test(value))) keys.add("junior-showmanship");
  if (show.beginnerPuppy === true || typeTokens.some((value) => ["BGP", "BPUP"].includes(value) || /BEGINNER PUPPY/.test(value))) keys.add("beginner-puppy");
  if (typeTokens.some((value) => ["GRP", "GROUP"].includes(value) || /GROUP SHOW/.test(value))) keys.add("group-show");
  if (tokenSet.has("LB") || typeTokens.some((value) => /LIMITED[\s-]*BREED/.test(value))) keys.add("limited-breed");
  if (typeTokens.some((value) => ["OS", "FSS"].includes(value) || /OPEN SHOW/.test(value))) keys.add("open-show");
  if (typeTokens.some((value) => ["SWE", "SWEEPSTAKES"].includes(value))) keys.add("sweepstakes");
  return keys;
}

function showMatchesEventTypes(show: Record<string, unknown>, eventTypes: string[]) {
  if (!eventTypes.length) return true;
  const showTypes = showFormatKeys(show);
  return eventTypes.some((type) => showTypes.has(type));
}

function canonicalShowId(eventNumber: unknown, fallbackId: unknown) {
  const akcNumber = clean(eventNumber).match(/\d{8,12}/)?.[0] || "";
  return akcNumber ? `akc:${akcNumber}` : `akc-event:${clean(fallbackId)}`;
}

function eventSourceUrl(eventNumber: unknown) {
  if (!clean(eventNumber)) return AKC_SEARCH_URL;
  const url = new URL(AKC_EVENT_URL);
  url.searchParams.set("action", "plan");
  url.searchParams.set("event_number", clean(eventNumber));
  return url.toString();
}

function akcDocumentUrl(document: Record<string, unknown> | undefined) {
  const keyBinary = clean(document?.keyBinary);
  if (!keyBinary) return "";
  const url = new URL(AKC_DOCUMENT_URL);
  url.searchParams.set("KEY_BINARY_CONTENT", keyBinary);
  return url.toString();
}

function httpUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const candidate = clean(value);
    if (!candidate || (!/^https?:\/\//i.test(candidate) && !candidate.includes("."))) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
      if (["http:", "https:"].includes(url.protocol) && url.hostname.includes(".")) return url.toString();
    } catch {
      // AKC sometimes returns empty or non-URL contact fields.
    }
  }
  return "";
}

function superintendentWebsite(value: unknown) {
  const name = clean(value).toLowerCase();
  if (/onofrio/.test(name)) return "https://www.onofrio.com/";
  if (/(?:mb-f|moss.bow|infodog)/.test(name)) return "https://www.infodog.com/";
  if (/foy\s*trent/.test(name)) return "https://www.foytrentdogshows.com/";
  if (/baray|ba-ray/.test(name)) return "https://www.barayevents.com/";
  if (/bradshaw/.test(name)) return "https://www.jbradshaw.com/";
  if (/\brau\b/.test(name)) return "https://www.raudogshows.com/";
  if (/executive/.test(name)) return "https://www.executivedogshows.com/";
  if (/emerald coast/.test(name)) return "https://dogshow.com/";
  return "";
}

function sourceRecord(type: string, label: string, url: string) {
  return url ? { type, label, url } : null;
}

function calendarBreedName(value: unknown) {
  const text = clean(value);
  const parenthetical = text.match(/^(.+?)\s+(\(.+\))$/);
  if (parenthetical) return `${calendarBreedName(parenthetical[1])} ${parenthetical[2]}`;
  if (/\bies$/i.test(text)) return text.replace(/ies$/i, "y");
  if (/\bDogs$/i.test(text)) return text.replace(/Dogs$/i, "Dog");
  if (/\bs$/i.test(text) && !/(?:Belgian Malinois|Bouvier des Flandres|Dogue de Bordeaux|Great Pyrenees|Griffon Bruxellois|Kuvasz)$/i.test(text)) return text.replace(/s$/i, "");
  return text;
}

function breedComparisonKey(value: unknown) {
  return calendarBreedName(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

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

function akcDate(value: unknown) {
  const date = new Date(Number(value) || String(value || ""));
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function akcJudge(value: unknown) {
  const judge = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const name = clean(judge.name);
  return name && name.toUpperCase() !== "UNASSIGNED" ? name : "";
}

function parseAkcEvents(payload: Record<string, unknown>, startDate: string, endDate: string, states: string[], breedCode: string, breedName: string) {
  const stateSet = new Set(states);
  return (Array.isArray(payload.events) ? payload.events : [])
    .map((rawEvent) => rawEvent && typeof rawEvent === "object" ? rawEvent as Record<string, unknown> : {})
    .filter((event) => {
      const date = validDate(event.startDate);
      return date && date >= startDate && date <= endDate && (!stateSet.size || stateSet.has(clean(event.state).toUpperCase()));
    })
    .map((event) => {
      const items = (Array.isArray(event.items) ? event.items : [])
        .map((item) => item && typeof item === "object" ? item as Record<string, unknown> : {})
        .filter((item) => clean(item.competitionGroupCode) === "CONF");
      if (!items.length) return null;
      const eventNumber = clean(event.eventNumber);
      const canonicalId = canonicalShowId(eventNumber, event.id);
      const judges = event.judges && typeof event.judges === "object" ? event.judges as Record<string, unknown> : {};
      const superintendent = event.superintendentSecretary && typeof event.superintendentSecretary === "object"
        ? event.superintendentSecretary as Record<string, unknown>
        : {};
      const documents = (Array.isArray(event.documents) ? event.documents : [])
        .map((document) => document && typeof document === "object" ? document as Record<string, unknown> : {});
      const premiumDocument = documents.find((document) => /premium/i.test(clean(document.name)) || clean(document.code) === "PRMLST");
      const judgingDocument = documents.find((document) => /judg(?:e|ing).*(?:program|schedule)|running order/i.test(clean(document.name)));
      const officialUrl = eventSourceUrl(eventNumber);
      const superintendentUrl = httpUrl(superintendent.website, superintendent.websiteUrl, superintendent.url) || superintendentWebsite(superintendent.name);
      const site = event.site && typeof event.site === "object" ? event.site as Record<string, unknown> : {};
      const eventWebsiteUrl = httpUrl(event.websiteUrl, event.website, event.eventWebsiteUrl, event.clubWebsiteUrl, site.websiteUrl, site.website);
      const city = clean(event.city);
      const state = clean(event.state).toUpperCase();
      const siteAddress = [site.location1, site.location2, site.location3, [city, state, site.postalCode].map(clean).filter(Boolean).join(" ")]
        .map(clean)
        .filter((value, index, list) => value && list.indexOf(value) === index)
        .join(", ");
      const showType = [...new Set([
        ...clean(event.eventType).split("/"),
        ...items.map((item) => clean(item.competitionMethodCode)),
      ].map(clean).filter(Boolean))].join("/");
      const premiumUrl = akcDocumentUrl(premiumDocument);
      const judgingProgramUrl = akcDocumentUrl(judgingDocument);
      const sources = [
        sourceRecord("akc", "AKC Event", officialUrl),
        sourceRecord("superintendent", clean(superintendent.name) || "Superintendent", superintendentUrl),
        sourceRecord("event-website", "Show Website", eventWebsiteUrl),
        sourceRecord("premium", "Premium List", premiumUrl),
        sourceRecord("judging-program", "Judging Program", judgingProgramUrl),
      ].filter(Boolean);
      return {
        externalId: canonicalId,
        canonicalId,
        eventNumber,
        akcEventId: clean(event.id),
        sourceIds: { akc: eventNumber || clean(event.id) },
        startDate: validDate(event.startDate),
        endDate: validDate(event.endDate) || validDate(event.startDate),
        club: clean(event.clubName || event.eventName),
        name: clean(event.eventName || event.clubName),
        cityState: [city, state].filter(Boolean).join(", "),
        city,
        state,
        venue: clean(site.name),
        venueAddress: siteAddress,
        eventWebsiteUrl,
        showType,
        nohs: event.isNationalOwner === true,
        juniorShowmanship: event.isJuniorShowmanship === true,
        eventStatus: clean(event.eventStatus),
        superintendent: clean(superintendent.name),
        superintendentPhone: clean(superintendent.phone),
        superintendentEmail: clean(superintendent.email),
        superintendentUrl,
        entryClosingDate: akcDate(items.find((item) => item.displayClosing !== false)?.closingDate),
        premiumUrl,
        judgingProgramUrl,
        breedCode,
        breedName,
        breedJudge: akcJudge(judges.breedJudge),
        groupName: "Group",
        groupJudge: akcJudge(judges.groupJudge),
        bisJudge: akcJudge(judges.bestInShowJudge),
        nohsGroupJudge: akcJudge(judges.nohsGroupJudge),
        nohsBisJudge: akcJudge(judges.nohsBestInShowJudge),
        sourceUrl: officialUrl,
        akcSourceUrl: officialUrl,
        source: "AKC Event Search",
        verifiedBy: "AKC Event Search",
        sources,
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

async function fetchAkcBreedCode(breedName: string, signal: AbortSignal) {
  const response = await fetch(new URL("references/", AKC_API_URL), {
    headers: { "Accept": "application/json", "x-csrf-token": "token", "User-Agent": "SnuggleStayShowPlanner/2.0 (centraltexashusky@gmail.com)" },
    signal,
  });
  if (!response.ok) throw new Error(`AKC breed directory returned ${response.status}.`);
  const payload = await response.json() as Record<string, unknown>;
  const requestedKey = breedComparisonKey(breedName);
  const match = (Array.isArray(payload.breeds) ? payload.breeds : [])
    .map((breed) => breed && typeof breed === "object" ? breed as Record<string, unknown> : {})
    .find((breed) => [breed.displayDescription, breed.singularDescription, breed.fullFormalDescription].some((value) => breedComparisonKey(value) === requestedKey));
  const code = clean(match?.breedCode);
  if (!code) throw new Error(`${breedName} was not found in the AKC breed list.`);
  return { code, name: calendarBreedName(match?.displayDescription || match?.singularDescription || breedName) };
}

async function fetchAkcShows(startDate: string, endDate: string, states: string[], breedCode: string, breedName: string, signal: AbortSignal) {
  const response = await fetch(new URL("search/events", AKC_API_URL), {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-csrf-token": "token",
      "User-Agent": "SnuggleStayShowPlanner/2.0 (centraltexashusky@gmail.com)",
    },
    body: JSON.stringify({
      competition: {
        items: [
          { label: "All- Breed and Group (AB/LB)", value: { compType: "AB/LB" }, selected: true },
          { label: "Specialties (S/PS/DS)", value: { compType: "S/PS/DS" }, selected: true },
        ],
        filters: {},
      },
      breedCode,
      breedName,
      breedId: "SPECIFIC",
      address: {
        eventSetting: { indoor: true, outdoor: true, outsideCovered: true },
        states: states.join(" "),
        radius: "any",
        searchByState: Boolean(states.length),
        searchByCity: false,
        searchText: states.join(", "),
      },
      dateRange: {
        from: `${startDate.slice(5, 7)}/${startDate.slice(8, 10)}/${startDate.slice(0, 4)}`,
        to: `${endDate.slice(5, 7)}/${endDate.slice(8, 10)}/${endDate.slice(0, 4)}`,
        type: "event",
      },
      sortBy: "date",
    }),
    signal,
  });
  if (!response.ok) throw new Error(`AKC Event Search returned ${response.status}.`);
  return parseAkcEvents(await response.json() as Record<string, unknown>, startDate, endDate, states, breedCode, breedName);
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
  let breedCode = "";
  let breedName = calendarBreedName(body.breedName || "Siberian Husky");
  const states = [...new Set((Array.isArray(body.states) ? body.states : []).map((state) => clean(state).toUpperCase()).filter((state) => /^[A-Z]{2}$/.test(state)))];
  const eventTypes = [...new Set((Array.isArray(body.eventTypes) ? body.eventTypes : []).map((type) => clean(type).toLowerCase()).filter((type) => SHOW_FORMAT_FILTERS.has(type)))];
  if (!startDate || !endDate || endDate < startDate) return json({ error: "A valid startDate and endDate are required." }, 400);
  const rangeDays = Math.ceil((new Date(`${endDate}T12:00:00Z`).getTime() - new Date(`${startDate}T12:00:00Z`).getTime()) / 86_400_000);
  if (rangeDays > MAX_RANGE_DAYS) return json({ error: `Date range cannot exceed ${MAX_RANGE_DAYS} days.` }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    const resolvedBreed = await fetchAkcBreedCode(breedName, controller.signal);
    breedCode = resolvedBreed.code;
    breedName = resolvedBreed.name;
    const akcShows = await fetchAkcShows(startDate, endDate, states, breedCode, breedName, controller.signal);
    const shows = akcShows
      .filter((show) => showMatchesEventTypes(show, eventTypes))
      .sort((left, right) => clean(left.startDate).localeCompare(clean(right.startDate)) || clean(left.club).localeCompare(clean(right.club)));
    return json({
      shows,
      breedCode,
      akcBreedCode: breedCode,
      breedName,
      eventTypes,
      sourceUrl: AKC_SEARCH_URL,
      sourceUrls: { akc: AKC_SEARCH_URL },
      sourceWarnings: [],
      sourceCounts: { akc: akcShows.length, filtered: shows.length },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not fetch AKC Event Search." }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
