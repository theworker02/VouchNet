import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    max: 5,
    prepare: false,
    // Hosted/serverless callers must fail predictably when the database is unavailable rather
    // than consuming the platform's entire request budget while waiting for a TCP connection.
    connect_timeout: 5,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
  });
  return drizzle({ client, schema });
}

/** Server-only SQL client for transactional repositories. Never import this from React components. */
export function createSqlClient(databaseUrl: string) {
  // Repositories create and close one short-lived client per operation. A pool of ten in each
  // serverless invocation can multiply into connection exhaustion under concurrent traffic.
  return postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 5,
    idle_timeout: 20,
    max_lifetime: 60,
  });
}

export { schema };
