// === MODULE: MAIN ===
import "./boarding-agreement.js?v=20260712-cuddle-stay-agreement-copy";
import "./shared.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues-dashboard-timeline-restore-guarded-inline-status-profile-name-persistence-organization-setup-branding-legacy-agreement-profile-resolution-workspace-agreement-template-config-repeatable-items-agreement-text-source-boarding-profile-service-completion-undo-customer-agreement-records-dog-profile-registration-akc-breeds";
import "./auth.js?v=20260721-dog-show-nav-user-profile-name-persistence";
import "./customer.js?v=20260722-multi-operation-windows-signed-agreement-profile-email-legacy-agreement-integrity-workspace-agreement-template-config-repeatable-items-agreement-text-source-boarding-profile-optional-acknowledgements-customer-agreement-records-dog-profile-registration-akc-breeds-customer-request-history-detach-v23";
import "./boarding.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-board-queue-cleanup-service-price-clarity-agreement-text-source-boarding-profile-service-completion-undo-dog-profile-registration-akc-breeds";
import "./daily.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-task-edit-modal-daily-report-groups-compact";
import "./task-scheduler.js?v=20260722-compact-week-grid-fit-operational-flow";
import "./dog-show.js?v=20260729-dog-show-regular-oh-awards-show-planner-year-range-judge-scores-decisions-breed-entry-points-official-point-schedule-manual-group-points-negative-ready-buffer-akc-all-breed-calculator-show-expenses-special-outcomes-v2-show-level-expenses-edit-optional-dog-income-rewards-category-sync-grouped-ledgers-expense-split-planner-breed-potential-shows-event-flags-akc-judge-link-metadata-refresh-closing-superintendent-expense-info-planner-lifecycle-full-show-type-collapsed-stages-potential-toggle-show-calendar-desktop-direct-tools-complete-range-hover-akc-multisource-calendar-hover-cleanup-weekend-groups-direct-judge-search-added-show-conflicts-nationwide-format-filters-show-wide-expense-split-show-status-lifecycle-upcoming-show-management-lifecycle-point-schedules-compact-v6-compiled-finance-reports-v7-dog-attributable-costs-v8-customer-finance-reports-upcoming-status-ux-v9-net-dog-credits-v10-collapsible-ledgers-dog-reports-v11-finance-table-split-flow-v12-progress-search-judge-rename-row-edit-v13-judge-note-actions-akc-search-v14-consistent-delete-v15-point-schedules-collapsed-v16-planner-akc-only-breed-schedule-pagination-v17-state-multiselect-breed-case-v18-planner-card-controls-lazy-v19-breed-code-inline-error-v20-completed-history-v21-completed-result-groups-v22";
import "./timesheet.js?v=20260709-staff-payroll-financials";
import "./settings.js?v=20260722-multi-operation-windows-organization-setup-branding-signed-agreement-profile-email-legacy-agreement-profile-resolution-workspace-agreement-template-config-repeatable-items-agreement-text-source-boarding-profile-optional-acknowledgements";
import "./notifications.js?v=20260723-customer-file-view-v2-dashboard-vaccine-queues-signed-agreement-profile-email";
import "./search.js?v=20260623-efficiency-guardrails";

initializeApp().catch((error) => {
  console.error("App startup failed after recovery attempt.", error);
  appInitialized = true;
  document.body.classList.remove("is-auth-booting");
  if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
  ensureAppShellVisible("startup-fallback");
});
