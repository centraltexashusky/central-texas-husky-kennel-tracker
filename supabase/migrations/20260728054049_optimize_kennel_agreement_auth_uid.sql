-- Preserve the agreement validator while avoiding per-row auth.uid()
-- evaluation for customer agreement inserts.
drop policy if exists "Kennel customers can insert own boarding agreements" on public.kennel_records;
create policy "Kennel customers can insert own boarding agreements"
on public.kennel_records
for insert
to authenticated
with check (
  type = 'boardingAgreement'
  and user_id = (select auth.uid())
  and public.kennel_customer_boarding_agreement_is_valid(payload)
);
