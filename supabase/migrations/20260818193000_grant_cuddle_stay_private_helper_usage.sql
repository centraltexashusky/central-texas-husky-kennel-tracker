-- RLS policies and invoker RPC wrappers call explicitly granted functions in
-- this unexposed schema. PostgreSQL requires schema USAGE in addition to
-- function EXECUTE; this does not add the schema to the Data API.
revoke all on schema cuddle_stay_private from public, anon;
grant usage on schema cuddle_stay_private to authenticated, service_role;

notify pgrst, 'reload schema';
