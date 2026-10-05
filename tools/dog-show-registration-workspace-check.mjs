import assert from 'node:assert/strict';
import { nextRegistrationStatus, registrationStatuses, passportFields, passportReviewed, registrationWarnings, registrationStatusForEntry, registrationAge, registrationAppearances, registrationPassport, registrationEligibility, registrationQueue, registrationPatch, passportPatch, safeRegistrationUrl, createRegistrationWorkspace } from '../js/dog-show-registration.js';
import { assertRegistrationUnchanged, createRegistrationStore } from '../js/dog-show-registration-store.js';
const profile = { id:'dog-one', type:'ownedDog', callName:'Blossom', dateOfBirth:'2025-04-15', sex:'Female', breed:'Siberian Husky' };
const fields = Object.fromEntries(passportFields.map(([key]) => [key, 'Example']));
Object.assign(fields, { registeredName:'Example’s Blossom', akcRegistrationNumber:'TEST-ONLY', dateOfBirth:'2025-04-15', breed:'Siberian Husky', sex:'Female', ownerNames:'Example Owner', breederNames:'Example Breeder', ownerAddress:'Example address', ownerEmail:'owner@example.test', ownerPhone:'555-0100', countryOfBirth:'United States', registrationType:'AKC', certificateUrl:'' });
Object.assign(profile, passportPatch(profile, fields, 'test', '2026-10-04'));
const show = { id:'show-one', type:'showEvent', name:'Belton · Example KC', status:'Going', startDate:'2026-10-15', endDate:'2026-10-16', showType:'Regular breed', superintendent:'Example superintendent', entryUrl:'https://example.com/', entryClosingDate:'2026-10-07' };
const entry = { id:'entry-one', type:'showEntry', dogType:'ownedDog', dogId:profile.id, dogName:'Blossom', showEventId:show.id, attendanceRole:'Showing', status:'Confirmed', ringSchedules:[{id:'thu',ringDate:'2026-10-15',classEntered:'Open Bitch',competition:'Regular breed'},{id:'fri',ringDate:'2026-10-16',classEntered:'Open Bitch',competition:'Regular breed'}], notes:'Keep this', prepMinutes:45 };
const secondProfile = { id:'dog-two', type:'customerDog', dogName:'Mango', dateOfBirth:'' };
const records = { ownedDog:[profile], customerDog:[secondProfile], boardingDog:[{id:'stay-one',linkedCustomerDogId:'dog-two'},{id:'stay-two',linkedCustomerDogId:'dog-two'}], showEvent:[show,{...show,id:'show-two',name:'Example KC · Saturday',startDate:'2026-10-17',endDate:'2026-10-17',entryUrl:'',superintendent:'Another provider'}], showEntry:[entry,{...entry,id:'entry-two',dogType:'boardingDog',dogId:'stay-one',dogName:'Mango',ringSchedules:[]},{...entry,id:'entry-three',showEventId:'show-two',dogType:'boardingDog',dogId:'stay-two',dogName:'Mango',ringSchedules:[]},{...entry,id:'social',dogId:'social-dog',attendanceRole:'Socialization'}] };
const deps = { read:type=>records[type]||[], identity:entry=>entry.dogType==='boardingDog'?`customerDog:${records.boardingDog.find(dog=>dog.id===entry.dogId).linkedCustomerDogId}`:`${entry.dogType}:${entry.dogId}`, name:entry=>entry.dogName, schedules:entry=>entry.ringSchedules||[], research:()=>({}), date:v=>v, today:()=> '2026-10-04', canEdit:()=>true };
assert.equal(registrationAge('2026-04-15','2026-10-14'),5);
assert.equal(registrationAge('2026-04-15','2026-10-15'),6);
assert.equal(registrationAge('2026-06-15','2026-10-14'),3);
assert.equal(registrationAge('2026-06-15','2026-10-15'),4);
assert.equal(registrationAge('2026-08-31','2027-02-28'),6);
assert.equal(registrationAge('2026-02-30','2026-10-15'),null);
assert.equal(registrationAge('','2026-10-15'),null);
assert.equal(registrationAge('2027-01-01','2026-10-15'),null);
assert.equal(safeRegistrationUrl('javascript:alert(1)'), '');
assert.equal(safeRegistrationUrl('https://user:secret@example.com'), '');
let queue=registrationQueue(deps);
assert.equal(queue.length,2,'One canonical customer dog across multiple stays, no socializing dog');
assert.equal(queue[1].appearances.length,2);
const dog=queue[0], appearance=dog.appearances[0];
assert.equal(appearance.status,'Planned to go','Confirmed attendance never implies registration');
assert.equal(registrationAppearances({...entry,registrationStatus:'',status:'Entered'},show,entry.ringSchedules)[0].status,'Planned to go','Explicit cleared status is not evidence');
assert.equal(registrationAppearances({...entry,ringSchedules:[]},show,[])[0].date,'','Multiday show cannot guess the entry day');
assert.equal(registrationAppearances({...entry,ringSchedules:[]},{...show,showType:'AB/JS'},[])[0].competition,'','Broad show category is not the dog’s selected competition');
assert.equal(registrationEligibility({dateOfBirth:'2026-04-16'},appearance).blocked,true);
assert.equal(registrationEligibility({dateOfBirth:'2026-04-15'},{...appearance,competition:'4–6 Month Beginner Puppy'}).blocked,true);
assert.equal(registrationPatch(dog,appearance,{status:'Registered'},'test','now').entryRegistrations[0].status,'Registered','Receipt/reference is optional');
const incompleteDog={...dog,profile:{...dog.profile,showEntryPassport:{}},passport:{...dog.passport,dateOfBirth:'',ownerAddress:''}};
const incompleteAppearance={...appearance,date:'',competition:'',classEntered:''};
const warnings=registrationWarnings(incompleteDog,incompleteAppearance);
assert(warnings.some(text=>text.includes('Date of birth')&&text.includes('Owner mailing address')),'Missing fields are named');
assert(warnings.some(text=>text.includes('not been marked reviewed')),'Review warning is explicit');
assert(warnings.some(text=>text.includes('Exact show date, Competition, Class')),'Assignment omissions are named');
for(const status of ['Planned to go','Not registered yet','Submitted — awaiting confirmation','Registered']) {
  const result=registrationPatch(incompleteDog,incompleteAppearance,{status},'test','now');
  assert.equal(result.entryRegistrations[0].status,status,'Incomplete local records do not block any status');
  assert.deepEqual(result.entryRegistrations[0].profileWarnings,warnings,'Warnings captured in history');
  assert.equal(result.entryRegistrations[0].passportSnapshot.ownerAddress,'','Missing data is not fabricated');
}
const ageConflictDog={...dog,passport:{...dog.passport,dateOfBirth:'2026-04-16'}};
assert.equal(registrationPatch(ageConflictDog,appearance,{status:'Registered'},'test','now').entryRegistrations[0].status,'Registered','External registration may be recorded despite a local age/class warning');
assert(registrationWarnings(ageConflictDog,appearance).some(text=>text.includes('conflicts')));
assert.throws(()=>registrationPatch(dog,appearance,{status:'Registered',receiptUrl:'javascript:alert(1)'},'test','now'),/http or https/);
assert.throws(()=>registrationPatch(dog,{...appearance,event:{...show,status:'Completed'}},{status:'Registered'},'test','now'),/closed/);
assert.throws(()=>registrationPatch(dog,appearance,{status:'Invalid'},'test','now'),/Choose a registration status/);
const patch=registrationPatch(dog,appearance,{status:'Registered',reference:'CONF-EXAMPLE'},'test','now');
assert.equal(patch.registrationStatus,'Not registered yet','One day is not both days');
assert.equal(patch.entryRegistrations.length,1);
assert.equal(entry.notes,'Keep this');
const savedEntry={...entry,...patch};
const appearances=registrationAppearances(savedEntry,show,entry.ringSchedules);
assert.equal(appearances[0].status,'Registered');
assert.equal(appearances[1].status,'Not registered yet');
assert.equal(registrationAppearances(savedEntry,show,[{...entry.ringSchedules[0],ringDate:'2026-10-17'}])[0].status,'Not registered yet','Changed date invalidates current match, retains history');
assert.equal(registrationPassport({...profile, dateOfBirth:'2025-04-16'}).dateOfBirth,'2025-04-16','Profile correction supersedes saved passport');
assert.equal(passportReviewed({...profile, dateOfBirth:'2025-04-16'}),false,'Corrected profile requires a new review');
assert.equal(registrationPassport({...profile, showName:'CH Display name'}).registeredName,profile.registeredName,'Certificate identity stays separate from the display name and titles');
assert.equal(registrationPassport({...profile, registeredName:'Corrected certificate name'}).registeredName,'Corrected certificate name');
assert.equal(registrationStatusForEntry(savedEntry,show,entry.ringSchedules),'Not registered yet');
assert.equal(registrationStatusForEntry(savedEntry,show,[{...entry.ringSchedules[0],classEntered:'Changed'}]),'Not registered yet');
assert.notEqual(patch.entryRegistrations[0].passportSnapshot, dog.passport);
assertRegistrationUnchanged(entry,{...entry,unrelated:'fresh'},['entryRegistrations']);
assert.throws(()=>assertRegistrationUnchanged(entry,{...entry,ringSchedules:[]},[]),/changed/);
assert.throws(()=>assertRegistrationUnchanged(entry,{...entry,removed:true},[]),/removed/);
let cached=null, cloud=structuredClone(entry), version='v1', race=false, fail=false, denied=false;
const calls=[];
function query() {
  let operation='read', update, match;
  const q={ select(){return q;},eq(key,value){calls.push([key,value]);if(key==='updated_at')match=value;return q;},is(){return q;},maybeSingle(){return q;},update(value){operation='update';update=value;return q;},then(resolve){
    if(fail)return Promise.resolve(resolve({error:{message:'network'}}));
    if(operation==='read')return Promise.resolve(resolve({data:{payload:structuredClone(cloud),updated_at:version}}));
    if(race||match!==version)return Promise.resolve(resolve({data:[]}));
    cloud=update.payload;version=update.updated_at;return Promise.resolve(resolve({data:[{payload:structuredClone(cloud)}]}));
  }}; return q;
}
const store=createRegistrationStore({read:deps.read,allowed:()=>!denied,local:()=>false,connected:()=>true,request:fn=>fn({from:()=>query()}),timeout:p=>p,identity:async()=>({}),cache:(_,payload)=>cached=payload});
cloud.unloadedMedia=['preserve'];
await store.save('showEntry',entry,patch);
assert.deepEqual(cached.unloadedMedia,['preserve'],'Cloud payload, not slim cache, is source for merges');
assert.equal(cached.notes,'Keep this');
assert(calls.some(([key])=>key==='updated_at'),'Atomic version guard');
cached=null;race=true;
await assert.rejects(()=>store.save('showEntry',cloud,{notes:'changed'}),/Another update/);
assert.equal(cached,null,'No local false success on a race');
race=false;fail=true;
await assert.rejects(()=>store.save('showEntry',cloud,{notes:'changed'}),/read/);
fail=false;denied=true;
await assert.rejects(()=>store.save('showEntry',cloud,patch),/access/);
const html=createRegistrationWorkspace(deps).render();
assert.match(html,/Entry link missing|Open Example superintendent/);
assert.match(html,/Not registered only/);
assert(!html.includes('social-dog'));
assert.match(html,/target="_blank" rel="noopener noreferrer"/);
assert.match(html,/data-reg-status=/);
assert.match(html,/One click saves the next status/);
assert(!html.includes('<select data-reg-status='),'Main status action is a button');
for(let i=0;i<registrationStatuses.length;i++) assert.equal(nextRegistrationStatus(registrationStatuses[i]),registrationStatuses[i+1]||null);
assert.equal(nextRegistrationStatus('Invalid'),null,'Unknown status cannot advance');
assert(!html.includes('Record registration'),'Quick status replaces the modal action');
assert.match(html,/<summary>More options<\/summary>/,'Optional paperwork is tucked away');
assert.match(html,/class="reg-show-facts"/,'Show facts are grouped separately from controls');
assert.match(html,/<dt>Competition<\/dt>/);
assert.match(html,/<dt>Class<\/dt>/);
assert.match(html,/class="reg-show-controls"/);
assert.match(html,/>Age & eligibility<\/span>/);
const handlers={}; let rendered='', savedStatus=null, checks=[], statusFail=false, releaseSave;
const statusWorkspace=createRegistrationWorkspace({...deps,actor:()=> 'tester',check:async(type)=>checks.push(type),
  save:async(type,base,patch)=>{if(statusFail)throw Error('Simulated save failure'); await new Promise(resolve=>releaseSave=resolve); savedStatus={type,base,patch};},
  render:()=>{rendered=statusWorkspace.render();}});
statusWorkspace.bind({addEventListener:(name,fn)=>handlers[name]=fn});
rendered=statusWorkspace.render();
const key=rendered.match(/data-reg-status="([^"]+)"/)[1];
const advanceTarget={dataset:{regAction:'advance',regStatus:key}};
const advance={target:{closest:()=>advanceTarget}};
handlers.click(advance);
assert.match(rendered,/Saving status/);
assert.match(rendered,/data-reg-status="[^"]+"[^>]* disabled/,'Disable status controls while saving');
await new Promise(resolve=>setImmediate(resolve));
handlers.click(advance);
releaseSave(); await new Promise(resolve=>setImmediate(resolve));
assert.equal(savedStatus.patch.entryRegistrations.at(-1).status,'Not registered yet');
assert.deepEqual(checks,['showEvent','ownedDog'],'Reject concurrent profile/event changes before saving');
assert.equal(savedStatus.base.id,entry.id);
assert.match(rendered,/Not registered yet saved/);
statusFail=true;savedStatus=null;handlers.click(advance);await new Promise(resolve=>setImmediate(resolve));
assert.equal(savedStatus,null);assert.match(rendered,/Simulated save failure/);
assert.match(rendered,/<strong>Planned to go<\/strong>/,'Failed save retains persisted status');
const withPaperwork={...appearance,entry:savedEntry,record:{reference:'KEEP',receiptUrl:'https://example.com/receipt',notes:'Preserve notes'}};
const statusOnly=registrationPatch(dog,withPaperwork,{...withPaperwork.record,status:'Submitted — awaiting confirmation'},'test','later');
assert.equal(statusOnly.entryRegistrations.at(-1).reference,'KEEP');
assert.equal(statusOnly.entryRegistrations.at(-1).notes,'Preserve notes');
assert.equal(statusOnly.entryRegistrations.at(-1).receiptUrl,'https://example.com/receipt');
assert.equal(statusOnly.entryRegistrations.length,2,'Quick changes append history');
statusWorkspace.state.key='customerDog:dog-two';
const mangoHtml=statusWorkspace.render();
const mangoKeys=[...mangoHtml.matchAll(/data-reg-status="([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(mangoKeys).size,2,'Primary appearances on different shows must not share status keys');
console.log('Registration workspace passed: canonical identity, date/age boundaries, exact appearances, profile snapshots, legacy status, URL safety, concurrent saves, permissions and cloud error handling.');

// Explicit localhost-only harness: no production data, credentials or network writes.
if(process.argv.includes('--serve')) {
  const {createServer}=await import('node:http'); const fs=await import('node:fs/promises'); const path=await import('node:path');
  const root=process.cwd();
  const fixture=`<!doctype html><html data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Registration workspace · Local test</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/app-workspace.css"><link rel="stylesheet" href="/dog-show-workspace.css"><link rel="stylesheet" href="/dog-show-registration.css"><style>body{display:block;padding:20px;background:#f4f8fb}#dogShowPage{max-width:1150px;margin:auto}dialog{max-width:800px;width:90%;max-height:90vh;overflow:auto}#test-controls{display:flex;flex-wrap:wrap;gap:10px;margin:15px}button{min-height:40px}</style></head><body><div id="test-controls"><strong>Local test only · no real records</strong><button id="simulate-error">Simulate next save failure</button><button id="simulate-race">Simulate concurrent edit</button></div><section id="dogShowPage" data-show-view="registration"><nav><strong>Dog Shows / Registration</strong></nav><div id="dogShowContent"></div></section><dialog id="dogShowDialog"><h2 id="dialogTitle"></h2><div id="dialogBody"></div></dialog><script type="module">
    import {createRegistrationWorkspace} from '/js/dog-show-registration.js';
    import {createRegistrationStore} from '/js/dog-show-registration-store.js';
    let records=JSON.parse(localStorage.getItem('registration-test-records')||'null')||${JSON.stringify(records)};
    let fail=false;document.querySelector('#simulate-error').onclick=()=>fail=true;
    document.querySelector('#simulate-race').onclick=()=>{records.ownedDog[0].registeredName='Changed by another editor';};
    const deps={read:type=>records[type]||[],identity:entry=>entry.dogType==='boardingDog'?'customerDog:dog-two':entry.dogType+':'+entry.dogId,name:entry=>entry.dogName,schedules:entry=>entry.ringSchedules||[],research:()=>({}),date:v=>{const d=new Date(v+'T12:00:00');return String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0')+'/'+d.getFullYear()+' · '+['Sun','Mon','Tues','Wed','Thurs','Fri','Sat'][d.getDay()]},today:()=> '2026-10-04',canEdit:()=>true,actor:()=> 'Local tester',dialog:(title,html)=>{document.querySelector('#dialogTitle').textContent=title;document.querySelector('#dialogBody').innerHTML=html;document.querySelector('dialog').showModal()},close:()=>document.querySelector('dialog').close(),assignment:()=>{alert('Local fixture: use Review show assignment in the actual app.')}};
    const store=createRegistrationStore({read:deps.read,allowed:()=>true,local:()=>true,cache:(type,payload)=>{records[type]=records[type].map(item=>item.id===payload.id?payload:item);localStorage.setItem('registration-test-records',JSON.stringify(records))}});
    const workspace=createRegistrationWorkspace({...deps,save:async(...args)=>{if(fail){fail=false;throw Error('Simulated cloud save failure. Nothing saved.')}return store.save(...args)},check:(...args)=>store.check(...args),render:()=>render()});
    function render(){document.querySelector('#dogShowContent').innerHTML=workspace.render()}workspace.bind();render();
  </script></body></html>`;
  createServer(async(req,res)=>{try{
    if(req.url==='/__registration-mobile'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end('<title>390px responsive registration test</title><body style="background:#e8eef2;font-family:Arial"><h2>390px mobile layout · Local test</h2><iframe title="Mobile registration" src="/__registration-test" style="width:390px;height:844px;border:1px solid #b9cad8;border-radius:12px"></iframe>');}
    if(req.url==='/__registration-test'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture)}
    const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep))throw Error('path');const target=file.endsWith('/')?file+'index.html':file;res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript':target.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(target))
  }catch{res.statusCode=404;res.end('Not found')}}).listen(8767,'127.0.0.1',()=>console.log('Local fixture: http://127.0.0.1:8767/__registration-test'));
}
