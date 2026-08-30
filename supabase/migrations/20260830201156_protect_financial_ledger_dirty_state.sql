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
