import Link from 'next/link';

export default function ServerIntegrationPage() {
  return (
    <>
      <Link className="quiet-link" href="/developers">
        ← Developer resources
      </Link>
      <p className="eyebrow">Server integration</p>
      <h1>Start with public surfaces, not member credentials.</h1>
      <p className="developer-intro">
        VouchNet exposes public profile addresses and a small discovery document today. There is no
        general-purpose server API, scraping exception, or way to reuse a member browser session.
      </p>
      <section className="developer-doc-section">
        <h2>Available locations</h2>
        <ul>
          <li>
            Public profile template: <code>/vouch/:username</code>
          </li>
          <li>
            Developer discovery: <code>/api/developer/discovery</code>
          </li>
          <li>
            Service readiness: <code>/api/v1/status</code>
          </li>
        </ul>
      </section>
      <section className="developer-doc-section">
        <h2>Integration boundary</h2>
        <p>
          Public data must be consumed respectfully and under the published privacy controls. Member
          data, messages, and protected social actions require a future scoped integration
          credential and, where appropriate, a server-verifiable human approval. Client-side flags
          can never establish that approval.
        </p>
      </section>
      <p>
        <Link href="https://github.com/theworker02/VouchNet/blob/main/docs/DEVELOPER_PORTAL.md">
          Read the server integration reference
        </Link>
        .
      </p>
    </>
  );
}
