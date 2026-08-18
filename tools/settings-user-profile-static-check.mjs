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
if (!shared.includes('type === "settingsUser" && !record.removed && normalizeEmail(record.email)')) failures.push("User removal is still routed through active-profile merging and can silently restore app access.");
if (!shared.includes("settingsUserPayloadBelongsToCurrentSession(record)")) failures.push("Saving the signed-in user does not refresh the active session name.");
if (!auth.includes("const name = saved?.name || supabaseUser.user_metadata?.full_name")) failures.push("Authentication refresh can still replace a saved Settings name with stale auth metadata.");
if (!shared.includes("name: existing.name || user.name || user.email")) failures.push("Login profile refresh can still overwrite the saved profile name.");
if (!auth.includes("await supabaseClient.auth.updateUser({")) failures.push("A signed-in user's saved name is not synchronized to authentication metadata.");
if (!styles.includes(".dog-show-desktop-nav button {\n  background: #69788B;")) failures.push("Inactive desktop Dog Show tabs are not explicitly grey.");
if (!styles.includes(".dog-show-desktop-nav button.is-active {\n  background: var(--tint-blue-strong);")) failures.push("The selected desktop Dog Show tab is not explicitly blue.");
if (!main.includes('shared.js?v=20260723-customer-file-view-v2')
  || !main.includes('profile-name-persistence')
  || !main.includes('auth.js?v=20260721-dog-show-nav-user-profile-name-persistence')
  || !main.includes('settings.js?v=20260722-multi-operation-windows')) failures.push("Changed user-profile modules are not cache-busted.");
if (!index.includes('styles.css?v=20260723-profile-ux-fixes-v2')
  || !index.includes('direct-judge-search-added-show-conflicts-profile-name')
  || !index.includes('js/main.js?v=20260723-customer-file-view-v2')) failures.push("Production entry assets are not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Settings user profile static checks passed.");
