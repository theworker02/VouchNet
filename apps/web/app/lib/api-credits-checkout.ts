import type Stripe from 'stripe';

/** Stripe metadata marker for one-time API credit purchases. */
export const apiCreditsProduct = 'vouchnet_api_credits';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConfirmedTopUp = {
  userId: string;
  amountCents: number;
  currency: 'usd';
  providerReference: string;
};

/**
 * Converts a signed Checkout Session event into a top-up only when Stripe reports the payment as
 * collected. Credits are derived from the integer cents Stripe actually charged, never from
 * client-supplied or metadata-supplied credit counts.
 */
export function confirmedTopUpFromSession(
  session: Pick<
    Stripe.Checkout.Session,
    'id' | 'mode' | 'payment_status' | 'amount_total' | 'currency' | 'metadata'
  >,
): ConfirmedTopUp | null {
  if (session.mode !== 'payment' || session.metadata?.product !== apiCreditsProduct) return null;
  if (session.payment_status !== 'paid') return null;
  const userId = session.metadata.userId;
  if (userId === undefined || !uuidPattern.test(userId)) return null;
  if (session.currency !== 'usd') return null;
  const amountCents = session.amount_total;
  if (amountCents === null || !Number.isSafeInteger(amountCents) || amountCents <= 0) return null;
  return { userId, amountCents, currency: 'usd', providerReference: session.id };
}

export function isApiCreditCheckout(session: Pick<Stripe.Checkout.Session, 'mode' | 'metadata'>) {
  return session.mode === 'payment' && session.metadata?.product === apiCreditsProduct;
}
