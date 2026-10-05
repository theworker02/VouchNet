# Google Authenticator MFA

VouchNet supports time-based one-time password (TOTP) multi-factor authentication compatible
with Google Authenticator. It is enforced after password and OAuth sign-in when enabled.

## Required configuration

Set a unique `MFA_ENCRYPTION_KEY` of 32 or more characters in every environment. It is used to
AES-256-GCM encrypt enrolled TOTP secrets at rest. Do not reuse the key across unrelated
applications. `SESSION_SECRET` is accepted only as a compatibility fallback; production should
always set a dedicated MFA key.

Apply migration `0028_totp_mfa` before exposing enrollment.

## Member flow

1. Go to **Settings → Sign-in & security**.
2. Choose **Set up Google Authenticator**.
3. Scan the locally generated QR code in Google Authenticator.
4. Confirm with the six-digit code.
5. Save the ten one-use recovery codes in a password manager.

The QR is created locally in the browser. The TOTP provisioning secret is never sent to a
third-party QR or analytics service.

## Security characteristics

- Six-digit TOTP codes use SHA-1 as required by the interoperable TOTP profile, a 30-second step,
  and a one-step clock-skew window.
- Accepted TOTP counters cannot be replayed.
- Recovery codes are random, displayed once, SHA-256 hashed in storage, and consumed on use.
- Password and OAuth sign-in create a short-lived, HttpOnly, SameSite=Strict MFA challenge before
  a browser session is issued.
- Disabling MFA requires a current authenticator or unused recovery code.
