import fs from "node:fs";

// Stamp the release, not the visitor's clock. Run immediately before each push.
const releasedAt = new Date();
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
  hourCycle: "h23",
}).formatToParts(releasedAt).map(({ type, value }) => [type, value]));
const version = `v${parts.year}.${parts.month}.${parts.day}.${parts.hour}`;
const file = new URL("../index.html", import.meta.url);
const html = fs.readFileSync(file, "utf8");
const marker = /<time id="appReleaseVersion"[^>]*>[^<]*<\/time>/g;
if ([...html.matchAll(marker)].length !== 1) throw new Error("Expected one sidebar release version.");
fs.writeFileSync(file, html.replace(marker,
  `<time id="appReleaseVersion" datetime="${releasedAt.toISOString()}" title="Release time in America/Chicago">${version}</time>`));
console.log(`Stamped sidebar release ${version} (America/Chicago).`);
