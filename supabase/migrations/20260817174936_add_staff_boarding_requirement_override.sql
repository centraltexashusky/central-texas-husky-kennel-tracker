-- Persist boarding safety overrides atomically and only for authenticated staff.

create or replace function kennel_private.kennel_apply_boarding_requirement_override_internal(
  p_record_id text,
  p_stay_id text,
  p_request_code text,
  p_reason text,
  p_issues jsonb,
  p_intended_status text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, kennel_private, pg_temp
as $$
declare
  v_record public.kennel_records%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_intended_status text := trim(coalesce(p_intended_status, ''));
  v_issues jsonb := case when jsonb_typeof(p_issues) = 'array' then p_issues else '[]'::jsonb end;
  v_actor_email text := public.kennel_auth_email();
  v_actor_name text;
  v_actor_role text;
  v_now timestamptz := now();
  v_override_id text := 'boardingOverride-' || replace(gen_random_uuid()::text, '-', '');
  v_audit_id text := 'audit-' || replace(gen_random_uuid()::text, '-', '');
  v_override jsonb;
  v_updated_stays jsonb;
  v_updated_payload jsonb;
  v_matched boolean := false;
begin
  if auth.uid() is null or not kennel_private.kennel_is_staff_member() then
    raise exception 'Staff access is required to override boarding requirements.' using errcode = '42501';
  end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 500 then
    raise exception 'Override reason must be between 10 and 500 characters.' using errcode = '22023';
  end if;
  if v_intended_status not in ('Approved', 'Checked In') then
    raise exception 'This boarding transition cannot use a requirements override.' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_stay_id, '')), '') is null
    and nullif(trim(coalesce(p_request_code, '')), '') is null then
    raise exception 'A stay ID or request code is required.' using errcode = '22023';
  end if;

  select *
  into v_record
  from public.kennel_records
  where id = p_record_id
    and type = 'boardingDog'
  for update;
  if not found then
    raise exception 'Boarding record not found.' using errcode = 'P0002';
  end if;

  v_actor_role := kennel_private.kennel_user_role();
  select nullif(trim(coalesce(kr.payload ->> 'name', '')), '')
  into v_actor_name
  from public.kennel_records kr
  where kr.type = 'settingsUser'
    and lower(coalesce(kr.payload ->> 'email', '')) = v_actor_email
    and lower(coalesce(kr.payload ->> 'removed', 'false')) <> 'true'
  order by kr.updated_at desc nulls last, kr.id desc
  limit 1;
  v_actor_name := coalesce(v_actor_name, nullif(v_actor_email, ''), 'Staff');

  v_override := jsonb_build_object(
    'id', v_override_id,
    'recordId', v_record.id,
    'stayId', coalesce(p_stay_id, ''),
    'requestCode', coalesce(p_request_code, ''),
    'intendedStatus', v_intended_status,
    'reason', v_reason,
    'issues', v_issues,
    'actorName', v_actor_name,
    'actorEmail', v_actor_email,
    'actorRole', v_actor_role,
    'createdAt', v_now
  );

  select
    coalesce(jsonb_agg(
      case
        when (
          nullif(trim(coalesce(p_stay_id, '')), '') is not null
          and coalesce(stay.value ->> 'id', '') = p_stay_id
        ) or (
          nullif(trim(coalesce(p_request_code, '')), '') is not null
          and coalesce(stay.value ->> 'requestCode', '') = p_request_code
        )
        then stay.value || jsonb_build_object('requirementsOverride', v_override)
        else stay.value
      end
      order by stay.position
    ), '[]'::jsonb),
    coalesce(bool_or(
      (
        nullif(trim(coalesce(p_stay_id, '')), '') is not null
        and coalesce(stay.value ->> 'id', '') = p_stay_id
      ) or (
        nullif(trim(coalesce(p_request_code, '')), '') is not null
        and coalesce(stay.value ->> 'requestCode', '') = p_request_code
      )
    ), false)
  into v_updated_stays, v_matched
  from jsonb_array_elements(
    case when jsonb_typeof(v_record.payload -> 'stays') = 'array' then v_record.payload -> 'stays' else '[]'::jsonb end
  ) with ordinality as stay(value, position);

  if not v_matched then
    raise exception 'Boarding stay not found.' using errcode = 'P0002';
  end if;

  v_updated_payload := jsonb_set(
    jsonb_set(v_record.payload, '{stays}', v_updated_stays, true),
    '{updatedAt}',
    to_jsonb(v_now::text),
    true
  );

  update public.kennel_records
  set payload = v_updated_payload,
      updated_at = v_now
  where id = v_record.id;

  insert into public.kennel_records (
    id,
    type,
    payload,
    helper_email,
    user_id,
    submitted_at,
    updated_at
  )
  values (
    v_audit_id,
    'auditLog',
    jsonb_build_object(
      'type', 'auditLog',
      'id', v_audit_id,
      'submittedAt', v_now,
      'action', 'Overrode boarding requirements',
      'targetType', 'boardingDog',
      'targetId', v_record.id,
      'targetLabel', coalesce(v_record.payload ->> 'dogName', 'Boarding dog'),
      'details', v_intended_status || ' | ' || coalesce(nullif(p_request_code, ''), p_stay_id, 'stay') || ' | ' || v_reason,
      'actorName', v_actor_name,
      'actorEmail', v_actor_email,
      'actorRole', v_actor_role,
      'stayId', coalesce(p_stay_id, ''),
      'requestCode', coalesce(p_request_code, ''),
      'overrideId', v_override_id,
      'issues', v_issues,
      'removed', false
    ),
    v_actor_email,
    auth.uid(),
    v_now,
    v_now
  );

  return jsonb_build_object(
    'payload', v_updated_payload,
    'requirementsOverride', v_override
  );
end;
$$;

revoke all on function kennel_private.kennel_apply_boarding_requirement_override_internal(text, text, text, text, jsonb, text) from public;
revoke all on function kennel_private.kennel_apply_boarding_requirement_override_internal(text, text, text, text, jsonb, text) from anon;
grant execute on function kennel_private.kennel_apply_boarding_requirement_override_internal(text, text, text, text, jsonb, text) to authenticated;

create or replace function public.kennel_apply_boarding_requirement_override(
  p_record_id text,
  p_stay_id text,
  p_request_code text,
  p_reason text,
  p_issues jsonb,
  p_intended_status text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select kennel_private.kennel_apply_boarding_requirement_override_internal(
    p_record_id,
    p_stay_id,
    p_request_code,
    p_reason,
    p_issues,
    p_intended_status
  )
$$;

revoke all on function public.kennel_apply_boarding_requirement_override(text, text, text, text, jsonb, text) from public;
revoke all on function public.kennel_apply_boarding_requirement_override(text, text, text, text, jsonb, text) from anon;
grant execute on function public.kennel_apply_boarding_requirement_override(text, text, text, text, jsonb, text) to authenticated;
