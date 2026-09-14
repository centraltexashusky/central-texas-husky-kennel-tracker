// Isolated local fixtures only; never reads or writes production payroll.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1361,height:1144},timezoneId:'America/Chicago'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*.supabase.co/**',r=>r.abort());
try {
 await page.clock.install({time:new Date('2026-09-14T17:00:00Z')});
 await page.goto('http://127.0.0.1:8765/?localTest=1&email=qa@example.invalid&role=admin#timesheetPage');
 await page.waitForFunction(()=>typeof appInitialized!=='undefined'&&appInitialized&&typeof renderTimesheet==='function');
 await page.evaluate(()=>{
  if(supabaseClient||!localTestMode)throw Error('Not isolated');
  document.getElementById('detailDialog').close();
  writeRecords('settingsUser',[{id:'qa-user-a',role:'staff',name:'Avery',email:'avery@example.invalid',hourlyRate:10},{id:'qa-user-b',role:'staff',name:'Avery',email:'other@example.invalid',hourlyRate:15}]);
  const entry=(id,date,hours,extra={})=>({id,type:'timesheet',date,helperName:'Avery',helperEmail:'avery@example.invalid',clockInTime:date+'T09:00:00-05:00',clockOutTime:date+'T14:00:00-05:00',hours,note:'Care & cleaning <not markup>',...extra});
  writeRecords('timesheet',[entry('a','2026-09-07',4.871),entry('b','2026-09-13',4.872),entry('c','2026-09-14',2),entry('d','2026-09-06',3),entry('e','2026-09-08',8,{removed:true}),entry('f','2026-09-09',8,{clockOutTime:''}),entry('g','2026-09-10',5,{helperEmail:'other@example.invalid'}),entry('h','2026-09-11',1,{helperName:'No Rate',helperEmail:'missing@example.invalid'})]);
  window.payrollBefore=JSON.stringify(readRecords('timesheet'));
  renderTimesheet();
 });
 await page.locator('[data-timesheet-tab="payroll"]').click();
 await page.locator('#lastWeekPayrollDateFilterButton').click();
 assert.equal(await page.locator('#payrollStartDate').inputValue(),'2026-09-07');
 assert.equal(await page.locator('#payrollEndDate').inputValue(),'2026-09-13');
 await page.locator('#lastWeekPayrollDateFilterButton').click();
 assert.equal(await page.locator('#payrollStartDate').inputValue(),'2026-09-07');
 const employee=page.locator('[data-payroll-staff="avery@example.invalid"]');
 assert((await employee.locator('..').locator('..').innerText()).includes('9.74'));
 await employee.focus();await page.keyboard.press('Enter');
 const detail=page.locator('.payroll-hours-detail');
 assert.equal(await detail.locator('tbody tr').count(),2);
 assert((await detail.innerText()).includes('$97.40'));
 assert((await detail.innerText()).includes('Care & cleaning <not markup>'));
 assert.equal(await detail.locator('not').count(),0);
 assert((await detail.innerText()).includes('9:00 AM'));
 await page.locator('#detailDialog').screenshot({path:'/tmp/payroll-hours-desktop.png'});
 await page.locator('#closeDetailDialog').click();
 await page.locator('[data-payroll-staff="missing@example.invalid"]').click();
 assert((await detail.innerText()).includes('Not set'));
 await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});
 await employee.click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert(await detail.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await page.locator('#detailDialog').screenshot({path:'/tmp/payroll-hours-mobile.png'});
 await page.locator('#closeDetailDialog').click();
 await page.locator('#resetPayrollDateFilterButton').click();
 assert.equal(await page.locator('#payrollStartDate').inputValue(),'2026-09-14');
 await employee.click();assert.equal(await detail.locator('tbody tr').count(),1);
 assert((await detail.innerText()).includes('2.00'));
 await page.locator('#closeDetailDialog').click();
 await page.locator('#payrollStartDate').fill('2026-09-13');await page.locator('#payrollEndDate').fill('2026-09-07');
 await page.locator('#applyPayrollDateFilterButton').click();
 await employee.click();assert.equal(await detail.locator('tbody tr').count(),2);
 await page.locator('#closeDetailDialog').click();
 // Year and DST transitions still select the previous Monday-Sunday.
 for(const [now,start,end] of [['2027-01-04T18:00:00Z','2026-12-28','2027-01-03'],['2026-03-09T17:00:00Z','2026-03-02','2026-03-08']]){
  await page.clock.setSystemTime(new Date(now));
  await page.locator('#lastWeekPayrollDateFilterButton').click();
  assert.equal(await page.locator('#payrollStartDate').inputValue(),start);
  assert.equal(await page.locator('#payrollEndDate').inputValue(),end);
 }
 assert(await page.evaluate(()=>JSON.stringify(readRecords('timesheet'))===window.payrollBefore));
 await page.evaluate(()=>{currentUser.role='staff';renderTimesheet();openPayrollStaffHours('avery@example.invalid');});
 assert.equal(await page.locator('#detailDialog').isVisible(),false);
 assert.equal(await page.locator('[data-timesheet-tab="payroll"]').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: Last Week/This Week, year and DST boundaries, custom/reversed ranges, employee isolation, matching rounded totals, missing rates, open/removed exclusion, escaped notes, keyboard and close/reopen, mobile overflow, staff privacy, no payroll mutations, zero runtime errors.');
}finally{await browser.close();}
