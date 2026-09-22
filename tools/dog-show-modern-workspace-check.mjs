import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/dog-show.js','utf8');
const show={id:'weekend',startDate:'2026-09-20',endDate:'2026-09-22'};
const days=[20,21,22].map(day=>new Date(2026,8,day,12));
const entries=[{id:'social',dogName:'Social dog',attendanceRole:'Socializing',helperEmail:'a@example.invalid'}];
const tasks=[{id:'a-task',title:'A task',dueAt:'2026-09-21T10:00',assignedEmail:'a@example.invalid',status:'Open'},{id:'b-task',title:'B task',dueAt:'2026-09-21T11:00',assignedEmail:'b@example.invalid',status:'Completed'}];
const ctx={dogShowScheduleStaff:'',dogShowTaskAssignee:'',dogShowTaskFilter:'all',currentUser:{email:'a@example.invalid'},dogShowCalendarView:'agenda',dogShowCalendarDate:'2026-09-21',DOG_SHOW_CALENDAR_SLOT_MINUTES:15,dogShowCalendarDays:()=>[days[1]],dogShowShowDays:()=>days,dogShowEntries:()=>entries,dogShowTasks:()=>tasks,normalizeEmail:v=>String(v||'').trim().toLowerCase(),dogShowDateKey:d=>{d=new Date(d);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`},dogShowEntryName:e=>e.dogName,dogShowStaffLabel:String,escapeHtml:String,dogShowFormatTime:String,dogShowFormatDate:String,dogShowFormatDateTime:String,dogShowTaskDurationMinutes:()=>30,dogShowCalendarTaskEntry:()=>null,dogShowPhotoHtml:e=>e.dogName,dogShowTaskColorStyle:()=>'',dogShowRenderEmpty:title=>title};
vm.createContext(ctx);
for(const name of ['dogShowCalendarHtml','dogShowTaskMatchesFilter'])vm.runInContext(source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0],ctx);
let html=ctx.dogShowCalendarHtml(show);
assert(html.includes('Social dog'),'Socializing attendance must appear on the second day of a multi-day show');
assert(html.includes('data-id="a-task"')&&html.includes('data-id="b-task"'),'Agenda includes open and completed tasks with actionable IDs');
ctx.dogShowScheduleStaff='B@EXAMPLE.INVALID';html=ctx.dogShowCalendarHtml(show);
assert(!html.includes('Social dog')&&!html.includes('data-id="a-task"')&&html.includes('data-id="b-task"'),'Staff filter isolates only assigned work');
ctx.dogShowTaskAssignee='a@example.invalid';assert(ctx.dogShowTaskMatchesFilter(tasks[0]));assert(!ctx.dogShowTaskMatchesFilter(tasks[1]));
ctx.dogShowTaskAssignee='';ctx.dogShowTaskFilter='completed';assert(!ctx.dogShowTaskMatchesFilter(tasks[0]));assert(ctx.dogShowTaskMatchesFilter(tasks[1]));
ctx.dogShowTaskFilter='mine';assert(ctx.dogShowTaskMatchesFilter(tasks[0]));assert(!ctx.dogShowTaskMatchesFilter(tasks[1]));
// Dogs without assigned ring times must keep their identity and photo in the agenda.
ctx.dogShowScheduleStaff='';entries.push({id:'unscheduled',dogName:'Awaiting ring',attendanceRole:'Showing'});
Object.assign(ctx,{dogShowRingSchedules:()=>[{id:'ring',ringDate:'2026-09-21'}],dogShowPrepTimes:()=>({}),dogShowCalendarRingTitle:()=> 'Ring --',dogShowPhotoHtml:e=>`<img alt="${e.dogName}">`});
html=ctx.dogShowCalendarHtml(show);assert(html.includes('<img alt="Awaiting ring">')&&html.includes('<strong>Awaiting ring</strong>'),'Unscheduled dogs retain photo identity');
// The selected-day calendar must not leak other dates' scheduled or potential shows.
Object.assign(ctx,{dogShowMasterDate:()=>days[1],dogShowEvents:()=>[{id:'today',name:'Today event',...show},{id:'later',name:'Later event',startDate:'2026-09-25',endDate:'2026-09-26'}],dogShowEntries:()=>[],dogShowPlannerDateRange:e=>e.startDate,dogShowMasterCalendarEventStatus:()=> 'Active',dogShowMasterCalendarItemHtml:i=>i.title});
vm.runInContext(source.match(/function dogShowMasterCalendarListHtml\([\s\S]*?\n\}/)[0],ctx);
html=ctx.dogShowMasterCalendarListHtml([{kind:'potential',title:'Later potential',startDate:'2026-09-25',endDate:'2026-09-25'}],'2026-09-21');
assert(html.includes('Today event')&&!html.includes('Later event')&&!html.includes('Later potential'));
html=ctx.dogShowMasterCalendarListHtml([],'2026-09-24');assert(html.includes('No scheduled shows on this date'));
console.log('Modern Dog Shows checks passed: multi-day attendance, actionable agenda, staff/task filters, and selected-date isolation.');

// Calendar removal targets the selected record, including duplicate imported shows.
const scheduled=[{id:'duplicate-a',name:'Same club',startDate:'2026-10-16'},{id:'duplicate-b',name:'Same club',startDate:'2026-10-16'}];
const writes=[];let confirmed=false;let cleared=false;
Object.assign(ctx,{currentRole:()=> 'admin',currentUser:{name:'QA',email:'qa@example.invalid'},dogShowEvents:()=>scheduled,window:{confirm:()=>confirmed},showToast:()=>{},dogShowPlannerDateRange:event=>event.startDate,saveDogShowRecord:async(type,record)=>writes.push({type,record}),DOG_SHOW_EVENT_KEY:'active',localStorage:{getItem:()=> 'duplicate-a',removeItem:()=>{cleared=true}},renderDogShow:()=>{}});
vm.runInContext(source.match(/async function removeDogShowCalendarEvent\([\s\S]*?\n\}/)[0],ctx);
await ctx.removeDogShowCalendarEvent('duplicate-a');assert.equal(writes.length,0,'Cancel leaves the show untouched.');
confirmed=true;await ctx.removeDogShowCalendarEvent('duplicate-a');
assert.equal(writes.length,1);assert.equal(writes[0].type,'showEvent');assert.equal(writes[0].record.id,'duplicate-a');assert.equal(writes[0].record.removed,true);assert.equal(cleared,true);
assert.equal(scheduled[1].removed,undefined,'Other copies of a show must remain scheduled.');
assert(writes.every(write=>write.type==='showEvent'),'Removal must retain child care, result, and financial records.');
ctx.currentRole=()=> 'customer';await ctx.removeDogShowCalendarEvent('duplicate-b');assert.equal(writes.length,1,'Customers cannot remove staff shows.');
console.log('Calendar removal checks passed: exact event ID, cancellation, role gate, active selection, and retained history.');
