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
  if (!source.includes('and user_id = auth.uid()')) {
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

console.log("customer-boarding-agreement-rls-static-check passed");
