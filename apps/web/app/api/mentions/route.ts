import { NextRequest, NextResponse } from 'next/server';
import { createSqlClient } from '@nexus/db';
import { actorFromRequest } from '../../lib/identity';

/** @mention autocomplete for the composer: public people and organizations by name. */
export async function GET(request: NextRequest) {
  const actor = await actorFromRequest(request);
  if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) return NextResponse.json({ people: [], organizations: [] });
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
  if (query.length < 1) return NextResponse.json({ people: [], organizations: [] });
  const pattern = `%${query.replace(/[%_]/g, '')}%`;
  const sql = createSqlClient(databaseUrl);
  try {
    const [people, organizations] = await Promise.all([
      sql<{ id: string; name: string; slug: string; headline: string | null }[]>`
        SELECT p.user_id AS id,concat(p.first_name,' ',p.last_name) AS name,p.slug,p.headline
        FROM profiles p JOIN users u ON u.id=p.user_id
        WHERE u.status='ACTIVE' AND concat(p.first_name,' ',p.last_name) ILIKE ${pattern}
        ORDER BY p.updated_at DESC LIMIT 6
      `,
      sql<{ id: string; name: string; slug: string }[]>`
        SELECT id,name,slug FROM organizations
        WHERE deleted_at IS NULL AND name ILIKE ${pattern}
        ORDER BY name LIMIT 6
      `,
    ]);
    return NextResponse.json({ people, organizations });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
