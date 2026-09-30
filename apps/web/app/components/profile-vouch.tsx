'use client';

import { useState } from 'react';

const vouchOptions = [
  {
    kind: 'RELIABLE',
    label: 'Reliable',
    detail: 'They follow through and make work easier to trust.',
  },
  {
    kind: 'HELPFUL',
    label: 'Helpful',
    detail: 'They made time, shared context, or unblocked progress.',
  },
  {
    kind: 'COLLABORATIVE',
    label: 'Collaborative',
    detail: 'They make teams clearer, calmer, and stronger.',
  },
  {
    kind: 'EXCEPTIONAL',
    label: 'Exceptional',
    detail: 'Their craft and judgment stood out in meaningful work.',
  },
] as const;

type VouchKind = (typeof vouchOptions)[number]['kind'];

const errorCopy: Record<string, string> = {
  CONNECTION_REQUIRED: 'Vouches are reserved for accepted connections.',
  BLOCKED_RELATIONSHIP: 'This interaction is unavailable for this relationship.',
  PROFILE_UNAVAILABLE: 'This profile is no longer available for vouches.',
  CANNOT_VOUCH_FOR_SELF: 'You cannot vouch for your own profile.',
  UNAUTHENTICATED: 'Sign in to vouch for a connection.',
};

export function ProfileVouch({
  recipientId,
  initialVouch,
}: {
  recipientId: string;
  initialVouch: VouchKind | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedKind, setSavedKind] = useState<VouchKind | null>(initialVouch);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function save(kind: VouchKind) {
    setStatus('saving');
    setError(null);
    const response = await fetch(`/api/profiles/${recipientId}/vouches`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: 'VOUCH_FAILED' }))) as {
        error?: string;
      };
      setError(errorCopy[body.error ?? ''] ?? 'Your vouch could not be saved. Please try again.');
      setStatus('error');
      return;
    }
    setSavedKind(kind);
    setStatus('saved');
  }

  return (
    <div className="profile-vouch-control">
      <button
        className="vouch-trigger"
        type="button"
        onClick={() => {
          setError(null);
          setStatus('idle');
          setIsOpen(true);
        }}
      >
        <span aria-hidden="true">✦</span>
        {savedKind === null ? 'Vouch' : 'Update vouch'}
      </button>
      {isOpen ? (
        <div className="vouch-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section
            aria-describedby="vouch-description"
            aria-labelledby="vouch-title"
            aria-modal="true"
            className="vouch-dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setIsOpen(false);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            tabIndex={-1}
          >
            <button
              aria-label="Close vouch dialog"
              className="vouch-close"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <div
              className={status === 'saved' ? 'vouch-spark is-visible' : 'vouch-spark'}
              aria-hidden="true"
            >
              ✦
            </div>
            <p className="eyebrow">Professional signal</p>
            <h2 id="vouch-title">What would you vouch for?</h2>
            <p id="vouch-description">
              Keep it specific to the experience you have had together. One vouch per connection;
              choosing again updates your signal.
            </p>
            <div className="vouch-options">
              {vouchOptions.map((option) => (
                <button
                  className={savedKind === option.kind ? 'vouch-option selected' : 'vouch-option'}
                  disabled={status === 'saving'}
                  key={option.kind}
                  type="button"
                  onClick={() => void save(option.kind)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.detail}</span>
                </button>
              ))}
            </div>
            {status === 'saved' ? (
              <p className="vouch-success">Vouch added to their profile.</p>
            ) : null}
            {error !== null ? <p className="form-error">{error}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
