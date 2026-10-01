import { describe, expect, it } from 'vitest';
import { rateLimitResponse } from './rate-limit-response';

describe('rateLimitResponse', () => {
  it('returns a retryable 429 envelope for an enforced quota', async () => {
    const response = rateLimitResponse({ allowed: false, retryAfterSeconds: 17 });
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('17');
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', retryAfterSeconds: 17 },
    });
  });

  it('fails closed when production rate-limit infrastructure is unavailable', async () => {
    const response = rateLimitResponse({
      allowed: false,
      retryAfterSeconds: 60,
      unavailable: true,
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'RATE_LIMIT_UNAVAILABLE' },
    });
  });
});
