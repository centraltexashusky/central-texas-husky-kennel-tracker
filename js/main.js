// === MODULE: MAIN ===
import "./shared.js?v=20260628-our-dogs-filter-info-boarding-rows-mobile-medical-behavior-note";
import "./auth.js?v=20260628-impersonation-session-key-fix";
import "./customer.js?v=20260626-stay-scheduler-fix";
import "./boarding.js?v=20260628-our-dogs-filter-info-boarding-rows-mobile-medical-behavior-note";
import "./daily.js?v=20260628-our-dogs-filter-info-boarding-rows-special-care-weekly-health";
import "./task-scheduler.js?v=20260627-legacy-bath-scheduler-completion";
import "./timesheet.js?v=20260625-staff-rls-fix";
import "./settings.js?v=20260625-staff-rls-fix";
import "./notifications.js?v=20260628-our-dogs-filter-info-boarding-rows-weekly-medical-summary";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
