import { describe, expect, it } from 'vitest';
import { createContentSecurityPolicy } from './content-security-policy';

describe('createContentSecurityPolicy', () => {
  it('binds executable scripts to a server-generated nonce', () => {
    const policy = createContentSecurityPolicy('c2VjdXJlLW5vbmNl');
    expect(policy).toContain("script-src 'self' 'nonce-c2VjdXJlLW5vbmNl' 'strict-dynamic'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('rejects nonce values that could inject a policy directive', () => {
    expect(() => createContentSecurityPolicy("valid'; script-src *")).toThrow('INVALID_CSP_NONCE');
  });
});
