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
