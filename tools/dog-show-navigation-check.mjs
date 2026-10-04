import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('js/dog-show.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const storage = new Map([['event', 'first']]);
const historyEntries = [{ state: { snuggleStay: true, pageId: 'dogShowPage' } }];
let renders = 0;
const events = [{ id: 'first' }, { id: 'second' }, { id: 'future' }];
const context = {
  dogShowView: 'home', dogShowProgressTab: 'overview', dogShowOverviewDay: 'old-date',
  DOG_SHOW_EVENT_KEY: 'event', DOG_SHOW_VIEW_KEY: 'view', DOG_SHOW_PROGRESS_TAB_KEY: 'progress',
  dogShowSelectedTaskIds: new Set(['previous-event-task']),
  dogShowOperationalEvents: () => events,
  renderDogShow: () => renders++,
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  window: { location: { hash: '#dogShowPage', href: 'http://localhost/#dogShowPage' }, scrollTo() {}, history: {
    get state() { return historyEntries.at(-1).state; },
    replaceState(state) { historyEntries.at(-1).state = state; },
    pushState(state) { historyEntries.push({ state }); },
  } },
};
vm.createContext(context);
for (const name of ['dogShowNavigationSnapshot', 'recordDogShowNavigation', 'selectDogShowEvent', 'setDogShowView', 'dogShowResultsNavHtml']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], context);
}
context.selectDogShowEvent('second');
assert.equal(storage.get('event'), 'second');
assert.equal(historyEntries[0].state.dogShowNavigation.eventId, 'first', 'History retains the previous individual show');
assert.equal(historyEntries[1].state.dogShowNavigation.eventId, 'second');
assert.equal(context.dogShowSelectedTaskIds.size, 0, 'Batch tasks must not leak into another show');
assert.equal(context.dogShowOverviewDay, '', 'Overview date is reset when choosing another show');
context.setDogShowView('tasks');
assert.equal(storage.get('event'), 'second', 'Changing destination preserves the individual show');
context.selectDogShowEvent('future');
assert.equal(context.dogShowView, 'tasks', 'Future selection preserves the current destination');
assert.equal(storage.get('event'), 'future');
const count = historyEntries.length;
context.selectDogShowEvent('future');
assert.equal(historyEntries.length, count, 'Repeated selection creates no redundant history entry');
context.selectDogShowEvent('completed-or-removed');
assert.equal(storage.get('event'), 'future', 'Invalid or closed events cannot enter selection');
context.setDogShowView('progress', 'judges');
assert.equal(historyEntries.at(-2).state.dogShowNavigation.progressTab, 'overview', 'Progress destination is captured before sub-tab changes');
assert.equal(historyEntries.at(-1).state.dogShowNavigation.progressTab, 'judges');
assert.match(context.dogShowResultsNavHtml(), /data-results-tab="judges" aria-current="page"/);
context.window.location.hash = '#dashboardPage';
context.setDogShowView('dogs');
assert.equal(historyEntries.length, count + 1, 'Other app pages receive no dog-show history entries');
assert(historyEntries.every(entry => entry.state.snuggleStay && entry.state.pageId === 'dogShowPage'), 'App history identity remains intact');
const nav = html.match(/id="dogShowDesktopNav"[\s\S]*?<\/nav>/)[0];
const labels = [...nav.matchAll(/data-dog-show-view="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(labels.slice(0, 9), ['home', 'planner', 'calendar', 'registration', 'dogs', 'schedule', 'tasks', 'results', 'expenses']);
assert.match(html, /aria-label="Selected individual dog show"/);
assert.match(html, /<h3>Plan shows<\/h3>[\s\S]*<h3>Results & billing<\/h3>[\s\S]*<h3>Show tools<\/h3>/);
assert(renders > 0);
console.log('Approved navigation passed: individual selection, preserved destinations, event-scoped task reset, progress history, duplicate/invalid selection, app-history identity and menu grouping.');
