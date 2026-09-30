import Link from 'next/link';

export default function IntegrationsPage() {
  return (
    <>
      <Link className="quiet-link" href="/developers">
        ← Developer resources
      </Link>
      <p className="eyebrow">Integrations</p>
      <h1>Identity first. Access second.</h1>
      <p className="developer-intro">
        VouchNet uses provider OAuth for member sign-in. “Apply with VouchNet” uses registered
        hiring-site clients, exact redirect URIs, PKCE, minimal disclosure scopes, and an explicit
        member approval screen.
      </p>
      <section className="developer-doc-section">
        <h2>Available now</h2>
        <ul>
          <li>Google, GitHub, and LinkedIn browser sign-in via authorization-code callbacks.</li>
          <li>Apply with VouchNet authorization code flow for registered confidential clients.</li>
          <li>
            Public profile addresses at <code>/vouch/:username</code>.
          </li>
          <li>
            Backend readiness at <code>/api/v1/status</code>.
          </li>
        </ul>
      </section>
      <section className="developer-doc-section">
        <h2>Register a hiring-site client</h2>
        <p>
          Members can create and revoke their own clients from Settings → Developer center. A client
          secret is shown once, stored only as a cryptographic hash, and is never usable as a member
          session. Exact HTTPS callback URLs are required.
        </p>
      </section>
      <section className="developer-doc-section">
        <h2>Protocol locations</h2>
        <ul>
          <li>
            Authorize: <code>/oauth/authorize</code>
          </li>
          <li>
            Token exchange: <code>POST /api/oauth/token</code>
          </li>
          <li>
            Selected profile: <code>GET /api/oauth/userinfo</code>
          </li>
        </ul>
      </section>
      <p>
        <Link href="/settings/developers/clients">Create an integration client</Link> or read the
        protocol reference below.
      </p>
    </>
  );
}
