import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const state = vi.hoisted(() => ({
  organizations: [] as unknown[],
  jobs: [] as unknown[],
  fail: false,
  allowed: true,
}));

vi.mock('../../../lib/directory', () => ({
  listPublicOrganizations: async () => {
    if (state.fail) throw new Error('DATABASE_UNAVAILABLE');
    return state.organizations;
  },
  listPublicJobs: async () => {
    if (state.fail) throw new Error('DATABASE_UNAVAILABLE');
    return state.jobs;
  },
}));

vi.mock('../../../lib/security/rate-limit', () => ({
  enforceRateLimit: async () => ({ allowed: state.allowed, retryAfterSeconds: 60 }),
}));

vi.mock('../../../lib/security/rate-limit-response', () => ({
  rateLimitResponse: () => new Response(JSON.stringify({ error: 'RATE_LIMITED' }), { status: 429 }),
}));

describe('public landing directory snapshot', () => {
  beforeEach(() => {
    state.organizations = [{ slug: 'atlas', name: 'Atlas', technologies: ['TypeScript'] }];
    state.jobs = [{ slug: 'staff-engineer', title: 'Staff Engineer' }];
    state.fail = false;
    state.allowed = true;
  });

  it('returns only the existing public directory read model with a short shared cache', async () => {
    const response = await GET(new NextRequest('https://vouchnet.dev/api/public/home'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=300');
    expect(await response.json()).toEqual({ organizations: state.organizations, jobs: state.jobs });
  });

  it('does not disclose a database failure as an implementation detail', async () => {
    state.fail = true;
    const response = await GET(new NextRequest('https://vouchnet.dev/api/public/home'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'PUBLIC_DIRECTORY_UNAVAILABLE' });
  });

  it('uses the platform rate-limit response before reading the directory', async () => {
    state.allowed = false;
    const response = await GET(new NextRequest('https://vouchnet.dev/api/public/home'));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'RATE_LIMITED' });
  });
});
