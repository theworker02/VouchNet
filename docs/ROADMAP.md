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

## In progress: production resilience and richer feed interactions

- Major application surfaces now provide local loading skeletons and branded recovery states instead
  of default framework errors or blank rendering: feed, jobs, messaging, settings, games, profiles,
  organizations, and developer resources.
- VouchNet’s custom logo components and responsive SVG favicon are now shared assets rather than
  repeated marks. Error views deliberately reveal no internal exception details.
- The persisted reaction model is expanding from four professional signals to include Like,
  Appreciate, Joy, and Surprised while retaining Upvote, Verify, Insightful, and Benchmark.
  A Radix popover gives people a compact, keyboard-accessible picker, and optimistic UI rolls back
  when the server rejects a write.
- Migration `0018_expanded_post_reactions` must be applied before the new reactions are enabled on
  a deployed PostgreSQL database.
- Public roles now have SEO-ready, shareable detail pages at `/jobs/[slug]`; VouchNet preserves
  the source organization as application authority and links out rather than simulating an ATS.

## In progress: VouchNet Experiences

- Migration `0025_interactive_post_experiences` adds typed interactive post payloads and a runtime
  kill state. It must be applied before interactive publishing can be used in a deployed database.
- Runtime 1.0 supports authored HTML/CSS/JavaScript and live previews only in an opaque-origin,
  no-network, no-capability iframe sandbox. It is intentionally not a general browser extension,
  form platform, storage platform, or social-action API.
- `/feed/create` provides a source composer and the first `Open to connect` template. The later
  visual builder, templates, viewer-private/shared state, controlled forms, analytics, RPC
  capabilities, and approved-domain networking remain future phases pending security review.
- Typing `vouch` outside a text field enables VouchNet Labs on that browser. Labs includes only
  local presentation experiments and an explicit-loopback local runtime benchmark; it is not an
  authorization, developer-client, or network-scanning backdoor.

## In progress: internal diagnostic telemetry

- Migration `0019_error_telemetry` adds a restricted PostgreSQL queue for redacted browser error
  diagnostics. Unhandled browser errors, promise rejections, and client component-boundary failures
  are sent to the same-origin telemetry endpoint without exposing stack traces to ordinary members.
- `/admin/errors` is available only to authenticated `ADMIN` users and supports triage status
  changes. It must not be linked in normal member navigation.

## In progress: volunteer moderation baseline

- Migration `0024_volunteer_moderation` introduces member report intake, volunteer applications,
  bounded moderator-role assignments, and an auditable human review queue.
- Members can apply at `/moderation/apply` and report a VouchNet path at `/moderation/report`.
  An active administrator assigns or revokes roles from `/admin/moderators`; members cannot grant
  themselves moderator authority.
- `TRIAGE` can route a report into review. `CONTENT_REVIEWER` and `COMMUNITY_STEWARD` can record a
  documented queue outcome. `APPEALS_REVIEWER` is reserved until the appeals workflow exists.
- This is intentionally not a claim of automatic penalties, content removal, or a paid moderation
  workforce. Those workflows need their own policy, evidence, notice, appeal, and audit designs.
  See [MODERATION.md](MODERATION.md) for the operating guide.

## In progress: native hiring workflow

- Migration `0020_native_job_applications` introduces one application per candidate/job, immutable
  application events, and candidate-owned Application Radar records. Native apply is available only
  for approved employer-submitted roles; imported source listings remain external and transparent.
- The public SDK is available at `/sdk/v1/apply.js` and launches the existing exact-redirect,
  PKCE-based OAuth consent flow. It must not be used to send browser sessions or unapproved data.
- Migration `0021_application_stage_notifications` adds candidate-visible in-app notifications for
  a posting owner’s persisted application-stage changes. `/org/jobs/[slug]/candidates` is an
  authenticated owner-only candidate pipeline; every transition is audited and recorded before a
  notification is attempted.
