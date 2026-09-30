# Netlify deployment

VouchNet deploys as a Next.js application from the repository root. `netlify.toml` runs `pnpm build` and publishes the Next.js output; Netlify detects and supplies its Next.js runtime during deployment.

## Before connecting GitHub

1. Create a private GitHub repository. Do not commit either `.env` file.
2. Push this repository's default branch to GitHub.
3. In Netlify, choose **Add new project** → **Import an existing project** → GitHub, then select the repository.
4. Keep the base directory at the repository root. Netlify should use the included `netlify.toml`.

## Required Netlify environment variables

Set these in Netlify's project environment-variable UI, scoped to builds and runtime as available:

- `DATABASE_URL` — hosted PostgreSQL connection URL. The local Docker URL cannot be used by Netlify.
- `REDIS_URL` — hosted Redis URL when distributed rate limiting/ephemeral state is enabled.
- `NEXUS_ENV=production`
- `SESSION_SECRET` — a new production-only random secret, at least 32 characters.
- `RESEND_API_KEY` — server-only Resend API key.
- `EMAIL_FROM` — sender on a Resend-verified domain.
- `APP_URL` — initially the Netlify-generated `https://*.netlify.app` URL; replace after connecting a custom domain.

Never add these values to `netlify.toml`, GitHub Actions secrets visible in source, or `.env.example`.

### Secrets Controller classification

Mark `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, and `RESEND_API_KEY` as
secret values in Netlify. `EMAIL_FROM`, `APP_URL`, and `NEXUS_ENV` are ordinary
deployment configuration, so do not classify them as secret values. The build
configuration excludes only those three non-secret keys from value-based secret
scanning; credential-bearing keys remain scanned.

## Domain and email

You do not need a custom domain to deploy. Use Netlify's generated subdomain first. Resend can be configured with its testing sender only for the Resend account inbox; before sending verification email to other people, obtain a domain, verify it in Resend, configure its DNS records, and change `EMAIL_FROM`.

## First deploy check

After deploy, verify `https://YOUR-SITE.netlify.app/api/v1/status` returns `database: "ready"`. Then use the public URL as `APP_URL`, create a real account manually, and verify that the confirmation email arrives. Do not treat a successful static build as proof that production database or email credentials are configured.
