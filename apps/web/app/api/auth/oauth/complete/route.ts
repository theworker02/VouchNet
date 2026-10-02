import { NextRequest, NextResponse } from 'next/server';
import { publicUrl } from '../../../../lib/app-url';
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
      publicUrl('/oauth/complete?error=REQUIRED_AGREEMENTS', request.url),
      303,
    );
  try {
    const session = await completeOAuthRegistration(request, form.get('importProfile') === 'on');
    return clearOAuthRegistration(
      attachSession(
        NextResponse.redirect(publicUrl('/onboarding', request.url), 303),
        session.token,
      ),
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : 'OAUTH_REGISTRATION_INVALID';
    return clearOAuthRegistration(
      NextResponse.redirect(publicUrl(`/login?error=${code}`, request.url), 303),
    );
  }
}
