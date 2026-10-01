import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getOrganization, listPublicJobs } from '../../lib/directory';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const organization = await getOrganization((await params).slug);
  if (organization === null) return { title: 'Organization not found · VouchNet' };
  return {
    title: `${organization.name} · VouchNet`,
    description: organization.tagline ?? organization.description,
    alternates: { canonical: `/company/${organization.slug}` },
    openGraph: {
      type: 'website',
      title: `${organization.name} · VouchNet`,
      description: organization.tagline ?? organization.description,
    },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const [organization, jobs] = await Promise.all([getOrganization(slug), listPublicJobs()]);
  if (organization === null) notFound();
  const organizationJobs = jobs.filter((job) => job.organizationSlug === slug);
  return (
    <main className="directory-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/jobs">
            Browse jobs
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      <section className="company-hero">
        <div className="company-monogram" aria-hidden="true">
          {organization.name.slice(0, 1)}
        </div>
        <div>
          <div className="company-hero-topline">
            <span className="directory-label">Public organization directory</span>
            <span className="source-review">Source reviewed</span>
          </div>
          <h1>{organization.name}</h1>
          <p>{organization.tagline}</p>
          <span>{organization.headquarters ?? 'Location not listed'}</span>
        </div>
      </section>
      <section className="company-layout">
        <article className="company-about">
          <h2>About</h2>
          <p>{organization.description}</p>
          <p className="directory-disclaimer">
            This is a public directory record, not an official company page. VouchNet has not
            verified administrative ownership.
          </p>
          <div className="company-links">
            <a href={organization.websiteUrl} rel="noreferrer" target="_blank">
              Website ↗
            </a>
            {organization.careersUrl === null ? null : (
              <a href={organization.careersUrl} rel="noreferrer" target="_blank">
                Careers ↗
              </a>
            )}
            {organization.engineeringUrl === null ? null : (
              <a href={organization.engineeringUrl} rel="noreferrer" target="_blank">
                Engineering ↗
              </a>
            )}
            {organization.repositoryUrl === null ? null : (
              <a href={organization.repositoryUrl} rel="noreferrer" target="_blank">
                Open source ↗
              </a>
            )}
          </div>
        </article>
        <aside className="company-signals">
          <h2>Public technology signals</h2>
          {organization.technologies.length === 0 ? (
            <p>Technology details have not been source-reviewed for this record.</p>
          ) : (
            <div className="project-tags">
              {organization.technologies.map((technology) => (
                <a
                  key={technology.name}
                  href={technology.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {technology.name}
                </a>
              ))}
            </div>
          )}
          <p>
            Technology signals are linked to public sources; they are not a complete internal stack.
          </p>
        </aside>
      </section>
      <section className="company-jobs">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Source-linked opportunities</p>
            <h2>Jobs from this organization</h2>
          </div>
          <Link className="secondary" href="/jobs">
            All jobs
          </Link>
        </div>
        {organizationJobs.length === 0 ? (
          <p>No reviewed listing is currently in the directory.</p>
        ) : (
          <div className="job-list">
            {organizationJobs.map((job) => (
              <article key={job.slug} className="job-row">
                <div>
                  <span>
                    {job.workplaceType.toLowerCase()} · {job.location}
                  </span>
                  <h3>{job.title}</h3>
                  <p>{job.summary}</p>
                </div>
                <Link href={`/jobs/${job.slug}`}>Review role</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
