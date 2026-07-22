import fs from "node:fs";

const styles = fs.readFileSync("styles.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const failures = [];

if (!styles.includes(".calendar-report-count {\n  background: #2F6FED;")) {
  failures.push("Dashboard calendar report counts do not have a high-contrast badge background.");
}
if (!styles.includes("min-width: 18px;") || !styles.includes("width: max-content;")) {
  failures.push("Dashboard calendar count badges do not have stable compact dimensions.");
}
if (!index.includes('styles.css?v=20260722-multi-operation-windows')) {
  failures.push("Dashboard calendar badge styles are not cache-busted.");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Dashboard calendar static checks passed.");
