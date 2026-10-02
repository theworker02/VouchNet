import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import { ModerationError, reportStatuses, updateModerationReport } from '../../../../lib/moderation';
import { hasSameOrigin } from '../../../../lib/request-security';

const updateSchema = z
  .object({ status: z.enum(reportStatuses), note: z.string().trim().max(1_200).optional() })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const id = z.uuid().parse((await context.params).id);
    const input = updateSchema.parse(await request.json());
    await updateModerationReport({ actorId: actor.userId, reportId: id, ...input, note: input.note || null });
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const code =
      error instanceof ModerationError
        ? error.code
        : error instanceof z.ZodError
          ? 'INVALID_REPORT_UPDATE'
          : 'REPORT_UPDATE_UNAVAILABLE';
    return NextResponse.json(
      { error: code },
      { status: code === 'NOT_AUTHORIZED' ? 403 : code === 'REPORT_NOT_FOUND' ? 404 : 400 },
    );
  }
}
