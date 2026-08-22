-- Make active LumenAI membership the single tenant-access authority used by
-- RLS. Profile selection and legacy ownership columns no longer grant access.

create or replace function public.lumenai_can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
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

create or replace function public.lumen_can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.lumenai_can_access_business(p_business_id);
$$;

create or replace function public.can_access_business(bid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.lumenai_can_access_business(bid);
$$;

create or replace function public.is_business_member(bid uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.lumenai_can_access_business(bid);
$$;

create or replace function public.is_business_owner(bid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.lumenai_business_members membership
      where membership.business_id = bid
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role = 'owner'
    );
$$;

revoke execute on function public.lumenai_can_access_business(uuid)
from public, anon;
revoke execute on function public.lumen_can_access_business(uuid)
from public, anon;
revoke execute on function public.can_access_business(uuid)
from public, anon;
revoke execute on function public.is_business_member(uuid)
from public, anon;
revoke execute on function public.is_business_owner(uuid)
from public, anon;

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

-- Remove the legacy self-enrolment path. Existing rows remain readable by the
-- subject for compatibility, but only trusted server code can mutate them.
drop policy if exists bm_insert_own on public.business_members;
drop policy if exists bm_delete_own on public.business_members;

drop policy if exists biz_delete_owner on public.businesses;
drop policy if exists biz_insert_owner on public.businesses;
drop policy if exists biz_select_owner_or_member on public.businesses;
drop policy if exists biz_update_owner on public.businesses;
drop policy if exists lumenai_businesses_owner_all on public.businesses;

create policy lumenai_businesses_member_select
on public.businesses
for select
to authenticated
using (public.lumenai_can_access_business(id));

-- Onboarding must be able to create the business before its owner-membership
-- trigger can run.
create policy lumenai_businesses_owner_insert
on public.businesses
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (
    owner_id = (select auth.uid())
    or user_id = (select auth.uid())
    or created_by = (select auth.uid())
  )
);

create policy lumenai_businesses_owner_update
on public.businesses
for update
to authenticated
using (public.is_business_owner(id))
with check (public.is_business_owner(id));

create policy lumenai_businesses_owner_delete
on public.businesses
for delete
to authenticated
using (public.is_business_owner(id));

drop policy if exists lumenai_business_members_select
on public.lumenai_business_members;
drop policy if exists lumenai_business_members_owner_insert
on public.lumenai_business_members;
drop policy if exists lumenai_business_members_owner_update
on public.lumenai_business_members;
drop policy if exists lumenai_business_members_owner_delete
on public.lumenai_business_members;

create policy lumenai_business_members_select
on public.lumenai_business_members
for select
to authenticated
using (
  user_id = (select auth.uid())
  or public.is_business_owner(business_id)
);

create policy lumenai_business_members_owner_insert
on public.lumenai_business_members
for insert
to authenticated
with check (public.is_business_owner(business_id));

create policy lumenai_business_members_owner_update
on public.lumenai_business_members
for update
to authenticated
using (public.is_business_owner(business_id))
with check (public.is_business_owner(business_id));

create policy lumenai_business_members_owner_delete
on public.lumenai_business_members
for delete
to authenticated
using (public.is_business_owner(business_id));
