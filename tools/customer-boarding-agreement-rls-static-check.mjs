import fs from "node:fs";

const schema = fs.readFileSync(new URL("../supabase-schema.sql", import.meta.url), "utf8");
const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260727200339_allow_customer_boarding_agreement_inserts.sql", import.meta.url),
  "utf8",
);

for (const [source, label] of [[schema, "schema"], [migration, "migration"]]) {
  if (!source.includes("kennel_customer_boarding_agreement_is_valid")) {
    throw new Error(`${label} is missing the customer boarding agreement validator.`);
  }
  if (!source.includes('lower(coalesce(payload ->> \'ownerEmail\', \'\')) = public.kennel_auth_email()')) {
    throw new Error(`${label} does not bind the agreement owner to the authenticated email.`);
  }
  if (!source.includes('lower(coalesce(payload ->> \'signerEmail\', \'\')) = public.kennel_auth_email()')) {
    throw new Error(`${label} does not bind the agreement signer to the authenticated email.`);
  }
  if (!/and user_id = (?:auth\.uid\(\)|\(select auth\.uid\(\)\))/.test(source)) {
    throw new Error(`${label} does not bind the agreement row to the authenticated user.`);
  }
  if (!source.includes('type = \'boardingAgreement\'')) {
    throw new Error(`${label} does not limit the insert policy to boarding agreements.`);
  }
  if (!source.includes('nullif(trim(coalesce(payload ->> \'signatureHash\', \'\')), \'\') is not null')) {
    throw new Error(`${label} allows an agreement without a signature hash.`);
  }
}

if (/when record_type = 'boardingAgreement'/.test(schema)) {
  throw new Error("Customer boarding agreements must remain insert-only; do not add them to the general update helper.");
}

const hardeningMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260728054049_optimize_kennel_agreement_auth_uid.sql", import.meta.url),
  "utf8",
);

if (!hardeningMigration.includes("user_id = (select auth.uid())")) {
  throw new Error("The policy hardening migration must cache auth.uid() for row checks.");
}
const taskRpcMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260728054021_revoke_anon_daily_task_rpc.sql", import.meta.url),
  "utf8",
);
if (!taskRpcMigration.includes("from anon")) {
  throw new Error("The staff-only task RPC must explicitly revoke anonymous execution.");
}

console.log("customer-boarding-agreement-rls-static-check passed");
