-- Save a staff owner update without rewriting the full merged boarding profile.
-- The storage upload happens first; this short transaction atomically attaches
-- its references to the boarding record and records the staff audit event.

create or replace function cuddle_stay_private.kennel_save_boarding_customer_update_internal(
  p_record_id text,
  p_update jsonb,
  p_clear_owner_update boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_record cuddle_stay.kennel_records%rowtype;
  v_actor_email text := cuddle_stay.kennel_auth_email();
  v_actor_name text;
  v_actor_role text;
  v_now timestamptz := now();
  v_update_id text := trim(coalesce(p_update ->> 'id', ''));
  v_stay_id text := trim(coalesce(p_update ->> 'stayId', ''));
  v_request_code text := trim(coalesce(p_update ->> 'requestCode', ''));
  v_note text := trim(coalesce(p_update ->> 'note', ''));
  v_media_items jsonb := case when jsonb_typeof(p_update -> 'mediaItems') = 'array' then p_update -> 'mediaItems' else '[]'::jsonb end;
  v_update jsonb;
  v_updates jsonb;
  v_flags jsonb;
  v_payload jsonb;
  v_audit_id text := 'audit-' || replace(gen_random_uuid()::text, '-', '');
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member() then
    raise exception 'Staff access is required to save an owner update.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_update) <> 'object' or v_update_id = '' then
    raise exception 'A valid owner update is required.' using errcode = '22023';
  end if;
  if char_length(v_note) > 5000 then
    raise exception 'Owner update notes must be 5000 characters or fewer.' using errcode = '22023';
  end if;
  if jsonb_array_length(v_media_items) > 10 then
    raise exception 'An owner update can include at most 10 media files.' using errcode = '22023';
  end if;
  if v_note = '' and jsonb_array_length(v_media_items) = 0 then
    raise exception 'Add a note, photo, or video before saving an owner update.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(v_media_items) media
    where nullif(trim(coalesce(media ->> 'storagePath', '')), '') is null
      or media ->> 'storagePath' not like 'users/' || auth.uid()::text || '/%'
      or not exists (
        select 1
        from storage.objects object_record
        where object_record.bucket_id = 'kennel-media'
          and object_record.name = media ->> 'storagePath'
          and object_record.owner_id = auth.uid()::text
      )
  ) then
    raise exception 'Owner update media was not uploaded by the current staff account.' using errcode = '42501';
  end if;

  select *
  into v_record
  from cuddle_stay.kennel_records
  where organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and id = p_record_id
    and type = 'boardingDog'
  for update;
  if not found then
    raise exception 'Boarding record not found.' using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from jsonb_array_elements(
      case when jsonb_typeof(v_record.payload -> 'stays') = 'array' then v_record.payload -> 'stays' else '[]'::jsonb end
    ) stay
    where (v_stay_id <> '' and coalesce(stay ->> 'id', '') = v_stay_id)
      or (v_request_code <> '' and coalesce(stay ->> 'requestCode', '') = v_request_code)
  ) then
    raise exception 'Boarding stay not found.' using errcode = 'P0002';
  end if;

  v_actor_role := cuddle_stay_private.kennel_user_role();
  select nullif(trim(coalesce(profile.payload ->> 'name', '')), '')
  into v_actor_name
  from cuddle_stay.kennel_records profile
  where profile.organization_id = v_record.organization_id
    and profile.type = 'settingsUser'
    and lower(coalesce(profile.payload ->> 'email', '')) = v_actor_email
    and lower(coalesce(profile.payload ->> 'removed', 'false')) <> 'true'
  order by profile.updated_at desc nulls last, profile.id desc
  limit 1;
  v_actor_name := coalesce(v_actor_name, nullif(v_actor_email, ''), 'Staff');

  v_update := p_update || jsonb_build_object(
    'id', v_update_id,
    'createdAt', v_now,
    'boardingDogId', v_record.id,
    'dogName', coalesce(v_record.payload ->> 'dogName', p_update ->> 'dogName', ''),
    'note', v_note,
    'mediaItems', v_media_items,
    'byName', v_actor_name,
    'byEmail', v_actor_email
  );
  select jsonb_build_array(v_update) || coalesce(jsonb_agg(existing_update order by position), '[]'::jsonb)
  into v_updates
  from jsonb_array_elements(
    case when jsonb_typeof(v_record.payload -> 'customerUpdates') = 'array' then v_record.payload -> 'customerUpdates' else '[]'::jsonb end
  ) with ordinality as updates(existing_update, position)
  where coalesce(existing_update ->> 'id', '') <> v_update_id;

  if p_clear_owner_update then
    select coalesce(jsonb_agg(flag order by position), '[]'::jsonb)
    into v_flags
    from jsonb_array_elements(
      case when jsonb_typeof(v_record.payload -> 'flags') = 'array' then v_record.payload -> 'flags' else '[]'::jsonb end
    ) with ordinality as flags(flag, position)
    where flag <> to_jsonb('Required update from owner'::text);
  else
    v_flags := case when jsonb_typeof(v_record.payload -> 'flags') = 'array' then v_record.payload -> 'flags' else '[]'::jsonb end;
  end if;

  v_payload := v_record.payload || jsonb_build_object(
    'customerUpdates', v_updates,
    'latestCustomerUpdate', v_update,
    'dailyActivity', '',
    'flags', v_flags,
    'updatedAt', v_now
  );

  update cuddle_stay.kennel_records
  set payload = v_payload,
      helper_email = v_actor_email,
      updated_at = v_now
  where organization_id = v_record.organization_id
    and id = v_record.id;

  insert into cuddle_stay.kennel_records (
    organization_id, id, type, payload, helper_email, user_id, submitted_at, updated_at
  ) values (
    v_record.organization_id,
    v_audit_id,
    'auditLog',
    jsonb_build_object(
      'type', 'auditLog',
      'id', v_audit_id,
      'submittedAt', v_now,
      'action', 'Added customer boarding update',
      'targetType', 'boardingDog',
      'targetId', v_record.id,
      'targetLabel', coalesce(v_record.payload ->> 'dogName', 'Boarding dog'),
      'details', coalesce(nullif(v_request_code, ''), v_stay_id, 'stay') || ' | ' || coalesce(nullif(v_note, ''), 'Media update'),
      'actorName', v_actor_name,
      'actorEmail', v_actor_email,
      'actorRole', v_actor_role,
      'stayId', v_stay_id,
      'requestCode', v_request_code,
      'customerUpdateId', v_update_id,
      'mediaCount', jsonb_array_length(v_media_items),
      'removed', false
    ),
    v_actor_email,
    auth.uid(),
    v_now,
    v_now
  );

  return jsonb_build_object('payload', v_payload, 'customerUpdate', v_update);
end;
$$;

revoke all on function cuddle_stay_private.kennel_save_boarding_customer_update_internal(text, jsonb, boolean)
  from public, anon, authenticated;

create or replace function cuddle_stay.kennel_save_boarding_customer_update(
  p_record_id text,
  p_update jsonb,
  p_clear_owner_update boolean default true
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select cuddle_stay_private.kennel_save_boarding_customer_update_internal(
    p_record_id,
    p_update,
    p_clear_owner_update
  )
$$;

revoke all on function cuddle_stay.kennel_save_boarding_customer_update(text, jsonb, boolean)
  from public, anon;
grant execute on function cuddle_stay.kennel_save_boarding_customer_update(text, jsonb, boolean)
  to authenticated, service_role;

notify pgrst, 'reload schema';
