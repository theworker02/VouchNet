import { listPublicJobs, listPublicOrganizations } from './lib/directory';
import LandingPageClient from './components/landing-page-client';

/**
 * The public directory preview is rendered with the page whenever possible. This keeps the
 * landing page useful before hydration and avoids presenting a transient empty/loading state to
 * new visitors or search previews. The client retains a guarded retry only for a transient
 * server-side directory failure.
 */
export default async function HomePage() {
  const initialSnapshot = await Promise.all([
    listPublicOrganizations(undefined, 3),
    listPublicJobs(undefined, 3),
  ])
    .then(([organizations, jobs]) => ({
      organizations: organizations.map((organization) => ({
        slug: organization.slug,
        name: organization.name,
        tagline: organization.tagline,
        headquarters: organization.headquarters,
        verificationStatus: organization.verificationStatus,
        technologies: organization.technologies,
      })),
      jobs: jobs.map((job) => ({
        slug: job.slug,
        title: job.title,
        workplaceType: job.workplaceType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        organizationName: job.organizationName,
      })),
    }))
    .catch(() => null);

  return <LandingPageClient initialSnapshot={initialSnapshot} />;
}
