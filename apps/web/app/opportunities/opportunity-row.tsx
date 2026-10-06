import Link from 'next/link';
import type { OpportunityRecord } from '../lib/opportunities';
import { formatBudget, opportunityTypeLabels } from '../lib/opportunity-model';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDeadline(deadline: string | null): string | null {
  return deadline === null ? null : dateFormat.format(new Date(`${deadline}T00:00:00Z`));
}

/** One opportunity in the job-row language shared by jobs and project lists. */
export function OpportunityRow({
  opportunity,
  headingLevel = 'h2',
}: {
  opportunity: OpportunityRecord;
  headingLevel?: 'h2' | 'h3';
}) {
  const budget = formatBudget(
    opportunity.budgetMin,
    opportunity.budgetMax,
    opportunity.budgetCurrency,
  );
  const deadline = formatDeadline(opportunity.deadline);
  const Heading = headingLevel;
  return (
    <article className="job-row opportunity-row">
      <div>
        <div className="job-row-topline">
          <span>{opportunityTypeLabels[opportunity.type]}</span>
          <span>
            {opportunity.poster.name}
            {opportunity.project === null ? null : <> · {opportunity.project.name}</>}
          </span>
        </div>
        <Heading>
          <Link href={`/opportunities/${opportunity.slug}`}>{opportunity.title}</Link>
        </Heading>
        <p>{opportunity.summary}</p>
        <div className="job-meta">
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
            {opportunity.proposalCount === 1
              ? '1 proposal'
              : `${opportunity.proposalCount} proposals`}
          </span>
        </div>
        {opportunity.tags.length === 0 ? null : (
          <div className="project-tags">
            {opportunity.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
