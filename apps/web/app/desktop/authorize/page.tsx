import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentActor, getProfileSummary } from '../../lib/identity';
import { validateDesktopAuthorization } from '../../lib/desktop-auth';

export const metadata = { title: 'Connect VouchNet Desktop' };

export default async function DesktopAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  }>;
}) {
  const query = await searchParams;
  const request = validateDesktopAuthorization({
    state: query.state ?? null,
    codeChallenge: query.code_challenge ?? null,
  });
  if (request === null || query.code_challenge_method !== 'S256') redirect('/login');
  const actor = await getCurrentActor();
  if (actor === null) {
    const next = `/desktop/authorize?${new URLSearchParams({ state: request.state, code_challenge: request.codeChallenge, code_challenge_method: 'S256' })}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const profile = await getProfileSummary(actor.userId);
  return (
    <main className="desktop-authorize">
      <section>
        <p className="eyebrow">VouchNet Desktop</p>
        <h1>Continue in the desktop app?</h1>
        <p>
          You are connecting as <strong>{profile?.fullName ?? 'your VouchNet account'}</strong>. The
          desktop app receives a device-specific credential; it never receives your browser session.
        </p>
        <form action="/api/desktop/authorize" method="post">
          <input name="state" type="hidden" value={request.state} />
          <input name="codeChallenge" type="hidden" value={request.codeChallenge} />
          <button className="primary">Open VouchNet Desktop</button>
        </form>
        <Link href="/home">Cancel and return to VouchNet</Link>
      </section>
    </main>
  );
}
