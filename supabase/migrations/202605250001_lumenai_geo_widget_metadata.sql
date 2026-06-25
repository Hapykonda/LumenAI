-- LumenAI investor MVP support:
-- geo insight metadata, widget avatar URLs and fast country aggregations.

alter table if exists public.chats
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.chat_messages
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.leads
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.widget_settings
  add column if not exists avatar_url text,
  add column if not exists logo_url text;

create index if not exists chats_metadata_gin_idx
  on public.chats using gin (metadata);

create index if not exists chat_messages_metadata_gin_idx
  on public.chat_messages using gin (metadata);

create index if not exists leads_metadata_gin_idx
  on public.leads using gin (metadata);

create index if not exists chats_metadata_country_idx
  on public.chats ((coalesce(metadata->>'countryCode', metadata->>'country')));

create index if not exists leads_metadata_country_idx
  on public.leads ((coalesce(metadata->>'countryCode', metadata->>'country')));
