import Link from 'next/link';
import { Shell } from '../components/shell';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { getNetworkOverview } from '../lib/social';
import { listHiringOrganizations, listPublicJobs } from '../lib/directory';
import { FeedClient } from '../modules/posts/feed-client';
import { HomeProfileCard } from '../components/home-profile-card';
export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const actor = await getCurrentActor();
  // Shell performs the redirect; the fallback keeps this component type-safe.
  if (actor === null) return null;
  const [profile, network, hiringOrganizations, jobs] = await Promise.all([
    getProfileSummary(actor.userId),
    getNetworkOverview(actor.userId),
    listHiringOrganizations(),
    listPublicJobs(),
  ]);
  const technicalTopics = Array.from(new Set(jobs.flatMap((job) => job.skillTags))).slice(0, 4);
  return (
    <Shell>
      <section className="home-layout">
        <aside className="home-sidebar">
          <HomeProfileCard
            contactCount={network.contactCount}
            followingCount={network.followingCount}
            profile={profile}
          />
          <section className="sidebar-links">
            <span className="sidebar-label">Your workspace</span>
            <Link href="/projects">My projects</Link>
            <Link href="/saved">Saved items</Link>
            <Link href="/settings">Settings & privacy</Link>
          </section>
        </aside>
        <section className="feed-column">
          <section className="home-intro">
            <div className="home-intro-topline">
              <p className="eyebrow">Your professional workspace</p>
              <span>Private by default</span>
            </div>
            <h1>
              {profile === null
                ? 'Welcome to VouchNet.'
                : `Welcome back, ${profile.fullName.split(' ')[0]}.`}
            </h1>
            <p>
              Put thoughtful work in front of the right people—with a feed designed for useful
              context, not constant noise.
            </p>
            <div className="actions">
              <Link className="primary" href="/onboarding">
                Finish your profile
              </Link>
              <Link className="secondary" href="/network/discover">
                Discover people
              </Link>
            </div>
          </section>
          <FeedClient />
        </section>
        <aside className="home-rail">
          <section className="rail-card rail-card--topics">
            <p className="rail-label">Technical conversations</p>
            <h2>Explore current work signals.</h2>
            {technicalTopics.length === 0 ? (
              <p>Follow people or publish a note to shape the conversations you see here.</p>
            ) : (
              <ul className="rail-topic-list">
                {technicalTopics.map((topic) => (
                  <li key={topic}>
                    <Link href={`/jobs?q=${encodeURIComponent(topic)}`}>#{topic}</Link>
                    <span>Source-linked roles</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/search">Explore people</Link>
          </section>
          <section className="rail-card rail-card--hiring">
            <p className="rail-label">Source-reviewed companies hiring</p>
            <h2>Public opportunities with context.</h2>
            {hiringOrganizations.length === 0 ? (
              <p>Source-reviewed organizations appear here as listings are added.</p>
            ) : (
              <ul className="rail-company-list">
                {hiringOrganizations.map((organization) => (
                  <li key={organization.slug}>
                    <span className="rail-company-monogram" aria-hidden="true">
                      {organization.name.slice(0, 1)}
                    </span>
                    <div>
                      <Link href={`/company/${organization.slug}`}>{organization.name}</Link>
                      <span>
                        {organization.openRoleCount} open role
                        {organization.openRoleCount === 1 ? '' : 's'} ·{' '}
                        {organization.technologies.slice(0, 2).join(' · ') || 'Technical work'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/jobs">Browse all roles</Link>
          </section>
          <section className="rail-card rail-card--proof">
            <p className="rail-label">Proof-of-work spotlight</p>
            <h2>Make the work behind your profile visible.</h2>
            <p>
              Add a project, source link, or shipped outcome so future connections have real
              context—not a résumé keyword list.
            </p>
            <Link href="/projects">Add a project</Link>
          </section>
          <section className="rail-card rail-principle">
            <span aria-hidden="true">✓</span>
            <p>
              <strong>Humans participate.</strong> AI may assist with drafts, but never quietly acts
              as you.
            </p>
          </section>
        </aside>
      </section>
    </Shell>
  );
}
