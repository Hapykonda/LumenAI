# LumenAI accessibility audit

## Status

Phase 10 completed. The current authenticated product and the public entry
flows have no known critical keyboard block, unnamed interactive control,
focus-losing custom dialog or measured WCAG AA text-contrast failure.

## Scope

The audit covers Login, Onboarding, Overview, Lumenite, Approval Inbox,
Permissions, Calibration, Config IA, Pulse Radar, Lumen Eye, Research, Growth,
Business Twin, Campaigns, Knowledge, Chat, Leads, Widget, Settings/Profile,
Appearance and System Health. It also covers shared navigation, forms, custom
dialogs, visual canvases, loading/error states and the floating Pulse surface.

## Implemented contracts

- A visible skip target is available in the authenticated shell, Login and
  Onboarding.
- Every interactive element receives a global high-contrast `:focus-visible`
  treatment. Coarse-pointer controls have a minimum 44 x 44 CSS pixel target.
- The global reduced-motion mode removes non-essential animation and smooth
  scrolling.
- Custom modal surfaces share Escape handling, initial focus, Tab trapping,
  body scroll lock and focus restoration.
- Pulse Radar is intentionally non-modal, focuses its heading on open and
  restores the floating launcher after close or Escape.
- Form errors use `role="alert"`; asynchronous status surfaces use announced
  status semantics where applicable.
- Inputs, icon buttons and file controls have explicit accessible names.
- Globes and shader canvases are hidden from assistive technology when
  decorative, while data-bearing globes expose a generated textual summary.
- Dashboard and Radar labels no longer rely on low-opacity text, and critical
  state distinctions retain labels/icons in addition to color.

## Automated evidence

- `npm run audit:a11y` parses all TSX files in `app` and `components` and rejects
  unnamed controls, unlabeled fields, images without alt text, untitled
  iframes, unexplained canvases, keyboard-inaccessible click targets and
  unnamed custom dialogs.
- `npm run test:accessibility` protects global focus/motion/target rules, shared
  modal behavior, modal adoption, entry-flow announcements, globe alternatives
  and Pulse focus restoration.
- TypeScript, targeted ESLint, the visual foundation suite and the production
  build form part of the phase exit gate.

## Browser evidence

Authenticated route checks found zero unnamed visible controls, duplicate IDs
or horizontal document overflow after stable loading. Contrast was measured
against rendered backgrounds across the production routes; the remaining
gradient-button detections were inspected directly and confirmed as scanner
false positives. Knowledge and Lumen Eye dialogs both retain focus, close on
Escape and restore their opener. Pulse performs the equivalent contract for a
non-modal panel.

Login and Overview reflow without horizontal overflow at a 640 CSS pixel
viewport, representing the effective content width of a 1280 pixel desktop at
200 percent zoom. The dedicated responsive phase extends this evidence to the
full desktop/tablet/mobile matrix.

## Residual risk

The static audit is a regression guard, not a replacement for assistive
technology sessions. Before broad public launch, perform one acceptance pass
with current NVDA + Chrome and VoiceOver + Safari, including real OTP email,
provider OAuth, audio calibration permissions and public widget embedding in a
third-party site. These depend on external clients or credentials and cannot be
fully simulated by the local browser fixture.
