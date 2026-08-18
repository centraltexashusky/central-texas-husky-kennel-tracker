# Cuddle Stay Schema Isolation

## Before

The four runtime tables (`kennel_records`, `daily_task_completions`,
`notification_reads`, and `app_settings`) and all callable kennel functions
were mixed into `public`. The unexposed `kennel_private` schema contained role
and maintenance helpers. Client table grants were broad and relied mainly on
RLS.

## After

- `cuddle_stay`: the four runtime tables and all authenticated kennel RPCs.
- `cuddle_stay_private`: authorization, settings-membership trigger, boarding
  override implementation, and care-log cleanup job.
- `shared.organizations`: the Cuddle Stay organization row.
- `shared.organization_members`: database-backed owner/admin/manager/staff/
  customer authority.
- `public`: no Cuddle Stay tables or kennel RPCs; existing website/CRM objects
  remain untouched.
- `kennel-media`: retained as the dedicated private Cuddle Stay Storage bucket;
  existing paths and files are not copied or renamed.

Table movement is performed with `ALTER TABLE ... SET SCHEMA`. No writable
compatibility tables or duplicate data sources are created. Existing primary
keys, constraints, indexes, RLS-enabled state, and Realtime publication object
identities are preserved, then policies and grants are rebuilt explicitly.

## Implemented access matrix

| Resource | anon | customer | staff | manager | owner/admin |
| --- | --- | --- | --- | --- | --- |
| Cuddle schema | none | usage | usage | usage | usage |
| Customer/dog/boarding rows | none | own | operational | operational | all |
| Lookup/services/hours | none | read | read/write as allowed | read/write | all |
| Financial transactions | none | none | none | none | all |
| Staff profiles/schedules/payroll | none | own profile only | own only | operational schedule, own profile | all |
| Daily task completions | none | none | read/write | read/write | all |
| Notification receipts | none | own | operational | operational | all |
| App settings | none | read | read | read | read/write |
| Shared membership tables | none | none direct | none direct | none direct | none direct; trusted trigger/service only |
| Private helpers | none | narrowly granted checks/onboarding | narrowly granted checks/RPC implementation | same | same |

Customer membership self-registration can only create the `customer` role.
Staff/admin/manager roles are synchronized from admin-controlled settings-user
changes. Customer self-edits cannot change role, membership, hourly rate,
auth ID, or password-control fields.

## Production verification (August 18, 2026)

- All four Cuddle Stay tables are in `cuddle_stay`; none remain in `public`.
- `shared` and `cuddle_stay_private` are not Data API schemas. Direct shared
  table access is denied to browser roles.
- Anonymous users have no schema or table privileges. Authenticated hard
  deletes are revoked.
- Customer A could not view or update Customer B's dog. Customers and staff
  could not read financial rows; staff could not read other staff profiles.
- A rollback-only lifecycle test created a customer dog and pending boarding
  request, then used a staff identity to advance it through Approved, In
  Kennel, Ready for Pickup, and Checked Out. The staff atomic-task RPC also
  succeeded.
- All four Edge Functions are active with JWT verification and use
  `cuddle_stay` explicitly. Browser reads/writes and Realtime subscriptions
  have no `public` fallback.
- Security and performance advisors have no unresolved Cuddle Stay schema,
  RLS, missing-index, or duplicate-policy findings. Remaining advisor notices
  belong to legacy `public` applications or project-level Auth configuration.

### Retention correction and recovery note

During the first production verification load, an existing browser retention
routine gained permission from an initial DELETE policy and removed 583 legacy
`notificationLog` rows older than three days. No dog, boarding, customer,
financial, schedule, or care records were removed. Authenticated DELETE was
then revoked, the browser cleanup was changed to view-only pruning, and
notification history is now retained for audit and delivery troubleshooting.
The removed notification history is not reconstructable from the current
database; use a Supabase backup/PITR restore into an isolated recovery project
if that historical delivery data is required.
