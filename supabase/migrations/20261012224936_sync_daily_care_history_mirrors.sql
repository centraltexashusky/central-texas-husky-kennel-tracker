-- Keep both daily-care representations consistent during admin corrections.
-- Staff append-only history protection and existing RLS remain unchanged.
create or replace function cuddle_stay.edit_owned_care_history(
  p_dog_id text, p_history_field text, p_entry_index integer,
  p_expected_entry jsonb, p_note text, p_minutes text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  dog cuddle_stay.kennel_records%rowtype;
  source_record cuddle_stay.kennel_records%rowtype;
  entry jsonb; revised jsonb; source_entry jsonb; source_field text; source_index integer;
  mirror_field text; mirror_index integer; mirror_matches integer;
  source_matches integer; source_payload jsonb := null;
  stamp text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  actor text := cuddle_stay.kennel_auth_email();
  audit jsonb;
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_admin() then
    raise exception 'Only admins can edit care history.' using errcode = '42501';
  end if;
  if p_history_field is null or p_history_field <> all(array['exerciseLogs','trainingLogs','bathHistory','heatHistory','careNotesHistory'])
    or p_entry_index is null or p_entry_index < 0 or p_note is null or p_expected_entry is null then
    raise exception 'Invalid care history entry.' using errcode = '22023';
  end if;
  if p_minutes is not null and (p_history_field <> 'exerciseLogs' or (p_minutes <> '' and p_minutes !~ '^\d+(\.\d+)?$')) then
    raise exception 'Invalid exercise minutes.' using errcode = '22023';
  end if;
  select * into dog from cuddle_stay.kennel_records
    where id = p_dog_id and type = 'ownedDog'
      and organization_id = cuddle_stay_private.cuddle_stay_organization_id() for update;
  if not found or coalesce(dog.payload->>'removed','false') = 'true' then
    raise exception 'This dog is no longer available.' using errcode = 'P0002';
  end if;
  entry := dog.payload->p_history_field->p_entry_index;
  -- Position plus full expected entry safely handles legacy missing/duplicate IDs.
  -- A concurrent prepend/reorder/edit fails instead of guessing by date or ID.
  if entry is null or entry is distinct from p_expected_entry then
    raise exception 'This history changed while you were editing. Cancel and reopen the entry.' using errcode = '40001';
  end if;
  audit := jsonb_build_object('note',coalesce(entry->>'note',''),'minutes',coalesce(entry->'minutes','""'::jsonb),'editedAt',stamp,'editedByEmail',actor);
  revised := entry || jsonb_build_object('note',p_note,'updatedAt',stamp,'updatedByEmail',actor,
    'editHistory',coalesce(entry->'editHistory','[]'::jsonb) || jsonb_build_array(audit));
  if p_minutes is not null then revised := revised || jsonb_build_object('minutes',p_minutes); end if;
  -- Correct linked daily source in the same transaction; preserve its date/author/time.
  if coalesce(entry->>'sourceDailyTaskId','') <> '' and coalesce(entry->>'sourceCareLogId','') <> '' then
    select * into source_record from cuddle_stay.kennel_records
      where id = entry->>'sourceDailyTaskId' and type = 'dailyTask'
        and organization_id = dog.organization_id for update;
    if not found then raise exception 'The source care log is unavailable. Refresh and reopen.' using errcode = '40001'; end if;
    source_field := case when jsonb_typeof(source_record.payload->'structuredCareLogs') = 'array' then 'structuredCareLogs' else 'careLogs' end;
    select count(*), min((ordinality-1)::integer) into source_matches, source_index
      from jsonb_array_elements(coalesce(source_record.payload->source_field,'[]'::jsonb)) with ordinality
      where value->>'id' = entry->>'sourceCareLogId';
    if source_matches <> 1 then raise exception 'The source care log changed. Refresh and reopen.' using errcode = '40001'; end if;
    source_entry := source_record.payload->source_field->source_index;
    if source_entry->>'dogId' is distinct from p_dog_id or source_entry->>'date' is distinct from entry->>'date'
      or coalesce(source_entry->>'note','') <> coalesce(entry->>'note','')
      or coalesce(nullif(source_entry->>'minutes','0'),'') <> coalesce(nullif(entry->>'minutes','0'),'') then
      raise exception 'The source care log changed. Refresh and reopen.' using errcode = '40001';
    end if;
    -- Locate the mirrored entry by ID, never by array position. Do not overwrite
    -- an independently changed or duplicated copy; the entire edit must roll back.
    mirror_field := case when source_field = 'structuredCareLogs' then 'careLogs' else 'structuredCareLogs' end;
    mirror_index := null;
    if jsonb_typeof(source_record.payload->mirror_field) = 'array' then
      select count(*), min((ordinality-1)::integer) into mirror_matches, mirror_index
        from jsonb_array_elements(source_record.payload->mirror_field) with ordinality
        where value->>'id' = entry->>'sourceCareLogId';
      if mirror_matches <> 1 or source_record.payload->mirror_field->mirror_index is distinct from source_entry then
        raise exception 'A linked daily care copy changed. Refresh and reopen.' using errcode = '40001';
      end if;
    end if;
    source_entry := source_entry || jsonb_build_object('note',p_note,'updatedAt',stamp,'updatedByEmail',actor,
      'editHistory',coalesce(source_entry->'editHistory','[]'::jsonb) || jsonb_build_array(audit));
    if p_minutes is not null then source_entry := source_entry || jsonb_build_object('minutes',p_minutes); end if;
    source_payload := jsonb_set(source_record.payload,array[source_field,source_index::text],source_entry,false) || jsonb_build_object('updatedAt',stamp);
    if mirror_index is not null then
      source_payload := jsonb_set(source_payload,array[mirror_field,mirror_index::text],source_entry,false);
    end if;
    update cuddle_stay.kennel_records set payload=source_payload, updated_at=stamp::timestamptz where id=source_record.id and type='dailyTask';
  end if;
  dog.payload := jsonb_set(dog.payload,array[p_history_field,p_entry_index::text],revised,false) || jsonb_build_object('updatedAt',stamp);
  update cuddle_stay.kennel_records set payload=dog.payload, updated_at=stamp::timestamptz where id=dog.id and type='ownedDog';
  return jsonb_build_object('dog',dog.payload,'source',source_payload);
end;
$$;
revoke all on function cuddle_stay.edit_owned_care_history(text,text,integer,jsonb,text,text) from public, anon;
grant execute on function cuddle_stay.edit_owned_care_history(text,text,integer,jsonb,text,text) to authenticated;
