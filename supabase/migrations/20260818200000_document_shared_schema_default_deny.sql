-- The shared schema is intentionally not exposed and has no client grants.
-- Explicit deny policies make that default-deny posture visible to database
-- advisors and protect it if a future app accidentally grants table access.
create policy "No direct authenticated organization access"
on shared.organizations
for all to authenticated
using (false)
with check (false);

create policy "No direct authenticated membership access"
on shared.organization_members
for all to authenticated
using (false)
with check (false);
