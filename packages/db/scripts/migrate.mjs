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
  const applied =
    await sql`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`;
  const lastApplied = Number(applied[0]?.created_at ?? 0);
  for (const migration of journal.entries) {
    if (migration.when <= lastApplied) continue;
    const filename = `${migration.tag}.sql`;
    if (!files.has(filename)) throw new Error(`Migration file is missing: ${filename}`);
    const source = await readFile(join(migrationDirectory, filename), 'utf8');
    const statements = source
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter(Boolean);
    const hash = createHash('sha256').update(source).digest('hex');
    await sql.begin(async (transaction) => {
      for (const statement of statements) await transaction.unsafe(statement);
      await transaction`INSERT INTO drizzle.__drizzle_migrations (hash,created_at) VALUES (${hash},${migration.when})`;
    });
    process.stdout.write(`Applied ${migration.tag}\n`);
  }
  process.stdout.write('Migrations are current.\n');
} finally {
  await sql.end({ timeout: 1 });
}
