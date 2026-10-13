import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const migrationDirectory = fileURLToPath(new URL('../drizzle/', import.meta.url));
const journal = JSON.parse(
  await readFile(join(migrationDirectory, 'meta', '_journal.json'), 'utf8'),
);
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://nexus:nexus@localhost:5432/nexus';
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
  const files = new Set(await readdir(migrationDirectory));
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
  // Prefer the content hash, but also honor Drizzle's historical journal timestamp. Older
  // deployments may have been applied by Drizzle itself, which records a different hash format
  // for the same migration. Treating those rows as unknown would replay already-applied DDL on
  // every production build.
  const appliedRows = await sql`SELECT hash, created_at FROM drizzle.__drizzle_migrations`;
  const appliedHashes = new Set(appliedRows.map((row) => row.hash));
  const appliedTimes = new Set(appliedRows.map((row) => Number(row.created_at)));
  for (const migration of journal.entries) {
    const filename = `${migration.tag}.sql`;
    if (!files.has(filename)) throw new Error(`Migration file is missing: ${filename}`);
    const source = await readFile(join(migrationDirectory, filename), 'utf8');
    const statements = source
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean);
    const hash = createHash('sha256').update(source).digest('hex');
    if (appliedHashes.has(hash) || appliedTimes.has(Number(migration.when))) continue;
    await sql.begin(async (transaction) => {
      for (const statement of statements) await transaction.unsafe(statement);
      await transaction`INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES (${hash},${migration.when})`;
    });
    appliedHashes.add(hash);
    appliedTimes.add(Number(migration.when));
    process.stdout.write(`Applied ${migration.tag}\n`);
  }
  process.stdout.write('Migrations are current.\n');
} finally {
  await sql.end({ timeout: 1 });
}
