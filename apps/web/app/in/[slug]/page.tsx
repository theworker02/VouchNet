import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { getVisibleProfile } from '../../lib/people';
import { RelationshipActions } from '../../components/relationship-actions';

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const profile = await getVisibleProfile(actor.userId, (await params).slug);
  if (profile === null) notFound();
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
