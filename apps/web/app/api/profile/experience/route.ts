import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { createExperience, listExperiences } from '../../../lib/profile-services';
import { experienceSchema } from '../../../lib/experience-schema';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    return NextResponse.json({ experiences: await listExperiences(actor.userId) });
  } catch {
    return NextResponse.json({ error: 'DATABASE_UNAVAILABLE' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  try {
    const input = experienceSchema.parse(await request.json());
    const experience = await createExperience(actor.userId, {
      ...input,
      endYear: input.isCurrent ? null : input.endYear,
      endMonth: input.isCurrent ? null : input.endMonth,
    });
    return NextResponse.json({ experience }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_EXPERIENCE' : 'EXPERIENCE_FAILED' },
      { status: 400 },
    );
  }
}
