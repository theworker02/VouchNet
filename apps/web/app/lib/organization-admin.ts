import 'server-only';

import { randomUUID } from 'node:crypto';
import { createSqlClient } from '@nexus/db';
import type { OrganizationProfileInput } from './organization-profile-schema';

export class OrganizationProfileError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'NOT_AUTHORIZED' | 'CONFLICT' | 'WEBSITE_REVIEW_REQUIRED',
  ) {
    super(code);
  }
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

/** Content roles are intentionally separate from ownership. Editors cannot alter membership. */
export async function canManageOrganization(slug: string, userId: string): Promise<boolean> {
  const client = sql();
  try {
    const rows = await client<{ allowed: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.slug=${slug} AND o.deleted_at IS NULL
          AND (
            EXISTS (
              SELECT 1 FROM organization_members m
              WHERE m.organization_id=o.id AND m.user_id=${userId}
                AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN','EDITOR')
            )
            OR EXISTS (SELECT 1 FROM users u WHERE u.id=${userId} AND u.role='ADMIN')
          )
      ) AS allowed
    `;
    return rows[0]?.allowed === true;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function updateOrganizationProfile(
  slug: string,
  userId: string,
  input: OrganizationProfileInput,
): Promise<void> {
  const client = sql();
  try {
    await client.begin(async (transaction) => {
      const organizations = await transaction<
        { id: string; website_url: string; verification_status: string }[]
      >`
        SELECT id,website_url,verification_status FROM organizations
        WHERE slug=${slug} AND deleted_at IS NULL FOR UPDATE
      `;
      const organization = organizations[0];
      if (organization === undefined) throw new OrganizationProfileError('NOT_FOUND');

      const allowed = await transaction<{ allowed: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM organization_members m
          WHERE m.organization_id=${organization.id} AND m.user_id=${userId}
            AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN','EDITOR')
        ) OR EXISTS (SELECT 1 FROM users u WHERE u.id=${userId} AND u.role='ADMIN') AS allowed
      `;
      if (allowed[0]?.allowed !== true) throw new OrganizationProfileError('NOT_AUTHORIZED');
      const siteAdministrator = await transaction<{ allowed: boolean }[]>`
        SELECT EXISTS(SELECT 1 FROM users WHERE id=${userId} AND role='ADMIN' AND status='ACTIVE') AS allowed
      `;
      if (
        organization.verification_status === 'DOMAIN_VERIFIED' &&
        organization.website_url !== input.websiteUrl &&
        siteAdministrator[0]?.allowed !== true
      )
        throw new OrganizationProfileError('WEBSITE_REVIEW_REQUIRED');

      try {
        await transaction`
          UPDATE organizations
          SET name=${input.name},tagline=${input.tagline},description=${input.description},
              website_url=${input.websiteUrl},careers_url=${input.careersUrl},
              engineering_url=${input.engineeringUrl},repository_url=${input.repositoryUrl},
              headquarters=${input.headquarters},updated_at=now()
          WHERE id=${organization.id}
        `;
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        )
          throw new OrganizationProfileError('CONFLICT');
        throw error;
      }

      await transaction`DELETE FROM organization_technologies WHERE organization_id=${organization.id}`;
      for (const technology of input.technologies) {
        await transaction`
          INSERT INTO organization_technologies (organization_id,name,category,source_url)
          VALUES (${organization.id},${technology.name},${technology.category},${technology.sourceUrl})
        `;
      }
      await transaction`
        INSERT INTO organization_governance_events
          (organization_id,actor_id,subject_user_id,event_type,metadata)
        VALUES (${organization.id},${userId},${userId},'PROFILE_UPDATED','{}'::jsonb)
      `;
      await transaction`
        INSERT INTO audit_events
          (actor_type,actor_id,user_id,organization_id,operation,resource_type,resource_id,request_id,result,policy_decision)
        VALUES (
          'HUMAN',${userId},${userId},${organization.id},'ORGANIZATION_PROFILE_UPDATED',
          'ORGANIZATION',${organization.id},${randomUUID()},'SUCCESS','ACTIVE_CONTENT_ROLE'
        )
      `;
    });
  } finally {
    await client.end({ timeout: 1 });
  }
}
