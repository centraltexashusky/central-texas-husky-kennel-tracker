# Staff rates and weekly payroll

Admins use **Timesheet → Payroll → Give a raise / change rate** to choose an employee, hourly rate and effective date. Work dates before that date retain their previous rate. Future changes are scheduled; the rate list shows both current and dated rates. The first change retains the previous saved rate as a baseline. Unknown older rates must be reviewed rather than inferred.

The weekly history covers full Monday–Sunday weeks intersecting its date filters. Filter by employee as needed. Gross pay sums each completed clock entry's two-decimal hours at the rate effective on that work date, rounded to cents. Open clocks must be resolved before confirming that employee's week.

Use **Review & mark paid**, verify the hours and rates against the actual payment, enter its date/method/reference, and confirm. **Mark paid & lock** records a payment already made; it does not transfer money or calculate withholding. The immutable receipt saves the gross amount, original clock records and rates. Paid clocks cannot be removed, reassigned or repriced. Payment details are admin-only.

Old weeks start as **Needs review**. They are not automatically marked paid. A week is **Paid & locked** only when all currently completed entries have receipts. Hours added afterward appear as unconfirmed supplemental payroll, with **Partly paid** status. Review those separately; previous receipts do not change. Correct mistaken confirmations with a separately documented accounting adjustment; there is no delete or edit action for receipts.

For backfilling past payments, select employee-weeks using **Select week**, or **Select past weeks shown** after setting the date/employee filters. **Review selected & mark paid** opens one combined review (up to 50 employee-weeks). Apply common payment details, adjust each week's actual date/method/reference as needed, review clock entries, and confirm once with **Mark all selected paid & lock**. Every employee-week gets a separate immutable receipt. The entire batch saves atomically; a stale or invalid week rejects every new receipt, so review again rather than assuming partial payment. Current weeks, fully paid weeks, unmatched staff and missing-rate weeks cannot be bulk-selected. Changing filters removes hidden selections.

Backend: `cuddle_stay.payroll_payments` and `payroll_payment_items`, RLS, server-side fresh previews, immutable receipt/clock triggers and effective-rate history guards. Payment confirmation rejects stale reviews and duplicate clocks. Financial projection rebuilds use paid snapshots, including when an older client rebuilds them. The ordinary staff clock and dog-care flows are otherwise unchanged.

Validation: `test:payroll-history`, `test:payroll-history-browser` (localTest fictional records, production requests blocked), and `tools/payroll-history-rollback.sql` (transactional fictional fixtures, always rollback). Never record real raises or payment confirmations for a deployment test.
