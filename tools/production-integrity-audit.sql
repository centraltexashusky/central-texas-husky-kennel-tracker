-- Read-only production health gate for the failure classes that can make a
-- boarding request or its notification silently disappear.
with active_boarding as (
  select id, payload, updated_at
  from public.kennel_records
  where type = 'boardingDog'
    and coalesce(lower(payload ->> 'removed'), 'false') <> 'true'
), active_notifications as (
  select id, payload, updated_at
  from public.kennel_records
  where type = 'notificationLog'
    and coalesce(lower(payload ->> 'removed'), 'false') <> 'true'
), pending_groups as (
  select
    coalesce(nullif(payload ->> 'requestGroupId', ''), nullif(payload -> 'stays' -> 0 ->> 'requestGroupId', '')) as group_id,
    array_agg(id order by id) as record_ids,
    min(updated_at) as first_updated_at
  from active_boarding
  where lower(coalesce(payload ->> 'boardingStatus', payload ->> 'status', '')) in ('pending', 'pending_customer_request')
  group by 1
), alert_groups as (
  select distinct coalesce(
    nullif(payload -> 'sourceSnapshot' ->> 'requestGroupId', ''),
    nullif(payload -> 'sourceSnapshot' -> 'stays' -> 0 ->> 'requestGroupId', '')
  ) as group_id
  from active_notifications
  where payload ->> 'eventName' in ('customerBoardingRequestCreated', 'customerBoardingRequestUpdated')
)
select jsonb_build_object(
  'checked_at', now(),
  'duplicate_active_boarding_links', (
    select count(*) from (
      select payload ->> 'linkedCustomerDogId'
      from active_boarding
      where nullif(payload ->> 'linkedCustomerDogId', '') is not null
      group by 1 having count(*) > 1
    ) duplicates
  ),
  'mixed_group_statuses', (
    select count(*) from (
      select coalesce(nullif(payload ->> 'requestGroupId', ''), nullif(payload -> 'stays' -> 0 ->> 'requestGroupId', ''))
      from active_boarding
      where coalesce(nullif(payload ->> 'requestGroupId', ''), nullif(payload -> 'stays' -> 0 ->> 'requestGroupId', '')) is not null
      group by 1
      having count(distinct lower(coalesce(payload ->> 'boardingStatus', payload ->> 'status', ''))) > 1
    ) mixed
  ),
  'pending_groups_missing_alert', (
    select count(*)
    from pending_groups pending
    where pending.group_id is not null
      and not exists (select 1 from alert_groups alert where alert.group_id = pending.group_id)
  ),
  'notification_failures_needing_attention', (
    select count(*)
    from active_notifications notification
    where lower(coalesce(notification.payload ->> 'deliveryStatus', '')) in ('failed', 'error', 'in-app only')
      and (
        notification.payload ->> 'eventName' not in ('customerBoardingRequestCreated', 'customerBoardingRequestUpdated')
        or nullif(notification.payload ->> 'sourceId', '') is null
        or exists (
          select 1 from active_boarding boarding
          where boarding.id = notification.payload ->> 'sourceId'
            and lower(coalesce(boarding.payload ->> 'boardingStatus', boarding.payload ->> 'status', '')) in ('pending', 'pending_customer_request')
        )
      )
  ),
  'resolved_notification_delivery_history', (
    select count(*)
    from active_notifications notification
    where lower(coalesce(notification.payload ->> 'deliveryStatus', '')) in ('failed', 'error', 'in-app only')
      and notification.payload ->> 'eventName' in ('customerBoardingRequestCreated', 'customerBoardingRequestUpdated')
      and exists (
        select 1 from active_boarding boarding
        where boarding.id = notification.payload ->> 'sourceId'
          and lower(coalesce(boarding.payload ->> 'boardingStatus', boarding.payload ->> 'status', '')) not in ('pending', 'pending_customer_request')
      )
  ),
  'notifications_stuck_pending_over_five_minutes', (
    select count(*)
    from active_notifications
    where lower(coalesce(payload ->> 'deliveryStatus', '')) = 'pending'
      and updated_at < now() - interval '5 minutes'
  )
) as integrity_audit;
