-- LumenAI Config IA + Widget hardening
-- Idempotent production support for autonomous configuration, rollback and widget runtime.

create extension if not exists pgcrypto;

alter table if exists public.widget_settings
  add column if not exists draft_updated_at timestamptz default now(),
  add column if not exists font_family text,
  add column if not exists time_zone text default 'America/Santiago',
  add column if not exists allowed_parent_origin text,
  add column if not exists metadata jsonb default '{}'::jsonb;

update public.widget_settings
set draft_updated_at = coalesce(draft_updated_at, updated_at, now())
where draft_updated_at is null;

update public.widget_settings ws
set public_key = b.public_key
from public.businesses b
where ws.business_id = b.id
  and (ws.public_key is null or ws.public_key = '')
  and b.public_key is not null;

create index if not exists widget_settings_business_enabled_idx
  on public.widget_settings (business_id, widget_enabled);

create index if not exists widget_settings_updated_idx
  on public.widget_settings (updated_at desc);

create index if not exists lumenai_audit_autoconfig_idx
  on public.lumenai_audit_log (business_id, action, created_at desc)
  where action in ('panel_autoconfig.apply', 'panel_autoconfig.rollback', 'panel_autoconfig.propose');

create index if not exists lumenai_activity_type_created_idx
  on public.lumenai_activity_events (business_id, type, created_at desc);

create index if not exists lumenai_automation_rules_key_idx
  on public.lumenai_automation_rules (business_id, key);

create or replace function public.lumenai_widget_public_health(p_public_key text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_build_object(
      'businessId', b.id,
      'businessName', b.name,
      'publicKey', b.public_key,
      'widgetEnabled', coalesce(ws.widget_enabled, true),
      'publishedAt', ws.published_at,
      'hasPublishedSettings', ws.published_settings is not null and ws.published_settings <> '{}'::jsonb,
      'hasContact', coalesce(ws.whatsapp, '') <> '' or coalesce(ws.email, '') <> ''
    ),
    '{}'::jsonb
  )
  from public.businesses b
  left join public.widget_settings ws on ws.business_id = b.id
  where b.public_key = p_public_key
  limit 1;
$$;

grant execute on function public.lumenai_widget_public_health(text) to anon, authenticated, service_role;
