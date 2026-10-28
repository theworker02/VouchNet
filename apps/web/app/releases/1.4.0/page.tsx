import Link from 'next/link';

const release = {
  version: '1.4.0',
  nsis: {
    fileName: 'VouchNetSetup-1.4.0-x64.exe',
    href: '/downloads/VouchNetSetup-1.4.0-x64.exe',
  },
  msi: {
    fileName: 'VouchNet-1.4.0-x64.msi',
    href: '/downloads/VouchNet-1.4.0-x64.msi',
  },
  checksumsHref: '/downloads/VouchNet-1.4.0-x64.sha256',
} as const;

export const metadata = {
  title: 'VouchNet 1.4.0',
  description: 'VouchNet 1.4.0 release notes and Windows desktop downloads.',
};

export default function VouchNet140ReleasePage() {
  return (
    <main className="download-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link href="/releases">All releases</Link>
      </header>
      <section className="release-list">
        <span className="release-tag">Previous release</span>
        <p className="eyebrow">October 13, 2026</p>
        <h1>VouchNet 1.4.0</h1>
        <p>
          A distribution and discovery release. VouchNet Desktop is available as a Windows setup
          executable and MSI, while public discovery pages now have richer structured data and the
          landing page can surface existing reviewed work.
        </p>
        <h2>Included</h2>
        <ul>
          <li>VouchNet Desktop {release.version} for Windows x64.</li>
          <li>NSIS setup, MSI, and SHA-256 checksum downloads served from VouchNet.</li>
          <li>Canonical VouchNet icon assets for the app, installer, and Windows shell.</li>
          <li>Public organization and compensation-forward job discovery on the landing page.</li>
          <li>JobPosting and ItemList structured data for the public roles directory.</li>
        </ul>
        <h2>Downloads</h2>
        <div className="download-choices">
          <a className="primary" download href={release.nsis.href}>
            {release.nsis.fileName}
          </a>
          <a className="secondary" download href={release.msi.href}>
            {release.msi.fileName}
          </a>
        </div>
        <p className="download-integrity">
          The Windows installers are unsigned. Verify the published{' '}
          <a href={release.checksumsHref}>SHA-256 checksums</a> before installing. Code signing and
          automatic updates remain future release work.
        </p>
      </section>
    </main>
  );
}
