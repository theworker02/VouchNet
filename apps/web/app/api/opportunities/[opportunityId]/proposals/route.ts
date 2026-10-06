import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite, uuidParam } from '../../../../lib/build-route';
import { submitProposal } from '../../../../lib/opportunities';
import { proposalInputSchema } from '../../../../lib/opportunity-model';

type Context = { params: Promise<{ opportunityId: string }> };

export async function POST(request: NextRequest, context: Context) {
  return guardedWrite(request, 'PROPOSAL_FAILED', async (actor) => {
    const proposal = await submitProposal(
      actor.userId,
      uuidParam.parse((await context.params).opportunityId),
      proposalInputSchema.parse(await request.json()),
    );
    return NextResponse.json({ proposal }, { status: 201 });
  });
}
