import Link from 'next/link';
export const metadata = { title: 'VouchNet Desktop 1.0.0' };
export default function DesktopReleasePage() {
  return (
    <main className="download-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link href="/releases">All releases</Link>
      </header>
      <section className="release-list">
        <span className="release-tag">Latest</span>
        <p className="eyebrow">October 2026</p>
        <h1>VouchNet Desktop 1.0.0</h1>
        <p>
          The first VouchNet Desktop release is a purpose-built installed client for the existing
          VouchNet service—not a browser shortcut.
        </p>
        <h2>Included</h2>
        <ul>
          <li>Shared VouchNet account and profile</li>
          <li>PKCE browser sign-in and device refresh-token rotation</li>
          <li>
            Windows protocol deep link: <code>vouchnet://</code>
          </li>
          <li>Native rail, command palette, and feed surface</li>
          <li>Strictly isolated Interactive Experiences on the shared service</li>
        </ul>
        <h2>Downloads</h2>
        <p>
          Windows installers and their SHA-256 checksums are enabled once the release build has
          completed and been signed. No unsigned binary is presented as a production download.
        </p>
        <Link className="secondary" href="/download/windows">
          Windows download status
        </Link>
      </section>
    </main>
  );
}
