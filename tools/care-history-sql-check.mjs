import fs from 'node:fs';
import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
// Isolated PostgreSQL; no connection to production. Minimal real-role/RLS fixture.
await db.exec(`create role anon;create role authenticated;create schema auth;create schema cuddle_stay;create schema cuddle_stay_private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function cuddle_stay_private.kennel_is_admin() returns boolean language sql stable as $$select current_setting('test.app_role',true) in ('admin','owner')$$;
create function cuddle_stay_private.cuddle_stay_organization_id() returns text language sql stable as $$select 'org'::text$$;
create function cuddle_stay.kennel_auth_email() returns text language sql stable as $$select 'admin@example.invalid'::text$$;
create table cuddle_stay.kennel_records(id text primary key,type text,organization_id text default 'org',payload jsonb,updated_at timestamptz default now());
alter table cuddle_stay.kennel_records enable row level security;
grant usage on schema auth,cuddle_stay,cuddle_stay_private to authenticated;
grant all on cuddle_stay.kennel_records to authenticated;
create policy read_records on cuddle_stay.kennel_records for select to authenticated using (organization_id='org' and current_setting('test.app_role',true) in ('owner','admin','manager','staff','helper'));
create policy write_records on cuddle_stay.kennel_records for all to authenticated using (organization_id='org' and current_setting('test.app_role',true) in ('owner','admin','manager','staff','helper')) with check (organization_id='org' and current_setting('test.app_role',true) in ('owner','admin','manager','staff','helper'));
set test.uid='00000000-0000-0000-0000-000000000001';set test.app_role='admin';`);
await db.exec(fs.readFileSync('supabase/migrations/20261011203811_admin_owned_care_history_edit.sql','utf8'));
const original={id:'a',type:'Medical/Care',date:'2026-01-02',note:'one\ntwo',completedBy:'Original Staff',createdAt:'2026-01-04T18:30:00Z',mediaItems:[{url:'fixture'}]};
const duplicate={...original,note:'same day independent entry',id:'b'};
const dog={id:'dog',type:'ownedDog',careNotesHistory:[original,duplicate],foodAmount:'unchanged',bathHistory:[],notes:'unchanged'};
const put=async(id,type,payload)=>db.query('insert into cuddle_stay.kennel_records(id,type,payload) values($1,$2,$3)',[id,type,payload]);
await put('dog','ownedDog',dog);await put('other','ownedDog',{id:'other',type:'ownedDog',notes:'unrelated'});
await db.exec('set role authenticated');
const get=async(id='dog')=>(await db.query('select payload from cuddle_stay.kennel_records where id=$1',[id])).rows[0]?.payload;
const update=async(payload,id='dog')=>db.query('update cuddle_stay.kennel_records set payload=$1 where id=$2',[payload,id]);
const edit=async(expected=original,note='changed\nintact',field='careNotesHistory',index=0,minutes=null)=>db.query('select cuddle_stay.edit_owned_care_history($1,$2,$3,$4,$5,$6) result',['dog',field,index,expected,note,minutes]);
for(const role of ['staff','helper','manager','customer']){
 await db.exec(`set test.app_role='${role}'`);
 await assert.rejects(edit(),/Only admins/);
 if(role==='customer')continue;
 await assert.rejects(update({...dog,careNotesHistory:[{...original,note:'bypass'},duplicate]}),/Only admins/);
 await assert.rejects(db.query("insert into cuddle_stay.kennel_records(id,type,payload) values('dog','ownedDog',$1) on conflict(id) do update set payload=excluded.payload",[{...dog,careNotesHistory:[{...original,note:'upsert bypass'},duplicate]}]),/Only admins/);
 await assert.rejects(update({...dog,careNotesHistory:[duplicate]}),/Only admins/);
 await assert.rejects(update({...dog,careNotesHistory:[original,duplicate,{...original,note:'duplicate bypass'}]}),/IDs must identify/);
 await assert.rejects(db.query("delete from cuddle_stay.kennel_records where id='dog'"),/Only admins/);
 await assert.rejects(db.query("update cuddle_stay.kennel_records set type='request' where id='dog'"),/Only admins/);
}
await db.exec("set test.app_role='staff'");
await update({...dog,foodAmount:'staff update',careNotesHistory:[{id:'new',note:'new entry',date:original.date},...dog.careNotesHistory]});
assert.equal((await get()).careNotesHistory.length,3,'staff can append same-day entry');
await db.exec("set test.app_role='admin'");
await assert.rejects(edit(),/history changed/,'prepend invalidates stale editor');
await edit(original,'edited\nline 2','careNotesHistory',1);
let saved=await get();assert.equal(saved.foodAmount,'staff update');assert.equal(saved.careNotesHistory.length,3);assert.deepEqual(saved.careNotesHistory[2],duplicate);assert.equal(saved.careNotesHistory[1].createdAt,original.createdAt);assert.equal(saved.careNotesHistory[1].date,original.date);assert.equal(saved.careNotesHistory[1].completedBy,original.completedBy);assert.deepEqual(saved.careNotesHistory[1].mediaItems,original.mediaItems);assert.equal(saved.careNotesHistory[1].editHistory[0].note,original.note);assert.equal((await get('other')).notes,'unrelated');
await assert.rejects(edit(original,'stale','careNotesHistory',1),/history changed/);
await assert.rejects(edit(saved.careNotesHistory[1],'x','foodAmount',0),/Invalid/);
// Legacy missing ID, duplicate IDs, and timestamp-free data remain precisely targeted.
const legacy={date:'2020-01-01',note:'legacy'};await update({...saved,careNotesHistory:[legacy,legacy],exerciseLogs:[{id:'run',date:'2020-02-02',minutes:'10',note:'walk'}]});
await edit(legacy,'legacy correction','careNotesHistory',1);saved=await get();assert.deepEqual(saved.careNotesHistory[0],legacy);assert(!saved.careNotesHistory[1].createdAt);assert(!saved.careNotesHistory[1].loggedAt);
await edit(saved.exerciseLogs[0],'exercise correction','exerciseLogs',0,'12.5');assert.equal((await get()).exerciseLogs[0].minutes,'12.5');
await assert.rejects(edit((await get()).exerciseLogs[0],'bad','exerciseLogs',0,'-1'),/Invalid/);
// Source and projection update atomically. Later source synchronization cannot revert the note.
const sourceLog={id:'source-log',dogId:'dog',careType:'Medical/Behavior Note',date:'2026-01-02',note:'source note',loggedAt:'2026-01-04T17:00:00Z',completedBy:'Staff'};
const projection={id:'derived',sourceDailyTaskId:'daily',sourceCareLogId:'source-log',type:'Medical/Care',date:sourceLog.date,note:sourceLog.note,loggedAt:sourceLog.loggedAt,completedBy:'Staff'};
await put('daily','dailyTask',{id:'daily',type:'dailyTask',date:'2026-01-02',structuredCareLogs:[sourceLog],unrelated:'kept'});
await update({...saved,careNotesHistory:[projection]});await edit(projection,'synced edit');assert.equal((await get('daily')).structuredCareLogs[0].note,'synced edit');assert.equal((await get('daily')).structuredCareLogs[0].loggedAt,sourceLog.loggedAt);assert.equal((await get('daily')).unrelated,'kept');
await db.exec("set test.app_role='staff'");let daily=await get('daily');await assert.rejects(update({...daily,structuredCareLogs:[{...daily.structuredCareLogs[0],note:'source bypass'}]},'daily'),/Only admins/);
await update({...daily,structuredCareLogs:[{id:'second',note:'new'},...daily.structuredCareLogs]},'daily');
await db.exec("set test.app_role='admin'");const current=(await get()).careNotesHistory[0];await update({...await get('daily'),structuredCareLogs:[]},'daily');await assert.rejects(edit(current,'missing source'),/source care log changed/);assert.deepEqual((await get()).careNotesHistory[0],current,'failed linked edit rolls back');
// Boarding entry and mirrored source profiles, with real backend enforcement.
const boardingLog={id:'board-log',date:'2020-01-02',loggedAt:'2026-07-03T18:00:00Z',note:'old boarding note',completedBy:'Original',dogId:'board',stayId:'stay',minutes:'10',staffOnly:true,mediaItems:[{name:'keep'}]};
await db.exec("reset role;set test.app_role='admin'");
await put('board','boardingDog',{id:'board',type:'boardingDog',careLogs:[boardingLog,{id:'sibling',note:'untouched'}]});
await put('board-copy','boardingDog',{id:'board-copy',type:'boardingDog',careLogs:[{...boardingLog,dogId:'board-copy',stayId:'copy-stay'}]});
await db.exec('set role authenticated');
const boardEdit=async(expected=boardingLog,note='updated board',minutes='15')=>db.query("select cuddle_stay.edit_boarding_care_history('board','careLogs',0,$1,$2,$3)",[expected,note,minutes]);
for(const role of ['staff','helper','manager','customer']){await db.exec(`set test.app_role='${role}'`);await assert.rejects(boardEdit(),/Only admins/);if(role!=='customer')await assert.rejects(update({...await get('board'),careLogs:[]},'board'),/Only admins/);}
await db.exec("set test.app_role='staff'");await update({...await get('board'),careLogs:[boardingLog,{id:'sibling',note:'untouched'},{id:'append',note:'new'}]},'board');
await db.exec("set test.app_role='admin'");await boardEdit();let board=await get('board');const copy=await get('board-copy');assert.equal(board.careLogs[0].note,'updated board');assert.equal(copy.careLogs[0].note,'updated board');assert.equal(copy.careLogs[0].dogId,'board-copy');assert.equal(copy.careLogs[0].stayId,'copy-stay');assert.equal(board.careLogs[0].loggedAt,boardingLog.loggedAt);assert.equal(board.careLogs[0].completedBy,'Original');assert.deepEqual(board.careLogs[0].mediaItems,boardingLog.mediaItems);assert.equal(board.careLogs[1].note,'untouched');await assert.rejects(boardEdit(),/history changed/);
await update({...copy,careLogs:[{...copy.careLogs[0],note:'conflicting copy'}]},'board-copy');await assert.rejects(boardEdit(board.careLogs[0],'must rollback'),/linked boarding/);assert.equal((await get('board')).careLogs[0].note,'updated board');
await db.close();console.log('PASS SQL: real PostgreSQL RPC, admin authorization, staff append/unrelated updates, direct-edit/delete/type/duplicate denial, stale conflicts, precise legacy identity, source atomicity, audit and timestamp preservation.');
