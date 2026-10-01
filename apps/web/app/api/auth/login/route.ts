import { NextRequest, NextResponse } from 'next/server';
import { attachSession, login, logout } from '../../../lib/identity';
import { logger } from '@nexus/observability';
import { publicUrl } from '../../../lib/app-url';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { recordSecurityAuditEvent } from '../../../lib/security/audit';

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
  if (!hasSameOrigin(request)) return failureResponse(request, 'INVALID_CREDENTIALS');
  const rateLimit = await enforceRateLimit(request, 'auth');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const form = await request.formData();
  const requestedNext = String(form.get('next') ?? '');
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/home';
  try {
    const result = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
    if (result === null) {
      await recordSecurityAuditEvent({
        request,
        action: 'FAILED_LOGIN_ATTEMPT',
        status: 'FAILURE',
      });
      return failureResponse(request, 'INVALID_CREDENTIALS');
    }
    // A successful password login replaces any prior cookie-backed session to limit session fixation.
    await logout(request);
    await recordSecurityAuditEvent({
      request,
      action: 'LOGIN_SUCCEEDED',
      status: 'SUCCESS',
      actorId: result.userId,
    });
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
