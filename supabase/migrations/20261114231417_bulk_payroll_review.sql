-- Read-only grouped review. Confirmation uses one INSERT statement so existing
-- per-payment validation, RLS and immutable snapshots apply atomically to all rows.
create or replace function cuddle_stay.payroll_bulk_preview(p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare item jsonb; result jsonb:='[]'; week date; name text;
begin
 if not cuddle_stay_private.kennel_is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Select payroll weeks to review.'; end if;
 if jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Select between 1 and 50 employee-weeks per batch.'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x)<>'object' or coalesce(x->>'staffId','')='' or coalesce(x->>'weekStart','') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid payroll selection.'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x group by x->>'staffId',x->>'weekStart' having count(*)>1) then raise exception 'A payroll week was selected more than once.'; end if;
 for item in select x from jsonb_array_elements(p_items) x order by x->>'staffId',x->>'weekStart'
 loop
  week:=(item->>'weekStart')::date;
  if week>=date_trunc('week',now() at time zone 'America/Chicago')::date then raise exception 'Bulk confirmation is for past payroll weeks only.'; end if;
  begin
   result:=result||jsonb_build_array(cuddle_stay.payroll_week_preview(item->>'staffId',week));
  exception when others then
   select payload->>'name' into name from cuddle_stay.kennel_records where id=item->>'staffId' and type='settingsUser';
   raise exception using message=format('%s · week of %s: %s',coalesce(name,item->>'staffId'),week,sqlerrm),errcode=sqlstate;
  end;
 end loop;
 return result;
end $$;
revoke all on function cuddle_stay.payroll_bulk_preview(jsonb) from public,anon;
grant execute on function cuddle_stay.payroll_bulk_preview(jsonb) to authenticated,service_role;
