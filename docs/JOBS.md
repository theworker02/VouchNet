# Job sourcing and employer launch

VouchNet's jobs directory is designed to be useful before it has a large employer-sales team,
without representing copied, stale, or unverified listings as native postings.

## Two supported sourcing paths

### Employer-submitted roles

An authenticated person can open `/jobs/post` and submit a single role with its employer site,
original application URL, work arrangement, description, skills, and an optional compensation
range. The role is stored as `PENDING_REVIEW`; it is not visible in the public directory until a
human VouchNet administrator confirms it.

Each employer account receives a **free two-calendar-month launch window** when it first submits a
role or connects a source. No payment method is collected and there is no automatic charge. When
that window expires, new submissions are paused until an explicit paid plan exists; existing
approved listings remain governed by their normal source/review status.

### Provider-board imports

Employers can also propose a public Greenhouse Job Board or Lever Postings board from `/jobs/post`.
The recorded board token is constrained to a safe identifier and the importer constructs only the
provider's documented HTTPS endpoint. VouchNet does not crawl career pages, execute employer
scripts, or accept an arbitrary URL to fetch.

The supported public provider interfaces are:

- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)
- [Lever Postings API](https://github.com/lever/postings-api/blob/master/README.md)

Provider imports preserve an external job identifier and original source URL. They may omit
compensation if the upstream source does; the directory labels that honestly and ranks disclosed
salary ranges ahead of undisclosed listings.

## Review and publication pipeline

```text
Employer submits role or public board
          │
          ▼
PENDING_REVIEW (not public, no scheduled import)
          │
          ▼
Human VouchNet administrator verifies ownership and content
          │
          ├─ role approved → SOURCE_REVIEWED → public directory
          └─ source approved → ACTIVE → scheduled provider sync → SOURCE_LIVE → public directory
```

The operator-only endpoint is `POST /api/jobs/review`. It requires an active, server-authenticated
user with `users.role = 'ADMIN'`, same-origin CSRF checks, and an immutable audit event. No client
flag can activate a source or publish a pending role.

## Scheduled sync

`POST /api/jobs/sources/sync` imports from approved active sources. It is intentionally not a
public endpoint: configure a trusted scheduler to send the server-only header
`x-vouchnet-job-sync-secret`, matching the 32+ character `JOB_SYNC_SECRET` environment variable.
The endpoint returns no cacheable data and stores only provider errors necessary to investigate a
failed sync.

For Netlify, add `JOB_SYNC_SECRET` in the site's environment variables and have a scheduled
function or external scheduler call the endpoint. The route is safe to call repeatedly: imported
jobs are upserted by provider/external job ID and source URL.

## Operational launch checklist

1. Apply migration `0012_job_sourcing_and_employer_launch.sql` using `pnpm db:migrate`.
2. Add `JOB_SYNC_SECRET` to the hosting environment; never expose it to a browser or commit it.
3. Assign the small trusted operations group `users.role = 'ADMIN'` using a controlled database
   administration procedure.
4. Review every employer role and board for authority, accurate attribution, and policy compliance.
5. Configure a scheduler for `POST /api/jobs/sources/sync` and inspect failed source syncs.
6. Recheck external listings for expiry or removal as part of normal operations.

This first release has no billing processor. The free window is enforcement against new postings,
not an implied promise of a future price or a recurring subscription.
