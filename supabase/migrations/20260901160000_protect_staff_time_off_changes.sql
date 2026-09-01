-- Staff may revise or cancel only their own active time-off requests. Admins
-- retain the existing review authority, while completed request history stays
-- immutable for staff and remains available for payroll/schedule audits.

create or replace function cuddle_stay_private.protect_staff_time_off_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_status text := case when tg_op = 'UPDATE' then coalesce(old.payload ->> 'status', 'Pending') else '' end;
  new_status text := coalesce(new.payload ->> 'status', 'Pending');
  allowed_change_keys text[] := array[
    'startDate', 'endDate', 'reason', 'status', 'updatedAt',
    'revisedAt', 'revisedBy', 'revisedByEmail', 'revisionCount', 'revisionHistory',
    'reviewedAt', 'reviewedBy', 'reviewNote',
    'cancelledAt', 'cancelledBy', 'cancelledByEmail', 'cancellationReason',
    'statusHistory'
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
    if new_status <> 'Pending'
      or coalesce(new.payload ->> 'reviewedAt', '') <> ''
      or coalesce(new.payload ->> 'reviewedBy', '') <> ''
      or coalesce(new.payload ->> 'cancelledAt', '') <> '' then
      raise exception 'New staff time off requests must start as Pending.' using errcode = '42501';
    end if;
    return new;
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

  if new_status = 'Pending' then
    if coalesce(new.payload ->> 'revisedAt', '') = ''
      or coalesce(new.payload ->> 'revisedByEmail', '') = ''
      or coalesce(new.payload ->> 'reviewedAt', '') <> ''
      or coalesce(new.payload ->> 'reviewedBy', '') <> '' then
      raise exception 'A revised request must return to Pending for a new review.' using errcode = '23514';
    end if;
  elsif coalesce(new.payload ->> 'cancelledAt', '') = ''
    or coalesce(new.payload ->> 'cancelledByEmail', '') = ''
    or trim(coalesce(new.payload ->> 'cancellationReason', '')) = '' then
    raise exception 'A cancelled request must include its cancellation audit details.' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists protect_staff_time_off_changes on cuddle_stay.kennel_records;
create trigger protect_staff_time_off_changes
before insert or update of type, payload on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.protect_staff_time_off_changes();

revoke all on function cuddle_stay_private.protect_staff_time_off_changes() from public, anon, authenticated;

comment on function cuddle_stay_private.protect_staff_time_off_changes() is
  'Allows staff to revise or cancel only their own Pending or Approved time-off requests while preserving immutable request history.';
