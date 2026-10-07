import { describe, expect, it } from 'vitest';
import { createPkcePair, createVouchNetClient, VouchNetApiError } from './index';

describe('VouchNet API client', () => {
  it('builds a PKCE authorization URL with an S256 challenge', async () => {
    const client = createVouchNetClient({ origin: 'https://vouchnet.dev' });
    const pkce = await createPkcePair();
    const url = new URL(
      client.createAuthorizationUrl({
        clientId: 'vn_example',
        redirectUri: 'https://ats.example.com/callback',
        state: 'opaque-state',
        codeChallenge: pkce.codeChallenge,
        scopes: ['profile:read', 'profile:email'],
      }),
    );
    expect(url.pathname).toBe('/oauth/authorize');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(pkce.codeVerifier).toHaveLength(86);
    expect(pkce.codeChallenge).toHaveLength(43);
  });

  it('normalizes a server rate-limit response', async () => {
    const client = createVouchNetClient({
      fetch: async () =>
        new Response(JSON.stringify({ success: false, error: { code: 'RATE_LIMITED' } }), {
          status: 429,
          headers: { 'retry-after': '17', 'content-type': 'application/json' },
        }),
    });
    await expect(client.getUserInfo('vnat_example')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      status: 429,
      retryAfterSeconds: 17,
    } satisfies Partial<VouchNetApiError>);
  });

  it('does not coerce unexpected profile payloads into trusted data', async () => {
    const client = createVouchNetClient({
      fetch: async () =>
        new Response(JSON.stringify({ sub: 'user' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    });
    await expect(client.getUserInfo('vnat_example')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 502,
    } satisfies Partial<VouchNetApiError>);
  });
});
