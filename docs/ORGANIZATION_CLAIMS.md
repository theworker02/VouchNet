# Organization control and claims

VouchNet can create public organization directory records from public, source-reviewed information. A directory record is **not** an official organization page by default.

## Public designations

| Label                     | Meaning                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unclaimed**             | VouchNet has a public directory record, but no representative has verified control.                                                                                                |
| **Verified Organization** | A representative completed company-domain email verification and a VouchNet administrator approved the control request. This verifies profile control, not VouchNet's endorsement. |
| **Official Organization** | Reserved. VouchNet does not currently apply this higher-trust designation.                                                                                                         |

## Self-service claim process

1. A visitor opens `/claim`, searches for an existing organization, and selects its contextual URL: `/claim/[slug]`.
2. They create or sign in to a VouchNet account. A matching display name, ordinary account, or public content edit is never enough.
3. A signed-in member opens `/company/[slug]/claim`. VouchNet requires their **already verified primary email** to match the organization website domain, then collects their relationship and authorization statement.
4. VouchNet creates a canonical `profile_claims` record (`PENDING` / `VERIFICATION_REQUIRED` / `VERIFIED` / `APPROVED`) alongside the reviewer-facing organization request. A successful company-domain check creates `VERIFIED`; it does **not** grant editing privileges.
5. The request enters the administrator-only `/admin/organization-claims` queue. A human administrator approves or rejects it. Approval assigns the member `OWNER`, marks the profile `DOMAIN_VERIFIED`, rejects competing pending claims, and appends immutable governance and platform audit records.

The domain match is an eligibility control, not an automatic approval. Public email providers and deceptive suffixes such as `company.example.attacker.test` do not satisfy it. DNS, website, and manual-review evidence are reserved for reviewer handling; they never grant control automatically.

Individual profile claims use the same `profile_claims` lifecycle and must remain separate from the public profile until approval. Today personal VouchNet profiles are created with their account, so account recovery is the supported self-service path; a legacy/unclaimed-person import must create an individual claim record and go through manual review rather than silently merging identities.

## Roles

| Role   | Public profile editing | People / role control | Ownership transfer |
| ------ | ---------------------- | --------------------- | ------------------ |
| Owner  | Yes                    | Yes                   | Yes, explicit only |
| Admin  | Yes                    | No                    | No                 |
| Editor | Yes                    | No                    | No                 |
| Member | No                     | No                    | No                 |

Owners can promote a profile to Admin, Editor, or Member by VouchNet profile slug. A transfer makes the target an Owner and demotes the current owner to Admin in the same transaction. Owners cannot revoke another Owner; they must transfer ownership first. An owner or site administrator can revoke non-owner access for a compromised account, retaining the event in the append-only ledger.

## Invitation expiry and removal

An existing Owner/Admin or a site administrator can create a one-time claim invitation for a known representative. The recipient must still authenticate with the invited **company-domain, verified primary email**. Invitation links store only token hashes and expire after **five business days**.

The production Netlify scheduled function `expire-unclaimed-organization-invites` runs each weekday. It only soft-removes a public directory record when all of the following are true:

- a sent invitation has expired;
- the organization remains unclaimed and has no active Owner;
- no other valid invitation remains; and
- no claim request is awaiting human review.

It never deletes member accounts, verified organizations, or uninvited directory records. The removal and expiry are immutable governance events, and the organization row remains recoverable through its `deleted_at` timestamp. A verified representative can ask VouchNet to restore the record for human review after removal.

Administrators' approval and rejection decisions send a transactional VouchNet email to every affected verified claimant. The batch script is disabled by default and requires `ORGANIZATION_OUTREACH_APPROVED=true` for a specific approved recipient batch.

## Outreach is separate

`organization_outreach_candidates` is a review-only staging queue. It is not connected to email delivery and cannot send invitations by itself. Do not add or contact a recipient until an administrator explicitly approves that exact recipient and action.

## Migrations

Apply migrations through `0038_expiring_unclaimed_organization_invites` before enabling the review queue, role management, and scheduled expiry:

```bash
pnpm db:migrate
```

Use a direct database connection for schema migrations. Hosted Neon deployments should use a non-pooled connection string for this operation.
