# Identity

Accounts are `HUMAN` identities. Passwords use Argon2id and opaque verification/reset/session tokens are hashed before persistence. Session cookies are HttpOnly and SameSite=Lax; production callers must enable Secure cookies over TLS.

## Identity verification

Members may optionally verify their identity from Settings → Account → "Verify my identity". The check runs on the verification provider's hosted page; VouchNet's own verification layer (`apps/web/app/lib/identity-verification.ts`) sits in front of a swappable provider adapter — Stripe Identity today, so a future provider (e.g. Veriff) only requires adding an adapter to the `providers` registry selected by `IDENTITY_VERIFICATION_PROVIDER`.

Verification outcomes arrive only through the provider's signed webhook at `/api/identity-verification/webhook`, verified against `STRIPE_IDENTITY_WEBHOOK_SECRET`, and are normalized onto an `identity_verifications` row (`0030_identity_verification.sql`). VouchNet stores the provider name, its opaque session id, the status, the check method, and the verification date — never ID images, document numbers, or biometric data. No provider ids live on the `users` table.

A verified member can display an "Identity Verified" badge on their profile (`badge_visible`, toggled from Settings). Hovering or tapping the badge shows a card with what was checked and the verification date — never ID details. Badge and vouch-level logic reads `publicVerificationBadge`, which only answers whether someone is verified, the method, and the date; the provider is never surfaced. The desktop app receives the same payload through `/api/desktop/me`.

## Organization profile claims

Public directory organizations start unowned. Ownership is granted through an emailed claim
invite (`organization_claim_invites`, migration 0031):

- `POST /api/organizations/:slug/claim-invites` — OWNER/ADMIN member or site admin sends an
  invite to an email; a fresh invite revokes prior pending ones for that email and org. The
  email (`sendOrganizationClaimEmail` in `lib/email.ts`) links to `/claim/<token>` and expires
  in 7 days.
- `/claim/<token>` — shows the invited org and email; the invitee signs in and claims.
- `POST /api/organizations/claim` — atomically marks the invite CLAIMED only when the
  invitee's verified primary email matches the invite email (a forwarded token never grants
  ownership), then upserts an `organization_members` row with role `OWNER`.

Claiming makes someone the org's owner but does not change `verification_status`; the
`DOMAIN_VERIFIED` path is a separate check shown on `/company/[slug]` as "Verified
organization".
