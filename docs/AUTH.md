# Authentication

Authentication begins in Wave B. The foundation reserves a server-only `SESSION_SECRET`, requires it to be at least 32 characters, and establishes the rule that client claims never grant authorization.

Email/password authentication uses Argon2id, verified email, rotating HttpOnly sessions, logout invalidation, reset-token expiry, and CSRF defenses. Tokens are never stored in localStorage.

## Transactional email

Verification and password-reset delivery use Resend's server API. Set `RESEND_API_KEY`, `EMAIL_FROM`, and `APP_URL` only in server environment configuration. `EMAIL_FROM` must be a Resend-verified domain in production. If Resend is not configured locally, the registration flow redirects to the local visible verification adapter; production fails closed and never exposes a verification token.
