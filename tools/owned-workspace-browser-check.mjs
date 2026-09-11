const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:8765/';
assert(['127.0.0.1','localhost'].includes(new URL(baseUrl).hostname), 'Only run write-flow QA against a local preview');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1024}});
page.setDefaultTimeout(12000);
const errors=[];page.on('pageerror', e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});
await page.route('**/*.supabase.co/**',r=>r.abort());
try {
await page.goto(baseUrl + '?localTest=1&email=qa@example.invalid&role=admin#ourDogsPage');
await page.waitForFunction(()=>typeof renderOwnedDogs==='function' && typeof openOwnedWorkspace==='function' && localTestMode);
await page.evaluate(()=>{const d=document.getElementById('detailDialog');if(d.open)d.close()});
await page.waitForTimeout(300);
await page.evaluate(()=>{
 if(supabaseClient)throw Error('Not isolated');
 const base={type:'ownedDog',sex:'Female',spayNeuterStatus:'Intact',dateOfBirth:'2024-03-21',foodAmount:'1 cup morning and evening',rabiesDate:'2026-01-01',nextRabiesDate:'2027-01-01',dhppDate:'2026-01-01',nextDhppDate:'2027-01-01',bordetellaDate:'2026-08-01',nextBordetellaDate:'2027-02-01',heartwormDate:todayDate(),lastBath:'2026-09-01',nextBath:'2026-10-01',bathIntervalDays:30,exerciseFrequencyDays:3,lastExerciseDate:'2026-09-01',exerciseRoutine:'Treadmill or yard run, 15–20 minutes.',trainingRoutine:'Loose leash walking and recall.',trainingFrequencyDays:7,lastTrainingDate:'2026-09-01',nextTrainingDate:'2026-09-12',bathRoutine:'Monthly bath and brush.',bathProducts:'Gentle shampoo',heatCycleLengthDays:183,lastHeat:'2026-04-01',nextHeat:'2026-10-01',notes:'Enjoys a calm introduction.',exerciseLogs:[{id:'exercise-qa',type:'Treadmill',date:'2026-09-01',minutes:'15',completedBy:'QA Staff'}]};
 writeRecords('ownedDog',[
  {...base,id:'qa-blossom',callName:'Blossom',showName:'Central Texas Blossom'},
  {...base,id:'qa-bark',callName:'Bark-Vader',sex:'Male',spayNeuterStatus:'Neutered',medicalCareNotes:'Check paws after exercise.',lastBath:'2026-07-01',nextBath:'2026-08-01'},
  {...base,id:'qa-comet',callName:'Comet',sex:'Male',spayNeuterStatus:'Intact',foodAmount:'2 cups twice daily'},
  {...base,id:'qa-lulu',callName:'Lulu',lastExerciseDate:todayDate(),lastTrainingDate:todayDate()},
 ]);renderOwnedDogs();
});
await page.waitForTimeout(1200);
await page.locator('#ourDogsPage h2').first().click();
await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/owned-roster-desktop.png',fullPage:true});
assert.equal(await page.locator('#ownedDogTableBody tr[data-id]').count(),4);
assert.equal(await page.locator('#ownedDogMobileCards article').count(),0);
assert.equal(await page.locator('#ownedDogColumnManager').isVisible(),false);
await page.locator('#ownedColumnsButton').click();
assert(await page.locator('#ownedDogColumnManager').isVisible());
await page.locator('#ownedDogColumnManager input[data-column="foodAmount"]').uncheck();
assert(!(await page.locator('#ownedDogTableHead').innerText()).includes('FOOD'));
await page.locator('#ownedDogColumnManager input[data-column="foodAmount"]').check();
await page.locator('#ownedColumnsButton').click();
await page.locator('#ownedDogCareFilters [data-filter="Males"]').click();
await page.locator('#ownedDogSearch').fill('Blossom');
assert.equal(await page.locator('#ownedDogTableBody tr[data-id]').count(),0);
await page.locator('#ownedDogSearch').fill('');
await page.locator('#ownedDogCareFilters [data-filter="All"]').click();
await page.locator('#ownedDogTableBody [data-action="view-owned"][data-id="qa-blossom"]').click();
await page.locator('#ownedWorkspaceReadPanel').waitFor();
await page.screenshot({path:'/tmp/owned-profile-desktop.png'});
for(const tab of ['Overview','Exercise','Training','Baths','Heat Cycle','Medical / Care Notes','Files','Timeline']){
 await page.locator(`[data-owned-profile-tab="${tab}"]`).click();
 assert.equal(await page.locator(`[data-owned-profile-tab="${tab}"]`).getAttribute('aria-selected'),'true');
 assert(await page.locator('#ownedDogDetail').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
 await page.screenshot({path:'/tmp/owned-tab-'+tab.replaceAll(/[^a-z]/gi,'')+'.png'});
}
await page.locator('[data-owned-workspace-action="edit"]').click();
await page.locator('[data-owned-profile-tab="Overview"]').click();
await page.locator('#ourDogForm [name="foodAmount"]').fill('1.5 cups twice daily');
await page.locator('[data-owned-profile-tab="Exercise"]').click();
await page.locator('#ourDogForm [name="exerciseRoutine"]').fill('QA updated exercise routine');
await page.locator('[data-owned-profile-tab="Overview"]').click();
assert.equal(await page.locator('#ourDogForm [name="foodAmount"]').inputValue(),'1.5 cups twice daily');
await page.locator('#ownedDogSaveButton').click();
await page.waitForFunction(()=>readRecords('ownedDog').find(d=>d.id==='qa-blossom').foodAmount==='1.5 cups twice daily');
await page.waitForTimeout(600);
console.log('SAVE',await page.locator('#detailDialog').innerText());
await page.evaluate(()=>{const d=document.getElementById('detailDialog');if(d.open)d.close()});
await page.waitForTimeout(200);
await page.locator('#closeOwnedDogDialogButton').click();
await page.waitForTimeout(250);
await page.locator('#ownedDogTableBody [data-action="log-owned-care"][data-id="qa-blossom"]').click();
await page.locator('[data-owned-care-choice="Treadmill"]').click();
console.log('CARE',await page.locator('#detailDialog').innerText());
await page.locator('#detailDialog input[name="minutes"]').fill('12');
await page.locator('#detailDialog button[type="submit"]').click();
await page.waitForTimeout(800);
console.log('CARE SAVE',await page.locator('#detailDialog').innerText());
await page.evaluate(()=>{const d=document.getElementById('detailDialog');if(d.open)d.close()});
await page.waitForTimeout(200);
await page.setViewportSize({width:390,height:844});
await page.locator('#ownedDogMobileCards .owned-modern-card').first().waitFor();
assert.equal(await page.locator('#ownedDogTableBody tr').count(),0);
await page.screenshot({path:'/tmp/owned-roster-mobile.png',fullPage:true});
await page.locator('#ownedDogMobileCards [data-action="view-owned"][data-id="qa-blossom"]').click();
await page.screenshot({path:'/tmp/owned-profile-mobile.png'});
for(const tab of ['Exercise','Training','Baths','Heat Cycle','Medical / Care Notes','Files','Timeline','Overview']){
 await page.locator(`[data-owned-profile-tab="${tab}"]`).click();
 assert(await page.locator('#ownedDogDetail').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'No mobile overflow '+tab);
}
await page.locator('#closeOwnedDogDialogButton').click();
await page.waitForTimeout(250);
assert(!await page.evaluate(()=>document.body.classList.contains('owned-dog-modal-open')));
await page.locator('#ownedDogMobileCards [data-action="view-owned"][data-id="qa-bark"]').click();
assert(await page.locator('[data-owned-profile-tab="Heat Cycle"]').isDisabled());
await page.locator('#closeOwnedDogDialogButton').click();await page.waitForTimeout(200);
await page.setViewportSize({width:1440,height:1000});
await page.locator('#ownedDogTableBody tr').first().waitFor();
await page.locator('#ownedDogTableBody [data-action="view-owned"][data-id="qa-blossom"]').click();
await page.locator('[data-owned-profile-tab="Exercise"]').click();
assert((await page.locator('#ownedWorkspaceReadPanel').innerText()).includes('12 minutes'));
await page.locator('[data-owned-workspace-action="edit"]').click();
assert.equal(await page.locator('#ourDogForm [name="lastExerciseDate"]').inputValue(),await page.evaluate(()=>todayDate()));
await page.locator('#closeOwnedDogDialogButton').click();await page.waitForTimeout(200);
for(const type of ['Scooter','Yard Run','Training','Bath','Medical/Behavior Note','Heat Note']) {
 await page.locator('#ownedDogTableBody [data-action="log-owned-care"][data-id="qa-blossom"]').click();
 await page.locator(`[data-owned-care-choice="${type}"]`).click();
 if(await page.locator('#detailDialog input[name="minutes"]').count())await page.locator('#detailDialog input[name="minutes"]').fill('10');
 if(await page.locator('#detailDialog textarea[name="note"]').count())await page.locator('#detailDialog textarea[name="note"]').fill('QA care record');
 await page.locator('#detailDialog button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('#detailDialog').innerText.includes('Logged'));
 await page.evaluate(()=>document.getElementById('detailDialog').close());await page.waitForTimeout(150);
}
await page.locator('#addOwnedDogButton').click();
await page.locator('#ourDogForm [name="callName"]').fill('QA disposable dog');
await page.locator('#ownedDogSex').selectOption('Male');
await page.locator('#ourDogForm [name="spayNeuterStatus"]').selectOption('Intact');
await page.locator('#ownedDogSaveButton').click();
await page.waitForFunction(()=>readRecords('ownedDog').some(d=>d.callName==='QA disposable dog'));
await page.waitForFunction(()=>document.querySelector('#detailDialog').innerText.includes('has been saved'));
await page.evaluate(()=>document.getElementById('detailDialog').close());await page.waitForTimeout(200);
page.once('dialog',d=>d.accept());
await page.locator('#deleteOwnedDogButton').click();
await page.waitForFunction(()=>document.querySelector('#detailDialog').innerText.includes('removed from the active'));
await page.evaluate(()=>document.getElementById('detailDialog').close());await page.waitForTimeout(200);
assert(!await page.locator('#ownedDogDetail').isVisible());
assert(!await page.evaluate(()=>document.body.classList.contains('owned-dog-modal-open')));
await page.evaluate(()=>{currentUser.role='staff';renderOwnedDogs()});
assert(!await page.locator('#addOwnedDogButton').isVisible());
await page.locator('#ownedDogTableBody [data-action="view-owned"][data-id="qa-blossom"]').click();
await page.locator('[data-owned-workspace-action="edit"]').click();
assert(!await page.locator('#deleteOwnedDogButton').isVisible());
await page.locator('#closeOwnedDogDialogButton').click();await page.waitForTimeout(200);
await page.evaluate(()=>{currentUser.role='admin';const base=readRecords('ownedDog')[0];writeRecords('ownedDog',Array.from({length:500},(_,i)=>({...base,id:'qa-scale-'+i,callName:'QA Dog '+String(i).padStart(3,'0'),removed:false})));ownedDogVisibleLimit=50;renderOwnedDogs();});
assert.equal(await page.locator('#ownedDogTableBody tr[data-id]').count(),50);
assert((await page.locator('#ownedDogListStatus').innerText()).includes('500'));
await page.locator('#ownedDogListStatus button').click();
assert.equal(await page.locator('#ownedDogTableBody tr[data-id]').count(),100);
await page.setViewportSize({width:390,height:844});
await page.locator('#ownedDogMobileCards .owned-modern-card').first().waitFor();
assert.equal(await page.locator('#ownedDogTableBody tr').count(),0);
assert.equal(await page.locator('#ownedDogMobileCards .owned-modern-card').count(),100);
await page.evaluate(()=>document.documentElement.dataset.theme='dark');
await page.locator('#ownedDogMobileCards [data-action="view-owned"]').first().click();
await page.screenshot({path:'/tmp/owned-profile-dark.png'});
await page.locator('[data-owned-profile-tab="Overview"]').focus();
await page.keyboard.press('ArrowRight');
assert.equal(await page.locator('[data-owned-profile-tab="Exercise"]').getAttribute('aria-selected'),'true');
assert.deepEqual(errors,[]);
console.log('PASS roster, filters, columns, 8 profile tabs, drafts, save, all 7 care types, mobile, close/reopen, female-only heat, add/delete, staff restrictions, keyboard navigation, 500 dogs bounded to 50/100 visible.');
}catch(e){await page.screenshot({path:'/tmp/owned-qa-error.png'});console.error(e);console.log((await page.locator('body').innerText()).slice(-8500));process.exitCode=1;}finally{await page.evaluate(()=>localStorage.clear());await browser.close();}
