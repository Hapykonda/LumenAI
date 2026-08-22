-- Gmail is preparation-only in this release. OAuth secrets remain in a
-- server-only table; authenticated users can read sanitized connection state.

update public.lumenai_integrations
set status = 'disconnected'
where status is null or status not in (
  'disconnected', 'connecting', 'connected', 'degraded', 'expired', 'revoked', 'error'
);

alter table public.lumenai_integrations
  alter column status set default 'disconnected',
  add column if not exists connection_mode text not null default 'prepare_only',
  add column if not exists scopes text[] not null default '{}'::text[],
  add column if not exists account_email text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_health_check_at timestamptz,
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists disconnected_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid;

alter table public.lumenai_integrations
  drop constraint if exists lumenai_integrations_status_check,
  drop constraint if exists lumenai_integrations_connection_mode_check;

alter table public.lumenai_integrations
  add constraint lumenai_integrations_status_check
    check (status in ('disconnected', 'connecting', 'connected', 'degraded', 'expired', 'revoked', 'error')),
  add constraint lumenai_integrations_connection_mode_check
    check (connection_mode = 'prepare_only');

create index if not exists lumenai_integrations_business_status_idx
  on public.lumenai_integrations (business_id, status, provider);

create table if not exists public.lumenai_integration_credentials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  integration_id uuid not null unique references public.lumenai_integrations(id) on delete cascade,
  provider text not null,
  encrypted_payload text not null,
  key_version integer not null default 1 check (key_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lumenai_integration_credentials_business_idx
  on public.lumenai_integration_credentials (business_id, integration_id);

create table if not exists public.lumenai_oauth_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null,
  provider text not null,
  state_hash text not null unique,
  encrypted_code_verifier text not null,
  redirect_path text not null default '/panel/integrations',
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint lumenai_oauth_transactions_expiry_check check (expires_at > created_at)
);

create index if not exists lumenai_oauth_transactions_lookup_idx
  on public.lumenai_oauth_transactions (state_hash, expires_at)
  where consumed_at is null;

create table if not exists public.lumenai_external_drafts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  integration_id uuid not null references public.lumenai_integrations(id) on delete cascade,
  action_run_id uuid not null unique references public.lumenai_action_runs(id) on delete cascade,
  requested_by uuid not null,
  provider text not null,
  recipient text not null,
  subject text not null,
  content_preview text not null default '',
  status text not null default 'preparing',
  external_id text,
  external_message_id text,
  external_url text,
  error_code text,
  error_message text,
  prepared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lumenai_external_drafts_status_check
    check (status in ('preparing', 'created', 'verified', 'failed', 'reverted'))
);

create index if not exists lumenai_external_drafts_business_created_idx
  on public.lumenai_external_drafts (business_id, created_at desc);

drop trigger if exists lumenai_touch_updated_at_lumenai_integrations
on public.lumenai_integrations;
create trigger lumenai_touch_updated_at_lumenai_integrations
before update on public.lumenai_integrations
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_integration_credentials
on public.lumenai_integration_credentials;
create trigger lumenai_touch_updated_at_lumenai_integration_credentials
before update on public.lumenai_integration_credentials
for each row execute function public.lumenai_touch_updated_at();

drop trigger if exists lumenai_touch_updated_at_lumenai_external_drafts
on public.lumenai_external_drafts;
create trigger lumenai_touch_updated_at_lumenai_external_drafts
before update on public.lumenai_external_drafts
for each row execute function public.lumenai_touch_updated_at();

alter table public.lumenai_integration_credentials enable row level security;
alter table public.lumenai_oauth_transactions enable row level security;
alter table public.lumenai_external_drafts enable row level security;

drop policy if exists lumenai_lumenai_integrations_business_all
on public.lumenai_integrations;
drop policy if exists lumenai_integrations_tenant_select
on public.lumenai_integrations;
create policy lumenai_integrations_tenant_select
on public.lumenai_integrations
for select
to authenticated
using (
  exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id = lumenai_integrations.business_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

drop policy if exists lumenai_external_drafts_tenant_select
on public.lumenai_external_drafts;
create policy lumenai_external_drafts_tenant_select
on public.lumenai_external_drafts
for select
to authenticated
using (
  exists (
    select 1
    from public.lumenai_business_members membership
    where membership.business_id = lumenai_external_drafts.business_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

revoke all on table public.lumenai_integration_credentials from anon, authenticated;
revoke all on table public.lumenai_oauth_transactions from anon, authenticated;
revoke insert, update, delete on table public.lumenai_integrations from anon, authenticated;
revoke insert, update, delete on table public.lumenai_external_drafts from anon, authenticated;
grant select on table public.lumenai_integrations to authenticated;
grant select on table public.lumenai_external_drafts to authenticated;
grant all on table public.lumenai_integrations to service_role;
grant all on table public.lumenai_integration_credentials to service_role;
grant all on table public.lumenai_oauth_transactions to service_role;
grant all on table public.lumenai_external_drafts to service_role;
