import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const workspace = fs.readFileSync('js/daily-workspace.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('daily-workspace.css', 'utf8');
const daily = fs.readFileSync('js/daily.js', 'utf8');
const shared = fs.readFileSync('js/shared.js', 'utf8');
const legacy = fs.readFileSync('script.js', 'utf8');
new vm.Script(workspace);
for (const panel of ['tasks', 'care', 'activity']) {
  assert(index.includes(`data-daily-workspace-panel="${panel}"`), `Missing workspace panel ${panel}`);
  assert(index.includes(`data-daily-view="${panel}"`), `Missing workspace control ${panel}`);
}
assert(index.includes('daily-workspace.css?v=daily-workspace-v115'));
assert(index.includes('js/daily-workspace.js?v=daily-workspace-v115'));
assert(workspace.includes('tasks.filter(task => completionIndex.has(taskKey(tab.id, task.id)))'), 'Counts must use current configured task IDs, not stale/deleted completions');
assert(workspace.includes("currentRole() !== 'admin'"), 'Manage action must enforce role');
assert(workspace.includes("minutes) document.getElementById('careQuickMinutes').value = minutes"), 'Workspace navigation must retain exercise duration');
assert(workspace.includes("button.tabIndex = active ? 0 : -1"));
assert(workspace.includes("['ArrowLeft', 'ArrowRight', 'Home', 'End']"));
assert(!/\b(fetch|sendPayload|upsertRecord)\(/.test(workspace), 'Presentation must not introduce a second persistence path');
for (const source of [daily, legacy]) {
  assert(source.includes('list.innerHTML = panel.hidden ? "" : (config[dailyTaskTab] || [])'), 'Only selected group rows should be created');
  assert(source.includes('setupDailyWorkspace();'));
  assert(source.includes('if (activePageId() === "ourDogsPage") renderOwnedDogs();'), 'Care save must not render the hidden resident roster');
  assert(source.includes('refreshDailyWorkspace(config, completionIndex)'));
  assert(source.includes('dataset.workspaceView === "care"'), 'Care option/history rendering must be on demand');
}
for (const source of [shared, legacy]) {
  assert(source.includes('customTaskPanelHtml(tab, []'), 'Custom inactive task rows must stay deferred');
  assert(source.includes('if (document.getElementById("dailyActivityPanel")?.hidden) return;'), 'Activity feed must not render while closed');
  assert(source.includes('if (toolbar) { if (row.parentElement !== toolbar)'), 'Filter must stay in queue toolbar');
}
assert(css.includes('body #dailyPage:not([data-task-managing="true"]) .admin-task-controls { display: none !important; }'));
assert(css.includes('#dailyPage [hidden] { display: none !important; }'));
assert(css.includes('@media(max-width:760px)'));
console.log('Daily workspace checks passed: scoped views, configured counts, lazy group rows, drafts, admin controls, accessibility and unchanged persistence.');
