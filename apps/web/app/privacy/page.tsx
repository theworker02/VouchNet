import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | VouchNet',
  description: 'How VouchNet collects, uses, protects, and shares personal information.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main className="policy-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/terms">
            Terms
          </Link>
          <Link className="primary" href="/signup">
            Create account
          </Link>
        </div>
      </header>
      <article className="policy-content">
        <p className="eyebrow">VouchNet legal</p>
        <h1>Privacy Policy</h1>
        <p className="policy-updated">Effective and last updated: September 30, 2026</p>
        <p className="policy-lead">
          VouchNet is built for professional context, not hidden surveillance. This policy explains
          the information we collect, why we use it, and the choices you have.
        </p>

        <section>
          <h2>Information we collect</h2>
          <p>
            We collect information you provide when you create or use an account, including your
            name, email address, password hash, profile details, professional links, projects, and
            content you choose to publish. We also collect information needed to operate and secure
            the service, such as session data, limited device or browser metadata, request IDs, and
            security events.
          </p>
          <p>
            We do not store your password in readable form. We do not intentionally place passwords,
            authentication tokens, or private-message bodies in audit logs.
          </p>
        </section>

        <section>
          <h2>How we use information</h2>
          <p>
            We use information to provide profiles, projects, relationships, account access,
            security, support, and features you request. We may use limited technical and security
            information to prevent fraud, spam, account abuse, and unauthorized automation.
          </p>
          <p>
            VouchNet does not use your profile or posts to train public AI models without a future,
            explicit product control and clear notice. AI integrations, when available, are separate
            attributable principals and do not become human participants.
          </p>
        </section>

        <section>
          <h2>Public information and your choices</h2>
          <p>
            Information marked public—such as a public profile, project, organization directory
            record, or public post—may be visible to visitors and search engines. Private or
            restricted content should not be made public through alternate VouchNet APIs.
          </p>
          <p>
            Current account settings let members control selected profile information and active
            sessions. Additional visibility, discovery, indexing, and data-export controls will be
            introduced as they become functional; VouchNet will not claim controls it has not yet
            implemented.
          </p>
        </section>

        <section>
          <h2>Service providers and disclosures</h2>
          <p>
            We use service providers to host the application, database, email delivery, and
            infrastructure. Cloudflare Web Analytics may collect privacy-oriented traffic and
            performance measurements without cookies, fingerprinting, or user-level profiles. These
            providers may process information only as needed to provide their services. We may
            disclose information when required by law, to protect people or the service, or as part
            of a lawful business transfer.
          </p>
        </section>

        <section>
          <h2>Retention and security</h2>
          <p>
            We retain account and product information for as long as needed to operate the service,
            meet legal obligations, resolve disputes, and defend against abuse. Reported content and
            security records may be retained longer when necessary for review and safety.
          </p>
          <p>
            We use reasonable administrative, technical, and organizational safeguards. No online
            service can guarantee absolute security; protect your account with a unique password and
            keep your devices secure.
          </p>
        </section>

        <section>
          <h2>Your requests</h2>
          <p>
            You may request access, correction, deletion, or information about your account where
            applicable law provides those rights. Contact{' '}
            <a href="mailto:privacy@vouchnet.dev">privacy@vouchnet.dev</a>. We may need to verify
            your identity before acting on a request.
          </p>
        </section>

        <section>
          <h2>Changes to this policy</h2>
          <p>
            We may update this policy as VouchNet evolves. Material changes will be posted here with
            a new effective date. Continued use after an update is subject to the updated policy
            where permitted by law.
          </p>
        </section>
      </article>
    </main>
  );
}
