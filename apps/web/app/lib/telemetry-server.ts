import { createSqlClient } from '@nexus/db';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ErrorStatus = 'UNRESOLVED' | 'TRIAGED' | 'RESOLVED' | 'IGNORED';

export type ErrorEvent = {
  componentStack: string | null;
  createdAt: Date;
  errorMessage: string;
  errorName: string;
  id: string;
  route: string;
  sessionId: string | null;
  severity: ErrorSeverity;
  stackTrace: string | null;
  status: ErrorStatus;
  userAgent: string | null;
  userId: string | null;
};

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(databaseUrl);
}

export async function recordErrorEvent(
  input: Omit<ErrorEvent, 'createdAt' | 'id' | 'status'> & { status?: ErrorStatus },
): Promise<void> {
  const client = sql();
  try {
    await client`
      INSERT INTO error_events (
        user_id,session_id,error_name,error_message,stack_trace,component_stack,route,user_agent,severity,status
      ) VALUES (
        ${input.userId},${input.sessionId},${input.errorName},${input.errorMessage},${input.stackTrace},
        ${input.componentStack},${input.route},${input.userAgent},${input.severity},${input.status ?? 'UNRESOLVED'}
      )
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function isAdministrator(userId: string): Promise<boolean> {
  const client = sql();
  try {
    const rows = await client<{ id: string }[]>`
      SELECT id FROM users WHERE id=${userId} AND role='ADMIN' AND status='ACTIVE' LIMIT 1
    `;
    return rows[0] !== undefined;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listErrorEvents(limit = 100): Promise<ErrorEvent[]> {
  const client = sql();
  try {
    return await client<ErrorEvent[]>`
      SELECT id,user_id AS "userId",session_id AS "sessionId",error_name AS "errorName",
        error_message AS "errorMessage",stack_trace AS "stackTrace",component_stack AS "componentStack",
        route,user_agent AS "userAgent",severity,status,created_at AS "createdAt"
      FROM error_events
      ORDER BY CASE status WHEN 'UNRESOLVED' THEN 0 WHEN 'TRIAGED' THEN 1 ELSE 2 END,
        CASE severity WHEN 'CRITICAL' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT ${limit}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function updateErrorStatus(id: string, status: ErrorStatus): Promise<boolean> {
  const client = sql();
  try {
    const rows = await client<{ id: string }[]>`
      UPDATE error_events SET status=${status},updated_at=now() WHERE id=${id} RETURNING id
    `;
    return rows[0] !== undefined;
  } finally {
    await client.end({ timeout: 1 });
  }
}
