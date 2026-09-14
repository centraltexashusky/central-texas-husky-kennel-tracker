import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const c={document:{addEventListener(){}},addDays:(d,n)=>new Date(Date.parse(d)+n*86400000).toISOString().slice(0,10),dateOnly:d=>String(d||'').slice(0,10),taskTabMeta:cfg=>Object.keys(cfg._tabSettings).map(id=>({id})),completedTasksForDate:()=>[],readRecords:()=>[],completedTasksForRecord:r=>r.completedTasks||[]};
vm.createContext(c);vm.runInContext(fs.readFileSync('js/task-cycles.js','utf8'),c);
const cfg=(frequency,start,days=1)=>({_tabSettings:{a:{cycle:{frequency,start,days}}}});
for(const [config,date,start,next,active] of [
 [cfg('daily','2026-09-01'),'2026-09-14','2026-09-14','2026-09-15',true],
 [cfg('daily','2026-09-20'),'2026-09-14','2026-09-20','2026-09-20',false],
 [cfg('weekly','2026-09-07'),'2026-09-13','2026-09-07','2026-09-14',true],
 [cfg('weekly','2026-09-07'),'2026-09-14','2026-09-14','2026-09-21',true],
 [cfg('monthly','2026-01-31'),'2026-02-28','2026-02-28','2026-03-31',true],
 [cfg('monthly','2028-01-31'),'2028-02-29','2028-02-29','2028-03-31',true],
 [cfg('monthly','2026-01-31'),'2026-03-30','2026-02-28','2026-03-31',true],
 [cfg('days','2026-09-01',10),'2026-09-10','2026-09-01','2026-09-11',true],
 [cfg('days','2026-09-01',10),'2026-09-11','2026-09-11','2026-09-21',true]
]) { const w=c.taskCycleWindow('a',date,config);assert.equal(w.start,start);assert.equal(w.next,next);assert.equal(w.active,active); }
assert(!c.isTaskCycleDate('2026-02-30'));assert(c.isTaskCycleDate('2028-02-29'));
const events=[{shift:'a',taskId:'t',date:'2026-09-08',completedAt:'2026-09-08T10:00:00Z'}];
c.readRecords=type=>type==='dailyTaskCompletion'?events:[];
assert.equal(c.taskCycleCompletions('2026-09-13',cfg('weekly','2026-09-07')).length,1);
assert.equal(c.taskCycleCompletions('2026-09-14',cfg('weekly','2026-09-07')).length,0);
assert.equal(events.length,1,'Reset must retain original completion history');
const ranges=[];let table;
const q={select(){return this},gte(){return this},lte(){return this},in(){return this},order(){return this},async range(a,b){ranges.push([a,b]);return {data:Array.from({length:a===0?500:1},(_,i)=>({id:a+i}))}}};
const rows=await c.fetchTaskCycleCompletionRows({from(t){table=t;return q}},cfg('weekly','2026-09-07'),'2026-09-14');
assert.equal(table,'daily_task_completions');assert.equal(rows.length,501);assert.deepEqual(ranges,[[0,499],[500,999]]);
c.readTaskConfig=()=>cfg('weekly','2026-09-07');c.localTestMode=false;c.supabaseClient={};c.syncMetaScopeKey=()=> 'account';c.currentDailyDate=()=> '2026-09-14';c.withTimeout=p=>p;c.cuddleStayRequest=async()=>{throw Error('offline')};
await assert.rejects(()=>c.ensureTaskCycleReady('a','2026-09-14'),/offline/);
console.log('Task cycles passed: daily/weekly/monthly/custom boundaries, leap year, invalid dates, preserved history, paginated reads, fail-closed history check.');
