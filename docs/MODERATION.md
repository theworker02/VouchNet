# Volunteer moderation

VouchNet&apos;s first moderation program is a human volunteer operation. It does not claim a paid
moderation workforce, automatic enforcement, or an AI-only safety system.

## Member path

1. An authenticated member applies at `/moderation/apply` with motivation, relevant experience,
   availability, and an explicit confidentiality agreement.
2. The application enters `PENDING`; a member cannot self-assign a moderator role.
3. An active administrator reviews it in `/admin/moderators`, either declines it or assigns one
   bounded role.
4. Approved volunteers receive the `MODERATOR` account role plus an active assignment. The
   assignment can be revoked by an administrator at any time.

The first administrator is an operational bootstrap responsibility. Set the account `users.role`
to `ADMIN` only through a controlled production database procedure, after verifying the person and
their account. Do not expose a public endpoint or client-side flag for administrator assignment.

## Roles

| Role                | Current capability                   | Intended boundary                           |
| ------------------- | ------------------------------------ | ------------------------------------------- |
| `TRIAGE`            | Mark a member report as under review | No final outcome or account enforcement     |
| `CONTENT_REVIEWER`  | Record a report outcome              | Human evidence review; no hidden automation |
| `APPEALS_REVIEWER`  | Reserved assignment                  | Use only after an appeals workflow exists   |
| `COMMUNITY_STEWARD` | Record a report outcome              | Escalate safety and policy concerns         |

Administrators retain operational authority to approve/revoke assignments. All application,
assignment, report, and queue decisions create append-oriented audit events.

## Reports and queue

Authenticated members can submit a report at `/moderation/report`. A report contains only a
VouchNet-relative path, a configurable category, and concise context. It enters the private queue
at `/moderation/queue` for authorized reviewers. The initial queue deliberately does **not** copy
private messages or credentials into reports.

The queue supports `OPEN`, `UNDER_REVIEW`, `RESOLVED`, and `DISMISSED` states. A resolved queue
record means a human recorded the report outcome; it does not claim that content was removed or an
account was penalized. Content enforcement and appeals must arrive with their own authorization,
evidence retention, notice, and audit rules.

## Safety and conflicts

- Never use moderator access to inspect, share, or target people outside a report&apos;s scope.
- Recuse from reports involving friends, employers, competitors, or anyone with whom impartiality
  is not possible.
- Escalate credible threats, privacy disclosures, or illegal-content reports to an administrator.
- Treat moderation access as revocable stewardship, not status or ownership of the community.
