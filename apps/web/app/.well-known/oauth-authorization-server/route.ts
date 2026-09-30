import { NextResponse } from 'next/server';

/** OAuth 2.0 authorization-server metadata for ATS and career-site configuration. */
export function GET(request: Request) {
  const issuer = new URL(request.url).origin;
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/api/v1/oauth/token`,
      scopes_supported: ['profile:read', 'profile:email', 'resume:read', 'skills:verify'],
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    },
    { headers: { 'cache-control': 'public, max-age=3600' } },
  );
}
