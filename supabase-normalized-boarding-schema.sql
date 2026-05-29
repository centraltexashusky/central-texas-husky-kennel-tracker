-- Non-breaking normalized boarding schema for the next data model.
-- The current app still reads/writes public.kennel_records. These tables give
-- production a safe target for a staged migration where dog identity, stays,
-- services, notes, and customer updates are separated.
-- Before applying this to a database that already has public.dogs, confirm that
-- public.dogs is the kennel/customer dog identity table and not the public
-- website/CMS dog table.

create extension if not exists pgcrypto;

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  dog_name text not null,
  owner_user_id uuid,
  owner_email text,
  breed text,
  sex text,
  birthday date,
  weight numeric,
  customer_notes text,
  temperament_notes text,
  medical_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_dog_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  role text not null check (role in ('owner', 'co_owner', 'staff_view', 'staff_manage', 'admin')),
  created_at timestamptz not null default now(),
  unique (user_id, dog_id, role)
);

create table if not exists public.boarding_reservations (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete restrict,
  customer_user_id uuid,
  request_code text not null unique,
  status text not null default 'draft' check (status in ('draft', 'pending_customer_request', 'approved', 'checked_in', 'in_kennel', 'ready_for_pickup', 'checked_out', 'cancelled', 'declined')),
  dropoff_time timestamptz,
  pickup_time timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  approved_notes text,
  kennel_building text,
  kennel_location_id text,
  kennel_location_name text,
  estimated_total numeric,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boarding_reservations
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists approved_notes text;

create table if not exists public.reservation_services (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.boarding_reservations(id) on delete cascade,
  service_name text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  status text not null default 'requested',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.dog_vaccinations (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  vaccine_type text not null,
  administered_at date,
  expires_at date,
  file_path text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.dog_internal_notes (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  created_by_staff_id uuid,
  note_type text,
  note text not null,
  visible_to_customer boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.dog_activity_logs (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  reservation_id uuid references public.boarding_reservations(id) on delete set null,
  staff_id uuid,
  activity_type text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_customer_updates (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.boarding_reservations(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  created_by_staff_id uuid,
  message text,
  media_path text,
  created_at timestamptz not null default now()
);

comment on table public.reservation_customer_updates is 'Staff-to-customer reservation update feed. Inbound customer edit proposals are stored in customer_proposed_changes.';

create table if not exists public.customer_proposed_changes (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  reservation_id uuid references public.boarding_reservations(id) on delete set null,
  proposed_by uuid not null references auth.users(id),
  proposed_fields jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'merged', 'ignored')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.legacy_dog_links (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  old_customer_dog_id text,
  old_boarding_dog_id text,
  created_at timestamptz not null default now(),
  unique (dog_id, old_customer_dog_id, old_boarding_dog_id)
);

create index if not exists dogs_owner_email_idx on public.dogs (lower(owner_email));
create index if not exists user_dog_access_user_idx on public.user_dog_access (user_id);
create index if not exists user_dog_access_dog_idx on public.user_dog_access (dog_id);
create index if not exists boarding_reservations_dog_idx on public.boarding_reservations (dog_id, dropoff_time desc);
create index if not exists boarding_reservations_status_idx on public.boarding_reservations (status);
create index if not exists boarding_reservations_reviewed_idx on public.boarding_reservations (reviewed_at desc);
create index if not exists reservation_services_reservation_idx on public.reservation_services (reservation_id);
create index if not exists customer_proposed_changes_dog_idx on public.customer_proposed_changes (dog_id, created_at desc);
create index if not exists customer_proposed_changes_reservation_idx on public.customer_proposed_changes (reservation_id);
create index if not exists customer_proposed_changes_status_idx on public.customer_proposed_changes (status, created_at desc);
create index if not exists legacy_dog_links_old_customer_idx on public.legacy_dog_links (old_customer_dog_id);
create index if not exists legacy_dog_links_old_boarding_idx on public.legacy_dog_links (old_boarding_dog_id);

alter table public.dogs enable row level security;
alter table public.user_dog_access enable row level security;
alter table public.boarding_reservations enable row level security;
alter table public.reservation_services enable row level security;
alter table public.dog_vaccinations enable row level security;
alter table public.dog_internal_notes enable row level security;
alter table public.dog_activity_logs enable row level security;
alter table public.reservation_customer_updates enable row level security;
alter table public.customer_proposed_changes enable row level security;
alter table public.legacy_dog_links enable row level security;

create or replace function public.kennel_user_can_access_dog(target_dog_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select kennel_private.kennel_is_staff_member()
    or exists (
      select 1
      from public.dogs dog
      where dog.id = target_dog_id
        and dog.owner_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.user_dog_access access
      where access.dog_id = target_dog_id
        and access.user_id = auth.uid()
        and access.role in ('owner', 'co_owner', 'staff_view', 'staff_manage', 'admin')
    )
$$;

create or replace function public.kennel_user_can_access_reservation(target_reservation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select kennel_private.kennel_is_staff_member()
    or exists (
      select 1
      from public.boarding_reservations reservation
      where reservation.id = target_reservation_id
        and (
          reservation.customer_user_id = auth.uid()
          or public.kennel_user_can_access_dog(reservation.dog_id)
        )
    )
$$;

create or replace function public.kennel_customer_can_write_reservation(target_reservation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.boarding_reservations reservation
    where reservation.id = target_reservation_id
      and reservation.customer_user_id = auth.uid()
      and reservation.status in ('draft', 'pending_customer_request')
  )
$$;

revoke all on function public.kennel_user_can_access_dog(uuid) from public;
revoke all on function public.kennel_user_can_access_reservation(uuid) from public;
revoke all on function public.kennel_customer_can_write_reservation(uuid) from public;
grant execute on function public.kennel_user_can_access_dog(uuid) to authenticated;
grant execute on function public.kennel_user_can_access_reservation(uuid) to authenticated;
grant execute on function public.kennel_customer_can_write_reservation(uuid) to authenticated;

drop policy if exists "Normalized dogs staff manage" on public.dogs;
drop policy if exists "Normalized dog owners read" on public.dogs;
drop policy if exists "Normalized dog owners create" on public.dogs;
drop policy if exists "Normalized dog owners update" on public.dogs;
create policy "Normalized dogs staff manage" on public.dogs for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized dog owners read" on public.dogs for select to authenticated
using (public.kennel_user_can_access_dog(id));
create policy "Normalized dog owners create" on public.dogs for insert to authenticated
with check (owner_user_id = auth.uid());
create policy "Normalized dog owners update" on public.dogs for update to authenticated
using (public.kennel_user_can_access_dog(id))
with check (owner_user_id = auth.uid() or public.kennel_user_can_access_dog(id));

drop policy if exists "Normalized dog access staff manage" on public.user_dog_access;
drop policy if exists "Normalized dog access users read own" on public.user_dog_access;
create policy "Normalized dog access staff manage" on public.user_dog_access for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized dog access users read own" on public.user_dog_access for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Normalized reservations staff manage" on public.boarding_reservations;
drop policy if exists "Normalized reservations customers read" on public.boarding_reservations;
drop policy if exists "Normalized reservations customers create pending" on public.boarding_reservations;
drop policy if exists "Normalized reservations customers update pending" on public.boarding_reservations;
create policy "Normalized reservations staff manage" on public.boarding_reservations for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized reservations customers read" on public.boarding_reservations for select to authenticated
using (public.kennel_user_can_access_reservation(id));
create policy "Normalized reservations customers create pending" on public.boarding_reservations for insert to authenticated
with check (
  customer_user_id = auth.uid()
  and status in ('draft', 'pending_customer_request')
  and public.kennel_user_can_access_dog(dog_id)
);
create policy "Normalized reservations customers update pending" on public.boarding_reservations for update to authenticated
using (customer_user_id = auth.uid() and status in ('draft', 'pending_customer_request'))
with check (customer_user_id = auth.uid() and status in ('draft', 'pending_customer_request'));

drop policy if exists "Normalized reservation services staff manage" on public.reservation_services;
drop policy if exists "Normalized reservation services customers read" on public.reservation_services;
drop policy if exists "Normalized reservation services customers create pending" on public.reservation_services;
drop policy if exists "Normalized reservation services customers update pending" on public.reservation_services;
create policy "Normalized reservation services staff manage" on public.reservation_services for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized reservation services customers read" on public.reservation_services for select to authenticated
using (public.kennel_user_can_access_reservation(reservation_id));
create policy "Normalized reservation services customers create pending" on public.reservation_services for insert to authenticated
with check (public.kennel_customer_can_write_reservation(reservation_id));
create policy "Normalized reservation services customers update pending" on public.reservation_services for update to authenticated
using (public.kennel_customer_can_write_reservation(reservation_id))
with check (public.kennel_customer_can_write_reservation(reservation_id));

drop policy if exists "Normalized vaccinations staff manage" on public.dog_vaccinations;
drop policy if exists "Normalized vaccinations owners read" on public.dog_vaccinations;
drop policy if exists "Normalized vaccinations owners create" on public.dog_vaccinations;
drop policy if exists "Normalized vaccinations owners update" on public.dog_vaccinations;
create policy "Normalized vaccinations staff manage" on public.dog_vaccinations for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized vaccinations owners read" on public.dog_vaccinations for select to authenticated
using (public.kennel_user_can_access_dog(dog_id));
create policy "Normalized vaccinations owners create" on public.dog_vaccinations for insert to authenticated
with check (public.kennel_user_can_access_dog(dog_id));
create policy "Normalized vaccinations owners update" on public.dog_vaccinations for update to authenticated
using (public.kennel_user_can_access_dog(dog_id))
with check (public.kennel_user_can_access_dog(dog_id));

drop policy if exists "Normalized internal notes staff manage" on public.dog_internal_notes;
drop policy if exists "Normalized internal notes customers read visible" on public.dog_internal_notes;
create policy "Normalized internal notes staff manage" on public.dog_internal_notes for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized internal notes customers read visible" on public.dog_internal_notes for select to authenticated
using (visible_to_customer and public.kennel_user_can_access_dog(dog_id));

drop policy if exists "Normalized activity logs staff manage" on public.dog_activity_logs;
create policy "Normalized activity logs staff manage" on public.dog_activity_logs for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());

drop policy if exists "Normalized customer updates staff manage" on public.reservation_customer_updates;
drop policy if exists "Normalized customer updates customers read" on public.reservation_customer_updates;
create policy "Normalized customer updates staff manage" on public.reservation_customer_updates for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized customer updates customers read" on public.reservation_customer_updates for select to authenticated
using (public.kennel_user_can_access_reservation(reservation_id));

drop policy if exists "Normalized proposed changes staff manage" on public.customer_proposed_changes;
drop policy if exists "Normalized proposed changes customers read" on public.customer_proposed_changes;
drop policy if exists "Normalized proposed changes customers create" on public.customer_proposed_changes;
create policy "Normalized proposed changes staff manage" on public.customer_proposed_changes for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());
create policy "Normalized proposed changes customers read" on public.customer_proposed_changes for select to authenticated
using (proposed_by = auth.uid() or public.kennel_user_can_access_dog(dog_id));
create policy "Normalized proposed changes customers create" on public.customer_proposed_changes for insert to authenticated
with check (
  proposed_by = auth.uid()
  and status = 'pending'
  and public.kennel_user_can_access_dog(dog_id)
  and (reservation_id is null or public.kennel_user_can_access_reservation(reservation_id))
);

drop policy if exists "Normalized legacy links staff manage" on public.legacy_dog_links;
create policy "Normalized legacy links staff manage" on public.legacy_dog_links for all to authenticated
using (kennel_private.kennel_is_staff_member())
with check (kennel_private.kennel_is_staff_member());

-- The first migration phase should use service-role maintenance scripts or
-- Edge Functions. Customer-facing frontend write paths should move one
-- operation at a time after these policies are verified in a branch database.
