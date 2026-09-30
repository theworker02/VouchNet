import Link from 'next/link';
import { getCurrentActor } from '../../lib/identity';
import { ApplyOAuthError, resolveAuthorization } from '../../lib/apply-oauth';

type AuthorizeSearch = {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<AuthorizeSearch>;
}) {
  const query = await searchParams;
  if (
    query.response_type !== 'code' ||
    query.client_id === undefined ||
    query.redirect_uri === undefined
  )
    return <AuthorizationError />;
  let authorization: Awaited<ReturnType<typeof resolveAuthorization>>;
  try {
    authorization = await resolveAuthorization({
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      scope: query.scope ?? null,
      state: query.state ?? null,
      codeChallenge: query.code_challenge ?? null,
      codeChallengeMethod: query.code_challenge_method ?? null,
    });
  } catch (error) {
    return <AuthorizationError code={error instanceof ApplyOAuthError ? error.code : undefined} />;
  }
  const actor = await getCurrentActor();
  const returnTo = `/oauth/authorize?${new URLSearchParams(
    Object.entries(query).filter(([, value]): value is string => value !== undefined),
  ).toString()}`;
  if (actor === null)
    return (
      <main className="developer-page oauth-consent-page">
        <p className="eyebrow">Apply with VouchNet</p>
        <h1>Sign in before sharing your profile.</h1>
        <p className="developer-intro">
          {authorization.client.name} is requesting your selected VouchNet profile details. Review
          and approve the request only after signing in.
        </p>
        <Link className="primary" href={`/login?next=${encodeURIComponent(returnTo)}`}>
          Sign in to continue
        </Link>
      </main>
    );
  return (
    <main className="developer-page oauth-consent-page">
      <p className="eyebrow">Apply with VouchNet</p>
      <h1>Share your professional context?</h1>
      <p className="developer-intro">
        <strong>{authorization.client.name}</strong> will receive only the items listed below. It
        will not receive your password, VouchNet session, private messages, or résumé file.
      </p>
      <section className="developer-doc-section">
        <h2>Requested access</h2>
        <ul>
          <li>Profile link, name, headline, and basic professional context.</li>
          {authorization.scopes.includes('profile:email') ? (
            <li>Your verified email address.</li>
          ) : null}
        </ul>
      </section>
      <form action="/api/oauth/authorize" method="post" className="oauth-consent-actions">
        <input name="client_id" type="hidden" value={authorization.client.clientId} />
        <input name="redirect_uri" type="hidden" value={authorization.redirectUri} />
        <input name="scope" type="hidden" value={authorization.scopes.join(' ')} />
        {authorization.state !== null ? (
          <input name="state" type="hidden" value={authorization.state} />
        ) : null}
        <input name="code_challenge" type="hidden" value={authorization.codeChallenge} />
        <input name="code_challenge_method" type="hidden" value="S256" />
        <button className="primary" name="approved" type="submit" value="yes">
          Approve and continue
        </button>
        <button className="secondary" name="approved" type="submit" value="no">
          Cancel
        </button>
      </form>
    </main>
  );
}

function AuthorizationError({ code }: { code?: string }) {
  return (
    <main className="developer-page oauth-consent-page">
      <p className="eyebrow">Apply with VouchNet</p>
      <h1>That application request cannot continue.</h1>
      <p className="developer-intro">
        The client, return address, or requested access was not recognized. Return to the hiring
        site and start again.
      </p>
      {code !== undefined ? <p className="muted-copy">Reference: {code}</p> : null}
      <Link className="secondary" href="/developers/integrations">
        Integration help
      </Link>
    </main>
  );
}
