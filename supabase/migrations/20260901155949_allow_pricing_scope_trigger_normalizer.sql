-- The trigger runs with the authenticated caller's privileges. Allow it to use
-- the deterministic normalizer while keeping the write-protection trigger
-- function itself unavailable for direct client calls.
grant execute on function cuddle_stay_private.normalize_dog_pricing_scope_override(text) to authenticated, service_role;
