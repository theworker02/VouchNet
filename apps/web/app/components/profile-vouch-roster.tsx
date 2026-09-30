import Link from 'next/link';
import type { ProfileVouch } from '../lib/vouches';

const labels: Record<ProfileVouch['kind'], string> = {
  RELIABLE: 'Reliable',
  HELPFUL: 'Helpful',
  COLLABORATIVE: 'Collaborative',
  EXCEPTIONAL: 'Exceptional',
};

export function ProfileVouchRoster({
  vouches,
  isOwner,
  isVisible,
}: {
  vouches: ProfileVouch[];
  isOwner: boolean;
  isVisible: boolean;
}) {
  if (!isVisible && !isOwner) return null;
  return (
    <section className="profile-section profile-vouches">
      <div className="profile-section-heading">
        <div>
          <p className="eyebrow">Peer signal</p>
          <h2>Vouched for by</h2>
        </div>
        <span className="vouch-count">{vouches.length}</span>
      </div>
      {!isVisible ? (
        <p>
          Your Vouch roster is hidden from other people. Change this in{' '}
          <Link href="/settings/visibility">Visibility &amp; privacy</Link>.
        </p>
      ) : vouches.length === 0 ? (
        <p>No vouches yet. Meaningful signals from accepted connections will appear here.</p>
      ) : (
        <ul className="vouch-roster">
          {vouches.map((vouch) => (
            <li key={vouch.id}>
              <span className="vouch-avatar" aria-hidden="true">
                {vouch.voucher.firstName[0]}
                {vouch.voucher.lastName[0]}
              </span>
              <span>
                <Link href={`/vouch/${vouch.voucher.slug}`}>
                  {vouch.voucher.firstName} {vouch.voucher.lastName}
                </Link>
                <small>vouched that this person is {labels[vouch.kind].toLowerCase()}.</small>
              </span>
              <strong>{labels[vouch.kind]}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
