-- Legacy widget lookup/session tables are not used directly by the current
-- public widget API. Keep server-side compatibility while closing PostgREST
-- access for browser roles.

alter table if exists public.widget_sessions enable row level security;
alter table if exists public.widget_public_keys enable row level security;

revoke all privileges on table public.widget_sessions
from public, anon, authenticated;

revoke all privileges on table public.widget_public_keys
from public, anon, authenticated;
