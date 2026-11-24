import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_ENTRY || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
  create schema cuddle_stay;
  create schema cuddle_stay_private;
  create function cuddle_stay_private.cuddle_stay_organization_id() returns text language sql stable as
    $$select current_setting('fixture.org')$$;
  create table cuddle_stay.kennel_records (
    id text primary key, type text, organization_id text, owner_id text, payload jsonb, updated_at timestamptz default now(), submitted_at timestamptz default now()
  );
  create role fixture_owner;
  grant usage on schema cuddle_stay, cuddle_stay_private to fixture_owner;
  grant select on cuddle_stay.kennel_records to fixture_owner;
  alter table cuddle_stay.kennel_records enable row level security;
  create policy owner_only on cuddle_stay.kennel_records for select to fixture_owner
    using (owner_id=current_setting('fixture.owner'));
`);
await db.exec(readFileSync('supabase/migrations/20261124000000_retain_boarding_customer_update_media.sql','utf8'));
const stay = (id, date, status, more={}) => ({id, requestCode:'family-' + date, dropoffTime:date,pickupTime:date+'T11:00', status, ...more});
const photo = (s,name,more={}) => ({id:name, stayId:s.id, requestCode:s.requestCode,mediaItems:[{storagePath:'users/sandbox/boarding-customer-updates/' + name}],...more});
const write = (id,dog,stays,updates,owner='owner',org='org') => db.query(`
  insert into cuddle_stay.kennel_records(id,type,organization_id,owner_id,payload) values($1,'boardingDog',$2,$3,$4)
  on conflict(id) do update set payload=excluded.payload
`,[id,org,owner,{linkedCustomerDogId:dog,stays,customerUpdates:updates}]);
const a = stay('s-a','2026-11-20','Checked Out');
const b = stay('s-b','2026-11-20','Checked Out');
const next = stay('s-next','2026-12-01','Pending',{actualCheckInAt:''});
const ids = ['a','b','tenant','private','next','cancel','service'];
const baseline = [photo(a,'keep.jpg'),photo(a,'wrong.jpg',{stayId:b.id})];
await write('a','dog-a',[a],baseline);
await write('b','dog-b',[b],[photo(b,'sibling.jpg')]);
await write('tenant','dog-a',[next],[photo(next,'foreign.jpg')],'owner','other-org');
await write('private','dog-a',[next],[photo(next,'private.jpg')],'other-owner','org');
await write('cancel','dog-a',[stay('canceled','2026-12-02','Cancelled')],[]);
await write('service','dog-a',[stay('service','2026-12-03','Approved',{stayType:'Service Request'})],[]);
await db.exec("set role fixture_owner; set fixture.org='org'; set fixture.owner='owner';");
const read = async () => (await db.query('select cuddle_stay.kennel_boarding_customer_updates($1) as result',[ids])).rows[0].result.updates.map(x=>x.id).sort();
assert.deepEqual(await read(),['keep.jpg','sibling.jpg']);
const plan = (await db.query('select cuddle_stay.kennel_boarding_customer_update_retention_plan($1) as result',[ids])).rows[0].result;
assert.deepEqual(plan.storagePaths,[]);
assert.equal(plan.updateCount,0);
assert.equal((await db.query('select cuddle_stay.kennel_apply_boarding_customer_update_retention($1) as result',[ids])).rows[0].result.removedUpdateCount,0);
assert.deepEqual(await read(),['keep.jpg','sibling.jpg']);
await db.exec('reset role');
await write('next','dog-a',[next],[]);
await db.exec('set role fixture_owner');
assert.deepEqual(await read(),['sibling.jpg']);
await db.exec('reset role');
next.status='In Kennel';
await write('next','dog-a',[next],[photo(next,'next.jpg')]);
await db.exec('set role fixture_owner');
assert.deepEqual(await read(),['next.jpg','sibling.jpg']);
await db.exec('reset role');
next.status='Completed';
await write('next','dog-a',[next],[photo(next,'next.jpg')]);
await db.exec('set role fixture_owner');
assert.deepEqual(await read(),['next.jpg','sibling.jpg']);
assert.deepEqual((await db.query("select payload->'customerUpdates' as updates from cuddle_stay.kennel_records where id='a'")).rows[0].updates,baseline);
await db.close();
console.log('PostgreSQL fixture: completed + successor, service/cancel, same-owner dog, RLS owner/tenant, old plan/apply no-op, history retained.');
