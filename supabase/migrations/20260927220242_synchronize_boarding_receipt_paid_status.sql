-- Preserve immutable stay receipts when an older client saves a profile.
create or replace function cuddle_stay_private.protect_boarding_payments()
returns trigger language plpgsql set search_path = '' as $$
declare previous jsonb := '[]'; incoming jsonb; receipt jsonb; saved jsonb; additions jsonb := '[]'; actor text; stay jsonb; stays jsonb := '[]'; paid numeric; total numeric;
begin
  if new.type <> 'boardingDog' then return new; end if;
  if tg_op = 'UPDATE' then previous := coalesce(old.payload->'boardingPayments','[]');
  else
    select coalesce(payload->'boardingPayments','[]') into previous from cuddle_stay.kennel_records
      where id=new.id and organization_id=new.organization_id;
    previous := coalesce(previous,'[]');
  end if;
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
    if actor <> 'admin' then raise exception 'Only administrators can record boarding payments'; end if;
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
      select sum((value->>'amount')::numeric) into paid from jsonb_array_elements(previous || additions)
        where value->>'stayId'=stay->>'id' or (coalesce(stay->>'requestCode','')<>'' and value->>'requestCode'=stay->>'requestCode');
      if paid is not null then
        total := case when jsonb_typeof(stay#>'{pricingSnapshot,total}')='number' then (stay#>>'{pricingSnapshot,total}')::numeric else null end;
        stay := stay || jsonb_build_object('paymentStatus',case when total is not null and paid>=total then 'Paid' else 'Partial' end);
      end if;
      stays := stays || jsonb_build_array(stay);
    end loop;
    new.payload := jsonb_set(new.payload,'{stays}',stays);
  end if;
  return new;
end;
$$;
revoke all on function cuddle_stay_private.protect_boarding_payments() from public;
