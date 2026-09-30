import { registrationSchema } from '@nexus/auth';
import { NextRequest, NextResponse } from 'next/server';
import { registerHuman } from '../../../lib/identity';
import { sendVerificationEmail } from '../../../lib/email';

export async function POST(request: NextRequest) {
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
        token: created.verificationToken,
      });
    } catch (error) {
      // Local development remains testable without a provider; production never leaks a token.
      if (process.env.NEXUS_ENV === 'production') throw error;
      return NextResponse.redirect(
        new URL(`/verify?token=${encodeURIComponent(created.verificationToken)}`, request.url),
        303,
      );
    }
    return NextResponse.redirect(new URL('/verify', request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'REGISTRATION_FAILED';
    return NextResponse.json(
      {
        error:
          message === 'DATABASE_UNAVAILABLE' || message.startsWith('EMAIL_')
            ? 'SERVICE_UNAVAILABLE'
            : 'REGISTRATION_FAILED',
      },
      { status: message === 'DATABASE_UNAVAILABLE' || message.startsWith('EMAIL_') ? 503 : 400 },
    );
  }
}
