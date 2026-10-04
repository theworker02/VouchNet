import { describe, expect, it } from 'vitest';
import { isLoopbackRuntimeUrl } from './local-runtime-policy';

describe('isLoopbackRuntimeUrl', () => {
  it('accepts explicit local runtime URLs', () => {
    expect(isLoopbackRuntimeUrl('http://localhost:11434/api/tags')).toBe(true);
    expect(isLoopbackRuntimeUrl('http://127.0.0.1:8080/health')).toBe(true);
  });

  it('rejects remote, credentialed, and malformed addresses', () => {
    expect(isLoopbackRuntimeUrl('https://example.com/health')).toBe(false);
    expect(isLoopbackRuntimeUrl('http://user:password@localhost:11434')).toBe(false);
    expect(isLoopbackRuntimeUrl('not a url')).toBe(false);
  });
});
