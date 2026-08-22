# globals.css migration

## Result

The former global sheet mixed base styles with sixteen generations of product
surfaces. The migration keeps the browser cascade in the same order while
assigning ownership explicitly:

| Owner | Before | After | Responsibility |
| --- | ---: | ---: | --- |
| `app/globals.css` | 16,179 lines / 467,839 bytes | 311 lines / 8,295 bytes | Tailwind directives, reset, tokens, theme variables, typography, background, selection, scrollbar and global focus |
| `app/lumenai-obsidian.css` | 1,827 lines plus historical global layers | 12,377 lines / 340,944 bytes | Canonical authenticated/public product system and retained active compatibility rules |
| `app/widget/widget.css` | Imported for every route | 2,229 lines / 50,795 bytes | Public widget route only |

The product CSS total was also reduced: 595 rules, 1,445 selector alternatives
and 17 unused keyframes were removed after migration. The Obsidian sheet fell
from 488,611 to 340,944 bytes after the conservative dead-selector pass.

## Migrated sections

- shadcn/21st compatibility helpers;
- historical Apex, glass, matte, Noir, iOS, Vision and Vercel layers;
- shell, navigation, cards, forms and command surfaces;
- Overview, Calibration, Radar, Pulse, Autoconfig and other route surfaces;
- semantic motion and responsive product rules;
- page loading and operational states.

These rules are placed before the current canonical Obsidian authority, so the
same final declarations continue to win. The one Tailwind `@layer base` block
remains in `globals.css`, beside the matching `@tailwind base` directive.

## Removed selectors

`npm run audit:css -- --write` parses selectors with PostCSS. A selector
alternative is removed only when every class it requires is absent from all
JavaScript and TypeScript product sources. Selectors without classes and rules
that cannot be parsed are retained. Empty at-rules and unreferenced keyframes
are then removed.

Representative retired families:

- `lmn-cardSoft`, `lmn-btn`, `lmn-heroBar` and `lmn-heroOrbs`;
- legacy Apex scan, rotating title, data rail and liquid panel primitives;
- old `lmn-pro-card` and sidebar-scroll generations;
- retired Overview hero grid/ring and Calibration asset/command surfaces;
- abandoned Pulse typing/orb animations and old Radar hero travel.

The audit is idempotent: a second run reports zero removals.

## Current owners

- Global reset/tokens/accessibility: `app/globals.css`.
- Product shell and shared visual language: `app/lumenai-obsidian.css`.
- Feature-local interfaces: existing CSS Modules under Settings, Calibration,
  Lumenite, Permissions, Approvals, Pulse and shared UI components.
- Public embedded experience: `app/widget/widget.css`, imported by its route.
- Component structure and typed variants: shared React primitives and Tailwind.

## Pending selectors

The Obsidian sheet intentionally retains active compatibility selectors. It
still contains 1,796 historical `!important` declarations. They were moved, not
introduced, and cannot be removed safely without route-by-route visual
comparison. New product work must use CSS Modules, typed variants, Tailwind or
the final Obsidian authority and must not add another compatibility generation.

Future extraction candidates are the remaining active Overview, shell and
shared card families. They should move only when each consumer has a scoped
replacement and screenshot coverage.

## Risks and controls

- Static class analysis cannot prove classes injected by an unknown third-party
  package. The removed sample was reviewed and the project does not depend on
  those retired component packages.
- The widget import changed ownership. Production build verifies the route
  compiles; responsive browser QA remains part of the dedicated later phase.
- The stylesheet still has historical specificity. The migration preserved its
  order to avoid resolving architecture with new `!important` declarations.
- `test:foundation` enforces a sub-400-line global budget, rejects route-specific
  product selectors in the global base and verifies widget isolation.

## Verification

- `npm run audit:css`: idempotent, zero pending dead-selector changes.
- `npm run test:foundation`: CSS ownership contract covered.
- `npm run build`: production compilation succeeds after the split and prune.

