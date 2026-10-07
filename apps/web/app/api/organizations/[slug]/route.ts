import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import {
  OrganizationProfileError,
  updateOrganizationProfile,
} from '../../../lib/organization-admin';
import { organizationProfileSchema } from '../../../lib/organization-profile-schema';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });

  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  try {
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const input = organizationProfileSchema.parse(await request.json());
    await updateOrganizationProfile((await params).slug, actor.userId, input);
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'INVALID_ORGANIZATION_PROFILE' }, { status: 400 });
    if (error instanceof OrganizationProfileError) {
      const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'NOT_AUTHORIZED' ? 403 : 409;
      return NextResponse.json({ error: error.code }, { status });
    }
    return NextResponse.json({ error: 'ORGANIZATION_PROFILE_UPDATE_FAILED' }, { status: 503 });
  }
}
