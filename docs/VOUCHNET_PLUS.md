# VouchNet+

> **Status: coming soon.** VouchNet+ is in active development and is not represented as a
> generally available subscription product. The implementation below documents the current
> server-side foundation and the boundaries required before a public launch.

VouchNet+ is modeled as an active server-side `PLUS` entitlement at **$4.55/month**. Client
components must never grant a paid capability; server-side checks use `requireVouchNetPlus`.

The foundation migration provides bounded featured proof nodes (maximum three) and a monthly
priority-outreach ledger (maximum ten). Stripe Checkout, the Stripe Billing Portal, and signed
webhooks are the only ways a browser may initiate or manage a purchase. A webhook writes the
server-side entitlement; a checkout success redirect never grants it.

## Implemented entitlement boundaries

- **Profile signal analytics** is available at `/in/[username]/analytics`. Free members see a
  deliberately blurred aggregate preview; `PLUS` members receive a 90-day ledger of authenticated
  profile visits. The ledger excludes anonymous visits, IP/device data, and raw search terms. A
  scheduled retention purge should be added before representing the window as a hard storage limit.
- **Featured proof-of-work nodes** are persisted with a database-enforced three-node limit. The
  Projects workspace exposes the pin action and its API requires a server-side Plus check.
- **Priority outreach** has a per-member, per-month ledger capped at ten credits. It is not exposed
  until the message service exists, so there is no way to imply delivery where none is possible.

## Stripe setup

Create one recurring USD Stripe Price for **$4.55/month**, then set its ID as
`STRIPE_PLUS_PRICE_ID`. Register `https://vouchnet.dev/api/billing/webhook` as a Stripe webhook
endpoint and subscribe it to `checkout.session.completed`, `customer.subscription.created`,
`customer.subscription.updated`, and `customer.subscription.deleted`; set the signing secret as
`STRIPE_WEBHOOK_SECRET`. Stripe's Customer Portal must be enabled in Stripe before the manage
membership button can create a portal session.

## API and MCP access: prepaid credits

API and MCP access is not part of VouchNet+ and is not sold as a subscription. Developers buy
prepaid credits with one-time Stripe Checkout payments, and each successful metered call spends
credits. See [Prepaid API and MCP credits](API_CREDITS.md). Credit top-ups use the same signed
webhook endpoint; `checkout.session.completed` (already subscribed) confirms payment.

### Retired: Developer Access subscription

Developer Access was a $10/month subscription (`STRIPE_DEVELOPER_ACCESS_PRICE_ID`) intended to
grant unmetered API and MCP use under fair use. It has been retired: it no longer gates or grants
anything, the settings page no longer offers it, and `POST /api/billing/developer-checkout` returns
`410 DEVELOPER_ACCESS_RETIRED`. The webhook still records `vouchnet_developer_access` subscription
events so a legacy subscriber's status stays accurate and Settings can link them to the Billing
Portal to cancel. Archive the Developer Access Price in Stripe so no new subscriptions can be
created from it.

When Stripe sends a cancellation update, VouchNet revokes the entitlement immediately—even if
Stripe's subscription is configured to end at the current billing period. Every protected request
checks the server-side entitlement record, so a stale browser or cached page cannot keep a canceled
member's paid tools enabled.

## Still intentionally unavailable

Priority outreach is not exposed until messaging has a real persistence, delivery, abuse-control,
and quota-consumption implementation. Advanced feed controls currently support bounded literal
keywords and phrases; arbitrary regular expressions are deliberately not executed without an RE2-
style engine, because untrusted regex can become a denial-of-service vector. Emerald marks and a
1.5x ordering preference are enforced through the feed and people-search queries.
