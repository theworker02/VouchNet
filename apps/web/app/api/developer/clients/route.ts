import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import { hasSameOrigin } from '../../../lib/request-security';
import {
  createDeveloperClient,
  listDeveloperClients,
  validateRedirectUri,
} from '../../../lib/apply-oauth';

const clientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  redirectUris: z.array(z.string().max(2048)).min(1).max(10),
  scopes: z
    .array(z.enum(['profile:read', 'profile:email', 'resume:read', 'skills:verify']))
    .min(1)
    .max(4),
});

export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  return NextResponse.json({ clients: await listDeveloperClients(actor.userId) });
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const input = clientSchema.parse(await request.json());
    const redirectUris = [...new Set(input.redirectUris.map(validateRedirectUri))];
    const client = await createDeveloperClient({ ...input, redirectUris, ownerId: actor.userId });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? 'INVALID_CLIENT' : 'CLIENT_CREATE_FAILED' },
      { status: 400 },
    );
  }
}
