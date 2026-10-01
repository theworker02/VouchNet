import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../lib/identity';
import {
  listFeaturedProofNodes,
  pinProjectProof,
  removeFeaturedProof,
} from '../../../lib/featured-proof';
import { hasSameOrigin } from '../../../lib/request-security';

const positionSchema = z.object({ position: z.number().int().min(0).max(2) });
const pinSchema = positionSchema.extend({ projectId: z.string().uuid() });

function errorResponse(error: unknown) {
  if (error instanceof z.ZodError)
    return NextResponse.json({ error: 'INVALID_FEATURED_PROOF' }, { status: 400 });
  if (error instanceof Error && error.message.startsWith('PLUS_REQUIRED'))
    return NextResponse.json({ error: 'PLUS_REQUIRED' }, { status: 403 });
  if (error instanceof Error && error.message === 'PROJECT_NOT_AVAILABLE')
    return NextResponse.json({ error: 'PROJECT_NOT_AVAILABLE' }, { status: 404 });
  return NextResponse.json({ error: 'FEATURED_PROOF_UNAVAILABLE' }, { status: 503 });
}

export async function GET(request: NextRequest) {
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    return NextResponse.json({ nodes: await listFeaturedProofNodes(actor.userId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const input = pinSchema.parse(await request.json());
    await pinProjectProof(actor.userId, input.projectId, input.position);
    return NextResponse.json({ nodes: await listFeaturedProofNodes(actor.userId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasSameOrigin(request))
    return NextResponse.json({ error: 'CSRF_REJECTED' }, { status: 403 });
  try {
    const actor = await actorFromRequest(request);
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const input = positionSchema.parse(await request.json());
    const removed = await removeFeaturedProof(actor.userId, input.position);
    return NextResponse.json({ removed });
  } catch (error) {
    return errorResponse(error);
  }
}
