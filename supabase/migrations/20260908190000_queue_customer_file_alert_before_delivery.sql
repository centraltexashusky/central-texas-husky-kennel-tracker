-- Queue the staff-facing alert in the database before the browser asks the
-- notification Edge Function to deliver email. This preserves an actionable
-- in-app record even if delivery or later linked-profile synchronization fails.

create or replace function cuddle_stay.queue_customer_dog_file_notification(
  p_record_id text,
  p_notification_id text,
  p_file_items jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_record cuddle_stay.kennel_records%rowtype;
  v_existing cuddle_stay.kennel_records%rowtype;
  v_now timestamptz := now();
  v_payload jsonb;
  v_source_snapshot jsonb;
begin
  if v_user_id is null or v_user_email = '' then
    raise exception 'A verified Cuddle Stay login is required.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_record_id, '')), '') is null
    or nullif(trim(coalesce(p_notification_id, '')), '') is null
    or p_notification_id !~ '^notification-[a-zA-Z0-9_-]{8,180}$' then
    raise exception 'A valid customer dog and notification ID are required.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_file_items) <> 'array'
    or jsonb_array_length(p_file_items) < 1
    or jsonb_array_length(p_file_items) > 10 then
    raise exception 'One to ten uploaded file references are required.' using errcode = '22023';
  end if;

  select *
  into v_record
  from cuddle_stay.kennel_records record
  where record.organization_id = cuddle_stay_private.cuddle_stay_organization_id()
    and record.id = p_record_id
    and record.type = 'customerDog'
    and coalesce(lower(record.payload ->> 'removed'), 'false') <> 'true'
  for update;
  if not found then
    raise exception 'Customer dog record not found.' using errcode = 'P0002';
  end if;

  if not cuddle_stay_private.kennel_is_staff_member()
    and v_record.user_id <> v_user_id
    and v_user_email not in (
      lower(trim(coalesce(v_record.payload ->> 'ownerEmail', ''))),
      lower(trim(coalesce(v_record.payload ->> 'customerEmail', ''))),
      lower(trim(coalesce(v_record.payload ->> 'linkedOwnerEmail', ''))),
      lower(trim(coalesce(v_record.payload ->> 'secondaryOwnerEmail', '')))
    ) then
    raise exception 'That customer dog is not available to this login.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_file_items) requested
    where not exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(v_record.payload -> 'vaccinationRecords') = 'array'
          then v_record.payload -> 'vaccinationRecords'
          else '[]'::jsonb
        end
      ) saved
      where (
        nullif(trim(coalesce(requested ->> 'id', '')), '') is not null
        and requested ->> 'id' = saved ->> 'id'
      ) or (
        nullif(trim(coalesce(requested ->> 'storagePath', '')), '') is not null
        and requested ->> 'storagePath' = saved ->> 'storagePath'
      )
    )
    and not (
      nullif(trim(coalesce(requested ->> 'storagePath', '')), '') is not null
      and requested ->> 'storagePath' = v_record.payload ->> 'profilePhotoPath'
    )
  ) then
    raise exception 'Every alert file must already belong to this dog profile.' using errcode = '42501';
  end if;

  select *
  into v_existing
  from cuddle_stay.kennel_records existing
  where existing.organization_id = v_record.organization_id
    and existing.id = p_notification_id
  limit 1;
  if found then
    if v_existing.type <> 'notificationLog'
      or v_existing.payload ->> 'eventName' <> 'customerDogFileUploaded'
      or v_existing.payload ->> 'sourceId' <> v_record.id then
      raise exception 'That notification ID is already in use.' using errcode = '23505';
    end if;
    return v_existing.payload;
  end if;

  v_source_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'id', v_record.id,
    'type', 'customerDog',
    'dogName', v_record.payload -> 'dogName',
    'ownerName', v_record.payload -> 'ownerName',
    'ownerEmail', v_record.payload -> 'ownerEmail',
    'customerEmail', v_record.payload -> 'customerEmail',
    'secondaryOwnerEmail', v_record.payload -> 'secondaryOwnerEmail',
    'vaccinationFiles', v_record.payload -> 'vaccinationFiles',
    'notificationFileItems', p_file_items
  ));
  v_payload := jsonb_build_object(
    'id', p_notification_id,
    'type', 'notificationLog',
    'submittedAt', v_now,
    'updatedAt', v_now,
    'eventName', 'customerDogFileUploaded',
    'dedupeKey', 'customer-file-upload:' || v_record.id || ':' || md5(p_file_items::text),
    'title', 'Customer file uploaded: ' || coalesce(nullif(v_record.payload ->> 'dogName', ''), 'Customer dog'),
    'message', coalesce(nullif(v_record.payload ->> 'ownerName', ''), nullif(v_record.payload ->> 'ownerEmail', ''), 'A customer')
      || ' uploaded a file for ' || coalesce(nullif(v_record.payload ->> 'dogName', ''), 'a customer dog') || '.',
    'priority', 'review',
    'channels', jsonb_build_array('email', 'inApp'),
    'audienceRoles', jsonb_build_array('admin'),
    'audienceEmails', '[]'::jsonb,
    'alertCategory', 'Customer',
    'alertReason', 'Customer file uploaded',
    'dogName', coalesce(v_record.payload ->> 'dogName', ''),
    'ownerName', coalesce(v_record.payload ->> 'ownerName', v_record.payload ->> 'ownerEmail', ''),
    'actionLabel', 'View File',
    'actionTarget', jsonb_build_object(
      'eventName', 'customerDogFileUploaded',
      'sourceType', 'customerDog',
      'sourceId', v_record.id
    ),
    'sourceType', 'customerDog',
    'sourceId', v_record.id,
    'sourceSnapshot', v_source_snapshot,
    'readBy', '[]'::jsonb,
    'deliveryStatus', 'queued'
  );

  insert into cuddle_stay.kennel_records (
    organization_id, id, type, payload, helper_email, user_id, submitted_at, updated_at
  ) values (
    v_record.organization_id,
    p_notification_id,
    'notificationLog',
    v_payload,
    v_user_email,
    v_user_id,
    v_now,
    v_now
  );

  return v_payload;
end;
$$;

revoke all on function cuddle_stay.queue_customer_dog_file_notification(text, text, jsonb)
  from public, anon;
grant execute on function cuddle_stay.queue_customer_dog_file_notification(text, text, jsonb)
  to authenticated, service_role;

notify pgrst, 'reload schema';
