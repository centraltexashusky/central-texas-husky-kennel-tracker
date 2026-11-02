// Reproduce the deployed staff path with synthetic records. No production requests.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
function embedded(file){const text=fs.readFileSync(file,'utf8');const match=text.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);return vm.runInNewContext(match[1]);}
function fn(source,name){const start=source.indexOf('function '+name+'(');assert(start>=0);const asyncStart=source.slice(start-6,start)==='async '?start-6:start;return source.slice(asyncStart,source.indexOf('\n}',start)+2);}
const shared=embedded('js/shared.js'),daily=embedded('js/daily.js');
const previous={id:'old-care',dogId:'other-dog',careType:'Bath',date:'2026-10-30'};
let attempted,events=[];
const c={Date,Map,Set,console,localTestMode:true,supabaseClient:null,readRecords:()=>[],dateOnly:d=>d,currentDailyDate:()=>'2026-10-30',dailySubmissionDate:r=>r.date,completedTasksForDate:()=>[],upcomingBoardingTaskGroups:()=>[],taskArraysFromCompletions:()=>({monthlyTasks:[]}),boardingTaskTextFromGroups:()=>[],upsertRecord:(_,r)=>r,sendPayload:async r=>{attempted=r;if(!r.structuredCareLogs.some(l=>l.id===previous.id))throw Object.assign(Error('Only admins can change existing care history.'),{code:'42501'});},recordTroubleshootingEvent:e=>events.push(e)};
vm.createContext(c);
for(const name of ['dailyTaskRecordId','dailyTaskRecordsForDate','dailyTaskRecordForDate','dailyWorkPayload'])vm.runInContext(fn(daily,name),c);
for(const name of ['structuredCareLogsForDate','saveDailyWorkPayload','saveStructuredCareLog'])vm.runInContext(fn(shared,name),c);
for(const dogId of ['comet-fixture','unrelated-dog']){
 await assert.rejects(c.saveStructuredCareLog({id:'new-'+dogId,dogId,careType:'Bath',date:'2026-10-30'}),/Only admins/);
 assert.equal(attempted.structuredCareLogs.length,1);assert.equal(attempted.id,'dailyTask-2026-10-30');assert.equal(events.at(-1).dogId,dogId);assert.equal(events.at(-1).operation,'care.submit');
}
assert.match(shared,/ourDogsPage: \{ critical: \["ownedDog"\], deferred: \["careLog", "customerDog", "boardingDog"\] \}/);
console.log('PASS reproduction: empty daily cache on Our Dogs creates replacement dailyTask missing existing care history; staff guard rejects it for Comet and any other dog. Diagnostic retains requested dog/date/error.');

// Production now routes to the atomic append, never this cache-based fallback.
c.localTestMode=false;c.supabaseClient={};let called=false;c.persistStructuredCareLogAtomic=async log=>{called=log.dogId;return {id:'confirmed'};};assert.equal((await c.saveStructuredCareLog({id:'safe',dogId:'comet-fixture',careType:'Bath',date:'2026-10-30'})).id,'confirmed');assert.equal(called,'comet-fixture');console.log('PASS remote path uses atomic append without reading stale daily cache.');
