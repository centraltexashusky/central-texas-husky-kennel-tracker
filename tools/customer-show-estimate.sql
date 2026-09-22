-- Estimates are private roster data exposed only through the scoped customer projection.
create or replace function cuddle_stay_private.customer_show_estimate(
 p_action text, p_request_id uuid, p_expected_updated_at timestamptz, p_estimate jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 org uuid:=cuddle_stay_private.cuddle_stay_organization_id();
 actor uuid:=auth.uid();
 email text:=cuddle_stay.kennel_auth_email();
 staff boolean:=cuddle_stay_private.kennel_is_staff_member();
 req cuddle_stay_private.customer_show_requests%rowtype;
 dog cuddle_stay.kennel_records%rowtype;
 event cuddle_stay.kennel_records%rowtype;
 entry cuddle_stay.kennel_records%rowtype;
 estimate jsonb; stamp timestamptz:=clock_timestamp(); key text; amount numeric; total numeric:=0;
begin
 if actor is null or cuddle_stay_private.kennel_user_role()='' then raise exception 'Sign in first.' using errcode='42501'; end if;
 if p_action not in ('send','accept','decline') then raise exception 'Unknown estimate action.'; end if;
 if p_action='send' and not staff then raise exception 'Only staff can prepare estimates.' using errcode='42501'; end if;
 select * into req from cuddle_stay_private.customer_show_requests where id=p_request_id and organization_id=org for update;
 if not found or req.status<>'Approved' then raise exception 'Approve attendance before preparing an estimate.'; end if;
 select * into dog from cuddle_stay.kennel_records where id=req.dog_id and organization_id=org;
 if not staff and not (email<>'' and email in (lower(coalesce(dog.payload->>'ownerEmail','')),lower(coalesce(dog.payload->>'customerEmail','')),lower(coalesce(dog.payload->>'secondaryOwnerEmail','')))) then
   raise exception 'This estimate is not available to this account.' using errcode='42501';
 end if;
 if p_action in ('accept','decline') and staff then raise exception 'The customer must respond from their own account.' using errcode='42501'; end if;
 if req.updated_at is distinct from p_expected_updated_at then raise exception 'This estimate changed. Refresh and review the latest version.'; end if;
 select * into event from cuddle_stay.kennel_records where id=req.event_id and organization_id=org;
 if coalesce(event.payload->>'removed','false')='true' or event.payload->>'status' not in ('Going To','Going') then raise exception 'Estimates can only be changed before the show starts.'; end if;
 select * into entry from cuddle_stay.kennel_records where id=req.show_entry_id and type='showEntry' and organization_id=org for update;
 if not found or coalesce(entry.payload->>'removed','false')='true' or entry.payload->>'status' in ('Cancelled','Canceled','Scratched','Completed') then raise exception 'The show entry is no longer available.'; end if;
 if p_action='send' then
  estimate:=jsonb_build_object('status','Awaiting response','sentAt',stamp,'sentBy',email,'note',left(coalesce(p_estimate->>'note',''),1000));
  foreach key in array array['handling','entryFee','sharedExpenses','other','credit'] loop
   if jsonb_typeof(p_estimate->key) is distinct from 'number' then raise exception 'Enter a valid amount for every estimate item.'; end if;
   amount:=(p_estimate->>key)::numeric;
   if amount<0 or amount>100000 or amount<>round(amount,2) then raise exception 'Amounts must be between 0 and 100,000 with at most two decimal places.'; end if;
   estimate:=estimate||jsonb_build_object(key,amount);
   total:=total+case when key='credit' then -amount else amount end;
  end loop;
  if total<0 then raise exception 'Credits cannot exceed estimated costs.'; end if;
  estimate:=estimate||jsonb_build_object('total',total);
 else
  estimate:=entry.payload->'customerEstimate';
  if estimate is null or estimate->>'status'<>'Awaiting response' then raise exception 'This estimate has already been answered or is not ready.'; end if;
  estimate:=estimate||jsonb_build_object('status',case when p_action='accept' then 'Accepted' else 'Declined' end,'respondedAt',stamp,'respondedBy',email);
 end if;
 update cuddle_stay.kennel_records set payload=payload||jsonb_build_object(
   'customerEstimate',estimate,'updatedAt',stamp,'ownerEmail',dog.payload->>'ownerEmail',
   'customerEmail',coalesce(dog.payload->>'customerEmail',dog.payload->>'ownerEmail'),
   'ownerName',dog.payload->>'ownerName','showName',event.payload->>'name','showStartDate',event.payload->>'startDate'
 ),updated_at=stamp where id=entry.id returning * into entry;
 update cuddle_stay_private.customer_show_requests set updated_at=stamp where id=req.id;
 -- Only staff receives the source record needed to send the notification.
 return case when staff then entry.payload||jsonb_build_object('id',entry.id,'type','showEntry') else jsonb_build_object('status',estimate->>'status','updatedAt',stamp) end;
end $$;
create or replace function cuddle_stay.customer_show_estimate(p_action text,p_request_id uuid,p_expected_updated_at timestamptz,p_estimate jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select cuddle_stay_private.customer_show_estimate(p_action,p_request_id,p_expected_updated_at,p_estimate)
$$;
revoke all on function cuddle_stay_private.customer_show_estimate(text,uuid,timestamptz,jsonb) from public,anon;
revoke all on function cuddle_stay.customer_show_estimate(text,uuid,timestamptz,jsonb) from public,anon;
grant execute on function cuddle_stay_private.customer_show_estimate(text,uuid,timestamptz,jsonb) to authenticated;
grant execute on function cuddle_stay.customer_show_estimate(text,uuid,timestamptz,jsonb) to authenticated;
