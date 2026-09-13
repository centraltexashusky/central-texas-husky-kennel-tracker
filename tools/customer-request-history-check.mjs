import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const decode = path => vm.runInNewContext(fs.readFileSync(path,'utf8').match(/const __snuggleStayModuleSource = (`[\s\S]*`);\n\(0, eval\)/)[1]);
const customer=decode('js/customer.js'), shared=decode('js/shared.js');
const fn=(source,name)=>source.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}`))[0];
const past={id:'past',status:'Checked Out',dropoffTime:'2026-07-01T09:00',pickupTime:'2026-07-03T16:00',requests:[{serviceName:'Bath'}],pricingSnapshot:{total:235}};
const record={id:'dog',customerRequest:true,ownerEmail:'owner@example.invalid',updatedAt:'1',stays:[],_remotePastBoardingDeferred:true,_remotePastBoardingCount:1};
let records=[record], calls=0, fail=false;
const c={Map,Promise,console:{warn(){}},currentUser:{email:record.ownerEmail},currentRole:()=> 'customer',normalizeEmail:x=>(x||'').toLowerCase(),arrayValue:x=>Array.isArray(x)?x:[],boardingDeferredSectionCacheKey:r=>r.id+'|'+r.updatedAt,boardingDogVisibleToCustomer:r=>r.ownerEmail===c.currentUser.email,readRecords:()=>records,consolidatedBoardingDogRecords:r=>r,dedupeBoardingStaysForDisplay:(_r,s)=>[...new Map(s.map(x=>[x.id,x])).values()],boardingStayEntries:rs=>rs.flatMap(r=>(r.stays.length?r.stays:[{}]).map(stay=>({record:r,stay,status:stay.status}))),uniqueBoardingStayEntries:x=>x,boardingStayEntrySortTime:()=>0,boardingPastStayCache:new Map(),activePageId:()=> 'customerPage',renderCustomerRequests:()=>{},loadBoardingPastStayData:async()=>{calls++;if(fail)throw Error('offline');return [past];}};
vm.createContext(c);
vm.runInContext('var customerRequestHistoryLoads = new Map();',c);
for(const name of ['customerRequestHistoryKey','customerRequestHistoryState','customerRequestHistoryNeeded','customerRequestBaseRecords','customerRequestRecordWithHistory','loadCustomerRequestHistory','customerRequestEntries'])vm.runInContext(fn(customer,name),c);
assert.equal(c.customerRequestEntries().length,0,'Unloaded historical data must not generate a fake empty completed stay');
const before=JSON.stringify(records);
await Promise.all([c.loadCustomerRequestHistory(record),c.loadCustomerRequestHistory(record)]);
assert.equal(calls,1,'Concurrent renders share one request');
assert.equal(c.customerRequestEntries()[0].stay.pricingSnapshot.total,235);
assert.equal(c.customerRequestEntries()[0].stay.requests[0].serviceName,'Bath');
assert.equal(c.customerRequestEntries('Approved').length,0);
assert.equal(JSON.stringify(records),before,'History does not mutate editable records or financial sources');
records=[{...record,stays:[{id:'active',status:'Approved'}]}];
assert.equal(c.customerRequestEntries().length,2,'Active and historical stays are both retained');
c.currentUser.email='different@example.invalid';
assert.equal(c.customerRequestEntries().length,0,'Switching customers cannot expose a cached other-family stay');
await c.loadCustomerRequestHistory(record);assert.equal(calls,1);
c.currentUser.email=record.ownerEmail;records=[{...record,updatedAt:'2'}];fail=true;
await c.loadCustomerRequestHistory(records[0]);
assert.equal(c.customerRequestHistoryState(records[0]).status,'error');
await c.loadCustomerRequestHistory(records[0]);assert.equal(calls,2,'Failure does not cause a render retry loop');
fail=false;await c.loadCustomerRequestHistory(records[0],true);
assert.equal(c.customerRequestEntries().length,1,'Explicit retry restores history');

// The financial rebuild explicitly asks for full history, never a roster
// projection; ordinary page reads must remain compact and lazy.
let rpcCalls=0,tableCalls=0;
const s={normalizeIsoTimestamp:x=>x,efficiencyPerfStart:()=>({}),efficiencyPerfEnd:()=>{},lastRemoteRecordFetchModesByType:new Map(),boardingDogFullHistoryLoaded:false,boardingDogRemoteTotalCount:0};
s.cuddleStayRequest=async action=>action({rpc:async()=>{rpcCalls++;return {data:[{id:'dog',payload:{stays:[]},total_count:1}]};},from:()=>{tableCalls++;const q={select:()=>q,eq:()=>q,gte:()=>q,order:()=>q,range:async()=>({data:[{id:'dog',payload:{stays:[past]}}]})};return q;}});
vm.createContext(s);vm.runInContext(fn(shared,'fetchRemoteRecordRowsForType'),s);
await s.fetchRemoteRecordRowsForType('boardingDog');assert.equal(rpcCalls,1);assert.equal(tableCalls,0);
const full=await s.fetchRemoteRecordRowsForType('boardingDog',{boardingFullHistory:true});
assert.equal(tableCalls,1);assert.equal(full[0].payload.stays[0].pricingSnapshot.total,235);
assert.equal(s.boardingDogFullHistoryLoaded,true);
assert.match(fn(shared,'fetchRemoteRecordRows'),/boardingFullHistory: options.boardingFullHistory === true/,'Full-history option reaches the actual fetcher');
console.log('Customer request history and full financial-source loading checks passed.');

// Regression: Gill -> admin -> Larisa -> admin -> Gill in the same tab.
// An active-only staff roster may replace the full customer collection between
// views, so even unchanged server rows must be read/merged again for each user.
const auth=decode('js/auth.js');
const a={Map,Set,currentUser:{key:'admin',role:'admin'},currentRole:()=>a.currentUser?.role,
  syncMetaScopeKey:()=>a.currentUser?.key+':'+a.currentUser?.role,
  accountSessionKey:u=>u.key,localTestMode:true,supabaseClient:null,
  window:{clearTimeout(){}},lastRemoteRecordsSignature:'old',
  lastRemoteRecordsSignatureByRequest:new Map([['boardingDog','same-server-rows']]),
  remoteTypesFullyLoadedInMemory:new Set(['boardingDog']),activePageRemoteLoadFinishedAtByKey:new Map(),
  activePageRemoteLoadLastKey:'old',activePageRemoteLoadLastAt:1,boardingDogFullHistoryLoaded:true,
  deferredPageRemoteLoadRequestId:0,activePageRemoteLoadTimer:1,deferredPageRemoteLoadTimer:2,
  pageRemoteScopeKey:x=>x,remoteLoadRequestKey:x=>x.join('|'),
  prepareProductionMemoryRecordCache(){},setDefaultDateAndDay(){},safeLocalStorageSetItem(){},
  stateKeys:{session:'session'},helperName:{},helperEmail:{},helperKey:{},loginStatus:{},loginHelp:{},
  updateHeaderUser(){},applyCurrentUserThemePreference(){},roleLabel:x=>x,updateNavigationAccess(){},
  $:()=>({}),startAutoSync(){}};
vm.createContext(a);
for(const name of ['resetRemoteReadStateForAccountChange','pageRemoteLoadCacheKey'])vm.runInContext(fn(shared,name),a);
vm.runInContext(fn(auth,'setHelper'),a);
const keys=[];
for(const [key,role] of [['gill','customer'],['admin','admin'],['larisa','customer'],['admin','admin'],['gill','customer']]){
  a.lastRemoteRecordsSignatureByRequest.set('boardingDog','unchanged');
  a.remoteTypesFullyLoadedInMemory.add('boardingDog');
  a.activePageRemoteLoadFinishedAtByKey.set('customerRequestsPage',Date.now());
  a.setHelper({key,role,authProvider:'supabase'},{render:false,switchAfterLogin:false});
  assert.equal(a.lastRemoteRecordsSignatureByRequest.size,0);
  assert.equal(a.remoteTypesFullyLoadedInMemory.size,0);
  assert.equal(a.activePageRemoteLoadFinishedAtByKey.size,0);
  keys.push(a.pageRemoteLoadCacheKey('customerRequestsPage',['boardingDog']));
}
assert.notEqual(keys[0],keys[2],'Freshness is scoped to the customer identity');
a.lastRemoteRecordsSignatureByRequest.set('boardingDog','same-user');
a.setHelper({...a.currentUser},{render:false,switchAfterLogin:false});
assert.equal(a.lastRemoteRecordsSignatureByRequest.size,1,'Routine auth refresh does not reset the same user');
assert.match(fn(shared,'loadRemoteRecords'),/remoteLoadReadScope !== readScope[\s\S]*await remoteLoadPromise/);
assert.match(fn(shared,'loadRemoteRecords'),/if \(readScope !== syncMetaScopeKey\(\)\) return;/);
console.log('Account-switch history freshness and stale-response guard checks passed.');
