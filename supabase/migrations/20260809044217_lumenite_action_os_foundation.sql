-- Lumenite Action OS, Phase 1: internal low-risk actions only.
-- Generated with `supabase migration new lumenite_action_os_foundation`.

create extension if not exists pgcrypto;

create table if not exists public.lumenai_business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id),
  constraint lumenai_business_members_role_check
    check (role in ('owner', 'admin', 'manager', 'member', 'viewer')),
  constraint lumenai_business_members_status_check
    check (status in ('active', 'invited', 'suspended', 'revoked'))
);

insert into public.lumenai_business_members (business_id, user_id, role, status, created_by)
select source.business_id, source.user_id, 'owner', 'active', source.user_id
from (
  select id as business_id, owner_id as user_id from public.businesses where owner_id is not null
  union
  select id as business_id, user_id from public.businesses where user_id is not null
  union
  select id as business_id, created_by as user_id from public.businesses where created_by is not null
) source
on conflict (business_id, user_id) do update set
  role = 'owner',
  status = 'active',
  updated_at = now();

create or replace function public.lumenai_sync_owner_membership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  owner_user_id uuid;
begin
  owner_user_id := coalesce(new.owner_id, new.user_id, new.created_by);
  if owner_user_id is not null then
    insert into public.lumenai_business_members (
      business_id,
      user_id,
      role,
      status,
      created_by
    ) values (
      new.id,
      owner_user_id,
      'owner',
      'active',
      owner_user_id
    )
    on conflict (business_id, user_id) do update set
      role = 'owner',
      status = 'active',
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists lumenai_sync_owner_membership_trigger on public.businesses;
create trigger lumenai_sync_owner_membership_trigger
after insert or update of owner_id, user_id, created_by on public.businesses
for each row execute function public.lumenai_sync_owner_membership();

create table if not exists public.lumenai_agent_policies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subject_user_id uuid,
  role text,
  integration_id uuid references public.lumenai_integrations(id) on delete cascade,
  capability text not null default '*',
  resource_type text not null default '*',
  access_types text[] not null default array['create']::text[],
  autonomy_level smallint not null default 3,
  allowed boolean not null default true,
  operational_limit jsonb not null default '{}'::jsonb,
  allowed_hours jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  requires_approval boolean not null default true,
  allows_auto_execute boolean not null default false,
  allows_undo boolean not null default true,
  granted_by uuid,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lumenai_agent_policies_autonomy_check
    check (autonomy_level between 0 and 4),
  constraint lumenai_agent_policies_access_check
    check (access_types <@ array['read', 'create', 'modify', 'send', 'publish', 'delete', 'export', 'administer']::text[])
);

insert into public.lumenai_agent_policies (
  business_id,
  subject_user_id,
  role,
  capability,
  resource_type,
  access_types,
  autonomy_level,
  allowed,
  requires_approval,
  allows_auto_execute,
  allows_undo,
  granted_by
)
select b.id, null, 'owner', '*', '*', array['create']::text[], 3, true, true, false, true,
       coalesce(b.owner_id, b.user_id, b.created_by)
from public.businesses b
where coalesce(b.owner_id, b.user_id, b.created_by) is not null
  and not exists (
    select 1
    from public.lumenai_agent_policies p
    where p.business_id = b.id
      and p.subject_user_id is null
      and p.role = 'owner'
      and p.capability = '*'
  );

create table if not exists public.lumenai_agent_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid not null,
  source text not null default 'command_center',
  request_key text not null,
  instruction text not null,
  objective text not null,
  status text not null default 'planning',
  plan_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (business_id, request_key),
  constraint lumenai_agent_plans_source_check
    check (source in ('command_center', 'pulse_radar', 'panel', 'automation', 'api')),
  constraint lumenai_agent_plans_status_check
    check (status in ('planning', 'ready', 'blocked', 'executing', 'completed', 'partially_completed', 'failed', 'cancelled'))
);

alter table public.lumenai_action_runs
  add column if not exists plan_id uuid references public.lumenai_agent_plans(id) on delete set null,
  add column if not exists requested_by uuid,
  add column if not exists approved_by uuid,
  add column if not exists source text not null default 'api',
  add column if not exists capability text,
  add column if not exists integration_id uuid references public.lumenai_integrations(id) on delete set null,
  add column if not exists risk_level text not null default 'low',
  add column if not exists input_redacted jsonb not null default '{}'::jsonb,
  add column if not exists plan_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists permission_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists idempotency_key text,
  add column if not exists external_reference text,
  add column if not exists started_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists error_code text,
  add column if not exists error_message text,
  add column if not exists verification_result jsonb not null default '{}'::jsonb,
  add column if not exists receipt jsonb not null default '{}'::jsonb,
  add column if not exists undo_status text not null default 'not_available',
  add column if not exists undo_payload jsonb not null default '{}'::jsonb,
  add column if not exists execution_attempts integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

update public.lumenai_action_runs
set
  requested_by = coalesce(requested_by, user_id),
  capability = coalesce(nullif(capability, ''), action_name, 'legacy.unknown'),
  idempotency_key = coalesce(nullif(idempotency_key, ''), gen_random_uuid()::text),
  status = case status
    when 'pending' then 'queued'
    when 'success' then 'completed'
    when 'error' then 'failed'
    when 'draft' then 'draft'
    when 'planning' then 'planning'
    when 'awaiting_approval' then 'awaiting_approval'
    when 'approved' then 'approved'
    when 'rejected' then 'rejected'
    when 'queued' then 'queued'
    when 'executing' then 'executing'
    when 'verifying' then 'verifying'
    when 'completed' then 'completed'
    when 'partially_completed' then 'partially_completed'
    when 'failed' then 'failed'
    when 'cancelled' then 'cancelled'
    when 'undo_available' then 'undo_available'
    when 'reverted' then 'reverted'
    else 'failed'
  end,
  error_message = coalesce(error_message, error),
  failed_at = case when status = 'error' then coalesce(failed_at, completed_at, created_at) else failed_at end;

alter table public.lumenai_action_runs
  alter column capability set not null,
  alter column idempotency_key set not null,
  alter column idempotency_key set default gen_random_uuid()::text;

alter table public.lumenai_action_runs
  drop constraint if exists lumenai_action_runs_status_check,
  drop constraint if exists lumenai_action_runs_risk_check,
  drop constraint if exists lumenai_action_runs_source_check,
  drop constraint if exists lumenai_action_runs_undo_check;

alter table public.lumenai_action_runs
  add constraint lumenai_action_runs_status_check check (
    status in (
      'draft', 'planning', 'awaiting_approval', 'approved', 'rejected',
      'queued', 'executing', 'verifying', 'completed', 'partially_completed',
      'failed', 'cancelled', 'undo_available', 'reverted'
    )
  ),
  add constraint lumenai_action_runs_risk_check
    check (risk_level in ('low', 'medium', 'high')),
  add constraint lumenai_action_runs_source_check
    check (source in ('command_center', 'pulse_radar', 'panel', 'automation', 'api')),
  add constraint lumenai_action_runs_undo_check
    check (undo_status in ('not_available', 'available', 'requested', 'reverted', 'failed'));

create table if not exists public.lumenai_action_approvals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  action_run_id uuid not null references public.lumenai_action_runs(id) on delete cascade,
  requested_from uuid,
  decided_by uuid,
  decision text not null default 'pending',
  reason text,
  permission_snapshot jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint lumenai_action_approvals_decision_check
    check (decision in ('pending', 'approved', 'rejected', 'changes_requested', 'expired'))
);

create table if not exists public.lumenai_lead_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  content text not null,
  source text not null default 'lumenite',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_response_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  content text not null,
  channel text not null default 'chat',
  status text not null default 'draft',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lumenai_response_drafts_status_check
    check (status in ('draft', 'archived'))
);

create table if not exists public.lumenai_conversation_tags (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  tag text not null,
  color text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (business_id, chat_id, tag)
);

create table if not exists public.lumenai_reminders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  note text,
  remind_at timestamptz not null,
  resource_type text not null default 'general',
  resource_id uuid,
  status text not null default 'scheduled',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lumenai_reminders_resource_check
    check (resource_type in ('general', 'lead', 'conversation', 'task')),
  constraint lumenai_reminders_status_check
    check (status in ('scheduled', 'completed', 'cancelled'))
);

create unique index if not exists lumenai_action_runs_idempotency_uidx
  on public.lumenai_action_runs (business_id, idempotency_key);
create index if not exists lumenai_business_members_user_idx
  on public.lumenai_business_members (user_id, status, business_id);
create index if not exists lumenai_agent_policies_lookup_idx
  on public.lumenai_agent_policies (business_id, capability, subject_user_id, enabled);
create index if not exists lumenai_agent_policies_integration_idx
  on public.lumenai_agent_policies (integration_id) where integration_id is not null;
create index if not exists lumenai_agent_plans_business_created_idx
  on public.lumenai_agent_plans (business_id, created_at desc);
create index if not exists lumenai_action_runs_plan_idx
  on public.lumenai_action_runs (plan_id, created_at);
create index if not exists lumenai_action_runs_approval_inbox_idx
  on public.lumenai_action_runs (business_id, status, risk_level, created_at desc)
  where status = 'awaiting_approval';
create index if not exists lumenai_action_approvals_run_idx
  on public.lumenai_action_approvals (action_run_id, created_at desc);
create index if not exists lumenai_action_approvals_inbox_idx
  on public.lumenai_action_approvals (business_id, decision, created_at desc);
create index if not exists lumenai_lead_notes_lead_idx
  on public.lumenai_lead_notes (business_id, lead_id, created_at desc);
create index if not exists lumenai_response_drafts_chat_idx
  on public.lumenai_response_drafts (business_id, chat_id, created_at desc);
create index if not exists lumenai_conversation_tags_chat_idx
  on public.lumenai_conversation_tags (business_id, chat_id, created_at desc);
create index if not exists lumenai_reminders_due_idx
  on public.lumenai_reminders (business_id, status, remind_at);

drop trigger if exists lumenai_touch_updated_at_lumenai_business_members on public.lumenai_business_members;
create trigger lumenai_touch_updated_at_lumenai_business_members
before update on public.lumenai_business_members
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_agent_policies on public.lumenai_agent_policies;
create trigger lumenai_touch_updated_at_lumenai_agent_policies
before update on public.lumenai_agent_policies
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_agent_plans on public.lumenai_agent_plans;
create trigger lumenai_touch_updated_at_lumenai_agent_plans
before update on public.lumenai_agent_plans
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_action_runs on public.lumenai_action_runs;
create trigger lumenai_touch_updated_at_lumenai_action_runs
before update on public.lumenai_action_runs
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_response_drafts on public.lumenai_response_drafts;
create trigger lumenai_touch_updated_at_lumenai_response_drafts
before update on public.lumenai_response_drafts
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_reminders on public.lumenai_reminders;
create trigger lumenai_touch_updated_at_lumenai_reminders
before update on public.lumenai_reminders
for each row execute function public.lumenai_touch_updated_at();

alter table public.lumenai_business_members enable row level security;
alter table public.lumenai_agent_policies enable row level security;
alter table public.lumenai_agent_plans enable row level security;
alter table public.lumenai_action_runs enable row level security;
alter table public.lumenai_action_approvals enable row level security;
alter table public.lumenai_lead_notes enable row level security;
alter table public.lumenai_response_drafts enable row level security;
alter table public.lumenai_conversation_tags enable row level security;
alter table public.lumenai_reminders enable row level security;

drop policy if exists lumenai_lumenai_action_runs_business_all on public.lumenai_action_runs;
drop policy if exists lumenai_business_members_select on public.lumenai_business_members;
drop policy if exists lumenai_business_members_owner_insert on public.lumenai_business_members;
drop policy if exists lumenai_business_members_owner_update on public.lumenai_business_members;
drop policy if exists lumenai_business_members_owner_delete on public.lumenai_business_members;

create policy lumenai_business_members_select
on public.lumenai_business_members for select
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.businesses b
    where b.id = lumenai_business_members.business_id
      and (b.owner_id = (select auth.uid()) or b.user_id = (select auth.uid()) or b.created_by = (select auth.uid()))
  )
);

create policy lumenai_business_members_owner_insert
on public.lumenai_business_members for insert
with check (
  exists (
    select 1 from public.businesses b
    where b.id = lumenai_business_members.business_id
      and (b.owner_id = (select auth.uid()) or b.user_id = (select auth.uid()) or b.created_by = (select auth.uid()))
  )
);

create policy lumenai_business_members_owner_update
on public.lumenai_business_members for update
using (
  exists (
    select 1 from public.businesses b
    where b.id = lumenai_business_members.business_id
      and (b.owner_id = (select auth.uid()) or b.user_id = (select auth.uid()) or b.created_by = (select auth.uid()))
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = lumenai_business_members.business_id
      and (b.owner_id = (select auth.uid()) or b.user_id = (select auth.uid()) or b.created_by = (select auth.uid()))
  )
);

create policy lumenai_business_members_owner_delete
on public.lumenai_business_members for delete
using (
  exists (
    select 1 from public.businesses b
    where b.id = lumenai_business_members.business_id
      and (b.owner_id = (select auth.uid()) or b.user_id = (select auth.uid()) or b.created_by = (select auth.uid()))
  )
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'lumenai_agent_policies',
    'lumenai_agent_plans',
    'lumenai_action_runs',
    'lumenai_action_approvals',
    'lumenai_lead_notes',
    'lumenai_response_drafts',
    'lumenai_conversation_tags',
    'lumenai_reminders'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'lumenite_tenant_select_' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'lumenite_tenant_insert_' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'lumenite_tenant_update_' || table_name, table_name);
    execute format('drop policy if exists %I on public.%I', 'lumenite_tenant_delete_' || table_name, table_name);

    execute format(
      'create policy %I on public.%I for select using (
        exists (select 1 from public.businesses b where b.id = %I.business_id and (b.owner_id = (select auth.uid()) or b.user_id = (select auth.uid()) or b.created_by = (select auth.uid())))
        or exists (select 1 from public.lumenai_business_members m where m.business_id = %I.business_id and m.user_id = (select auth.uid()) and m.status = ''active'')
      )',
      'lumenite_tenant_select_' || table_name,
      table_name,
      table_name,
      table_name
    );
  end loop;
end $$;
