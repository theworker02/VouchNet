import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite, uuidParam } from '../../../../../lib/build-route';
import { canReviewModeration } from '../../../../../lib/moderation';
import { removeBuildLog } from '../../../../../lib/projects';

type Context = { params: Promise<{ projectId: string; logId: string }> };

export async function DELETE(request: NextRequest, context: Context) {
  return guardedWrite(request, 'BUILD_LOG_DELETE_FAILED', async (actor) => {
    const params = await context.params;
    await removeBuildLog(
      actor.userId,
      uuidParam.parse(params.projectId),
      uuidParam.parse(params.logId),
      await canReviewModeration(actor.userId),
    );
    return NextResponse.json({ removed: true });
  });
}
