import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../../components/shell';
import { getCurrentActor } from '../../../lib/identity';
import { getOpportunityDetail } from '../../../lib/opportunities';
import { OpportunityForm } from '../../opportunity-form';
import { linkableProjects } from '../../project-options';

export const metadata: Metadata = { title: 'Edit opportunity · VouchNet' };

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const actor = await getCurrentActor();
  if (actor === null) redirect(`/login?next=/opportunities/${slug}/edit`);
  const opportunity = await getOpportunityDetail(slug, actor.userId);
  if (opportunity === null || opportunity.viewer.role !== 'POSTER') notFound();
  const projects = await linkableProjects(actor.userId);
  return (
    <Shell>
      <section className="employer-workspace opportunity-editor">
        <header className="page-heading">
          <p className="eyebrow">Edit opportunity</p>
          <h1>{opportunity.title}</h1>
        </header>
        <OpportunityForm
          projects={projects}
          opportunityId={opportunity.id}
          cancelHref={`/opportunities/${opportunity.slug}`}
          initial={{
            type: opportunity.type,
            title: opportunity.title,
            summary: opportunity.summary,
            description: opportunity.description,
            lookingFor: opportunity.lookingFor,
            budgetMin: opportunity.budgetMin,
            budgetMax: opportunity.budgetMax,
            budgetCurrency: opportunity.budgetCurrency,
            deadline: opportunity.deadline,
            location: opportunity.location,
            remote: opportunity.remote,
            proposalsOpen: opportunity.proposalsOpen,
            projectId: opportunity.project?.id ?? null,
            tags: opportunity.tags,
          }}
        />
      </section>
    </Shell>
  );
}
