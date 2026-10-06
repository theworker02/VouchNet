'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ClaimButton({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'claiming' | 'mismatch' | 'error'>('idle');
  async function claim() {
    setState('claiming');
    try {
      const response = await fetch('/api/organizations/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (response.ok) {
        const body = (await response.json()) as { slug: string };
        router.push(`/company/${body.slug}`);
        return;
      }
      setState(response.status === 409 ? 'mismatch' : 'error');
    } catch {
      setState('error');
    }
  }
  return (
    <>
      <button
        className="primary"
        type="button"
        disabled={state === 'claiming'}
        onClick={() => void claim()}
      >
        {state === 'claiming' ? 'Claiming…' : 'Claim this profile'}
      </button>
      {state === 'mismatch' ? (
        <p className="form-error">
          This invite was sent to a different email address. Sign in with the invited email to claim
          the profile.
        </p>
      ) : null}
      {state === 'error' ? (
        <p className="form-error">The claim could not be completed. The link may have expired.</p>
      ) : null}
    </>
  );
}
