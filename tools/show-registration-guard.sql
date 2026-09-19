-- Staff controls the per-dog registration panel. This is not show-entry approval.
-- Existing records and all existing RLS policies remain unchanged.
create or replace function cuddle_stay_private.protect_show_registration_setting()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  allowed text := 'No';
begin
  if new.type not in ('customerDog','boardingDog','dog') then return new; end if;
  if current_user in ('postgres','service_role') or cuddle_stay_private.kennel_is_staff_member() then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    allowed := coalesce(old.payload->>'showRegistrationEnabled','No');
  elsif new.type = 'boardingDog' then
    select coalesce(r.payload->>'showRegistrationEnabled','No') into allowed
    from cuddle_stay.kennel_records r
    where r.organization_id = new.organization_id and r.type='customerDog'
      and r.id=coalesce(nullif(new.payload->>'linkedCustomerDogId',''),nullif(new.payload->>'customerDogId',''),new.payload->>'sourceCustomerDogId')
      and coalesce(r.payload->>'removed','false')<>'true'
      and lower(coalesce(r.payload->>'ownerEmail',r.payload->>'customerEmail',''))=cuddle_stay.kennel_auth_email()
    limit 1;
  end if;
  -- Ignore stale or tampered client values; never block an ordinary boarding save.
  new.payload := new.payload || jsonb_build_object('showRegistrationEnabled',coalesce(allowed,'No'));
  return new;
end $$;
revoke all on function cuddle_stay_private.protect_show_registration_setting() from public;
grant execute on function cuddle_stay_private.protect_show_registration_setting() to authenticated,service_role;
drop trigger if exists protect_show_registration_setting on cuddle_stay.kennel_records;
create trigger protect_show_registration_setting before insert or update on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.protect_show_registration_setting();
