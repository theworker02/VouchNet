import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import {
  OrganizationGovernanceError,
  submitOrganizationClaimRequest,
} from '../../../../lib/organization-governance';
import { organizationClaimRequestSchema } from '../../../../lib/organization-claim-schema';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  try {
    const rateLimit = await enforceRateLimit(request, 'auth', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    await submitOrganizationClaimRequest({
      organizationSlug: (await params).slug,
      userId: actor.userId,
      claim: organizationClaimRequestSchema.parse(await request.json()),
    });
    return NextResponse.json({ submitted: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'INVALID_CLAIM_REQUEST' }, { status: 400 });
    if (error instanceof OrganizationGovernanceError) {
      const status =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'DOMAIN_EMAIL_REQUIRED'
            ? 422
            : error.code === 'ALREADY_CLAIMED' || error.code === 'CLAIM_ALREADY_OPEN'
              ? 409
              : 403;
      return NextResponse.json({ error: error.code }, { status });
    }
    return NextResponse.json({ error: 'CLAIM_REQUEST_FAILED' }, { status: 503 });
  }
}
