import Link from 'next/link';

export const metadata = {
  title: 'VouchNet 1.3.0',
  description: 'VouchNet 1.3.0 release notes and availability.',
};

export default function VouchNet130ReleasePage() {
  return (
    <main className="download-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link href="/releases">All releases</Link>
      </header>
      <section className="release-list">
        <span className="release-tag">Current web release</span>
        <p className="eyebrow">October 2026</p>
        <h1>VouchNet 1.3.0</h1>
        <p>
          A focused public-surface upgrade that makes essential routes reachable on compact screens
          and keeps the presentation layer aligned with the current product release.
        </p>
        <h2>Included</h2>
        <ul>
          <li>Responsive public navigation with a keyboard-accessible compact menu.</li>
          <li>Current desktop, mobile, and sign-in product previews in the repository README.</li>
          <li>
            Refined landing-page hierarchy, safe mobile feedback placement, and quieter local
            development UI.
          </li>
          <li>Updated source release notes and version metadata.</li>
        </ul>
        <h2>Availability</h2>
        <p>
          Version 1.3.0 is a source release. It includes no database migration, signed Desktop
          installer, updater artifact, or binary download. Desktop 1.0.0 source and its signing
          prerequisites remain documented separately.
        </p>
        <Link className="secondary" href="/download/windows">
          View Desktop availability
        </Link>
      </section>
    </main>
  );
}
