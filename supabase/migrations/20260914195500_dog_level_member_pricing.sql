-- Move pricing entitlement from accounts to individual dogs. No stay or ledger repricing.
create table cuddle_stay_private.dog_pricing_v126_backup as
select * from cuddle_stay.kennel_records where organization_id=cuddle_stay_private.cuddle_stay_organization_id()
and type in ('settingsUser','dog','customerDog','boardingDog');
revoke all on cuddle_stay_private.dog_pricing_v126_backup from public,anon,authenticated;
create table cuddle_stay_private.dog_pricing_v126_ledger_backup as
select * from cuddle_stay.financial_ledger_entries;
revoke all on cuddle_stay_private.dog_pricing_v126_ledger_backup from public,anon,authenticated;

create or replace function cuddle_stay_private.normalize_dog_pricing_scope_override(value text)
returns text language sql immutable security invoker set search_path='' as $$
select case lower(replace(trim(coalesce($1,'')),'_','-'))
when 'member' then 'member'
when '' then 'non-member' when 'inherit' then 'non-member' when 'household' then 'non-member'
when 'non-member' then 'non-member' when 'nonmember' then 'non-member' when 'regular' then 'non-member'
else 'invalid' end $$;

create or replace function cuddle_stay_private.protect_customer_dog_pricing_eligibility()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
 new_scope text := cuddle_stay_private.normalize_dog_pricing_scope_override(new.payload->>'pricingScopeOverride');
 old_scope text;
 linked_scope text;
 caller_is_staff boolean := current_user in ('postgres','service_role') or cuddle_stay_private.kennel_is_staff_member();
begin
 if not caller_is_staff and tg_op='UPDATE' and old.type is distinct from new.type
 and (old.type in ('dog','customerDog','boardingDog') or new.type in ('dog','customerDog','boardingDog')) then
   raise exception 'Customer dog record type cannot be changed by a customer.' using errcode='42501';
 end if;
 if new.type='settingsUser' then
   new.payload := new.payload || '{"isMember":false,"member":false}'::jsonb;
   return new;
 end if;
 if new.type not in ('dog','customerDog','boardingDog') then return new; end if;
 if new_scope='invalid' then raise exception 'Choose member or regular pricing for this dog.' using errcode='23514'; end if;
 if tg_op='UPDATE' then old_scope:=cuddle_stay_private.normalize_dog_pricing_scope_override(old.payload->>'pricingScopeOverride'); end if;
 if not caller_is_staff then
   if tg_op='UPDATE' and old.type is distinct from new.type then
     raise exception 'Customer dog record type cannot be changed by a customer.' using errcode='42501';
   end if;
   if new.type in ('customerDog','dog') then
     if (tg_op='INSERT' and new_scope='member') or (tg_op='UPDATE' and new_scope is distinct from old_scope) then
       raise exception 'Only staff can change customer dog pricing eligibility.' using errcode='42501';
     end if;
   elsif new.type='boardingDog' then
     select cuddle_stay_private.normalize_dog_pricing_scope_override(r.payload->>'pricingScopeOverride') into linked_scope
     from cuddle_stay.kennel_records r
     where r.organization_id=cuddle_stay_private.cuddle_stay_organization_id() and r.type='customerDog'
     and r.id=coalesce(nullif(new.payload->>'linkedCustomerDogId',''),nullif(new.payload->>'customerDogId',''),new.payload->>'sourceCustomerDogId')
     and (r.user_id=auth.uid() or lower(coalesce(r.payload->>'ownerEmail',r.payload->>'customerEmail',''))=cuddle_stay.kennel_auth_email())
     and coalesce(r.payload->>'removed','false')<>'true' limit 1;
     if (linked_scope is not null and linked_scope is distinct from new_scope)
       or (linked_scope is null and new_scope='member')
       or (tg_op='UPDATE' and linked_scope is null and new_scope is distinct from old_scope) then
       raise exception 'Boarding request pricing eligibility must match the linked customer dog.' using errcode='42501';
     end if;
   end if;
 end if;
 new.payload := (new.payload - 'customerPricingScopeOverride') || jsonb_build_object('pricingScopeOverride',new_scope);
 return new;
end $$;

-- Resolve only verified record links and owner email, never creator user_id.
with recursive profiles as (
 select id,type,payload,user_id from cuddle_stay.kennel_records
 where organization_id=cuddle_stay_private.cuddle_stay_organization_id()
 and type in ('dog','customerDog','boardingDog') and coalesce(payload->>'removed','false')<>'true'
), edges0 as (
 select id a, v b from profiles p cross join lateral unnest(array[
 payload->>'linkedCustomerDogId',payload->>'customerDogId',payload->>'sourceCustomerDogId',
 payload->>'linkedBoardingDogId',payload->>'sourceBoardingDogId',payload->>'canonicalDogId']) v where v is not null
 union select payload->>'dogId',coalesce(payload->>'oldCustomerDogId',payload->>'oldBoardingDogId')
 from cuddle_stay.kennel_records where type='legacyDogLink' and organization_id=cuddle_stay_private.cuddle_stay_organization_id()
 union select payload->>'dogId',payload->>'oldBoardingDogId' from cuddle_stay.kennel_records where type='legacyDogLink' and organization_id=cuddle_stay_private.cuddle_stay_organization_id()
), edges as (select a,b from edges0 union select b,a from edges0), reach(a,b) as (
 select id,id from profiles union select r.a,e.b from reach r join edges e on e.a=r.b join profiles p on p.id=e.b
), members as (
 select lower(trim(payload->>'email')) email, user_id, payload->>'authId' auth_id from cuddle_stay.kennel_records
 where type='settingsUser' and organization_id=cuddle_stay_private.cuddle_stay_organization_id()
 and coalesce(payload->>'removed','false')<>'true'
 and (lower(coalesce(payload->>'isMember','false')) in ('true','on') or lower(coalesce(payload->>'member','false'))='true')
), resolved as (
 select a id,case when bool_or(lower(coalesce(p.payload->>'pricingScopeOverride',p.payload->>'customerPricingScopeOverride','')) in ('non-member','regular','nonmember')) then 'non-member'
 when bool_or(exists(select 1 from members m where m.email=lower(trim(coalesce(nullif(p.payload->>'ownerEmail',''),nullif(p.payload->>'customerEmail',''),p.payload->>'email',''))))) then 'member' else 'non-member' end scope
 from reach join profiles p on p.id=reach.b group by a
)
update cuddle_stay.kennel_records r set payload=(r.payload-'customerPricingScopeOverride') || jsonb_build_object('pricingScopeOverride',resolved.scope),updated_at=now()
from resolved where r.id=resolved.id and r.organization_id=cuddle_stay_private.cuddle_stay_organization_id();

-- Pricing-only account edits must not resync access roles or resurrect deleted logins.
-- This transaction holds the table lock; the existing trigger is restored before commit.
alter table cuddle_stay.kennel_records disable trigger sync_settings_user_membership;
update cuddle_stay.kennel_records set payload=payload || '{"isMember":false,"member":false}'::jsonb,updated_at=now()
where type='settingsUser' and organization_id=cuddle_stay_private.cuddle_stay_organization_id()
and coalesce(payload->>'removed','false')<>'true';
alter table cuddle_stay.kennel_records enable trigger sync_settings_user_membership;

-- Assert that only entitlement fields changed; every saved stay and invoice is identical.
do $$ begin
 if exists(select 1 from cuddle_stay_private.dog_pricing_v126_backup b join cuddle_stay.kennel_records r using(id)
 where b.type in ('dog','customerDog','boardingDog') and
 (b.payload-'pricingScopeOverride'-'customerPricingScopeOverride') is distinct from (r.payload-'pricingScopeOverride'-'customerPricingScopeOverride')) then
 raise exception 'Unexpected dog data change; abort pricing migration'; end if;
 if exists((select * from cuddle_stay.financial_ledger_entries except select * from cuddle_stay_private.dog_pricing_v126_ledger_backup)
 union all (select * from cuddle_stay_private.dog_pricing_v126_ledger_backup except select * from cuddle_stay.financial_ledger_entries)) then
 raise exception 'Ledger changed; abort pricing migration'; end if;
end $$;
