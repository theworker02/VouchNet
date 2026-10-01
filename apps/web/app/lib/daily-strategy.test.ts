import { describe, expect, it } from 'vitest';
import { getDailyStrategyGame, isSuccessfulDailyStrategyRun } from './daily-strategy-game';

describe('daily strategy game', () => {
  it('derives the same puzzle for every member on a given UTC day', () => {
    expect(getDailyStrategyGame('2026-10-13')).toEqual(getDailyStrategyGame('2026-10-13'));
  });

  it('never creates a board that can be completed without a move', () => {
    for (let day = 1; day <= 60; day += 1) {
      const date = new Date(Date.UTC(2026, 9, day)).toISOString().slice(0, 10);
      const game = getDailyStrategyGame(date);
      expect(game.target.some(Boolean)).toBe(true);
      expect(isSuccessfulDailyStrategyRun(game, [])).toBe(false);
    }
  });

  it('accepts a real solved board but rejects a fabricated empty move list', () => {
    const game = getDailyStrategyGame('2026-10-01');
    let solution: number[] | null = null;
    for (let mask = 0; mask < 1 << (game.boardSize * game.boardSize); mask += 1) {
      const candidate = Array.from(
        { length: game.boardSize * game.boardSize },
        (_, index) => index,
      ).filter((index) => (mask & (1 << index)) !== 0);
      if (candidate.length <= game.moveBudget && isSuccessfulDailyStrategyRun(game, candidate)) {
        solution = candidate;
        break;
      }
    }
    expect(isSuccessfulDailyStrategyRun(game, [])).toBe(false);
    expect(solution).not.toBeNull();
    if (solution === null) throw new Error('Expected the generated puzzle to be solvable.');
    expect(isSuccessfulDailyStrategyRun(game, solution)).toBe(true);
  });
});
