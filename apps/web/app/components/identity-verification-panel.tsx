'use client';

import { useCallback, useEffect, useState } from 'react';

type Verification = {
  status: 'PENDING' | 'REQUIRES_INPUT' | 'VERIFIED' | 'CANCELED';
  method: string | null;
  verifiedAt: string | null;
  badgeVisible: boolean;
} | null;

const statusLabels: Record<NonNullable<Verification>['status'], string> = {
  PENDING: 'Verification in progress',
  REQUIRES_INPUT: 'More information needed — restart verification',
  VERIFIED: 'Identity verified',
  CANCELED: 'Verification canceled',
};

export function IdentityVerificationPanel() {
  const [verification, setVerification] = useState<Verification | undefined>(undefined);
  const [state, setState] = useState<'idle' | 'starting' | 'saving' | 'error'>('idle');
  const load = useCallback(() => {
    void fetch('/api/identity-verification')
      .then(async (response) =>
        response.ok ? (response.json() as Promise<{ verification: Verification }>) : null,
      )
      .then((body) => setVerification(body === null ? null : body.verification))
      .catch(() => setVerification(null));
  }, []);
  useEffect(load, [load]);
  async function start() {
    setState('starting');
    try {
      const response = await fetch('/api/identity-verification/start', { method: 'POST' });
      const body = (await response.json().catch(() => null)) as { url?: string } | null;
      if (!response.ok || body?.url === undefined) {
        setState('error');
        return;
      }
      window.location.assign(body.url);
    } catch {
      setState('error');
    }
  }
  async function toggleBadge(visible: boolean) {
    setState('saving');
    try {
      const response = await fetch('/api/identity-verification/badge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visible }),
      });
      if (!response.ok) {
        setState('error');
        return;
      }
      setState('idle');
      load();
    } catch {
      setState('error');
    }
  }
  return (
    <section className="email-verification-card identity-verification-card">
      <div>
        <strong>Identity verification</strong>
        <span
          className={verification?.status === 'VERIFIED' ? 'email-verified' : 'email-unverified'}
        >
          {verification === undefined
            ? 'Loading…'
            : verification === null
              ? 'Not verified'
              : statusLabels[verification.status]}
        </span>
      </div>
      {verification?.status === 'VERIFIED' ? (
        <>
          <p className="muted-copy">
            {verification.method ?? 'Document check'}
            {verification.verifiedAt === null
              ? ''
              : ` · Verified ${new Date(verification.verifiedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          </p>
          <label className="setting-toggle">
            <input
              type="checkbox"
              checked={verification.badgeVisible}
              disabled={state === 'saving'}
              onChange={(event) => void toggleBadge(event.target.checked)}
            />
            Show the Identity Verified badge on my profile
          </label>
        </>
      ) : (
        <>
          <p className="muted-copy">
            Verification is optional. It happens on the provider&apos;s secure page; VouchNet only
            records that the check passed, the method, and the date — never your ID details.
          </p>
          <button
            type="button"
            disabled={state === 'starting' || verification === undefined}
            onClick={() => void start()}
          >
            {state === 'starting'
              ? 'Opening verification…'
              : verification?.status === 'PENDING'
                ? 'Resume verification'
                : 'Verify my identity'}
          </button>
        </>
      )}
      {state === 'error' ? (
        <p className="form-error">Identity verification is temporarily unavailable.</p>
      ) : null}
    </section>
  );
}
