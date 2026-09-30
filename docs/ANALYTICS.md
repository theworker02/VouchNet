# Analytics

VouchNet uses Cloudflare Web Analytics for privacy-oriented traffic and Core Web Vitals reporting.
It is deliberately limited to aggregate page and performance measurements: no product event
tracking, session replay, fingerprinting, or user-level behavior profiles are added by this
integration.

## Enable it

1. In Cloudflare, open **Web Analytics** and add the site `vouchnet.dev`.
2. Copy the site token Cloudflare provides.
3. Set `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` in Netlify for the production context.
4. Redeploy the site.

The token is intentionally public and used only in Cloudflare's browser beacon. If it is absent,
VouchNet does not load any analytics script.

The Next.js integration uses `spa: true` so client-side navigation is measured once per route
change. Verify collection from Cloudflare's Web Analytics dashboard after deployment; data may take
several minutes to appear.

## Privacy boundary

Analytics do not change profile visibility or disclose account data to other members. Do not add
custom user identifiers, email addresses, profile URLs containing private identifiers, or resume
data to analytics events.
