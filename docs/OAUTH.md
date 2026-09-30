# OAuth configuration

VouchNet will use server-side OAuth authorization-code flows with state validation and PKCE. The
provider secrets stay only in the deployment environment; do not expose them in browser code,
GitHub, screenshots, or support requests.

## Local environment

Add the following values to the ignored `.env` file. The names are also present as placeholders in
`.env.example`.

```dotenv
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
LINKEDIN_OAUTH_CLIENT_ID=
LINKEDIN_OAUTH_CLIENT_SECRET=
VOUCHNET_OAUTH_ISSUER=https://vouchnet.dev
VOUCHNET_OAUTH_SIGNING_KEY=
```

Generate `VOUCHNET_OAUTH_SIGNING_KEY` independently from `SESSION_SECRET`; it must be a unique
32+-character production secret.

## Provider registration

Register the following exact production callback addresses. Add the equivalent localhost callbacks
only to the provider app used for local development.

| Provider | Callback URL |
| --- | --- |
| Google | `https://vouchnet.dev/api/auth/oauth/google/callback` |
| GitHub | `https://vouchnet.dev/api/auth/oauth/github/callback` |
| LinkedIn | `https://vouchnet.dev/api/auth/oauth/linkedin/callback` |

Request only identity scopes: Google `openid email profile`, GitHub `read:user user:email`, and
LinkedIn `openid profile email`. VouchNet will not request repository, posting, or connection
permissions for sign-in.

## Netlify

In **Site configuration → Environment variables**, add the same values for the production context.
Do not include them in a `NEXT_PUBLIC_` variable. Redeploy after adding or rotating a value.

## Apply with VouchNet

The issuer and signing key prepare the future VouchNet OAuth/OIDC server. External application
sites must be registered individually with exact redirect URIs and requested scopes. A member will
review and approve every profile, project, and resume disclosure; a third party never receives
profile data merely because it displays a button.
