import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  balanceOf,
  createTestDatabase,
  insertUser,
  ledgerOf,
  type TestDatabase,
} from '../../../../test/pglite-sql';
import { POST } from './route';

const state = vi.hoisted(() => ({ database: null as TestDatabase | null }));
const subscription = vi.hoisted(() => ({
  syncStripeDeveloperAccess: vi.fn(async () => undefined),
  syncStripeSubscription: vi.fn(async () => undefined),
}));

vi.mock('@nexus/db', () => ({
  createSqlClient: () => {
    if (state.database === null) throw new Error('TEST_DATABASE_NOT_READY');
    return state.database.sql;
  },
}));
vi.mock('../../../lib/subscription', () => subscription);

const webhookSigningSecret = 'whsec_test_api_credits';
process.env.STRIPE_SECRET_KEY = 'sk_test_api_credits_unit';
process.env.STRIPE_WEBHOOK_SECRET = webhookSigningSecret;
process.env.DATABASE_URL = 'postgres://pglite.invalid/test';

const stripe = new Stripe('sk_test_api_credits_unit');

let userId: string;

beforeAll(async () => {
  state.database = await createTestDatabase();
});

afterAll(async () => {
  await state.database?.close();
});

beforeEach(async () => {
  userId = await insertUser(state.database!.db);
  subscription.syncStripeDeveloperAccess.mockClear();
});

function signedRequest(event: object, secret = webhookSigningSecret) {
  const payload = JSON.stringify(event);
  return new NextRequest('https://vouchnet.dev/api/billing/webhook', {
    method: 'POST',
    body: payload,
    headers: {
      'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret }),
    },
  });
}

function creditCheckoutEvent(
  sessionId: string,
  overrides: Record<string, unknown> = {},
  type = 'checkout.session.completed',
) {
  return {
    id: `evt_${sessionId}_${type}`,
    object: 'event',
    type,
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        mode: 'payment',
        payment_status: 'paid',
        amount_total: 2500,
        currency: 'usd',
        subscription: null,
        metadata: { userId, product: 'vouchnet_api_credits', packageId: 'usd_25' },
        ...overrides,
      },
    },
  };
}

describe('Stripe webhook: API credit top-ups', () => {
  it('credits the balance only after a signed, paid checkout session', async () => {
    const response = await POST(signedRequest(creditCheckoutEvent('cs_test_paid_25')));
    expect(response.status).toBe(200);
    expect(await balanceOf(state.database!.db, userId)).toBe(25000);
  });

  it('is idempotent across redelivery and the async-payment follow-up event', async () => {
    const event = creditCheckoutEvent('cs_test_redelivery');
    for (let attempt = 0; attempt < 3; attempt += 1)
      expect((await POST(signedRequest(event))).status).toBe(200);
    const followUp = creditCheckoutEvent(
      'cs_test_redelivery',
      {},
      'checkout.session.async_payment_succeeded',
    );
    expect((await POST(signedRequest(followUp))).status).toBe(200);
    expect(await balanceOf(state.database!.db, userId)).toBe(25000);
    expect(await ledgerOf(state.database!.db, userId)).toHaveLength(1);
  });

  it('waits for payment before crediting a delayed payment method', async () => {
    const pending = creditCheckoutEvent('cs_test_delayed', { payment_status: 'unpaid' });
    expect((await POST(signedRequest(pending))).status).toBe(200);
    expect(await balanceOf(state.database!.db, userId)).toBe(0);
    const succeeded = creditCheckoutEvent(
      'cs_test_delayed',
      {},
      'checkout.session.async_payment_succeeded',
    );
    expect((await POST(signedRequest(succeeded))).status).toBe(200);
    expect(await balanceOf(state.database!.db, userId)).toBe(25000);
  });

  it('rejects unsigned or forged events without crediting', async () => {
    const forged = await POST(
      signedRequest(creditCheckoutEvent('cs_test_forged'), 'whsec_attacker_secret'),
    );
    expect(forged.status).toBe(400);
    const unsigned = await POST(
      new NextRequest('https://vouchnet.dev/api/billing/webhook', {
        method: 'POST',
        body: JSON.stringify(creditCheckoutEvent('cs_test_unsigned')),
      }),
    );
    expect(unsigned.status).toBe(400);
    expect(await balanceOf(state.database!.db, userId)).toBe(0);
  });

  it('keeps accepting legacy Developer Access subscription events without granting credits', async () => {
    const response = await POST(
      signedRequest({
        id: 'evt_legacy_developer_access',
        object: 'event',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_legacy_developer_access',
            object: 'subscription',
            customer: 'cus_legacy',
            status: 'active',
            cancel_at_period_end: false,
            canceled_at: null,
            metadata: { userId, product: 'vouchnet_developer_access' },
            items: { data: [{ current_period_end: 1_900_000_000 }] },
          },
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(subscription.syncStripeDeveloperAccess).toHaveBeenCalledOnce();
    expect(await balanceOf(state.database!.db, userId)).toBe(0);
  });
});
