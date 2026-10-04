# VouchNet design language

VouchNet uses one visual language across public, authenticated, and future desktop clients. The
goal is a calm professional workspace: clear hierarchy, deliberate data density, and motion that
explains state rather than competing for attention.

## Current foundation

The portable vocabulary lives in [`@nexus/ui`](../packages/ui/src/index.ts). It defines the
semantic color roles, control measurements, surface elevations, and motion durations that clients
should preserve even when their rendering technology differs.

The web client applies those values through CSS custom properties in
[`apps/web/app/globals.css`](../apps/web/app/globals.css). This keeps the web bundle small while
giving a future desktop client an explicit contract to implement natively.

## Primitives

- `Button` and `ButtonLink` are the standard controls for intentional actions. They use the
  `sm` (34px), `md` (40px), and `lg` (46px) measurement scale with a 12px corner radius: soft
  and approachable, but not pill-shaped.
- `InteractiveCard` adds restrained hover and press feedback while honoring reduced-motion
  preferences.
- Shell navigation uses a shared active indicator and keyboard-safe menus.
- Status, verification, and muted metadata use semantic color roles instead of one-off palettes.

Legacy route-level `primary` and `secondary` classes remain supported while surfaces migrate. A
generic button is no longer forced into primary styling; icon, menu, dismiss, and secondary
controls retain the visual role their component declares.

## Motion and accessibility

Motion is optional. All animation primitives use `useMotionPreference`, and CSS animation is
disabled under `prefers-reduced-motion`. Visible focus styles, minimum control heights, native
buttons, and real link destinations remain required for every new component.

## Extracting a standalone package

The next client should import `@nexus/ui` for the semantic contract, then add platform-specific
renderers (React web, Tauri desktop, or another native surface). Before publishing it as a public
package, move the web control and surface CSS into scoped component styles, add Storybook-style
visual regression fixtures, and version the token contract independently from VouchNet's product
release.
