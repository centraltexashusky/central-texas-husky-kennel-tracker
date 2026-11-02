import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const listeners={};let role='helper',fail=false,calls=[];
const elements=Object.fromEntries(['troubleshootingText','troubleshootingStatus','troubleshootingLogPanel','troubleshootingFilter','troubleshootingSince'].map(id=>[id,{value:'',textContent:'',hidden:false}]));
const db = {
  from(table) {
    assert.equal(table, 'troubleshooting_events');
    return {insert(row) {
      calls.push(row);
      return {abortSignal() {return fail ? Promise.reject(Error('offline')) : Promise.resolve({error:null});}};
    }};
  }
};
const c={console,Date,Map,JSON,Promise,AbortController,setTimeout,clearTimeout,localTestMode:false,supabaseClient:{},currentRole:()=>role,cuddleStayRequest:fn=>fn(db),document:{addEventListener:(name,fn)=>listeners[name]=fn,getElementById:id=>elements[id]}};
vm.createContext(c);vm.runInContext(fs.readFileSync('js/troubleshooting.js','utf8'),c);
const secret='Bearer SECRET_TOKEN private care notes';
const event=c.troubleshootingEvent({operation:'care.submit',dogId:'dog-1',careType:'Bath',workDate:'2026-10-30',recordId:'care-1',payload:{password:secret},error:{code:'42501',message:'Only admins can change existing care history. '+secret,details:secret,stack:secret}});
assert.equal(event.category,'history_protected');assert(!JSON.stringify(event).includes(secret));assert(!('actor_id' in event));assert(!('created_at' in event));assert.equal(event.dog_id,'dog-1');assert.equal(c.troubleshootingEvent({error:{message:secret}}).message,'Save failed. Use the error code and record ID to investigate.');
assert.equal(c.troubleshootingEvent({dogId:'a\nb',error:{code:secret}}).dog_id,'');
for(const r of ['customer','']){role=r;c.recordTroubleshootingEvent({});}assert.equal(calls.length,0);
role='helper';fail=true;assert.doesNotThrow(()=>c.recordTroubleshootingEvent({operation:'care.submit',dogId:'dog-1',careType:'Bath',error:{code:'42501'}}));
await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls.length,1);assert.equal(c.troubleshootingPending,0);
c.recordTroubleshootingEvent({operation:'care.submit',dogId:'dog-1',careType:'Bath',error:{code:'42501'}});assert.equal(calls.length,1,'duplicate throttled');
for(let i=0;i<100;i++)c.recordTroubleshootingEvent({dogId:'dog-'+i});assert(calls.length<=6,'bounded in-flight diagnostics');await new Promise(resolve=>setTimeout(resolve,0));
c.localTestMode=true;c.recordTroubleshootingEvent({dogId:'new'});assert(calls.length<=6,'tests never write production');
c.troubleshootingRows=[{actor_id:'actor',dog_id:'dog-1',message:'line\ninjection'}];role='helper';c.renderTroubleshootingPanel();assert.equal(elements.troubleshootingLogPanel.hidden,true);assert.equal(c.troubleshootingRows.length,0);role='admin';c.renderTroubleshootingPanel();assert.equal(elements.troubleshootingLogPanel.hidden,false);
assert(!c.troubleshootingText([{message:'line\ninjection'}]).includes('\n'));assert.equal(c.troubleshootingText([{dog_id:'a'}],'missing'),'');
// Exercise the viewer's remote path with fake data only, including unavailable storage.
c.localTestMode=false;c.withRemoteRequestTimeout=p=>p;
let viewerLimit=0;
c.cuddleStayRequest=fn=>fn({from:()=>({select:()=>({gte:()=>({order:()=>({limit:n=>{viewerLimit=n;return Promise.resolve({data:[{created_at:'2026-11-02T10:00:00Z',actor_id:'fixture-actor',dog_id:'fixture-dog',operation:'care.submit',error_code:'42501',message:'Existing care history would be changed or omitted.'}]});}})})})})});
await c.loadTroubleshootingLog();assert.equal(viewerLimit,200);assert.match(elements.troubleshootingText.value,/fixture-dog/);assert.match(elements.troubleshootingStatus.textContent,/1 events loaded/);
elements.troubleshootingFilter.value='missing';c.renderTroubleshootingText();assert.equal(elements.troubleshootingText.value,'');
c.cuddleStayRequest=()=>Promise.resolve({error:{code:'42P01'}});await c.loadTroubleshootingLog();assert.match(elements.troubleshootingStatus.textContent,/Log unavailable/);assert.equal(elements.troubleshootingText.value,'');
const sql=fs.readFileSync('supabase/migrations/20261102165317_atomic_care_append_and_diagnostics.sql','utf8');assert.match(sql,/enable row level security/);assert.match(sql,/for select to authenticated using[\s\S]*kennel_is_admin/);assert.match(sql,/actor_id=\(select auth.uid\(\)\)/);assert.doesNotMatch(sql,/security definer/i);assert.match(sql,/interval '14 days'/);
console.log('PASS diagnostics: sanitization, staff capture, customer exclusion, admin UI, role change clearing, filtering, deduplication, concurrency bound, local isolation, network failure containment. SQL reviewed statically only.');
