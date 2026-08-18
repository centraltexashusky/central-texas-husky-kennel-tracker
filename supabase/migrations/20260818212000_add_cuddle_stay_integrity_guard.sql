-- Fail a migration immediately if the production Cuddle Stay boundary or
-- database-backed role memberships drift out of a save-capable state.
create or replace function cuddle_stay_private.assert_schema_integrity()
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  violation_count bigint;
begin
  select count(*) into violation_count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'cuddle_stay'
    and c.relkind = 'r'
    and c.relname in ('kennel_records', 'daily_task_completions', 'notification_reads', 'app_settings')
    and c.relrowsecurity;
  if violation_count <> 4 then
    raise exception 'Cuddle Stay integrity failure: all four production tables must exist with RLS enabled.';
  end if;

  select count(*) into violation_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('kennel_records', 'daily_task_completions', 'notification_reads', 'app_settings');
  if violation_count <> 0 then
    raise exception 'Cuddle Stay integrity failure: Cuddle Stay tables must not exist in public.';
  end if;

  if pg_catalog.has_schema_privilege('anon', 'cuddle_stay', 'usage')
     or not pg_catalog.has_schema_privilege('authenticated', 'cuddle_stay', 'usage')
     or pg_catalog.has_schema_privilege('authenticated', 'shared', 'usage') then
    raise exception 'Cuddle Stay integrity failure: schema grants drifted.';
  end if;

  if not pg_catalog.has_table_privilege('authenticated', 'cuddle_stay.kennel_records', 'select')
     or not pg_catalog.has_table_privilege('authenticated', 'cuddle_stay.kennel_records', 'insert')
     or not pg_catalog.has_table_privilege('authenticated', 'cuddle_stay.kennel_records', 'update')
     or pg_catalog.has_table_privilege('authenticated', 'cuddle_stay.kennel_records', 'delete') then
    raise exception 'Cuddle Stay integrity failure: authenticated kennel_records grants drifted.';
  end if;

  with active_profiles as (
    select distinct on (kr.organization_id, lower(kr.payload ->> 'email'))
           kr.organization_id,
           lower(kr.payload ->> 'email') as email,
           case lower(coalesce(kr.payload ->> 'role', 'customer'))
             when 'admin' then 'admin'
             when 'manager' then 'manager'
             when 'helper' then 'staff'
             when 'staff' then 'staff'
             else 'customer'
           end as expected_role
    from cuddle_stay.kennel_records kr
    where kr.type = 'settingsUser'
      and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
      and nullif(lower(kr.payload ->> 'email'), '') is not null
    order by kr.organization_id, lower(kr.payload ->> 'email'), kr.updated_at desc, kr.id desc
  ), resolved as (
    select active_profiles.organization_id,
           auth.users.id as user_id,
           active_profiles.expected_role
    from active_profiles
    join auth.users on lower(auth.users.email) = active_profiles.email
  )
  select count(*) into violation_count
  from resolved
  left join shared.organization_members member
    on member.organization_id = resolved.organization_id
   and member.user_id = resolved.user_id
  left join shared.organization_member_revocations revoked
    on revoked.organization_id = resolved.organization_id
   and revoked.user_id = resolved.user_id
  where member.user_id is null
     or member.role <> resolved.expected_role
     or revoked.user_id is not null;
  if violation_count <> 0 then
    raise exception 'Cuddle Stay integrity failure: % active profile membership(s) are missing, mismatched, or revoked.', violation_count;
  end if;

  select count(*) into violation_count
  from shared.organization_member_revocations revoked
  join shared.organization_members member
    on member.organization_id = revoked.organization_id
   and member.user_id = revoked.user_id;
  if violation_count <> 0 then
    raise exception 'Cuddle Stay integrity failure: % revoked user(s) still have active membership.', violation_count;
  end if;

  select count(*) into violation_count
  from cuddle_stay.kennel_records
  where organization_id is null;
  if violation_count <> 0 then
    raise exception 'Cuddle Stay integrity failure: % kennel record(s) are missing organization_id.', violation_count;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger_record
    join pg_catalog.pg_class table_record on table_record.oid = trigger_record.tgrelid
    join pg_catalog.pg_namespace table_schema on table_schema.oid = table_record.relnamespace
    where table_schema.nspname = 'cuddle_stay'
      and table_record.relname = 'kennel_records'
      and trigger_record.tgname = 'sync_settings_user_membership'
      and trigger_record.tgenabled <> 'D'
  ) then
    raise exception 'Cuddle Stay integrity failure: membership synchronization trigger is missing or disabled.';
  end if;
end
$$;

revoke all on function cuddle_stay_private.assert_schema_integrity()
  from public, anon, authenticated, service_role;

select cuddle_stay_private.assert_schema_integrity();
