// === MODULE: MAIN ===
import "./shared.js?v=20260612-early-checkin-rate-v3";
import "./auth.js?v=20260610-page-scoped-sync-v2";
import "./customer.js?v=20260611-service-dropoff-v1";
import "./boarding.js?v=20260612-early-checkin-rate-v18";
import "./daily.js?v=20260607-owned-health-due-history";
import "./timesheet.js?v=20260611-service-dropoff-v1";
import "./settings.js?v=20260610-service-scope-review";
import "./notifications.js?v=20260611-service-notifications-v1";
import "./search.js?v=20260530-v3-fix-pass";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
