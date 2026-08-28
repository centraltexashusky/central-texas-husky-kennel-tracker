import fs from "node:fs";

const shared = fs.readFileSync("js/shared.js", "utf8");
const legacy = fs.readFileSync("script.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const packageJson = fs.readFileSync("package.json", "utf8");
const failures = [];

for (const [label, source] of [["shared viewer", shared], ["legacy viewer", legacy]]) {
  if (!source.includes('String(type || "").toLowerCase().includes("pdf")')) failures.push(`${label} does not recognize PDF MIME types.`);
  if (!source.includes("media-iframe media-pdf-iframe")) failures.push(`${label} does not render an embedded PDF preview.`);
  if (!source.includes("Open PDF in a new tab")) failures.push(`${label} has no browser fallback for PDFs.`);
}

if (!styles.includes(".media-pdf-iframe")) failures.push("PDF preview sizing is missing.");
if (!main.includes("pdf-media-preview-v60")) failures.push("The shared viewer import is not cache-busted.");
if (!index.includes("pdf-media-preview-v60")) failures.push("The application entrypoint is not cache-busted.");
if (!index.includes("styles-pdf-media-preview-v60")) failures.push("The PDF preview stylesheet is not cache-busted.");
if (!packageJson.includes("media-pdf-preview-static-check.mjs")) failures.push("The PDF preview regression check is not in the full test suite.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Media PDF preview static checks passed.");
