create or replace function cuddle_stay.kennel_boarding_records_for_filter(
  p_filter text,
  p_limit integer default 120,
  p_offset integer default 0
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
  with base as (
    select kr.*,
      lower(coalesce(nullif(kr.payload ->> 'boardingStatus', ''), nullif(kr.payload ->> 'status', ''), '')) as record_status,
      lower(coalesce(kr.payload ->> 'dogName', kr.payload ->> 'callName', kr.payload ->> 'showName', '')) as dog_name,
      lower(coalesce(kr.payload ->> 'ownerEmail', kr.payload ->> 'customerEmail', '')) as owner_email,
      regexp_replace(coalesce(kr.payload ->> 'ownerPhone', kr.payload ->> 'customerPhone', ''), '\\D', '', 'g') as owner_phone
    from cuddle_stay.kennel_records kr
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
  ), matched as (
    select b.*
    from base b
    where case lower(trim(coalesce(p_filter, 'active dogs')))
      when 'all boarding dogs' then true
      when 'pending' then (
        b.record_status in ('pending', 'pending_customer_request')
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(b.payload -> 'stays') = 'array' then b.payload -> 'stays' else '[]'::jsonb end
          ) stay
          where lower(coalesce(stay ->> 'status', '')) in ('pending', 'pending_customer_request')
            and not cuddle_stay.kennel_boarding_stay_is_historical(stay)
        )
      )
      when 'pending approval' then (
        b.record_status in ('pending', 'pending_customer_request')
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(b.payload -> 'stays') = 'array' then b.payload -> 'stays' else '[]'::jsonb end
          ) stay
          where lower(coalesce(stay ->> 'status', '')) in ('pending', 'pending_customer_request')
            and not cuddle_stay.kennel_boarding_stay_is_historical(stay)
        )
      )
      when 'approved' then (
        b.record_status = 'approved'
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(b.payload -> 'stays') = 'array' then b.payload -> 'stays' else '[]'::jsonb end
          ) stay
          where lower(coalesce(stay ->> 'status', '')) = 'approved'
            and not cuddle_stay.kennel_boarding_stay_is_historical(stay)
        )
      )
      when 'in kennel' then (
        b.record_status = 'in kennel'
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(b.payload -> 'stays') = 'array' then b.payload -> 'stays' else '[]'::jsonb end
          ) stay
          where lower(coalesce(stay ->> 'status', '')) = 'in kennel'
            and not cuddle_stay.kennel_boarding_stay_is_historical(stay)
        )
      )
      when 'ready for pickup' then (
        b.record_status = 'ready for pickup'
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(b.payload -> 'stays') = 'array' then b.payload -> 'stays' else '[]'::jsonb end
          ) stay
          where lower(coalesce(stay ->> 'status', '')) = 'ready for pickup'
            and not cuddle_stay.kennel_boarding_stay_is_historical(stay)
        )
      )
      else (
        b.record_status in ('checked in', 'in kennel', 'ready for pickup')
        or exists (
          select 1 from jsonb_array_elements(
            case when jsonb_typeof(b.payload -> 'stays') = 'array' then b.payload -> 'stays' else '[]'::jsonb end
          ) stay
          where lower(coalesce(stay ->> 'status', '')) in ('checked in', 'in kennel', 'ready for pickup')
            and not cuddle_stay.kennel_boarding_stay_is_historical(stay)
        )
      )
    end
  ), selected as (
    select distinct b.*
    from base b
    join matched m on (
      b.id = m.id
      or (
        b.dog_name <> ''
        and b.dog_name = m.dog_name
        and (
          (
            nullif(b.payload ->> 'linkedCustomerDogId', '') is not null
            and b.payload ->> 'linkedCustomerDogId' = m.payload ->> 'linkedCustomerDogId'
          )
          or (
            nullif(b.payload ->> 'sourceCustomerDogId', '') is not null
            and b.payload ->> 'sourceCustomerDogId' = m.payload ->> 'sourceCustomerDogId'
          )
          or (b.owner_email <> '' and b.owner_email = m.owner_email)
          or (b.owner_phone <> '' and b.owner_phone = m.owner_phone)
          or exists (
            select 1
            from jsonb_array_elements_text(
              case when jsonb_typeof(m.payload -> 'duplicateProfileIds') = 'array' then m.payload -> 'duplicateProfileIds' else '[]'::jsonb end
            ) duplicate_id
            where duplicate_id = b.id
          )
          or exists (
            select 1
            from jsonb_array_elements_text(
              case when jsonb_typeof(b.payload -> 'duplicateProfileIds') = 'array' then b.payload -> 'duplicateProfileIds' else '[]'::jsonb end
            ) duplicate_id
            where duplicate_id = m.id
          )
        )
      )
    )
  ), counted as (
    select s.*, count(*) over () as selected_total
    from selected s
  )
  select
    c.id,
    c.type,
    cuddle_stay.kennel_compact_boarding_payload(c.payload),
    c.helper_email,
    c.user_id,
    c.submitted_at,
    c.updated_at,
    c.selected_total
  from counted c
  order by c.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 120), 240))
  offset greatest(0, coalesce(p_offset, 0))
$$;

revoke all on function cuddle_stay.kennel_boarding_records_for_filter(text, integer, integer) from public, anon;
grant execute on function cuddle_stay.kennel_boarding_records_for_filter(text, integer, integer) to authenticated, service_role;
