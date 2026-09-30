import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Foundation-only tables. Identity and social domain tables arrive in subsequent waves. */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    actorType: text('actor_type').notNull(),
    actorId: uuid('actor_id'),
    userId: uuid('user_id'),
    organizationId: uuid('organization_id'),
    sessionId: uuid('session_id'),
    credentialId: uuid('credential_id'),
    operation: text('operation').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    requestId: uuid('request_id').notNull(),
    approvalId: uuid('approval_id'),
    riskMetadata: jsonb('risk_metadata').notNull().default({}),
    result: text('result').notNull(),
    policyDecision: text('policy_decision').notNull(),
  },
  (table) => [
    index('audit_events_user_occurred_idx').on(table.userId, table.occurredAt),
    index('audit_events_request_idx').on(table.requestId),
  ],
);

export const trustEvents = pgTable(
  'trust_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    signalCode: text('signal_code').notNull(),
    score: bigint('score', { mode: 'number' }).notNull(),
    decision: text('decision').notNull(),
    reasonCodes: jsonb('reason_codes').notNull().default([]),
    requestId: uuid('request_id').notNull(),
  },
  (table) => [
    index('trust_events_subject_occurred_idx').on(
      table.subjectType,
      table.subjectId,
      table.occurredAt,
    ),
  ],
);

export const rateLimitEvents = pgTable(
  'rate_limit_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    dimension: text('dimension').notNull(),
    subjectHash: text('subject_hash').notNull(),
    policy: text('policy').notNull(),
    action: text('action').notNull(),
    requestId: uuid('request_id').notNull(),
  },
  (table) => [
    index('rate_limit_events_subject_occurred_idx').on(
      table.dimension,
      table.subjectHash,
      table.occurredAt,
    ),
  ],
);
