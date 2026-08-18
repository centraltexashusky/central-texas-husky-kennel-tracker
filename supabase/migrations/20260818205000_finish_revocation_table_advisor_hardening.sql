-- The revocation table is deliberately private. Keep an explicit deny policy so
-- security reviews can distinguish intentional default-deny from an omission.
create index if not exists organization_member_revocations_user_id_idx
  on shared.organization_member_revocations (user_id);

drop policy if exists "No direct revocation access" on shared.organization_member_revocations;
create policy "No direct revocation access"
on shared.organization_member_revocations
for all to authenticated
using (false)
with check (false);
