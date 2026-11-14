-- Effective rates are an append-only part of each staff profile. Existing rates
-- become the baseline on the first change; no historical payment is inferred.
create or replace function cuddle_stay.payroll_rate_on_date(p_user jsonb, p_date date)
returns numeric language sql immutable security invoker set search_path = '' as $$
  select coalesce((select (r.value->>'rate')::numeric
    from jsonb_array_elements(coalesce(p_user->'hourlyRateHistory','[]'::jsonb)) with ordinality r(value,ord)
    where (r.value->>'effectiveDate')::date <= p_date
    order by (r.value->>'effectiveDate')::date desc, r.ord desc limit 1),
    case when jsonb_array_length(coalesce(p_user->'hourlyRateHistory','[]'::jsonb)) > 0 then 0
      else coalesce(nullif(p_user->>'hourlyRate',''),nullif(p_user->>'payRate',''),nullif(p_user->>'staffHourlyRate',''),'0')::numeric end);
$$;
revoke all on function cuddle_stay.payroll_rate_on_date(jsonb,date) from public,anon;
grant execute on function cuddle_stay.payroll_rate_on_date(jsonb,date) to authenticated,service_role;

create or replace function cuddle_stay_private.preserve_payroll_rate_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare history jsonb; old_rate numeric; new_rate numeric; effective date;
begin
  if new.type <> 'settingsUser' then return new; end if;
  if tg_op = 'INSERT' then
    if coalesce(new.payload->'hourlyRateHistory','[]'::jsonb) <> '[]'::jsonb then
      raise exception 'Rate history is created by saved rate changes.';
    end if;
    return new;
  end if;
  history := coalesce(old.payload->'hourlyRateHistory','[]'::jsonb);
  if new.payload ? 'hourlyRateHistory' and new.payload->'hourlyRateHistory' <> history then
    raise exception 'Saved rate history cannot be rewritten.';
  end if;
  new.payload:=jsonb_set(new.payload,'{hourlyRateHistory}',history);
  old_rate := coalesce(nullif(old.payload->>'hourlyRate',''),nullif(old.payload->>'payRate',''),nullif(old.payload->>'staffHourlyRate',''),'0')::numeric;
  new_rate := coalesce(nullif(new.payload->>'hourlyRate',''),'0')::numeric;
  if (new_rate is distinct from old_rate or (history<>'[]'::jsonb and new.payload->>'hourlyRateEffectiveDate' is distinct from old.payload->>'hourlyRateEffectiveDate')) and coalesce(new.payload->>'role','') in ('helper','staff','admin') then
    if not cuddle_stay_private.kennel_is_admin() then raise exception 'Only admins can change pay rates.' using errcode='42501'; end if;
    if new_rate <= 0 or new_rate > 10000 or new_rate <> round(new_rate,2) then raise exception 'Enter a positive hourly rate with at most two decimal places.'; end if;
    effective := coalesce(nullif(new.payload->>'hourlyRateEffectiveDate','')::date,(now() at time zone 'America/Chicago')::date);
    if effective < date '1900-01-02' then raise exception 'Choose a valid effective date.'; end if;
    if history = '[]'::jsonb then
      history := jsonb_build_array(jsonb_build_object('effectiveDate','1900-01-01','rate',old_rate,'baseline',true));
    end if;
    history := history || jsonb_build_array(jsonb_build_object('effectiveDate',effective,'rate',new_rate,'recordedAt',now(),'recordedBy',auth.uid()));
    new.payload := jsonb_set(new.payload,'{hourlyRateHistory}',history);
  end if;
  return new;
end $$;
revoke all on function cuddle_stay_private.preserve_payroll_rate_history() from public,anon,authenticated;
create trigger preserve_payroll_rate_history before insert or update on cuddle_stay.kennel_records
for each row execute function cuddle_stay_private.preserve_payroll_rate_history();

create or replace function cuddle_stay.set_payroll_rate(p_staff_id text,p_rate numeric,p_effective_date date,p_expected_history jsonb,p_expected_rate text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u cuddle_stay.kennel_records; result jsonb;
begin
  if not cuddle_stay_private.kennel_is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into u from cuddle_stay.kennel_records where id=p_staff_id and type='settingsUser' and organization_id=cuddle_stay_private.cuddle_stay_organization_id() for update;
  if not found or coalesce(u.payload->>'role','') not in ('helper','staff','admin') or coalesce(u.payload->>'removed','false')='true' then raise exception 'Active staff profile not found.'; end if;
  if coalesce(u.payload->'hourlyRateHistory','[]'::jsonb) is distinct from p_expected_history or coalesce(u.payload->>'hourlyRate','') is distinct from p_expected_rate then raise exception 'Pay rate changed since review. Refresh and try again.' using errcode='40001'; end if;
  if p_rate is null or p_rate<=0 or p_rate>10000 or p_rate<>round(p_rate,2) or p_effective_date is null or p_effective_date<date '1900-01-02' then raise exception 'Enter a valid rate and effective date.'; end if;
  update cuddle_stay.kennel_records set payload=u.payload||jsonb_build_object('hourlyRate',p_rate,'hourlyRateEffectiveDate',p_effective_date,'updatedAt',now()),updated_at=now() where id=u.id returning payload into result;
  return result;
end $$;
revoke all on function cuddle_stay.set_payroll_rate(text,numeric,date,jsonb,text) from public,anon;
grant execute on function cuddle_stay.set_payroll_rate(text,numeric,date,jsonb,text) to authenticated,service_role;

create table cuddle_stay.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default cuddle_stay_private.cuddle_stay_organization_id() references shared.organizations(id),
  staff_id text not null references cuddle_stay.kennel_records(id),
  week_start date not null check (extract(isodow from week_start)=1),
  paid_date date not null,
  payment_method text not null,
  reference text not null default '',
  note text not null default '',
  snapshot jsonb not null,
  amount_cents bigint not null default 0 check(amount_cents>0),
  recorded_by uuid not null default auth.uid(),
  recorded_at timestamptz not null default now()
);
create table cuddle_stay.payroll_payment_items (
  timesheet_id text primary key references cuddle_stay.kennel_records(id),
  payment_id uuid not null references cuddle_stay.payroll_payments(id),
  organization_id uuid not null references shared.organizations(id),
  snapshot jsonb not null
);
create index payroll_payments_org_week on cuddle_stay.payroll_payments(organization_id,week_start desc);
create index payroll_payments_staff on cuddle_stay.payroll_payments(staff_id);
create index payroll_payments_actor on cuddle_stay.payroll_payments(recorded_by);
create index payroll_payment_items_org on cuddle_stay.payroll_payment_items(organization_id);
create index payroll_payment_items_payment on cuddle_stay.payroll_payment_items(payment_id);
alter table cuddle_stay.payroll_payments enable row level security;
alter table cuddle_stay.payroll_payment_items enable row level security;
create policy "Admins read payroll payments" on cuddle_stay.payroll_payments for select to authenticated
using (organization_id=(select cuddle_stay_private.cuddle_stay_organization_id()) and (select cuddle_stay_private.kennel_is_admin()));
create policy "Admins record payroll payments" on cuddle_stay.payroll_payments for insert to authenticated
with check (organization_id=(select cuddle_stay_private.cuddle_stay_organization_id()) and (select cuddle_stay_private.kennel_is_admin()));
create policy "Admins read paid clock snapshots" on cuddle_stay.payroll_payment_items for select to authenticated
using (organization_id=(select cuddle_stay_private.cuddle_stay_organization_id()) and (select cuddle_stay_private.kennel_is_admin()));
revoke all on cuddle_stay.payroll_payments,cuddle_stay.payroll_payment_items from public,anon,authenticated;
grant select,insert on cuddle_stay.payroll_payments to authenticated;
grant select on cuddle_stay.payroll_payment_items to authenticated;
grant all on cuddle_stay.payroll_payments,cuddle_stay.payroll_payment_items to service_role;

create or replace function cuddle_stay.payroll_week_preview(p_staff_id text,p_week_start date)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u cuddle_stay.kennel_records; t cuddle_stay.kennel_records; d date; rate numeric; hours numeric; cents bigint; total bigint:=0; lines jsonb:='[]';
begin
  if not cuddle_stay_private.kennel_is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  if extract(isodow from p_week_start)<>1 then raise exception 'Payroll weeks start on Monday.'; end if;
  select * into u from cuddle_stay.kennel_records where id=p_staff_id and type='settingsUser' and organization_id=cuddle_stay_private.cuddle_stay_organization_id() for share;
  if not found or coalesce(u.payload->>'role','') not in ('helper','staff','admin') then raise exception 'Staff profile not found.'; end if;
  for t in select r.* from cuddle_stay.kennel_records r
    where r.type='timesheet' and r.organization_id=u.organization_id and coalesce(r.payload->>'removed','false')<>'true'
      and case when coalesce(nullif(r.payload->>'helperEmail',''),r.payload->>'staffEmail','')<>'' then
        lower(trim(coalesce(nullif(r.payload->>'helperEmail',''),r.payload->>'staffEmail'))) = lower(trim(u.payload->>'email'))
      else lower(trim(coalesce(r.payload->>'helperName',r.payload->>'staffName',''))) = lower(trim(u.payload->>'name'))
        and (select count(*) from cuddle_stay.kennel_records x where x.type='settingsUser' and x.organization_id=u.organization_id and x.payload->>'role' in ('helper','staff','admin') and lower(trim(x.payload->>'name'))=lower(trim(u.payload->>'name')))=1 end
      and coalesce(nullif(r.payload->>'date','')::date,(nullif(r.payload->>'clockInTime','')::timestamptz at time zone 'America/Chicago')::date) between p_week_start and p_week_start+6
      and not exists(select 1 from cuddle_stay.payroll_payment_items i where i.timesheet_id=r.id)
    order by r.id for share
  loop
    if nullif(t.payload->>'clockOutTime','') is null then raise exception 'An open clock entry needs review before this week can be paid.'; end if;
    hours:=round(coalesce(nullif(t.payload->>'hours',''),'0')::numeric,2);
    if hours<=0 then continue; end if;
    d:=coalesce(nullif(t.payload->>'date','')::date,(nullif(t.payload->>'clockInTime','')::timestamptz at time zone 'America/Chicago')::date);
    rate:=cuddle_stay.payroll_rate_on_date(u.payload,d);
    if rate<=0 then raise exception 'Set a historical rate for every work date before confirming payment.'; end if;
    cents:=round(hours*rate*100); total:=total+cents;
    lines:=lines||jsonb_build_array(jsonb_build_object('id',t.id,'date',d,'hours',hours,'rate',rate,'amountCents',cents,'staffId',u.id,'staffName',coalesce(t.payload->>'helperName',u.payload->>'name'),'staffEmail',u.payload->>'email','clockInTime',t.payload->>'clockInTime','clockOutTime',t.payload->>'clockOutTime','note',coalesce(t.payload->>'note',''),'source',t.payload));
  end loop;
  if total<=0 then raise exception 'There are no unpaid completed hours for this employee and week.'; end if;
  return jsonb_build_object('staffId',u.id,'staffName',u.payload->>'name','staffEmail',u.payload->>'email','weekStart',p_week_start,'weekEnd',p_week_start+6,'amountCents',total,'lines',lines);
end $$;
revoke all on function cuddle_stay.payroll_week_preview(text,date) from public,anon;
grant execute on function cuddle_stay.payroll_week_preview(text,date) to authenticated,service_role;

create or replace function cuddle_stay_private.validate_payroll_payment()
returns trigger language plpgsql security invoker set search_path='' as $$
declare expected jsonb;
begin
  if not cuddle_stay_private.kennel_is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.staff_id||new.week_start::text,0));
  expected:=cuddle_stay.payroll_week_preview(new.staff_id,new.week_start);
  if new.snapshot is distinct from expected then raise exception 'Payroll changed since review. Refresh and review again.' using errcode='40001'; end if;
  if new.paid_date>(now() at time zone 'America/Chicago')::date then raise exception 'Payment date cannot be in the future.'; end if;
  if new.paid_date < (select max((l->>'date')::date) from jsonb_array_elements(expected->'lines') l) then raise exception 'Payment date cannot precede the work being paid.'; end if;
  if length(trim(new.payment_method))=0 or length(new.payment_method)>80 or length(new.reference)>200 or length(new.note)>4000 then raise exception 'Enter a payment method and valid receipt details.'; end if;
  new.organization_id:=cuddle_stay_private.cuddle_stay_organization_id();
  new.amount_cents:=(expected->>'amountCents')::bigint;
  new.recorded_by:=auth.uid(); new.recorded_at:=now();
  return new;
end $$;
revoke all on function cuddle_stay_private.validate_payroll_payment() from public,anon,authenticated;
create trigger validate_payroll_payment before insert on cuddle_stay.payroll_payments for each row execute function cuddle_stay_private.validate_payroll_payment();

create or replace function cuddle_stay_private.save_paid_clock_snapshots()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not cuddle_stay_private.kennel_is_admin() then raise exception 'Admin access required.' using errcode='42501'; end if;
  insert into cuddle_stay.payroll_payment_items(timesheet_id,payment_id,organization_id,snapshot)
    select line->>'id',new.id,new.organization_id,line from jsonb_array_elements(new.snapshot->'lines') line;
  update cuddle_stay.financial_ledger_state set needs_rebuild=true,source_changed_at=now(),updated_at=now() where organization_id=new.organization_id;
  return new;
end $$;
revoke all on function cuddle_stay_private.save_paid_clock_snapshots() from public,anon,authenticated;
create trigger save_paid_clock_snapshots after insert on cuddle_stay.payroll_payments for each row execute function cuddle_stay_private.save_paid_clock_snapshots();

create or replace function cuddle_stay_private.protect_paid_payroll()
returns trigger language plpgsql security definer set search_path='' as $$
declare paid jsonb;
begin
  if tg_table_name<>'kennel_records' then raise exception 'Paid payroll is locked. Record corrections separately.'; end if;
  select i.snapshot into paid from cuddle_stay.payroll_payment_items i where i.timesheet_id=old.id;
  if paid is not null then
    if tg_op='DELETE' then raise exception 'This clock entry belongs to paid payroll and is locked.'; end if;
    if new.type<>old.type or new.organization_id<>old.organization_id or
      (new.payload - array['note','updatedAt']) is distinct from (old.payload - array['note','updatedAt']) then
      raise exception 'This clock entry belongs to paid payroll and is locked.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function cuddle_stay_private.protect_paid_payroll() from public,anon,authenticated;
create trigger protect_paid_clock_entries before update or delete on cuddle_stay.kennel_records for each row execute function cuddle_stay_private.protect_paid_payroll();
create trigger protect_payroll_payments before update or delete on cuddle_stay.payroll_payments for each row execute function cuddle_stay_private.protect_paid_payroll();
create trigger protect_payroll_items before update or delete on cuddle_stay.payroll_payment_items for each row execute function cuddle_stay_private.protect_paid_payroll();

-- Old clients cannot reprice a paid clock entry when rebuilding the projection.
do $$
declare definition text:=pg_get_functiondef('cuddle_stay.replace_financial_ledger_entries(jsonb,timestamptz)'::regprocedure);
needle text:='  if exists (';
insertion text:=$patch$
  insert into financial_ledger_replacement
    select 'payroll:'||i.timesheet_id,'timesheet',i.timesheet_id,'','payroll',
      (i.snapshot->>'date')::date,'expense','General','Payroll','Paid payroll · '||(i.snapshot->>'staffName'),
      (i.snapshot->>'amountCents')::bigint,'Staff payroll',i.snapshot->>'staffName',p.payment_method,p.reference,p.note,false,'{}'::jsonb
    from cuddle_stay.payroll_payment_items i join cuddle_stay.payroll_payments p on p.id=i.payment_id
    where i.organization_id=v_organization_id on conflict(source_key) do nothing;
  update financial_ledger_replacement r set
    amount_cents=(i.snapshot->>'amountCents')::bigint,
    transaction_date=(i.snapshot->>'date')::date,
    metadata=jsonb_set(r.metadata,'{payroll}',jsonb_build_object('hours',(i.snapshot->>'hours')::numeric,'rate',(i.snapshot->>'rate')::numeric,'staffName',i.snapshot->>'staffName','staffEmail',i.snapshot->>'staffEmail','paymentId',i.payment_id))
  from cuddle_stay.payroll_payment_items i
  where i.organization_id=v_organization_id and r.source_key='payroll:'||i.timesheet_id;
$patch$;
begin
  if strpos(definition,needle)=0 then raise exception 'Financial replacement function changed; review migration.'; end if;
  execute replace(definition,needle,insertion||needle);
end $$;
