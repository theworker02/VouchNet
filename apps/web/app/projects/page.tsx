import Link from 'next/link';
import { Shell } from '../components/shell';
import { EmbedBadge } from '../components/embed-badge';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { listFeaturedProofNodes } from '../lib/featured-proof';
import { projectStatusLabels } from '../lib/project-model';
import { listContributorProjects, listFollowedProjects, listOwnProjects } from '../lib/projects';
import { hasVouchNetPlus } from '../lib/subscription';
import { ContributionResponse } from './project-actions';
import { ProjectsClient } from './projects-client';

export default async function ProjectsPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const [projects, contributions, following, profile, featuredNodes, isPlus] = await Promise.all([
    listOwnProjects(actor.userId),
    listContributorProjects(actor.userId),
    listFollowedProjects(actor.userId),
    getProfileSummary(actor.userId),
    listFeaturedProofNodes(actor.userId),
    hasVouchNetPlus(actor.userId),
  ]);
  const invitations = contributions.filter((project) => project.contributorStatus === 'INVITED');
  const contributing = contributions.filter((project) => project.contributorStatus === 'ACCEPTED');
  const appUrl = (process.env.APP_URL ?? 'https://vouchnet.dev').replace(/\/$/, '');
  return (
    <Shell>
      <ProjectsClient
        initialFeaturedNodes={featuredNodes}
        initialProjects={projects}
        isPlus={isPlus}
      />
      {invitations.length === 0 ? null : (
        <section
          className="network-invitations projects-invitations"
          aria-label="Project invitations"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">Invitations</p>
              <h2>Projects that want you on the team</h2>
            </div>
          </div>
          <p>
            Accepting adds you to the project&apos;s Built by list and lets you post to its build
            log.
          </p>
          {invitations.map((project) => (
            <div key={project.contributorId} className="invitation">
              <div className="invitation-avatar" aria-hidden="true">
                {project.name.slice(0, 2).toUpperCase()}
              </div>
              <p>
                <Link href={`/projects/${project.slug}`}>{project.name}</Link>
                <small>
                  {project.role} · invited by {project.ownerName}
                </small>
              </p>
              <ContributionResponse
                projectId={project.id}
                contributorId={project.contributorId}
                mode="invite"
              />
            </div>
          ))}
        </section>
      )}
      {contributing.length === 0 && following.length === 0 ? null : (
        <section className="projects-secondary">
          {contributing.length === 0 ? null : (
            <ProjectList
              eyebrow="Contributing"
              title="Projects you build with others"
              projects={contributing.map((project) => ({ ...project, detail: project.role }))}
            />
          )}
          {following.length === 0 ? null : (
            <ProjectList
              eyebrow="Following"
              title="Build logs you follow"
              projects={following.map((project) => ({ ...project, detail: project.ownerName }))}
            />
          )}
        </section>
      )}
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

function ProjectList({
  eyebrow,
  title,
  projects,
}: {
  eyebrow: string;
  title: string;
  projects: {
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    status: keyof typeof projectStatusLabels;
    detail: string;
  }[];
}) {
  return (
    <section className="company-jobs">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="job-list">
        {projects.map((project) => (
          <article key={project.id} className="job-row">
            <div>
              <div className="job-row-topline">
                <span>{projectStatusLabels[project.status]}</span>
                <span>{project.detail}</span>
              </div>
              <h3>{project.name}</h3>
              <p>{project.summary}</p>
            </div>
            <Link href={`/projects/${project.slug}`}>Open project</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
