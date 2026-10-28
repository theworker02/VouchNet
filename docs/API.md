# VouchNet public API

VouchNet exposes a LinkedIn-comparable developer API for authorized integration clients: OAuth 2.0
member consent, prepaid credits, and Redis-backed rate limits. It is **not** an open scrape surface
and it does not clone LinkedIn’s brand, endpoints, or partner program.

## GitHub Packages client

Install the typed client from GitHub Packages:

```text
@theworker02/vouchnet-api-client
```

See [API_CLIENT.md](API_CLIENT.md) for `.npmrc`, PKCE, and error handling. Publishing uses the
`Publish VouchNet API Client` workflow on tags `api-client-v*`.

## Side-by-side with LinkedIn’s API model

| Capability                             | LinkedIn (typical partner/API)    | VouchNet                                              |
| -------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| Authorization                          | OAuth 2.0 + product scopes        | OAuth 2.0 + PKCE, exact redirect URIs                 |
| Member profile of the authorizing user | `/v2/userinfo`, profile products  | `GET /api/oauth/userinfo` (`profile:read`)            |
| Applicant / hiring payload             | Partner Apply / profile products  | `GET /api/v1/oauth/applicant-data`                    |
| People directory lookup                | Profile API (restricted)          | `GET /api/v1/people/{slug}` (`directory:read`)        |
| Organization pages                     | Organization APIs                 | `GET /api/v1/organizations/{slug}` (`directory:read`) |
| Jobs                                   | Job Posting / search partner APIs | `GET /api/v1/jobs` (`directory:read`)                 |
| Abuse controls                         | App + member rate limits          | `oauthApi` 60/min + prepaid credits + 402             |
| Installable SDK                        | Official SDKs                     | `@theworker02/vouchnet-api-client` on GitHub Packages |

Deliberate non-goals vs LinkedIn: no unrestricted connection graph export, no message spam APIs,
no reaction inflation, no scrape-friendly unauthenticated bulk dump.

## Scopes

| Scope            | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `profile:read`   | Name, headline, profile URL of the authorizing member |
| `profile:email`  | Verified email of the authorizing member              |
| `resume:read`    | Résumé when a protected download path exists          |
| `skills:verify`  | Verified skills when available                        |
| `directory:read` | Public people, companies, and jobs directory          |

Members approve scopes at `/oauth/authorize`. Clients register allowed scopes under
Settings → Developer center → Integration clients.

## Rate limits

| Tier       | Limit              | Applies to                                    |
| ---------- | ------------------ | --------------------------------------------- |
| `auth`     | 5 requests/minute  | Token exchange                                |
| `oauthApi` | 60 requests/minute | userinfo, applicant data, directory endpoints |

Responses include `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Policy`. Exceeded quotas
return HTTP `429`. Production fails closed with `503` if Redis is unavailable.

## Credits

Every successful third-party call spends the **client owner’s** prepaid credits. See
[API_CREDITS.md](API_CREDITS.md). Directory reads cost `v1.directory_read` (1 credit). Not-found
and auth failures are not charged.

## Machine-readable discovery

`GET /api/developer/discovery` lists authorize/token/userinfo URLs, directory endpoints, package
coordinates, and MCP status.
