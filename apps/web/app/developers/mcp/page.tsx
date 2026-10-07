import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function McpPage() {
  return (
    <>
      <Link className="quiet-link" href="/developers">
        ← Developer resources
      </Link>
      <p className="eyebrow">Model Context Protocol</p>
      <h1>MCP is a distinct machine principal.</h1>
      <p className="developer-intro">
        MCP clients are never treated as a signed-in human. The gateway design limits credentials by
        scope, records attribution, and routes protected social operations to a human approval
        inbox.
      </p>
      <section className="developer-doc-section">
        <h2>Gateway status</h2>
        <p>
          <strong>Not yet public.</strong> VouchNet currently publishes the policy and scope
          vocabulary only; it does not advertise a live MCP transport or issue credentials.
        </p>
      </section>
      <section className="developer-doc-section">
        <h2>Planned safe capabilities</h2>
        <ul>
          <li>Read: public-profile, feed, and authorized-notification retrieval.</li>
          <li>Prepare: post, comment, message, profile, and job drafts.</li>
          <li>
            Commit: human-approved only, bound to a single-use server artifact and exact payload
            hash.
          </li>
        </ul>
      </section>
      <p>
        Read the complete{' '}
        <Link href="https://github.com/theworker02/VouchNet/blob/main/docs/MCP.md">
          MCP architecture document
        </Link>
        .
      </p>
    </>
  );
}
