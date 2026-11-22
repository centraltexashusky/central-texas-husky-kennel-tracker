create or replace function cuddle_stay.bulk_remove_show_plan_items(p_entries jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_today text := (v_now at time zone 'America/Chicago')::date::text;
  v_email text := coalesce(nullif(auth.jwt() ->> 'email', ''), 'Staff');
  v_requested integer;
  v_keys integer;
  v_saved jsonb;
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member() then
    raise exception 'Staff access is required to remove shows.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_entries) is distinct from 'array' then
    raise exception 'Select the shows to remove.' using errcode = '22023';
  end if;

  v_requested := jsonb_array_length(p_entries);
  select count(distinct request.id) into v_keys
  from jsonb_to_recordset(p_entries) as request(id text, type text, updated_at timestamptz)
  where nullif(request.id, '') is not null
    and request.type in ('showEvent', 'showResult')
    and request.updated_at is not null;

  if v_requested = 0 or v_requested <> v_keys then
    raise exception 'The removal selection is invalid.' using errcode = '22023';
  end if;

  -- Compare the reviewed version in the update itself. PostgreSQL rechecks it
  -- after a concurrent update, and the exception rolls back the whole batch.
  with changed as (
    update cuddle_stay.kennel_records as record
    set updated_at = v_now,
        payload = record.payload || jsonb_build_object(
          'removed', true, 'removedAt', v_now, 'removedBy', v_email,
          'removedEmail', v_email, 'updatedAt', v_now
        )
    from jsonb_to_recordset(p_entries) as request(id text, type text, updated_at timestamptz)
    where record.id = request.id
      and record.type = request.type
      and record.updated_at = request.updated_at
      and coalesce(record.payload ->> 'removed', 'false') <> 'true'
      and (
        (record.type = 'showResult' and record.payload ->> 'recordKind' = 'showPlannerCandidate')
        or (
          record.type = 'showEvent'
          and coalesce(btrim(record.payload ->> 'status'), '') not in ('Active', 'Completed')
          and (nullif(record.payload ->> 'startDate', '') is null or record.payload ->> 'startDate' > v_today)
          and (nullif(record.payload ->> 'endDate', '') is null or record.payload ->> 'endDate' >= v_today)
        )
      )
    returning record.payload || jsonb_build_object('id', record.id, 'type', record.type) as payload
  )
  select coalesce(jsonb_agg(changed.payload), '[]'::jsonb) into v_saved from changed;

  if jsonb_array_length(v_saved) <> v_requested then
    raise exception 'A selected show changed or is no longer eligible. Refresh Show Plan and review the selection again.'
      using errcode = '40001';
  end if;

  return v_saved;
end;
$$;

revoke all on function cuddle_stay.bulk_remove_show_plan_items(jsonb) from public, anon, authenticated;
grant execute on function cuddle_stay.bulk_remove_show_plan_items(jsonb) to authenticated;
