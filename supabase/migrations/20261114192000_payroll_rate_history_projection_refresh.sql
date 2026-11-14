-- A date correction at the same rate can change unpaid historical estimates.
do $$
declare definition text:=pg_get_functiondef('cuddle_stay_private.mark_financial_ledger_dirty()'::regprocedure);
needle text:='     and (old.payload ->> ''hourlyRate'') is not distinct from (new.payload ->> ''hourlyRate'')';
begin
 if strpos(definition,needle)=0 then raise exception 'Financial invalidation function changed; review migration.'; end if;
 execute replace(definition,needle,needle||E'\n     and (old.payload -> ''hourlyRateHistory'') is not distinct from (new.payload -> ''hourlyRateHistory'')');
end $$;
