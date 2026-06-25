// === MODULE: MAIN ===
import "./shared.js?v=20260625-staff-rls-fix";
import "./auth.js?v=20260625-staff-rls-fix";
import "./customer.js?v=20260611-service-dropoff-v1";
import "./boarding.js?v=20260625-staff-rls-fix";
import "./daily.js?v=20260623-efficiency-guardrails";
import "./task-scheduler.js?v=20260625-staff-rls-fix";
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
