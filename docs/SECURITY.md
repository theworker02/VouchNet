# Security baseline

The web app sends a restrictive baseline CSP, denies framing, disables unneeded browser permissions, and adds content-type and referrer protections. Production deployment must terminate TLS and set secure cookies.

## Source visibility

VouchNet is open source, so its repository source must be treated as public. Obfuscation is not a
security boundary: browser-delivered JavaScript can always be inspected, and obfuscation would make
auditing and incident response harder without protecting credentials or authorization rules.

Production browser and server source maps are explicitly disabled to avoid exposing unnecessary
deployment metadata. Secrets, private configuration, database access, trust policy execution, and
authorization decisions must remain server-side and must never be committed to the repository.

All future writes are required to authenticate, authorize, validate input, rate limit, evaluate trust as applicable, and audit sensitive decisions. This baseline does not claim that later feature-specific controls are already implemented.

## Implemented partial controls

- Passwords use Argon2id and sessions are opaque, hashed server-side, expiring, and revocable.
- Protected server-rendered routes validate the session record rather than trusting cookie presence.
- Browser-authenticated profile and graph mutations require a same-origin request in addition to
  session authentication. Dedicated API and MCP clients must not use browser sessions.
- Profile reads and people search exclude blocks and apply the currently implemented public/member/
  owner visibility rules.

Rate-limit enforcement, runtime trust policy evaluation, sensitive-action audit writes, production
email delivery, and all MCP approval enforcement are **MISSING** at runtime and must be added before
production deployment.
