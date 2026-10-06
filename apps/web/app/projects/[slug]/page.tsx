import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { lookingForLabels, projectStatusLabels } from '../../lib/project-model';
import { getProjectDetail, getPublicProject, type ProjectDetail } from '../../lib/projects';
import {
  BuildLogComposer,
  ContributionResponse,
  DeleteBuildLogButton,
  EditProjectButton,
  FollowProjectButton,
  InviteContributorForm,
} from '../project-actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const project = await getPublicProject((await params).slug);
  if (project === null) return { title: 'Project not found · VouchNet' };
  const description = project.summary ?? `A project by ${project.ownerName} on VouchNet.`;
  return {
    title: `${project.name} · VouchNet`,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: { type: 'article', title: `${project.name} · VouchNet`, description },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  const project = await getProjectDetail((await params).slug, actor?.userId ?? null);
  if (project === null) notFound();
  if (actor === null)
    return (
      <main className="public-project">
        <header className="public-nav">
          <Link className="brand" href="/">
            VouchNet
          </Link>
          <div>
            <Link className="quiet-link" href={`/vouch/${project.ownerSlug}`}>
              View profile
            </Link>
            <Link className="primary" href="/signup">
              Build your profile
            </Link>
          </div>
        </header>
        <ProjectRecordView project={project} />
      </main>
    );
  return (
    <Shell>
      <div className="project-page">
        <ProjectRecordView project={project} />
      </div>
    </Shell>
  );
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function ProjectRecordView({ project }: { project: ProjectDetail }) {
  const { viewer } = project;
  const canLog = viewer.role === 'OWNER' || viewer.role === 'CONTRIBUTOR';
  return (
    <>
      {viewer.role === 'INVITEE' && viewer.contributorId !== null ? (
        <section className="company-jobs project-invite-banner" aria-label="Contributor invitation">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Invitation</p>
              <h2>{project.ownerName} invited you to contribute</h2>
            </div>
            <ContributionResponse
              projectId={project.id}
              contributorId={viewer.contributorId}
              mode="invite"
            />
          </div>
        </section>
      ) : null}
      <article className="public-project-surface">
        <div className="public-project-topline">
          <span>{projectStatusLabels[project.status]}</span>
          <span>
            Published by <Link href={`/vouch/${project.ownerSlug}`}>{project.ownerName}</Link>
          </span>
        </div>
        <h1>{project.name}</h1>
        <p className="public-project-summary">{project.summary}</p>
        <div className="project-tags">
          {project.openSource ? <span>open source</span> : null}
          {project.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="public-project-links">
          {project.projectUrl === null ? null : (
            <a href={project.projectUrl} rel="noreferrer" target="_blank">
              Live site ↗
            </a>
          )}
          {project.repositoryUrl === null ? null : (
            <a href={project.repositoryUrl} rel="noreferrer" target="_blank">
              Source code ↗
            </a>
          )}
          {project.documentationUrl === null ? null : (
            <a href={project.documentationUrl} rel="noreferrer" target="_blank">
              Documentation ↗
            </a>
          )}
          {project.demoUrl === null ? null : (
            <a href={project.demoUrl} rel="noreferrer" target="_blank">
              Demo ↗
            </a>
          )}
        </div>
        {viewer.role === 'ANONYMOUS' ? (
          <p className="muted-copy project-follow-hint">
            {project.followerCount === 1 ? '1 follower' : `${project.followerCount} followers`} ·{' '}
            <Link href="/login">Sign in to follow this project</Link>
          </p>
        ) : viewer.role === 'OWNER' ? (
          <div className="relationship-actions">
            <EditProjectButton
              project={{
                id: project.id,
                name: project.name,
                summary: project.summary ?? '',
                description: project.description ?? '',
                status: project.status,
                tags: project.tags,
                openSource: project.openSource,
                lookingFor: project.lookingFor,
                projectUrl: project.projectUrl,
                repositoryUrl: project.repositoryUrl,
                documentationUrl: project.documentationUrl,
                demoUrl: project.demoUrl,
              }}
            />
            <span className="muted-copy">
              {project.followerCount === 1 ? '1 follower' : `${project.followerCount} followers`}
            </span>
          </div>
        ) : (
          <FollowProjectButton
            projectId={project.id}
            initialFollowing={viewer.isFollowing}
            initialCount={project.followerCount}
          />
        )}
        <section className="public-project-description">
          <h2>Project context</h2>
          <p>{project.description}</p>
        </section>
      </article>
      <section className="company-layout project-build-layout">
        <article className="company-about" aria-labelledby="build-log-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Build in public</p>
              <h2 id="build-log-heading">Build log</h2>
            </div>
          </div>
          {canLog ? <BuildLogComposer projectId={project.id} /> : null}
          {project.buildLogs.length === 0 ? (
            <p>
              {canLog
                ? 'No entries yet. Post what you shipped, what you learned, and what is next.'
                : 'No build-log entries yet. Follow the project to hear when there are.'}
            </p>
          ) : (
            <ol className="job-list build-log-list">
              {project.buildLogs.map((entry) => (
                <li key={entry.id} className="job-row">
                  <div>
                    <div className="job-row-topline">
                      <time dateTime={entry.loggedOn}>
                        {dateFormat.format(new Date(`${entry.loggedOn}T00:00:00Z`))}
                      </time>
                      <Link href={`/vouch/${entry.author.slug}`}>{entry.author.name}</Link>
                    </div>
                    <h3>{entry.title}</h3>
                    <p>{entry.body}</p>
                  </div>
                  {viewer.role === 'OWNER' || entry.author.userId === viewer.userId ? (
                    <DeleteBuildLogButton projectId={project.id} logId={entry.id} />
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </article>
        <aside className="company-signals" aria-labelledby="built-by-heading">
          <h2 id="built-by-heading">Built by</h2>
          <div className="invitation">
            <div className="invitation-avatar" aria-hidden="true">
              {project.ownerName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)}
            </div>
            <p>
              <Link href={`/vouch/${project.ownerSlug}`}>{project.ownerName}</Link>
              <small>Owner</small>
            </p>
          </div>
          {project.contributors.map((person) => (
            <div key={person.userId} className="invitation">
              <div className="invitation-avatar" aria-hidden="true">
                {initials(person.firstName, person.lastName)}
              </div>
              <p>
                <Link href={`/vouch/${person.slug}`}>
                  {person.firstName} {person.lastName}
                </Link>
                <small>{person.role}</small>
              </p>
              {viewer.role === 'OWNER' ? (
                <ContributionResponse
                  projectId={project.id}
                  contributorId={person.contributorId}
                  mode="remove"
                />
              ) : null}
            </div>
          ))}
          <h2>Looking for</h2>
          {project.lookingFor.length === 0 ? (
            <p>The team has not listed open roles or asks.</p>
          ) : (
            <div className="project-tags">
              {project.lookingFor.map((item) => (
                <span key={item}>{lookingForLabels[item]}</span>
              ))}
            </div>
          )}
          {viewer.role === 'OWNER' ? (
            <>
              <h2>Invite a contributor</h2>
              <InviteContributorForm projectId={project.id} />
              {project.pendingInvites.length === 0 ? null : (
                <>
                  <p>Pending invitations</p>
                  {project.pendingInvites.map((person) => (
                    <div key={person.contributorId} className="invitation">
                      <div className="invitation-avatar" aria-hidden="true">
                        {initials(person.firstName, person.lastName)}
                      </div>
                      <p>
                        <Link href={`/vouch/${person.slug}`}>
                          {person.firstName} {person.lastName}
                        </Link>
                        <small>{person.role} · invited</small>
                      </p>
                      <ContributionResponse
                        projectId={project.id}
                        contributorId={person.contributorId}
                        mode="remove"
                      />
                    </div>
                  ))}
                </>
              )}
            </>
          ) : null}
          {viewer.role === 'CONTRIBUTOR' && viewer.contributorId !== null ? (
            <ContributionResponse
              projectId={project.id}
              contributorId={viewer.contributorId}
              mode="leave"
            />
          ) : null}
        </aside>
      </section>
    </>
  );
}
