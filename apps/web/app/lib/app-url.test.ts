import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicUrl } from './app-url';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('publicUrl', () => {
  it('uses the canonical public origin when configured', () => {
    vi.stubEnv('APP_URL', 'https://vouchnet.dev');

    expect(
      publicUrl('/feed?mode=signal', 'https://deploy-preview--vouchnet.netlify.app/login').href,
    ).toBe('https://vouchnet.dev/feed?mode=signal');
  });

  it('falls back to the request origin for local development', () => {
    vi.stubEnv('APP_URL', '');

    expect(publicUrl('/login', 'http://localhost:3002/api/auth/login').href).toBe(
      'http://localhost:3002/login',
    );
  });
});
