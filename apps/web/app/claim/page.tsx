import Link from 'next/link';
import { listClaimableOrganizations } from '../lib/directory';

export const metadata = {
  title: 'Claim your VouchNet profile | VouchNet',
  description:
    'Find an existing VouchNet organization profile and begin secure ownership verification.',
};

export default async function ClaimDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? '';
  const organizations = await listClaimableOrganizations(query);
  return (
    <main className="public-profile">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link className="quiet-link" href="/login">
          Sign in
        </Link>
      </header>
      <section className="claim-card claim-directory">
        <p className="eyebrow">Profile ownership</p>
        <h1>Claim your VouchNet profile</h1>
        <p>
          Already listed on VouchNet? Find the existing profile, sign in, then verify ownership
          before you can manage it.
        </p>
        <form action="/claim" className="claim-search-form" method="get">
          <label htmlFor="claim-query">Search for your company</label>
          <div>
            <input defaultValue={query} id="claim-query" name="q" placeholder="Company name" />
            <button className="primary" type="submit">
              Search
            </button>
          </div>
        </form>
        <div className="claim-search-results">
          {organizations.length === 0 ? (
            <p>No unclaimed organization profiles matched. Try a different name.</p>
          ) : (
            organizations.map((organization) => (
              <article key={organization.slug}>
                <div>
                  <span className="organization-unclaimed-badge">Unclaimed</span>
                  <h2>{organization.name}</h2>
                  <p>{organization.tagline ?? 'Public VouchNet directory profile'}</p>
                </div>
                <Link className="secondary" href={`/claim/${organization.slug}`}>
                  Claim profile
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
