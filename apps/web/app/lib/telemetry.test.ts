import { describe, expect, it } from 'vitest';
import { normalizeClientError } from './telemetry';

describe('normalizeClientError', () => {
  it('redacts recognizable secrets and enforces bounded diagnostic fields', () => {
    const event = normalizeClientError({
      errorMessage: 'Request failed: Bearer secret-token?token=one-time-token',
      errorName: 'FetchError',
      route: '/feed?token=should-not-be-stored',
      severity: 'HIGH',
      stackTrace: 'Authorization: Bearer another-secret sk_live_sensitive',
    });
    expect(event.errorMessage).not.toContain('secret-token');
    expect(event.route).not.toContain('should-not-be-stored');
    expect(event.stackTrace).not.toContain('another-secret');
    expect(event.stackTrace).not.toContain('sk_live_sensitive');
  });

  it('uses a safe route and default text for malformed client errors', () => {
    expect(
      normalizeClientError({ errorMessage: '', errorName: '', route: 'invalid', severity: 'LOW' }),
    ).toMatchObject({ errorMessage: 'Unknown client error', errorName: 'Error', route: '/' });
  });
});
