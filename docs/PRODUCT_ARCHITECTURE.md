# Product architecture

VouchNet uses a pnpm workspace with a Next.js application as its initial HTTP and UI boundary. Domain
packages (`auth`, `permissions`, `social`, `profiles`, `recommendations`, `search`, `trust`, and
`audit`) are designed to be extracted from the application without moving authorization decisions
into client components.

The current product path is:

`browser → Next route/server component → server session lookup → domain/database adapter → PostgreSQL`

The application is deliberately not a collection of client-side mock objects. The implemented
identity, profile, search, follow, and Contact paths query PostgreSQL on each product operation.
Redis, S3-compatible media, realtime delivery, workers, external email delivery, and MCP transport
are architectural boundaries only at this point; they are not active product dependencies.

## Current actor boundary

Browser sessions resolve only to a human user and a server-side session record. Protected app pages
call the canonical `getCurrentActor` server query, which validates token hash, expiry, and
revocation. Social mutation routes resolve the actor from that session and reject cross-origin
cookie-authenticated mutation requests.

This browser boundary must never be reused for MCP, API clients, workers, or organization
automation. Those actors require independently scoped credentials, audit attribution, and the
approval protocol described in [MCP.md](MCP.md).
