// === MODULE: MAIN ===
// Keep the authenticated shell small. Page modules load only when their page is opened,
// then the remaining modules warm during idle time without delaying first paint.
import "./boarding-agreement.js?v=20260712-cuddle-stay-agreement-copy";
import "./shared.js?v=20260723-customer-file-view-v2-dashboard-simplify-operational-flow-dashboard-vaccine-queues-dashboard-timeline-restore-guarded-inline-status-profile-name-persistence-organization-setup-branding-legacy-agreement-profile-resolution-workspace-agreement-template-config-repeatable-items-agreement-text-source-boarding-profile-service-completion-undo-customer-agreement-records-dog-profile-registration-akc-breeds-dog-show-closing-alerts-v29-boarding-lifecycle-feedback-v33-dog-show-invoice-record-v37-dog-show-invoice-load-v41-boarding-family-alert-approval-v27-partial-batch-errors-v30-unified-financial-ledger-v31-boarding-stay-edit-feedback-v36-boarding-checkin-preflight-v38-boarding-requirement-override-v39-customer-vaccine-self-service-v41-cuddle-schema-isolated-v45-user-removal-v47-dashboard-daily-completion-v48-notification-delivery-retry-v49-shared-kennels-v52-boarding-progressive-load-v54-request-history-lazy-v55-profile-lookup-cache-v56-profile-history-v57-profile-request-isolation-v59-pdf-media-preview-v60-service-pricing-revision-v62-financial-loading-progress-v63-persisted-financial-ledger-v68-scalable-page-loading-v82-boarding-roster-counts-v87-dog-pricing-eligibility-v90-time-off-self-service-v91-canonical-boarding-save-v94";
import "./auth.js?v=20260721-dog-show-nav-user-profile-name-persistence-scalable-page-loading-v71";
import "./notifications.js?v=20260723-customer-file-view-v2-dashboard-vaccine-queues-signed-agreement-profile-email-boarding-request-notification-rls-v25-dog-show-closing-alerts-v29-maintenance-alert-detail-active-request-lock-v36-dog-show-invoice-v39-boarding-family-alert-approval-v27-action-delivery-health-v30-cuddle-schema-isolated-v45-boarding-alert-recovery-v46-notification-delivery-retry-v48-lazy-boarding-boundary-v51-time-off-self-service-v91";
import "./search.js?v=20260623-efficiency-guardrails";

const pageModuleLoaders = {
  customer: () => import("./customer.js?v=20260722-multi-operation-windows-signed-agreement-profile-email-legacy-agreement-integrity-workspace-agreement-template-config-repeatable-items-agreement-text-source-boarding-profile-optional-acknowledgements-customer-agreement-records-dog-profile-registration-akc-breeds-customer-request-history-detach-v23-boarding-request-notification-rls-v25-customer-request-amendment-v35-maintenance-alert-detail-active-request-lock-v36-dog-show-owner-updates-v37-boarding-request-alert-reliability-v26-atomic-family-submit-v30-customer-vaccine-self-service-v41-customer-canonical-profile-fallback-v42-shared-vaccination-v82-shared-owner-update-helper-v83-dog-pricing-eligibility-v90"),
  boarding: () => import("./boarding.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-board-queue-cleanup-service-price-clarity-agreement-text-source-boarding-profile-service-completion-undo-dog-profile-registration-akc-breeds-boarding-lifecycle-feedback-v33-boarding-detached-profile-v34-boarding-group-status-v28-boarding-transition-revision-v29-atomic-family-status-v30-boarding-stay-edit-feedback-v36-boarding-stay-revision-v37-boarding-checkin-preflight-v38-boarding-requirement-override-v39-boarding-override-confirmation-v40-customer-vaccine-self-service-v41-vaccination-document-approval-v43-cuddle-schema-v44-atomic-owner-update-v45-staff-new-boarding-default-v53-boarding-progressive-load-v54-request-history-lazy-v55-profile-lookup-cache-v56-profile-history-v57-calendar-pricing-consistency-v58-profile-request-isolation-v59-approval-persistence-identity-v61-service-pricing-revision-v62-scalable-roster-v70-boarding-roster-counts-v89-dog-pricing-eligibility-v90-canonical-boarding-save-v94"),
  daily: () => import("./daily.js?v=20260723-profile-ux-fixes-v2-operational-flow-dashboard-vaccine-queues-task-edit-modal-daily-report-groups-compact-daily-care-log-staff-date-v44-dashboard-daily-completion-v48-scalable-roster-v70"),
  taskScheduler: () => import("./task-scheduler.js?v=20260722-compact-week-grid-fit-operational-flow-scalable-page-loading-v70"),
  dogShow: () => import("./dog-show.js?v=20260729-dog-show-regular-oh-awards-show-planner-year-range-judge-scores-decisions-breed-entry-points-official-point-schedule-manual-group-points-negative-ready-buffer-akc-all-breed-calculator-show-expenses-special-outcomes-v2-show-level-expenses-edit-optional-dog-income-rewards-category-sync-grouped-ledgers-expense-split-planner-breed-potential-shows-event-flags-akc-judge-link-metadata-refresh-closing-superintendent-expense-info-planner-lifecycle-full-show-type-collapsed-stages-potential-toggle-show-calendar-desktop-direct-tools-complete-range-hover-akc-multisource-calendar-hover-cleanup-weekend-groups-direct-judge-search-added-show-conflicts-nationwide-format-filters-show-wide-expense-split-show-status-lifecycle-upcoming-show-management-lifecycle-point-schedules-compact-v6-compiled-finance-reports-v7-dog-attributable-costs-v8-customer-finance-reports-upcoming-status-ux-v9-net-dog-credits-v10-collapsible-ledgers-dog-reports-v11-finance-table-split-flow-v12-progress-search-judge-rename-row-edit-v13-judge-note-actions-akc-search-v14-consistent-delete-v15-point-schedules-collapsed-v16-planner-akc-only-breed-schedule-pagination-v17-state-multiselect-breed-case-v18-planner-card-controls-lazy-v19-breed-code-inline-error-v20-completed-history-v21-completed-result-groups-v22-closing-alerts-last-year-compact-v29-mobile-polish-finance-info-v30-akc-entry-details-v31-lifecycle-cleanup-v32-owner-update-win-photo-invoice-v37-dog-show-invoice-period-payment-v40-invoice-center-management-v42-danger-actions-v43-canonical-point-data-v30-scalable-page-loading-v70"),
  timesheet: () => import("./timesheet.js?v=20260829-staff-schedule-sunday-grid-v5-scalable-page-loading-v70-time-off-self-service-v91-time-off-upsert-fix-v92-schedule-publish-status-v93"),
  settings: () => import("./settings.js?v=20260722-multi-operation-windows-organization-setup-branding-signed-agreement-profile-email-legacy-agreement-profile-resolution-workspace-agreement-template-config-repeatable-items-agreement-text-source-boarding-profile-optional-acknowledgements-kennel-occupancy-v30-unified-financial-ledger-v31-cuddle-schema-v44-shared-kennels-v52-financial-category-description-columns-v53-persisted-financial-ledger-v69-scalable-page-loading-v70"),
};

const pageModuleDependencies = {
  dashboardPage: ["daily", "boarding"],
  dailyPage: ["daily"],
  taskSchedulerPage: ["taskScheduler"],
  dogShowPage: ["dogShow"],
  ourDogsPage: ["daily", "settings"],
  boardingDogsPage: ["boarding", "customer", "settings"],
  timesheetPage: ["timesheet"],
  servicesPage: ["settings"],
  financialsPage: ["settings", "timesheet", "dogShow", "boarding", "customer"],
  settingsSetupPage: ["settings"],
  settingsUsersPage: ["settings"],
  settingsKennelLocationsPage: ["settings"],
  settingsHoursPage: ["settings"],
  settingsAuditLogPage: ["settings"],
  customerPage: ["customer"],
  customerRequestsPage: ["customer"],
  customerUpdatesPage: ["customer"],
  customerFilesPage: ["customer"],
};

const loadedPageModules = new Set();
const pageModulePromises = new Map();

function loadNamedPageModule(name) {
  if (loadedPageModules.has(name)) return Promise.resolve();
  if (pageModulePromises.has(name)) return pageModulePromises.get(name);
  const loader = pageModuleLoaders[name];
  if (!loader) return Promise.resolve();
  const promise = loader().then(() => {
    loadedPageModules.add(name);
    pageModulePromises.delete(name);
    if (name === "taskScheduler" && typeof window.setupTaskSchedulerEventListeners === "function") {
      window.setupTaskSchedulerEventListeners();
    }
    if (name === "dogShow" && typeof window.setupDogShowEventListeners === "function") {
      window.setupDogShowEventListeners();
    }
    if (name === "boarding" && typeof renderNotifications === "function" && typeof helperIsLoggedIn === "function" && helperIsLoggedIn()) {
      renderNotifications();
    }
  }).catch((error) => {
    pageModulePromises.delete(name);
    throw error;
  });
  pageModulePromises.set(name, promise);
  return promise;
}

function modulesForPage(pageId) {
  const dependencies = [...(pageModuleDependencies[pageId] || [])];
  // Branding, service metadata, and shared table controls are shell-level settings utilities.
  dependencies.push("settings");
  if (pageId !== "loginPage" && document.getElementById(pageId)?.classList.contains("page-view")) {
    // Daily work and clock-in controls are shared across every authenticated staff view.
    dependencies.push("daily", "timesheet");
  }
  return [...new Set(dependencies)];
}

window.isAppPageModuleLoaded = (pageId) => modulesForPage(pageId)
  .every((name) => loadedPageModules.has(name));
window.loadAppPageModule = (pageId) => Promise.all(modulesForPage(pageId)
  .map((name) => loadNamedPageModule(name)));

function requestedStartupPage() {
  const hashPage = decodeURIComponent(String(location.hash || "").replace(/^#/, "")).split(/[?&]/)[0];
  return hashPage && document.getElementById(hashPage) ? hashPage : "dashboardPage";
}

function scheduleIdleModuleWarmup() {
  // Rich alert summaries share Boarding presentation helpers. Warm only that
  // dependency when the browser is idle; all other large page modules remain
  // strictly on demand so background parsing cannot interrupt active work.
  const warmAlerts = () => loadNamedPageModule("boarding")
    .catch((error) => console.warn("Background alert module warmup failed.", error));
  const schedule = () => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(warmAlerts, { timeout: 5000 });
    else window.setTimeout(warmAlerts, 500);
  };
  window.setTimeout(schedule, 2500);
}

window.loadAppPageModule(requestedStartupPage())
  .then(() => initializeApp())
  .then(() => scheduleIdleModuleWarmup())
  .catch((error) => {
    console.error("App startup failed after recovery attempt.", error);
    appInitialized = true;
    document.body.classList.remove("is-auth-booting");
    if (!helperIsLoggedIn()) clearLocalAppSession({ switchToLogin: false });
    ensureAppShellVisible("startup-fallback");
  });
