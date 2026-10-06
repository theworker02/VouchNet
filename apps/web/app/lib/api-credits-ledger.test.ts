import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  balanceOf,
  createTestDatabase,
  insertUser,
  ledgerOf,
  type TestDatabase,
} from '../../test/pglite-sql';
import {
  InsufficientCreditsError,
  getCreditBalance,
  listCreditActivity,
  recordTopUp,
  spendCredits,
  summarizeCreditUsage,
} from './api-credits-ledger';

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(async () => {
  await database.close();
});

async function fundedUser(amountCents: number) {
  const userId = await insertUser(database.db);
  await recordTopUp(database.sql, {
    userId,
    amountCents,
    currency: 'usd',
    providerReference: `cs_test_${userId}`,
  });
  return userId;
}

describe('API credit ledger', () => {
  it('records a top-up as integer credits with a ledger entry', async () => {
    const userId = await insertUser(database.db);
    const result = await recordTopUp(database.sql, {
      userId,
      amountCents: 500,
      currency: 'usd',
      providerReference: 'cs_test_topup_1',
    });
    expect(result).toEqual({ credited: true, credits: 5000, balanceCredits: 5000 });
    expect(await balanceOf(database.db, userId)).toBe(5000);
    expect(await ledgerOf(database.db, userId)).toEqual([
      expect.objectContaining({
        kind: 'TOP_UP',
        credits_delta: 5000,
        balance_after: 5000,
        provider_reference: 'cs_test_topup_1',
      }),
    ]);
  });

  it('credits a payment reference only once, including concurrent redeliveries', async () => {
    const userId = await insertUser(database.db);
    const topUp = {
      userId,
      amountCents: 1000,
      currency: 'usd' as const,
      providerReference: 'cs_test_redelivered',
    };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => recordTopUp(database.sql, topUp)),
    );
    expect(results.filter((result) => result.credited)).toHaveLength(1);
    const again = await recordTopUp(database.sql, topUp);
    expect(again).toEqual({ credited: false, credits: 0, balanceCredits: 10000 });
    expect(await balanceOf(database.db, userId)).toBe(10000);
    expect(await ledgerOf(database.db, userId)).toHaveLength(1);
  });

  it('spends the configured cost and records the operation and client', async () => {
    const userId = await fundedUser(1);
    const client = await database.db.query<{ id: string }>(
      `INSERT INTO developer_clients (owner_id,client_id,client_secret_hash,name,redirect_uris)
       VALUES ($1,'vn_ledger_test','hash','Ledger test','["https://example.com/callback"]'::jsonb) RETURNING id`,
      [userId],
    );
    const developerClientId = client.rows[0]?.id ?? null;
    const result = await spendCredits(database.sql, {
      userId,
      operation: 'v1.applicant_data',
      developerClientId,
    });
    expect(result).toEqual({ spentCredits: 2, balanceCredits: 8 });
    const ledger = await ledgerOf(database.db, userId);
    expect(ledger.at(-1)).toEqual(
      expect.objectContaining({
        kind: 'USAGE',
        credits_delta: -2,
        balance_after: 8,
        operation: 'v1.applicant_data',
        developer_client_id: developerClientId,
      }),
    );
  });

  it('refuses a call it cannot pay for without changing the balance or ledger', async () => {
    const userId = await insertUser(database.db);
    await expect(
      spendCredits(database.sql, { userId, operation: 'oauth.userinfo' }),
    ).rejects.toMatchObject({
      message: 'INSUFFICIENT_CREDITS',
      requiredCredits: 1,
      balanceCredits: 0,
    });
    const broke = await fundedUser(1);
    for (let call = 0; call < 5; call += 1)
      await spendCredits(database.sql, { userId: broke, operation: 'v1.applicant_data' });
    const error = await spendCredits(database.sql, {
      userId: broke,
      operation: 'v1.applicant_data',
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(InsufficientCreditsError);
    expect(await balanceOf(database.db, broke)).toBe(0);
    expect(await ledgerOf(database.db, userId)).toHaveLength(0);
  });

  it('never overspends when many calls race for the same balance', async () => {
    const userId = await fundedUser(3); // 30 credits
    const outcomes = await Promise.allSettled(
      Array.from({ length: 50 }, () =>
        spendCredits(database.sql, { userId, operation: 'oauth.userinfo' }),
      ),
    );
    const spent = outcomes.filter((outcome) => outcome.status === 'fulfilled');
    const refused = outcomes.filter(
      (outcome) =>
        outcome.status === 'rejected' && outcome.reason instanceof InsufficientCreditsError,
    );
    expect(spent).toHaveLength(30);
    expect(refused).toHaveLength(20);
    expect(await balanceOf(database.db, userId)).toBe(0);
    const usage = (await ledgerOf(database.db, userId)).filter((entry) => entry.kind === 'USAGE');
    expect(usage).toHaveLength(30);
    expect(new Set(usage.map((entry) => entry.balance_after)).size).toBe(30);
  });

  it('rolls a charge back when the paid work fails in the same transaction', async () => {
    const userId = await fundedUser(1);
    await expect(
      database.sql.begin(async (transaction) => {
        await spendCredits(transaction, { userId, operation: 'oauth.token' });
        throw new Error('WORK_FAILED');
      }),
    ).rejects.toThrow('WORK_FAILED');
    expect(await getCreditBalance(database.sql, userId)).toBe(10);
    expect((await ledgerOf(database.db, userId)).map((entry) => entry.kind)).toEqual(['TOP_UP']);
  });

  it('enforces a non-negative balance in the database itself', async () => {
    const userId = await fundedUser(1);
    await expect(
      database.db.query(
        'UPDATE api_credit_balances SET balance_credits=balance_credits-11 WHERE user_id=$1',
        [userId],
      ),
    ).rejects.toThrow(/check constraint/);
  });

  it('summarizes recent activity for the billing page', async () => {
    const userId = await fundedUser(2);
    await spendCredits(database.sql, { userId, operation: 'oauth.token' });
    await spendCredits(database.sql, { userId, operation: 'v1.applicant_data' });
    const activity = await listCreditActivity(database.sql, userId, 10);
    expect(activity.map((entry) => entry.kind).sort()).toEqual(['TOP_UP', 'USAGE', 'USAGE']);
    expect(activity.every((entry) => entry.createdAt instanceof Date)).toBe(true);
    expect(await summarizeCreditUsage(database.sql, userId, 30)).toEqual({ calls: 2, credits: 3 });
  });
});
