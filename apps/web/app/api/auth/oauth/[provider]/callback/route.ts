import { NextRequest, NextResponse } from 'next/server';
import { attachSession, createUserSession } from '../../../../../lib/identity';
import {
  applyOAuthStateClear,
  issueOAuthRegistration,
  OAuthError,
  oauthProviders,
  resolveOAuthCallback,
  type OAuthProvider,
} from '../../../../../lib/oauth';

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
    return NextResponse.redirect(new URL('/login?error=OAUTH_UNAVAILABLE', request.url), 302);
  try {
    const result = await resolveOAuthCallback(request, provider);
    if (result.type === 'session') {
      const session = await createUserSession(result.userId);
      return applyOAuthStateClear(
        attachSession(
          NextResponse.redirect(new URL(result.returnTo ?? '/home', request.url), 303),
          session.token,
        ),
      );
    }
    return issueOAuthRegistration(
      applyOAuthStateClear(NextResponse.redirect(new URL('/oauth/complete', request.url), 303)),
      result.userId,
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'OAUTH_EXCHANGE_FAILED';
    return applyOAuthStateClear(
      NextResponse.redirect(new URL(`/login?error=${code}`, request.url), 303),
    );
  }
}
