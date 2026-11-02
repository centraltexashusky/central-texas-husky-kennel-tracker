create table cuddle_stay.troubleshooting_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default cuddle_stay_private.cuddle_stay_organization_id(),
  actor_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  operation text not null check (operation in ('care.submit','record.save')),
  record_type text not null default '' check (length(record_type)<=48),
  record_id text not null default '' check (length(record_id)<=120),
  dog_id text not null default '' check (length(dog_id)<=120),
  care_type text not null default '' check (length(care_type)<=48),
  work_date date,
  error_code text not null check (length(error_code)<=32),
  category text not null check (category in ('history_protected','duplicate_history_id','permission_denied','timeout','network','save_failed')),
  message text not null check (message in (
    'Existing care history would be changed or omitted.',
    'A care history ID was duplicated.',
    'The database denied this write.',
    'Request timed out; persistence is uncertain.',
    'Network request failed; persistence is uncertain.',
    'Save failed. Use the error code and record ID to investigate.')),
  request_id text not null default '' check (length(request_id)<=64),
  app_version text not null check (length(app_version)<=48)
);
alter table cuddle_stay.troubleshooting_events enable row level security;
revoke all on cuddle_stay.troubleshooting_events from public, anon, authenticated;
grant select on cuddle_stay.troubleshooting_events to authenticated;
-- Identity and received timestamp cannot be supplied by the client.
grant insert(operation,record_type,record_id,dog_id,care_type,work_date,error_code,category,message,request_id,app_version)
  on cuddle_stay.troubleshooting_events to authenticated;
create policy "Staff submit diagnostic events" on cuddle_stay.troubleshooting_events
  for insert to authenticated with check (
    organization_id=cuddle_stay_private.cuddle_stay_organization_id()
    and actor_id=(select auth.uid()) and cuddle_stay_private.kennel_is_staff_member()
  );
create policy "Admins read diagnostic events" on cuddle_stay.troubleshooting_events
  for select to authenticated using (
    organization_id=cuddle_stay_private.cuddle_stay_organization_id()
    and cuddle_stay_private.kennel_is_admin()
  );
create index troubleshooting_events_recent_idx on cuddle_stay.troubleshooting_events(organization_id,created_at desc);
-- Existing pg_cron; this job deletes ONLY diagnostic events, never care records.
select cron.schedule('cuddle-stay-diagnostic-retention','25 4 * * *',
  $$delete from cuddle_stay.troubleshooting_events where created_at < now() - interval '14 days'$$);

-- Append the source and dog projection in a single transaction. Invoker security
-- retains existing RLS and the immutable-history trigger; no elevated care access.
create function cuddle_stay.append_owned_care_log(p_log jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  dog cuddle_stay.kennel_records%rowtype;
  daily cuddle_stay.kennel_records%rowtype;
  entry jsonb; projection jsonb; existing jsonb; history jsonb;
  source_a jsonb; source_b jsonb; field text; care_type text;
  work_date date; daily_id text; log_id text; actor_name text;
  last_field text; source_field text; next_field text; interval_days integer;
  stamp text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member() then
    raise exception 'Staff access is required to log care.' using errcode='42501';
  end if;
  log_id := p_log->>'id'; care_type := p_log->>'careType';
  if jsonb_typeof(p_log) is distinct from 'object' or octet_length(p_log::text)>100000
    or coalesce(log_id,'') !~ '^[A-Za-z0-9_-]{1,120}$'
    or coalesce(p_log->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
    or care_type is null or care_type <> all(array['Bath','Training','Treadmill','Scooter','Yard Run','Heat Note','Medical/Behavior Note']) then
    raise exception 'Invalid care log.' using errcode='22023';
  end if;
  work_date := (p_log->>'date')::date; daily_id := 'dailyTask-' || work_date::text;
  if care_type in ('Treadmill','Scooter','Yard Run') and
    (coalesce(p_log->>'minutes','') !~ '^\d+(\.\d+)?$' or (p_log->>'minutes')::numeric <= 0) then
    raise exception 'Enter exercise minutes before saving.' using errcode='22023';
  end if;
  -- Same lock order as the existing admin correction RPC: dog then daily source.
  select * into dog from cuddle_stay.kennel_records where id=p_log->>'dogId'
    and type='ownedDog' and organization_id=cuddle_stay_private.cuddle_stay_organization_id() for update;
  if not found or coalesce(dog.payload->>'removed','false')='true' then
    raise exception 'This dog is no longer available.' using errcode='P0002';
  end if;
  if care_type='Heat Note' and coalesce(dog.payload->>'sex','')<>'Female' then
    raise exception 'Heat notes can only be logged for female dogs.' using errcode='22023';
  end if;
  select payload->>'name' into actor_name from cuddle_stay.kennel_records
    where type='settingsUser' and organization_id=dog.organization_id
      and lower(payload->>'email')=lower(cuddle_stay.kennel_auth_email())
      and coalesce(payload->>'removed','false')<>'true'
    order by updated_at desc limit 1;
  entry := jsonb_build_object('id',log_id,'dogId',dog.id,
    'dogName',coalesce(nullif(dog.payload->>'callName',''),nullif(dog.payload->>'dogName',''),'Dog'),
    'careType',care_type,'date',work_date::text,'minutes',coalesce(p_log->'minutes','""'::jsonb),
    'note',coalesce(p_log->>'note',''),'mediaItems',coalesce(p_log->'mediaItems','[]'::jsonb),
    'alertAdmin',case when care_type='Medical/Behavior Note' and p_log->>'alertAdmin'='Yes' then 'Yes' else '' end,
    'loggedAt',stamp,'completedBy',coalesce(nullif(actor_name,''),'Staff'),
    'completedEmail',cuddle_stay.kennel_auth_email(),'submittedByUserId',auth.uid());
  if jsonb_typeof(entry->'mediaItems')<>'array' then raise exception 'Invalid care media.' using errcode='22023'; end if;
  insert into cuddle_stay.kennel_records(id,type,organization_id,user_id,helper_email,payload)
    values(daily_id,'dailyTask',dog.organization_id,auth.uid(),cuddle_stay.kennel_auth_email(),
      jsonb_build_object('id',daily_id,'type','dailyTask','date',work_date::text,'submittedAt',stamp,
        'helperName','Team completed work','helperEmail','','helperKey','','structuredCareLogs','[]'::jsonb,'careLogs','[]'::jsonb))
    on conflict(id) do nothing;
  select * into daily from cuddle_stay.kennel_records where id=daily_id and type='dailyTask'
    and organization_id=dog.organization_id for update;
  if not found or coalesce(daily.payload->>'removed','false')='true' then
    raise exception 'The daily record is unavailable.' using errcode='40001';
  end if;
  source_a := coalesce(daily.payload->'structuredCareLogs',daily.payload->'careLogs','[]'::jsonb);
  source_b := coalesce(daily.payload->'careLogs',daily.payload->'structuredCareLogs','[]'::jsonb);
  if jsonb_typeof(source_a)<>'array' or jsonb_typeof(source_b)<>'array' then
    raise exception 'The daily history needs administrator review.' using errcode='22023';
  end if;
  select value into existing from jsonb_array_elements(source_a || source_b) where value->>'id'=log_id limit 1;
  if found then
    -- A retry after an uncertain response returns the durable entry, including
    -- any later admin correction. It never appends or overwrites a second copy.
    if existing->>'dogId' is distinct from dog.id or existing->>'careType' is distinct from care_type
      or existing->>'date' is distinct from work_date::text or existing->>'submittedByUserId' is distinct from auth.uid()::text then
      raise exception 'This care submission ID is already in use.' using errcode='23505';
    end if;
    return jsonb_build_object('daily',daily.payload,'dog',dog.payload,'log',existing,'inserted',false);
  end if;
  field := case care_type when 'Bath' then 'bathHistory' when 'Training' then 'trainingLogs'
    when 'Heat Note' then 'heatHistory' when 'Medical/Behavior Note' then 'careNotesHistory' else 'exerciseLogs' end;
  history := coalesce(dog.payload->field,'[]'::jsonb);
  if jsonb_typeof(history)<>'array' then raise exception 'The dog history needs administrator review.' using errcode='22023'; end if;
  projection := jsonb_build_object('id',daily_id||'-'||log_id||'-'||case when care_type='Medical/Behavior Note' then 'Medical/Care' else care_type end,
    'sourceDailyTaskId',daily_id,'sourceCareLogId',log_id,
    'type',case when care_type='Medical/Behavior Note' then 'Medical/Care' else care_type end,
    'date',work_date::text,'minutes',entry->'minutes','note',entry->>'note','mediaItems',entry->'mediaItems',
    'completedBy',entry->>'completedBy','loggedAt',stamp);
  dog.payload := jsonb_set(dog.payload,array[field],jsonb_build_array(projection)||history);
  last_field := case care_type when 'Bath' then 'lastBath' when 'Training' then 'lastTrainingDate' when 'Heat Note' then 'lastHeat'
    when 'Medical/Behavior Note' then null else 'lastExerciseDate' end;
  source_field := case care_type when 'Bath' then 'bathUpdatedFromDailyTaskId' when 'Training' then 'lastTrainingUpdatedFromDailyTaskId'
    when 'Heat Note' then 'heatUpdatedFromDailyTaskId' else 'lastExerciseUpdatedFromDailyTaskId' end;
  if last_field is not null and coalesce(dog.payload->>last_field,'')<=work_date::text then
    dog.payload := dog.payload || jsonb_build_object(last_field,work_date::text,source_field,daily_id);
    if care_type in ('Bath','Heat Note') then
      next_field := case care_type when 'Bath' then 'nextBath' else 'nextHeat' end;
      interval_days := case when care_type='Bath' then coalesce(nullif(dog.payload->>'bathIntervalDays',''),'0')::integer
        else coalesce(nullif(dog.payload->>'heatCycleLengthDays',''),'183')::integer end;
      dog.payload := dog.payload || jsonb_build_object(next_field,case when interval_days>0 then (work_date+interval_days)::text else '' end);
      if care_type='Bath' then dog.payload := dog.payload || jsonb_build_object('bathUpdatedFromDailyTaskDate',work_date::text); end if;
    end if;
  end if;
  source_a := jsonb_build_array(entry)||source_a; source_b := jsonb_build_array(entry)||source_b;
  daily.payload := daily.payload || jsonb_build_object('structuredCareLogs',source_a,'careLogs',source_b,'updatedAt',stamp);
  daily.payload := daily.payload || jsonb_build_object('careSummary',jsonb_build_object(
    'total',jsonb_array_length(source_a),
    'dogsLogged',(select count(distinct value->>'dogId') from jsonb_array_elements(source_a)),
    'alerts',(select count(*) from jsonb_array_elements(source_a) where value->>'careType' in ('Heat Note','Medical/Behavior Note'))));
  dog.payload := dog.payload || jsonb_build_object('updatedAt',stamp);
  update cuddle_stay.kennel_records set payload=daily.payload,updated_at=stamp::timestamptz where id=daily.id;
  update cuddle_stay.kennel_records set payload=dog.payload,updated_at=stamp::timestamptz where id=dog.id;
  return jsonb_build_object('daily',daily.payload,'dog',dog.payload,'log',entry,'inserted',true);
end;
$$;
revoke all on function cuddle_stay.append_owned_care_log(jsonb) from public, anon;
grant execute on function cuddle_stay.append_owned_care_log(jsonb) to authenticated;
