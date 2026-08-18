-- Avoid PL/pgSQL variable/column ambiguity when a newly authenticated customer
-- registers their Cuddle Stay organization membership.
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

  insert into shared.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'customer')
  on conflict (organization_id, user_id) do nothing;

  return v_organization_id;
end
$$;

revoke all on function cuddle_stay_private.register_customer_membership_internal()
  from public, anon;
grant execute on function cuddle_stay_private.register_customer_membership_internal()
  to authenticated, service_role;

notify pgrst, 'reload schema';
