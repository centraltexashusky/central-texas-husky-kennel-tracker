-- Allow each custom agreement acknowledgement to be independently required
-- or optional. Legacy acknowledgement items remain required by default.
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
        and exists (
          select 1
          from public.app_settings settings
          cross join lateral (
            select
              case
                when lower(coalesce(settings.agreement_config ->> 'acknowledgementEnabled', 'false')) not in ('true', 't', '1', 'yes', 'on')
                  then '[]'::jsonb
                when jsonb_typeof(settings.agreement_config -> 'acknowledgements') = 'array'
                  then coalesce((
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', coalesce(nullif(trim(item ->> 'id'), ''), 'acknowledgement-' || position),
                        'text', coalesce(item ->> 'text', ''),
                        'required', lower(coalesce(item ->> 'required', 'true')) in ('true', 't', '1', 'yes', 'on')
                      )
                      order by position
                    )
                    from jsonb_array_elements(settings.agreement_config -> 'acknowledgements') with ordinality acknowledgement(item, position)
                  ), '[]'::jsonb)
                when nullif(trim(coalesce(settings.agreement_config ->> 'acknowledgementText', '')), '') is not null
                  then jsonb_build_array(jsonb_build_object(
                    'id', 'acknowledgement-1',
                    'text', settings.agreement_config ->> 'acknowledgementText',
                    'required', true
                  ))
                else '[]'::jsonb
              end as acknowledgements,
              case
                when lower(coalesce(settings.agreement_config ->> 'customerFieldEnabled', 'false')) not in ('true', 't', '1', 'yes', 'on')
                  then '[]'::jsonb
                when jsonb_typeof(settings.agreement_config -> 'customerFields') = 'array'
                  then settings.agreement_config -> 'customerFields'
                when nullif(trim(coalesce(settings.agreement_config ->> 'customerFieldPrompt', '')), '') is not null
                  then jsonb_build_array(jsonb_build_object(
                    'id', 'customer-field-1',
                    'text', settings.agreement_config ->> 'customerFieldPrompt'
                  ))
                else '[]'::jsonb
              end as customer_fields
          ) requirements
          where settings.id = 'workspace'
            and lower(coalesce(settings.agreement_config ->> 'customAgreementEnabled', 'false')) in ('true', 't', '1', 'yes', 'on')
            and (
              (
                coalesce(settings.agreement_config ->> 'agreementSource', 'document') = 'text'
                and nullif(trim(coalesce(settings.agreement_config ->> 'agreementText', '')), '') is not null
                and payload ->> 'agreementBodyText' = settings.agreement_config ->> 'agreementText'
                and payload #>> '{agreementConfiguration,agreementSource}' = 'text'
                and payload #>> '{agreementConfiguration,agreementText}' = settings.agreement_config ->> 'agreementText'
              )
              or
              (
                coalesce(settings.agreement_config ->> 'agreementSource', 'document') <> 'text'
                and nullif(trim(coalesce(settings.agreement_config #>> '{document,storagePath}', '')), '') is not null
                and payload #>> '{agreementDocument,storagePath}' = settings.agreement_config #>> '{document,storagePath}'
              )
            )
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
            and coalesce(payload #> '{agreementConfiguration,acknowledgements}', '[]'::jsonb) = requirements.acknowledgements
            and coalesce(payload #> '{agreementConfiguration,customerFields}', '[]'::jsonb) = requirements.customer_fields
            and (
              (
                jsonb_array_length(requirements.acknowledgements) = 0
                and lower(coalesce(payload ->> 'customAcknowledgementRequired', 'false')) in ('false', 'f', '0', 'no', 'off')
              )
              or (
                jsonb_array_length(requirements.acknowledgements) > 0
                and jsonb_typeof(payload -> 'customAcknowledgementResponses') = 'array'
                and jsonb_array_length(payload -> 'customAcknowledgementResponses') = jsonb_array_length(requirements.acknowledgements)
                and (
                  lower(coalesce(payload ->> 'customAcknowledgementRequired', 'false')) in ('true', 't', '1', 'yes', 'on')
                ) = exists (
                  select 1
                  from jsonb_array_elements(requirements.acknowledgements) expected(item)
                  where lower(coalesce(expected.item ->> 'required', 'true')) in ('true', 't', '1', 'yes', 'on')
                )
                and (
                  not exists (
                    select 1
                    from jsonb_array_elements(requirements.acknowledgements) expected(item)
                    where lower(coalesce(expected.item ->> 'required', 'true')) in ('true', 't', '1', 'yes', 'on')
                  )
                  or lower(coalesce(payload ->> 'customAcknowledgementAccepted', 'false')) in ('true', 't', '1', 'yes', 'on')
                )
                and not exists (
                  select 1
                  from jsonb_array_elements(requirements.acknowledgements) with ordinality expected(item, position)
                  where coalesce((payload -> 'customAcknowledgementResponses' -> ((expected.position - 1)::integer)) ->> 'id', '') <> coalesce(expected.item ->> 'id', '')
                     or coalesce((payload -> 'customAcknowledgementResponses' -> ((expected.position - 1)::integer)) ->> 'text', '') <> coalesce(expected.item ->> 'text', '')
                     or (
                       lower(coalesce((payload -> 'customAcknowledgementResponses' -> ((expected.position - 1)::integer)) ->> 'required', 'true')) in ('true', 't', '1', 'yes', 'on')
                     ) <> (
                       lower(coalesce(expected.item ->> 'required', 'true')) in ('true', 't', '1', 'yes', 'on')
                     )
                     or (
                       lower(coalesce(expected.item ->> 'required', 'true')) in ('true', 't', '1', 'yes', 'on')
                       and lower(coalesce((payload -> 'customAcknowledgementResponses' -> ((expected.position - 1)::integer)) ->> 'accepted', 'false')) not in ('true', 't', '1', 'yes', 'on')
                     )
                )
              )
            )
            and (
              (
                jsonb_array_length(requirements.customer_fields) = 0
                and lower(coalesce(payload ->> 'customerResponseRequired', 'false')) in ('false', 'f', '0', 'no', 'off')
              )
              or (
                jsonb_array_length(requirements.customer_fields) > 0
                and lower(coalesce(payload ->> 'customerResponseRequired', 'false')) in ('true', 't', '1', 'yes', 'on')
                and jsonb_typeof(payload -> 'customerFieldResponses') = 'array'
                and jsonb_array_length(payload -> 'customerFieldResponses') = jsonb_array_length(requirements.customer_fields)
                and not exists (
                  select 1
                  from jsonb_array_elements(requirements.customer_fields) with ordinality expected(item, position)
                  where coalesce((payload -> 'customerFieldResponses' -> ((expected.position - 1)::integer)) ->> 'id', '') <> coalesce(expected.item ->> 'id', '')
                     or coalesce((payload -> 'customerFieldResponses' -> ((expected.position - 1)::integer)) ->> 'prompt', '') <> coalesce(expected.item ->> 'text', '')
                     or nullif(trim(coalesce((payload -> 'customerFieldResponses' -> ((expected.position - 1)::integer)) ->> 'value', '')), '') is null
                )
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
