import 'server-only';
import { createSecretToken, hashOpaqueToken, normalizeEmail } from '@nexus/auth';
import { createSqlClient } from '@nexus/db';

/**
 * Organization claim invitations. Public directory records start unowned; a representative
 * receives a signed email invite, signs in (or registers), and claims the record. Claiming
 * creates an OWNER row in organization_members — it does not change verification_status, which
 * still requires the domain-verification path.
 */

export class ClaimInviteError extends Error {
  constructor(readonly code: 'NOT_AUTHORIZED' | 'ALREADY_OWNED') {
    super(code);
  }
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;

type SqlClient = ReturnType<typeof createSqlClient>;

/** Only an existing OWNER/ADMIN member (or a site admin) may invite someone to claim an org. */
async function canInvite(client: SqlClient, organizationId: string, userId: string) {
  const rows = await client<{ allowed: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM organization_members m
      WHERE m.organization_id=${organizationId} AND m.user_id=${userId}
        AND m.role IN ('OWNER','ADMIN')
    ) OR EXISTS (
      SELECT 1 FROM users u WHERE u.id=${userId} AND u.role='ADMIN'
    ) AS allowed
  `;
  return rows[0]?.allowed === true;
}

export async function createClaimInvite(input: {
  organizationSlug: string;
  email: string;
  invitedBy: string;
}): Promise<{ token: string; organizationName: string } | null> {
  const client = sql();
  const email = normalizeEmail(input.email);
  const token = createSecretToken(inviteTtlMs);
  try {
    const organizations = await client<{ id: string; name: string }[]>`
      SELECT id,name FROM organizations WHERE slug=${input.organizationSlug} AND deleted_at IS NULL
    `;
    const organization = organizations[0];
    if (organization === undefined) return null;
    if (!(await canInvite(client, organization.id, input.invitedBy)))
      throw new ClaimInviteError('NOT_AUTHORIZED');
    return await client.begin(async (transaction) => {
      await transaction`
        UPDATE organization_claim_invites SET status='REVOKED'
        WHERE organization_id=${organization.id} AND status='PENDING' AND email_normalized=${email}
      `;
      await transaction`
        INSERT INTO organization_claim_invites
          (organization_id,email_normalized,token_hash,invited_by,expires_at)
        VALUES (${organization.id},${email},${token.tokenHash},${input.invitedBy},${token.expiresAt})
      `;
      return { token: token.token, organizationName: organization.name };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}

export interface ClaimInviteView {
  organizationName: string;
  organizationSlug: string;
  email: string;
  expiresAt: Date;
}

export async function getClaimInvite(token: string): Promise<ClaimInviteView | null> {
  const client = sql();
  try {
    const rows = await client<{ name: string; slug: string; email: string; expires_at: Date }[]>`
      SELECT o.name,o.slug,i.email_normalized AS email,i.expires_at
      FROM organization_claim_invites i JOIN organizations o ON o.id=i.organization_id
      WHERE i.token_hash=${hashOpaqueToken(token)} AND i.status='PENDING' AND i.expires_at>now()
        AND o.deleted_at IS NULL
    `;
    const row = rows[0];
    return row === undefined
      ? null
      : {
          organizationName: row.name,
          organizationSlug: row.slug,
          email: row.email,
          expiresAt: row.expires_at,
        };
  } finally {
    await client.end({ timeout: 1 });
  }
}

/**
 * Claims the invite for the signed-in member. The invite email must match the member's verified
 * primary email — a forwarded token alone never grants ownership.
 */
export async function claimOrganization(
  userId: string,
  token: string,
): Promise<{ organizationSlug: string } | 'EMAIL_MISMATCH' | null> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const invites = await transaction<{ id: string; organization_id: string; slug: string }[]>`
        SELECT i.id,i.organization_id,o.slug
        FROM organization_claim_invites i JOIN organizations o ON o.id=i.organization_id
        WHERE i.token_hash=${hashOpaqueToken(token)} AND i.status='PENDING' AND i.expires_at>now()
          AND o.deleted_at IS NULL
        FOR UPDATE OF i
      `;
      const invite = invites[0];
      if (invite === undefined) return null;
      const claim = await transaction<{ id: string }[]>`
        UPDATE organization_claim_invites
        SET status='CLAIMED',claimed_at=now(),claimed_by=${userId}
        WHERE id=${invite.id}
          AND email_normalized=(
            SELECT email_normalized FROM user_emails
            WHERE user_id=${userId} AND is_primary=true AND verified_at IS NOT NULL
          )
        RETURNING id
      `;
      if (claim.length === 0) return 'EMAIL_MISMATCH';
      await transaction`
        INSERT INTO organization_members (organization_id,user_id,role)
        VALUES (${invite.organization_id},${userId},'OWNER')
        ON CONFLICT (organization_id,user_id)
        DO UPDATE SET role='OWNER',updated_at=now()
      `;
      return { organizationSlug: invite.slug };
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
