-- One revisioned graph keeps parent/offspring edits atomic. No kennel or financial data is seeded.
create table cuddle_stay.pedigree_workspaces (
  id text primary key check (id = 'main'),
  data jsonb not null,
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table cuddle_stay.pedigree_workspaces enable row level security;
revoke all on cuddle_stay.pedigree_workspaces from public, anon, authenticated;
grant select, insert, update on cuddle_stay.pedigree_workspaces to authenticated;
create policy pedigree_staff_read on cuddle_stay.pedigree_workspaces
  for select to authenticated using ((select cuddle_stay_private.kennel_is_staff_member()));
create policy pedigree_admin_insert on cuddle_stay.pedigree_workspaces
  for insert to authenticated with check ((select cuddle_stay_private.kennel_is_admin()));
create policy pedigree_admin_update on cuddle_stay.pedigree_workspaces
  for update to authenticated using ((select cuddle_stay_private.kennel_is_admin()))
  with check ((select cuddle_stay_private.kennel_is_admin()));

create function cuddle_stay.validate_pedigree_workspace()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  d jsonb; p jsonb; r jsonb; field text; parent_id text; ids text[]; linked text[];
begin
  if tg_op = 'UPDATE' and new.revision <> old.revision + 1 then
    raise exception 'Pedigree revision must advance by one';
  end if;
  if tg_op = 'INSERT' and new.revision <> 1 then raise exception 'Initial pedigree revision must be one'; end if;
  if new.data->>'version' is distinct from '1' then raise exception 'Unsupported pedigree format'; end if;
  foreach field in array array['dogs','health','relationships','pairings'] loop
    if jsonb_typeof(new.data->field) is distinct from 'array' then raise exception 'Missing pedigree list: %',field; end if;
    if exists(select 1 from jsonb_array_elements(new.data->field) x where coalesce(x->>'id','') = '') then raise exception 'Every record needs an ID'; end if;
    if (select count(*) from jsonb_array_elements(new.data->field)) <> (select count(distinct x->>'id') from jsonb_array_elements(new.data->field) x) then raise exception 'Duplicate record ID'; end if;
  end loop;
  if jsonb_array_length(new.data->'dogs') > 5000 or jsonb_array_length(new.data->'health') > 25000 or pg_column_size(new.data) > 10485760 then raise exception 'Pedigree workspace is too large'; end if;
  select coalesce(array_agg(x->>'id'),array[]::text[]) into ids from jsonb_array_elements(new.data->'dogs') x;
  if exists(select 1 from jsonb_array_elements(new.data->'dogs') x where coalesce(x->>'ownedDogId','') <> '' group by x->>'ownedDogId' having count(*) > 1) then raise exception 'Our Dogs profile already linked'; end if;
  if exists(select 1 from jsonb_array_elements(new.data->'dogs') x where trim(coalesce(x->>'registrationNumber','')) <> '' group by upper(regexp_replace(x->>'registrationNumber','\s','','g')) having count(*) > 1) then raise exception 'Duplicate registration number'; end if;
  for d in select * from jsonb_array_elements(new.data->'dogs') loop
    if coalesce(d->>'id','') !~ '^[A-Za-z0-9_-]{1,120}$' or trim(coalesce(d->>'name','')) = '' or coalesce(d->>'sex','') not in ('Male','Female','Unknown') then raise exception 'Invalid dog identity'; end if;
    if coalesce(d->>'ownedDogId','') <> '' and not exists(select 1 from cuddle_stay.kennel_records k where k.type='ownedDog' and k.id=d->>'ownedDogId') then raise exception 'Linked Our Dogs profile does not exist'; end if;
    if coalesce(d->>'sireId','') <> '' and d->>'sireId'=d->>'damId' then raise exception 'Sire and dam must differ'; end if;
    foreach field in array array['sireId','damId'] loop
      parent_id := nullif(d->>field,'');
      if parent_id is not null then
        if not parent_id = any(ids) then raise exception 'Missing parent record'; end if;
        select x into p from jsonb_array_elements(new.data->'dogs') x where x->>'id'=parent_id;
        if (field='sireId' and p->>'sex'='Female') or (field='damId' and p->>'sex'='Male') then raise exception 'Parent sex conflicts with relationship'; end if;
        if nullif(d->>'dateOfBirth','') is not null and nullif(p->>'dateOfBirth','') is not null and (p->>'dateOfBirth')::date >= (d->>'dateOfBirth')::date then raise exception 'Parent must be born before offspring'; end if;
      end if;
    end loop;
  end loop;
  if exists(
    with recursive edges as (
      select x->>'id' child, nullif(x->>k,'') parent
      from jsonb_array_elements(new.data->'dogs') x cross join unnest(array['sireId','damId']) k
      where nullif(x->>k,'') is not null
    ), reach(child,ancestor) as (
      select child,parent from edges union select r.child,e.parent from reach r join edges e on e.child=r.ancestor
    ) select 1 from reach where child=ancestor
  ) then raise exception 'A dog cannot be its own ancestor'; end if;
  foreach field in array array['health','relationships','pairings'] loop
    for r in select * from jsonb_array_elements(new.data->field) loop
      linked := case when field='health' then array[r->>'dogId'] when field='relationships' then array[r->>'dogId',r->>'relativeId'] else array[r->>'sireId',r->>'damId'] end;
      if exists(select 1 from unnest(linked) v where v is null or not v=any(ids)) then raise exception 'Related dog does not exist'; end if;
      if field='health' and coalesce(r->>'kind','') not in ('OFA','DNA','Finding') then raise exception 'Invalid health record kind'; end if;
      if field='relationships' and r->>'dogId'=r->>'relativeId' then raise exception 'A dog cannot be its own sibling'; end if;
    end loop;
  end loop;
  new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end;
$$;
revoke all on function cuddle_stay.validate_pedigree_workspace() from public, anon, authenticated;
create trigger validate_pedigree_before_write before insert or update on cuddle_stay.pedigree_workspaces
  for each row execute function cuddle_stay.validate_pedigree_workspace();
comment on table cuddle_stay.pedigree_workspaces is 'Private pedigree research; staff read, admin edit; optimistic revision updates. Private certificates remain in kennel-media.';
