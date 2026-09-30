import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revokeDeveloperClient } from '../../../../lib/apply-oauth';
import { actorFromRequest } from '../../../../lib/identity';
import { hasSameOrigin } from '../../../../lib/request-security';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const clientId = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  if (!clientId.success) return NextResponse.json({ error: 'INVALID_CLIENT' }, { status: 400 });
  const revoked = await revokeDeveloperClient(actor.userId, clientId.data);
  return NextResponse.json({ revoked }, { status: revoked ? 200 : 404 });
}
