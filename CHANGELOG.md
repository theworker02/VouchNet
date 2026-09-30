# Changelog

All notable changes to VouchNet are documented here. This project follows
[Semantic Versioning](https://semver.org/).

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
