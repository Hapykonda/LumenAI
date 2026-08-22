-- Owner profile images are private and scoped to `<business_id>/<user_id>/...`.
-- Legacy `<user_id>/...` objects remain readable by their owner so existing
-- profile photos survive the transition away from public URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lumenai-profile-assets',
  'lumenai-profile-assets',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lumenai_profile_assets_select on storage.objects;
create policy lumenai_profile_assets_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lumenai-profile-assets'
  and (
    (
      (storage.foldername(name))[2] = (select auth.uid())::text
      and exists (
        select 1
        from public.lumenai_business_members membership
        where membership.business_id::text = (storage.foldername(name))[1]
          and membership.user_id = (select auth.uid())
          and membership.status = 'active'
      )
    )
    or (storage.foldername(name))[1] = (select auth.uid())::text
  )
);

drop policy if exists lumenai_profile_assets_insert on storage.objects;
create policy lumenai_profile_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lumenai-profile-assets'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists lumenai_profile_assets_update on storage.objects;
create policy lumenai_profile_assets_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lumenai-profile-assets'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
)
with check (
  bucket_id = 'lumenai-profile-assets'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists lumenai_profile_assets_delete on storage.objects;
create policy lumenai_profile_assets_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lumenai-profile-assets'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);
