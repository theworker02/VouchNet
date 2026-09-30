import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../../components/shell';
import { getCurrentActor, getProfileSummary } from '../../../lib/identity';
import { getProfileAnalytics } from '../../../lib/profile-analytics';
import { hasVouchNetPlus } from '../../../lib/subscription';

export default async function ProfileAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login');
  const [profile, slug] = await Promise.all([
    getProfileSummary(actor.userId),
    params.then(({ slug }) => slug),
  ]);
  if (profile === null || profile.slug !== slug) notFound();
  const [isPlus, analytics] = await Promise.all([
    hasVouchNetPlus(actor.userId),
    getProfileAnalytics(actor.userId),
  ]);
  return (
    <Shell>
      <main className="analytics-page">
        <header className="analytics-heading">
          <div>
            <p className="eyebrow">Profile signal analytics</p>
            <h1>Understand where your professional signal travels.</h1>
            <p>
              Only authenticated profile visits are counted. Raw search terms, IP addresses, and
              device fingerprints are not collected.
            </p>
          </div>
          <Link className="secondary" href={`/vouch/${profile.slug}`}>
            View profile
          </Link>
        </header>
        <section
          className={isPlus ? 'analytics-summary' : 'analytics-summary analytics-summary--locked'}
        >
          <article>
            <strong>{analytics.viewsLast30Days}</strong>
            <span>Profile views</span>
            <small>Last 30 days</small>
          </article>
          <article>
            <strong>{analytics.viewersLast30Days}</strong>
            <span>Distinct members</span>
            <small>Last 30 days</small>
          </article>
          <article>
            <strong>{analytics.viewsLast90Days}</strong>
            <span>Views in the ledger</span>
            <small>Last 90 days</small>
          </article>
        </section>
        {isPlus ? (
          <section className="analytics-ledger">
            <div className="section-heading">
              <div>
                <p className="eyebrow">VouchNet+ detail</p>
                <h2>Recent member views</h2>
              </div>
            </div>
            {analytics.recentViewers.length === 0 ? (
              <p className="empty">
                Your view ledger will appear as authenticated members visit this profile.
              </p>
            ) : (
              <ul>
                {analytics.recentViewers.map((viewer, index) => (
                  <li key={`${viewer.fullName}-${viewer.viewedAt.toISOString()}-${index}`}>
                    <div>
                      <strong>{viewer.fullName}</strong>
                      <span>{viewer.headline ?? 'VouchNet member'}</span>
                    </div>
                    <time dateTime={viewer.viewedAt.toISOString()}>
                      {viewer.viewedAt.toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="plus-gate">
            <p className="eyebrow">VouchNet+ · $4.55/month</p>
            <h2>Unlock your 90-day member view ledger.</h2>
            <p>
              VouchNet+ reveals attributable member views and their published professional headline.
              It does not expose private contact data, raw search terms, IP addresses, or device
              fingerprints.
            </p>
            <Link className="primary" href="/settings/account">
              View VouchNet+ availability
            </Link>
          </section>
        )}
      </main>
    </Shell>
  );
}
