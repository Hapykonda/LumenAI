-- The widget chat resolves the tenant on the server and calls this RPC with the
-- service role. Browser roles must never be able to request another tenant's
-- published knowledge by guessing a business UUID.
revoke execute on function public.get_business_kb_text(uuid)
  from public, anon, authenticated;
grant execute on function public.get_business_kb_text(uuid)
  to service_role;

-- This helper is used from RLS policies. Keep it available only to the roles
-- that evaluate those policies and remove the implicit PUBLIC function grant.
revoke execute on function public.lumenai_can_access_business(uuid)
  from public, anon;
grant execute on function public.lumenai_can_access_business(uuid)
  to authenticated, service_role;

comment on function public.get_business_kb_text(uuid) is
  'Server-only published knowledge lookup. Tenant resolution happens before invocation.';
