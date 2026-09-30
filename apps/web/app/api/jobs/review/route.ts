import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { JobReviewError, reviewJobResource } from '../../../lib/job-review';
import { hasSameOrigin } from '../../../lib/request-security';

const reviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  resource: z.enum(['JOB', 'SOURCE']),
  resourceId: z.uuid(),
});

/** Human-admin-only review endpoint; it is deliberately separate from employer intake. */
export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    await reviewJobResource({ actor, ...reviewSchema.parse(await request.json()) });
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof JobReviewError) {
      return NextResponse.json(
        { error: error.code },
        { status: error.code === 'NOT_AUTHORIZED' ? 403 : 404 },
      );
    }
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_REVIEW_REQUEST' : 'REVIEW_FAILED' },
      { status: 400 },
    );
  }
}
