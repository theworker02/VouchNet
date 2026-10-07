import 'server-only';
import { createSqlClient } from '@nexus/db';
import {
  organizationTechnologyCategories,
  type OrganizationTechnologyCategory,
} from './organization-profile-schema';

export type OrganizationRecord = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  websiteUrl: string;
  careersUrl: string | null;
  engineeringUrl: string | null;
  repositoryUrl: string | null;
  headquarters: string | null;
  verificationStatus: 'UNVERIFIED' | 'SOURCE_REVIEWED' | 'DOMAIN_VERIFIED';
  sourceUrl: string | null;
  sourceCheckedAt: Date | null;
  technologies: { name: string; category: OrganizationTechnologyCategory; sourceUrl: string }[];
};

export type JobRecord = {
  slug: string;
  title: string;
  summary: string;
  location: string;
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNSPECIFIED';
  employmentType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  skillTags: string[];
  sourceUrl: string;
  sourceCheckedAt: Date;
  sourceStatus: 'SOURCE_REVIEWED' | 'SOURCE_LIVE' | 'EXPIRED' | 'REMOVED';
  organizationName: string;
  organizationSlug: string;
};

export type JobDetailRecord = JobRecord & {
  description: string;
  nativeApplicationEnabled: boolean;
  publishedAt: Date | null;
};

export type DailyChallengeRecord = {
  title: string;
  category: 'DEBUGGING' | 'SYSTEMS' | 'ALGORITHMS';
  prompt: string;
  starterCode: string | null;
  solution: string;
  durationMinutes: number;
};

export type HiringOrganizationRecord = {
  slug: string;
  name: string;
  tagline: string | null;
  technologies: string[];
  openRoleCount: number;
};

export type ClaimableOrganizationRecord = Pick<
  OrganizationRecord,
  'slug' | 'name' | 'tagline' | 'verificationStatus'
>;

/** Minimal public organization DTO used by the no-login company directory. */
export type PublicOrganizationDirectoryRecord = Pick<
  OrganizationRecord,
  'slug' | 'name' | 'tagline' | 'headquarters' | 'verificationStatus'
> & {
  technologies: string[];
};

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
}

function isOrganizationTechnologyCategory(value: string): value is OrganizationTechnologyCategory {
  return organizationTechnologyCategories.some((category) => category === value);
}

export async function getOrganization(slug: string): Promise<OrganizationRecord | null> {
  const client = sql();
  try {
    const organizations = await client<Omit<OrganizationRecord, 'technologies'>[]>`
      SELECT slug,name,tagline,description,website_url AS "websiteUrl",careers_url AS "careersUrl",
        engineering_url AS "engineeringUrl",repository_url AS "repositoryUrl",headquarters,
        verification_status AS "verificationStatus",source_url AS "sourceUrl",source_checked_at AS "sourceCheckedAt"
      FROM organizations WHERE slug=${slug} AND deleted_at IS NULL
    `;
    const organization = organizations[0];
    if (organization === undefined) return null;
    const technologyRows = await client<{ name: string; category: string; sourceUrl: string }[]>`
      SELECT name,category,source_url AS "sourceUrl" FROM organization_technologies
      WHERE organization_id=(SELECT id FROM organizations WHERE slug=${slug}) ORDER BY category,name
    `;
    const technologies = technologyRows.flatMap((technology) => {
      if (!isOrganizationTechnologyCategory(technology.category)) return [];
      return [
        {
          name: technology.name,
          category: technology.category,
          sourceUrl: technology.sourceUrl,
        },
      ];
    });
    return { ...organization, technologies };
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Public directory lookup used by the profile-claim funnel. It never exposes administrative data. */
export async function listClaimableOrganizations(
  query = '',
): Promise<ClaimableOrganizationRecord[]> {
  const client = sql();
  try {
    const term = `%${query.trim()}%`;
    return await client<ClaimableOrganizationRecord[]>`
      SELECT slug,name,tagline,verification_status AS "verificationStatus"
      FROM organizations
      WHERE deleted_at IS NULL
        AND verification_status <> 'DOMAIN_VERIFIED'
        AND (name ILIKE ${term} OR slug ILIKE ${term})
      ORDER BY name
      LIMIT 24
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

/**
 * Public directory data only. It deliberately excludes contacts, membership, internal claim state,
 * and administrative ownership metadata.
 */
export async function listPublicOrganizations(
  query?: string,
  limit = 48,
): Promise<PublicOrganizationDirectoryRecord[]> {
  const client = sql();
  try {
    const pattern = `%${query?.trim() ?? ''}%`;
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 48);
    return await client<PublicOrganizationDirectoryRecord[]>`
      SELECT o.slug,o.name,o.tagline,o.headquarters,
        o.verification_status AS "verificationStatus",
        COALESCE(array_agg(DISTINCT ot.name) FILTER (WHERE ot.name IS NOT NULL), '{}') AS technologies
      FROM organizations o
      LEFT JOIN organization_technologies ot ON ot.organization_id=o.id
      WHERE o.deleted_at IS NULL
        AND (o.name ILIKE ${pattern} OR o.slug ILIKE ${pattern} OR o.tagline ILIKE ${pattern}
          OR EXISTS (
            SELECT 1 FROM organization_technologies search_technology
            WHERE search_technology.organization_id=o.id AND search_technology.name ILIKE ${pattern}
          ))
      GROUP BY o.id,o.slug,o.name,o.tagline,o.headquarters,o.verification_status
      ORDER BY (o.verification_status='DOMAIN_VERIFIED') DESC,o.name
      LIMIT ${safeLimit}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listPublicJobs(query?: string, limit = 30): Promise<JobRecord[]> {
  const client = sql();
  try {
    const pattern = `%${query?.trim() ?? ''}%`;
    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 30);
    return await client<JobRecord[]>`
      SELECT j.slug,j.title,j.summary,j.location,j.workplace_type AS "workplaceType",
        j.employment_type AS "employmentType",j.salary_min AS "salaryMin",j.salary_max AS "salaryMax",
        j.salary_currency AS "salaryCurrency",j.skill_tags AS "skillTags",j.source_url AS "sourceUrl",
        j.source_checked_at AS "sourceCheckedAt",j.source_status AS "sourceStatus",
        o.name AS "organizationName",o.slug AS "organizationSlug"
      FROM jobs j JOIN organizations o ON o.id=j.organization_id
      WHERE j.deleted_at IS NULL AND j.source_status IN ('SOURCE_REVIEWED','SOURCE_LIVE')
        AND (j.title ILIKE ${pattern} OR o.name ILIKE ${pattern} OR j.location ILIKE ${pattern}
          OR EXISTS (SELECT 1 FROM unnest(j.skill_tags) tag WHERE tag ILIKE ${pattern}))
      ORDER BY (j.salary_min IS NULL) ASC,j.source_checked_at DESC,j.created_at DESC LIMIT ${safeLimit}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

/** Public listing details intentionally retain the external source as the application authority. */
export async function getPublicJob(slug: string): Promise<JobDetailRecord | null> {
  const client = sql();
  try {
    const jobs = await client<JobDetailRecord[]>`
      SELECT j.slug,j.title,j.summary,j.description,j.location,j.workplace_type AS "workplaceType",
        j.employment_type AS "employmentType",j.salary_min AS "salaryMin",j.salary_max AS "salaryMax",
        j.salary_currency AS "salaryCurrency",j.skill_tags AS "skillTags",j.source_url AS "sourceUrl",
        j.source_checked_at AS "sourceCheckedAt",j.source_status AS "sourceStatus",j.published_at AS "publishedAt",
        j.native_application_enabled AS "nativeApplicationEnabled",
        o.name AS "organizationName",o.slug AS "organizationSlug"
      FROM jobs j JOIN organizations o ON o.id=j.organization_id
      WHERE j.slug=${slug} AND j.deleted_at IS NULL AND j.source_status IN ('SOURCE_REVIEWED','SOURCE_LIVE')
      LIMIT 1
    `;
    return jobs[0] ?? null;
  } finally {
    await client.end({ timeout: 1 });
  }
}

/**
 * The home rail only uses organizations with a live source-linked role. This keeps the
 * discovery surface useful without inventing company activity or administrative ownership.
 */
export async function listHiringOrganizations(limit = 3): Promise<HiringOrganizationRecord[]> {
  const client = sql();
  try {
    return await client<HiringOrganizationRecord[]>`
      SELECT o.slug,o.name,o.tagline,
        COALESCE(array_agg(DISTINCT ot.name) FILTER (WHERE ot.name IS NOT NULL), '{}') AS technologies,
        COUNT(DISTINCT j.id)::integer AS "openRoleCount"
      FROM organizations o
      JOIN jobs j ON j.organization_id=o.id
        AND j.deleted_at IS NULL
        AND j.source_status IN ('SOURCE_REVIEWED','SOURCE_LIVE')
      LEFT JOIN organization_technologies ot ON ot.organization_id=o.id
      WHERE o.deleted_at IS NULL
      GROUP BY o.id,o.slug,o.name,o.tagline
      ORDER BY COUNT(DISTINCT j.id) DESC,o.name
      LIMIT ${limit}
    `;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getTodayChallenge(): Promise<DailyChallengeRecord | null> {
  const client = sql();
  try {
    const challenges = await client<DailyChallengeRecord[]>`
      SELECT title,category,prompt,starter_code AS "starterCode",solution,
        duration_minutes AS "durationMinutes"
      FROM daily_challenges
      WHERE challenge_date=CURRENT_DATE AND deleted_at IS NULL
      LIMIT 1
    `;
    return challenges[0] ?? null;
  } finally {
    await client.end({ timeout: 1 });
  }
}
