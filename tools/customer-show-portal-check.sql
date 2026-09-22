-- Isolated fixtures, all changes rolled back; no real customer or show data edited.
begin;
insert into auth.users(id,email) values
 ('a1390000-0000-4000-8000-000000000001','show-qa@example.invalid'),
 ('a1390000-0000-4000-8000-000000000002','show-other-qa@example.invalid'),
 ('a1390000-0000-4000-8000-000000000003','show-staff-qa@example.invalid');
insert into shared.organization_members(organization_id,user_id,role)
select cuddle_stay_private.cuddle_stay_organization_id(),id,case when email='show-staff-qa@example.invalid' then 'staff' else 'customer' end
from auth.users where id in ('a1390000-0000-4000-8000-000000000001','a1390000-0000-4000-8000-000000000002','a1390000-0000-4000-8000-000000000003');
insert into cuddle_stay.kennel_records(id,type,payload) values
 ('customerDog-show-qa139','customerDog','{"id":"customerDog-show-qa139","dogName":"Show QA","ownerEmail":"show-qa@example.invalid","showRegistrationEnabled":"Yes","linkedBoardingDogId":"boardingDog-show-qa139"}'),
 ('customerDog-regular-qa139','customerDog','{"id":"customerDog-regular-qa139","ownerEmail":"show-qa@example.invalid","showRegistrationEnabled":"No"}'),
 ('boardingDog-show-qa139','boardingDog','{"id":"boardingDog-show-qa139","dogName":"Show QA","ownerEmail":"show-qa@example.invalid","showRegistrationEnabled":"Yes","linkedCustomerDogId":"customerDog-show-qa139"}'),
 ('showEvent-qa139','showEvent','{"id":"showEvent-qa139","name":"QA future show","startDate":"2030-01-01","endDate":"2030-01-01","status":"Going To","notes":"PRIVATE SENTINEL","expenses":[9999]}'),
 ('showEvent-potential-qa139','showEvent','{"id":"showEvent-potential-qa139","startDate":"2030-01-02","status":"Potential"}'),
 ('showEvent-closed-qa139','showEvent','{"id":"showEvent-closed-qa139","startDate":"2030-01-02","status":"Going To","entryClosingDate":"2020-01-01"}'),
 ('showEvent-cancel-qa139','showEvent','{"id":"showEvent-cancel-qa139","startDate":"2030-01-02","status":"Going To"}');

set local role authenticated;
do $$
declare response jsonb; req uuid; stamp timestamptz; blocked boolean; count_requests int;
begin
  perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000001","email":"show-qa@example.invalid","role":"authenticated"}',true);
  response := cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139');
  assert response::text not like '%PRIVATE SENTINEL%', 'Internal notes leaked';
  assert response::text not like '%expenses%', 'Internal financial fields leaked';
  assert response::text like '%showEvent-qa139%', 'Eligible show missing';
  assert response::text not like '%showEvent-potential-qa139%', 'Potential show exposed';
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('schedule','customerDog-regular-qa139'); exception when insufficient_privilege then blocked:=true; end;
  assert blocked,'Non-show dog accessed calendar';
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('queue'); exception when insufficient_privilege then blocked:=true; end;
  assert blocked,'Customer accessed staff queue';
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('request','customerDog-show-qa139','showEvent-closed-qa139'); exception when raise_exception then blocked:=sqlerrm like 'Entries have closed%'; end;
  assert blocked,'Closed entries accepted';
  response:=cuddle_stay.customer_show_portal('request','customerDog-show-qa139','showEvent-qa139',p_note=>'QA request');
  req:=(response->>'id')::uuid;
  assert response->>'status'='Pending';
  assert cuddle_stay.customer_show_portal('request','customerDog-show-qa139','showEvent-qa139')->>'id'=req::text,'Duplicate request';
  response:=cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139');
  select (item->'request'->>'updatedAt')::timestamptz into stamp from jsonb_array_elements(response->'shows') item where item->>'id'='showEvent-qa139';
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('approve',p_request_id=>req,p_expected_updated_at=>stamp); exception when insufficient_privilege then blocked:=true; end;
  assert blocked,'Customer self-approved';
  perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000002","email":"show-other-qa@example.invalid","role":"authenticated"}',true);
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139'); exception when insufficient_privilege then blocked:=true; end;
  assert blocked,'Another customer accessed dog';
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('cancel',p_request_id=>req,p_expected_updated_at=>stamp); exception when insufficient_privilege then blocked:=true; end;
  assert blocked,'Another customer cancelled request';
  perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000003","email":"show-staff-qa@example.invalid","role":"authenticated"}',true);
  blocked:=false;
  begin perform cuddle_stay.customer_show_portal('approve',p_request_id=>req,p_expected_updated_at=>stamp-interval '1 second'); exception when raise_exception then blocked:=sqlerrm like 'This request changed%'; end;
  assert blocked,'Stale approval accepted';
  response:=cuddle_stay.customer_show_portal('approve',p_request_id=>req,p_expected_updated_at=>stamp,p_note=>'Confirmed by QA');
  assert response->>'status'='Approved';
  assert exists(select 1 from cuddle_stay.kennel_records where id=response->>'showEntryId' and payload->>'registrationStatus'='Planned to go' and payload->>'attendanceRole'='Showing'), 'Planned roster entry not saved';
  assert not exists(select 1 from cuddle_stay.kennel_records where id=response->>'showEntryId' and payload->>'status'='Entered'), 'Approval incorrectly registered dog';
  perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000001","email":"show-qa@example.invalid","role":"authenticated"}',true);
  response:=cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139');
  assert response::text like '%Attendance%' or response::text like '%Approved%';
  response:=cuddle_stay.customer_show_portal('request','customerDog-show-qa139','showEvent-cancel-qa139');
  req:=(response->>'id')::uuid;
  response:=cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139');
  select (item->'request'->>'updatedAt')::timestamptz into stamp from jsonb_array_elements(response->'shows') item where item->>'id'='showEvent-cancel-qa139';
  assert cuddle_stay.customer_show_portal('cancel',p_request_id=>req,p_expected_updated_at=>stamp)->>'status'='Cancelled';
  assert not has_table_privilege('authenticated','cuddle_stay_private.customer_show_requests','INSERT'), 'Direct writes allowed';
  assert not has_function_privilege('anon','cuddle_stay.customer_show_portal(text,text,text,uuid,timestamptz,text)','EXECUTE'), 'Anonymous RPC allowed';
end $$;
reset role;
select 'PASS: owner gating, show eligibility, sanitized schedule, deadline, idempotency, customer denial, cross-owner denial, stale review, atomic planned roster, cancellation and anonymous denial' result;
-- Run inside the existing portal QA fixture transaction.
set local role authenticated;
do $$
declare response jsonb; req uuid; stamp timestamptz; blocked boolean; source jsonb;
begin
 perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000001","email":"show-qa@example.invalid","role":"authenticated"}',true);
 response:=cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139');
 select (item->'request'->>'id')::uuid,(item->'request'->>'updatedAt')::timestamptz into req,stamp from jsonb_array_elements(response->'shows') item where item->>'id'='showEvent-qa139';
 blocked:=false;
 begin perform cuddle_stay.customer_show_estimate('send',req,stamp,'{"handling":100,"entryFee":35,"sharedExpenses":60,"other":5,"credit":10}'); exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Customer could set own estimate';
 perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000003","email":"show-staff-qa@example.invalid","role":"authenticated"}',true);
 source:=cuddle_stay.customer_show_estimate('send',req,stamp,'{"handling":100,"entryFee":35,"sharedExpenses":60,"other":5,"credit":10,"note":"Shared travel allocated to this dog."}');
 assert source->'customerEstimate'->>'total'='190','Estimate sum incorrect';
 assert source->>'ownerEmail'='show-qa@example.invalid','Estimate recipient missing';
 perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000002","email":"show-other-qa@example.invalid","role":"authenticated"}',true);
 blocked:=false;
 begin perform cuddle_stay.customer_show_estimate('accept',req,stamp); exception when insufficient_privilege then blocked:=true; end;
 assert blocked,'Another customer could accept estimate';
 perform set_config('request.jwt.claims','{"sub":"a1390000-0000-4000-8000-000000000001","email":"show-qa@example.invalid","role":"authenticated"}',true);
 blocked:=false;
 begin perform cuddle_stay.customer_show_estimate('accept',req,stamp); exception when raise_exception then blocked:=sqlerrm like 'This estimate changed%'; end;
 assert blocked,'Stale estimate could be accepted';
 response:=cuddle_stay.customer_show_portal('schedule','customerDog-show-qa139');
 select (item->'request'->>'updatedAt')::timestamptz into stamp from jsonb_array_elements(response->'shows') item where item->>'id'='showEvent-qa139';
 assert response::text like '%190%','Customer cannot see estimate';
 response:=cuddle_stay.customer_show_estimate('accept',req,stamp);
 assert response->>'status'='Accepted';
 assert not(response ? 'ownerEmail'),'Customer response leaked roster data';
 blocked:=false;
 begin perform cuddle_stay.customer_show_estimate('accept',req,(response->>'updatedAt')::timestamptz); exception when raise_exception then blocked:=sqlerrm like 'This estimate has already%'; end;
 assert blocked,'Estimate could be accepted twice';
 assert not has_function_privilege('anon','cuddle_stay.customer_show_estimate(text,uuid,timestamptz,jsonb)','EXECUTE');
end $$;
reset role;
select 'PASS: itemized estimate total, owner projection, staff-only price changes, other-owner denial, stale and duplicate response protection, customer acceptance, anonymous denial' result;

rollback;
