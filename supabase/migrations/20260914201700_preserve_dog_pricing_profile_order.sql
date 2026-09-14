-- Entitlement changes must not change which legacy profile is considered newest.
-- Restore only rows still carrying the exact pricing-migration timestamp and unchanged profile data.
update cuddle_stay.kennel_records r set updated_at=b.updated_at
from cuddle_stay_private.dog_pricing_v126_backup b
where r.id=b.id and r.organization_id=b.organization_id
and r.type in ('dog','customerDog','boardingDog')
and r.updated_at='2026-09-14 20:07:16.076225+00'::timestamptz
and (r.payload-'pricingScopeOverride'-'customerPricingScopeOverride')=(b.payload-'pricingScopeOverride'-'customerPricingScopeOverride');

