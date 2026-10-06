import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let records=[{id:'workspace-branding',organizationName:'QA Kennel',agreementConfig:{signatureRequired:true},paymentMethods:{Zelle:{enabled:true,account:'qa@example.invalid'},Venmo:{enabled:false,link:'https://venmo.com/qa'}}}];
let role='admin', failed=false, payload;
const ctx={URL,Date,Object,String,document:{addEventListener(){}},readRecords:()=>records,currentRole:()=>role,
  escapeHtml:s=>String(s).replaceAll('<','&lt;').replaceAll('"','&quot;'),
  appBrandingConfig:()=>records[0],currentUser:{email:'qa@example.invalid'},localTestMode:false,supabaseClient:{},
  persistAppBrandingConfig:async r=>{payload=r;if(failed)throw new Error('Server rejected save');},
  upsertRecord:(_t,r)=>{records=[r];},boardingStayDisplayStatus:(_r,s)=>s.status,
  boardingPaymentSummary:(_r,s)=>({balance:s.balance}),boardingPaymentSummaryHtml:()=>'<p>Payment balance</p>',boardingStayInvoiceSummaryHtml:()=>'<div>Boarding: 5 nights × $54 = $270</div>',stayScheduleRangeLabel:()=> 'Sep 30–Oct 5',boardingStayRequestCode:()=> 'BR-QA'};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/payment-methods.js','utf8'),ctx);
assert.equal(ctx.acceptedPaymentLink('javascript:alert(1)'), '');
assert.equal(ctx.acceptedPaymentLink('http://venmo.com/qa'), '');
assert.equal(ctx.acceptedPaymentLink('https://secret:password@venmo.com/qa'), '');
assert.equal(ctx.customerStayPaymentHtml({}, {id:'s',status:'Pending',balance:100}), '');
assert.equal(ctx.customerStayPaymentHtml({}, {id:'s',status:'Cancelled',balance:100}), '');
assert(!ctx.customerStayPaymentHtml({}, {id:'s',status:'Approved',balance:0}).includes('How to pay'));
assert(ctx.customerStayPaymentHtml({}, {id:'s',status:'Approved',balance:100}).includes('How to pay'));
const form={querySelectorAll:()=>['Cash','Check','Zelle','Venmo','PayPal'].map(name=>({dataset:{paymentMethod:name},querySelector:selector=>({checked:name==='Cash',value:selector==='[name="instructions"]'?'QA instructions':''})}))};
const before=JSON.stringify(records);failed=true;
await assert.rejects(ctx.savePaymentMethodSettings(form),/Server rejected/);
assert.equal(JSON.stringify(records),before,'Failed remote save cannot publish local settings');
failed=false;await ctx.savePaymentMethodSettings(form);
assert.equal(payload.organizationName,'QA Kennel');assert.equal(payload.agreementConfig.signatureRequired,true);
assert.equal(records[0].paymentMethods.Cash.enabled,true);
role='customer';await assert.rejects(ctx.savePaymentMethodSettings(form),/administrators/);
console.log('Payment-method checks passed: safe links, bill status/balance, remote failure, preserved organization/agreement and admin-only writes.');

assert(ctx.customerStayPaymentHtml({}, {id:'s',status:'Approved',balance:100}).includes('5 nights'));
