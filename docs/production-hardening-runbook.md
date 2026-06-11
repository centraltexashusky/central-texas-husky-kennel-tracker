# Production Hardening Runbook

TODO: Convert the current template-string/eval module loader into native ES modules after the operational sync fixes settle. Keep this as a focused future cleanup so performance profiling, syntax checking, and browser caching can work without the current eval wrapper.

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
APP_PRODUCTION_URL=https://kennel.centraltexashusky.com
```

Optional urgent SMS secrets:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
ADMIN_ALERT_PHONES
```

Only the first three are required for `media-access`. Live boarding email delivery requires the Resend and alert email secrets above. SMS remains optional and only applies to urgent notifications.

The boarding app must keep using `send-notification` for these emails; do not call the CRM lead notification endpoint from the boarding app. After changing this function, deploy it with:

```bash
supabase functions deploy send-notification
```

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
customer_proposed_changes
legacy_dog_links
```

These are intentionally non-breaking. The live app still uses `kennel_records` until the migration and RPC/Edge Function write paths are implemented in a later app release.

`reservation_customer_updates` is the staff-to-customer update feed. Customer-requested edits should go through `customer_proposed_changes`, then staff can mark the proposal `merged` or `ignored` after review. `boarding_reservations.reviewed_by`, `reviewed_at`, `rejection_reason`, and `approved_notes` capture the handoff from customer request to approved or declined operational stay.

Before running this schema against production, confirm the dog table boundary. The current production database already has a `public.dogs` table for public website/CMS dog profiles, while this staged boarding schema expects `public.dogs` to be the kennel/customer dog identity table. Resolve that naming/model conflict before applying the normalized boarding tables.

The migration sequence should be:

1. Run the normalized schema and RLS policies in a Supabase branch after resolving the dog-table naming boundary.
2. Backfill `customerDog` records from `kennel_records` into the normalized dog identity table and write `legacy_dog_links.old_customer_dog_id`.
3. Backfill `boardingDog` stays into `boarding_reservations`, `reservation_services`, and `legacy_dog_links.old_boarding_dog_id`.
4. Switch frontend reads first, then new booking writes, then customer edit proposals.
5. Keep operational staff approval/rejection writes staff-only, with `reviewed_by`, `reviewed_at`, `approved_notes`, and `rejection_reason` populated during review.

## 6. Production Smoke Test

After deploy:

1. Admin: open Boarding Dogs and confirm each dog appears once in All Boarding Dogs.
2. Admin: open a dog, verify Boarding & Request shows the correct Stay ID and status.
3. Admin: change a stay status backward and forward, then refresh and confirm the queue/table match.
4. Customer: submit a multi-dog request and confirm only one request is created per selected dog.
5. Customer: open My Requests and confirm Stay ID labels appear as `Stay ID: ...`.
6. Customer/staff: open an uploaded file and confirm the signed media link opens.
7. Dashboard: confirm checked-out stays no longer appear as pickup reminders.
8. Customer: submit a test boarding request and confirm an admin/staff email arrives from `send-notification`.
9. Customer: confirm the customer receives the request confirmation email.
10. Admin/staff: approve or decline the test request and confirm the customer receives the status email.
11. Admin/staff: send a customer stay update and confirm the customer email arrives.
12. Admin/staff: open the related `notificationLog` record and confirm `deliveryStatus`, `emailResult`, and `sentAt` are populated.
