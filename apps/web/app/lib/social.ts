import { createSqlClient } from '@nexus/db';

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

const connectionRequestLimit = 10;
const connectionCooldownMilliseconds = 24 * 60 * 60 * 1000;

export class ConnectionCooldownError extends Error {
  constructor(readonly resetsAt: Date) {
    super('CONNECTION_COOLDOWN');
  }
}
async function blocked(client: ReturnType<typeof createSqlClient>, left: string, right: string) {
  const rows =
    await client`SELECT 1 FROM blocks WHERE (blocker_id=${left} AND blocked_id=${right}) OR (blocker_id=${right} AND blocked_id=${left})`;
  return rows.length > 0;
}
export async function follow(actorId: string, targetId: string) {
  if (actorId === targetId) throw new Error('SELF_RELATIONSHIP');
  const client = sql();
  try {
    if (await blocked(client, actorId, targetId)) throw new Error('BLOCKED_RELATIONSHIP');
    await client`INSERT INTO follows (follower_id,followed_id) VALUES (${actorId},${targetId}) ON CONFLICT DO NOTHING`;
  } finally {
    await client.end({ timeout: 1 });
  }
}
export async function unfollow(actorId: string, targetId: string) {
  const client = sql();
  try {
    await client`DELETE FROM follows WHERE follower_id=${actorId} AND followed_id=${targetId}`;
  } finally {
    await client.end({ timeout: 1 });
  }
}
export async function requestConnection(actorId: string, targetId: string) {
  if (actorId === targetId) throw new Error('SELF_RELATIONSHIP');
  const [low, high] = actorId < targetId ? [actorId, targetId] : [targetId, actorId];
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      const restrictions = await transaction<{ resets_at: Date }[]>`
        SELECT resets_at FROM connection_request_restrictions
        WHERE user_id=${actorId} AND resets_at>now() FOR UPDATE
      `;
      const restriction = restrictions[0];
      if (restriction !== undefined) throw new ConnectionCooldownError(restriction.resets_at);
      const blockedRows = await transaction`
        SELECT 1 FROM blocks
        WHERE (blocker_id=${actorId} AND blocked_id=${targetId})
           OR (blocker_id=${targetId} AND blocked_id=${actorId})
      `;
      if (blockedRows.length > 0) throw new Error('BLOCKED_RELATIONSHIP');
      const recent = await transaction<{ count: number }[]>`
        SELECT count(*)::int AS count FROM connections
        WHERE requester_id=${actorId} AND created_at>=now()-interval '24 hours'
      `;
      if ((recent[0]?.count ?? 0) >= connectionRequestLimit) {
        const resetsAt = new Date(Date.now() + connectionCooldownMilliseconds);
        await transaction`
          INSERT INTO connection_request_restrictions (user_id,reason_code,resets_at)
          VALUES (${actorId},'CONNECTION_REQUEST_VELOCITY',${resetsAt})
          ON CONFLICT (user_id) DO UPDATE
            SET reason_code=EXCLUDED.reason_code,imposed_at=now(),resets_at=EXCLUDED.resets_at,dismissed_at=NULL
        `;
        throw new ConnectionCooldownError(resetsAt);
      }
      const rows =
        await transaction`INSERT INTO connections (requester_id,recipient_id,pair_low_id,pair_high_id,state) VALUES (${actorId},${targetId},${low},${high},'PENDING') ON CONFLICT (pair_low_id,pair_high_id) DO NOTHING RETURNING id`;
      if (rows.length === 0) throw new Error('CONNECTION_EXISTS');
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getConnectionCooldown(userId: string): Promise<Date | null> {
  const client = sql();
  try {
    const rows = await client<{ resets_at: Date }[]>`
      SELECT resets_at FROM connection_request_restrictions WHERE user_id=${userId} AND resets_at>now()
    `;
    return rows[0]?.resets_at ?? null;
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Dismissal hides the reminder only; it never bypasses the server-side restriction. */
export async function dismissConnectionCooldown(userId: string): Promise<void> {
  const client = sql();
  try {
    await client`
      UPDATE connection_request_restrictions SET dismissed_at=now()
      WHERE user_id=${userId} AND resets_at>now()
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}
export async function respondToConnection(
  actorId: string,
  connectionId: string,
  state: 'ACCEPTED' | 'DECLINED',
) {
  const client = sql();
  try {
    const rows =
      await client`UPDATE connections SET state=${state},updated_at=now() WHERE id=${connectionId} AND recipient_id=${actorId} AND state='PENDING' RETURNING id`;
    if (rows.length !== 1) throw new Error('CONNECTION_NOT_ACTIONABLE');
  } finally {
    await client.end({ timeout: 1 });
  }
}
export async function block(actorId: string, targetId: string) {
  if (actorId === targetId) throw new Error('SELF_RELATIONSHIP');
  const client = sql();
  try {
    await client.begin(async (tx) => {
      await tx`INSERT INTO blocks (blocker_id,blocked_id) VALUES (${actorId},${targetId}) ON CONFLICT DO NOTHING`;
      await tx`DELETE FROM follows WHERE (follower_id=${actorId} AND followed_id=${targetId}) OR (follower_id=${targetId} AND followed_id=${actorId})`;
      await tx`DELETE FROM connections WHERE (pair_low_id=${actorId} AND pair_high_id=${targetId}) OR (pair_low_id=${targetId} AND pair_high_id=${actorId})`;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export interface NetworkOverview {
  contactCount: number;
  followingCount: number;
  pendingReceivedCount: number;
  pendingReceived: Array<{
    connectionId: string;
    firstName: string;
    lastName: string;
    headline: string | null;
    slug: string;
  }>;
}

/** Read model for the signed-in network page. It intentionally uses only relationship rows
 * involving the viewer; profile visibility does not turn a private profile into a suggestion. */
export async function getNetworkOverview(userId: string): Promise<NetworkOverview> {
  const client = sql();
  try {
    const [contacts, following, invitations] = await Promise.all([
      client<
        { count: number }[]
      >`SELECT COUNT(*)::int AS count FROM connections WHERE state='ACCEPTED' AND (requester_id=${userId} OR recipient_id=${userId})`,
      client<
        { count: number }[]
      >`SELECT COUNT(*)::int AS count FROM follows WHERE follower_id=${userId}`,
      client<
        {
          connection_id: string;
          first_name: string;
          last_name: string;
          headline: string | null;
          slug: string;
        }[]
      >`SELECT c.id AS connection_id,p.first_name,p.last_name,p.headline,p.slug
          FROM connections c
          JOIN profiles p ON p.user_id=c.requester_id
          WHERE c.recipient_id=${userId} AND c.state='PENDING'
          ORDER BY c.created_at DESC
          LIMIT 12`,
    ]);
    return {
      contactCount: contacts[0]?.count ?? 0,
      followingCount: following[0]?.count ?? 0,
      pendingReceivedCount: invitations.length,
      pendingReceived: invitations.map((invitation) => ({
        connectionId: invitation.connection_id,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        headline: invitation.headline,
        slug: invitation.slug,
      })),
    };
  } finally {
    await client.end({ timeout: 1 });
  }
}
