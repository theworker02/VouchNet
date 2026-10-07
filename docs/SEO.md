# Search visibility

VouchNet exposes a crawlable, canonical public surface for its landing page, public profile
addresses (`/vouch/[username]`), public projects, source-reviewed organization directory records,
the jobs directory, public developer integration documentation, desktop download/release pages,
daily challenges, terms, and privacy policy.

`/robots.txt` disallows account, authenticated-network, OAuth, API, private developer-management,
and private analytics routes. Public developer documentation remains crawlable, while client
registration and account settings remain excluded. `/sitemap.xml` is regenerated at most hourly and
includes active public profile, project, and organization pages. If PostgreSQL is temporarily
unavailable, it serves the static public pages rather than failing the sitemap request.

## Google Search Console

1. Add `https://vouchnet.dev` as a Domain or URL-prefix property.
2. Complete the DNS verification Google gives you. Alternatively, place Google's verification
   token (not the complete meta tag) in Netlify as `GOOGLE_SITE_VERIFICATION` and deploy.
3. Submit `https://vouchnet.dev/sitemap.xml` under **Sitemaps**.
4. Use URL Inspection for the landing page and a public directory/profile page after deployment.

Indexing is controlled by a page's real visibility setting. Do not submit private profiles or
authenticated application URLs to Search Console.
