// === MODULE: MAIN ===
import "./boarding-agreement.js?v=20260712-cuddle-stay-agreement-copy";
import "./shared.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues-dashboard-timeline-restore-guarded-inline-status";
import "./auth.js?v=20260721-dog-show-nav-user-profile";
import "./customer.js?v=20260722-multi-operation-windows";
import "./boarding.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-board-queue-cleanup-service-price-clarity";
import "./daily.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-task-edit-modal-daily-report-groups-compact";
import "./task-scheduler.js?v=20260722-compact-week-grid-fit-operational-flow";
import "./dog-show.js?v=20260728-dog-show-regular-oh-awards-show-planner-year-range-judge-scores-decisions-breed-entry-points-official-point-schedule-manual-group-points-negative-ready-buffer-akc-all-breed-calculator-show-expenses-special-outcomes-v2-show-level-expenses-edit-optional-dog-income-rewards-category-sync-grouped-ledgers-expense-split-planner-breed-potential-shows-event-flags-akc-judge-link-metadata-refresh-closing-superintendent-expense-info-planner-lifecycle-full-show-type-collapsed-stages-potential-toggle-show-calendar";
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
