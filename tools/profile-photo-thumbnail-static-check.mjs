import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const checks = [
  {
    path: "js/shared.js",
    includes: "PROFILE_PHOTO_THUMBNAIL_VARIANT = \"profileThumb\"",
    message: "client must define a profile thumbnail variant.",
  },
  {
    path: "js/shared.js",
    includes: "data-profile-photo-variant=\"' + PROFILE_PHOTO_THUMBNAIL_VARIANT + '\"'",
    message: "profile photo elements must request thumbnail hydration.",
  },
  {
    path: "js/shared.js",
    includes: "signedMediaUrlCacheEntryKey(storagePath = \"\", variant = PROFILE_PHOTO_FULL_VARIANT)",
    message: "signed media cache keys must separate thumbnail and full URLs.",
  },
  {
    path: "js/shared.js",
    includes: "profilePhotoCacheEntryKey(storagePath = \"\", variant = PROFILE_PHOTO_FULL_VARIANT)",
    message: "profile photo blob cache keys must separate thumbnail and full images.",
  },
  {
    path: "js/shared.js",
    includes: "body.variant = PROFILE_PHOTO_THUMBNAIL_VARIANT",
    message: "thumbnail hydration must request the thumbnail variant from media-access.",
  },
  {
    path: "supabase/functions/media-access/index.ts",
    includes: "const PROFILE_THUMB_TRANSFORM = {",
    message: "media-access must define a server-side thumbnail transform.",
  },
  {
    path: "supabase/functions/media-access/index.ts",
    includes: "createSignedUrl(storagePath, SIGNED_URL_SECONDS, signedUrlOptions)",
    message: "media-access must pass thumbnail transform options into signed URLs.",
  },
  {
    path: "js/main.js",
    includes: "20260714-dog-show-review-2",
    message: "main module cache key must be bumped for profile thumbnail loading.",
  },
  {
    path: "index.html",
    includes: "20260714-dog-show-review-2",
    message: "top-level script cache key must include the latest deployment token.",
  },
];

const failures = [];

for (const check of checks) {
  const text = read(check.path);
  if (!text.includes(check.includes)) failures.push(check.message);
}

if (failures.length) {
  console.error(failures.map((message) => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log("Profile photo thumbnail static checks passed.");
