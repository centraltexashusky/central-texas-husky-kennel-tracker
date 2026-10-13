import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('js/dog-show.js', 'utf8');
const records = {
  boardingDog: [
    {id:'stay-a', linkedCustomerDogId:'customer-a'},
    {id:'stay-b', sourceCustomerDogId:'customer-a', sourceBoardingDogId:'stay-a'},
    {id:'stay-c', sourceBoardingDogId:'stay-b'},
    {id:'other', linkedCustomerDogId:'customer-b'},
    {id:'conflict', linkedCustomerDogId:'customer-b', sourceCustomerDogId:'customer-a'},
    {id:'cycle-a', sourceBoardingDogId:'cycle-b'},
    {id:'cycle-b', sourceBoardingDogId:'cycle-a'},
  ],
  customerDog: [{id:'customer-a',sourceBoardingDogId:'stay-a'}],
  showEntry: ['stay-a','stay-b','stay-c','other'].map((dogId,i)=>({id:`entry-${i}`,dogId,dogType:'boardingDog',dogName:'Mango',showEventId:'show',updatedAt:`2026-09-${20+i}`})),
  showResult: [
    {id:'prior',recordKind:'careerProfile',dogKey:'boardingDog:stay-b',startingPoints:2},
    {id:'plan',recordKind:'showPlanner',dogKeys:['boardingDog:stay-a','boardingDog:stay-c']},
    ...['stay-a','stay-b','stay-c','other'].map((dogId,i)=>({id:`result-${i}`,dogId,dogType:'boardingDog',dogName:'Mango',showEntryId:`entry-${i}`,showEventId:'show',ringScheduleId:`ring-${i}`,pointsEarned:1,ringDate:'2026-09-20'})),
  ],
};
const ctx = {readRecords:type=>records[type]||[],dogShowEntryName:r=>r.dogName||'Dog',dogShowEvents:()=>[{id:'show',startDate:'2026-09-20'}]};
vm.createContext(ctx);
for (const name of ['dogShowRecords','dogShowProgressRecords','dogShowCanonicalDogKey','dogShowDogIdentity','dogShowAppearanceResultsAll','dogShowProgressDogs','dogShowCareerProfile','dogShowResultHistoryForDog','dogShowPointValue','dogShowMajorValue','dogShowDogProgress','dogShowPlannerRecord','dogShowPlannerTargetKey']) {
  vm.runInContext(source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0],ctx);
}
assert.equal(ctx.dogShowProgressDogs().length,2,'Three linked stays are one dog; unrelated namesake stays separate');
const mango = ctx.dogShowDogProgress(ctx.dogShowProgressDogs().find(d=>d.key==='customerDog:customer-a'));
assert.equal(mango.history.length,3,'All three stay-linked histories remain visible');
assert.equal(mango.totalPoints,5,'Prior points plus all logged appearances are retained');
assert.equal(ctx.dogShowCareerProfile(mango.key).id,'prior','Legacy baseline is reused, not duplicated');
assert.deepEqual([...ctx.dogShowPlannerRecord().dogKeys],['customerDog:customer-a'],'Saved planner selections remain selected');
assert.equal(ctx.dogShowPlannerTargetKey({targetType:'dog',dogKey:'boardingDog:stay-c'}),'dog:customerDog:customer-a');
for (const id of ['conflict','cycle-a','missing']) assert.equal(ctx.dogShowCanonicalDogKey(`boardingDog:${id}`),`boardingDog:${id}`);
assert.equal(ctx.dogShowDogIdentity({dogId:'owned',dogType:'ownedDog',dogName:'Mango'}),'ownedDog:owned');
assert.equal(ctx.dogShowCanonicalDogKey('customerDog:customer-a'),'customerDog:customer-a');
assert.equal(ctx.dogShowCanonicalDogKey(null),'');
records.boardingDog[0].removed=true;
assert.equal(ctx.dogShowCanonicalDogKey('boardingDog:stay-c'),'customerDog:customer-a','Retired source links still resolve history');
records.customerDog.push({id:'reverse',sourceBoardingDogId:'missing'});
assert.equal(ctx.dogShowCanonicalDogKey('boardingDog:missing'),'customerDog:reverse');
records.customerDog.push({id:'ambiguous',sourceBoardingDogId:'missing'});
assert.equal(ctx.dogShowCanonicalDogKey('boardingDog:missing'),'boardingDog:missing');
// Invoice selectors reuse explicit dog identity while retaining every original billing line.
for (const name of ['dogShowFinanceTotals','dogShowDogAttributableCostTotals','dogShowFinanceDogGroupKey','dogShowFinanceDogCostGroups','dogShowFinanceDogReportData','dogShowInvoiceCenterData','dogShowDogInvoiceLineItems','dogShowInvoiceSelection','dogShowInvoices','dogShowInvoiceBillingKeys','dogShowInvoiceLineBillingKeys','dogShowInvoiceIsActive','dogShowInvoiceState']) {
 vm.runInContext(source.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n\\}'))[0],ctx);
}
const group=(index,amount)=>({entry:records.showEntry[index],label:'Mango',transactions:[{id:`charge-${index}`,amount,entryType:'expense'}]});
const summaries=[{event:{id:'show-a'},dogGroups:[group(0,149.2),group(2,10)]},{event:{id:'show-b'},dogGroups:[group(1,149.2),group(3,900)]}];
ctx.dogShowEvents=()=>summaries.map(s=>s.event);
ctx.dogShowFinanceEventSummary=event=>summaries.find(s=>s.event.id===event.id);
ctx.dogShowFinanceReportGroups=()=>[{key:'2026',label:'2026',summaries}];
ctx.dogShowFinancePeriod='year';ctx.dogShowFinanceDogKey='boardingDog:stay-b';ctx.DOG_SHOW_FINANCE_DOG_KEY='test';
ctx.localStorage={setItem:(key,value)=>{ctx.savedSelection=value;}};
ctx.arrayValue=v=>Array.isArray(v)?v:[];
ctx.dogShowCustomerIdentity=()=>({key:'customer',email:'owner@example.invalid'});
const before=JSON.stringify(records);
const center=ctx.dogShowInvoiceCenterData('dog','year','boardingDog:stay-b');
assert.equal(center.targets.length,2,'Linked stays combine, but the unrelated namesake remains separate');
assert.equal(center.targetKey,'customerDog:customer-a','Old saved invoice selection follows the canonical dog');
assert.equal(center.targets.find(t=>t.key===center.targetKey).detail,'2 shows');
const report=ctx.dogShowFinanceDogReportData();
assert.equal(ctx.savedSelection,'customerDog:customer-a');
assert.equal(report.periods[0].matches.length,3,'Do not discard a second linked entry in the same show');
assert.equal(report.selected.costTotals.netCost,308.4);
const invoice=ctx.dogShowInvoiceSelection('dog','boardingDog:stay-a','2026','year');
assert.equal(invoice.lineItems.length,3);
assert.equal(invoice.lineItems.reduce((sum,line)=>sum+line.amount,0),308.4);
assert.deepEqual([...invoice.lineItems.map(l=>l.billingKey)],['show-a:entry-0','show-a:entry-2','show-b:entry-1']);
assert.equal(JSON.stringify(records),before,'Grouping never changes persisted records or charges');
records.showInvoice=[{id:'paid',status:'Paid',customerEmail:'owner@example.invalid',total:149.2,billingKeys:['show-b:entry-1']}];
const state=ctx.dogShowInvoiceState(invoice);
assert.equal(state.relatedInvoices.length,1,'Previously paid invoices still resolve using original billing keys');
assert.equal(state.billableLineItems.length,2,'Previously invoiced charges are not billed again');
console.log('PASS: canonical dog grouping, complete history/points and invoice lines, namesake separation, legacy selections, paid billing-key retention, conflicts and cycles.');
