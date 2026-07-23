// === MODULE: MAIN ===
import "./boarding-agreement.js?v=20260712-cuddle-stay-agreement-copy";
import "./shared.js?v=20260723-profile-ux-fixes-v2";
import "./auth.js?v=20260721-dog-show-nav-user-profile";
import "./customer.js?v=20260722-multi-operation-windows";
import "./boarding.js?v=20260723-profile-ux-fixes-v2";
import "./daily.js?v=20260723-profile-ux-fixes-v2";
import "./task-scheduler.js?v=20260722-compact-week-grid-fit";
import "./dog-show.js?v=20260720-dog-show-progress";
import "./timesheet.js?v=20260709-staff-payroll-financials";
import "./settings.js?v=20260722-multi-operation-windows";
import "./notifications.js?v=20260723-customer-file-view";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
