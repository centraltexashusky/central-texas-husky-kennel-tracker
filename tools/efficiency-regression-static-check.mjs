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
    path: "index.html",
    mustInclude: "20260624-belongings-checkout-review",
    message: "production cache keys must be bumped.",
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
