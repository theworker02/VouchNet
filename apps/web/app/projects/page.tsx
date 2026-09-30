import { Shell } from '../components/shell';
import { EmbedBadge } from '../components/embed-badge';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { listOwnProjects } from '../lib/projects';
import { ProjectsClient } from './projects-client';

export default async function ProjectsPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const [projects, profile] = await Promise.all([
    listOwnProjects(actor.userId),
    getProfileSummary(actor.userId),
  ]);
  const appUrl = (process.env.APP_URL ?? 'https://vouchnet.dev').replace(/\/$/, '');
  return (
    <Shell>
      <ProjectsClient initialProjects={projects} />
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
