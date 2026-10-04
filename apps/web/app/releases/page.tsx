import Link from 'next/link';
export const metadata = { title: 'VouchNet releases' };
export default function ReleasesPage() {
  return (
    <main className="download-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link href="/download">Download</Link>
      </header>
      <section className="release-list">
        <p className="eyebrow">Release history</p>
        <h1>VouchNet releases</h1>
        <article>
          <span className="release-tag">Current</span>
          <h2>Version 1.3.0</h2>
          <p>
            A responsive public-surface release: complete compact navigation, updated product
            previews, and source release notes that clearly distinguish web updates from pending
            signed Desktop installers.
          </p>
          <Link href="/releases/1.3.0">Read version 1.3.0 notes →</Link>
        </article>
        <article>
          <span className="release-tag">Desktop foundation</span>
          <h2>Desktop 1.0.0</h2>
          <p>
            The first installed VouchNet client: shared account and service, native shell, PKCE
            browser sign-in, deep links, and a desktop-focused feed.
          </p>
          <Link href="/releases/1.0.0">View release notes →</Link>
        </article>
      </section>
    </main>
  );
}
