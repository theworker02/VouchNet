import { notFound, redirect } from 'next/navigation';
import { Shell } from '../../components/shell';
import { getCurrentActor } from '../../lib/identity';
import {
  listOrganizationClaimRequests,
  listOrganizationOutreachCandidates,
} from '../../lib/organization-governance';
import { isAdministrator } from '../../lib/telemetry-server';

export const metadata = {
  title: 'Organization control reviews | VouchNet',
  robots: { index: false },
};

export default async function OrganizationClaimsAdministrationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; outreach?: string; updated?: string }>;
}) {
  const actor = await getCurrentActor();
  if (actor === null) redirect('/login?next=/admin/organization-claims');
  if (!(await isAdministrator(actor.userId))) notFound();
  const [claims, outreach, state] = await Promise.all([
    listOrganizationClaimRequests(),
    listOrganizationOutreachCandidates(),
    searchParams,
  ]);
  return (
    <Shell>
      <main className="moderation-page moderation-admin-page">
        <p className="eyebrow">Administrator-only</p>
        <h1>Organization control reviews</h1>
        <p className="moderation-intro">
          Approving a request assigns an Owner only after a verified company-domain email and human
          review. It marks the profile as a Verified Organization, not an endorsement. Every
          decision is recorded in the immutable organization governance ledger.
        </p>
        {state.updated === 'true' ? (
          <p className="moderation-success">Claim decision saved.</p>
        ) : null}
        {state.outreach === 'true' ? (
          <p className="moderation-success">Recipient staged for review. No email was sent.</p>
        ) : null}
        {state.error === undefined ? null : (
          <p className="form-error">Review failed: {state.error}.</p>
        )}
        <div className="moderation-admin-list">
          {claims.length === 0 ? <p>No organization claim requests yet.</p> : null}
          {claims.map((claim) => (
            <article key={claim.id}>
              <header>
                <div>
                  <strong>{claim.organizationName}</strong>
                  <span>{claim.status}</span>
                </div>
                <time dateTime={claim.createdAt.toISOString()}>
                  {claim.createdAt.toLocaleDateString()}
                </time>
              </header>
              <p>
                <strong>{claim.claimantName}</strong> · {claim.relationship.replaceAll('_', ' ')} ·{' '}
                {claim.verifiedEmail}
              </p>
              <p>{claim.statement}</p>
              {claim.status === 'PENDING' || claim.status === 'UNDER_REVIEW' ? (
                <form action={`/api/admin/organization-claims/${claim.id}`} method="post">
                  <input
                    maxLength={1_200}
                    name="reviewNote"
                    placeholder="Internal decision note (optional)"
                  />
                  <button className="primary-button" name="decision" value="APPROVE" type="submit">
                    Verify control and assign Owner
                  </button>
                  <button className="secondary-button" name="decision" value="REJECT" type="submit">
                    Reject claim
                  </button>
                </form>
              ) : (
                <small>{claim.reviewNote ?? 'No review note recorded.'}</small>
              )}
            </article>
          ))}
        </div>
        <section className="moderation-admin-list" aria-labelledby="outreach-queue-heading">
          <p className="eyebrow">Review only</p>
          <h2 id="outreach-queue-heading">Potential outreach queue</h2>
          <p className="moderation-intro">
            These are proposed recipients only. This screen cannot send mail, create invites, or
            contact an organization. An explicit recipient approval is required in a separate future
            outreach action.
          </p>
          <form action="/api/admin/organization-outreach" method="post">
            <input name="organizationSlug" placeholder="Organization slug" required />
            <input name="proposedEmail" type="email" placeholder="Company-domain email" required />
            <input name="sourceUrl" type="url" placeholder="Public source URL" required />
            <button className="secondary-button" type="submit">
              Stage for review only
            </button>
          </form>
          {outreach.length === 0 ? <p>No proposed organization recipients are queued.</p> : null}
          {outreach.map((candidate) => (
            <article key={candidate.id}>
              <strong>{candidate.organizationName}</strong>
              <p>
                {candidate.proposedEmail} · {candidate.status}
              </p>
              <a href={candidate.sourceUrl} rel="noreferrer" target="_blank">
                Public source ↗
              </a>
            </article>
          ))}
        </section>
      </main>
    </Shell>
  );
}
