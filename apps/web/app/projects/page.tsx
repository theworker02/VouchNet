import { Shell } from '../components/shell';
import { EmbedBadge } from '../components/embed-badge';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { listFeaturedProofNodes } from '../lib/featured-proof';
import { listOwnProjects } from '../lib/projects';
import { hasVouchNetPlus } from '../lib/subscription';
import { ProjectsClient } from './projects-client';

export default async function ProjectsPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const [projects, profile, featuredNodes, isPlus] = await Promise.all([
    listOwnProjects(actor.userId),
    getProfileSummary(actor.userId),
    listFeaturedProofNodes(actor.userId),
    hasVouchNetPlus(actor.userId),
  ]);
  const appUrl = (process.env.APP_URL ?? 'https://vouchnet.dev').replace(/\/$/, '');
  return (
    <Shell>
      <ProjectsClient
        initialFeaturedNodes={featuredNodes}
        initialProjects={projects}
        isPlus={isPlus}
      />
      {profile === null ? null : (
        <EmbedBadge
          label={`${profile.fullName} on VouchNet`}
          imageUrl={`${appUrl}/api/badges/profile/${profile.slug}`}
          targetUrl={`${appUrl}/vouch/${profile.slug}`}
        />
      )}
    </Shell>
  );
}
