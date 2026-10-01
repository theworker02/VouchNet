import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { issueAuthorizationCode, resolveAuthorization } from '../../../lib/apply-oauth';
import { publicUrl } from '../../../lib/app-url';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { strictFormDataRecord } from '../../../lib/validation/strict-form-data';
import { z } from 'zod';

export const runtime = 'nodejs';

const authorizationDecisionSchema = z
  .object({
    client_id: z.string().trim().min(3).max(256),
    redirect_uri: z.string().trim().min(1).max(2048),
    scope: z.string().trim().max(512).optional(),
    state: z.string().max(512).optional(),
    code_challenge: z.string().min(43).max(128),
    code_challenge_method: z.literal('S256'),
    approved: z.enum(['yes', 'no']),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.redirect(publicUrl('/login', request.url), 303);
  try {
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const form = authorizationDecisionSchema.parse(
      strictFormDataRecord(await request.formData(), [
        'client_id',
        'redirect_uri',
        'scope',
        'state',
        'code_challenge',
        'code_challenge_method',
        'approved',
      ]),
    );
    const authorization = await resolveAuthorization({
      clientId: form.client_id,
      redirectUri: form.redirect_uri,
      scope: form.scope ?? null,
      state: form.state ?? null,
      codeChallenge: form.code_challenge,
      codeChallengeMethod: form.code_challenge_method,
    });
    if (form.approved !== 'yes') {
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
      publicUrl('/developers/integrations?error=authorization_failed', request.url),
      303,
    );
  }
}
