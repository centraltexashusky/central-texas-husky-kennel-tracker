import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let role='admin';const records={ownedDog:[],dailyTask:[]};
const c={console,Intl,Date,Number,JSON,Error,document:{addEventListener(){}},arrayValue:v=>Array.isArray(v)?v:[],escapeHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),currentRole:()=>role,currentUser:{email:'admin@example.invalid'},localTestMode:true,readRecords:t=>records[t]||[]};vm.createContext(c);vm.runInContext(fs.readFileSync('js/care-history.js','utf8'),c);
const entry={id:'1',date:'2026-01-01',note:'one\ntwo',createdAt:'2026-01-03T18:00:00Z',completedBy:'Original',mediaItems:[{name:'photo'}]};const sibling={...entry,id:'2',note:'same day'};records.ownedDog=[{id:'dog',type:'ownedDog',careNotesHistory:[entry,sibling],other:'keep'}];
const session={dogId:'dog',field:'careNotesHistory',index:0,expected:entry};
for(const r of ['staff','helper','manager','customer','']){role=r;assert.equal(c.ownedCareHistoryEditButtonHtml({historyDogId:'dog',historyField:'careNotesHistory',historyIndex:0}),'');await assert.rejects(c.persistOwnedCareHistoryEdit(session,'denied',null),/Only admins/);}
role='admin';const result=await c.persistOwnedCareHistoryEdit(session,'<script>x</script>\nchanged',null);const next=result.dog.careNotesHistory[0];assert.equal(next.createdAt,entry.createdAt);assert.equal(next.completedBy,entry.completedBy);assert.equal(next.date,entry.date);assert.equal(next.editHistory[0].note,entry.note);assert.equal(JSON.stringify(result.dog.careNotesHistory[1]),JSON.stringify(sibling));assert.equal(records.ownedDog[0].careNotesHistory[0].note,entry.note,'no optimistic mutation');
assert(c.careHistoryEqual({a:1,b:{c:2,d:3}},{b:{d:3,c:2},a:1}));
assert.throws(()=>c.ownedCareHistoryEntry(result.dog,'careNotesHistory',0,entry),/history changed/);
assert.equal(c.careLogEnteredAt({date:'2020-01-01',updatedAt:'2026-10-11T12:00:00Z'}),'');assert.equal(c.careLogEnteredAt({loggedAt:'2020-01-01'}),'');assert(c.careLogEntryMetadataHtml({date:'2020-01-01'}).includes('Time not recorded'));
assert.match(c.careLogTimeLabel('2026-01-03T18:00:00Z'),/12:00 PM CST/);assert.match(c.careLogTimeLabel('2026-07-03T18:00:00Z'),/1:00 PM CDT/);
assert.equal(c.careLogEnteredAt({loggedAt:'bad',createdAt:entry.createdAt}),entry.createdAt);
assert.match(c.careLogEntryMetadataHtml(next),/Entered:.*Jan 3, 2026.*Edited:/);
console.log('PASS care history core: admin-only edits, stable identity, no optimistic mutation, preserved author/date/creation/media/sibling, escaped metadata, Chicago CST/CDT, no invented legacy times.');
