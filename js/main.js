// === MODULE: MAIN ===
import "./boarding-agreement.js?v=20260710-cuddle-stay-agreement";
import "./shared.js?v=20260711-private-dog-photo-paths";
import "./auth.js?v=20260709-staff-payroll-financials";
import "./customer.js?v=20260711-private-dog-photo-paths";
import "./boarding.js?v=20260711-private-dog-photo-paths";
import "./daily.js?v=20260709-owned-delete-admin-only";
import "./task-scheduler.js?v=20260628-our-dogs-filter-info-boarding-rows-task-scheduler-visibility-dedupe";
import "./timesheet.js?v=20260709-staff-payroll-financials";
import "./settings.js?v=20260710-boarding-agreement-signature";
import "./notifications.js?v=20260703-sync-next-pass";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
