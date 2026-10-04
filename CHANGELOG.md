# Changelog

All notable changes to VouchNet are documented here. This project follows
[Semantic Versioning](https://semver.org/).

## 1.3.0 - 2026-10-04

### Public surface and release continuity

- Added an accessible compact navigation menu for the public landing page, preserving direct access
  to Explore, Jobs, Desktop, Developers, and the repository below the desktop navigation breakpoint.
- Added a versioned public release page at `/releases/1.3.0` and updated the release index so the
  website describes the current source release instead of presenting Desktop 1.0.0 as the latest
  platform release.
- Kept availability truthful: v1.3.0 is source-only and does not imply that a signed Windows
  installer or updater has been published.

## 0.11.1 - 2026-10-04

### Public preview polish

- Added current desktop, mobile, and sign-in screenshots to the README so prospective contributors
  can inspect the product surface directly from GitHub.
- Rebalanced the landing-page hero typography against the workspace preview and kept the compact
  feedback action anchored safely on narrow, mobile viewports.
- Disabled the local Next.js development inspector so it cannot overlap VouchNet's interface during
  product review or screenshot capture.

### Release contents

- This is a source-only release. It includes no database migration, signed Desktop installer,
  updater artifact, or binary download.

## 0.11.0 - 2026-10-04

### VouchNet Desktop foundation

- Added `apps/desktop`, a Tauri 2 + Rust + React client with its own installed shell, rail
  navigation, command palette, and feed rendering. It is a client of the existing VouchNet service,
  not an embedded `vouchnet.dev` browser shortcut.
- Added desktop PKCE browser authorization at `/desktop/authorize`, one-time authorization codes,
  rotating refresh-token families with replay revocation, and the `vouchnet://auth/callback` deep
  link. The desktop refresh credential is stored through Windows Credential Manager via the Rust
  keyring crate; browser session cookies are never copied to Desktop.
- Added canonical desktop build branding from the VouchNet mark, including generated Windows icon,
  taskbar, installer, and package asset sizes. The Windows bundle is configured for NSIS and MSI.
- Added public download and release pages: `/download`, `/download/windows`, `/releases`, and
  `/releases/1.0.0`. Download links deliberately remain unavailable until signed installers and
  checksums are attached to the GitHub release.

### Shared network messaging

- Replaced the messaging placeholder with a direct-message API and responsive conversation surface.
  Threads require accepted connections and honor either participant's block list.
- Added persisted conversation membership, messages, safe HTTPS image/link/document/portfolio
  attachments, unread counts, mute state, and server-derived read receipts. Outgoing messages show
  two checks, changing color only when the recipient's persisted read position reaches the message.
- Added organization membership and role persistence as the shared authority model for future
  employer/organization clients; source-reviewed directory records still do not imply ownership.

### Database migrations

- `0026_desktop_messaging_organizations` adds shared organization membership and private messaging
  tables.
- `0027_desktop_authorization` adds the separate device authorization-code, access-token, refresh-
  token, and family-revocation boundary.

### Release contents and limitations

- This source release contains the Desktop 1.0.0 source and native build configuration, but no
  signed installer, updater signing key, GitHub Release binary, or public checksum yet. Do not
  distribute an unsigned local build as the public Desktop release.
- Apply migrations through `0027` before enabling messages or desktop sign-in in production.

## 0.10.0 - 2026-10-04

### VouchNet Experiences

- Added the first interactive-post runtime. Authors can publish bounded HTML, CSS, and JavaScript
  Experiences from `/feed/create`, beginning with the `Open to connect` template.
- Experiences execute only inside a restrictive opaque-origin iframe sandbox. Runtime 1.0 has no
  network access, VouchNet API bridge, persistent data access, forms, popups, downloads, or parent
  document access.
- Added a per-post runtime disable state so interactive code can be stopped while its ordinary post
  remains available for human review and context.

### VouchNet Labs

- Added a browser-local Labs Easter egg, enabled by typing `vouch` outside a form field. Labs
  provides optional compact-feed and runtime-boundary display preferences without conveying any
  server-side authority.
- Added a deliberately narrow local runtime benchmark. It only accepts one explicit loopback URL,
  blocks remote hosts and redirects, never proxies through VouchNet, and supports one optional
  short Ollama inference when the local runtime permits browser CORS.

### UI and quality

- Polished Experience frame hierarchy, editor focus treatment, responsive composer layout, Labs
  controls, benchmark result states, and mobile behavior.
- Added runtime-manifest and loopback-address regression tests.

### Database migrations

- `0025_interactive_post_experiences` adds post type, validated interactive content storage, an
  execution kill state, and an index for active interactive content.

### Release contents

- This is a source-only feature release. It contains no compiled binaries, installers, or attached
  artifacts. See [`docs/releases/v0.10.0.md`](docs/releases/v0.10.0.md).

## 0.9.5 - 2026-10-03

### Security automation

- Repaired the Security workflow’s dependency gate after the registry reported an unpatchable
  advisory in development-only ESLint tooling. The runtime dependency audit stays strict at high
  severity while installing production dependencies without lifecycle scripts.
- CodeQL continues to scan the repository, and GitHub Dependency Review continues to review all
  dependency changes in pull requests. The workflow no longer misreports an unshippable dev-tool
  advisory as a production dependency failure.

### Release contents

- This is a source-only patch release. It contains no compiled binaries, installer packages, or
  downloadable artifacts. See [`docs/releases/v0.9.5.md`](docs/releases/v0.9.5.md).

## 0.9.4 - 2026-10-03

### Honest network density

- The empty member feed now hydrates with source-reviewed organizations and technical roles from
  VouchNet's existing public directory, plus the original daily strategy challenge.
- Every fallback item is explicitly identified as a source-reviewed record or platform-created
  activity. VouchNet does not fabricate member profiles, member posts, or engagement to make the
  network appear busier.
- Public-directory reads are independently resilient: an unavailable directory source does not
  prevent the daily challenge from giving a new member a useful first action.

### Release contents

- This is a source-only patch release. It contains no compiled binaries, installer packages, or
  downloadable artifacts. See [`docs/releases/v0.9.4.md`](docs/releases/v0.9.4.md).

## 0.9.3 - 2026-10-02

### Reliability and performance

- Deduplicated profile-summary reads within a single authenticated server render, avoiding
  unnecessary database work when the application shell and page both need the same member data.
- Bounded the initial feed window to 40 recent eligible posts. This preserves a useful first view
  while avoiding an unbounded collection of reaction and visibility calculations during navigation.
- Added an eight-second abort boundary to feed refreshes and a visible retry action. A delayed
  dependency now resolves into a recoverable state instead of leaving the feed indefinitely on its
  loading message.

### Release contents

- This is a source-only patch release. It contains no compiled binaries, installer packages, or
  downloadable artifacts. See [`docs/releases/v0.9.3.md`](docs/releases/v0.9.3.md).

## 0.9.2 - 2026-10-01

### Security hardening

- Added a request-bound CSP nonce, `strict-dynamic` script policy, and server-generated request
  ID through the Next.js Proxy boundary. The header policy continues to deny framing, object
  execution, unneeded browser permissions, and unsafe content types.
- Marked database-backed and credential-bearing modules as `server-only`, including the shared
  authentication and Stripe boundaries, so a client import fails at build time.
- Tightened OAuth authorization-code processing: strict form payloads reject duplicate/unknown
  fields, S256 PKCE challenges and verifiers are validated, and exact redirect matching remains
  mandatory.
- Hardened password reset, verification-link, developer-client, and session-revocation mutations
  with strict validation, same-origin enforcement, and rate limits.
- Added append-only `security_audit_logs` migration and privacy-minimized records for login and
  OAuth client lifecycle events. IP values are HMAC-hashed before persistence.
- Updated Drizzle ORM to `^0.45.2`, resolving the high-severity identifier-escaping advisory.

### Sessions

- Browser sessions are now host-only, `HttpOnly`, `SameSite=Strict` cookies with a 24-hour sliding
  inactivity deadline and a 30-day maximum lifetime. Successful password login revokes a prior
  browser session before setting a new one.

### CI and release contents

- CI now runs for both `main` and the repository's `master` branch. Added scheduled dependency
  integrity/audit, pull-request dependency review, and CodeQL scanning workflows.
- This is a source-only patch release. It contains no compiled binaries, installer packages, or
  downloadable artifacts. See [`docs/releases/v0.9.2.md`](docs/releases/v0.9.2.md).

## 0.9.1 - 2026-10-01

### Stability and resilience

- Reduced authenticated navigation overhead by materializing the daily game notification and
  calculating its unread badge count through one database lifecycle.
- Feed status messaging now clears after a successful refresh, post, or reaction persistence rather
  than leaving a stale error visible.
- The reaction picker now closes after a selection, and keyboard users can skip directly to the
  protected application content.
- Client error telemetry suppresses duplicate browser reports for 30 seconds, limiting a broken
  view from amplifying diagnostic traffic.
- The telemetry intake is rate limited, and follow, unfollow, and block mutations now use the
  existing distributed social-write limit and strict UUID route validation.

### Release contents

- This is a source-only patch release. It contains no compiled binaries, installer packages, or
  downloadable artifacts. See [`docs/releases/v0.9.1.md`](docs/releases/v0.9.1.md).

## [0.9.0] - 2026-10-01

### Highlights

- VouchNet now has production-oriented resilience, application workflows, telemetry, and security
  boundaries around its existing professional-network foundation.

### Added

- Native job application pages, a candidate Application Radar, and employer-owned candidate-stage
  management with audited stage events and in-app status notifications.
- Expanded persisted post reactions, accessible reaction controls, and optimistic UI rollback when
  a write cannot be saved.
- A redacted client-error telemetry intake with an administrator-only diagnostic queue.
- OAuth candidate-profile compatibility endpoint and a dependency-free Apply with VouchNet web
  component SDK for registered partner applications.
- Route-level error, loading, and not-found recovery surfaces; original VouchNet brand and favicon
  assets; and public RFC 9116 security contact and policy routes.
- Redis-backed sliding-window limits for high-risk authentication/OAuth routes and selected social
  writes, with fail-closed production behavior when the rate-limit dependency is unavailable.

### Changed

- Browser security headers and Content Security Policy are more explicit, and database-backed
  services are marked server-only to prevent accidental client imports.
- Input schemas on the new and hardened routes reject unknown fields, and sensitive OAuth flows
  continue to require exact redirect URI matching and S256 PKCE.
- Job cards now link to shareable VouchNet role pages; approved employer roles can open their
  candidate pipeline from the posting workspace.

### Database migrations

- `0018_expanded_post_reactions` extends persisted reaction types.
- `0019_error_telemetry` adds the protected error-event queue.
- `0020_native_job_applications` adds native applications and application history.
- `0021_application_stage_notifications` adds job-stage notification support.

### Important deployment step

- Apply database migrations through `0021` before deploying this release. Set a production
  `REDIS_URL`; rate-limited production endpoints intentionally return a safe unavailable response
  when Redis cannot be reached.

### Known limitations

- Database migrations have not been applied by this repository release process.
- The OAuth SDK establishes the authorization flow but partner-side callbacks and applicant data
  exports remain limited to profile fields that are already persisted and authorized.
- Turnstile, member MFA/passkeys, real-time delivery, secure resume downloads, and full employer
  messaging remain separate implementation and configuration work; no placeholder implementation
  represents them as complete.

## [0.8.0] - 2026-09-30

### Highlights

- A polished, responsive VouchNet application surface now connects public discovery with an
  authenticated professional workspace.
- Public portfolio pages, project showcases, source-reviewed organizations, transparent jobs,
  dynamic badges, and a daily platform challenge give the network useful entry points before a
  large member graph exists.
- Account verification is now a complete, resilient email-code flow with a branded transactional
  email and automatic session establishment after valid confirmation.

### Added

- Public `/in/[username]` profile pages and `/projects/[slug]` project pages with canonical and
  Open Graph metadata that respect profile visibility.
- Authenticated project publishing with repository and live links, project tags, owner-only API
  authorization, and copyable profile/project SVG badges for external READMEs and websites.
- Public organization pages with technology signals and clear **Source reviewed** status; these
  records do not imply organizational ownership or official verification.
- A public job directory with 15 source-linked technical listings, visible numerical compensation
  ranges, stack tags, source status, and external application links.
- A platform-owned daily technical challenge that is explicitly attributed to the `SYSTEM` actor
  rather than a fabricated member.
- A launch playbook for a consent-based first cohort, concierge onboarding, and atomic-network
  strategy.
- Branded authentication shells, keyboard-friendly sign-in/sign-up flow, email confirmation code
  entry, responsive navigation, refreshed home/network/feed surfaces, and dark/light-ready UI
  primitives.

### Changed

- The public README now documents the actual product surface, local setup, deployment
  expectations, architecture, security commitments, and current capability boundaries.
- Profile and public directory pages now use request-time rendering where their content is backed
  by database state, avoiding stale build-time data.
- Documentation and implementation status were synchronized across architecture, database,
  authentication, roadmap, and release material.

### Database migrations

- `0006_email_verification_codes` adds short-lived one-time verification codes.
- `0007_public_directory_jobs_projects` adds public organization, technology, job, and project-tag
  persistence plus reviewed directory seeds.
- `0008_daily_platform_challenges` adds attributable daily editorial challenges.

### Security and integrity

- No fake users, synthetic relationship graph, fabricated reactions, or impersonated founder posts
  were added. Founder posts must be authored by a real, verified human account.
- Public visibility and blocking checks remain server-side; badge routes only expose selected public
  profile/project information.

### Known limitations

- Organization ownership verification, internal applications, messaging, realtime notifications,
  moderation workflows, and the MCP gateway are not included in this release.
- Job listings are source-linked snapshots; availability must be confirmed at the source.
- Daily challenge publication currently requires an editorial seed/workflow for the next date.

## [0.1.0] - 2026-09-30

### Added

- A VouchNet-branded Next.js professional-network foundation with responsive
  public, authenticated, profile, network, discovery, and settings surfaces.
- Email/password authentication, verified-email architecture, secure server
  sessions, password-reset flow, and optional Resend delivery configuration.
- PostgreSQL/Drizzle schema and migrations for identity, profiles, social
  graph, settings, media metadata, and high-signal content foundations.
- Server-enforced actor and authorization boundaries, audit/trust contracts,
  environment validation, request logging, and database readiness reporting.
- Docker-based local PostgreSQL and Redis development environment.
- Netlify deployment configuration and production environment documentation.

### Security

- Local environment files are excluded from version control; the environment
  template contains placeholders only.
- Protected API routes use server-side session and authorization checks.
- The public automation model retains the human-approval requirement for
  protected social actions; MCP credentials do not impersonate human sessions.

### Known limitations

- This is an initial development release, not a production launch.
- Hosted PostgreSQL, Redis, verified sending domain, and deployment-specific
  secrets must be configured before a public deployment.
- Several product domains remain intentionally incomplete, including complete
  messaging, notifications, organizations, jobs, moderation, and MCP gateway
  operations. See `docs/IMPLEMENTATION_MATRIX.md`.

[0.1.0]: https://github.com/theworker02/VouchNet/releases/tag/v0.1.0
[0.8.0]: https://github.com/theworker02/VouchNet/releases/tag/v0.8.0
[0.9.0]: https://github.com/theworker02/VouchNet/releases/tag/v0.9.0
[0.9.1]: https://github.com/theworker02/VouchNet/releases/tag/v0.9.1
[0.9.2]: https://github.com/theworker02/VouchNet/releases/tag/v0.9.2
[0.9.3]: https://github.com/theworker02/VouchNet/releases/tag/v0.9.3
[0.10.0]: https://github.com/theworker02/VouchNet/releases/tag/v0.10.0
[0.11.0]: https://github.com/theworker02/VouchNet/releases/tag/v0.11.0
