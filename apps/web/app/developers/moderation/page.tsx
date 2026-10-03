import Link from 'next/link';

export default function ModerationGuidePage() {
  return (
    <>
      <Link className="quiet-link" href="/developers">
        ← Documentation center
      </Link>
      <p className="eyebrow">Trust &amp; safety</p>
      <h1>Volunteer moderation operating guide</h1>
      <p className="developer-intro">
        VouchNet&apos;s first safety operation is human and accountable. Volunteer access is
        assigned by an administrator, limited by role, and recorded in the audit ledger.
      </p>
      <section className="developer-doc-section">
        <h2>Role boundaries</h2>
        <ul>
          <li>
            <strong>Triage volunteer:</strong> acknowledges and routes reports into review.
          </li>
          <li>
            <strong>Content reviewer:</strong> records a documented report outcome.
          </li>
          <li>
            <strong>Appeals reviewer:</strong> reserved for an independently reviewed appeals flow.
          </li>
          <li>
            <strong>Community steward:</strong> records safety outcomes and escalation context.
          </li>
        </ul>
      </section>
      <section className="developer-doc-section">
        <h2>Operating rules</h2>
        <ul>
          <li>Review evidence and policy context, not popularity or personal familiarity.</li>
          <li>Keep report details confidential; do not copy private material outside VouchNet.</li>
          <li>Escalate threats, privacy concerns, or conflicts of interest to an administrator.</li>
          <li>Do not claim enforcement powers that are not available in the current workflow.</li>
        </ul>
      </section>
      <section className="developer-doc-section">
        <h2>Current limits</h2>
        <p>
          The first queue supports report intake, triage, and recorded outcomes. Automated account
          penalties, content removal, and appeals require additional policy-specific implementation
          and are intentionally not implied by the reviewer interface.
        </p>
      </section>
      <p>
        <Link href="/moderation">View the volunteer program</Link> or{' '}
        <Link href="/moderation/apply">apply to help moderate</Link>.
      </p>
    </>
  );
}
