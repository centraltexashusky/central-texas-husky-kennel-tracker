import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const settings = read("js/settings.js");
const auth = read("js/auth.js");
const shared = read("js/shared.js");
const styles = read("styles.css");
const main = read("js/main.js");
const index = read("index.html");

const failures = [];

if (!settings.includes('name="recordId"')) failures.push("The user form still exposes an id-named control that can shadow the form id.");
if (settings.includes('<input type="hidden" name="id"')) failures.push("The popup still contains the form-id shadowing hidden control.");
if (!settings.includes('class="settings-user-pay-field"') || !settings.includes('showPayrollFields ? "" : "hidden"')) failures.push("Customer payroll fields are not hidden at render time.");
if (!settings.includes("function syncSettingsUserRoleFields")) failures.push("User role changes do not update payroll field visibility.");
if (!settings.includes("payInput.disabled = !showPayrollFields")) failures.push("Hidden customer payroll input remains submittable.");
if (!auth.includes('data.id = String(field("recordId")?.value || field("id")?.value || "").trim();')) failures.push("User form record identity is not read safely through form.elements.");
if (!auth.includes('data.name = String(field("name")?.value || "").trim();')) failures.push("The editable user name is not explicitly included in the saved profile.");
if (!shared.includes('record.name = requestedName;')) failures.push("Duplicate-profile reconciliation can still restore an old user name.");
if (!shared.includes("settingsUserPayloadBelongsToCurrentSession(record)")) failures.push("Saving the signed-in user does not refresh the active session name.");
if (!styles.includes(".dog-show-desktop-nav button {\n  background: #69788B;")) failures.push("Inactive desktop Dog Show tabs are not explicitly grey.");
if (!styles.includes(".dog-show-desktop-nav button.is-active {\n  background: var(--tint-blue-strong);")) failures.push("The selected desktop Dog Show tab is not explicitly blue.");
if (!main.includes('shared.js?v=20260721-dog-show-nav-user-profile')
  || !main.includes('auth.js?v=20260721-dog-show-nav-user-profile')
  || !main.includes('settings.js?v=20260721-dog-show-nav-user-profile')) failures.push("Changed user-profile modules are not cache-busted.");
if (!index.includes('styles.css?v=20260721-dog-show-nav-user-profile')
  || !index.includes('js/main.js?v=20260721-dog-show-nav-user-profile')) failures.push("Production entry assets are not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Settings user profile static checks passed.");
