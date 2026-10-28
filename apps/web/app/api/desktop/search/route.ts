import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { listPublicJobs, listPublicOrganizations } from '../../../lib/directory';
import { searchPeople } from '../../../lib/people';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

/**
 * Unified desktop search across people, jobs, and organizations. Query length is bounded so a
 * device token cannot fan out expensive ILIKE scans without a rate-limit gate.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'desktopRead', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
    if (query.length < 2) {
      return NextResponse.json({ query, people: [], jobs: [], organizations: [] });
    }
    const [people, jobs, organizations] = await Promise.all([
      searchPeople(actor.userId, query),
      listPublicJobs(query, 12),
      listPublicOrganizations(query, 12),
    ]);
    return NextResponse.json({
      query,
      people: people.map((person) => ({
        userId: person.userId,
        slug: person.slug,
        fullName: `${person.firstName} ${person.lastName}`.trim(),
        headline: person.headline,
        location: person.location,
        isPlus: person.isPlus,
      })),
      jobs: jobs.map((job) => ({
        slug: job.slug,
        title: job.title,
        organizationName: job.organizationName,
        organizationSlug: job.organizationSlug,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        skillTags: job.skillTags,
      })),
      organizations: organizations.map((organization) => ({
        slug: organization.slug,
        name: organization.name,
        tagline: organization.tagline,
        headquarters: organization.headquarters,
        verificationStatus: organization.verificationStatus,
        technologies: organization.technologies,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'SEARCH_UNAVAILABLE' }, { status: 503 });
  }
}
