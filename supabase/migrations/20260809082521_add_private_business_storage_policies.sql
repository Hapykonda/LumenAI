-- Private tenant assets use a mandatory `<business_id>/...` path prefix.
-- Public avatar/widget buckets remain separate because their URLs are meant to
-- render on external pages.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lumenai-private-assets',
  'lumenai-private-assets',
  false,
  10485760,
  array[
    'application/pdf',
    'application/json',
    'text/plain',
    'text/csv',
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists lumenai_private_assets_select on storage.objects;
create policy lumenai_private_assets_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lumenai-private-assets'
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists lumenai_private_assets_insert on storage.objects;
create policy lumenai_private_assets_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lumenai-private-assets'
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists lumenai_private_assets_update on storage.objects;
create policy lumenai_private_assets_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lumenai-private-assets'
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
)
with check (
  bucket_id = 'lumenai-private-assets'
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists lumenai_private_assets_delete on storage.objects;
create policy lumenai_private_assets_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lumenai-private-assets'
  and exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id::text = (storage.foldername(name))[1]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);
