import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

const inputSchema = z
  .object({ token: z.string().min(20).max(512), password: z.string().min(12).max(256) })
  .strict();
export async function POST(request: NextRequest) {
  try {
    if (!hasSameOrigin(request))
      return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
    const rateLimit = await enforceRateLimit(request, 'auth');
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const input = inputSchema.parse(await request.json());
    return (await resetPassword(input.token, input.password))
      ? NextResponse.json({ reset: true })
      : NextResponse.json({ error: 'INVALID_OR_EXPIRED_TOKEN' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
  }
}
