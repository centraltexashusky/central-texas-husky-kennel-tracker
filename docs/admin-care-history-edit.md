# Admin care-history corrections and entry timestamps

Prepared on `feature/admin-care-history-edit`, based on production `50a3410`. Not deployed. Production release approval for the earlier display-only fix does not authorize this feature.

## Behavior

Our Dogs care cards/Timeline and boarding Medical/Behavior/Boarding History care logs expose Edit only to admins. The editor preloads current note text; exercise entries also expose minutes. Save/Cancel are explicit. Event date, original author, attachments, entry identity and original entry timestamp remain unchanged. Each correction stores `updatedAt`, `updatedByEmail` and an `editHistory` record with the prior note/minutes. Saved text remains escaped, and medical history keeps explicit newlines, no automatic wrapping, and contained horizontal scrolling.

The edit request identifies the dog, history array, exact position and complete expected entry. It never guesses by calendar date. Legacy entries without IDs and same-day/duplicate-ID entries are supported. An intervening prepend, reorder or edit fails safely with a conflict; it cannot silently edit a neighboring entry. The UI also checks the snapshot captured in the clicked card against the freshly fetched entry.

The RPC locks the current dog row and modifies only the chosen entry. For entries originating in a daily report, it also verifies and updates the uniquely linked source log in the same transaction. Missing/ambiguous/changed source data fails closed. This prevents a report resync from undoing an accepted correction. Failed saves retain the draft and never publish an optimistic correction locally. Late async responses cannot close a new editor.

## Admin-only enforcement

The new security-invoker RPC calls the existing database `cuddle_stay_private.kennel_is_admin()` helper, which resolves the trusted organization membership (existing owner/admin policy). It does not trust client role strings or user-editable auth metadata. Existing RLS and organization scope remain in force.

A table trigger additionally protects resident history arrays, boarding care logs and source daily-report care arrays from non-admin direct UPDATE/UPSERT/DELETE/type-change bypasses. Staff can append new entries and update unrelated fields; existing entries must remain intact, with duplicate-ID injection rejected. As required by admin-only history corrections, non-admin removal or rewriting of existing care entries is denied, including through the legacy daily-care editing controls. Existing view/new-care permissions remain unchanged; Boarding `careLogs` receive the same append-only protection for non-admins; existing view/new-entry permissions remain. Non-admin service undo that would delete a completed care log is also denied.

## Timestamps

Our Dogs history, recent-care summaries, daily-care cards, boarding medical/behavior tables and boarding history display persisted entry times in America/Chicago with explicit CST/CDT. Event dates remain separately displayed. Edits show a distinct edited time. New direct resident logs now persist creation time; generated history copies source entry time and keeps original timestamps across resyncs. Date-only/invalid/missing entry timestamps display “Time not recorded”; neither event dates nor edit times are presented as original entry times.

## Verification

- Aggregate suite plus new core checks: 71 commands.
- `node tools/care-history-check.mjs`: authorization, semantic snapshot equality, metadata preservation, no optimistic mutation, CST/CDT and legacy fallback.
- `PGLITE_MODULE=/path/to/pglite/dist/index.js node tools/care-history-sql-check.mjs`: migration executes in isolated PostgreSQL (PGlite 0.5.8), with real roles/RLS; verifies admin success, non-admin RPC/direct-write rejection, append/unrelated writes, stale conflicts, legacy identity, atomic source update and audit/timestamp preservation. No live database test writes.
- `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs QA_BASE_URL=http://127.0.0.1:8774/ node tools/care-history-browser-check.mjs`: local-test fixtures, remote database requests blocked; desktop 1440px and mobile 390/320px; prefill/cancel/save/reload, repeated/interrupted requests, stale edits, role revocation, unrelated data, actual creation paths, source resync, boarding timestamps and text escaping.
- Screenshots saved outside the repo under `/tmp/care-history-editor-{1440,390,320}.png`.

## Release gate and order

Requires explicit approval for BOTH the database migration and frontend deployment. No migration, edge function, scheduler, email or production data was changed during implementation. After approval, refresh remote main and inspect the bounded diff; apply the migration, verify deployed definitions/grants/advisors and read-only role configuration; then run the repo release stamp, publish the frontend and verify exact-commit Pages success. The new editor intentionally has no unsafe whole-record fallback if the RPC is absent.

Rollback: reverting the frontend removes Edit UI but retains the backend protection. Removing the trigger would reopen non-admin history writes and requires an explicit security decision. Existing correction metadata is additive and can remain stored.

The one-hour itemized pickup email is a separate proposal outside this commit; it has not been implemented or activated.

## Boarding-specific correction

`edit_boarding_care_history` uses the exact raw record, array index and full expected entry, under the same authoritative admin and organization checks. Matching log-ID copies across boarding profiles are locked and corrected atomically, preserving each profile/stay identity and all original author/date/time/media fields. Differing copies or ambiguous duplicate IDs fail closed. Legacy entries with no ID target only the exact record/index. The editor offers existing minutes fields alongside notes, including workout and service logs. Changes do not alter service completion state or charges. Rapid Cancel/reopen is guarded against an old dialog close event clearing a new session.
