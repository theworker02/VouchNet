import Link from 'next/link';

export const metadata = {
  title: 'Download VouchNet Desktop',
  description: 'Install the first-class Windows client for the same VouchNet network.',
};

export default function DownloadPage() {
  return (
    <main className="download-page">
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
        <span className="download-mark">V</span>
        <p className="eyebrow">VouchNet for Desktop</p>
        <h1>Your professional network, closer.</h1>
        <p>
          Connect, message, collaborate, and keep up with your VouchNet network without keeping a
          browser open.
        </p>
        <Link className="primary" href="/download/windows">
          Download for Windows
        </Link>
        <small>Desktop 1.0.0 · Windows x64</small>
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
          <span>Available for the 1.0 release</span>
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
