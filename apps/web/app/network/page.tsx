import Link from 'next/link';
import { Shell } from '../components/shell';
import { getCurrentActor } from '../lib/identity';
import { getNetworkOverview } from '../lib/social';
import { InvitationActions } from '../components/relationship-actions';
export default async function Network() {
  const actor = await getCurrentActor();
  if (actor === null) return null;
  const overview = await getNetworkOverview(actor.userId);
  return (
    <Shell>
      <section className="page-heading">
        <p className="eyebrow">Your network</p>
        <h1>Professional relationships, on your terms.</h1>
        <p>
          Follow people freely and make Contacts deliberately. VouchNet keeps both relationships
          distinct, visible, and under your control.
        </p>
        <Link className="primary" href="/network/discover">
          Discover professionals
        </Link>
      </section>
      <section className="network-overview" aria-label="Network overview">
        <article>
          <span>Contacts</span>
          <strong>{overview.contactCount}</strong>
          <small>Mutual relationships</small>
        </article>
        <article>
          <span>Following</span>
          <strong>{overview.followingCount}</strong>
          <small>One-way subscriptions</small>
        </article>
        <article>
          <span>Invitations</span>
          <strong>{overview.pendingReceivedCount}</strong>
          <small>Awaiting your decision</small>
        </article>
      </section>
      <section className="network-panels">
        <article className="network-invitations">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Invitations</p>
              <h2>People who want to connect</h2>
            </div>
          </div>
          <p>
            {overview.pendingReceivedCount === 0
              ? 'No pending invitations. Your decisions will appear here when someone requests a Contact relationship.'
              : `${overview.pendingReceivedCount} invitation${overview.pendingReceivedCount === 1 ? '' : 's'} awaiting your response.`}
          </p>
          {overview.pendingReceived.map((invitation) => (
            <div key={invitation.connectionId} className="invitation">
              <div className="invitation-avatar" aria-hidden="true">
                {invitation.firstName[0]}
                {invitation.lastName[0]}
              </div>
              <p>
                <Link href={`/in/${invitation.slug}`}>
                  {invitation.firstName} {invitation.lastName}
                </Link>
                {invitation.headline === null ? null : <small>{invitation.headline}</small>}
              </p>
              <InvitationActions connectionId={invitation.connectionId} />
            </div>
          ))}
        </article>
        <aside className="network-guide">
          <p className="eyebrow">How relationships work</p>
          <ol>
            <li>
              <span>1</span>
              <p>
                <strong>Follow</strong> someone to keep up with their public work.
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <strong>Connect</strong> when a mutual professional relationship makes sense.
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <strong>Control visibility</strong> from your privacy settings at any time.
              </p>
            </li>
          </ol>
        </aside>
      </section>
    </Shell>
  );
}
