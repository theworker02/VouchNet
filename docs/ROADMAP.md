# Roadmap

## Completed: Wave A — Foundation

- pnpm monorepo with Next.js web and worker boundaries
- PostgreSQL/Redis Docker development environment
- Drizzle configuration and initial append-only security observability migration
- strict TypeScript, ESLint, Prettier, Vitest, CI workflow
- server-only environment validation and structured logging contract
- initial permissions, trust, audit, MCP scope, search, and UI contracts

## In progress: Phase 5 — actual application integration

Implement email/password signup and login, verified email architecture, Argon2id password hashing, rotating server-side sessions, password reset, profile creation/editing, session management, and centralized authorization. This wave will add the `users`, `profiles`, `sessions`, `email_verifications`, and `password_resets` schema with tested security invariants.

The completed foundation is now being joined into real vertical slices. Current work has server-side
session guards, local-development signup/verification, profile basics, PostgreSQL search, follow,
Contact requests, and discovery. Posts/feed, notifications, messaging, organizations, jobs,
projects, settings/privacy UI, production email delivery, and E2E coverage remain incomplete. The
matrix in [IMPLEMENTATION_MATRIX.md](IMPLEMENTATION_MATRIX.md) is the source of truth.
