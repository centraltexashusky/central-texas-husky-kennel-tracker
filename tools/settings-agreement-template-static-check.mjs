import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const settings = fs.readFileSync(new URL("../js/settings.js", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const boarding = fs.readFileSync(new URL("../js/boarding.js", import.meta.url), "utf8");
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
const repeatableMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260729170000_add_repeatable_agreement_requirements.sql", import.meta.url),
  "utf8",
);
const textAgreementMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260729193000_allow_text_workspace_agreements.sql", import.meta.url),
  "utf8",
);
const optionalAcknowledgementMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260729200000_allow_optional_agreement_acknowledgements.sql", import.meta.url),
  "utf8",
);
const mediaAccess = fs.readFileSync(
  new URL("../supabase/functions/media-access/index.ts", import.meta.url),
  "utf8",
);

const required = [
  [index, 'id="settingsAgreementForm"', "workspace agreement form"],
  [index, 'id="settingsAgreementDocument"', "PDF and Word upload"],
  [index, 'id="settingsAgreementText"', "contract wording field"],
  [index, 'name="agreementSource"', "document or wording source selector"],
  [index, 'id="settingsAgreementAcknowledgementEnabled"', "optional acknowledgement control"],
  [index, 'id="addSettingsAgreementAcknowledgementButton"', "repeatable acknowledgement control"],
  [index, "Add customer acknowledgement checkboxes", "acknowledgement group control"],
  [index, 'id="settingsAgreementSignatureRequired"', "optional e-sign control"],
  [index, 'id="settingsAgreementCustomerFieldEnabled"', "optional customer response control"],
  [index, 'id="addSettingsAgreementCustomerFieldButton"', "repeatable customer information control"],
  [index, 'class="settings-setup-field settings-agreement-document-field"', "agreement upload second-row layout"],
  [settings, "sanitizeWorkspaceAgreementConfig", "agreement configuration validation"],
  [settings, 'agreementSource: "document"', "agreement source default"],
  [settings, 'agreementText: ""', "agreement wording persistence"],
  [settings, "sanitizeWorkspaceAgreementItems", "repeatable agreement item validation"],
  [settings, 'data-agreement-item-required="acknowledgement"', "required or optional acknowledgement control"],
  [settings, "addSettingsAgreementItem", "repeatable setup item behavior"],
  [settings, 'uploadMediaFiles(input, "agreement-templates/workspace"', "private agreement upload"],
  [settings, "agreement_config: sanitizeWorkspaceAgreementConfig", "remote agreement persistence"],
  [customer, 'agreementMode: custom ? "custom-template" : "built-in"', "signed agreement mode snapshot"],
  [customer, 'signatureMethod: custom && !config.signatureRequired ? "electronic-acceptance" : "drawn-signature-pad"', "optional signature evidence"],
  [customer, "customAcknowledgementRequired", "custom acknowledgement evidence"],
  [customer, "customAcknowledgementResponses", "all acknowledgement evidence"],
  [customer, 'item.required === false || item.accepted', "optional acknowledgement validation"],
  [customer, "customerResponseRequired", "customer response evidence"],
  [customer, "customerFieldResponses", "all customer information evidence"],
  [customer, "agreementBodyText", "signed contract wording snapshot"],
  [customer, "agreementConfiguration", "signed agreement configuration snapshot"],
  [customer, 'sourceRecordType: "appSettingsAgreement"', "agreement file access context"],
  [boarding, "renderBoardingDogAgreements", "boarding profile agreement section"],
  [boarding, "Customer selections and information", "boarding profile response summary"],
  [boarding, "customAcknowledgementResponses", "boarding profile acknowledgement responses"],
  [boarding, "customerFieldResponses", "boarding profile customer information responses"],
  [shared, 'deferred: ["boardingAgreement", "customerDog"]', "boarding agreement remote loading"],
  [schema, "agreement_config jsonb", "workspace agreement schema"],
  [migration, "app_settings_agreement_config_object", "agreement configuration migration"],
  [migration, "customAcknowledgementRequired", "custom agreement RLS validation"],
  [validatorMigration, "payload #>> '{agreementDocument,storagePath}' = settings.agreement_config #>> '{document,storagePath}'", "active document validation"],
  [validatorMigration, "settings.agreement_config ->> 'signatureRequired'", "server-enforced signature configuration"],
  [validatorMigration, "settings.agreement_config ->> 'acknowledgementEnabled'", "server-enforced acknowledgement configuration"],
  [validatorMigration, "settings.agreement_config ->> 'customerFieldEnabled'", "server-enforced customer field configuration"],
  [repeatableMigration, "jsonb_array_elements(requirements.acknowledgements) with ordinality", "repeatable acknowledgement validation"],
  [repeatableMigration, "jsonb_array_elements(requirements.customer_fields) with ordinality", "repeatable customer information validation"],
  [textAgreementMigration, "payload ->> 'agreementBodyText' = settings.agreement_config ->> 'agreementText'", "exact contract wording validation"],
  [textAgreementMigration, "payload #>> '{agreementConfiguration,agreementText}' = settings.agreement_config ->> 'agreementText'", "signed agreement wording snapshot validation"],
  [optionalAcknowledgementMigration, "'required', lower(coalesce(item ->> 'required', 'true'))", "legacy-safe acknowledgement requirement normalization"],
  [optionalAcknowledgementMigration, "customAcknowledgementRequired", "required acknowledgement summary validation"],
  [optionalAcknowledgementMigration, "and lower(coalesce((payload -> 'customAcknowledgementResponses'", "required-only acceptance validation"],
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
