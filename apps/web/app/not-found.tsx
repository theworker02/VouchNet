import Link from 'next/link';
import { Search } from 'lucide-react';
import { VouchNetLogo } from './components/brand';

export default function NotFound() {
  return (
    <section className="route-boundary">
      <div className="route-boundary-card">
        <VouchNetLogo className="route-boundary-brand" />
        <p className="eyebrow">404</p>
        <h1>That destination does not exist.</h1>
        <p>It may have moved, been removed, or never been available to your account.</p>
        <div className="actions">
          <Link className="primary" href="/search">
            <Search aria-hidden="true" size={16} /> Search VouchNet
          </Link>
          <Link className="secondary" href="/home">
            Go home
          </Link>
        </div>
      </div>
    </section>
  );
}
