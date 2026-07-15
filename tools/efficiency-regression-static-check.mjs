import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const checks = [
  {
    path: "supabase/functions/media-access/index.ts",
    mustNotInclude: "JSON.stringify(payload).includes",
    message: "media-access must not authorize by substring search.",
  },
  {
    path: "js/shared.js",
    mustInclude: "remoteLoadQueuedTypes",
    message: "loadRemoteRecords must queue missing page-scoped types.",
  },
  {
    path: "js/shared.js",
    mustInclude: "scheduleActivePageRemoteLoad",
    message: "switchPage must schedule active-page remote refresh.",
  },
  {
    path: "js/shared.js",
    mustInclude: "hidden heavy page",
    message: "realtime rendering must be scoped to active page.",
  },
  {
    path: "js/shared.js",
    mustInclude: "boardingDogConsolidationCache",
    message: "boarding consolidation must be memoized.",
  },
  {
    path: "js/shared.js",
    mustInclude: "PROFILE_PHOTO_HYDRATION_CONCURRENCY",
    message: "profile photo hydration must be queued.",
  },
  {
    path: "supabase-schema.sql",
    mustInclude: "kennel_is_admin",
    message: "RLS must split admin from staff/helper.",
  },
  {
    path: "supabase-schema.sql",
    mustInclude: "notification_reads",
    message: "notification read receipts table must exist.",
  },
  {
    path: "js/shared.js",
    mustInclude: "REMOTE_STAFF_WRITE_RECORD_TYPES",
    message: "remote writes must use a staff RLS allowlist.",
  },
  {
    path: "js/shared.js",
    mustInclude: 'if (currentRole() !== "admin") return;',
    message: "background customer access profile sync must be admin-only.",
  },
  {
    path: "js/shared.js",
    mustInclude: '"staffSchedule",',
    message: "staffSchedule remote writes must be guarded for non-admin sessions.",
  },
  {
    path: "js/shared.js",
    mustInclude: "settingsUserPayloadBelongsToCurrentSession",
    message: "settingsUser writes must be limited to the current session for non-admins.",
  },
  {
    path: "js/shared.js",
    mustInclude: "pendingAuthUserForRemoteWrite = user;",
    message: "initial auth profile writes must use the pending Supabase identity.",
  },
  {
    path: "index.html",
    mustInclude: "20260715-dog-show-appearance-results",
    message: "production cache keys must be bumped.",
  },
  {
    path: "index.html",
    mustInclude: 'data-action="owned-special-care-info"',
    message: "Our Dogs Special Care filter must expose a clickable info control.",
  },
  {
    path: "js/shared.js",
    mustInclude: 'data-action="owned-special-care-info"',
    message: "Our Dogs Special Care info control must be wired to the dialog.",
  },
  {
    path: "js/daily.js",
    mustInclude: "openOwnedDogSpecialCareInfo",
    message: "Our Dogs Special Care info dialog must explain filter triggers.",
  },
  {
    path: "js/daily.js",
    mustInclude: "query ? matches(record, query) : ownedDogMatchesCareFilter(record)",
    message: "Our Dogs search must search all dogs when a query is entered.",
  },
  {
    path: "js/daily.js",
    mustInclude: 'const query = ($("#ownedDogSearch").value || "").trim();',
    message: "Our Dogs search input must be trimmed before deciding whether to bypass the active filter.",
  },
  {
    path: "styles.css",
    mustInclude: "grid-template-columns: minmax(0, 1fr);",
    message: "boarding queue groups must render one area per row.",
  },
  {
    path: "supabase/functions/send-notification/index.ts",
    mustInclude: "premiumDetailValueHtml",
    message: "notification emails must convert media URL detail values into labeled buttons.",
  },
  {
    path: "supabase/functions/send-notification/index.ts",
    mustInclude: "mediaEmailLinkFromLine(`${String(label",
    message: "notification email detail rows must inspect label/value media URL pairs.",
  },
  {
    path: "supabase/functions/send-notification/index.ts",
    mustInclude: "const mediaLines = normalizeMediaEmailLinks(options.mediaLines || []);",
    message: "admin boarding request emails must normalize media links before rendering.",
  },
  {
    path: "supabase/functions/send-notification/index.ts",
    mustInclude: "mediaLinksButtonListHtml(mediaLines)",
    message: "admin boarding request emails must render media links as labeled buttons.",
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.path);
  if (check.mustInclude && !text.includes(check.mustInclude)) failures.push(check.message);
  if (check.mustNotInclude && text.includes(check.mustNotInclude)) failures.push(check.message);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("Efficiency regression static checks passed.");
