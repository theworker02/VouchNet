import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardedWrite, uuidParam } from '../../../../../lib/build-route';
import { respondToContribution } from '../../../../../lib/projects';

type Context = { params: Promise<{ projectId: string; contributorId: string }> };
const bodySchema = z.object({ action: z.enum(['ACCEPT', 'DECLINE', 'LEAVE', 'REMOVE']) }).strict();

export async function PATCH(request: NextRequest, context: Context) {
  return guardedWrite(request, 'CONTRIBUTOR_UPDATE_FAILED', async (actor) => {
    const params = await context.params;
    const result = await respondToContribution(
      actor.userId,
      uuidParam.parse(params.projectId),
      uuidParam.parse(params.contributorId),
      bodySchema.parse(await request.json()).action,
    );
    return NextResponse.json(result);
  });
}
