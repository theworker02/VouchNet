import 'server-only';
import type Stripe from 'stripe';
import { createSqlClient } from '@nexus/db';
import {
  apiCallCosts,
  creditTopUpPackages,
  creditsForAmountCents,
  creditsPerUsd,
  type ApiOperation,
} from './api-credits-config';
import { confirmedTopUpFromSession } from './api-credits-checkout';
import {
  getCreditBalance,
  listCreditActivity,
  recordTopUp,
  spendCredits,
  summarizeCreditUsage,
} from './api-credits-ledger';

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

export async function getCreditOverview(userId: string) {
  const sql = client();
  try {
    const [balanceCredits, usage30d, activity] = await Promise.all([
      getCreditBalance(sql, userId),
      summarizeCreditUsage(sql, userId, 30),
      listCreditActivity(sql, userId, 10),
    ]);
    return {
      balanceCredits,
      creditsPerUsd,
      packages: creditTopUpPackages.map((item) => ({
        ...item,
        credits: creditsForAmountCents(item.amountCents),
      })),
      costs: apiCallCosts,
      usage30d,
      activity,
    };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/**
 * Charges one metered call outside an existing transaction. Entry points whose work is a database
 * transaction should instead call `spendCredits` inside that transaction so failures are free.
 * The future MCP gateway must call this (or `spendCredits`) before executing each tool.
 */
export async function chargeApiCall(input: {
  userId: string;
  operation: ApiOperation;
  developerClientId?: string | null;
}) {
  const sql = client();
  try {
    return await spendCredits(sql, input);
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** Called only from the signed Stripe webhook. Returns null for sessions that grant nothing. */
export async function creditCheckoutSession(session: Stripe.Checkout.Session) {
  const topUp = confirmedTopUpFromSession(session);
  if (topUp === null) return null;
  const sql = client();
  try {
    return await recordTopUp(sql, topUp);
  } finally {
    await sql.end({ timeout: 1 });
  }
}
