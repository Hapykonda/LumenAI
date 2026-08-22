-- LumenAI Research Engine persistence.
-- Idempotent. Run after the operational module migrations.

create extension if not exists pgcrypto;

create table if not exists public.lumenai_research_sources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  name text not null,
  source_type text not null default 'url',
  url text,
  query text,
  description text,
  cadence text not null default 'manual',
  enabled boolean not null default true,
  last_run_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_research_jobs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  source_id uuid references public.lumenai_research_sources(id) on delete set null,
  query text not null,
  scope text not null default 'business',
  priority text not null default 'medium',
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_research_findings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  job_id uuid references public.lumenai_research_jobs(id) on delete set null,
  source_id uuid references public.lumenai_research_sources(id) on delete set null,
  title text not null,
  summary text,
  category text not null default 'signal',
  impact text not null default 'medium',
  confidence integer not null default 60,
  evidence jsonb not null default '[]'::jsonb,
  source_name text,
  source_url text,
  recommended_action text,
  routed_to text[] not null default '{}',
  status text not null default 'new',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lumenai_research_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid,
  job_id uuid references public.lumenai_research_jobs(id) on delete set null,
  title text not null,
  summary text,
  sections jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  status text not null default 'ready',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lumenai_research_sources_business_idx
  on public.lumenai_research_sources (business_id, enabled, updated_at desc);

create index if not exists lumenai_research_jobs_business_idx
  on public.lumenai_research_jobs (business_id, status, created_at desc);

create index if not exists lumenai_research_jobs_source_idx
  on public.lumenai_research_jobs (source_id, created_at desc);

create index if not exists lumenai_research_findings_business_idx
  on public.lumenai_research_findings (business_id, status, created_at desc);

create index if not exists lumenai_research_findings_confidence_idx
  on public.lumenai_research_findings (business_id, confidence desc);

create index if not exists lumenai_research_findings_job_idx
  on public.lumenai_research_findings (job_id, created_at desc);

create index if not exists lumenai_research_reports_business_idx
  on public.lumenai_research_reports (business_id, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array[
    'lumenai_research_sources',
    'lumenai_research_jobs',
    'lumenai_research_findings',
    'lumenai_research_reports'
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
    'lumenai_research_sources',
    'lumenai_research_jobs',
    'lumenai_research_findings',
    'lumenai_research_reports'
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
