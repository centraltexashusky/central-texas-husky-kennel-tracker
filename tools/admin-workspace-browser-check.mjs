import assert from 'node:assert/strict';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*.supabase.co/**',r=>r.abort());
const close = async()=>page.evaluate(()=>{if(document.querySelector('#detailDialog').open) document.querySelector('#closeDetailDialog').click();});
try {
 await page.goto('http://127.0.0.1:8765/?localTest=1&email=qa@example.invalid&role=admin#settingsHoursPage');
 await page.waitForFunction(()=>typeof renderOperationHoursSettings==='function' && localTestMode);
 await page.waitForTimeout(1600);
 await close();
 const monday=page.locator('[data-weekday="monday"]');
 await monday.locator('[data-operation-open-time]').fill('08:30');
 await monday.locator('[data-copy-weekday]').click();
 assert.equal(await page.locator('[data-weekday="friday"] [data-operation-open-time]').inputValue(),'08:30');
 assert.equal(await page.locator('[data-weekday="saturday"] [data-operation-open-time]').inputValue(),'09:00');
 await page.locator('[data-hours-tab="calendar"]').click();
 assert(await page.locator('#operationOverrideCalendar').isVisible());
 await page.locator('[data-hours-tab="weekly"]').click();
 assert.equal(await monday.locator('[data-operation-open-time]').inputValue(),'08:30');
 await page.locator('#saveOperationHoursButton').click();
 await page.waitForFunction(()=>operationHoursRecords().find(r=>r.weekday==='monday').windows?.[0]?.openTime==='08:30');
 await close();
 await page.waitForTimeout(3200);
 await page.locator('#settingsHoursPage').screenshot({path:'/tmp/admin-hours-desktop.png'});
 await page.evaluate(()=>{ location.hash='servicesPage'; });
 await page.waitForFunction(()=>typeof renderServices==='function' && document.querySelector('#servicesPage').classList.contains('is-active'));
 await page.evaluate(()=>{
  writeRecords('service',[
   {id:'qa-regular',type:'service',serviceName:'Overnight Boarding',category:'Boarding',basePrice:65,unit:'per day',pricingScope:'non-member',boardingRateType:'standard-boarding',boardingRateRole:'primary',flags:['Active']},
   {id:'qa-member',type:'service',serviceName:'Member Overnight Boarding',category:'Boarding',basePrice:45,unit:'per day',pricingScope:'member',boardingRateType:'standard-boarding',boardingRateRole:'primary',flags:['Active','Member Pricing']},
   {id:'qa-shared',type:'service',serviceName:'Shared crate',category:'Boarding',basePrice:25,unit:'per day',pricingScope:'member',boardingRateType:'standard-boarding',boardingRateRole:'shared-crate-additional',flags:['Active','Member Pricing']},
   {id:'qa-bath',type:'service',serviceName:'Premium Bath',category:'Grooming',basePrice:75,unit:'per service',pricingScope:'all',flags:['Active']}
  ]);renderServices();
 });
 assert.equal(await page.locator('#serviceTableBody tr').count(),4);
 await page.locator('#serviceCategoryFilter').selectOption('Grooming');
 assert.equal(await page.locator('#serviceTableBody tr').count(),1);
 await page.locator('#serviceSearch').fill('not a match');
 assert.match(await page.locator('#serviceTableBody').innerText(),/No services/);
 await page.locator('#serviceSearch').fill('');
 await page.locator('#serviceCategoryFilter').selectOption('');
 await page.locator('#servicesPage').screenshot({path:'/tmp/admin-services-desktop.png'});
 await page.locator('[data-action="edit-service"][data-id="qa-bath"]').click();
 await page.locator('#serviceForm [name="basePrice"]').fill('80');
 await page.locator('#serviceSaveButton').click();
 await page.waitForFunction(()=>readRecords('service').find(r=>r.id==='qa-bath').basePrice==80);
 await close();
 await page.evaluate(()=>location.hash='financialsPage');
 await page.waitForFunction(()=>typeof renderFinancials==='function' && typeof boardingDogPricingLines==='function');
 await page.evaluate(()=>{
  if(supabaseClient)throw Error('QA cannot use production');
  writeRecords('financialTransaction',[{id:'qa-income',type:'financialTransaction',entryType:'income',businessArea:'General',category:'Other',amount:200,transactionDate:todayDate(),description:'QA income'},{id:'qa-expense',type:'financialTransaction',entryType:'expense',businessArea:'General',category:'Other',amount:40,transactionDate:todayDate(),description:'QA expense'}]); renderFinancials();
 });
 await page.locator('[data-financial-range="month"]').click();
 assert.equal(await page.locator('#financialCards article').count(),9);
 await page.waitForTimeout(3200);
 await page.locator('#financialsPage').screenshot({path:'/tmp/admin-financials-desktop.png'});
 await page.locator('#financialCards article').first().getByRole('button').click();
 assert.equal(await page.locator('#financialTransactionTypeFilter').inputValue(),'income');
 const downloadPromise=page.waitForEvent('download'); await page.locator('#financialExportButton').click();
 const download=await downloadPromise; assert.match(download.suggestedFilename(),/^financial-transactions/);
 const pricing=await page.evaluate(()=>boardingDogPricingLines([{id:'a',pricingScopeOverride:'member'},{id:'b',pricingScopeOverride:'non-member'},{id:'c',pricingScopeOverride:'member'}],{user:{isMember:false},days:2,sharedCrateRequested:true}));
 assert.deepEqual(pricing.map(p=>p.total),[90,130,50]);
 assert.equal(await page.evaluate(()=>customerPricingScopeForDog({}, {isMember:true})),'non-member');
 const serviceOnly=await page.evaluate(()=>boardingDogPricingLines([{id:'a',pricingScopeOverride:'member'},{id:'b'}],{days:2,isServiceRequest:true}));
 assert(serviceOnly.every(p=>p.total===0));
 const escaped=await page.evaluate(()=>adminFinancialExportRows([{description:'=HYPERLINK("bad")',amount:10}])[0].Description);
 assert(escaped.startsWith("'="));
 await page.setViewportSize({width:390,height:844});
 for(const route of ['settingsHoursPage','servicesPage','financialsPage']) {
  await page.evaluate(r=>location.hash=r,route);await page.waitForTimeout(400);
  if(route==='financialsPage')await page.locator('[data-financial-view="overview"]').click();
  await page.locator('#'+route).screenshot({path:'/tmp/admin-'+route+'-mobile.png'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal page overflow: '+route);
 }
 assert.deepEqual(errors,[]);
 console.log('Admin desktop/mobile interactions, hours save, service save, ledger filters/export, mixed-dog and service-only pricing passed.');
} finally {await browser.close();}
