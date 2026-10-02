import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { ModerationError, reportCategories, submitModerationReport } from '../../../lib/moderation';
import { hasSameOrigin } from '../../../lib/request-security';

const reportSchema = z
  .object({
    subjectPath: z
      .string()
      .trim()
      .regex(/^\/(?!\/)[^\s\\]*$/, 'Use a local VouchNet path beginning with /.')
      .max(500),
    category: z.enum(reportCategories),
    details: z.string().trim().min(20).max(2_000),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const input = reportSchema.parse(await request.json());
    await submitModerationReport({ reporterId: actor.userId, ...input });
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const code =
      error instanceof ModerationError
        ? error.code
        : error instanceof z.ZodError
          ? 'INVALID_REPORT'
          : 'REPORT_UNAVAILABLE';
    return NextResponse.json({ error: code }, { status: code === 'NOT_AUTHORIZED' ? 403 : 400 });
  }
}
