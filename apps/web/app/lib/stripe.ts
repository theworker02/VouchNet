import 'server-only';
import Stripe from 'stripe';

export class StripeConfigurationError extends Error {}

function required(name: 'STRIPE_SECRET_KEY' | 'STRIPE_PLUS_PRICE_ID' | 'STRIPE_WEBHOOK_SECRET') {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) throw new StripeConfigurationError(name);
  return value;
}

export function stripeClient() {
  return new Stripe(required('STRIPE_SECRET_KEY'));
}

export function plusPriceId() {
  return required('STRIPE_PLUS_PRICE_ID');
}

export function webhookSecret() {
  return required('STRIPE_WEBHOOK_SECRET');
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PLUS_PRICE_ID?.trim());
}

/** API credit top-ups use inline USD price_data, so only the Stripe secret key is required. */
export function isApiCreditsConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
}
