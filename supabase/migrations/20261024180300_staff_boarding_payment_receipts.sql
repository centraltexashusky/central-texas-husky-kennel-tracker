-- UI helper/staff accounts map to the trusted organization membership role staff.
-- Change only the receipt-append permission; preserve receipt immutability,
-- cancellation permissions, validation, identity stamping and balance sync.
do $migration$
declare
  definition text := pg_get_functiondef('cuddle_stay_private.protect_boarding_payments()'::regprocedure);
  old_guard text := 'if actor is distinct from ''admin'' then raise exception ''Only administrators can record boarding payments''; end if;';
  new_guard text := 'if actor is null or actor not in (''admin'', ''staff'') then raise exception ''Only staff or administrators can record boarding payments''; end if;';
begin
  if strpos(definition, old_guard) = 0 then
    raise exception 'Boarding receipt permission changed; review the current trigger before applying';
  end if;
  execute replace(definition, old_guard, new_guard);
end;
$migration$;
