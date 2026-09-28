-- Scope updates to in-care stays, and clean up only updates matched to confirmed past stays.
create or replace function cuddle_stay.kennel_boarding_customer_updates(p_record_ids text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped_records as (
    select kr.*
    from cuddle_stay.kennel_records kr
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and kr.id = any(coalesce(p_record_ids, array[]::text[]))
      and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
  ), matching_updates as (
    select
      update_item,
      kr.id as record_id,
      kr.updated_at,
      row_number() over (
        partition by coalesce(nullif(update_item ->> 'id', ''), update_item::text)
        order by kr.updated_at desc, kr.id
      ) as duplicate_rank
    from scoped_records kr
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(kr.payload -> 'customerUpdates') = 'array' then kr.payload -> 'customerUpdates' else '[]'::jsonb end
    ) update_item
    where exists (select 1 from scoped_records current_record
      cross join lateral jsonb_array_elements(coalesce(current_record.payload->'stays','[]')) stay
      where lower(trim(coalesce(stay->>'status',''))) in ('checked in','in kennel','ready for pickup') and cuddle_stay.kennel_boarding_stay_matches_update(stay,update_item))
  )
  select jsonb_build_object(
    'updates', coalesce(jsonb_agg(
      update_item || jsonb_build_object('boardingDogId', coalesce(update_item ->> 'boardingDogId', record_id))
      order by coalesce(update_item ->> 'createdAt', update_item ->> 'submittedAt', '') desc
    ) filter (where duplicate_rank = 1), '[]'::jsonb)
  )
  from matching_updates
$$;


create or replace function cuddle_stay.kennel_boarding_customer_update_retention_plan(
  p_record_ids text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_paths jsonb;
  v_update_count integer;
  v_record_count integer;
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member() then
    raise exception 'Staff access is required to manage boarding update retention.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_record_ids), 0) = 0 then
    raise exception 'At least one boarding source record is required.' using errcode = '22023';
  end if;

  with scoped_records as (
    select kr.*
    from cuddle_stay.kennel_records kr
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and kr.id = any(p_record_ids)
      and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
  ), current_stays as (
    select stay
    from scoped_records kr
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(kr.payload -> 'stays') = 'array' then kr.payload -> 'stays' else '[]'::jsonb end
    ) stay
    where lower(trim(coalesce(stay->>'status',''))) in ('checked in','in kennel','ready for pickup')
  ), candidates as (
    select kr.id as record_id, update_item
    from scoped_records kr
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(kr.payload -> 'customerUpdates') = 'array' then kr.payload -> 'customerUpdates' else '[]'::jsonb end
    ) update_item
    where (
      nullif(trim(coalesce(update_item ->> 'stayId', '')), '') is not null
      or nullif(trim(coalesce(update_item ->> 'requestCode', '')), '') is not null
      or nullif(trim(coalesce(update_item ->> 'stayDropoffTime', '')), '') is not null
    )
    and exists (select 1 from scoped_records past_record
      cross join lateral jsonb_array_elements(coalesce(past_record.payload->'stays','[]')) past
      where lower(trim(coalesce(past->>'status',''))) in ('checked out','cancelled','declined','completed') and cuddle_stay.kennel_boarding_stay_matches_update(past,update_item))
    and not exists (
      select 1
      from current_stays
      where cuddle_stay.kennel_boarding_stay_matches_update(current_stays.stay, update_item)
    )
  ), paths as (
    select distinct media_item ->> 'storagePath' as storage_path
    from candidates
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(update_item -> 'mediaItems') = 'array' then update_item -> 'mediaItems' else '[]'::jsonb end
    ) media_item
    where nullif(trim(coalesce(media_item ->> 'storagePath', '')), '') is not null
      -- Keep files reused by another update, a profile photo, or any other record.
      and not exists (
        select 1 from cuddle_stay.kennel_records protected
        where protected.organization_id=cuddle_stay_private.cuddle_stay_organization_id()
          and (
            position((media_item->>'storagePath') in (protected.payload-'customerUpdates'-'latestCustomerUpdate')::text)>0
            or exists(select 1 from jsonb_array_elements(coalesce(protected.payload->'customerUpdates','[]')) other_update
              where position((media_item->>'storagePath') in other_update::text)>0
                and not exists(select 1 from candidates c where c.update_item->>'id'=other_update->>'id'))
            or (position((media_item->>'storagePath') in coalesce(protected.payload->'latestCustomerUpdate','{}')::text)>0
              and not exists(select 1 from candidates c where c.update_item->>'id'=protected.payload#>>'{latestCustomerUpdate,id}'))
          )
      )
  )
  select
    coalesce((select jsonb_agg(storage_path order by storage_path) from paths), '[]'::jsonb),
    (select count(*) from candidates)::integer,
    (select count(distinct record_id) from candidates)::integer
  into v_paths, v_update_count, v_record_count;

  return jsonb_build_object(
    'storagePaths', v_paths,
    'updateIds', (select coalesce(jsonb_agg(u->>'id' order by u->>'id'),'[]')
      from cuddle_stay.kennel_records r cross join lateral jsonb_array_elements(coalesce(r.payload->'customerUpdates','[]')) u
      where r.organization_id=cuddle_stay_private.cuddle_stay_organization_id() and r.type='boardingDog' and r.id=any(p_record_ids)
        and exists(select 1 from cuddle_stay.kennel_records pr cross join lateral jsonb_array_elements(coalesce(pr.payload->'stays','[]')) s
          where pr.organization_id=r.organization_id and pr.type='boardingDog' and pr.id=any(p_record_ids)
            and lower(trim(coalesce(s->>'status',''))) in ('checked out','cancelled','declined','completed')
            and cuddle_stay.kennel_boarding_stay_matches_update(s,u))
        and not exists(select 1 from cuddle_stay.kennel_records cr cross join lateral jsonb_array_elements(coalesce(cr.payload->'stays','[]')) s
          where cr.organization_id=r.organization_id and cr.type='boardingDog' and cr.id=any(p_record_ids)
            and lower(trim(coalesce(s->>'status',''))) in ('checked in','in kennel','ready for pickup')
            and cuddle_stay.kennel_boarding_stay_matches_update(s,u))),
    'updateCount', coalesce(v_update_count, 0),
    'mediaCount', jsonb_array_length(v_paths),
    'recordCount', coalesce(v_record_count, 0)
  );
end;
$$;

create or replace function cuddle_stay.kennel_apply_boarding_customer_update_retention(
  p_record_ids text[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_current_stays jsonb;
  v_past_stays jsonb;
  v_record cuddle_stay.kennel_records%rowtype;
  v_update jsonb;
  v_retained jsonb;
  v_removed_ids text[] := array[]::text[];
  v_removed_updates integer := 0;
  v_updated_records integer := 0;
  v_customer cuddle_stay.kennel_records%rowtype;
  v_customer_updates jsonb;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member() then
    raise exception 'Staff access is required to manage boarding update retention.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_record_ids), 0) = 0 then
    raise exception 'At least one boarding source record is required.' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(stay) filter (where lower(trim(coalesce(stay->>'status',''))) in ('checked in','in kennel','ready for pickup')), '[]'),
    coalesce(jsonb_agg(stay) filter (where lower(trim(coalesce(stay->>'status',''))) in ('checked out','cancelled','declined','completed')), '[]')
  into v_current_stays,v_past_stays
  from cuddle_stay.kennel_records kr cross join lateral jsonb_array_elements(coalesce(kr.payload->'stays','[]')) stay
  where kr.organization_id=cuddle_stay_private.cuddle_stay_organization_id() and kr.type='boardingDog'
    and kr.id=any(p_record_ids) and coalesce(lower(kr.payload->>'removed'),'false')<>'true';

  for v_record in
    select *
    from cuddle_stay.kennel_records kr
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and kr.id = any(p_record_ids)
      and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
    for update
  loop
    v_retained := '[]'::jsonb;
    for v_update in
      select value
      from jsonb_array_elements(
        case when jsonb_typeof(v_record.payload -> 'customerUpdates') = 'array' then v_record.payload -> 'customerUpdates' else '[]'::jsonb end
      )
    loop
      if (
        nullif(trim(coalesce(v_update ->> 'stayId', '')), '') is not null
        or nullif(trim(coalesce(v_update ->> 'requestCode', '')), '') is not null
        or nullif(trim(coalesce(v_update ->> 'stayDropoffTime', '')), '') is not null
      ) and exists(select 1 from jsonb_array_elements(v_past_stays) past where cuddle_stay.kennel_boarding_stay_matches_update(past,v_update))
        and not exists(select 1 from jsonb_array_elements(v_current_stays) current_stay where cuddle_stay.kennel_boarding_stay_matches_update(current_stay,v_update)) then
        v_removed_updates := v_removed_updates + 1;
        if nullif(trim(coalesce(v_update ->> 'id', '')), '') is not null then
          v_removed_ids := array_append(v_removed_ids, v_update ->> 'id');
        end if;
      else
        v_retained := v_retained || jsonb_build_array(v_update);
      end if;
    end loop;

    if v_retained is distinct from (
      case when jsonb_typeof(v_record.payload -> 'customerUpdates') = 'array' then v_record.payload -> 'customerUpdates' else '[]'::jsonb end
    ) then
      update cuddle_stay.kennel_records
      set payload = (v_record.payload - 'customerUpdates' - 'latestCustomerUpdate') || jsonb_build_object(
            'customerUpdates', v_retained,
            'latestCustomerUpdate', coalesce(v_retained -> 0, 'null'::jsonb),
            'updatedAt', v_now
          ),
          updated_at = v_now
      where organization_id = v_record.organization_id and id = v_record.id;
      v_updated_records := v_updated_records + 1;
    end if;
  end loop;

  if cardinality(v_removed_ids) > 0 then
    for v_customer in
      select *
      from cuddle_stay.kennel_records kr
      where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
        and kr.type = 'customerDog'
        and jsonb_typeof(kr.payload -> 'customerUpdates') = 'array'
        and exists (
          select 1
          from jsonb_array_elements(kr.payload -> 'customerUpdates') update_item
          where update_item ->> 'id' = any(v_removed_ids)
        )
      for update
    loop
      select coalesce(jsonb_agg(update_item order by position), '[]'::jsonb)
      into v_customer_updates
      from jsonb_array_elements(v_customer.payload -> 'customerUpdates') with ordinality as updates(update_item, position)
      where not (update_item ->> 'id' = any(v_removed_ids));

      update cuddle_stay.kennel_records
      set payload = (v_customer.payload - 'customerUpdates') || jsonb_build_object(
            'customerUpdates', v_customer_updates,
            'updatedAt', v_now
          ),
          updated_at = v_now
      where organization_id = v_customer.organization_id and id = v_customer.id;
    end loop;
  end if;

  return jsonb_build_object(
    'removedUpdateCount', v_removed_updates,
    'updatedBoardingRecordCount', v_updated_records,
    'removedUpdateIds', to_jsonb(v_removed_ids)
  );
end;
$$;

revoke all on function cuddle_stay.kennel_boarding_customer_updates(text[]) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_customer_update_retention_plan(text[]) from public, anon;
revoke all on function cuddle_stay.kennel_apply_boarding_customer_update_retention(text[]) from public, anon;

grant execute on function cuddle_stay.kennel_boarding_customer_updates(text[]) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_customer_update_retention_plan(text[]) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_apply_boarding_customer_update_retention(text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
