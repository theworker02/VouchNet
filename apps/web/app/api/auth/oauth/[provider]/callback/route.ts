import { NextRequest, NextResponse } from 'next/server';
import { attachSession, createUserSession } from '../../../../../lib/identity';
import { publicUrl } from '../../../../../lib/app-url';
import { beginMfaLoginChallenge, getMfaStatus, mfaChallengeCookie } from '../../../../../lib/mfa';
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
    return NextResponse.redirect(publicUrl('/login?error=OAUTH_UNAVAILABLE', request.url), 302);
  try {
    const result = await resolveOAuthCallback(request, provider);
    if (result.type === 'session') {
      if ((await getMfaStatus(result.userId)).enabled) {
        const challenge = await beginMfaLoginChallenge(result.userId);
        const response = applyOAuthStateClear(
          NextResponse.redirect(
            publicUrl(
              `/login/mfa?next=${encodeURIComponent(result.returnTo ?? '/home')}`,
              request.url,
            ),
            303,
          ),
        );
        response.headers.set(
          'set-cookie',
          mfaChallengeCookie(challenge, process.env.NEXUS_ENV === 'production'),
        );
        return response;
      }
      const session = await createUserSession(result.userId);
      return applyOAuthStateClear(
        attachSession(
          NextResponse.redirect(publicUrl(result.returnTo ?? '/home', request.url), 303),
          session.token,
        ),
      );
    }
    return issueOAuthRegistration(
      applyOAuthStateClear(NextResponse.redirect(publicUrl('/oauth/complete', request.url), 303)),
      result.userId,
      result.importPreview,
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'OAUTH_EXCHANGE_FAILED';
    return applyOAuthStateClear(
      NextResponse.redirect(publicUrl(`/login?error=${code}`, request.url), 303),
    );
  }
}
