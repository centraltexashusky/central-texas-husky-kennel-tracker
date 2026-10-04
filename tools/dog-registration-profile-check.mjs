import assert from 'node:assert/strict';
import {resolveRegistrationProfile,registrationProfileHtml} from '../js/dog-registration-profile.js';
import {passportPatch,registrationPassport} from '../js/dog-show-registration.js';
const records={ownedDog:[{id:'owned',type:'ownedDog',callName:'Example',showName:'CH Example Display',dateOfBirth:'2024-01-01',sex:'Female',showEntryPassport:{source:{page:1}}}],customerDog:[{id:'customer',type:'customerDog',dogName:'Visitor',registeredName:'Example Visitor'}],boardingDog:[{id:'stay',type:'boardingDog',dogName:'Visitor',linkedCustomerDogId:'customer'},{id:'stay2',type:'boardingDog',dogName:'Visitor',sourceBoardingDogId:'stay'},{id:'independent',type:'boardingDog',dogName:'Visitor'}]};
const read=type=>records[type]||[];
assert.equal(resolveRegistrationProfile('boardingDog',records.boardingDog[1],read).id,'customer');
assert.equal(resolveRegistrationProfile('boardingDog',records.boardingDog[2],read).id,'independent','Never match by name');
assert.equal(resolveRegistrationProfile('boardingDog',{...records.boardingDog[0],id:'conflict',sourceCustomerDogId:'other'},read),null);
assert.match(registrationProfileHtml('boardingDog',records.boardingDog[0],read),/shared across boarding stays/);
assert.match(registrationProfileHtml('ownedDog',records.ownedDog[0],read),/Edit registration/);
assert.doesNotMatch(registrationProfileHtml('ownedDog',records.ownedDog[0],read),/<form/,'No nested form');
const patch=passportPatch(records.ownedDog[0],{...registrationPassport(records.ownedDog[0]),registeredName:'EXAMPLE CERTIFICATE'},'tester','2026-10-04');
assert.equal(patch.showName,undefined,'Keep display titles');
assert.deepEqual(patch.showEntryPassport.source,{page:1},'Preserve provenance');
console.log('Profile registration checks passed: exact identities, shared stays, no name merge, separate display titles, source preservation.');
if(process.argv.includes('--serve')) {
 const {createServer}=await import('node:http'), fs=await import('node:fs/promises'), path=await import('node:path');
 const root=process.cwd();
const fixture=`<!doctype html><html data-theme="light"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dog profile registration · Local test</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/app-workspace.css"><link rel="stylesheet" href="/dog-registration-profile.css"><style>body{display:block;padding:20px;background:#f4f8fb}main{max-width:1000px;margin:auto}section{padding:20px;background:white;margin:20px 0}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}</style></head><body><main><h1>Local test only · Profile registration</h1><form id="ourDogForm"><section><h2>Our Dogs · Example</h2><div id="ownedRegistrationProfile"></div></section></form><form id="boardingDogForm"><section id="boardingDogDetail"><h2>Boarding Dogs · Visitor</h2><div id="boardingRegistrationProfile"></div></section></form><p id="toast" role="status"></p></main><script>
var records=JSON.parse(localStorage.getItem('profile-registration-fixture')||'null')||${JSON.stringify(records)};
var localTestMode=true,supabaseClient=null,currentUser={email:'local-tester'};
function readRecords(type){return records[type]||[]}function currentRole(){return 'admin'}function canWriteRemoteRecord(){return true}
function upsertRecord(type,payload){records[type]=records[type].map(r=>r.id===payload.id?payload:r);localStorage.setItem('profile-registration-fixture',JSON.stringify(records))}
function activeBoardingDog(){return records.boardingDog[0]}function showToast(message){document.getElementById('toast').textContent=message}
function refreshOwnedWorkspace(){document.getElementById('ownedRegistrationProfile').innerHTML=window.dogRegistrationProfileHtml('ownedDog',records.ownedDog[0])}
</script><script type="module">import '/js/dog-registration-profile.js';refreshOwnedWorkspace();document.getElementById('boardingRegistrationProfile').innerHTML=window.dogRegistrationProfileHtml('boardingDog',activeBoardingDog());</script></body></html>`;
 createServer(async(req,res)=>{try{res.setHeader('Content-Type','text/html; charset=utf-8');if(req.url==='/profile-mobile')return res.end('<title>Mobile profile test</title><iframe title="390px profile" style="width:390px;height:844px;border:0" src="/profile-test"></iframe>');if(req.url==='/profile-test')return res.end(fixture);const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file))}catch{res.statusCode=404;res.end('Not found')}}).listen(8768,'127.0.0.1',()=>console.log('http://127.0.0.1:8768/profile-test'));
}
