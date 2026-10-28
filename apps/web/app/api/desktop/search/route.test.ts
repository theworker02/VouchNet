import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const state = vi.hoisted(() => ({
  actor: { userId: 'user-1' } as { userId: string } | null,
  allowed: true as boolean,
}));

vi.mock('../../../lib/desktop-auth', () => ({
  desktopActorFromBearer: async () => state.actor,
}));

vi.mock('../../../lib/security/rate-limit', () => ({
  enforceRateLimit: async () =>
    state.allowed ? { allowed: true as const } : { allowed: false as const, retryAfterSeconds: 30 },
}));

vi.mock('../../../lib/security/rate-limit-response', () => ({
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: 'RATE_LIMITED' }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    }),
}));

vi.mock('../../../lib/people', () => ({
  searchPeople: async () => [
    {
      userId: '11111111-1111-1111-1111-111111111111',
      slug: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
      headline: 'Analyst',
      location: 'London',
      isPlus: true,
    },
  ],
}));

vi.mock('../../../lib/directory', () => ({
  listPublicJobs: async () => [
    {
      slug: 'staff-engineer',
      title: 'Staff Engineer',
      summary: 'Build trust graphs',
      location: 'Remote',
      workplaceType: 'REMOTE',
      employmentType: 'FULL_TIME',
      salaryMin: 180000,
      salaryMax: 220000,
      salaryCurrency: 'USD',
      skillTags: ['TypeScript'],
      sourceUrl: 'https://example.com',
      sourceCheckedAt: new Date('2026-10-28T12:00:00.000Z'),
      sourceStatus: 'SOURCE_LIVE',
      organizationName: 'VouchNet Labs',
      organizationSlug: 'vouchnet-labs',
    },
  ],
  listPublicOrganizations: async () => [
    {
      slug: 'vouchnet-labs',
      name: 'VouchNet Labs',
      tagline: 'Signal over noise',
      headquarters: 'Remote',
      verificationStatus: 'DOMAIN_VERIFIED',
      technologies: ['TypeScript'],
    },
  ],
}));

describe('desktop search', () => {
  beforeEach(() => {
    state.actor = { userId: 'user-1' };
    state.allowed = true;
  });

  it('requires a desktop device bearer token', async () => {
    state.actor = null;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/search?q=ada', {
        headers: { authorization: 'Bearer missing' },
      }),
    );
    expect(response.status).toBe(401);
  });

  it('returns empty collections for short queries without calling search backends', async () => {
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/search?q=a', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      query: 'a',
      people: [],
      jobs: [],
      organizations: [],
    });
  });

  it('returns people, jobs, and organizations for a valid query', async () => {
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/search?q=ada', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.people[0].fullName).toBe('Ada Lovelace');
    expect(body.jobs[0].slug).toBe('staff-engineer');
    expect(body.organizations[0].slug).toBe('vouchnet-labs');
  });

  it('enforces the desktop read rate limit', async () => {
    state.allowed = false;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/search?q=ada', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(429);
  });
});
