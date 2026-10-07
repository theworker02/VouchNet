import Link from 'next/link';
import type { Metadata } from 'next';
import { Shell } from '../components/shell';
import { getCurrentActor } from '../lib/identity';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Strategy games',
  description: 'Short, original strategy games for VouchNet members — no ads, no dark patterns.',
  robots: { index: false, follow: false },
};

const games = [
  {
    href: '/games/daily',
    kicker: 'Daily puzzle',
    title: 'Signal grid',
    description:
      'Invert relays to recreate the target pattern inside a move budget. A harder board every day.',
    meta: 'Daily · vs the board',
  },
  {
    href: '/games/connect-four',
    kicker: 'Classic strategy',
    title: 'Four in a row',
    description:
      'Drop pieces into the columns and connect four before the engine does. It looks ahead — so should you.',
    meta: 'Anytime · vs the engine',
  },
  {
    href: '/games/nim',
    kicker: 'Classic strategy',
    title: 'Last stone loses… or wins',
    description:
      'Take stones from one heap at a time. Force the engine into a losing position with a little binary thinking.',
    meta: 'Anytime · vs the engine',
  },
];

export default async function GamesPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  return (
    <Shell>
      <main className="strategy-game-page">
        <section className="strategy-game" aria-labelledby="games-title">
          <header className="strategy-game-header">
            <div>
              <p className="eyebrow">VouchNet arcade</p>
              <h1 id="games-title">Strategy games</h1>
              <p>
                Short strategy games for members. No ads, no streak pressure — just a board and a
                better move.
              </p>
            </div>
          </header>
          <div className="games-hub-grid">
            {games.map((game) => (
              <Link className="games-hub-card" href={game.href} key={game.href}>
                <span className="games-hub-kicker">{game.kicker}</span>
                <strong>{game.title}</strong>
                <p>{game.description}</p>
                <span className="games-hub-meta">{game.meta} →</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
