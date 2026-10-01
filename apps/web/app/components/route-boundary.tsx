'use client';

import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { VouchNetLogo } from './brand';

export function RouteError({
  reset,
  title = 'This page could not be loaded',
}: {
  reset: () => void;
  title?: string;
}) {
  return (
    <section className="route-boundary" aria-live="assertive">
      <div className="route-boundary-card">
        <VouchNetLogo className="route-boundary-brand" />
        <AlertTriangle aria-hidden="true" className="route-boundary-icon" />
        <p className="eyebrow">Temporary issue</p>
        <h1>{title}</h1>
        <p>
          Your account and work have not been changed. Try again, or return to your Signal Desk.
        </p>
        <div className="actions">
          <button className="primary" onClick={reset} type="button">
            <RefreshCw aria-hidden="true" size={16} /> Try again
          </button>
          <Link className="secondary" href="/home">
            <Home aria-hidden="true" size={16} /> Go home
          </Link>
        </div>
      </div>
    </section>
  );
}

export function RouteLoading({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <section className="route-loading" aria-busy="true" aria-label={label}>
      <div className="skeleton-shimmer route-loading-title" />
      <div className="skeleton-shimmer route-loading-line" />
      <div className="skeleton-shimmer route-loading-line route-loading-line--short" />
      <div className="route-loading-grid">
        <div className="skeleton-shimmer route-loading-panel" />
        <div className="skeleton-shimmer route-loading-panel" />
      </div>
    </section>
  );
}
