-- Financial reporting should read a compact, persisted projection instead of
-- repeatedly downloading and joining every operational JSON record.

create table if not exists cuddle_stay.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references shared.organizations(id) on delete cascade,
  source_key text not null,
  source_type text not null,
  source_record_id text not null default '',
  source_item_id text not null default '',
  component text not null default '',
  transaction_date date not null,
  entry_type text not null check (entry_type in ('income', 'expense')),
  business_area text not null default 'General',
  category text not null default 'Uncategorized',
  description text not null default '',
  amount_cents bigint not null check (amount_cents >= 0),
  source_label text not null default '',
  counterparty text not null default '',
  payment_method text not null default '',
  reference text not null default '',
  notes text not null default '',
  editable boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, source_key)
);

create table if not exists cuddle_stay.financial_ledger_state (
  organization_id uuid primary key references shared.organizations(id) on delete cascade,
  needs_rebuild boolean not null default true,
  source_changed_at timestamptz,
  rebuilt_at timestamptz,
  entry_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists financial_ledger_entries_org_date_idx
  on cuddle_stay.financial_ledger_entries (organization_id, transaction_date desc, id desc);
create index if not exists financial_ledger_entries_org_area_type_idx
  on cuddle_stay.financial_ledger_entries (organization_id, business_area, entry_type, transaction_date desc);
create index if not exists financial_ledger_entries_org_source_idx
  on cuddle_stay.financial_ledger_entries (organization_id, source_type, source_record_id);

create or replace function cuddle_stay_private.preserve_financial_ledger_dirty_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.needs_rebuild
     and old.source_changed_at is not null
     and not new.needs_rebuild
     and (new.source_changed_at is null or old.source_changed_at > new.source_changed_at) then
    new.needs_rebuild := true;
    new.source_changed_at := old.source_changed_at;
  end if;
  return new;
end
$$;

revoke all on function cuddle_stay_private.preserve_financial_ledger_dirty_state() from public, anon, authenticated;
grant execute on function cuddle_stay_private.preserve_financial_ledger_dirty_state() to service_role;

drop trigger if exists financial_ledger_state_preserve_newer_dirty on cuddle_stay.financial_ledger_state;
create trigger financial_ledger_state_preserve_newer_dirty
before update on cuddle_stay.financial_ledger_state
for each row execute function cuddle_stay_private.preserve_financial_ledger_dirty_state();

alter table cuddle_stay.financial_ledger_entries enable row level security;
alter table cuddle_stay.financial_ledger_state enable row level security;

drop policy if exists "Financial ledger admin read" on cuddle_stay.financial_ledger_entries;
create policy "Financial ledger admin read"
on cuddle_stay.financial_ledger_entries
for select to authenticated
using (
  organization_id = (select cuddle_stay_private.cuddle_stay_organization_id())
  and (select cuddle_stay_private.kennel_is_admin())
);

drop policy if exists "Financial ledger state admin read" on cuddle_stay.financial_ledger_state;
create policy "Financial ledger state admin read"
on cuddle_stay.financial_ledger_state
for select to authenticated
using (
  organization_id = (select cuddle_stay_private.cuddle_stay_organization_id())
  and (select cuddle_stay_private.kennel_is_admin())
);

revoke all on table cuddle_stay.financial_ledger_entries from public, anon, authenticated;
revoke all on table cuddle_stay.financial_ledger_state from public, anon, authenticated;
grant select on table cuddle_stay.financial_ledger_entries to authenticated, service_role;
grant select on table cuddle_stay.financial_ledger_state to authenticated, service_role;
grant insert, update, delete on table cuddle_stay.financial_ledger_entries to service_role;
grant insert, update, delete on table cuddle_stay.financial_ledger_state to service_role;

create or replace function cuddle_stay_private.mark_financial_ledger_dirty()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := coalesce(new.type, old.type, '');
  v_organization_id uuid := coalesce(new.organization_id, old.organization_id);
begin
  if v_type = any (array['boardingDog', 'service', 'timesheet', 'settingsUser', 'showEvent', 'financialTransaction']) then
    insert into cuddle_stay.financial_ledger_state (
      organization_id,
      needs_rebuild,
      source_changed_at,
      updated_at
    ) values (
      v_organization_id,
      true,
      now(),
      now()
    )
    on conflict (organization_id) do update
      set needs_rebuild = true,
          source_changed_at = excluded.source_changed_at,
          updated_at = excluded.updated_at;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

revoke all on function cuddle_stay_private.mark_financial_ledger_dirty() from public, anon, authenticated;
grant execute on function cuddle_stay_private.mark_financial_ledger_dirty() to service_role;

drop trigger if exists kennel_records_mark_financial_ledger_dirty on cuddle_stay.kennel_records;
create trigger kennel_records_mark_financial_ledger_dirty
after insert or update or delete on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.mark_financial_ledger_dirty();

create or replace function cuddle_stay.replace_financial_ledger_entries(
  p_entries jsonb,
  p_source_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := cuddle_stay_private.cuddle_stay_organization_id();
  v_entry_count integer := 0;
begin
  if not cuddle_stay_private.kennel_is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Financial ledger entries must be a JSON array.' using errcode = '22023';
  end if;

  create temporary table financial_ledger_replacement (
    source_key text primary key,
    source_type text not null,
    source_record_id text not null,
    source_item_id text not null,
    component text not null,
    transaction_date date not null,
    entry_type text not null,
    business_area text not null,
    category text not null,
    description text not null,
    amount_cents bigint not null,
    source_label text not null,
    counterparty text not null,
    payment_method text not null,
    reference text not null,
    notes text not null,
    editable boolean not null,
    metadata jsonb not null
  ) on commit drop;

  insert into financial_ledger_replacement
  select
    nullif(trim(item.source_key), ''),
    coalesce(nullif(trim(item.source_type), ''), 'unknown'),
    coalesce(item.source_record_id, ''),
    coalesce(item.source_item_id, ''),
    coalesce(item.component, ''),
    item.transaction_date,
    item.entry_type,
    coalesce(nullif(trim(item.business_area), ''), 'General'),
    coalesce(nullif(trim(item.category), ''), 'Uncategorized'),
    coalesce(item.description, ''),
    item.amount_cents,
    coalesce(item.source_label, ''),
    coalesce(item.counterparty, ''),
    coalesce(item.payment_method, ''),
    coalesce(item.reference, ''),
    coalesce(item.notes, ''),
    coalesce(item.editable, false),
    coalesce(item.metadata, '{}'::jsonb)
  from jsonb_to_recordset(p_entries) as item(
    source_key text,
    source_type text,
    source_record_id text,
    source_item_id text,
    component text,
    transaction_date date,
    entry_type text,
    business_area text,
    category text,
    description text,
    amount_cents bigint,
    source_label text,
    counterparty text,
    payment_method text,
    reference text,
    notes text,
    editable boolean,
    metadata jsonb
  );

  if exists (
    select 1 from financial_ledger_replacement
    where source_key is null
       or entry_type not in ('income', 'expense')
       or amount_cents < 0
  ) then
    raise exception 'Financial ledger entry validation failed.' using errcode = '22023';
  end if;

  insert into cuddle_stay.financial_ledger_entries as existing (
    organization_id,
    source_key,
    source_type,
    source_record_id,
    source_item_id,
    component,
    transaction_date,
    entry_type,
    business_area,
    category,
    description,
    amount_cents,
    source_label,
    counterparty,
    payment_method,
    reference,
    notes,
    editable,
    metadata,
    source_updated_at,
    updated_at
  )
  select
    v_organization_id,
    replacement.source_key,
    replacement.source_type,
    replacement.source_record_id,
    replacement.source_item_id,
    replacement.component,
    replacement.transaction_date,
    replacement.entry_type,
    replacement.business_area,
    replacement.category,
    replacement.description,
    replacement.amount_cents,
    replacement.source_label,
    replacement.counterparty,
    replacement.payment_method,
    replacement.reference,
    replacement.notes,
    replacement.editable,
    replacement.metadata,
    p_source_updated_at,
    now()
  from financial_ledger_replacement replacement
  on conflict (organization_id, source_key) do update set
    source_type = excluded.source_type,
    source_record_id = excluded.source_record_id,
    source_item_id = excluded.source_item_id,
    component = excluded.component,
    transaction_date = excluded.transaction_date,
    entry_type = excluded.entry_type,
    business_area = excluded.business_area,
    category = excluded.category,
    description = excluded.description,
    amount_cents = excluded.amount_cents,
    source_label = excluded.source_label,
    counterparty = excluded.counterparty,
    payment_method = excluded.payment_method,
    reference = excluded.reference,
    notes = excluded.notes,
    editable = excluded.editable,
    metadata = excluded.metadata,
    source_updated_at = excluded.source_updated_at,
    updated_at = excluded.updated_at;

  delete from cuddle_stay.financial_ledger_entries ledger
  where ledger.organization_id = v_organization_id
    and not exists (
      select 1 from financial_ledger_replacement replacement
      where replacement.source_key = ledger.source_key
    );

  select count(*) into v_entry_count from financial_ledger_replacement;

  insert into cuddle_stay.financial_ledger_state (
    organization_id,
    needs_rebuild,
    source_changed_at,
    rebuilt_at,
    entry_count,
    updated_at
  ) values (
    v_organization_id,
    false,
    p_source_updated_at,
    now(),
    v_entry_count,
    now()
  )
  on conflict (organization_id) do update set
    needs_rebuild = false,
    source_changed_at = excluded.source_changed_at,
    rebuilt_at = excluded.rebuilt_at,
    entry_count = excluded.entry_count,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'entry_count', v_entry_count,
    'rebuilt_at', now(),
    'needs_rebuild', false
  );
end
$$;

revoke all on function cuddle_stay.replace_financial_ledger_entries(jsonb, timestamptz) from public, anon;
grant execute on function cuddle_stay.replace_financial_ledger_entries(jsonb, timestamptz) to authenticated, service_role;

insert into cuddle_stay.financial_ledger_state (organization_id, needs_rebuild, updated_at)
values (cuddle_stay_private.cuddle_stay_organization_id(), true, now())
on conflict (organization_id) do update
set needs_rebuild = true,
    updated_at = excluded.updated_at;

comment on table cuddle_stay.financial_ledger_entries is
  'Admin-only persisted projection used by Financials instead of recomputing all operational JSON records on every visit.';
comment on table cuddle_stay.financial_ledger_state is
  'Tracks whether financially relevant source changes require a projection rebuild.';
comment on function cuddle_stay.replace_financial_ledger_entries(jsonb, timestamptz) is
  'Atomically replaces the current organization financial projection after an admin-side reconciliation.';

notify pgrst, 'reload schema';
