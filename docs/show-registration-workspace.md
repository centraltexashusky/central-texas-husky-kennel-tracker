# Show registration workspace

Dog Shows → Registration is an across-show, dog-first queue. By show filters the
same canonical dogs and records. Only Showing entries in open, non-removed shows
appear; socializing attendance is unchanged. Past shows stay until explicitly
completed, matching the existing operational selection rule.

## Data and boundaries

- `showEntryPassport` lives on the explicitly linked customer/owned dog profile,
  falling back to the original boarding profile only when no canonical customer
  identity is established. Never merge dogs by name.
- Identity corrections are shared with the existing profile fields. Review is
  invalidated if those fields change after the passport was reviewed.
- `showEntry.entryRegistrations` is append-only paperwork history, keyed by ring
  appearance and exact event/date/class/competition context. Each change keeps a
  passport snapshot and actor/time/reference. Changing an assignment requires a
  new matching confirmation; it does not reuse an old confirmation for a new day.
- `registrationStatus` summarizes the appearance records for legacy consumers.
  Once detailed records exist, edit status in Registration, not the old one-field
  selector. Older Entered/Registered flags remain labeled as unverified legacy
  registrations until evidence is recorded. Confirmed attendance is not proof.
- `showEvent.entryUrl` is the exact official entry link. Existing superintendent
  research URLs are clearly labeled as provider-site fallbacks. Never infer a
  provider URL, auto-submit, pay, or mark registered on an outbound click.
- Registration saves reread authenticated `cuddle_stay.kennel_records` records,
  merge only changed fields into the full cloud payload, and use `updated_at` as
  a compare-and-swap filter. Cache is updated only after a returned saved row.
  Local saves are allowed only in the explicit local test session.
- No migrations, policy changes, new accounts, or production test records.

## Verification

Run `npm test` and `npm run test:dog-show-registration-workspace`.
The new check covers canonical identity, multiday/birthday boundaries, missing
information, context invalidation, immutable snapshots, unsafe URLs, role checks,
cloud failures, version races, and preservation of unrelated cloud fields.

For a browser fixture (synthetic data only):
`node tools/dog-show-registration-workspace-check.mjs --serve`.
Open `http://127.0.0.1:8767/__registration-test` or
`http://127.0.0.1:8767/__registration-mobile`. No real data is submitted. The latter
uses a 390px iframe because hidden in-app tabs retain their default viewport.

Actual cloud update responses are contract-tested with a fake authenticated
adapter; browser fixture saves use local storage, not customer records.
