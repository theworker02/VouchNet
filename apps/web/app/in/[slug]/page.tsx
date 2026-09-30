import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { getVisibleProfile } from '../../lib/people';
import { RelationshipActions } from '../../components/relationship-actions';

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
    alternates: { canonical: `/in/${profile.slug}` },
    openGraph: { title: `${name} | VouchNet`, description, type: 'profile' },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  const profile = await getVisibleProfile(actor?.userId ?? null, (await params).slug);
  if (profile === null) notFound();
  if (actor === null) return <PublicProfile profile={profile} />;
  return (
    <Shell>
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
            <RelationshipActions userId={profile.userId} />
          )}
        </div>
      </section>
      {profile.userId === actor.userId ? (
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
      ) : null}
      <section className="profile-section profile-featured">
        <h2>Featured work</h2>
        <div>
          <article>
            <strong>Projects</strong>
            <p>
              Feature portfolio links, presentations, evidence, and collaborators from your profile.
            </p>
          </article>
          <article>
            <strong>Proof of work</strong>
            <p>Peer verification appears alongside the work it confirms.</p>
          </article>
        </div>
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
      <section className="profile-section">
        <h2>Skills & peer verification</h2>
        <p>
          Skill evidence and verification are intentionally attached to projects and
          contributions—not anonymous counters.
        </p>
      </section>
    </Shell>
  );
}

function PublicProfile({
  profile,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getVisibleProfile>>>;
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
    </main>
  );
}
