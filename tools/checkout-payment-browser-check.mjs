import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
await page.route('**/*.supabase.co/**',r=>r.abort());
try {
 await page.goto((process.env.BASE_URL||'http://127.0.0.1:8766/')+'?localTest=1&email=admin-qa@example.invalid&role=admin#boardingDogsPage');
 await page.waitForFunction(()=>typeof boardingWorkspaceCheckoutInvoiceHtml==='function'&&localTestMode);
 await page.evaluate(()=>{
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 const stay={id:'checkout-qa-stay',requestCode:'BR-CHECKOUT-QA',status:'Ready For Pickup',dropoffTime:'2026-10-01T10:00',pickupTime:'2026-10-05T10:00',pricingSnapshot:{version:'boarding-rate-v2',total:300,lineItems:[{type:'boarding',label:'Boarding',quantity:4,unitPrice:75,amount:300}]},requests:[]};
 const record={id:'checkout-qa-dog',type:'boardingDog',dogName:'Checkout QA',ownerEmail:'qa@example.invalid',boardingStatus:'Ready For Pickup',stays:[stay],boardingPayments:[{id:'deposit',stayId:stay.id,requestCode:stay.requestCode,amount:100}]};
 upsertRecord('boardingDog',record);openCheckoutInvoicePopup(record,{stayId:stay.id});
 });
 assert(await page.locator('[data-action="confirm-check-out"]').isDisabled());
 await page.locator('#checkoutNote').fill('QA pickup note');
 await page.getByRole('button',{name:'Confirm payment received',exact:true}).click();
 const form=page.locator('#boardingPaymentForm');
 assert.equal(await form.locator('[name="amount"]').inputValue(),'200.00');
 assert.equal(await form.locator('[name="kind"]').inputValue(),'Paid in full');
 assert(!(await form.locator('[name="received"]').isChecked()));
 await form.locator('[name="method"]').selectOption('Cash');
 await form.locator('[name="received"]').check();
 await form.evaluate(f=>f.requestSubmit());
 await page.locator('[data-action="confirm-check-out"]').waitFor();
 assert(await page.locator('[data-action="confirm-check-out"]').isEnabled());
 assert.equal(await page.locator('#checkoutNote').inputValue(),'QA pickup note');
 const receipts=await page.evaluate(()=>readRecords('boardingDog').find(r=>r.id==='checkout-qa-dog').boardingPayments);
 assert.equal(receipts.length,2);assert.equal(receipts[1].amount,200);
 console.log('Checkout browser checks passed: partial deposit leaves remaining balance; checkout blocked until explicit receipt; full remaining payment saved and note preserved.');
} finally {await browser.close();}
