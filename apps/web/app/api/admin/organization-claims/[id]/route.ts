import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import {
  OrganizationGovernanceError,
  reviewOrganizationClaimRequest,
} from '../../../../lib/organization-governance';
import { sendOrganizationClaimDecisionEmail } from '../../../../lib/email';
import { reviewOrganizationClaimSchema } from '../../../../lib/organization-claim-schema';
import { hasSameOrigin } from '../../../../lib/request-security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const form = await request.formData();
    const input = reviewOrganizationClaimSchema.parse({
      decision: form.get('decision'),
      reviewNote: form.get('reviewNote') || undefined,
    });
    const notifications = await reviewOrganizationClaimRequest({
      actorId: actor.userId,
      claimRequestId: z.uuid().parse((await context.params).id),
      decision: input.decision,
      reviewNote: input.reviewNote ?? null,
    });
    const delivery = await Promise.allSettled(
      notifications.map((notification) => sendOrganizationClaimDecisionEmail(notification)),
    );
    const deliveryFailed = delivery.some((result) => result.status === 'rejected');
    return NextResponse.redirect(
      new URL(
        `/admin/organization-claims?updated=true${deliveryFailed ? '&email=delivery_failed' : ''}`,
        request.url,
      ),
      303,
    );
  } catch (error) {
    const code = error instanceof OrganizationGovernanceError ? error.code : 'CLAIM_REVIEW_FAILED';
    return NextResponse.redirect(
      new URL(`/admin/organization-claims?error=${encodeURIComponent(code)}`, request.url),
      303,
    );
  }
}
