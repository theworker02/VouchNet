import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { ErrorTriageTable } from '../../components/telemetry/error-triage-table';
import { getCurrentActor } from '../../lib/identity';
import { isAdministrator, listErrorEvents } from '../../lib/telemetry-server';

export const metadata = {
  title: 'Error diagnostics | VouchNet',
  robots: { index: false, follow: false },
};

export default async function ErrorDiagnosticsPage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/admin/errors');
  if (!(await isAdministrator(actor.userId))) notFound();
  const events = await listErrorEvents();
  return (
    <Shell>
      <section className="admin-errors-page">
        <p className="eyebrow">Operator diagnostics</p>
        <h1>Internal error queue</h1>
        <p>
          Captured browser failures and submitted runtime diagnostics. Stack data is redacted before
          it leaves the browser; restrict access to approved administrators.
        </p>
        <ErrorTriageTable initialEvents={events} />
      </section>
    </Shell>
  );
}
