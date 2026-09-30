# Development

Use Node 24 and pnpm 11. Install dependencies with `pnpm install`. Copy `.env.example` to `.env`; never commit `.env`.

Start local infrastructure with `docker compose up -d`, run `pnpm db:migrate`, then start the app using `pnpm dev`. The migration runner reads the Drizzle journal and applies each checked-in SQL migration transactionally; it is intentionally independent of Drizzle Kit's opaque migration executor. Run the full local quality gate before proposing changes: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`.

For the default compose configuration, `DATABASE_URL` is `postgresql://nexus:nexus@localhost:5433/nexus`; port 5433 avoids conflicts with an existing local PostgreSQL service. Do not alter migrations in an already shared database; use a new migration instead.

Do not use production secrets locally. Review database migrations and dependency changes before merging.
