import { redirect } from 'next/navigation';
import { ModerationReportForm } from '../../components/moderation-report-form';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';

export const metadata = { title: 'Submit a report | VouchNet', robots: { index: false } };

export default async function ModerationReportPage() {
  if ((await getCurrentActor()) === null) redirect('/login?next=/moderation/report');
  return (
    <Shell>
      <main className="moderation-page moderation-narrow">
        <p className="eyebrow">Report a concern</p>
        <h1>Ask a human reviewer to take a look.</h1>
        <p className="moderation-intro">
          Give the VouchNet path and enough factual context for a reviewer. Do not include passwords,
          private message bodies, or other people&apos;s sensitive information unless it is necessary to
          explain the concern.
        </p>
        <ModerationReportForm />
      </main>
    </Shell>
  );
}
