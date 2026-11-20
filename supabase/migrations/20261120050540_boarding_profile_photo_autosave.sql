-- Photo-only, optimistic concurrency control. Normal record RLS/triggers remain
-- in force; neither function can create profiles or change boarding/billing.
create or replace function cuddle_stay.boarding_photo_context(p_boarding_id text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 b cuddle_stay.kennel_records%rowtype;
 parent cuddle_stay.kennel_records%rowtype;
 r cuddle_stay.kennel_records%rowtype;
 org uuid:=cuddle_stay_private.cuddle_stay_organization_id();
 ids text[]; customers text[]; customer_id text; matches text[];
 targets jsonb:='[]';
begin
 if auth.uid() is null or not cuddle_stay_private.kennel_is_staff_member() then
  raise exception 'Staff access required to update a boarding photo.' using errcode='42501';
 end if;
 select * into b from cuddle_stay.kennel_records where id=p_boarding_id and type='boardingDog' and organization_id=org and coalesce(payload->>'removed','false')<>'true';
 if not found then raise exception 'This boarding profile is no longer available. Reopen the dog profile.'; end if;
 parent:=b;
 if coalesce(b.payload->>'sourceBoardingDogId','') not in ('',b.id) then
  select * into parent from cuddle_stay.kennel_records where id=b.payload->>'sourceBoardingDogId' and type='boardingDog' and organization_id=org and coalesce(payload->>'removed','false')<>'true';
  if not found then raise exception 'The linked dog profile is unavailable. Reopen the dog profile before uploading.'; end if;
 end if;
 ids:=array[b.id,parent.id];
 select array_agg(distinct x) into customers from unnest(array[
  b.payload->>'linkedCustomerDogId',b.payload->>'sourceCustomerDogId',b.payload->>'customerDogId',
  parent.payload->>'linkedCustomerDogId',parent.payload->>'sourceCustomerDogId',parent.payload->>'customerDogId'
 ]) x where coalesce(x,'')<>'';
 if cardinality(customers)>1 then raise exception 'Conflicting linked customer profiles. Ask an admin to review this dog before uploading.'; end if;
 customer_id:=customers[1];
 if customer_id is null then
  -- Legacy profiles can have only a reverse link, or an owner/name match.
  -- Unlike display fallbacks, a write requires exactly one matching profile.
  select array_agg(id order by id) into matches from cuddle_stay.kennel_records c
  where c.organization_id=org and c.type='customerDog' and coalesce(c.payload->>'removed','false')<>'true' and (
   c.payload->>'linkedBoardingDogId'=any(ids) or c.payload->>'sourceBoardingDogId'=any(ids)
   or (jsonb_typeof(c.payload->'legacyBoardingDogIds')='array' and (c.payload->'legacyBoardingDogIds') ?| ids)
   or (lower(btrim(c.payload->>'dogName'))=lower(btrim(parent.payload->>'dogName')) and exists (
    select 1 from unnest(array[c.payload->>'ownerEmail',c.payload->>'customerEmail',c.payload->>'linkedOwnerEmail',c.payload->>'secondaryOwnerEmail',c.payload->>'requestedByEmail']) ce
    join unnest(array[parent.payload->>'ownerEmail',parent.payload->>'customerEmail',parent.payload->>'linkedOwnerEmail',parent.payload->>'secondaryOwnerEmail',parent.payload->>'requestedByEmail']) be on lower(btrim(ce))=lower(btrim(be))
    where coalesce(btrim(ce),'')<>''
   ))
  );
  if cardinality(matches)>1 then raise exception 'More than one customer profile matches this dog. Ask an admin to review the links before uploading.'; end if;
  customer_id:=matches[1];
 end if;
 if customer_id is not null then
  perform 1 from cuddle_stay.kennel_records where id=customer_id and type='customerDog' and organization_id=org and coalesce(payload->>'removed','false')<>'true';
  if not found then raise exception 'The linked customer profile is unavailable. Reopen the dog profile before uploading.'; end if;
  ids:=array_append(ids,customer_id);
 end if;
 for r in select * from cuddle_stay.kennel_records where organization_id=org and id=any(ids) order by id loop
  targets:=targets||jsonb_build_array(jsonb_build_object('id',r.id,'type',r.type,'version',md5((
   select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(r.payload)
   where key like 'profilePhoto%' or key in ('removed','linkedCustomerDogId','sourceCustomerDogId','customerDogId','sourceBoardingDogId','linkedBoardingDogId','legacyBoardingDogIds','ownerEmail','customerEmail','secondaryOwnerEmail','dogName')
  )::text)));
 end loop;
 return jsonb_build_object('boardingId',b.id,'targets',targets);
end $$;

create or replace function cuddle_stay.save_boarding_profile_photo(p_context jsonb,p_storage_path text,p_meta jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 fresh jsonb; result jsonb:='[]'; r cuddle_stay.kennel_records%rowtype;
 org uuid:=cuddle_stay_private.cuddle_stay_organization_id(); prefix text; saved_at text:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 fresh:=cuddle_stay.boarding_photo_context(p_context->>'boardingId');
 -- Stable lock order, then reread. Care/payment changes are preserved, while
 -- another photo or a changed canonical link requires a fresh review.
 perform 1 from cuddle_stay.kennel_records where organization_id=org and id in (select x->>'id' from jsonb_array_elements(fresh->'targets') x) order by id for update;
 fresh:=cuddle_stay.boarding_photo_context(p_context->>'boardingId');
 prefix:='users/'||auth.uid()::text||'/dog-photos/'||regexp_replace(fresh->>'boardingId','[^a-zA-Z0-9_-]','-','g')||'/';
 if p_storage_path is null or left(p_storage_path,length(prefix))<>prefix or substring(p_storage_path from length(prefix)+1) !~ '^[a-zA-Z0-9._-]+$' then
  raise exception 'The photo upload does not belong to this dog and account.' using errcode='42501';
 end if;
 if not exists(select 1 from storage.objects where bucket_id='kennel-media' and name=p_storage_path and metadata->>'mimetype' in ('image/jpeg','image/png','image/webp') and (metadata->>'size')::numeric between 1 and 52428800) then
  raise exception 'The uploaded photo could not be verified. Please upload it again.';
 end if;
 if p_meta is null or jsonb_typeof(p_meta)<>'object' or octet_length(p_meta::text)>20000 then raise exception 'Invalid photo information.'; end if;
 if fresh is distinct from p_context then
  -- A lost response may be retried with the same unique upload, but a newer
  -- different image must never be overwritten by a retry.
  if fresh->'targets' is null or exists(select 1 from cuddle_stay.kennel_records where organization_id=org and id in(select x->>'id' from jsonb_array_elements(fresh->'targets') x) and coalesce(payload->>'profilePhotoPath','')<>p_storage_path)
    or (select jsonb_agg(x->>'id' order by x->>'id') from jsonb_array_elements(fresh->'targets') x) is distinct from (select jsonb_agg(x->>'id' order by x->>'id') from jsonb_array_elements(p_context->'targets') x) then
   raise exception 'This dog photo or profile link changed during upload. Reopen the profile and choose the photo again.' using errcode='40001';
  end if;
 else
  update cuddle_stay.kennel_records k set payload=k.payload||jsonb_build_object(
   'profilePhotoUrl','','profilePhotoPath',p_storage_path,'profilePhotoData','','profilePhotoMeta',p_meta,
   'profilePhotoSourceRecordId',k.id,'profilePhotoSourceRecordType',k.type,
   'profilePhotoSavedAt',saved_at,'profilePhotoSavedBy',auth.uid()::text,'updatedAt',saved_at
  ),updated_at=now() where k.organization_id=org and k.id in(select x->>'id' from jsonb_array_elements(fresh->'targets') x);
 end if;
 for r in select * from cuddle_stay.kennel_records where organization_id=org and id in(select x->>'id' from jsonb_array_elements(fresh->'targets') x) order by id loop
  result:=result||jsonb_build_array(jsonb_build_object('id',r.id,'type',r.type,'payload',r.payload));
 end loop;
 return result;
end $$;
revoke all on function cuddle_stay.boarding_photo_context(text) from public,anon;
revoke all on function cuddle_stay.save_boarding_profile_photo(jsonb,text,jsonb) from public,anon;
grant execute on function cuddle_stay.boarding_photo_context(text) to authenticated,service_role;
grant execute on function cuddle_stay.save_boarding_profile_photo(jsonb,text,jsonb) to authenticated,service_role;
