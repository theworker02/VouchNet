import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { OpportunityForm } from '../opportunity-form';
import { linkableProjects } from '../project-options';

export const metadata: Metadata = { title: 'Post an opportunity · VouchNet' };

export default async function NewOpportunityPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/opportunities/new');
  const projects = await linkableProjects(actor.userId);
  return (
    <Shell>
      <section className="employer-workspace opportunity-editor">
        <header className="page-heading">
          <p className="eyebrow">Post an opportunity</p>
          <h1>Describe the work and who fits.</h1>
          <p>
            Be specific about scope, constraints, and budget. Clear posts get thoughtful proposals.
          </p>
        </header>
        <OpportunityForm projects={projects} cancelHref="/opportunities" />
      </section>
    </Shell>
  );
}
