// === MODULE: MAIN ===
import "./shared.js?v=20260626-staff-login-rls-guard";
import "./auth.js?v=20260626-staff-session-rls-fix";
import "./customer.js?v=20260626-stay-scheduler-fix";
import "./boarding.js?v=20260626-stay-scheduler-fix";
import "./daily.js?v=20260623-efficiency-guardrails";
import "./task-scheduler.js?v=20260626-stay-scheduler-fix";
import "./timesheet.js?v=20260625-staff-rls-fix";
import "./settings.js?v=20260625-staff-rls-fix";
import "./notifications.js?v=20260625-staff-rls-fix";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
