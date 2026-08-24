-- Persist the business-selected LumenAI operator and remove avoidable index
-- overhead. This migration is intentionally data preserving and idempotent.

alter table public.widget_settings
  add column if not exists operator_id text;

update public.widget_settings
set operator_id = case
  when lower(coalesce(published_settings #>> '{widget,operatorId}', '')) in
    ('pulse', 'miu', 'nubi', 'orbit', 'luma', 'bit', 'flori')
    then lower(published_settings #>> '{widget,operatorId}')
  when lower(coalesce(operator_id, '')) in
    ('pulse', 'miu', 'nubi', 'orbit', 'luma', 'bit', 'flori')
    then lower(operator_id)
  else 'pulse'
end;

alter table public.widget_settings
  alter column operator_id set default 'pulse',
  alter column operator_id set not null;

alter table public.widget_settings
  drop constraint if exists widget_settings_operator_id_check;

alter table public.widget_settings
  add constraint widget_settings_operator_id_check
  check (operator_id in ('pulse', 'miu', 'nubi', 'orbit', 'luma', 'bit', 'flori'));

comment on column public.widget_settings.operator_id is
  'Simple friendly operator selected for the panel, tutorials, Pulse Radar and widget.';

-- Foreign-key indexes reported by the Supabase performance advisor.
create index if not exists chat_messages_sender_user_id_idx
  on public.chat_messages (sender_user_id);
create index if not exists lumenai_action_runs_integration_id_idx
  on public.lumenai_action_runs (integration_id);
create index if not exists lumenai_agent_plans_root_plan_id_idx
  on public.lumenai_agent_plans (root_plan_id);
create index if not exists lumenai_assistant_logs_chat_id_idx
  on public.lumenai_assistant_logs (chat_id);
create index if not exists lumenai_assistant_logs_lead_id_idx
  on public.lumenai_assistant_logs (lead_id);
create index if not exists lumenai_campaign_experiments_business_id_idx
  on public.lumenai_campaign_experiments (business_id);
create index if not exists lumenai_campaign_tasks_campaign_id_idx
  on public.lumenai_campaign_tasks (campaign_id);
create index if not exists lumenai_conversation_tags_chat_id_idx
  on public.lumenai_conversation_tags (chat_id);
create index if not exists lumenai_decision_actions_scenario_id_idx
  on public.lumenai_decision_actions (scenario_id);
create index if not exists lumenai_external_drafts_integration_id_idx
  on public.lumenai_external_drafts (integration_id);
create index if not exists lumenai_followup_tasks_chat_id_idx
  on public.lumenai_followup_tasks (chat_id);
create index if not exists lumenai_followup_tasks_lead_id_idx
  on public.lumenai_followup_tasks (lead_id);
create index if not exists lumenai_lead_notes_lead_id_idx
  on public.lumenai_lead_notes (lead_id);
create index if not exists lumenai_oauth_transactions_business_id_idx
  on public.lumenai_oauth_transactions (business_id);
create index if not exists lumenai_research_findings_source_id_idx
  on public.lumenai_research_findings (source_id);
create index if not exists lumenai_research_reports_job_id_idx
  on public.lumenai_research_reports (job_id);
create index if not exists lumenai_response_drafts_chat_id_idx
  on public.lumenai_response_drafts (chat_id);
create index if not exists lumenai_signal_events_chat_id_idx
  on public.lumenai_signal_events (chat_id);
create index if not exists lumenai_signal_events_lead_id_idx
  on public.lumenai_signal_events (lead_id);
create index if not exists lumenai_simulation_reports_business_id_idx
  on public.lumenai_simulation_reports (business_id);
create index if not exists market_signals_market_item_id_idx
  on public.market_signals (market_item_id);

-- Keep the canonical indexes defined by the operational foundation and drop
-- byte-for-byte duplicates that only add write and vacuum cost.
drop index if exists public.businesses_owner_id_idx;
drop index if exists public.businesses_public_key_idx;
drop index if exists public.businesses_public_key_uq;
drop index if exists public.chat_messages_chat_id_created_at_idx;
drop index if exists public.chat_messages_chat_id_idx;
drop index if exists public.chat_messages_conversation_idx;
drop index if exists public.leads_chat_id_idx;
