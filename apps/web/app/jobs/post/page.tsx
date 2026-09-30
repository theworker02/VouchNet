import { redirect } from 'next/navigation';
import { JobPostingClient } from './posting-client';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { getEmployerLaunchDashboard } from '../../lib/jobs';

export const metadata = {
  title: 'Post a transparent job | VouchNet',
  description: 'Submit an employer role or public ATS source for VouchNet review.',
};

export default async function JobPostingPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/jobs/post');
  const dashboard = await getEmployerLaunchDashboard(actor.userId);
  return (
    <Shell>
      <JobPostingClient
        initialDashboard={{
          sources: dashboard.sources.map((source) => ({
            ...source,
            createdAt: source.createdAt.toISOString(),
            lastSyncedAt: source.lastSyncedAt?.toISOString() ?? null,
          })),
          submissions: dashboard.submissions.map((submission) => ({
            ...submission,
            createdAt: submission.createdAt.toISOString(),
            freeUntil: submission.freeUntil?.toISOString() ?? null,
          })),
          trialEndsAt: dashboard.trialEndsAt?.toISOString() ?? null,
        }}
      />
    </Shell>
  );
}
