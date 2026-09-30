import { NextRequest, NextResponse } from 'next/server';
import { attachSession, login } from '../../../lib/identity';
import { logger } from '@nexus/observability';
import { publicUrl } from '../../../lib/app-url';

export const runtime = 'nodejs';

function failureResponse(
  request: NextRequest,
  error: 'INVALID_CREDENTIALS' | 'SERVICE_UNAVAILABLE',
) {
  if (request.headers.get('accept')?.includes('application/json'))
    return NextResponse.json({ error }, { status: error === 'SERVICE_UNAVAILABLE' ? 503 : 401 });
  return NextResponse.redirect(publicUrl(`/login?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const requestedNext = String(form.get('next') ?? '');
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/home';
  try {
    const result = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
    if (result === null) return failureResponse(request, 'INVALID_CREDENTIALS');
    return attachSession(NextResponse.redirect(publicUrl(next, request.url), 303), result.token);
  } catch {
    logger.error({
      operation: 'auth.login',
      outcome: 'failure',
      errorCode: 'LOGIN_SERVICE_UNAVAILABLE',
      requestId: request.headers.get('x-request-id') ?? crypto.randomUUID(),
    });
    return failureResponse(request, 'SERVICE_UNAVAILABLE');
  }
}
