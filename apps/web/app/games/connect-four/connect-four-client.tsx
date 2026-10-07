'use client';

import { useState } from 'react';

const ROWS = 6;
const COLS = 7;
const HUMAN = 1;
const ENGINE = 2;
const SEARCH_DEPTH = 6;

type Cell = 0 | 1 | 2;
type Board = Cell[];

const columnOrder = [3, 2, 4, 1, 5, 0, 6];

function emptyBoard(): Board {
  return Array<Cell>(ROWS * COLS).fill(0);
}

function dropRow(board: Board, column: number): number {
  for (let row = ROWS - 1; row >= 0; row -= 1) if (board[row * COLS + column] === 0) return row;
  return -1;
}

function validColumns(board: Board): number[] {
  return columnOrder.filter((column) => board[column] === 0);
}

function winningCells(board: Board, piece: Cell): number[] | null {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let row = 0; row < ROWS; row += 1)
    for (let column = 0; column < COLS; column += 1) {
      if (board[row * COLS + column] !== piece) continue;
      for (const direction of directions) {
        const dr = direction[0]!;
        const dc = direction[1]!;
        const cells = [0, 1, 2, 3].map((step) => (row + dr * step) * COLS + column + dc * step);
        const r3 = row + dr * 3;
        const c3 = column + dc * 3;
        if (r3 < 0 || r3 >= ROWS || c3 < 0 || c3 >= COLS) continue;
        if (cells.every((cell) => board[cell] === piece)) return cells;
      }
    }
  return null;
}

function countWindows(board: Board, piece: Cell): number {
  let score = 0;
  const windows: number[][] = [];
  for (let row = 0; row < ROWS; row += 1)
    for (let column = 0; column < COLS; column += 1)
      for (const direction of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const dr = direction[0]!;
        const dc = direction[1]!;
        const r3 = row + dr * 3;
        const c3 = column + dc * 3;
        if (r3 < 0 || r3 >= ROWS || c3 < 0 || c3 >= COLS) continue;
        windows.push([0, 1, 2, 3].map((step) => (row + dr * step) * COLS + column + dc * step));
      }
  for (const window of windows) {
    const own = window.filter((cell) => board[cell] === piece).length;
    const empty = window.filter((cell) => board[cell] === 0).length;
    const other = window.length - own - empty;
    if (other === 0) {
      if (own === 3) score += 6;
      else if (own === 2 && empty === 2) score += 2;
    }
  }
  for (let row = 0; row < ROWS; row += 1) if (board[row * COLS + 3] === piece) score += 3;
  return score;
}

function evaluate(board: Board): number {
  return countWindows(board, ENGINE) - countWindows(board, HUMAN);
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (winningCells(board, ENGINE) !== null) return 100_000 + depth;
  if (winningCells(board, HUMAN) !== null) return -100_000 - depth;
  const moves = validColumns(board);
  if (depth === 0 || moves.length === 0) return evaluate(board);
  if (maximizing) {
    let best = -Infinity;
    for (const column of moves) {
      const next = [...board];
      next[dropRow(next, column) * COLS + column] = ENGINE;
      best = Math.max(best, minimax(next, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const column of moves) {
    const next = [...board];
    next[dropRow(next, column) * COLS + column] = HUMAN;
    best = Math.min(best, minimax(next, depth - 1, alpha, beta, true));
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function engineColumn(board: Board): number {
  let bestScore = -Infinity;
  let bestColumn = validColumns(board)[0] ?? 0;
  for (const column of validColumns(board)) {
    const next = [...board];
    next[dropRow(next, column) * COLS + column] = ENGINE;
    const score = minimax(next, SEARCH_DEPTH - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }
  return bestColumn;
}

type Outcome = 'PLAYING' | 'HUMAN' | 'ENGINE' | 'DRAW';

export function ConnectFourClient() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [outcome, setOutcome] = useState<Outcome>('PLAYING');
  const [thinking, setThinking] = useState(false);
  const [highlight, setHighlight] = useState<number[]>([]);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });

  function finish(next: Board): Outcome {
    const humanWin = winningCells(next, HUMAN);
    if (humanWin !== null) {
      setHighlight(humanWin);
      return 'HUMAN';
    }
    const engineWin = winningCells(next, ENGINE);
    if (engineWin !== null) {
      setHighlight(engineWin);
      return 'ENGINE';
    }
    if (validColumns(next).length === 0) return 'DRAW';
    return 'PLAYING';
  }

  function play(column: number) {
    if (outcome !== 'PLAYING' || thinking) return;
    const row = dropRow(board, column);
    if (row < 0) return;
    const afterHuman = [...board];
    afterHuman[row * COLS + column] = HUMAN;
    const humanOutcome = finish(afterHuman);
    setBoard(afterHuman);
    setOutcome(humanOutcome);
    if (humanOutcome !== 'PLAYING') {
      setStats((s) => ({
        ...s,
        wins: humanOutcome === 'HUMAN' ? s.wins + 1 : s.wins,
        draws: humanOutcome === 'DRAW' ? s.draws + 1 : s.draws,
      }));
      return;
    }
    setThinking(true);
    setTimeout(() => {
      const columnChoice = engineColumn(afterHuman);
      const afterEngine = [...afterHuman];
      afterEngine[dropRow(afterEngine, columnChoice) * COLS + columnChoice] = ENGINE;
      const engineOutcome = finish(afterEngine);
      setBoard(afterEngine);
      setOutcome(engineOutcome);
      setThinking(false);
      setStats((s) => ({
        ...s,
        losses: engineOutcome === 'ENGINE' ? s.losses + 1 : s.losses,
        draws: engineOutcome === 'DRAW' ? s.draws + 1 : s.draws,
      }));
    }, 320);
  }

  function reset() {
    setBoard(emptyBoard());
    setOutcome('PLAYING');
    setHighlight([]);
    setThinking(false);
  }

  const status =
    outcome === 'HUMAN'
      ? 'You connected four. The engine demands a rematch.'
      : outcome === 'ENGINE'
        ? 'The engine connected four. Study the highlighted line and try again.'
        : outcome === 'DRAW'
          ? 'Board full — a draw.'
          : thinking
            ? 'Engine is thinking…'
            : 'Your move — drop a piece.';

  return (
    <div className="connect-four">
      <div className="connect-four-board" role="group" aria-label="Connect four board">
        {Array.from({ length: COLS }, (_, column) => (
          <button
            aria-label={`Drop piece in column ${column + 1}`}
            className="connect-four-column"
            disabled={outcome !== 'PLAYING' || thinking || dropRow(board, column) < 0}
            key={column}
            type="button"
            onClick={() => play(column)}
          >
            {Array.from({ length: ROWS }, (_, row) => {
              const cell = board[row * COLS + column];
              const index = row * COLS + column;
              return (
                <span
                  className={`connect-four-cell${cell === HUMAN ? ' is-human' : ''}${cell === ENGINE ? ' is-engine' : ''}${highlight.includes(index) ? ' is-winning' : ''}`}
                  key={row}
                />
              );
            })}
          </button>
        ))}
      </div>
      <footer className="strategy-game-controls">
        <p aria-live="polite">{status}</p>
        <div className="connect-four-scoreline">
          <span>You {stats.wins}</span>
          <span>Draws {stats.draws}</span>
          <span>Engine {stats.losses}</span>
          <button className="secondary" type="button" onClick={reset}>
            New game
          </button>
        </div>
      </footer>
    </div>
  );
}
