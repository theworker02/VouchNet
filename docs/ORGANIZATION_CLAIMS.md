# Organization control and claims

VouchNet can create public organization directory records from public, source-reviewed information. A directory record is **not** an official organization page by default.

## Public designations

| Label                     | Meaning                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unclaimed**             | VouchNet has a public directory record, but no representative has verified control.                                                                                                |
| **Verified Organization** | A representative completed company-domain email verification and a VouchNet administrator approved the control request. This verifies profile control, not VouchNet's endorsement. |
| **Official Organization** | Reserved. VouchNet does not currently apply this higher-trust designation.                                                                                                         |

## Self-service claim process

1. A signed-in member opens `/company/[slug]/claim`.
2. VouchNet requires the member's **already verified primary email** to match the organization website domain. A matching display name, ordinary account, or public content edit is never enough.
3. The member selects a relationship (Founder, Executive, Employee, or Authorized Representative) and writes a short authorization statement.
4. The request enters the administrator-only `/admin/organization-claims` queue.
5. A human administrator approves or rejects it. Approval assigns the member `OWNER`, marks the profile `DOMAIN_VERIFIED`, rejects competing pending claims, and appends immutable governance and platform audit records.

The domain match is an eligibility control, not an automatic approval. Public email providers and deceptive suffixes such as `company.example.attacker.test` do not satisfy it.

## Roles

| Role   | Public profile editing | People / role control | Ownership transfer |
| ------ | ---------------------- | --------------------- | ------------------ |
| Owner  | Yes                    | Yes                   | Yes, explicit only |
| Admin  | Yes                    | No                    | No                 |
| Editor | Yes                    | No                    | No                 |
| Member | No                     | No                    | No                 |

Owners can promote a profile to Admin, Editor, or Member by VouchNet profile slug. A transfer makes the target an Owner and demotes the current owner to Admin in the same transaction. Owners cannot revoke another Owner; they must transfer ownership first. An owner or site administrator can revoke non-owner access for a compromised account, retaining the event in the append-only ledger.

## Existing owner invitation links

An existing Owner/Admin or a site administrator can create a one-time, seven-day claim invitation for a known representative. The recipient must still authenticate with the invited **company-domain, verified primary email**. Invitation links store only token hashes. The batch script is disabled by default and requires `ORGANIZATION_OUTREACH_APPROVED=true` for a specific approved recipient batch.

## Outreach is separate

`organization_outreach_candidates` is a review-only staging queue. It is not connected to email delivery and cannot send invitations by itself. Do not add or contact a recipient until an administrator explicitly approves that exact recipient and action.

## Migrations

Apply migration `0036_organization_claim_governance` before enabling the review queue or organization role management:

```bash
pnpm db:migrate
```

Use a direct database connection for schema migrations. Hosted Neon deployments should use a non-pooled connection string for this operation.
