import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const state = vi.hoisted(() => ({
  actor: { userId: 'user-1' } as { userId: string } | null,
  notifications: [] as Array<{
    id: string;
    title: string;
    body: string;
    href: string;
    readAt: Date | null;
    createdAt: Date;
  }>,
  fail: false,
}));

vi.mock('../../../lib/desktop-auth', () => ({
  desktopActorFromBearer: async () => state.actor,
}));

vi.mock('../../../lib/daily-strategy', () => ({
  ensureDailyStrategyNotification: async () => undefined,
  listMemberNotifications: async () => {
    if (state.fail) throw new Error('DATABASE_UNAVAILABLE');
    return state.notifications;
  },
}));

describe('desktop activity', () => {
  beforeEach(() => {
    state.actor = { userId: 'user-1' };
    state.fail = false;
    state.notifications = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Signal Circuit is ready',
        body: 'Steady difficulty',
        href: '/games',
        readAt: null,
        createdAt: new Date('2026-10-28T12:00:00.000Z'),
      },
    ];
  });

  it('requires a desktop device bearer token', async () => {
    state.actor = null;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/activity', {
        headers: { authorization: 'Bearer missing' },
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' });
  });

  it('returns ISO notification timestamps for the desktop client', async () => {
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/activity', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      notifications: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          title: 'Signal Circuit is ready',
          body: 'Steady difficulty',
          href: '/games',
          readAt: null,
          createdAt: '2026-10-28T12:00:00.000Z',
        },
      ],
    });
  });

  it('hides database failures behind a desktop-safe unavailable response', async () => {
    state.fail = true;
    const response = await GET(
      new NextRequest('https://vouchnet.dev/api/desktop/activity', {
        headers: { authorization: 'Bearer desktop-token' },
      }),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'ACTIVITY_UNAVAILABLE' });
  });
});
