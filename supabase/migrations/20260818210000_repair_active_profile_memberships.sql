-- Repair memberships incorrectly revoked when a removed duplicate settingsUser
-- profile existed beside an active canonical profile.
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
         end as role
  from cuddle_stay.kennel_records kr
  where kr.type = 'settingsUser'
    and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
    and nullif(lower(kr.payload ->> 'email'), '') is not null
  order by kr.organization_id, lower(kr.payload ->> 'email'), kr.updated_at desc, kr.id desc
), resolved as (
  select active_profiles.organization_id, auth.users.id as user_id, active_profiles.role
  from active_profiles
  join auth.users on lower(auth.users.email) = active_profiles.email
), clear_false_revocations as (
  delete from shared.organization_member_revocations revoked
  using resolved
  where revoked.organization_id = resolved.organization_id
    and revoked.user_id = resolved.user_id
)
insert into shared.organization_members (organization_id, user_id, role)
select organization_id, user_id, role
from resolved
on conflict (organization_id, user_id) do update
set role = excluded.role,
    updated_at = now();

create or replace function cuddle_stay_private.sync_settings_user_membership()
returns trigger
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  mapped_role text;
  profile_auth_id text := nullif(new.payload ->> 'authId', '');
begin
  if new.type <> 'settingsUser' then return new; end if;
  if profile_auth_id ~ '^[0-9a-fA-F-]{36}$' then target_user_id := profile_auth_id::uuid; end if;
  if target_user_id is null then
    select u.id into target_user_id from auth.users u
    where lower(u.email) = lower(coalesce(new.payload ->> 'email', '')) limit 1;
  end if;
  if target_user_id is null then return new; end if;

  if lower(coalesce(new.payload ->> 'removed', 'false')) = 'true' then
    if exists (
      select 1
      from cuddle_stay.kennel_records active_profile
      where active_profile.organization_id = new.organization_id
        and active_profile.type = 'settingsUser'
        and active_profile.id <> new.id
        and lower(active_profile.payload ->> 'email') = lower(new.payload ->> 'email')
        and lower(coalesce(active_profile.payload ->> 'removed', 'false')) <> 'true'
    ) then
      return new;
    end if;

    insert into shared.organization_member_revocations (organization_id, user_id, reason, revoked_at)
    values (new.organization_id, target_user_id, 'settings_user_removed', now())
    on conflict (organization_id, user_id) do update
    set reason = excluded.reason,
        revoked_at = excluded.revoked_at;

    delete from shared.organization_members member
    where member.organization_id = new.organization_id and member.user_id = target_user_id;
    return new;
  end if;

  delete from shared.organization_member_revocations revoked
  where revoked.organization_id = new.organization_id and revoked.user_id = target_user_id;

  mapped_role := case lower(coalesce(new.payload ->> 'role', 'customer'))
    when 'admin' then 'admin'
    when 'manager' then 'manager'
    when 'helper' then 'staff'
    when 'staff' then 'staff'
    else 'customer'
  end;
  insert into shared.organization_members (organization_id, user_id, role)
  values (new.organization_id, target_user_id, mapped_role)
  on conflict (organization_id, user_id) do update
  set role = excluded.role, updated_at = now();
  return new;
end
$$;

revoke all on function cuddle_stay_private.sync_settings_user_membership()
  from public, anon, authenticated;
grant execute on function cuddle_stay_private.sync_settings_user_membership()
  to service_role;

notify pgrst, 'reload schema';
