# VouchNet

VouchNet is a professional network designed around one non-negotiable premise: humans participate; AI is an explicitly authorized tool.

## Current status

Phase 5 is **PARTIAL**. VouchNet has a usable local-development identity and network slice: sign up,
development email verification, server-side sessions, protected pages, profile basics, people
search, follows, and Contact requests. It does **not** yet have posts, feeds, notifications,
organizations, messaging, jobs, or production email delivery. See
[the implementation matrix](docs/IMPLEMENTATION_MATRIX.md) before treating a surface as complete.

## Development

1. Copy `.env.example` to `.env` and replace `SESSION_SECRET` with a unique value of at least 32 characters.
2. Run `docker compose up -d` to start PostgreSQL and Redis.
3. Run `pnpm install`.
4. Run `pnpm db:migrate`.
5. Run `pnpm dev`, then visit the port reported by Next.js (normally `http://localhost:3000`).

Useful checks: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm build`.

## Deployment

The repository is prepared for Netlify deployment from the workspace root. Read [Netlify deployment](docs/NETLIFY.md) before connecting a GitHub repository; production requires hosted PostgreSQL and server-side environment variables, even before you own a custom domain.

## Repository layout

- `apps/web` — Next.js application and HTTP boundary
- `apps/worker` — future attributable background processing boundary
- `packages/db` — Drizzle schema and migrations
- `packages/config` — validated runtime configuration and centralized policy defaults
- `packages/permissions` — actor/action security vocabulary and approval binding contract
- `packages/audit`, `packages/trust`, `packages/mcp`, `packages/search` — domain contracts kept independent from UI
- `docs` — architecture and security decisions

See [the roadmap](docs/ROADMAP.md), [Phase 5 status](docs/PHASE5.md), and the
[implementation matrix](docs/IMPLEMENTATION_MATRIX.md) for delivery order and deliberate scope
boundaries.
