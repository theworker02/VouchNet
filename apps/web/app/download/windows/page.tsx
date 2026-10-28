import Link from 'next/link';
import { desktopRelease } from '../release';
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
        <span aria-hidden="true" className="download-mark" />
        <p className="eyebrow">Windows x64</p>
        <h1>VouchNet Desktop {desktopRelease.version}</h1>
        <p>
          The installer is built from the open VouchNet Desktop source, with a native shell and the
          same account and service as vouchnet.dev.
        </p>
        <div className="download-choices">
          <a className="primary" download href={desktopRelease.nsis.href}>
            Download setup (.exe)
          </a>
          <a className="secondary" download href={desktopRelease.msi.href}>
            Download MSI
          </a>
        </div>
        <div className="download-integrity">
          <strong>Verify before installing</strong>
          <span>
            Download the <a href={desktopRelease.checksumsHref}>SHA-256 checksums</a>. The
            installer is unsigned, so Windows may show a publisher warning.
          </span>
        </div>
        <Link href={desktopRelease.notesPath}>Read the release notes</Link>
      </section>
    </main>
  );
}
