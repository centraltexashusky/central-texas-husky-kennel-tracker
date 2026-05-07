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

create policy "Authenticated users can read kennel records"
on public.kennel_records
for select
to authenticated
using (true);

create policy "Users can insert their own kennel records"
on public.kennel_records
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own records and admin can update all"
on public.kennel_records
for update
to authenticated
using (
  auth.uid() = user_id
  or lower(auth.jwt() ->> 'email') = 'centraltexashusky@gmail.com'
)
with check (
  auth.uid() = user_id
  or lower(auth.jwt() ->> 'email') = 'centraltexashusky@gmail.com'
);
