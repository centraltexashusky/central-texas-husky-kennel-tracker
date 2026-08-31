-- Keep normal boarding roster reads small. Historical stays and owner updates
-- remain available through explicit, dog-scoped RPCs and are fetched only when
-- staff open the corresponding profile section.

create or replace function cuddle_stay.kennel_boarding_stay_is_historical(p_stay jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select lower(trim(coalesce(p_stay ->> 'status', ''))) in ('checked out', 'cancelled')
$$;

create or replace function cuddle_stay.kennel_boarding_stay_matches_update(p_stay jsonb, p_update jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select (
    nullif(trim(coalesce(p_update ->> 'stayId', '')), '') is not null
    and nullif(trim(coalesce(p_stay ->> 'id', '')), '') = nullif(trim(coalesce(p_update ->> 'stayId', '')), '')
  ) or (
    nullif(trim(coalesce(p_update ->> 'requestCode', '')), '') is not null
    and nullif(trim(coalesce(p_stay ->> 'requestCode', '')), '') = nullif(trim(coalesce(p_update ->> 'requestCode', '')), '')
  ) or (
    nullif(trim(coalesce(p_update ->> 'stayDropoffTime', '')), '') is not null
    and nullif(trim(coalesce(p_update ->> 'stayPickupTime', '')), '') is not null
    and nullif(trim(coalesce(p_stay ->> 'dropoffTime', '')), '') = nullif(trim(coalesce(p_update ->> 'stayDropoffTime', '')), '')
    and nullif(trim(coalesce(p_stay ->> 'pickupTime', '')), '') = nullif(trim(coalesce(p_update ->> 'stayPickupTime', '')), '')
  )
$$;

create or replace function cuddle_stay.kennel_boarding_latest_stay(p_payload jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((
    select stay
    from jsonb_array_elements(
      case when jsonb_typeof(p_payload -> 'stays') = 'array' then p_payload -> 'stays' else '[]'::jsonb end
    ) stay
    order by
      coalesce(
        nullif(stay ->> 'actualPickupAt', ''),
        nullif(stay ->> 'checkedOutAt', ''),
        nullif(stay ->> 'pickupTime', ''),
        nullif(stay ->> 'dropoffTime', ''),
        ''
      ) desc,
      coalesce(stay ->> 'updatedAt', '') desc,
      coalesce(stay ->> 'id', stay ->> 'requestCode', '') desc
    limit 1
  ), '{}'::jsonb)
$$;

create or replace function cuddle_stay.kennel_compact_boarding_payload(p_payload jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_stay jsonb;
  v_current_stays jsonb := '[]'::jsonb;
  v_past_count integer := 0;
  v_latest_update jsonb := case
    when jsonb_typeof(p_payload -> 'latestCustomerUpdate') = 'object'
      then (p_payload -> 'latestCustomerUpdate') - 'mediaItems'
    else null
  end;
begin
  for v_stay in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_payload -> 'stays') = 'array' then p_payload -> 'stays' else '[]'::jsonb end
    )
  loop
    if cuddle_stay.kennel_boarding_stay_is_historical(v_stay) then
      v_past_count := v_past_count + 1;
    else
      v_current_stays := v_current_stays || jsonb_build_array(v_stay);
    end if;
  end loop;

  return (p_payload - 'customerUpdates' - 'latestCustomerUpdate') || jsonb_build_object(
    'stays', v_current_stays,
    'customerUpdates', '[]'::jsonb,
    'latestCustomerUpdate', coalesce(v_latest_update, 'null'::jsonb),
    '_remotePastBoardingCount', v_past_count,
    '_remotePastBoardingDeferred', true,
    '_remoteCustomerUpdatesDeferred', true
  );
end;
$$;

create or replace function cuddle_stay.kennel_compact_historical_stay(p_stay jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_task jsonb;
  v_unit jsonb;
  v_units jsonb;
  v_log jsonb := '[]'::jsonb;
  v_label text;
begin
  for v_task in
    select value
    from jsonb_array_elements(
      case when jsonb_typeof(p_stay -> 'serviceTasks') = 'array' then p_stay -> 'serviceTasks' else '[]'::jsonb end
    )
  loop
    v_label := coalesce(
      nullif(v_task ->> 'label', ''),
      nullif(v_task ->> 'serviceName', ''),
      'Service'
    );
    v_units := case
      when jsonb_typeof(v_task -> 'serviceUnits') = 'array' then v_task -> 'serviceUnits'
      when jsonb_typeof(v_task -> 'units') = 'array' then v_task -> 'units'
      when jsonb_typeof(v_task -> 'completionUnits') = 'array' then v_task -> 'completionUnits'
      else '[]'::jsonb
    end;
    if jsonb_array_length(v_units) > 0 then
      for v_unit in select value from jsonb_array_elements(v_units)
      loop
        if lower(coalesce(v_unit ->> 'status', '')) = 'completed'
          or lower(coalesce(v_unit ->> 'completed', '')) in ('true', '1', 'yes') then
          v_log := v_log || jsonb_build_array(jsonb_build_object(
            'label', coalesce(nullif(v_unit ->> 'label', ''), v_label),
            'completedAt', coalesce(v_unit ->> 'completedAt', v_task ->> 'completedAt', ''),
            'completedBy', coalesce(v_unit ->> 'completedBy', v_task ->> 'completedBy', '')
          ));
        end if;
      end loop;
    elsif lower(coalesce(v_task ->> 'status', '')) = 'completed' then
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        'label', v_label,
        'completedAt', coalesce(v_task ->> 'completedAt', ''),
        'completedBy', coalesce(v_task ->> 'completedBy', '')
      ));
    end if;
  end loop;

  return (p_stay - 'serviceTasks' - 'checkIn') || jsonb_build_object('serviceCompletionLog', v_log);
end;
$$;

create or replace function cuddle_stay.kennel_active_boarding_records(
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
    cuddle_stay.kennel_compact_boarding_payload(kr.payload),
    kr.helper_email,
    kr.user_id,
    kr.submitted_at,
    kr.updated_at,
    (
      select count(*)
      from cuddle_stay.kennel_records all_boarding
      where all_boarding.organization_id = kr.organization_id
        and all_boarding.type = 'boardingDog'
        and coalesce(lower(all_boarding.payload ->> 'removed'), 'false') <> 'true'
    ) as total_count
  from cuddle_stay.kennel_records kr
  where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and kr.type = 'boardingDog'
    and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
    and (
      lower(coalesce(kr.payload ->> 'boardingStatus', '')) in (
        'pending', 'approved', 'checked in', 'in kennel', 'ready for pickup'
      )
      or exists (
        select 1
        from jsonb_array_elements(
          case when jsonb_typeof(kr.payload -> 'stays') = 'array' then kr.payload -> 'stays' else '[]'::jsonb end
        ) stay
        where not cuddle_stay.kennel_boarding_stay_is_historical(stay)
          and coalesce(stay ->> 'pickupTime', stay ->> 'dropoffTime', '') >= (current_date - 1)::text
          and coalesce(stay ->> 'dropoffTime', '') <= (current_date + 365)::text
      )
    )
    and (p_since_updated_at is null or kr.updated_at >= p_since_updated_at)
  order by kr.updated_at desc
  limit 1000
$$;

create or replace function cuddle_stay.kennel_boarding_roster_records(
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
    cuddle_stay.kennel_compact_boarding_payload(kr.payload),
    kr.helper_email,
    kr.user_id,
    kr.submitted_at,
    kr.updated_at,
    count(*) over () as total_count
  from cuddle_stay.kennel_records kr
  where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and kr.type = 'boardingDog'
    and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
    and (p_since_updated_at is null or kr.updated_at >= p_since_updated_at)
  order by kr.updated_at desc
  limit 2000
$$;

create or replace function cuddle_stay.kennel_boarding_past_stays(p_record_ids text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'stays', coalesce(jsonb_agg(
      cuddle_stay.kennel_compact_historical_stay(stay)
        || jsonb_build_object('sourceRecordId', kr.id)
      order by coalesce(stay ->> 'actualPickupAt', stay ->> 'checkedOutAt', stay ->> 'pickupTime', stay ->> 'dropoffTime', '') desc
    ), '[]'::jsonb)
  )
  from cuddle_stay.kennel_records kr
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(kr.payload -> 'stays') = 'array' then kr.payload -> 'stays' else '[]'::jsonb end
  ) stay
  where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and kr.type = 'boardingDog'
    and kr.id = any(coalesce(p_record_ids, array[]::text[]))
    and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
    and cuddle_stay.kennel_boarding_stay_is_historical(stay)
$$;

create or replace function cuddle_stay.kennel_boarding_customer_updates(p_record_ids text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'updates', coalesce(jsonb_agg(
      update_item || jsonb_build_object('boardingDogId', coalesce(update_item ->> 'boardingDogId', kr.id))
      order by coalesce(update_item ->> 'createdAt', update_item ->> 'submittedAt', '') desc
    ), '[]'::jsonb)
  )
  from cuddle_stay.kennel_records kr
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(kr.payload -> 'customerUpdates') = 'array' then kr.payload -> 'customerUpdates' else '[]'::jsonb end
  ) update_item
  where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and kr.type = 'boardingDog'
    and kr.id = any(coalesce(p_record_ids, array[]::text[]))
    and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
    and (
      (
        nullif(trim(coalesce(update_item ->> 'stayId', '')), '') is null
        and nullif(trim(coalesce(update_item ->> 'requestCode', '')), '') is null
        and nullif(trim(coalesce(update_item ->> 'stayDropoffTime', '')), '') is null
      )
      or cuddle_stay.kennel_boarding_stay_matches_update(
        cuddle_stay.kennel_boarding_latest_stay(kr.payload),
        update_item
      )
    )
$$;

create or replace function cuddle_stay.kennel_calendar_notes_window(
  p_start_date date,
  p_end_date date,
  p_since_updated_at timestamptz default null
)
returns table (
  id text,
  type text,
  payload jsonb,
  helper_email text,
  user_id uuid,
  submitted_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select kr.id, kr.type, kr.payload, kr.helper_email, kr.user_id, kr.submitted_at, kr.updated_at
  from cuddle_stay.kennel_records kr
  where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and kr.type = 'calendarNote'
    and coalesce(
      nullif(kr.payload ->> 'noteDate', ''),
      nullif(kr.payload ->> 'date', ''),
      kr.submitted_at::date::text
    )::date between least(p_start_date, p_end_date) and greatest(p_start_date, p_end_date)
    and (p_since_updated_at is null or kr.updated_at >= p_since_updated_at)
  order by kr.updated_at desc
  limit 2000
$$;

create or replace function cuddle_stay.kennel_boarding_customer_update_retention_plan(
  p_record_id text default null
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

  with candidates as (
    select kr.id as record_id, update_item
    from cuddle_stay.kennel_records kr
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(kr.payload -> 'customerUpdates') = 'array' then kr.payload -> 'customerUpdates' else '[]'::jsonb end
    ) update_item
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and (p_record_id is null or kr.id = p_record_id)
      and coalesce(lower(kr.payload ->> 'removed'), 'false') <> 'true'
      and (
        nullif(trim(coalesce(update_item ->> 'stayId', '')), '') is not null
        or nullif(trim(coalesce(update_item ->> 'requestCode', '')), '') is not null
        or nullif(trim(coalesce(update_item ->> 'stayDropoffTime', '')), '') is not null
      )
      and not cuddle_stay.kennel_boarding_stay_matches_update(
        cuddle_stay.kennel_boarding_latest_stay(kr.payload),
        update_item
      )
  ), paths as (
    select distinct media_item ->> 'storagePath' as storage_path
    from candidates
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(update_item -> 'mediaItems') = 'array' then update_item -> 'mediaItems' else '[]'::jsonb end
    ) media_item
    where nullif(trim(coalesce(media_item ->> 'storagePath', '')), '') is not null
  )
  select
    coalesce((select jsonb_agg(storage_path order by storage_path) from paths), '[]'::jsonb),
    (select count(*) from candidates)::integer,
    (select count(distinct record_id) from candidates)::integer
  into v_paths, v_update_count, v_record_count;

  return jsonb_build_object(
    'storagePaths', v_paths,
    'updateCount', coalesce(v_update_count, 0),
    'mediaCount', jsonb_array_length(v_paths),
    'recordCount', coalesce(v_record_count, 0)
  );
end;
$$;

create or replace function cuddle_stay.kennel_apply_boarding_customer_update_retention(
  p_record_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
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

  for v_record in
    select *
    from cuddle_stay.kennel_records kr
    where kr.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
      and kr.type = 'boardingDog'
      and (p_record_id is null or kr.id = p_record_id)
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
      ) and not cuddle_stay.kennel_boarding_stay_matches_update(
        cuddle_stay.kennel_boarding_latest_stay(v_record.payload),
        v_update
      ) then
        v_removed_updates := v_removed_updates + 1;
        if nullif(trim(coalesce(v_update ->> 'id', '')), '') is not null then
          v_removed_ids := array_append(v_removed_ids, v_update ->> 'id');
        end if;
      else
        v_retained := v_retained || jsonb_build_array(v_update);
      end if;
    end loop;

    if v_retained is distinct from (
      case
        when jsonb_typeof(v_record.payload -> 'customerUpdates') = 'array' then v_record.payload -> 'customerUpdates'
        else '[]'::jsonb
      end
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

revoke all on function cuddle_stay.kennel_boarding_stay_is_historical(jsonb) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_stay_matches_update(jsonb, jsonb) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_latest_stay(jsonb) from public, anon;
revoke all on function cuddle_stay.kennel_compact_boarding_payload(jsonb) from public, anon;
revoke all on function cuddle_stay.kennel_compact_historical_stay(jsonb) from public, anon;
revoke all on function cuddle_stay.kennel_active_boarding_records(timestamptz) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_roster_records(timestamptz) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_past_stays(text[]) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_customer_updates(text[]) from public, anon;
revoke all on function cuddle_stay.kennel_calendar_notes_window(date, date, timestamptz) from public, anon;
revoke all on function cuddle_stay.kennel_boarding_customer_update_retention_plan(text) from public, anon;
revoke all on function cuddle_stay.kennel_apply_boarding_customer_update_retention(text) from public, anon;

grant execute on function cuddle_stay.kennel_boarding_stay_is_historical(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_stay_matches_update(jsonb, jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_latest_stay(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_compact_boarding_payload(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_compact_historical_stay(jsonb) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_active_boarding_records(timestamptz) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_roster_records(timestamptz) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_past_stays(text[]) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_customer_updates(text[]) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_calendar_notes_window(date, date, timestamptz) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_boarding_customer_update_retention_plan(text) to authenticated, service_role;
grant execute on function cuddle_stay.kennel_apply_boarding_customer_update_retention(text) to authenticated, service_role;

notify pgrst, 'reload schema';
