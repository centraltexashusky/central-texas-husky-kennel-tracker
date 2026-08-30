-- Keep the Daily and Dashboard workspaces bounded to the dates on screen.
-- Historical records remain in the source tables and can be requested by
-- selecting another date/month, but are no longer downloaded on every visit.
create index if not exists kennel_records_daily_task_date_updated_idx
on cuddle_stay.kennel_records (
  organization_id,
  ((payload ->> 'date')) desc,
  updated_at desc
)
where type = 'dailyTask';

create index if not exists daily_task_completions_org_date_completed_idx
on cuddle_stay.daily_task_completions (
  organization_id,
  work_date desc,
  completed_at desc,
  id
);

create or replace function cuddle_stay.kennel_daily_task_records_window(
  p_start_date date,
  p_end_date date,
  p_since_updated_at timestamptz default null
)
returns table (
  id text,
  type text,
  payload jsonb,
  helper_email text,
  user_id uuid,
  submitted_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    record.id,
    record.type,
    record.payload,
    record.helper_email,
    record.user_id,
    record.submitted_at,
    record.updated_at
  from cuddle_stay.kennel_records record
  where record.type = 'dailyTask'
    and p_start_date is not null
    and p_end_date is not null
    and p_start_date <= p_end_date
    and p_end_date - p_start_date <= 62
    and (record.payload ->> 'date') >= p_start_date::text
    and (record.payload ->> 'date') <= p_end_date::text
    and (p_since_updated_at is null or record.updated_at >= p_since_updated_at)
  order by (record.payload ->> 'date') desc, record.updated_at desc;
$$;

create or replace function cuddle_stay.kennel_daily_task_completion_snapshot(
  p_start_date date,
  p_end_date date,
  p_detail_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when p_start_date is null
      or p_end_date is null
      or p_detail_date is null
      or p_start_date > p_end_date
      or p_end_date - p_start_date > 62
      or p_detail_date < p_start_date
      or p_detail_date > p_end_date
    then jsonb_build_object('counts', '{}'::jsonb, 'details', '[]'::jsonb)
    else jsonb_build_object(
      'counts', coalesce((
        select jsonb_object_agg(summary.work_date::text, summary.completion_count order by summary.work_date)
        from (
          select completion.work_date, count(*)::integer as completion_count
          from cuddle_stay.daily_task_completions completion
          where completion.work_date between p_start_date and p_end_date
          group by completion.work_date
        ) summary
      ), '{}'::jsonb),
      'details', coalesce((
        select jsonb_agg(to_jsonb(detail) order by detail.completed_at desc, detail.id)
        from (
          select
            completion.id,
            completion.work_date,
            completion.shift,
            completion.task_id,
            completion.task_text,
            completion.completed_by,
            completion.completed_email,
            completion.completed_user_id,
            completion.completed_at,
            completion.inserted_at,
            completion.updated_at
          from cuddle_stay.daily_task_completions completion
          where completion.work_date = p_detail_date
        ) detail
      ), '[]'::jsonb)
    )
  end;
$$;

revoke all on function cuddle_stay.kennel_daily_task_records_window(date, date, timestamptz)
  from public, anon;
revoke all on function cuddle_stay.kennel_daily_task_completion_snapshot(date, date, date)
  from public, anon;

grant execute on function cuddle_stay.kennel_daily_task_records_window(date, date, timestamptz)
  to authenticated, service_role;
grant execute on function cuddle_stay.kennel_daily_task_completion_snapshot(date, date, date)
  to authenticated, service_role;

notify pgrst, 'reload schema';
