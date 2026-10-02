import { redirect } from 'next/navigation';
import { ModerationApplicationForm } from '../../components/moderation-application-form';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';

export const metadata = { title: 'Volunteer moderator application | VouchNet', robots: { index: false } };

export default async function ModeratorApplicationPage() {
  if ((await getCurrentActor()) === null) redirect('/login?next=/moderation/apply');
  return (
    <Shell>
      <main className="moderation-page moderation-narrow">
        <p className="eyebrow">Volunteer trailblazer</p>
        <h1>Apply to help moderate VouchNet.</h1>
        <p className="moderation-intro">
          Volunteer reviewers are assigned only after a human administrator approves the application.
          The first role provides limited, auditable review access—not unilateral account enforcement.
        </p>
        <ModerationApplicationForm />
      </main>
    </Shell>
  );
}
