import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardedWrite, uuidParam } from '../../../lib/build-route';
import { actorFromRequest } from '../../../lib/identity';
import { canReviewModeration } from '../../../lib/moderation';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';
import { vouchInputSchema } from '../../../lib/vouch-model';
import { changeWorkVouchState, editWorkVouch, getVouchDetail } from '../../../lib/work-vouches';

type Context = { params: Promise<{ vouchId: string }> };

const actionSchema = z
  .object({ action: z.enum(['REVOKE', 'HIDE', 'UNHIDE', 'MODERATE_REMOVE', 'MODERATE_RESTORE']) })
  .strict();
const editSchema = z.object({ edit: z.unknown() }).strict();

export async function GET(request: NextRequest, context: Context) {
  const actor = await actorFromRequest(request);
  const rateLimit = await enforceRateLimit(request, 'generalApi', actor?.userId ?? null);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const parsed = uuidParam.safeParse((await context.params).vouchId);
  if (!parsed.success) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const isModerator = actor === null ? false : await canReviewModeration(actor.userId);
  const vouch = await getVouchDetail(parsed.data, actor?.userId ?? null, isModerator);
  if (vouch === null) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ vouch }, { headers: { 'cache-control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest, context: Context) {
  return guardedWrite(request, 'VOUCH_UPDATE_FAILED', async (actor) => {
    const vouchId = uuidParam.parse((await context.params).vouchId);
    const body: unknown = await request.json();
    const action = actionSchema.safeParse(body);
    if (action.success) {
      const moderating = action.data.action.startsWith('MODERATE');
      await changeWorkVouchState(
        actor.userId,
        vouchId,
        action.data.action,
        moderating ? await canReviewModeration(actor.userId) : false,
      );
      return NextResponse.json({ updated: true });
    }
    const edit = vouchInputSchema.parse(editSchema.parse(body).edit);
    return NextResponse.json(await editWorkVouch(actor.userId, vouchId, edit));
  });
}
