import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { chargeApiCall } from './api-credits';
import { InsufficientCreditsError } from './api-credits-ledger';
import { insufficientCreditsResponse } from './api-credits-response';
import {
  ApplyOAuthError,
  resolveAccessToken,
  type AccessTokenActor,
  type ApplyScope,
} from './apply-oauth';
import { enforceRateLimit } from './security/rate-limit';
import { rateLimitHeaders, rateLimitResponse } from './security/rate-limit-response';

function bearerToken(request: NextRequest): string {
  const header = request.headers.get('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : '';
}

/**
 * Shared gate for third-party OAuth resource APIs: rate limit → bearer auth → scope check →
 * execute work → charge credits only on success.
 */
export async function withOAuthApi<T>(
  request: NextRequest,
  requiredScope: ApplyScope,
  work: (actor: AccessTokenActor) => Promise<T>,
): Promise<NextResponse> {
  const rateLimit = await enforceRateLimit(request, 'oauthApi');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit, 'oauthApi');
  const token = bearerToken(request);
  if (token.length === 0) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  try {
    const actor = await resolveAccessToken(token, requiredScope);
    const payload = await work(actor);
    await chargeApiCall({
      userId: actor.ownerId,
      operation: 'v1.directory_read',
      developerClientId: actor.developerClientId,
    });
    return NextResponse.json(payload, {
      headers: { 'cache-control': 'no-store', ...rateLimitHeaders('oauthApi') },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError)
      return insufficientCreditsResponse(error, request.url);
    if (error instanceof ApplyOAuthError)
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    if (error instanceof Error && error.message === 'NOT_FOUND')
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ error: 'server_error' }, { status: 503 });
  }
}
