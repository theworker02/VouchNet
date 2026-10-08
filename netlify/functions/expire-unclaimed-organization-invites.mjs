import postgres from 'postgres';

/**
 * Scheduled weekday cleanup. Only a profile that has an explicitly delivered invitation, no
 * active owner, no still-valid invite, and no claim under review can be hidden. No member account
 * is deleted; the public directory row remains recoverable through its deleted_at timestamp.
 */
export default async function expireUnclaimedOrganizationInvites() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  try {
    const summary = await sql.begin(async (transaction) => {
      const expiredInvites = await transaction`
        SELECT invite.id,invite.organization_id,organization.name AS organization_name
        FROM organization_claim_invites invite
        JOIN organizations organization ON organization.id=invite.organization_id
        WHERE invite.status='PENDING' AND invite.expires_at<=now()
          AND organization.deleted_at IS NULL
        FOR UPDATE OF invite,organization
      `;
      for (const invite of expiredInvites) {
        await transaction`
          UPDATE organization_claim_invites SET status='EXPIRED'
          WHERE id=${invite.id} AND status='PENDING'
        `;
        await transaction`
          INSERT INTO organization_governance_events
            (organization_id,event_type,metadata)
          VALUES (
            ${invite.organization_id},'CLAIM_EXPIRED',
            ${JSON.stringify({ reason: 'NO_RESPONSE_AFTER_FIVE_BUSINESS_DAYS' })}::jsonb
          )
        `;
        const removed = await transaction`
          UPDATE organizations organization SET deleted_at=now(),updated_at=now()
          WHERE organization.id=${invite.organization_id} AND organization.deleted_at IS NULL
            AND organization.verification_status <> 'DOMAIN_VERIFIED'
            AND NOT EXISTS (
              SELECT 1 FROM organization_members member
              WHERE member.organization_id=organization.id AND member.role='OWNER'
                AND member.status='ACTIVE'
            )
            AND NOT EXISTS (
              SELECT 1 FROM organization_claim_invites pending
              WHERE pending.organization_id=organization.id AND pending.status='PENDING'
                AND pending.expires_at>now()
            )
            AND NOT EXISTS (
              SELECT 1 FROM organization_claim_requests request
              WHERE request.organization_id=organization.id
                AND request.status IN ('PENDING','UNDER_REVIEW')
            )
          RETURNING organization.id
        `;
        if (removed.length > 0) {
          await transaction`
            INSERT INTO organization_governance_events
              (organization_id,event_type,metadata)
            VALUES (
              ${invite.organization_id},'DIRECTORY_RECORD_REMOVED',
              ${JSON.stringify({ reason: 'UNCLAIMED_INVITATION_EXPIRED' })}::jsonb
            )
          `;
        }
      }
      return { expired: expiredInvites.length };
    });
    console.log(`expired unclaimed organization invites: ${summary.expired}`);
    return new Response(null, { status: 204 });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
