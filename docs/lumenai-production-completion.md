# LumenAI Production Completion

This document records the gated completion work for LumenAI. LumenAI remains
the product; Lumenite is its operational agent and Pulse Radar is its signal
and intelligence layer.

## Working branch

- Branch: `feat/lumenai-production-completion`
- Supabase project: `lumenai Project`
- Project ref: `hiytqxasrqghdyahyzny`
- Region: `us-east-1`
- Database: PostgreSQL 17.6

## Baseline

| Check | Initial result |
| --- | --- |
| TypeScript | Pass |
| Next.js production build | Pass |
| ESLint | Pass with 210 historical warnings and 0 errors |
| Action OS tests | 10/10 pass |
| Visual foundation tests | 3/3 pass |
| Smoke tests | Pass; authenticated flows require a valid test session |
| `app/globals.css` | 16,178 lines; 467,839 bytes |

The worktree contained extensive user and prior implementation changes before
this phase. They are preserved and are not treated as disposable generated
output.

## Phase 1 - Supabase and migrations

**Status:** completed

### Initial condition

The linked project was `INACTIVE`. It was restored through the Supabase
management API and reached `ACTIVE_HEALTHY` before any schema operation. The
first stable remote inspection showed five applied migrations and three local
migrations pending.

### Applied existing migrations

1. `202606280002_lumenai_research_engine.sql`
2. `20260809044217_lumenite_action_os_foundation.sql`
3. `20260809055032_harden_business_knowledge_function.sql`

The linked CLI dry run listed only these files. The production push completed
without seeds or role changes.

### Corrective migrations

1. `20260809064012_harden_legacy_widget_tables.sql`
   - Enables RLS on `widget_sessions` and `widget_public_keys`.
   - Revokes direct `PUBLIC`, `anon`, and `authenticated` table privileges.
   - Preserves trusted server access through `service_role`.
2. `20260809064148_harden_function_execution_context.sql`
   - Pins the `search_path` of ten historical functions.
   - Removes anonymous execution from internal membership helpers.
   - Keeps explicit authenticated grants required by RLS and Onboarding.
   - Keeps the public widget health RPC intentionally available.

### Verification evidence

- Local and remote histories are aligned. The current history contains 14
  versions, including the later authorization, Storage, and RLS hardening
  migrations documented below.
- Action OS and Research tables exist with RLS enabled.
- Action OS tenant tables expose authenticated read policies; writes continue
  through the authorized server action engine.
- `get_business_kb_text(uuid)` is executable only by `service_role`.
- `lumenai_can_access_business(uuid)` is executable by `authenticated` and
  `service_role`, as required by existing tenant policies.
- `widget_sessions` and `widget_public_keys` have no browser table grants.
- Security advisors changed from 2 errors and 29 warnings to 0 errors,
  9 warnings, and 2 informational notices.

### Advisor classification

- **Accepted by design:** authenticated execution of tenant membership helpers
  used by RLS, the authenticated Onboarding RPC, and the public widget health
  RPC. These functions have fixed lookup paths.
- **Configuration follow-up:** leaked-password protection must be enabled in
  Supabase Auth settings before production review.
- **Performance backlog:** 65 warnings remain across duplicate/permissive
  policies and auth init plans; 119 informational notices cover unused indexes
  and unindexed foreign keys. They require measured, table-specific changes and
  are not hidden or bulk-deleted.

Supabase advisor references:

- https://supabase.com/docs/guides/database/database-linter
- https://supabase.com/docs/guides/auth/password-security

### Gate result

- Migrations aligned: pass.
- Critical advisor errors: pass (zero).
- Required tables and RLS present: pass.
- Knowledge and browser grants verified: pass.
- Next phase: unified server-side business authorization.

## Open production risks

1. Historical panel APIs still resolve business context through several local
   helpers; the legacy Chat route can accept a client `businessId`.
2. Cross-tenant A/B RLS tests have not yet run and remain the Phase 3 gate.
3. Authenticated E2E flows require isolated test users and businesses.
4. Supabase leaked-password protection is not enabled.
5. Historical performance advisors and 210 lint warnings remain classified but
   unresolved.

## Phase 2 - Unified business authorization

**Status:** completed

### Implementation

- Added the server-only `getAuthorizedBusinessContext()` contract.
- Authentication accepts a valid server cookie or bearer token.
- The selected context comes from `profiles.active_business_id`, with
  `profiles.business_id` retained only as an explicit transition field.
- Selection never grants access: an active `lumenai_business_members` row is
  mandatory.
- Client-supplied business IDs are mismatch assertions only.
- The context returns user, business, membership, role, permissions, active
  business, authenticated Supabase client, and the trusted server client.
- Errors are typed as `UNAUTHENTICATED`, `BUSINESS_NOT_SELECTED`,
  `MEMBERSHIP_REQUIRED`, `BUSINESS_MISMATCH`, `PERMISSION_DENIED`,
  `RESOURCE_NOT_FOUND`, and `MEMBERSHIP_INACTIVE`.

### Migrated surfaces

- Lumenite and all modules using its shared permission helper.
- Calibration, AutoConfig, Market, and authenticated widget preview.
- Overview, Leads, Chat, Chats, Chat Messages, and read state.
- Widget administrative settings and widget asset Storage operations.
- Server component business guards and legacy server helpers.
- The client business resolver now requires profile selection and active
  membership; local storage is no longer an authorization source.

The public widget remains deliberately separate and continues to use
`public_key`, visitor identity, rate limiting, and its own server validation.
Profile/avatar endpoints remain user-scoped rather than tenant-scoped.

### Corrective migration

`20260809082320_restore_widget_key_extension_path.sql` adds the Supabase
`extensions` schema to the fixed lookup path of `generate_widget_key()`. An
authenticated integration test exposed the missing `gen_random_bytes` lookup;
the correction was applied and the full test was repeated successfully.

### Verification

- Authorization source tests: 4/4 pass.
- Authenticated integration cases: 5/5 pass.
- Owner A resolves only business A.
- Owner B resolves only business B.
- A client mismatch receives HTTP 409 and `BUSINESS_MISMATCH`.
- A selected business without membership receives HTTP 403 and
  `MEMBERSHIP_REQUIRED`.
- An anonymous API request receives HTTP 401 and `UNAUTHENTICATED`.
- Fixture cleanup verified 0 test users, 0 test profiles, and 0 test businesses.
- TypeScript, Action OS tests, and smoke tests pass after migration.

## Phase 3 - RLS and tenant isolation

**Status:** completed

### Database changes

- Added the private `lumenai-private-assets` bucket with a mandatory
  `<business_id>/...` object prefix.
- Added authenticated Storage SELECT/INSERT/UPDATE/DELETE policies requiring
  an active membership for the path tenant.
- Made `lumenai_audit_log` browser-immutable and tenant-readable.
- Replaced historical access-helper logic with active membership checks.
- Removed the legacy self-enrolment policies from `business_members`.
- Consolidated business SELECT/UPDATE/DELETE and membership-management
  policies around active membership and active owner role.
- Preserved authenticated business INSERT for Onboarding, before the owner
  membership trigger runs.

### Reproducible verification

`npm run test:rls` creates isolated owner A/business A, owner B/business B, a
user without membership, and an anonymous client. It seeds 14 sensitive tenant
tables through the trusted fixture client and then verifies:

- A can read A; B, no-member, and anon cannot read A.
- A can create, update, and delete its operational lead.
- A cannot insert into B or move an existing A row to B.
- B cannot delete A's row.
- Action OS and audit writes remain server-only.
- A can upload/read/delete its private object.
- A cannot upload into B's path; B, no-member, and anon cannot download A.
- Membership suspension immediately removes API, SQL, and private Storage
  access. The Storage revocation probe uses a fresh session and a previously
  unread object to avoid client/CDN cache ambiguity.

Fixture cleanup was verified at zero test users, profiles, businesses, and
Storage objects. The authorization integration suite still passes after the
RLS changes.

### Advisor result

- Security: 0 errors, 6 warnings, 2 informational notices.
- Performance: 0 errors, 54 warnings, 72 informational notices.
- Remaining warnings are tracked as explicit performance/Auth configuration
  work and do not represent a failed RLS gate.

## Phase 4 - Lumenite permission system

**Status:** completed

### Database and authorization

- Added immutable plan versioning, approval expiry, policy revisions and
  explicit revocation metadata in migration
  `20260809083553_complete_lumenite_permissions.sql`.
- Restricted policy administration to owner/admin actors holding
  `permissions:manage`.
- Added validation for registered capabilities, tenant-owned integrations,
  active members, resource types, access modes, IANA timezones, complete time
  windows, operation limits and future expiry.
- The policy engine now matches resources correctly, supports overnight
  windows, enforces hourly/daily limits and rechecks authorization immediately
  before execution.
- Revocation cancels unstarted runs, expires pending approvals and signals
  executing runs. Reversible effects receive a safe undo attempt.

### Human approval and plan changes

- Approve, reject and request-changes operations require
  `permissions:manage`.
- Approvals expire after 24 hours by default.
- A change request creates a new immutable plan version, supersedes the old
  plan, invalidates its approval and requires a new human approval.
- The inbox preserves pending, approved, rejected, expired, executed, failed
  and reverted history with requester, tenant, policy, risk, inputs, outputs,
  expiry, errors and undo state.

### Product interface

- `/panel/permissions` provides the full policy editor, levels 0-4, scoped
  subjects/resources/integrations, access controls, schedules, limits,
  expiration, revision control and reasoned revocation.
- `/panel/approvals` provides the operational inbox and all supported human
  decisions.
- Both surfaces are linked from panel navigation, keyboard operable,
  responsive and free of horizontal overflow at 390 px.

### Verification

- Migration list: 15 local and 15 remote, aligned.
- `npm run test:permissions`: 6 authenticated integration scenarios pass.
- `npm run test:action-os`: 12/12 contract tests pass.
- `npm run test:rls`: all 5 isolation summaries pass.
- `npm run test:authorization:integration`: all 5 authorization cases pass.
- `npx tsc --noEmit`: pass.
- Targeted ESLint: 0 errors and 0 warnings.
- `npm run build`: pass with Next.js 16.2.11.
- Authenticated browser QA: desktop and 390 px pass, no console errors and no
  horizontal overflow.
- Supabase advisors after migration: 0 errors; 6 security warnings and 54
  performance warnings remain unchanged and are tracked for later remediation.

### Residual risk

The current five actions are synchronous and reversible. Mid-execution
revocation is cooperative at safe pipeline checkpoints; a future asynchronous
or external provider will require durable cancellation tokens and provider-side
idempotency before it can be enabled.

## Phase 5 - Lumenite action integration

**Status:** completed

### End-to-end capability matrix

The authenticated `npm run test:lumenite` suite verifies every registered
capability against the linked Supabase project:

| Capability | Plan | Simulate | Approve | Execute | Verify/receipt | Audit | Idempotency | Undo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `internal.task.create` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `internal.lead.note.add` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `internal.response.prepare` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `internal.conversation.tag` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `internal.reminder.create` | Pass | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Each successful execution verifies the exact tenant-owned database record,
deduplicates repeated plan/execution/undo requests and removes the created
resource during rollback.

### Corrective finding

Cancelling a run previously left its approval row pending. Cancellation now
marks that approval as expired with actor, time and reason. The integration
suite verifies that the cancelled run cannot execute and that its audit event
exists.

### Failure and partial-state guarantees

- A lead removed after a valid plan but before execution produces HTTP 404,
  persisted `failed`, `RESOURCE_NOT_FOUND`, no success receipt and a required
  failure audit event.
- Contract coverage ensures an unverified mutation and any exception after
  `actionApplied` remain `partially_completed`, never a clean `failed` state.
- Fixture cleanup leaves no test business or dependent operational records.

### Gate result

- `npm run test:lumenite`: 8/8 reported scenarios pass, including all five
  capabilities.
- `npm run test:action-os`: 13/13 pass.
- `npm run test:permissions`: 6/6 pass after the cancellation correction.
- Targeted ESLint: 0 errors and 0 warnings.
- `npx tsc --noEmit`: pass.
- Next phase: connect Pulse Radar recommendations to the same auditable
  Lumenite plan flow.

## Phase 6 - Pulse Radar to Lumenite

**Status:** completed

### Persistence and isolation

- Migration `20260809222453_complete_pulse_lumenite_lifecycle.sql` adds the
  tenant-scoped `lumenai_pulse_signals` table and `signal_id` links on plans
  and runs.
- Signals persist evidence, source, period, refresh time, recommendation,
  lifecycle, snooze, plan/run links, error, verification and receipt.
- Authenticated clients receive tenant SELECT only. Browser INSERT, UPDATE and
  DELETE are revoked; lifecycle writes are server-managed and audited.

### Closed lifecycle

- Radar detections are upserted with stable keys instead of existing only in
  client memory.
- Preparing an action sends a UUID `signal_id`; capability and input are read
  from trusted persistence.
- Repeated prepare requests recover the linked plan/run.
- Run transitions synchronize `awaiting_approval`, `executing`, `resolved`,
  `partially_resolved`, `failed` and `reverted` back to Pulse.
- Approval expiry, cancellation and policy revocation also leave a visible
  non-success state.
- Retry is allowed only for failed, partial or reverted signals and creates a
  fresh immutable plan attempt.

### Product surfaces

- Full Pulse Radar now presents lifecycle status, evidence metrics, source,
  period, error, Prepare/View execution, snooze and dismiss.
- The floating Pulse widget consumes the same persisted signals, announces
  only real `new` items and persists viewed/dismissed/snoozed while retaining
  its frequency cap and form-blocking rules.
- Lumenite accepts the handoff and opens either the newly prepared plan or the
  existing linked run.

### Verification

- `npm run test:pulse-lumenite`: 6/6 lifecycle groups pass.
- A/B tenant isolation and browser-immutable lifecycle pass.
- Success -> resolved, failure -> failed and undo -> reverted are proven
  against the linked Supabase project.
- Authenticated browser QA confirms both full and floating Radar surfaces show
  source, period, lifecycle and the Lumenite action.
- Visual fixture cleanup verified zero remaining businesses.
- Targeted TypeScript and ESLint: pass with zero warnings.
- Production build: pass on Next.js 16.2.11.
- Migration list: 16 local and 16 remote, aligned.
- Post-migration advisors: 0 errors, 6 security warnings and 54 performance
  warnings. The only Pulse-specific notice is informational because the new
  snooze index has not accumulated production usage yet.

### Residual risk

Detection keys represent current operational conditions. A future recurrent
signal model should introduce detector occurrence windows when the product
needs multiple historical occurrences of the same condition instead of one
current lifecycle record.

## Phase 7 - LumenAI visual system

**Status:** completed for every current product surface

### Canonical foundation

- `app/lumenai-obsidian.css` is loaded after the historical global sheet and
  therefore acts as the final product layer without deleting functional module
  styles prematurely.
- The authenticated shell provides stable desktop navigation, mobile drawer,
  topbar, breadcrumbs, skip navigation, workspace context, system health,
  profile and dynamically loaded Pulse Radar.
- Shared primitives cover page headers, surfaces, buttons, status, loading,
  empty/error states and the complete operational state language.
- The official optimized LumenAI mark is used by the brand component, loaders,
  icons and shell; no generic letter replaces it.
- Motion is semantic, limited to transform/opacity and reduced by
  `prefers-reduced-motion`.

### Route coverage

The shared system covers Login, Onboarding, Overview, Calibration, Config IA,
Radar, Lumen Eye, Research, Growth, Twin, Campaigns, Knowledge, Chat, Chat
Detail, Leads, Widget, Settings/Profile, Appearance, System Health, Lumenite,
Permissions and Approval Inbox. The public widget intentionally uses its
published business theme while preserving accessibility and isolation.

Integrations and Automations do not yet have product routes. Their visual
surfaces will be added together with real provider and workflow behavior in
phases 15 and 16; empty decorative modules are intentionally not exposed.

### Verification

- `npm run test:foundation`: visual state, reduced motion, shell separation,
  official brand, layer order and 21 route files are asserted.
- Authenticated Pulse QA confirms the current shell and canonical surfaces
  render together without console-visible runtime failure.
- Existing design documentation defines tokens, hierarchy, geometry, copy,
  motion and the intended experience for every module.

### Residual work

Cross-route responsive screenshots, WCAG verification and historical CSS
removal remain separate mandatory phases. This phase establishes visual
consistency; it does not claim those later gates prematurely.

## Phase 8 - Dashboard and owner profile

**Status:** completed

### Dashboard

- Overview now follows the required executive order: health, critical alerts,
  approvals, Lumenite, Pulse, opportunities, conversations, leads, recent
  activity and secondary operational coverage.
- Every metric exposes value, meaning, source, period, update time, comparison,
  state and a real related route.
- Data comes from the authorized business across System Health configuration,
  Action OS, Approval Inbox, persisted Pulse signals, chats, leads, Knowledge,
  widget settings and the audit log. No placeholder business metric is used.
- The Obsidian hero and moving lights remain, while its board now prioritizes
  system health and operational risk.

### Profile and photography

- Selection, type/size validation, crop, preview, 640 x 640 WebP optimization,
  replacement, deletion, persistence, fallback, loading and errors are wired.
- `lumenai-profile-assets` is private. New paths include business and user IDs;
  RLS requires active membership plus ownership of the user path.
- Profile APIs validate the same authorized business context used elsewhere and
  serve private images through an authenticated same-origin endpoint.
- Avatar state is synchronized across Settings, profile preview, desktop/mobile
  sidebar, topbar and workspace identity.
- Public Next Image optimization is intentionally not used for the protected
  avatar endpoint; the uploaded asset is already normalized and the authenticated
  request must remain same-origin.

### Verification

- `npm run test:profile`: private bucket, all Storage operations, cross-tenant,
  cross-business and cross-user denial, spoof rejection and full avatar lifecycle pass.
- `npm run test:authorization:integration`: A/B isolation plus ten-metric order
  and provenance contract pass.
- Migration `20260810103000_complete_private_owner_profile_assets.sql` applied
  successfully to the linked Supabase project.
- TypeScript and targeted ESLint pass with zero warnings.

Global responsive, accessibility and full browser matrices remain assigned to
their later mandatory phases.

## Phase 9 - globals.css reduction

**Status:** completed

- `globals.css` was reduced from 16,179 lines / 467,839 bytes to 311 lines /
  8,295 bytes and now contains only Tailwind directives, reset, tokens, theme,
  base typography/background, scrollbar, selection and global focus behavior.
- Product layers moved before the canonical authority in
  `lumenai-obsidian.css`, preserving the established cascade.
- Widget CSS is imported only by the public widget route.
- Static PostCSS analysis removed 595 dead rules, 1,445 selector alternatives
  and 17 unused keyframes. A second audit is idempotent with zero changes.
- `test:foundation` now enforces the global size budget, rejects page-specific
  classes and protects route-local widget ownership.
- Production build passes after migration and pruning.

Historical active `!important` declarations remain documented compatibility
debt. None were introduced to perform this migration; removing them requires
the later screenshot and responsive matrices.

## Phase 10 - accessibility

**Status:** completed

- Shared custom-dialog behavior now provides initial focus, Tab containment,
  Escape, scroll lock and opener focus restoration. Knowledge, image crop,
  Calibration dialogs, Leads globe and Lumen Eye use the same contract.
- Pulse Radar retains its deliberate non-modal behavior while restoring focus
  to the floating launcher after close or Escape.
- Login, Onboarding and the authenticated shell expose skip navigation;
  important errors are announced and form controls have explicit names.
- Decorative canvases are hidden from assistive technology and data-bearing
  globes expose a textual equivalent.
- Rendered route auditing found no remaining unnamed visible controls,
  duplicate IDs, horizontal overflow or measured WCAG AA text-contrast issue.
- Login and Overview reflow at a 640 CSS pixel viewport without horizontal
  overflow, covering the equivalent content width of 200 percent desktop zoom.
- `audit:a11y` reports zero static findings and `test:accessibility` protects
  the shared contracts. Full evidence and residual AT coverage are documented
  in `docs/lumenai-accessibility.md`.

The next mandatory phase expands reflow and visual verification across the
complete desktop, tablet and mobile route matrix.

## Phase 11 - authenticated responsive system

**Status:** completed

- The authenticated matrix covers 360, 390, 768, 1024, 1280, 1440 and 1920 px.
- Tablet navigation now remains compact through 1023 px; desktop sidebar begins
  at 1024 px without compressing the workspace.
- Overview, section heroes, Radar, Calibration, Chat and settings use shrinkable
  tracks and bounded content instead of hidden document overflow.
- Chat keeps input and Send visible while message history scrolls. Pulse cannot
  cover compact forms or navigation because the mobile header owns its command.
- Fixed custom dialogs are viewport-relative after removing layout/paint
  containment from the route wrapper.
- Seven critical screenshots live in `docs/evidence/responsive`; automated PNG
  dimension checks and CSS contracts run with `npm run test:responsive`.
- The matrix also found and closed Calibration bootstrap for a new business;
  `test:calibration` protects the non-null and unpublished-state contracts.

Detailed route behavior and evidence are in `docs/lumenai-responsive.md`.
Performance measurement is the next mandatory phase.

## Phase 12 - performance

**Status:** completed

- The shared panel entry fell from 376.4 KB to 134.3 KB raw production
  JavaScript, a 64.3% reduction.
- Server auth is authoritative; the global client provider no longer initializes
  Supabase, subscribes to auth changes or repeats the profile request.
- Pulse is idle-deferred, its full panel remains dynamically imported, and
  Overview defers WebGL plus advanced analytics until explicit expansion.
- Widget asset requests and common panel API reads use the existing protected
  cookie session without shipping an SDK solely to manufacture bearer headers.
- Image crop editors in Widget and Settings load only when a file is selected.
- `audit:performance` reads production manifests, rejects Supabase in the global
  entry and enforces route budgets. `test:performance` protects the boundaries.
- Authenticated browser checks confirmed Overview, Chat and Leads continue to
  load authorized business data without redirects or API errors.

Detailed measurements and residual editor weight are documented in
`docs/lumenai-performance.md`. Warning elimination is the next mandatory phase.

## Phase 13 - warnings and dependency security

**Status:** completed

- Full-repository ESLint fell from 170 warnings across 30 files to zero; the
  normal `lint` command now enforces `--max-warnings 0`.
- All 143 explicit-`any` findings, nine hook dependency findings and nine
  unused-code findings were resolved without global suppressions.
- Auth, sensitive APIs, Supabase adapters, Widget events and editor payloads
  now preserve runtime validation at typed boundaries.
- Next.js and `eslint-config-next` were aligned at 16.3.0. Compatible dependency
  updates reduced npm's full production/development advisory count to zero.
- A stale `@theme` wrapper exposed by the updated CSS parser was replaced with
  standard keyframes; the Obsidian moving-light identity remains intact.
- `npm run lint`, `npx tsc --noEmit`, performance/accessibility contracts and a
  34-page production build pass with zero warnings.

Detailed classification and evidence are documented in
`docs/lumenai-code-quality.md`. The first real external integration is the next
mandatory phase.

## Phase 14 - first external integration

**Status:** blocked on Google OAuth configuration and consent

- Gmail draft mode is implemented with state, S256 PKCE, minimum
  `gmail.compose` scope, renewable tokens and AES-256-GCM storage.
- Credential and OAuth transaction tables are server-only; sanitized connection
  state and draft receipts remain tenant-scoped under RLS.
- Connect, callback, health, reconnect, disconnect and revocation paths are
  implemented. A partial callback revokes and removes credentials.
- `external.gmail.draft.create` is deterministic, idempotent, always requires
  Approval Inbox, verifies the remote draft and supports undo by deleting it.
- There is no email-send capability or endpoint in this release.
- Supabase migration histories are aligned at 18/18 and schema lint is clean.
- Static contracts pass 4/4. Remote tests pass tenant A/B isolation, private
  credentials, provider-owned state, approval gating and zero pre-approval
  external execution. Desktop and 390 px visual evidence is recorded.

The current environment has none of the four required Google OAuth variables,
so real consent, Gmail health, create/get/delete and remote revocation cannot be
claimed. Per the mandatory phase order, Automation Studio has not started.
Full architecture, setup and evidence are in `docs/lumenai-integrations.md`.
