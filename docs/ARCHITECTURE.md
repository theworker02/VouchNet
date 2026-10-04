# Architecture

VouchNet is a pnpm workspace. The Next.js app is initially both the server-rendered web experience and the HTTP boundary. Domain contracts live in packages so they can be extracted into independent services without importing UI code.

## Current boundaries

`web` may orchestrate requests. `permissions` classifies actors and actions. `trust` assesses signals. `audit` defines append-only event inputs. `db` owns persistence schema and migrations. `mcp` owns credential and scope vocabulary. `search` exposes a provider interface without binding callers to PostgreSQL.

The current web product uses a canonical server-side `getCurrentActor` lookup for protected route
trees. Its initial PostgreSQL people-search adapter is intentionally behind the search package
contract so it can be replaced later. Public project and directory adapters live in
`apps/web/app/lib/projects.ts` and `apps/web/app/lib/directory.ts`. This remains a **PARTIAL**
application architecture: inline SQL adapters still need dedicated repository modules, and
organization administration, internal applications, messaging, notifications, and MCP runtime
boundaries do not exist end-to-end.

## Public directory boundary

Public profiles are readable without a session only when the profile visibility is `PUBLIC`.
Public projects additionally require an active owner and a public owner profile. Organization
records seeded from public sources are `SOURCE_REVIEWED`; they do not confer ownership, employment,
or administrative rights. Curated jobs are external-source links with a review timestamp and a
numeric salary range. No job application data is collected by VouchNet in this initial slice.

No browser assertion establishes authorization. Future write endpoints must authenticate, validate with Zod, rate-limit, evaluate trust, authorize server-side, and emit an audit event where sensitive.

## VouchNet Experiences runtime

Interactive posts are persisted as a typed `INTERACTIVE` post plus a bounded JSON Experience payload.
Their authored HTML, CSS, and JavaScript are never injected into VouchNet's DOM. The feed renders each
active Experience through an iframe with `sandbox="allow-scripts"`, which creates an opaque origin and
does not grant same-origin, form, popup, download, navigation, or parent-document access. The generated
document adds a second restrictive CSP (`default-src 'none'`, `connect-src 'none'`, no forms, workers,
media, or objects). The first runtime has no SDK/RPC bridge, external networking, persistent state, or
VouchNet capability grants. `interactive_status=DISABLED` prevents execution without deleting the post,
allowing human review to preserve context.

The `VouchNet Labs` Easter egg is a browser-local presentation preference unlocked by typing `vouch`
outside form controls. It exposes only local experimental display toggles; it never conveys identity,
authorization, moderation, billing, or developer-platform privileges.

## State and deletion

Foundation audit/trust/rate-limit records are append-oriented and are not soft-deleted. They carry minimal identifiers and metadata, never secrets or message bodies. Identity and social tables will document their own retention/deletion choices when introduced.

## Local infrastructure

Docker Compose runs PostgreSQL 17 and Redis 7. PostgreSQL is the durable system of record; Redis is reserved for distributed rate limits, ephemeral approvals, and cacheable state. Neither is exposed by the web client.
