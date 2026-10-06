import { readFile } from 'node:fs/promises';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import type { SqlClient } from '@nexus/db';

/**
 * Test-only PostgreSQL. PGlite runs real PostgreSQL in-process, so the repository's actual
 * migrations, constraints, and SQL are exercised. The adapter implements the subset of the
 * postgres.js tagged-template API used by repositories (`sql\`\``, `sql.begin`, `sql.end`).
 */
const migrationDirectory = new URL('../../../packages/db/drizzle/', import.meta.url);

type Runner = Pick<PGlite | Transaction, 'query'>;

function tagged(runner: Runner) {
  return async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.reduce(
      (query, part, index) => query + (index === 0 ? '' : `$${index}`) + part,
      '',
    );
    const result = await runner.query(text, values);
    return result.rows;
  };
}

export type TestDatabase = { db: PGlite; sql: SqlClient; close: () => Promise<void> };

export async function createTestDatabase(): Promise<TestDatabase> {
  const db = await PGlite.create();
  const journal = JSON.parse(
    await readFile(new URL('meta/_journal.json', migrationDirectory), 'utf8'),
  ) as { entries: { tag: string }[] };
  for (const migration of journal.entries) {
    const source = await readFile(new URL(`${migration.tag}.sql`, migrationDirectory), 'utf8');
    for (const statement of source.split('--> statement-breakpoint')) {
      if (statement.trim().length > 0) await db.exec(statement);
    }
  }
  const sql = Object.assign(tagged(db), {
    begin: <T>(callback: (transaction: ReturnType<typeof tagged>) => Promise<T>) =>
      db.transaction((transaction) => callback(tagged(transaction))),
    end: async () => undefined,
  });
  return { db, sql: sql as unknown as SqlClient, close: () => db.close() };
}

export async function insertUser(db: PGlite): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO users (password_hash,status) VALUES ('not-a-real-hash','ACTIVE') RETURNING id`,
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new Error('TEST_USER_NOT_CREATED');
  return id;
}

export async function balanceOf(db: PGlite, userId: string): Promise<number> {
  const result = await db.query<{ balance_credits: number }>(
    'SELECT balance_credits FROM api_credit_balances WHERE user_id=$1',
    [userId],
  );
  return result.rows[0]?.balance_credits ?? 0;
}

export async function ledgerOf(db: PGlite, userId: string) {
  const result = await db.query<{
    kind: string;
    credits_delta: number;
    balance_after: number;
    operation: string | null;
    developer_client_id: string | null;
    provider_reference: string | null;
  }>(
    'SELECT kind,credits_delta,balance_after,operation,developer_client_id,provider_reference FROM api_credit_ledger WHERE user_id=$1 ORDER BY created_at,id',
    [userId],
  );
  return result.rows;
}
