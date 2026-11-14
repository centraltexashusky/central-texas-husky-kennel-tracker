-- All fictional records and ledger changes are rolled back. Never confirms real payroll.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from shared.organization_members where organization_id=cuddle_stay_private.cuddle_stay_organization_id() and role in ('admin','owner') order by created_at limit 1),true);
set local role authenticated;
do $$
declare staff text:='payroll-qa-'||gen_random_uuid(); a text:='payroll-qa-clock-'||gen_random_uuid(); b text:='payroll-qa-clock-'||gen_random_uuid(); c text:='payroll-qa-clock-'||gen_random_uuid();
  profile jsonb; preview jsonb; payment uuid; blocked boolean; count_rows int;
begin
 insert into cuddle_stay.kennel_records(id,type,organization_id,payload) values(staff,'settingsUser',cuddle_stay_private.cuddle_stay_organization_id(),jsonb_build_object('id',staff,'type','settingsUser','name',staff,'email',staff||'@example.invalid','role','helper','hourlyRate',10));
 insert into cuddle_stay.kennel_records(id,type,organization_id,payload)
 select id,'timesheet',cuddle_stay_private.cuddle_stay_organization_id(),jsonb_build_object('id',id,'type','timesheet','helperEmail',staff||'@example.invalid','helperName',staff,'date',d,'hours',h,'clockInTime',d||'T09:00:00-06:00','clockOutTime',d||'T12:00:00-06:00')
 from (values(a,'2026-11-02',1.25),(b,'2026-11-04',2.5)) t(id,d,h);
 profile:=cuddle_stay.set_payroll_rate(staff,20,'2026-11-04','[]','10');
 if cuddle_stay.payroll_rate_on_date(profile,'2026-11-03')<>10 or cuddle_stay.payroll_rate_on_date(profile,'2026-11-04')<>20 then raise exception 'Effective rate test failed'; end if;
 blocked:=false;
 begin perform cuddle_stay.set_payroll_rate(staff,30,'2026-11-05','[]','10'); exception when serialization_failure then blocked:=true; end;
 if not blocked then raise exception 'Stale rate change was not rejected'; end if;
 preview:=cuddle_stay.payroll_week_preview(staff,'2026-11-02');
 if (preview->>'amountCents')::int<>6250 then raise exception 'Mixed-rate preview mismatch: %',preview; end if;
 blocked:=false;
 begin update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{hourlyRateHistory}','[]') where id=staff; exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'Saved rate history could be erased'; end if;
 blocked:=false;
 begin insert into cuddle_stay.payroll_payments(staff_id,week_start,paid_date,payment_method,snapshot) values(staff,'2026-11-02','2026-11-03','QA invalid date',preview); exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'Payment before work date was allowed'; end if;
 update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{hours}','2') where id=a;
 blocked:=false;
 begin insert into cuddle_stay.payroll_payments(staff_id,week_start,paid_date,payment_method,snapshot) values(staff,'2026-11-02','2026-11-09','QA only',preview); exception when serialization_failure then blocked:=true; end;
 if not blocked then raise exception 'Stale payroll was not rejected'; end if;
 update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{hours}','1.25') where id=a;
 preview:=cuddle_stay.payroll_week_preview(staff,'2026-11-02');
 insert into cuddle_stay.payroll_payments(staff_id,week_start,paid_date,payment_method,snapshot) values(staff,'2026-11-02','2026-11-09','QA only',preview) returning id into payment;
 select count(*) into count_rows from cuddle_stay.payroll_payment_items where payment_id=payment;
 if count_rows<>2 then raise exception 'Paid snapshots were not persisted'; end if;
 blocked:=false;
 begin update cuddle_stay.kennel_records set payload=jsonb_set(payload,'{hours}','99') where id=a; exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'Paid clock edit was allowed'; end if;
 blocked:=false;
 begin delete from cuddle_stay.kennel_records where id=a; exception when raise_exception or insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Paid clock deletion was allowed'; end if;
 blocked:=false;
 begin update cuddle_stay.payroll_payments set amount_cents=1 where id=payment; exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Payment mutation was allowed'; end if;
 update cuddle_stay.kennel_records set payload=payload||'{"note":"QA note only"}' where id=a;
 blocked:=false;
 begin insert into cuddle_stay.payroll_payments(staff_id,week_start,paid_date,payment_method,snapshot) values(staff,'2026-11-02','2026-11-09','QA duplicate',preview); exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'Duplicate payment was allowed'; end if;
 profile:=cuddle_stay.set_payroll_rate(staff,30,'2026-11-04',profile->'hourlyRateHistory','20');
 profile:=cuddle_stay.set_payroll_rate(staff,40,'2027-01-01',profile->'hourlyRateHistory','30');
 if cuddle_stay.payroll_rate_on_date(profile,'2026-12-31')<>30 or cuddle_stay.payroll_rate_on_date(profile,'2027-01-01')<>40 then raise exception 'Future effective date failed'; end if;
 if (select (snapshot->>'rate')::numeric from cuddle_stay.payroll_payment_items where timesheet_id=b)<>20 then raise exception 'Paid rate changed'; end if;
 insert into cuddle_stay.kennel_records(id,type,organization_id,payload) values(c,'timesheet',cuddle_stay_private.cuddle_stay_organization_id(),jsonb_build_object('id',c,'type','timesheet','helperEmail',staff||'@example.invalid','date','2026-11-05','hours',1,'clockInTime','2026-11-05T09:00:00-06:00','clockOutTime','2026-11-05T10:00:00-06:00'));
 preview:=cuddle_stay.payroll_week_preview(staff,'2026-11-02');
 if jsonb_array_length(preview->'lines')<>1 or (preview->>'amountCents')::int<>3000 then raise exception 'Supplemental hours were lost'; end if;
 -- A stale financial rebuild cannot delete or reprice the paid snapshots.
 perform cuddle_stay.replace_financial_ledger_entries('[]',now());
 if (select sum(amount_cents) from cuddle_stay.financial_ledger_entries where source_key in ('payroll:'||a,'payroll:'||b))<>6250 then raise exception 'Ledger did not retain fixed paid payroll'; end if;
 if exists(select 1 from cuddle_stay.financial_ledger_entries where source_key in ('payroll:'||a,'payroll:'||b) and business_area<>'Payroll') then raise exception 'Paid payroll reporting category changed'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from shared.organization_members where organization_id=cuddle_stay_private.cuddle_stay_organization_id() and role='staff' order by created_at limit 1),true);
set local role authenticated;
do $$ declare n int; blocked boolean:=false; begin
 select count(*) into n from cuddle_stay.payroll_payments;
 if n<>0 then raise exception 'Staff can read private payroll payments'; end if;
 begin perform cuddle_stay.payroll_week_preview('not-a-user','2026-11-02'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Staff can preview private payroll'; end if;
 blocked:=false;
 begin insert into cuddle_stay.payroll_payments(staff_id,week_start,paid_date,payment_method,snapshot) values('not-a-user','2026-11-02','2026-11-09','Unauthorized','{}'); exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'Staff can confirm private payroll'; end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','cuddle_stay.payroll_week_preview(text,date)','EXECUTE') or has_table_privilege('anon','cuddle_stay.payroll_payments','SELECT') then raise exception 'Anonymous payroll access is enabled'; end if;
end $$;
rollback;
select 'Payroll rollback tests passed; no real payments or staff rates changed.' as result;
