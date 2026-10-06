import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { buttonClassName } from '../../components/ui/button';
import { getCurrentActor } from '../../lib/identity';
import { listOwnOpportunities, listOwnProposals } from '../../lib/opportunities';
import {
  opportunityStatusLabels,
  opportunityTypeLabels,
  proposalStatusLabels,
} from '../../lib/opportunity-model';
import { WithdrawProposalButton } from '../opportunity-actions';

export const metadata: Metadata = { title: 'Your opportunities · VouchNet' };

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export default async function MyOpportunitiesPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/opportunities/mine');
  const [posted, proposals] = await Promise.all([
    listOwnOpportunities(actor.userId),
    listOwnProposals(actor.userId),
  ]);
  return (
    <Shell>
      <section className="opportunities-page">
        <header className="page-heading projects-heading">
          <div>
            <p className="eyebrow">Opportunities</p>
            <h1>Your opportunities and proposals.</h1>
            <p>Track what you posted, who replied, and where your proposals stand.</p>
          </div>
          <div className="opportunities-heading-actions">
            <Link className={buttonClassName({ size: 'md' })} href="/opportunities/new">
              Post an opportunity
            </Link>
            <Link
              className={buttonClassName({ variant: 'secondary', size: 'md' })}
              href="/opportunities"
            >
              Browse all
            </Link>
          </div>
        </header>
        <section className="company-jobs" aria-labelledby="posted-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Posted</p>
              <h2 id="posted-heading">What you are looking for</h2>
            </div>
          </div>
          {posted.length === 0 ? (
            <p>You have not posted an opportunity yet.</p>
          ) : (
            <div className="job-list">
              {posted.map((opportunity) => (
                <article key={opportunity.id} className="job-row">
                  <div>
                    <div className="job-row-topline">
                      <span>
                        {opportunityTypeLabels[opportunity.type]} ·{' '}
                        {opportunity.moderationState === 'REMOVED'
                          ? 'Removed by moderation'
                          : opportunityStatusLabels[opportunity.status]}
                      </span>
                      <span>{dateFormat.format(new Date(opportunity.createdAt))}</span>
                    </div>
                    <h3>{opportunity.title}</h3>
                    <p>
                      {opportunity.proposalCount === 1
                        ? '1 proposal'
                        : `${opportunity.proposalCount} proposals`}
                      {opportunity.newProposals > 0
                        ? ` · ${opportunity.newProposals} awaiting review`
                        : ''}
                    </p>
                  </div>
                  <Link href={`/opportunities/${opportunity.slug}#proposals`}>Review</Link>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="company-jobs" aria-labelledby="sent-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sent</p>
              <h2 id="sent-heading">Your proposals</h2>
            </div>
          </div>
          {proposals.length === 0 ? (
            <p>
              You have not sent a proposal yet.{' '}
              <Link href="/opportunities">Browse opportunities</Link>
            </p>
          ) : (
            <div className="job-list">
              {proposals.map((proposal) => (
                <article key={proposal.id} className="job-row">
                  <div>
                    <div className="job-row-topline">
                      <span>{proposalStatusLabels[proposal.status]}</span>
                      <span>
                        {opportunityTypeLabels[proposal.opportunity.type]} ·{' '}
                        {opportunityStatusLabels[proposal.opportunity.status]}
                      </span>
                    </div>
                    <h3>
                      <Link href={`/opportunities/${proposal.opportunity.slug}`}>
                        {proposal.opportunity.title}
                      </Link>
                    </h3>
                    <p>
                      Posted by {proposal.opportunity.posterName} · sent{' '}
                      {dateFormat.format(new Date(proposal.createdAt))}
                    </p>
                  </div>
                  {proposal.status === 'SUBMITTED' || proposal.status === 'SHORTLISTED' ? (
                    <WithdrawProposalButton
                      opportunityId={proposal.opportunity.id}
                      proposalId={proposal.id}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </Shell>
  );
}
