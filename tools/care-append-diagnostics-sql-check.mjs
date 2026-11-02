import fs from 'node:fs';import assert from 'node:assert/strict';
const pg=await import(process.env.PG_MODULE || 'pg');const Client=pg.Client || pg.default.Client;
const url=process.env.TEST_DATABASE_URL;
if(!url || !['127.0.0.1','localhost'].includes(new URL(url).hostname) || !new URL(url).pathname.includes('cuddle_test'))throw Error('Use a disposable localhost cuddle_test database only.');
const connect=async()=>{const c=new Client({connectionString:url});await c.connect();return c;};
const db=await connect();const sessions=[];
const org='00000000-0000-0000-0000-000000000100';
const staff='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
try{
await db.query(`do $$begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;end$$;create schema auth;create schema cuddle_stay;create schema cuddle_stay_private;create schema cron;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function cuddle_stay_private.kennel_user_role() returns text language sql stable as $$select current_setting('test.app_role',true)$$;
create function cuddle_stay_private.kennel_is_admin() returns boolean language sql stable as $$select cuddle_stay_private.kennel_user_role() in ('owner','admin')$$;
create function cuddle_stay_private.kennel_is_staff_member() returns boolean language sql stable as $$select cuddle_stay_private.kennel_user_role() in ('owner','admin','manager','staff')$$;
create function cuddle_stay_private.cuddle_stay_organization_id() returns uuid language sql stable as $$select '${org}'::uuid$$;
create function cuddle_stay.kennel_auth_email() returns text language sql stable as $$select current_setting('test.email',true)$$;
create table cuddle_stay.kennel_records(id text primary key,type text not null,organization_id uuid not null default '${org}',payload jsonb not null default '{}',helper_email text,user_id uuid,submitted_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table cuddle_stay.kennel_records enable row level security;
grant usage on schema auth,cuddle_stay,cuddle_stay_private to authenticated;
grant select,insert,update on cuddle_stay.kennel_records to authenticated;
create policy read_staff on cuddle_stay.kennel_records for select to authenticated using(organization_id=cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member());
create policy insert_staff on cuddle_stay.kennel_records for insert to authenticated with check(organization_id=cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member());
create policy update_staff on cuddle_stay.kennel_records for update to authenticated using(organization_id=cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member()) with check(organization_id=cuddle_stay_private.cuddle_stay_organization_id() and cuddle_stay_private.kennel_is_staff_member());
create table cron.job(jobname text,schedule text,command text);
create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job values($1,$2,$3) returning 1::bigint$$;
set test.app_role='admin';set test.uid='${staff}';set test.email='fixture@example.invalid';`);
const guard=fs.readFileSync('supabase/migrations/20261011203811_admin_owned_care_history_edit.sql','utf8').split('create or replace function cuddle_stay.edit_owned_care_history')[0];
await db.query(guard);
await db.query(fs.readFileSync('supabase/migrations/20261102165317_atomic_care_append_and_diagnostics.sql','utf8'));
const setup=async(role,uid=staff)=>{const c=await connect();sessions.push(c);await c.query('set role authenticated');await c.query(`select set_config('test.app_role',$1,false),set_config('test.uid',$2,false),set_config('test.email','fixture@example.invalid',false)`,[role,uid]);return c;};
const put=async(id,type,payload,organization=org)=>db.query('insert into cuddle_stay.kennel_records(id,type,payload,organization_id) values($1,$2,$3,$4)',[id,type,{id,type,...payload},organization]);
const get=async id=>(await db.query('select payload from cuddle_stay.kennel_records where id=$1',[id])).rows[0]?.payload;
const prior={id:'legacy',date:'2020-01-01',note:'Preserve exactly',editHistory:[{note:'original'}]};
await put('dog-a','ownedDog',{callName:'Comet fixture',sex:'Male',bathIntervalDays:14,bathHistory:[prior,prior],careNotesHistory:[{id:'medical',note:'prior admin edit'}],food:'unchanged'});
await put('dog-b','ownedDog',{callName:'Other fixture',bathHistory:[]});
await put('foreign','ownedDog',{bathHistory:[]},'00000000-0000-0000-0000-000000000101');
await put('dailyTask-2026-10-30','dailyTask',{date:'2026-10-30',structuredCareLogs:[prior],careLogs:[prior],completedTasks:[{id:'task-keep'}],helperName:'keep'});
const a=await setup('staff'),b=await setup('staff',other),admin=await setup('admin'),customer=await setup('customer');
const log=(id,dogId='dog-a',date='2026-10-30')=>({id,dogId,careType:'Bath',date,note:'fixture',minutes:'',mediaItems:[],completedBy:'spoofed'});
const append=(c,entry)=>c.query('select cuddle_stay.append_owned_care_log($1) result',[entry]).then(r=>r.rows[0].result);
const first=await append(a,log('first'));assert.equal(first.inserted,true);assert.equal(first.log.completedBy,'Staff');assert.equal(first.log.submittedByUserId,staff);
assert.deepEqual((await get('dog-a')).bathHistory.slice(1),[prior,prior]);assert.deepEqual((await get('dailyTask-2026-10-30')).completedTasks,[{id:'task-keep'}]);
const retry=await append(a,log('first'));assert.equal(retry.inserted,false);assert.equal((await get('dog-a')).bathHistory.length,3);
await assert.rejects(append(b,log('first')),/already in use/);
await assert.rejects(append(customer,log('customer')),/Staff access/);
await assert.rejects(append(a,log('foreign','foreign')),/no longer available/);
await assert.rejects(a.query("update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{bathHistory}','[]') where id='dog-a'"),/Only admins/);
// Two real connections contend on a dog lock. Both append to the newly read row.
await a.query('begin');await append(a,log('concurrent-a'));
let settled=false;const pending=append(b,log('concurrent-b')).then(r=>{settled=true;return r;});
await new Promise(r=>setTimeout(r,100));assert.equal(settled,false,'second staff must wait for row lock');await a.query('commit');await pending;
assert.equal((await get('dog-a')).bathHistory.length,5);assert.equal((await get('dailyTask-2026-10-30')).structuredCareLogs.length,4);
// A simultaneous admin correction is preserved after staff waits for the row lock.
await admin.query('begin');await admin.query("update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{careNotesHistory,0,note}','\"corrected by admin\"') where id='dog-a'");
const afterEdit=append(b,log('after-admin-edit'));await admin.query('commit');await afterEdit;
assert.equal((await get('dog-a')).careNotesHistory[0].note,'corrected by admin');
// Concurrent first-ever source creation for different dogs on one date.
await a.query('begin');await append(a,log('new-day-a','dog-a','2026-11-02'));
const next=append(b,log('new-day-b','dog-b','2026-11-02'));await a.query('commit');await next;
assert.equal((await get('dailyTask-2026-11-02')).structuredCareLogs.length,2);
// Backdated care cannot move last/next bath backwards.
await append(a,log('backdated','dog-a','2026-01-01'));assert.equal((await get('dog-a')).lastBath,'2026-11-02');assert.equal((await get('dog-a')).nextBath,'2026-11-16');
// Inject a local-only failure after daily update; the entire RPC must roll back.
await db.query(`create function cuddle_stay_private.test_fail() returns trigger language plpgsql as $$begin if new.id='dog-b' then raise exception 'fixture dog failure';end if;return new;end$$;create trigger test_fail before update on cuddle_stay.kennel_records for each row execute function cuddle_stay_private.test_fail();`);
const before=await get('dailyTask-2026-10-30');await assert.rejects(append(a,log('rollback','dog-b')),/fixture dog failure/);assert.deepEqual(await get('dailyTask-2026-10-30'),before);await assert.rejects(append(a,log('rollback-new','dog-b','2026-12-01')),/fixture dog failure/);assert.equal(await get('dailyTask-2026-12-01'),undefined);await db.query('drop trigger test_fail on cuddle_stay.kennel_records');
// Uncertain response retry from another connection with the SAME actor/ID is idempotent.
const sameActor=await setup('staff');const n=(await get('dog-a')).bathHistory.length;await Promise.all([append(a,log('retry-race')),append(sameActor,log('retry-race'))]);assert.equal((await get('dog-a')).bathHistory.length,n+1);
// Diagnostic permissions are the exact migration, not mocked policies.
const insert="insert into cuddle_stay.troubleshooting_events(operation,error_code,category,message,app_version) values('care.submit','42501','history_protected','Existing care history would be changed or omitted.','test')";
for(const role of ['staff','manager','admin','owner']){const c=await setup(role);await c.query(insert);const rows=(await c.query('select * from cuddle_stay.troubleshooting_events')).rows;assert.equal(rows.length>0,['admin','owner'].includes(role));}
await assert.rejects(customer.query(insert),/row-level security/);
await assert.rejects(a.query("insert into cuddle_stay.troubleshooting_events(actor_id,operation,error_code,category,message,app_version) values('00000000-0000-0000-0000-000000000002','record.save','X','save_failed','Save failed. Use the error code and record ID to investigate.','test')"),/permission denied/);
for(const c of [a,admin])for(const query of ['delete from cuddle_stay.troubleshooting_events','update cuddle_stay.troubleshooting_events set error_code=\'X\''])await assert.rejects(c.query(query),/permission denied/);
await db.query('set role anon');await assert.rejects(db.query('select * from cuddle_stay.troubleshooting_events'),/permission denied/);await db.query('reset role');
const row=(await db.query('select * from cuddle_stay.troubleshooting_events limit 1')).rows[0];assert.equal(row.actor_id,staff);assert.equal(row.organization_id,org);
await db.query("insert into cuddle_stay.troubleshooting_events(operation,error_code,category,message,app_version,created_at) values('record.save','X','save_failed','Save failed. Use the error code and record ID to investigate.','old',now()-interval '15 days')");
const job=(await db.query('select * from cron.job')).rows[0];assert.equal(job.schedule,'25 4 * * *');const dogBefore=await get('dog-a');await db.query(job.command);assert.equal((await db.query("select count(*)::int n from cuddle_stay.troubleshooting_events where app_version='old'")).rows[0].n,0);assert.deepEqual(await get('dog-a'),dogBefore);assert((await db.query('select count(*)::int n from cuddle_stay.troubleshooting_events')).rows[0].n>0);
assert.equal((await db.query("select prosecdef from pg_proc where proname='append_owned_care_log'")).rows[0].prosecdef,false);
console.log('PASS real PostgreSQL: concurrent staff appends/new-day creation, retry deduplication, existing duplicate/admin metadata preservation, backdating, atomic rollback, staff/customer/cross-org protections, diagnostic owner/admin-only reads, actor spoof denial, update/delete denial, and actual retention deletion command. Cron scheduler itself is stubbed locally.');
}finally{await Promise.all(sessions.map(c=>c.end()));await db.end();}
