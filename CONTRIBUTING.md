# Contributing to VouchNet

Thanks for helping improve VouchNet. The platform is built around credible professional context,
human participation, and respectful handling of personal data.

## Report a bug

Use the [bug-report form](../../issues/new?template=bug_report.yml) for reproducible product,
accessibility, documentation, and development problems. Include clear steps, expected behavior, and
safe/redacted supporting details. Do not include passwords, API keys, session cookies, résumés,
private messages, or other personal data.

## Request a feature

Use the [feature-request form](../../issues/new?template=feature_request.yml). Start with the user
problem and intended outcome. New features must preserve server-side authorization, privacy, and
the distinction between human participation and machine assistance.

## Security and privacy issues

Do not open a public issue for a potential vulnerability. Use a
[private GitHub security advisory](../../security/advisories/new) instead. See
[SECURITY.md](SECURITY.md) for reporting expectations.

## Development checks

Before opening a pull request, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

Keep changes focused, add regression coverage when practical, and document any changed behavior.
Never commit a real `.env` file or credentials.
