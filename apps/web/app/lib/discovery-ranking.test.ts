import { describe, expect, it } from 'vitest';
import {
  builderScore,
  momentumScore,
  rankBuilders,
  rankByMomentum,
  rankOpportunities,
  selectProjectSections,
  type DiscoverProjectCandidate,
} from './discovery-ranking';
import { normalizeProfileIntent, profileIntentSchema } from './profile-intent';

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

describe('project sections', () => {
  const project = (
    id: string,
    overrides: Partial<DiscoverProjectCandidate> = {},
  ): DiscoverProjectCandidate => ({
    id,
    status: 'ACTIVE_DEVELOPMENT',
    openSource: false,
    lookingFor: [],
    tags: [],
    createdAt: daysAgo(60),
    statusChangedAt: daysAgo(60),
    lastActivityAt: daysAgo(5),
    signals: [],
    ...overrides,
  });

  it('places projects by recorded activity and never shows archived ones', () => {
    const sections = selectProjectSections(
      [
        project('active', { signals: [{ kind: 'buildLog', at: daysAgo(1) }] }),
        project('archived', {
          status: 'ARCHIVED',
          openSource: true,
          createdAt: daysAgo(1),
          signals: [{ kind: 'buildLog', at: daysAgo(1) }],
        }),
        project('new', { createdAt: daysAgo(2) }),
        project('launched-old', { status: 'LAUNCHED', statusChangedAt: daysAgo(20) }),
        project('launched-new', { status: 'LAUNCHED', statusChangedAt: daysAgo(3) }),
        project('oss-quiet', { openSource: true, lastActivityAt: daysAgo(1) }),
        project('oss-help', { openSource: true, lookingFor: ['CONTRIBUTORS'] }),
        project('research', { tags: ['Research'] }),
        project('researchers', { lookingFor: ['RESEARCHERS'], lastActivityAt: daysAgo(1) }),
      ],
      now,
    );
    expect(sections.momentum.map((item) => item.id)).toEqual(['active']);
    expect(sections.momentum[0]?.reasons).toEqual(['1 build-log entry in 14 days']);
    expect(sections.fresh.map((item) => item.id)).toEqual(['new']);
    expect(sections.launched.map((item) => item.id)).toEqual(['launched-new', 'launched-old']);
    expect(sections.openSource.map((item) => item.id)).toEqual(['oss-help', 'oss-quiet']);
    expect(sections.research.map((item) => item.id)).toEqual(['researchers', 'research']);
  });
});

describe('profile intent', () => {
  it('accepts the five intents or clearing, and nothing else', () => {
    expect(profileIntentSchema.parse({ intent: 'HIRING' })).toEqual({ intent: 'HIRING' });
    expect(profileIntentSchema.parse({ intent: null })).toEqual({ intent: null });
    expect(() => profileIntentSchema.parse({ intent: 'OPEN_TO_ANYTHING' })).toThrow();
    expect(normalizeProfileIntent('JUST_NETWORKING')).toBe('JUST_NETWORKING');
    expect(normalizeProfileIntent('nope')).toBeNull();
  });
});
