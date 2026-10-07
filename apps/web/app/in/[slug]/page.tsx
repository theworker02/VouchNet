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
import { getProfileIntent } from '../../lib/build-discovery';
import { profileIntentLabels } from '../../lib/profile-intent';
import { publicVerificationBadge } from '../../lib/identity-verification';
import { IdentityVerifiedBadge } from '../../components/identity-verified-badge';
import {
  getProfileRate,
  listExperiences,
  listProfileServices,
  listServiceRequests,
} from '../../lib/profile-services';
import { employmentTypeLabels, monthLabels } from '../../lib/profile-catalog';
import { ExperienceEditor } from '../../components/experience-editor';
import { LanguagesEditor } from '../../components/languages-panel';
import { rateLabel, ServicesEditor } from '../../components/services-panel';
import { RequestServiceButton } from '../../components/request-service';
import { ServiceRequestsInbox } from '../../components/service-requests-inbox';
import { Badge3d } from '../../components/badge-3d';

function verifiedBadge(badge: Awaited<ReturnType<typeof publicVerificationBadge>>) {
  if (badge === null) return null;
  return (
    <IdentityVerifiedBadge
      method={badge.method}
      verifiedDateLabel={badge.verifiedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}
    />
  );
}

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
    intent,
    verificationBadge,
    experiences,
    services,
    profileRate,
    serviceRequests,
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
    getProfileIntent(profile.userId).catch(() => null),
    publicVerificationBadge(profile.userId).catch(() => null),
    listExperiences(profile.userId).catch(() => []),
    listProfileServices(profile.userId, isOwner).catch(() => []),
    getProfileRate(profile.userId).catch(() => null),
    isOwner ? listServiceRequests(profile.userId, 'received').catch(() => []) : Promise.resolve([]),
  ]);
  const intentLabel = intent === null ? null : profileIntentLabels[intent];
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
          intentLabel={intentLabel}
          experiences={experiences}
          services={services}
          profileRate={profileRate}
          verificationBadge={verificationBadge}
          badge={verifiedBadge(verificationBadge)}
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
              {verifiedBadge(verificationBadge)}
              <p className="profile-headline">{profile.headline ?? 'VouchNet member'}</p>
              {intentLabel === null ? null : (
                <p className="profile-intent">
                  <span className="discover-intent-chip">{intentLabel}</span>
                  {isOwner ? <Link href="/discover">Change</Link> : null}
                </p>
              )}
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
        {isOwner || profile.languages.length > 0 ? (
          <section className="profile-section">
            <h2>Languages</h2>
            {isOwner ? (
              <LanguagesEditor initial={profile.languages} />
            ) : (
              <div className="language-chip-list">
                {profile.languages.map((language) => (
                  <span className="language-chip is-active" key={language}>
                    {language}
                  </span>
                ))}
              </div>
            )}
          </section>
        ) : null}
        <section className="profile-section">
          <h2>Experience</h2>
          {isOwner ? (
            <ExperienceEditor initial={experiences} />
          ) : experiences.length === 0 ? (
            <p>Experience entries appear here when this member adds them.</p>
          ) : (
            experiences.map((entry) => (
              <article className="experience-entry" key={entry.id}>
                <div>
                  <strong>{entry.title}</strong>
                  <p>
                    {entry.organization} · {employmentTypeLabels[entry.employmentType]}
                  </p>
                  <span>
                    {entry.startMonth === null ? '' : `${monthLabels[entry.startMonth - 1]} `}
                    {entry.startYear} —{' '}
                    {entry.isCurrent
                      ? 'Present'
                      : `${entry.endMonth === null ? '' : `${monthLabels[entry.endMonth - 1]} `}${entry.endYear ?? ''}`}
                    {entry.location === null || entry.location === '' ? '' : ` · ${entry.location}`}
                  </span>
                  {entry.description === null ? null : <p>{entry.description}</p>}
                </div>
              </article>
            ))
          )}
        </section>
        {isOwner || services.length > 0 || profileRate?.visible === true ? (
          <section className="profile-section profile-services">
            <h2>Services</h2>
            {profileRate?.visible === true && profileRate.amount !== null ? (
              <p className="profile-rate-chip">
                ${Number(profileRate.amount).toLocaleString()} {profileRate.currency}/hour
              </p>
            ) : null}
            {isOwner ? (
              <ServicesEditor
                services={services}
                hourlyRate={profileRate?.amount ?? null}
                rateVisible={profileRate?.visible ?? false}
              />
            ) : (
              <>
                {services.map((service) => (
                  <article className="experience-entry" key={service.id}>
                    <div>
                      <strong>{service.title}</strong>
                      {service.description === null ? null : <p>{service.description}</p>}
                      <span>{rateLabel(service) ?? 'Rate on request'}</span>
                    </div>
                  </article>
                ))}
                <RequestServiceButton
                  providerUserId={profile.userId}
                  providerName={profile.firstName}
                  services={services}
                  signInHref={
                    viewerId === null
                      ? `/login?next=${encodeURIComponent(`/in/${profile.slug}`)}`
                      : null
                  }
                />
              </>
            )}
          </section>
        ) : null}
        {isOwner && serviceRequests.length > 0 ? (
          <section className="profile-section">
            <h2>Service requests</h2>
            <ServiceRequestsInbox
              requests={serviceRequests.map((r) => ({
                ...r,
                createdAt: r.createdAt.toISOString(),
              }))}
            />
          </section>
        ) : null}
        {profile.earlyMember || verificationBadge !== null || profile.isPlus ? (
          <section className="profile-section profile-badges">
            <h2>Badges</h2>
            <div className="profile-badge-shelf">
              {profile.earlyMember ? <Badge3d kind="early" /> : null}
              {verificationBadge !== null ? (
                <Badge3d
                  kind="verified"
                  detail={`Verified ${verificationBadge.verifiedAt.toLocaleDateString()}`}
                />
              ) : null}
              {profile.isPlus ? <Badge3d kind="plus" /> : null}
            </div>
          </section>
        ) : null}
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
  intentLabel,
  badge,
  experiences,
  services,
  profileRate,
  verificationBadge,
}: {
  intentLabel: string | null;
  badge: React.ReactNode;
  trust: React.ReactNode;
  reputation: React.ReactNode;
  profile: NonNullable<Awaited<ReturnType<typeof getVisibleProfile>>>;
  vouchData: Awaited<ReturnType<typeof getProfileVouches>>;
  featuredNodes: Awaited<ReturnType<typeof listFeaturedProofNodes>>;
  projects: Awaited<ReturnType<typeof listProfileProjects>>;
  experiences: Awaited<ReturnType<typeof listExperiences>>;
  services: Awaited<ReturnType<typeof listProfileServices>>;
  profileRate: Awaited<ReturnType<typeof getProfileRate>> | null;
  verificationBadge: Awaited<ReturnType<typeof publicVerificationBadge>>;
}) {
  const siteUrl = process.env.APP_URL?.trim() || 'https://vouchnet.dev';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `${profile.firstName} ${profile.lastName}`,
    url: `${siteUrl}/in/${profile.slug}`,
    ...(profile.headline === null ? {} : { jobTitle: profile.headline }),
    ...(profile.about === null ? {} : { description: profile.about }),
  };
  return (
    <main className="public-profile">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
            {badge}
            <p>{profile.headline ?? 'VouchNet member'}</p>
            {intentLabel === null ? null : (
              <p className="profile-intent">
                <span className="discover-intent-chip">{intentLabel}</span>
              </p>
            )}
            <span>{profile.location ?? 'Location not listed'}</span>
          </div>
        </div>
      </section>
      <section className="public-profile-content">
        <article>
          <h2>About</h2>
          <p>{profile.about ?? 'This member has not added an about section yet.'}</p>
          {profile.languages.length === 0 ? null : (
            <div className="language-chip-list">
              {profile.languages.map((language) => (
                <span className="language-chip is-active" key={language}>
                  {language}
                </span>
              ))}
            </div>
          )}
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
      {experiences.length === 0 ? null : (
        <section className="public-profile-content public-vouch-section">
          <article>
            <p className="eyebrow">Experience</p>
            <h2>Work history</h2>
            {experiences.map((entry) => (
              <div key={entry.id}>
                <strong>{entry.title}</strong>
                <p>
                  {entry.organization} · {employmentTypeLabels[entry.employmentType]} ·{' '}
                  {entry.startYear} — {entry.isCurrent ? 'Present' : (entry.endYear ?? '')}
                </p>
              </div>
            ))}
          </article>
        </section>
      )}
      {services.length === 0 &&
      !(profileRate?.visible === true && profileRate.amount !== null) ? null : (
        <section className="public-profile-content public-vouch-section">
          <article>
            <p className="eyebrow">Services</p>
            <h2>Hire {profile.firstName}</h2>
            {profileRate?.visible === true && profileRate.amount !== null ? (
              <p className="profile-rate-chip">
                ${Number(profileRate.amount).toLocaleString()} {profileRate.currency}/hour
              </p>
            ) : null}
            {services.map((service) => (
              <div key={service.id}>
                <strong>{service.title}</strong>
                <p>
                  {service.description ?? ''}
                  {rateLabel(service) === null ? ' Rate on request.' : ` ${rateLabel(service)}.`}
                </p>
              </div>
            ))}
            <RequestServiceButton
              providerUserId={profile.userId}
              providerName={profile.firstName}
              services={services}
              signInHref={`/login?next=${encodeURIComponent(`/in/${profile.slug}`)}`}
            />
          </article>
        </section>
      )}
      {profile.earlyMember || verificationBadge !== null || profile.isPlus ? (
        <section className="public-profile-content public-vouch-section">
          <article>
            <p className="eyebrow">Badges</p>
            <div className="profile-badge-shelf">
              {profile.earlyMember ? <Badge3d kind="early" /> : null}
              {verificationBadge !== null ? (
                <Badge3d
                  kind="verified"
                  detail={`Verified ${verificationBadge.verifiedAt.toLocaleDateString()}`}
                />
              ) : null}
              {profile.isPlus ? <Badge3d kind="plus" /> : null}
            </div>
          </article>
        </section>
      ) : null}
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
