import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardedWrite, uuidParam } from '../../../../../lib/build-route';
import { updateProposal } from '../../../../../lib/opportunities';

type Context = { params: Promise<{ opportunityId: string; proposalId: string }> };
const bodySchema = z
  .object({ action: z.enum(['SHORTLIST', 'DECLINE', 'ACCEPT', 'WITHDRAW']) })
  .strict();

export async function PATCH(request: NextRequest, context: Context) {
  return guardedWrite(request, 'PROPOSAL_UPDATE_FAILED', async (actor) => {
    const params = await context.params;
    const result = await updateProposal(
      actor.userId,
      uuidParam.parse(params.opportunityId),
      uuidParam.parse(params.proposalId),
      bodySchema.parse(await request.json()).action,
    );
    return NextResponse.json(result);
  });
}
