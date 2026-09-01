-- A household can be eligible for member pricing while a specific dog must use
-- regular pricing. Keep that entitlement staff-controlled even though customers
-- can update the rest of their own customerDog profile payload.

create or replace function cuddle_stay_private.normalize_dog_pricing_scope_override(value text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case lower(replace(trim(coalesce($1, '')), '_', '-'))
    when '' then ''
    when 'inherit' then ''
    when 'household' then ''
    when 'non-member' then 'non-member'
    when 'nonmember' then 'non-member'
    when 'regular' then 'non-member'
    else 'invalid'
  end
$$;

create or replace function cuddle_stay_private.protect_customer_dog_pricing_eligibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_scope text := '';
  new_scope text := cuddle_stay_private.normalize_dog_pricing_scope_override(new.payload ->> 'pricingScopeOverride');
  linked_customer_dog_id text := '';
  linked_customer_dog_scope text := null;
  caller_is_staff boolean := current_user in ('postgres', 'service_role')
    or cuddle_stay_private.kennel_is_staff_member();
begin
  if new_scope = 'invalid' then
    raise exception 'Dog pricing eligibility must inherit household membership or use regular pricing.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    old_scope := cuddle_stay_private.normalize_dog_pricing_scope_override(old.payload ->> 'pricingScopeOverride');
  end if;

  if caller_is_staff then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.type is distinct from new.type
    and (old.type = 'customerDog' or new.type = 'customerDog') then
    raise exception 'Customer dog record type cannot be changed by a customer.'
      using errcode = '42501';
  end if;

  if new.type = 'boardingDog' then
    linked_customer_dog_id := coalesce(
      nullif(new.payload ->> 'linkedCustomerDogId', ''),
      nullif(new.payload ->> 'customerDogId', ''),
      nullif(new.payload ->> 'sourceCustomerDogId', ''),
      ''
    );
    if linked_customer_dog_id <> '' then
      select cuddle_stay_private.normalize_dog_pricing_scope_override(record.payload ->> 'pricingScopeOverride')
      into linked_customer_dog_scope
      from cuddle_stay.kennel_records record
      where record.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
        and record.type = 'customerDog'
        and record.id = linked_customer_dog_id
        and record.user_id = auth.uid()
        and lower(coalesce(record.payload ->> 'removed', 'false')) <> 'true'
      limit 1;
      if linked_customer_dog_scope is not null and new_scope is distinct from linked_customer_dog_scope then
        raise exception 'Boarding request pricing eligibility must match the linked customer dog.'
          using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  if new.type <> 'customerDog' then
    return new;
  end if;

  if tg_op = 'INSERT' and new_scope <> '' then
    raise exception 'Only staff can assign regular pricing to a customer dog.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new_scope is distinct from old_scope then
    raise exception 'Only staff can change customer dog pricing eligibility.'
      using errcode = '42501';
  end if;

  return new;
end
$$;

drop trigger if exists protect_customer_dog_pricing_eligibility on cuddle_stay.kennel_records;
create trigger protect_customer_dog_pricing_eligibility
before insert or update of type, payload on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.protect_customer_dog_pricing_eligibility();

revoke all on function cuddle_stay_private.normalize_dog_pricing_scope_override(text) from public, anon, authenticated;
revoke all on function cuddle_stay_private.protect_customer_dog_pricing_eligibility() from public, anon, authenticated;
grant execute on function cuddle_stay_private.normalize_dog_pricing_scope_override(text) to authenticated, service_role;

comment on function cuddle_stay_private.protect_customer_dog_pricing_eligibility() is
  'Preserves the staff-controlled per-dog regular-pricing override when customers update their own dog profiles.';
