-- Persist Pulse Radar signals and bind them to the existing Lumenite Action OS.
-- Browser clients may read tenant signals, but every lifecycle mutation remains server-managed.

create table if not exists public.lumenai_pulse_signals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  signal_key text not null,
  type text not null,
  title text not null,
  description text not null,
  severity text not null default 'info',
  status text not null default 'new',
  evidence jsonb not null default '{}'::jsonb,
  source_label text not null,
  source_route text,
  period_label text not null,
  period_start timestamptz,
  period_end timestamptz not null,
  recommended_capability text,
  recommended_input jsonb not null default '{}'::jsonb,
  action_plan_id uuid references public.lumenai_agent_plans(id) on delete set null,
  action_run_id uuid references public.lumenai_action_runs(id) on delete set null,
  last_error text,
  resolution jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  viewed_at timestamptz,
  viewed_by uuid,
  dismissed_at timestamptz,
  dismissed_by uuid,
  snoozed_until timestamptz,
  reverted_at timestamptz,
  last_refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, signal_key),
  constraint lumenai_pulse_signals_severity_check
    check (severity in ('info', 'success', 'warning', 'critical')),
  constraint lumenai_pulse_signals_status_check
    check (status in (
      'new', 'viewed', 'action_prepared', 'awaiting_approval', 'executing',
      'resolved', 'partially_resolved', 'failed', 'reverted', 'dismissed'
    )),
  constraint lumenai_pulse_signals_action_pair_check
    check (action_run_id is null or action_plan_id is not null)
);

alter table public.lumenai_agent_plans
  add column if not exists signal_id uuid references public.lumenai_pulse_signals(id) on delete set null;

alter table public.lumenai_action_runs
  add column if not exists signal_id uuid references public.lumenai_pulse_signals(id) on delete set null;

create index if not exists lumenai_pulse_signals_lifecycle_idx
  on public.lumenai_pulse_signals (business_id, status, last_refreshed_at desc);
create index if not exists lumenai_pulse_signals_snooze_idx
  on public.lumenai_pulse_signals (business_id, snoozed_until)
  where snoozed_until is not null;
create index if not exists lumenai_pulse_signals_plan_idx
  on public.lumenai_pulse_signals (action_plan_id)
  where action_plan_id is not null;
create index if not exists lumenai_pulse_signals_run_idx
  on public.lumenai_pulse_signals (action_run_id)
  where action_run_id is not null;
create index if not exists lumenai_agent_plans_signal_idx
  on public.lumenai_agent_plans (signal_id)
  where signal_id is not null;
create index if not exists lumenai_action_runs_signal_idx
  on public.lumenai_action_runs (signal_id)
  where signal_id is not null;

drop trigger if exists lumenai_touch_updated_at_lumenai_pulse_signals
on public.lumenai_pulse_signals;
create trigger lumenai_touch_updated_at_lumenai_pulse_signals
before update on public.lumenai_pulse_signals
for each row execute function public.lumenai_touch_updated_at();

alter table public.lumenai_pulse_signals enable row level security;

drop policy if exists lumenai_pulse_signals_tenant_select
on public.lumenai_pulse_signals;
create policy lumenai_pulse_signals_tenant_select
on public.lumenai_pulse_signals
for select
to authenticated
using (
  exists (
    select 1
    from public.lumenai_business_members member
    where member.business_id = lumenai_pulse_signals.business_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  )
);

revoke all on table public.lumenai_pulse_signals from anon;
revoke insert, update, delete on table public.lumenai_pulse_signals from authenticated;
grant select on table public.lumenai_pulse_signals to authenticated;
grant all on table public.lumenai_pulse_signals to service_role;

comment on table public.lumenai_pulse_signals is
  'Tenant-scoped Pulse Radar evidence and its synchronized Lumenite lifecycle.';
comment on column public.lumenai_pulse_signals.signal_key is
  'Stable detector key used to refresh one current signal without duplicating it.';
comment on column public.lumenai_agent_plans.signal_id is
  'Pulse Radar signal that originated this immutable plan version.';
comment on column public.lumenai_action_runs.signal_id is
  'Pulse Radar signal whose lifecycle follows this action run.';
