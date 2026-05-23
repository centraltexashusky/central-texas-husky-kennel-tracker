-- Optional private-media migration for Snuggle Stay.
-- Run only after deploying the media-access Edge Function and confirming
-- customers/staff can open files through signed URLs.

update storage.buckets
set public = false
where id = 'kennel-media';

drop policy if exists "Kennel media is publicly readable" on storage.objects;
drop policy if exists "Authenticated users can read kennel media" on storage.objects;

create policy "Authenticated users can read kennel media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'kennel-media'
  and (
    kennel_private.kennel_is_staff_member()
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- Staff-created files intended for customers are served through the
-- media-access Edge Function. That function validates the caller against the
-- source kennel_records row and returns a short-lived signed URL.
