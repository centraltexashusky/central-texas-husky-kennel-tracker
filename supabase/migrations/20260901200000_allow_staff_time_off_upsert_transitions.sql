-- Supabase persists records with INSERT ... ON CONFLICT DO UPDATE. PostgreSQL
-- fires BEFORE INSERT triggers before it resolves the conflict, so an approved
-- request being cancelled arrives here as an INSERT first. Allow that insert
-- phase only when the same owned, active request already exists; the following
-- UPDATE trigger invocation still enforces the complete transition and audit.

create or replace function cuddle_stay_private.protect_staff_time_off_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_status text := case when tg_op = 'UPDATE' then coalesce(old.payload ->> 'status', 'Pending') else '' end;
  new_status text := coalesce(new.payload ->> 'status', 'Pending');
  auth_email text := lower(coalesce(cuddle_stay.kennel_auth_email(), ''));
  existing_upsert_payload jsonb := null;
  old_revision_history jsonb := case when tg_op = 'UPDATE' then coalesce(old.payload -> 'revisionHistory', '[]'::jsonb) else '[]'::jsonb end;
  new_revision_history jsonb := coalesce(new.payload -> 'revisionHistory', '[]'::jsonb);
  old_status_history jsonb := case when tg_op = 'UPDATE' then coalesce(old.payload -> 'statusHistory', '[]'::jsonb) else '[]'::jsonb end;
  new_status_history jsonb := coalesce(new.payload -> 'statusHistory', '[]'::jsonb);
  allowed_change_keys text[] := array[
    'startDate', 'endDate', 'reason', 'status', 'updatedAt',
    'revisedAt', 'revisedBy', 'revisedByEmail', 'revisionCount', 'revisionHistory',
    'reviewedAt', 'reviewedBy', 'reviewNote',
    'cancelledAt', 'cancelledBy', 'cancelledByEmail', 'cancellationReason',
    'statusHistory'
  ];
  cancellation_change_keys text[] := array[
    'status', 'updatedAt', 'cancelledAt', 'cancelledBy',
    'cancelledByEmail', 'cancellationReason', 'statusHistory'
  ];
begin
  if current_user in ('postgres', 'service_role') or auth.uid() is null then
    return new;
  end if;

  if not cuddle_stay_private.kennel_is_staff_member() or cuddle_stay_private.kennel_is_admin() then
    return new;
  end if;

  if tg_op = 'UPDATE'
    and old.type is distinct from new.type
    and (old.type = 'timeOffRequest' or new.type = 'timeOffRequest') then
    raise exception 'Time off request record type cannot be changed.' using errcode = '42501';
  end if;

  if new.type <> 'timeOffRequest' then
    return new;
  end if;

  if not cuddle_stay.kennel_staff_record_belongs_to_auth(new.payload)
    or (tg_op = 'UPDATE' and not cuddle_stay.kennel_staff_record_belongs_to_auth(old.payload)) then
    raise exception 'Staff can only change their own time off requests.' using errcode = '42501';
  end if;

  if coalesce(new.payload ->> 'startDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(new.payload ->> 'endDate', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or (new.payload ->> 'endDate') < (new.payload ->> 'startDate') then
    raise exception 'Time off request dates are invalid.' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if new_status = 'Pending'
      and coalesce(new.payload ->> 'reviewedAt', '') = ''
      and coalesce(new.payload ->> 'reviewedBy', '') = ''
      and coalesce(new.payload ->> 'cancelledAt', '') = '' then
      return new;
    end if;

    if new_status = 'Cancelled' then
      select record.payload
      into existing_upsert_payload
      from cuddle_stay.kennel_records record
      where record.organization_id = new.organization_id
        and record.id = new.id
        and record.type = 'timeOffRequest'
      limit 1;

      if existing_upsert_payload is not null
        and cuddle_stay.kennel_staff_record_belongs_to_auth(existing_upsert_payload)
        and coalesce(existing_upsert_payload ->> 'status', 'Pending') in ('Pending', 'Approved') then
        return new;
      end if;
    end if;

    raise exception 'New staff time off requests must start as Pending.' using errcode = '42501';
  end if;

  if old_status not in ('Pending', 'Approved') then
    raise exception 'Only pending or approved time off requests can be changed by staff.' using errcode = '42501';
  end if;

  if new_status not in ('Pending', 'Cancelled') then
    raise exception 'Staff may only revise a request to Pending or cancel it.' using errcode = '42501';
  end if;

  if (new.payload - allowed_change_keys) is distinct from (old.payload - allowed_change_keys) then
    raise exception 'Staff may only revise time off dates, reason, or cancellation details.' using errcode = '42501';
  end if;

  if jsonb_typeof(old_revision_history) <> 'array'
    or jsonb_typeof(new_revision_history) <> 'array'
    or jsonb_typeof(old_status_history) <> 'array'
    or jsonb_typeof(new_status_history) <> 'array' then
    raise exception 'Time off request history must be stored as arrays.' using errcode = '23514';
  end if;

  if not new_status_history @> old_status_history then
    raise exception 'Time off request status history cannot be removed.' using errcode = '42501';
  end if;

  if new_status = 'Pending' then
    if lower(coalesce(new.payload ->> 'revisedByEmail', '')) <> auth_email
      or coalesce(new.payload ->> 'revisedAt', '') = ''
      or coalesce(new.payload ->> 'reviewedAt', '') <> ''
      or coalesce(new.payload ->> 'reviewedBy', '') <> ''
      or jsonb_array_length(new_revision_history) <> jsonb_array_length(old_revision_history) + 1
      or not new_revision_history @> old_revision_history
      or coalesce((new.payload ->> 'revisionCount')::integer, 0) <> coalesce((old.payload ->> 'revisionCount')::integer, 0) + 1 then
      raise exception 'A revised request must append its audit history and return to Pending for a new review.' using errcode = '23514';
    end if;
  else
    if (new.payload - cancellation_change_keys) is distinct from (old.payload - cancellation_change_keys)
      or lower(coalesce(new.payload ->> 'cancelledByEmail', '')) <> auth_email
      or coalesce(new.payload ->> 'cancelledAt', '') = ''
      or trim(coalesce(new.payload ->> 'cancellationReason', '')) = ''
      or jsonb_array_length(new_status_history) <> jsonb_array_length(old_status_history) + 1 then
      raise exception 'A cancelled request must preserve request history and append its cancellation audit.' using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

revoke all on function cuddle_stay_private.protect_staff_time_off_changes() from public, anon, authenticated;

comment on function cuddle_stay_private.protect_staff_time_off_changes() is
  'Allows staff-owned time-off upserts to revise or cancel Pending and Approved requests while enforcing append-only audit history.';
