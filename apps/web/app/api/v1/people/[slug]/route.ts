import { NextRequest } from 'next/server';
import { withOAuthApi } from '../../../../lib/oauth-api';
import { getVisibleProfile } from '../../../../lib/people';

export const runtime = 'nodejs';

/**
 * LinkedIn-style people lookup for authorized integration clients. Returns only PUBLIC profile
 * fields (or the authorizing member's own profile). Requires the `directory:read` scope.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return withOAuthApi(request, 'directory:read', async (actor) => {
    const profile = await getVisibleProfile(actor.userId, slug.trim().slice(0, 80));
    if (profile === null) throw new Error('NOT_FOUND');
    return {
      id: profile.userId,
      slug: profile.slug,
      first_name: profile.firstName,
      last_name: profile.lastName,
      name: `${profile.firstName} ${profile.lastName}`.trim(),
      headline: profile.headline,
      location: profile.location,
      about: profile.about,
      languages: profile.languages,
      early_member: profile.earlyMember,
      is_plus: profile.isPlus,
      profile_url: `${process.env.APP_URL ?? 'https://vouchnet.dev'}/vouch/${profile.slug}`,
      visibility: profile.visibility,
    };
  });
}
