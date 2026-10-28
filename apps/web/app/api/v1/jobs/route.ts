import { NextRequest } from 'next/server';
import { listPublicJobs } from '../../../lib/directory';
import { withOAuthApi } from '../../../lib/oauth-api';

export const runtime = 'nodejs';

/**
 * Salary-forward public jobs directory for authorized clients. Source URL remains the application
 * authority — VouchNet does not invent ATS credentials for third parties.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80);
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '20');
  return withOAuthApi(request, 'directory:read', async () => {
    const jobs = await listPublicJobs(query || undefined, Number.isFinite(limit) ? limit : 20);
    return {
      query: query || null,
      jobs: jobs.map((job) => ({
        slug: job.slug,
        title: job.title,
        summary: job.summary,
        location: job.location,
        workplace_type: job.workplaceType,
        employment_type: job.employmentType,
        salary_min: job.salaryMin,
        salary_max: job.salaryMax,
        salary_currency: job.salaryCurrency,
        skill_tags: job.skillTags,
        source_url: job.sourceUrl,
        source_status: job.sourceStatus,
        organization_name: job.organizationName,
        organization_slug: job.organizationSlug,
        job_url: `${process.env.APP_URL ?? 'https://vouchnet.dev'}/jobs/${job.slug}`,
      })),
    };
  });
}
