import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(path, 'utf8');
const module = read('js/timesheet.js');
const source = vm.runInNewContext(module.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
const context = vm.createContext({});
vm.runInContext(source, context);
vm.runInContext(`
var role = 'admin';
currentRole = () => role;
timesheetStaffFilterValue = '';
timesheetRecordDate = r => r.date;
timesheetRecordTime = r => Date.parse(r.clockInTime);
timesheetBelongsToCurrentUser = r => r.helperEmail === 'a@example.invalid';
var records = [
 {id:'a',date:'2026-09-11',helperEmail:'a@example.invalid',clockInTime:'2026-09-11T09:00:00'},
 {id:'b',date:'2026-09-11',helperEmail:'b@example.invalid',clockInTime:'2026-09-11T09:00:00'},
 {id:'removed',removed:true,date:'2026-09-11',helperEmail:'a@example.invalid'},
 {id:'old',date:'2025-01-01',helperEmail:'a@example.invalid'}
];
readRecords = () => records;
var range = {start:'2026-09-07',end:'2026-09-13'};
`, context);
assert.equal(vm.runInContext('timesheetRecordsForRange(range).length',context),2);
assert.equal(vm.runInContext("timesheetStaffFilterValue='b@example.invalid';timesheetRecordsForRange(range)[0].id",context),'b');
assert.equal(vm.runInContext("role='staff';timesheetRecordsForRange(range)[0].id",context),'a','A stale admin filter cannot expose another staff member.');
assert.match(source,/if \(timesheetTab === "schedule"\) renderScheduleTab\(\)/);
assert.match(source,/if \(timesheetTab === "timeOff"\) renderTimeOffTab\(\)/);
assert.match(source,/if \(el.closest\?\.\("details"\) && !el.closest\("details"\).open\) return/);
const html=read('index.html');
assert.equal((html.match(/id="clockInButton"/g)||[]).length,1);
assert(html.indexOf('id="clockInButton"')>html.indexOf('id="timesheetClockPanel"'));
for(const tab of ['clock','schedule','timeOff','holidays','review','payroll'])assert(html.includes(`data-timesheet-panel="${tab}"`));
const css=read('timesheet-workspace.css');
assert.match(css,/#timesheetPage \[hidden\] \{ display: none!important/);
assert.match(css,/flex-direction:row!important/);
assert.match(css,/#timesheetPage #timesheetClockPanel \.table-wrap \{ display:block!important/);
const dashboardRules=[...css.matchAll(/#dashboardPage[^{}]*\{([^{}]*)\}/g)].map(m=>m[1]).join('');
assert(!/\b(display|order|grid-template|width|height|padding|margin)\s*:/.test(dashboardRules),'Dashboard restyle must not change layout.');
const adapter=read('js/timesheet-workspace.js');
assert(!/\b(sendPayload|saveAndNotify|upsertRecord|writeRecords)\s*\(/.test(adapter),'Presentation adapter cannot write operational records.');
console.log('Timesheet workspace checks passed: selected-tab rendering, staff-filter privacy, lazy date picker, responsive visibility, unchanged Dashboard layout and presentation-only adapter.');
