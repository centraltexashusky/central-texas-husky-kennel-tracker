// === MODULE: MAIN ===
import "./shared.js?v=20260609-owner-update-submit-guard-v2";
import "./auth.js?v=20260609-photo-hydration";
import "./customer.js?v=20260608-efficiency-sync";
import "./boarding.js?v=20260609-owner-update-submit-guard-v2";
import "./daily.js?v=20260607-owned-health-due-history";
import "./timesheet.js?v=20260608-efficiency-sync";
import "./settings.js?v=20260604-pricing-groups-private-media";
import "./notifications.js?v=20260609-owner-update-submit-guard";
import "./search.js?v=20260530-v3-fix-pass";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
