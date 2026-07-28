-- The function checks staff membership internally, but anonymous callers do
-- not need execute permission on a staff-only workflow.
revoke all on function public.complete_daily_task_atomic(date, text, text, text, text, text) from public;
revoke all on function public.complete_daily_task_atomic(date, text, text, text, text, text) from anon;
grant execute on function public.complete_daily_task_atomic(date, text, text, text, text, text) to authenticated;
grant execute on function public.complete_daily_task_atomic(date, text, text, text, text, text) to service_role;
