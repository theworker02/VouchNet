'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toggleSignalCell, type DailyStrategyGame } from '../lib/daily-strategy-game';
import type { DailyStrategyProgress } from '../lib/daily-strategy';
import { ProofOfWorkBadge, SignalPulseIcon } from '../components/symbols';
import { useMotionPreference } from '../lib/motion';

type GameState = 'READY' | 'SAVING' | 'COMPLETE' | 'ERROR';

function boardMatches(left: readonly boolean[], right: readonly boolean[]) {
  return left.every((cell, index) => cell === right[index]);
}

export function StrategyGameClient({
  game,
  progress,
}: {
  game: DailyStrategyGame;
  progress: DailyStrategyProgress;
}) {
  const emptyBoard = useMemo(
    () => Array<boolean>(game.boardSize * game.boardSize).fill(false),
    [game.boardSize],
  );
  const [board, setBoard] = useState(emptyBoard);
  const [moves, setMoves] = useState<number[]>([]);
  const [state, setState] = useState<GameState>(progress === null ? 'READY' : 'COMPLETE');
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const motionPreference = useMotionPreference();
  const [message, setMessage] = useState<string | null>(
    progress === null
      ? null
      : `Completed in ${progress.moveCount} moves. Return tomorrow for a tougher grid.`,
  );
  const completed = progress !== null || state === 'COMPLETE';
  const solved = boardMatches(board, game.target);
  const movesRemaining = game.moveBudget - moves.length;

  async function recordCompletion(nextMoves: number[], elapsedMs: number) {
    setState('SAVING');
    try {
      const response = await fetch('/api/games/daily', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date: game.date,
          moves: nextMoves,
          elapsedMs,
        }),
      });
      if (!response.ok) throw new Error('DAILY_GAME_SAVE_FAILED');
      setState('COMPLETE');
      setCelebrationVisible(true);
      setMessage(
        `Signal restored in ${nextMoves.length} moves. Tomorrow’s board will be ready at midnight UTC.`,
      );
    } catch {
      setState('ERROR');
      setMessage(
        'The board is solved, but we could not record it. Check your connection and try again.',
      );
    }
  }

  function selectCell(index: number) {
    if (completed || state === 'SAVING' || movesRemaining <= 0) return;
    const nextMoves = [...moves, index];
    const nextBoard = toggleSignalCell(board, game.boardSize, index);
    setBoard(nextBoard);
    setMoves(nextMoves);
    if (boardMatches(nextBoard, game.target)) {
      void recordCompletion(nextMoves, 0);
      return;
    }
    if (nextMoves.length >= game.moveBudget)
      setMessage(
        'Move budget reached. Reset the board and use the target pattern to plan another route.',
      );
  }

  function reset() {
    if (completed || state === 'SAVING') return;
    setBoard(emptyBoard);
    setMoves([]);
    setMessage(null);
  }

  return (
    <section className="strategy-game" aria-labelledby="daily-game-title">
      <header className="strategy-game-header">
        <div>
          <p className="eyebrow">Daily strategy puzzle</p>
          <h1 id="daily-game-title">{game.title}</h1>
          <p>
            Tap a relay to invert it and its four orthogonal neighbors. Recreate the target grid
            before you exhaust the move budget.
          </p>
        </div>
        <div className="strategy-game-level" aria-label={`${game.difficultyLabel} difficulty`}>
          <SignalPulseIcon size="lg" />
          <span>{game.difficultyLabel}</span>
          <strong>Level {game.difficulty}</strong>
        </div>
      </header>
      <div className="strategy-game-objective" role="note">
        <strong>Goal</strong>
        <span>Match the target pattern in {game.moveBudget} moves or fewer.</span>
      </div>
      <div className="strategy-boards">
        <section aria-label="Target signal grid">
          <div className="strategy-board-heading">
            <h2>Target</h2>
            <span>Read-only pattern</span>
          </div>
          <div
            className="strategy-grid strategy-grid--target"
            style={{ '--board-size': game.boardSize } as CSSProperties}
          >
            {game.target.map((active, index) => (
              <span className={active ? 'signal-cell is-active' : 'signal-cell'} key={index} />
            ))}
          </div>
        </section>
        <section aria-label="Your signal grid">
          <div className="strategy-board-heading">
            <h2>Your grid</h2>
            <span>{completed ? 'Completed' : `${movesRemaining} moves remaining`}</span>
          </div>
          <div
            className="strategy-grid"
            role="group"
            aria-label="Interactive signal grid"
            style={{ '--board-size': game.boardSize } as CSSProperties}
          >
            {board.map((active, index) => (
              <button
                aria-label={`Relay ${index + 1}${active ? ', active' : ', inactive'}`}
                aria-pressed={active}
                className={active ? 'signal-cell is-active' : 'signal-cell'}
                disabled={completed || state === 'SAVING' || movesRemaining <= 0}
                key={index}
                type="button"
                onClick={() => selectCell(index)}
              />
            ))}
          </div>
        </section>
      </div>
      <footer className="strategy-game-controls">
        <p aria-live="polite">
          {message ??
            (solved ? 'Signal matched. Recording your completion…' : 'Every move changes a cross.')}
        </p>
        <button
          className="secondary"
          disabled={completed || state === 'SAVING'}
          type="button"
          onClick={reset}
        >
          Reset board
        </button>
      </footer>
      <AnimatePresence>
        {celebrationVisible ? (
          <motion.aside
            aria-labelledby="daily-game-complete-title"
            aria-live="polite"
            className="strategy-game-complete"
            initial={motionPreference.reducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              motionPreference.reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }
            }
            role="status"
            transition={motionPreference.spring}
          >
            <ProofOfWorkBadge glowing size="lg" />
            <div>
              <p className="eyebrow">Signal restored</p>
              <h2 id="daily-game-complete-title">Today’s strategy puzzle is complete.</h2>
              <p>Your verified result is saved. A harder board arrives tomorrow.</p>
            </div>
            <button type="button" onClick={() => setCelebrationVisible(false)}>
              Continue
            </button>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
