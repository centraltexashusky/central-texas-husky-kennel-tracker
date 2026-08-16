-- Close customer lifecycle/entitlement escalation paths and align production
-- staff visibility with the repository's intended role boundaries.

create or replace function public.kennel_private_staff_record_type(record_type text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select record_type in ('timesheet', 'staffSchedule', 'timeOffRequest')
$$;

create or replace function public.kennel_payload_staff_email(payload jsonb)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select lower(coalesce(
    payload ->> 'staffEmail',
    payload ->> 'helperEmail',
    payload ->> 'email',
    payload ->> 'ownerEmail',
    payload ->> 'customerEmail',
    ''
  ))
$$;

create or replace function public.kennel_staff_record_belongs_to_auth(payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.kennel_payload_staff_email(payload) <> ''
    and public.kennel_payload_staff_email(payload) = public.kennel_auth_email()
$$;

create or replace function public.kennel_staff_can_read_record(record_type text, payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when kennel_private.kennel_is_admin() then true
    when not kennel_private.kennel_is_staff_member() then false
    when public.kennel_private_staff_record_type(record_type) then public.kennel_staff_record_belongs_to_auth(payload)
    else true
  end
$$;

create or replace function kennel_private.kennel_settings_user_self_write_allowed(incoming_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with incoming as (
    select
      lower(coalesce(incoming_payload ->> 'email', '')) as email,
      lower(coalesce(incoming_payload ->> 'role', 'customer')) as role,
      coalesce(incoming_payload ->> 'id', '') as payload_id,
      lower(coalesce(incoming_payload ->> 'removed', 'false')) as removed,
      lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() ->> 'role', '')) as jwt_role
  ), existing as (
    select kr.payload
    from public.kennel_records kr, incoming i
    where kr.type = 'settingsUser'
      and lower(coalesce(kr.payload ->> 'email', '')) = i.email
      and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
      and (i.payload_id = '' or kr.id = i.payload_id or coalesce(kr.payload ->> 'id', '') = i.payload_id)
    order by kr.updated_at desc nulls last, kr.id desc
    limit 1
  )
  select i.email <> ''
    and i.email = public.kennel_auth_email()
    and i.removed <> 'true'
    and (
      (
        exists (select 1 from existing)
        and i.role = lower(coalesce((select payload ->> 'role' from existing), 'customer'))
        and lower(coalesce(incoming_payload ->> 'isMember', 'false')) = lower(coalesce((select payload ->> 'isMember' from existing), 'false'))
        and coalesce(incoming_payload ->> 'hourlyRate', '') = coalesce((select payload ->> 'hourlyRate' from existing), '')
        and coalesce(incoming_payload ->> 'authId', '') = coalesce((select payload ->> 'authId' from existing), '')
        and coalesce(incoming_payload ->> 'passwordChangeRequired', '') = coalesce((select payload ->> 'passwordChangeRequired' from existing), '')
        and coalesce(incoming_payload ->> 'passwordResetRequired', '') = coalesce((select payload ->> 'passwordResetRequired' from existing), '')
        and coalesce(incoming_payload ->> 'temporaryPassword', '') = coalesce((select payload ->> 'temporaryPassword' from existing), '')
        and (
          i.role in ('customer', 'member', 'customer | member')
          or (i.role in ('admin', 'helper', 'staff') and i.role = i.jwt_role)
        )
      )
      or (
        not exists (select 1 from existing)
        and i.role = 'customer'
        and lower(coalesce(incoming_payload ->> 'isMember', 'false')) <> 'true'
        and coalesce(incoming_payload ->> 'hourlyRate', '') in ('', '0')
        and coalesce(incoming_payload ->> 'authId', '') in ('', (select auth.uid())::text)
        and coalesce(incoming_payload ->> 'temporaryPassword', '') = ''
      )
    )
  from incoming i
$$;

revoke all on function kennel_private.kennel_settings_user_self_write_allowed(jsonb) from public;
grant execute on function kennel_private.kennel_settings_user_self_write_allowed(jsonb) to authenticated;

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
  or type in ('service', 'operationHours', 'operationDateOverride', 'kennelLocation', 'kennelBuilding')
);

drop policy if exists "Kennel authenticated update records" on public.kennel_records;

create policy "Kennel staff update records"
on public.kennel_records
for update
to authenticated
using (
  kennel_private.kennel_is_staff_member()
  and public.kennel_staff_can_read_record(type, payload)
)
with check (
  kennel_private.kennel_is_staff_member()
  and public.kennel_customer_can_write(type, payload)
);

create policy "Kennel customers update own records"
on public.kennel_records
for update
to authenticated
using (
  not kennel_private.kennel_is_staff_member()
  and (
    user_id = (select auth.uid())
    or public.kennel_payload_has_email(payload)
    or public.kennel_payload_audience_has_email(payload)
    or (type = 'settingsUser' and lower(coalesce(payload ->> 'email', '')) = public.kennel_auth_email())
  )
  and (type <> 'boardingDog' or public.kennel_customer_boarding_payload_is_request(payload))
)
with check (
  user_id = (select auth.uid())
  and public.kennel_customer_can_write(type, payload)
);
