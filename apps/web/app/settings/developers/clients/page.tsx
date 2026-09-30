import Link from 'next/link';
import { Shell } from '../../../components/shell';
import { DeveloperClients } from '../../../components/developer-clients';

export default function DeveloperClientsPage() {
  return (
    <Shell>
      <section className="settings-panel developer-clients-page">
        <Link className="quiet-link" href="/settings/developers">
          ← Developer center
        </Link>
        <p className="eyebrow">Apply with VouchNet</p>
        <h1>Integration clients</h1>
        <p className="muted-copy">
          Register the exact callback URLs for a hiring site. Each candidate approves the selected
          profile data in VouchNet before the site receives a short-lived authorization code.
        </p>
        <DeveloperClients />
      </section>
    </Shell>
  );
}
