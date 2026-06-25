-- LumenAI operational foundation
-- Run this in Supabase SQL Editor or with Supabase CLI.
-- It is intentionally idempotent: safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  public_key text default gen_random_uuid()::text,
  name text not null default 'Mi negocio',
  industry text,
  tone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.businesses
  add column if not exists owner_id uuid,
  add column if not exists user_id uuid,
  add column if not exists created_by uuid,
  add column if not exists profile_id uuid,
  add column if not exists public_key text,
  add column if not exists name text,
  add column if not exists industry text,
  add column if not exists tone text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.businesses
set public_key = coalesce(nullif(public_key, ''), gen_random_uuid()::text)
where public_key is null or public_key = '';

create unique index if not exists businesses_public_key_uidx
  on public.businesses (public_key)
  where public_key is not null;

create index if not exists businesses_owner_idx on public.businesses (owner_id);

create table if not exists public.profiles (
  id uuid primary key,
  business_id uuid,
  active_business_id uuid,
  role text not null default 'owner',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists business_id uuid,
  add column if not exists active_business_id uuid,
  add column if not exists current_business_id uuid,
  add column if not exists selected_business_id uuid,
  add column if not exists default_business_id uuid,
  add column if not exists role text default 'owner',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists profiles_business_id_idx on public.profiles (business_id);

create table if not exists public.widget_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  public_key text,
  widget_enabled boolean not null default true,
  assistant_name text default 'LumenAI',
  greeting text,
  whatsapp text,
  email text,
  position text default 'br',
  primary_color text default '#2F7CFF',
  gradient_from text default '#2F7CFF',
  gradient_to text default '#8A63FF',
  avatar_url text,
  logo_url text,
  business_hours jsonb not null default '{}'::jsonb,
  draft_settings jsonb not null default '{}'::jsonb,
  published_settings jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.widget_settings
  add column if not exists public_key text,
  add column if not exists widget_enabled boolean default true,
  add column if not exists assistant_name text default 'LumenAI',
  add column if not exists greeting text,
  add column if not exists whatsapp text,
  add column if not exists email text,
  add column if not exists position text default 'br',
  add column if not exists primary_color text default '#2F7CFF',
  add column if not exists gradient_from text default '#2F7CFF',
  add column if not exists gradient_to text default '#8A63FF',
  add column if not exists avatar_url text,
  add column if not exists logo_url text,
  add column if not exists business_hours jsonb default '{}'::jsonb,
  add column if not exists draft_settings jsonb default '{}'::jsonb,
  add column if not exists published_settings jsonb default '{}'::jsonb,
  add column if not exists published_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists widget_settings_public_key_idx on public.widget_settings (public_key);

create table if not exists public.business_kb (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null default 'other',
  title text not null default '',
  content text not null default '',
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.business_kb
  add column if not exists business_id uuid,
  add column if not exists type text default 'other',
  add column if not exists title text default '',
  add column if not exists content text default '',
  add column if not exists is_published boolean default false,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists business_kb_business_type_idx
  on public.business_kb (business_id, type, is_published);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  title text,
  channel text default 'widget',
  visitor_id text,
  unread_owner boolean not null default false,
  human_takeover boolean not null default false,
  human_takeover_at timestamptz,
  ai_paused_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.chats
  add column if not exists business_id uuid,
  add column if not exists title text,
  add column if not exists channel text default 'widget',
  add column if not exists visitor_id text,
  add column if not exists unread_owner boolean default false,
  add column if not exists human_takeover boolean default false,
  add column if not exists human_takeover_at timestamptz,
  add column if not exists ai_paused_reason text,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists chats_business_updated_idx on public.chats (business_id, updated_at desc);
create index if not exists chats_visitor_idx on public.chats (business_id, visitor_id);
create index if not exists chats_metadata_gin_idx on public.chats using gin (metadata);
create index if not exists chats_metadata_country_idx
  on public.chats ((coalesce(metadata->>'countryCode', metadata->>'country_code', metadata->>'country')));

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  sender_type text not null default 'user',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.chat_messages
  add column if not exists chat_id uuid,
  add column if not exists business_id uuid,
  add column if not exists sender_type text default 'user',
  add column if not exists content text default '',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now();

create index if not exists chat_messages_chat_created_idx
  on public.chat_messages (chat_id, created_at);
create index if not exists chat_messages_business_created_idx
  on public.chat_messages (business_id, created_at desc);
create index if not exists chat_messages_metadata_gin_idx
  on public.chat_messages using gin (metadata);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  name text,
  email text,
  phone text,
  source text default 'widget',
  intent text,
  summary text,
  status text not null default 'new',
  score integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.leads
  add column if not exists business_id uuid,
  add column if not exists chat_id uuid,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists source text default 'widget',
  add column if not exists intent text,
  add column if not exists summary text,
  add column if not exists status text default 'new',
  add column if not exists score integer default 0,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists leads_business_status_idx on public.leads (business_id, status, created_at desc);
create index if not exists leads_chat_idx on public.leads (chat_id);
create index if not exists leads_metadata_gin_idx on public.leads using gin (metadata);
create index if not exists leads_metadata_country_idx
  on public.leads ((coalesce(metadata->>'countryCode', metadata->>'country_code', metadata->>'country')));

create table if not exists public.lumenai_activity_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  actor_user_id uuid,
  type text not null,
  title text not null,
  detail text,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lumenai_activity_business_created_idx
  on public.lumenai_activity_events (business_id, created_at desc);

create table if not exists public.lumenai_assistant_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  chat_id uuid references public.chats(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  intent text,
  urgency text,
  sentiment text,
  objections text[] default '{}',
  next_best_action text,
  opportunity_lost_risk boolean default false,
  source text default 'widget',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lumenai_assistant_logs_business_created_idx
  on public.lumenai_assistant_logs (business_id, created_at desc);

create table if not exists public.lumenai_automation_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  key text not null,
  name text not null,
  trigger_type text not null,
  action_type text not null,
  enabled boolean not null default true,
  requires_human_approval boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, key)
);

create index if not exists lumenai_automation_rules_business_idx
  on public.lumenai_automation_rules (business_id, enabled);

create table if not exists public.lumenai_integrations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  provider text not null,
  status text not null default 'planned',
  config jsonb not null default '{}'::jsonb,
  credentials_ref text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, provider)
);

create table if not exists public.lumenai_audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lumenai_audit_business_created_idx
  on public.lumenai_audit_log (business_id, created_at desc);

create or replace function public.get_business_kb_text(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    string_agg(
      concat('[', type, '] ', title, E'\n', content),
      E'\n\n---\n\n'
      order by updated_at desc
    ),
    ''
  )
  from public.business_kb
  where business_id = p_business_id
    and is_published = true;
$$;

grant execute on function public.get_business_kb_text(uuid) to anon, authenticated, service_role;

create or replace function public.lumenai_can_access_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and (
        b.owner_id = auth.uid()
        or b.user_id = auth.uid()
        or b.created_by = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and (
              p.business_id = b.id
              or p.active_business_id = b.id
              or p.current_business_id = b.id
              or p.selected_business_id = b.id
              or p.default_business_id = b.id
            )
        )
      )
  );
$$;

grant execute on function public.lumenai_can_access_business(uuid) to authenticated, service_role;

create or replace function public.lumenai_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'businesses',
    'profiles',
    'widget_settings',
    'business_kb',
    'chats',
    'leads',
    'lumenai_automation_rules',
    'lumenai_integrations'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop trigger if exists %I on public.%I',
        'lumenai_touch_updated_at_' || t,
        t
      );
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.lumenai_touch_updated_at()',
        'lumenai_touch_updated_at_' || t,
        t
      );
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'lumenai-widget-assets',
      'lumenai-widget-assets',
      true,
      2097152,
      array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    )
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

alter table if exists public.businesses enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.widget_settings enable row level security;
alter table if exists public.business_kb enable row level security;
alter table if exists public.chats enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.leads enable row level security;
alter table if exists public.lumenai_activity_events enable row level security;
alter table if exists public.lumenai_assistant_logs enable row level security;
alter table if exists public.lumenai_automation_rules enable row level security;
alter table if exists public.lumenai_integrations enable row level security;
alter table if exists public.lumenai_audit_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'businesses' and policyname = 'lumenai_businesses_owner_all'
  ) then
    create policy lumenai_businesses_owner_all
      on public.businesses
      for all
      using (
        owner_id = auth.uid()
        or user_id = auth.uid()
        or created_by = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and (
              p.business_id = businesses.id
              or p.active_business_id = businesses.id
              or p.current_business_id = businesses.id
              or p.selected_business_id = businesses.id
              or p.default_business_id = businesses.id
            )
        )
      )
      with check (
        owner_id = auth.uid()
        or user_id = auth.uid()
        or created_by = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'lumenai_profiles_self_all'
  ) then
    create policy lumenai_profiles_self_all
      on public.profiles
      for all
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'widget_settings',
    'business_kb',
    'chats',
    'chat_messages',
    'leads',
    'lumenai_activity_events',
    'lumenai_assistant_logs',
    'lumenai_automation_rules',
    'lumenai_integrations',
    'lumenai_audit_log'
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
