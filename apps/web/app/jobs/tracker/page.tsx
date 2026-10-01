import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { listCandidateApplications } from '../../lib/native-applications';

export default async function ApplicationTrackerPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/jobs/tracker');
  const applications = await listCandidateApplications(actor.userId);
  return (
    <Shell>
      <section className="application-tracker">
        <p className="eyebrow">Application Radar</p>
        <h1>Your active applications</h1>
        {applications.length === 0 ? (
          <p className="muted-copy">
            No VouchNet-native applications yet. Reviewed native roles show an in-platform apply
            action.
          </p>
        ) : (
          <div>
            {applications.map((application) => (
              <article key={application.id}>
                <div>
                  <strong>{application.title}</strong>
                  <span>
                    {application.organizationName} · submitted{' '}
                    {application.createdAt.toLocaleDateString()}
                  </span>
                </div>
                <span className="application-stage">
                  {application.currentStage.replaceAll('_', ' ').toLowerCase()}
                </span>
                <Link href={`/jobs/${application.jobSlug}`}>View role</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
