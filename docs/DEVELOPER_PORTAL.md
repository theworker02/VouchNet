# Developer portal

The low-profile Developer Center is available at `/settings/developers` for signed-in members and
at `/developers` for documentation links. It does not appear in the primary network navigation.

Individual resources:

- `/developers/integrations` — provider sign-in and future integration boundaries
- `/developers/mcp` — MCP policy and gateway status
- `/developers/servers` — public locations and server integration boundary
- `/developers/brand` — downloadable official brand assets
- `/api/developer/discovery` — machine-readable locations and availability status

Apply with VouchNet is available to signed-in members under Settings → Developer center →
Integration clients. It is an authorization-code flow with PKCE, exact redirect URI checks,
short-lived one-use codes, server-side secret verification, narrowly scoped profile data, audit
events, and immediate client/token revocation. It is not an unrestricted API key or a way to reuse
a member browser session.

The discovery endpoint intentionally reports MCP client registration as unavailable. It must be
updated only when MCP credential issuance, scope enforcement, audit events, revocation, and human
approval flows are truly live.
