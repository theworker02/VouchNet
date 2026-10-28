# VouchNet API client

`@theworker02/vouchnet-api-client` is the typed JavaScript client for the public VouchNet OAuth 2.0 and directory API. It supports the authorization-code flow with PKCE, token exchange, OpenID-style user information, applicant data, and `directory:read` lookups for people, organizations, and jobs.

It is a client, not a bypass: VouchNet continues to enforce exact redirect-URI matching, PKCE, OAuth scopes, prepaid API credits, and server-side rate limits. A `429` is represented by `VouchNetApiError` and includes the server's retry interval.

## Install from GitHub Packages

Create a project-local `.npmrc`:

```ini
@theworker02:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Use a GitHub token that can read packages, then install:

```bash
npm install @theworker02/vouchnet-api-client
```

## Authorization-code flow

Create a VouchNet developer client in the Developer Portal and register the **exact** redirect URI before using it.

```ts
import { createPkcePair, createVouchNetClient } from '@theworker02/vouchnet-api-client';

const client = createVouchNetClient();
const pkce = await createPkcePair();

const authorizeUrl = client.createAuthorizationUrl({
  clientId: process.env.VOUCHNET_CLIENT_ID!,
  redirectUri: 'https://careers.example.com/oauth/vouchnet/callback',
  state: crypto.randomUUID(),
  codeChallenge: pkce.codeChallenge,
  scopes: ['profile:read', 'profile:email'],
});

// Redirect the member to authorizeUrl. Keep pkce.codeVerifier and state in the user's server-side
// session. After the callback, exchange the one-use code only from a trusted server.
const token = await client.exchangeAuthorizationCode({
  clientId: process.env.VOUCHNET_CLIENT_ID!,
  clientSecret: process.env.VOUCHNET_CLIENT_SECRET!,
  code: new URL(callbackUrl).searchParams.get('code')!,
  redirectUri: 'https://careers.example.com/oauth/vouchnet/callback',
  codeVerifier: pkce.codeVerifier,
});

const profile = await client.getUserInfo(token.accessToken);
```

Never put a VouchNet client secret in browser code, a mobile binary, a public repository, or an issue. Use a backend-for-frontend to perform the token exchange.

## Directory API (`directory:read`)

```ts
const person = await client.getPerson(token.accessToken, 'ada');
const organization = await client.getOrganization(token.accessToken, 'vouchnet-labs');
const { jobs } = await client.listJobs(token.accessToken, { query: 'typescript', limit: 20 });
```

Request the `directory:read` scope when creating the authorization URL and when registering the integration client.

## Rate limits and billing

- OAuth token requests: **5 requests/minute** per request fingerprint.
- OAuth and directory resource reads: **60 requests/minute** (`oauthApi` tier) with `X-RateLimit-Limit` / `X-RateLimit-Policy`.
- Every successful client request is additionally subject to the developer account's API-credit balance.

On `429`, read `error.retryAfterSeconds` and wait before retrying. Do not implement parallel retry loops. On `402`, ask the developer account owner to add API credits in VouchNet.

See [docs/API.md](../../docs/API.md) and the Developer Center at [vouchnet.dev/developers](https://vouchnet.dev/developers).
