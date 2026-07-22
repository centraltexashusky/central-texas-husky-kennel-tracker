-- Daily boarding work needs current/upcoming dogs first. Historical boarding
-- profiles remain available through the full record query when staff select
-- All Boarding Dogs or search the roster.
create or replace function public.kennel_active_boarding_records(
  p_since_updated_at timestamptz default null
)
returns table (
  id text,
  type text,
  payload jsonb,
  helper_email text,
  user_id uuid,
  submitted_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    kr.id,
    kr.type,
    kr.payload,
    kr.helper_email,
    kr.user_id,
    kr.submitted_at,
    kr.updated_at,
    (
      select count(*)
      from public.kennel_records all_boarding
      where all_boarding.type = 'boardingDog'
        and coalesce(lower(all_boarding.payload ->> 'removed'), 'false') <> 'true'
    ) as total_count
  from public.kennel_records kr
  where kr.type = 'boardingDog'
    and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
    and (
      lower(coalesce(kr.payload ->> 'boardingStatus', '')) in (
        'pending', 'approved', 'checked in', 'in kennel', 'ready for pickup'
      )
      or exists (
        select 1
        from jsonb_array_elements(
          case
            when jsonb_typeof(kr.payload -> 'stays') = 'array' then kr.payload -> 'stays'
            else '[]'::jsonb
          end
        ) stay
        where lower(coalesce(stay ->> 'status', '')) not in ('cancelled', 'checked out')
          and coalesce(stay ->> 'pickupTime', stay ->> 'dropoffTime', '') >= (current_date - 1)::text
          and coalesce(stay ->> 'dropoffTime', '') <= (current_date + 365)::text
      )
    )
    and (p_since_updated_at is null or kr.updated_at >= p_since_updated_at)
  order by kr.updated_at desc
  limit 1000;
$$;

revoke all on function public.kennel_active_boarding_records(timestamptz) from public;
revoke all on function public.kennel_active_boarding_records(timestamptz) from anon;
grant execute on function public.kennel_active_boarding_records(timestamptz) to authenticated;
grant execute on function public.kennel_active_boarding_records(timestamptz) to service_role;
