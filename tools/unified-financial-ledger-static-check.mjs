import fs from "node:fs";

const settings = fs.readFileSync("js/settings.js", "utf8");
const shared = fs.readFileSync("js/shared.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const schema = fs.readFileSync("supabase-schema.sql", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260817002442_restrict_financial_transactions_to_admin.sql", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const failures = [];

const requireSource = (source, needle, message) => {
  if (!source.includes(needle)) failures.push(message);
};

requireSource(shared, 'financialTransaction: "cth-financialTransaction-records"', "Manual financial transactions do not have local persistence.");
requireSource(shared, '"financialTransaction", "customerDog"', "Manual financial transactions are not registered for remote persistence.");
requireSource(shared, 'financialsPage: ["boardingDog", "service", "timesheet", "showEvent", "financialTransaction"]', "Financials does not load every ledger source.");
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
requireSource(main, "unified-financial-ledger-v31", "Changed financial modules are not cache-busted.");
requireSource(index, "unified-financial-ledger-v31", "The application entrypoint and styles are not cache-busted.");
requireSource(settings, 'class="financial-category-cell"', "Financial transaction categories do not render in their own cell.");
requireSource(settings, 'class="financial-description-cell"', "Financial transaction descriptions do not render in their own cell.");
requireSource(settings, 'colspan="8"', "The empty transaction state does not span the separated columns.");
requireSource(main, "financial-category-description-columns-v53", "The financial column renderer is not cache-busted.");
requireSource(index, "financial-category-description-columns-v65", "The application entrypoint is not cache-busted for the financial columns.");
requireSource(index, "financial-transaction-columns-v61", "The financial column styles are not cache-busted.");

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Unified financial ledger checks passed.");
