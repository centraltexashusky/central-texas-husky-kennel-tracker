import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const source = read('js/operations-workspace.js');
const shared = read('js/shared.js');
const html = read('index.html');
assert.match(shared, /if \(pageId === "maintenancePage"\) return "requestsPage"/);
assert.match(shared, /requestsPage: \{ critical: \["request", "maintenance"\]/);
assert.match(shared, /activePage === "requestsPage" && \(requestChanged \|\| maintenanceChanged\)/);
assert.equal((html.match(/data-page="maintenancePage"/g) || []).length, 0);
assert.equal((html.match(/id="requestForm"/g) || []).length, 1);
assert.equal((html.match(/id="maintenanceForm"/g) || []).length, 1);
assert.match(html, /js\/operations-workspace.js\?v=operations-v119/);
assert.match(source, /notifyIfNeeded\(saved/);
assert.match(source, /operationsPendingForms\.delete\(form\)/);

const elements = new Map(['operationsList','operationsStatusTabs','operationsSearch','operationsType','operationsListFooter'].map(id => [id,{innerHTML:'',value:id==='operationsType'?'all':'',setAttribute(){}}]));
const records = {request:[],maintenance:[]};
let role='admin', writes=0, result={ok:true}, fail=false;
const context = vm.createContext({
  document:{addEventListener(){},getElementById:id=>elements.get(id)},
  currentRole:()=>role, activePageId:()=> 'requestsPage', readRecords:type=>records[type],
  arrayValue:value=>Array.isArray(value)?value:[],
  escapeHtml:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
  formatDateTime:value=>value||'', canWriteRemoteRecordType:()=>true,
  localTestMode:false, supabaseClient:{},
  sendPayload:async()=>{if(fail)throw Error('offline');return result;},
  upsertRecord:(_type,record)=>{writes++;return record;}
});
vm.runInContext(source,context);
records.request=Array.from({length:500},(_,i)=>({id:'r'+i,type:'request',requestText:'Request '+i,submittedAt:'2026-09-11',completed:false}));
records.request.push({id:'removed',removed:true,requestText:'MUST NOT DISPLAY'});
records.maintenance=[{id:'urgent',issue:'<script>unsafe</script>',urgentAttention:true,submittedAt:'2026-09-10'}];
context.renderOperationsWorkspace();
assert.equal((elements.get('operationsList').innerHTML.match(/class="operations-row"/g)||[]).length,50,'Initial rendering is bounded');
assert.match(elements.get('operationsList').innerHTML,/&lt;script>unsafe/,'Record content is escaped');
assert.doesNotMatch(elements.get('operationsList').innerHTML,/<script>|MUST NOT DISPLAY/);
assert.match(elements.get('operationsListFooter').innerHTML,/Showing 50 of 501/);
context.operationsState.status='Urgent';context.renderOperationsWorkspace();
assert.match(elements.get('operationsListFooter').innerHTML,/Showing 1 of 1/);
elements.get('operationsType').value='request';context.renderOperationsWorkspace();
assert.match(elements.get('operationsListFooter').innerHTML,/Showing 0 of 0/,'Type and status intersect');
records.maintenance[0].completed=true;
assert.equal(context.operationsUrgent(records.maintenance[0]),false,'Completed urgent items leave urgent queue');
context.operationsState.status='All';elements.get('operationsSearch').value='Request 499';context.renderOperationsWorkspace();
assert.match(elements.get('operationsListFooter').innerHTML,/Showing 1 of 1/);

await context.persistOperation({id:'r1',type:'request'});assert.equal(writes,1);
for(const rejected of [{ok:false},{ok:true,local:true},{ok:true,skippedRemote:true}]) {
  result=rejected;await assert.rejects(context.persistOperation({id:'r1',type:'request'}));
}
fail=true;await assert.rejects(context.persistOperation({id:'r1',type:'request'}));
assert.equal(writes,1,'Unconfirmed remote saves cannot change the local queue');
fail=false;result={ok:true};role='customer';
await assert.rejects(context.persistOperation({id:'r1',type:'request'}));
assert.equal(writes,1,'Customer cannot write staff work items');
role='helper';await context.persistOperation({id:'r1',type:'request'});assert.equal(writes,2);
console.log('Operations workspace passed: route alias, loading/realtime integration, bounded rows, escaping, combined filters, save confirmation and role guards.');
