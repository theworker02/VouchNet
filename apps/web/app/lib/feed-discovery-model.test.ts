import { describe, expect, it } from 'vitest';
import { buildFeedDiscovery } from './feed-discovery-model';

describe('buildFeedDiscovery', () => {
  it('keeps source-reviewed records separate from member activity and derives useful topics', () => {
    const discovery = buildFeedDiscovery(
      [
        {
          slug: 'systems-engineer',
          title: 'Systems Engineer',
          organizationName: 'Example Systems',
          organizationSlug: 'example-systems',
          location: 'Remote',
          salaryMin: 150000,
          salaryMax: 190000,
          salaryCurrency: 'USD',
          skillTags: ['Rust', 'PostgreSQL'],
        },
      ],
      [
        {
          slug: 'example-systems',
          name: 'Example Systems',
          tagline: 'Infrastructure tooling',
          technologies: ['Rust'],
          openRoleCount: 1,
        },
      ],
      new Date('2026-10-03T12:00:00.000Z'),
    );

    expect(discovery.jobs).toHaveLength(1);
    expect(discovery.organizations[0]?.name).toBe('Example Systems');
    expect(discovery.topics).toEqual(['Rust', 'PostgreSQL']);
    expect(discovery.dailyChallenge.title).toBeTruthy();
  });

  it('always provides the original daily challenge when the public catalog is unavailable', () => {
    const discovery = buildFeedDiscovery([], [], new Date('2026-10-03T12:00:00.000Z'));

    expect(discovery.jobs).toEqual([]);
    expect(discovery.organizations).toEqual([]);
    expect(discovery.dailyChallenge.moveBudget).toBeGreaterThan(0);
  });
});
