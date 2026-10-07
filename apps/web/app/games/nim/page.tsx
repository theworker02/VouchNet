import type { Metadata } from 'next';
import Link from 'next/link';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { NimClient } from './nim-client';

export const metadata: Metadata = {
  title: 'Nim | Strategy games',
  robots: { index: false, follow: false },
};

export default async function NimPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  return (
    <Shell>
      <main className="strategy-game-page">
        <section className="strategy-game" aria-labelledby="nim-title">
          <header className="strategy-game-header">
            <div>
              <p className="eyebrow">Strategy games</p>
              <h1 id="nim-title">Nim</h1>
              <p>
                Take any number of stones from a single heap. Whoever takes the last stone wins. The
                engine plays a strong game — beat it by controlling the position.{' '}
                <Link href="/games">All games</Link>
              </p>
            </div>
          </header>
          <NimClient />
        </section>
      </main>
    </Shell>
  );
}
