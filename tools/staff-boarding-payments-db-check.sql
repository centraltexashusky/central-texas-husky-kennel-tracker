-- Run as database owner. All fictional records and receipt changes roll back.
begin;
do $test$
declare
  staff_id uuid;
  customer_id uuid;
  test_id text := 'staff-payment-qa-' || gen_random_uuid();
begin
  select user_id into staff_id from shared.organization_members
    where organization_id=cuddle_stay_private.cuddle_stay_organization_id() and role='staff' limit 1;
  select user_id into customer_id from shared.organization_members
    where organization_id=cuddle_stay_private.cuddle_stay_organization_id() and role='customer' limit 1;
  if staff_id is null or customer_id is null then raise exception 'Staff and customer test identities required'; end if;
  perform set_config('qa.payment_id',test_id,true);
  perform set_config('qa.customer_id',customer_id::text,true);
  insert into cuddle_stay.kennel_records(id,type,user_id,payload)
    values(test_id,'boardingDog',customer_id,jsonb_build_object('id',test_id,'type','boardingDog','dogName','Fictional receipt QA',
      'stays',jsonb_build_array(jsonb_build_object('id','qa-stay','requestCode','BR-QA','status','In Kennel',
        'pricingSnapshot',jsonb_build_object('total',100)))));
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'role','authenticated')::text,true);
end;
$test$;
set local role authenticated;
do $test$
declare
  test_id text := current_setting('qa.payment_id');
  receipt jsonb := jsonb_build_object('id','qa-receipt','stayId','qa-stay','requestCode','BR-QA','amount',100,
    'kind','Paid in full','method','Cash','receivedDate',(now() at time zone 'America/Chicago')::date::text);
  saved jsonb;
  affected integer;
begin
  if cuddle_stay_private.kennel_user_role() <> 'staff' then raise exception 'Not testing staff'; end if;
  update cuddle_stay.kennel_records set payload=payload||jsonb_build_object('boardingPayments',jsonb_build_array(receipt))
    where id=test_id returning payload into saved;
  if saved is null or saved#>>'{stays,0,paymentStatus}' <> 'Paid' or
    saved#>>'{boardingPayments,0,recordedByUserId}' <> auth.uid()::text then
    raise exception 'Staff receipt did not persist through RLS and stamp identity/paid status';
  end if;
  -- Existing receipt changes are forbidden, not just hidden by the UI.
  begin
    update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{boardingPayments,0,amount}','1') where id=test_id;
    raise exception 'QA: receipt edit unexpectedly allowed';
  exception when others then
    if sqlerrm <> 'Saved payment receipts cannot be changed' then raise; end if;
  end;
  begin
    update cuddle_stay.kennel_records set payload=payload||jsonb_build_object('boardingPaymentCancellations',
      jsonb_build_array(jsonb_build_object('paymentId','qa-receipt','reason','QA'))) where id=test_id;
    raise exception 'QA: cancellation unexpectedly allowed';
  exception when others then
    if sqlerrm <> 'Only administrators can cancel payments' then raise; end if;
  end;
  begin
    update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{boardingPayments}',
      payload->'boardingPayments'||jsonb_build_array(receipt||'{"id":"invalid","amount":-1}'::jsonb)) where id=test_id;
    raise exception 'QA: invalid amount unexpectedly allowed';
  exception when others then
    if sqlerrm <> 'Payment amount must be positive with at most two decimal places' then raise; end if;
  end;
  -- An older client omitting history cannot erase the payment.
  update cuddle_stay.kennel_records set payload=payload-'boardingPayments' where id=test_id returning payload into saved;
  if jsonb_array_length(saved->'boardingPayments') <> 1 then raise exception 'Receipt history lost'; end if;
  if cuddle_stay.kennel_staff_can_write_record('financialTransaction','{}') then raise exception 'Ledger permission widened'; end if;
  perform set_config('request.jwt.claim.sub',current_setting('qa.customer_id'),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('qa.customer_id'),'role','authenticated')::text,true);
  begin
    update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{boardingPayments}',
      payload->'boardingPayments'||jsonb_build_array(receipt||'{"id":"customer-receipt"}'::jsonb)) where id=test_id;
    get diagnostics affected=row_count;
    if affected <> 0 then raise exception 'QA: customer receipt unexpectedly allowed'; end if;
  exception when insufficient_privilege then null;
    when raise_exception then
      if sqlerrm <> 'Only staff or administrators can record boarding payments' then raise; end if;
  end;
end;
$test$;
reset role;
rollback;
select 'PASS: staff receipt, RLS, recorded identity, paid flag, immutable history, admin-only cancellation, amount validation, customer rejection, unchanged ledger permission; all test data rolled back' as result;
