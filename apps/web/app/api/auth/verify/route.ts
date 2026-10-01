import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  attachSession,
  createUserSession,
  verifyEmail,
  verifyEmailCode,
} from '../../../lib/identity';
import { publicUrl } from '../../../lib/app-url';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { strictFormDataRecord } from '../../../lib/validation/strict-form-data';

const verificationInputSchema = z.union([
  z.object({ token: z.string().min(20).max(512) }).strict(),
  z.object({ email: z.string().email().max(254), code: z.string().regex(/^\d{6}$/) }).strict(),
]);

function failureResponse(request: NextRequest, error: 'expired' | 'invalid'): NextResponse {
  if (request.headers.get('accept')?.includes('application/json'))
    return NextResponse.json(
      { error: error === 'expired' ? 'EXPIRED_TOKEN' : 'INVALID_CODE' },
      { status: 400 },
    );
  return NextResponse.redirect(publicUrl(`/verify?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return failureResponse(request, 'invalid');
  const rateLimit = await enforceRateLimit(request, 'auth');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const contentType = request.headers.get('content-type') ?? '';
  let input: z.infer<typeof verificationInputSchema> | null;
  if (contentType.includes('application/json')) {
    input = verificationInputSchema.safeParse(await request.json().catch(() => null)).data ?? null;
  } else {
    const form = await request.formData();
    input =
      verificationInputSchema.safeParse(strictFormDataRecord(form, ['code', 'email', 'token']))
        .data ?? null;
  }
  if (input === null) return failureResponse(request, 'invalid');
  try {
    const verified =
      'token' in input
        ? await verifyEmail(input.token)
        : 'email' in input
          ? await verifyEmailCode(input.email, input.code)
          : null;
    if (verified === null)
      return failureResponse(request, 'token' in input ? 'expired' : 'invalid');
    const session = await createUserSession(verified.userId);
    if (contentType.includes('application/json'))
      return attachSession(NextResponse.json({ verified: true }), session.token);
    return attachSession(
      NextResponse.redirect(publicUrl('/onboarding', request.url), 303),
      session.token,
    );
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
