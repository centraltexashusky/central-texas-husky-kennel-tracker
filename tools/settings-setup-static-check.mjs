import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const settings = fs.readFileSync(new URL("../js/settings.js", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");

const required = [
  [index, 'data-page="settingsSetupPage"', "Setup navigation"],
  [index, 'id="settingsSetupForm"', "Setup form"],
  [index, "data-app-organization-name", "shared branding targets"],
  [shared, 'appConfig: "cth-appConfig-records"', "local branding state"],
  [settings, 'APP_BRANDING_CONFIG_ID = "workspace-branding"', "deterministic branding record"],
  [settings, 'currentRole() !== "admin"', "admin save guard"],
  [settings, 'upsertRecord("appConfig"', "persisted appConfig save"],
  [settings, '.from("app_settings")', "dedicated remote branding table"],
  [settings, 'document.title = \\`Snuggle Stay | \\${config.organizationName}\\`', "document title branding"],
  [schema, "create table if not exists public.app_settings", "dedicated app settings table"],
  [schema, 'create policy "Authenticated users can read app settings"', "narrow branding read policy"],
  [schema, 'create policy "Admins can update app settings"', "admin-only branding update policy"],
];

const missing = required.filter(([source, needle]) => !source.includes(needle));
if (missing.length) {
  throw new Error(`Settings setup static check failed: ${missing.map(([, , label]) => label).join(", ")}`);
}

console.log("Settings setup static check passed.");
