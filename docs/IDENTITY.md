# Identity

Accounts are `HUMAN` identities. Passwords use Argon2id and opaque verification/reset/session tokens are hashed before persistence. Session cookies are HttpOnly and SameSite=Lax; production callers must enable Secure cookies over TLS.

## Identity verification

Members may optionally verify their identity from Settings → Account → "Verify my identity". The check runs on the verification provider's hosted page; VouchNet's own verification layer (`apps/web/app/lib/identity-verification.ts`) sits in front of a swappable provider adapter — Stripe Identity today, so a future provider (e.g. Veriff) only requires adding an adapter to the `providers` registry selected by `IDENTITY_VERIFICATION_PROVIDER`.

Verification outcomes arrive only through the provider's signed webhook at `/api/identity-verification/webhook`, verified against `STRIPE_IDENTITY_WEBHOOK_SECRET`, and are normalized onto an `identity_verifications` row (`0030_identity_verification.sql`). VouchNet stores the provider name, its opaque session id, the status, the check method, and the verification date — never ID images, document numbers, or biometric data. No provider ids live on the `users` table.

A verified member can display an "Identity Verified" badge on their profile (`badge_visible`, toggled from Settings). Hovering or tapping the badge shows a card with what was checked and the verification date — never ID details. Badge and vouch-level logic reads `publicVerificationBadge`, which only answers whether someone is verified, the method, and the date; the provider is never surfaced. The desktop app receives the same payload through `/api/desktop/me`.
