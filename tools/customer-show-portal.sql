-- Minimal customer projection; never grant customers access to internal show payloads.
create table if not exists cuddle_stay_private.customer_show_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  dog_id text not null references cuddle_stay.kennel_records(id),
  event_id text not null references cuddle_stay.kennel_records(id),
  requested_by uuid not null,
  status text not null default 'Pending' check (status in ('Pending','Approved','Declined','Cancelled')),
  customer_note text not null default '',
  staff_note text not null default '',
  show_entry_id text,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dog_id, event_id)
);
alter table cuddle_stay_private.customer_show_requests enable row level security;
revoke all on cuddle_stay_private.customer_show_requests from public, anon, authenticated;
-- No direct access policies: all operations use the scoped private API below.

create or replace function cuddle_stay_private.customer_show_event_visible(p jsonb)
returns boolean language sql stable security invoker set search_path='' as $$
  select coalesce(p->>'removed','false') <> 'true'
    and p->>'status' in ('Going To','Going','Active')
    and coalesce(nullif(p->>'endDate',''),p->>'startDate','') >= to_char(now() at time zone 'America/Chicago','YYYY-MM-DD')
    and coalesce(p->>'startDate','') ~ '^\d{4}-\d{2}-\d{2}$'
$$;

create or replace function cuddle_stay_private.customer_show_portal(
  p_action text, p_dog_id text default null, p_event_id text default null,
  p_request_id uuid default null, p_expected_updated_at timestamptz default null,
  p_note text default ''
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  org uuid := cuddle_stay_private.cuddle_stay_organization_id();
  actor uuid := auth.uid();
  staff boolean := cuddle_stay_private.kennel_is_staff_member();
  email text := cuddle_stay.kennel_auth_email();
  dog cuddle_stay.kennel_records%rowtype;
  event cuddle_stay.kennel_records%rowtype;
  req cuddle_stay_private.customer_show_requests%rowtype;
  board cuddle_stay.kennel_records%rowtype;
  entry cuddle_stay.kennel_records%rowtype;
  entry_id text;
  entry_payload jsonb;
  result jsonb;
  today text := to_char(now() at time zone 'America/Chicago','YYYY-MM-DD');
begin
  if actor is null or cuddle_stay_private.kennel_user_role() = '' then
    raise exception 'Sign in to view show schedules.' using errcode='42501';
  end if;
  if p_action is null or p_action not in ('schedule','request','cancel','queue','approve','decline') then
    raise exception 'Unknown show action.';
  end if;
  if p_action in ('queue','approve','decline') and not staff then
    raise exception 'Staff confirmation is required.' using errcode='42501';
  end if;
  if length(coalesce(p_note,'')) > 1000 then raise exception 'Keep notes under 1,000 characters.'; end if;

  if p_action = 'queue' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',r.id,'dogId',r.dog_id,'dogName',d.payload->>'dogName',
      'ownerName',d.payload->>'ownerName','eventId',r.event_id,'showName',s.payload->>'name',
      'startDate',s.payload->>'startDate','endDate',s.payload->>'endDate',
      'eventStatus',s.payload->>'status','status',r.status,'customerNote',r.customer_note,
      'staffNote',r.staff_note,'updatedAt',r.updated_at,'createdAt',r.created_at,
      'showEntryId',r.show_entry_id,
      'estimate',(select e.payload->'customerEstimate' from cuddle_stay.kennel_records e where e.id=r.show_entry_id and e.organization_id=org),
      'registrationMissing', (select count(*) from unnest(array['registeredName','akcRegistrationNumber','sireName','damName']) k where coalesce(d.payload->>k,'')='')
    ) order by (r.status='Pending') desc,s.payload->>'startDate',r.created_at),'[]'::jsonb) into result
    from cuddle_stay_private.customer_show_requests r
    join cuddle_stay.kennel_records d on d.id=r.dog_id and d.organization_id=org
    join cuddle_stay.kennel_records s on s.id=r.event_id and s.organization_id=org
    where r.organization_id=org and (r.status='Pending' or coalesce(s.payload->>'endDate',s.payload->>'startDate','')>=today);
    return result;
  end if;

  if p_action in ('cancel','approve','decline') then
    select * into req from cuddle_stay_private.customer_show_requests
    where id=p_request_id and organization_id=org for update;
    if not found then raise exception 'Request unavailable.'; end if;
    p_dog_id := req.dog_id;
    p_event_id := req.event_id;
  end if;
  select * into dog from cuddle_stay.kennel_records
  where id=p_dog_id and type='customerDog' and organization_id=org for share;
  -- Ownership excludes helper/staff attribution; only actual owner emails qualify.
  if not found or (not staff and not (email<>'' and email in (
    lower(coalesce(dog.payload->>'ownerEmail','')),lower(coalesce(dog.payload->>'customerEmail','')),
    lower(coalesce(dog.payload->>'secondaryOwnerEmail',''))
  ))) then raise exception 'This dog is not available to this account.' using errcode='42501'; end if;
  if p_action not in ('cancel','decline') and (coalesce(dog.payload->>'removed','false')='true' or coalesce(dog.payload->>'showRegistrationEnabled','No')<>'Yes') then
    raise exception 'Staff must designate this dog for showing first.' using errcode='42501';
  end if;

  if p_action='schedule' then
    select jsonb_build_object('shows',coalesce(jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.payload->>'name','club',s.payload->>'club',
      'startDate',s.payload->>'startDate','endDate',s.payload->>'endDate',
      'location',coalesce(nullif(s.payload->>'venueAddress',''),nullif(s.payload->>'cityState',''),s.payload->>'venue'),
      'status',s.payload->>'status','entryClosingDate',s.payload->>'entryClosingDate',
      'canRequest',s.payload->>'startDate'>=today and coalesce(nullif(s.payload->>'entryClosingDate',''),today)>=today,
      'request',case when r.id is not null then jsonb_build_object('id',r.id,'status',r.status,'customerNote',r.customer_note,'staffNote',r.staff_note,'updatedAt',r.updated_at,'estimate',(select e.payload->'customerEstimate' from cuddle_stay.kennel_records e where e.id=r.show_entry_id and e.organization_id=org)) else null end
    ) order by s.payload->>'startDate',s.id),'[]'::jsonb)) into result
    from cuddle_stay.kennel_records s
    left join cuddle_stay_private.customer_show_requests r on r.organization_id=org and r.dog_id=dog.id and r.event_id=s.id
    where s.organization_id=org and s.type='showEvent' and cuddle_stay_private.customer_show_event_visible(s.payload);
    -- Retain decisions for cancelled/removed/past shows without exposing internal data.
    return result || jsonb_build_object('requests',coalesce((select jsonb_agg(jsonb_build_object(
      'id',r.id,'eventId',r.event_id,'showName',s.payload->>'name','startDate',s.payload->>'startDate',
      'eventStatus',case when coalesce(s.payload->>'removed','false')='true' then 'Removed' else s.payload->>'status' end,
      'status',r.status,'staffNote',r.staff_note,'updatedAt',r.updated_at,
      'estimate',(select e.payload->'customerEstimate' from cuddle_stay.kennel_records e where e.id=r.show_entry_id and e.organization_id=org)
    ) order by r.created_at desc) from cuddle_stay_private.customer_show_requests r
    join cuddle_stay.kennel_records s on s.id=r.event_id and s.organization_id=org
    where r.organization_id=org and r.dog_id=dog.id),'[]'::jsonb));
  end if;

  if p_action in ('cancel','approve','decline') then
    if req.updated_at is distinct from p_expected_updated_at then raise exception 'This request changed. Refresh and review it again.'; end if;
    if req.status<>'Pending' then raise exception 'This request has already been reviewed or cancelled.'; end if;
    if p_action in ('cancel','decline') then
      update cuddle_stay_private.customer_show_requests set
        status=case when p_action='cancel' then 'Cancelled' else 'Declined' end,
        staff_note=case when p_action='decline' then coalesce(p_note,'') else staff_note end,
        reviewed_by=case when p_action='decline' then actor else reviewed_by end, updated_at=clock_timestamp()
      where id=req.id returning * into req;
      return jsonb_build_object('id',req.id,'status',req.status);
    end if;
  end if;
  select * into event from cuddle_stay.kennel_records
  where id=p_event_id and type='showEvent' and organization_id=org for share;
  if not found or not cuddle_stay_private.customer_show_event_visible(event.payload)
    or event.payload->>'startDate'<today then raise exception 'This show is no longer accepting requests.'; end if;
  if coalesce(nullif(event.payload->>'entryClosingDate',''),today)<today then
    raise exception 'Entries have closed. Contact staff to discuss this show.';
  end if;

  if p_action='request' then
    insert into cuddle_stay_private.customer_show_requests(organization_id,dog_id,event_id,requested_by,customer_note)
    values(org,dog.id,event.id,actor,coalesce(p_note,''))
    on conflict(organization_id,dog_id,event_id) do nothing;
    select * into req from cuddle_stay_private.customer_show_requests where organization_id=org and dog_id=dog.id and event_id=event.id;
    return jsonb_build_object('id',req.id,'status',req.status);
  end if;

  -- Approval is atomic with roster planning, not an official entry or payment.
  select * into board from cuddle_stay.kennel_records b where b.organization_id=org and b.type='boardingDog'
    and coalesce(b.payload->>'removed','false')<>'true'
    and b.id=coalesce(nullif(dog.payload->>'linkedBoardingDogId',''),dog.payload->>'sourceBoardingDogId') for share;
  if not found then raise exception 'Link this dog to its boarding profile before approving.'; end if;
  select * into entry from cuddle_stay.kennel_records e where e.organization_id=org and e.type='showEntry'
    and e.payload->>'showEventId'=event.id and e.payload->>'dogId'=board.id
    and e.payload->>'dogType'='boardingDog' and coalesce(e.payload->>'removed','false')<>'true' limit 1 for update;
  if found then
    if coalesce(entry.payload->>'attendanceRole','Showing')<>'Showing' or entry.payload->>'status' in ('Completed','Scratched','Cancelled','Canceled') then
      raise exception 'An existing roster entry needs staff review before approval.';
    end if;
    entry_id := entry.id;
  else
    entry_id := 'showEntry-customer-' || req.id::text;
    entry_payload := jsonb_build_object('id',entry_id,'type','showEntry','showEventId',event.id,
      'dogId',board.id,'dogType','boardingDog','dogName',dog.payload->>'dogName',
      'attendanceRole','Showing','status','Considering','registrationStatus','Planned to go',
      'ringSchedules','[]'::jsonb,'prepMinutes',45,'readyBufferMinutes',15,
      'customerShowRequestId',req.id,'submittedAt',now(),'updatedAt',now(),
      'updatedEmail',email,'notes','Customer attendance request approved. Official show entry is still required.');
    insert into cuddle_stay.kennel_records(id,type,payload,organization_id,user_id,helper_email)
    values(entry_id,'showEntry',entry_payload,org,actor,email);
  end if;
  update cuddle_stay_private.customer_show_requests set status='Approved',staff_note=coalesce(p_note,''),
    reviewed_by=actor,show_entry_id=entry_id,updated_at=clock_timestamp() where id=req.id;
  return jsonb_build_object('id',req.id,'status','Approved','showEntryId',entry_id);
end $$;

create or replace function cuddle_stay.customer_show_portal(
  p_action text, p_dog_id text default null, p_event_id text default null,
  p_request_id uuid default null, p_expected_updated_at timestamptz default null, p_note text default ''
) returns jsonb language sql security invoker set search_path='' as $$
  select cuddle_stay_private.customer_show_portal(p_action,p_dog_id,p_event_id,p_request_id,p_expected_updated_at,p_note)
$$;
revoke all on function cuddle_stay_private.customer_show_event_visible(jsonb) from public,anon,authenticated;
revoke all on function cuddle_stay_private.customer_show_portal(text,text,text,uuid,timestamptz,text) from public,anon;
revoke all on function cuddle_stay.customer_show_portal(text,text,text,uuid,timestamptz,text) from public,anon;
grant execute on function cuddle_stay_private.customer_show_portal(text,text,text,uuid,timestamptz,text) to authenticated;
grant execute on function cuddle_stay.customer_show_portal(text,text,text,uuid,timestamptz,text) to authenticated;
