import { notFound, redirect } from 'next/navigation';
import { ModerationQueue } from '../../components/moderation-queue';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import {
  activeModeratorRoles,
  canReviewModeration,
  listModerationReports,
  type ReportStatus,
} from '../../lib/moderation';
import { isAdministrator } from '../../lib/telemetry-server';

export const metadata = { title: 'Moderation queue | VouchNet', robots: { index: false } };

export default async function ModerationQueuePage() {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/moderation/queue');
  if (!(await canReviewModeration(actor.userId))) notFound();
  const [reports, administrator, roles] = await Promise.all([
    listModerationReports(),
    isAdministrator(actor.userId),
    activeModeratorRoles(actor.userId),
  ]);
  const canRecordOutcome =
    administrator || roles.includes('CONTENT_REVIEWER') || roles.includes('COMMUNITY_STEWARD');
  const allowedStatuses: ReportStatus[] = canRecordOutcome
    ? ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']
    : ['UNDER_REVIEW'];
  return (
    <Shell>
      <main className="moderation-page moderation-queue-page">
        <p className="eyebrow">Human review queue</p>
        <h1>Member reports</h1>
        <p className="moderation-intro">
          Record a thoughtful outcome. Triage volunteers can mark a report under review; other
          reviewer roles and administrators can resolve or dismiss it. This queue does not expose
          private messages or credentials.
        </p>
        <ModerationQueue initialReports={reports} allowedStatuses={allowedStatuses} />
      </main>
    </Shell>
  );
}
