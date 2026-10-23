import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('js/dog-show.js', 'utf8');
let records = [];
const ctx = {
  readRecords: () => records,
  dogShowActiveEvent: () => ({ id: 'other-show' }),
  dogShowRingSchedules: entry => (entry.ringSchedules || []).filter(s => !s.removed),
  escapeHtml: value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
};
vm.createContext(ctx);
for (const name of ['dogShowRecords', 'dogShowResults', 'dogShowResultsForEntry', 'dogShowResultForSchedule', 'dogShowEntryResultStatusHtml']) {
  vm.runInContext(source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))[0], ctx);
}
const entry = { id: 'dog-entry', showEventId: 'show', attendanceRole: 'Showing', ringSchedules: [{id:'breed'}] };
const result = {id:'result', showEventId:'show', showEntryId:'dog-entry', ringScheduleId:'breed', outcome:'No placement', pointsEarned:0};
const html = (e = entry) => ctx.dogShowEntryResultStatusHtml(e);
assert.match(html(), /is-pending.*Result not logged/);
records = [result];
assert.match(html(), /is-complete.*Result logged/, 'Saved losses and zero points are still logged results');
const multi = {...entry, ringSchedules: [...entry.ringSchedules, {id:'group'}]};
assert.match(html(multi), /is-partial.*Results logged 1\/2/);
records.push({...result,id:'duplicate'});
assert.match(html(multi), /Results logged 1\/2/, 'Duplicates do not inflate the appearance count');
records.push({...result,id:'group-result',ringScheduleId:'group'});
assert.match(html(multi), /is-complete.*Results logged 2\/2/);
records = [{...result,removed:true}, {...result,showEventId:'other-show'}, {...result,showEntryId:'other-dog'}, {...result,ringScheduleId:'deleted-ring'}];
assert.match(html(), /is-pending/, 'Deleted, other show/dog, and orphan results cannot mark this appearance logged');
records = [{...result,ringScheduleId:''}];
assert.match(html(multi), /is-partial.*Results logged 1\/2/, 'Legacy results match only the first appearance');
assert.match(html({...entry,ringSchedules:[]}), /is-complete.*Result logged/, 'Existing general results remain visible');
records = [{...result,ringScheduleId:'deleted-ring'}];
assert.match(html({...entry,ringSchedules:[]}), /is-pending/);
assert.equal(html({...entry,attendanceRole:'Socializing'}), '');
records = [result];
assert.match(html({...multi,ringSchedules:[{id:'breed'},{id:'group',removed:true}]}), /is-complete.*Result logged/);
records = [];
assert.match(html(), /is-pending/, 'Deleting a result clears the badge on rerender');
assert.match(source.match(/function dogShowEntryRowHtml\([\s\S]*?\n\}/)[0], /dogShowEntryResultStatusHtml\(entry\)/);
console.log('Roster result status: pending, saved loss, partial, complete, duplicate, removed, event/dog scope, legacy, social and rerender checks passed.');
