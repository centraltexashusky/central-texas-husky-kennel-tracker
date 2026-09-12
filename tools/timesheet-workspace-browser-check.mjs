// Start the local app on port 8765. All tests use localTest and block production data requests.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1536,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*.supabase.co/**',r=>r.abort());
page.on('dialog',d=>d.accept());
const tab=async name=>{await page.locator(`[data-timesheet-tab="${name}"]`).click();};
try {
await page.goto('http://127.0.0.1:8765/?localTest=1&email=qa@example.invalid&role=admin#timesheetPage');
await page.waitForFunction(()=>typeof appInitialized!=='undefined'&&appInitialized&&typeof renderTimesheet==='function');
await page.evaluate(()=>{
 if(supabaseClient||!localTestMode)throw Error('Not isolated');
 document.getElementById('detailDialog').close();
 notifyIfNeeded=async()=>{};
 const start=timesheetDefaultRange().start;
 window.qaStart=start;
 const entries=Array.from({length:6},(_,i)=>({id:'qa-time-'+i,type:'timesheet',date:addDays(start,Math.floor(i/2)),helperName:i%2?'Casey':'Avery',helperEmail:i%2?'casey@example.invalid':'avery@example.invalid',clockInTime:addDays(start,Math.floor(i/2))+'T09:00:00',clockOutTime:addDays(start,Math.floor(i/2))+'T13:30:00',hours:4.5,note:''}));
 entries.push({id:'qa-open',type:'timesheet',date:todayDate(),helperName:'Avery',helperEmail:'avery@example.invalid',clockInTime:todayDate()+'T09:00:00',hours:0});
 writeRecords('timesheet',entries);
 writeRecords('staffSchedule',Array.from({length:6},(_,i)=>({id:'qa-shift-'+i,type:'staffSchedule',date:addDays(start,i),staffName:'Avery',staffEmail:'avery@example.invalid',startTime:'09:00',endTime:i===5?'15:30':'13:30',role:'Kennel care',status:'Scheduled'})));
 writeRecords('timeOffRequest',[{type:'timeOffRequest',id:'qa-off',staffName:currentUser.name,staffEmail:currentUser.email,startDate:addDays(start,10),endDate:addDays(start,10),reason:'Appointment',status:'Approved'},{type:'timeOffRequest',id:'qa-off-2',staffName:'Casey',staffEmail:'casey@example.invalid',startDate:addDays(start,12),endDate:addDays(start,12),reason:'Family day',status:'Pending'}]);
 writeRecords('kennelHoliday',[{id:'qa-holiday',type:'kennelHoliday',date:'2026-12-25',name:'Christmas Day',closed:true,staffingNote:'Confirm holiday coverage'}]);
 renderTimesheet();updateTimeDisplays();
});
await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-clock.png'});
assert.equal(await page.locator('#timesheetRows tr').count(),7);
assert((await page.locator('#timesheetVisibleSummary').innerText()).includes('27.00'));
await page.locator('#timesheetStaffFilter').selectOption('casey@example.invalid');
assert.equal(await page.locator('#timesheetRows tr').count(),3);
assert.equal(await page.evaluate(()=>timesheetRecordsForRange().length),3);
await page.locator('#timesheetStaffFilter').selectOption('');
await page.locator('#openTimesheetEditButton').click();await page.locator('#timesheetEditForm').waitFor();
await page.locator('#detailDialog').screenshot({path:'/tmp/timesheet-edit.png'});
await page.locator('#closeDetailDialog').click();
await tab('schedule');await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-schedule.png'});
assert.equal(await page.locator('#clockInButton').isVisible(),false);
for(const v of ['day','month','week'])await page.locator(`[data-staff-schedule-view="${v}"]`).click();
await page.locator('#openScheduleShiftButton').click();await page.locator('#scheduleShiftForm').waitFor();
await page.locator('#detailDialog').screenshot({path:'/tmp/timesheet-shift.png'});
await page.locator('#scheduleShiftForm [name="notes"]').fill('QA persisted shift');
await page.locator('#scheduleShiftForm button[type="submit"]').click();
await page.waitForFunction(()=>readRecords('staffSchedule').some(r=>r.notes==='QA persisted shift'));
if(await page.locator('#detailDialog').isVisible())await page.locator('#closeDetailDialog').click();
await page.locator('#publishScheduleButton').click();
await page.waitForFunction(()=>document.getElementById('staffSchedulePublishStatusLabel').textContent==='Published');
if(await page.locator('#detailDialog').isVisible())await page.locator('#closeDetailDialog').click();
await page.evaluate(()=>openScheduleShiftPopup(readRecords('staffSchedule').find(r=>r.notes==='QA persisted shift')));
await page.locator('#scheduleShiftForm [name="notes"]').fill('QA revised published shift');
await page.locator('#scheduleShiftForm button[type="submit"]').click();
await page.waitForFunction(()=>document.getElementById('staffSchedulePublishStatusLabel').textContent==='Changes Need Publishing');
if(await page.locator('#detailDialog').isVisible())await page.locator('#closeDetailDialog').click();
await page.locator('#openScheduleShiftButton').click();
await page.locator('#closeDetailDialog').click();
await tab('timeOff');await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-timeoff.png'});
assert.equal(await page.locator('#timeOffRequestList article').count(),2);
await page.locator('[data-time-off-filter="Pending"]').click();assert.equal(await page.locator('#timeOffRequestList article').count(),1);
await page.locator('[data-time-off-filter="Approved"]').click();
await page.evaluate(()=>{currentUser.role='staff';renderTimesheet()});
await page.locator('[data-action="revise-time-off"]').click();
assert((await page.locator('#timeOffRequestForm').innerText()).includes('Pending'));
await page.locator('#timeOffRequestForm [name="reason"]').fill('Appointment moved');
await page.locator('#timeOffRequestForm button[type="submit"]').click();
await page.waitForFunction(()=>readRecords('timeOffRequest').find(r=>r.id==='qa-off').status==='Pending');
if(await page.locator('#detailDialog').isVisible())await page.locator('#closeDetailDialog').click();
await page.locator('[data-time-off-filter="Pending"]').click();
await page.locator('[data-action="cancel-time-off-request"][data-id="qa-off"]').click();
await page.locator('#timeOffCancellationForm textarea').fill('No longer needed');
await page.locator('#timeOffCancellationForm button[type="submit"]').click();
await page.waitForFunction(()=>readRecords('timeOffRequest').find(r=>r.id==='qa-off').status==='Cancelled');
if(await page.locator('#detailDialog').isVisible())await page.locator('#closeDetailDialog').click();
await page.evaluate(()=>{currentUser.role='admin';renderTimesheet()});
for(const name of ['holidays','review','payroll']){await tab(name);await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-'+name+'.png'});}
await page.setViewportSize({width:390,height:844});
for(const name of ['schedule','timeOff','holidays','review','payroll']){
 await tab(name);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' must not overflow the mobile viewport');
 if(name==='schedule'){
  await page.locator('.timesheet-mobile-agenda button').first().click();
  assert(await page.locator('#staffScheduleDetailPanel').isVisible());
  await page.locator('[data-action="close-staff-schedule-detail"]').click();
  await page.locator('#timesheetPage').scrollIntoViewIfNeeded();
  await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-schedule-mobile.png'});
 }
}
await page.setViewportSize({width:390,height:844});await tab('clock');await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-mobile.png'});
assert(await page.locator('#timesheetRows tr').first().isVisible());
assert.equal(await page.locator('#timesheetTabs').evaluate(e=>getComputedStyle(e).flexDirection),'row');
assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.evaluate(()=>{currentUser.role='staff';currentUser.email='avery@example.invalid';currentUser.name='Avery';helperEmail.value=currentUser.email;helperName.value=currentUser.name;renderTimesheet();updateTimeDisplays()});
assert.equal(await page.locator('[data-timesheet-tab="payroll"]').isVisible(),false);
assert.equal(await page.locator('#timesheetStaffFilter').isVisible(),false);
assert.equal(await page.locator('#openTimesheetEditButton').isVisible(),false);
assert.equal(await page.locator('#timesheetRows tr').count(),4);
await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-staff-mobile.png'});
await page.evaluate(()=>document.documentElement.dataset.theme='dark');
await page.locator('#timesheetPage').screenshot({path:'/tmp/timesheet-dark.png'});
// Real local clock-out/in controls including exception confirmation, never live staff records.
await page.locator('#clockInButton').click();
if(await page.locator('#clockExceptionForm').isVisible()) {
 await page.locator('#clockExceptionForm textarea').fill('QA local clock-out');
 await page.locator('#clockExceptionForm button[type="submit"]').click();
}
await page.waitForFunction(()=>Boolean(readRecords('timesheet').find(r=>r.id==='qa-open').clockOutTime));
await page.locator('#clockInButton').click();
if(await page.locator('#clockExceptionForm').isVisible()) {
 await page.locator('#clockExceptionForm textarea').fill('QA local clock-in');
 await page.locator('#clockExceptionForm button[type="submit"]').click();
}
await page.waitForFunction(()=>Boolean(findOpenClockInForCurrentUser()));
await page.reload();await page.waitForFunction(()=>typeof renderTimesheet==='function'&&appInitialized);
assert.equal(await page.evaluate(()=>readRecords('timeOffRequest').find(r=>r.id==='qa-off').status),'Cancelled');
assert(await page.evaluate(()=>readRecords('staffSchedule').some(r=>r.notes==='QA revised published shift')));
assert(await page.evaluate(()=>readRecords('timesheet').find(r=>r.id==='qa-open').clockOutTime));
await page.evaluate(()=>{document.getElementById('detailDialog').close();document.documentElement.dataset.theme='light';});
await page.setViewportSize({width:1536,height:1100});
await page.evaluate(()=>switchPage('dashboardPage'));
await page.waitForTimeout(500);
const selectors=['#dashboardPage > .form-section','#dashboardTaskCalendar','.calendar-notes-panel','#dashboardReminderPanel','#dashboardTimelineSection'];
const positions=()=>page.evaluate(selectors=>selectors.map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [r.x,r.y,r.width,r.height]}),selectors);
const styled=await positions();
await page.evaluate(()=>document.querySelector('link[href^="timesheet-workspace.css"]').disabled=true);
assert.deepEqual(await positions(),styled,'Dashboard layout must be identical with and without the restyle');
await page.evaluate(()=>document.querySelector('link[href^="timesheet-workspace.css"]').disabled=false);
await page.locator('#dashboardPage').screenshot({path:'/tmp/dashboard-restyled.png',animations:'disabled'});
assert((await page.locator('#dashboardTimeline').innerText()).includes('Select a date'));
assert.deepEqual(errors,[]);
console.log('PASS: six tabs, totals, staff filter/export scope, shift save/publish/revise, time-off revise/cancel, staff privacy, clock out/in, persistence after reload, mobile cards, dark mode, exact Dashboard layout and lazy timeline, zero runtime errors.');
}finally{await browser.close()}
