import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const sidebar = html.match(/<nav class="side-nav"[\s\S]*?<\/nav>/)?.[0];
assert.ok(sidebar, "Sidebar navigation exists");
const buttons = [...sidebar.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
const expectedLabels = [
  "Login",
  "My Dogs",
  "My Requests",
  "Updates",
  "My Records",
  "Main Dashboard",
  "Dog Shows",
  "Timesheet",
  "Daily Tasks",
  "Task Scheduling",
  "Our Dogs",
  "Boarding Dogs",
  "Request",
  "Maintenance",
  "Financials",
  "Settings",
  "Setup",
  "Users",
  "Kennel Locations",
  "Hours of Operation",
  "Services & Pricing",
  "Alerts",
  "Audit Log"
];
assert.equal(buttons.length, expectedLabels.length, "All original sidebar destinations remain");
assert.deepEqual(buttons.map(([, , content]) => content.match(/<span class="sidebar-nav-label">([^<]+)<\/span>/)?.[1]), expectedLabels, "Menu labels and order remain unchanged");
for (const [, attrs, content] of buttons) {
  assert.match(attrs, /data-page="[^"]+"/, "Navigation destination is retained");
  assert.match(attrs, /data-roles="[^"]+"/, "Role access is retained");
  assert.equal((content.match(/<svg\b/g) || []).length, 1, "Each sidebar item has exactly one vector icon");
  assert.match(content, /<svg class="sidebar-nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/, "Icons are decorative and not separate focus targets");
  assert.doesNotMatch(content, /<img|<title|<text|https?:/, "No image requests or extra accessible labels");
}
assert.match(css, /\.sidebar-nav-icon\s*\{[^}]*flex: 0 0 22px;[^}]*fill: none;[^}]*stroke: currentColor;[^}]*pointer-events: none;/, "Icons have fixed dimensions and inherit theme/selection colors");
assert.match(css, /\.sub-nav-button \.sidebar-nav-icon\s*\{[^}]*width: 18px;[^}]*height: 18px;/, "Submenu icons use a consistent smaller size");
assert.match(html, /styles\.css\?v=[^"]*sidebar-outline-icons-v104/, "Stylesheet cache key includes sidebar icon release");
console.log("Sidebar icons static check passed (23 destinations, labels/access preserved, inline SVG only).");
