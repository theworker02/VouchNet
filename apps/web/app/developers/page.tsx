import Link from 'next/link';

export default function DeveloperPage() {
  return (
    <>
      <Link className="brand" href="/">
        VouchNet
      </Link>
      <p className="eyebrow">Developer resources</p>
      <h1>Build alongside VouchNet, with clear boundaries.</h1>
      <p className="developer-intro">
        The developer center is intentionally quiet: integrations, machine interfaces, and brand
        assets live here instead of inside the professional network.
      </p>
      <div className="developer-grid">
        <Link href="/developers/integrations">
          <strong>Integrations</strong>
          <span>Authentication and future Apply with VouchNet guidance.</span>
        </Link>
        <Link href="/developers/mcp">
          <strong>MCP</strong>
          <span>Scoped, approval-aware machine access—never a browser-session substitute.</span>
        </Link>
        <Link href="/developers/servers">
          <strong>Server integration</strong>
          <span>Public locations and the boundary for future credentials.</span>
        </Link>
        <Link href="/developers/brand">
          <strong>Brand kit</strong>
          <span>Official logo files and usage principles.</span>
        </Link>
        <Link href="/developers/moderation">
          <strong>Safety operations</strong>
          <span>Volunteer moderation roles, review boundaries, and operating guidance.</span>
        </Link>
      </div>
      <p className="developer-footnote">
        Machine-readable discovery:{' '}
        <Link href="/api/developer/discovery">/api/developer/discovery</Link>
      </p>
    </>
  );
}
