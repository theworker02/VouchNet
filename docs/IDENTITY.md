# Identity

Accounts are `HUMAN` identities. Passwords use Argon2id and opaque verification/reset/session tokens are hashed before persistence. Session cookies are HttpOnly and SameSite=Lax; production callers must enable Secure cookies over TLS.
