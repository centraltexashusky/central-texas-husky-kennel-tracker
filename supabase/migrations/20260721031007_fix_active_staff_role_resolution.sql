create or replace function kennel_private.kennel_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_cached text;
  v_jwt_role text;
  v_profile_role text;
  v_role text;
begin
  begin
    v_cached := current_setting('kennel.user_role_cache', true);
    if v_cached is not null and v_cached <> '' then
      return v_cached;
    end if;
  exception when others then
    null;
  end;

  -- Active profiles must win over retired duplicates. Duplicate consolidation
  -- can update both rows in one batch, so ordering all rows by timestamp alone
  -- can otherwise select the retired row and revoke a valid staff session.
  select lower(coalesce(kr.payload ->> 'role', ''))
  into v_profile_role
  from public.kennel_records kr
  where kr.type = 'settingsUser'
    and lower(coalesce(kr.payload ->> 'email', '')) = public.kennel_auth_email()
    and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
  order by kr.updated_at desc nulls last, kr.submitted_at desc nulls last, kr.id desc
  limit 1;

  if found then
    v_role := coalesce(v_profile_role, '');
  elsif exists (
    select 1
    from public.kennel_records kr
    where kr.type = 'settingsUser'
      and lower(coalesce(kr.payload ->> 'email', '')) = public.kennel_auth_email()
  ) then
    -- Profile history without an active row means the account was revoked.
    v_role := '';
  else
    v_jwt_role := lower(coalesce(
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() ->> 'role',
      ''
    ));
    if v_jwt_role in ('admin', 'helper', 'staff') then
      v_role := v_jwt_role;
    else
      v_role := '';
    end if;
  end if;

  v_role := coalesce(v_role, '');
  perform set_config('kennel.user_role_cache', v_role, true);
  return v_role;
end;
$$;
