import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { actorFromRequest } from '../../../../../../lib/identity';
import { getStudioFileForOwner } from '../../../../../../lib/studio';

export const runtime = 'nodejs';
const idSchema = z.string().uuid();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> },
) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const params = await context.params;
  const file = await getStudioFileForOwner(
    actor.userId,
    idSchema.parse(params.id),
    idSchema.parse(params.fileId),
  );
  if (file === null) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return new NextResponse(new Uint8Array(file.content), {
    headers: {
      'content-type': file.mime_type,
      'content-disposition': `attachment; filename="${file.safe_name.replaceAll('"', '')}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
