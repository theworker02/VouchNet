import { NextRequest, NextResponse } from 'next/server';
import { attachSession } from '../../../../lib/identity';
import {
  clearOAuthRegistration,
  completeOAuthRegistration,
  OAuthError,
} from '../../../../lib/oauth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  if (form.get('acceptsTerms') !== 'on' || form.get('acceptsPrivacy') !== 'on')
    return NextResponse.redirect(
      new URL('/oauth/complete?error=REQUIRED_AGREEMENTS', request.url),
      303,
    );
  try {
    const session = await completeOAuthRegistration(request);
    return clearOAuthRegistration(
      attachSession(NextResponse.redirect(new URL('/onboarding', request.url), 303), session.token),
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'OAUTH_REGISTRATION_INVALID';
    return clearOAuthRegistration(
      NextResponse.redirect(new URL(`/login?error=${code}`, request.url), 303),
    );
  }
}
