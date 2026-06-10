// === MODULE: MAIN ===
import "./shared.js?v=20260609-profile-photo-cache-v3";
import "./auth.js?v=20260609-photo-hydration";
import "./customer.js?v=20260610-service-scope-review";
import "./boarding.js?v=20260610-service-scope-review";
import "./daily.js?v=20260607-owned-health-due-history";
import "./timesheet.js?v=20260608-efficiency-sync";
import "./settings.js?v=20260610-service-scope-review";
import "./notifications.js?v=20260609-boarding-request-alert";
import "./search.js?v=20260530-v3-fix-pass";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
