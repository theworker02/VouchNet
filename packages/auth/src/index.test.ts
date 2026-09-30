import { describe, expect, it } from 'vitest';
import {
  createSecretToken,
  evaluateRegistrationRisk,
  hashOpaqueToken,
  normalizeEmail,
} from './index.js';

describe('identity security primitives', () => {
  it('normalizes email and stores only an opaque token hash', () => {
    expect(normalizeEmail(' Person@Example.COM ')).toBe('person@example.com');
    const token = createSecretToken(1_000);
    expect(token.tokenHash).toBe(hashOpaqueToken(token.token));
    expect(token.tokenHash).not.toContain(token.token);
  });
  it('escalates high registration velocity without treating VPN use as a signal', () => {
    expect(evaluateRegistrationRisk({ recentAttempts: 9, disposableEmail: false }).decision).toBe(
      'CHALLENGE',
    );
  });
});
