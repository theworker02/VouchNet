# Backend

VouchNet's initial backend runs in the Next.js Node.js runtime. This shares the established authentication, authorization, validation, audit, and database boundaries with the server-rendered application without maintaining a duplicate API server.

## Versioned API boundary

- `GET /api/v1/status` is an unauthenticated readiness check. It reports only whether PostgreSQL is configured and reachable.
- `GET /api/v1/me` requires the secure `nexus_session` cookie and returns only the current human member's actor metadata, profile summary, and settings.

The existing routes under `/api/auth`, `/api/network`, `/api/posts`, `/api/profile`, and `/api/settings` are the current domain APIs. Writes validate input with Zod, authenticate a server-side session, and require same-origin browser requests. They are not a public third-party API; MCP/API credentials will receive their own scoped gateway rather than inheriting browser cookies.

## Local run

Set `DATABASE_URL`, `REDIS_URL`, `NEXUS_ENV`, and a unique `SESSION_SECRET` in a non-committed `.env`, start Docker, migrate PostgreSQL, and run `pnpm dev`. Check local readiness at `/api/v1/status`.
