import Link from 'next/link';
import { Shell } from '../components/shell';

export const metadata = {
  title: 'Volunteer moderation | VouchNet',
  description: 'How VouchNet’s volunteer human moderation program works.',
};

const roles = [
  ['Triage volunteer', 'Acknowledges reports, adds context, and routes urgent concerns for review.'],
  ['Content reviewer', 'Reviews reports and records non-automated moderation outcomes.'],
  ['Appeals reviewer', 'Reviews documented decisions independently when an appeals workflow is introduced.'],
  ['Community steward', 'Helps uphold clear participation norms and escalates safety concerns.'],
] as const;

export default function ModerationPage() {
  return (
    <Shell>
      <main className="moderation-page">
        <p className="eyebrow">Human moderation</p>
        <h1>Build the first safety layer with us.</h1>
        <p className="moderation-intro">
          VouchNet is starting with accountable volunteer reviewers—not invisible automation and not
          paid moderation claims we cannot yet make. Trailblazers help establish the standards that
          protect the first real members and their work.
        </p>
        <div className="moderation-actions">
          <Link className="primary-button" href="/moderation/apply">
            Apply to volunteer
          </Link>
          <Link className="secondary-button" href="/moderation/report">
            Submit a report
          </Link>
        </div>
        <section className="moderation-principles">
          <article>
            <strong>People decide</strong>
            <span>Reports enter a human queue; automated signals may prioritize, never quietly punish.</span>
          </article>
          <article>
            <strong>Least authority</strong>
            <span>Roles are assigned by an administrator and can be revoked. Access is auditable.</span>
          </article>
          <article>
            <strong>Evidence, not popularity</strong>
            <span>Reviewer decisions should record policy context, not reward engagement or status.</span>
          </article>
        </section>
        <section className="moderation-role-grid">
          <h2>Volunteer roles</h2>
          {roles.map(([title, description]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </section>
        <section className="moderation-limitations">
          <h2>Current boundaries</h2>
          <p>
            The first release provides applications, role assignments, confidential report intake,
            and an authenticated human review queue. Content removal, member restrictions, and
            appeals must be added as separately authorized, auditable workflows before they are
            represented as available.
          </p>
          <Link href="/developers/moderation">Read the moderation operating guide</Link>
        </section>
      </main>
    </Shell>
  );
}
