import Link from 'next/link';
import { desktopRelease } from './release';

export const metadata = {
  title: 'Download VouchNet Desktop',
  description: 'Install the first-class Windows client for the same VouchNet network.',
};

export default function DownloadPage() {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VouchNet Desktop',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows 10 or later',
    softwareVersion: desktopRelease.version,
    downloadUrl: `https://vouchnet.dev${desktopRelease.nsis.href}`,
    url: 'https://vouchnet.dev/download',
  }).replaceAll('<', '\\u003c');
  return (
    <main className="download-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <nav>
          <Link href="/releases">Release notes</Link>
          <Link href="/login">Sign in</Link>
        </nav>
      </header>
      <section className="download-hero">
        <span aria-hidden="true" className="download-mark" />
        <p className="eyebrow">VouchNet for Desktop</p>
        <h1>Your professional network, closer.</h1>
        <p>
          Connect, message, collaborate, and keep up with your VouchNet network without keeping a
          browser open.
        </p>
        <a className="primary" download href={desktopRelease.nsis.href}>
          Download for Windows
        </a>
        <small>
          Desktop {desktopRelease.version} · {desktopRelease.platform}
        </small>
        <p className="download-integrity">
          Installer and MSI are published with SHA-256 checksums. The installer is not code-signed
          yet, so Windows may show a publisher warning; verify the checksum before installing.
        </p>
      </section>
      <section className="download-capabilities">
        <h2>Everything you use on VouchNet.</h2>
        <ul>
          <li>Network and profiles</li>
          <li>Feed and Interactive Experiences</li>
          <li>Organizations and jobs</li>
          <li>Notifications and secure desktop sign-in</li>
        </ul>
      </section>
      <section className="download-platforms">
        <div>
          <strong>Windows</strong>
          <span>Available now · NSIS setup and MSI</span>
        </div>
        <div>
          <strong>macOS</strong>
          <span>Coming later</span>
        </div>
        <div>
          <strong>Linux</strong>
          <span>Planned</span>
        </div>
      </section>
    </main>
  );
}
