import 'server-only';
import { createSqlClient } from '@nexus/db';
import { databaseClient, type Sql } from './build-notifications';
import { reputationConfig } from './reputation-config';
import {
  computeActivityPoints,
  computeReputation,
  type ActivityEvent,
  type Reputation,
  type ReputationVouch,
} from './reputation-model';
import type { VerificationLevel, VouchRelationship } from './vouch-model';

type EventRow = {
  userId: string;
  id: string;
  type: ActivityEvent['type'];
  occurredAt: Date;
  onOwnContent: boolean;
  revoked: boolean;
};

/**
 * Loads participation events for many members at once. Deleted or moderated content and explicit
 * revocations are returned as revoked so the model can skip them without consuming daily caps.
 */
async function loadActivityEvents(
  client: Sql,
  userIds: readonly string[],
): Promise<Map<string, ActivityEvent[]>> {
  const result = new Map<string, ActivityEvent[]>();
  if (userIds.length === 0) return result;
  const ids = [...new Set(userIds)];
  const windowDays = reputationConfig.windowDays;
  const rows = await client<EventRow[]>`
    SELECT p.author_id AS "userId",p.id,'POST' AS type,COALESCE(p.published_at,p.created_at) AS "occurredAt",
      false AS "onOwnContent",
      (p.status<>'PUBLISHED' OR p.deleted_at IS NOT NULL OR r.resource_id IS NOT NULL) AS revoked
    FROM posts p
    LEFT JOIN activity_point_revocations r ON r.resource_type='POST' AND r.resource_id=p.id
    WHERE p.author_id = ANY(${ids}::uuid[]) AND p.status<>'DRAFT'
      AND COALESCE(p.published_at,p.created_at) > now() - make_interval(days => ${windowDays})
    UNION ALL
    SELECT c.author_id,c.id,
      CASE WHEN c.parent_comment_id IS NULL THEN 'COMMENT' ELSE 'REPLY' END,
      c.created_at,
      (CASE WHEN c.parent_comment_id IS NULL THEN p.author_id=c.author_id ELSE parent.author_id=c.author_id END),
      (c.deleted_at IS NOT NULL OR r.resource_id IS NOT NULL)
    FROM post_comments c
    JOIN posts p ON p.id=c.post_id
    LEFT JOIN post_comments parent ON parent.id=c.parent_comment_id
    LEFT JOIN activity_point_revocations r ON r.resource_type='COMMENT' AND r.resource_id=c.id
    WHERE c.author_id = ANY(${ids}::uuid[])
      AND c.created_at > now() - make_interval(days => ${windowDays})
    UNION ALL
    SELECT l.author_id,l.id,'BUILD_LOG',l.created_at,false,
      (l.deleted_at IS NOT NULL OR l.moderated_at IS NOT NULL OR r.resource_id IS NOT NULL)
    FROM project_build_logs l
    LEFT JOIN activity_point_revocations r ON r.resource_type='BUILD_LOG' AND r.resource_id=l.id
    WHERE l.author_id = ANY(${ids}::uuid[])
      AND l.created_at > now() - make_interval(days => ${windowDays})
  `;
  for (const id of ids) result.set(id, []);
  for (const row of rows)
    result.get(row.userId)?.push({
      id: row.id,
      type: row.type,
      occurredAt: new Date(row.occurredAt),
      onOwnContent: row.onOwnContent,
      revoked: row.revoked,
    });
  return result;
}

type VouchRow = {
  recipientId: string;
  authorId: string;
  relationship: VouchRelationship;
  verificationLevel: VerificationLevel;
  reciprocal: boolean;
};

/** Reputation for several members, used by profiles and discovery ranking. */
export async function getReputations(userIds: readonly string[]): Promise<Map<string, Reputation>> {
  const output = new Map<string, Reputation>();
  if (userIds.length === 0) return output;
  const client = databaseClient(createSqlClient);
  try {
    const vouches = await client<VouchRow[]>`
      SELECT v.recipient_id AS "recipientId",v.author_id AS "authorId",v.relationship,
        v.verification_level AS "verificationLevel",(v.reciprocal_signal_at IS NOT NULL) AS reciprocal
      FROM work_vouches v
      JOIN users a ON a.id=v.author_id AND a.status='ACTIVE'
      WHERE v.recipient_id = ANY(${[...new Set(userIds)]}::uuid[])
        AND v.revoked_at IS NULL AND v.moderation_state='ACTIVE' AND v.hidden_by_recipient_at IS NULL
    `;
    const events = await loadActivityEvents(client, [
      ...userIds,
      ...vouches.map((vouch) => vouch.authorId),
    ]);
    const now = new Date();
    const authorPoints = new Map<string, number>();
    const pointsFor = (id: string) => {
      const cached = authorPoints.get(id);
      if (cached !== undefined) return cached;
      const points = computeActivityPoints(events.get(id) ?? [], now).points;
      authorPoints.set(id, points);
      return points;
    };
    for (const userId of new Set(userIds)) {
      const received: ReputationVouch[] = vouches
        .filter((vouch) => vouch.recipientId === userId)
        .map((vouch) => ({
          relationship: vouch.relationship,
          verificationLevel: vouch.verificationLevel,
          authorActivityPoints: pointsFor(vouch.authorId),
          reciprocal: vouch.reciprocal,
        }));
      output.set(userId, computeReputation(events.get(userId) ?? [], received, now));
    }
    return output;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getReputation(userId: string): Promise<Reputation> {
  const reputations = await getReputations([userId]);
  const reputation = reputations.get(userId);
  if (reputation === undefined) throw new Error('REPUTATION_UNAVAILABLE');
  return reputation;
}
