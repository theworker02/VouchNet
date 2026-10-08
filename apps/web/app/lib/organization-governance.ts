import 'server-only';

import { randomUUID } from 'node:crypto';
import { normalizeEmail } from '@nexus/auth';
import { createSqlClient, type TransactionSql } from '@nexus/db';
import type { OrganizationClaimRequestInput } from './organization-claim-schema';
import { emailControlsOrganizationDomain, emailDomain } from './organization-claim-policy';

export type OrganizationClaimRequest = {
  id: string;
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  claimantUserId: string;
  claimantName: string;
  verifiedEmail: string;
  relationship: 'FOUNDER' | 'EXECUTIVE' | 'EMPLOYEE' | 'AUTHORIZED_REPRESENTATIVE';
  statement: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED';
  reviewNote: string | null;
  createdAt: Date;
};

export type OrganizationMember = {
  userId: string;
  profileSlug: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'RECRUITER' | 'MEMBER';
  employmentVerifiedAt: Date | null;
};

export type OrganizationOutreachCandidate = {
  id: string;
  organizationName: string;
  organizationSlug: string;
  proposedEmail: string;
  sourceUrl: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'SUPPRESSED';
  createdAt: Date;
};

export type OrganizationClaimDecisionNotification = {
  email: string;
  organizationName: string;
  decision: 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
};

export class OrganizationGovernanceError extends Error {
  constructor(
    readonly code:
      | 'ALREADY_CLAIMED'
      | 'CLAIM_ALREADY_OPEN'
      | 'CLAIM_NOT_FOUND'
      | 'DOMAIN_EMAIL_REQUIRED'
      | 'NOT_AUTHORIZED'
      | 'NOT_FOUND'
      | 'ROLE_CHANGE_INVALID',
  ) {
    super(code);
  }
}

function database() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

async function appendGovernanceEvent(
  transaction: TransactionSql,
  input: {
    organizationId: string;
    actorId: string | null;
    subjectUserId: string | null;
    claimRequestId?: string | null;
    eventType:
      | 'CLAIM_REQUESTED'
      | 'CLAIM_APPROVED'
      | 'CLAIM_REJECTED'
      | 'CLAIM_CANCELLED'
      | 'CLAIM_REVOKED'
      | 'ROLE_ASSIGNED'
      | 'OWNERSHIP_TRANSFERRED'
      | 'MEMBER_REVOKED'
      | 'PROFILE_UPDATED';
    metadata?: Record<string, string>;
  },
): Promise<void> {
  await transaction`
    INSERT INTO organization_governance_events
      (organization_id,actor_id,subject_user_id,claim_request_id,event_type,metadata)
    VALUES (
      ${input.organizationId},${input.actorId},${input.subjectUserId},${input.claimRequestId ?? null},
      ${input.eventType},${JSON.stringify(input.metadata ?? {})}::jsonb
    )
  `;
}

async function appendAuditEvent(
  transaction: TransactionSql,
  input: {
    actorId: string;
    subjectUserId: string;
    organizationId: string;
    operation: string;
    resourceType: string;
    resourceId?: string | null;
    policyDecision: string;
  },
): Promise<void> {
  await transaction`
    INSERT INTO audit_events
      (actor_type,actor_id,user_id,organization_id,operation,resource_type,resource_id,request_id,result,policy_decision)
    VALUES (
      'HUMAN',${input.actorId},${input.subjectUserId},${input.organizationId},${input.operation},
      ${input.resourceType},${input.resourceId ?? null},${randomUUID()},'SUCCESS',${input.policyDecision}
    )
  `;
}

async function isSiteAdministrator(transaction: TransactionSql, userId: string): Promise<boolean> {
  const rows = await transaction<{ allowed: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM users WHERE id=${userId} AND role='ADMIN' AND status='ACTIVE') AS allowed
  `;
  return rows[0]?.allowed === true;
}

async function activeMemberRole(
  transaction: TransactionSql,
  organizationId: string,
  userId: string,
): Promise<OrganizationMember['role'] | null> {
  const rows = await transaction<{ role: OrganizationMember['role'] }[]>`
    SELECT role FROM organization_members
    WHERE organization_id=${organizationId} AND user_id=${userId} AND status='ACTIVE'
  `;
  return rows[0]?.role ?? null;
}

export async function submitOrganizationClaimRequest(input: {
  organizationSlug: string;
  userId: string;
  claim: OrganizationClaimRequestInput;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const organizations = await transaction<{ id: string; website_url: string }[]>`
        SELECT id,website_url FROM organizations
        WHERE slug=${input.organizationSlug} AND deleted_at IS NULL FOR UPDATE
      `;
      const organization = organizations[0];
      if (organization === undefined) throw new OrganizationGovernanceError('NOT_FOUND');
      const accounts = await transaction<{ email_normalized: string }[]>`
        SELECT email_normalized FROM user_emails
        WHERE user_id=${input.userId} AND is_primary=true AND verified_at IS NOT NULL
      `;
      const verifiedEmail = accounts[0]?.email_normalized;
      if (verifiedEmail === undefined)
        throw new OrganizationGovernanceError('DOMAIN_EMAIL_REQUIRED');
      if (!emailControlsOrganizationDomain(verifiedEmail, organization.website_url))
        throw new OrganizationGovernanceError('DOMAIN_EMAIL_REQUIRED');
      const owners = await transaction<{ id: string }[]>`
        SELECT user_id AS id FROM organization_members
        WHERE organization_id=${organization.id} AND role='OWNER' AND status='ACTIVE' LIMIT 1
      `;
      if (owners[0] !== undefined) throw new OrganizationGovernanceError('ALREADY_CLAIMED');
      const pending = await transaction<{ id: string }[]>`
        SELECT id FROM organization_claim_requests
        WHERE organization_id=${organization.id} AND claimant_user_id=${input.userId}
          AND status IN ('PENDING','UNDER_REVIEW')
        FOR UPDATE
      `;
      if (pending[0] !== undefined) throw new OrganizationGovernanceError('CLAIM_ALREADY_OPEN');
      const profileClaims = await transaction<{ id: string }[]>`
        INSERT INTO profile_claims
          (entity_type,organization_id,claimant_user_id,state,verification_method,verification_evidence,verified_at)
        VALUES (
          'ORGANIZATION',${organization.id},${input.userId},'VERIFIED','COMPANY_DOMAIN_EMAIL',
          ${JSON.stringify({ domain: emailDomain(verifiedEmail) })}::jsonb,now()
        ) RETURNING id
      `;
      const profileClaim = profileClaims[0];
      if (profileClaim === undefined) throw new Error('PROFILE_CLAIM_CREATE_FAILED');
      const created = await transaction<{ id: string }[]>`
        INSERT INTO organization_claim_requests
          (organization_id,claimant_user_id,verified_email,verified_email_domain,relationship,statement,profile_claim_id)
        VALUES (
          ${organization.id},${input.userId},${normalizeEmail(verifiedEmail)},${emailDomain(verifiedEmail)},
          ${input.claim.relationship},${input.claim.statement},${profileClaim.id}
        ) RETURNING id
      `;
      const request = created[0];
      if (request === undefined) throw new Error('CLAIM_REQUEST_CREATE_FAILED');
      await appendGovernanceEvent(transaction, {
        organizationId: organization.id,
        actorId: input.userId,
        subjectUserId: input.userId,
        claimRequestId: request.id,
        eventType: 'CLAIM_REQUESTED',
        metadata: { relationship: input.claim.relationship, domain: emailDomain(verifiedEmail) },
      });
      await appendAuditEvent(transaction, {
        actorId: input.userId,
        subjectUserId: input.userId,
        organizationId: organization.id,
        operation: 'ORGANIZATION_CLAIM_REQUESTED',
        resourceType: 'ORGANIZATION_CLAIM_REQUEST',
        resourceId: request.id,
        policyDecision: 'VERIFIED_COMPANY_DOMAIN_AND_HUMAN_REVIEW_REQUIRED',
      });
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listOrganizationClaimRequests(): Promise<OrganizationClaimRequest[]> {
  const sql = database();
  try {
    return await sql<OrganizationClaimRequest[]>`
      SELECT request.id,request.organization_id AS "organizationId",organization.slug AS "organizationSlug",
        organization.name AS "organizationName",request.claimant_user_id AS "claimantUserId",
        concat(profile.first_name,' ',profile.last_name) AS "claimantName",request.verified_email AS "verifiedEmail",
        request.relationship,request.statement,request.status,request.review_note AS "reviewNote",
        request.created_at AS "createdAt"
      FROM organization_claim_requests request
      JOIN organizations organization ON organization.id=request.organization_id
      JOIN profiles profile ON profile.user_id=request.claimant_user_id
      ORDER BY CASE request.status WHEN 'PENDING' THEN 0 WHEN 'UNDER_REVIEW' THEN 1 ELSE 2 END,
        request.created_at DESC
      LIMIT 200
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

/** This is a review-only queue. Nothing in this function sends mail or creates an invite. */
export async function listOrganizationOutreachCandidates(): Promise<
  OrganizationOutreachCandidate[]
> {
  const sql = database();
  try {
    return await sql<OrganizationOutreachCandidate[]>`
      SELECT candidate.id,organization.name AS "organizationName",organization.slug AS "organizationSlug",
        candidate.proposed_email AS "proposedEmail",candidate.source_url AS "sourceUrl",
        candidate.status,candidate.created_at AS "createdAt"
      FROM organization_outreach_candidates candidate
      JOIN organizations organization ON organization.id=candidate.organization_id
      ORDER BY CASE candidate.status WHEN 'DRAFT' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
        candidate.created_at DESC
      LIMIT 200
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function reviewOrganizationClaimRequest(input: {
  actorId: string;
  claimRequestId: string;
  decision: 'APPROVE' | 'REJECT';
  reviewNote: string | null;
}): Promise<OrganizationClaimDecisionNotification[]> {
  const sql = database();
  try {
    return await sql.begin(async (transaction) => {
      if (!(await isSiteAdministrator(transaction, input.actorId)))
        throw new OrganizationGovernanceError('NOT_AUTHORIZED');
      const rows = await transaction<
        {
          organization_id: string;
          organization_name: string;
          claimant_user_id: string;
          verified_email: string;
          status: OrganizationClaimRequest['status'];
          profile_claim_id: string | null;
        }[]
      >`
        SELECT request.organization_id,organization.name AS organization_name,request.claimant_user_id,
          request.verified_email,request.status,request.profile_claim_id
        FROM organization_claim_requests request
        JOIN organizations organization ON organization.id=request.organization_id
        WHERE request.id=${input.claimRequestId} FOR UPDATE OF request
      `;
      const request = rows[0];
      if (request === undefined || !['PENDING', 'UNDER_REVIEW'].includes(request.status))
        throw new OrganizationGovernanceError('CLAIM_NOT_FOUND');
      const organizations = await transaction<{ id: string }[]>`
        SELECT id FROM organizations WHERE id=${request.organization_id} FOR UPDATE
      `;
      if (organizations[0] === undefined) throw new OrganizationGovernanceError('NOT_FOUND');
      const notifications: OrganizationClaimDecisionNotification[] = [];
      if (input.decision === 'APPROVE') {
        const activeOwners = await transaction<{ user_id: string }[]>`
          SELECT user_id FROM organization_members
          WHERE organization_id=${request.organization_id} AND role='OWNER' AND status='ACTIVE'
          FOR UPDATE
        `;
        if (activeOwners[0] !== undefined) throw new OrganizationGovernanceError('ALREADY_CLAIMED');
        await transaction`
          INSERT INTO organization_members (organization_id,user_id,role,status,updated_at,revoked_at,revoked_by,revoke_reason)
          VALUES (${request.organization_id},${request.claimant_user_id},'OWNER','ACTIVE',now(),NULL,NULL,NULL)
          ON CONFLICT (organization_id,user_id)
          DO UPDATE SET role='OWNER',status='ACTIVE',updated_at=now(),revoked_at=NULL,revoked_by=NULL,revoke_reason=NULL
        `;
        await transaction`
          UPDATE organizations SET verification_status='DOMAIN_VERIFIED',updated_at=now()
          WHERE id=${request.organization_id}
        `;
        const competingRequests = await transaction<{ verified_email: string }[]>`
          SELECT verified_email FROM organization_claim_requests
          WHERE organization_id=${request.organization_id} AND id<>${input.claimRequestId}
            AND status IN ('PENDING','UNDER_REVIEW')
          FOR UPDATE
        `;
        await transaction`
          UPDATE organization_claim_requests
          SET status='APPROVED',reviewed_by=${input.actorId},reviewed_at=now(),review_note=${input.reviewNote},updated_at=now()
          WHERE id=${input.claimRequestId}
        `;
        await transaction`
          UPDATE profile_claims SET state='APPROVED',approved_by=${input.actorId},approved_at=now(),updated_at=now()
          WHERE id=${request.profile_claim_id} AND state='VERIFIED'
        `;
        await transaction`
          UPDATE organization_claim_requests
          SET status='REJECTED',reviewed_by=${input.actorId},reviewed_at=now(),
              review_note='Another verified representative was approved first.',updated_at=now()
          WHERE organization_id=${request.organization_id} AND id<>${input.claimRequestId}
            AND status IN ('PENDING','UNDER_REVIEW')
        `;
        notifications.push(
          ...competingRequests.map((competing) => ({
            email: competing.verified_email,
            organizationName: request.organization_name,
            decision: 'REJECTED' as const,
            reviewNote: 'Another verified representative was approved first.',
          })),
        );
      } else {
        await transaction`
          UPDATE organization_claim_requests
          SET status='REJECTED',reviewed_by=${input.actorId},reviewed_at=now(),review_note=${input.reviewNote},updated_at=now()
          WHERE id=${input.claimRequestId}
        `;
        await transaction`
          UPDATE profile_claims SET state='REJECTED',approved_by=${input.actorId},approved_at=now(),updated_at=now()
          WHERE id=${request.profile_claim_id} AND state IN ('PENDING','VERIFICATION_REQUIRED','VERIFIED')
        `;
      }
      await appendGovernanceEvent(transaction, {
        organizationId: request.organization_id,
        actorId: input.actorId,
        subjectUserId: request.claimant_user_id,
        claimRequestId: input.claimRequestId,
        eventType: input.decision === 'APPROVE' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
      });
      await appendAuditEvent(transaction, {
        actorId: input.actorId,
        subjectUserId: request.claimant_user_id,
        organizationId: request.organization_id,
        operation:
          input.decision === 'APPROVE'
            ? 'ORGANIZATION_CLAIM_APPROVED'
            : 'ORGANIZATION_CLAIM_REJECTED',
        resourceType: 'ORGANIZATION_CLAIM_REQUEST',
        resourceId: input.claimRequestId,
        policyDecision: 'SITE_ADMIN_HUMAN_REVIEW',
      });
      notifications.unshift({
        email: request.verified_email,
        organizationName: request.organization_name,
        decision: input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        reviewNote: input.reviewNote,
      });
      return notifications;
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function listOrganizationMembers(slug: string): Promise<OrganizationMember[]> {
  const sql = database();
  try {
    return await sql<OrganizationMember[]>`
      SELECT member.user_id AS "userId",profile.slug AS "profileSlug",concat(profile.first_name,' ',profile.last_name) AS name,
        member.role,member.employment_verified_at AS "employmentVerifiedAt"
      FROM organization_members member
      JOIN organizations organization ON organization.id=member.organization_id
      JOIN profiles profile ON profile.user_id=member.user_id
      WHERE organization.slug=${slug} AND organization.deleted_at IS NULL AND member.status='ACTIVE'
      ORDER BY CASE member.role WHEN 'OWNER' THEN 0 WHEN 'ADMIN' THEN 1 WHEN 'EDITOR' THEN 2 ELSE 3 END,profile.first_name
    `;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function canManageOrganizationMembers(slug: string, userId: string): Promise<boolean> {
  const sql = database();
  try {
    const rows = await sql<{ allowed: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM organizations organization
        WHERE organization.slug=${slug} AND organization.deleted_at IS NULL AND (
          EXISTS(
            SELECT 1 FROM organization_members member
            WHERE member.organization_id=organization.id AND member.user_id=${userId}
              AND member.role='OWNER' AND member.status='ACTIVE'
          ) OR EXISTS(SELECT 1 FROM users WHERE id=${userId} AND role='ADMIN' AND status='ACTIVE')
        )
      ) AS allowed
    `;
    return rows[0]?.allowed === true;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function assignOrganizationRole(input: {
  organizationSlug: string;
  actorId: string;
  profileSlug: string;
  role: 'ADMIN' | 'EDITOR' | 'MEMBER';
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const organizations = await transaction<{ id: string }[]>`
        SELECT id FROM organizations WHERE slug=${input.organizationSlug} AND deleted_at IS NULL FOR UPDATE
      `;
      const organization = organizations[0];
      if (organization === undefined) throw new OrganizationGovernanceError('NOT_FOUND');
      const actorRole = await activeMemberRole(transaction, organization.id, input.actorId);
      if (actorRole !== 'OWNER' && !(await isSiteAdministrator(transaction, input.actorId)))
        throw new OrganizationGovernanceError('NOT_AUTHORIZED');
      const targets = await transaction<{ user_id: string }[]>`
        SELECT user_id FROM profiles WHERE slug=${input.profileSlug}
      `;
      const target = targets[0];
      if (target === undefined) throw new OrganizationGovernanceError('NOT_FOUND');
      await transaction`
        INSERT INTO organization_members (organization_id,user_id,role,status,updated_at,revoked_at,revoked_by,revoke_reason)
        VALUES (${organization.id},${target.user_id},${input.role},'ACTIVE',now(),NULL,NULL,NULL)
        ON CONFLICT (organization_id,user_id)
        DO UPDATE SET role=${input.role},status='ACTIVE',updated_at=now(),revoked_at=NULL,revoked_by=NULL,revoke_reason=NULL
      `;
      await appendGovernanceEvent(transaction, {
        organizationId: organization.id,
        actorId: input.actorId,
        subjectUserId: target.user_id,
        eventType: 'ROLE_ASSIGNED',
        metadata: { role: input.role },
      });
      await appendAuditEvent(transaction, {
        actorId: input.actorId,
        subjectUserId: target.user_id,
        organizationId: organization.id,
        operation: 'ORGANIZATION_ROLE_ASSIGNED',
        resourceType: 'ORGANIZATION_MEMBER',
        policyDecision: 'OWNER_OR_SITE_ADMIN',
      });
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function transferOrganizationOwnership(input: {
  organizationSlug: string;
  actorId: string;
  profileSlug: string;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const organizations = await transaction<{ id: string }[]>`
        SELECT id FROM organizations WHERE slug=${input.organizationSlug} AND deleted_at IS NULL FOR UPDATE
      `;
      const organization = organizations[0];
      if (organization === undefined) throw new OrganizationGovernanceError('NOT_FOUND');
      if ((await activeMemberRole(transaction, organization.id, input.actorId)) !== 'OWNER')
        throw new OrganizationGovernanceError('NOT_AUTHORIZED');
      const targets = await transaction<{ user_id: string }[]>`
        SELECT profile.user_id FROM profiles profile
        JOIN organization_members member ON member.user_id=profile.user_id
        WHERE profile.slug=${input.profileSlug} AND member.organization_id=${organization.id}
          AND member.status='ACTIVE' FOR UPDATE OF member
      `;
      const target = targets[0];
      if (target === undefined || target.user_id === input.actorId)
        throw new OrganizationGovernanceError('ROLE_CHANGE_INVALID');
      await transaction`
        UPDATE organization_members SET role='OWNER',updated_at=now()
        WHERE organization_id=${organization.id} AND user_id=${target.user_id} AND status='ACTIVE'
      `;
      await transaction`
        UPDATE organization_members SET role='ADMIN',updated_at=now()
        WHERE organization_id=${organization.id} AND user_id=${input.actorId} AND status='ACTIVE'
      `;
      await appendGovernanceEvent(transaction, {
        organizationId: organization.id,
        actorId: input.actorId,
        subjectUserId: target.user_id,
        eventType: 'OWNERSHIP_TRANSFERRED',
      });
      await appendAuditEvent(transaction, {
        actorId: input.actorId,
        subjectUserId: target.user_id,
        organizationId: organization.id,
        operation: 'ORGANIZATION_OWNERSHIP_TRANSFERRED',
        resourceType: 'ORGANIZATION_MEMBER',
        policyDecision: 'CURRENT_OWNER_EXPLICIT_TRANSFER',
      });
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

export async function revokeOrganizationMember(input: {
  organizationSlug: string;
  actorId: string;
  memberUserId: string;
  reason: string | null;
}): Promise<void> {
  const sql = database();
  try {
    await sql.begin(async (transaction) => {
      const organizations = await transaction<{ id: string }[]>`
        SELECT id FROM organizations WHERE slug=${input.organizationSlug} AND deleted_at IS NULL FOR UPDATE
      `;
      const organization = organizations[0];
      if (organization === undefined) throw new OrganizationGovernanceError('NOT_FOUND');
      const actorRole = await activeMemberRole(transaction, organization.id, input.actorId);
      if (actorRole !== 'OWNER' && !(await isSiteAdministrator(transaction, input.actorId)))
        throw new OrganizationGovernanceError('NOT_AUTHORIZED');
      const targets = await transaction<{ role: OrganizationMember['role'] }[]>`
        SELECT role FROM organization_members
        WHERE organization_id=${organization.id} AND user_id=${input.memberUserId} AND status='ACTIVE'
        FOR UPDATE
      `;
      const target = targets[0];
      if (target === undefined || target.role === 'OWNER')
        throw new OrganizationGovernanceError('ROLE_CHANGE_INVALID');
      await transaction`
        UPDATE organization_members
        SET status='REVOKED',revoked_at=now(),revoked_by=${input.actorId},revoke_reason=${input.reason},updated_at=now()
        WHERE organization_id=${organization.id} AND user_id=${input.memberUserId}
      `;
      await appendGovernanceEvent(transaction, {
        organizationId: organization.id,
        actorId: input.actorId,
        subjectUserId: input.memberUserId,
        eventType: 'MEMBER_REVOKED',
      });
      await appendAuditEvent(transaction, {
        actorId: input.actorId,
        subjectUserId: input.memberUserId,
        organizationId: organization.id,
        operation: 'ORGANIZATION_MEMBER_REVOKED',
        resourceType: 'ORGANIZATION_MEMBER',
        policyDecision: 'OWNER_OR_SITE_ADMIN_COMPROMISE_RESPONSE',
      });
    });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
