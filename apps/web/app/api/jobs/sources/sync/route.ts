import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { syncActiveJobSources } from '../../../../lib/job-provider-sync';

export const runtime = 'nodejs';

function matchesSyncSecret(provided: string | null, expected: string | undefined): boolean {
  if (provided === null || expected === undefined || expected.length < 32) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return (
    providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
  );
}

export async function POST(request: NextRequest) {
  if (
    !matchesSyncSecret(
      request.headers.get('x-vouchnet-job-sync-secret'),
      process.env.JOB_SYNC_SECRET,
    )
  )
    return NextResponse.json({ error: 'UNAUTHORIZED_SYNC' }, { status: 401 });
  const result = await syncActiveJobSources();
  return NextResponse.json({ result }, { headers: { 'cache-control': 'no-store' } });
}
