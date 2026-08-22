# Dashboard and owner profile production contract

## Dashboard priority

`/api/panel/overview` returns one ordered `commandCenter.metrics` contract. The
order is part of the product behavior and is covered by integration tests:

1. System health.
2. Critical alerts.
3. Pending approvals.
4. Active Lumenite actions.
5. Active Pulse Radar signals.
6. Opportunities.
7. Conversations.
8. Leads.
9. Recent audited activity.
10. Operational coverage.

Every metric contains `value`, `meaning`, `source`, `period`, `updatedAt`,
`comparison`, `state`, `href` and `actionLabel`. Values come from the active
tenant's persisted data. The endpoint does not synthesize revenue, forecasts
or placeholder percentages.

The first viewport keeps the Obsidian hero and cinematic lights, but its status
board now surfaces health, alerts, approvals, Lumenite and coverage. The full
command center follows immediately and uses direct links to the owning module.

## Owner avatar lifecycle

The owner can select a PNG, JPEG or WebP source up to 10 MB. The browser opens
an interactive crop preview and exports an optimized 640 x 640 WebP. The final
upload is capped at 2 MB and the server verifies both the declared MIME type
and the binary signature.

The server owns the lifecycle:

- Upload creates a versioned object.
- The profile metadata stores only `avatar_path` and `avatar_version`.
- Replacement updates the profile before removing the previous object.
- Deletion clears the profile before removing the object.
- Failed profile persistence removes the newly uploaded object.
- Initials remain the deterministic fallback.

The browser never receives a public Storage URL. Images are served through the
authenticated `/api/panel/profile/avatar` endpoint with private caching and
`nosniff`. A regular `img` is intentional here: the image is already optimized
to 640 x 640, while a public Next Image optimizer request would not carry the
owner's authenticated context to this protected endpoint.

## Storage isolation

Migration `20260810103000_complete_private_owner_profile_assets.sql` makes the
`lumenai-profile-assets` bucket private and limits it to 2 MB PNG, JPEG and
WebP objects. New paths follow:

`<business_id>/<user_id>/avatar-<version>.<extension>`

Authenticated Storage policies require both an active membership for the first
path segment and `auth.uid()` equality with the second segment. Legacy
`<user_id>/...` objects remain readable only by that user while profiles move
to the new path format. Browser access across tenant, business or user folders
is denied.

## Synchronization

The same `OwnerProfile` state feeds Settings, the profile preview, desktop and
mobile sidebar identities, the topbar profile control and workspace labels.
Successful upload, replacement, deletion or text update emits one in-tab
profile event; persistence restores the same state after navigation or reload.
Approval Inbox continues to display the resolved requester identity by name;
it does not request another user's private owner image.

## Verification

- `npm run test:profile` proves private bucket settings, size limits,
  insert/select/update/upsert/delete, A/B denial, MIME spoof rejection,
  authenticated serving, replacement cleanup and deletion.
- `npm run test:authorization:integration` proves tenant isolation and the full
  metric provenance/order contract.
- TypeScript and targeted ESLint pass with zero warnings.

