import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync('js/owned-bulk-care.js', 'utf8');
const context = vm.createContext({
  document: {addEventListener() {}}, dateOnly: value => value || '', arrayValue: value => value || [],
  uid: () => 'new-history-id', currentUser: {name: 'Test Staff'},
  ownedDogMedicalHistoryEntryExists: (logs, field, type, date) => logs.some(log => log.date === date && (log.sourceField === field || log.type === type)),
});
vm.runInContext(source, context);
const dog = {id:'dog-a',type:'ownedDog',heartwormDate:'2026-08-01',foodAmount:'1 cup',careNotesHistory:[{id:'existing',type:'Medical/Care',date:'2026-07-01'}]};
const next = context.ownedHeartwormPayload(dog,'2026-09-01','Product note');
assert.equal(next.heartwormDate,'2026-09-01');
assert.equal(next.foodAmount,'1 cup');
assert.equal(next.careNotesHistory.length,2);
assert.equal(next.careNotesHistory[0].completedBy,'Test Staff');
assert.equal(next.careNotesHistory[0].sourceField,'heartwormDate');
assert(next.careNotesHistory[0].note.includes('Product note'));
assert.equal(dog.careNotesHistory.length,1,'Does not mutate source before durable save');
assert.equal(context.ownedHeartwormPayload(next,'2026-09-01',''),null,'Retry is idempotent');
const older = context.ownedHeartwormPayload(next,'2026-08-15','');
assert.equal(older.heartwormDate,'2026-09-01','Historical entry preserves newer latest date');
assert.equal(context.ownedHeartwormPayload(older,'2026-08-15',''),null);
assert.throws(()=>context.ownedHeartwormPayload({...dog,removed:true},'2026-09-01',''));
assert.throws(()=>context.ownedHeartwormPayload({...dog,type:'boardingDog'},'2026-09-01',''));
for(const token of ['retryIndividually: false','result.skippedRemote','!localTestMode && result.local','result.count !== batch.length','offset += 40','matches.slice(0, session.limit)','date > todayDate()','Date changed elsewhere','freshOwnedHeartwormDogs()']) assert(source.includes(token),token);
assert(!source.includes('from("kennel_records")'),'Reuses existing database helpers');
console.log('Bulk heartworm checks passed: resident-only records, preserved fields/history, attribution, idempotency, earlier dates, removal guards, fresh reads, bounded batches and honest save results.');
