import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublicJobs } from '../lib/directory';

export const metadata: Metadata = {
  title: 'Transparent technical jobs | VouchNet',
  description:
    'Source-linked technical opportunities with visible numeric salary ranges and stack tags.',
  alternates: { canonical: '/jobs' },
  openGraph: {
    title: 'Transparent technical jobs | VouchNet',
    description: 'See the compensation and source before you decide to apply.',
  },
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim();
  const jobs = await listPublicJobs(query);
  return (
    <main className="directory-page jobs-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/login">
            Sign in
          </Link>
          <Link className="primary" href="/jobs/post">
            Post a role
          </Link>
        </div>
      </header>
      <section className="jobs-hero">
        <p className="eyebrow">Transparent job directory</p>
        <h1>Know the compensation before you spend the time.</h1>
        <p>
          Every listing below links to its source. When compensation is published, we show the
          numeric range; when it is absent, we label it plainly and place it later. Availability can
          change at the source.
        </p>
        <form className="job-search">
          <label className="sr-only" htmlFor="job-query">
            Search jobs
          </label>
          <input
            id="job-query"
            name="q"
            defaultValue={query}
            placeholder="Role, company, location, or skill"
          />
          <button>Search opportunities</button>
        </form>
      </section>
      <div className="jobs-directory-note">
        <span>{jobs.length} source-linked technical roles</span>
        <span>Salary disclosure ranked first</span>
        <Link href="/jobs/post">Post free for two months →</Link>
      </div>
      <section className="job-list" aria-live="polite">
        {jobs.length === 0 ? (
          <article className="jobs-empty">
            <h2>No reviewed roles matched that search.</h2>
            <p>Try a company, location, or broad skill. We do not invent job results.</p>
          </article>
        ) : (
          jobs.map((job) => (
            <article key={job.slug} className="job-row job-card">
              <div>
                <div className="job-row-topline">
                  <Link href={`/company/${job.organizationSlug}`}>{job.organizationName}</Link>
                  <span>Source reviewed</span>
                </div>
                <h2>{job.title}</h2>
                <p>{job.summary}</p>
                <div className="job-meta">
                  <span>
                    {job.workplaceType.toLowerCase()} · {job.location}
                  </span>
                  {job.salaryMin === null || job.salaryMax === null ? (
                    <span className="job-salary-undisclosed">Salary not disclosed</span>
                  ) : (
                    <span>
                      {money(job.salaryMin, job.salaryCurrency)} –{' '}
                      {money(job.salaryMax, job.salaryCurrency)} / year
                    </span>
                  )}
                </div>
                <div className="project-tags">
                  {job.skillTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <a className="secondary" href={job.sourceUrl} target="_blank" rel="noreferrer">
                Open source listing ↗
              </a>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
