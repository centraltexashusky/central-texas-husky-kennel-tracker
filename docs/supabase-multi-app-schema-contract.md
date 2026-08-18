# Shared Supabase Project Contract

This Supabase project hosts more than one application. Every application must
use its own PostgreSQL schema and must treat schema grants and row-level
security as independent controls.

## Existing boundaries

| Schema | Owner/purpose | Data API exposure |
| --- | --- | --- |
| `public` | Legacy Central Texas Husky website/CRM objects | Exposed for existing applications; do not add new app tables here |
| `shared` | Cross-app organization primitives | Not exposed |
| `cuddle_stay` | Cuddle Stay tables, RLS helpers, and authenticated RPCs | Exposed |
| `cuddle_stay_private` | Privileged Cuddle Stay authorization, triggers, and cron helpers | Not exposed |
| `auth`, `storage`, `realtime` | Supabase-managed resources | Supabase-managed |

`shared.organization_members` is the cross-app membership boundary.
`shared.organization_member_revocations` preserves an administrator's removal
decision: self-registration must reject a matching revocation, and only an
explicit administrator profile save may clear it.

The Cuddle Stay organization ID is
`c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001`. It is an intentional stable
identifier, not a per-environment generated value.

## Requirements for every new application

1. Create one app-facing schema, such as `vazpha`, and optionally a separate
   unexposed helper schema such as `vazpha_private`.
2. Do not add application tables, views, or RPCs to `public`.
3. Add the app-facing schema to PostgREST's exposed schema list only when its
   grants and RLS are ready. Never expose the private helper schema or `shared`.
4. Start with `REVOKE ALL ON SCHEMA <app> FROM PUBLIC, anon, authenticated`.
   Grant `USAGE` and individual table/function privileges intentionally.
5. Enable RLS on every Data API table. Define separate `SELECT`, `INSERT`,
   `UPDATE`, and `DELETE` policies; tenant-preserving updates need both `USING`
   and `WITH CHECK`.
6. Add `organization_id` to business-owned rows and authorize against
   `shared.organization_members`. An app must not grant its users membership
   in another app's organization.
7. Keep role and entitlement authority in database rows or trusted
   `app_metadata`; never authorize from user-editable `user_metadata`.
8. Prefer `SECURITY INVOKER`. A necessary `SECURITY DEFINER` function belongs
   in the app's unexposed private schema, must validate `auth.uid()`, set an
   empty/fixed `search_path`, revoke `PUBLIC` execution, and receive only the
   minimum explicit grant.
9. Configure restrictive `ALTER DEFAULT PRIVILEGES` rules so new tables,
   sequences, and functions receive no automatic client access.
10. Namespace Storage with a dedicated private bucket or app prefix and enforce
    object ownership plus organization roles in Storage RLS. Never manipulate
    `storage.objects` directly.
11. Add only required tables to `supabase_realtime`; specify the app schema in
    subscriptions and verify RLS with real authenticated sessions.
12. Service-role keys belong only in trusted Edge Functions/server runtimes.
    They must never appear in browser bundles, public environment variables,
    local storage, or API responses.
13. Store every DDL change in `supabase/migrations`. Run schema-isolation,
    cross-customer, anonymous, advisor, and full application lifecycle tests
    before production promotion.
14. Cuddle Stay migrations must finish with
    `select cuddle_stay_private.assert_schema_integrity();`. The assertion
    aborts migrations when table placement, RLS/grants, membership roles,
    revocations, tenant IDs, or the membership trigger drift.

## New-app acceptance checklist

- `anon` has no `USAGE` on the new schema unless an explicitly tested public
  endpoint requires it.
- Authenticated users from Cuddle Stay cannot use the new schema or its tables.
- New-app users cannot use `cuddle_stay`, except for users who independently
  hold a Cuddle Stay membership.
- Customer A cannot select or mutate Customer B's rows, including by changing
  IDs, email fields, or `organization_id`.
- App staff cannot read restricted payroll/financial/admin records.
- Realtime, Storage, RPCs, cron, Edge Functions, and generated types use the
  correct schema explicitly.
- Supabase security/performance advisors are reviewed and all app-relevant
  findings are fixed or documented.

Use
[`20260818190000_isolate_cuddle_stay_schema.sql`](../supabase/migrations/20260818190000_isolate_cuddle_stay_schema.sql)
as the working example. Do not copy its Cuddle Stay organization ID or policy
rules into another app; create that app's own organization and access matrix.
