'use client';

import { useState } from 'react';

export function RelationshipActions({ userId }: { userId: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'connected' | 'following' | 'error'>(
    'idle',
  );
  const [cooldownResetAt, setCooldownResetAt] = useState<string | null>(null);
  async function requestConnection() {
    setStatus('working');
    try {
      const response = await fetch('/api/network/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (response.ok) {
        setStatus('connected');
        return;
      }
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        resetsAt?: string;
      };
      if (body.error === 'CONNECTION_COOLDOWN' && body.resetsAt !== undefined) {
        setCooldownResetAt(body.resetsAt);
        setStatus('idle');
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  }
  async function follow() {
    setStatus('working');
    try {
      const response = await fetch(`/api/network/follow/${userId}`, { method: 'POST' });
      setStatus(response.ok ? 'following' : 'error');
    } catch {
      setStatus('error');
    }
  }
  if (status === 'connected') return <p className="action-feedback">Connection request sent.</p>;
  if (status === 'following')
    return <p className="action-feedback">You are now following this person.</p>;
  return (
    <div className="relationship-actions">
      <button
        type="button"
        disabled={status === 'working'}
        onClick={() => void requestConnection()}
      >
        Connect
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={status === 'working'}
        onClick={() => void follow()}
      >
        Follow
      </button>
      {status === 'error' ? (
        <p className="form-error">
          That action could not be completed. Refresh to check its current state.
        </p>
      ) : null}
      {cooldownResetAt === null ? null : (
        <section className="connection-cooldown-notice relationship-cooldown" role="status">
          <div>
            <strong>Slow down on connection requests</strong>
            <p>
              This protection resets{' '}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(cooldownResetAt))}
              .
            </p>
          </div>
          <button type="button" onClick={() => setCooldownResetAt(null)}>
            Dismiss
          </button>
        </section>
      )}
    </div>
  );
}

export function InvitationActions({ connectionId }: { connectionId: string }) {
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  async function respond(action: 'accept' | 'decline') {
    setStatus('working');
    try {
      const response = await fetch('/api/network/connections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ connectionId, action }),
      });
      setStatus(response.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  }
  if (status === 'done')
    return (
      <p className="action-feedback">Invitation updated. Refresh this page to see your network.</p>
    );
  return (
    <div className="relationship-actions">
      <button type="button" disabled={status === 'working'} onClick={() => void respond('accept')}>
        Accept
      </button>
      <button
        className="secondary-button"
        type="button"
        disabled={status === 'working'}
        onClick={() => void respond('decline')}
      >
        Decline
      </button>
      {status === 'error' ? <p className="form-error">Could not update this invitation.</p> : null}
    </div>
  );
}
