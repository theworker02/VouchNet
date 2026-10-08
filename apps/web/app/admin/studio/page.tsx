import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { isAdministrator } from '../../lib/telemetry-server';
import { listStudioRequestsForAdmin } from '../../lib/studio';
export const metadata = { title: 'Studio management | VouchNet', robots: { index: false } };
export default async function StudioAdminPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/admin/studio');
  if (!(await isAdministrator(actor.userId))) notFound();
  const requests = await listStudioRequestsForAdmin();
  return (
    <Shell>
      <section className="studio-dashboard">
        <p className="eyebrow">Administrator-only</p>
        <h1>Studio project management</h1>
        <p>Review paid briefs, approve custom quotes, and keep customer-facing statuses current.</p>
        <div className="studio-project-list">
          {requests.map((project) => (
            <article key={project.id}>
              <div>
                <strong>{project.orderNumber}</strong>
                <span>
                  {project.customerName} · {project.contactEmail}
                </span>
                <span>
                  {project.serviceType} · {project.packageId}
                </span>
              </div>
              <b>{project.status.replaceAll('_', ' ')}</b>
              {project.packageId === 'CUSTOM' && project.status === 'QUOTE_PENDING' ? (
                <form
                  action={`/api/admin/studio/requests/${project.id}`}
                  method="post"
                  className="studio-admin-form"
                >
                  <input type="hidden" name="action" value="QUOTE" />
                  <input
                    name="depositCents"
                    type="number"
                    min="5000"
                    required
                    placeholder="Deposit cents"
                  />
                  <input
                    name="quoteDescription"
                    minLength={20}
                    required
                    placeholder="What the quoted deposit covers"
                  />
                  <button className="primary-button" type="submit">
                    Approve quote
                  </button>
                </form>
              ) : (
                <form
                  action={`/api/admin/studio/requests/${project.id}`}
                  method="post"
                  className="studio-admin-form"
                >
                  <input type="hidden" name="action" value="STATUS" />
                  <select name="status" defaultValue="">
                    <option value="" disabled>
                      Update status
                    </option>
                    <option value="UNDER_REVIEW">Under review</option>
                    <option value="IN_PROGRESS">In progress</option>
                    <option value="AWAITING_FEEDBACK">Awaiting feedback</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <button className="secondary-button" type="submit">
                    Save status
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
    </Shell>
  );
}
