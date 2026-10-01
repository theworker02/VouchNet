import { describe, expect, it } from 'vitest';
import { stripeEntitlementStatus } from './stripe-entitlement';

describe('stripeEntitlementStatus', () => {
  it('grants a normal active subscription', () => {
    expect(
      stripeEntitlementStatus({
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
      }),
    ).toBe('ACTIVE');
  });

  it('revokes entitlement as soon as cancellation is requested', () => {
    expect(
      stripeEntitlementStatus({
        status: 'active',
        cancel_at_period_end: true,
        canceled_at: null,
      }),
    ).toBe('CANCELED');
  });

  it('does not grant past-due subscriptions', () => {
    expect(
      stripeEntitlementStatus({
        status: 'past_due',
        cancel_at_period_end: false,
        canceled_at: null,
      }),
    ).toBe('PAST_DUE');
  });
});
