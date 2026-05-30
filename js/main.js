// === MODULE: MAIN ===
import "./shared.js?v=20260529-v2-module-review";
import "./auth.js?v=20260529-v2-module-review";
import "./customer.js?v=20260529-v2-module-review";
import "./boarding.js?v=20260529-v2-module-review";
import "./daily.js?v=20260529-v2-module-review";
import "./timesheet.js?v=20260529-v2-module-review";
import "./settings.js?v=20260529-v2-module-review";
import "./notifications.js?v=20260529-v2-module-review";
import "./search.js?v=20260529-v2-module-review";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
