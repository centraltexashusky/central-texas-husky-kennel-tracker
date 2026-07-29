create table if not exists public.app_settings (
  id text primary key default 'workspace',
  organization_name text not null default 'Central Texas Husky',
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  constraint app_settings_singleton check (id = 'workspace'),
  constraint app_settings_organization_name_length check (char_length(trim(organization_name)) between 1 and 80)
);

alter table public.app_settings enable row level security;

drop policy if exists "Authenticated users can read app settings" on public.app_settings;
drop policy if exists "Admins can insert app settings" on public.app_settings;
drop policy if exists "Admins can update app settings" on public.app_settings;

create policy "Authenticated users can read app settings"
on public.app_settings
for select
to authenticated
using (true);

create policy "Admins can insert app settings"
on public.app_settings
for insert
to authenticated
with check (public.kennel_is_admin());

create policy "Admins can update app settings"
on public.app_settings
for update
to authenticated
using (public.kennel_is_admin())
with check (public.kennel_is_admin());

grant select, insert, update on public.app_settings to authenticated;
