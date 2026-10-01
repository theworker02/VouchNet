import type Stripe from 'stripe';
import type { SubscriptionSummary } from './subscription';

/**
 * A cancellation request revokes paid capability immediately. This is stricter than Stripe's
 * default period-end billing behavior and deliberately prevents paid tools from remaining usable
 * after a member has asked to cancel.
 */
export function stripeEntitlementStatus(
  subscription: Pick<Stripe.Subscription, 'status' | 'cancel_at_period_end' | 'canceled_at'>,
): SubscriptionSummary['status'] {
  if (
    subscription.cancel_at_period_end ||
    subscription.canceled_at !== null ||
    subscription.status === 'canceled'
  )
    return 'CANCELED';
  if (subscription.status === 'active' || subscription.status === 'trialing') return 'ACTIVE';
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') return 'PAST_DUE';
  return 'EXPIRED';
}
