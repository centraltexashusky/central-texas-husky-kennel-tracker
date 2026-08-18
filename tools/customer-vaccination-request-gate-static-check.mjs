import fs from "node:fs";

const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const customer = fs.readFileSync(new URL("../js/customer.js", import.meta.url), "utf8");
const boarding = fs.readFileSync(new URL("../js/boarding.js", import.meta.url), "utf8");
const shared = fs.readFileSync(new URL("../js/shared.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

const failures = [];
const requireSource = (source, token, message) => {
  if (!source.includes(token)) failures.push(message);
};

for (const field of ["dhppDate", "rabiesDate", "bordetellaDate", "nextDhppDate", "nextRabiesDate", "nextBordetellaDate"]) {
  const requiredPattern = new RegExp(`name="${field}"[^>]*\\brequired\\b`);
  if (!requiredPattern.test(index)) failures.push(`Customer vaccine field ${field} is not required.`);
  requireSource(shared, `"${field}"`, `Canonical dog profile does not carry ${field}.`);
}

requireSource(index, "Next DHPP vaccination due", "Customer/staff DHPP due field is missing.");
requireSource(index, "Next rabies vaccination due", "Customer/staff rabies due field is missing.");
requireSource(index, "Next Bordetella vaccination due", "Customer/staff Bordetella due field is missing.");
for (const vaccine of ["dhpp", "rabies", "bordetella"]) {
  requireSource(index, `data-customer-vaccine="${vaccine}"`, `Customer ${vaccine} date pair is not grouped in its own card.`);
}
requireSource(styles, ".customer-vaccine-cards", "Customer vaccine card layout styles are missing.");
requireSource(styles, ".customer-vaccine-date-pair", "Customer vaccine date-pair styles are missing.");
requireSource(index, "customer-vaccine-card-layout-v42", "Customer vaccine card stylesheet is not cache-busted.");
requireSource(customer, "function customerBoardingVaccinationIssues", "Customer request vaccine issue calculation is missing.");
requireSource(customer, "if (nextDate < requiredThrough)", "Customer request gate does not require vaccines through pickup.");
requireSource(customer, "function validateCustomerBookingVaccinations", "Customer request vaccine blocker is missing.");
requireSource(customer, "return validateCustomerBookingVaccinations(customerEstimateDetails())", "Pets-and-dates wizard does not block invalid vaccines.");
requireSource(customer, "if (!validateCustomerBookingVaccinations(estimate))", "Final request submission does not recheck vaccines.");
requireSource(customer, "data-action=\"open-customer-vaccine-update\"", "Blocked customers cannot open the vaccine update form.");
requireSource(shared, "open-customer-vaccine-update", "Vaccine update action is not handled.");
requireSource(boarding, "nextDhppDate: dog.nextDhppDate", "Customer DHPP due date is not copied into staff boarding data.");
requireSource(boarding, "nextRabiesDate: dog.nextRabiesDate", "Customer rabies due date is not copied into staff boarding data.");
requireSource(boarding, "nextBordetellaDate: dog.nextBordetellaDate", "Customer Bordetella due date is not copied into staff boarding data.");
requireSource(boarding, "DHPP due", "Staff care packet does not display vaccine due dates.");
requireSource(main, "customer-vaccine-self-service-v41", "Updated modules are not cache-busted.");
requireSource(index, "customer-vaccine-self-service-v41", "Application entrypoint is not cache-busted.");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("customer-vaccination-request-gate-static-check passed");
