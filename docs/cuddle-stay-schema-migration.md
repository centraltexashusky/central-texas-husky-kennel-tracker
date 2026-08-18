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
| Financial transactions | none | own rows | none | none | all |
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

