import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { listStudioRequestsForOwner } from '../../lib/studio';
export const metadata = { title: 'Studio projects | VouchNet', robots: { index: false } };
export default async function StudioProjectsPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/studio/projects');
  const projects = await listStudioRequestsForOwner(actor.userId);
  return (
    <Shell>
      <section className="studio-dashboard">
        <p className="eyebrow">VouchNet Studio</p>
        <h1>Your project dashboard</h1>
        <p>Track your submitted brief, deposit, and delivery status in one private place.</p>
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No Studio projects yet.</p>
            <Link className="primary-button" href="/studio/request">
              Start a technical brief
            </Link>
          </div>
        ) : (
          <div className="studio-project-list">
            {projects.map((project) => (
              <article key={project.id}>
                <div>
                  <Link href={`/studio/projects/${project.id}`}>
                    <strong>{project.orderNumber}</strong>
                  </Link>
                  <span>{project.serviceType}</span>
                </div>
                <b>{project.status.replaceAll('_', ' ')}</b>
                <p>
                  {project.depositCents === null
                    ? 'Written quote pending'
                    : `$${(project.depositCents / 100).toFixed(2)} deposit`}
                </p>
                <time dateTime={project.createdAt.toISOString()}>
                  {project.createdAt.toLocaleDateString()}
                </time>
              </article>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
