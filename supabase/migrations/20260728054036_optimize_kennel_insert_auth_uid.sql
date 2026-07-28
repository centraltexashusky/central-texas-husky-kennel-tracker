-- Cache auth.uid() once per statement instead of re-evaluating it for every
-- kennel record considered by the insert policy.
drop policy if exists "Kennel authenticated insert records" on public.kennel_records;
create policy "Kennel authenticated insert records"
on public.kennel_records
for insert
to authenticated
with check (
  public.kennel_customer_can_write(type, payload)
  and (
    kennel_private.kennel_is_staff_member()
    or user_id = (select auth.uid())
  )
);
