import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../lib/identity';
import {
  assignOrganizationRole,
  OrganizationGovernanceError,
  revokeOrganizationMember,
  transferOrganizationOwnership,
} from '../../../../lib/organization-governance';
import { hasSameOrigin } from '../../../../lib/request-security';
import { enforceRateLimit } from '../../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../../lib/security/rate-limit-response';

const memberActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('ASSIGN'),
      profileSlug: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/),
      role: z.enum(['ADMIN', 'EDITOR', 'MEMBER']),
    })
    .strict(),
  z
    .object({
      action: z.literal('TRANSFER_OWNERSHIP'),
      profileSlug: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/),
    })
    .strict(),
  z
    .object({
      action: z.literal('REVOKE'),
      userId: z.uuid(),
      reason: z.string().trim().max(1_200).optional(),
    })
    .strict(),
]);

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
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const slug = (await params).slug;
    const input = memberActionSchema.parse(await request.json());
    if (input.action === 'ASSIGN') {
      await assignOrganizationRole({
        organizationSlug: slug,
        actorId: actor.userId,
        profileSlug: input.profileSlug,
        role: input.role,
      });
    } else if (input.action === 'TRANSFER_OWNERSHIP') {
      await transferOrganizationOwnership({
        organizationSlug: slug,
        actorId: actor.userId,
        profileSlug: input.profileSlug,
      });
    } else {
      await revokeOrganizationMember({
        organizationSlug: slug,
        actorId: actor.userId,
        memberUserId: input.userId,
        reason: input.reason ?? null,
      });
    }
    return NextResponse.json({ saved: true });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'INVALID_MEMBER_ACTION' }, { status: 400 });
    if (error instanceof OrganizationGovernanceError) {
      const status =
        error.code === 'NOT_FOUND' ? 404 : error.code === 'ROLE_CHANGE_INVALID' ? 409 : 403;
      return NextResponse.json({ error: error.code }, { status });
    }
    return NextResponse.json({ error: 'MEMBERSHIP_UPDATE_FAILED' }, { status: 503 });
  }
}
