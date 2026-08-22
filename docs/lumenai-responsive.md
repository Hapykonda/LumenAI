# LumenAI authenticated responsive matrix

## Status

Responsive validation is complete for 360, 390, 768, 1024, 1280, 1440 and
1920 pixel viewports. Every authenticated route was checked at mobile and
desktop representative widths; critical workflows were repeated at each
transition breakpoint.

## Navigation and shell

- 360-1023 px uses the compact header and accessible navigation drawer.
- 1024 px and above uses the persistent 248 px sidebar.
- The contextual desktop topbar is removed from compact layouts instead of
  squeezing hidden breadcrumbs into the action row.
- Floating Pulse is hidden below 768 px because the compact header retains a
  dedicated Pulse command. It therefore cannot cover forms or the mobile
  drawer.
- The authenticated workspace no longer uses layout/paint containment around
  route children; fixed dialogs correctly anchor to the viewport.

## Workflow behavior

- Overview and shared section heroes collapse with `minmax(0, 1fr)` and use a
  bounded mobile title scale. Moving lights remain decorative and clipped.
- Radar treats its animated lights as an absolute layer and stacks its command
  sections at narrow widths. Its 1280 px hero no longer creates accidental
  grid columns.
- Calibration becomes a one-column bento with a horizontal section rail. The
  rail and toolbar no longer overlap; Publish remains a named 44 px icon action.
- Chat collapses the control sidebar under the conversation on narrow screens.
  The message stream owns scrolling while input and Send remain visible at
  360, 390, 768 and 1024 px.
- Lumenite keeps its request, plan, execution, approval and audit regions in
  document order. Suggestion rows use intentional horizontal scrolling.
- Widget preview stays within its parent at mobile width. Installation code
  blocks and settings tabs use bounded internal scrolling rather than document
  overflow.
- Knowledge dialogs fit the viewport and retain internal focus/scroll behavior.

## Matrix evidence

| Viewport | Evidence | Critical focus |
| --- | --- | --- |
| 360 x 800 | `docs/evidence/responsive/360-chat.jpg` | Chat input and Send |
| 390 x 844 | `docs/evidence/responsive/390-calibration.jpg` | Calibration bento and Publish |
| 768 x 1024 | `docs/evidence/responsive/768-overview.jpg` | Tablet shell and executive hero |
| 1024 x 768 | `docs/evidence/responsive/1024-chat.jpg` | Desktop transition and composer |
| 1280 x 800 | `docs/evidence/responsive/1280-radar.jpg` | Radar command center |
| 1440 x 900 | `docs/evidence/responsive/1440-overview.jpg` | Standard desktop dashboard |
| 1920 x 1080 | `docs/evidence/responsive/1920-settings.jpg` | Wide settings and preview |

Programmatic checks report zero accidental document-level horizontal overflow
across the current route inventory. Elements outside the viewport belong only
to explicit carousels, tab rails or code blocks with their own scrolling.

## Additional defect closed

The responsive Calibration session exposed a new-business bootstrap failure:
`widget_settings.published_settings` was inserted as null despite a non-null
database contract. New rows now use `{}`, empty publication objects remain
semantically unpublished and Pulse readiness no longer counts `{}` as a
published calibration. `npm run test:calibration` protects both behaviors.
