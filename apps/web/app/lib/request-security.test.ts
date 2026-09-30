import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasSameOrigin } from './request-security';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('hasSameOrigin', () => {
  it('uses the configured public origin behind a serverless deployment proxy', () => {
    vi.stubEnv('APP_URL', 'https://vouchnet.dev');
    const request = new NextRequest('https://deploy-preview--vouchnet.netlify.app/api/posts', {
      headers: { origin: 'https://vouchnet.dev' },
      method: 'POST',
    });

    expect(hasSameOrigin(request)).toBe(true);
  });

  it('rejects a cross-site mutation origin', () => {
    vi.stubEnv('APP_URL', 'https://vouchnet.dev');
    const request = new NextRequest('https://deploy-preview--vouchnet.netlify.app/api/posts', {
      headers: { origin: 'https://malicious.example' },
      method: 'POST',
    });

    expect(hasSameOrigin(request)).toBe(false);
  });
});
