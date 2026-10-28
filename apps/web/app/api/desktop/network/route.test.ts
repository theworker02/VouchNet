import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const state = vi.hoisted(() => ({
  actor: { userId: 'user-1' } as { userId: string } | null,
  fail: false,
}));

vi.mock('../../../lib/desktop-auth', () => ({
  desktopActorFromBearer: async () => state.actor,
}));

vi.mock('../../../lib/social', () => ({
  getNetworkOverview: async () => {
    if (state.fail) throw new Error('DATABASE_UNAVAILABLE');
    return {
      contactCount: 3,
      followingCount: 5,
      pendingReceivedCount: 1,
      pendingReceived: [
        {
          connectionId: '22222222-2222-2222-2222-222222222222',
          firstName: 'Ada',
          lastName: 'Lovelace',
          headline: 'Computing pioneer',
          slug: 'ada',
        },
      ],
    };
  },
}));

vi.mock('../../../lib/discovery', () => ({
  discoverPeople: async () => [
    {
      user_id: '33333333-3333-3333-3333-333333333333',
      slug: 'grace',
      first_name: 'Grace',
      last_name: 'Hopper',
      headline: 'Compiler author',
      mutual_contacts: 2,
      score: 0.91,
      reasons: ['MUTUAL_CONTACTS'],
    },
  ],
}));

describe('desktop network', () => {
  beforeEach(() => {
    state.actor = { userId: 'user-1' };
    state.fail = false;
  });

  it('requires a desktop device bearer token', async () => {
    state.actor = null;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/network', {
        headers: { authorization: 'Bearer missing' },
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('returns overview and recommendations for the device owner', async () => {
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/network', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      overview: { contactCount: 3, pendingReceivedCount: 1 },
      recommendations: [
        {
          slug: 'grace',
          firstName: 'Grace',
          lastName: 'Hopper',
          mutualContacts: 2,
        },
      ],
    });
  });

  it('hides database failures behind a desktop-safe unavailable response', async () => {
    state.fail = true;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/network', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'NETWORK_UNAVAILABLE' });
  });
});
