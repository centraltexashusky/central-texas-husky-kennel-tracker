import fs from "node:fs";

const settings = fs.readFileSync("js/settings.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const schema = fs.readFileSync("supabase-schema.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260817002442_restrict_financial_transactions_to_admin.sql", "utf8");
const persistedMigration = fs.readFileSync("supabase/migrations/20260830195517_add_persisted_financial_ledger.sql", "utf8");
const refinedDirtyTriggerMigration = fs.readFileSync("supabase/migrations/20260830232800_refine_financial_ledger_dirty_trigger.sql", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const styles = fs.readFileSync("styles.css", "utf8");
const failures = [];

const requireSource = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};

requireSource(shared, 'financialTransaction: "cth-financialTransaction-records"', "Manual financial transactions do not have local persistence.");
requireSource(shared, '"financialTransaction", "customerDog"', "Manual financial transactions are not registered for remote persistence.");
requireSource(shared, 'financialsPage: { critical: ["showEvent", "financialTransaction"], deferred: [] }', "Financials still downloads all operational histories during normal navigation.");
requireSource(settings, 'FINANCIAL_LEDGER_SOURCE_TYPES = ["boardingDog", "service", "timesheet", "settingsUser", "showEvent", "financialTransaction"]', "Financial reconciliation does not cover every ledger source.");
requireSource(settings, 'from("financial_ledger_entries")', "Financials does not read the persisted ledger table.");
requireSource(settings, 'db.rpc("replace_financial_ledger_entries"', "Financial reconciliation does not write the persisted ledger atomically.");
requireSource(settings, 'for (let attempt = 0; attempt < 2; attempt += 1)', "Financial reconciliation does not retry when a source changes during its snapshot.");
requireSource(settings, 'FINANCIAL_TRANSACTION_PAGE_SIZE = 50', "Financial transactions are not paginated to protect browser rendering.");
requireSource(settings, 'function financialDogShowEntries()', "Dog Show transactions are not merged into the main ledger.");
requireSource(settings, 'function financialOperationalLedgerEntries(boardingEntries = [], payrollEntries = [])', "Boarding and payroll are not normalized into ledger entries.");
requireSource(settings, 'function saveFinancialTransaction(form)', "Manual income and expense entry is not implemented.");
requireSource(settings, 'const sourceType = data.sourceType || (data.showEventId ? "showEvent" : "financialTransaction")', "Related Dog Show transactions do not preserve their source of truth.");
requireSource(settings, 'await sendPayload(record);', "Manual financial transactions are not saved remotely.");
requireSource(index, 'data-financial-view="transactions"', "The unified transactions view is missing.");
requireSource(index, '<th>Category</th><th>Description</th>', "Financial transaction category and description are not separate columns.");
requireSource(index, 'id="newFinancialTransactionButton"', "The financial entry action is missing.");
requireSource(index, 'name="entryType"', "The transaction form cannot distinguish income from expense.");
requireSource(schema, "when record_type = 'financialTransaction' then false", "The canonical RLS schema does not keep financial entries admin-only.");
requireSource(migration, "when record_type = 'financialTransaction' then false", "The financial privacy migration does not restrict non-admin staff.");
requireSource(persistedMigration, "create table if not exists cuddle_stay.financial_ledger_entries", "The persisted financial ledger table migration is missing.");
requireSource(persistedMigration, 'create policy "Financial ledger admin read"', "The persisted financial ledger is not protected by admin-only RLS.");
requireSource(persistedMigration, "kennel_records_mark_financial_ledger_dirty", "Financial source writes do not mark the saved ledger for reconciliation.");
requireSource(persistedMigration, "financial_ledger_state_preserve_newer_dirty", "A newer financial source change can be cleared by an older reconciliation.");
requireSource(persistedMigration, "financial_ledger_entries_org_date_idx", "The persisted financial ledger does not have an organization/date index.");
requireSource(refinedDirtyTriggerMigration, "old.payload ->> 'hourlyRate'", "Routine user-profile writes still invalidate the financial ledger.");
requireSource(refinedDirtyTriggerMigration, "old.payload ->> 'removed'", "User removal does not invalidate payroll projection rows.");
requireSource(main, "unified-financial-ledger-v31", "Changed financial modules are not cache-busted.");
requireSource(index, "unified-financial-ledger-v31", "The application entrypoint and styles are not cache-busted.");
requireSource(settings, 'class="financial-category-cell"', "Financial transaction categories do not render in their own cell.");
requireSource(settings, 'class="financial-description-cell"', "Financial transaction descriptions do not render in their own cell.");
requireSource(settings, 'colspan="8"', "The empty transaction state does not span the separated columns.");
requireSource(main, "financial-category-description-columns-v53", "The financial column renderer is not cache-busted.");
requireSource(index, "financial-category-description-columns-v65", "The application entrypoint is not cache-busted for the financial columns.");
requireSource(index, "financial-transaction-columns-v61", "The financial column styles are not cache-busted.");
requireSource(shared, '["ourDogsPage", "boardingDogsPage", "financialsPage"]', "Financials is not connected to the remote-load progress bar.");
requireSource(shared, 'loading: "Loading financial records"', "The Financials progress bar does not explain that financial records are loading.");
requireSource(shared, 'rendering: "Updating financial views"', "The Financials progress bar does not cover the rendered-view phase.");
requireSource(styles, "minmax(210px, 1fr)", "Financial summary cards are still allowed to collapse below their safe content width.");
requireSource(styles, ".financial-summary-card p", "Financial summary descriptions do not have containment rules.");
requireSource(main, "financial-loading-progress-v63", "The Financials loading progress code is not cache-busted.");
requireSource(index, "financial-loading-progress-v67", "The Financials loading progress entrypoint is not cache-busted.");
requireSource(index, "financial-summary-containment-v66", "The Financial summary card styles are not cache-busted.");
requireSource(index, 'id="financialLedgerStatus"', "Financials does not expose saved-ledger loading and reconciliation status.");
requireSource(index, 'id="financialTransactionPrevButton"', "Financial transaction pagination controls are missing.");
requireSource(main, "persisted-financial-ledger-v68", "Persisted financial modules are not cache-busted.");
requireSource(index, "persisted-financial-ledger-v68", "Persisted financial entrypoint and styles are not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Unified financial ledger checks passed.");
