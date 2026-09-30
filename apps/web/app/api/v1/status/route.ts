import { createSqlClient } from '@nexus/db';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** Minimal, non-sensitive readiness response for load balancers and local diagnostics. */
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined)
    return NextResponse.json(
      { status: 'degraded', service: 'vouch-api', database: 'unconfigured' },
      { status: 503 },
    );
  const sql = createSqlClient(databaseUrl);
  try {
    await sql`SELECT 1`;
    return NextResponse.json(
      { status: 'ok', service: 'vouch-api', version: 'v1', database: 'ready' },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'degraded', service: 'vouch-api', database: 'unavailable' },
      { status: 503 },
    );
  } finally {
    await sql.end({ timeout: 1 });
  }
}
