import fs from "node:fs";

const boarding = fs.readFileSync("js/boarding.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");

const failures = [];

if (!boarding.includes('action: care ? "open-boarding-special-care" : ""')) failures.push("Special care is not wired as a clickable quick fact.");
if (!boarding.includes('action: "open-boarding-services"')) failures.push("Requested services are not wired as a clickable quick fact.");
if (!boarding.includes('data-boarding-services-popup')) failures.push("Requested services popup marker is missing.");
if (!boarding.includes('boardingStayServiceTaskListHtml(record, stay, { actions: true })')) failures.push("Requested services popup does not expose completion actions.");
if (!boarding.includes('>Complete</button>')) failures.push("Requested service actions do not use the requested Complete label.");
if (!boarding.includes('function boardingServiceCountdownLabel')) failures.push("Requested services do not calculate a pickup countdown label.");
if (!boarding.includes('return "Due in " + hoursRemaining + "h";')) failures.push("Requested services do not keep pickup countdowns in hours.");
if (!boarding.includes('if (hoursRemaining > 72) return "";')) failures.push("Future service countdowns are not hidden until the 72-hour action window.");
if (boarding.includes('Math.ceil(hoursRemaining / 24) + "d"')) failures.push("Requested services still convert pickup countdowns to days.");
if (!boarding.includes('flag: countdown')) failures.push("Requested services do not expose the countdown on the boarding card.");
if (!boarding.includes('boarding-service-popup-deadline')) failures.push("Requested services popup does not explain the service deadline.");
if (!shared.includes('button.dataset.action === "open-boarding-special-care"')) failures.push("Boarding card clicks do not open the special-care popup.");
if (!shared.includes('button.dataset.action === "open-boarding-services"')) failures.push("Boarding card clicks do not open the services popup.");
if (!shared.includes('action.closest("[data-boarding-services-popup]")')) failures.push("Completing a service does not preserve the services popup workflow.");
if (!shared.includes('openBoardingServicesPopup(updated, reference)')) failures.push("Services popup is not refreshed after completion.");
if (!styles.includes('#detailDialog:has(.boarding-quick-popup)')) failures.push("Quick-fact popups are not constrained to a compact width.");
if (!styles.includes('.boarding-mobile-fact-flag')) failures.push("Requested services countdown badge is not styled.");
if (!main.includes('boarding.js?v=20260723-profile-ux-fixes-v2')) failures.push("Boarding module cache key was not updated.");
if (!index.includes('js/main.js?v=20260723-customer-file-view-v2')) failures.push("Application entrypoint cache key was not updated.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Boarding quick-fact popup static checks passed.");
