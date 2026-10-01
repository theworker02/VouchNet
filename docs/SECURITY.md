# Security architecture

The web app sends a per-request nonce Content Security Policy, denies framing, disables unneeded
browser permissions, and adds content-type and referrer protections. Production deployment must
terminate TLS and provide the configured database, Redis, and secret values.

## Source visibility

VouchNet is open source, so its repository source must be treated as public. Obfuscation is not a
security boundary: browser-delivered JavaScript can always be inspected, and obfuscation would make
auditing and incident response harder without protecting credentials or authorization rules.

Production browser and server source maps are explicitly disabled to avoid exposing unnecessary
deployment metadata. Secrets, private configuration, database access, trust policy execution, and
authorization decisions must remain server-side and must never be committed to the repository.

## Vulnerability reporting

VouchNet publishes an RFC 9116 discovery file at
[`/.well-known/security.txt`](https://vouchnet.dev/.well-known/security.txt). Security researchers
should use the linked private GitHub vulnerability-reporting flow rather than a public issue. The
policy is available at [`/security`](https://vouchnet.dev/security). A public issue must never be
used to report a suspected account, authorization, credential, or data-exposure issue.

## Browser and deployment boundaries

- The page response receives a new cryptographic CSP nonce and server-generated request ID from
  Next.js Proxy. `strict-dynamic` limits executable scripts to VouchNet scripts carrying that
  nonce; Cloudflare Web Analytics is the only currently permitted third-party script/connect
  origin. HSTS, `nosniff`, anti-framing, cross-origin isolation, referrer, and permissions headers
  are applied to every response.
- API responses are marked `no-store` and `noindex` to reduce accidental browser/proxy retention
  and search indexing of authenticated or operational responses.
- Cookie-authenticated mutations compare the browser `Origin` with the canonical `APP_URL` when
  it is configured. This is important on Netlify, where an internal deployment hostname can differ
  from the public domain. A request from any other origin is rejected.
- These controls are defense in depth. They do not replace endpoint-specific authentication,
  authorization, schema validation, rate limits, trust decisions, or audit writes.

## Server boundary and rate limits

- The database package and credential-bearing server modules import `server-only`; Next.js rejects
  a client component import path that crosses into them. Browser-safe rules and DTO types are kept
  separately from database-backed services.
- High-risk authentication/OAuth operations use a Redis-backed atomic sliding window (5 per minute
  per hashed request subject). Social writes use 20 per minute. Production fails closed with a 503
  if Redis is unavailable; development permits local work without Redis. A rejected quota returns
  a JSON error envelope, HTTP 429, and `Retry-After`.
- The implementation stores only a hash of the actor-or-anonymous subject, IP address, and a
  bounded user-agent portion in the Redis key. It does not collect TLS JA3/JA4 fingerprints because
  those are not reliably exposed to a Netlify application runtime. Cloudflare is the appropriate
  boundary for that signal.
- OAuth authorization codes require a correctly-shaped S256 PKCE challenge and verifier, have a
  five-minute lifetime, are single-use under a database lock, and require exact registered redirect
  URI equality. OAuth
  client access tokens are deliberately returned only to the confidential client’s token exchange;
  they are not browser-session cookies. Human browser sessions remain opaque, server-hashed,
  host-only `HttpOnly` cookies with `SameSite=Strict`. A session has a 24-hour sliding inactivity
  deadline and a 30-day absolute lifetime; a successful password login rotates out the prior
  browser session.
- `security_audit_logs` is an append-only database table. It stores a salted HMAC of the source IP,
  bounded user agent, action, outcome, actor/session when known, and request ID. It intentionally
  never stores passwords, session values, OAuth bearer tokens, email bodies, or request payloads.

All future writes are required to authenticate, authorize, validate input, rate limit, evaluate trust as applicable, and audit sensitive decisions. This baseline does not claim that later feature-specific controls are already implemented.

## Current controls and limits

- Passwords use Argon2id and sessions are opaque, 256-bit random, hashed server-side, idle-expiring,
  revocable, and host-only.
- Protected server-rendered routes validate the session record rather than trusting cookie presence.
- Browser-authenticated profile and graph mutations require a same-origin request in addition to
  session authentication. Dedicated API and MCP clients must not use browser sessions.
- Profile reads and people search exclude blocks and apply the currently implemented public/member/
  owner visibility rules.

Redis rate limiting, runtime trust policy evaluation, and audit support are implemented for the
currently protected authentication, OAuth, developer-client, and social-write flows. The remaining
product surface must be brought through the same server-only DAL and policy gates before a general
availability launch. JA3/JA4 TLS fingerprints are intentionally not fabricated at application level:
they must be evaluated by the CDN/WAF that terminates TLS. Passkeys/WebAuthn and refresh-token
rotation are not yet implemented; VouchNet currently does not issue browser refresh tokens.
