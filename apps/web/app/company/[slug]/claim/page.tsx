import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ClaimOrganizationForm } from './claim-organization-form';
import { getOrganization } from '../../../lib/directory';
import { getCurrentActor } from '../../../lib/identity';

export const metadata = {
  title: 'Claim an organization | VouchNet',
  robots: { index: false, follow: false },
};

export default async function OrganizationClaimRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const [organization, actor] = await Promise.all([getOrganization(slug), getCurrentActor()]);
  if (organization === null) notFound();
  if (actor === null) redirect(`/login?next=${encodeURIComponent(`/company/${slug}/claim`)}`);
  if (organization.verificationStatus === 'DOMAIN_VERIFIED')
    return (
      <main className="public-profile">
        <header className="public-nav">
          <Link className="brand" href="/">
            VouchNet
          </Link>
        </header>
        <section className="claim-card">
          <p className="eyebrow">Verified organization</p>
          <h1>{organization.name} is already claimed</h1>
          <p>
            This profile has a verified organization owner. Ownership is never transferred through a
            public claim form.
          </p>
          <Link className="secondary" href={`/company/${slug}`}>
            View organization
          </Link>
        </section>
      </main>
    );
  return (
    <main className="public-profile">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link className="quiet-link" href={`/company/${slug}`}>
          Back to {organization.name}
        </Link>
      </header>
      <ClaimOrganizationForm slug={slug} />
    </main>
  );
}
