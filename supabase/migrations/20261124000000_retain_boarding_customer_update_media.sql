-- Read only: show the current boarding stay's updates, or keep the completed
-- stay visible until a genuine successor exists for the same dog.
create or replace function cuddle_stay.kennel_boarding_customer_updates(p_record_ids text[])
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  with scoped as (
    select kr.id, kr.payload, kr.updated_at, kr.submitted_at,
      coalesce(
        'customer:' || nullif(kr.payload->>'linkedCustomerDogId', ''),
        'customer:' || nullif(kr.payload->>'sourceCustomerDogId', ''),
        'customer:' || nullif(kr.payload->>'customerDogId', ''),
        'customer:' || nullif(kr.payload#>>'{requestProfileSnapshot,customerDogId}', ''),
        'boarding:' || kr.id
      ) as dog_key
    from cuddle_stay.kennel_records kr
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and kr.id = any(coalesce(p_record_ids, array[]::text[]))
      and coalesce(lower(kr.payload->>'removed'), 'false') <> 'true'
  ), stays as (
    select s.dog_key, s.id, s.submitted_at, stay,
      lower(trim(coalesce(stay->>'status',''))) as status,
      coalesce(nullif(stay->>'requestCode',''), nullif(stay->>'requestId',''), nullif(stay->>'reservationId','')) as request_code
    from scoped s
    cross join lateral jsonb_array_elements(case when jsonb_typeof(s.payload->'stays') = 'array'
      then s.payload->'stays' else '[]'::jsonb end) stay
    where nullif(stay->>'id','') is not null
      and lower(trim(coalesce(stay->>'status',''))) not in ('','cancelled','canceled','declined','rejected','removed')
      and coalesce(lower(stay->>'removed'),'false') <> 'true'
      and nullif(stay->>'cancelledAt','') is null and nullif(stay->>'declinedAt','') is null
      and lower(trim(coalesce(nullif(stay->>'stayType',''),s.payload->>'stayType',''))) <> 'service request'
  ), chosen as (
    select distinct on (dog_key) *
    from stays safely_ordered
    order by dog_key,
      (status in ('checked in','in kennel','ready for pickup')) desc,
      coalesce(nullif(stay->>'actualDropoffAt',''),nullif(stay->>'actualCheckInAt',''),
        nullif(stay->>'dropoffTime',''),nullif(stay->>'scheduledDropoffTime',''),nullif(stay->>'createdAt',''),safely_ordered.submitted_at::text,'') desc,
      coalesce(stay->>'createdAt','') desc, stay->>'id' desc, id
  ), matching as (
    select s.id, u.item, c.stay, row_number() over (
      partition by s.dog_key, coalesce(nullif(u.item->>'id',''),u.item::text)
      order by s.updated_at desc, s.id
    ) as duplicate_rank
    from scoped s
    join chosen c on c.dog_key=s.dog_key
      and c.status in ('checked in','in kennel','ready for pickup','checked out','completed')
    cross join lateral jsonb_array_elements(case when jsonb_typeof(s.payload->'customerUpdates') = 'array'
      then s.payload->'customerUpdates' else '[]'::jsonb end) u(item)
    where case
      when nullif(u.item->>'stayId','') is not null then
        (u.item->>'stayId'=c.stay->>'id'
          or (case when jsonb_typeof(c.stay->'sourceStayIds')='array' then c.stay->'sourceStayIds' else '[]'::jsonb end) ? (u.item->>'stayId')
          or (case when jsonb_typeof(c.stay->'duplicateStayIds')='array' then c.stay->'duplicateStayIds' else '[]'::jsonb end) ? (u.item->>'stayId'))
        and (nullif(u.item->>'requestCode','') is null or c.request_code is null or u.item->>'requestCode'=c.request_code)
      when nullif(u.item->>'requestCode','') is not null and c.request_code is not null then
        u.item->>'requestCode'=c.request_code
      else nullif(c.stay->>'dropoffTime','') is not null and nullif(c.stay->>'pickupTime','') is not null
        and u.item->>'stayDropoffTime'=c.stay->>'dropoffTime' and u.item->>'stayPickupTime'=c.stay->>'pickupTime'
    end
  )
  select jsonb_build_object('updates',coalesce(jsonb_agg(item || jsonb_build_object(
    'boardingDogId',coalesce(nullif(item->>'boardingDogId',''),id))
    order by coalesce(item->>'createdAt',item->>'submittedAt','') desc)
    filter (where duplicate_rank=1),'[]'::jsonb))
  from matching
$$;

-- Retire former deletion endpoints without breaking already-open clients.
-- In particular, old clients delete storage only from the returned plan.
create or replace function cuddle_stay.kennel_boarding_customer_update_retention_plan(p_record_ids text[])
returns jsonb
language sql stable security invoker set search_path = ''
as $$
  select '{"storagePaths":[],"updateIds":[],"updateCount":0,"mediaCount":0,"recordCount":0}'::jsonb
$$;

create or replace function cuddle_stay.kennel_apply_boarding_customer_update_retention(p_record_ids text[])
returns jsonb
language sql volatile security invoker set search_path = ''
as $$
  select '{"removedUpdateCount":0,"updatedBoardingRecordCount":0,"removedUpdateIds":[]}'::jsonb
$$;

notify pgrst, 'reload schema';
