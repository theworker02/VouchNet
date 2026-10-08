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
  // Migrations are identified by their content hash, not journal timestamp. A past hand-authored
  // migration can legitimately have an out-of-order timestamp; skipping on the newest timestamp
  // would silently leave its schema absent in a fresh or repaired environment.
  const appliedRows = await sql`SELECT hash FROM drizzle.__drizzle_migrations`;
  const appliedHashes = new Set(appliedRows.map((row) => row.hash));
  for (const migration of journal.entries) {
    const filename = `${migration.tag}.sql`;
    if (!files.has(filename)) throw new Error(`Migration file is missing: ${filename}`);
    const source = await readFile(join(migrationDirectory, filename), 'utf8');
    const statements = source
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean);
    const hash = createHash('sha256').update(source).digest('hex');
    if (appliedHashes.has(hash)) continue;
    await sql.begin(async (transaction) => {
      for (const statement of statements) await transaction.unsafe(statement);
      await transaction`INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES (${hash},${migration.when})`;
    });
    appliedHashes.add(hash);
    process.stdout.write(`Applied ${migration.tag}\n`);
  }
  process.stdout.write('Migrations are current.\n');
} finally {
  await sql.end({ timeout: 1 });
}
