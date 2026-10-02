import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../../lib/identity';
import { ModerationError, moderatorRoles, reviewModeratorApplication } from '../../../../../lib/moderation';
import { hasSameOrigin } from '../../../../../lib/request-security';

const reviewSchema = z
  .object({
    decision: z.enum(['APPROVE', 'DECLINE', 'REVOKE']),
    role: z.enum(moderatorRoles).optional(),
    reviewNote: z.string().trim().max(1_200).optional(),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const form = await request.formData();
    const input = reviewSchema.parse({
      decision: form.get('decision'),
      role: form.get('role') || undefined,
      reviewNote: form.get('reviewNote') || undefined,
    });
    const id = z.uuid().parse((await context.params).id);
    await reviewModeratorApplication({
      actorId: actor.userId,
      applicationId: id,
      decision: input.decision,
      reviewNote: input.reviewNote || null,
      ...(input.role === undefined ? {} : { role: input.role }),
    });
    return NextResponse.redirect(new URL('/admin/moderators?updated=true', request.url), 303);
  } catch (error) {
    const code = error instanceof ModerationError ? error.code : 'MODERATOR_REVIEW_FAILED';
    return NextResponse.redirect(
      new URL(`/admin/moderators?error=${encodeURIComponent(code)}`, request.url),
      303,
    );
  }
}
