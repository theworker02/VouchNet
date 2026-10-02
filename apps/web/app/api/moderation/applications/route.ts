import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { ModerationError, submitModeratorApplication } from '../../../lib/moderation';
import { hasSameOrigin } from '../../../lib/request-security';

const applicationSchema = z
  .object({
    motivation: z.string().trim().min(40).max(2_000),
    relevantExperience: z.string().trim().max(2_000).optional(),
    weeklyAvailability: z.string().trim().min(3).max(280),
    agreesToCode: z.literal(true),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const input = applicationSchema.parse(await request.json());
    await submitModeratorApplication({
      userId: actor.userId,
      motivation: input.motivation,
      relevantExperience: input.relevantExperience || null,
      weeklyAvailability: input.weeklyAvailability,
    });
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const code =
      error instanceof ModerationError
        ? error.code
        : error instanceof z.ZodError
          ? 'INVALID_APPLICATION'
          : 'APPLICATION_UNAVAILABLE';
    return NextResponse.json(
      { error: code },
      { status: code === 'APPLICATION_ALREADY_OPEN' ? 409 : code === 'NOT_AUTHORIZED' ? 403 : 400 },
    );
  }
}
