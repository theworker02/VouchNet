# VouchNet interface system

VouchNet uses a compact, trust-oriented visual language: crisp hierarchy, quiet surfaces, explicit
state, and rounded controls that remain practical on dense professional workflows. It is intentionally
original; familiar patterns are adapted for VouchNet rather than copied from another product.

## Foundations

- **Canvas:** cool neutral backgrounds let active content and trusted signals lead.
- **Surfaces:** `--surface`, `--surface-raised`, and `--surface-sunken` distinguish workspace layers
  with borders before relying on shadow.
- **Corners:** `--radius-control`, `--radius-surface`, and `--radius-panel` define the only shared
  radii. Controls are rounded, but status metadata stays compact.
- **Typography:** UI copy is Inter/system sans; machine-readable values use the existing mono stack.
- **Motion:** 140–180ms transitions explain state changes. Respect `prefers-reduced-motion`.

## Reusable primitives

- `Button` / `ButtonLink`: fixed small, medium, and large measurements; primary, secondary, and
  quiet emphasis.
- `Badge`: neutral, accent, positive, warning, and critical metadata tones. Do not use a badge as a
  button.
- `vn-surface`: consistent bordered content layer. Add `vn-surface--raised` only to a focal dialog,
  form, or feature card.
- `vn-status`: small inline state language for trust and assurance details.

## Interaction rules

- A visible focus ring is mandatory for every interactive control.
- Use a one-pixel border to define grouping before adding elevation.
- Primary actions receive the strongest contrast; one primary action per local decision area.
- Do not use decorative motion to hide latency. Loading and disabled states must remain explicit.
- Use status colour alongside text or an icon; colour alone never communicates state.

## Extending a surface

Start from the shared token classes and add a named, route-specific class only for layout or
domain-specific content. New controls should use the button height/radius tokens instead of hardcoded
measurements. New statuses should use a `Badge` tone or add a documented tone centrally.
