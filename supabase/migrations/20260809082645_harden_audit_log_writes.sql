-- Audit evidence is server-written and tenant-readable. Browser roles must not
-- be able to fabricate, rewrite, or delete the operational history.

drop policy if exists lumenai_lumenai_audit_log_business_all
on public.lumenai_audit_log;

drop policy if exists lumenai_audit_log_tenant_select
on public.lumenai_audit_log;

create policy lumenai_audit_log_tenant_select
on public.lumenai_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id = lumenai_audit_log.business_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);
