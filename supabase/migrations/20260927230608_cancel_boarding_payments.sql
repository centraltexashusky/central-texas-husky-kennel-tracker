-- Preserve immutable receipts and cancellations when an older client saves a profile.
create or replace function cuddle_stay_private.protect_boarding_payments()
returns trigger language plpgsql set search_path = '' as $$
declare previous jsonb := '[]'; incoming jsonb; receipt jsonb; saved jsonb; additions jsonb := '[]'; actor text; stay jsonb; stays jsonb := '[]'; paid numeric; total numeric; previous_cancellations jsonb := '[]'; cancellations jsonb; cancellation jsonb;
begin
  if new.type <> 'boardingDog' then return new; end if;
  if tg_op = 'UPDATE' then previous := coalesce(old.payload->'boardingPayments','[]');
  else
    select coalesce(payload->'boardingPayments','[]') into previous from cuddle_stay.kennel_records
      where id=new.id and organization_id=new.organization_id;
    previous := coalesce(previous,'[]');
  end if;
  if tg_op = 'UPDATE' then previous_cancellations := coalesce(old.payload->'boardingPaymentCancellations','[]');
  else
    select coalesce(payload->'boardingPaymentCancellations','[]') into previous_cancellations from cuddle_stay.kennel_records where id=new.id and organization_id=new.organization_id;
    previous_cancellations := coalesce(previous_cancellations,'[]');
  end if;
  cancellations := previous_cancellations;
  if jsonb_typeof(coalesce(new.payload->'boardingPaymentCancellations','[]')) <> 'array' then raise exception 'Cancellation history must be an array'; end if;
  for cancellation in select value from jsonb_array_elements(coalesce(new.payload->'boardingPaymentCancellations','[]')) loop
    saved := null;
    select value into saved from jsonb_array_elements(cancellations) where value->>'paymentId'=cancellation->>'paymentId';
    if saved is not null then
      if saved <> cancellation then raise exception 'Saved cancellations cannot be changed'; end if;
      continue;
    end if;
    if cuddle_stay_private.kennel_user_role() is distinct from 'admin' then raise exception 'Only administrators can cancel payments'; end if;
    if not exists(select 1 from jsonb_array_elements(previous) where value->>'id'=cancellation->>'paymentId') then raise exception 'Original payment receipt not found'; end if;
    if length(trim(coalesce(cancellation->>'reason',''))) not between 1 and 300 then raise exception 'A cancellation reason is required'; end if;
    cancellation := jsonb_build_object('paymentId',cancellation->>'paymentId','reason',trim(cancellation->>'reason'),
      'cancelledAt',now(),'cancelledBy',coalesce(nullif(cancellation->>'cancelledBy',''),'Admin'),'cancelledByUserId',auth.uid());
    cancellations := cancellations || jsonb_build_array(cancellation);
  end loop;
  if jsonb_array_length(cancellations)>0 then new.payload := jsonb_set(new.payload,'{boardingPaymentCancellations}',cancellations); end if;
  incoming := coalesce(new.payload->'boardingPayments','[]');
  if jsonb_typeof(incoming) <> 'array' then raise exception 'Payment history must be an array'; end if;
  actor := cuddle_stay_private.kennel_user_role();
  for receipt in select value from jsonb_array_elements(incoming) loop
    saved := null;
    select value into saved from jsonb_array_elements(previous) where value->>'id'=receipt->>'id';
    if saved is not null then
      if saved <> receipt then raise exception 'Saved payment receipts cannot be changed'; end if;
      continue;
    end if;
    if actor is distinct from 'admin' then raise exception 'Only administrators can record boarding payments'; end if;
    if coalesce(receipt->>'id','') = '' or exists(select 1 from jsonb_array_elements(additions) where value->>'id'=receipt->>'id')
      then raise exception 'Missing or duplicate payment receipt ID'; end if;
    if coalesce(jsonb_typeof(receipt->'amount'),'') <> 'number' or (receipt->>'amount')::numeric <= 0
      or (receipt->>'amount')::numeric <> round((receipt->>'amount')::numeric,2)
      then raise exception 'Payment amount must be positive with at most two decimal places'; end if;
    if coalesce(receipt->>'receivedDate','') !~ '^\d{4}-\d{2}-\d{2}$'
      or (receipt->>'receivedDate')::date > (now() at time zone 'America/Chicago')::date
      then raise exception 'Invalid payment date'; end if;
    if coalesce(receipt->>'kind','') not in ('Deposit','Prepayment','Paid in full')
      or coalesce(receipt->>'method','') not in ('Cash','Venmo','PayPal','Zelle','Credit Card','Check','Other')
      then raise exception 'Invalid payment type or method'; end if;
    if not exists(select 1 from jsonb_array_elements(coalesce(new.payload->'stays','[]')) s
      where s->>'id'=receipt->>'stayId' or (coalesce(receipt->>'requestCode','')<>'' and s->>'requestCode'=receipt->>'requestCode'))
      then raise exception 'Payment must reference a saved stay'; end if;
    receipt := receipt || jsonb_build_object('recordedByUserId', auth.uid());
    additions := additions || jsonb_build_array(receipt);
  end loop;
  if jsonb_array_length(previous || additions)>0 then
    new.payload := jsonb_set(new.payload,'{boardingPayments}',previous || additions);
    -- Keep existing reminder/payment flags in sync after later pricing changes.
    for stay in select value from jsonb_array_elements(coalesce(new.payload->'stays','[]')) loop
      select sum(case when exists(select 1 from jsonb_array_elements(cancellations) c where c->>'paymentId'=p->>'id') then 0 else (p->>'amount')::numeric end) into paid from jsonb_array_elements(previous || additions) p
        where p->>'stayId'=stay->>'id' or (coalesce(stay->>'requestCode','')<>'' and p->>'requestCode'=stay->>'requestCode');
      if paid is not null then
        total := case when jsonb_typeof(stay#>'{pricingSnapshot,total}')='number' then (stay#>>'{pricingSnapshot,total}')::numeric else null end;
        stay := stay || jsonb_build_object('paymentStatus',case when paid=0 then 'Unpaid' when total is not null and paid>=total then 'Paid' else 'Partial' end);
      end if;
      stays := stays || jsonb_build_array(stay);
    end loop;
    new.payload := jsonb_set(new.payload,'{stays}',stays);
  end if;
  return new;
end;
$$;
revoke all on function cuddle_stay_private.protect_boarding_payments() from public;
