'use client';

import { useState } from 'react';

const STARTING_HEAPS = [3, 5, 7];

type Outcome = 'PLAYING' | 'HUMAN' | 'ENGINE';

function nimSum(heaps: number[]): number {
  return heaps.reduce((acc, heap) => acc ^ heap, 0);
}

function engineMove(heaps: number[]): { heap: number; take: number } {
  const sum = nimSum(heaps);
  if (sum !== 0) {
    for (let heap = 0; heap < heaps.length; heap += 1) {
      const size = heaps[heap]!;
      const target = size ^ sum;
      if (target < size) return { heap, take: size - target };
    }
  }
  const nonEmpty = heaps.findIndex((heap) => heap > 0);
  return { heap: nonEmpty, take: 1 };
}

export function NimClient() {
  const [heaps, setHeaps] = useState<number[]>(STARTING_HEAPS);
  const [outcome, setOutcome] = useState<Outcome>('PLAYING');
  const [thinking, setThinking] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0 });

  const totalStones = heaps.reduce((a, b) => a + b, 0);

  function humanTake(heapIndex: number, leaving: number) {
    if (outcome !== 'PLAYING' || thinking || leaving >= (heaps[heapIndex] ?? 0) || leaving < 0)
      return;
    const next = [...heaps];
    next[heapIndex] = leaving;
    setHeaps(next);
    if (next.every((heap) => heap === 0)) {
      setOutcome('HUMAN');
      setStats((s) => ({ ...s, wins: s.wins + 1 }));
      return;
    }
    setThinking(true);
    setTimeout(() => {
      const move = engineMove(next);
      const after = [...next];
      after[move.heap] = (after[move.heap] ?? 0) - move.take;
      setHeaps(after);
      setThinking(false);
      if (after.every((heap) => heap === 0)) {
        setOutcome('ENGINE');
        setStats((s) => ({ ...s, losses: s.losses + 1 }));
      }
    }, 320);
  }

  function reset() {
    setHeaps(STARTING_HEAPS);
    setOutcome('PLAYING');
    setThinking(false);
  }

  const status =
    outcome === 'HUMAN'
      ? 'You took the last stone — you win.'
      : outcome === 'ENGINE'
        ? 'The engine took the last stone. The winning move is in the nim-sum.'
        : thinking
          ? 'Engine is thinking…'
          : `${totalStones} stones on the table. Take from any one heap.`;

  return (
    <div className="nim-game">
      <div className="nim-heaps">
        {heaps.map((count, heapIndex) => (
          <div className="nim-heap" key={heapIndex}>
            <span className="nim-heap-label">Heap {heapIndex + 1}</span>
            <div
              className="nim-stones"
              role="group"
              aria-label={`Heap ${heapIndex + 1}: ${count} stones`}
            >
              {Array.from({ length: count }, (_, stone) => (
                <button
                  aria-label={`Take stone ${stone + 1} of heap ${heapIndex + 1}`}
                  className="nim-stone"
                  disabled={outcome !== 'PLAYING' || thinking}
                  key={stone}
                  type="button"
                  title="Take this stone and everything above it"
                  onClick={() => humanTake(heapIndex, stone)}
                />
              ))}
            </div>
            <span className="nim-heap-count">{count}</span>
          </div>
        ))}
      </div>
      <footer className="strategy-game-controls">
        <p aria-live="polite">
          {status}
          <span className="nim-hint"> Click a stone to take it and everything above it.</span>
        </p>
        <div className="connect-four-scoreline">
          <span>You {stats.wins}</span>
          <span>Engine {stats.losses}</span>
          <button className="secondary" type="button" onClick={reset}>
            New game
          </button>
        </div>
      </footer>
    </div>
  );
}
