import 'server-only';
import { createSqlClient } from '@nexus/db';
import { databaseClient, type Sql } from './build-notifications';

/**
 * The vouch graph is a primitive: members are nodes and live, visible work vouches are directed
 * edges (author → recipient). Every query here returns only real edges; nothing is inferred.
 */

export type GraphNode = { userId: string; slug: string; name: string; initials: string };
export type GraphEdge = { id: string; from: string; to: string; skills: string[] };
export type Constellation = { centerId: string; nodes: GraphNode[]; edges: GraphEdge[] };

const sql = () => databaseClient(createSqlClient);

function visibleEdge(client: Sql, viewerId: string | null) {
  return client`(
    v.revoked_at IS NULL AND v.moderation_state='ACTIVE' AND v.hidden_by_recipient_at IS NULL
    AND (v.visibility='PUBLIC' OR (v.visibility='MEMBERS' AND ${viewerId}::uuid IS NOT NULL))
    AND EXISTS (SELECT 1 FROM users au WHERE au.id=v.author_id AND au.status='ACTIVE')
    AND EXISTS (SELECT 1 FROM users ru WHERE ru.id=v.recipient_id AND ru.status='ACTIVE')
    AND (${viewerId}::uuid IS NULL OR NOT EXISTS (SELECT 1 FROM blocks b
      WHERE (b.blocker_id=${viewerId}::uuid AND b.blocked_id IN (v.author_id,v.recipient_id))
         OR (b.blocked_id=${viewerId}::uuid AND b.blocker_id IN (v.author_id,v.recipient_id))))
  )`;
}

/** The member, the people who vouched for them, the people they vouched for, and edges among them. */
export async function getConstellation(
  centerId: string,
  viewerId: string | null,
  limit = 14,
): Promise<Constellation> {
  const client = sql();
  try {
    const neighbours = await client<{ userId: string }[]>`
      SELECT DISTINCT ON (other) other AS "userId" FROM (
        SELECT v.author_id AS other,v.created_at FROM work_vouches v
        WHERE v.recipient_id=${centerId} AND ${visibleEdge(client, viewerId)}
        UNION ALL
        SELECT v.recipient_id,v.created_at FROM work_vouches v
        WHERE v.author_id=${centerId} AND ${visibleEdge(client, viewerId)}
      ) n
      ORDER BY other,created_at DESC
      LIMIT ${limit}
    `;
    const ids = [centerId, ...neighbours.map((row) => row.userId)];
    const [nodes, edges] = await Promise.all([
      client<GraphNode[]>`
        SELECT user_id AS "userId",slug,first_name || ' ' || last_name AS name,
          upper(left(first_name,1) || left(last_name,1)) AS initials
        FROM profiles WHERE user_id = ANY(${ids}::uuid[])
      `,
      client<GraphEdge[]>`
        SELECT v.id,v.author_id AS "from",v.recipient_id AS "to",v.skills
        FROM work_vouches v
        WHERE v.author_id = ANY(${ids}::uuid[]) AND v.recipient_id = ANY(${ids}::uuid[])
          AND ${visibleEdge(client, viewerId)}
      `,
    ]);
    return { centerId, nodes, edges };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export type VouchedBuilder = {
  userId: string;
  slug: string;
  name: string;
  headline: string | null;
  vouchers: number;
  skills: string[];
  voucherNames: string[];
};

/**
 * Graph query: members vouched for in a skill (optional) by people who own or contribute to a
 * project (optional), e.g. "vouched for in Rust by people who contributed to Driftwood".
 */
export async function findVouchedBuilders(input: {
  viewerId: string | null;
  skill?: string | undefined;
  authorProjectId?: string | undefined;
  excludeUserId?: string | undefined;
  limit?: number;
}): Promise<VouchedBuilder[]> {
  const client = sql();
  const skill = input.skill?.trim().toLowerCase() ?? null;
  try {
    return await client<VouchedBuilder[]>`
      SELECT pr.user_id AS "userId",pr.slug,pr.first_name || ' ' || pr.last_name AS name,pr.headline,
        count(DISTINCT v.author_id)::int AS vouchers,
        (SELECT array_agg(DISTINCT s ORDER BY s) FROM work_vouches v2, unnest(v2.skills) s
          WHERE v2.recipient_id=pr.user_id AND v2.revoked_at IS NULL AND v2.moderation_state='ACTIVE'
            AND v2.hidden_by_recipient_at IS NULL AND v2.visibility='PUBLIC'
            AND (${skill}::text IS NULL OR lower(s)=${skill}::text)) AS skills,
        (array_agg(DISTINCT ap.first_name || ' ' || ap.last_name))[1:3] AS "voucherNames"
      FROM work_vouches v
      JOIN profiles pr ON pr.user_id=v.recipient_id
      JOIN profiles ap ON ap.user_id=v.author_id
      WHERE ${visibleEdge(client, input.viewerId)}
        AND (pr.visibility='PUBLIC' OR (pr.visibility='MEMBERS' AND ${input.viewerId}::uuid IS NOT NULL))
        AND (${input.excludeUserId ?? null}::uuid IS NULL OR v.recipient_id<>${input.excludeUserId ?? null}::uuid)
        AND (${skill}::text IS NULL OR EXISTS (SELECT 1 FROM unnest(v.skills) s WHERE lower(s)=${skill}::text))
        AND (${input.authorProjectId ?? null}::uuid IS NULL OR EXISTS (
          SELECT 1 FROM projects p WHERE p.id=${input.authorProjectId ?? null}::uuid AND (p.owner_id=v.author_id
            OR EXISTS (SELECT 1 FROM project_contributors c WHERE c.project_id=p.id
              AND c.user_id=v.author_id AND c.status='ACCEPTED'))))
      GROUP BY pr.user_id,pr.slug,pr.first_name,pr.last_name,pr.headline
      ORDER BY vouchers DESC,max(v.created_at) DESC
      LIMIT ${input.limit ?? 6}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Skills with the most distinct vouchers across public vouches, for discovery filters. */
export async function topVouchedSkills(limit = 8): Promise<{ skill: string; vouchers: number }[]> {
  const client = sql();
  try {
    return await client<{ skill: string; vouchers: number }[]>`
      SELECT min(s) AS skill,count(DISTINCT v.author_id)::int AS vouchers
      FROM work_vouches v, unnest(v.skills) s
      WHERE ${visibleEdge(client, null)}
      GROUP BY lower(s)
      ORDER BY vouchers DESC,min(s)
      LIMIT ${limit}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Distinct people vouching for each member, used as a bounded discovery-ranking signal. */
export async function voucherCounts(userIds: readonly string[]): Promise<Map<string, number>> {
  const output = new Map<string, number>();
  if (userIds.length === 0) return output;
  const client = sql();
  try {
    const rows = await client<{ userId: string; vouchers: number }[]>`
      SELECT v.recipient_id AS "userId",count(DISTINCT v.author_id)::int AS vouchers
      FROM work_vouches v
      WHERE v.recipient_id = ANY(${[...new Set(userIds)]}::uuid[]) AND ${visibleEdge(client, null)}
      GROUP BY v.recipient_id
    `;
    for (const row of rows) output.set(row.userId, row.vouchers);
    return output;
  } finally {
    await client.end({ timeout: 1 });
  }
}
