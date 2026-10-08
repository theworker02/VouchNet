import { NextRequest, NextResponse } from 'next/server';
import { actorFromRequest } from '../../../../lib/identity';
import { ClaimInviteError, createClaimInvite } from '../../../../lib/organization-claims';
import { sendOrganizationClaimEmail } from '../../../../lib/email';
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }
  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? (body as { email: unknown }).email
      : undefined;
  if (typeof email !== 'string' || !email.includes('@') || email.length > 254)
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  try {
    const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const invite = await createClaimInvite({
      organizationSlug: (await params).slug,
      email,
      invitedBy: actor.userId,
    });
    if (invite === null) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    await sendOrganizationClaimEmail({
      email,
      organizationName: invite.organizationName,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    if (error instanceof ClaimInviteError) {
      if (error.code === 'NOT_AUTHORIZED')
        return NextResponse.json({ error: 'NOT_AUTHORIZED' }, { status: 403 });
      if (error.code === 'DOMAIN_EMAIL_REQUIRED')
        return NextResponse.json({ error: 'DOMAIN_EMAIL_REQUIRED' }, { status: 422 });
    }
    return NextResponse.json({ error: 'INVITE_FAILED' }, { status: 503 });
  }
}
