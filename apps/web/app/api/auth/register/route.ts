import { registrationSchema } from '@nexus/auth';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { IdentityError, registerHuman } from '../../../lib/identity';
import { sendVerificationEmail } from '../../../lib/email';
import { logger } from '@nexus/observability';
import { publicUrl } from '../../../lib/app-url';

export const runtime = 'nodejs';

type RegistrationError =
  'ACCOUNT_EXISTS' | 'INVALID_INPUT' | 'VERIFICATION_RECENTLY_SENT' | 'SERVICE_UNAVAILABLE';

function failureResponse(request: NextRequest, error: RegistrationError): NextResponse {
  const status = error === 'SERVICE_UNAVAILABLE' ? 503 : 400;
  if (request.headers.get('accept')?.includes('application/json'))
    return NextResponse.json({ error }, { status });
  return NextResponse.redirect(publicUrl(`/signup?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const form = await request.formData();
    const input = registrationSchema.parse({
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      email: form.get('email'),
      password: form.get('password'),
      acceptsTerms: form.get('acceptsTerms') === 'on',
      acceptsPrivacy: form.get('acceptsPrivacy') === 'on',
    });
    const created = await registerHuman(input);
    try {
      await sendVerificationEmail({
        email: input.email,
        firstName: input.firstName,
        code: created.verificationCode,
      });
    } catch (error) {
      // Local development remains testable without a provider; production never leaks a token.
      if (process.env.NEXUS_ENV === 'production') throw error;
      return NextResponse.redirect(
        new URL(
          `/verify?code=${encodeURIComponent(created.verificationCode)}&email=${encodeURIComponent(input.email)}`,
          request.url,
        ),
        303,
      );
    }
    return NextResponse.redirect(publicUrl('/verify', request.url), 303);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.error({
        operation: 'auth.register',
        outcome: 'failure',
        errorCode: 'INVALID_INPUT',
        requestId,
      });
      return failureResponse(request, 'INVALID_INPUT');
    }
    if (error instanceof IdentityError) {
      if (error.code === 'ACCOUNT_ALREADY_ACTIVE')
        return failureResponse(request, 'ACCOUNT_EXISTS');
      if (error.code === 'VERIFICATION_RECENTLY_SENT')
        return failureResponse(request, 'VERIFICATION_RECENTLY_SENT');
    }
    // Do not expose database or provider details to the browser. Unknown failures are operational
    // until proved otherwise and should direct the person to retry, not blame their input.
    logger.error({
      operation: 'auth.register',
      outcome: 'failure',
      errorCode: 'REGISTRATION_FAILED',
      requestId,
    });
    return failureResponse(request, 'SERVICE_UNAVAILABLE');
  }
}
