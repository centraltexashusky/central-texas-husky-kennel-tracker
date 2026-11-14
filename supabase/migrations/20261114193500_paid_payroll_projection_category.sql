-- Restored paid snapshots use the same reporting classification as clock expenses.
do $$
declare definition text:=pg_get_functiondef('cuddle_stay.replace_financial_ledger_entries(jsonb,timestamptz)'::regprocedure);
needle text:='''expense'',''General'',''Payroll'',''Paid payroll · ''';
begin
 if strpos(definition,needle)=0 then raise exception 'Paid payroll projection changed; review migration.'; end if;
 execute replace(definition,needle,'''expense'',''Payroll'',''Employee hourly pay'',''Paid payroll · ''');
end $$;
