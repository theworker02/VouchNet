import { NextRequest, NextResponse } from 'next/server';
import { desktopActorFromBearer } from '../../../lib/desktop-auth';
import { listPublicJobs, listPublicOrganizations } from '../../../lib/directory';
import { enforceRateLimit } from '../../../lib/security/rate-limit';
import { rateLimitResponse } from '../../../lib/security/rate-limit-response';

/**
 * Authenticated desktop jobs directory. Uses the same public job records as the web directory so
 * salary transparency and source status stay identical across clients.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await desktopActorFromBearer(request.headers.get('authorization'));
    if (actor === null) return NextResponse.json({ error: 'UNAUTHENTICATED' }, { status: 401 });
    const rateLimit = await enforceRateLimit(request, 'desktopRead', actor.userId);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
    const [jobs, organizations] = await Promise.all([
      listPublicJobs(query || undefined, 30),
      listPublicOrganizations(query || undefined, 24),
    ]);
    return NextResponse.json({
      jobs: jobs.map((job) => ({
        slug: job.slug,
        title: job.title,
        summary: job.summary,
        organizationName: job.organizationName,
        organizationSlug: job.organizationSlug,
        location: job.location,
        workplaceType: job.workplaceType,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        skillTags: job.skillTags,
        sourceStatus: job.sourceStatus,
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
    return NextResponse.json({ error: 'JOBS_UNAVAILABLE' }, { status: 503 });
  }
}
