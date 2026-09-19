import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const raw=fs.readFileSync('js/shared.js','utf8');
const shared=vm.runInNewContext(raw.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
function extract(s,name){return s.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0];}
const context={};vm.createContext(context);vm.runInContext(extract(shared,'dogShowRegistrationPatch')+'\n'+extract(shared,'dogProfileFieldPatch')+'\n'+shared.match(/var canonicalDogProfileFields = \[[\s\S]*?\];/)[0],context);
const dog={registeredName:'CH Northern Star',showRegistrationEnabled:'Yes',akcRegistrationNumber:'WS00123405',sireName:'CH Sire',damName:'CH Dam'};
assert.equal(context.dogShowRegistrationPatch({},dog).registeredName,dog.registeredName);
assert.equal(context.dogShowRegistrationPatch({registeredName:''},dog).registeredName,'','Explicit clearing must survive');
assert.equal(context.dogShowRegistrationPatch({showRegistrationEnabled:'No'},dog).showRegistrationEnabled,'No');
for(const [key,value] of Object.entries(dog))assert.equal(context.dogProfileFieldPatch(dog)[key],value);
const html=fs.readFileSync('index.html','utf8');
for(const id of ['customerDogForm','boardingDogForm']){
 const form=html.slice(html.indexOf('<form id="'+id+'"'));const panel=form.match(/<fieldset data-show-registration-panel[\s\S]*?<\/fieldset>/)[0];
 for(const field of ['registeredName','akcRegistrationNumber','sireName','damName'])assert(panel.includes('name="'+field+'"'));
 assert(!/\srequired(?:\s|>|\/)/.test(panel),'Registration cannot block boarding');
}
const source=fs.readFileSync('js/dog-show.js','utf8');
const showContext={dogShowSourceDog:()=>dog,linkedCustomerDogForBoarding:()=>null,escapeHtml:s=>String(s).replaceAll('<','&lt;')};vm.createContext(showContext);vm.runInContext(extract(source,'dogShowRegistrationSummaryHtml'),showContext);
assert.equal(showContext.dogShowRegistrationSummaryHtml({dogType:'ownedDog',attendanceRole:'Showing'}),'');
assert.match(showContext.dogShowRegistrationSummaryHtml({dogType:'boardingDog',attendanceRole:'Showing'}),/WS00123405/);
showContext.linkedCustomerDogForBoarding=()=>({...dog,registeredName:'Updated canonical name'});
assert.match(showContext.dogShowRegistrationSummaryHtml({dogType:'boardingDog',attendanceRole:'Showing'}),/Updated canonical name/);
console.log('Show registration checks passed: four-field propagation, canonical reuse, optional validation, explicit clearing, and non-show exclusions.');
