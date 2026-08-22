-- Fix mutable function lookup paths without replacing historical functions.
-- pg_temp remains available for PostgreSQL internals while object resolution
-- stays anchored to the application schema.

alter function public.current_business_id()
  set search_path = public, pg_temp;
alter function public.lumenai_touch_updated_at()
  set search_path = public, pg_temp;
alter function public.set_updated_at()
  set search_path = public, pg_temp;
alter function public.generate_widget_key()
  set search_path = public, pg_temp;
alter function public.handle_new_user()
  set search_path = public, pg_temp;
alter function public.set_chat_message_business_id()
  set search_path = public, pg_temp;
alter function public.touch_chat_on_message_insert()
  set search_path = public, pg_temp;
alter function public.bump_chat_updated_at()
  set search_path = public, pg_temp;
alter function public.create_business_for_new_user(text, text, text, text, text, text)
  set search_path = public, pg_temp;
alter function public.touch_widget_settings_updated_at()
  set search_path = public, pg_temp;

-- RLS membership helpers are required by authenticated policies, but anonymous
-- callers must not be able to invoke them directly through PostgREST.
revoke execute on function public.can_access_business(uuid)
from public, anon;
grant execute on function public.can_access_business(uuid)
to authenticated, service_role;

revoke execute on function public.is_business_member(uuid)
from public, anon;
grant execute on function public.is_business_member(uuid)
to authenticated, service_role;

revoke execute on function public.is_business_owner(uuid)
from public, anon;
grant execute on function public.is_business_owner(uuid)
to authenticated, service_role;

revoke execute on function public.lumen_can_access_business(uuid)
from public, anon;
grant execute on function public.lumen_can_access_business(uuid)
to authenticated, service_role;

-- Onboarding is authenticated-only. The auth trigger function is never a
-- browser RPC and remains callable only by the trusted server role.
revoke execute on function public.create_business_for_new_user(text, text, text, text, text, text)
from public, anon;
grant execute on function public.create_business_for_new_user(text, text, text, text, text, text)
to authenticated, service_role;

revoke execute on function public.handle_new_user()
from public, anon, authenticated;
grant execute on function public.handle_new_user()
to service_role;
