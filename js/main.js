// === MODULE: MAIN ===
import "./boarding-agreement.js?v=20260712-cuddle-stay-agreement-copy";
import "./shared.js?v=20260711-hidden-profile-photo-hydration";
import "./auth.js?v=20260709-staff-payroll-financials";
import "./customer.js?v=20260712-agreement-copy-and-checks";
import "./boarding.js?v=20260713-financial-family-stay-window";
import "./daily.js?v=20260709-owned-delete-admin-only";
import "./task-scheduler.js?v=20260628-our-dogs-filter-info-boarding-rows-task-scheduler-visibility-dedupe";
import "./dog-show.js?v=20260714-dog-show-mobile-dialog";
import "./timesheet.js?v=20260709-staff-payroll-financials";
import "./settings.js?v=20260713-financial-pickup-reporting-date";
import "./notifications.js?v=20260703-sync-next-pass";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
