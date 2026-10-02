import { NextRequest, NextResponse } from 'next/server';
import { attachSession, login, sessionCookieName } from '../../../lib/identity';
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

async function recordLoginAudit(
  input: Parameters<typeof recordSecurityAuditEvent>[0],
  requestId: string,
): Promise<void> {
  try {
    await recordSecurityAuditEvent(input);
  } catch {
    // Security telemetry is important, but its own transient database failure cannot invalidate
    // a completed password authentication. The failure remains visible in structured logs.
    logger.error({
      operation: 'auth.login_audit',
      outcome: 'failure',
      errorCode: 'SECURITY_AUDIT_UNAVAILABLE',
      requestId,
    });
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return failureResponse(request, 'INVALID_CREDENTIALS');
  const rateLimit = await enforceRateLimit(request, 'auth');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const form = await request.formData();
  const requestedNext = String(form.get('next') ?? '');
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/home';
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const result = await login(
      String(form.get('email') ?? ''),
      String(form.get('password') ?? ''),
      request.cookies.get(sessionCookieName)?.value,
    );
    if (result === null) {
      await recordLoginAudit(
        { request, action: 'FAILED_LOGIN_ATTEMPT', status: 'FAILURE' },
        requestId,
      );
      return failureResponse(request, 'INVALID_CREDENTIALS');
    }
    await recordLoginAudit(
      { request, action: 'LOGIN_SUCCEEDED', status: 'SUCCESS', actorId: result.userId },
      requestId,
    );
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
