import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import {
  NativeApplicationError,
  submitNativeApplication,
} from '../../../../lib/native-applications';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

const applicationSchema = z.object({ coverNote: z.string().trim().max(4000).default('') }).strict();
const paramsSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(128),
});

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ success: false, error: { code: 'CSRF_REJECTED' } }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null)
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED' } },
        { status: 401 },
      );
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const params = paramsSchema.parse(await context.params);
    const application = await submitNativeApplication({
      candidateId: actor.userId,
      coverNote: applicationSchema.parse(await request.json()).coverNote,
      jobSlug: params.slug,
    });
    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch (error) {
    const code =
      error instanceof NativeApplicationError
        ? error.code
        : error instanceof z.ZodError
          ? 'VALIDATION_ERROR'
          : 'APPLICATION_UNAVAILABLE';
    return NextResponse.json(
      { success: false, error: { code } },
      { status: code === 'ALREADY_APPLIED' ? 409 : code === 'JOB_NOT_AVAILABLE' ? 404 : 400 },
    );
  }
}
