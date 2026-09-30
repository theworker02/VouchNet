# Authentication

Authentication begins in Wave B. The foundation reserves a server-only `SESSION_SECRET`, requires it to be at least 32 characters, and establishes the rule that client claims never grant authorization.

Email/password authentication uses Argon2id, verified email, rotating HttpOnly sessions, logout invalidation, reset-token expiry, and CSRF defenses. Tokens are never stored in localStorage.

## Transactional email

Verification and password-reset delivery use Resend's server API. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` only in server environment configuration. `EMAIL_FROM` must be a Resend-verified domain in production. If Resend is not configured locally, the registration flow redirects to the local visible verification adapter; production fails closed and never exposes a verification token.

An email address with a pending verification can restart registration to receive a fresh link after a one-minute cooldown. This replaces the prior unused token and avoids trapping legitimate users after an email-provider outage, while preventing the retry path from being used to send repeated email.

Verification emails provide a six-digit code rather than a bearer link. The code is hashed at rest, expires after 24 hours, is limited to five attempts for the pending email address, and successful verification issues a new HttpOnly browser session before redirecting to onboarding. Legacy token links remain valid only until they expire.
