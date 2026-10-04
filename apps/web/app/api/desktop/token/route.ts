import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  exchangeDesktopAuthorizationCode,
  rotateDesktopRefreshToken,
} from '../../../lib/desktop-auth';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

const codeSchema = z
  .object({
    grantType: z.literal('authorization_code'),
    code: z.string().min(32).max(512),
    codeVerifier: z.string().min(43).max(128),
  })
  .strict();
const refreshSchema = z
  .object({ grantType: z.literal('refresh_token'), refreshToken: z.string().min(32).max(512) })
  .strict();

export async function POST(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, 'auth');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    const value: unknown = await request.json();
    const codeResult = codeSchema.safeParse(value);
    const refreshResult = refreshSchema.safeParse(value);
    const tokens = codeResult.success
      ? await exchangeDesktopAuthorizationCode(codeResult.data)
      : refreshResult.success
        ? await rotateDesktopRefreshToken(refreshResult.data.refreshToken)
        : null;
    if (tokens === null) return NextResponse.json({ error: 'INVALID_GRANT' }, { status: 400 });
    return NextResponse.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch {
    return NextResponse.json({ error: 'INVALID_GRANT' }, { status: 400 });
  }
}
