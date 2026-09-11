import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function source(path) {
  const text = fs.readFileSync(path, 'utf8');
  const wrapped = text.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/);
  return wrapped ? vm.runInNewContext(wrapped[1]) : text;
}
function fn(text, name) {
  const match = text.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}`));
  assert(match, name + ' must exist');
  return match[0];
}
for (const path of ['js/boarding.js', 'script.js']) {
  const text = source(path);
  const oldStay = { id:'old-stay', requestCode:'BR-QA', status:'Approved', pickupTime:'2026-09-16T16:00', invoiceAdjustments:[], pricingSnapshot:{total:340,calculatedAt:'old'} };
  const savedStay = { ...oldStay, id:'new-stay', status:'Checked In', pickupTime:'2026-09-17T16:00', invoiceAdjustments:[{amount:20},{amount:-5}], pricingSnapshot:{total:420,calculatedAt:'saved'} };
  const oldRecord = {id:'old',stays:[oldStay]};
  const savedRecord = {id:'new',stays:[savedStay]};
  const persisted=[];
  const context = {
    boardingLifecycleStatuses:['Checked In'],
    readRecords:()=>[oldRecord,savedRecord],
    boardingStayByReference:(r,s)=>r.stays.find(x=>x.requestCode===s.requestCode),
    boardingStayMatchesIdentity:(a,b)=>a.requestCode===b.requestCode,
    boardingStayNeedsDuplicateStatusSync:()=>true,
    boardingStaySourceIds:s=>[s.id,...(s.sourceStayIds||[])],
    // Emulate check-in repricing a stale duplicate with a later timestamp.
    withBoardingStatusTransition:r=>({...r,stays:r.stays.map(s=>({...s,status:'Checked In',pricingSnapshot:{total:340,calculatedAt:'later'}}))}),
    boardingDogForPersistence:r=>r,
    sendPayloadBatch:async rows=>persisted.push(...rows),
    upsertRecord:(_,r)=>r,
    sendPayload:async r=>persisted.push(r),
  };
  vm.createContext(context);
  vm.runInContext(fn(text,'syncDuplicateBoardingStayStatusRecords'),context);
  await context.syncDuplicateBoardingStayStatusRecords({...oldRecord,sourceRecordIds:['old','new']},savedRecord,oldStay,'Checked In');
  assert.equal(persisted.length,1);
  const result=persisted[0].stays[0];
  assert.equal(result.id,'old-stay','Preserve source stay identity');
  assert.equal(result.pickupTime,'2026-09-17T16:00','Keep staff schedule through check-in');
  assert.equal(result.pricingSnapshot.total,420,'Never restore old prices on duplicate status sync');
  assert.equal(result.pricingSnapshot.calculatedAt,'saved');
  assert.equal(result.invoiceAdjustments.length,2);
  assert.equal(oldStay.pricingSnapshot.total,340,'Do not mutate inputs');
  context.boardingLifecycleStatuses.push('Checked Out');
  savedRecord.checkoutNote = 'Owner collected leash';
  savedRecord.paymentStatus = 'Paid';
  savedRecord.paymentMethod = 'Zelle';
  savedRecord.paidAt = '2026-09-11T12:00:00Z';
  savedRecord.paidBy = 'QA staff';
  persisted.length = 0;
  await context.syncDuplicateBoardingStayStatusRecords({...oldRecord,sourceRecordIds:['old','new']},savedRecord,oldStay,'Checked Out');
  for (const key of ['checkoutNote','paymentStatus','paymentMethod','paidAt','paidBy']) {
    assert.equal(persisted[0][key],savedRecord[key],'Checkout metadata must survive duplicate synchronization');
  }
}
const boarding=source('js/boarding.js');
const workspace=source('js/boarding-workspace.js');
const index=source('index.html');
const css=source('boarding-workspace.css');
assert(fn(boarding,'openBoardingDog').includes('record.id ? "Boarding & Request" : "Dog Info"'));
assert(fn(boarding,'saveBoardingStayFromForm').includes('boardingEditorShowsRecord(record)'));
assert(workspace.includes('await handleBoardingTransition(dog, next, options)'));
assert(workspace.includes('openBoardingMedicalBehaviorNotePopup(dog, reference)'));
assert(workspace.includes("button.setAttribute('aria-selected', String(selected))"));
assert.equal((index.match(/data-workspace-icon=/g)||[]).length,9);
assert(css.includes('max-width:760px'));
assert(css.includes('grid-template-columns:minmax(0,1fr) 285px'));
assert(index.includes('js/boarding-workspace.js?v=boarding-workspace-v112'));
assert(source('js/main.js').includes('boarding-workspace-v112'));
for (const file of ['js/shared.js','script.js']) {
  const text = source(file);
  assert(fn(text,'paymentMethodHtml').includes('Pay &amp; Check-out'));
  assert(fn(text,'paymentMethodHtml').includes('name="checkoutNote"'));
}
assert(workspace.includes('boardingStayInvoiceSummaryHtml(record, stay, { final: true })'));
assert(workspace.includes('boarding-checkout-belongings-card'));
assert(css.includes('.checkout-invoice-columns'));
console.log('Boarding workspace checks passed: linked-editor refresh, duplicate check-in pricing, nine accessible tabs and mobile layout.');
