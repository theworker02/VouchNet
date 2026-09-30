import Link from 'next/link';
import { Shell } from '../components/shell';
import { getCurrentActor, getProfileSummary } from '../lib/identity';
import { getNetworkOverview } from '../lib/social';
import { FeedClient } from '../modules/posts/feed-client';
export default function Home() {
  return <HomeContent />;
}

async function HomeContent() {
  const actor = await getCurrentActor();
  // Shell performs the redirect; the fallback keeps this component type-safe.
  if (actor === null) return null;
  const [profile, network] = await Promise.all([
    getProfileSummary(actor.userId),
    getNetworkOverview(actor.userId),
  ]);
  return (
    <Shell>
      <section className="home-layout">
        <aside className="home-sidebar">
          <section className="member-card">
            <div className="member-card-cover" />
            <div className="member-avatar" aria-hidden="true">
              {profile?.fullName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() ?? 'N'}
            </div>
            <div className="member-card-body">
              <h2>{profile?.fullName ?? 'VouchNet member'}</h2>
              <p>{profile?.headline ?? 'Add a professional headline'}</p>
              <Link href="/onboarding">Edit profile</Link>
            </div>
            <div className="member-card-stats">
              <Link href="/network">
                <span>Contacts</span>
                <strong>{network.contactCount}</strong>
              </Link>
              <Link href="/network">
                <span>Following</span>
                <strong>{network.followingCount}</strong>
              </Link>
            </div>
          </section>
          <section className="sidebar-links">
            <Link href="/projects">My projects</Link>
            <Link href="/saved">Saved items</Link>
          </section>
        </aside>
        <section className="feed-column">
          <section className="home-intro">
            <p className="eyebrow">Your professional space</p>
            <h1>
              {profile === null
                ? 'Welcome to VouchNet.'
                : `Welcome back, ${profile.fullName.split(' ')[0]}.`}
            </h1>
            <p>
              Share work in a chronological feed, or switch to peer-verified signal when you want
              the strongest professional contributions first.
            </p>
            <div className="actions">
              <Link className="primary" href="/onboarding">
                Complete your profile
              </Link>
              <Link className="secondary" href="/network/discover">
                Discover people
              </Link>
            </div>
          </section>
          <FeedClient />
        </section>
        <aside className="home-rail">
          <section className="rail-card">
            <h2>Build your network</h2>
            <p>
              {network.pendingReceivedCount} pending invitation
              {network.pendingReceivedCount === 1 ? '' : 's'}.
            </p>
            <Link href="/network">Review network</Link>
          </section>
          <section className="rail-card">
            <h2>Discover people</h2>
            <p>Find professional introductions with explainable relationship signals.</p>
            <Link href="/network/discover">View suggestions</Link>
          </section>
        </aside>
      </section>
    </Shell>
  );
}
