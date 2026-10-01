import 'server-only';

import { createHmac } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { createSqlClient } from '@nexus/db';
import { logger } from '@nexus/observability';

export type SecurityAuditAction =
  | 'FAILED_LOGIN_ATTEMPT'
  | 'LOGIN_SUCCEEDED'
  | 'PASSWORD_RESET'
  | 'OAUTH_APP_CREATED'
  | 'OAUTH_APP_REVOKED'
  | 'PRIVILEGE_ELEVATION'
  | 'SUSPICIOUS_RATE_LIMIT_EXCEEDED';

function database() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

function auditSalt(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret === undefined || secret.length < 32) throw new Error('AUDIT_SECRET_UNAVAILABLE');
  return secret;
}

function requestIp(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function hashIp(request: NextRequest): string {
  // HMAC prevents rainbow-table recovery of common IP addresses while retaining incident correlation.
  return createHmac('sha256', auditSalt()).update(requestIp(request)).digest('hex');
}

/** Records a privacy-minimized event without ever recording passwords, cookies, bearer tokens, or body data. */
export async function recordSecurityAuditEvent(input: {
  request: NextRequest;
  action: SecurityAuditAction;
  status: 'SUCCESS' | 'DENIED' | 'FAILURE';
  actorId?: string;
  sessionId?: string;
  metadata?: Record<string, boolean | number | string>;
}): Promise<void> {
  const sql = database();
  try {
    await sql`
      INSERT INTO security_audit_logs (actor_id,session_id,action,ip_hash,user_agent,request_id,status,metadata)
      VALUES (
        ${input.actorId ?? null},
        ${input.sessionId ?? null},
        ${input.action},
        ${hashIp(input.request)},
        ${(input.request.headers.get('user-agent') ?? '').slice(0, 512) || null},
        ${input.request.headers.get('x-request-id') ?? null},
        ${input.status},
        ${JSON.stringify(input.metadata ?? {})}::jsonb
      )
    `;
  } catch (error) {
    logger.error({
      operation: 'security_audit.write',
      outcome: 'failure',
      errorCode: error instanceof Error ? error.message : 'AUDIT_WRITE_FAILED',
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
