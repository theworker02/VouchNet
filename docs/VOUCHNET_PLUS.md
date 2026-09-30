# VouchNet+

VouchNet+ is modeled as an active server-side `PLUS` entitlement at **$4.55/month**. Client
components must never grant a paid capability; server-side checks use `requireVouchNetPlus`.

The foundation migration provides bounded featured proof nodes (maximum three) and a monthly
priority-outreach ledger (maximum ten). Checkout, renewals, cancellation, and webhook handling are
intentionally not exposed until a payment provider is selected. This prevents a nonfunctional
purchase button or a client-controlled subscription state.

## Implemented entitlement boundaries

- **Profile signal analytics** is available at `/in/[username]/analytics`. Free members see a
  deliberately blurred aggregate preview; `PLUS` members receive a 90-day ledger of authenticated
  profile visits. The ledger excludes anonymous visits, IP/device data, and raw search terms. A
  scheduled retention purge should be added before representing the window as a hard storage limit.
- **Featured proof-of-work nodes** are persisted with a database-enforced three-node limit. A
  server-side Plus check is required before a future editing endpoint may write them.
- **Priority outreach** has a per-member, per-month ledger capped at ten credits. It is not exposed
  until the message service exists, so there is no way to imply delivery where none is possible.

## Still intentionally unavailable

Checkout, renewals, cancellation, and webhook handling need a chosen payment provider. Advanced
mute persistence, recruiter ranking, and emerald marks likewise need their feed-policy, search,
and application surfaces before they can be presented as available paid features. VouchNet does
not render a purchase control or claim a subscriber benefit is live before its underlying server
enforcement exists.
