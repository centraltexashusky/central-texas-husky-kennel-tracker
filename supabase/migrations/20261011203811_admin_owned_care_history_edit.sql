-- Admin-only corrections to existing resident-care history. Staff may still append
-- new care entries and update unrelated fields. Existing RLS remains authoritative.
create or replace function cuddle_stay_private.protect_owned_care_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  fields text[]; field text; before_entries jsonb; after_entries jsonb;
begin
  if cuddle_stay_private.kennel_is_admin() then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  if old.type = 'ownedDog' then
    fields := array['exerciseLogs','trainingLogs','bathHistory','heatHistory','careNotesHistory'];
  elsif old.type = 'boardingDog' then
    fields := array['careLogs'];
  elsif old.type = 'dailyTask' then
    fields := array['structuredCareLogs','careLogs'];
  else
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  foreach field in array fields loop
    before_entries := case when jsonb_typeof(old.payload->field) = 'array' then old.payload->field else '[]'::jsonb end;
    if jsonb_array_length(before_entries) = 0 then continue; end if;
    if tg_op = 'DELETE' then
      raise exception 'Only admins can change existing care history.' using errcode = '42501';
    end if;
    if new.type <> old.type or new.id <> old.id or new.organization_id <> old.organization_id
      or (coalesce(new.payload->>'removed','false') = 'true' and coalesce(old.payload->>'removed','false') <> 'true') then
      raise exception 'Only admins can change existing care history.' using errcode = '42501';
    end if;
    after_entries := case when jsonb_typeof(new.payload->field) = 'array' then new.payload->field else '[]'::jsonb end;
    -- Multiset comparison protects legacy duplicate/missing IDs as well as normal IDs.
    if exists (
      select value from jsonb_array_elements(before_entries)
      except all
      select value from jsonb_array_elements(after_entries)
    ) then
      raise exception 'Only admins can change existing care history.' using errcode = '42501';
    end if;
    -- Do not allow a second version of an existing ID to masquerade as a new entry.
    if exists (
      select n.id from (select value->>'id' id, count(*) amount from jsonb_array_elements(after_entries)
        where coalesce(value->>'id','') <> '' group by value->>'id') n
      where n.amount > 1 and n.amount > (select count(*) from jsonb_array_elements(before_entries) o where o.value->>'id' = n.id)
    ) then
      raise exception 'Care history IDs must identify a single entry.' using errcode = '42501';
    end if;
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;
revoke all on function cuddle_stay_private.protect_owned_care_history() from public, anon, authenticated;
create trigger protect_owned_care_history before update or delete on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.protect_owned_care_history();

create or replace function cuddle_stay.edit_owned_care_history(
  p_dog_id text, p_history_field text, p_entry_index integer,
  p_expected_entry jsonb, p_note text, p_minutes text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  dog cuddle_stay.kennel_records%rowtype;
  source_record cuddle_stay.kennel_records%rowtype;
  entry jsonb; revised jsonb; source_entry jsonb; source_field text; source_index integer;
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
    source_entry := source_entry || jsonb_build_object('note',p_note,'updatedAt',stamp,'updatedByEmail',actor,
      'editHistory',coalesce(source_entry->'editHistory','[]'::jsonb) || jsonb_build_array(audit));
    if p_minutes is not null then source_entry := source_entry || jsonb_build_object('minutes',p_minutes); end if;
    source_payload := jsonb_set(source_record.payload,array[source_field,source_index::text],source_entry,false) || jsonb_build_object('updatedAt',stamp);
    update cuddle_stay.kennel_records set payload=source_payload, updated_at=stamp::timestamptz where id=source_record.id and type='dailyTask';
  end if;
  dog.payload := jsonb_set(dog.payload,array[p_history_field,p_entry_index::text],revised,false) || jsonb_build_object('updatedAt',stamp);
  update cuddle_stay.kennel_records set payload=dog.payload, updated_at=stamp::timestamptz where id=dog.id and type='ownedDog';
  return jsonb_build_object('dog',dog.payload,'source',source_payload);
end;
$$;
revoke all on function cuddle_stay.edit_owned_care_history(text,text,integer,jsonb,text,text) from public, anon;
grant execute on function cuddle_stay.edit_owned_care_history(text,text,integer,jsonb,text,text) to authenticated;

-- Boarding notes may be mirrored across duplicate source profiles. Correct matching
-- copies atomically; differing copies fail closed instead of silently overwriting.
create function cuddle_stay.edit_boarding_care_history(
 p_dog_id text,p_history_field text,p_entry_index integer,p_expected_entry jsonb,p_note text,p_minutes text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 dog cuddle_stay.kennel_records%rowtype; r cuddle_stay.kennel_records%rowtype;
 entry jsonb; current_entry jsonb; revised jsonb; pos integer; matches integer;
 records jsonb := '[]'; dog_payload jsonb; audit jsonb;
 stamp text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 actor text := cuddle_stay.kennel_auth_email();
begin
 if auth.uid() is null or not cuddle_stay_private.kennel_is_admin() then raise exception 'Only admins can edit care history.' using errcode='42501';end if;
 if p_history_field is distinct from 'careLogs' or p_entry_index is null or p_entry_index<0 or p_expected_entry is null or p_note is null then raise exception 'Invalid care history entry.';end if;
 if p_minutes is not null and (not(p_expected_entry ? 'minutes') or (p_minutes<>'' and p_minutes !~ '^\d+(\.\d+)?$')) then raise exception 'Invalid exercise minutes.';end if;
 -- Lock matching profiles in deterministic order for atomic mirrored updates.
 for r in select * from cuddle_stay.kennel_records k where k.type='boardingDog'
 and k.organization_id=cuddle_stay_private.cuddle_stay_organization_id()
 and (k.id=p_dog_id or (coalesce(p_expected_entry->>'id','')<>'' and exists(select 1 from jsonb_array_elements(coalesce(k.payload->'careLogs','[]')) e where e->>'id'=p_expected_entry->>'id')))
 order by k.id for update loop
   if r.id=p_dog_id then dog:=r;end if;
 end loop;
 if dog.id is null or coalesce(dog.payload->>'removed','false') in ('true','on') then raise exception 'This dog is no longer available.';end if;
 entry:=dog.payload->'careLogs'->p_entry_index;
 if entry is null or entry is distinct from p_expected_entry then raise exception 'This history changed while you were editing.' using errcode='40001';end if;
 for r in select * from cuddle_stay.kennel_records k where k.type='boardingDog' and k.organization_id=dog.organization_id
 and (k.id=p_dog_id or (coalesce(entry->>'id','')<>'' and exists(select 1 from jsonb_array_elements(coalesce(k.payload->'careLogs','[]')) e where e->>'id'=entry->>'id'))) order by k.id loop
   if coalesce(entry->>'id','')='' then pos:=p_entry_index;matches:=1;
   else select count(*),min((ordinality-1)::integer) into matches,pos from jsonb_array_elements(coalesce(r.payload->'careLogs','[]')) with ordinality where value->>'id'=entry->>'id';end if;
   current_entry:=r.payload->'careLogs'->pos;
   if matches<>1 or (current_entry-array['dogId','dogName','stayId']) is distinct from (entry-array['dogId','dogName','stayId']) then raise exception 'A linked boarding care entry changed. Refresh and reopen.' using errcode='40001';end if;
   audit:=jsonb_build_object('note',coalesce(current_entry->>'note',''),'minutes',coalesce(current_entry->'minutes','""'::jsonb),'editedAt',stamp,'editedByEmail',actor);
   revised:=current_entry || jsonb_build_object('note',p_note,'updatedAt',stamp,'updatedByEmail',actor,'editHistory',coalesce(current_entry->'editHistory','[]')||jsonb_build_array(audit));
   if p_minutes is not null then revised:=revised||jsonb_build_object('minutes',p_minutes);end if;
   r.payload:=jsonb_set(r.payload,array['careLogs',pos::text],revised,false)||jsonb_build_object('updatedAt',stamp);
   update cuddle_stay.kennel_records set payload=r.payload,updated_at=stamp::timestamptz where id=r.id;
   records:=records||jsonb_build_array(r.payload);if r.id=p_dog_id then dog_payload:=r.payload;end if;
 end loop;
 return jsonb_build_object('dog',dog_payload,'records',records);
end;
$$;
revoke all on function cuddle_stay.edit_boarding_care_history(text,text,integer,jsonb,text,text) from public,anon;
grant execute on function cuddle_stay.edit_boarding_care_history(text,text,integer,jsonb,text,text) to authenticated;
