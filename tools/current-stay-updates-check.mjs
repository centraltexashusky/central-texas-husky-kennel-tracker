import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const shared = fs.readFileSync('js/shared.js','utf8');
const source = shared.match(/function customerUpdateBelongsToCurrentStay[\s\S]*?\n\}/)[0];
const ctx = { arrayValue: value => Array.isArray(value) ? value : [],
  ownerUpdateStaysForRecord: r => (r.stays || []).filter(s => ['Checked In','In Kennel','Ready For Pickup'].includes(s.status)),
  boardingStayRequestCode: (_r,s) => s.requestCode };
vm.createContext(ctx); vm.runInContext(source,ctx);
const record = {stays:[
  {id:'future',requestCode:'BR-FUTURE',status:'Approved'},
  {id:'now',requestCode:'BR-NOW',status:'In Kennel',sourceStayIds:['legacy-now'],dropoffTime:'2026-09-24T09:00',pickupTime:'2026-10-12T10:00'},
  {id:'past',requestCode:'BR-PAST',status:'Checked Out'}
]};
const match = update => ctx.customerUpdateBelongsToCurrentStay(record,update);
assert(match({stayId:'now'})); assert(match({requestCode:'BR-NOW'})); assert(match({stayId:'legacy-now'}));
assert(match({stayDropoffTime:'2026-09-24T09:00',stayPickupTime:'2026-10-12T10:00'}));
assert(!match({requestCode:'BR-PAST'})); assert(!match({stayId:'future'})); assert(!match({}));
assert(!match({stayId:'now',requestCode:'BR-PAST'}),'Contradictory reference must not show old photos');
record.stays[1].status='Checked Out'; assert(!match({stayId:'now'}),'No current stay means no displayed updates');
const sql=fs.readFileSync('supabase/migrations/20260928013217_current_stay_only_customer_updates.sql','utf8');
assert(sql.includes('v_current_stays'));
assert(sql.includes('v_past_stays'));
assert(sql.includes("protected.payload-'customerUpdates'-'latestCustomerUpdate'"),'Cleanup protects profile/shared media');
assert(!sql.includes('latest_stay'),'Future-most stay must not choose current updates');
console.log('Current-stay updates passed: current vs future/past, source aliases, empty/ambiguous references, checkout and shared-media protection.');
