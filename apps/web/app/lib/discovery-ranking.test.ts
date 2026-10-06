import { describe, expect, it } from 'vitest';
import {
  builderScore,
  momentumScore,
  rankBuilders,
  rankByMomentum,
  rankOpportunities,
} from './discovery-ranking';

const now = new Date('2026-10-06T12:00:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe('project momentum', () => {
  it('weights recent build logs, follows, and contributors with time decay', () => {
    expect(momentumScore([{ kind: 'buildLog', at: now }], now)).toBe(3);
    expect(momentumScore([{ kind: 'follow', at: daysAgo(7) }], now)).toBe(1);
    expect(momentumScore([{ kind: 'contributor', at: daysAgo(20) }], now)).toBe(0);
  });

  it('ranks active projects above stale ones, explains why, and omits projects with no signal', () => {
    const ranked = rankByMomentum(
      [
        { id: 'stale', signals: [{ kind: 'follow' as const, at: daysAgo(13) }] },
        {
          id: 'active',
          signals: [
            { kind: 'buildLog' as const, at: daysAgo(1) },
            { kind: 'follow' as const, at: daysAgo(2) },
            { kind: 'follow' as const, at: daysAgo(2) },
          ],
        },
        { id: 'quiet', signals: [] },
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual(['active', 'stale']);
    expect(ranked[0]?.reasons).toEqual([
      '1 build-log entry in 14 days',
      '2 new followers in 14 days',
    ]);
  });
});

describe('people building things', () => {
  it('prefers recent building over reputation or vouch counts', () => {
    const builder = {
      id: 'b',
      buildLogs30d: 6,
      activeProjects: 2,
      acceptedContributions: 1,
      reputationScore: 20,
      vouchers: 0,
    };
    const famous = {
      id: 'f',
      buildLogs30d: 0,
      activeProjects: 1,
      acceptedContributions: 0,
      reputationScore: 900,
      vouchers: 10,
    };
    expect(builderScore(builder)).toBeGreaterThan(builderScore(famous));
    const ranked = rankBuilders([famous, builder, { ...famous, id: 'idle', activeProjects: 0 }]);
    expect(ranked.map((item) => item.id)).toEqual(['b', 'f']);
    expect(ranked[0]?.reasons[0]).toBe('6 build-log entries this month');
  });
});

describe('open opportunities', () => {
  it('surfaces closing-soon and fresh opportunities and drops expired ones', () => {
    const ranked = rankOpportunities(
      [
        { id: 'old', createdAt: daysAgo(40), deadline: null, proposalCount: 9 },
        { id: 'closing', createdAt: daysAgo(10), deadline: '2026-10-08', proposalCount: 2 },
        { id: 'fresh', createdAt: daysAgo(0), deadline: null, proposalCount: 0 },
        { id: 'expired', createdAt: daysAgo(1), deadline: '2026-10-01', proposalCount: 0 },
      ],
      now,
    );
    expect(ranked.map((item) => item.id)).toEqual(['fresh', 'closing', 'old']);
    expect(ranked[1]?.reasons).toContain('Closes in 3 days');
  });
});
