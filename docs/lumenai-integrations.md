# LumenAI external integrations

Date: 2026-08-10

## Current provider

The first provider is Google Gmail in `prepare_only` mode. LumenAI can prepare
and, after explicit human approval, create a Gmail draft. It has no registered
capability or API route for sending email.

The implementation follows Google's web-server OAuth flow with state, offline
access and PKCE. It requests only
`https://www.googleapis.com/auth/gmail.compose`, which supports draft creation
and Gmail profile health checks:

- [Google OAuth 2.0 for web servers](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail OAuth scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)
- [Gmail draft creation](https://developers.google.com/workspace/gmail/api/guides/drafts)
- [OAuth token storage guidance](https://developers.google.com/identity/protocols/oauth2/resources/best-practices)

## Security architecture

- `/api/panel/integrations/google/connect` requires an authenticated owner or
  administrator with `permissions:manage`.
- A random state value and S256 PKCE verifier are recorded in a one-use,
  ten-minute OAuth transaction bound to user and business.
- Access and refresh tokens are encrypted with AES-256-GCM before persistence.
- `lumenai_integration_credentials` and `lumenai_oauth_transactions` grant no
  access to `anon` or `authenticated`; only trusted server code uses them.
- Browser-readable integration rows contain sanitized state, scopes, account,
  expiration, health timestamps and errors, never tokens.
- The callback validates state, user, active business, expiry, one-time use and
  the exact granted scope before storing a connection.
- A partial callback revokes the issued Google token and removes local
  credentials. Disconnect also revokes remotely and deletes locally.
- All administrative APIs resolve business ownership from the unified server
  authorization context. A client-supplied integration ID never grants access.

## Operational lifecycle

1. The owner starts Google authorization from `/panel/integrations`.
2. Google returns an authorization code to
   `/api/integrations/google/callback`.
3. LumenAI exchanges it using PKCE, stores encrypted renewable credentials and
   calls Gmail `users.getProfile` as a real health check.
4. The user enters recipient, subject and body in the integration console.
5. The server creates deterministic capability
   `external.gmail.draft.create` with the integration attached.
6. Approval Inbox receives an `awaiting_approval` run. No Gmail request occurs
   during planning or simulation.
7. Explicit approval creates the Gmail draft, verifies it with `drafts.get`,
   stores its external identifier and emits the Action OS receipt/audit.
8. Undo calls `drafts.delete` and verifies the reverted state.

Access-token expiry triggers server-side refresh. Refresh failure marks the
connection expired. Health failure marks it degraded. Reconnect requests fresh
consent; disconnect removes the local secret regardless of remote response.

## Server variables

Configure these only in `.env.local` for local work and in the hosting
platform's encrypted server environment for deployments:

```text
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
LUMENAI_INTEGRATION_ENCRYPTION_KEY=
```

The encryption key must decode from base64 to exactly 32 bytes or contain 64
hexadecimal characters. The redirect URI must exactly match the Google OAuth
web client and should be:

```text
https://YOUR_DOMAIN/api/integrations/google/callback
```

The Gmail API must be enabled in the same Google Cloud project. None of these
values may use a `NEXT_PUBLIC_` prefix.

## Database

Migration `20260810120000_complete_google_gmail_draft_integration.sql` adds:

- sanitized connection lifecycle columns to `lumenai_integrations`;
- server-only `lumenai_integration_credentials`;
- one-use `lumenai_oauth_transactions`;
- tenant-readable, server-written `lumenai_external_drafts` receipts;
- supporting indexes, update triggers, grants and RLS policies.

Local and remote migration histories are aligned at 18/18. Supabase schema lint
reports no errors. The new tables add no security advisor finding. Six existing
project-level security warnings remain separately classified: four intentional
authenticated `SECURITY DEFINER` entry points/helpers, one intentional public
widget health helper and leaked-password protection disabled at the project
configuration level.

## Verification evidence

- `npm run test:integrations`: 4/4 contracts pass.
- `npm run test:integrations:remote`: tenant A/B, private credential grants,
  provider-owned state, deterministic planning, approval gating, idempotency,
  cross-tenant denial and fixture cleanup pass.
- No remote test approves an action or calls Gmail.
- Desktop browser verification found content, no framework overlay and no
  horizontal overflow.
- 390 px verification found no horizontal overflow and no product launcher over
  the form.
- Screenshots: `docs/evidence/integrations/gmail-integration-unconfigured.png`
  and `docs/evidence/integrations/gmail-integration-mobile-390.png`.

## Gate status

**Blocked on external configuration.** The repository and database work are
implemented and tested, but this environment does not contain the four Google
OAuth variables. Therefore a real consent, provider health check, draft
creation, remote verification, reconnect and remote revocation have not been
executed. LumenAI correctly displays the provider as unconfigured and does not
claim a connection.

Automation Studio must not begin until those variables are configured and the
real-provider acceptance flow passes, because the mandatory execution order
forbids advancing past a failed critical integration gate.
