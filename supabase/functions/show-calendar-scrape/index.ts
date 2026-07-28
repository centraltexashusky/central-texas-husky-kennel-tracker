import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseHTML } from "npm:linkedom@0.18.12";

const CALENDAR_URL = "https://caninechronicleshowcalendar.com/K9shows.php";
const SITE_URL = "https://caninechronicleshowcalendar.com/";
const AKC_API_URL = "https://webapps.akc.org/event-search/api/";
const AKC_EVENT_URL = "https://www.apps.akc.org/apps/events/search/index_results.cfm";
const AKC_DOCUMENT_URL = "https://www.apps.akc.org/apps/eventplans/eventsearch/blocks/dsp_generate_pdf.cfm";
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
const calendarAttributeText = (value: unknown) =>
  String(value || "")
    .replace(/&nbsp;?/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]+>/g, " ")
    .trim();
const calendarText = (value: unknown) => clean(calendarAttributeText(value));
const identityText = (value: unknown) => clean(value).toLowerCase().replace(/\b(?:incorporated|inc|llc|l\.l\.c)\b/g, "").replace(/[^a-z0-9]+/g, "");

function showFingerprint(show: Record<string, unknown>) {
  return [
    clean(show.startDate),
    identityText(show.club || show.name),
    identityText(show.city),
    clean(show.state).toUpperCase(),
  ].join("|");
}

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

function canonicalShowId(eventNumber: unknown, fallbackSource: string, fallbackId: unknown) {
  const akcNumber = clean(eventNumber).match(/\d{8,12}/)?.[0] || "";
  return akcNumber ? `akc:${akcNumber}` : `${fallbackSource}:${clean(fallbackId)}`;
}

function eventSourceUrl(eventNumber: unknown) {
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

function calendarBreedOption(html: string, requestedName: string) {
  const { document } = parseHTML(html);
  const requestedKey = breedComparisonKey(requestedName);
  return [...document.querySelectorAll("option")]
    .map((option) => ({
      code: clean(option.getAttribute("value")).match(/\d{1,5}/)?.[0] || "",
      name: calendarBreedName(option.textContent),
    }))
    .find((option) => option.code && breedComparisonKey(option.name) === requestedKey) || null;
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

function dateInRange(month: number, day: number, startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (candidate >= start && candidate <= end) return candidate.toISOString().slice(0, 10);
  }
  return "";
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

function calendarShowHtml(html: string, externalId: string) {
  const mainMarker = new RegExp(`showpop\\.php\\?shno=${externalId}(?:&|&amp;)brno=`, "i");
  const markerIndex = html.search(mainMarker);
  if (markerIndex < 0) return "";
  const remainingHtml = html.slice(markerIndex + 20);
  const nextMainShowOffset = remainingHtml.search(/showpop\.php\?shno=\d+(?:&|&amp;)brno=/i);
  const nextShowIndex = nextMainShowOffset >= 0 ? markerIndex + 20 + nextMainShowOffset : -1;
  return html.slice(markerIndex, nextShowIndex > markerIndex ? nextShowIndex : markerIndex + 20_000);
}

function calendarShowAnchors(html: string) {
  const anchors: Array<{ href: string; title: string; text: string }> = [];
  const pattern = /<a\b[^>]*\bhref\s*=\s*javascript:opWshpop\("([^"]*showpop\.php\?[^"]*\bshno=\d+[^"]*(?:&|&amp;)brno=\d+[^"]*)"\)[^>]*\btitle\s*=\s*"([\s\S]*?\bShow Number=[\s\S]*?\bOn:[\s\S]*?)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    anchors.push({
      href: calendarText(match[1]),
      title: calendarAttributeText(match[2]),
      text: calendarText(match[3]),
    });
  }
  return anchors;
}

function calendarPanelTitle(showHtml: string) {
  return showHtml.match(/title="([^"]*Best-In-Show Judge:[^"]*)"/i)?.[1] || "";
}

function calendarAssignmentJudge(showHtml: string, assignment: string) {
  const escapedAssignment = assignment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = showHtml.match(new RegExp(`<a\\b[^>]*title="${escapedAssignment}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/a>`, "i"));
  return clean((match?.[1] || "").replace(/<[^>]+>/g, " "));
}

function showGroupPanel(showHtml: string, judgeAnchors: Element[]) {
  const candidates = [...showHtml.matchAll(/<a\b[^>]*title="([^"]*\bGroup)\b[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({
      groupName: clean(match[1]).replace(/\s+Judge.*$/i, ""),
      judge: clean((match[2] || "").replace(/<[^>]+>/g, " ")),
    }))
    .filter((candidate) => candidate.judge && !/(?:owner.handled|nohs)/i.test(candidate.groupName));
  if (candidates.length) return candidates[0];
  const anchor = judgeAnchors.find((item) => /\bGroup\b/i.test(item.getAttribute("title") || "") && !/(?:owner.handled|nohs)/i.test(item.getAttribute("title") || ""));
  return {
    groupName: clean(anchor?.getAttribute("title")).replace(/\s+Judge.*$/i, ""),
    judge: clean(anchor?.textContent),
  };
}

function parseShowRows(html: string, startDate: string, endDate: string, breedCode: string, breedName: string) {
  const shows = new Map<string, Record<string, unknown>>();
  // The source uses legacy, non-closed table markup. Standards-based DOM
  // parsers nest many visible shows inside one synthetic row and discard most
  // of the later links. Read each authoritative show-link record from the raw
  // response, then isolate its panel block for the remaining fields.
  calendarShowAnchors(html).forEach(({ href: showHref, title: showTitle, text: showAnchorText }) => {
    const showUrl = embeddedUrl(showHref, /showpop\.php\?[^"')\s]+/i);
    if (!showUrl) return;
    const externalId = queryArrayValue(showUrl, "shno");
    if (!externalId) return;

    const dates = datesInText(showTitle);
    if (!dates.length) return;
    const showDate = dateInRange(dates[0].month, dates[0].day, startDate, endDate);
    if (!showDate) return;

    const titleLocation = clean(showTitle.match(/\bIn:\s*([^\r\n]+)/i)?.[1]);
    const titleLocationMatch = titleLocation.match(/^(.*?),\s*([A-Z]{2})$/i);
    const state = clean(titleLocationMatch?.[2]).toUpperCase();
    const city = clean(titleLocationMatch?.[1]);
    const venue = clean(showTitle.match(/\bAt:\s*([^\r\n]+)/i)?.[1]);
    const club = showAnchorText;
    const showHtml = calendarShowHtml(html, externalId);
    const panelTitle = calendarPanelTitle(showHtml);
    const breedJudge = calendarAssignmentJudge(showHtml, breedName);
    const groupPanel = showGroupPanel(showHtml, []);
    const titleShowType = clean(showTitle.match(/\bShow Number=\S+\s+([A-Z/]+)/i)?.[1]).replace(/\bJSHW\b/gi, "JS");
    const eventNumber = clean(showTitle.match(/\bShow Number=(\d{8,12})\b/i)?.[1]);
    let showType = titleShowType;
    if (/Beginner Puppy Competition/i.test(showTitle) && !/(?:^|\/)BgP(?:\/|$)/i.test(showType)) showType = [showType, "BgP"].filter(Boolean).join("/");
    const nohs = /(?:\bNOHS\b|National Owner-Handled)/i.test(`${showTitle} ${panelTitle} ${showHtml}`);
    const superintendent = clean(showTitle.match(/\bSuper:\s*([^\r\n]+)/i)?.[1])
      || ["Onofrio", "MB-F", "Rau", "Bradshaw", "BaRay", "Foy Trent", "Executive", "Show Secretary"]
        .find((name) => showHtml.toLowerCase().includes(name.toLowerCase())) || "";
    const closingMatch = showTitle.match(/\bCloses:\s*(?:[A-Za-z]+\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
    const closingDate = closingMatch
      ? `${closingMatch[3]}-${String(Number(closingMatch[1])).padStart(2, "0")}-${String(Number(closingMatch[2])).padStart(2, "0")}`
      : "";
    const premiumMarkup = showHtml.match(/<a\b[^>]*title="Premium List"[^>]*>/i)?.[0] || "";
    const judgingProgramMarkup = showHtml.match(/<a\b[^>]*title="Judging Program"[^>]*>/i)?.[0] || "";
    const premiumUrl = embeddedUrl(premiumMarkup, /https?:\/\/[^"')\s]+/i)?.toString() || "";
    const judgingProgramUrl = embeddedUrl(judgingProgramMarkup, /https?:\/\/[^"')\s]+/i)?.toString() || "";
    const panelUrl = new URL(`judpan.php?code=&shno=${encodeURIComponent(externalId)}`, SITE_URL).toString();
    const canonicalId = canonicalShowId(eventNumber, "canine-chronicle", externalId);
    shows.set(canonicalId, {
      externalId: canonicalId,
      canonicalId,
      eventNumber,
      sourceIds: { canineChronicle: externalId, ...(eventNumber ? { akc: eventNumber } : {}) },
      startDate: showDate,
      endDate: showDate,
      club,
      name: club,
      cityState: [city, state].filter(Boolean).join(", "),
      city,
      state,
      venue,
      showType,
      nohs,
      superintendent,
      entryClosingDate: closingDate,
      premiumUrl,
      judgingProgramUrl,
      breedCode,
      breedName,
      breedJudge,
      groupName: groupPanel.groupName,
      groupJudge: groupPanel.judge || (groupPanel.groupName ? panelJudge(panelTitle, groupPanel.groupName) : ""),
      bisJudge: calendarAssignmentJudge(showHtml, "Best In Show") || panelJudge(panelTitle, "Best-In-Show Judge"),
      sourceUrl: showUrl.toString(),
      canineChronicleSourceUrl: showUrl.toString(),
      panelUrl,
      source: "Canine Chronicle Show Calendar",
      sources: [
        sourceRecord("canine-chronicle", "Canine Chronicle", showUrl.toString()),
      ].filter(Boolean),
    });
  });
  return [...shows.values()].sort((left, right) => String(left.startDate).localeCompare(String(right.startDate)));
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
      const canonicalId = canonicalShowId(eventNumber, "akc-event", event.id);
      const judges = event.judges && typeof event.judges === "object" ? event.judges as Record<string, unknown> : {};
      const superintendent = event.superintendentSecretary && typeof event.superintendentSecretary === "object"
        ? event.superintendentSecretary as Record<string, unknown>
        : {};
      const documents = (Array.isArray(event.documents) ? event.documents : [])
        .map((document) => document && typeof document === "object" ? document as Record<string, unknown> : {});
      const premiumDocument = documents.find((document) => /premium/i.test(clean(document.name)) || clean(document.code) === "PRMLST");
      const judgingDocument = documents.find((document) => /judg(?:e|ing).*(?:program|schedule)|running order/i.test(clean(document.name)));
      const officialUrl = eventSourceUrl(eventNumber);
      const superintendentUrl = superintendentWebsite(superintendent.name);
      const site = event.site && typeof event.site === "object" ? event.site as Record<string, unknown> : {};
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
      const sources = [
        sourceRecord("akc", "AKC Event Search", officialUrl),
        sourceRecord("superintendent", clean(superintendent.name) || "Show superintendent", superintendentUrl),
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
        showType,
        nohs: event.isNationalOwner === true,
        juniorShowmanship: event.isJuniorShowmanship === true,
        eventStatus: clean(event.eventStatus),
        superintendent: clean(superintendent.name),
        superintendentPhone: clean(superintendent.phone),
        superintendentEmail: clean(superintendent.email),
        superintendentUrl,
        entryClosingDate: akcDate(items.find((item) => item.displayClosing !== false)?.closingDate),
        premiumUrl: akcDocumentUrl(premiumDocument),
        judgingProgramUrl: akcDocumentUrl(judgingDocument),
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

function mergeShowRecords(akcShows: Array<Record<string, unknown>>, canineShows: Array<Record<string, unknown>>) {
  const merged = new Map<string, Record<string, unknown>>();
  const aliases = new Map<string, string>();
  const addAliases = (key: string, show: Record<string, unknown>) => {
    const eventNumber = clean(show.eventNumber);
    if (eventNumber) aliases.set(`event:${eventNumber}`, key);
    const fingerprint = showFingerprint(show);
    if (fingerprint.replace(/\|/g, "")) aliases.set(`fingerprint:${fingerprint}`, key);
  };
  const add = (show: Record<string, unknown>, preferExisting: boolean) => {
    const eventNumber = clean(show.eventNumber);
    const fingerprint = showFingerprint(show);
    // AKC can schedule two separately numbered events for the same club,
    // location, and date. Never collapse those official event numbers into
    // one card; the fingerprint is only a fallback for a source record that
    // does not publish an AKC number.
    const existingKey = eventNumber
      ? aliases.get(`event:${eventNumber}`) || clean(show.canonicalId || show.externalId)
      : aliases.get(`fingerprint:${fingerprint}`) || clean(show.canonicalId || show.externalId);
    const existing = merged.get(existingKey);
    if (!existing) {
      merged.set(existingKey, { ...show });
      addAliases(existingKey, show);
      return;
    }
    const base = preferExisting ? existing : show;
    const enrichment = preferExisting ? show : existing;
    const combined = { ...base };
    Object.entries(enrichment).forEach(([field, value]) => {
      if ((combined[field] === "" || combined[field] === null || combined[field] === undefined) && value !== "" && value !== null && value !== undefined) combined[field] = value;
    });
    combined.showType = [...new Set(`${clean(existing.showType)}/${clean(show.showType)}`.split("/").map(clean).filter(Boolean))].join("/");
    combined.nohs = existing.nohs === true || show.nohs === true;
    const existingSourceIds = existing.sourceIds && typeof existing.sourceIds === "object" ? existing.sourceIds as Record<string, unknown> : {};
    const showSourceIds = show.sourceIds && typeof show.sourceIds === "object" ? show.sourceIds as Record<string, unknown> : {};
    combined.sourceIds = { ...existingSourceIds, ...showSourceIds };
    combined.sources = [...new Map([
      ...(Array.isArray(existing.sources) ? existing.sources : []),
      ...(Array.isArray(show.sources) ? show.sources : []),
    ].map((source) => [clean((source as Record<string, unknown>)?.type), source])).values()].filter(Boolean);
    merged.set(existingKey, combined);
    addAliases(existingKey, combined);
  };
  akcShows.forEach((show) => add(show, true));
  canineShows.forEach((show) => add(show, true));
  return [...merged.values()].sort((left, right) =>
    clean(left.startDate).localeCompare(clean(right.startDate))
    || clean(left.club).localeCompare(clean(right.club)));
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
  let breedCode = /^\d{1,5}$/.test(clean(body.breedCode)) ? clean(body.breedCode) : "";
  let breedName = calendarBreedName(body.breedName || "Siberian Husky");
  const states = [...new Set((Array.isArray(body.states) ? body.states : []).map((state) => clean(state).toUpperCase()).filter((state) => /^[A-Z]{2}$/.test(state)))];
  const eventTypes = [...new Set((Array.isArray(body.eventTypes) ? body.eventTypes : []).map((type) => clean(type).toLowerCase()).filter((type) => SHOW_FORMAT_FILTERS.has(type)))];
  if (!startDate || !endDate || endDate < startDate) return json({ error: "A valid startDate and endDate are required." }, 400);
  const rangeDays = Math.ceil((new Date(`${endDate}T12:00:00Z`).getTime() - new Date(`${startDate}T12:00:00Z`).getTime()) / 86_400_000);
  if (rangeDays > MAX_RANGE_DAYS) return json({ error: `Date range cannot exceed ${MAX_RANGE_DAYS} days.` }, 400);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    const sourceWarnings: string[] = [];
    let canineBreedName = breedName;
    let canineBreedCode = breedCode;
    let akcBreedCode = "";
    let akcBreedName = breedName;
    const breedLookups = await Promise.allSettled([
      (async () => {
        if (canineBreedCode) return { code: canineBreedCode, name: canineBreedName };
        const breedDirectoryUrl = new URL(CALENDAR_URL);
        breedDirectoryUrl.searchParams.set("fmt", "1");
        const directoryResponse = await fetch(breedDirectoryUrl, {
          headers: {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "SnuggleStayShowPlanner/2.0 (centraltexashusky@gmail.com)",
          },
          signal: controller.signal,
        });
        if (!directoryResponse.ok) throw new Error(`Canine Chronicle breed directory returned ${directoryResponse.status}.`);
        const breedOption = calendarBreedOption(await directoryResponse.text(), canineBreedName);
        if (!breedOption) throw new Error(`${canineBreedName} was not found in the Canine Chronicle breed list.`);
        return breedOption;
      })(),
      fetchAkcBreedCode(breedName, controller.signal),
    ]);
    if (breedLookups[0].status === "fulfilled") {
      canineBreedCode = breedLookups[0].value.code;
      canineBreedName = breedLookups[0].value.name;
    } else {
      sourceWarnings.push(breedLookups[0].reason instanceof Error ? breedLookups[0].reason.message : "Canine Chronicle breed lookup failed.");
    }
    if (breedLookups[1].status === "fulfilled") {
      akcBreedCode = breedLookups[1].value.code;
      akcBreedName = breedLookups[1].value.name;
    } else {
      sourceWarnings.push(breedLookups[1].reason instanceof Error ? breedLookups[1].reason.message : "AKC breed lookup failed.");
    }
    if (!canineBreedCode && !akcBreedCode) {
      return json({ error: sourceWarnings.join(" ") || `${breedName} was not found in either show calendar.` }, 400);
    }

    const canineSourceUrl = new URL(CALENDAR_URL);
    canineSourceUrl.searchParams.delete("month");
    canineSourceUrl.searchParams.set("perf", "conf");
    canineSourceUrl.searchParams.set("fmt", "1");
    if (canineBreedCode) {
      canineSourceUrl.searchParams.set("brno", canineBreedCode);
      canineSourceUrl.searchParams.append("breed[]", canineBreedCode);
    }
    states.forEach((state) => canineSourceUrl.searchParams.append("state[]", state));

    const sourceRequests = await Promise.allSettled([
      canineBreedCode
        ? fetch(canineSourceUrl, {
          headers: {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "SnuggleStayShowPlanner/2.0 (centraltexashusky@gmail.com)",
          },
          signal: controller.signal,
        }).then(async (response) => {
          if (!response.ok) throw new Error(`Canine Chronicle returned ${response.status}.`);
          return parseShowRows(await response.text(), startDate, endDate, canineBreedCode, canineBreedName);
        })
        : Promise.resolve([]),
      akcBreedCode
        ? fetchAkcShows(startDate, endDate, states, akcBreedCode, akcBreedName, controller.signal)
        : Promise.resolve([]),
    ]);
    const canineShows = sourceRequests[0].status === "fulfilled" ? sourceRequests[0].value : [];
    const akcShows = sourceRequests[1].status === "fulfilled" ? sourceRequests[1].value : [];
    sourceRequests.forEach((result) => {
      if (result.status === "rejected") sourceWarnings.push(result.reason instanceof Error ? result.reason.message : "A show source could not be reached.");
    });
    if (!canineShows.length && !akcShows.length && sourceWarnings.length) {
      return json({ error: sourceWarnings.join(" ") }, 502);
    }
    const shows = mergeShowRecords(akcShows, canineShows).filter((show) => showMatchesEventTypes(show, eventTypes));
    return json({
      shows,
      breedCode: canineBreedCode,
      akcBreedCode,
      breedName: akcBreedName || canineBreedName || breedName,
      eventTypes,
      sourceUrl: canineSourceUrl.toString(),
      sourceUrls: {
        akc: "https://webapps.akc.org/event-search/",
        canineChronicle: canineSourceUrl.toString(),
      },
      sourceWarnings,
      sourceCounts: { akc: akcShows.length, canineChronicle: canineShows.length, deduplicated: shows.length },
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not fetch the show calendars." }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
