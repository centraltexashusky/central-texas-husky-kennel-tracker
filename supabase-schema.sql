-- Central Texas Husky kennel tracker Supabase setup.
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create table if not exists public.kennel_records (
  id text primary key,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  helper_email text,
  user_id uuid,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kennel_records_type_idx on public.kennel_records (type);
create index if not exists kennel_records_updated_idx on public.kennel_records (updated_at desc);
create index if not exists kennel_records_helper_idx on public.kennel_records (helper_email);

alter table public.kennel_records enable row level security;

drop policy if exists "Authenticated users can read kennel records" on public.kennel_records;
drop policy if exists "Authenticated users can insert kennel records" on public.kennel_records;
drop policy if exists "Authenticated users can update kennel records" on public.kennel_records;
drop policy if exists "Users can insert their own kennel records" on public.kennel_records;
drop policy if exists "Users can update own records and admin can update all" on public.kennel_records;
drop policy if exists "Kennel app can read records" on public.kennel_records;
drop policy if exists "Kennel app can insert records" on public.kennel_records;
drop policy if exists "Kennel app can update records" on public.kennel_records;
drop policy if exists "Kennel authenticated read records" on public.kennel_records;
drop policy if exists "Kennel authenticated insert records" on public.kennel_records;
drop policy if exists "Kennel authenticated update records" on public.kennel_records;

create or replace function public.kennel_auth_email()
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.kennel_payload_has_email(payload jsonb, email text default public.kennel_auth_email())
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select lower(coalesce(email, '')) <> ''
    and (
      lower(coalesce(payload ->> 'ownerEmail', '')) = lower(email)
      or lower(coalesce(payload ->> 'customerEmail', '')) = lower(email)
      or lower(coalesce(payload ->> 'requestedByEmail', '')) = lower(email)
      or lower(coalesce(payload ->> 'linkedOwnerEmail', '')) = lower(email)
      or lower(coalesce(payload ->> 'secondaryOwnerEmail', '')) = lower(email)
      or lower(coalesce(payload ->> 'staffEmail', '')) = lower(email)
      or lower(coalesce(payload ->> 'helperEmail', '')) = lower(email)
    )
$$;

create or replace function public.kennel_payload_audience_has_email(payload jsonb, email text default public.kennel_auth_email())
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select lower(coalesce(email, '')) <> ''
    and exists (
      select 1
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(payload -> 'audienceEmails') = 'array' then payload -> 'audienceEmails'
          else '[]'::jsonb
        end
      ) audience(email_value)
      where lower(audience.email_value) = lower(email)
    )
$$;

create or replace function public.kennel_customer_boarding_status_is_request(status text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select lower(trim(coalesce(status, ''))) in ('', 'draft', 'pending', 'pending_customer_request', 'pending customer request', 'cancelled', 'canceled')
$$;

create or replace function public.kennel_customer_boarding_payload_is_request(payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.kennel_payload_has_email(payload)
    and lower(coalesce(payload ->> 'customerRequest', 'false')) in ('true', 't', '1', 'yes', 'on')
    and lower(coalesce(payload ->> 'removed', 'false')) <> 'true'
    and public.kennel_customer_boarding_status_is_request(coalesce(payload ->> 'boardingStatus', payload ->> 'status', 'Pending'))
    and nullif(coalesce(payload ->> 'approvedAt', ''), '') is null
    and nullif(coalesce(payload ->> 'approvedBy', ''), '') is null
    and nullif(coalesce(payload ->> 'checkedInAt', ''), '') is null
    and nullif(coalesce(payload ->> 'inKennelAt', ''), '') is null
    and nullif(coalesce(payload ->> 'readyForPickupAt', ''), '') is null
    and nullif(coalesce(payload ->> 'checkedOutAt', ''), '') is null
    and nullif(coalesce(payload ->> 'kennelLocationId', ''), '') is null
    and nullif(coalesce(payload ->> 'kennelLocationName', ''), '') is null
    and nullif(coalesce(payload ->> 'kennelBuilding', ''), '') is null
    and nullif(coalesce(payload ->> 'kennelAssignedAt', ''), '') is null
    and not exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(payload -> 'stays') = 'array' then payload -> 'stays'
          else '[]'::jsonb
        end
      ) stay(value)
      where not public.kennel_customer_boarding_status_is_request(stay.value ->> 'status')
        or nullif(coalesce(stay.value ->> 'approvedAt', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'approvedBy', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'checkedInAt', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'inKennelAt', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'readyForPickupAt', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'checkedOutAt', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'kennelLocationId', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'kennelLocationName', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'kennelBuilding', ''), '') is not null
        or nullif(coalesce(stay.value ->> 'kennelAssignedAt', ''), '') is not null
    )
    and not exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(payload -> 'statusHistory') = 'array' then payload -> 'statusHistory'
          else '[]'::jsonb
        end
      ) history(value)
      where not public.kennel_customer_boarding_status_is_request(history.value ->> 'from')
         or not public.kennel_customer_boarding_status_is_request(history.value ->> 'to')
    )
$$;

create schema if not exists kennel_private;

create or replace function kennel_private.kennel_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Bootstrap admin access by inserting a settingsUser kennel_records row
  -- directly in Supabase Studio with payload.role = 'admin'.
  select coalesce((
    select lower(coalesce(kr.payload ->> 'role', ''))
    from public.kennel_records kr
    where kr.type = 'settingsUser'
      and lower(coalesce(kr.payload ->> 'email', '')) = public.kennel_auth_email()
      and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
    order by kr.updated_at desc nulls last, kr.submitted_at desc nulls last
    limit 1
  ), '')
$$;

create or replace function kennel_private.kennel_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select kennel_private.kennel_user_role() = 'admin'
$$;

create or replace function kennel_private.kennel_is_staff_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select kennel_private.kennel_user_role() in ('admin', 'helper', 'staff')
$$;

revoke all on function kennel_private.kennel_user_role() from public;
revoke all on function kennel_private.kennel_is_admin() from public;
revoke all on function kennel_private.kennel_is_staff_member() from public;
grant usage on schema kennel_private to authenticated;
grant execute on function kennel_private.kennel_user_role() to authenticated;
grant execute on function kennel_private.kennel_is_admin() to authenticated;
grant execute on function kennel_private.kennel_is_staff_member() to authenticated;

create or replace function kennel_private.kennel_settings_user_self_write_allowed(payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with incoming as (
    select
      lower(coalesce(payload ->> 'email', '')) as email,
      lower(coalesce(payload ->> 'role', '')) as role,
      coalesce(payload ->> 'id', '') as payload_id,
      lower(coalesce(payload ->> 'removed', 'false')) as removed
  )
  select email <> ''
    and email = public.kennel_auth_email()
    and removed <> 'true'
    and (
      role in ('customer', 'member', 'customer | member')
      or exists (
        select 1
        from public.kennel_records kr
        where kr.type = 'settingsUser'
          and lower(coalesce(kr.payload ->> 'email', '')) = incoming.email
          and lower(coalesce(kr.payload ->> 'role', '')) = incoming.role
          and lower(coalesce(kr.payload ->> 'role', '')) in ('admin', 'helper', 'staff')
          and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
          and (incoming.payload_id = '' or kr.id = incoming.payload_id or coalesce(kr.payload ->> 'id', '') = incoming.payload_id)
      )
    )
  from incoming
$$;

revoke all on function kennel_private.kennel_settings_user_self_write_allowed(jsonb) from public;
grant execute on function kennel_private.kennel_settings_user_self_write_allowed(jsonb) to authenticated;

create or replace function public.kennel_is_staff_member()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select kennel_private.kennel_is_staff_member()
$$;

create or replace function public.kennel_is_admin()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select kennel_private.kennel_is_admin()
$$;

create or replace function public.kennel_staff_can_write_type(record_type text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select record_type in (
    'ownedDog',
    'boardingDog',
    'customerDog',
    'request',
    'maintenance',
    'timesheet',
    'dailyTask',
    'careLog',
    'calendarNote',
    'dogVaccination',
    'dogInternalNote',
    'dogActivityLog',
    'reservationCustomerUpdate',
    'dogClaimRequest',
    'legacyDogLink',
    'notificationLog',
    'timeOffRequest'
  )
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

create or replace function public.kennel_private_staff_record_type(record_type text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select record_type in ('timesheet', 'staffSchedule', 'timeOffRequest')
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

create or replace function public.kennel_staff_can_write_record(record_type text, payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when kennel_private.kennel_is_admin() then true
    when not kennel_private.kennel_is_staff_member() then false
    when record_type = 'timesheet' then public.kennel_staff_record_belongs_to_auth(payload)
    when record_type = 'timeOffRequest' then public.kennel_staff_record_belongs_to_auth(payload)
    when record_type = 'staffSchedule' then false
    else public.kennel_staff_can_write_type(record_type)
  end
$$;

create or replace function public.kennel_customer_can_write(record_type text, payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select case
    when kennel_private.kennel_is_admin() then true
    when record_type = 'settingsUser' then kennel_private.kennel_settings_user_self_write_allowed(payload)
    when kennel_private.kennel_is_staff_member() then public.kennel_staff_can_write_record(record_type, payload)
    when record_type = 'boardingDog' then public.kennel_customer_boarding_payload_is_request(payload)
    when record_type in ('customerDog', 'request', 'maintenance') then public.kennel_payload_has_email(payload)
    when record_type = 'notificationLog' then public.kennel_payload_audience_has_email(payload)
    else false
  end
$$;

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

create policy "Kennel authenticated insert records"
on public.kennel_records
for insert
to authenticated
with check (
  public.kennel_customer_can_write(type, payload)
  and (
    kennel_private.kennel_is_staff_member()
    or user_id = auth.uid()
  )
);

create policy "Kennel authenticated update records"
on public.kennel_records
for update
to authenticated
using (
  kennel_private.kennel_is_admin()
  or (
    kennel_private.kennel_is_staff_member()
    and public.kennel_staff_can_read_record(type, payload)
  )
  or user_id = auth.uid()
  or public.kennel_payload_has_email(payload)
  or public.kennel_payload_audience_has_email(payload)
)
with check (
  public.kennel_customer_can_write(type, payload)
  and (
    kennel_private.kennel_is_staff_member()
    or user_id = auth.uid()
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'kennel_records'
    ) then
    alter publication supabase_realtime add table public.kennel_records;
  end if;
end $$;

create table if not exists public.daily_task_completions (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  shift text not null,
  task_id text not null,
  task_text text not null default '',
  completed_by text not null default '',
  completed_email text not null default '',
  completed_user_id uuid,
  completed_at timestamptz not null default now(),
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_task_completions_work_date_shift_task_id_key unique (work_date, shift, task_id)
);

create index if not exists daily_task_completions_work_date_idx on public.daily_task_completions (work_date desc);
create index if not exists daily_task_completions_completed_at_idx on public.daily_task_completions (completed_at desc);
create index if not exists daily_task_completions_completed_email_idx on public.daily_task_completions (completed_email);

alter table public.daily_task_completions enable row level security;

drop policy if exists "Kennel staff can read daily task completions" on public.daily_task_completions;
drop policy if exists "Kennel staff can insert daily task completions" on public.daily_task_completions;

create policy "Kennel staff can read daily task completions"
on public.daily_task_completions
for select
to authenticated
using (kennel_private.kennel_is_staff_member());

create policy "Kennel staff can insert daily task completions"
on public.daily_task_completions
for insert
to authenticated
with check (kennel_private.kennel_is_staff_member());

create or replace function public.complete_daily_task_atomic(
  p_work_date date,
  p_shift text,
  p_task_id text,
  p_task_text text default '',
  p_completed_by text default '',
  p_completed_email text default ''
)
returns table (
  inserted boolean,
  id uuid,
  work_date date,
  shift text,
  task_id text,
  task_text text,
  completed_by text,
  completed_email text,
  completed_user_id uuid,
  completed_at timestamptz,
  inserted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_completion public.daily_task_completions%rowtype;
  v_inserted boolean := false;
begin
  if not kennel_private.kennel_is_staff_member() then
    raise exception 'Staff access required.' using errcode = '42501';
  end if;

  insert into public.daily_task_completions (
    work_date,
    shift,
    task_id,
    task_text,
    completed_by,
    completed_email,
    completed_user_id
  )
  values (
    p_work_date,
    lower(trim(coalesce(p_shift, 'morning'))),
    trim(coalesce(p_task_id, '')),
    coalesce(nullif(trim(p_task_text), ''), trim(coalesce(p_task_id, ''))),
    coalesce(nullif(trim(p_completed_by), ''), 'Staff'),
    coalesce(nullif(lower(trim(p_completed_email)), ''), public.kennel_auth_email()),
    auth.uid()
  )
  on conflict on constraint daily_task_completions_work_date_shift_task_id_key do nothing
  returning * into v_completion;

  if found then
    v_inserted := true;
  else
    select *
    into v_completion
    from public.daily_task_completions existing
    where existing.work_date = p_work_date
      and existing.shift = lower(trim(coalesce(p_shift, 'morning')))
      and existing.task_id = trim(coalesce(p_task_id, ''))
    limit 1;
  end if;

  return query select
    v_inserted,
    v_completion.id,
    v_completion.work_date,
    v_completion.shift,
    v_completion.task_id,
    v_completion.task_text,
    v_completion.completed_by,
    v_completion.completed_email,
    v_completion.completed_user_id,
    v_completion.completed_at,
    v_completion.inserted_at,
    v_completion.updated_at;
end;
$$;

revoke all on function public.complete_daily_task_atomic(date, text, text, text, text, text) from public;
grant execute on function public.complete_daily_task_atomic(date, text, text, text, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'daily_task_completions'
    ) then
    alter publication supabase_realtime add table public.daily_task_completions;
  end if;
end $$;

create table if not exists public.notification_reads (
  id uuid primary key default gen_random_uuid(),
  notification_id text not null,
  reader_key text not null,
  reader_email text not null default '',
  read_at timestamptz not null default now(),
  unique (notification_id, reader_key)
);

create index if not exists notification_reads_notification_idx on public.notification_reads (notification_id);
create index if not exists notification_reads_reader_idx on public.notification_reads (reader_key);
create index if not exists notification_reads_read_at_idx on public.notification_reads (read_at desc);

alter table public.notification_reads enable row level security;

drop policy if exists "Kennel notification reads select" on public.notification_reads;
drop policy if exists "Kennel notification reads insert" on public.notification_reads;
drop policy if exists "Kennel notification reads update" on public.notification_reads;

create policy "Kennel notification reads select"
on public.notification_reads
for select
to authenticated
using (
  kennel_private.kennel_is_staff_member()
  or lower(reader_email) = public.kennel_auth_email()
);

create policy "Kennel notification reads insert"
on public.notification_reads
for insert
to authenticated
with check (
  kennel_private.kennel_is_staff_member()
  or lower(reader_email) = public.kennel_auth_email()
);

create policy "Kennel notification reads update"
on public.notification_reads
for update
to authenticated
using (
  kennel_private.kennel_is_staff_member()
  or lower(reader_email) = public.kennel_auth_email()
)
with check (
  kennel_private.kennel_is_staff_member()
  or lower(reader_email) = public.kennel_auth_email()
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notification_reads'
    ) then
    alter publication supabase_realtime add table public.notification_reads;
  end if;
end $$;

-- Storage bucket for direct file uploads.
-- If your Supabase project does not allow bucket creation from SQL, create this
-- manually in Storage as a private bucket named kennel-media, then run the
-- policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kennel-media', 'kennel-media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
on conflict (id) do update
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[];

drop policy if exists "Kennel app can read media" on storage.objects;
drop policy if exists "Kennel app can upload media" on storage.objects;
drop policy if exists "Kennel app can update media" on storage.objects;
drop policy if exists "Kennel media is publicly readable" on storage.objects;
drop policy if exists "Authenticated users can read kennel media" on storage.objects;
drop policy if exists "Authenticated users can upload kennel media" on storage.objects;
drop policy if exists "Anon users can upload kennel media" on storage.objects;
drop policy if exists "Authenticated users can update kennel media" on storage.objects;
drop policy if exists "Anon users can update kennel media" on storage.objects;
drop policy if exists "Authenticated users can delete kennel media" on storage.objects;

create policy "Authenticated users can read kennel media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kennel-media'
  and (
    kennel_private.kennel_is_staff_member()
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

create policy "Authenticated users can upload kennel media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'kennel-media'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "Authenticated users can update kennel media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'kennel-media'
  and (kennel_private.kennel_is_staff_member() or (storage.foldername(name))[2] = auth.uid()::text)
)
with check (
  bucket_id = 'kennel-media'
  and (kennel_private.kennel_is_staff_member() or (storage.foldername(name))[2] = auth.uid()::text)
);

create policy "Authenticated users can delete kennel media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'kennel-media'
  and (kennel_private.kennel_is_staff_member() or (storage.foldername(name))[2] = auth.uid()::text)
);
