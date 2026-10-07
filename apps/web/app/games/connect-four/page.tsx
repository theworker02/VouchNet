import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { ConnectFourClient } from './connect-four-client';

export const metadata: Metadata = {
  title: 'Four in a row | Strategy games',
  robots: { index: false, follow: false },
};

export default async function ConnectFourPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  return (
    <Shell>
      <main className="strategy-game-page">
        <section className="strategy-game" aria-labelledby="connect-four-title">
          <header className="strategy-game-header">
            <div>
              <p className="eyebrow">Strategy games</p>
              <h1 id="connect-four-title">Four in a row</h1>
              <p>
                You play blue, the engine plays violet. Connect four horizontally, vertically, or
                diagonally first. <Link href="/games">All games</Link>
              </p>
            </div>
          </header>
          <ConnectFourClient />
        </section>
      </main>
    </Shell>
  );
}
