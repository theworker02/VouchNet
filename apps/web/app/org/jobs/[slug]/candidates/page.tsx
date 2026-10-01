import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../../../components/shell';
import { getCurrentActor } from '../../../../lib/identity';
import {
  getEmployerApplicationJob,
  listEmployerApplications,
} from '../../../../lib/native-applications';
import { EmployerCandidatesClient } from './employer-candidates-client';

export const metadata = {
  title: 'Candidate pipeline | VouchNet',
  robots: { index: false, follow: false },
};

export default async function EmployerCandidatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const actor = await getCurrentActor();
  const { slug } = await params;
  if (actor === null) redirect(`/login?next=/org/jobs/${slug}/candidates`);
  const job = await getEmployerApplicationJob(actor.userId, slug);
  if (job === null) notFound();
  const applications = await listEmployerApplications(actor.userId, slug);
  return (
    <Shell>
      <EmployerCandidatesClient
        applications={applications.map((application) => ({
          ...application,
          createdAt: application.createdAt.toISOString(),
        }))}
        job={job}
      />
    </Shell>
  );
}
