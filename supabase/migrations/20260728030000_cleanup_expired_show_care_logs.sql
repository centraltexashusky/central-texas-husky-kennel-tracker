-- Potty, water, and feeding check-ins are temporary show-day operations data.
-- Purge them seven days after the linked show ends while retaining results,
-- notes, schedules, tasks, expenses, and every other show record type.

create extension if not exists pg_cron;

create or replace function kennel_private.cleanup_expired_show_care_logs()
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  deleted_count integer := 0;
begin
  delete from public.kennel_records as care_log
  using public.kennel_records as show_event
  where care_log.type = 'showCareLog'
    and show_event.type = 'showEvent'
    and show_event.id = care_log.payload ->> 'showEventId'
    and lower(coalesce(care_log.payload ->> 'activityType', '')) in ('potty', 'water', 'feeding')
    and coalesce(
      nullif(show_event.payload ->> 'endDate', ''),
      nullif(show_event.payload ->> 'startDate', '')
    ) ~ '^\d{4}-\d{2}-\d{2}$'
    and coalesce(
      nullif(show_event.payload ->> 'endDate', ''),
      nullif(show_event.payload ->> 'startDate', '')
    )::date <= current_date - 7;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$function$;

revoke all on function kennel_private.cleanup_expired_show_care_logs() from public;
revoke all on function kennel_private.cleanup_expired_show_care_logs() from anon;
revoke all on function kennel_private.cleanup_expired_show_care_logs() from authenticated;

do $cron$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'kennel-expired-show-care-log-cleanup'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'kennel-expired-show-care-log-cleanup',
    '17 8 * * *',
    'select kennel_private.cleanup_expired_show_care_logs();'
  );
end;
$cron$;
