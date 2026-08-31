import fs from "node:fs";

const boarding = fs.readFileSync("js/boarding.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const packageJson = fs.readFileSync("package.json", "utf8");
const failures = [];

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return startIndex >= 0 && endIndex > startIndex ? source.slice(startIndex, endIndex) : "";
}

const openProfile = sectionBetween(boarding, "function openBoardingDog(record = {})", "function openBoardingDogToTab");
for (const eagerCall of [
  "renderBoardingOwnerAccountPanel(record)",
  "renderBoardingVaccinationFiles(record)",
  "renderBoardingCustomerUpdates(record)",
  "renderBoardingDogFiles(record)",
  "renderBoardingDogAgreements(record)",
  "renderBoardingStays(record)",
]) {
  if (openProfile.includes(eagerCall)) failures.push(`Profile open still eagerly calls ${eagerCall}.`);
}

if (!boarding.includes("BOARDING_PROFILE_LAZY_TARGETS")) failures.push("Profile tabs have no isolated lazy-render target map.");
if (!boarding.includes("function scheduleBoardingProfileTabRender")) failures.push("Profile tab content is not scheduled after the profile shell paints.");
if ((boarding.match(/window\.requestAnimationFrame\(\(\) => \{/g) || []).length < 2) failures.push("Profile tab rendering does not yield enough frames for the shell to paint first.");
if (!boarding.includes("section.dataset.profileRenderState = \"deferred\"")) failures.push("Deferred profile tabs do not expose their loading state.");
if (!boarding.includes('if (!boardingProfileTabIsActive("Boarding History")) return;')) failures.push("Boarding history can still render while its tab is hidden.");
if (!boarding.includes('if (!boardingProfileTabIsActive("Boarding & Request")) return;')) failures.push("Stay history can still render while its tab is hidden.");
if (!boarding.includes("const renderMobileCards = boardingRosterUsesMobileCards();")) failures.push("List view does not isolate mobile cards from desktop rows.");
if (!boarding.includes("tableBody && renderDesktopRows") || !boarding.includes("quickCardsContainer && renderMobileCards")) failures.push("List batches still build both responsive DOM trees.");
if (index.includes('id="boardingRequestsSection"') || index.includes("Review Boarding Requests")) failures.push("The redundant Boarding Requests panel is still rendered.");
if (!shared.includes('$("#boardingRequestRecords")?.addEventListener')) failures.push("Removed request-panel controls can still crash event initialization.");
if (!boarding.includes("if (!section || !list) return;")) failures.push("Legacy request rendering does not stop when the removed panel is absent.");
if (!shared.includes('if (activePageId() === "boardingDogsPage") scheduleBoardingPageRecordsRender();')) failures.push("Full app renders still eagerly build the hidden Boarding Dogs page.");
if (shared.includes("if (openDog?.id) renderBoardingDogAgreements(openDog);")) failures.push("Background record refresh still eagerly renders profile agreements.");
if (!shared.includes("syncBoardingRosterLayoutForViewport();")) failures.push("Responsive list isolation is not refreshed when the breakpoint changes.");
if (!main.includes("profile-request-isolation-v59") || !index.includes("profile-request-isolation-v59")) failures.push("Production assets are not cache-busted for profile/request isolation.");
if (!packageJson.includes("boarding-profile-request-isolation-static-check.mjs")) failures.push("The isolation regression check is not part of the full suite.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Boarding profile isolation and redundant request-panel removal checks passed.");
