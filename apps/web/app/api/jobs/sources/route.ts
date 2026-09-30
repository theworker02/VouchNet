import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { jobSourceProviders, JobSourcingError, registerJobSource } from '../../../lib/jobs';
import { hasSameOrigin } from '../../../lib/request-security';

const sourceSchema = z.object({
  boardToken: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,100}$/),
  organizationName: z.string().trim().min(2).max(160),
  organizationWebsite: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === 'https:', 'An HTTPS URL is required.'),
  provider: z.enum(jobSourceProviders),
});

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const source = await registerJobSource(actor.userId, sourceSchema.parse(await request.json()));
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof JobSourcingError)
      return NextResponse.json({ error: error.code }, { status: 409 });
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_JOB_SOURCE' : 'JOB_SOURCE_CREATE_FAILED' },
      { status: 400 },
    );
  }
}
