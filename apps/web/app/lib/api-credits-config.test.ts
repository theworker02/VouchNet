import { describe, expect, it } from 'vitest';
import {
  apiCallCosts,
  creditTopUpPackages,
  creditsForAmountCents,
  findCreditTopUpPackage,
} from './api-credits-config';
import { confirmedTopUpFromSession } from './api-credits-checkout';

describe('API credit pricing', () => {
  it('uses integer cents, integer credits, and positive integer call costs', () => {
    expect(creditTopUpPackages.map((item) => item.amountCents)).toEqual([500, 1000, 2500, 5000]);
    for (const item of creditTopUpPackages)
      expect(Number.isInteger(creditsForAmountCents(item.amountCents))).toBe(true);
    for (const cost of Object.values(apiCallCosts)) {
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
    expect(creditsForAmountCents(500)).toBe(5000);
  });

  it('rejects fractional or non-positive amounts', () => {
    expect(() => creditsForAmountCents(4.5)).toThrow(RangeError);
    expect(() => creditsForAmountCents(0)).toThrow(RangeError);
  });

  it('only offers preset packages', () => {
    expect(findCreditTopUpPackage('usd_25')?.amountCents).toBe(2500);
    expect(findCreditTopUpPackage('usd_1000000')).toBeNull();
  });
});

describe('confirmedTopUpFromSession', () => {
  const paid = {
    id: 'cs_test_paid',
    mode: 'payment' as const,
    payment_status: 'paid' as const,
    amount_total: 1000,
    currency: 'usd',
    metadata: {
      product: 'vouchnet_api_credits',
      userId: '6b0c1f7e-2f1a-4d3e-9f55-3c1b2a4d5e6f',
      credits: '999999999',
    },
  };

  it('derives credits from the amount Stripe charged, not from metadata', () => {
    expect(confirmedTopUpFromSession(paid)).toEqual({
      userId: paid.metadata.userId,
      amountCents: 1000,
      currency: 'usd',
      providerReference: 'cs_test_paid',
    });
  });

  it('ignores unpaid, non-credit, non-USD, or malformed sessions', () => {
    expect(confirmedTopUpFromSession({ ...paid, payment_status: 'unpaid' })).toBeNull();
    expect(confirmedTopUpFromSession({ ...paid, mode: 'subscription' })).toBeNull();
    expect(confirmedTopUpFromSession({ ...paid, currency: 'eur' })).toBeNull();
    expect(confirmedTopUpFromSession({ ...paid, amount_total: null })).toBeNull();
    expect(
      confirmedTopUpFromSession({ ...paid, metadata: { ...paid.metadata, userId: 'nope' } }),
    ).toBeNull();
    expect(
      confirmedTopUpFromSession({
        ...paid,
        metadata: { ...paid.metadata, product: 'vouchnet_plus' },
      }),
    ).toBeNull();
  });
});
