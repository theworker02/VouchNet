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
        <h1>VouchNet Desktop</h1>
        <article>
          <span className="release-tag">Latest</span>
          <h2>Version 1.0.0</h2>
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
