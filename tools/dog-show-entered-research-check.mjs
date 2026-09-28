import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('js/dog-show.js','utf8');
const ctx={escapeHtml:v=>String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),dogShowPlannerCandidates:()=>[],dogShowPlannerRecord:()=>({shows:[]}),dogShowPlannerShowKey:s=>[s.startDate,s.club,s.cityState].join('|'),dogShowEntries:()=>[],dogShowEntryName:e=>e.dogName,dogShowPlannerDateRange:e=>e.startDate,dogShowFormatDate:String,dogShowPlannerJudgeHtml:(role,name)=>`<div class="dog-show-planner-judge"><span>${role} Judge</span><strong>${name||'Panel pending'}</strong></div>`,dogShowPlannerEventFlagsHtml:()=>'',dogShowAppearanceResultsAll:()=>[],dogShowPlannerCompletedResultsHtml:()=>'<p>No results recorded</p>'};
vm.createContext(ctx);
for(const name of ['dogShowPlannerShowMatchKeys','dogShowPlannerEventMatchKeys','dogShowPlannerEventForShow','dogShowPlannerResearchSnapshot','dogShowPlannerEventResearch','dogShowPlannerEventResearchHtml','dogShowPlannerEventPlanHtml','dogShowPlannerSourceLinksHtml','dogShowPlannerSourceSectionHtml','dogShowPlannerLastYearEntriesUrl','dogShowPlannerPointScheduleHtml','preserveDogShowPlannerResearch','saveDogShowEvent']){
 vm.runInContext(source.match(new RegExp('(?:async )?function '+name+'\\([\\s\\S]*?\\n\\}'))[0],ctx);
}
Object.assign(ctx,{dogShowEventState:()=> 'TX',dogShowPlannerPointScheduleBreeds:()=>['Siberian Husky'],akcBreedPointSchedule2026:()=>({state:'TX',division:7,breed:'Siberian Husky',dogs:[2,4,6,8,10],bitches:[2,4,6,8,10]}),DOG_SHOW_AKC_STATE_NAMES:{TX:'Texas'}});
const show={externalId:'akc-1',eventNumber:'2026123456',club:'Example Kennel Club',startDate:'2026-10-16',cityState:'Belton, TX',breedName:'Siberian Husky',breedJudge:'Breed Judge Example',groupJudge:'Group Judge Example',bisJudge:'BIS Judge Example',superintendent:'Example Superintendent',akcSourceUrl:'https://www.akc.org/event-example',superintendentUrl:'https://example.org/superintendent',premiumUrl:'https://example.org/premium.pdf',judgingProgramUrl:'https://example.org/judging.pdf'};
const event={id:'entered-1',plannerExternalId:'akc-1',name:'My saved show name',startDate:'2026-10-16',status:'Going',premiumUrl:'https://example.org/manual-premium.pdf',helperEmails:['staff@example.invalid'],notes:'Preserve my notes'};
const original=JSON.stringify(event);
const plan={shows:[show]};
assert.equal(ctx.dogShowPlannerEventResearch(event,plan).breedJudge,show.breedJudge);
assert.equal(ctx.dogShowPlannerEventResearch(event,plan).premiumUrl,event.premiumUrl,'Manual URL wins');
assert.equal(ctx.dogShowPlannerEventResearch({...event,plannerExternalId:'different',startDate:'2026-10-17'},plan).breedJudge,undefined,'No adjacent-day contamination');
const writes=[];ctx.dogShowEvents=()=>[event];ctx.saveDogShowRecord=async(type,record)=>writes.push({type,record});
await ctx.preserveDogShowPlannerResearch(plan);
assert.equal(writes.length,1);assert.equal(writes[0].type,'showEvent');assert.deepEqual(writes[0].record.helperEmails,event.helperEmails);assert.equal(writes[0].record.notes,event.notes);assert.equal(writes[0].record.status,'Going');assert.equal(JSON.stringify(event),original,'Rendering and snapshot creation do not mutate input');
const saved=JSON.parse(JSON.stringify(writes[0].record));
const retained=ctx.dogShowPlannerEventResearch(saved,{shows:[]});
for(const field of ['breedJudge','groupJudge','bisJudge','eventNumber','superintendent','superintendentUrl','judgingProgramUrl'])assert.equal(retained[field],show[field],`${field} survives search replacement and reload`);
ctx.dogShowEvents=()=>[saved];await ctx.preserveDogShowPlannerResearch(plan);assert.equal(writes.length,1,'No redundant snapshot write');
const html=ctx.dogShowPlannerEventPlanHtml(saved,'Going',{shows:[]});
for(const text of ['is-added-show','Breed Judge Example','Group Judge Example','BIS Judge Example','AKC BREED POINTS','AKC Event','Superintendent','Premium List','Judging Program','Last Year Entries','2026123456','Open Show'])assert(html.includes(text),text);
const completed=ctx.dogShowPlannerEventPlanHtml(saved,'Completed',{shows:[]});assert(completed.includes('Last Year Entries'));assert(completed.includes('No results recorded'));assert(!completed.includes('Open Show'));
const legacy=ctx.dogShowPlannerEventResearch({notes:'AKC event number: 12345\nSiberian Husky judge: Legacy Breed\nWorking judge: Legacy Group\nBIS judge: Legacy BIS\nSuperintendent source: https://example.org/super'},{});assert.equal(legacy.breedJudge,'Legacy Breed');assert.equal(legacy.eventNumber,'12345');
assert(source.includes('await preserveDogShowPlannerResearch();'),'Archive research before replacing search');
assert(source.includes('name="plannerMetadata"'),'Import/edit form carries research');
// Exercise the actual form save: imported metadata and an edited event both survive.
let formData = { name: 'Imported show', status: 'Going To', plannerMetadata: JSON.stringify(ctx.dogShowPlannerResearchSnapshot(show)), nohs: 'true' };
let storedEvent;
Object.assign(ctx, {
 readRecords: () => [saved], formPayload: () => ({ ...formData }), dogShowEventStatus: value => value,
 DOG_SHOW_DEFAULT_PACKING: [], uid: () => 'new-event', currentUser: { email: 'staff@example.invalid' },
 localStorage: { setItem() {} }, DOG_SHOW_EVENT_KEY: 'selected-show',
 document: { getElementById: () => null }, renderDogShow() {}, showToast() {},
 saveDogShowRecord: async (type, record) => { storedEvent = JSON.parse(JSON.stringify(record)); return storedEvent; },
});
await ctx.saveDogShowEvent({ dataset: {}, querySelectorAll: () => [] });
assert.equal(storedEvent.plannerMetadata.breedJudge, show.breedJudge);
assert.equal(storedEvent.plannerMetadata.judgingProgramUrl, show.judgingProgramUrl);
formData = { name: 'Edited title', status: 'Going', nohs: 'false' };
await ctx.saveDogShowEvent({ dataset: { id: saved.id }, querySelectorAll: () => [{ value: 'staff@example.invalid' }] });
assert.equal(storedEvent.plannerMetadata.breedJudge, show.breedJudge, 'Older edit forms retain saved research');
assert.equal(storedEvent.notes, saved.notes);
assert.deepEqual(storedEvent.helperEmails, saved.helperEmails);
console.log('Entered-show research checks passed: same-show matching, manual precedence, durable snapshots, no roster/status mutation, all links, point schedule, completed history and legacy notes.');
if(process.env.SHOW_RESEARCH_PREVIEW){
 const recommended=`<details class="dog-show-planner-card"><summary><div><h3>Recommended show — not added</h3><p>White card for comparison</p></div></summary></details>`;
 fs.writeFileSync(process.env.SHOW_RESEARCH_PREVIEW,`<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="app-workspace.css"><link rel="stylesheet" href="dog-show-workspace.css"><link rel="stylesheet" href="dog-show-tools.css"><style>body{padding:24px;background:#f5f8fb}#dogShowPage{max-width:1000px;margin:auto;display:block}.dog-show-planner-judge{display:grid;padding:12px}</style><title>Entered show details — local fixture</title><body class="is-dog-show-mode"><main id="dogShowPage"><h2>Show Planner · local test data</h2><div class="dog-show-view dog-show-planner-view"><section class="dog-show-plan-board"><h3>Booked</h3>${html}</section><section><h3>Recommended Shows</h3>${recommended}</section></div></main></html>`);
}
