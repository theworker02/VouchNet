import { NextRequest, NextResponse } from 'next/server';
import { createSqlClient } from '@nexus/db';
import { verifySignedResumeToken } from '../../../../lib/signed-resume';

export const runtime = 'nodejs';

/** Capability validation is complete; binary streaming waits for a configured private storage adapter. */
export async function GET(request: NextRequest) {
  const capability = verifySignedResumeToken(request.nextUrl.searchParams.get('token'));
  if (capability === null)
    return NextResponse.json({ error: 'INVALID_OR_EXPIRED_RESUME_LINK' }, { status: 403 });
  const url = process.env.DATABASE_URL;
  if (url === undefined)
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  const sql = createSqlClient(url);
  try {
    const media = await sql<
      { id: string }[]
    >`SELECT id FROM media_assets WHERE id=${capability.mediaId} AND owner_id=${capability.userId} AND mime_type='application/pdf' AND deleted_at IS NULL`;
    if (media[0] === undefined)
      return NextResponse.json({ error: 'RESUME_UNAVAILABLE' }, { status: 404 });
    return NextResponse.json(
      { error: 'RESUME_STORAGE_UNAVAILABLE' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
}
