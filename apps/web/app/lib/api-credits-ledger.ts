import type { SqlClient, TransactionSql } from '@nexus/db';
import { costForOperation, creditsForAmountCents, type ApiOperation } from './api-credits-config';

/**
 * Prepaid API credit ledger. Every function receives the caller's SQL client so a metered request
 * can spend credits inside the same transaction as the work it pays for: if the work fails, the
 * transaction rolls back and the member is not charged.
 *
 * Balances and deltas are integer credits. `api_credit_balances.balance_credits` carries a
 * `CHECK (balance_credits >= 0)` constraint as a final guard against overspending.
 */
type Queryable = SqlClient | TransactionSql;

export class InsufficientCreditsError extends Error {
  constructor(
    readonly requiredCredits: number,
    readonly balanceCredits: number,
  ) {
    super('INSUFFICIENT_CREDITS');
  }
}

class TopUpAlreadyRecorded extends Error {}

export type CreditActivity = {
  id: string;
  kind: 'TOP_UP' | 'USAGE' | 'ADJUSTMENT';
  creditsDelta: number;
  balanceAfter: number;
  operation: string | null;
  amountCents: number | null;
  createdAt: Date;
};

export async function getCreditBalance(sql: Queryable, userId: string): Promise<number> {
  const rows = await sql<{ balance_credits: number }[]>`
    SELECT balance_credits FROM api_credit_balances WHERE user_id=${userId}::uuid
  `;
  return rows[0]?.balance_credits ?? 0;
}

/**
 * Spends the configured cost for one metered call.
 *
 * The debit is a single conditional UPDATE: PostgreSQL locks the balance row and re-checks
 * `balance_credits >= cost` against the latest committed value, so concurrent requests serialize
 * on that row and can never drive the balance below zero. The usage ledger row is written by the
 * same statement, so a debit can never exist without its ledger entry (or vice versa).
 */
export async function spendCredits(
  sql: Queryable,
  input: { userId: string; operation: ApiOperation; developerClientId?: string | null },
): Promise<{ spentCredits: number; balanceCredits: number }> {
  const cost = costForOperation(input.operation);
  const rows = await sql<{ balance_after: number }[]>`
    WITH debited AS (
      UPDATE api_credit_balances
      SET balance_credits=balance_credits-${cost}::int,updated_at=now()
      WHERE user_id=${input.userId}::uuid AND balance_credits>=${cost}::int
      RETURNING user_id,balance_credits
    )
    INSERT INTO api_credit_ledger (user_id,kind,credits_delta,balance_after,operation,developer_client_id)
    SELECT user_id,'USAGE',${-cost}::int,balance_credits,${input.operation}::text,${input.developerClientId ?? null}::uuid
    FROM debited
    RETURNING balance_after
  `;
  const entry = rows[0];
  if (entry === undefined)
    throw new InsufficientCreditsError(cost, await getCreditBalance(sql, input.userId));
  return { spentCredits: cost, balanceCredits: entry.balance_after };
}

/**
 * Credits a confirmed payment exactly once. `providerReference` (the Stripe Checkout Session id)
 * is unique in the ledger, so a redelivered or concurrently delivered webhook finds the existing
 * entry, rolls its own balance increment back, and reports `credited: false`.
 */
export async function recordTopUp(
  sql: SqlClient,
  input: { userId: string; amountCents: number; currency: 'usd'; providerReference: string },
): Promise<{ credited: boolean; credits: number; balanceCredits: number }> {
  const credits = creditsForAmountCents(input.amountCents);
  try {
    return await sql.begin(async (transaction) => {
      // Locking the balance row first serializes concurrent deliveries for the same member.
      const balance = await transaction<{ balance_credits: number }[]>`
        INSERT INTO api_credit_balances (user_id,balance_credits)
        VALUES (${input.userId}::uuid,${credits}::int)
        ON CONFLICT (user_id) DO UPDATE SET
          balance_credits=api_credit_balances.balance_credits+EXCLUDED.balance_credits,updated_at=now()
        RETURNING balance_credits
      `;
      const balanceAfter = balance[0]?.balance_credits;
      if (balanceAfter === undefined) throw new Error('CREDIT_BALANCE_WRITE_FAILED');
      const entry = await transaction<{ id: string }[]>`
        INSERT INTO api_credit_ledger (user_id,kind,credits_delta,balance_after,amount_cents,currency,provider_reference)
        VALUES (${input.userId}::uuid,'TOP_UP',${credits}::int,${balanceAfter}::int,${input.amountCents}::int,${input.currency}::text,${input.providerReference}::text)
        ON CONFLICT (provider_reference) DO NOTHING
        RETURNING id
      `;
      if (entry[0] === undefined) throw new TopUpAlreadyRecorded();
      return { credited: true, credits, balanceCredits: balanceAfter };
    });
  } catch (error) {
    if (!(error instanceof TopUpAlreadyRecorded)) throw error;
    return {
      credited: false,
      credits: 0,
      balanceCredits: await getCreditBalance(sql, input.userId),
    };
  }
}

export async function listCreditActivity(
  sql: Queryable,
  userId: string,
  limit = 20,
): Promise<CreditActivity[]> {
  const rows = await sql<
    {
      id: string;
      kind: CreditActivity['kind'];
      credits_delta: number;
      balance_after: number;
      operation: string | null;
      amount_cents: number | null;
      created_at: Date;
    }[]
  >`
    SELECT id,kind,credits_delta,balance_after,operation,amount_cents,created_at
    FROM api_credit_ledger WHERE user_id=${userId}::uuid
    ORDER BY created_at DESC,id DESC LIMIT ${Math.min(Math.max(limit, 1), 100)}::int
  `;
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    creditsDelta: row.credits_delta,
    balanceAfter: row.balance_after,
    operation: row.operation,
    amountCents: row.amount_cents,
    createdAt: new Date(row.created_at),
  }));
}

export async function summarizeCreditUsage(
  sql: Queryable,
  userId: string,
  days = 30,
): Promise<{ calls: number; credits: number }> {
  const rows = await sql<{ calls: number; credits: number }[]>`
    SELECT count(*)::int AS calls,COALESCE(-sum(credits_delta),0)::int AS credits
    FROM api_credit_ledger
    WHERE user_id=${userId}::uuid AND kind='USAGE' AND created_at>now()-make_interval(days => ${days}::int)
  `;
  return { calls: rows[0]?.calls ?? 0, credits: rows[0]?.credits ?? 0 };
}
