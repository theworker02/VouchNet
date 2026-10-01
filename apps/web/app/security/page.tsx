import Link from 'next/link';

export const metadata = {
  title: 'Security policy | VouchNet',
  description: 'How to responsibly report a VouchNet security vulnerability.',
};

export default function SecurityPolicyPage() {
  return (
    <main className="legal-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link className="secondary" href="/privacy">
          Privacy
        </Link>
      </header>
      <article>
        <p className="eyebrow">Responsible disclosure</p>
        <h1>Security policy</h1>
        <p>
          We welcome good-faith reports that help protect VouchNet members, organizations, and their
          professional information.
        </p>
        <h2>Report privately</h2>
        <p>
          Use GitHub’s private vulnerability-reporting flow for VouchNet. Include a clear
          description, affected URL or component, reproducible steps, and the impact you observed.
          Do not include credentials, access tokens, private messages, or other people’s data.
        </p>
        <p>
          <a
            className="primary"
            href="https://github.com/theworker02/VouchNet/security/advisories/new"
            rel="noreferrer"
            target="_blank"
          >
            Report a vulnerability privately
          </a>
        </p>
        <h2>Safe-harbor expectations</h2>
        <p>
          Test only accounts and data you control. Do not disrupt availability, use social
          engineering, automate high-volume requests, or retain information beyond what is needed to
          demonstrate the issue. Give us reasonable time to investigate before public disclosure.
        </p>
        <h2>Out of scope</h2>
        <p>
          Reports that rely solely on missing best-practice headers without demonstrated impact,
          third-party service issues outside VouchNet’s control, and spam or social-engineering
          claims are generally out of scope.
        </p>
      </article>
    </main>
  );
}
