create or replace function public.kennel_staff_can_write_type(record_type text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select record_type in (
    'dog',
    'ownedDog',
    'boardingDog',
    'boardingReservation',
    'customerDog',
    'reservationService',
    'request',
    'maintenance',
    'timesheet',
    'dailyTask',
    'careLog',
    'scheduledCareTask',
    'showEvent',
    'showEntry',
    'showDayTask',
    'showCareLog',
    'showResult',
    'showInvoice',
    'calendarNote',
    'dogVaccination',
    'dogInternalNote',
    'dogActivityLog',
    'reservationCustomerUpdate',
    'dogClaimRequest',
    'legacyDogLink',
    'userDogAccess',
    'notificationLog',
    'timeOffRequest'
  )
$$;
