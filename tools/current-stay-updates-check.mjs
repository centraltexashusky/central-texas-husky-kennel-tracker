import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const shared = fs.readFileSync('js/shared.js','utf8');
const customer = fs.readFileSync('js/customer.js','utf8');
const boarding = fs.readFileSync('js/boarding.js','utf8');
const read = (source, name) => source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}'))[0].replace(/\\([`$])/g,'$1');
const rows = {};
const out = {};
const ctx = {
  arrayValue: v => Array.isArray(v) ? v : [],
  isServiceRequestStay: (r,s) => (s.stayType || r.stayType) === 'Service Request',
  boardingStayDisplayStatus: (_r,s) => s.status,
  activeBoardingStayStatuses: ['Checked In','In Kennel','Ready For Pickup'],
  boardingStayExplicitRequestCode: s => s.requestCode,
  boardingStayRequestCode: (_r,s) => s.requestCode,
  currentUser: {email:'one@example.test'},
  normalizeEmail: e => String(e || '').toLowerCase(),
  readRecords: type => rows[type] || [],
  boardingDogVisibleToCustomer: (d,e) => d.ownerEmail === e,
  customerDogVisibleToCustomer: (d,e) => d.ownerEmail === e,
  $: () => out,
  customerDogsForCurrentUser: () => rows.customerDog || [],
  formatDateTime: s => s,
  stayScheduleRangeLabel: (_r,s) => s.dropoffTime + ' to ' + s.pickupTime,
  escapeHtml: s => String(s),
  mediaAccessAttrs: (item,c) => ' data-path="' + item.storagePath + '" data-record="' + c.sourceRecordId + '"',
};
vm.createContext(ctx);
vm.runInContext([
  'ownerUpdateStayIsAvailable','customerUpdateStayCandidates','customerUpdateVisibleStays','customerUpdateMatchesVisibleStay',
  'customerUpdateBelongsToCurrentStay',
].map(n => read(shared,n)).concat(['customerUpdatesForCurrentUser','renderCustomerUpdates'].map(n => read(customer,n))).join('\n'),ctx);
const stay = (id, date, status, extra = {}) => ({id, requestCode:'family-' + date, dropoffTime:date, pickupTime:date + 'T22:00', status,...extra});
const pic = (stay, name, id = name) => ({id, stayId:stay.id, requestCode:stay.requestCode, mediaItems:[{name,type:'image/jpeg',storagePath:'users/test/' + name}]});
const dog = (id, profile, stays, updates = [], ownerEmail = 'one@example.test') => ({id,linkedCustomerDogId:profile,dogName:'Same Name',stays,customerUpdates:updates,ownerEmail});
const a0 = stay('first','2026-11-20','In Kennel');
const b0 = stay('sibling','2026-11-20','Checked Out');
const mixed = {...pic(a0,'wrong.jpg'),stayId:b0.id};
rows.customerDog = [{id:'a',ownerEmail:'one@example.test',dogName:'Same Name',customerUpdates:[pic(a0,'first.jpg'),pic(a0,'mirror-only.jpg')]}];
rows.boardingDog = [dog('a-old','a',[a0],[pic(a0,'first.jpg'),mixed]),dog('b','b',[b0],[pic(b0,'second.jpg')]),dog('foreign','a',[a0],[pic(a0,'tenant.jpg')],'two@example.test')];
const verifyPhoto = (name, shown) => assert.equal(out.innerHTML.includes(name),shown,out.innerHTML);
const render = () => ctx.renderCustomerUpdates();
render(); verifyPhoto('first.jpg',true); verifyPhoto('second.jpg',true); verifyPhoto('wrong.jpg',false); verifyPhoto('tenant.jpg',false);
assert(ctx.ownerUpdateStayIsAvailable(rows.boardingDog[0],a0));
a0.status = 'Checked Out';
assert(!ctx.ownerUpdateStayIsAvailable(rows.boardingDog[0],a0),'posting remains active-only');
const cold = JSON.parse(JSON.stringify(rows));
Object.assign(rows,cold); out.innerHTML = '';
render(); verifyPhoto('first.jpg',true); verifyPhoto('mirror-only.jpg',true); verifyPhoto('second.jpg',true);
assert.equal((out.innerHTML.match(/data-path="users\/test\/first.jpg"/g) || []).length,1);
assert.match(out.innerHTML, /data-path="users\/test\/first.jpg" data-record="a-old"/);
for (const other of [stay('cancel','2026-12-01','Cancelled'),stay('service','2026-12-01','Approved',{stayType:'Service Request'})]) {
  rows.boardingDog.push(dog(other.id,'a',[other]));
}
render();verifyPhoto('first.jpg',true);
const next = stay('next','2026-12-01','Pending',{actualCheckInAt:''});
rows.boardingDog.push(dog('a-next','a',[next]));
render();verifyPhoto('first.jpg',false);verifyPhoto('mirror-only.jpg',false);verifyPhoto('second.jpg',true);
assert.equal(rows.boardingDog[0].customerUpdates.length,2,'history not mutated');
next.status = 'Checked In';
rows.boardingDog.at(-1).customerUpdates.push(pic(next,'fresh.jpg'));
render();verifyPhoto('fresh.jpg',true);verifyPhoto('first.jpg',false);verifyPhoto('second.jpg',true);
next.status = 'Checked Out';
render();verifyPhoto('fresh.jpg',true);
assert.match(shared,/boardingFullHistory: options\.boardingFullHistory === true[\s\S]{0,100}type === "boardingDog" && isCustomerRole\(\)/);
assert.doesNotMatch(boarding,/kennel_boarding_customer_update_retention_plan|kennel_apply_boarding_customer_update_retention|enforceBoardingCustomerUpdateRetention/);
console.log('Customer Updates render: cold checkout, pending successor, active replacement, same-name sibling, ownership, photo linkage, no destructive calls.');
