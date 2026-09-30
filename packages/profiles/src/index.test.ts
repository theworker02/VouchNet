import { describe, expect, it } from 'vitest';
import { canViewProfile, isValidSlug, normalizeSlug } from './index.js';
describe('profile policy', () => {
  it('rejects reserved and malformed slugs', () => {
    expect(isValidSlug('admin')).toBe(false);
    expect(isValidSlug(normalizeSlug('Jane Smith'))).toBe(true);
  });
  it('never exposes blocked relationships', () => {
    expect(
      canViewProfile({
        visibility: 'PUBLIC',
        viewerIsOwner: false,
        viewerIsMember: true,
        isConnection: true,
        blocked: true,
      }),
    ).toBe(false);
  });
});
