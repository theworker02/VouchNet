import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicJob } from '../../lib/directory';

function money(value: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatWorkplace(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const job = await getPublicJob((await params).slug);
  if (job === null) return { title: 'Job not found | VouchNet' };
  return {
    title: `${job.title} at ${job.organizationName} | VouchNet`,
    description: job.summary,
    alternates: { canonical: `/jobs/${job.slug}` },
    openGraph: {
      title: `${job.title} at ${job.organizationName}`,
      description: job.summary,
      type: 'website',
    },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const job = await getPublicJob((await params).slug);
  if (job === null) notFound();
  const salary =
    job.salaryMin === null || job.salaryMax === null
      ? 'Salary was not disclosed by the source.'
      : `${money(job.salaryMin, job.salaryCurrency)} – ${money(job.salaryMax, job.salaryCurrency)} per year`;
  return (
    <main className="directory-page job-detail-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/jobs">
            All jobs
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      <section className="job-detail-hero">
        <div className="job-row-topline">
          <Link href={`/company/${job.organizationSlug}`}>{job.organizationName}</Link>
          <span>Source reviewed</span>
        </div>
        <h1>{job.title}</h1>
        <p>{job.summary}</p>
        <div className="job-meta">
          <span>
            {formatWorkplace(job.workplaceType)} · {job.location}
          </span>
          <span>{job.employmentType.replaceAll('_', ' ').toLowerCase()}</span>
          <span className={job.salaryMin === null ? 'job-salary-undisclosed' : undefined}>
            {salary}
          </span>
        </div>
        {job.nativeApplicationEnabled ? (
          <Link className="primary" href={`/jobs/${job.slug}/apply`}>
            Apply with VouchNet
          </Link>
        ) : (
          <a className="primary" href={job.sourceUrl} rel="noreferrer" target="_blank">
            Apply at source ↗
          </a>
        )}
      </section>
      <section className="job-detail-layout">
        <article className="job-detail-copy">
          <h2>Role details</h2>
          {job.description.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>
        <aside className="job-detail-aside">
          <h2>Relevant stack</h2>
          <div className="project-tags">
            {job.skillTags.map((tag) => (
              <Link href={`/jobs?q=${encodeURIComponent(tag)}`} key={tag}>
                {tag}
              </Link>
            ))}
          </div>
          <p>
            Listing availability and application handling remain with the source organization. Check
            the source before applying.
          </p>
          <a href={job.sourceUrl} rel="noreferrer" target="_blank">
            Open original listing ↗
          </a>
        </aside>
      </section>
    </main>
  );
}
