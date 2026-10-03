import 'server-only';
import { listHiringOrganizations, listPublicJobs } from './directory';
import {
  buildFeedDiscovery,
  type CuratedDiscoveryJob,
  type CuratedDiscoveryOrganization,
  type FeedDiscovery,
} from './feed-discovery-model';

/**
 * Supplies the first-feed experience with public, source-reviewed records—not fabricated
 * member activity. Directory failures do not prevent the original daily challenge from showing.
 */
export async function getFeedDiscovery(): Promise<FeedDiscovery> {
  const [jobsResult, organizationsResult] = await Promise.allSettled([
    listPublicJobs(undefined, 3),
    listHiringOrganizations(3),
  ]);
  const jobs: CuratedDiscoveryJob[] =
    jobsResult.status === 'fulfilled'
      ? jobsResult.value.map((job) => ({
          slug: job.slug,
          title: job.title,
          organizationName: job.organizationName,
          organizationSlug: job.organizationSlug,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          skillTags: job.skillTags,
        }))
      : [];
  const organizations: CuratedDiscoveryOrganization[] =
    organizationsResult.status === 'fulfilled'
      ? organizationsResult.value.map((organization) => ({
          slug: organization.slug,
          name: organization.name,
          tagline: organization.tagline,
          technologies: organization.technologies,
          openRoleCount: organization.openRoleCount,
        }))
      : [];
  return buildFeedDiscovery(jobs, organizations);
}
