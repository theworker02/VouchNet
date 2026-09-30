# Database

Drizzle is configured in `packages/db`. Migrations now cover the security-observability foundation, identity and social graph, interaction recommendations, high-signal content, settings/media, and the first public directory boundary.

`0005_surface_settings_media.sql` adds `user_settings` (separate JSONB documents for display preferences, privacy, and notification channels) and `media_assets` (owner, storage key, canonical URL, MIME type, bounded file size, and alternative text). Asset records do not make uploads public: storage-provider authorization and magic-byte validation must be implemented before issuing upload URLs.

Foundation audit tables intentionally use nullable foreign-key-shaped UUID fields where the referenced resource was not available at their creation. New domain tables use foreign keys where the owning resource exists; future organization, credential, and approval tables should follow the same migration-local approach.

`0007_public_directory_jobs_projects.sql` adds public-directory `organizations`, source-linked
`organization_technologies`, salary-required `jobs`, and `project_tags`. Directory organizations
are seeded as `SOURCE_REVIEWED`, not domain-verified. Each external job retains its source URL and
review timestamp; the platform must never imply a listing remains open after its source changes.

Apply migrations with `pnpm db:migrate`. Generate new migrations with `pnpm db:generate`; review generated SQL before applying it.
