-- Integration assertions use fictional rows and metadata only. ALWAYS ROLLBACK.
begin;
create temp table photo_qa_state as
select m.user_id, u.email, cuddle_stay_private.cuddle_stay_organization_id() org,
 'users/'||m.user_id||'/dog-photos/qa-photo-request/qa-photo.png' path
from shared.organization_members m join auth.users u on u.id=m.user_id
where m.organization_id=cuddle_stay_private.cuddle_stay_organization_id() and m.role='staff' limit 1;
grant select on photo_qa_state to authenticated;
do $$ begin assert (select count(*)=1 from photo_qa_state),'Staff fixture required'; end $$;
select set_config('request.jwt.claim.sub',user_id::text,true) from photo_qa_state;
insert into cuddle_stay.kennel_records(id,type,payload,user_id,helper_email,organization_id)
select id,type,jsonb_build_object('id',id,'type',type,'dogName','Photo QA Fictional','ownerEmail','photo-qa@example.invalid',
 'profilePhotoUrl','https://example.invalid/old.png','profilePhotoMeta','{}'::jsonb,
 'careLogs',jsonb_build_array(jsonb_build_object('note','Keep care')),'stays',jsonb_build_array(jsonb_build_object('id','qa-stay','status','Approved')),
 'boardingPayments',jsonb_build_array(jsonb_build_object('id','qa-receipt','amount',40,'stayId','qa-stay','kind','Deposit','method','Cash','receivedDate',(now() at time zone 'America/Chicago')::date::text)),
 'pricingScopeOverride','member','note','Keep profile')||links,
 s.user_id,s.email,s.org
from photo_qa_state s cross join (values
 ('qa-photo-parent','boardingDog','{"linkedCustomerDogId":"qa-photo-customer"}'::jsonb),
 ('qa-photo-request','boardingDog','{"sourceBoardingDogId":"qa-photo-parent","sourceCustomerDogId":"qa-photo-customer","linkedCustomerDogId":""}'::jsonb),
 ('qa-photo-customer','customerDog','{"linkedBoardingDogId":"qa-photo-parent"}'::jsonb),
 ('qa-photo-unrelated','boardingDog','{"ownerEmail":"unrelated@example.invalid"}'::jsonb)
) v(id,type,links);
insert into storage.objects(bucket_id,name,owner,owner_id,metadata)
select 'kennel-media',path,user_id,user_id::text,'{"mimetype":"image/png","size":100}'::jsonb from photo_qa_state;
select set_config('request.jwt.claim.sub',user_id::text,true) from photo_qa_state;
set local role authenticated;
do $$
declare context jsonb; result jsonb; upload_path text; before_rows jsonb; after_rows jsonb; stale jsonb;
begin
 select path into upload_path from photo_qa_state;
 context:=cuddle_stay.boarding_photo_context('qa-photo-request');
 assert jsonb_array_length(context->'targets')=3,'Raw, parent and customer must be included';
 select jsonb_object_agg(id,payload) into before_rows from cuddle_stay.kennel_records where id like 'qa-photo-%';
 -- A care update during upload is permitted and must survive the photo patch.
 update cuddle_stay.kennel_records set payload=payload||'{"note":"Concurrent note"}' where id='qa-photo-parent';
 result:=cuddle_stay.save_boarding_profile_photo(context,upload_path,'{"width":200}');
 assert jsonb_array_length(result)=3,'All linked photos save together';
 assert (select count(*)=3 from cuddle_stay.kennel_records where id in('qa-photo-parent','qa-photo-request','qa-photo-customer') and payload->>'profilePhotoPath'=upload_path),'Persisted photo paths';
 assert (select payload->>'note'='Concurrent note' from cuddle_stay.kennel_records where id='qa-photo-parent'),'Concurrent unrelated edit preserved';
 assert (select payload->>'linkedCustomerDogId'='' from cuddle_stay.kennel_records where id='qa-photo-request'),'Request provenance not promoted';
 select jsonb_object_agg(id,payload) into after_rows from cuddle_stay.kennel_records where id like 'qa-photo-%';
 assert after_rows->'qa-photo-unrelated'=before_rows->'qa-photo-unrelated','Unrelated dog untouched';
 assert not exists(select 1 from jsonb_each(before_rows) b join jsonb_each(after_rows) a using(key)
  where (b.value->'careLogs',b.value->'stays',b.value->'boardingPayments',b.value->'pricingScopeOverride') is distinct from
        (a.value->'careLogs',a.value->'stays',a.value->'boardingPayments',a.value->'pricingScopeOverride')),'Care, stays and billing preserved';
 result:=cuddle_stay.save_boarding_profile_photo(context,upload_path,'{}');
 assert jsonb_array_length(result)=3,'Lost-response retry is idempotent';
 stale:=cuddle_stay.boarding_photo_context('qa-photo-request');
 update cuddle_stay.kennel_records set payload=payload||'{"profilePhotoPath":"users/qa-newer.png"}' where id='qa-photo-customer';
 begin
  perform cuddle_stay.save_boarding_profile_photo(stale,upload_path,'{}');
  raise exception 'Expected stale photo rejection';
 exception when serialization_failure then null; end;
 assert (select payload->>'profilePhotoPath'='users/qa-newer.png' from cuddle_stay.kennel_records where id='qa-photo-customer'),'Newer photo not overwritten';
 begin
  perform cuddle_stay.save_boarding_profile_photo(context,'users/another/dog-photos/qa-photo-request/qa.png','{}');
  raise exception 'Expected cross-account path rejection';
 exception when insufficient_privilege then null; end;
 context:=cuddle_stay.boarding_photo_context('qa-photo-request');
 begin
  perform cuddle_stay.save_boarding_profile_photo(context,replace(upload_path,'qa-photo.png','missing.png'),'{}');
  raise exception 'Expected missing upload rejection';
 exception when raise_exception then
  if sqlerrm not like 'The uploaded photo could not be verified.%' then raise; end if;
 end;
 update cuddle_stay.kennel_records set payload=payload||'{"sourceCustomerDogId":"qa-missing-customer"}' where id='qa-photo-request';
 begin
  perform cuddle_stay.save_boarding_profile_photo(context,upload_path,'{}');
  raise exception 'Expected conflicting link rejection';
 exception when raise_exception then
  if sqlerrm not like 'Conflicting linked customer profiles.%' then raise; end if;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',user_id::text,true) from shared.organization_members
where organization_id=cuddle_stay_private.cuddle_stay_organization_id() and role='customer' limit 1;
set local role authenticated;
do $$ begin
 begin perform cuddle_stay.boarding_photo_context('qa-photo-parent'); raise exception 'Customer must be denied';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform cuddle_stay.boarding_photo_context('qa-photo-parent'); raise exception 'Anonymous must be denied';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Photo-only saves: staff, linked profiles, preservation, concurrency, retry and access assertions passed' as result;
rollback;
