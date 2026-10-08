import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../../lib/identity';
import { hasSameOrigin } from '../../../../../lib/request-security';
import { addStudioMessage } from '../../../../../lib/studio';
import { isAdministrator } from '../../../../../lib/telemetry-server';

const schema = z.object({ body: z.string().trim().min(1).max(4000) }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
  const administrator = await isAdministrator(actor.userId);
  const created = await addStudioMessage(
    actor.userId,
    (await context.params).id,
    parsed.data.body,
    administrator,
  );
  return created
    ? NextResponse.json({ success: true }, { status: 201 })
    : NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
}
