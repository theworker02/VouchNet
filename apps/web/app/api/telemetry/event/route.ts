import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { recordErrorEvent } from '../../../lib/telemetry-server';

const errorEventSchema = z.object({
  componentStack: z.string().max(8000).optional(),
  errorMessage: z.string().min(1).max(4000),
  errorName: z.string().min(1).max(160),
  route: z.string().startsWith('/').max(512),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  stackTrace: z.string().max(12000).optional(),
});

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'CSRF_REJECTED', message: 'Request origin was rejected.' } },
      { status: 403 },
    );
  }
  try {
    const actor = await actorFromRequest(request);
    const rateLimit = await enforceRateLimit(request, 'generalApi', actor?.userId ?? null);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const payload = await request.json();
    const event = errorEventSchema.parse(payload);
    await recordErrorEvent({
      componentStack: event.componentStack ?? null,
      errorMessage: event.errorMessage,
      errorName: event.errorName,
      route: event.route,
      sessionId: actor?.sessionId ?? null,
      severity: event.severity,
      stackTrace: event.stackTrace ?? null,
      userAgent: request.headers.get('user-agent'),
      userId: actor?.userId ?? null,
    });
    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'TELEMETRY_UNAVAILABLE',
          message: 'The diagnostic event could not be accepted.',
        },
      },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
