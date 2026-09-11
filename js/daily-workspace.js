/* Presentation only. Existing task and care handlers own persistence and permissions. */
function setupDailyWorkspace() {
  const page = document.getElementById('dailyPage');
  if (!page || page.dataset.workspaceBound) return;
  page.dataset.workspaceBound = 'true';
  page.dataset.workspaceView = 'tasks';
  page.dataset.taskManaging = 'false';
  page.addEventListener('click', event => {
    const view = event.target.closest('[data-daily-view]');
    if (view) setDailyWorkspaceView(view.dataset.dailyView);
    if (event.target.closest('#dailyManageTasks')) {
      if (currentRole() !== 'admin') return;
      page.dataset.taskManaging = page.dataset.taskManaging === 'true' ? 'false' : 'true';
      renderDailyTaskLists();
    }
    if (event.target.closest('[data-daily-show-completed]')) {
      showRemainingTasksOnly = false;
      renderDailyTaskLists();
    }
  });
  page.querySelector('#dailyTaskSearch').addEventListener('input', applyDailyTaskSearch);
  page.querySelector('.daily-workspace-nav').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...page.querySelectorAll('[data-daily-view]')];
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setDailyWorkspaceView(tabs[next].dataset.dailyView);
    tabs[next].focus();
  });
}

function setDailyWorkspaceView(view = 'tasks') {
  const page = document.getElementById('dailyPage');
  if (!page || !['tasks', 'care', 'activity'].includes(view)) return;
  page.dataset.workspaceView = view;
  page.querySelectorAll('[data-daily-view]').forEach(button => {
    const active = button.dataset.dailyView === view;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  page.querySelectorAll('[data-daily-workspace-panel]').forEach(panel => {
    panel.hidden = panel.dataset.dailyWorkspacePanel !== view;
  });
  // Preserve the existing form nodes (including drafts and selected files).
  if (view === 'care') {
    // Refresh choices without resetting a partially entered exercise duration.
    const minutes = document.getElementById('careQuickMinutes').value;
    renderCareDogOptions();
    if (minutes) document.getElementById('careQuickMinutes').value = minutes;
    pendingStructuredCareLogs = structuredCareLogsForDate(currentDailyDate());
    renderStructuredCareLogs();
  }
  if (view === 'activity') renderDemoSubmissions();
}

function refreshDailyWorkspace(config, completionIndex) {
  const page = document.getElementById('dailyPage');
  if (!page) return;
  setupDailyWorkspace();
  const tabs = taskTabMeta(config);
  const selected = tabs.find(tab => tab.id === dailyTaskTab);
  let selectedTotal = 0, selectedDone = 0;
  tabs.forEach(tab => {
    const tasks = config[tab.id] || [];
    const done = tasks.filter(task => completionIndex.has(taskKey(tab.id, task.id))).length;
    const button = [...page.querySelectorAll('#dailyTaskTabs [data-task-tab]')].find(item => item.dataset.taskTab === tab.id);
    if (button) {
      let count = button.querySelector('.daily-group-count');
      if (!count) { count = document.createElement('span'); count.className = 'daily-group-count'; button.append(count); }
      count.textContent = tasks.length - done;
      button.setAttribute('aria-label', `${tab.label}, ${tasks.length - done} remaining`);
    }
    if (tab.id === dailyTaskTab) { selectedTotal = tasks.length; selectedDone = done; }
  });
  const progress = document.getElementById('dailyTaskProgress');
  progress.textContent = `${selected?.label || 'Tasks'} · ${selectedDone} of ${selectedTotal} completed`;
  const meter = document.getElementById('dailyTaskMeter');
  meter.max = Math.max(1, selectedTotal); meter.value = selectedDone;
  meter.setAttribute('aria-label', progress.textContent);
  document.getElementById('dailyWorkspaceDate').textContent = dailyCareLogDateLabel(currentDailyDate());
  const manage = document.getElementById('dailyManageTasks');
  manage.hidden = currentRole() !== 'admin';
  manage.setAttribute('aria-pressed', page.dataset.taskManaging);
  manage.textContent = page.dataset.taskManaging === 'true' ? 'Finish managing' : 'Manage tasks';
  const panel = [...page.querySelectorAll('[data-task-panel]')].find(item => item.dataset.taskPanel === dailyTaskTab);
  if (panel) {
    let empty = panel.querySelector('.daily-task-empty');
    if (!empty) {
      empty = document.createElement('div'); empty.className = 'daily-task-empty'; empty.setAttribute('role', 'status');
      panel.querySelector('.section-body').prepend(empty);
    }
    empty.textContent = selectedTotal === 0 ? 'No tasks in this group yet.' : selectedDone === selectedTotal && showRemainingTasksOnly ? 'All done in this group.' : 'No tasks match your search.';
    if (selectedTotal > 0 && selectedDone === selectedTotal && showRemainingTasksOnly) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary-button';
      button.dataset.dailyShowCompleted = ''; button.textContent = 'View completed tasks'; empty.append(button);
    }
  }
  page.querySelectorAll('.task-item').forEach(row => { row.draggable = currentRole() === 'admin' && page.dataset.taskManaging === 'true' && !row.classList.contains('is-complete'); });
  const strip = document.getElementById('dailyTaskTabs');
  const active = strip.querySelector('[aria-selected="true"]');
  if (active) {
    const bounds = strip.getBoundingClientRect(), item = active.getBoundingClientRect();
    if (item.left < bounds.left) strip.scrollLeft += item.left - bounds.left;
    else if (item.right > bounds.right) strip.scrollLeft += item.right - bounds.right;
  }
  applyDailyTaskSearch();
}

function applyDailyTaskSearch() {
  const page = document.getElementById('dailyPage');
  const query = (document.getElementById('dailyTaskSearch')?.value || '').trim().toLocaleLowerCase();
  const panel = [...page.querySelectorAll('[data-task-panel]')].find(item => item.dataset.taskPanel === dailyTaskTab);
  if (!panel) return;
  let visible = 0;
  panel.querySelectorAll('.task-item').forEach(row => {
    row.hidden = !String(row.querySelector('.task-text')?.textContent || '').toLocaleLowerCase().includes(query);
    if (!row.hidden) visible++;
  });
  const empty = panel.querySelector('.daily-task-empty');
  if (empty) empty.hidden = visible > 0;
}
