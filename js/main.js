// === MODULE: MAIN ===
import "./shared.js?v=20260530-v3-fix-pass";
import "./auth.js?v=20260530-v3-fix-pass";
import "./customer.js?v=20260530-v3-fix-pass";
import "./boarding.js?v=20260530-v3-fix-pass";
import "./daily.js?v=20260530-v3-fix-pass";
import "./timesheet.js?v=20260530-v3-fix-pass";
import "./settings.js?v=20260530-v3-fix-pass";
import "./notifications.js?v=20260530-v3-fix-pass";
import "./search.js?v=20260530-v3-fix-pass";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
