const launchDate = '2026-10-01';
const difficultyNames = [
  'Scout',
  'Operator',
  'Planner',
  'Strategist',
  'Architect',
  'Mastermind',
] as const;
const gameNames = [
  'Signal Circuit',
  'Relay Lock',
  'Switchyard',
  'Phase Array',
  'Vector Grid',
  'Control Mesh',
] as const;

export type DailyStrategyGame = {
  date: string;
  title: string;
  difficulty: number;
  difficultyLabel: (typeof difficultyNames)[number];
  boardSize: number;
  moveBudget: number;
  target: boolean[];
};

function dayNumber(date: string): number {
  const start = Date.parse(`${launchDate}T00:00:00.000Z`);
  const current = Date.parse(`${date}T00:00:00.000Z`);
  return Math.max(0, Math.floor((current - start) / 86_400_000));
}

function seededRandom(seedInput: string) {
  let seed = 2_166_136_261;
  for (const character of seedInput) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16_777_619);
  }
  return () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function toggleSignalCell(
  board: readonly boolean[],
  boardSize: number,
  index: number,
): boolean[] {
  const next = [...board];
  const row = Math.floor(index / boardSize);
  const column = index % boardSize;
  const candidates = [
    index,
    row > 0 ? index - boardSize : -1,
    row < boardSize - 1 ? index + boardSize : -1,
    column > 0 ? index - 1 : -1,
    column < boardSize - 1 ? index + 1 : -1,
  ];
  for (const candidate of candidates) {
    if (candidate >= 0) next[candidate] = !next[candidate];
  }
  return next;
}

export function getDailyStrategyGame(
  date = new Date().toISOString().slice(0, 10),
): DailyStrategyGame {
  const day = dayNumber(date);
  const difficulty = Math.min(6, 1 + Math.floor(day / 3));
  const boardSize = difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6;
  const moveBudget = Math.min(boardSize * boardSize - 2, 4 + difficulty * 3);
  const random = seededRandom(`vouchnet:signal-circuit:${date}`);
  const pressCount = Math.min(moveBudget - 1, 2 + difficulty * 2);
  const positions = Array.from({ length: boardSize * boardSize }, (_, index) => index);
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = positions[index];
    const replacement = positions[swapIndex];
    if (current === undefined || replacement === undefined)
      throw new Error('DAILY_GAME_SEED_FAILED');
    positions[index] = replacement;
    positions[swapIndex] = current;
  }
  let target = Array<boolean>(boardSize * boardSize).fill(false);
  for (const position of positions.slice(0, pressCount)) {
    target = toggleSignalCell(target, boardSize, position);
  }
  return {
    date,
    title: gameNames[day % gameNames.length] ?? 'Signal Circuit',
    difficulty,
    difficultyLabel: difficultyNames[difficulty - 1] ?? 'Scout',
    boardSize,
    moveBudget,
    target,
  };
}

export function isSuccessfulDailyStrategyRun(
  game: DailyStrategyGame,
  moves: readonly number[],
): boolean {
  if (moves.length > game.moveBudget || moves.some((move) => !Number.isInteger(move))) return false;
  let board = Array<boolean>(game.boardSize * game.boardSize).fill(false);
  for (const move of moves) {
    if (move < 0 || move >= board.length) return false;
    board = toggleSignalCell(board, game.boardSize, move);
  }
  return board.every((cell, index) => cell === game.target[index]);
}
