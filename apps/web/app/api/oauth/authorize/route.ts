import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { issueAuthorizationCode, resolveAuthorization } from '../../../lib/apply-oauth';
import { hasSameOrigin } from '../../../lib/request-security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.redirect(new URL('/login', request.url), 303);
  try {
    const form = await request.formData();
    const authorization = await resolveAuthorization({
      clientId: String(form.get('client_id') ?? ''),
      redirectUri: String(form.get('redirect_uri') ?? ''),
      scope: typeof form.get('scope') === 'string' ? String(form.get('scope')) : null,
      state: typeof form.get('state') === 'string' ? String(form.get('state')) : null,
      codeChallenge:
        typeof form.get('code_challenge') === 'string' ? String(form.get('code_challenge')) : null,
      codeChallengeMethod:
        typeof form.get('code_challenge_method') === 'string'
          ? String(form.get('code_challenge_method'))
          : null,
    });
    if (form.get('approved') !== 'yes') {
      const callback = new URL(authorization.redirectUri);
      callback.searchParams.set('error', 'access_denied');
      if (authorization.state !== null) callback.searchParams.set('state', authorization.state);
      return NextResponse.redirect(callback, 303);
    }
    const code = await issueAuthorizationCode({
      userId: actor.userId,
      clientId: authorization.client.clientId,
      redirectUri: authorization.redirectUri,
      scopes: authorization.scopes,
      codeChallenge: authorization.codeChallenge,
    });
    const callback = new URL(authorization.redirectUri);
    callback.searchParams.set('code', code);
    if (authorization.state !== null) callback.searchParams.set('state', authorization.state);
    return NextResponse.redirect(callback, 303);
  } catch {
    return NextResponse.redirect(
      new URL('/developers/integrations?error=authorization_failed', request.url),
      303,
    );
  }
}
