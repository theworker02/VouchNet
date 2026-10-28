import { NextRequest } from 'next/server';
import { getOrganization } from '../../../../lib/directory';
import { withOAuthApi } from '../../../../lib/oauth-api';

export const runtime = 'nodejs';

/**
 * Public organization directory record for authorized clients. Matches the source-reviewed
 * company page fields exposed on the web, never claim or membership internals.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return withOAuthApi(request, 'directory:read', async () => {
    const organization = await getOrganization(slug.trim().slice(0, 80));
    if (organization === null) throw new Error('NOT_FOUND');
    return {
      slug: organization.slug,
      name: organization.name,
      tagline: organization.tagline,
      description: organization.description,
      website_url: organization.websiteUrl,
      careers_url: organization.careersUrl,
      engineering_url: organization.engineeringUrl,
      repository_url: organization.repositoryUrl,
      headquarters: organization.headquarters,
      verification_status: organization.verificationStatus,
      technologies: organization.technologies,
      organization_url: `${process.env.APP_URL ?? 'https://vouchnet.dev'}/company/${organization.slug}`,
    };
  });
}
