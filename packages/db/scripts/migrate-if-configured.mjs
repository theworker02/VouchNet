/**
 * Runs pending Drizzle migrations only when DATABASE_URL is configured.
 * Used by the Netlify build so production deploys migrate automatically while
 * preview/dev builds without a database skip cleanly.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (process.env.DATABASE_URL === undefined) {
  process.stdout.write('DATABASE_URL is not set; skipping database migrations.\n');
  process.exit(0);
}
const migratePath = fileURLToPath(new URL('./migrate.mjs', import.meta.url));
const result = spawnSync(process.execPath, [migratePath], { stdio: 'inherit' });
process.exit(result.status ?? 1);
