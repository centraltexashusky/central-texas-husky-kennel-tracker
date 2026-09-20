import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/dog-show.js','utf8');
const storage=new Map();
let records=[
 {id:'yesterday',name:'Weekend Show',club:'Weekend Club',startDate:'2026-09-19',endDate:'2026-09-19',status:'Active'},
 {id:'today',name:'Weekend Show',club:'Weekend Club',startDate:'2026-09-20',endDate:'2026-09-20',status:'Active'},
 {id:'older',name:'Older Open Show',startDate:'2026-08-01',endDate:'2026-08-01',status:'Going'},
 {id:'completed',name:'Completed Show',startDate:'2026-09-18',endDate:'2026-09-18',status:'Completed'},
 {id:'removed',name:'Removed Show',removed:true,startDate:'2026-09-17',endDate:'2026-09-17',status:'Active'},
];
const ctx={readRecords:()=>records,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},DOG_SHOW_EVENT_KEY:'selection',todayDate:()=> '2026-09-20',escapeHtml:String,dogShowFormatMonthDay:v=>v.slice(5),dogShowEventStatus:v=>v,dogShowPlannerDateOffset:(v,n)=>{const d=new Date(v+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}};
vm.createContext(ctx);
for(const name of ['dogShowRecords','dogShowEvents','dogShowOperationalEvents','dogShowActiveEvent','dogShowEventWeekendKey','dogShowEventWeekendGroups','dogShowPlannerLifecycleStatus','dogShowEventOptions'])vm.runInContext(source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0],ctx);
assert.equal(ctx.dogShowActiveEvent().id,'today','Default should favor an upcoming/current event');
storage.set('selection','yesterday');
assert.equal(ctx.dogShowActiveEvent().id,'yesterday','Past date must not replace the saved show');
let options=ctx.dogShowEventOptions();
assert(options.includes('value="yesterday" selected'));assert(options.includes('2026'));
assert(!options.includes('value="completed"'));assert(!options.includes('value="removed"'));
assert(options.indexOf('value="today"')<options.indexOf('value="older"'),'Current weekend before old weekends');
records.find(r=>r.id==='yesterday').status='Completed';
assert.equal(ctx.dogShowActiveEvent().id,'today','Explicit completion must move selection to an open show');
assert(!ctx.dogShowEventOptions().includes('value="yesterday"'));
records=records.filter(r=>r.id==='older');storage.clear();
assert.equal(ctx.dogShowActiveEvent().id,'older','Past-only show must still be available');
assert(ctx.dogShowEventOptions().includes('Past show — open'));
records[0].status='Completed';
assert.equal(ctx.dogShowActiveEvent(),null);assert.equal(storage.size,0);
assert(ctx.dogShowEventOptions().includes('No open shows'));
console.log('Show selection passed: past dates remain selectable, saved selection stays stable, completed/removed excluded, active defaults, year labels and past-only/empty states.');
