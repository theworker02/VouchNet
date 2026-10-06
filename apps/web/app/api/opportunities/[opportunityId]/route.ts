import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '../../../lib/build-notifications';
import { guardedWrite, uuidParam } from '../../../lib/build-route';
import { canReviewModeration } from '../../../lib/moderation';
import {
  changeOpportunityStatus,
  moderateOpportunity,
  updateOpportunity,
} from '../../../lib/opportunities';
import { opportunityInputSchema, opportunityStatuses } from '../../../lib/opportunity-model';

type Context = { params: Promise<{ opportunityId: string }> };

const bodySchema = z.union([
  z.object({ status: z.enum(opportunityStatuses) }).strict(),
  z.object({ edit: opportunityInputSchema }).strict(),
  z.object({ moderation: z.enum(['REMOVE', 'RESTORE']) }).strict(),
]);

export async function PATCH(request: NextRequest, context: Context) {
  return guardedWrite(request, 'OPPORTUNITY_UPDATE_FAILED', async (actor) => {
    const opportunityId = uuidParam.parse((await context.params).opportunityId);
    const body = bodySchema.parse(await request.json());
    if ('status' in body)
      return NextResponse.json(
        await changeOpportunityStatus(actor.userId, opportunityId, body.status),
      );
    if ('edit' in body)
      return NextResponse.json(await updateOpportunity(actor.userId, opportunityId, body.edit));
    if (!(await canReviewModeration(actor.userId))) throw new DomainError('MODERATOR_REQUIRED');
    return NextResponse.json(
      await moderateOpportunity(actor.userId, opportunityId, body.moderation === 'REMOVE'),
    );
  });
}
