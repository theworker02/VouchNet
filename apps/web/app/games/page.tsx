import Link from 'next/link';
import type { Metadata } from 'next';
import { getTodayChallenge } from '../lib/directory';

// Daily content is editorial database state; it must not be captured at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily technical challenge | VouchNet',
  description: 'A short, platform-published technical challenge with a transparent solution.',
  alternates: { canonical: '/games' },
};

export default async function GamesPage() {
  const challenge = await getTodayChallenge();
  return (
    <main className="directory-page challenge-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/jobs">
            Jobs
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      {challenge === null ? (
        <section className="challenge-empty">
          <p className="eyebrow">Daily technical challenge</p>
          <h1>The next challenge is being prepared.</h1>
          <p>We publish only reviewed platform challenges; there is no simulated activity here.</p>
        </section>
      ) : (
        <article className="challenge-card">
          <div className="challenge-meta">
            <span>{challenge.category.toLowerCase()}</span>
            <span>{challenge.durationMinutes} minute self-check</span>
            <span>Published by VouchNet system</span>
          </div>
          <h1>{challenge.title}</h1>
          <p>{challenge.prompt}</p>
          {challenge.starterCode === null ? null : (
            <pre>
              <code>{challenge.starterCode}</code>
            </pre>
          )}
          <details>
            <summary>Reveal the reasoning</summary>
            <p>{challenge.solution}</p>
          </details>
        </article>
      )}
    </main>
  );
}
