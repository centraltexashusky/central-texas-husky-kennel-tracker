-- Browser clients use soft-delete/audit records. Keep hard deletes restricted
-- to trusted service operations so a UI retention pass cannot erase history.
drop policy if exists "Cuddle Stay admins delete records" on cuddle_stay.kennel_records;
drop policy if exists "Cuddle Stay staff delete expired notification logs" on cuddle_stay.kennel_records;
revoke delete on cuddle_stay.kennel_records from authenticated;

-- Every privileged function uses only schema-qualified objects.
alter function cuddle_stay.complete_daily_task_atomic(date, text, text, text, text, text) set search_path = '';
alter function cuddle_stay_private.kennel_apply_boarding_requirement_override_internal(text, text, text, text, jsonb, text) set search_path = '';
alter function cuddle_stay_private.kennel_user_role() set search_path = '';
alter function cuddle_stay_private.kennel_is_admin() set search_path = '';
alter function cuddle_stay_private.kennel_is_staff_member() set search_path = '';
alter function cuddle_stay_private.kennel_settings_user_self_write_allowed(jsonb) set search_path = '';
alter function cuddle_stay_private.register_customer_membership_internal() set search_path = '';
alter function cuddle_stay_private.sync_settings_user_membership() set search_path = '';
