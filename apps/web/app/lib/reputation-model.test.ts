import { describe, expect, it } from 'vitest';
import { reputationConfig } from './reputation-config';
import {
  computeActivityPoints,
  computeReputation,
  computeVouchBonus,
  reputationLevel,
  type ActivityEvent,
  type ReputationVouch,
} from './reputation-model';

const now = new Date('2026-10-06T18:00:00.000Z');
let sequence = 0;
function event(
  type: ActivityEvent['type'],
  at: string,
  extra: Partial<ActivityEvent> = {},
): ActivityEvent {
  sequence += 1;
  return {
    id: `e${sequence}`,
    type,
    occurredAt: new Date(at),
    onOwnContent: false,
    revoked: false,
    ...extra,
  };
}
const strongVouch: ReputationVouch = {
  relationship: 'MANAGER',
  verificationLevel: 'CONTRIBUTION_VERIFIED',
  authorActivityPoints: 1000,
  reciprocal: false,
};

describe('participation activity points', () => {
  it('awards base points for single actions on separate days', () => {
    const result = computeActivityPoints(
      [
        event('POST', '2026-10-01T10:00:00Z'),
        event('COMMENT', '2026-10-02T10:00:00Z'),
        event('REPLY', '2026-10-03T10:00:00Z'),
        event('BUILD_LOG', '2026-10-04T10:00:00Z'),
      ],
      now,
    );
    expect(result.points).toBe(5 + 2 + 2 + 4);
    expect(result.breakdown.BUILD_LOG).toEqual({ count: 1, points: 4 });
  });

  it('applies same-day diminishing returns and enforces the daily cap per action type', () => {
    const posts = Array.from({ length: 10 }, (_, index) =>
      event('POST', `2026-10-05T${String(8 + index).padStart(2, '0')}:00:00Z`),
    );
    const result = computeActivityPoints(posts, now);
    expect(result.points).toBe(reputationConfig.dailyCaps.POST);
    const two = computeActivityPoints(posts.slice(0, 2), now);
    expect(two.points).toBe(5 + 5 * reputationConfig.sameDayDecay);
  });

  it('caps each action type independently and resets on a new UTC day', () => {
    const comments = Array.from({ length: 20 }, (_, index) =>
      event('COMMENT', `2026-10-05T${String(index).padStart(2, '0')}:10:00Z`),
    );
    const nextDay = event('COMMENT', '2026-10-06T09:00:00Z');
    const result = computeActivityPoints(
      [...comments, nextDay, event('POST', '2026-10-05T23:30:00Z')],
      now,
    );
    expect(result.breakdown.COMMENT.points).toBe(reputationConfig.dailyCaps.COMMENT + 2);
    expect(result.breakdown.POST.points).toBe(5);
  });

  it('damps rapid repeated actions', () => {
    const rapid = computeActivityPoints(
      [event('COMMENT', '2026-10-05T10:00:00Z'), event('COMMENT', '2026-10-05T10:00:30Z')],
      now,
    );
    expect(rapid.points).toBeCloseTo(2 + 2 * 0.8 * reputationConfig.rapidRepeatMultiplier, 5);
  });

  it('gives nothing for interacting with your own content', () => {
    const result = computeActivityPoints(
      [event('COMMENT', '2026-10-05T10:00:00Z', { onOwnContent: true })],
      now,
    );
    expect(result.points).toBe(0);
  });

  it('revokes points when content is deleted or moderated, without consuming the daily allowance', () => {
    const kept = event('POST', '2026-10-05T12:00:00Z');
    const removed = event('POST', '2026-10-05T11:00:00Z', { revoked: true });
    expect(computeActivityPoints([removed, kept], now).points).toBe(5);
    expect(computeActivityPoints([{ ...kept, revoked: true }], now).points).toBe(0);
  });

  it('ignores activity outside the trailing window and in the future', () => {
    const result = computeActivityPoints(
      [event('POST', '2025-01-01T10:00:00Z'), event('POST', '2026-10-07T10:00:00Z')],
      now,
    );
    expect(result.points).toBe(0);
  });
});

describe('vouch bonus', () => {
  it('is zero without vouches and never exceeds the 15% cap', () => {
    expect(computeVouchBonus([])).toBe(0);
    const many = Array.from({ length: 500 }, () => strongVouch);
    expect(computeVouchBonus(many)).toBeLessThanOrEqual(reputationConfig.vouchBonus.maxBonus);
    expect(computeVouchBonus(many)).toBeGreaterThan(0.149);
  });

  it('has diminishing returns', () => {
    const one = computeVouchBonus([strongVouch]);
    const two = computeVouchBonus([strongVouch, strongVouch]);
    const three = computeVouchBonus([strongVouch, strongVouch, strongVouch]);
    expect(two - one).toBeLessThan(one);
    expect(three - two).toBeLessThan(two - one);
  });

  it('weights credible, verified, non-reciprocal vouches more', () => {
    const weak: ReputationVouch = {
      relationship: 'OTHER',
      verificationLevel: 'STANDARD',
      authorActivityPoints: 0,
      reciprocal: true,
    };
    expect(computeVouchBonus([strongVouch])).toBeGreaterThan(computeVouchBonus([weak]));
    expect(computeVouchBonus([{ ...strongVouch, reciprocal: true }])).toBeLessThan(
      computeVouchBonus([strongVouch]),
    );
  });
});

describe('reputation score', () => {
  it('multiplies activity points by (1 + vouchBonus)', () => {
    const events = [
      event('POST', '2026-10-01T10:00:00Z'),
      event('BUILD_LOG', '2026-10-02T10:00:00Z'),
    ];
    const vouches = Array.from({ length: 50 }, () => strongVouch);
    const result = computeReputation(events, vouches, now);
    expect(result.activityPoints).toBe(9);
    expect(result.score).toBe(Math.round(9 * (1 + result.vouchBonus)));
    expect(result.score).toBeLessThanOrEqual(Math.round(9 * 1.15));
  });

  it('gives no reputation for vouches alone', () => {
    expect(computeReputation([], [strongVouch, strongVouch], now).score).toBe(0);
  });

  it('maps scores to levels', () => {
    expect(reputationLevel(0)).toEqual({ label: 'Newcomer', next: 25 });
    expect(reputationLevel(120).label).toBe('Builder');
    expect(reputationLevel(5000)).toEqual({ label: 'Distinguished', next: null });
  });
});
