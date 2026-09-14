import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const decode = path => vm.runInNewContext(fs.readFileSync(path,'utf8').match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
const daily=decode('js/daily.js'), shared=decode('js/shared.js');
const fn=(source,name)=>source.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}`))[0];
const c={document:{addEventListener(){}},matchMedia:()=>({addEventListener(){}}),
  escapeHtml:x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  todayDate:()=> '2026-09-14',dateOnly:x=>String(x||'').slice(0,10),arrayValue:x=>Array.isArray(x)?x:[],
  daysBetweenDates:(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/86400000),
  addDays:(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),
  nonNegativeNumberFrom:(v,f)=>v===undefined?f:Number(v),numberFrom:(v,f)=>Number(v||f),latestLogDate:logs=>logs.map(l=>l.date).sort().at(-1)||'',
  nextBathFromFrequency:()=>'',careDefaults:{exerciseFrequencyDays:3,trainingFrequencyDays:7,bathIntervalDays:30,heatCycleLengthDays:183,heatInHeatDays:21,heatExpectedSoonDays:30},
  ownedLoggedVaccinationConfig:[{field:'rabiesDate',label:'Rabies'},{field:'dhppDate',label:'DHPP'},{field:'bordetellaDate',label:'Bordetella'}],
  ownedHealthDueConfig:[{field:'nextRabiesDate'},{field:'nextDhppDate'},{field:'nextBordetellaDate'}],ownedDogCareFilter:'All'};
vm.createContext(c);
for(const [source,names] of [[shared,['normalizeOwnedDogCare']],[daily,['ownedDogHeatStatus']]])for(const n of names)vm.runInContext(fn(source,n),c);
vm.runInContext(fs.readFileSync('js/owned-workspace.js','utf8'),c);
const dog={sex:'Female',lastHeat:'2026-09-10',heatCycleStatus:'In heat',nextHeat:'2027-03-12',heatCycleNotes:'<script>bad</script>',
  rabiesDate:'2025-09-01',nextRabiesDate:'2026-09-01',dhppDate:'2025-10-01',nextDhppDate:'2026-10-01',
  exerciseRoutine:'Yard run',exerciseNotes:'Check paws',lastExerciseDate:'2026-09-10',exerciseLogs:[{type:'Scooter',date:'2026-09-01',note:'Older'},{type:'Treadmill',date:'2026-09-10',minutes:15,note:'Calm pace',completedBy:'Staff'}],
  trainingRoutine:'Recall',trainingGoals:'Stay focused',trainingSessionNotes:'Short sessions',lastTrainingDate:'2026-09-01',trainingLogs:[{type:'Training',date:'2026-09-01',note:'Recall improving'}]};
const before=JSON.stringify(dog);
c.ownedDogCareFilter='Vaccine';
let html=c.ownedWorkspaceCareFocus(dog);
for(const text of ['Rabies','Overdue by 13 days','DHPP','Due in 17 days','Bordetella','Administration date missing','Last given:'])assert(html.includes(text),text);
assert(c.ownedWorkspaceCareFocus({...dog,nextDhppDate:''}).includes('Renewal date needs review'));
assert(c.ownedWorkspaceCareFocus({...dog,nextDhppDate:'2027-01-01'}).includes('Current'));
assert(c.ownedWorkspaceCareFocus({...dog,dhppDate:'2026-11-27',nextDhppDate:'2027-11-27'}).includes('Given date is in the future'));
assert(c.ownedWorkspaceCareFocus({...dog,dhppDate:'2026-08-01',nextDhppDate:'2026-07-01'}).includes('Renewal is before given date'));
c.ownedDogCareFilter='Heat Watch';html=c.ownedWorkspaceCareFocus(dog);
assert(html.includes('4 days since start (day 5)'));assert(html.includes('Recorded as in heat'));assert(!html.includes('<script>'));
assert(c.ownedWorkspaceCareFocus({sex:'Female'}).includes('Start date needed'));
assert(c.ownedWorkspaceCareFocus({...dog,heatCycleStatus:''}).includes('confirm current status'));
c.ownedDogCareFilter='Exercise Due';html=c.ownedWorkspaceCareFocus(dog);
for(const text of ['Yard run','Treadmill','15 minutes','Calm pace','Check paws'])assert(html.includes(text),text);
assert(!html.includes('Older'));assert(!html.includes('Recall improving'));
c.ownedDogCareFilter='Training Due';html=c.ownedWorkspaceCareFocus(dog);
for(const text of ['Recall','Stay focused','Recall improving','Short sessions'])assert(html.includes(text),text);
assert(c.ownedWorkspaceCareFocus({}).includes('No completed session recorded'));
assert.equal(c.ownedWorkspaceColumns([])[1].key,'careFocus');
c.ownedDogCareFilter='All';assert.equal(c.ownedWorkspaceCareFocus(dog),'');
assert.equal(JSON.stringify(dog),before,'Care views never mutate saved profiles/history');
assert(daily.includes('OWNED_DOG_RENDER_PAGE_SIZE = 5'));
assert(daily.includes('Show 5 more'));
assert(daily.includes('ownedDogMatchesCareFilter(dog, "Heat Watch")'));
console.log('Owned care views passed: vaccine dates, heat timing/uncertainty, recent logs, saved plans, missing data, escaping, matching counts, five-dog batches.');
