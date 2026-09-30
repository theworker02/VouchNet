# Architecture

VouchNet is a pnpm workspace. The Next.js app is initially both the server-rendered web experience and the HTTP boundary. Domain contracts live in packages so they can be extracted into independent services without importing UI code.

## Current boundaries

`web` may orchestrate requests. `permissions` classifies actors and actions. `trust` assesses signals. `audit` defines append-only event inputs. `db` owns persistence schema and migrations. `mcp` owns credential and scope vocabulary. `search` exposes a provider interface without binding callers to PostgreSQL.

The current web product uses a canonical server-side `getCurrentActor` lookup for protected route
trees. Its initial PostgreSQL people-search adapter is intentionally behind the search package
contract so it can be replaced later. This is a **PARTIAL** application architecture: inline SQL
adapters still need dedicated repository modules, and the organization, post, feed, messaging, job,
notification, and MCP runtime boundaries do not exist end-to-end.

No browser assertion establishes authorization. Future write endpoints must authenticate, validate with Zod, rate-limit, evaluate trust, authorize server-side, and emit an audit event where sensitive.

## State and deletion

Foundation audit/trust/rate-limit records are append-oriented and are not soft-deleted. They carry minimal identifiers and metadata, never secrets or message bodies. Identity and social tables will document their own retention/deletion choices when introduced.

## Local infrastructure

Docker Compose runs PostgreSQL 17 and Redis 7. PostgreSQL is the durable system of record; Redis is reserved for distributed rate limits, ephemeral approvals, and cacheable state. Neither is exposed by the web client.
