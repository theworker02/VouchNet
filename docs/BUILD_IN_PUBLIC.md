# Build in Public

The Build in Public release turns VouchNet from a profile directory into a place where people show
work as it happens. It adds four connected features: **Projects**, **Vouches**, **Opportunities**,
and **Discovery**. There are no generated-content features: people are people, and bots are
applications.

Everything here ships in one self-contained migration, `packages/db/drizzle/0029_build_in_public.sql`.
It adds tables and columns only and does not edit earlier migrations.

## Projects

Projects are owned records at `/projects/[slug]` with a status (Idea, Active development, Launched,
Maintained, Archived), links, tags, an open-source flag, and a "looking for" list (designers,
testers, contributors, engineers, technical writers, a cofounder, early users, feedback,
maintainers, researchers).

- **Follow** a project to get its build-log updates in Alerts. You cannot follow your own project.
- **Contributors**: owners invite members by profile slug. The invitee accepts or declines from
  `/projects`. Accepted contributors appear under "Built by" and can post to the build log.
  Contributors can leave, and owners can remove them. Limits: 50 contributors, 20 pending
  invitations, and no re-invite within 14 days of a decline.
- **Build log**: dated entries written by the owner or contributors, at most 10 a day per person.
  Authors and owners can delete entries, and moderators can remove them. A deleted or moderated
  entry also loses its reputation points.
- Private projects never appear in public pages, discovery, or the sitemap.

API (session auth, same-origin, the `socialWrite` rate limit, and audit events):
`POST /api/projects`, `PATCH /api/projects/[projectId]`, `POST|DELETE /api/projects/[projectId]/follow`,
`POST /api/projects/[projectId]/contributors`, `PATCH /api/projects/[projectId]/contributors/[contributorId]`,
`POST /api/projects/[projectId]/logs`, `DELETE /api/projects/[projectId]/logs/[logId]`.

## Vouches

A vouch is a short statement from someone who worked with you. It has a relationship (collaborator,
client, coworker, open source, manager, other), up to six skills, optional shared context (a project
or organization you both belong to), and a visibility setting (public, members only, or only the
recipient).

### How it works on a profile

- **+ Vouch** opens the Vouch Console. The trigger morphs into a panel on desktop, a bottom sheet on
  narrow phones, and full screen at 320px. You pick a relationship, skills, and context, write the
  statement, then **Preview** the exact card the recipient will see before you confirm. Confirming
  shows a short propagation animation (skipped when reduced motion is on). The vouch appears on the
  profile right away and rolls back with an error if the server refuses it.
- The **Trust module** shows vouches grouped into skill categories as a radial chart, accolades for
  categories with several vouchers, and a small graph drawn only from real vouch edges between real
  members. **Explore vouches** opens the Inspector.
- The **Inspector** is a side panel listing each vouch with its provenance (how the two people are
  connected, which context was verified, when the author's account was created), its edit history,
  and a **Report** link into the existing moderation queue. Each vouch also has a permanent page at
  `/vouches/[vouchId]`.
- Focus is trapped inside the console and inspector, Escape closes them, and every control is
  reachable from the keyboard with visible focus.

### Verification levels

Levels describe how much context VouchNet can confirm. They are not a status or a score.

| Level                 | When it applies                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standard              | Another VouchNet member vouched.                                                                                                                                                            |
| Context Verified      | The vouch names a project or organization both people belong to.                                                                                                                            |
| Organization Verified | Verified employment at a domain-verified organization. **Not reachable yet**: no workflow can verify an organization's domain until organization DNS verification ships in a later release. |
| Contribution Verified | Both people have accepted contributions to the same VouchNet project.                                                                                                                       |

### Rules

- Only the author can edit (every edit is kept as a revision) or revoke a vouch.
- The recipient can hide a vouch from their profile, unhide it, or report it. The recipient cannot
  edit or revoke it.
- No self-vouches. One live vouch per author and recipient (duplicates return `409`).
- Rate limits: 5 vouches a day and 20 every 30 days per author.
- If two people vouch for each other within 72 hours, the pair is flagged for moderators. Only
  moderators see that flag, in the Inspector's provenance. It also halves the reputation bonus those
  vouches give.
- Vouch surfaces never show a 0–100 trust score.
- The vouch visuals use scoped `--instrument-*` design tokens that only apply inside vouch
  surfaces. The rest of the product keeps the existing design language.

API: `POST /api/vouches`, `GET /api/vouches/[vouchId]`, and
`PATCH /api/vouches/[vouchId]` with `{ "edit": {...} }` or `{ "action": "REVOKE" | "HIDE" | "UNHIDE" }`.

## Reputation

Reputation is earned mainly by participating. In plain words:

> **score = activity points × (1 + vouch bonus)**, where the vouch bonus is never more than 15%.

**Activity points** (trailing 365 days) come from posts (5), comments (2), replies (2), and
build-log entries (4). To keep it hard to game:

- **Daily caps** per action type: posts 15, comments 8, replies 8, build-log entries 12.
- **Same-day decay**: each additional same-type action on a day earns 80% of the previous one.
- **Rapid-repeat damping**: an action within 90 seconds of the previous same-type action earns a
  quarter of its value.
- **No points for your own content**: commenting on your own post or replying to your own comment
  earns nothing.
- **Revocation**: deleted or moderator-removed content loses its points (tracked in
  `activity_point_revocations`).

**Vouch bonus**: each vouch has a weight from its relationship, verification level, and the
author's own participation (a vouch from someone with no activity counts at 40%), halved for
flagged reciprocal pairs. The bonus is `0.15 × (1 − e^(−total weight / 5))`. Early vouches matter
most, and the bonus can never pass 15%. Without participation the score is 0, no matter how many
vouches someone has.

**Levels**: Newcomer (0), Contributor (25), Builder (100), Established (300), Distinguished (700).
Profiles show the score, level, next threshold, and a per-action breakdown with this explanation.
Every number lives in `apps/web/app/lib/reputation-config.ts` and is covered by tests.

## Opportunities

`/opportunities` is a directory of requests posted by members: requests for software, jobs,
contracts, open-source work, RFPs, grants, bounties, and research collaborations. Each has a summary,
description, who fits, an optional budget range, an optional deadline, location or remote, tags, and
an optional link to a project the poster owns or contributes to.

- Anyone can browse open opportunities, filtering by type, keyword, and remote. Signed-in members
  post from `/opportunities/new` and manage theirs at `/opportunities/mine`.
- Members send **one proposal** per opportunity: a message, an optional budget, a timeline, and an
  https portfolio link. Posters see each proposer's reputation level and voucher count, and can
  **shortlist**, **accept**, or **decline**. Proposers can **withdraw**. Both sides get notified.
- Lifecycle: Open → Closed (it can reopen) → Filled, or Withdrawn (final). Closing notifies live
  proposers. Moderators can remove and restore listings, and anyone can report one.
- Limits: 5 posts and 15 proposals per member per day. Deadlines cannot be in the past.

API: `POST /api/opportunities`, `PATCH /api/opportunities/[opportunityId]` (`status`, `edit`, or
moderator `moderation`), `POST /api/opportunities/[opportunityId]/proposals`, and
`PATCH /api/opportunities/[opportunityId]/proposals/[proposalId]` (`SHORTLIST`, `DECLINE`,
`ACCEPT`, `WITHDRAW`).

## Discovery

`/discover` (in the primary navigation; `/explore` redirects to it) shows what people are building.
Every card lists the recorded activity that put it there.

- **People building interesting things.** Ranked by recent building: build-log entries in the last
  30 days count most (up to 10), then active projects they maintain (up to 5) and projects they
  contribute to (up to 5). Participation reputation (on a log scale) and the number of distinct
  vouchers (capped at 10, half a point each) only break ties, so popularity cannot outrank work.
  You can filter by current intent.
- **Momentum.** Build-log entries (3), new followers (2), new contributors (4), and new
  opportunities (1) from the last 14 days. Each signal loses half its weight every 7 days.
- **Opportunities.** Open requests. Ones closing within 14 days rank first, then the newest, with
  a small lift for requests that have few proposals. Expired ones drop out.
- **New** (started in the last 30 days), **Launched** (by launch date), **Open source** (help
  wanted first), and **Research** (looking for researchers or tagged research).
- **Vouched builders.** Members vouched for in a skill, from the vouch-graph query layer
  (`apps/web/app/lib/vouch-graph.ts`), filterable by the most-vouched skills.

Nothing is promoted for payment or predicted from clicks. Private projects, hidden profiles,
suspended accounts, and anyone you have blocked never appear. The ranking policies are pure
functions in `apps/web/app/lib/discovery-ranking.ts` with tests.

### Current intent

Members can set a current intent from `/discover`: Available for work, Looking for collaborators,
Hiring, Looking for funding, or Just networking. It shows on their profile and discovery card.
`PUT /api/profile/intent` with `{ "intent": "HIRING" }`, or `null` to clear. Members can only change
their own.

## Not in this release

Communities, Events, organization DNS verification (which is what Organization Verified needs),
messaging upgrades, a command palette, and the developer platform are planned for later releases.
Build in Public adds no new public API or MCP scopes.
