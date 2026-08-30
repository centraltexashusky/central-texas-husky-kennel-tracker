-- Login/profile bookkeeping updates must not force a full financial rebuild.
-- Only payroll-relevant settings-user fields invalidate the projection.

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
  if not (v_type = any (array['boardingDog', 'service', 'timesheet', 'settingsUser', 'showEvent', 'financialTransaction'])) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if v_type = 'settingsUser'
     and tg_op = 'UPDATE'
     and (old.payload ->> 'hourlyRate') is not distinct from (new.payload ->> 'hourlyRate')
     and (old.payload ->> 'name') is not distinct from (new.payload ->> 'name')
     and (old.payload ->> 'email') is not distinct from (new.payload ->> 'email')
     and (old.payload ->> 'helperEmail') is not distinct from (new.payload ->> 'helperEmail')
     and (old.payload ->> 'removed') is not distinct from (new.payload ->> 'removed') then
    return new;
  end if;

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

  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

revoke all on function cuddle_stay_private.mark_financial_ledger_dirty() from public, anon, authenticated;
grant execute on function cuddle_stay_private.mark_financial_ledger_dirty() to service_role;

comment on function cuddle_stay_private.mark_financial_ledger_dirty() is
  'Marks the saved financial projection dirty only for financially relevant source changes; routine login timestamps are ignored.';
