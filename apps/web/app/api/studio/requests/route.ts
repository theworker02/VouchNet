import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { createStudioRequest } from '../../../lib/studio';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json(
      {
        success: false,
        error: { code: 'CSRF_REJECTED', message: 'This request must come from VouchNet.' },
      },
      { status: 403 },
    );
  const actor = await actorFromRequest(request);
  if (actor === null)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sign in to create a Studio request.' },
      },
      { status: 401 },
    );
  const limited = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!limited.allowed)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Please wait before submitting another request.' },
      },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    );
  const formData = await request.formData().catch(() => null);
  if (formData === null)
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_FORM', message: 'The submitted form could not be read.' },
      },
      { status: 400 },
    );
  const result = await createStudioRequest(actor.userId, formData);
  if (!result.ok)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.error,
          message:
            'Please complete all required technical project details and use approved file formats.',
          details: 'details' in result ? result.details : undefined,
        },
      },
      { status: 400 },
    );
  return NextResponse.json({ success: true, ...result }, { status: 201 });
}
