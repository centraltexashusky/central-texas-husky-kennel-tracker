-- Server-driven reminders: no browser session required. No financial records are written.
-- Migration version returned by the connected Supabase deployment (CLI unavailable locally).
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create table if not exists cuddle_stay.stay_reminder_config (
  id boolean primary key default true check(id), enabled boolean not null default false,
  token_hash text not null, updated_at timestamptz not null default now()
);
create table if not exists cuddle_stay.stay_reminder_outbox (
  id text primary key, record_id text not null, stay_id text not null,
  kind text not null check(kind in ('arrival','pickup')), event_at timestamptz not null,
  recipient text not null, message jsonb not null,
  status text not null default 'pending' check(status in ('pending','sending','sent','cancelled','failed')),
  attempts integer not null default 0, locked_until timestamptz,
  first_attempt_at timestamptz, sent_at timestamptz, provider_id text, last_error text,
  created_at timestamptz not null default now()
);
alter table cuddle_stay.stay_reminder_config enable row level security;
alter table cuddle_stay.stay_reminder_outbox enable row level security;
revoke all on cuddle_stay.stay_reminder_config,cuddle_stay.stay_reminder_outbox from public,anon,authenticated;
grant select,insert,update,delete on cuddle_stay.stay_reminder_config,cuddle_stay.stay_reminder_outbox to service_role;
create index if not exists stay_reminder_pending_idx on cuddle_stay.stay_reminder_outbox(status,locked_until) where status in ('pending','sending');

create or replace function cuddle_stay_private.reminder_time(value text) returns timestamptz
language plpgsql stable set search_path = '' as $$
begin
  if nullif(value,'') is null then return null; end if;
  if value ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then return value::timestamptz; end if;
  return value::timestamp at time zone 'America/Chicago';
exception when others then return null;
end $$;
revoke all on function cuddle_stay_private.reminder_time(text) from public,anon,authenticated;
grant usage on schema cuddle_stay_private to service_role;
grant execute on function cuddle_stay_private.reminder_time(text) to service_role;

create or replace function cuddle_stay.stay_reminder_candidates(p_now timestamptz default now())
returns table(id text,record_id text,stay_id text,kind text,event_at timestamptz,recipient text,message jsonb)
language sql stable security invoker set search_path = '' as $$
with stays as (
 select r.id record_id,r.payload p,s,
   coalesce(nullif(s->>'status',''),r.payload->>'boardingStatus') status,
   cuddle_stay_private.reminder_time(coalesce(nullif(s->>'dropoffTime',''),s->>'requestedDropoffTime')) arrival,
   cuddle_stay_private.reminder_time(coalesce(nullif(s->>'pickupTime',''),s->>'requestedPickupTime')) pickup
 from cuddle_stay.kennel_records r
 cross join lateral jsonb_array_elements(case when jsonb_typeof(r.payload->'stays')='array' then r.payload->'stays' else '[]'::jsonb end) s
 where r.type='boardingDog' and coalesce(r.payload->>'removed','false') not in ('true','on')
 and nullif(r.payload->>'mergedIntoBoardingDogId','') is null
 and coalesce(s->>'removed','false') <> 'true'
 and nullif(s->>'id','') is not null
 and coalesce(s->>'stayType',r.payload->>'stayType','Boarding') not in ('Service Request','Service')
 and nullif(s->>'checkedOutAt','') is null
), events as (
 select *, 'arrival'::text kind,arrival event_at from stays where status='Approved'
 union all
 select *, 'pickup'::text kind,pickup event_at from stays where status in ('Checked In','In Kennel','Ready For Pickup')
), addressed as (
 select e.*,lower(trim(a.email)) recipient
 from events e cross join lateral (select distinct value email from jsonb_array_elements_text(jsonb_build_array(
   coalesce(nullif(p->>'ownerEmail',''),nullif(p->>'customerEmail',''),nullif(p->>'linkedOwnerEmail',''),p->>'requestedByEmail'),p->>'secondaryOwnerEmail'
 )) where value is not null and value <> '') a
 where event_at>p_now and event_at<=p_now+interval '24 hours'
 and a.email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and a.email !~* '\.invalid$'
)
select md5(record_id||'|'||(s->>'id')||'|'||kind||'|'||extract(epoch from event_at)::text||'|'||recipient),record_id,s->>'id',kind,event_at,recipient,
 jsonb_build_object('dogName',coalesce(p->>'dogName','Your dog'),'requestCode',coalesce(s->>'requestCode',s->>'id'),
 'eventAt',event_at,'kind',kind,'paid',
 lower(coalesce(s->>'paymentStatus',''))='paid' or
 (lower(coalesce(p->>'paymentStatus',''))='paid' and cuddle_stay_private.reminder_time(p->>'paidAt')>=coalesce(cuddle_stay_private.reminder_time(s->>'createdAt'),arrival)),
 'recordId',record_id,'stayId',s->>'id')
from addressed;
$$;
revoke all on function cuddle_stay.stay_reminder_candidates(timestamptz) from public,anon,authenticated;
grant execute on function cuddle_stay.stay_reminder_candidates(timestamptz) to service_role;

create or replace function cuddle_stay.claim_stay_reminders() returns setof cuddle_stay.stay_reminder_outbox
language plpgsql security invoker set search_path = '' as $$
begin
 if not exists(select 1 from cuddle_stay.stay_reminder_config where id and enabled) then return; end if;
 -- Cancel removed, rescheduled, checked-out or otherwise no-longer-eligible work before delivery.
 update cuddle_stay.stay_reminder_outbox o set status='cancelled',last_error='Stay no longer eligible'
 where o.status in ('pending','sending') and (o.locked_until is null or o.locked_until<now())
 and not exists(select 1 from cuddle_stay.stay_reminder_candidates() c where c.id=o.id);
 insert into cuddle_stay.stay_reminder_outbox(id,record_id,stay_id,kind,event_at,recipient,message)
 select * from cuddle_stay.stay_reminder_candidates() on conflict(id) do nothing;
 -- Keep retries inside the email provider's 24h idempotency window. Ambiguous older work needs review.
 update cuddle_stay.stay_reminder_outbox set status='failed',last_error='Retry window expired; review delivery before retrying'
 where status in ('pending','sending') and first_attempt_at < now()-interval '6 hours' and (locked_until is null or locked_until<now());
 return query with candidates as (
 select id from cuddle_stay.stay_reminder_outbox where status in ('pending','sending')
 and (locked_until is null or locked_until<now()) order by event_at limit 25 for update skip locked
 ) update cuddle_stay.stay_reminder_outbox o set status='sending',attempts=attempts+1,
 first_attempt_at=coalesce(first_attempt_at,now()),locked_until=now()+interval '10 minutes'
 from candidates c where o.id=c.id returning o.*;
end $$;
revoke all on function cuddle_stay.claim_stay_reminders() from public,anon,authenticated;
grant execute on function cuddle_stay.claim_stay_reminders() to service_role;

-- The opaque scheduler credential lives only in Vault; only its hash is available to the worker.
do $$ declare token text; begin
 if not exists(select 1 from vault.secrets where name='cuddle_stay_reminder_token') then
   perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'cuddle_stay_reminder_token');
 end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='cuddle_stay_reminder_token';
 insert into cuddle_stay.stay_reminder_config(id,token_hash) values(true,encode(extensions.digest(token,'sha256'),'hex'))
 on conflict(id) do update set token_hash=excluded.token_hash;
end $$;
create or replace function cuddle_stay_private.dispatch_stay_reminders() returns void
language plpgsql security invoker set search_path = '' as $$
declare token text; begin
 if not exists(select 1 from cuddle_stay.stay_reminder_config where id and enabled) then return; end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='cuddle_stay_reminder_token';
 perform net.http_post(url:='https://vwvkzniygessvwifrwvn.supabase.co/functions/v1/stay-reminders',
 headers:=jsonb_build_object('Content-Type','application/json','x-reminder-token',token),body:='{}'::jsonb,timeout_milliseconds:=90000);
end $$;
revoke all on function cuddle_stay_private.dispatch_stay_reminders() from public,anon,authenticated;
select cron.schedule('cuddle-stay-arrival-pickup-reminders','*/15 * * * *','select cuddle_stay_private.dispatch_stay_reminders();');
