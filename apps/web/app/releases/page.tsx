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
          <h2>Version 1.4.0</h2>
          <p>
            The first downloadable Windows release: a real NSIS setup and MSI, canonical VouchNet
            branding, public SHA-256 verification, richer public discovery, and structured SEO for
            transparent jobs.
          </p>
          <Link href="/releases/1.4.0">Read version 1.4.0 notes →</Link>
        </article>
        <article>
          <span className="release-tag">Previous platform release</span>
          <h2>Version 1.3.0</h2>
          <p>
            Responsive public navigation, current product previews, and truthful source-release
            availability before the Windows installer became downloadable.
          </p>
          <Link href="/releases/1.3.0">View release notes →</Link>
        </article>
      </section>
    </main>
  );
}
