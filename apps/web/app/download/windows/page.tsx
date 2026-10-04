import Link from 'next/link';
export const metadata = { title: 'VouchNet Desktop for Windows' };
export default function WindowsDownloadPage() {
  return (
    <main className="download-page">
      <header className="public-nav">
        <Link className="brand" href="/">
          VouchNet
        </Link>
        <Link href="/download">All downloads</Link>
      </header>
      <section className="download-hero">
        <p className="eyebrow">Windows x64</p>
        <h1>VouchNet Desktop 1.0.0</h1>
        <p>
          The installer is built from the open VouchNet Desktop source, with a native shell and the
          same account and service as vouchnet.dev.
        </p>
        <div className="download-pending">
          <strong>Installer publishing is in progress.</strong>
          <span>
            We will enable the signed NSIS setup and MSI links only after the GitHub release assets
            and SHA-256 checksums are generated.
          </span>
        </div>
        <Link href="/releases/1.0.0">Read the release notes</Link>
      </section>
    </main>
  );
}
