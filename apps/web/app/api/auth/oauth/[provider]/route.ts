import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '../../../../lib/app-url';
import { beginOAuth, OAuthError, oauthProviders, type OAuthProvider } from '../../../../lib/oauth';

export const runtime = 'nodejs';

function providerFrom(value: string): OAuthProvider | null {
  return oauthProviders.find((provider) => provider === value) ?? null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const provider = providerFrom((await context.params).provider);
  if (provider === null)
    return NextResponse.redirect(publicUrl('/login?error=OAUTH_UNAVAILABLE', request.url), 302);
  try {
    return beginOAuth(request, provider);
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'OAUTH_UNAVAILABLE';
    return NextResponse.redirect(publicUrl(`/login?error=${code}`, request.url), 302);
  }
}
