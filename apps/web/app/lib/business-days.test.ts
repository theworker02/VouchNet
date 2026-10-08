import { describe, expect, it } from 'vitest';
import { addBusinessDays } from './business-days';

describe('addBusinessDays', () => {
  it('skips weekends while preserving the UTC time', () => {
    const friday = new Date('2026-10-02T14:00:00.000Z');
    expect(addBusinessDays(friday, 5).toISOString()).toBe('2026-10-09T14:00:00.000Z');
  });

  it('keeps zero business days unchanged', () => {
    const date = new Date('2026-10-07T14:00:00.000Z');
    expect(addBusinessDays(date, 0).toISOString()).toBe(date.toISOString());
  });
});
