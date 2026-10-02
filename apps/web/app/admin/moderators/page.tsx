import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import { listModeratorApplications, moderatorRoles } from '../../lib/moderation';
import { isAdministrator } from '../../lib/telemetry-server';

export const metadata = { title: 'Volunteer moderation administration | VouchNet', robots: { index: false } };

export default async function ModeratorAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/admin/moderators');
  if (!(await isAdministrator(actor.userId))) notFound();
  const applications = await listModeratorApplications();
  const { error, updated } = await searchParams;
  return (
    <Shell>
      <main className="moderation-page moderation-admin-page">
        <p className="eyebrow">Administrator-only</p>
        <h1>Volunteer moderator applications</h1>
        <p className="moderation-intro">
          Assign the narrowest appropriate role after reviewing an applicant. Approval grants a
          `MODERATOR` account role and one active moderation assignment; revocation removes that
          assignment and is recorded in the audit ledger.
        </p>
        {updated === 'true' ? <p className="moderation-success">Role decision saved.</p> : null}
        {error !== undefined ? <p className="form-error">The role decision was not applied: {error}.</p> : null}
        <div className="moderation-admin-list">
          {applications.length === 0 ? <p>No volunteer applications yet.</p> : null}
          {applications.map((application) => (
            <article key={application.id}>
              <header>
                <div>
                  <strong>{application.memberName}</strong>
                  <span>{application.status}</span>
                </div>
                <time dateTime={application.createdAt.toISOString()}>
                  {application.createdAt.toLocaleDateString()}
                </time>
              </header>
              <p>{application.motivation}</p>
              {application.relevantExperience !== null ? <p>{application.relevantExperience}</p> : null}
              <small>Availability: {application.weeklyAvailability}</small>
              {application.status === 'PENDING' ? (
                <form action={`/api/admin/moderation/applications/${application.id}`} method="post">
                  <select defaultValue="TRIAGE" name="role">
                    {moderatorRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <input maxLength={1_200} name="reviewNote" placeholder="Optional decision note" />
                  <button className="primary-button" name="decision" value="APPROVE" type="submit">
                    Approve and assign
                  </button>
                  <button className="secondary-button" name="decision" value="DECLINE" type="submit">
                    Decline
                  </button>
                </form>
              ) : null}
              {application.status === 'APPROVED' ? (
                <form action={`/api/admin/moderation/applications/${application.id}`} method="post">
                  <input maxLength={1_200} name="reviewNote" placeholder="Reason for revocation" />
                  <button className="secondary-button" name="decision" value="REVOKE" type="submit">
                    Revoke {application.assignedRole?.replace('_', ' ') ?? 'role'}
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </main>
    </Shell>
  );
}
