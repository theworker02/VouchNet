# OAuth configuration

## Apply with VouchNet

VouchNet is also an authorization server for the narrowly scoped “Apply with VouchNet” flow.
Register a confidential hiring-site client at **Settings → Developer center → Integration clients**.
Client secrets are shown once and retained only as HMAC hashes. Use the following endpoints:

- Authorize: `GET /oauth/authorize` with `response_type=code`, `client_id`, an exact
  `redirect_uri`, `scope`, `state`, `code_challenge`, and `code_challenge_method=S256`.
- Token: `POST /api/oauth/token` with HTTP Basic client authentication (or form credentials),
  `grant_type=authorization_code`, `code`, exact `redirect_uri`, and `code_verifier`.
- User info: `GET /api/oauth/userinfo` with `Authorization: Bearer <access token>`.
- Candidate profile: `GET /api/v1/oauth/candidate-profile` with `Authorization: Bearer <access token>`.

Supported scopes are `profile:read` (profile URL, name, and headline) and `profile:email`
(verified email). Each member sees and approves the exact requested access before VouchNet sends a
short-lived authorization code. Access tokens expire after one hour; revoking the integration
invalidates all of its tokens. Resumes, private messages, passwords, browser sessions, and social
actions are never shared through this flow.

VouchNet uses server-side OAuth authorization-code flows with state validation and PKCE. Provider
secrets stay only in the deployment environment; do not expose them in browser code, GitHub,
screenshots, or support requests. Access tokens are used only to read the provider identity during
the callback and are never stored.

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

| Provider | Callback URL                                            |
| -------- | ------------------------------------------------------- |
| Google   | `https://vouchnet.dev/api/auth/oauth/google/callback`   |
| GitHub   | `https://vouchnet.dev/api/auth/oauth/github/callback`   |
| LinkedIn | `https://vouchnet.dev/api/auth/oauth/linkedin/callback` |

Request only identity scopes: Google `openid email profile`, GitHub `read:user user:email`, and
LinkedIn `openid profile email`. VouchNet will not request repository, posting, or connection
permissions for sign-in.

## First-time profile import

After a first-time provider sign-in, VouchNet asks the member to explicitly approve any available
profile enrichment before activation. With the scopes above, GitHub may offer a member's public bio
and public location. Google and LinkedIn OpenID Connect establish a verified name and email for the
initial account but do not provide a general-purpose import of experience, connections, posts,
résumés, or private profile data. VouchNet does not scrape any provider or claim to transfer data a
provider has not returned to the member-authorized OAuth flow.

## First sign-in behavior

Provider sign-in establishes identity but does not silently accept VouchNet terms. A first-time
member is sent to `/oauth/complete`, where they must explicitly accept the Terms of Service and
Privacy Policy before VouchNet activates the account and creates a session. Existing linked
members go directly to their home surface.

VouchNet requires a verified email address from the provider. It does not automatically attach a
provider identity to an existing email/password account; that account-linking workflow requires a
separate, re-authenticated security flow.

## Netlify

In **Site configuration → Environment variables**, add the same values for the production context.
Do not include them in a `NEXT_PUBLIC_` variable. Redeploy after adding or rotating a value.

## Apply with VouchNet

The issuer and signing key prepare the future VouchNet OAuth/OIDC server. External application
sites must be registered individually with exact redirect URIs and requested scopes. A member will
review and approve every profile, project, and resume disclosure; a third party never receives
profile data merely because it displays a button.

## Embeddable button

Load the dependency-free SDK from the VouchNet origin, then register an exact callback URL in the
Developer Center before embedding it. The SDK generates a PKCE verifier and challenge in the
visitor’s browser; your callback must retain the verifier and perform the token exchange server-side.

```html
<script async src="https://vouchnet.dev/sdk/v1/apply.js"></script>
<vouch-apply-button
  client-id="vn_example"
  redirect-uri="https://careers.example.com/auth/vouchnet/callback"
  scope="profile:read profile:email"
  theme="dark"
  size="medium"
>
</vouch-apply-button>
```

The button dispatches `vouch-apply-open` with its generated state when it starts a consent flow.
It does not expose authorization codes or access tokens to browser JavaScript.
