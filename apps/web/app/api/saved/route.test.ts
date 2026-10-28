import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const state = vi.hoisted(() => ({
  actor: { userId: 'user-1' } as { userId: string } | null,
  posts: [] as Array<{
    id: string;
    authorId: string;
    authorName: string;
    authorSlug: string;
    authorHeadline: string | null;
    bodyMarkdown: string;
    category: string;
    createdAt: Date;
    savedAt: Date;
    peerSignal: number;
    commentCount: number;
  }>,
  saveResult: 'saved' as 'saved' | 'unchanged',
  fail: false,
  allowed: true,
}));

vi.mock('../../lib/identity', () => ({
  actorFromRequest: async () => state.actor,
}));

vi.mock('../../lib/request-security', () => ({
  hasSameOrigin: () => true,
}));

vi.mock('../../lib/security/rate-limit', () => ({
  enforceRateLimit: async () => ({ allowed: state.allowed, retryAfterSeconds: 60 }),
}));

vi.mock('../../lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'RATE_LIMITED' }), { status: 429 }),
}));

vi.mock('../../lib/saved-posts', () => ({
  listSavedPosts: async () => {
    if (state.fail) throw new Error('DATABASE_UNAVAILABLE');
    return state.posts;
  },
  savePost: async () => {
    if (state.fail) throw new Error('DATABASE_UNAVAILABLE');
    return state.saveResult;
  },
}));

describe('saved posts API', () => {
  beforeEach(() => {
    state.actor = { userId: 'user-1' };
    state.fail = false;
    state.allowed = true;
    state.saveResult = 'saved';
    state.posts = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        authorId: 'user-2',
        authorName: 'Ada Example',
        authorSlug: 'ada',
        authorHeadline: 'Builder',
        bodyMarkdown: 'Useful note',
        category: 'TECHNICAL',
        createdAt: new Date('2026-10-28T12:00:00.000Z'),
        savedAt: new Date('2026-10-28T13:00:00.000Z'),
        peerSignal: 2,
        commentCount: 1,
      },
    ];
  });

  it('lists saved posts with ISO timestamps', async () => {
    const response = await GET(new NextRequest('https://vouchnet.dev/api/saved'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      posts: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          authorId: 'user-2',
          authorName: 'Ada Example',
          authorSlug: 'ada',
          authorHeadline: 'Builder',
          bodyMarkdown: 'Useful note',
          category: 'TECHNICAL',
          createdAt: '2026-10-28T12:00:00.000Z',
          savedAt: '2026-10-28T13:00:00.000Z',
          peerSignal: 2,
          commentCount: 1,
        },
      ],
    });
  });

  it('requires authentication to save', async () => {
    state.actor = null;
    const response = await POST(
      new NextRequest('https://vouchnet.dev/api/saved', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://vouchnet.dev' },
        body: JSON.stringify({ postId: '11111111-1111-4111-8111-111111111111' }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it('saves a visible post id', async () => {
    const response = await POST(
      new NextRequest('https://vouchnet.dev/api/saved', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://vouchnet.dev' },
        body: JSON.stringify({ postId: '11111111-1111-4111-8111-111111111111' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ saved: true, result: 'saved' });
  });
});
