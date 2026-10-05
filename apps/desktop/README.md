# VouchNet Desktop

VouchNet Desktop is a first-class Windows client for the same VouchNet network at
`https://vouchnet.dev`. It is not an embedded browser shortcut and does not create a
second account system.

## Account connection

Desktop uses a system-browser Authorization Code with PKCE flow:

1. The app creates a local PKCE verifier and state value.
2. The user confirms the already-signed-in VouchNet account in their browser.
3. VouchNet redirects a one-time authorization code to `vouchnet://auth/callback`.
4. Desktop exchanges that code and stores only its rotated device refresh credential in
   Windows Credential Manager.

Desktop never receives, copies, or stores the browser session cookie. A returning user who is
already signed in at vouchnet.dev normally confirms the device with one click. Refresh-token
replay revokes the complete device token family server-side.

## Native capabilities

- Secure session restore using the existing VouchNet account
- Chronological feed from `/api/desktop/feed`
- Synced conversations, read markers, delivery/seen indicators, and HTTPS link attachments
- System-browser navigation for richer web workflows that do not yet have a dedicated native surface
- Deep links via `vouchnet://`

## Development

Apply database migrations through `0027_desktop_authorization` before testing account connection
against a fresh database.

```powershell
pnpm --filter @vouchnet/desktop dev
pnpm --filter @vouchnet/desktop build
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Set `VOUCHNET_URL` for the Tauri process when using a non-production web environment. Do not put
credentials in application configuration.

## Security boundaries

- Refresh credentials use the OS keychain; access tokens are memory-only.
- Browser authentication has PKCE, random state, short-lived one-time codes, and rotated refresh tokens.
- Desktop API routes use a device Bearer token; they do not accept a browser cookie as a substitute.
- Interactive web content is never granted Tauri commands, filesystem access, shell access, or credential access.
