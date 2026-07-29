import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const settings = fs.readFileSync(new URL("../js/settings.js", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const schema = fs.readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260729150000_add_workspace_agreement_configuration.sql", import.meta.url),
  "utf8",
);
const validatorMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260729153000_lock_custom_agreement_to_workspace_config.sql", import.meta.url),
  "utf8",
);
const mediaAccess = fs.readFileSync(
  new URL("../supabase/functions/media-access/index.ts", import.meta.url),
  "utf8",
);

const required = [
  [index, 'id="settingsAgreementForm"', "workspace agreement form"],
  [index, 'id="settingsAgreementDocument"', "PDF and Word upload"],
  [index, 'id="settingsAgreementAcknowledgementEnabled"', "optional acknowledgement control"],
  [index, 'id="settingsAgreementSignatureRequired"', "optional e-sign control"],
  [index, 'id="settingsAgreementCustomerFieldEnabled"', "optional customer response control"],
  [settings, "sanitizeWorkspaceAgreementConfig", "agreement configuration validation"],
  [settings, 'uploadMediaFiles(input, "agreement-templates/workspace"', "private agreement upload"],
  [settings, "agreement_config: sanitizeWorkspaceAgreementConfig", "remote agreement persistence"],
  [customer, 'agreementMode: custom ? "custom-template" : "built-in"', "signed agreement mode snapshot"],
  [customer, 'signatureMethod: custom && !config.signatureRequired ? "electronic-acceptance" : "drawn-signature-pad"', "optional signature evidence"],
  [customer, "customAcknowledgementRequired", "custom acknowledgement evidence"],
  [customer, "customerResponseRequired", "customer response evidence"],
  [customer, 'sourceRecordType: "appSettingsAgreement"', "agreement file access context"],
  [schema, "agreement_config jsonb", "workspace agreement schema"],
  [migration, "app_settings_agreement_config_object", "agreement configuration migration"],
  [migration, "customAcknowledgementRequired", "custom agreement RLS validation"],
  [validatorMigration, "payload #>> '{agreementDocument,storagePath}' = settings.agreement_config #>> '{document,storagePath}'", "active document validation"],
  [validatorMigration, "settings.agreement_config ->> 'signatureRequired'", "server-enforced signature configuration"],
  [validatorMigration, "settings.agreement_config ->> 'acknowledgementEnabled'", "server-enforced acknowledgement configuration"],
  [validatorMigration, "settings.agreement_config ->> 'customerFieldEnabled'", "server-enforced customer field configuration"],
  [mediaAccess, 'body.recordType === "appSettingsAgreement"', "exact agreement media authorization"],
  [mediaAccess, "payloadReferencesExactPath(config.document, storagePath)", "exact private path check"],
];

const missing = required.filter(([source, needle]) => !source.includes(needle));
if (missing.length) {
  throw new Error(`Settings agreement template static check failed: ${missing.map(([, , label]) => label).join(", ")}`);
}

if (!index.includes("application/pdf") || !index.includes(".docx")) {
  throw new Error("The agreement upload must accept PDF and Word documents.");
}
if (!mediaAccess.includes("config.customAgreementEnabled !== true")) {
  throw new Error("Customers must not receive access to a disabled workspace agreement document.");
}
if (!migration.includes("payload ->> 'signatureMethod' = 'electronic-acceptance'")) {
  throw new Error("Acceptance-only agreements must be explicitly distinguished from drawn signatures.");
}

console.log("Settings agreement template static check passed.");
