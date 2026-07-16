import fs from "node:fs";

const styles = fs.readFileSync("styles.css", "utf8");
const failures = [];

if (!styles.includes(':root[data-theme="light"] body:not(.is-login-view) .operation-availability-card {')) {
  failures.push("Light mode must define an explicit availability card treatment.");
}
if (!styles.includes("background: #eef8f5 !important;") || !styles.includes("color: #17332f;")) {
  failures.push("Available booking notices must use a readable light background and dark text.");
}
if (!styles.includes(':root[data-theme="light"] body:not(.is-login-view) .operation-availability-card.is-warning {')) {
  failures.push("Warning availability notices must retain a distinct readable treatment.");
}

const mobileDarkBlock = styles.slice(styles.indexOf("@media (max-width: 980px) {"), styles.indexOf("@media (max-width: 980px) and (orientation: landscape)"));
const darkCardSelector = mobileDarkBlock.slice(mobileDarkBlock.indexOf("body:not(.is-login-view) .status-card"), mobileDarkBlock.indexOf("background: rgba(9, 20, 34, 0.96) !important;"));
if (darkCardSelector.includes("operation-availability-card")) {
  failures.push("Mobile optimization must not force light-mode availability notices onto the dark card background.");
}

if (failures.length) {
  console.error(failures.map((message) => `- ${message}`).join("\n"));
  process.exit(1);
}

console.log("Customer booking contrast static checks passed.");
