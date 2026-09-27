-- Preserve immutable stay receipts when an older client saves a profile.
create or replace function cuddle_stay_private.protect_boarding_payments()
returns trigger language plpgsql set search_path = '' as $$
declare previous jsonb := '[]'; incoming jsonb; receipt jsonb; saved jsonb; additions jsonb := '[]'; actor text;
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
    if jsonb_typeof(receipt->'amount') <> 'number' or (receipt->>'amount')::numeric <= 0
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
    additions := additions || jsonb_build_array(receipt);
  end loop;
  if jsonb_array_length(previous || additions)>0 then
    new.payload := jsonb_set(new.payload,'{boardingPayments}',previous || additions);
  end if;
  return new;
end;
$$;
revoke all on function cuddle_stay_private.protect_boarding_payments() from public;
create trigger protect_boarding_payment_receipts before insert or update on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.protect_boarding_payments();
