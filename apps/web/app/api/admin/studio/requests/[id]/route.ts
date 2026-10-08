import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../../lib/identity';
import { hasSameOrigin } from '../../../../../lib/request-security';
import { isAdministrator } from '../../../../../lib/telemetry-server';
import { approveStudioQuote, updateStudioStatus } from '../../../../../lib/studio';

const schema = z
  .object({
    action: z.enum(['QUOTE', 'STATUS']),
    depositCents: z.coerce.number().int().min(5000).max(5_000_000).optional(),
    quoteDescription: z.string().trim().min(20).max(2_000).optional(),
    status: z
      .enum(['UNDER_REVIEW', 'IN_PROGRESS', 'AWAITING_FEEDBACK', 'COMPLETED', 'CANCELLED'])
      .optional(),
  })
  .strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null || !(await isAdministrator(actor.userId)))
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const input = schema.safeParse(Object.fromEntries((await request.formData()).entries()));
  if (!input.success)
    return NextResponse.redirect(new URL('/admin/studio?error=invalid_input', request.url), 303);
  const requestId = (await context.params).id;
  const changed =
    input.data.action === 'QUOTE'
      ? input.data.depositCents === undefined || input.data.quoteDescription === undefined
        ? false
        : await approveStudioQuote(
            actor.userId,
            requestId,
            input.data.depositCents,
            input.data.quoteDescription,
          )
      : input.data.status === undefined
        ? false
        : await updateStudioStatus(actor.userId, requestId, input.data.status);
  return NextResponse.redirect(
    new URL(`/admin/studio?${changed ? 'updated=true' : 'error=not_updated'}`, request.url),
    303,
  );
}
