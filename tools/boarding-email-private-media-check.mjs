import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";

const source = fs.readFileSync("supabase/functions/send-notification/index.ts", "utf8");
const context = vm.createContext({
  Deno: { env: { get: () => undefined }, serve: () => {} },
  console: { log() {}, warn() {} }, URL, Response, Set, Intl,
});
vm.runInContext(stripTypeScriptTypes(source.replace(/^import .*;$/gm, "")) +
  "\nnotificationAudienceEmails = async () => []; globalThis.content = notificationContent;", context);
const record = {
  id: "boardingDog-test", dogName: "Fixture dog", ownerName: "Fixture owner",
  ownerEmail: "fixture@example.test", profilePhotoUrl:
    "https://example.supabase.co/storage/v1/object/public/kennel-media/dog-photos/test/photo.jpg",
  vaccinationRecords: [{ url: "https://example.supabase.co/storage/v1/object/public/kennel-media/dog-photos/test/vaccine.pdf" }],
  stays: [{ id: "stay-test", requestCode: "BR-TEST-123", dropoffTime: "2026-11-20T12:00", pickupTime: "2026-11-23T12:00" }],
};
for (const event of ["customerBoardingRequestCreated", "customerBoardingRequestUpdated"]) {
  // Any signing or database access in this branch is a regression.
  const client = new Proxy({}, { get() { throw new Error("Unexpected private media access during email rendering"); } });
  const result = await context.content(client, event, record);
  const admin = result.emails.find(email => email.audience === "admin");
  const customer = result.emails.find(email => email.audience === "customer");
  for (const output of [admin.html, admin.body]) {
    assert.match(output, /https:\/\/kennel\.centraltexashusky\.com\/#boardingDogsPage/);
    assert.match(output, /sign in required/);
    assert.match(output, /BR-TEST-123/);
    assert.doesNotMatch(output, /storage\/v1|example\.supabase|token=/);
  }
  assert.match(admin.html, /Customer Uploaded Files/);
  assert.match(customer.body, /#customerRequestsPage/);
  assert.doesNotMatch(customer.body, /#boardingDogsPage|storage\/v1/);
}
console.log("Private boarding email tests passed for created and updated events, HTML and text.");
