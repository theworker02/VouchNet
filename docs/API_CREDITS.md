# Prepaid API and MCP credits

VouchNet's public API and MCP are paid for with prepaid credits, similar to a prepaid API account.
There is no subscription and no unmetered tier: a developer adds credits first, each metered call
spends credits from that developer's balance, and calls are refused once the balance is too low.

Credits are an additional gate. They do not replace credential scopes, distributed rate limits,
audit logging, PKCE and secret verification, or human approval for protected social actions.

## Pricing

All pricing lives in one file: [`apps/web/app/lib/api-credits-config.ts`](../apps/web/app/lib/api-credits-config.ts).
The settings UI reads the same module, so the page always shows what the server enforces.

- **Rate:** 1,000 credits per US dollar (one credit is a tenth of a cent).
- **Top-ups:** one-time Stripe Checkout payments of **$5, $10, $25, or $50** (5,000, 10,000,
  25,000, or 50,000 credits). Credits do not expire.
- **Per-call costs:**

| Operation key       | Entry point                                                                 | Credits |
| ------------------- | --------------------------------------------------------------------------- | ------- |
| `oauth.token`       | `POST /api/oauth/token`, `POST /api/v1/oauth/token`                         | 1       |
| `oauth.userinfo`    | `GET /api/oauth/userinfo`                                                   | 1       |
| `v1.applicant_data` | `GET /api/v1/oauth/applicant-data`, `GET /api/v1/oauth/candidate-profile`   | 2       |
| `mcp.tool_call`     | Each MCP tool call (reserved; the MCP transport is not live yet, see below) | 1       |

To change a price, edit `apiCallCosts` or `creditTopUpPackages` in that file. Costs must be
positive integers; top-ups are integer cents.

## Who pays

The **owner of the integration client** (the member who registered it under Settings → Developer
center → Integration clients) pays. The member who authorizes a hiring site is never charged.

## Refused calls: HTTP 402

When the owner's balance cannot cover a call, the endpoint performs nothing and returns:

```http
HTTP/1.1 402 Payment Required
Cache-Control: no-store
Content-Type: application/json

{
  "error": "INSUFFICIENT_CREDITS",
  "error_description": "The developer account that owns this client has insufficient prepaid API credits. Add credits in VouchNet settings and retry.",
  "required_credits": 2,
  "balance_credits": 1,
  "top_up_url": "https://vouchnet.dev/settings/developers"
}
```

For token exchange, a 402 rolls back before the one-use authorization code is consumed, so the
client can retry the same code (within its five-minute lifetime) after topping up.

## Are failed calls charged?

**No. Only successful calls are charged.** The debit is written in the same database transaction
as the work it pays for and commits only if that work succeeds. Calls rejected for an invalid or
expired token, a missing scope, a revoked client, a bad client secret or PKCE verifier, a rate
limit, insufficient credits, or a server error cost nothing. Credential checks run before the
debit, and the token endpoint's existing distributed rate limit also bounds repeated failing
requests.

## How it is enforced

- **Ledger:** migration `0029_api_credits.sql` adds `api_credit_balances` (one integer balance per
  member, `CHECK (balance_credits >= 0)`) and `api_credit_ledger` (append-only top-ups, usage, and
  adjustments with the balance after each entry). Amounts are integers; nothing is stored as a
  float.
- **Atomic deduction:** a call spends credits with a single conditional statement
  (`UPDATE … SET balance_credits = balance_credits - cost WHERE balance_credits >= cost`) that
  also writes the usage ledger row. PostgreSQL locks the balance row and re-checks the condition
  against the latest committed value, so concurrent requests serialize and cannot overspend.
- **Top-ups:** `POST /api/billing/credits/checkout` creates a one-time Checkout Session with inline
  USD `price_data` (no Stripe Product or Price needs to exist). The browser redirect grants nothing.
  The signed `checkout.session.completed` webhook (or `checkout.session.async_payment_succeeded`
  for delayed payment methods) credits the balance only when Stripe reports `payment_status: paid`.
  Credits are computed from the integer `amount_total` Stripe charged, not from metadata. The
  ledger stores the Checkout Session id under a unique constraint, so a redelivered or duplicated
  event can never credit twice.
- **Inventory guard:** `app/lib/api-credit-entry-points.test.ts` scans every route under
  `app/api/v1`, `app/api/oauth`, `app/api/mcp`, and `app/mcp`. A new route there fails the test
  until it is credit-gated or explicitly exempted with a reason.

## Entry points that are not metered

- `GET /api/v1/status` — unauthenticated health check.
- `GET /api/v1/me` — first-party read model that only accepts a VouchNet browser session cookie.
- `GET /api/v1/resumes/download` — signed single-resume capability link; not a client credential.
- `POST /api/oauth/authorize` — the member's own consent decision in the VouchNet UI.
- `/api/desktop/*` — VouchNet's own first-party Desktop app acting for the signed-in member.

## MCP

The MCP gateway transport is not live yet (see [MCP](MCP.md)); there is no MCP route to meter
today. When it ships, each tool call must spend `mcp.tool_call` credits through `spendCredits`
inside the tool's transaction (or `chargeApiCall` for non-transactional tools) and return the same
402 body. The inventory test enforces this for routes under `app/api/mcp` and `app/mcp`.

## Balance and history

Signed-in members see their balance, 30-day usage, the most recent ledger entries, and add-credit
buttons under **Settings → Account preferences** and **Settings → Developer center**.
`GET /api/billing/credits` returns the same data for the signed-in member.

## Configuration

No new environment variables are required. Credit Checkout uses the existing
`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and the existing webhook endpoint
`https://vouchnet.dev/api/billing/webhook`, which is already subscribed to
`checkout.session.completed`. If delayed payment methods (for example, bank debits) are enabled in
Stripe Checkout, also subscribe the endpoint to `checkout.session.async_payment_succeeded`.
