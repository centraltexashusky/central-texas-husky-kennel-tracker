-- Store the active customer agreement template in the singleton workspace
-- settings row. Customers can read the configuration, while the existing
-- app_settings RLS policies keep writes admin-only.
alter table public.app_settings
  add column if not exists agreement_config jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_settings_agreement_config_object'
      and conrelid = 'public.app_settings'::regclass
  ) then
    alter table public.app_settings
      add constraint app_settings_agreement_config_object
      check (jsonb_typeof(agreement_config) = 'object');
  end if;
end
$$;

-- Preserve the strict legacy agreement checks while allowing an admin-defined
-- custom document to choose whether a drawn signature, acknowledgement, and
-- customer response are required. Every accepted record still needs immutable
-- document and acceptance hashes.
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
    and (
      (
        coalesce(payload ->> 'agreementMode', 'built-in') <> 'custom-template'
        and lower(coalesce(payload ->> 'electronicConsentAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
        and lower(coalesce(payload ->> 'agreementAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
        and lower(coalesce(payload ->> 'arbitrationAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
      )
      or
      (
        payload ->> 'agreementMode' = 'custom-template'
        and lower(coalesce(payload ->> 'agreementAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
        and nullif(trim(coalesce(payload #>> '{agreementDocument,storagePath}', '')), '') is not null
        and exists (
          select 1
          from public.app_settings settings
          where settings.id = 'workspace'
            and lower(coalesce(settings.agreement_config ->> 'customAgreementEnabled', 'false')) in ('true', 't', '1', 'yes', 'on')
            and nullif(trim(coalesce(settings.agreement_config #>> '{document,storagePath}', '')), '') is not null
            and payload #>> '{agreementDocument,storagePath}' = settings.agreement_config #>> '{document,storagePath}'
            and (
              (
                lower(coalesce(settings.agreement_config ->> 'signatureRequired', 'true')) in ('false', 'f', '0', 'no', 'off')
                and lower(coalesce(payload ->> 'signatureRequired', 'false')) in ('false', 'f', '0', 'no', 'off')
                and payload ->> 'signatureMethod' = 'electronic-acceptance'
              )
              or
              (
                lower(coalesce(settings.agreement_config ->> 'signatureRequired', 'true')) in ('true', 't', '1', 'yes', 'on')
                and lower(coalesce(payload ->> 'signatureRequired', 'false')) in ('true', 't', '1', 'yes', 'on')
                and lower(coalesce(payload ->> 'electronicConsentAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
                and payload ->> 'signatureMethod' = 'drawn-signature-pad'
                and nullif(trim(coalesce(payload ->> 'signatureImageData', '')), '') is not null
              )
            )
            and (
              lower(coalesce(settings.agreement_config ->> 'acknowledgementEnabled', 'false')) in ('false', 'f', '0', 'no', 'off')
              or (
                lower(coalesce(payload ->> 'customAcknowledgementRequired', 'false')) in ('true', 't', '1', 'yes', 'on')
                and lower(coalesce(payload ->> 'customAcknowledgementAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
                and payload #>> '{agreementConfiguration,acknowledgementText}' = settings.agreement_config ->> 'acknowledgementText'
              )
            )
            and (
              lower(coalesce(settings.agreement_config ->> 'customerFieldEnabled', 'false')) in ('false', 'f', '0', 'no', 'off')
              or (
                lower(coalesce(payload ->> 'customerResponseRequired', 'false')) in ('true', 't', '1', 'yes', 'on')
                and nullif(trim(coalesce(payload ->> 'customerResponseValue', '')), '') is not null
                and payload #>> '{agreementConfiguration,customerFieldPrompt}' = settings.agreement_config ->> 'customerFieldPrompt'
              )
            )
        )
      )
    )
    and nullif(trim(coalesce(payload ->> 'signedAt', '')), '') is not null
    and nullif(trim(coalesce(payload ->> 'agreementVersion', '')), '') is not null
    and nullif(trim(coalesce(payload ->> 'documentHash', '')), '') is not null
    and nullif(trim(coalesce(payload ->> 'signatureHash', '')), '') is not null
$$;
