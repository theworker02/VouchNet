import type { Metadata } from 'next';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { getDailyStrategyGame, getDailyStrategyProgress } from '../../lib/daily-strategy';
import { StrategyGameClient } from './strategy-game-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Daily strategy puzzle',
  description: 'An original, short daily strategy puzzle for VouchNet members.',
  robots: { index: false, follow: false },
};

export default async function GamesPage() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const game = getDailyStrategyGame();
  const progress = await getDailyStrategyProgress(actor.userId, game.date);
  return (
    <Shell>
      <main className="strategy-game-page">
        <StrategyGameClient game={game} progress={progress} />
      </main>
    </Shell>
  );
}
