# Production Hardening Runbook

Use this runbook for the six remaining production items: database policies, Edge Function validation, duplicate boarding data cleanup, private media readiness, normalized data staging, and production smoke testing.

## 1. Apply Supabase SQL

Run these SQL files in Supabase SQL Editor, in this order:

1. `supabase-schema.sql`
2. `supabase-normalized-boarding-schema.sql`

Do not run `supabase-private-media.sql` until the `media-access` Edge Function is deployed and tested.

## 2. Validate And Deploy Edge Functions

Install Deno if it is not available locally, then run:

```bash
node tools/check-edge-functions.mjs
```

Deploy both functions:

```bash
supabase functions deploy send-notification
supabase functions deploy media-access
```

Required secrets:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
ALERT_FROM_EMAIL
ADMIN_ALERT_EMAILS
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
ADMIN_ALERT_PHONES
APP_PRODUCTION_URL
```

Only the first three are required for `media-access`. Email/SMS secrets are required for live notification delivery.

## 3. Clean Duplicate Boarding Data

Always run a dry-run first:

```bash
SUPABASE_URL="https://PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY" \
node tools/boarding-data-maintenance.mjs --json
```

Review affected dog groups, duplicate profile IDs, and duplicate logical stays. Then apply:

```bash
SUPABASE_URL="https://PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY" \
node tools/boarding-data-maintenance.mjs --apply
```

The script does not delete rows. It writes a canonical merged boarding dog record, preserves source IDs, and marks duplicate profiles as `removed` with `mergedIntoBoardingDogId`.

## 4. Move Media Private

After `media-access` is deployed and tested from the app, paste and run the contents of `supabase-private-media.sql` in Supabase SQL Editor.

The app will use short-lived signed URLs for file buttons that include `storagePath`. Existing public `url` values remain as a fallback for older records while the migration is verified.

## 5. Stage The Long-Term Data Model

`supabase-normalized-boarding-schema.sql` creates the future tables:

```text
dogs
user_dog_access
boarding_reservations
reservation_services
dog_vaccinations
dog_internal_notes
dog_activity_logs
reservation_customer_updates
legacy_dog_links
```

These are intentionally non-breaking. The live app still uses `kennel_records` until the migration and RPC/Edge Function write paths are implemented in a later app release.

## 6. Production Smoke Test

After deploy:

1. Admin: open Boarding Dogs and confirm each dog appears once in All Boarding Dogs.
2. Admin: open a dog, verify Boarding & Request shows the correct Stay ID and status.
3. Admin: change a stay status backward and forward, then refresh and confirm the queue/table match.
4. Customer: submit a multi-dog request and confirm only one request is created per selected dog.
5. Customer: open My Requests and confirm Stay ID labels appear as `Stay ID: ...`.
6. Customer/staff: open an uploaded file and confirm the signed media link opens.
7. Dashboard: confirm checked-out stays no longer appear as pickup reminders.
