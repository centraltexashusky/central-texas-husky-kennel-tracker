import fs from "node:fs";

const boarding = fs.readFileSync("js/boarding.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const packageJson = fs.readFileSync("package.json", "utf8");
const failures = [];

if (!boarding.includes("function boardingCalendarDogGroups(entries = [])")) failures.push("Calendar stays are not grouped into one row per dog.");
if (!boarding.includes("const dogGroups = boardingCalendarDogGroups(entries);")) failures.push("Calendar render does not use the dog-grouped rows.");
if (!boarding.includes("dogGroups.map((group, index) => boardingCalendarDogRowHtml(group, index, days))")) failures.push("Calendar does not render multiple stays inside each dog row.");
if (!boarding.includes("boardingCalendarCurrentTimeLineHtml(days, dogGroups.length)")) failures.push("Calendar current-time line still uses stay count instead of visible dog rows.");
if (!boarding.includes("const matchingBreakdownLine = arrayValue(snapshot.perDogBreakdown).find")) failures.push("Saved family breakdown is not consulted when resolving a dog's rate role.");
if (!boarding.includes('if (breakdownRole === "shared-crate-additional") return "shared-crate-additional";')) failures.push("Shared-crate role cannot be recovered from the family pricing breakdown.");
if (!boarding.includes("const savedRole = boardingCurrentDogRoleForStay(entry.stay || {}, dogRatePlan);")) failures.push("Family repricing still trusts the potentially stale summary role.");
if (!main.includes("profile-history-v57-calendar-pricing-consistency-v58")) failures.push("Boarding module cache key was not updated.");
if (!index.includes("profile-history-v57-calendar-pricing-consistency-v58")) failures.push("Application entrypoint cache key was not updated.");
if (!packageJson.includes("boarding-calendar-pricing-consistency-static-check.mjs")) failures.push("The Boarding Dogs consistency regression check is not part of the test suite.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Boarding calendar and pricing consistency static checks passed.");
