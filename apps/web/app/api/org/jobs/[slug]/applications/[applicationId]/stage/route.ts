import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../../../../lib/identity';
import {
  employerApplicationStages,
  moveApplicationStage,
  NativeApplicationError,
} from '../../../../../../../lib/native-applications';
import { hasSameOrigin } from '../../../../../../../lib/request-security';
import { enforceRateLimit } from '../../../../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../../../../lib/security/rate-limit-response';

const inputSchema = z
  .object({
    note: z.string().trim().max(800).default(''),
    stage: z.enum(employerApplicationStages),
  })
  .strict();
const paramsSchema = z
  .object({
    applicationId: z.string().uuid(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(128),
  })
  .strict();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string; slug: string }> },
) {
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
    const input = inputSchema.parse(await request.json());
    await moveApplicationStage({
      applicationId: params.applicationId,
      jobSlug: params.slug,
      note: input.note,
      ownerId: actor.userId,
      stage: input.stage,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const code =
      error instanceof NativeApplicationError
        ? error.code
        : error instanceof z.ZodError
          ? 'VALIDATION_ERROR'
          : 'APPLICATION_STAGE_UPDATE_FAILED';
    const status =
      code === 'APPLICATION_NOT_FOUND'
        ? 404
        : code === 'NOT_JOB_OWNER'
          ? 403
          : code === 'INVALID_STAGE_TRANSITION' || code === 'VALIDATION_ERROR'
            ? 400
            : 503;
    return NextResponse.json({ success: false, error: { code } }, { status });
  }
}
