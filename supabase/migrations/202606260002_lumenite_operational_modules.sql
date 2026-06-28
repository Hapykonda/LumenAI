-- Lumenite operational modules: Growth Engine, Business Twin, Campaign Studio and Health.
-- Idempotent. Run after 202605270002 and 202606260001.

create extension if not exists pgcrypto;

create table if not exists public.lumenai_action_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  agent text not null default 'System QA Agent',
  action_name text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table if exists public.lumenai_action_runs
  add column if not exists agent text not null default 'System QA Agent',
  add column if not exists completed_at timestamptz;

alter table if exists public.lumenai_action_runs
  alter column payload set default '{}'::jsonb,
  alter column result set default '{}'::jsonb;

create table if not exists public.lumenai_opportunities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  chat_id uuid references public.chats(id) on delete set null,
  title text not null,
  summary text,
  intent text,
  product_or_service text,
  objection text,
  score integer not null default 0,
  temperature text not null default 'warm',
  priority text not null default 'medium',
  status text not null default 'open',
  recommended_action text,
  suggested_message text,
  source text not null default 'ai',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_growth_playbooks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  channel text not null default 'panel',
  message_template text,
  rules jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_followup_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  chat_id uuid references public.chats(id) on delete set null,
  opportunity_id uuid references public.lumenai_opportunities(id) on delete set null,
  title text not null,
  message text,
  due_at timestamptz,
  status text not null default 'pending',
  priority text not null default 'medium',
  created_by_ai boolean not null default true,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_signal_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  chat_id uuid references public.chats(id) on delete set null,
  type text not null,
  title text,
  description text,
  severity text not null default 'info',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.market_items
  add column if not exists image_url text;

create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  market_item_id uuid references public.market_items(id) on delete set null,
  title text not null,
  summary text,
  impact text,
  severity text not null default 'info',
  recommended_action text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  title text not null,
  objective text,
  target_audience text,
  offer text,
  angle text,
  channels text[] not null default '{}',
  duration_days integer,
  status text not null default 'draft',
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_campaign_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid references public.lumenai_campaigns(id) on delete cascade,
  asset_type text not null,
  channel text,
  title text,
  content text not null,
  variant text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_campaign_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid references public.lumenai_campaigns(id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'pending',
  priority text not null default 'medium',
  channel text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.lumenai_campaign_experiments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid references public.lumenai_campaigns(id) on delete cascade,
  name text not null,
  hypothesis text,
  variant_a jsonb not null default '{}'::jsonb,
  variant_b jsonb not null default '{}'::jsonb,
  metric text,
  status text not null default 'draft',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_business_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  snapshot jsonb not null,
  source text not null default 'business_twin',
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_business_scenarios (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  title text not null,
  scenario_type text not null,
  input text,
  current_state jsonb not null default '{}'::jsonb,
  proposed_change jsonb not null default '{}'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  confidence integer not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_simulation_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  scenario_id uuid references public.lumenai_business_scenarios(id) on delete cascade,
  summary text,
  expected_impact text,
  risks text,
  opportunities text,
  recommendation text,
  next_actions jsonb not null default '[]'::jsonb,
  missing_data jsonb not null default '[]'::jsonb,
  confidence integer not null default 0,
  raw_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lumenai_decision_actions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  scenario_id uuid references public.lumenai_business_scenarios(id) on delete set null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists lumenai_action_runs_agent_created_idx on public.lumenai_action_runs (business_id, agent, created_at desc);
create index if not exists lumenai_action_runs_status_idx on public.lumenai_action_runs (business_id, status, created_at desc);
create index if not exists lumenai_opportunities_business_status_idx on public.lumenai_opportunities (business_id, status, created_at desc);
create index if not exists lumenai_opportunities_score_idx on public.lumenai_opportunities (business_id, score desc);
create index if not exists lumenai_opportunities_lead_idx on public.lumenai_opportunities (lead_id);
create index if not exists lumenai_opportunities_chat_idx on public.lumenai_opportunities (chat_id);
create index if not exists lumenai_growth_playbooks_business_idx on public.lumenai_growth_playbooks (business_id, enabled);
create index if not exists lumenai_followup_tasks_business_status_idx on public.lumenai_followup_tasks (business_id, status, created_at desc);
create index if not exists lumenai_followup_tasks_opportunity_idx on public.lumenai_followup_tasks (opportunity_id);
create index if not exists lumenai_signal_events_business_created_idx on public.lumenai_signal_events (business_id, created_at desc);
create index if not exists lumenai_signal_events_type_idx on public.lumenai_signal_events (business_id, type, created_at desc);
create index if not exists market_items_image_idx on public.market_items (business_id, image_url) where image_url is not null;
create index if not exists market_signals_business_created_idx on public.market_signals (business_id, created_at desc);
create index if not exists lumenai_campaigns_business_status_idx on public.lumenai_campaigns (business_id, status, created_at desc);
create index if not exists lumenai_campaign_assets_campaign_idx on public.lumenai_campaign_assets (campaign_id, asset_type);
create index if not exists lumenai_campaign_assets_business_channel_idx on public.lumenai_campaign_assets (business_id, channel);
create index if not exists lumenai_campaign_tasks_business_status_idx on public.lumenai_campaign_tasks (business_id, status, created_at desc);
create index if not exists lumenai_campaign_experiments_campaign_idx on public.lumenai_campaign_experiments (campaign_id);
create index if not exists lumenai_business_snapshots_business_created_idx on public.lumenai_business_snapshots (business_id, created_at desc);
create index if not exists lumenai_business_scenarios_business_created_idx on public.lumenai_business_scenarios (business_id, created_at desc);
create index if not exists lumenai_business_scenarios_type_idx on public.lumenai_business_scenarios (business_id, scenario_type, created_at desc);
create index if not exists lumenai_business_scenarios_status_idx on public.lumenai_business_scenarios (business_id, status, created_at desc);
create index if not exists lumenai_business_scenarios_confidence_idx on public.lumenai_business_scenarios (business_id, confidence desc);
create index if not exists lumenai_simulation_reports_scenario_idx on public.lumenai_simulation_reports (scenario_id, created_at desc);
create index if not exists lumenai_decision_actions_business_status_idx on public.lumenai_decision_actions (business_id, status, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'lumenai_action_runs',
    'lumenai_opportunities',
    'lumenai_growth_playbooks',
    'lumenai_followup_tasks',
    'lumenai_signal_events',
    'market_signals',
    'lumenai_campaigns',
    'lumenai_campaign_assets',
    'lumenai_campaign_tasks',
    'lumenai_campaign_experiments',
    'lumenai_business_snapshots',
    'lumenai_business_scenarios',
    'lumenai_simulation_reports',
    'lumenai_decision_actions'
  ]
  loop
    execute format('alter table if exists public.%I enable row level security', t);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = 'lumenai_' || t || '_business_all'
    ) then
      execute format(
        'create policy %I on public.%I for all using (public.lumenai_can_access_business(business_id)) with check (public.lumenai_can_access_business(business_id))',
        'lumenai_' || t || '_business_all',
        t
      );
    end if;
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'lumenai_opportunities',
    'lumenai_growth_playbooks',
    'lumenai_campaigns',
    'lumenai_business_scenarios'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists %I on public.%I', 'lumenai_touch_updated_at_' || t, t);
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.lumenai_touch_updated_at()',
        'lumenai_touch_updated_at_' || t,
        t
      );
    end if;
  end loop;
end $$;
