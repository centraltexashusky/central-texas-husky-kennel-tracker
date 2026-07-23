import fs from "node:fs";

const index = fs.readFileSync("index.html", "utf8");
const daily = fs.readFileSync("js/daily.js", "utf8");
const boarding = fs.readFileSync("js/boarding.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const failures = [];

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return startIndex >= 0 && endIndex > startIndex ? source.slice(startIndex, endIndex) : "";
}

const ownedMedicalSection = sectionBetween(
  index,
  'data-owned-profile-section="Medical / Care Notes"',
  'data-owned-profile-section="Files"',
);
if (!ownedMedicalSection.includes('name="medicalCareNotes"')) failures.push("Our Dogs medical/care tab does not have the unified alert note field.");
if (ownedMedicalSection.includes('name="specialCare"') || ownedMedicalSection.includes('name="generalCareNotes"')) failures.push("Legacy Our Dogs care note fields are still rendered separately.");
if (ownedMedicalSection.includes("ownedCareEntry") || ownedMedicalSection.includes("addCareNoteLog")) failures.push("Removed Medical/Behavior Care Entry control is still rendered.");
if (!daily.includes("function ownedDogCareAlertNotes") || !daily.includes("return Boolean(ownedDogCareAlertNotes(record) || record.careStatus);")) failures.push("Unified Our Dogs note does not control the Medical/Care alert.");
if (!shared.includes('medicalCareNotes: String(formData.medicalCareNotes || "").trim()') || !shared.includes('specialCare: ""') || !shared.includes('generalCareNotes: ""')) failures.push("Our Dogs save does not migrate legacy care note fields into the unified note.");
if (shared.includes('$("#addCareNoteLog").addEventListener')) failures.push("Removed care-entry control still has a required event listener.");

const boardingDogInfo = sectionBetween(
  index,
  'data-boarding-profile-section="Dog Info"',
  'data-boarding-profile-section="Vaccination"',
);
const boardingCustomerInfo = sectionBetween(
  index,
  'data-boarding-profile-section="Customer Info"',
  'data-boarding-profile-section="Boarding History"',
);
for (const name of ["ownerName", "ownerPhone", "ownerEmail", "secondaryOwnerEmail", "emergencyName", "emergencyPhone"]) {
  if (boardingDogInfo.includes(`name="${name}"`)) failures.push(`${name} is still rendered in Boarding Dog Info.`);
  if (!boardingCustomerInfo.includes(`name="${name}"`)) failures.push(`${name} is missing from Boarding Customer Info.`);
}

const boardingFilesSection = sectionBetween(
  index,
  'data-boarding-profile-section="Uploaded Files"',
  'data-boarding-profile-section="Customer Info"',
);
if (boardingFilesSection.includes("boardingDogUploadedFiles") || boardingFilesSection.includes("uploadBoardingDogFilesButton")) failures.push("Uploaded Files still presents a staff file-upload control.");
const boardingFileItems = sectionBetween(boarding, "function boardingDogFileItems", "function renderBoardingDogFiles");
if (boardingFileItems.includes("boardingCustomerUpdate") || boardingFileItems.includes("boardingDogDocumentItems(record)")) failures.push("Uploaded Files still mixes customer-update media or staff documents into customer files.");
if (!boardingFileItems.includes("customerVaccination") || !boardingFileItems.includes("customerDocuments")) failures.push("Uploaded Files is not sourced from customer-provided records.");

const renderStays = sectionBetween(boarding, "function renderBoardingStays", "function boardingStayStatusMenuHtml");
if (!renderStays.includes("boarding-stay-card")) failures.push("Boarding stay history cards do not have a dedicated visual class.");
if (renderStays.includes("boardingStayServicesText(stay")) failures.push("Redundant requested-service sentence is still rendered above the estimate.");
if (!styles.includes('#boardingStayHistory > .boarding-stay-card')) failures.push("Dark-mode boarding stay background is not explicitly styled.");
if (!styles.includes("background: #E8F0F8 !important;")) failures.push("Light-mode boarding stay background is not visually distinct.");

if (!main.includes('shared.js?v=20260723-profile-ux-fixes-v2')
  || !main.includes('boarding.js?v=20260723-profile-ux-fixes-v2')
  || !main.includes('daily.js?v=20260723-profile-ux-fixes-v2')) failures.push("Changed profile modules are not cache-busted.");
if (!index.includes('styles.css?v=20260723-profile-ux-fixes-v2')
  || !index.includes('js/main.js?v=20260723-profile-ux-fixes-v2')) failures.push("Changed profile entry assets are not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Profile UX comment static checks passed.");
