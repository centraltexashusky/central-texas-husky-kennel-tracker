import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const timesheet=fs.readFileSync('js/timesheet.js','utf8');
const source=vm.runInNewContext(timesheet.match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
let records={settingsUser:[{id:'staff-a',type:'settingsUser',name:'Avery',email:'a@example.invalid',role:'staff',hourlyRate:10}],timesheet:[]};
const context=vm.createContext({
  document:{addEventListener(){}}, Intl, Date, structuredClone,
  currentRole:()=> 'admin', currentUser:{email:'admin@example.invalid'},localTestMode:true,
  readRecords:type=>records[type]||[],writeRecords:(type,rows)=>records[type]=rows,
  isStaffRole:role=>['staff','helper','admin'].includes(role),
  normalizeEmail:value=>String(value||'').trim().toLowerCase(),normalizeHelperName:value=>String(value||'').trim().toLowerCase(),
  dateOnly:value=>String(value||'').slice(0,10),localDateFromStoredDateTime:value=>String(value).slice(0,10),
  timesheetBelongsToCurrentUser:()=>false,
  addDays:(value,days)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);},
});
vm.runInContext(source,context);
vm.runInContext(fs.readFileSync('js/payroll-history.js','utf8'),context);
const user=records.settingsUser[0];
user.hourlyRate=20;
user.hourlyRateHistory=[{effectiveDate:'1900-01-01',rate:10,baseline:true},{effectiveDate:'2026-11-04',rate:20},{effectiveDate:'2027-01-01',rate:25}];
assert.equal(context.payrollRateOnDate(user,'2026-11-03'),10);
assert.equal(context.payrollRateOnDate(user,'2026-11-04'),20);
assert.equal(context.payrollRateOnDate(user,'2027-01-01'),25);
assert.equal(context.payrollAmountCents(1.13,42.5),4803,'Half cents round consistently with the database.');
assert.equal(context.payrollWeekStart('2026-11-01'),'2026-10-26','DST Sunday stays in the correct Chicago calendar week.');
assert.equal(context.payrollWeekStart('2026-11-02'),'2026-11-02');
records.timesheet=[['a','2026-11-02',1.25],['b','2026-11-04',2.5]].map(([id,date,hours])=>({id,type:'timesheet',date,hours,helperName:'Avery',helperEmail:user.email,clockInTime:date+'T09:00:00-06:00',clockOutTime:date+'T12:00:00-06:00'}));
let summary=context.staffPayrollSummaryForRange({start:'2026-11-02',end:'2026-11-08'},{includeAll:true});
assert.equal(summary.totalPayroll,62.5);
assert.equal(summary.staff[0].rates.length,2);
const snapshot=context.payrollLocalPreview(user.id,'2026-11-02');
assert.equal(snapshot.amountCents,6250);
const state=context.payrollReceiptCache();state.loaded=true;state.rows=[{id:'paid-a',staff_id:user.id,week_start:'2026-11-02',paid_date:'2026-11-09',snapshot,amount_cents:6250}];
user.hourlyRateHistory.push({effectiveDate:'2026-11-01',rate:50});
records.timesheet[0].hours=100; // Even a stale or corrupt source cannot reprice a payment snapshot.
summary=context.staffPayrollSummaryForRange({start:'2026-11-02',end:'2026-11-08'},{includeAll:true});
assert.equal(summary.totalPayroll,62.5);assert.equal(summary.totalHours,3.75);assert(summary.entries.every(row=>row.paid));
records.timesheet.push({...records.timesheet[0],id:'late',hours:1,date:'2026-11-03'});
const supplemental=context.payrollLocalPreview(user.id,'2026-11-02');
assert.equal(supplemental.lines.length,1);assert.equal(supplemental.amountCents,5000);
assert.equal(context.staffPayrollUserForRecord({helperEmail:'unknown@example.invalid',helperName:'Avery'}).id,undefined,'A matching name must not override a conflicting email.');
records.settingsUser.push({...user,id:'other',email:'other@example.invalid'});
assert.equal(context.staffPayrollUserForRecord({helperName:'Avery'}).id,undefined,'Ambiguous names must not guess an employee.');
records.timesheet.push({...records.timesheet[0],id:'open',clockOutTime:'',hours:0});
assert.throws(()=>context.payrollLocalPreview(user.id,'2026-11-02'),/open clock/);
assert.equal(context.payrollReceiptOwner(),'admin@example.invalid:true');
context.currentRole=()=> 'staff';
assert.equal(context.payrollReceiptCache().rows.length,0,'Changing roles clears sensitive payment cache.');
console.log('Payroll history checks passed: effective dates, mixed rates, fixed paid snapshots, supplemental hours, identity, open clocks and account privacy.');

// Bulk confirmations validate every selected week before any local fixture write.
vm.runInContext(fs.readFileSync('js/payroll-bulk.js','utf8'),context);
context.currentRole=()=> 'admin';
user.hourlyRate=10;user.hourlyRateHistory=[];records.settingsUser=[user];
records.timesheet=['2026-10-12','2026-10-19'].map((date,i)=>({id:'bulk-'+i,type:'timesheet',date,hours:i+1,helperName:user.name,helperEmail:user.email,clockInTime:date+'T09:00:00-05:00',clockOutTime:date+'T11:00:00-05:00'}));
let stored='[]';context.localStorage={getItem:()=>stored,setItem:(_key,value)=>{stored=value;}};
await context.ensurePayrollPaymentsLoaded(true);
const items=records.timesheet.map(row=>({staffId:user.id,weekStart:row.date}));
const snapshots=await context.payrollBulkFetchPreview(items);
context.payrollBulkVerifyPreviews(items,snapshots);
assert.equal(snapshots.reduce((sum,row)=>sum+row.amountCents,0),3000);
assert.throws(()=>context.payrollBulkValidateSelection([items[0],items[0]]),/more than once/);
assert.throws(()=>context.payrollBulkValidateSelection(Array(51).fill(items[0])),/between 1 and 50/);
assert.throws(()=>context.payrollBulkValidateSelection([{staffId:user.id,weekStart:context.payrollWeekStart(context.payrollToday())}]),/past payroll/);
const rows=snapshots.map((snapshot,i)=>({id:'bulk-receipt-'+i,staff_id:snapshot.staffId,week_start:snapshot.weekStart,paid_date:'2026-11-01',payment_method:'Check',reference:'QA-'+i,note:'QA only',snapshot}));
records.timesheet[1].hours=3;
await assert.rejects(context.payrollBulkPersist(rows),/changed since review/);
assert.equal(stored,'[]','A stale second week cannot save the first week.');
records.timesheet[1].hours=2;
await context.payrollBulkPersist(rows);
assert.equal(JSON.parse(stored).length,2);
assert.equal(context.payrollReceiptCache().rows.reduce((sum,row)=>sum+row.amount_cents,0),3000);
await assert.rejects(context.payrollBulkPersist(rows),/no unpaid completed hours/);
assert.equal(JSON.parse(stored).length,2,'Retry does not duplicate receipts.');
records.timesheet.push({...records.timesheet[0],id:'bulk-late',hours:0.5});
const extra=await context.payrollBulkFetchPreview([items[0]]);
assert.equal(extra[0].lines.length,1,'Previously paid clocks are excluded from supplemental bulk review.');
assert.equal(extra[0].amountCents,500);
context.payrollBulkSelection.add('old-hidden-key');context.payrollBulkSync([]);
assert.equal(context.payrollBulkSelection.size,0,'Hidden and paid selections are pruned.');
context.currentRole=()=> 'staff';
await assert.rejects(context.payrollBulkPersist(rows),/Admin access/);
console.log('Bulk payroll checks passed: bounded past selections, duplicate exclusion, atomic failure, separate receipts, retry safety and admin access.');
