import Link from 'next/link';
import type { Metadata } from 'next';
import { Shell } from '../components/shell';
import { buttonClassName } from '../components/ui/button';
import { getCurrentActor } from '../lib/identity';
import { listOpportunities } from '../lib/opportunities';
import {
  opportunityTypeLabels,
  opportunityTypes,
  parseOpportunityFilters,
} from '../lib/opportunity-model';
import { OpportunityRow } from './opportunity-row';

export const metadata: Metadata = {
  title: 'Opportunities · VouchNet',
  description:
    'Requests for software, contracts, grants, bounties, research collaborations, and more, posted by people building in public.',
  alternates: { canonical: '/opportunities' },
};

type SearchParams = Promise<{ type?: string; q?: string; remote?: string }>;

export default async function OpportunitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await getCurrentActor();
  const filters = parseOpportunityFilters(await searchParams);
  const opportunities = await listOpportunities({
    viewerId: actor?.userId ?? null,
    type: filters.type,
    q: filters.q,
    remoteOnly: filters.remoteOnly,
  });
  const filtered = filters.type !== null || filters.q !== null || filters.remoteOnly;
  const content = (
    <section className="opportunities-page">
      <header className="page-heading projects-heading">
        <div>
          <p className="eyebrow">Build in public</p>
          <h1>Work worth doing, posted by the people who need it.</h1>
          <p>
            Requests for software, contracts, grants, bounties, and research collaborations. Every
            opportunity links to a real member, and proposals go straight to them.
          </p>
        </div>
        <div className="opportunities-heading-actions">
          <Link
            className={buttonClassName({ size: 'md' })}
            href={actor === null ? '/login?next=/opportunities/new' : '/opportunities/new'}
          >
            Post an opportunity
          </Link>
          {actor === null ? null : (
            <Link
              className={buttonClassName({ variant: 'secondary', size: 'md' })}
              href="/opportunities/mine"
            >
              Your opportunities
            </Link>
          )}
        </div>
      </header>
      <form className="opportunity-filters" role="search" aria-label="Filter opportunities">
        <label>
          <span>Type</span>
          <select name="type" defaultValue={filters.type ?? ''}>
            <option value="">All types</option>
            {opportunityTypes.map((type) => (
              <option key={type} value={type}>
                {opportunityTypeLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="opportunity-filters-query">
          <span>Search</span>
          <input name="q" defaultValue={filters.q ?? ''} placeholder="Skill, topic, or keyword" />
        </label>
        <label className="project-check">
          <input type="checkbox" name="remote" value="1" defaultChecked={filters.remoteOnly} />
          Remote only
        </label>
        <button className={buttonClassName({ variant: 'secondary', size: 'md' })} type="submit">
          Apply filters
        </button>
        {filtered ? <Link href="/opportunities">Clear</Link> : null}
      </form>
      <div className="job-list opportunity-list" aria-live="polite">
        {opportunities.length === 0 ? (
          <article className="jobs-empty">
            <h2>
              {filtered
                ? 'No open opportunities match those filters.'
                : 'No open opportunities yet.'}
            </h2>
            <p>
              {filtered
                ? 'Try another type or a broader keyword.'
                : 'Post the first one: describe the work, who fits, and the budget if you have one.'}
            </p>
          </article>
        ) : (
          opportunities.map((opportunity) => (
            <OpportunityRow key={opportunity.id} opportunity={opportunity} />
          ))
        )}
      </div>
    </section>
  );
  if (actor !== null) return <Shell>{content}</Shell>;
  return (
    <main className="directory-page opportunities-public">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/login?next=/opportunities">
            Sign in
          </Link>
          <Link className="primary" href="/signup">
            Build your profile
          </Link>
        </div>
      </header>
      {content}
    </main>
  );
}
