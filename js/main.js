// === MODULE: MAIN ===
import "./shared.js?v=20260624-belongings-checkout-review";
import "./auth.js?v=20260622-storage-quota-fallback";
import "./customer.js?v=20260611-service-dropoff-v1";
import "./boarding.js?v=20260624-belongings-checkout-review";
import "./daily.js?v=20260623-efficiency-guardrails";
import "./task-scheduler.js?v=20260623-efficiency-guardrails";
import "./timesheet.js?v=20260615-staff-view-v1";
import "./settings.js?v=20260623-efficiency-guardrails";
import "./notifications.js?v=20260622-service-approval-target";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
