-- Customers must be able to persist the signed agreement that the boarding
-- request flow creates before it saves the request itself. Keep this separate
-- from the general customer write helper so customer agreements remain
-- insert-only for customers; staff retains the existing administrative access.

create or replace function public.kennel_customer_boarding_agreement_is_valid(payload jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select public.kennel_auth_email() <> ''
    and lower(coalesce(payload ->> 'ownerEmail', '')) = public.kennel_auth_email()
    and lower(coalesce(payload ->> 'signerEmail', '')) = public.kennel_auth_email()
    and lower(coalesce(payload ->> 'removed', 'false')) <> 'true'
    and lower(coalesce(payload ->> 'electronicConsentAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
    and lower(coalesce(payload ->> 'agreementAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
    and lower(coalesce(payload ->> 'arbitrationAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
    and nullif(trim(coalesce(payload ->> 'signedAt', '')), '') is not null
    and nullif(trim(coalesce(payload ->> 'agreementVersion', '')), '') is not null
    and nullif(trim(coalesce(payload ->> 'documentHash', '')), '') is not null
    and nullif(trim(coalesce(payload ->> 'signatureHash', '')), '') is not null
$$;

drop policy if exists "Kennel customers can insert own boarding agreements"
on public.kennel_records;

create policy "Kennel customers can insert own boarding agreements"
on public.kennel_records
for insert
to authenticated
with check (
  type = 'boardingAgreement'
  and user_id = auth.uid()
  and public.kennel_customer_boarding_agreement_is_valid(payload)
);
