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

-- PIN login is browser-side, so the public app key must be allowed to read/write
-- kennel records. For tighter security later, move PIN verification into a
-- Supabase Edge Function and restrict these policies again.
create policy "Kennel app can read records"
on public.kennel_records
for select
to anon, authenticated
using (true);

create policy "Kennel app can insert records"
on public.kennel_records
for insert
to anon, authenticated
with check (true);

create policy "Kennel app can update records"
on public.kennel_records
for update
to anon, authenticated
using (true)
with check (true);

-- Storage bucket for direct file uploads.
-- If your Supabase project does not allow bucket creation from SQL, create this
-- manually in Storage as a public bucket named kennel-media, then run the
-- policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kennel-media', 'kennel-media', true, 52428800, array['image/*', 'video/*']::text[])
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = array['image/*', 'video/*']::text[];

drop policy if exists "Kennel app can read media" on storage.objects;
drop policy if exists "Kennel app can upload media" on storage.objects;
drop policy if exists "Kennel app can update media" on storage.objects;
drop policy if exists "Kennel media is publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload kennel media" on storage.objects;
drop policy if exists "Anon users can upload kennel media" on storage.objects;
drop policy if exists "Authenticated users can update kennel media" on storage.objects;
drop policy if exists "Anon users can update kennel media" on storage.objects;

create policy "Kennel media is publicly readable"
on storage.objects
for select
to anon, authenticated
using ( bucket_id = 'kennel-media' );

create policy "Authenticated users can upload kennel media"
on storage.objects
for insert
to authenticated
with check ( bucket_id = 'kennel-media' );

-- PIN login uses the public app key, so anon upload is needed until PIN auth is
-- moved into Supabase Auth or an Edge Function.
create policy "Anon users can upload kennel media"
on storage.objects
for insert
to anon
with check ( bucket_id = 'kennel-media' );

create policy "Authenticated users can update kennel media"
on storage.objects
for update
to authenticated
using ( bucket_id = 'kennel-media' )
with check ( bucket_id = 'kennel-media' );

create policy "Anon users can update kennel media"
on storage.objects
for update
to anon
using ( bucket_id = 'kennel-media' )
with check ( bucket_id = 'kennel-media' );
