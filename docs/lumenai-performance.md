# LumenAI performance audit

Date: 2026-08-10

## Scope

The audit covers the authenticated shell, client boundaries, Context providers,
Supabase browser usage, Pulse Radar, Lumenite, Calibration, WebGL, image editors,
animated backgrounds and representative route bundles. Values below are raw,
uncompressed production entry bytes from Next.js client reference manifests.

## Baseline and result

| Entry | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Shared panel shell | 376.4 KB | 134.3 KB | 64.3% |
| Overview | 548.0 KB | 286.5 KB | 47.7% |
| Calibration | 499.4 KB | 257.4 KB | 48.5% |
| Radar | 404.7 KB | 162.6 KB | 59.8% |
| Lumenite | 408.5 KB | 166.4 KB | 59.3% |
| Chat | 400.7 KB | 158.6 KB | 60.4% |
| Leads | 426.1 KB | 184.0 KB | 56.8% |
| Widget | 564.2 KB | 314.7 KB | 44.2% |

The shared shell no longer contains `@supabase/supabase-js`. The server layout
is the single authority for session and active-business resolution, preventing
the former duplicate auth/profile request and browser auth subscription on every
panel route.

## Implemented controls

- Cookie-authenticated panel APIs use a small shared fetch helper; bearer tokens
  are still accepted by the server for external callers.
- Pulse Radar is loaded during browser idle time and its full conversation panel
  remains dynamically imported until opened.
- Overview does not mount WebGL or advanced charts while Advanced analytics is
  collapsed.
- Cobe is dynamically imported from the enterprise suite instead of being a
  static dependency of unrelated components.
- Widget and Settings load the image crop editor only after a file is selected.
- Widget asset operations rely on the already protected same-origin API and no
  longer initialize the Supabase browser SDK merely to read a token.
- Independent Pulse Radar and System Health reads remain parallel with
  `Promise.all`; the overview API already parallelizes independent aggregates.
- Hero motion remains CSS-based, uses transform/opacity for continuous movement
  and is disabled by the established reduced-motion contract.

## Browser indication

An authenticated local development pass used the same five routes and the same
800 ms settling interval before and after. Wall-clock results were Overview
3165 -> 2559 ms, Calibration 2767 -> 2510 ms, Radar 2924 -> 2187 ms, Lumenite
3911 -> 2284 ms and Chat 3491 -> 1716 ms. This is directional local evidence,
not a synthetic production Lighthouse score; the production bundle budgets are
the reproducible release gate.

## Residual weight

Knowledge and Settings intentionally retain the Supabase browser client because
their current editors still perform authorized realtime-style mutations through
RLS. Moving these large editors to server-backed route APIs is a future
architecture improvement, not a prerequisite for this release. Calibration is
editor-heavy by design but now benefits from the 64.3% shared-shell reduction.

Run `npm run build`, `npm run audit:performance` and
`npm run test:performance` to reproduce the gate.
