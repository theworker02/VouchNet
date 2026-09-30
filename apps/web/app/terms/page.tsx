import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | VouchNet',
  description: 'Terms governing use of the VouchNet professional network.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <main className="policy-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <div>
          <Link className="quiet-link" href="/privacy">
            Privacy
          </Link>
          <Link className="primary" href="/signup">
            Create account
          </Link>
        </div>
      </header>
      <article className="policy-content">
        <p className="eyebrow">VouchNet legal</p>
        <h1>Terms of Service</h1>
        <p className="policy-updated">Effective and last updated: September 30, 2026</p>
        <p className="policy-lead">
          These terms govern your use of VouchNet. By creating an account or using the service, you
          agree to them and to the <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <section>
          <h2>Using VouchNet</h2>
          <p>
            You must provide accurate account information, keep your credentials secure, and use the
            service lawfully. A member account represents a real human participant. Do not create
            accounts for bots, impersonate another person, or misrepresent professional identity,
            affiliation, skills, work, or opportunities.
          </p>
        </section>

        <section>
          <h2>Human participation and automation</h2>
          <p>
            AI and integrations may be available through explicitly authorized interfaces, but they
            may not masquerade as a person or independently perform protected social actions. Do not
            use automation to register accounts, send connection requests, publish content, message
            people, react, manipulate engagement, scrape the consumer service, or evade limits.
          </p>
        </section>

        <section>
          <h2>Your content</h2>
          <p>
            You retain ownership of content you submit. You grant VouchNet the limited right to host,
            reproduce, display, and distribute it only as necessary to operate the service according
            to its visibility settings. You are responsible for having the rights to the content,
            links, and files you share.
          </p>
        </section>

        <section>
          <h2>Acceptable use</h2>
          <p>
            Do not post unlawful, fraudulent, infringing, abusive, deceptive, or malicious content;
            distribute malware or phishing links; send spam; interfere with the service; attempt
            unauthorized access; or use VouchNet to operate engagement rings, job scams, or account
            farms. We may investigate and restrict activity that threatens members or the platform.
          </p>
        </section>

        <section>
          <h2>Jobs, organizations, and third-party links</h2>
          <p>
            Source-reviewed organization and job records are informational unless VouchNet clearly
            states that ownership has been verified. Job availability, employer decisions, and
            external sites are controlled by their respective organizations. VouchNet does not
            guarantee employment outcomes or endorse every linked third party.
          </p>
        </section>

        <section>
          <h2>Suspension and termination</h2>
          <p>
            You may stop using VouchNet at any time. We may suspend or restrict access for a breach
            of these terms, safety risk, legal requirement, or security concern. High-impact actions
            should be reviewable and use explainable reason codes where practical.
          </p>
        </section>

        <section>
          <h2>Disclaimers and changes</h2>
          <p>
            VouchNet is provided on an as-available basis to the extent permitted by law. We may
            update the service or these terms; material changes will be posted here with an updated
            effective date. Contact <a href="mailto:legal@vouchnet.dev">legal@vouchnet.dev</a> with
            questions about these terms.
          </p>
        </section>
      </article>
    </main>
  );
}
