-- Isolate Cuddle Stay from the other applications that share this Supabase
-- project. Tables are moved in place, so row identities, indexes, constraints,
-- publication membership, and data remain intact.

create schema if not exists shared;
create schema if not exists cuddle_stay;

revoke all on schema shared from public, anon, authenticated;
revoke all on schema cuddle_stay from public, anon, authenticated;
grant usage on schema cuddle_stay to authenticated, service_role;

create table if not exists shared.organizations (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  constraint organizations_name_not_blank check (char_length(trim(name)) > 0),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists shared.organization_members (
  organization_id uuid not null references shared.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_role check (role in ('owner', 'admin', 'manager', 'staff', 'customer'))
);

alter table shared.organizations enable row level security;
alter table shared.organization_members enable row level security;
revoke all on all tables in schema shared from public, anon, authenticated;
grant select, insert, update, delete on shared.organizations to service_role;
grant select, insert, update, delete on shared.organization_members to service_role;

insert into shared.organizations (id, name, slug)
values ('c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001', 'Cuddle Stay', 'cuddle-stay')
on conflict (slug) do update set name = excluded.name;

alter table public.kennel_records
  add column if not exists organization_id uuid;
alter table public.daily_task_completions
  add column if not exists organization_id uuid;
alter table public.notification_reads
  add column if not exists organization_id uuid;
alter table public.app_settings
  add column if not exists organization_id uuid;

update public.kennel_records
set organization_id = 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001'
where organization_id is null;
update public.daily_task_completions
set organization_id = 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001'
where organization_id is null;
update public.notification_reads
set organization_id = 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001'
where organization_id is null;
update public.app_settings
set organization_id = 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001'
where organization_id is null;

alter table public.kennel_records
  alter column organization_id set default 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001',
  alter column organization_id set not null;
alter table public.daily_task_completions
  alter column organization_id set default 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001',
  alter column organization_id set not null;
alter table public.notification_reads
  alter column organization_id set default 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001',
  alter column organization_id set not null;
alter table public.app_settings
  alter column organization_id set default 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001',
  alter column organization_id set not null;

do $migration$
begin
  if not exists (select 1 from pg_constraint where conname = 'kennel_records_organization_id_fkey') then
    alter table public.kennel_records add constraint kennel_records_organization_id_fkey
      foreign key (organization_id) references shared.organizations(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'daily_task_completions_organization_id_fkey') then
    alter table public.daily_task_completions add constraint daily_task_completions_organization_id_fkey
      foreign key (organization_id) references shared.organizations(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'notification_reads_organization_id_fkey') then
    alter table public.notification_reads add constraint notification_reads_organization_id_fkey
      foreign key (organization_id) references shared.organizations(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'app_settings_organization_id_fkey') then
    alter table public.app_settings add constraint app_settings_organization_id_fkey
      foreign key (organization_id) references shared.organizations(id);
  end if;
end
$migration$;

-- Seed membership from the existing Cuddle Stay profiles and owned records.
with active_profiles as (
  select distinct on (lower(payload ->> 'email'))
    lower(payload ->> 'email') as email,
    lower(coalesce(payload ->> 'role', 'customer')) as profile_role
  from public.kennel_records
  where type = 'settingsUser'
    and coalesce(lower(payload ->> 'removed'), 'false') <> 'true'
    and nullif(lower(payload ->> 'email'), '') is not null
  order by lower(payload ->> 'email'), updated_at desc, id desc
), cuddle_users as (
  select distinct u.id as user_id,
    case
      when ap.profile_role = 'admin' then 'admin'
      when ap.profile_role in ('manager') then 'manager'
      when ap.profile_role in ('helper', 'staff') then 'staff'
      else 'customer'
    end as role
  from auth.users u
  left join active_profiles ap on ap.email = lower(u.email)
  where ap.email is not null
     or exists (select 1 from public.kennel_records kr where kr.user_id = u.id)
)
insert into shared.organization_members (organization_id, user_id, role)
select 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001', user_id, role
from cuddle_users
on conflict (organization_id, user_id) do update
set role = excluded.role, updated_at = now();

alter table public.kennel_records set schema cuddle_stay;
alter table public.daily_task_completions set schema cuddle_stay;
alter table public.notification_reads set schema cuddle_stay;
alter table public.app_settings set schema cuddle_stay;

create index if not exists kennel_records_organization_id_idx on cuddle_stay.kennel_records (organization_id);
create index if not exists daily_task_completions_organization_id_idx on cuddle_stay.daily_task_completions (organization_id);
create index if not exists notification_reads_organization_id_idx on cuddle_stay.notification_reads (organization_id);

-- Rename the old unexposed helper namespace, then move every Cuddle Stay RPC
-- and policy helper out of public. The definitions are rewritten from the live
-- catalog so later production hotfixes are preserved rather than overwritten.
alter schema kennel_private rename to cuddle_stay_private;
revoke all on schema cuddle_stay_private from public, anon, authenticated;

do $migration$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as identity
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (p.proname like 'kennel_%' or p.proname = 'complete_daily_task_atomic')
  loop
    execute format('alter function %s set schema cuddle_stay', fn.identity);
  end loop;
end
$migration$;

do $migration$
declare
  fn record;
  definition text;
begin
  for fn in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('cuddle_stay', 'cuddle_stay_private')
      and (p.proname like 'kennel_%' or p.proname in ('complete_daily_task_atomic', 'cleanup_expired_show_care_logs'))
  loop
    definition := pg_get_functiondef(fn.oid);
    definition := replace(definition, 'public.kennel_records', 'cuddle_stay.kennel_records');
    definition := replace(definition, 'public.daily_task_completions', 'cuddle_stay.daily_task_completions');
    definition := replace(definition, 'public.notification_reads', 'cuddle_stay.notification_reads');
    definition := replace(definition, 'public.app_settings', 'cuddle_stay.app_settings');
    definition := replace(definition, 'public.kennel_', 'cuddle_stay.kennel_');
    definition := replace(definition, 'kennel_private.', 'cuddle_stay_private.');
    definition := replace(definition, '''public'', ''pg_temp''', '''cuddle_stay'', ''shared'', ''pg_temp''');
    execute definition;
  end loop;
end
$migration$;

create or replace function cuddle_stay_private.cuddle_stay_organization_id()
returns uuid
language sql
immutable
set search_path = ''
as $$
  select 'c0dd1e57-a7a9-4f58-9f2a-0ca2d15e0001'::uuid
$$;

create or replace function cuddle_stay_private.kennel_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select member.role
    from shared.organization_members member
    where member.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and member.user_id = (select auth.uid())
    limit 1
  ), '')
$$;

create or replace function cuddle_stay_private.kennel_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cuddle_stay_private.kennel_user_role() in ('owner', 'admin')
$$;

create or replace function cuddle_stay_private.kennel_is_staff_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cuddle_stay_private.kennel_user_role() in ('owner', 'admin', 'manager', 'staff')
$$;

create or replace function cuddle_stay_private.kennel_settings_user_self_write_allowed(incoming_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with incoming as (
    select
      lower(coalesce(incoming_payload ->> 'email', '')) as email,
      lower(coalesce(incoming_payload ->> 'role', 'customer')) as role,
      coalesce(incoming_payload ->> 'id', '') as payload_id,
      lower(coalesce(incoming_payload ->> 'removed', 'false')) as removed
  ), existing as (
    select kr.payload
    from cuddle_stay.kennel_records kr, incoming i
    where kr.type = 'settingsUser'
      and kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and lower(coalesce(kr.payload ->> 'email', '')) = i.email
      and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
      and (i.payload_id = '' or kr.id = i.payload_id or coalesce(kr.payload ->> 'id', '') = i.payload_id)
    order by kr.updated_at desc nulls last, kr.id desc
    limit 1
  )
  select i.email <> ''
    and i.email = cuddle_stay.kennel_auth_email()
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

create or replace function cuddle_stay_private.register_customer_membership_internal()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  user_id uuid := (select auth.uid());
  organization_id uuid := cuddle_stay_private.cuddle_stay_organization_id();
begin
  if user_id is null or nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '') is null then
    raise exception 'A verified Cuddle Stay login is required.' using errcode = '42501';
  end if;
  insert into shared.organization_members (organization_id, user_id, role)
  values (organization_id, user_id, 'customer')
  on conflict (organization_id, user_id) do nothing;
  return organization_id;
end
$$;

create or replace function cuddle_stay.register_customer_membership()
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select cuddle_stay_private.register_customer_membership_internal()
$$;

create or replace function cuddle_stay_private.sync_settings_user_membership()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  mapped_role text;
  profile_auth_id text := nullif(new.payload ->> 'authId', '');
begin
  if new.type <> 'settingsUser' then return new; end if;
  if profile_auth_id ~ '^[0-9a-fA-F-]{36}$' then target_user_id := profile_auth_id::uuid; end if;
  if target_user_id is null then
    select u.id into target_user_id from auth.users u
    where lower(u.email) = lower(coalesce(new.payload ->> 'email', '')) limit 1;
  end if;
  if target_user_id is null then return new; end if;
  if lower(coalesce(new.payload ->> 'removed', 'false')) = 'true' then
    delete from shared.organization_members member
    where member.organization_id = new.organization_id and member.user_id = target_user_id;
    return new;
  end if;
  mapped_role := case lower(coalesce(new.payload ->> 'role', 'customer'))
    when 'admin' then 'admin'
    when 'manager' then 'manager'
    when 'helper' then 'staff'
    when 'staff' then 'staff'
    else 'customer'
  end;
  insert into shared.organization_members (organization_id, user_id, role)
  values (new.organization_id, target_user_id, mapped_role)
  on conflict (organization_id, user_id) do update
  set role = excluded.role, updated_at = now();
  return new;
end
$$;

drop trigger if exists sync_settings_user_membership on cuddle_stay.kennel_records;
create trigger sync_settings_user_membership
after insert or update of type, payload, organization_id on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.sync_settings_user_membership();

create or replace function cuddle_stay.kennel_private_staff_record_type(record_type text)
returns boolean language sql immutable set search_path = '' as $$
  select record_type in ('settingsUser', 'timesheet', 'staffSchedule', 'timeOffRequest')
$$;

create or replace function cuddle_stay.kennel_payload_staff_email(payload jsonb)
returns text language sql stable set search_path = '' as $$
  select lower(coalesce(payload ->> 'staffEmail', payload ->> 'helperEmail', payload ->> 'email', ''))
$$;

create or replace function cuddle_stay.kennel_staff_record_belongs_to_auth(payload jsonb)
returns boolean language sql stable set search_path = '' as $$
  select cuddle_stay.kennel_payload_staff_email(payload) <> ''
    and cuddle_stay.kennel_payload_staff_email(payload) = cuddle_stay.kennel_auth_email()
$$;

create or replace function cuddle_stay.kennel_staff_can_read_record(record_type text, payload jsonb)
returns boolean language sql stable set search_path = '' as $$
  select case
    when cuddle_stay_private.kennel_is_admin() then true
    when not cuddle_stay_private.kennel_is_staff_member() then false
    when record_type = 'financialTransaction' then false
    when cuddle_stay.kennel_private_staff_record_type(record_type) then cuddle_stay.kennel_staff_record_belongs_to_auth(payload)
    else true
  end
$$;

create or replace function cuddle_stay.kennel_staff_can_write_record(record_type text, payload jsonb)
returns boolean language sql stable set search_path = '' as $$
  select case
    when cuddle_stay_private.kennel_is_admin() then true
    when not cuddle_stay_private.kennel_is_staff_member() then false
    when record_type in ('financialTransaction', 'settingsUser') then false
    when record_type in ('timesheet', 'timeOffRequest') then cuddle_stay.kennel_staff_record_belongs_to_auth(payload)
    when record_type = 'staffSchedule' then cuddle_stay_private.kennel_user_role() = 'manager'
    else cuddle_stay.kennel_staff_can_write_type(record_type)
  end
$$;

create or replace function cuddle_stay.kennel_customer_can_write(record_type text, payload jsonb)
returns boolean language sql stable set search_path = '' as $$
  select case
    when cuddle_stay_private.kennel_is_admin() then true
    when record_type = 'settingsUser' then cuddle_stay_private.kennel_settings_user_self_write_allowed(payload)
    when cuddle_stay_private.kennel_is_staff_member() then cuddle_stay.kennel_staff_can_write_record(record_type, payload)
    when record_type = 'boardingDog' then cuddle_stay.kennel_customer_boarding_payload_is_request(payload)
    when record_type in ('customerDog', 'request', 'maintenance') then cuddle_stay.kennel_payload_has_email(payload)
    when record_type = 'notificationLog' then cuddle_stay.kennel_payload_audience_has_email(payload)
    else false
  end
$$;

drop policy if exists "Kennel authenticated read records" on cuddle_stay.kennel_records;
drop policy if exists "Kennel authenticated insert records" on cuddle_stay.kennel_records;
drop policy if exists "Kennel authenticated update records" on cuddle_stay.kennel_records;
drop policy if exists "Kennel staff update records" on cuddle_stay.kennel_records;
drop policy if exists "Kennel customers update own records" on cuddle_stay.kennel_records;

create policy "Cuddle Stay members read permitted records" on cuddle_stay.kennel_records
for select to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_user_role() <> ''
  and (
    cuddle_stay.kennel_staff_can_read_record(type, payload)
    or user_id = (select auth.uid())
    or cuddle_stay.kennel_payload_has_email(payload)
    or cuddle_stay.kennel_payload_audience_has_email(payload)
    or (type = 'settingsUser' and lower(coalesce(payload ->> 'email', '')) = cuddle_stay.kennel_auth_email())
    or type in ('service', 'operationHours', 'operationDateOverride', 'kennelLocation', 'kennelBuilding')
  )
);

create policy "Cuddle Stay members insert permitted records" on cuddle_stay.kennel_records
for insert to authenticated with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_user_role() <> ''
  and (
    (
      cuddle_stay.kennel_customer_can_write(type, payload)
      and (cuddle_stay_private.kennel_is_staff_member() or user_id = (select auth.uid()))
    )
    or (
      type = 'boardingAgreement'
      and user_id = (select auth.uid())
      and cuddle_stay.kennel_customer_boarding_agreement_is_valid(payload)
    )
  )
);

create policy "Cuddle Stay staff update permitted records" on cuddle_stay.kennel_records
for update to authenticated
using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_is_staff_member()
  and cuddle_stay.kennel_staff_can_read_record(type, payload)
)
with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay.kennel_customer_can_write(type, payload)
);

create policy "Cuddle Stay customers update own request data" on cuddle_stay.kennel_records
for update to authenticated
using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_user_role() = 'customer'
  and (
    user_id = (select auth.uid())
    or cuddle_stay.kennel_payload_has_email(payload)
    or cuddle_stay.kennel_payload_audience_has_email(payload)
    or (type = 'settingsUser' and lower(coalesce(payload ->> 'email', '')) = cuddle_stay.kennel_auth_email())
  )
  and (type <> 'boardingDog' or cuddle_stay.kennel_customer_boarding_payload_is_request(payload))
)
with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and user_id = (select auth.uid())
  and cuddle_stay.kennel_customer_can_write(type, payload)
);

create policy "Cuddle Stay admins delete records" on cuddle_stay.kennel_records
for delete to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_is_admin()
);

create policy "Cuddle Stay staff delete expired notification logs" on cuddle_stay.kennel_records
for delete to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_is_staff_member()
  and type = 'notificationLog'
  and submitted_at < now() - interval '45 days'
);

drop policy if exists "Authenticated users can read app settings" on cuddle_stay.app_settings;
drop policy if exists "Admins can insert app settings" on cuddle_stay.app_settings;
drop policy if exists "Admins can update app settings" on cuddle_stay.app_settings;
create policy "Cuddle Stay members read app settings" on cuddle_stay.app_settings
for select to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_user_role() <> ''
);
create policy "Cuddle Stay admins insert app settings" on cuddle_stay.app_settings
for insert to authenticated with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_is_admin()
);
create policy "Cuddle Stay admins update app settings" on cuddle_stay.app_settings
for update to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_is_admin()
) with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay_private.kennel_is_admin()
);

drop policy if exists "Kennel staff can read daily task completions" on cuddle_stay.daily_task_completions;
drop policy if exists "Kennel staff can insert daily task completions" on cuddle_stay.daily_task_completions;
drop policy if exists "Kennel staff can update daily task completions" on cuddle_stay.daily_task_completions;
create policy "Cuddle Stay staff read task completions" on cuddle_stay.daily_task_completions
for select to authenticated using (organization_id = cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member());
create policy "Cuddle Stay staff insert task completions" on cuddle_stay.daily_task_completions
for insert to authenticated with check (organization_id = cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member());
create policy "Cuddle Stay staff update task completions" on cuddle_stay.daily_task_completions
for update to authenticated using (organization_id = cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member())
with check (organization_id = cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member());

drop policy if exists "Kennel notification reads select" on cuddle_stay.notification_reads;
drop policy if exists "Kennel notification reads insert" on cuddle_stay.notification_reads;
drop policy if exists "Kennel notification reads update" on cuddle_stay.notification_reads;
create policy "Cuddle Stay notification reads select" on cuddle_stay.notification_reads
for select to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and (cuddle_stay_private.kennel_is_staff_member() or lower(reader_email) = cuddle_stay.kennel_auth_email())
);
create policy "Cuddle Stay notification reads insert" on cuddle_stay.notification_reads
for insert to authenticated with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and (cuddle_stay_private.kennel_is_staff_member() or lower(reader_email) = cuddle_stay.kennel_auth_email())
);
create policy "Cuddle Stay notification reads update" on cuddle_stay.notification_reads
for update to authenticated using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and (cuddle_stay_private.kennel_is_staff_member() or lower(reader_email) = cuddle_stay.kennel_auth_email())
) with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and (cuddle_stay_private.kennel_is_staff_member() or lower(reader_email) = cuddle_stay.kennel_auth_email())
);

revoke all on all tables in schema cuddle_stay from public, anon, authenticated, service_role;
grant select, insert, update, delete on cuddle_stay.kennel_records to authenticated, service_role;
grant select, insert, update on cuddle_stay.daily_task_completions to authenticated, service_role;
grant select, insert, update on cuddle_stay.notification_reads to authenticated, service_role;
grant select, insert, update on cuddle_stay.app_settings to authenticated, service_role;

revoke all on all functions in schema cuddle_stay from public, anon, authenticated, service_role;
revoke all on all functions in schema cuddle_stay_private from public, anon, authenticated, service_role;

grant execute on function cuddle_stay.register_customer_membership() to authenticated, service_role;
grant execute on function cuddle_stay.complete_daily_task_atomic(date, text, text, text, text, text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_active_boarding_records(timestamptz) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_scheduled_care_tasks_window(date, date, timestamptz) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_apply_boarding_requirement_override(text, text, text, text, jsonb, text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_auth_email() to authenticated, service_role;
grant execute on function cuddle_stay.kennel_payload_has_email(jsonb, text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_payload_audience_has_email(jsonb, text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_customer_boarding_status_is_request(text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_customer_boarding_payload_is_request(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_customer_boarding_agreement_is_valid(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_is_staff_member() to authenticated, service_role;
grant execute on function cuddle_stay.kennel_is_admin() to authenticated, service_role;
grant execute on function cuddle_stay.kennel_staff_can_write_type(text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_private_staff_record_type(text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_payload_staff_email(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_staff_record_belongs_to_auth(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_staff_can_read_record(text, jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_staff_can_write_record(text, jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_customer_can_write(text, jsonb) to authenticated, service_role;

grant execute on function cuddle_stay_private.cuddle_stay_organization_id() to authenticated, service_role;
grant execute on function cuddle_stay_private.kennel_user_role() to authenticated, service_role;
grant execute on function cuddle_stay_private.kennel_is_admin() to authenticated, service_role;
grant execute on function cuddle_stay_private.kennel_is_staff_member() to authenticated, service_role;
grant execute on function cuddle_stay_private.kennel_settings_user_self_write_allowed(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay_private.register_customer_membership_internal() to authenticated, service_role;
grant execute on function cuddle_stay_private.kennel_apply_boarding_requirement_override_internal(text, text, text, text, jsonb, text) to authenticated, service_role;

alter default privileges for role postgres in schema cuddle_stay revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema cuddle_stay revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema cuddle_stay revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema shared revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema shared revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema shared revoke all on functions from public, anon, authenticated, service_role;

-- PostgREST exposes only the app-facing schema; shared and private remain
-- inaccessible through the Data API.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, cuddle_stay';
notify pgrst, 'reload config';

do $migration$
declare
  job record;
begin
  for job in select jobid from cron.job where command = 'select kennel_private.cleanup_expired_show_care_logs();'
  loop
    perform cron.alter_job(job.jobid, command := 'select cuddle_stay_private.cleanup_expired_show_care_logs();');
  end loop;
end
$migration$;

-- Prove that a newly created future-app schema gets no inherited client
-- privileges, then remove it in the same migration.
create schema isolation_test_app;
create table isolation_test_app.boundary_probe (id uuid primary key default gen_random_uuid());
do $migration$
begin
  if has_schema_privilege('anon', 'isolation_test_app', 'usage')
     or has_schema_privilege('authenticated', 'isolation_test_app', 'usage')
     or has_table_privilege('anon', 'isolation_test_app.boundary_probe', 'select')
     or has_table_privilege('authenticated', 'isolation_test_app.boundary_probe', 'select') then
    raise exception 'Future application schema inherited client privileges.';
  end if;
end
$migration$;
drop schema isolation_test_app cascade;

comment on schema cuddle_stay is 'Cuddle Stay application data and authenticated RPC boundary.';
comment on schema cuddle_stay_private is 'Unexposed Cuddle Stay authorization, trigger, and maintenance functions.';
comment on schema shared is 'Cross-application organization primitives; not exposed through the Data API.';
comment on table shared.organization_members is 'Database-backed app membership. Roles are staff-managed; customers may only self-register as customer.';
