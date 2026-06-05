// === MODULE: MAIN ===
import "./shared.js?v=20260605-calendar-status-off";
import "./auth.js?v=20260530-impersonation-guard";
import "./customer.js?v=20260605-customer-cancel-alert";
import "./boarding.js?v=20260605-calendar-status-off";
import "./daily.js?v=20260603-linked-addons-alerts";
import "./timesheet.js?v=20260604-open-timesheet";
import "./settings.js?v=20260604-pricing-groups-private-media";
import "./notifications.js?v=20260605-customer-cancel-alert";
import "./search.js?v=20260530-v3-fix-pass";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
