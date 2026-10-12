import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const raw = fs.readFileSync('js/boarding.js', 'utf8');
const source = vm.runInNewContext(raw.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)\(__snuggleStayModuleSource\);/)[1]);
const fn = name => source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0];
const now = '2026-10-12T18:00:00Z';
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
const active = {id:'current',requestCode:'BR-CURRENT',status:'In Kennel',dropoffTime:'2026-09-24T09:00:00-05:00',pickupTime:'2026-10-12T10:00:00-05:00',total:2900};
const future = {id:'future',requestCode:'BR-FUTURE',status:'Approved',dropoffTime:'2026-10-14T10:00:00-05:00',pickupTime:'2026-10-18T14:00:00-05:00',total:850};
const dog = {id:'dog',dogName:'Test dog',boardingStatus:'Approved',stays:[future,active],boardingPayments:[
  {id:'deposit',stayId:'current',requestCode:'BR-CURRENT',amount:1400},
  {id:'balance',stayId:'current',requestCode:'BR-CURRENT',amount:1500},
  {id:'cancelled',stayId:'future',requestCode:'BR-FUTURE',amount:850}
],boardingPaymentCancellations:[{paymentId:'cancelled',reason:'Cancelled'}]};
const ctx = {Date:Clock,activeBoardingStayStatuses:['Checked In','In Kennel','Ready For Pickup'],
  inactiveBoardingStayStatus:s=>['Cancelled','Checked Out'].includes(s.status),
  stayHasActualPickupEvidence:s=>Boolean(s.actualPickupAt||s.checkedOutAt||s.checkout?.verifiedAt),
  explicitBoardingStatus:s=>s||'',boardingActiveWindowStartTime:s=>s.actualDropoffAt||s.dropoffTime,
  boardingStayDisplayStatus:(_r,s)=>s.status,normalizeBoardingStatus:r=>r.boardingStatus,
  boardingStayByReference:(r,ref)=>r.stays.find(s=>s.id===ref.stayId||s.requestCode===ref.requestCode),
  boardingStayRequestCode:(_r,s)=>s.requestCode,boardingStayInvoiceTotal:(_r,s)=>s.total,
  readRecords:()=>[dog],currentRole:()=> 'admin',document:{addEventListener(){}},
  escapeHtml:s=>String(s||''),money:n=>'$'+Number(n).toLocaleString('en-US'),formatDateTime:s=>s,
  boardingStayServiceSummary:()=>[],boardingStayDataAttrs:(_r,s)=>` data-stay-id="${s.id}"`,
  boardingStayServiceStats:()=>({total:0,incompleteTasks:[]}),phoneLinkHtml:()=>'',
  boardingStayDetailCardHtml:(_r,s)=>`<article>${s.requestCode} Total $${s.total}</article>`,boardingStayBelongingsHtml:()=>''};
vm.createContext(ctx);
vm.runInContext(['activeBoardingStay','currentOrNextStay','boardingPrimaryStay','boardingPickupReviewHtml'].map(fn).join('\n'),ctx);
vm.runInContext(fs.readFileSync('js/boarding-payments.js','utf8'),ctx);
assert.equal(ctx.activeBoardingStay(dog).id,'current','Scheduled pickup passing must not select the next booking');
assert.equal(ctx.boardingPrimaryStay(dog).id,'current');
for (const status of ctx.activeBoardingStayStatuses) {
  assert.equal(ctx.activeBoardingStay({...dog,stays:[future,{...active,status}]}).id,'current');
}
assert.equal(ctx.activeBoardingStay({...dog,stays:[{...active,pickupTime:''}]}).id,'current','Unscheduled pickup stays active');
assert.equal(ctx.activeBoardingStay({...dog,stays:[future]}),null,'Approved future stay is not checked in');
assert.equal(ctx.activeBoardingStay({...dog,stays:[{...future,status:'In Kennel'}]}),null,'Future arrival is not active without actual check-in');
assert.equal(ctx.activeBoardingStay({...dog,stays:[{...future,status:'In Kennel',actualDropoffAt:'2026-10-12T08:00:00-05:00'}]}).id,'future','Actual early check-in is honored');
for (const departure of [{status:'Checked Out'},{actualPickupAt:now},{checkedOutAt:now},{checkout:{verifiedAt:now}}]) {
  assert.equal(ctx.activeBoardingStay({...dog,stays:[{...active,...departure}]}),null,'Departure evidence ends operational stay');
}
assert.equal(ctx.boardingPrimaryStay({...dog,stays:[future,{...active,status:'Checked Out',actualPickupAt:now}]}).id,'future');
const before=JSON.stringify(dog);
const html=ctx.boardingPickupReviewHtml(dog,{stayId:'current'});
for(const text of ['BR-CURRENT','Paid in full','Payments received','$2,900','Balance due','$0','data-stay-id="current"']) assert.ok(html.includes(text),text);
assert.ok(!html.includes('Record payment')&&!html.includes('Cancel payment'),'Review is read-only for payments');
assert.equal(ctx.boardingPaymentSummary(dog,future).paid,0,'Cancelled future receipt is excluded');
assert.equal(ctx.boardingPaymentSummary(dog,future).balance,850,'No current-stay credit leaks to future stay');
dog.boardingPayments=dog.boardingPayments.filter(p=>p.id!=='balance');
const partial=ctx.boardingPickupReviewHtml(dog,{stayId:'current'});
assert.ok(partial.includes('Partially paid')&&partial.includes('$1,500'));
dog.boardingPayments.splice(1,0,{id:'balance',stayId:'current',requestCode:'BR-CURRENT',amount:1500});
assert.equal(JSON.stringify(dog),before,'Rendering never changes receipts or stay statuses');
console.log('Passed: overdue active stays, future arrivals, departure evidence, paid/partial review and stay-isolated receipts.');
