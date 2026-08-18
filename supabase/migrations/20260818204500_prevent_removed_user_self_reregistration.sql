-- Keep an administrator's access removal authoritative. Customers may bootstrap
-- a first membership, but a previously removed account must not recreate one.
create table if not exists shared.organization_member_revocations (
  organization_id uuid not null references shared.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null default 'app_access_removed',
  revoked_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table shared.organization_member_revocations enable row level security;
revoke all on table shared.organization_member_revocations from public, anon, authenticated;
grant all on table shared.organization_member_revocations to service_role;
create index if not exists organization_member_revocations_user_id_idx
  on shared.organization_member_revocations (user_id);
drop policy if exists "No direct revocation access" on shared.organization_member_revocations;
create policy "No direct revocation access"
on shared.organization_member_revocations
for all to authenticated
using (false)
with check (false);

-- Backfill removed profiles before deleting any membership that a stale client
-- may have recreated during the migration window.
insert into shared.organization_member_revocations (organization_id, user_id, reason, revoked_at)
select distinct on (kr.organization_id, u.id)
       kr.organization_id,
       u.id,
       'settings_user_removed',
       coalesce(nullif(kr.payload ->> 'removedAt', '')::timestamptz, kr.updated_at, now())
from cuddle_stay.kennel_records kr
join auth.users u on lower(u.email) = lower(kr.payload ->> 'email')
where kr.type = 'settingsUser'
  and lower(coalesce(kr.payload ->> 'removed', 'false')) = 'true'
order by kr.organization_id, u.id,
         coalesce(nullif(kr.payload ->> 'removedAt', '')::timestamptz, kr.updated_at) desc
on conflict (organization_id, user_id) do update
set reason = excluded.reason,
    revoked_at = excluded.revoked_at;

delete from shared.organization_members member
using shared.organization_member_revocations revoked
where member.organization_id = revoked.organization_id
  and member.user_id = revoked.user_id;

create or replace function cuddle_stay_private.register_customer_membership_internal()
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_organization_id uuid := cuddle_stay_private.cuddle_stay_organization_id();
begin
  if v_user_id is null or nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '') is null then
    raise exception 'A verified Cuddle Stay login is required.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from shared.organization_member_revocations revoked
    where revoked.organization_id = v_organization_id
      and revoked.user_id = v_user_id
  ) then
    raise exception 'Cuddle Stay access has been removed. Contact an administrator.' using errcode = '42501';
  end if;

  insert into shared.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'customer')
  on conflict (organization_id, user_id) do nothing;

  return v_organization_id;
end
$$;

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
    insert into shared.organization_member_revocations (organization_id, user_id, reason, revoked_at)
    values (new.organization_id, target_user_id, 'settings_user_removed', now())
    on conflict (organization_id, user_id) do update
    set reason = excluded.reason,
        revoked_at = excluded.revoked_at;

    delete from shared.organization_members member
    where member.organization_id = new.organization_id and member.user_id = target_user_id;
    return new;
  end if;

  -- An explicit active profile save is the supported way to restore access.
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

revoke all on function cuddle_stay_private.register_customer_membership_internal()
  from public, anon;
grant execute on function cuddle_stay_private.register_customer_membership_internal()
  to authenticated, service_role;
revoke all on function cuddle_stay_private.sync_settings_user_membership()
  from public, anon, authenticated;
grant execute on function cuddle_stay_private.sync_settings_user_membership()
  to service_role;

comment on table shared.organization_member_revocations is
  'Cross-app membership safety primitive. Prevents an app user removed by an administrator from self-registering again.';

notify pgrst, 'reload schema';
