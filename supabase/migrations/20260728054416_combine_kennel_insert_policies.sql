-- A single permissive INSERT policy avoids evaluating two policies for every
-- authenticated insert. Agreement validation remains insert-only and is not
-- added to the general customer update helper.
drop policy if exists "Kennel authenticated insert records" on public.kennel_records;
create policy "Kennel authenticated insert records"
on public.kennel_records
for insert
to authenticated
with check (
  (
    public.kennel_customer_can_write(type, payload)
    and (
      kennel_private.kennel_is_staff_member()
      or user_id = (select auth.uid())
    )
  )
  or (
    type = 'boardingAgreement'
    and user_id = (select auth.uid())
    and public.kennel_customer_boarding_agreement_is_valid(payload)
  )
);

drop policy if exists "Kennel customers can insert own boarding agreements" on public.kennel_records;
