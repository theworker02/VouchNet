# VouchNet Studio

VouchNet Studio is a native service workflow at `/studio`. Members submit a detailed web or
product brief at `/studio/request`, then track their private requests at `/studio/projects`.

## Payment model

Foundation, Product, and Platform engagements collect a deposit through a server-created Stripe
Checkout session. The browser never supplies a price or payment state. Custom work is saved as
`QUOTE_PENDING`; an administrator enters a written description and deposit amount, then the
member may accept the server-stored quote.

The Stripe webhook must receive `checkout.session.completed` and
`checkout.session.async_payment_succeeded`. It verifies Stripe's signature, deduplicates the
event ID, marks a matching Studio request paid, and creates retryable administrator/customer email
deliveries. Do not treat the return URL as payment confirmation.

## Apple Pay

Studio uses Stripe-hosted Checkout, so Apple Pay is selected by Stripe only for eligible customers
and browsers. Netlify invokes the idempotent registration script during production builds whenever
`STRIPE_SECRET_KEY` and `APP_URL` are configured; it verifies that Stripe reports Apple Pay as
active. Local and preview builds without those values skip the action safely. Do not put Stripe
secrets in browser code or Git. Stripe requires an active payment method domain before Apple Pay
appears in Elements or Embedded Checkout; see Stripe's
[payment-method domain reference](https://docs.stripe.com/api/payment_method_domains/create).

## Required production configuration

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_STUDIO_FOUNDATION_DEPOSIT_PRICE_ID`
- `STRIPE_STUDIO_PRODUCT_DEPOSIT_PRICE_ID`
- `STRIPE_STUDIO_PLATFORM_DEPOSIT_PRICE_ID`
- `STUDIO_ADMIN_EMAIL`
- An existing transactional email configuration: `RESEND_API_KEY` + `EMAIL_FROM`, or Gmail SMTP.

Register the existing `/api/billing/webhook` endpoint in Stripe and subscribe it to the two Checkout
events above. Run migration `0039_vouchnet_studio.sql` before enabling the links. Test with Stripe
test-mode cards, a signed webhook delivery, and a non-production sender before accepting live work.

## Files and access

The service accepts only PDF, DOCX, PNG, and JPEG files; each is signature-checked, size-limited,
and stored as a private PostgreSQL bytea record. The customer-facing download endpoint requires
the request owner's session. Production operators should review database storage capacity before
accepting unusually attachment-heavy projects.

## Operational note

The generated project summary PDF and email delivery path are implemented, but no live Stripe
payment or email delivery is considered verified until the configured production webhook and sender
have been exercised.
