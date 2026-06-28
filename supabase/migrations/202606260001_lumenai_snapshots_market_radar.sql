-- LumenAI snapshots, action runs and market radar persistence.
-- Idempotent production support. Safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.lumenai_config_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  previous_config jsonb,
  new_config jsonb,
  user_prompt text,
  action_type text,
  created_at timestamptz not null default now()
);

alter table if exists public.lumenai_config_snapshots
  add column if not exists business_id uuid,
  add column if not exists user_id uuid,
  add column if not exists previous_config jsonb,
  add column if not exists new_config jsonb,
  add column if not exists user_prompt text,
  add column if not exists action_type text,
  add column if not exists created_at timestamptz default now();

create index if not exists lumenai_config_snapshots_business_idx
  on public.lumenai_config_snapshots (business_id);

create index if not exists lumenai_config_snapshots_user_idx
  on public.lumenai_config_snapshots (user_id);

create index if not exists lumenai_config_snapshots_created_idx
  on public.lumenai_config_snapshots (business_id, created_at desc);

create table if not exists public.lumenai_action_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  action_name text not null,
  payload jsonb,
  result jsonb,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);

alter table if exists public.lumenai_action_runs
  add column if not exists business_id uuid,
  add column if not exists user_id uuid,
  add column if not exists action_name text,
  add column if not exists payload jsonb,
  add column if not exists result jsonb,
  add column if not exists status text default 'pending',
  add column if not exists error text,
  add column if not exists created_at timestamptz default now();

create index if not exists lumenai_action_runs_business_created_idx
  on public.lumenai_action_runs (business_id, created_at desc);

create index if not exists lumenai_action_runs_user_idx
  on public.lumenai_action_runs (user_id);

create table if not exists public.market_feeds (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  url text not null,
  type text not null default 'rss',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table if exists public.market_feeds
  add column if not exists business_id uuid,
  add column if not exists name text,
  add column if not exists url text,
  add column if not exists type text default 'rss',
  add column if not exists enabled boolean default true,
  add column if not exists created_at timestamptz default now();

create index if not exists market_feeds_business_idx
  on public.market_feeds (business_id);

create table if not exists public.market_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  feed_id uuid references public.market_feeds(id) on delete set null,
  title text not null,
  url text,
  summary text,
  source text,
  published_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.market_items
  add column if not exists business_id uuid,
  add column if not exists feed_id uuid,
  add column if not exists title text,
  add column if not exists url text,
  add column if not exists summary text,
  add column if not exists source text,
  add column if not exists published_at timestamptz,
  add column if not exists raw jsonb,
  add column if not exists created_at timestamptz default now();

create index if not exists market_items_business_idx
  on public.market_items (business_id);

create index if not exists market_items_published_idx
  on public.market_items (business_id, published_at desc nulls last);

create index if not exists market_items_feed_idx
  on public.market_items (feed_id);

alter table if exists public.lumenai_config_snapshots enable row level security;
alter table if exists public.lumenai_action_runs enable row level security;
alter table if exists public.market_feeds enable row level security;
alter table if exists public.market_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'lumenai_config_snapshots',
    'lumenai_action_runs',
    'market_feeds',
    'market_items'
  ]
  loop
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
