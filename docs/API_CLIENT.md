# VouchNet API client

VouchNet publishes an installable, typed OAuth client as a public GitHub Package:

```text
@theworker02/vouchnet-api-client
```

The package is intentionally thin. It calls the same public OAuth endpoints used by direct integrations; it does **not** proxy requests, grant additional scopes, or bypass VouchNet's API-credit and rate-limit enforcement.

## Supported calls

- Build an authorization URL for the authorization-code flow with PKCE.
- Exchange a one-time authorization code from a trusted backend.
- Fetch scope-authorized profile data from `/api/oauth/userinfo`.
- Fetch the scope-minimized applicant payload from `/api/v1/oauth/applicant-data`.

Current profile data availability is documented by the runtime API responses. In particular, resume, work-history, and skill graph fields remain empty until VouchNet has a verified, consented persistence and protected-download implementation for those fields. Integrations must handle the documented `[]` and `null` values rather than infer missing data.

## Install

```ini
# .npmrc
@theworker02:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @theworker02/vouchnet-api-client
```

Use a GitHub personal access token with package-read permissions. Do not commit that token.

## Enforcement remains server-side

The VouchNet service, not the package, enforces these controls:

| Endpoint class               |                     Limit | Behavior                   |
| ---------------------------- | ------------------------: | -------------------------- |
| OAuth token exchange         |         5 requests/minute | `429` with `Retry-After`   |
| OAuth resource API           |       100 requests/minute | `429` with `Retry-After`   |
| Metered developer operations | depends on credit balance | `402 INSUFFICIENT_CREDITS` |

The client turns non-successful HTTP responses into `VouchNetApiError`, including `status`, `code`, the parsed response body, and `retryAfterSeconds` when the server supplies it. Consumers should wait until that time instead of retrying concurrently.

## Publishing

The package is built from `packages/api-client` and is configured for the `https://npm.pkg.github.com` registry. Publishing remains an explicit release operation; see the repository release workflow before publishing a version.
