// === MODULE: MAIN ===
import "./boarding-agreement.js?v=20260712-cuddle-stay-agreement-copy";
import "./shared.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues-dashboard-timeline-restore";
import "./auth.js?v=20260721-dog-show-nav-user-profile";
import "./customer.js?v=20260722-multi-operation-windows";
import "./boarding.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-board-queue-cleanup";
import "./daily.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-task-edit-modal";
import "./task-scheduler.js?v=20260722-compact-week-grid-fit-operational-flow";
import "./dog-show.js?v=20260723-dog-show-timeline-groups-ring-footer";
import "./timesheet.js?v=20260709-staff-payroll-financials";
import "./settings.js?v=20260722-multi-operation-windows";
import "./notifications.js?v=20260723-customer-file-view-v2-dashboard-vaccine-queues";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
