-- Manual financial ledger entries contain sensitive business information.
-- Keep them visible to admins only while preserving existing staff boundaries.
create or replace function public.kennel_staff_can_read_record(record_type text, payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when kennel_private.kennel_is_admin() then true
    when not kennel_private.kennel_is_staff_member() then false
    when record_type = 'financialTransaction' then false
    else true
  end
$$;

drop policy if exists "Kennel authenticated read records" on public.kennel_records;
create policy "Kennel authenticated read records"
on public.kennel_records
for select
to authenticated
using (
  public.kennel_staff_can_read_record(type, payload)
  or public.kennel_payload_has_email(payload)
  or public.kennel_payload_audience_has_email(payload)
  or (type = 'settingsUser' and lower(coalesce(payload ->> 'email', '')) = public.kennel_auth_email())
  or type in ('service', 'operationHours', 'operationDateOverride', 'kennelLocation', 'kennelBuilding', 'notificationPreference')
);
