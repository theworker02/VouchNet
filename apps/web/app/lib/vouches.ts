import 'server-only';
import { randomUUID } from 'node:crypto';
import { createSqlClient } from '@nexus/db';

export const vouchKinds = ['RELIABLE', 'HELPFUL', 'COLLABORATIVE', 'EXCEPTIONAL'] as const;
export type VouchKind = (typeof vouchKinds)[number];

export interface ProfileVouch {
  id: string;
  kind: VouchKind;
  createdAt: Date;
  voucher: {
    slug: string;
    firstName: string;
    lastName: string;
  };
}

export class VouchError extends Error {
  constructor(
    readonly code:
      | 'CANNOT_VOUCH_FOR_SELF'
      | 'PROFILE_UNAVAILABLE'
      | 'BLOCKED_RELATIONSHIP'
      | 'CONNECTION_REQUIRED',
  ) {
    super(code);
  }
}

function client() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

/**
 * A Vouch is deliberately constrained to an accepted connection. It is a compact
 * professional signal, not a public review system that can be farmed by strangers.
 */
export async function saveProfileVouch(input: {
  voucherId: string;
  recipientId: string;
  kind: VouchKind;
}) {
  if (input.voucherId === input.recipientId) throw new VouchError('CANNOT_VOUCH_FOR_SELF');
  const sql = client();
  try {
    return await sql.begin(async (transaction) => {
      const recipient = await transaction<{ id: string }[]>`
        SELECT u.id
        FROM users u
        JOIN profiles p ON p.user_id=u.id
        WHERE u.id=${input.recipientId} AND u.status='ACTIVE'
        FOR UPDATE
      `;
      if (recipient[0] === undefined) throw new VouchError('PROFILE_UNAVAILABLE');

      const blocked = await transaction<{ blocked: boolean }[]>`
        SELECT EXISTS(
          SELECT 1 FROM blocks
          WHERE (blocker_id=${input.voucherId} AND blocked_id=${input.recipientId})
             OR (blocker_id=${input.recipientId} AND blocked_id=${input.voucherId})
        ) AS blocked
      `;
      if (blocked[0]?.blocked) throw new VouchError('BLOCKED_RELATIONSHIP');

      const connection = await transaction<{ id: string }[]>`
        SELECT id FROM connections
        WHERE pair_low_id=LEAST(${input.voucherId}::uuid,${input.recipientId}::uuid)
          AND pair_high_id=GREATEST(${input.voucherId}::uuid,${input.recipientId}::uuid)
          AND state='ACCEPTED'
      `;
      if (connection[0] === undefined) throw new VouchError('CONNECTION_REQUIRED');

      const vouch = await transaction<{ id: string }[]>`
        INSERT INTO profile_vouches (voucher_id,recipient_id,kind)
        VALUES (${input.voucherId},${input.recipientId},${input.kind})
        ON CONFLICT (voucher_id,recipient_id)
        DO UPDATE SET kind=EXCLUDED.kind,updated_at=now()
        RETURNING id
      `;
      const vouchId = vouch[0]?.id;
      if (vouchId === undefined) throw new Error('VOUCH_WRITE_FAILED');

      await transaction`
        INSERT INTO interaction_events (source_user_id,target_user_id,interaction_type,weight,resource_type,resource_id)
        VALUES (${input.voucherId},${input.recipientId},'PROFILE_VOUCH',8,'PROFILE_VOUCH',${vouchId})
      `;
      await transaction`
        INSERT INTO audit_events (actor_type,actor_id,user_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES ('HUMAN',${input.voucherId},${input.voucherId},'PROFILE_VOUCH','PROFILE_VOUCH',${vouchId},${randomUUID()},'SUCCESS','ALLOW_ACCEPTED_CONNECTION')
      `;
      return { id: vouchId };
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function getProfileVouches(viewerId: string | null, recipientId: string) {
  const sql = client();
  try {
    const settings = await sql<{ displayVouches: boolean }[]>`
      SELECT COALESCE((settings.privacy->>'displayVouches')::boolean,true) AS "displayVouches"
      FROM users u
      LEFT JOIN user_settings settings ON settings.user_id=u.id
      WHERE u.id=${recipientId}
    `;
    const displayVouches = settings[0]?.displayVouches ?? true;
    if (!displayVouches && viewerId !== recipientId)
      return {
        displayVouches: false,
        vouches: [] as ProfileVouch[],
        viewerVouch: null as VouchKind | null,
      };

    const [vouches, viewerRows] = await Promise.all([
      sql<ProfileVouch[]>`
        SELECT v.id,v.kind,v.created_at AS "createdAt",
          json_build_object('slug',p.slug,'firstName',p.first_name,'lastName',p.last_name) AS voucher
        FROM profile_vouches v
        JOIN profiles p ON p.user_id=v.voucher_id
        JOIN users u ON u.id=v.voucher_id AND u.status='ACTIVE'
        WHERE v.recipient_id=${recipientId}
        ORDER BY v.created_at DESC
        LIMIT 24
      `,
      viewerId === null
        ? Promise.resolve([] as { kind: VouchKind }[])
        : sql<{ kind: VouchKind }[]>`
            SELECT kind FROM profile_vouches
            WHERE voucher_id=${viewerId} AND recipient_id=${recipientId}
          `,
    ]);
    return { displayVouches, vouches, viewerVouch: viewerRows[0]?.kind ?? null };
  } finally {
    await sql.end({ timeout: 1 });
  }
}
