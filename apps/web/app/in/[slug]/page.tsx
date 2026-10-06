import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor, getProfileSummary } from '../../lib/identity';
import { getVisibleProfile } from '../../lib/people';
import { RelationshipActions } from '../../components/relationship-actions';
import { ProfileVouchRoster } from '../../components/profile-vouch-roster';
import { getProfileVouches } from '../../lib/vouches';
import { recordProfileView } from '../../lib/profile-analytics';
import { listFeaturedProofNodes } from '../../lib/featured-proof';
import { projectStatusLabels } from '../../lib/project-model';
import { listProfileProjects } from '../../lib/projects';
import { ReputationSummary } from '../../components/reputation-summary';
import { TrustModule } from '../../components/vouches/trust-module';
import { VouchBoard, type BoardViewer } from '../../components/vouches/vouch-board';
import { VouchTrigger } from '../../components/vouches/vouch-trigger';
import { getReputation } from '../../lib/reputation';
import { getConstellation } from '../../lib/vouch-graph';
import { getComposerState, listReceivedVouches } from '../../lib/work-vouches';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const profile = await getVisibleProfile(null, (await params).slug);

  if (profile === null) {
    return {
      title: 'Profile unavailable | VouchNet',
      robots: { index: false, follow: false },
    };
  }

  const name = `${profile.firstName} ${profile.lastName}`;
  const description = profile.headline ?? `Professional profile for ${name} on VouchNet.`;

  return {
    title: `${name} | VouchNet`,
    description,
    alternates: { canonical: `/vouch/${profile.slug}` },
    openGraph: { title: `${name} | VouchNet`, description, type: 'profile' },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  const profile = await getVisibleProfile(actor?.userId ?? null, (await params).slug);
  if (profile === null) notFound();
  await recordProfileView(profile.userId, actor?.userId ?? null).catch(() => undefined);
  const viewerId = actor?.userId ?? null;
  const isOwner = viewerId === profile.userId;
  const [
    vouchData,
    featuredNodes,
    projects,
    received,
    constellation,
    reputation,
    composer,
    viewer,
  ] = await Promise.all([
    getProfileVouches(viewerId, profile.userId),
    listFeaturedProofNodes(profile.userId),
    listProfileProjects(profile.userId, viewerId).catch(() => []),
    listReceivedVouches(profile.userId, viewerId),
    getConstellation(profile.userId, viewerId),
    getReputation(profile.userId),
    viewerId === null || isOwner
      ? Promise.resolve(null)
      : getComposerState(viewerId, profile.userId),
    viewerId === null ? Promise.resolve(null) : getProfileSummary(viewerId),
  ]);
  const recipient = {
    userId: profile.userId,
    slug: profile.slug,
    name: `${profile.firstName} ${profile.lastName}`,
    firstName: profile.firstName,
    lastName: profile.lastName,
    headline: profile.headline,
  };
  const boardViewer: BoardViewer =
    viewerId === null || viewer === null
      ? null
      : { userId: viewerId, name: viewer.fullName, headline: viewer.headline };
  if (actor === null)
    return (
      <VouchBoard recipient={recipient} viewer={null} composer={null} initialVouches={received}>
        <PublicProfile
          profile={profile}
          vouchData={vouchData}
          featuredNodes={featuredNodes}
          projects={projects}
          trust={
            <TrustModule
              constellation={constellation}
              signInHref={`/login?next=${encodeURIComponent(`/in/${profile.slug}`)}`}
            />
          }
          reputation={<ReputationSummary reputation={reputation} isOwner={false} />}
        />
      </VouchBoard>
    );
  return (
    <Shell>
      <VouchBoard
        recipient={recipient}
        viewer={boardViewer}
        composer={composer}
        initialVouches={received}
      >
        <section className="profile-surface">
          <div className="profile-cover" />
          <div className="profile-identity">
            <span className="profile-avatar">
              {profile.firstName[0]}
              {profile.lastName[0]}
            </span>
            <span className="online-dot" />
            <div className="profile-copy">
              <p className="eyebrow">Professional profile</p>
              <h1>
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="profile-headline">{profile.headline ?? 'VouchNet member'}</p>
              <p>{profile.location ?? 'Location not listed'} · Contact info</p>
            </div>
          </div>
          <div className="profile-actions">
            {profile.userId === actor.userId ? (
              <>
                <Link className="primary" href="/onboarding">
                  Add profile section
                </Link>
                <Link className="secondary" href="/settings/visibility">
                  Open to
                </Link>
              </>
            ) : (
              <>
                <RelationshipActions userId={profile.userId} />
                <VouchTrigger origin="vouch-profile-actions" />
              </>
            )}
          </div>
        </section>
        {profile.userId === actor.userId ? (
          <>
            <section className="profile-metrics">
              <article>
                <strong>—</strong>
                <span>Profile views</span>
                <small>Last 30 days</small>
              </article>
              <article>
                <strong>—</strong>
                <span>Post impressions</span>
                <small>Available after publishing</small>
              </article>
              <article>
                <strong>—</strong>
                <span>Search appearances</span>
                <small>Privacy-respecting analytics</small>
              </article>
            </section>
            <Link
              className="secondary profile-analytics-link"
              href={`/in/${profile.slug}/analytics`}
            >
              Open profile analytics
            </Link>
          </>
        ) : null}
        <section className="profile-section profile-featured">
          <h2>Featured work</h2>
          {featuredNodes.length === 0 ? (
            <p>Featured proof-of-work nodes appear here when this member selects them.</p>
          ) : (
            <div>
              {featuredNodes.map((node) => (
                <article key={node.id}>
                  <strong>{node.label}</strong>
                  <p>{node.projectSummary ?? 'Featured professional evidence.'}</p>
                  {node.projectSlug === null ? null : (
                    <Link href={`/projects/${node.projectSlug}`}>Open proof →</Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="profile-section profile-featured profile-projects">
          <h2>Projects</h2>
          {projects.length === 0 ? (
            <p>
              {profile.userId === actor.userId ? (
                <>
                  Projects you own or contribute to appear here.{' '}
                  <Link href="/projects">Add a project</Link>
                </>
              ) : (
                'Projects this member builds or contributes to appear here.'
              )}
            </p>
          ) : (
            <div>
              {projects.map((project) => (
                <article key={project.id}>
                  <div className="project-card-topline">
                    <span>{projectStatusLabels[project.status]}</span>
                    <span>{project.relation === 'OWNER' ? 'Owner' : 'Contributor'}</span>
                  </div>
                  <strong>{project.name}</strong>
                  <p>{project.summary}</p>
                  <Link href={`/projects/${project.slug}`}>Open project →</Link>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="profile-section">
          <h2>About</h2>
          <p>{profile.about ?? 'This member has not added an about section yet.'}</p>
        </section>
        <section className="profile-section">
          <h2>Experience & education</h2>
          <p>
            Structured experience, education, credentials, and verified organization links are shown
            here as members add them.
          </p>
        </section>
        <TrustModule constellation={constellation} signInHref={null} />
        <ReputationSummary reputation={reputation} isOwner={isOwner} />
        {vouchData.vouches.length === 0 ? null : (
          <ProfileVouchRoster
            isOwner={isOwner}
            isVisible={vouchData.displayVouches}
            vouches={vouchData.vouches}
          />
        )}
      </VouchBoard>
    </Shell>
  );
}

function PublicProfile({
  profile,
  vouchData,
  featuredNodes,
  projects,
  trust,
  reputation,
}: {
  trust: React.ReactNode;
  reputation: React.ReactNode;
  profile: NonNullable<Awaited<ReturnType<typeof getVisibleProfile>>>;
  vouchData: Awaited<ReturnType<typeof getProfileVouches>>;
  featuredNodes: Awaited<ReturnType<typeof listFeaturedProofNodes>>;
  projects: Awaited<ReturnType<typeof listProfileProjects>>;
}) {
  return (
    <main className="public-profile">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/login">
            Sign in
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      <section className="public-profile-hero">
        <div className="profile-cover" />
        <div className="public-profile-identity">
          <span className="profile-avatar">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </span>
          <div>
            <p className="eyebrow">Professional profile</p>
            <h1>
              {profile.firstName} {profile.lastName}
            </h1>
            <p>{profile.headline ?? 'VouchNet member'}</p>
            <span>{profile.location ?? 'Location not listed'}</span>
          </div>
        </div>
      </section>
      <section className="public-profile-content">
        <article>
          <h2>About</h2>
          <p>{profile.about ?? 'This member has not added an about section yet.'}</p>
        </article>
        <aside>
          <h2>Credible professional context</h2>
          <p>
            VouchNet profiles are designed for real work, deliberate relationships, and public
            evidence.
          </p>
          <Link className="primary" href="/signup">
            Create your profile
          </Link>
        </aside>
      </section>
      {featuredNodes.length === 0 ? null : (
        <section className="public-profile-content public-vouch-section">
          <article>
            <p className="eyebrow">Featured proof of work</p>
            <h2>Selected professional evidence</h2>
            {featuredNodes.map((node) => (
              <div key={node.id}>
                <strong>{node.label}</strong>
                <p>{node.projectSummary ?? 'Featured professional evidence.'}</p>
                {node.projectSlug === null ? null : (
                  <Link href={`/projects/${node.projectSlug}`}>Open proof →</Link>
                )}
              </div>
            ))}
          </article>
        </section>
      )}
      {projects.length === 0 ? null : (
        <section className="public-profile-content public-vouch-section">
          <article>
            <p className="eyebrow">Building in public</p>
            <h2>Projects</h2>
            {projects.map((project) => (
              <div key={project.id}>
                <strong>{project.name}</strong>
                <p>
                  {projectStatusLabels[project.status]} ·{' '}
                  {project.relation === 'OWNER' ? 'Owner' : 'Contributor'} · {project.summary}
                </p>
                <Link href={`/projects/${project.slug}`}>Open project →</Link>
              </div>
            ))}
          </article>
        </section>
      )}
      <section className="public-profile-content public-trust-section">
        <article>
          {trust}
          {reputation}
        </article>
      </section>
      {vouchData.displayVouches && vouchData.vouches.length > 0 ? (
        <section className="public-profile-content public-vouch-section">
          <ProfileVouchRoster
            isOwner={false}
            isVisible={vouchData.displayVouches}
            vouches={vouchData.vouches}
          />
        </section>
      ) : null}
    </main>
  );
}
