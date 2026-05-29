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

-- The first migration phase should use service-role maintenance scripts or
-- Edge Functions. Customer-facing RLS can be tightened when the frontend moves
-- from kennel_records to these normalized tables.
