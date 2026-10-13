# Backend

VouchNet's initial backend runs in the Next.js Node.js runtime. This shares the established authentication, authorization, validation, audit, and database boundaries with the server-rendered application without maintaining a duplicate API server.

## Versioned API boundary

- `GET /api/v1/status` is an unauthenticated readiness check. It reports only whether PostgreSQL is configured and reachable.
- `GET /api/v1/me` requires the secure `nexus_session` cookie and returns only the current human member's actor metadata, profile summary, and settings.

The existing routes under `/api/auth`, `/api/network`, `/api/posts`, `/api/profile`, and `/api/settings` are the current domain APIs. Writes validate input with Zod, authenticate a server-side session, and require same-origin browser requests. They are not a public third-party API; MCP/API credentials will receive their own scoped gateway rather than inheriting browser cookies.

## Internal social API

These routes are for VouchNet's own authenticated clients. They use the secure server-managed
session, enforce per-member rate limits, and must not be called cross-origin.

- `GET /api/posts?mode=CHRONOLOGICAL|PEER_VERIFIED&hide=TECHNICAL` returns the caller's visible
  post feed. Repeat `hide` to suppress additional feed categories.
- `POST /api/posts` creates a post. It validates text, code snippets, media URLs, visibility,
  mentions, and Interactive Experience payloads before persistence.
- `GET /api/posts/:postId/comments` returns comments visible to the authenticated caller.
- `POST /api/posts/:postId/comments` creates a top-level comment or reply with
  `{ "bodyMarkdown": "…", "parentCommentId": "optional UUID" }`.

The Signal Desk may continue to use `GET /api/feed` when it also needs its discovery payload.
Neither endpoint grants external applications access to browser-session data.

## Local run

Set `DATABASE_URL`, `REDIS_URL`, `NEXUS_ENV`, and a unique `SESSION_SECRET` in a non-committed `.env`, start Docker, migrate PostgreSQL, and run `pnpm dev`. Check local readiness at `/api/v1/status`.
