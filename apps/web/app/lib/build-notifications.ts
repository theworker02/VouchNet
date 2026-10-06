import 'server-only';
import type { createSqlClient } from '@nexus/db';

export type Sql = ReturnType<typeof createSqlClient>;
/** The transaction handle passed to `sql.begin` callbacks. */
export type Transaction = Parameters<Parameters<Sql['begin']>[1]>[0];

/**
 * Build in Public notifications reuse the member notification inbox. A resource key aggregates
 * repeated events (for example, several build-log entries on one project) into one unread item.
 */
export async function notifyMember(
  client: Transaction,
  input: { userId: string; resourceKey: string; title: string; body: string; href: string },
): Promise<void> {
  await client`
    INSERT INTO member_notifications (user_id,category,resource_key,title,body,href)
    VALUES (${input.userId},'BUILD_IN_PUBLIC',${input.resourceKey.slice(0, 128)},
      ${input.title.slice(0, 160)},${input.body.slice(0, 500)},${input.href})
    ON CONFLICT (user_id,category,resource_key) DO UPDATE
      SET title=EXCLUDED.title,body=EXCLUDED.body,href=EXCLUDED.href,read_at=NULL,created_at=now()
  `;
}

export async function recordAudit(
  client: Transaction,
  input: {
    actorId: string;
    operation: string;
    resourceType: string;
    resourceId: string | null;
    policy: string;
  },
): Promise<void> {
  await client`
    INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
    VALUES ('HUMAN',${input.actorId},${input.actorId},${input.operation},${input.resourceType},
      ${input.resourceId},${crypto.randomUUID()},'SUCCESS',${input.policy})
  `;
}

export function databaseClient(factory: typeof createSqlClient): Sql {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return factory(url);
}

export class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly status = 403,
  ) {
    super(code);
  }
}
