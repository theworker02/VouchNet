import 'server-only';
import { createSqlClient } from '@nexus/db';
import { submitToIndexNow } from './indexnow';

export const jobSourceProviders = ['GREENHOUSE', 'LEVER'] as const;
export type JobSourceProvider = (typeof jobSourceProviders)[number];

export type EmployerSubmission = {
  createdAt: Date;
  employerReviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  freeUntil: Date | null;
  id: string;
  slug: string;
  organizationName: string;
  title: string;
};

export type EmployerLaunchDashboard = {
  sources: Array<{
    createdAt: Date;
    id: string;
    lastSyncedAt: Date | null;
    provider: JobSourceProvider;
    status: 'PENDING_REVIEW' | 'ACTIVE' | 'PAUSED' | 'REJECTED';
  }>;
  submissions: EmployerSubmission[];
  trialEndsAt: Date | null;
};

export class JobSourcingError extends Error {
  constructor(
    readonly code:
      | 'DUPLICATE_JOB'
      | 'DUPLICATE_SOURCE'
      | 'FREE_WINDOW_EXPIRED'
      | 'JOB_SOURCE_NOT_FOUND'
      | 'JOB_SOURCE_UNAVAILABLE',
  ) {
    super(code);
  }
}

type JobSubmissionInput = {
  applicationUrl: string;
  description: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  location: string;
  organizationName: string;
  organizationWebsite: string;
  salaryCurrency: string;
  salaryMax: number | null;
  salaryMin: number | null;
  skillTags: string[];
  summary: string;
  title: string;
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE';
};

type JobSourceInput = {
  boardToken: string;
  organizationName: string;
  organizationWebsite: string;
  provider: JobSourceProvider;
};

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(databaseUrl);
}

function slugify(value: string, maxLength: number): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug === '' ? 'organization' : slug;
}

function providerBoardUrl(provider: JobSourceProvider, boardToken: string): string {
  if (provider === 'GREENHOUSE') return `https://boards.greenhouse.io/${boardToken}`;
  return `https://jobs.lever.co/${boardToken}`;
}

export async function submitEmployerJob(
  userId: string,
  input: JobSubmissionInput,
): Promise<{ freeUntil: Date; id: string }> {
  const client = sql();
  let submittedOrgSlug: string | null = null;
  let submittedJobSlug: string | null = null;
  try {
    const result = await client.begin(async (transaction) => {
      const existingOrganizations = await transaction<{ id: string; slug: string }[]>`
        SELECT id,slug FROM organizations
        WHERE lower(name)=lower(${input.organizationName}) AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `;
      const organization = existingOrganizations[0];
      const organizationSlug =
        organization?.slug ??
        `${slugify(input.organizationName, 48)}-${crypto.randomUUID().slice(0, 6)}`;
      submittedOrgSlug = organizationSlug;
      const organizationId =
        organization?.id ??
        (
          await transaction<{ id: string }[]>`
            INSERT INTO organizations (slug,name,tagline,description,website_url,verification_status)
            VALUES (
              ${organizationSlug},
              ${input.organizationName},
              ${'Employer-submitted organization'},
              ${'This organization was submitted by a VouchNet member and is awaiting verification.'},
              ${input.organizationWebsite},
              'UNVERIFIED'
            )
            RETURNING id
          `
        )[0]?.id;
      if (organizationId === undefined) throw new Error('ORGANIZATION_CREATE_FAILED');

      const trialRows = await transaction<{ ends_at: Date }[]>`
        INSERT INTO employer_launch_trials (user_id)
        VALUES (${userId})
        ON CONFLICT (user_id) DO UPDATE SET updated_at=now()
        RETURNING ends_at
      `;
      const freeUntil = trialRows[0]?.ends_at;
      if (freeUntil === undefined) throw new Error('LAUNCH_TRIAL_UNAVAILABLE');
      if (freeUntil.getTime() <= Date.now()) throw new JobSourcingError('FREE_WINDOW_EXPIRED');

      const jobRows = await transaction<{ id: string }[]>`
        INSERT INTO jobs (
          organization_id,slug,title,summary,description,location,workplace_type,employment_type,
          salary_min,salary_max,salary_currency,skill_tags,source_url,source_checked_at,source_status,
          origin,employer_review_status,posting_owner_user_id,launch_waiver_expires_at,native_application_enabled
        ) VALUES (
          ${organizationId},
          ${(submittedJobSlug = `${slugify(input.organizationName, 30)}-${slugify(input.title, 50)}-${crypto.randomUUID().slice(0, 6)}`)},
          ${input.title},${input.summary},${input.description},${input.location},${input.workplaceType},${input.employmentType},
          ${input.salaryMin},${input.salaryMax},${input.salaryCurrency},${input.skillTags},${input.applicationUrl},now(),'PENDING_REVIEW',
          'EMPLOYER_SUBMISSION','PENDING',${userId},${freeUntil},true
        ) RETURNING id
      `;
      const job = jobRows[0];
      if (job === undefined) throw new Error('JOB_CREATE_FAILED');
      return { freeUntil, id: job.id };
    });
    const indexable = ['/jobs', '/opportunities'];
    if (submittedOrgSlug !== null) indexable.push(`/company/${submittedOrgSlug}`);
    if (submittedJobSlug !== null) indexable.push(`/jobs/${submittedJobSlug}`);
    submitToIndexNow(indexable);
    return result;
  } catch (error) {
    if (isUniqueViolation(error)) throw new JobSourcingError('DUPLICATE_JOB');
    throw error;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function registerJobSource(
  userId: string,
  input: JobSourceInput,
): Promise<{ freeUntil: Date; id: string; status: 'PENDING_REVIEW' }> {
  const client = sql();
  try {
    return await client.begin(async (transaction) => {
      const existingOrganizations = await transaction<{ id: string }[]>`
        SELECT id FROM organizations
        WHERE lower(name)=lower(${input.organizationName}) AND deleted_at IS NULL
        LIMIT 1
        FOR UPDATE
      `;
      const organizationId =
        existingOrganizations[0]?.id ??
        (
          await transaction<{ id: string }[]>`
            INSERT INTO organizations (slug,name,tagline,description,website_url,verification_status)
            VALUES (
              ${`${slugify(input.organizationName, 48)}-${crypto.randomUUID().slice(0, 6)}`},
              ${input.organizationName},
              ${'Public job-board source'},
              ${'A public job-board source proposed for VouchNet review.'},
              ${input.organizationWebsite},
              'UNVERIFIED'
            ) RETURNING id
          `
        )[0]?.id;
      if (organizationId === undefined) throw new Error('ORGANIZATION_CREATE_FAILED');
      const trialRows = await transaction<{ ends_at: Date }[]>`
        INSERT INTO employer_launch_trials (user_id)
        VALUES (${userId})
        ON CONFLICT (user_id) DO UPDATE SET updated_at=now()
        RETURNING ends_at
      `;
      const freeUntil = trialRows[0]?.ends_at;
      if (freeUntil === undefined) throw new Error('LAUNCH_TRIAL_UNAVAILABLE');
      if (freeUntil.getTime() <= Date.now()) throw new JobSourcingError('FREE_WINDOW_EXPIRED');
      const sourceRows = await transaction<{ id: string }[]>`
        INSERT INTO job_sources (owner_user_id,organization_id,provider,board_token,board_url)
        VALUES (${userId},${organizationId},${input.provider},${input.boardToken},${providerBoardUrl(input.provider, input.boardToken)})
        RETURNING id
      `;
      const source = sourceRows[0];
      if (source === undefined) throw new Error('SOURCE_CREATE_FAILED');
      return { freeUntil, id: source.id, status: 'PENDING_REVIEW' as const };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new JobSourcingError('DUPLICATE_SOURCE');
    throw error;
  } finally {
    await client.end({ timeout: 1 });
  }
}

export async function getEmployerLaunchDashboard(userId: string): Promise<EmployerLaunchDashboard> {
  const client = sql();
  try {
    const [trials, submissions, sources] = await Promise.all([
      client<{ ends_at: Date }[]>`
        SELECT ends_at FROM employer_launch_trials WHERE user_id=${userId} LIMIT 1
      `,
      client<EmployerSubmission[]>`
        SELECT j.id,j.slug,j.title,j.created_at AS "createdAt",j.employer_review_status AS "employerReviewStatus",
          j.launch_waiver_expires_at AS "freeUntil",o.name AS "organizationName"
        FROM jobs j JOIN organizations o ON o.id=j.organization_id
        WHERE j.posting_owner_user_id=${userId} AND j.deleted_at IS NULL
        ORDER BY j.created_at DESC
      `,
      client<EmployerLaunchDashboard['sources']>`
        SELECT id,provider,status,created_at AS "createdAt",last_synced_at AS "lastSyncedAt"
        FROM job_sources WHERE owner_user_id=${userId} ORDER BY created_at DESC
      `,
    ]);
    return { submissions, sources, trialEndsAt: trials[0]?.ends_at ?? null };
  } finally {
    await client.end({ timeout: 1 });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
