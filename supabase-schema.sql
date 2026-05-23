-- Central Texas Husky kennel tracker Supabase setup.
-- Run this in Supabase SQL Editor after creating the project.

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
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.kennel_payload_has_email(payload jsonb, email text default public.kennel_auth_email())
returns boolean
language sql
stable
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

create or replace function public.kennel_is_staff_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kennel_auth_email() in ('centraltexashusky@gmail.com', 'cthusky05@gmail.com')
    or exists (
      select 1
      from public.kennel_records kr
      where kr.type = 'settingsUser'
        and lower(coalesce(kr.payload ->> 'email', '')) = public.kennel_auth_email()
        and lower(coalesce(kr.payload ->> 'role', '')) in ('admin', 'helper', 'staff')
        and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
    )
$$;

create or replace function public.kennel_customer_can_write(record_type text, payload jsonb)
returns boolean
language sql
stable
as $$
  select case
    when public.kennel_is_staff_member() then true
    when record_type in ('customerDog', 'boardingDog', 'request', 'maintenance') then public.kennel_payload_has_email(payload)
    when record_type = 'settingsUser' then lower(coalesce(payload ->> 'email', '')) = public.kennel_auth_email()
      and lower(coalesce(payload ->> 'role', '')) in ('customer', 'member', 'customer | member')
    when record_type = 'notificationLog' then public.kennel_payload_audience_has_email(payload)
    else false
  end
$$;

create policy "Kennel authenticated read records"
on public.kennel_records
for select
to authenticated
using (
  public.kennel_is_staff_member()
  or public.kennel_payload_has_email(payload)
  or public.kennel_payload_audience_has_email(payload)
  or (type = 'settingsUser' and lower(coalesce(payload ->> 'email', '')) = public.kennel_auth_email())
  or type in ('service', 'operationHours', 'operationDateOverride', 'kennelLocation', 'kennelBuilding', 'notificationPreference')
);

create policy "Kennel authenticated insert records"
on public.kennel_records
for insert
to authenticated
with check (public.kennel_customer_can_write(type, payload));

create policy "Kennel authenticated update records"
on public.kennel_records
for update
to authenticated
using (
  public.kennel_is_staff_member()
  or public.kennel_payload_has_email(payload)
  or public.kennel_payload_audience_has_email(payload)
  or (type = 'settingsUser' and lower(coalesce(payload ->> 'email', '')) = public.kennel_auth_email())
)
with check (public.kennel_customer_can_write(type, payload));

-- Storage bucket for direct file uploads.
-- If your Supabase project does not allow bucket creation from SQL, create this
-- manually in Storage as a public bucket named kennel-media, then run the
-- policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kennel-media', 'kennel-media', true, 52428800, array['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[];

drop policy if exists "Kennel app can read media" on storage.objects;
drop policy if exists "Kennel app can upload media" on storage.objects;
drop policy if exists "Kennel app can update media" on storage.objects;
drop policy if exists "Kennel media is publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload kennel media" on storage.objects;
drop policy if exists "Anon users can upload kennel media" on storage.objects;
drop policy if exists "Authenticated users can update kennel media" on storage.objects;
drop policy if exists "Anon users can update kennel media" on storage.objects;
drop policy if exists "Authenticated users can delete kennel media" on storage.objects;

create policy "Kennel media is publicly readable"
on storage.objects
for select
to anon, authenticated
using ( bucket_id = 'kennel-media' );

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
  and (public.kennel_is_staff_member() or (storage.foldername(name))[2] = auth.uid()::text)
)
with check (
  bucket_id = 'kennel-media'
  and (public.kennel_is_staff_member() or (storage.foldername(name))[2] = auth.uid()::text)
);

create policy "Authenticated users can delete kennel media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'kennel-media'
  and (public.kennel_is_staff_member() or (storage.foldername(name))[2] = auth.uid()::text)
);
