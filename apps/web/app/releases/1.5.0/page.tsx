import Link from 'next/link';
import { desktopRelease } from '../../download/release';

export const metadata = {
  title: 'VouchNet 1.5.0',
  description: 'VouchNet 1.5.0 release notes and Windows desktop downloads.',
};

export default function VouchNet150ReleasePage() {
  return (
    <main className="download-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link href="/releases">All releases</Link>
      </header>
      <section className="release-list">
        <span className="release-tag">Current release</span>
        <p className="eyebrow">October 28, 2026</p>
        <h1>VouchNet 1.5.0</h1>
        <p>
          A desktop signal-desk release. VouchNet Desktop now surfaces native activity, curated jobs
          and organizations, feed discovery, keyboard navigation, and optional Windows message
          notifications while staying on the same account as vouchnet.dev.
        </p>
        <h2>Included</h2>
        <ul>
          <li>VouchNet Desktop {desktopRelease.version} for Windows x64.</li>
          <li>Native activity inbox with device-token mark-as-read.</li>
          <li>Home discovery for daily challenge, topics, and transparent roles.</li>
          <li>Jobs and Organizations workspace surfaces with curated directory cards.</li>
          <li>Conversation search, Discover navigation, and letter-key workspace shortcuts.</li>
        </ul>
        <h2>Downloads</h2>
        <div className="download-choices">
          <a className="primary" download href={desktopRelease.nsis.href}>
            {desktopRelease.nsis.fileName}
          </a>
          <a className="secondary" download href={desktopRelease.msi.href}>
            {desktopRelease.msi.fileName}
          </a>
        </div>
        <p className="download-integrity">
          The Windows installers are unsigned. Verify the published{' '}
          <a href={desktopRelease.checksumsHref}>SHA-256 checksums</a> before installing. Code
          signing and automatic updates remain future release work.
        </p>
      </section>
    </main>
  );
}
