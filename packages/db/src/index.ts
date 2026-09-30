import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10, prepare: false });
  return drizzle({ client, schema });
}

/** Server-only SQL client for transactional repositories. Never import this from React components. */
export function createSqlClient(databaseUrl: string) {
  return postgres(databaseUrl, { max: 10, prepare: false });
}

export { schema };
