import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { state, ApplyOAuthError } = vi.hoisted(() => {
  class ApplyOAuthError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    ApplyOAuthError,
    state: {
      actor: {
        tokenId: 'token-1',
        userId: 'user-1',
        ownerId: 'owner-1',
        developerClientId: 'client-1',
        scopes: ['directory:read'] as string[],
      } as {
        tokenId: string;
        userId: string;
        ownerId: string;
        developerClientId: string;
        scopes: string[];
      } | null,
      profile: null as null | {
        userId: string;
        slug: string;
        firstName: string;
        lastName: string;
        headline: string | null;
        location: string | null;
        about: string | null;
        languages: string[];
        earlyMember: boolean;
        isPlus: boolean;
        visibility: string;
      },
      charged: false,
      rateLimited: false,
    },
  };
});

vi.mock('../../../../lib/security/rate-limit', () => ({
  rateLimitTiers: {
    auth: { maxRequests: 5, windowSeconds: 60 },
    generalApi: { maxRequests: 100, windowSeconds: 60 },
    socialWrite: { maxRequests: 20, windowSeconds: 60 },
    desktopRead: { maxRequests: 60, windowSeconds: 60 },
    oauthApi: { maxRequests: 60, windowSeconds: 60 },
  },
  enforceRateLimit: async () =>
    state.rateLimited
      ? { allowed: false as const, retryAfterSeconds: 12 }
      : { allowed: true as const },
}));

vi.mock('../../../../lib/apply-oauth', () => ({
  ApplyOAuthError,
  resolveAccessToken: async () => {
    if (state.actor === null) throw new ApplyOAuthError('INVALID_TOKEN');
    return state.actor;
  },
}));

vi.mock('../../../../lib/people', () => ({
  getVisibleProfile: async () => state.profile,
}));

vi.mock('../../../../lib/api-credits', () => ({
  chargeApiCall: async () => {
    state.charged = true;
    return { balanceAfter: 10 };
  },
}));

vi.mock('../../../../lib/api-credits-ledger', () => ({
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
}));

vi.mock('../../../../lib/api-credits-response', () => ({
  insufficientCreditsResponse: () =>
    new Response(JSON.stringify({ error: 'INSUFFICIENT_CREDITS' }), { status: 402 }),
}));

describe('GET /api/v1/people/[slug]', () => {
  beforeEach(() => {
    state.actor = {
      tokenId: 'token-1',
      userId: 'user-1',
      ownerId: 'owner-1',
      developerClientId: 'client-1',
      scopes: ['directory:read'],
    };
    state.profile = {
      userId: '11111111-1111-1111-1111-111111111111',
      slug: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
      headline: 'Analyst',
      location: 'London',
      about: 'Notes on the engine',
      languages: ['English'],
      earlyMember: true,
      isPlus: false,
      visibility: 'PUBLIC',
    };
    state.charged = false;
    state.rateLimited = false;
  });

  it('requires a bearer token', async () => {
    const response = await GET(new NextRequest('https://vouchnet.dev/api/v1/people/ada'), {
      params: Promise.resolve({ slug: 'ada' }),
    });
    expect(response.status).toBe(401);
    expect(state.charged).toBe(false);
  });

  it('returns a public profile and charges directory credits', async () => {
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/v1/people/ada', {
        headers: { authorization: 'Bearer vnat_example' },
      }),
      { params: Promise.resolve({ slug: 'ada' }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('x-ratelimit-limit')).toBe('60');
    expect(await response.json()).toMatchObject({
      slug: 'ada',
      first_name: 'Ada',
      last_name: 'Lovelace',
      headline: 'Analyst',
    });
    expect(state.charged).toBe(true);
  });

  it('does not charge when the profile is not visible', async () => {
    state.profile = null;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/v1/people/missing', {
        headers: { authorization: 'Bearer vnat_example' },
      }),
      { params: Promise.resolve({ slug: 'missing' }) },
    );
    expect(response.status).toBe(404);
    expect(state.charged).toBe(false);
  });

  it('enforces the oauthApi rate limit', async () => {
    state.rateLimited = true;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/v1/people/ada', {
        headers: { authorization: 'Bearer vnat_example' },
      }),
      { params: Promise.resolve({ slug: 'ada' }) },
    );
    expect(response.status).toBe(429);
    expect(state.charged).toBe(false);
  });
});
