-- Recipient details are readable by members; existing admin-only write policies apply.
alter table cuddle_stay.app_settings
  add column if not exists payment_methods jsonb not null default '{}'::jsonb
  check (jsonb_typeof(payment_methods) = 'object');
