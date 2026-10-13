import { NextRequest, NextResponse } from 'next/server';
import { listPublicJobs, listPublicOrganizations } from '../../../lib/directory';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

/**
 * A deliberately small landing-page read model. It returns only data that is already public in
 * the directories, so it cannot turn the landing page into a profile or application API.
 */
export async function GET(request: NextRequest) {
  const rateLimit = await enforceRateLimit(request, 'generalApi');
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const [organizations, jobs] = await Promise.all([
      listPublicOrganizations(undefined, 3),
      listPublicJobs(undefined, 3),
    ]);
    return NextResponse.json(
      { organizations, jobs },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=300',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'PUBLIC_DIRECTORY_UNAVAILABLE' }, { status: 503 });
  }
}
