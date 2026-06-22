// === MODULE: MAIN ===
import "./shared.js?v=20260618-boarding-service-auto-tasks";
import "./auth.js?v=20260610-page-scoped-sync-v2";
import "./customer.js?v=20260611-service-dropoff-v1";
import "./boarding.js?v=20260622-bootcamp-training-tasks";
import "./daily.js?v=20260617-owned-bath-auto-tasks";
import "./task-scheduler.js?v=20260622-bootcamp-training-tasks";
import "./timesheet.js?v=20260615-staff-view-v1";
import "./settings.js?v=20260610-service-scope-review";
import "./notifications.js?v=20260622-service-approval-target";
import "./search.js?v=20260530-v3-fix-pass";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
