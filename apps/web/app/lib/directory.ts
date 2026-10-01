import { createSqlClient } from '@nexus/db';

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
  technologies: { name: string; category: string; sourceUrl: string }[];
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

function sql() {
  const url = process.env.DATABASE_URL;
  if (url === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(url);
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
    const technologies = await client<{ name: string; category: string; sourceUrl: string }[]>`
      SELECT name,category,source_url AS "sourceUrl" FROM organization_technologies
      WHERE organization_id=(SELECT id FROM organizations WHERE slug=${slug}) ORDER BY category,name
    `;
    return { ...organization, technologies };
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function listPublicJobs(query?: string): Promise<JobRecord[]> {
  const client = sql();
  try {
    const pattern = `%${query?.trim() ?? ''}%`;
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
      ORDER BY (j.salary_min IS NULL) ASC,j.source_checked_at DESC,j.created_at DESC LIMIT 30
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
