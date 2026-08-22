# Supabase RLS Verification

## Scope

This verification covers LumenAI tenant isolation for two independent owners,
a user with a selected business but no membership, and an anonymous client.
The public widget is evaluated under its separate public-key contract.

## Authority

Tenant access is granted only by an active row in
`lumenai_business_members`. Profile selection, user metadata, owner columns,
and the legacy `business_members` table do not grant access.

The canonical RLS helper is `lumenai_can_access_business(uuid)`. Historical
helper names delegate to it for compatibility. `is_business_owner(uuid)` adds
the active owner-role requirement used for membership administration and
business mutation.

## Covered tables

1. `business_kb`
2. `chats`
3. `chat_messages`
4. `leads`
5. `widget_settings`
6. `lumenai_audit_log`
7. `lumenai_agent_policies`
8. `lumenai_agent_plans`
9. `lumenai_action_runs`
10. `lumenai_action_approvals`
11. `lumenai_lead_notes`
12. `lumenai_response_drafts`
13. `lumenai_conversation_tags`
14. `lumenai_reminders`

Business, profile, and membership visibility are checked separately. Action OS
tenant tables allow authenticated tenant reads; writes use the authorized
server engine. Audit evidence is also server-written.

## Storage

`lumenai-private-assets` is a private bucket. Every object name starts with the
business UUID. Storage policies compare that path segment with an active
membership for `auth.uid()`.

The profile and widget asset buckets remain public because their images must be
renderable on public/external surfaces. Their write and delete operations run
through authenticated server routes that validate the user and tenant path.

## Test matrix

| Operation | Owner A / A | Owner A / B | Owner B / A | No membership / A | Anonymous |
| --- | --- | --- | --- | --- | --- |
| Sensitive SELECT | Allow | Deny | Deny | Deny | Deny |
| Operational INSERT | Allow | Deny | Deny | Deny | Deny |
| Operational UPDATE | Allow | Deny | Deny | Deny | Deny |
| Tenant reassignment | N/A | Deny | Deny | Deny | Deny |
| Operational DELETE | Allow | Deny | Deny | Deny | Deny |
| Action/audit browser write | Deny | Deny | Deny | Deny | Deny |
| Private Storage | Allow | Deny | Deny | Deny | Deny |

Suspending A's membership changes every A result to deny without waiting for a
JWT refresh.

## Reproduction

```bash
npm run test:rls
```

The script creates fixtures with unique IDs, never invokes external providers,
and removes users, businesses, dependent rows, and objects in `finally`.

Expected summary:

```text
PASS 14 sensitive tables isolate tenant A from B, no-member, and anon
PASS tenant CRUD and tenant reassignment checks
PASS Action OS and audit writes remain server-only
PASS private Storage upload/read/delete and cross-tenant denial
PASS membership suspension revokes API, database, and Storage access immediately
```

