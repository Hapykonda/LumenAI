-- Cache auth.uid() once per statement in the remaining legacy policies.
-- Access predicates and role requirements are intentionally unchanged.

alter policy bm_select_own
on public.business_members
using (user_id = (select auth.uid()));

alter policy channels_member_all
on public.business_channels
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_channels.business_id
      and bm.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = business_channels.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner'::text, 'admin'::text])
  )
);

alter policy conv_member_insert
on public.chat_conversations
with check (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = chat_conversations.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner'::text, 'admin'::text, 'agent'::text])
  )
);

alter policy conv_member_select
on public.chat_conversations
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = chat_conversations.business_id
      and bm.user_id = (select auth.uid())
  )
);

alter policy conv_member_update
on public.chat_conversations
using (
  exists (
    select 1
    from public.business_members bm
    where bm.business_id = chat_conversations.business_id
      and bm.user_id = (select auth.uid())
      and bm.role = any (array['owner'::text, 'admin'::text, 'agent'::text])
  )
);
