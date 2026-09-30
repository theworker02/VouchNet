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
      <p className="eyebrow">Network</p>
      <h1>Professional relationships, on your terms.</h1>
      <section className="empty-grid">
        <article>
          <h2>Invitations</h2>
          <p>
            {overview.pendingReceivedCount === 0
              ? 'No pending invitations.'
              : `${overview.pendingReceivedCount} invitation${overview.pendingReceivedCount === 1 ? '' : 's'} awaiting your response.`}
          </p>
          {overview.pendingReceived.map((invitation) => (
            <div key={invitation.connectionId} className="invitation">
              <p>
                <Link href={`/in/${invitation.slug}`}>
                  {invitation.firstName} {invitation.lastName}
                </Link>
                {invitation.headline === null ? null : ` · ${invitation.headline}`}
              </p>
              <InvitationActions connectionId={invitation.connectionId} />
            </div>
          ))}
        </article>
        <article>
          <h2>{overview.contactCount} Contacts</h2>
          <p>
            Connections are mutual. VouchNet only recommends explainable introductions based on your
            network.
          </p>
        </article>
        <article>
          <h2>{overview.followingCount} Following</h2>
          <p>Follow people without making a connection request.</p>
        </article>
      </section>
      <p>
        <Link className="primary" href="/network/discover">
          Discover professionals
        </Link>
      </p>
    </Shell>
  );
}
