import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeEmail } from '@nexus/auth';
import { createSqlClient } from '@nexus/db';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

const draftSchema = z
  .object({
    organizationSlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/),
    proposedEmail: z.string().trim().email().max(254),
    sourceUrl: z.url().max(2_048),
  })
  .strict();

function database() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export const runtime = 'nodejs';

/** Stages a recipient for review only. This route deliberately has no email-delivery side effect. */
export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const rateLimit = await enforceRateLimit(request, 'socialWrite', actor.userId);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
  const sql = database();
  try {
    const form = await request.formData();
    const input = draftSchema.parse({
      organizationSlug: form.get('organizationSlug'),
      proposedEmail: form.get('proposedEmail'),
      sourceUrl: form.get('sourceUrl'),
    });
    const result = await sql.begin(async (transaction) => {
      const administrators = await transaction<{ id: string }[]>`
        SELECT id FROM users WHERE id=${actor.userId} AND role='ADMIN' AND status='ACTIVE'
      `;
      if (administrators[0] === undefined) return 'NOT_AUTHORIZED' as const;
      const organizations = await transaction<{ id: string }[]>`
        SELECT id FROM organizations WHERE slug=${input.organizationSlug} AND deleted_at IS NULL
      `;
      const organization = organizations[0];
      if (organization === undefined) return 'NOT_FOUND' as const;
      await transaction`
        INSERT INTO organization_outreach_candidates
          (organization_id,proposed_email,source_url,created_by)
        VALUES (${organization.id},${normalizeEmail(input.proposedEmail)},${input.sourceUrl},${actor.userId})
        ON CONFLICT (organization_id,proposed_email)
        DO UPDATE SET source_url=${input.sourceUrl},status='DRAFT',updated_at=now()
      `;
      return 'CREATED' as const;
    });
    if (result === 'NOT_AUTHORIZED') return NextResponse.json({ error: result }, { status: 403 });
    if (result === 'NOT_FOUND') return NextResponse.json({ error: result }, { status: 404 });
    return NextResponse.redirect(
      new URL('/admin/organization-claims?outreach=true', request.url),
      303,
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'INVALID_OUTREACH_CANDIDATE' }, { status: 400 });
    return NextResponse.json({ error: 'OUTREACH_CANDIDATE_CREATE_FAILED' }, { status: 503 });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
