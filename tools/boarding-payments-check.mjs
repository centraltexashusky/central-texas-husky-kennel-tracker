import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let records = [{ id:'dog', type:'boardingDog', dogName:'QA', stays:[{ id:'stay', requestCode:'BR-QA', status:'In Kennel', total:300 }, {id:'future',requestCode:'BR-FUTURE',status:'Approved',total:500}] }];
let role = 'admin';
const ctx = {
  document:{addEventListener(){}}, currentRole:()=>role, readRecords:()=>records,
  boardingStayRequestCode:(_r,s)=>s.requestCode,
  boardingStayInvoiceTotal:(_r,s)=>s.total,
  boardingStayDisplayStatus:(_r,s)=>s.status,
  boardingStayByReference:(r,ref)=>r.stays.find(s=>s.id===ref.stayId||s.requestCode===ref.requestCode),
  boardingDogRecordForDisplay:id=>records.find(r=>r.id===id),
  upsertRecord:(_type,r)=>{records=records.map(old=>old.id===r.id?r:old);return r;},
  currentUser:{name:'QA Admin'}, localTestMode:true, supabaseClient:null,
  todayDate:()=> '2026-09-27', renderBoardingStays(){},renderBoardingDogs(){},
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/boarding-payments.js','utf8'),ctx);
const summary = () => ctx.boardingPaymentSummary(records[0],records[0].stays[0]);
function form(amount, kind='Deposit', id='receipt-1', balance=300) {
  return {dataset:{dogId:'dog',stayId:'stay',requestCode:'BR-QA',paymentId:id,balance:String(balance)},elements:{
    amount:{value:String(amount)},kind:{value:kind},receivedDate:{value:'2026-09-27'},method:{value:'Zelle'},reference:{value:'QA only'},received:{checked:true}
  }};
}
assert.equal(summary().balance,300);
await ctx.saveBoardingPayment(form(100));
assert.equal(summary().balance,200);
assert.equal(summary().status,'Partially paid');
assert.equal(records[0].stays[0].status,'In Kennel');
await ctx.saveBoardingPayment(form(100));
assert.equal(summary().payments.length,1,'Retry cannot duplicate receipt');
assert.equal(ctx.boardingPaymentSummary(records[0],records[0].stays[1]).balance,500,'No credit across stays');
await assert.rejects(ctx.saveBoardingPayment(form(-1,'Deposit','bad',200)));
await assert.rejects(ctx.saveBoardingPayment(form(1.111,'Deposit','bad',200)));
await assert.rejects(ctx.saveBoardingPayment(form(201,'Deposit','bad',200)));
await assert.rejects(ctx.saveBoardingPayment(form(100,'Paid in full','bad',200)));
await assert.rejects(ctx.saveBoardingPayment(form(100,'Deposit','bad',300)),/balance changed/);
role='helper';await assert.rejects(ctx.saveBoardingPayment(form(100)),/administrator/);role='admin';
await ctx.saveBoardingPayment(form(200,'Paid in full','receipt-2',200));
assert.equal(summary().balance,0);assert.equal(summary().status,'Paid in full');
records[0].stays[0].total=350;
assert.equal(summary().balance,50,'New charges reopen only the unpaid difference');
records[0].stays[0].total=250;
assert.equal(summary().credit,50,'Price reduction preserves customer credit');
records[0].paymentStatus='Paid';records[0].paidAt='2026-09-27';
assert.equal(ctx.boardingPaymentSummary(records[0],records[0].stays[1]).balance,500,'Old top-level Paid flag cannot clear future bill');
records[0].stays[0].total=350;
const payload=records[0];
ctx.localTestMode=false;ctx.supabaseClient={};
let rejectCAS=false;
ctx.cuddleStayRequest=async callback=>callback({from:()=>({
  select:()=>({eq:()=>({in:async()=>({data:[{id:'dog',payload,updated_at:'revision-1'}]})})}),
  update:()=>({eq:()=>({eq:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({data:rejectCAS?null:{payload}})})})})})})
})});
rejectCAS=true;
await assert.rejects(ctx.saveBoardingPayment(form(50,'Prepayment','receipt-3',50)),/changed while saving/);
assert.equal(summary().payments.length,2,'Conflict does not create a local payment');
const cancelForm = {dataset:{dogId:'dog',stayId:'stay',requestCode:'BR-QA',paymentId:'receipt-2',amount:'200'},elements:{reason:{value:'Recorded in error'},confirmed:{checked:true}}};
await assert.rejects(ctx.cancelBoardingPayment(cancelForm),/changed while saving/);
assert.equal(summary().paid,300,'Failed cancellation cannot reduce paid balance');
ctx.localTestMode=true;
role='helper'; await assert.rejects(ctx.cancelBoardingPayment(cancelForm),/administrator/); role='admin';
cancelForm.elements.confirmed.checked=false; await assert.rejects(ctx.cancelBoardingPayment(cancelForm),/confirm/); cancelForm.elements.confirmed.checked=true;
await ctx.cancelBoardingPayment(cancelForm);
assert.equal(summary().paid,100); assert.equal(summary().balance,250);
assert.equal(summary().payments.length,2,'Cancelled receipt remains in audit history');
assert.equal(records[0].boardingPayments[1].amount,200,'Original receipt is immutable');
await ctx.cancelBoardingPayment(cancelForm);
assert.equal(records[0].boardingPaymentCancellations.length,1,'Retry cannot duplicate cancellation');
await ctx.cancelBoardingPayment({...cancelForm,dataset:{...cancelForm.dataset,paymentId:'receipt-1',amount:'100'}});
records[0].stays[0].paymentStatus='Paid';
assert.equal(summary().paid,0); assert.equal(summary().balance,350); assert.equal(summary().status,'Unpaid','All cancelled must not fall back to legacy Paid flag');
assert.equal(records[0].stays[0].status,'In Kennel');
assert.equal(ctx.boardingPaymentSummary(records[0],records[0].stays[1]).balance,500);
const workspace=fs.readFileSync('js/boarding-workspace.js','utf8');
assert(workspace.includes('boardingPaymentSummaryHtml(record, stay)'));
assert(!workspace.includes('data-action="checkout-paid-method"'),'Payment entry cannot implicitly check dog out');
assert(!fs.readFileSync('js/settings.js','utf8').includes('boardingPayments'),'Receipts are not double counted as revenue');
console.log('Boarding payment checks passed: deposit, partial/full balances, separate stays, idempotency, validation, permissions, price changes and concurrent-save rejection.');
