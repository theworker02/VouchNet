import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Shell } from '../../components/shell';
import { buttonClassName } from '../../components/ui/button';
import { getCurrentActor } from '../../lib/identity';
import { getOpportunityDetail, type OpportunityDetail } from '../../lib/opportunities';
import {
  formatBudget,
  opportunityStatusLabels,
  opportunityTypeLabels,
  proposalStatusLabels,
} from '../../lib/opportunity-model';
import {
  OpportunityStatusControls,
  ProposalForm,
  ProposalReviewActions,
  WithdrawProposalButton,
} from '../opportunity-actions';
import { opportunityErrorCopy } from '../opportunity-errors';
import { formatDeadline } from '../opportunity-row';
import { linkableProjects } from '../project-options';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const opportunity = await getOpportunityDetail((await params).slug, null);
  if (opportunity === null) return { title: 'Opportunity not found · VouchNet' };
  return {
    title: `${opportunity.title} · VouchNet`,
    description: opportunity.summary,
    alternates: { canonical: `/opportunities/${opportunity.slug}` },
    openGraph: { type: 'article', title: opportunity.title, description: opportunity.summary },
  };
}

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default async function OpportunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await getCurrentActor();
  const opportunity = await getOpportunityDetail((await params).slug, actor?.userId ?? null);
  if (opportunity === null) notFound();
  const projects =
    actor !== null &&
    opportunity.viewer.role === 'MEMBER' &&
    opportunity.viewer.proposalDenial === null
      ? await linkableProjects(actor.userId)
      : [];
  if (actor === null)
    return (
      <main className="public-project">
        <header className="public-nav">
          <Link className="brand" href="/">
            VouchNet
          </Link>
          <div>
            <Link className="quiet-link" href="/opportunities">
              All opportunities
            </Link>
            <Link className="primary" href="/signup">
              Build your profile
            </Link>
          </div>
        </header>
        <OpportunityView opportunity={opportunity} projects={projects} />
      </main>
    );
  return (
    <Shell>
      <div className="project-page opportunity-page">
        <OpportunityView opportunity={opportunity} projects={projects} />
      </div>
    </Shell>
  );
}

function OpportunityView({
  opportunity,
  projects,
}: {
  opportunity: OpportunityDetail;
  projects: { id: string; name: string }[];
}) {
  const { viewer } = opportunity;
  const budget = formatBudget(
    opportunity.budgetMin,
    opportunity.budgetMax,
    opportunity.budgetCurrency,
  );
  const deadline = formatDeadline(opportunity.deadline);
  return (
    <>
      {opportunity.moderationState === 'REMOVED' ? (
        <p className="form-error" role="status">
          Moderation removed this opportunity. Only you can see it.
        </p>
      ) : null}
      <article className="public-project-surface">
        <div className="public-project-topline">
          <span>
            {opportunityTypeLabels[opportunity.type]} ·{' '}
            {opportunityStatusLabels[opportunity.status]}
          </span>
          <span>
            Posted by{' '}
            <Link href={`/vouch/${opportunity.poster.slug}`}>{opportunity.poster.name}</Link> ·{' '}
            {dateFormat.format(new Date(opportunity.createdAt))}
          </span>
        </div>
        <h1>{opportunity.title}</h1>
        <p className="public-project-summary">{opportunity.summary}</p>
        <div className="job-meta opportunity-facts">
          <span>
            {opportunity.remote ? 'Remote' : 'On-site'}
            {opportunity.location === null ? null : <> · {opportunity.location}</>}
          </span>
          {budget === null ? (
            <span className="job-salary-undisclosed">Budget not listed</span>
          ) : (
            <span>{budget}</span>
          )}
          {deadline === null ? null : <span>Proposals by {deadline}</span>}
          <span>
            {opportunity.proposalsOpen ? 'Accepting proposals' : 'Not accepting proposals'}
          </span>
        </div>
        {opportunity.tags.length === 0 ? null : (
          <div className="project-tags">
            {opportunity.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {viewer.role === 'POSTER' ? (
          <div className="relationship-actions">
            <Link
              className={buttonClassName({ variant: 'secondary', size: 'sm' })}
              href={`/opportunities/${opportunity.slug}/edit`}
            >
              Edit
            </Link>
            <OpportunityStatusControls opportunityId={opportunity.id} status={opportunity.status} />
          </div>
        ) : null}
        <section className="public-project-description">
          <h2>The work</h2>
          <p>{opportunity.description}</p>
          <h2>Looking for</h2>
          <p>{opportunity.lookingFor}</p>
        </section>
      </article>
      <section className="company-layout project-build-layout">
        <article className="company-about" id="proposals" aria-labelledby="proposal-heading">
          {viewer.role === 'POSTER' ? (
            <PosterProposals opportunity={opportunity} />
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Proposals</p>
                  <h2 id="proposal-heading">
                    {viewer.ownProposal !== null ? 'Your proposal' : 'Send a proposal'}
                  </h2>
                </div>
              </div>
              {viewer.role === 'ANONYMOUS' ? (
                <p>
                  <Link href={`/login?next=/opportunities/${opportunity.slug}`}>Sign in</Link> to
                  send {opportunity.poster.name.split(' ')[0]} a proposal.
                </p>
              ) : viewer.ownProposal !== null ? (
                <div className="job-row">
                  <div>
                    <div className="job-row-topline">
                      <span>{proposalStatusLabels[viewer.ownProposal.status]}</span>
                      <span>Sent {dateFormat.format(new Date(viewer.ownProposal.createdAt))}</span>
                    </div>
                    <p>
                      {opportunity.poster.name} reviews proposals directly. You will get a
                      notification when they shortlist, accept, or decline it.
                    </p>
                  </div>
                  {viewer.ownProposal.status === 'SUBMITTED' ||
                  viewer.ownProposal.status === 'SHORTLISTED' ? (
                    <WithdrawProposalButton
                      opportunityId={opportunity.id}
                      proposalId={viewer.ownProposal.id}
                    />
                  ) : null}
                </div>
              ) : viewer.proposalDenial !== null ? (
                <p>{opportunityErrorCopy(viewer.proposalDenial, 'Proposals are not available.')}</p>
              ) : (
                <ProposalForm opportunityId={opportunity.id} projects={projects} />
              )}
            </>
          )}
        </article>
        <aside className="company-signals" aria-labelledby="posted-by-heading">
          <h2 id="posted-by-heading">Posted by</h2>
          <div className="invitation">
            <div className="invitation-avatar" aria-hidden="true">
              {initials(opportunity.poster.name)}
            </div>
            <p>
              <Link href={`/vouch/${opportunity.poster.slug}`}>{opportunity.poster.name}</Link>
              {opportunity.poster.headline === null ? null : (
                <small>{opportunity.poster.headline}</small>
              )}
            </p>
          </div>
          {opportunity.project === null ? null : (
            <>
              <h2>Related project</h2>
              <p>
                <Link href={`/projects/${opportunity.project.slug}`}>
                  {opportunity.project.name}
                </Link>
              </p>
            </>
          )}
          <h2>Activity</h2>
          <p>
            {opportunity.proposalCount === 1
              ? '1 proposal so far'
              : `${opportunity.proposalCount} proposals so far`}
          </p>
          {viewer.role === 'POSTER' ? null : (
            <p>
              <Link href={`/moderation/report?path=/opportunities/${opportunity.slug}`}>
                Report this opportunity
              </Link>
            </p>
          )}
        </aside>
      </section>
    </>
  );
}

function PosterProposals({ opportunity }: { opportunity: OpportunityDetail }) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Review</p>
          <h2 id="proposal-heading">
            {opportunity.proposals.length === 1
              ? '1 proposal'
              : `${opportunity.proposals.length} proposals`}
          </h2>
        </div>
      </div>
      {opportunity.proposals.length === 0 ? (
        <p>No proposals yet. Share the link with people who might fit.</p>
      ) : (
        <ol className="job-list build-log-list opportunity-proposals">
          {opportunity.proposals.map((proposal) => (
            <li key={proposal.id} className="job-row">
              <div>
                <div className="job-row-topline">
                  <span>{proposalStatusLabels[proposal.status]}</span>
                  <span>{dateFormat.format(new Date(proposal.createdAt))}</span>
                </div>
                <h3>
                  <Link href={`/vouch/${proposal.proposer.slug}`}>{proposal.proposer.name}</Link>
                </h3>
                {proposal.proposer.headline === null ? null : (
                  <p className="muted-copy">{proposal.proposer.headline}</p>
                )}
                <p className="opportunity-proposal-message">{proposal.message}</p>
                <div className="project-tags">
                  <span>
                    {proposal.voucherCount === 1
                      ? '1 person vouches'
                      : `${proposal.voucherCount} people vouch`}
                  </span>
                  <span>{proposal.reputationLevel}</span>
                  {proposal.proposedBudget === null ? null : (
                    <span>
                      {formatBudget(
                        proposal.proposedBudget,
                        proposal.proposedBudget,
                        opportunity.budgetCurrency,
                      )}
                    </span>
                  )}
                  {proposal.timeline === null ? null : <span>{proposal.timeline}</span>}
                </div>
                <div className="public-project-links">
                  {proposal.portfolioUrl === null ? null : (
                    <a href={proposal.portfolioUrl} rel="noreferrer nofollow" target="_blank">
                      Portfolio ↗
                    </a>
                  )}
                  {proposal.project === null ? null : (
                    <Link href={`/projects/${proposal.project.slug}`}>{proposal.project.name}</Link>
                  )}
                </div>
                <ProposalReviewActions
                  opportunityId={opportunity.id}
                  proposalId={proposal.id}
                  status={proposal.status}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
