import 'server-only';
import { createSqlClient } from '@nexus/db';
import type { JobSourceProvider } from './jobs';

type ActiveSource = {
  boardToken: string;
  id: string;
  organizationId: string;
  organizationSlug: string;
  provider: JobSourceProvider;
};

type ImportedJob = {
  description: string;
  externalId: string;
  location: string;
  salaryCurrency: string;
  salaryMax: number | null;
  salaryMin: number | null;
  skillTags: string[];
  sourceUrl: string;
  summary: string;
  title: string;
  workplaceType: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNSPECIFIED';
};

function sql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined) throw new Error('DATABASE_UNAVAILABLE');
  return createSqlClient(databaseUrl);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(value: string): string {
  return value.length <= 580 ? value : `${value.slice(0, 577).trimEnd()}…`;
}

function inferWorkplace(value: string): ImportedJob['workplaceType'] {
  if (/\bremote\b/i.test(value)) return 'REMOTE';
  if (/\bhybrid\b/i.test(value)) return 'HYBRID';
  if (/\bon[ -]?site\b/i.test(value)) return 'ONSITE';
  return 'UNSPECIFIED';
}

function parseCompensation(
  value: string,
): Pick<ImportedJob, 'salaryCurrency' | 'salaryMax' | 'salaryMin'> {
  const match = value.match(
    /(?:\$|USD\s?)(\d{2,3}(?:,\d{3})?)\s*(?:-|–|to)\s*(?:\$|USD\s?)?(\d{2,3}(?:,\d{3})?)/i,
  );
  if (match === null) return { salaryCurrency: 'USD', salaryMax: null, salaryMin: null };
  const salaryMin = Number(match[1]?.replace(',', ''));
  const salaryMax = Number(match[2]?.replace(',', ''));
  if (!Number.isSafeInteger(salaryMin) || !Number.isSafeInteger(salaryMax) || salaryMax < salaryMin)
    return { salaryCurrency: 'USD', salaryMax: null, salaryMin: null };
  return { salaryCurrency: 'USD', salaryMax, salaryMin };
}

function safeUrl(value: unknown): string | null {
  const text = stringValue(value);
  if (text === null) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function providerTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (isRecord(entry) ? stringValue(entry.name) : stringValue(entry)))
    .filter((entry): entry is string => entry !== null)
    .slice(0, 12);
}

function providerCategoryTags(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return [value.team, value.department, value.commitment]
    .map(stringValue)
    .filter((entry): entry is string => entry !== null)
    .slice(0, 12);
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'VouchNetJobSource/1.0' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`PROVIDER_HTTP_${response.status}`);
  return response.json();
}

async function fetchGreenhouseJobs(boardToken: string): Promise<ImportedJob[]> {
  const payload = await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
  );
  const jobs = isRecord(payload) && Array.isArray(payload.jobs) ? payload.jobs : [];
  return jobs.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const title = stringValue(entry.title);
    const externalId = entry.id === undefined || entry.id === null ? null : String(entry.id);
    const sourceUrl = safeUrl(entry.absolute_url);
    const content = stripMarkup(stringValue(entry.content) ?? '');
    const locationRecord = isRecord(entry.location) ? entry.location : null;
    const location = stringValue(locationRecord?.name) ?? 'Location not specified';
    if (title === null || externalId === null || sourceUrl === null || content === '') return [];
    return [
      {
        ...parseCompensation(content),
        description: content,
        externalId,
        location,
        skillTags: providerTags(entry.departments),
        sourceUrl,
        summary: excerpt(content),
        title,
        workplaceType: inferWorkplace(`${title} ${location} ${content}`),
      },
    ];
  });
}

async function fetchLeverJobs(boardToken: string): Promise<ImportedJob[]> {
  const payload = await fetchJson(
    `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`,
  );
  const jobs = Array.isArray(payload) ? payload : [];
  return jobs.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const title = stringValue(entry.text);
    const externalId = stringValue(entry.id);
    const sourceUrl = safeUrl(entry.hostedUrl) ?? safeUrl(entry.applyUrl);
    const content = stripMarkup(
      stringValue(entry.descriptionPlain) ?? stringValue(entry.description) ?? '',
    );
    const categories = isRecord(entry.categories) ? entry.categories : null;
    const location = stringValue(categories?.location) ?? 'Location not specified';
    if (title === null || externalId === null || sourceUrl === null || content === '') return [];
    return [
      {
        ...parseCompensation(content),
        description: content,
        externalId,
        location,
        skillTags: providerCategoryTags(categories),
        sourceUrl,
        summary: excerpt(content),
        title,
        workplaceType: inferWorkplace(`${title} ${location} ${content}`),
      },
    ];
  });
}

async function fetchProviderJobs(source: ActiveSource): Promise<ImportedJob[]> {
  return source.provider === 'GREENHOUSE'
    ? fetchGreenhouseJobs(source.boardToken)
    : fetchLeverJobs(source.boardToken);
}

function jobSlug(source: ActiveSource, job: ImportedJob): string {
  const title = job.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const stableId = job.externalId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-12);
  return `${source.organizationSlug}-${title || 'role'}-${stableId || 'external'}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .slice(0, 96)
    .replace(/-+$/g, '');
}

async function persistImportedJob(
  client: ReturnType<typeof sql>,
  source: ActiveSource,
  job: ImportedJob,
): Promise<void> {
  const existing = await client<{ id: string }[]>`
    SELECT id FROM jobs
    WHERE (source_provider=${source.provider} AND external_job_id=${job.externalId}) OR source_url=${job.sourceUrl}
    LIMIT 1
  `;
  const current = existing[0];
  if (current !== undefined) {
    await client`
      UPDATE jobs SET title=${job.title},summary=${job.summary},description=${job.description},location=${job.location},
        workplace_type=${job.workplaceType},salary_min=${job.salaryMin},salary_max=${job.salaryMax},
        salary_currency=${job.salaryCurrency},skill_tags=${job.skillTags},source_url=${job.sourceUrl},
        source_checked_at=now(),source_status='SOURCE_LIVE',origin='PROVIDER_IMPORT',
        source_provider=${source.provider},external_job_id=${job.externalId},updated_at=now(),published_at=COALESCE(published_at,now())
      WHERE id=${current.id}
    `;
    return;
  }
  await client`
    INSERT INTO jobs (
      organization_id,slug,title,summary,description,location,workplace_type,employment_type,
      salary_min,salary_max,salary_currency,skill_tags,source_url,source_checked_at,source_status,
      origin,source_provider,external_job_id,employer_review_status,published_at
    ) VALUES (
      ${source.organizationId},${jobSlug(source, job)},${job.title},${job.summary},${job.description},${job.location},${job.workplaceType},'UNSPECIFIED',
      ${job.salaryMin},${job.salaryMax},${job.salaryCurrency},${job.skillTags},${job.sourceUrl},now(),'SOURCE_LIVE',
      'PROVIDER_IMPORT',${source.provider},${job.externalId},'NOT_REQUIRED',now()
    )
  `;
}

export async function syncActiveJobSources(): Promise<{
  failed: number;
  imported: number;
  sources: number;
}> {
  const client = sql();
  try {
    const sources = await client<ActiveSource[]>`
      SELECT s.id,s.provider,s.board_token AS "boardToken",s.organization_id AS "organizationId",o.slug AS "organizationSlug"
      FROM job_sources s JOIN organizations o ON o.id=s.organization_id
      WHERE s.status='ACTIVE' AND o.deleted_at IS NULL
      ORDER BY s.last_synced_at NULLS FIRST,s.created_at ASC
    `;
    let failed = 0;
    let imported = 0;
    for (const source of sources) {
      try {
        const jobs = await fetchProviderJobs(source);
        for (const job of jobs) await persistImportedJob(client, source, job);
        await client`
          UPDATE job_sources SET last_synced_at=now(),last_sync_status='SUCCESS',last_sync_error=NULL,updated_at=now()
          WHERE id=${source.id}
        `;
        imported += jobs.length;
      } catch (error) {
        failed += 1;
        const message =
          error instanceof Error ? error.message.slice(0, 500) : 'PROVIDER_SYNC_FAILED';
        await client`
          UPDATE job_sources SET last_sync_status='FAILED',last_sync_error=${message},updated_at=now()
          WHERE id=${source.id}
        `;
      }
    }
    return { failed, imported, sources: sources.length };
  } finally {
    await client.end({ timeout: 1 });
  }
}
