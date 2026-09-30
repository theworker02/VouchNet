import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest, getProfileSummary, updateOwnProfile } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';

const profileUpdateSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(220)
    .transform((value) => value || null),
  location: z
    .string()
    .trim()
    .max(160)
    .transform((value) => value || null),
  about: z
    .string()
    .trim()
    .max(3_000)
    .transform((value) => value || null),
  onboardingStep: z.number().int().min(0).max(10),
});

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const profile = await getProfileSummary(actor.userId);
  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const input = profileUpdateSchema.parse(await request.json());
    await updateOwnProfile(actor.userId, input);
    return NextResponse.json({ profile: await getProfileSummary(actor.userId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_PROFILE' : 'PROFILE_UPDATE_FAILED' },
      { status: 400 },
    );
  }
}
