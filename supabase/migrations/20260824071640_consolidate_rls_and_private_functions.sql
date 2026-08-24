-- Production security consolidation.
-- Privileged implementations live outside the exposed API schema; public RPC
-- signatures remain stable as security-invoker wrappers for app compatibility.

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;

create or replace function private.lumenai_can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.lumenai_business_members membership
      where membership.business_id = p_business_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    );
$$;

create or replace function private.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.lumenai_business_members membership
      where membership.business_id = p_business_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role = 'owner'
    );
$$;

create or replace function public.lumenai_can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lumenai_can_access_business(p_business_id);
$$;

create or replace function public.lumen_can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lumenai_can_access_business(p_business_id);
$$;

create or replace function public.can_access_business(bid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lumenai_can_access_business(bid);
$$;

create or replace function public.is_business_member(bid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lumenai_can_access_business(bid);
$$;

create or replace function public.is_business_owner(bid uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_business_owner(bid);
$$;

create or replace function private.create_business_for_new_user(
  business_name text,
  business_industry text,
  tone_in text,
  hours_in text,
  whatsapp_in text,
  email_in text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  bid uuid;
  normalized_name text := btrim(coalesce(business_name, ''));
  normalized_industry text := btrim(coalesce(business_industry, 'general'));
begin
  if uid is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if char_length(normalized_name) < 2 or char_length(normalized_name) > 120 then
    raise exception using errcode = '22023', message = 'Business name must contain 2 to 120 characters';
  end if;

  if char_length(normalized_industry) > 80 then
    raise exception using errcode = '22023', message = 'Business industry is too long';
  end if;

  insert into public.businesses (
    name,
    industry,
    tone,
    hours_text,
    public_whatsapp,
    public_email,
    owner_id,
    user_id,
    created_by,
    profile_id
  ) values (
    normalized_name,
    coalesce(nullif(normalized_industry, ''), 'general'),
    left(coalesce(nullif(btrim(tone_in), ''), 'Profesional y cercano'), 100),
    left(coalesce(nullif(btrim(hours_in), ''), 'Lun a Vie 09:00–18:00'), 180),
    nullif(left(btrim(coalesce(whatsapp_in, '')), 80), ''),
    nullif(left(btrim(coalesce(email_in, '')), 254), ''),
    uid,
    uid,
    uid,
    uid
  )
  returning id into bid;

  insert into public.business_members (business_id, user_id, role)
  values (bid, uid, 'owner')
  on conflict (business_id, user_id) do update set role = 'owner';

  insert into public.lumenai_business_members (
    business_id,
    user_id,
    role,
    status,
    created_by
  ) values (
    bid,
    uid,
    'owner',
    'active',
    uid
  )
  on conflict (business_id, user_id) do update set
    role = 'owner',
    status = 'active',
    updated_at = now();

  insert into public.profiles (
    id,
    active_business_id,
    business_id,
    current_business_id,
    selected_business_id,
    default_business_id,
    role
  ) values (
    uid,
    bid,
    bid,
    bid,
    bid,
    bid,
    'owner'
  )
  on conflict (id) do update set
    active_business_id = excluded.active_business_id,
    business_id = excluded.business_id,
    current_business_id = excluded.current_business_id,
    selected_business_id = excluded.selected_business_id,
    default_business_id = coalesce(public.profiles.default_business_id, excluded.default_business_id),
    role = coalesce(public.profiles.role, excluded.role),
    updated_at = now();

  return bid;
end;
$$;

create or replace function public.create_business_for_new_user(
  business_name text,
  business_industry text,
  tone_in text,
  hours_in text,
  whatsapp_in text,
  email_in text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_business_for_new_user(
    business_name,
    business_industry,
    tone_in,
    hours_in,
    whatsapp_in,
    email_in
  );
$$;

create or replace function private.lumenai_widget_public_health(p_public_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when nullif(btrim(p_public_key), '') is null or char_length(p_public_key) > 128
      then '{}'::jsonb
    else coalesce(
      (
        select jsonb_build_object(
          'businessId', business.id,
          'businessName', business.name,
          'publicKey', business.public_key,
          'widgetEnabled', coalesce(settings.widget_enabled, true),
          'publishedAt', settings.published_at,
          'hasPublishedSettings',
            settings.published_settings is not null
            and settings.published_settings <> '{}'::jsonb,
          'hasContact',
            coalesce(settings.whatsapp, '') <> ''
            or coalesce(settings.email, '') <> ''
        )
        from public.businesses business
        left join public.widget_settings settings
          on settings.business_id = business.id
        where business.public_key = p_public_key
        limit 1
      ),
      '{}'::jsonb
    )
  end;
$$;

create or replace function public.lumenai_widget_public_health(p_public_key text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lumenai_widget_public_health(p_public_key);
$$;

revoke execute on function private.lumenai_can_access_business(uuid) from public, anon;
revoke execute on function private.is_business_owner(uuid) from public, anon;
revoke execute on function private.create_business_for_new_user(text, text, text, text, text, text)
  from public, anon;
revoke execute on function private.lumenai_widget_public_health(text) from public;

grant execute on function private.lumenai_can_access_business(uuid)
  to authenticated, service_role;
grant execute on function private.is_business_owner(uuid)
  to authenticated, service_role;
grant execute on function private.create_business_for_new_user(text, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function private.lumenai_widget_public_health(text)
  to anon, authenticated, service_role;

revoke execute on function public.lumenai_can_access_business(uuid) from public, anon;
revoke execute on function public.lumen_can_access_business(uuid) from public, anon;
revoke execute on function public.can_access_business(uuid) from public, anon;
revoke execute on function public.is_business_member(uuid) from public, anon;
revoke execute on function public.is_business_owner(uuid) from public, anon;
revoke execute on function public.create_business_for_new_user(text, text, text, text, text, text)
  from public, anon;
revoke execute on function public.lumenai_widget_public_health(text) from public;

grant execute on function public.lumenai_can_access_business(uuid)
  to authenticated, service_role;
grant execute on function public.lumen_can_access_business(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_business(uuid)
  to authenticated, service_role;
grant execute on function public.is_business_member(uuid)
  to authenticated, service_role;
grant execute on function public.is_business_owner(uuid)
  to authenticated, service_role;
grant execute on function public.create_business_for_new_user(text, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.lumenai_widget_public_health(text)
  to anon, authenticated, service_role;

-- Preserve valid legacy memberships without reactivating any row explicitly
-- suspended or revoked in the canonical membership table.
insert into public.lumenai_business_members (
  business_id,
  user_id,
  role,
  status,
  created_by
)
select
  legacy.business_id,
  legacy.user_id,
  case legacy.role
    when 'owner' then 'owner'
    when 'admin' then 'admin'
    else 'member'
  end,
  'active',
  legacy.user_id
from public.business_members legacy
on conflict (business_id, user_id) do nothing;

-- Policies meant for signed-in tenants should not be evaluated for anon. This
-- changes only their target role; their existing predicates stay unchanged.
do $$
declare
  current_policy record;
begin
  for current_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and roles = array['public']::name[]
  loop
    execute format(
      'alter policy %I on public.%I to authenticated',
      current_policy.policyname,
      current_policy.tablename
    );
  end loop;
end;
$$;

-- Consolidate exact duplicate tenant policies into one policy per operation.
drop policy if exists lumenai_business_kb_business_all on public.business_kb;
drop policy if exists "Users can delete their business knowledge" on public.business_kb;
drop policy if exists "Users can insert their business knowledge" on public.business_kb;
drop policy if exists "Users can read their business knowledge" on public.business_kb;
drop policy if exists "Users can update their business knowledge" on public.business_kb;
create policy lumenai_business_kb_member_all
on public.business_kb
for all
to authenticated
using ((select private.lumenai_can_access_business(business_id)))
with check ((select private.lumenai_can_access_business(business_id)));

drop policy if exists chat_messages_member_all on public.chat_messages;
drop policy if exists lumenai_chat_messages_business_all on public.chat_messages;
create policy lumenai_chat_messages_member_all
on public.chat_messages
for all
to authenticated
using ((select private.lumenai_can_access_business(business_id)))
with check ((select private.lumenai_can_access_business(business_id)));

drop policy if exists chats_member_all on public.chats;
drop policy if exists lumenai_chats_business_all on public.chats;
create policy lumenai_chats_member_all
on public.chats
for all
to authenticated
using ((select private.lumenai_can_access_business(business_id)))
with check ((select private.lumenai_can_access_business(business_id)));

drop policy if exists lumenai_profiles_self_all on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy lumenai_profiles_select_own
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));
create policy lumenai_profiles_update_own
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists lumenai_widget_settings_business_all on public.widget_settings;
drop policy if exists widget_settings_delete_own on public.widget_settings;
drop policy if exists widget_settings_insert_own on public.widget_settings;
drop policy if exists widget_settings_insert_own_business on public.widget_settings;
drop policy if exists ws_insert_owner on public.widget_settings;
drop policy if exists widget_settings_select_own on public.widget_settings;
drop policy if exists widget_settings_select_own_business on public.widget_settings;
drop policy if exists ws_select_owner on public.widget_settings;
drop policy if exists widget_settings_update_own on public.widget_settings;
drop policy if exists widget_settings_update_own_business on public.widget_settings;
drop policy if exists ws_update_owner on public.widget_settings;
create policy lumenai_widget_settings_member_all
on public.widget_settings
for all
to authenticated
using ((select private.lumenai_can_access_business(business_id)))
with check ((select private.lumenai_can_access_business(business_id)));

-- A non-sensitive release marker lets the authenticated application verify
-- that the production hardening migration was applied without exposing policy
-- definitions, secrets, or privileged helpers through the Data API.
create or replace function public.lumenai_release_state()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'schema_version', '20260824071640',
    'rls_consolidated', true,
    'fk_indexes', true,
    'operator_catalog', true
  );
$$;

revoke all on function public.lumenai_release_state() from public;
grant execute on function public.lumenai_release_state()
  to authenticated, service_role;
