# VouchNet

<p align="center">
  <a href="https://vouchnet.dev">
    <img src="apps/web/public/brand/vouchnet-mark.svg" width="88" height="88" alt="VouchNet logo" />
  </a>
</p>

<p align="center"><strong>A professional network for credible work, deliberate connections, and human participation.</strong></p>

<p align="center">
  <a href="https://vouchnet.dev"><img src="https://img.shields.io/badge/Live-vouchnet.dev-2457D6?style=flat-square" alt="Live site" /></a>
  <a href="https://github.com/theworker02/VouchNet/releases/tag/v0.1.0"><img src="https://img.shields.io/github/v/release/theworker02/VouchNet?display_name=tag&sort=semver&style=flat-square" alt="Latest release" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-111827?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Deployment-Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white" alt="Netlify" />
</p>

## Purpose

VouchNet is an independent professional network designed around one durable rule:

> **Humans participate. AI is an explicitly authorized tool.**

Human sessions, integrations, MCP clients, system workers, and moderators are distinct security
principals. Protected social actions are designed to require server-verifiable human approval;
client-side assertions never establish permission.

## Current product surface

VouchNet is an active early-stage product. The current vertical slices include:

- Email/password sign-up, login, server-side sessions, email verification, and password reset
- Professional profile onboarding, owner editing, and privacy-aware profile views
- People discovery, search, follows, Contact requests, blocks, and network management
- Early high-signal post/feed and functional-reaction foundations
- Account settings, session controls, and production Resend/Netlify configuration paths
- PostgreSQL migrations, Docker-based local PostgreSQL + Redis, and typed API boundaries

Incomplete routes intentionally show unavailable states rather than pretend the feature works.
Messaging, organizations, jobs, full notifications, moderation, and the MCP gateway remain in
development. See the [implementation matrix](docs/IMPLEMENTATION_MATRIX.md) for authoritative
feature-by-feature status.

## Architecture

```text
apps/
  web/             Next.js UI, server rendering, and HTTP boundary
  worker/          Future attributable background-work boundary
packages/
  auth/            Session and identity contracts
  db/              Drizzle schema and SQL migrations
  permissions/     Human and machine actor/action vocabulary
  audit/           Append-oriented security audit contracts
  trust/           Trust-and-safety policy contracts
  mcp/             Scoped integration and approval vocabulary
  search/          Replaceable search-provider contract
  ui/              Shared interface primitives
docs/              Architecture, security, privacy, and deployment decisions
```

The application is a modular Next.js monolith with explicit package boundaries. It stays
maintainable now while preserving a path to extract services later without coupling domain policy
to React components.

## Security principles

- **Server-first authorization** — protected routes resolve sessions and permissions on the server.
- **Attributable actors** — humans and automations never silently become the same principal.
- **Approval-aware automation** — integrations can prepare protected actions; approval is bound to the exact action and payload.
- **Scoped credentials** — MCP/API credentials are designed to be granular, revocable, rate-limited, and auditable.
- **Privacy and blocking** — social-graph queries apply visibility and block rules rather than relying on hidden UI controls.
- **Secret hygiene** — `.env` files are ignored and `.env.example` contains placeholders only.

Read the [architecture](docs/ARCHITECTURE.md), [authentication](docs/AUTH.md),
[automation policy](docs/AUTOMATION_POLICY.md), [threat model](docs/THREAT_MODEL.md), and
[security guide](docs/SECURITY.md) for the underlying decisions.

## Run locally

### Prerequisites

- Node.js 24
- pnpm 11
- Docker Desktop (for PostgreSQL and Redis)

### Setup

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

Set a unique `SESSION_SECRET` with at least 32 characters in `.env`, then open the URL printed by
Next.js—normally `http://localhost:3000`.

### Quality checks

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

## Configuration

All configuration is server-side. Never commit a real `.env` file.

| Variable         | Local development            | Production                         |
| ---------------- | ---------------------------- | ---------------------------------- |
| `DATABASE_URL`   | Docker PostgreSQL connection | Hosted PostgreSQL connection       |
| `REDIS_URL`      | Docker Redis connection      | Hosted Redis connection            |
| `SESSION_SECRET` | Unique 32+ character value   | Unique production-only secret      |
| `RESEND_API_KEY` | Optional for local delivery  | Required for transactional email   |
| `EMAIL_FROM`     | Test or verified sender      | Sender on a Resend-verified domain |
| `APP_URL`        | Local app URL                | `https://vouchnet.dev`             |
| `NEXUS_ENV`      | `development`                | `production`                       |

For detailed setup, read [development](docs/DEVELOPMENT.md), [authentication](docs/AUTH.md), and
[Netlify deployment](docs/NETLIFY.md).

## Deployment

VouchNet deploys from the repository root to Netlify. Configure production variables in Netlify,
not Git, and use the same Cloudflare DNS zone for Netlify site records and Resend sender
verification.

Before treating a deployment as ready, verify:

1. `https://vouchnet.dev/api/v1/status` reports the database as ready.
2. A test sign-up sends a confirmation message through Resend.
3. The confirmation link returns to `https://vouchnet.dev`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Authentication](docs/AUTH.md)
- [Trust & safety](docs/TRUST.md)
- [Privacy](docs/PRIVACY.md)
- [Automation policy](docs/AUTOMATION_POLICY.md)
- [MCP architecture](docs/MCP.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Roadmap](docs/ROADMAP.md)
- [Release notes](CHANGELOG.md)

## Status

The public baseline is tagged [v0.1.0](https://github.com/theworker02/VouchNet/releases/tag/v0.1.0).
VouchNet is not yet a production-complete social network; the implementation matrix is the source
of truth for capability readiness and deliberate scope boundaries.
