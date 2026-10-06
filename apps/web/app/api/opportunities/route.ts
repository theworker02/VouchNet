import { NextRequest, NextResponse } from 'next/server';
import { guardedWrite } from '../../lib/build-route';
import { createOpportunity } from '../../lib/opportunities';
import { opportunityInputSchema } from '../../lib/opportunity-model';

export async function POST(request: NextRequest) {
  return guardedWrite(request, 'OPPORTUNITY_CREATION_FAILED', async (actor) => {
    const opportunity = await createOpportunity(
      actor.userId,
      opportunityInputSchema.parse(await request.json()),
    );
    return NextResponse.json({ opportunity }, { status: 201 });
  });
}
