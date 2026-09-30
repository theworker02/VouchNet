import { NextRequest, NextResponse } from 'next/server';
import {
  attachSession,
  createUserSession,
  verifyEmail,
  verifyEmailCode,
} from '../../../lib/identity';

type VerificationInput = {
  code?: string | undefined;
  email?: string | undefined;
  token?: string | undefined;
};

function failureResponse(request: NextRequest, error: 'expired' | 'invalid'): NextResponse {
  if (request.headers.get('accept')?.includes('application/json'))
    return NextResponse.json(
      { error: error === 'expired' ? 'EXPIRED_TOKEN' : 'INVALID_CODE' },
      { status: 400 },
    );
  return NextResponse.redirect(new URL(`/verify?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  let input: VerificationInput | null;
  if (contentType.includes('application/json')) {
    input = (await request.json().catch(() => null)) as VerificationInput | null;
  } else {
    const form = await request.formData();
    input = {
      code: typeof form.get('code') === 'string' ? String(form.get('code')) : undefined,
      email: typeof form.get('email') === 'string' ? String(form.get('email')) : undefined,
      token: typeof form.get('token') === 'string' ? String(form.get('token')) : undefined,
    };
  }
  if (input === null) return failureResponse(request, 'invalid');
  try {
    const verified =
      typeof input.token === 'string' && input.token.length > 0
        ? await verifyEmail(input.token)
        : typeof input.email === 'string' && typeof input.code === 'string'
          ? await verifyEmailCode(input.email, input.code)
          : null;
    if (verified === null)
      return failureResponse(request, input.token === undefined ? 'invalid' : 'expired');
    const session = await createUserSession(verified.userId);
    if (contentType.includes('application/json'))
      return attachSession(NextResponse.json({ verified: true }), session.token);
    return attachSession(
      NextResponse.redirect(new URL('/onboarding', request.url), 303),
      session.token,
    );
  } catch {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
}
