import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentActor } from '../../lib/identity';
import { getClaimInvite } from '../../lib/organization-claims';
import { getOrganization } from '../../lib/directory';
import { ClaimButton } from './claim-button';

export const metadata: Metadata = {
  title: 'Claim an organization profile | VouchNet',
  robots: { index: false, follow: false },
};

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token;
  const [actor, organization, invite] = await Promise.all([
    getCurrentActor(),
    getOrganization(token),
    getClaimInvite(token),
  ]);
  if (organization !== null) {
    const next = `/claim/${organization.slug}`;
    return (
      <main className="public-profile">
        <header className="public-nav">
          <Link className="brand" href="/">
            VouchNet
          </Link>
          <Link className="quiet-link" href={`/company/${organization.slug}`}>
            View profile
          </Link>
        </header>
        <section className="claim-card">
          <p className="eyebrow">Unclaimed organization profile</p>
          <h1>Claim {organization.name} on VouchNet</h1>
          <p>
            Already listed on VouchNet? Claim your profile to manage information, publish updates,
            connect with others, and represent your organization.
          </p>
          <p className="directory-disclaimer">
            Sign in first. A verified company-domain email is the automated proof method. DNS,
            website, and manual evidence are reviewed by VouchNet; editing access is never granted
            before ownership verification succeeds.
          </p>
          {actor === null ? (
            <div className="claim-card-actions">
              <Link className="primary" href={`/signup?next=${encodeURIComponent(next)}`}>
                Create an account
              </Link>
              <Link className="secondary" href={`/login?next=${encodeURIComponent(next)}`}>
                Sign in
              </Link>
            </div>
          ) : (
            <Link className="primary" href={`/company/${organization.slug}/claim`}>
              Verify ownership
            </Link>
          )}
        </section>
      </main>
    );
  }
  return (
    <main className="public-profile">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          {actor === null ? (
            <Link
              className="quiet-link"
              href={`/login?next=${encodeURIComponent(`/claim/${token}`)}`}
            >
              Sign in
            </Link>
          ) : null}
        </div>
      </header>
      <section className="claim-card">
        <p className="eyebrow">Organization profile claim</p>
        {invite === null ? (
          <>
            <h1>This claim link is no longer valid</h1>
            <p>
              The invite may have expired, been replaced by a newer one, or already been used.
              Contact the person who invited you for a fresh link.
            </p>
          </>
        ) : (
          <>
            <h1>Claim {invite.organizationName}</h1>
            <p>
              This invite was sent to <strong>{invite.email}</strong>. Claiming makes your VouchNet
              account the owner of the {invite.organizationName} profile so the organization can
              manage its official page.
            </p>
            {actor === null ? (
              <Link
                className="primary"
                href={`/login?next=${encodeURIComponent(`/claim/${token}`)}`}
              >
                Sign in to claim
              </Link>
            ) : (
              <ClaimButton token={token} />
            )}
          </>
        )}
      </section>
    </main>
  );
}
