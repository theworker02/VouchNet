import { describe, expect, it } from 'vitest';
import { isStudioPackageId, studioPackages } from './studio-config';

describe('Studio package configuration', () => {
  it('exposes fixed package deposits and keeps custom work quote-only', () => {
    expect(studioPackages.FOUNDATION.depositCents).toBe(35000);
    expect(studioPackages.CUSTOM.depositCents).toBeNull();
    expect(isStudioPackageId('CUSTOM')).toBe(true);
    expect(isStudioPackageId('client-price')).toBe(false);
  });
});
