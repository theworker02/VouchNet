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
Contact requests, discovery, public projects, a source-reviewed organization directory,
source-linked salary-transparent jobs, and embeddable SVG badges. Posts/feed, notifications,
messaging, organization administration, internal job applications, settings/privacy UI, production
email delivery, and E2E coverage remain incomplete. The matrix in
[IMPLEMENTATION_MATRIX.md](IMPLEMENTATION_MATRIX.md) is the source of truth.

## In progress: transparent employer intake and provider sourcing

- Authenticated employers can submit a role or register a Greenhouse/Lever public board at
  `/jobs/post`.
- The first role or source starts a two-calendar-month no-card launch window; VouchNet does not
  charge automatically.
- Listings and sources remain pending until an active human administrator approves them.
- Approved Greenhouse and Lever sources can be refreshed by a signed server-only scheduler route.
- The initial provider adapters preserve the external source URL and never scrape consumer career
  pages. See [JOBS.md](JOBS.md) for the operating model and release limits.

## Completed: daily strategy foundation

- `/games` now provides **Signal Circuit**, an original daily grid strategy puzzle derived from the
  UTC date. Difficulty, board size, and move budget scale over time without copying a third-party
  game template.
- A completion is accepted only after the server independently replays the member's submitted move
  history against that day’s target; future and historical completions are rejected.
- The application materializes one in-app daily-game notification for each signed-in member and
  displays it in `/notifications`. This is in-app delivery—not an email or push-notification
  scheduler.
- Migration `0017_daily_strategy_games` adds completion and notification persistence. It must be
  applied before this surface is enabled in a deployed environment.
