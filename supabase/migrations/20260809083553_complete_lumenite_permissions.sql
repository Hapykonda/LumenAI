-- Complete the Lumenite permission lifecycle without changing the historical
-- Action OS migration. Policy changes remain server-managed and auditable.

alter table public.lumenai_agent_policies
  add column if not exists name text,
  add column if not exists revision integer not null default 1,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid,
  add column if not exists revocation_reason text;

alter table public.lumenai_agent_plans
  add column if not exists root_plan_id uuid references public.lumenai_agent_plans(id) on delete set null,
  add column if not exists parent_plan_id uuid references public.lumenai_agent_plans(id) on delete set null,
  add column if not exists version integer not null default 1,
  add column if not exists change_request text,
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by uuid references public.lumenai_agent_plans(id) on delete set null;

update public.lumenai_agent_plans
set root_plan_id = id
where root_plan_id is null;

alter table public.lumenai_agent_plans
  drop constraint if exists lumenai_agent_plans_version_check,
  add constraint lumenai_agent_plans_version_check check (version > 0),
  drop constraint if exists lumenai_agent_plans_status_check,
  add constraint lumenai_agent_plans_status_check check (
    status in (
      'planning', 'ready', 'blocked', 'executing', 'completed',
      'partially_completed', 'failed', 'cancelled', 'superseded'
    )
  );

alter table public.lumenai_action_runs
  add column if not exists revocation_requested_at timestamptz,
  add column if not exists revocation_requested_by uuid,
  add column if not exists revocation_reason text;

alter table public.lumenai_action_runs
  drop constraint if exists lumenai_action_runs_status_check,
  add constraint lumenai_action_runs_status_check check (
    status in (
      'draft', 'planning', 'awaiting_approval', 'approved', 'rejected',
      'changes_requested', 'expired', 'queued', 'executing', 'verifying',
      'completed', 'partially_completed', 'failed', 'cancelled',
      'undo_available', 'reverted'
    )
  );

alter table public.lumenai_action_approvals
  add column if not exists plan_version integer not null default 1;

update public.lumenai_action_approvals approval
set
  plan_version = coalesce(plan.version, 1),
  expires_at = coalesce(approval.expires_at, approval.created_at + interval '24 hours')
from public.lumenai_action_runs run
left join public.lumenai_agent_plans plan on plan.id = run.plan_id
where run.id = approval.action_run_id;

alter table public.lumenai_action_approvals
  alter column expires_at set default (now() + interval '24 hours'),
  drop constraint if exists lumenai_action_approvals_version_check,
  add constraint lumenai_action_approvals_version_check check (plan_version > 0);

create unique index if not exists lumenai_action_approvals_one_pending_uidx
  on public.lumenai_action_approvals (action_run_id)
  where decision = 'pending';

create index if not exists lumenai_agent_policies_subject_idx
  on public.lumenai_agent_policies (subject_user_id)
  where subject_user_id is not null;
create index if not exists lumenai_agent_policies_integration_idx
  on public.lumenai_agent_policies (integration_id)
  where integration_id is not null;
create index if not exists lumenai_agent_plans_requested_by_idx
  on public.lumenai_agent_plans (requested_by);
create index if not exists lumenai_agent_plans_root_version_idx
  on public.lumenai_agent_plans (business_id, root_plan_id, version desc);
create index if not exists lumenai_agent_plans_parent_idx
  on public.lumenai_agent_plans (parent_plan_id)
  where parent_plan_id is not null;
create index if not exists lumenai_agent_plans_superseded_by_idx
  on public.lumenai_agent_plans (superseded_by)
  where superseded_by is not null;
create index if not exists lumenai_action_runs_revocation_idx
  on public.lumenai_action_runs (business_id, revocation_requested_at)
  where revocation_requested_at is not null;
create index if not exists lumenai_action_approvals_requested_from_idx
  on public.lumenai_action_approvals (requested_from)
  where requested_from is not null;
create index if not exists lumenai_action_approvals_decided_by_idx
  on public.lumenai_action_approvals (decided_by)
  where decided_by is not null;

comment on column public.lumenai_agent_plans.root_plan_id is
  'Stable plan family identifier. The first version points to itself.';
comment on column public.lumenai_agent_plans.parent_plan_id is
  'Previous immutable version when changes were requested.';
comment on column public.lumenai_action_runs.revocation_requested_at is
  'Immediate server-side cancellation signal checked by the action engine.';
