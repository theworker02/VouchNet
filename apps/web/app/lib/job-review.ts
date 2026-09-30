import { randomUUID } from 'node:crypto';
import { createSqlClient } from '@nexus/db';

type ReviewDecision = 'APPROVE' | 'REJECT';
type ReviewResource = 'JOB' | 'SOURCE';

export class JobReviewError extends Error {
  constructor(readonly code: 'NOT_AUTHORIZED' | 'REVIEW_TARGET_NOT_FOUND') {
    super(code);
  }
}

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(databaseUrl);
}

/**
 * Publishing and source activation are intentionally an operator-only boundary.
 * Employer submissions are not evidence of ownership and provider imports are not
 * allowed to begin until a human VouchNet administrator has reviewed the record.
 */
export async function reviewJobResource(input: {
  actor: { sessionId: string; userId: string };
  decision: ReviewDecision;
  resource: ReviewResource;
  resourceId: string;
}): Promise<void> {
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      const administrators = await transaction<{ id: string }[]>`
        SELECT id FROM users WHERE id=${input.actor.userId} AND role='ADMIN' AND status='ACTIVE'
      `;
      if (administrators[0] === undefined) throw new JobReviewError('NOT_AUTHORIZED');

      if (input.resource === 'JOB') {
        const result = await transaction<{ id: string }[]>`
          UPDATE jobs
          SET source_status=${input.decision === 'APPROVE' ? 'SOURCE_REVIEWED' : 'REJECTED'},
              employer_review_status=${input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'},
              published_at=CASE WHEN ${input.decision === 'APPROVE'} THEN now() ELSE published_at END,
              source_checked_at=now(),updated_at=now()
          WHERE id=${input.resourceId} AND source_status='PENDING_REVIEW' AND deleted_at IS NULL
          RETURNING id
        `;
        if (result[0] === undefined) throw new JobReviewError('REVIEW_TARGET_NOT_FOUND');
      } else {
        const result = await transaction<{ id: string }[]>`
          UPDATE job_sources
          SET status=${input.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED'},
              reviewed_at=now(),updated_at=now()
          WHERE id=${input.resourceId} AND status='PENDING_REVIEW'
          RETURNING id
        `;
        if (result[0] === undefined) throw new JobReviewError('REVIEW_TARGET_NOT_FOUND');
      }

      await transaction`
        INSERT INTO audit_events (
          actor_type,actor_id,user_id,session_id,operation,resource_type,resource_id,request_id,result,policy_decision
        ) VALUES (
          'MODERATOR',${input.actor.userId},${input.actor.userId},${input.actor.sessionId},
          ${`JOB_${input.resource}_${input.decision}`},${input.resource},${input.resourceId},${randomUUID()},'SUCCESS','HUMAN_REVIEW_REQUIRED'
        )
      `;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
