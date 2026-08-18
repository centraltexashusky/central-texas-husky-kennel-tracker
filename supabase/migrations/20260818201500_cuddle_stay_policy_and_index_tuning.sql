-- Keep organization joins indexed and evaluate one UPDATE policy per request.
create index if not exists app_settings_organization_id_idx
  on cuddle_stay.app_settings (organization_id);

create index if not exists organization_members_user_id_idx
  on shared.organization_members (user_id);

drop policy if exists "Cuddle Stay customers update own request data"
  on cuddle_stay.kennel_records;
drop policy if exists "Cuddle Stay staff update permitted records"
  on cuddle_stay.kennel_records;

create policy "Cuddle Stay members update permitted records"
on cuddle_stay.kennel_records
for update to authenticated
using (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and (
    (
      cuddle_stay_private.kennel_user_role() = 'customer'
      and (
        user_id = (select auth.uid())
        or cuddle_stay.kennel_payload_has_email(payload)
        or cuddle_stay.kennel_payload_audience_has_email(payload)
        or (
          type = 'settingsUser'
          and lower(coalesce(payload ->> 'email', '')) = cuddle_stay.kennel_auth_email()
        )
      )
      and (
        type <> 'boardingDog'
        or cuddle_stay.kennel_customer_boarding_payload_is_request(payload)
      )
    )
    or (
      cuddle_stay_private.kennel_is_staff_member()
      and cuddle_stay.kennel_staff_can_read_record(type, payload)
    )
  )
)
with check (
  organization_id = cuddle_stay_private.cuddle_stay_organization_id()
  and cuddle_stay.kennel_customer_can_write(type, payload)
  and (
    cuddle_stay_private.kennel_is_staff_member()
    or (
      cuddle_stay_private.kennel_user_role() = 'customer'
      and user_id = (select auth.uid())
    )
  )
);

notify pgrst, 'reload schema';
