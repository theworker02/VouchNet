import { NextRequest, NextResponse } from 'next/server';
import { ApplyOAuthError, profileForAccessToken } from '../../../lib/apply-oauth';
import { InsufficientCreditsError } from '../../../lib/api-credits-ledger';
import { insufficientCreditsResponse } from '../../../lib/api-credits-response';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, 'generalApi');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (token.length === 0) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  try {
    return NextResponse.json(await profileForAccessToken(token, 'oauth.userinfo'), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError)
      return insufficientCreditsResponse(error, request.url);
    return NextResponse.json(
      { error: error instanceof ApplyOAuthError ? 'invalid_token' : 'server_error' },
      { status: error instanceof ApplyOAuthError ? 401 : 503 },
    );
  }
}
