# Changelog

All notable changes to VouchNet are documented here. This project follows
[Semantic Versioning](https://semver.org/).

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
