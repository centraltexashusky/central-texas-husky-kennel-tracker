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
records.boardingDog[0].removed=true;
assert.equal(ctx.dogShowCanonicalDogKey('boardingDog:stay-c'),'customerDog:customer-a','Retired source links still resolve history');
records.customerDog.push({id:'reverse',sourceBoardingDogId:'missing'});
assert.equal(ctx.dogShowCanonicalDogKey('boardingDog:missing'),'customerDog:reverse');
records.customerDog.push({id:'ambiguous',sourceBoardingDogId:'missing'});
assert.equal(ctx.dogShowCanonicalDogKey('boardingDog:missing'),'boardingDog:missing');
console.log('PASS: canonical dog grouping, complete history/points, legacy baseline/planner compatibility, namesake separation, conflicts, missing links and cycles.');
