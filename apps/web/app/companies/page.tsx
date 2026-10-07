import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublicOrganizations } from '../lib/directory';

export const metadata: Metadata = {
  title: 'Company directory | VouchNet',
  description:
    'Discover public organization pages for technology companies, open-source projects, and teams building on VouchNet.',
  alternates: { canonical: '/companies' },
  openGraph: {
    title: 'Company directory | VouchNet',
    description: 'Discover organizations, technical stacks, and public opportunities on VouchNet.',
  },
};

type SearchParams = Promise<{ q?: string }>;

function statusLabel(status: 'UNVERIFIED' | 'SOURCE_REVIEWED' | 'DOMAIN_VERIFIED') {
  if (status === 'DOMAIN_VERIFIED') return 'Verified organization';
  if (status === 'SOURCE_REVIEWED') return 'Source reviewed';
  return 'Unclaimed';
}

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const query = (await searchParams).q?.trim();
  const organizations = await listPublicOrganizations(query);
  const itemListJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'VouchNet company directory',
    itemListElement: organizations.map((organization, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `https://vouchnet.dev/company/${organization.slug}`,
      name: organization.name,
    })),
  }).replace(/</g, '\\u003c');

  return (
    <main className="directory-page companies-page">
      <script type="application/ld+json">{itemListJson}</script>
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/claim">
            Claim your organization
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      <section className="jobs-hero companies-hero">
        <p className="eyebrow">Public organization directory</p>
        <h1>Find the teams and work behind the opportunity.</h1>
        <p>
          Browse public organization pages, technical stacks, and source-linked hiring context
          without creating an account. Organization ownership is always verified separately.
        </p>
        <form className="job-search" role="search">
          <label className="sr-only" htmlFor="company-query">
            Search organizations
          </label>
          <input
            defaultValue={query}
            id="company-query"
            name="q"
            placeholder="Company, project, or technology"
          />
          <button type="submit">Search organizations</button>
        </form>
      </section>
      <div className="jobs-directory-note">
        <span>{organizations.length} public organizations</span>
        <span>Ownership labels are explicit</span>
        <Link href="/claim">Claim an existing page →</Link>
      </div>
      <section className="job-list company-directory-list" aria-live="polite">
        {organizations.length === 0 ? (
          <article className="jobs-empty">
            <h2>No organization matched that search.</h2>
            <p>Try a company name, project name, or broader technology.</p>
          </article>
        ) : (
          organizations.map((organization) => (
            <article className="job-row job-card" key={organization.slug}>
              <div>
                <div className="job-row-topline">
                  <span>{statusLabel(organization.verificationStatus)}</span>
                  <span>{organization.headquarters ?? 'Location not listed'}</span>
                </div>
                <h2>{organization.name}</h2>
                <p>{organization.tagline ?? 'Public organization profile on VouchNet.'}</p>
                {organization.technologies.length === 0 ? null : (
                  <div className="project-tags">
                    {organization.technologies.slice(0, 6).map((technology) => (
                      <span key={technology}>{technology}</span>
                    ))}
                  </div>
                )}
              </div>
              <Link className="secondary" href={`/company/${organization.slug}`}>
                View organization
              </Link>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
